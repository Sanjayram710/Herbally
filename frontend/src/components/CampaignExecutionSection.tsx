import React, { useState } from "react";
import { CheckCircle, ShieldAlert, Rocket, Activity, Check, Clock } from "lucide-react";
import type { CampaignPlanItem } from "../types";

interface CampaignExecutionSectionProps {
  campaigns: CampaignPlanItem[];
  onApproveCampaign: (campaignId: string) => Promise<void>;
  onLaunchCampaign: (campaignId?: string) => Promise<void>;
  onProceedToAnalytics: () => void;
  isLoading: boolean;
}

export const CampaignExecutionSection: React.FC<CampaignExecutionSectionProps> = ({
  campaigns,
  onApproveCampaign,
  onLaunchCampaign,
  onProceedToAnalytics,
  isLoading,
}) => {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const hasApprovedCampaigns = campaigns.some(
    (c) => c.status === "APPROVED" || c.status === "COMPLETED"
  );
  const allCompleted = campaigns.length > 0 && campaigns.every((c) => c.status === "COMPLETED");

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await onApproveCampaign(id);
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="badge" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#38bdf8", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
            <Check size={12} /> Approved
          </span>
        );
      case "SIMULATED_RUNNING":
        return (
          <span className="badge" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.4)" }}>
            <Activity size={12} className="pulse-glow" /> Simulated Running
          </span>
        );
      case "COMPLETED":
        return (
          <span className="badge badge-verified">
            <CheckCircle size={12} /> Completed
          </span>
        );
      case "PENDING_APPROVAL":
      default:
        return (
          <span className="badge badge-assumption">
            <Clock size={12} /> Pending Approval
          </span>
        );
    }
  };

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
            No live ad platforms are called and no real financial spend occurs. All marketing campaigns run within a simulated execution engine producing deterministic performance data. <strong>Human approval is required before simulation begins.</strong>
          </p>
        </div>
      </div>

      {/* Campaign List with Approval & Status */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", color: "#ffffff" }}>Campaign Staging & Approval Gate</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Review campaign specifications and grant human approval before launching
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-secondary"
              onClick={() => handleApprove("all")}
              disabled={isLoading || campaigns.every(c => c.status !== "PENDING_APPROVAL")}
            >
              <Check size={15} color="#10b981" />
              Approve All Campaigns
            </button>

            <button
              className="btn-primary"
              onClick={() => onLaunchCampaign()}
              disabled={isLoading || !hasApprovedCampaigns}
              style={{
                boxShadow: hasApprovedCampaigns ? "0 4px 18px rgba(16, 185, 129, 0.45)" : "none"
              }}
            >
              <Rocket size={16} />
              {isLoading ? "Running Simulation..." : "Launch Campaign (Simulated Sandbox)"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "18px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>
                      Iteration {camp.iteration_number || 1}
                    </span>
                    <h4 style={{ fontSize: "1.05rem", color: "#ffffff", fontWeight: 600 }}>
                      {camp.campaign_name}
                    </h4>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Platform: {camp.platform} • Budget: INR {camp.budget_inr.toLocaleString()} • Duration: {camp.duration_days} Days
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {getStatusBadge(camp.status)}
                  {camp.status === "PENDING_APPROVAL" && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      onClick={() => handleApprove(camp.id)}
                      disabled={isLoading || approvingId === camp.id}
                    >
                      <Check size={13} color="#10b981" />
                      Approve
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "0.82rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px" }}>
                <div><strong>Target Audience:</strong> {camp.target_audience}</div>
                <div><strong>Creative:</strong> {camp.creative_type}</div>
                <div><strong>Messaging:</strong> {camp.messaging}</div>
                <div><strong>Call To Action:</strong> {camp.call_to_action}</div>
              </div>
            </div>
          ))}
        </div>

        {allCompleted && (
          <div style={{ marginTop: "24px", textAlign: "center", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "12px", padding: "18px" }}>
            <div style={{ fontSize: "0.95rem", color: "#34d399", fontWeight: 600, marginBottom: "8px" }}>
              ✓ All campaigns completed in the Simulated Sandbox!
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
              Performance data has been collected and deterministic analytics have been computed.
            </p>
            <button className="btn-primary" onClick={onProceedToAnalytics} style={{ margin: "0 auto" }}>
              Proceed to Campaign Analytics & Optimization →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
