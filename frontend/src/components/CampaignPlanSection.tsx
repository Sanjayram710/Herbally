import React, { useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import type { MarketingState } from "../types";

interface CampaignPlanSectionProps {
  state: MarketingState;
  selectedCampaignId?: string;
  onSelectCampaign: (campaignId: string) => void;
  onSubmitForApproval: (campaignId: string) => Promise<void>;
  onCreateCampaign: (campaign: any) => Promise<void>;
  onProceedToExecution: () => void;
  isLoading: boolean;
}

export const CampaignPlanSection: React.FC<CampaignPlanSectionProps> = ({
  state,
  selectedCampaignId,
  onSelectCampaign,
  onSubmitForApproval,
  onCreateCampaign,
  onProceedToExecution,
  isLoading,
}) => {
  const campaigns = state.campaign_plan || [];
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [platform, setPlatform] = useState<string>("Instagram");
  const [campName, setCampName] = useState<string>("UGC Hook - Skin Calm");
  const [audience, setAudience] = useState<string>("Conscious Wellness Consumers (Tier 1 Metros)");
  const [messaging, setMessaging] = useState<string>("Experience 100% GOTS organic Neem sleep hygiene.");
  const [cta, setCta] = useState<string>("Shop Pure Neem Bedsheets");
  const [budget, setBudget] = useState<number>(10000);

  const totalAllocated = campaigns.reduce((acc, c) => acc + (c.budget_inr || 0), 0);
  const isOverBudget = totalAllocated > state.budget;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateCampaign({
      campaign_name: campName,
      platform,
      objective: "Conversions (Sales)",
      target_audience: audience,
      creative_type: "Selected Asset Ad Copy",
      messaging,
      call_to_action: cta,
      budget_inr: budget,
      duration_days: state.duration_days,
      primary_kpis: ["ROAS > 3.0x", "CPA < INR 1000", "CTR > 2.0%"],
    });
    setShowCreateForm(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="badge badge-verified"><Check size={12} /> Approved</span>;
      case "SIMULATED_RUNNING":
        return <span className="badge" style={{ background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa" }}>Simulated Running</span>;
      case "COMPLETED":
        return <span className="badge badge-verified">Completed</span>;
      case "DRAFT":
        return <span className="badge badge-assumption">Draft (Pending Review)</span>;
      case "PENDING_APPROVAL":
      default:
        return <span className="badge badge-recommendation"><Clock size={12} /> Pending Approval</span>;
    }
  };

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header & Budget Allocation Bar */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", color: "#ffffff", fontWeight: 700 }}>
              Stage 4: Structured Campaign Configurations
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Manage multi-platform campaigns created from selected assets with budget constraints.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-secondary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ fontSize: "0.85rem" }}
            >
              <Plus size={15} />
              {showCreateForm ? "Cancel" : "Add Campaign from Assets"}
            </button>

            <button
              className="btn-primary"
              onClick={onProceedToExecution}
              style={{ fontSize: "0.85rem" }}
            >
              Proceed to Simulated Execution →
            </button>
          </div>
        </div>

        {/* Budget Allocation Progress */}
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px 18px", borderRadius: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "6px" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Budget Allocation: <strong>INR {totalAllocated.toLocaleString()}</strong> of <strong>INR {state.budget.toLocaleString()}</strong>
            </span>
            <span style={{ color: isOverBudget ? "#fb7185" : "#34d399", fontWeight: 600 }}>
              {isOverBudget ? "⚠️ Exceeds Brief Budget" : `INR ${(state.budget - totalAllocated).toLocaleString()} Remaining`}
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min((totalAllocated / state.budget) * 100, 100)}%`,
                height: "100%",
                background: isOverBudget ? "#f43f5e" : "#10b981",
                transition: "width 0.3s ease"
              }}
            />
          </div>
        </div>
      </div>

      {/* Optional Create Custom Campaign Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateSubmit} className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h4 style={{ fontSize: "1rem", color: "#34d399", fontWeight: 600 }}>Configure New Campaign (Draft)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Campaign Name</label>
              <input
                type="text"
                required
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(20, 27, 44, 0.95)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem" }}
              >
                <option value="Instagram">Instagram (Reels/Feed)</option>
                <option value="Meta Ads">Meta Ads (Carousel/Catalog)</option>
                <option value="Google Search">Google Search (High Intent)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Budget (INR)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Target Audience</label>
              <input
                type="text"
                required
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Messaging</label>
              <input
                type="text"
                required
                value={messaging}
                onChange={(e) => setMessaging(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Call to Action</label>
              <input
                type="text"
                required
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "#ffffff", fontSize: "0.85rem" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="submit" className="btn-primary" disabled={isLoading} style={{ padding: "8px 16px" }}>
              Save Campaign as Draft
            </button>
          </div>
        </form>
      )}

      {/* Campaigns List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {campaigns.map((camp) => {
          const isSelected = selectedCampaignId === camp.id;
          const isRevised = !!camp.source_campaign_id || (camp.iteration_number && camp.iteration_number > 1);

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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700 }}>
                      {camp.id}
                    </span>
                    <h4 style={{ fontSize: "1.05rem", color: "#ffffff", fontWeight: 600 }}>
                      {camp.campaign_name}
                    </h4>
                    {isRevised && (
                      <span className="badge" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                        Revised from {camp.source_campaign_id || "CAMP-001"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Platform: <strong>{camp.platform}</strong> • Budget: <strong>INR {camp.budget_inr?.toLocaleString()}</strong> • Duration: {camp.duration_days} Days
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {getStatusBadge(camp.status)}
                  {camp.status === "DRAFT" && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSubmitForApproval(camp.id);
                      }}
                      disabled={isLoading}
                    >
                      Submit for Approval
                    </button>
                  )}
                </div>
              </div>

              {/* Grid details */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "0.82rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px" }}>
                <div><strong>Audience:</strong> {camp.target_audience}</div>
                <div><strong>Creative:</strong> {camp.creative_type}</div>
                <div><strong>Messaging:</strong> {camp.messaging}</div>
                <div><strong>CTA:</strong> {camp.call_to_action}</div>
              </div>

              {camp.primary_kpis && camp.primary_kpis.length > 0 && (
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Target KPIs:</span>
                  {camp.primary_kpis.map((kpi, idx) => (
                    <span key={idx} style={{ background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: "4px", color: "#38bdf8" }}>
                      {kpi}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
