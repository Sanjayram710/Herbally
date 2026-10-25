import React from "react";
import { ArrowRight, ShieldCheck, HelpCircle, Repeat, Rocket } from "lucide-react";
import type { OptimizationRecommendation, EpistemicSource, AssumptionItem, NextBestAction } from "../types";

interface OptimizationSectionProps {
  recommendations: OptimizationRecommendation[];
  nextBestAction: NextBestAction | null | undefined;
  sources: EpistemicSource[];
  assumptions: AssumptionItem[];
  currentIteration: number;
  onIterateCampaign: () => Promise<void>;
  onReviseCampaign?: (recommendationId?: string) => Promise<void>;
  onProceedToRevised?: () => void;
  isLoading: boolean;
}

export const OptimizationSection: React.FC<OptimizationSectionProps> = ({
  recommendations,
  nextBestAction,
  sources,
  assumptions,
  currentIteration,
  onIterateCampaign,
  onReviseCampaign,
  onProceedToRevised,
  isLoading,
}) => {
  const nextIter = nextBestAction?.next_campaign_iteration;

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Closed-Loop Action Banner */}
      {nextIter && (
        <div className="glass-panel pulse-glow" style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.5)",
          borderRadius: "16px",
          padding: "24px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
                <Repeat size={22} />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#34d399", fontWeight: 700 }}>
                  CLOSED-LOOP MARKETING AGENT ENGINE
                </span>
                <h3 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700 }}>
                  Deploy Next-Best Campaign Iteration (Iteration {currentIteration + 1})
                </h3>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                onClick={() => onIterateCampaign()}
                disabled={isLoading}
                style={{ padding: "12px 24px", fontSize: "0.95rem" }}
              >
                <Rocket size={17} />
                {isLoading ? "Generating Iteration..." : `Create Campaign Iteration ${currentIteration + 1} →`}
              </button>
              {onProceedToRevised && (
                <button
                  className="btn-secondary"
                  onClick={onProceedToRevised}
                  style={{ padding: "12px 20px", fontSize: "0.95rem", borderColor: "rgba(168, 85, 247, 0.5)", color: "#c084fc" }}
                >
                  View Revised Campaign (Stage 8) →
                </button>
              )}
            </div>
          </div>

          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
            The agent has analyzed campaign results and generated a refined follow-up strategy: scaling budget by +30% on the top-performing UGC Reel creative, introducing 3 new hook angles, and eliminating spend on underperforming banners.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px", fontSize: "0.82rem" }}>
            <div><strong>Iterated Campaign:</strong> {nextIter.campaign_name}</div>
            <div><strong>Platform:</strong> {nextIter.platform}</div>
            <div><strong>Scaled Budget:</strong> INR {Number(nextIter.budget_inr).toLocaleString()}</div>
            <div><strong>Target ROAS:</strong> {nextIter.kpi_targets?.target_roas}x</div>
          </div>
        </div>
      )}

      {/* Optimization Recommendations List */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1.2rem", color: "#ffffff", marginBottom: "8px" }}>
          Optimization Decisions & Strategic Actions
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Evidence-backed heuristics identifying what is working, what is failing, and concrete next steps.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700
                  }}>
                    {idx + 1}
                  </span>
                  <h4 style={{ fontSize: "1.05rem", color: "#ffffff", fontWeight: 600 }}>
                    {rec.finding}
                  </h4>
                </div>

                <span className={rec.priority === "HIGH" ? "badge badge-priority-high" : "badge badge-recommendation"}>
                  Priority: {rec.priority}
                </span>
              </div>

              {/* 6-point breakdown grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "14px", fontSize: "0.85rem" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: "8px" }}>
                  <strong style={{ color: "var(--text-muted)", display: "block", fontSize: "0.75rem", marginBottom: "3px" }}>EVIDENCE:</strong>
                  <span style={{ color: "var(--text-secondary)" }}>{rec.evidence}</span>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: "8px" }}>
                  <strong style={{ color: "var(--text-muted)", display: "block", fontSize: "0.75rem", marginBottom: "3px" }}>STRATEGIC RECOMMENDATION:</strong>
                  <span style={{ color: "var(--text-primary)" }}>{rec.recommendation}</span>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: "8px" }}>
                  <strong style={{ color: "var(--text-muted)", display: "block", fontSize: "0.75rem", marginBottom: "3px" }}>EXPECTED IMPACT:</strong>
                  <span style={{ color: "#34d399" }}>{rec.expected_impact}</span>
                </div>
              </div>

              {/* Concrete Next Action */}
              <div style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <ArrowRight size={16} color="#10b981" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: "#34d399", fontSize: "0.8rem", textTransform: "uppercase", marginRight: "8px" }}>
                    Concrete Action:
                  </strong>
                  <span style={{ color: "#ffffff", fontSize: "0.88rem", fontWeight: 500 }}>
                    {rec.concrete_action}
                  </span>
                </div>
              </div>

              {/* Action to Revise Campaign */}
              <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn-secondary"
                  style={{
                    borderColor: "rgba(168, 85, 247, 0.4)",
                    color: "#c084fc",
                    fontSize: "0.82rem",
                    padding: "6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={() => onReviseCampaign ? onReviseCampaign(rec.id) : onIterateCampaign()}
                  disabled={isLoading}
                >
                  <Rocket size={13} />
                  Apply Recommendation & Create Revised Campaign (Stage 8) →
                </button>
              </div>
            </div>
          ))}
        </div>

        {onProceedToRevised && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <button
              className="btn-primary"
              onClick={onProceedToRevised}
              style={{ padding: "12px 24px", fontSize: "0.95rem" }}
            >
              Proceed to Stage 8: Revised Campaign Plan →
            </button>
          </div>
        )}
      </div>

      {/* Epistemic Audit: Sources & Assumptions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* Sources */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <ShieldCheck size={18} color="#10b981" />
            <h4 style={{ fontSize: "1rem", color: "#ffffff" }}>Grounded Source Provenance</h4>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sources.map((s, idx) => (
              <div key={idx} style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#38bdf8", fontWeight: 600 }}>{s.category}</span>
                  <span style={{ color: "var(--text-muted)" }}>Confidence: {s.confidence_level}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>{s.description}</div>
                {s.source_reference && (
                  <div style={{ color: "#34d399", fontSize: "0.75rem" }}>Ref: {s.source_reference}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assumptions */}
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <HelpCircle size={18} color="#f59e0b" />
            <h4 style={{ fontSize: "1rem", color: "#ffffff" }}>Audited Working Assumptions</h4>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {assumptions.map((a, idx) => (
              <div key={idx} style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", fontSize: "0.82rem" }}>
                <div style={{ color: "#fbbf24", fontWeight: 600, marginBottom: "4px" }}>{a.category}</div>
                <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>{a.statement}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Impact: {a.impact}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
