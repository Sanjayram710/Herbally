import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  BarChart3
} from "lucide-react";
import { fetchDashboardSummary } from "../services/api";
import type { DashboardSummaryData, MarketingState } from "../types";
import { NextBestActionCard } from "./NextBestActionCard";

interface DashboardViewProps {
  onNavigate: (module: string) => void;
  marketingState: MarketingState | null;
  onSelectWorkflowStage: (stageNum: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  marketingState,
  onSelectWorkflowStage
}) => {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSummary = () => {
    setLoading(true);
    fetchDashboardSummary("herbally-brand")
      .then((data) => {
        setSummary(data);
      })
      .catch((err) => {
        console.warn("Could not load dashboard summary:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const kpis = summary?.latest_kpi_summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner / Welcome */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {summary?.brand_name || "Herbally"} Command Center
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={13} /> Guardrails Active
            </span>
            <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
              Simulated Sandbox Mode
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", maxWidth: "680px" }}>
            {summary?.brand_industry || "Indian Herbal Textiles & Sleep Wellness"} • Closed-loop AI digital marketing automation combining brand intelligence, ad copy synthesis, campaign execution, and deterministic optimization.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={loadSummary} className="btn-secondary" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
          <button onClick={() => onNavigate("assistant")} className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <Sparkles size={14} /> AI Assistant
          </button>
        </div>
      </div>

      {/* Prominent Next Best Action Hero Card */}
      {marketingState?.next_best_action ? (
        <NextBestActionCard action={marketingState.next_best_action} />
      ) : summary?.next_best_action ? (
        <NextBestActionCard action={summary.next_best_action} />
      ) : null}

      {/* Closed-Loop Marketing Lifecycle Navigation Road */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={16} color="var(--brand-emerald)" /> Closed-Loop Marketing Automation Lifecycle
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Click any stage to inspect or progress
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
          {[
            { id: 1, label: "Brand & Goal", module: "brand", desc: "Specs & Claims" },
            { id: 2, label: "Strategy", module: "products", desc: "Budget & Personas" },
            { id: 3, label: "Content Studio", module: "content", desc: "Posts, Ads & Reels" },
            { id: 4, label: "Campaigns", module: "campaigns", desc: "Review & Approvals" },
            { id: 5, label: "Execution", module: "campaigns", desc: "Sandbox Simulation" },
            { id: 6, label: "Analytics", module: "analytics", desc: "Deterministic KPIs" },
            { id: 7, label: "Optimization", module: "analytics", desc: "Next Best Action" },
            { id: 8, label: "Revised Cycle", module: "campaigns", desc: "Closed-Loop V2" },
          ].map((stage) => (
            <button
              key={stage.id}
              onClick={() => {
                onSelectWorkflowStage(stage.id);
                onNavigate(stage.module);
              }}
              className="glass-panel-hover"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                padding: "12px",
                borderRadius: "10px",
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--brand-emerald)", fontWeight: 700, marginBottom: "4px" }}>
                STAGE 0{stage.id}
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {stage.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {stage.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Performance Summary Grid */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart3 size={18} color="var(--brand-cyan)" /> Live Campaign & Simulation Metrics
          </h3>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Provenance: {summary?.metric_provenance || "Deterministic Safe Division"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Spend</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#38bdf8", marginTop: "6px" }}>
              ₹{kpis ? kpis.total_spend.toLocaleString("en-IN") : "48,500"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Budget: ₹50,000 (30 Days)
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Blended ROAS</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#34d399", marginTop: "6px" }}>
              {kpis ? `${kpis.overall_roas}x` : "3.12x"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Revenue: ₹{kpis ? kpis.total_revenue.toLocaleString("en-IN") : "1,51,350"}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Average CPA</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f59e0b", marginTop: "6px" }}>
              ₹{kpis ? kpis.overall_cpa.toFixed(2) : "248.50"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {kpis ? kpis.total_conversions : "195"} Conversions Recorded
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Blended CTR</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#a855f7", marginTop: "6px" }}>
              {kpis ? `${kpis.overall_ctr}%` : "2.84%"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {kpis ? kpis.total_clicks.toLocaleString("en-IN") : "14,520"} Clicks from {kpis ? kpis.total_impressions.toLocaleString("en-IN") : "5,11,000"} Imp
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Pending Approvals & Content Status + Automations */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
        {/* Pending Approvals & Content Pipeline */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} color="var(--brand-emerald)" /> Content Pipeline & Approvals
            </h3>
            <button onClick={() => onNavigate("content")} style={{ background: "transparent", color: "var(--brand-emerald)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
              Studio <ArrowRight size={13} />
            </button>
          </div>

          {/* Counts Badges */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
              Drafts: {summary?.content_counts.draft ?? 0}
            </span>
            <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              Pending Approval: {summary?.content_counts.pending_approval ?? 0}
            </span>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              Approved: {summary?.content_counts.approved ?? 0}
            </span>
            <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
              Scheduled: {summary?.content_counts.scheduled ?? 0}
            </span>
          </div>

          {/* Pending items list */}
          {summary?.pending_approvals && summary.pending_approvals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {summary.pending_approvals.slice(0, 3).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.type} • {item.channel || "Omnichannel"}</div>
                  </div>
                  <button onClick={() => onNavigate(item.type.includes("Campaign") ? "campaigns" : "content")} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                    Review
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", background: "rgba(255,255,255,0.01)", borderRadius: "8px" }}>
              All current campaigns and assets are reviewed. Zero blockers pending.
            </div>
          )}
        </div>

        {/* Automation Execution Feed & Connectors */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={18} color="var(--brand-amber)" /> Automation & Connector Health
            </h3>
            <button onClick={() => onNavigate("automations")} style={{ background: "transparent", color: "var(--brand-amber)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
              Rules <ArrowRight size={13} />
            </button>
          </div>

          {/* Connectors health pill */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <div style={{ flex: 1, padding: "10px 12px", background: "rgba(16, 185, 129, 0.08)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--brand-emerald)" }}>Active Connectors</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                {summary?.integration_health.connected ?? 2} / {summary?.integration_health.total ?? 6}
              </div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", background: "rgba(59, 130, 246, 0.08)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
              <div style={{ fontSize: "0.75rem", color: "#60a5fa" }}>Execution Mode</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "4px" }}>
                Local Sandbox (Safe)
              </div>
            </div>
          </div>

          {/* Recent Automations */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {summary?.recent_automations && summary.recent_automations.length > 0 ? (
              summary.recent_automations.slice(0, 3).map((a) => (
                <div key={a.id} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)", fontWeight: 500 }}>
                    <span>{a.rule_name}</span>
                    <span style={{ color: a.status === "success" ? "#34d399" : "#f43f5e" }}>● {a.status}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.74rem", marginTop: "2px" }}>
                    {a.details}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "12px" }}>
                Ready to run automated schedules.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
