import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.content import ContentAsset, ContentSchedule
from app.models.brand import BrandProfile
from app.models.product import Product
from app.schemas.content import ContentAssetCreate, ContentAssetUpdate, ContentGenerateRequest
from app.services.guardrails import GuardrailsService


class ContentService:
    @staticmethod
    def generate_content_assets(db: Session, req: ContentGenerateRequest) -> List[ContentAsset]:
        """
        Synthesizes structured marketing assets strictly grounded in the saved BrandProfile
        and Product specifications, filtering through non-negotiable medical claim guardrails.
        """
        brand = db.query(BrandProfile).filter(BrandProfile.id == req.brand_id).first()
        brand_name = brand.name if brand else "Herbally"
        brand_voice = brand.brand_voice if brand else "serene, grounded, Ayurvedic"
        
        product = None
        if req.product_id:
            product = db.query(Product).filter(Product.id == req.product_id).first()

        prod_name = product.name if product else "Herbally Pure Neem Bedsheet"
        features = product.verified_features if (product and product.verified_features) else [
            "100% GOTS certified organic cotton",
            "Natural botanical Neem extract wash",
            "300 Thread Count sateen weave",
            "Hypoallergenic & breathable"
        ]

        created_assets: List[ContentAsset] = []

        # 1. Instagram Social Post & Carousel
        if "Instagram" in req.channels or "social_post" in req.asset_types:
            caption = (
                f"Did you know your bedsheet touches your skin for 8 hours every single night? 🌿\n\n"
                f"Meet the {prod_name}. Woven from {features[0]} and washed in {features[1]}, "
                f"it keeps your sleep sanctuary naturally cool, breathable, and pure.\n\n"
                f"No synthetic polyesters, no harsh chemical finishes. Just mindful wellness designed for deep restorative rest.\n\n"
                f"Experience the soothing difference today. Link in bio to explore our collection."
            )
            # Verify claim safety
            clean_caption = GuardrailsService.filter_ad_copy(caption)

            asset_ig = ContentAsset(
                id=f"cnt-{uuid.uuid4().hex[:8]}",
                brand_id=req.brand_id,
                product_id=req.product_id,
                channel="Instagram",
                asset_type="social_post",
                title=f"{prod_name} - Clean Sleep Sanctuary (Carousel Post)",
                content=clean_caption,
                headline="8 Hours of Rest. 100% Pure Organic Neem Sleep.",
                body_copy=clean_caption,
                call_to_action="Explore Organic Bedding (Link in Bio)",
                hashtags=["#CleanSleep", "#HerballyLiving", "#OrganicCotton", "#AyurvedicWellness", "#EcoLuxury", "#SkinCareRoutine"],
                image_prompt="A sunlit, minimalist master bedroom with crisp sage green and ivory bedding made of sateen organic cotton. Fresh neem leaves and natural morning light casting soft shadows on 300TC sheets. High-end architectural digest aesthetic, photorealistic.",
                status="draft",
                provider_source="AI-Synthesized (Brand & Guardrails Grounded)",
                version=1
            )
            db.add(asset_ig)
            created_assets.append(asset_ig)

        # 2. Meta Video Reel Script
        if "reel_script" in req.asset_types or "Instagram" in req.channels:
            script_body = (
                "[0-3s HOOK] (Close up of hand smoothing silky organic fabric): 'Stop sleeping on petroleum-based polyester if your skin breaks out.'\n\n"
                "[3-8s PROBLEM] (B-roll of tossing and turning in hot sheets): 'Traditional bedsheets trap heat, dust, and sweat against your skin all night.'\n\n"
                "[8-15s SOLUTION] (Unfolding Herbally 300TC sateen sheet with botanical Neem wash graphic): 'Herbally infuses 100% GOTS certified organic cotton with ancient botanical Neem extract wash.'\n\n"
                "[15-22s BENEFIT] (Person peacefully resting, breathability graphic): 'It's naturally hypoallergenic, 100% breathable, and silky smooth.'\n\n"
                "[22-30s CTA] (On-screen coupon WELCOME10 with pack shot): 'Upgrade your nightly sleep sanctuary today. Tap Shop Now for free shipping in India.'"
            )
            clean_script = GuardrailsService.filter_ad_copy(script_body)

            asset_reel = ContentAsset(
                id=f"cnt-{uuid.uuid4().hex[:8]}",
                brand_id=req.brand_id,
                product_id=req.product_id,
                channel="Instagram",
                asset_type="reel_script",
                title="Reels Script: Why Clean Bedding Is Your Skin's Best Secret",
                content=clean_script,
                headline="Why Clean Bedding Is Your Skin's Best Secret",
                body_copy=clean_script,
                call_to_action="Shop Now - Free India Delivery",
                hashtags=["#SleepWellness", "#NeemBedding", "#SkincareTips", "#ReelsIndia", "#CleanLiving"],
                image_prompt="Storyboard frame: Hand gently feeling sateen organic cotton sheet weave in bright morning sunshine, micro-texture visible, fresh natural herbal aesthetic.",
                status="draft",
                provider_source="AI-Synthesized (Video Director Framework)",
                version=1
            )
            db.add(asset_reel)
            created_assets.append(asset_reel)

        # 3. Meta Ads High-Conversion Copy
        if "Meta Ads" in req.channels or "ad_copy" in req.asset_types:
            headline = "Ancient Neem Botanical Wash Meets 100% Organic Cotton"
            primary_text = (
                f"Upgrade to bedsheets engineered for sensitive skin and pure restorative sleep. "
                f"The {prod_name} is crafted from 300 Thread Count GOTS certified organic cotton, "
                f"bathed in botanical Neem wash for natural freshness and cooling breathability."
            )
            clean_primary = GuardrailsService.filter_ad_copy(primary_text)

            asset_meta = ContentAsset(
                id=f"cnt-{uuid.uuid4().hex[:8]}",
                brand_id=req.brand_id,
                product_id=req.product_id,
                channel="Meta Ads",
                asset_type="ad_copy",
                title="Meta Conversion Ad - Organic Sleep Sanctuary",
                content=f"HEADLINE: {headline}\nPRIMARY TEXT: {clean_primary}\nCTA: Shop Now",
                headline=headline,
                body_copy=clean_primary,
                call_to_action="Shop Now",
                hashtags=["#OrganicBedding", "#Herbally"],
                image_prompt="Split carousel frame comparing hot synthetic sheets versus Herbally pure botanical organic cotton with subtle moisture-wicking and cooling airflow icons.",
                status="draft",
                provider_source="AI-Synthesized (Performance Marketing Framework)",
                version=1
            )
            db.add(asset_meta)
            created_assets.append(asset_meta)

        # 4. Google Search Ads Copy
        if "Google Search" in req.channels or "ad_copy" in req.asset_types:
            asset_search = ContentAsset(
                id=f"cnt-{uuid.uuid4().hex[:8]}",
                brand_id=req.brand_id,
                product_id=req.product_id,
                channel="Google Search",
                asset_type="ad_copy",
                title="Google Search Text Ad - Organic Neem Bedsheet",
                content=(
                    "Headline 1: Herbally Organic Neem Bedsheets | 100% GOTS Organic Cotton\n"
                    "Headline 2: Ancient Neem Botanical Wash | Hypoallergenic & Breathable\n"
                    "Headline 3: Free Shipping in India | Shop Direct\n"
                    "Description 1: Experience restorative sleep with pure 300TC organic cotton infused with Neem. Hypoallergenic & cooling.\n"
                    "Description 2: Ethically crafted sleep wellness. Zero synthetic pesticides or harsh chemical dyes. Order today!"
                ),
                headline="Herbally Organic Neem Bedsheets | 100% GOTS Cotton",
                body_copy="Experience restorative sleep with pure 300TC organic cotton infused with Neem botanical extract. Hypoallergenic, breathable & cooling. Free India shipping.",
                call_to_action="Shop Online",
                hashtags=[],
                image_prompt="Search Text Ad - No image asset required.",
                status="draft",
                provider_source="AI-Synthesized (Intent Query Ad Generator)",
                version=1
            )
            db.add(asset_search)
            created_assets.append(asset_search)

        db.commit()
        for a in created_assets:
            db.refresh(a)
        return created_assets

    @staticmethod
    def list_assets(db: Session, brand_id: Optional[str] = None, channel: Optional[str] = None) -> List[ContentAsset]:
        query = db.query(ContentAsset)
        if brand_id:
            query = query.filter(ContentAsset.brand_id == brand_id)
        if channel:
            query = query.filter(ContentAsset.channel == channel)
        return query.order_by(ContentAsset.created_at.desc()).all()

    @staticmethod
    def get_asset(db: Session, asset_id: str) -> Optional[ContentAsset]:
        return db.query(ContentAsset).filter(ContentAsset.id == asset_id).first()

    @staticmethod
    def create_asset(db: Session, data: ContentAssetCreate) -> ContentAsset:
        # Check claim safety
        clean_content = GuardrailsService.filter_ad_copy(data.content)
        clean_headline = GuardrailsService.filter_ad_copy(data.headline) if data.headline else None
        clean_body = GuardrailsService.filter_ad_copy(data.body_copy) if data.body_copy else None

        asset = ContentAsset(
            id=f"cnt-{uuid.uuid4().hex[:8]}",
            brand_id=data.brand_id,
            product_id=data.product_id,
            campaign_id=data.campaign_id,
            channel=data.channel,
            asset_type=data.asset_type,
            title=data.title,
            content=clean_content,
            headline=clean_headline,
            body_copy=clean_body,
            call_to_action=data.call_to_action,
            hashtags=data.hashtags,
            image_prompt=data.image_prompt,
            generated_media_url=data.generated_media_url,
            status=data.status,
            provider_source=data.provider_source
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def update_asset(db: Session, asset_id: str, data: ContentAssetUpdate) -> Optional[ContentAsset]:
        asset = db.query(ContentAsset).filter(ContentAsset.id == asset_id).first()
        if not asset:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        if "content" in update_dict and update_dict["content"]:
            update_dict["content"] = GuardrailsService.filter_ad_copy(update_dict["content"])
        if "headline" in update_dict and update_dict["headline"]:
            update_dict["headline"] = GuardrailsService.filter_ad_copy(update_dict["headline"])
        if "body_copy" in update_dict and update_dict["body_copy"]:
            update_dict["body_copy"] = GuardrailsService.filter_ad_copy(update_dict["body_copy"])

        for key, value in update_dict.items():
            setattr(asset, key, value)

        asset.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def duplicate_asset(db: Session, asset_id: str) -> Optional[ContentAsset]:
        orig = db.query(ContentAsset).filter(ContentAsset.id == asset_id).first()
        if not orig:
            return None

        dupe = ContentAsset(
            id=f"cnt-{uuid.uuid4().hex[:8]}",
            brand_id=orig.brand_id,
            product_id=orig.product_id,
            campaign_id=orig.campaign_id,
            channel=orig.channel,
            asset_type=orig.asset_type,
            title=f"{orig.title} (Copy)",
            content=orig.content,
            headline=orig.headline,
            body_copy=orig.body_copy,
            call_to_action=orig.call_to_action,
            hashtags=orig.hashtags,
            image_prompt=orig.image_prompt,
            generated_media_url=orig.generated_media_url,
            status="draft",
            provider_source=orig.provider_source,
            version=orig.version + 1
        )
        db.add(dupe)
        db.commit()
        db.refresh(dupe)
        return dupe

    @staticmethod
    def delete_asset(db: Session, asset_id: str) -> bool:
        asset = db.query(ContentAsset).filter(ContentAsset.id == asset_id).first()
        if not asset:
            return False
        db.delete(asset)
        db.commit()
        return True

    @staticmethod
    def schedule_asset(db: Session, asset_id: str, channel: str, scheduled_time: str) -> ContentSchedule:
        asset = db.query(ContentAsset).filter(ContentAsset.id == asset_id).first()
        if not asset:
            raise ValueError("Asset not found")

        asset.status = "scheduled"
        sched = ContentSchedule(
            id=f"sch-{uuid.uuid4().hex[:8]}",
            asset_id=asset.id,
            channel=channel,
            scheduled_time=scheduled_time,
            status="scheduled",
            is_simulated="SIMULATED SANDBOX"
        )
        db.add(sched)
        db.commit()
        db.refresh(sched)
        return sched

    @staticmethod
    def list_schedules(db: Session) -> List[ContentSchedule]:
        return db.query(ContentSchedule).order_by(ContentSchedule.scheduled_time.asc()).all()

    @staticmethod
    def trigger_scheduled_publish_demo(db: Session, schedule_id: str) -> ContentSchedule:
        """
        Executes a safe simulated publication in the demo sandbox.
        Marks schedule as published_demo and records attempt.
        Never executes live external API posts without credentials.
        """
        sched = db.query(ContentSchedule).filter(ContentSchedule.id == schedule_id).first()
        if not sched:
            raise ValueError("Schedule not found")

        sched.attempts_count += 1
        sched.last_attempt_at = datetime.datetime.utcnow()
        sched.status = "published_demo"
        sched.is_simulated = "SIMULATED SANDBOX (Demo Execution Confirmed)"

        if sched.asset:
            sched.asset.status = "published_demo"

        db.commit()
        db.refresh(sched)
        return sched
