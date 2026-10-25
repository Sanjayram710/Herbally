"""Small workspace authorization layer for the existing local-first platform.

This is deliberately not a password or OAuth implementation. Production callers
must provision bearer-token identities through their identity/access-management
process and configure AUTH_TOKENS_JSON server-side.
"""

import hmac
import json
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.brand import BrandProfile
from app.models.content import ContentAsset
from app.models.media import MediaAsset
from app.models.automation import AutomationExecution, AutomationRule
from app.models.integration import IntegrationConfig
from app.models.product import Product
from app.models.security import User, Workspace, WorkspaceMembership
from app.models.workflow import WorkflowRun


@dataclass(frozen=True)
class Principal:
    subject_id: str
    workspace_id: str
    role: str = "member"


class AuthorizationService:
    @staticmethod
    def _token_records() -> Dict[str, Dict[str, Any]]:
        if settings.AUTH_MODE == "development":
            return {
                settings.AUTH_DEV_TOKEN: {
                    "subject": settings.AUTH_DEV_USER_ID,
                    "workspace_id": settings.AUTH_DEV_WORKSPACE_ID,
                    "display_name": "Local developer",
                    "role": "owner",
                }
            }
        try:
            records = json.loads(settings.AUTH_TOKENS_JSON)
        except json.JSONDecodeError as exc:
            raise RuntimeError("AUTH_TOKENS_JSON is not valid JSON") from exc
        if not isinstance(records, dict):
            raise RuntimeError("AUTH_TOKENS_JSON must be an object keyed by bearer token")
        return records

    @classmethod
    def principal_for_bearer_token(cls, token: str) -> Principal:
        for configured_token, raw_record in cls._token_records().items():
            if hmac.compare_digest(str(configured_token), token):
                if not isinstance(raw_record, dict):
                    break
                subject = raw_record.get("subject")
                workspace_id = raw_record.get("workspace_id")
                if isinstance(subject, str) and subject and isinstance(workspace_id, str) and workspace_id:
                    return Principal(subject_id=subject, workspace_id=workspace_id, role=str(raw_record.get("role", "member")))
                break
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    @classmethod
    def bootstrap_identities_and_legacy_data(cls, db: Session) -> None:
        """Create configured principals and add workspace ownership to legacy rows.

        This is additive: it neither deletes nor rewrites business records beyond
        assigning records without a workspace to LEGACY_WORKSPACE_ID.
        """
        records = cls._token_records()
        workspace_ids = {settings.LEGACY_WORKSPACE_ID}
        workspace_ids.update(
            record.get("workspace_id")
            for record in records.values()
            if isinstance(record, dict) and isinstance(record.get("workspace_id"), str)
        )
        for workspace_id in filter(None, workspace_ids):
            if not db.query(Workspace).filter(Workspace.id == workspace_id).first():
                db.add(Workspace(id=workspace_id, name=workspace_id.replace("-", " ").title()))

        for record in records.values():
            if not isinstance(record, dict):
                continue
            subject = record.get("subject")
            workspace_id = record.get("workspace_id")
            if not isinstance(subject, str) or not subject or not isinstance(workspace_id, str) or not workspace_id:
                continue
            user = db.query(User).filter(User.id == subject).first()
            if not user:
                user = User(id=subject, display_name=str(record.get("display_name") or subject))
                db.add(user)
            membership = (
                db.query(WorkspaceMembership)
                .filter(WorkspaceMembership.workspace_id == workspace_id, WorkspaceMembership.user_id == subject)
                .first()
            )
            if not membership:
                db.add(
                    WorkspaceMembership(
                        id=f"wsm-{uuid.uuid4().hex[:12]}",
                        workspace_id=workspace_id,
                        user_id=subject,
                        role=str(record.get("role") or "member"),
                    )
                )

        # Existing single-tenant rows receive an explicit owner workspace without
        # losing IDs or content. Production operators should set LEGACY_WORKSPACE_ID
        # to the workspace declared in their provisioned token configuration.
        db.query(BrandProfile).filter(BrandProfile.workspace_id.is_(None)).update(
            {BrandProfile.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(Product).filter(Product.workspace_id.is_(None)).update(
            {Product.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(Product).filter(Product.brand_id.is_(None)).update(
            {Product.brand_id: "herbally-brand"}, synchronize_session=False
        )
        db.query(MediaAsset).filter(MediaAsset.workspace_id.is_(None)).update(
            {MediaAsset.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(WorkflowRun).filter(WorkflowRun.workspace_id.is_(None)).update(
            {WorkflowRun.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(AutomationRule).filter(AutomationRule.workspace_id.is_(None)).update(
            {AutomationRule.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(AutomationExecution).filter(AutomationExecution.workspace_id.is_(None)).update(
            {AutomationExecution.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(IntegrationConfig).filter(IntegrationConfig.workspace_id.is_(None)).update(
            {IntegrationConfig.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.query(IntegrationConfig).filter(IntegrationConfig.connector_key.is_(None)).update(
            {IntegrationConfig.connector_key: IntegrationConfig.id}, synchronize_session=False
        )
        from app.models.campaign import Campaign
        from app.models.content import ContentAsset
        db.query(Campaign).filter(Campaign.workspace_id.is_(None)).update(
            {Campaign.workspace_id: settings.LEGACY_WORKSPACE_ID, Campaign.brand_id: "herbally-brand"},
            synchronize_session=False,
        )
        db.query(ContentAsset).filter(ContentAsset.workspace_id.is_(None)).update(
            {ContentAsset.workspace_id: settings.LEGACY_WORKSPACE_ID}, synchronize_session=False
        )
        db.commit()

    @staticmethod
    def _not_found() -> HTTPException:
        # Intentionally avoid confirming the existence of cross-workspace IDs.
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    @classmethod
    def require_active_membership(cls, db: Session, principal: Principal) -> None:
        membership = (
            db.query(WorkspaceMembership)
            .join(User, User.id == WorkspaceMembership.user_id)
            .filter(
                WorkspaceMembership.workspace_id == principal.workspace_id,
                WorkspaceMembership.user_id == principal.subject_id,
                User.is_active.is_(True),
            )
            .first()
        )
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active workspace membership")

    @classmethod
    def owned_brand(cls, db: Session, principal: Principal, brand_id: str) -> BrandProfile:
        brand = (
            db.query(BrandProfile)
            .filter(BrandProfile.id == brand_id, BrandProfile.workspace_id == principal.workspace_id)
            .first()
        )
        if not brand:
            raise cls._not_found()
        return brand

    @classmethod
    def owned_workflow(cls, db: Session, principal: Principal, workflow_id: str) -> WorkflowRun:
        workflow = (
            db.query(WorkflowRun)
            .filter(WorkflowRun.id == workflow_id, WorkflowRun.workspace_id == principal.workspace_id)
            .first()
        )
        if not workflow:
            raise cls._not_found()
        return workflow

    @classmethod
    def owned_content_asset(cls, db: Session, principal: Principal, asset_id: str) -> ContentAsset:
        asset = db.query(ContentAsset).filter(ContentAsset.id == asset_id).first()
        if not asset:
            raise cls._not_found()
        cls.owned_brand(db, principal, asset.brand_id)
        return asset

    @classmethod
    def owned_product(cls, db: Session, principal: Principal, product_id: str) -> Product:
        product = (
            db.query(Product)
            .filter(Product.id == product_id, Product.workspace_id == principal.workspace_id)
            .first()
        )
        if not product:
            raise cls._not_found()
        return product

    @classmethod
    def owned_media_asset(cls, db: Session, principal: Principal, media_id: str) -> MediaAsset:
        media = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
        if not media:
            raise cls._not_found()
        if media.workspace_id:
            if media.workspace_id != principal.workspace_id:
                raise cls._not_found()
            return media
        if media.product_id:
            cls.owned_product(db, principal, media.product_id)
            return media
        if media.content_asset_id:
            cls.owned_content_asset(db, principal, media.content_asset_id)
            return media
        raise cls._not_found()

    @classmethod
    def owned_video_job(cls, db: Session, principal: Principal, job_id: str):
        from app.models.video import VideoJob
        job = (
            db.query(VideoJob)
            .filter(VideoJob.id == job_id, VideoJob.workspace_id == principal.workspace_id)
            .first()
        )
        if not job:
            raise cls._not_found()
        return job

    @classmethod
    def owned_campaign(cls, db: Session, principal: Principal, campaign_id: str):
        from app.models.campaign import Campaign
        campaign = (
            db.query(Campaign)
            .filter(Campaign.id == campaign_id, Campaign.workspace_id == principal.workspace_id)
            .first()
        )
        if not campaign:
            raise cls._not_found()
        return campaign

    @classmethod
    def owned_automation_rule(cls, db: Session, principal: Principal, rule_id: str) -> AutomationRule:
        rule = (
            db.query(AutomationRule)
            .filter(AutomationRule.id == rule_id, AutomationRule.workspace_id == principal.workspace_id)
            .first()
        )
        if not rule:
            raise cls._not_found()
        return rule

    @classmethod
    def owned_automation_execution(cls, db: Session, principal: Principal, execution_id: str) -> AutomationExecution:
        execution = (
            db.query(AutomationExecution)
            .filter(AutomationExecution.id == execution_id, AutomationExecution.workspace_id == principal.workspace_id)
            .first()
        )
        if not execution:
            raise cls._not_found()
        return execution

    @classmethod
    def owned_integration(cls, db: Session, principal: Principal, integration_id: str) -> IntegrationConfig:
        integration = (
            db.query(IntegrationConfig)
            .filter(IntegrationConfig.id == integration_id, IntegrationConfig.workspace_id == principal.workspace_id)
            .first()
        )
        if not integration:
            raise cls._not_found()
        return integration

    @classmethod
    def accessible_brand_ids(cls, db: Session, principal: Principal) -> List[str]:
        return [
            brand_id
            for (brand_id,) in db.query(BrandProfile.id)
            .filter(BrandProfile.workspace_id == principal.workspace_id)
            .all()
        ]


def get_current_principal(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Principal:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    principal = AuthorizationService.principal_for_bearer_token(token)
    AuthorizationService.require_active_membership(db, principal)
    return principal
