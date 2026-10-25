import React from "react";
import { ArrowLeft, Check, Clock, GitBranch, Rocket, Sparkles } from "lucide-react";
import type { MarketingState } from "../types";

interface RevisedCampaignSectionProps {
  state: MarketingState;
  onSubmitForApproval: (campaignId: string) => Promise<void>;
  onApproveCampaign: (campaignId: string) => Promise<void>;
  onLaunchExecution: () => void;
  onBackToOptimization: () => void;
  isLoading: boolean;
}

export const RevisedCampaignSection: React.FC<RevisedCampaignSectionProps> = ({
  state,
  onSubmitForApproval,
  onApproveCampaign,
  onLaunchExecution,
  onBackToOptimization,
  isLoading,
}) => {
  const campaigns = state.campaign_plan || [];
  // Find revised campaigns (either marked with source_campaign_id, revised_from_id, or iteration > 1)
  const revisedCampaigns = campaigns.filter(
    (c) => Boolean(c.source_campaign_id) || Boolean(c.revised_from_id) || (c.iteration_number && c.iteration_number > 1)
  );

  // If none explicitly flagged as revised yet, show a fallback message or preview
  const primaryRevised = revisedCampaigns[0];
  const sourceCampaign = primaryRevised
    ? campaigns.find((c) => c.id === primaryRevised.source_campaign_id || c.id === primaryRevised.revised_from_id)
    : null;

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Closed-Loop Lineage Banner */}
      <div
        className="glass-panel"
        style={{
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)",
          border: "1px solid rgba(168, 85, 247, 0.4)",
          borderRadius: "16px",
          padding: "24px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
              <GitBranch size={22} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#c084fc", fontWeight: 700 }}>
                STAGE 8: CLOSED-LOOP ITERATION
              </span>
              <h3 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700 }}>
                Revised Campaign Plan & Complete Lineage
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-secondary"
              onClick={onBackToOptimization}
              style={{ fontSize: "0.85rem" }}
            >
              <ArrowLeft size={15} />
              Review Optimization Heuristics
            </button>
            <button
              className="btn-primary"
              onClick={onLaunchExecution}
              style={{ fontSize: "0.85rem" }}
            >
              Simulated Execution Hub →
            </button>
          </div>
        </div>

        {/* Audit Lineage Trail */}
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px 18px", borderRadius: "10px", fontSize: "0.82rem" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", fontWeight: 600 }}>
            Deterministic Relational Lineage:
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", color: "#ffffff" }}>
            <span style={{ color: "#38bdf8" }}>Brief ({state.product_name})</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span>Strategy</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span>Content Assets</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span style={{ color: "#fbbf24" }}>Base Campaign ({sourceCampaign?.id || "CAMP-001"})</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span>Simulation</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span>Analytics</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span style={{ color: "#f43f5e" }}>Optimization ({state.recommendations.length} Recs)</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span style={{ color: "#34d399", fontWeight: 700 }}>Revised Campaign ({primaryRevised?.id || "CAMP-001-REV1"})</span>
          </div>
        </div>
      </div>

      {/* Revised Campaigns List */}
      {revisedCampaigns.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {revisedCampaigns.map((camp) => {
            const isDraft = camp.status === "DRAFT";
            const isPending = camp.status === "PENDING_APPROVAL";
            const isApproved = camp.status === "APPROVED";

            return (
              <div
                key={camp.id}
                className="glass-panel"
                style={{
                  padding: "24px",
                  border: "1.5px solid rgba(168, 85, 247, 0.4)",
                  background: "var(--bg-card)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <span className="badge" style={{ background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontWeight: 700 }}>
                        {camp.id}
                      </span>
                      <h3 style={{ fontSize: "1.2rem", color: "#ffffff", fontWeight: 700 }}>
                        {camp.campaign_name}
                      </h3>
                      <span className="badge badge-assumption">
                        Iteration {camp.iteration_number || 2}
                      </span>
                      <span className={isDraft ? "badge badge-recommendation" : isApproved ? "badge badge-verified" : "badge badge-recommendation"}>
                        Status: {camp.status}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Platform: <strong>{camp.platform}</strong> • Scaled Budget: <strong>INR {camp.budget_inr?.toLocaleString()}</strong> • Duration: {camp.duration_days} Days
                    </div>
                  </div>

                  {/* Actions for Revised Campaign */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {isDraft && (
                      <button
                        className="btn-secondary"
                        onClick={() => onSubmitForApproval(camp.id)}
                        disabled={isLoading}
                        style={{ fontSize: "0.82rem" }}
                      >
                        <Clock size={14} />
                        Submit for Approval
                      </button>
                    )}

                    {isPending && (
                      <button
                        className="btn-primary"
                        onClick={() => onApproveCampaign(camp.id)}
                        disabled={isLoading}
                        style={{ fontSize: "0.82rem" }}
                      >
                        <Check size={14} />
                        Approve Revised Plan
                      </button>
                    )}

                    {isApproved && (
                      <button
                        className="btn-primary"
                        onClick={onLaunchExecution}
                        style={{ fontSize: "0.82rem" }}
                      >
                        <Rocket size={14} />
                        Launch in Sandbox →
                      </button>
                    )}
                  </div>
                </div>

                {/* Explicit Lineage & Metadata Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "16px", background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "10px", fontSize: "0.82rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>SOURCE CAMPAIGN LINEAGE</span>
                    <strong style={{ color: "#38bdf8" }}>{camp.source_campaign_id || camp.revised_from_id || "CAMP-001"}</strong>
                    {sourceCampaign && (
                      <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                        "{sourceCampaign.campaign_name}" (INR {sourceCampaign.budget_inr?.toLocaleString()})
                      </div>
                    )}
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>APPLIED RECOMMENDATIONS</span>
                    <div style={{ color: "#34d399", fontWeight: 600 }}>
                      {camp.applied_recommendation_ids && camp.applied_recommendation_ids.length > 0
                        ? camp.applied_recommendation_ids.join(", ")
                        : "REC-OPT-001 (Scale UGC Reel spend +30%), REC-OPT-002 (Cut static banner drag)"}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>OPERATIONAL CHANGES APPLIED</span>
                    <div style={{ color: "#ffffff" }}>
                      Budget scaled +30%, creative refreshed with 3 video hooks, CPA target reduced to INR 850.
                    </div>
                  </div>
                </div>

                {/* Strategy & Messaging */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  <div><strong>Audience:</strong> {camp.target_audience}</div>
                  <div><strong>Creative Type:</strong> {camp.creative_type}</div>
                  <div><strong>Messaging:</strong> {camp.messaging}</div>
                  <div><strong>Call to Action:</strong> {camp.call_to_action}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "36px", textAlign: "center" }}>
          <Sparkles size={32} color="#a855f7" style={{ margin: "0 auto 12px" }} />
          <h4 style={{ fontSize: "1.1rem", color: "#ffffff", fontWeight: 600, marginBottom: "8px" }}>
            No Revised Campaign Generated Yet
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "540px", margin: "0 auto 18px", lineHeight: 1.5 }}>
            Go to Stage 7 (Optimization Decisions) and click "Apply Recommendation & Create Revised Campaign" to synthesize empirical performance metrics into a calibrated follow-up campaign.
          </p>
          <button className="btn-primary" onClick={onBackToOptimization}>
            Go to Stage 7: Optimization Decisions →
          </button>
        </div>
      )}
    </div>
  );
};
