import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  BarChart3,
  Camera,
  Video,
  Images,
  Rocket,
  Plus,
  ChevronRight
} from "lucide-react";
import { fetchDashboardSummary } from "../services/api";
import type { DashboardSummaryData, MarketingState, BrandProfile } from "../types";
import { NextBestActionCard } from "./NextBestActionCard";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

interface DashboardViewProps {
  onNavigate: (module: string) => void;
  marketingState: MarketingState | null;
  onSelectWorkflowStage: (stageNum: number) => void;
  brandId?: string;
  brandName?: string;
  activeBrand?: BrandProfile | null;
  onOpenOnboarding?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  marketingState,
  onSelectWorkflowStage,
  brandId,
  brandName,
  activeBrand,
  onOpenOnboarding
}) => {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSummary = () => {
    setLoading(true);
    fetchDashboardSummary(brandId)
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
  }, [brandId]);

  const kpis = summary?.latest_kpi_summary;
  const currentBrandName = brandName || activeBrand?.name || summary?.brand_name || "OmniScale Universal";
  const currentIndustry = activeBrand?.industry || summary?.brand_industry || "AI-Powered Omnichannel Brand";
  const currentMarket = activeBrand?.geographic_market || summary?.geographic_market || "Global / Multi-Region";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>
      {/* =========================================================================
          1. TOP COMMAND BAR: UNIVERSAL AI MARKETING SAAS HEADER
      ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, rgba(20, 27, 44, 0.9) 0%, rgba(10, 13, 20, 0.95) 100%)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em", margin: 0 }}>
              OmniScale AI Command Center
            </h2>
            <span className="badge" style={{ background: "rgba(99, 102, 241, 0.18)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.35)", fontWeight: 600 }}>
              Brand: {currentBrandName}
            </span>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={13} /> {currentIndustry.toLowerCase().includes("ayur") || currentIndustry.toLowerCase().includes("botan") || currentIndustry.toLowerCase().includes("skin") ? "AYUSH/FDA Guardrails Active" : "Regulatory & Claim Guardrails Active"}
            </span>
            <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
              Zero-Spend Sandbox
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", maxWidth: "780px", margin: 0 }}>
            <strong style={{ color: "var(--text-primary)" }}>{currentIndustry}</strong> • Target Market: {currentMarket} • Unified closed-loop AI marketing combining Scalio-grade creative generation, AlmostZero-grade campaign orchestration, and deterministic analytics.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {onOpenOnboarding && (
            <button onClick={onOpenOnboarding} className="btn-secondary" style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={14} /> Onboard Brand
            </button>
          )}
          <button onClick={loadSummary} className="btn-secondary" style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => onNavigate("campaigns")} className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Rocket size={15} /> Campaign Manager
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SCALIO-INSPIRED AI CREATIVE STUDIO LAUNCHPAD
      ========================================================================= */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="var(--brand-emerald)" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Scalio AI Creative Studio Suite
            </h3>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            High-converting image & video asset generation
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {/* Card 1: AI Product Photography Studio */}
          <div
            onClick={() => onNavigate("studio")}
            className="glass-panel glass-panel-hover"
            style={{
              padding: "20px",
              cursor: "pointer",
              borderTop: "3px solid #10b981",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={20} color="#10b981" />
                </div>
                <span className="badge" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#34d399", fontSize: "0.72rem" }}>
                  {summary?.creative_studio_stats?.image_assets ?? 0} Photos Generated
                </span>
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
                AI Product Photography Studio
              </h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                Synthesize studio-grade lighting, contextual commercial backdrops, and e-commerce hero shots tailored for {currentIndustry}.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>E-Commerce & Social</span>
              <span style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                Launch Studio <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 2: AI Video Generation Studio */}
          <div
            onClick={() => onNavigate("video")}
            className="glass-panel glass-panel-hover"
            style={{
              padding: "20px",
              cursor: "pointer",
              borderTop: "3px solid #8b5cf6",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Video size={20} color="#8b5cf6" />
                </div>
                <span className="badge" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#c084fc", fontSize: "0.72rem" }}>
                  {summary?.creative_studio_stats?.video_jobs_total ?? 0} Video Jobs
                </span>
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
                AI Video & Animatics Studio
              </h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                Animate product keyframes into 9:16 Reels and Shorts with cinematic motion and high-converting hooks for {currentIndustry}.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Reels, TikTok & Shorts</span>
              <span style={{ fontSize: "0.82rem", color: "#8b5cf6", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                Generate Video <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 3: Central Media Asset Library */}
          <div
            onClick={() => onNavigate("media")}
            className="glass-panel glass-panel-hover"
            style={{
              padding: "20px",
              cursor: "pointer",
              borderTop: "3px solid #38bdf8",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Images size={20} color="#38bdf8" />
                </div>
                <span className="badge" style={{ background: "rgba(56, 189, 248, 0.1)", color: "#7dd3fc", fontSize: "0.72rem" }}>
                  {summary?.creative_studio_stats?.total_media_assets ?? 0} Vault Assets
                </span>
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
                Central Media Asset Library
              </h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                Unified multi-brand vault preserving source-to-variation lineage, aspect ratio tags, and campaign links.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Multi-Brand Asset Hub</span>
              <span style={{ fontSize: "0.82rem", color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                Browse Media <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. RECENT CREATIVE VAULT SHOWCASE
      ========================================================================= */}
      {summary?.recent_media && summary.recent_media.length > 0 && (
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Images size={16} color="var(--brand-cyan)" /> Recent Studio Creatives Ready for Campaigns
            </h4>
            <button onClick={() => onNavigate("media")} style={{ background: "transparent", color: "var(--brand-cyan)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              View All Vault Media <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            {summary.recent_media.map((m) => (
              <div
                key={m.id}
                onClick={() => onNavigate("campaigns")}
                style={{
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-secondary)",
                  cursor: "pointer",
                  transition: "transform 0.15s ease"
                }}
              >
                <div style={{ height: "130px", background: "#000", position: "relative" }}>
                  <ProtectedMediaImage
                    mediaUrl={m.media_url}
                    alt={m.prompt}
                    isVideo={m.asset_type === "video"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      background: m.asset_type === "video" ? "rgba(139, 92, 246, 0.85)" : "rgba(16, 185, 129, 0.85)",
                      color: "#fff",
                      textTransform: "uppercase"
                    }}
                  >
                    {m.asset_type}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.65rem",
                      background: "rgba(0,0,0,0.75)",
                      color: "#fff"
                    }}
                  >
                    {m.aspect_ratio}
                  </span>
                </div>
                <div style={{ padding: "10px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.provider}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                    {m.prompt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. ALMOSTZERO-INSPIRED CAMPAIGN AUTOMATION PIPELINE
      ========================================================================= */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Rocket size={18} color="#38bdf8" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              AlmostZero Campaign Automation & Approval Pipeline
            </h3>
          </div>
          <button onClick={() => onNavigate("campaigns")} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
            Open Campaign Manager <ArrowRight size={13} />
          </button>
        </div>

        {/* 4 Pipeline Stat Badges */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "16px" }}>
          <div className="glass-panel" style={{ padding: "16px 18px", borderLeft: "4px solid #94a3b8" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Drafts Configured</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>
              {summary?.campaign_pipeline?.draft ?? summary?.content_counts.draft ?? 0}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Setting briefs & channels</div>
          </div>

          <div className="glass-panel" style={{ padding: "16px 18px", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>In Review & Approvals</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>
              {summary?.campaign_pipeline?.pending_review ?? summary?.pending_approvals.length ?? 0}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Awaiting owner sign-off</div>
          </div>

          <div className="glass-panel" style={{ padding: "16px 18px", borderLeft: "4px solid #10b981" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Approved & Compliant</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
              {summary?.campaign_pipeline?.approved ?? summary?.content_counts.approved ?? 0}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Verified guardrails passed</div>
          </div>

          <div className="glass-panel" style={{ padding: "16px 18px", borderLeft: "4px solid #06b6d4" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Ready to Publish</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#06b6d4", marginTop: "4px" }}>
              {summary?.campaign_pipeline?.ready_to_publish ?? summary?.content_counts.scheduled ?? 0}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Staged for distribution</div>
          </div>
        </div>

        {/* Recent Campaigns Row if available */}
        {summary?.recent_campaigns && summary.recent_campaigns.length > 0 && (
          <div className="glass-panel" style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
              Active Campaigns in Workspace
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {summary.recent_campaigns.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate("campaigns")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🚀</span>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", gap: "8px", marginTop: "2px" }}>
                        <span>Target KPI: {c.primary_kpi}</span>
                        <span>•</span>
                        <span>Budget Ceiling: ₹{c.budget.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                        background:
                          c.status === "approved" || c.status === "ready_to_publish"
                            ? "rgba(16, 185, 129, 0.2)"
                            : c.status === "pending_review"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(148, 163, 184, 0.2)",
                        color:
                          c.status === "approved" || c.status === "ready_to_publish"
                            ? "#34d399"
                            : c.status === "pending_review"
                            ? "#fbbf24"
                            : "#94a3b8"
                      }}
                    >
                      {c.status.replace(/_/g, " ")}
                    </span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          5. PROMINENT NEXT BEST ACTION HERO CARD
      ========================================================================= */}
      {marketingState?.next_best_action ? (
        <NextBestActionCard action={marketingState.next_best_action} />
      ) : summary?.next_best_action ? (
        <NextBestActionCard action={summary.next_best_action} />
      ) : null}

      {/* =========================================================================
          6. CLOSED-LOOP MARKETING LIFECYCLE ROAD
      ========================================================================= */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Zap size={16} color="var(--brand-emerald)" /> Closed-Loop Marketing Automation Lifecycle
          </h3>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Click any stage to execute or inspect
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
          {[
            { id: 1, label: "Brand & Goal", module: "brand", desc: "Specs & Claims" },
            { id: 2, label: "Strategy & Persona", module: "products", desc: "Target Segments" },
            { id: 3, label: "Creative Studios", module: "studio", desc: "Product & Video" },
            { id: 4, label: "Campaign Planner", module: "campaigns", desc: "Budget & Angles" },
            { id: 5, label: "Approval Gate", module: "campaigns", desc: "Review & Sign-Off" },
            { id: 6, label: "Publish Calendar", module: "calendar", desc: "Schedule & Windows" },
            { id: 7, label: "Deterministic KPIs", module: "analytics", desc: "No-Div-Zero Math" },
            { id: 8, label: "Next Best Action", module: "analytics", desc: "Closed-Loop V2" },
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
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {stage.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          7. DETERMINISTIC HEURISTIC KPI SUMMARY
      ========================================================================= */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <BarChart3 size={18} color="var(--brand-cyan)" /> Verified Campaign & Simulation Performance
          </h3>
          <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Provenance: {summary?.metric_provenance || "Deterministic Safe Division (Zero Ad Spend)"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Spend</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#38bdf8", marginTop: "6px" }}>
              {kpis ? `₹${kpis.total_spend.toLocaleString("en-IN")}` : "₹0"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Budget Ceiling: ₹{summary?.campaign_pipeline?.total_budget ? summary.campaign_pipeline.total_budget.toLocaleString("en-IN") : "0"}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Blended ROAS</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#34d399", marginTop: "6px" }}>
              {kpis ? `${kpis.overall_roas}x` : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Simulated Revenue: {kpis ? `₹${kpis.total_revenue.toLocaleString("en-IN")}` : "₹0"}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Average CPA</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f59e0b", marginTop: "6px" }}>
              {kpis ? `₹${kpis.overall_cpa.toFixed(2)}` : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {kpis ? `${kpis.total_conversions} Conversions Recorded` : "0 Conversions Recorded"}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Blended CTR</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#a855f7", marginTop: "6px" }}>
              {kpis ? `${kpis.overall_ctr}%` : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {kpis ? `${kpis.total_clicks.toLocaleString("en-IN")} Clicks from ${kpis.total_impressions.toLocaleString("en-IN")} Imp` : "0 Clicks Recorded"}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          8. REVIEW QUEUE & AUTOMATION CONNECTOR HEALTH
      ========================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
        {/* Pending Approvals Queue */}
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <CheckCircle2 size={18} color="var(--brand-emerald)" /> Review & Approval Queue
            </h3>
            <button onClick={() => onNavigate("campaigns")} style={{ background: "transparent", color: "var(--brand-emerald)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              Campaign Approvals <ArrowRight size={13} />
            </button>
          </div>

          {summary?.pending_approvals && summary.pending_approvals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {summary.pending_approvals.slice(0, 3).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{item.type} • {item.channel || "Omnichannel"}</div>
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
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Zap size={18} color="var(--brand-amber)" /> Automation & Connector Health
            </h3>
            <button onClick={() => onNavigate("automations")} style={{ background: "transparent", color: "var(--brand-amber)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              Rules <ArrowRight size={13} />
            </button>
          </div>

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
