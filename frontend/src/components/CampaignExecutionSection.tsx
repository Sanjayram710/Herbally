import React, { useState } from "react";
import { CheckCircle, ShieldAlert, Rocket, Activity, Check, Clock, Pause, Play, RotateCcw } from "lucide-react";
import type { CampaignPlanItem } from "../types";

interface CampaignExecutionSectionProps {
  campaigns: CampaignPlanItem[];
  selectedCampaignId?: string;
  onSelectCampaign: (campaignId: string) => void;
  onApproveCampaign: (campaignId: string) => Promise<void>;
  onLaunchCampaign: (campaignId?: string) => Promise<void>;
  onUpdateStatus: (campaignId: string, status: string) => Promise<void>;
  onResetCampaign: (campaignId: string) => Promise<void>;
  onProceedToAnalytics: () => void;
  isLoading: boolean;
}

export const CampaignExecutionSection: React.FC<CampaignExecutionSectionProps> = ({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onApproveCampaign,
  onLaunchCampaign,
  onUpdateStatus,
  onResetCampaign,
  onProceedToAnalytics,
  isLoading,
}) => {
  const [actingId, setActingId] = useState<string | null>(null);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await onApproveCampaign(id);
    } finally {
      setActingId(null);
    }
  };

  const handleLaunch = async (id?: string) => {
    setActingId(id || "launch");
    try {
      await onLaunchCampaign(id);
    } finally {
      setActingId(null);
    }
  };

  const handlePause = async (id: string) => {
    setActingId(id);
    try {
      await onUpdateStatus(id, "PAUSED");
    } finally {
      setActingId(null);
    }
  };

  const handleResume = async (id: string) => {
    setActingId(id);
    try {
      await onUpdateStatus(id, "SIMULATED_RUNNING");
    } finally {
      setActingId(null);
    }
  };

  const handleReset = async (id: string) => {
    setActingId(id);
    try {
      await onResetCampaign(id);
    } finally {
      setActingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="badge badge-verified">
            <Check size={12} /> Approved
          </span>
        );
      case "SIMULATED_RUNNING":
        return (
          <span className="badge" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.4)" }}>
            <Activity size={12} className="pulse-glow" /> Simulated Running
          </span>
        );
      case "PAUSED":
        return (
          <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
            <Pause size={12} /> Paused
          </span>
        );
      case "COMPLETED":
        return (
          <span className="badge badge-verified">
            <CheckCircle size={12} /> Completed (Sandbox)
          </span>
        );
      case "DRAFT":
        return (
          <span className="badge badge-assumption">
            Draft (Review)
          </span>
        );
      case "PENDING_APPROVAL":
      default:
        return (
          <span className="badge badge-recommendation">
            <Clock size={12} /> Pending Approval
          </span>
        );
    }
  };

  const hasApprovedCampaigns = campaigns.some(
    (c) => c.status === "APPROVED" || c.status === "SIMULATED_RUNNING"
  );

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Simulation Safety & Boundaries Banner */}
      <div style={{
        background: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
        borderRadius: "14px",
        padding: "18px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px"
      }}>
        <ShieldAlert size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h4 style={{ fontSize: "1rem", color: "#fbbf24", fontWeight: 600, marginBottom: "4px" }}>
            Simulated Sandbox Mode (Strict Safety Boundaries)
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            No live ad platforms are called and zero real financial currency is expended. All marketing operations run inside a deterministic execution sandbox. <strong>Real state transitions (Draft → Pending Approval → Approved → Simulated Running → Completed) are strictly enforced.</strong>
          </p>
        </div>
      </div>

      {/* Global Action Bar */}
      <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ fontSize: "1.2rem", color: "#ffffff", fontWeight: 700 }}>
            Stage 5: Campaign Execution Dashboard (Simulated Sandbox)
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Review state transitions, grant approval, launch simulated runs, or pause/reset execution.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn-secondary"
            onClick={() => handleApprove("all")}
            disabled={isLoading || campaigns.every(c => c.status !== "PENDING_APPROVAL" && c.status !== "DRAFT")}
          >
            <Check size={15} color="#10b981" />
            Approve All
          </button>

          <button
            className="btn-primary"
            onClick={() => handleLaunch()}
            disabled={isLoading || !hasApprovedCampaigns}
            style={{
              boxShadow: hasApprovedCampaigns ? "0 4px 18px rgba(16, 185, 129, 0.45)" : "none"
            }}
          >
            <Rocket size={16} />
            {isLoading ? "Executing Sandbox..." : "Launch Campaign (Simulated Sandbox)"}
          </button>

          <button
            className="btn-secondary"
            onClick={onProceedToAnalytics}
            style={{ borderColor: "#10b981", color: "#34d399" }}
          >
            Inspect Analytics →
          </button>
        </div>
      </div>

      {/* Campaign List with Interactive Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {campaigns.map((camp) => {
          const isSelected = selectedCampaign?.id === camp.id;
          const isActing = actingId === camp.id;

          return (
            <div
              key={camp.id}
              onClick={() => onSelectCampaign(camp.id)}
              className="glass-panel"
              style={{
                padding: "20px",
                cursor: "pointer",
                border: isSelected ? "1.5px solid #10b981" : "1px solid var(--border-subtle)",
                background: isSelected ? "rgba(16, 185, 129, 0.04)" : "var(--bg-card)",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>
                      {camp.id}
                    </span>
                    <h4 style={{ fontSize: "1.05rem", color: "#ffffff", fontWeight: 600 }}>
                      {camp.campaign_name}
                    </h4>
                    {getStatusBadge(camp.status)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Platform: {camp.platform} • Budget: INR {camp.budget_inr?.toLocaleString()} • Duration: {camp.duration_days} Days
                  </div>
                </div>

                {/* Granular Operational Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {(camp.status === "PENDING_APPROVAL" || camp.status === "DRAFT") && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(camp.id);
                      }}
                      disabled={isLoading || isActing}
                    >
                      <Check size={13} color="#10b981" />
                      Approve
                    </button>
                  )}

                  {camp.status === "APPROVED" && (
                    <button
                      className="btn-primary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunch(camp.id);
                      }}
                      disabled={isLoading || isActing}
                    >
                      <Rocket size={13} />
                      Launch Sandbox
                    </button>
                  )}

                  {camp.status === "SIMULATED_RUNNING" && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem", color: "#fbbf24" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePause(camp.id);
                      }}
                      disabled={isLoading || isActing}
                    >
                      <Pause size={13} />
                      Pause
                    </button>
                  )}

                  {camp.status === "PAUSED" && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem", color: "#34d399" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResume(camp.id);
                      }}
                      disabled={isLoading || isActing}
                    >
                      <Play size={13} />
                      Resume
                    </button>
                  )}

                  {(camp.status === "COMPLETED" || camp.status === "PAUSED") && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset(camp.id);
                      }}
                      disabled={isLoading || isActing}
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "0.82rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px" }}>
                <div><strong>Audience:</strong> {camp.target_audience}</div>
                <div><strong>Creative:</strong> {camp.creative_type}</div>
                <div><strong>Messaging:</strong> {camp.messaging}</div>
                <div><strong>CTA:</strong> {camp.call_to_action}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Proceed to Analytics Bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
        <button
          className="btn-primary"
          onClick={onProceedToAnalytics}
          style={{ padding: "12px 24px", fontSize: "0.95rem" }}
        >
          Proceed to Campaign Analytics ({selectedCampaign?.campaign_name || "Selected"}) →
        </button>
      </div>
    </div>
  );
};
