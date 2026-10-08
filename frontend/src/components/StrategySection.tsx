import React, { useState } from "react";
import {
  Compass, Users, TrendingUp, Search, Calendar, Target,
  Megaphone, Check
} from "lucide-react";
import type { MarketingState } from "../types";
import { EpistemicBadge } from "./EpistemicBadge";

interface StrategySectionProps {
  state: MarketingState;
}

export const StrategySection: React.FC<StrategySectionProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "personas" | "research" | "channels" | "seo" | "content" | "campaign"
  >("overview");

  const strat = state.strategy;
  const research = state.research;

  return (
    <div style={{ marginTop: "24px" }}>
      {/* Sub Tabs */}
      <div style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "12px",
        marginBottom: "20px",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        {[
          { id: "overview", label: "Positioning & Objectives", icon: Compass },
          { id: "personas", label: "Target Personas", icon: Users },
          { id: "research", label: "Market & Competitors", icon: TrendingUp },
          { id: "channels", label: "Budget & Channels", icon: Target },
          { id: "seo", label: "SEO Architecture", icon: Search },
          { id: "content", label: "Creatives & Calendar", icon: Megaphone },
          { id: "campaign", label: "Campaign Plan", icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="btn-secondary"
              style={{
                background: isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
                borderColor: isActive ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)",
                color: isActive ? "#34d399" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.85rem",
                whiteSpace: "nowrap"
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Positioning & Objectives */}
      {activeTab === "overview" && strat && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1.15rem", color: "#ffffff" }}>Brand Positioning Statement</h3>
              <EpistemicBadge category="AI_RECOMMENDATION" />
            </div>
            <p style={{ fontSize: "1rem", color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.6, marginBottom: "16px" }}>
              "{strat.positioning_statement}"
            </p>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                Core Value Proposition
              </div>
              <div style={{ fontSize: "0.95rem", color: "#34d399", fontWeight: 600 }}>
                {strat.core_value_proposition}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            <div className="glass-panel" style={{ padding: "22px" }}>
              <h4 style={{ fontSize: "1rem", color: "#ffffff", marginBottom: "14px" }}>Marketing Objectives (30 Days)</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                {strat.marketing_objectives.map((obj, i) => (
                  <li key={i} style={{ display: "flex", gap: "10px", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                    <Check size={16} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-panel" style={{ padding: "22px" }}>
              <h4 style={{ fontSize: "1rem", color: "#ffffff", marginBottom: "14px" }}>Strategic Content Pillars</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                {strat.content_pillars.map((pillar, i) => (
                  <li key={i} style={{ display: "flex", gap: "10px", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38bdf8", marginTop: "8px" }} />
                    <span>{pillar}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Personas */}
      {activeTab === "personas" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
          {state.audience_analysis.map((persona, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className="badge badge-assumption">
                  {persona.is_primary ? "Primary Persona Hypothesis" : "Secondary Persona"}
                </span>
                <EpistemicBadge category="ASSUMPTION_OR_ESTIMATE" />
              </div>
              <h3 style={{ fontSize: "1.2rem", color: "#ffffff", marginBottom: "6px" }}>
                {persona.persona_name}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#38bdf8", marginBottom: "14px" }}>
                {persona.demographics}
              </p>
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
                {persona.psychographics_and_lifestyle}
              </p>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "#fb7185", fontWeight: 600, marginBottom: "6px" }}>
                  Key Pain Points:
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {persona.key_pain_points.map((p, i) => (
                    <li key={i} style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>• {p}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#34d399", fontWeight: 600, marginBottom: "4px" }}>
                  Hook Messaging Angle:
                </div>
                <p style={{ fontSize: "0.85rem", color: "#f8fafc", fontStyle: "italic" }}>
                  "{persona.hook_messaging}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Market & Competitors */}
      {activeTab === "research" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {research && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "1.15rem", color: "#ffffff" }}>Industry Trends & Opportunity Analysis</h3>
                <EpistemicBadge category="EXTERNAL_RESEARCH" sourceText={research.provider_source} />
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "18px" }}>
                {research.market_overview}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                {research.consumer_trends.map((t, idx) => (
                  <div key={idx} style={{ background: "rgba(255, 255, 255, 0.03)", padding: "16px", borderRadius: "10px" }}>
                    <div style={{ fontSize: "0.95rem", color: "#38bdf8", fontWeight: 600, marginBottom: "6px" }}>
                      {t.trend_title}
                    </div>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                      {t.summary}
                    </p>
                    <div style={{ fontSize: "0.8rem", color: "#34d399", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                      <strong>Brand Opportunity:</strong> {t.opportunity_for_brand}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitors Table */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.15rem", color: "#ffffff", marginBottom: "16px" }}>Competitor Landscape Benchmark</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>Competitor</th>
                    <th style={{ padding: "10px" }}>Positioning</th>
                    <th style={{ padding: "10px" }}>Price Range</th>
                    <th style={{ padding: "10px" }}>Marketing Channels</th>
                    <th style={{ padding: "10px" }}>Opportunity For Herbally</th>
                  </tr>
                </thead>
                <tbody>
                  {state.competitors.map((comp, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 10px", fontWeight: 600, color: "#ffffff" }}>{comp.name}</td>
                      <td style={{ padding: "12px 10px", color: "var(--text-secondary)" }}>{comp.positioning}</td>
                      <td style={{ padding: "12px 10px", color: "#38bdf8" }}>{comp.price_range}</td>
                      <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>{comp.channels.join(", ")}</td>
                      <td style={{ padding: "12px 10px", color: "#34d399" }}>{comp.opportunity_for_brand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Channels & Budget */}
      {activeTab === "channels" && strat && (
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", color: "#ffffff" }}>30-Day Channel Budget Allocation</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Total Allocated: INR {state.budget.toLocaleString()} (100% mathematically balanced)
              </p>
            </div>
            <EpistemicBadge category="AI_RECOMMENDATION" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {strat.channels.map((chan, idx) => (
              <div key={idx} style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff" }}>{chan.channel}</div>
                  <span className="badge badge-recommendation">{chan.budget_share_pct}%</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginBottom: "10px" }}>
                  {chan.funnel_stage}
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34d399", marginBottom: "10px" }}>
                  INR {chan.budget_allocated_inr.toLocaleString()}
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {chan.rationale_why}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: SEO Architecture */}
      {activeTab === "seo" && state.seo_strategy && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.15rem", color: "#ffffff", marginBottom: "14px" }}>Target Keyword Strategy</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>Target Keyword</th>
                    <th style={{ padding: "10px" }}>Category</th>
                    <th style={{ padding: "10px" }}>Intent</th>
                    <th style={{ padding: "10px" }}>Content Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {state.seo_strategy.target_keywords.map((kw, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 10px", fontWeight: 600, color: "#38bdf8" }}>{kw.keyword}</td>
                      <td style={{ padding: "12px 10px", color: "var(--text-secondary)" }}>{kw.category}</td>
                      <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>{kw.search_intent}</td>
                      <td style={{ padding: "12px 10px", color: "var(--text-primary)" }}>{kw.content_recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Content & Ad Copy */}
      {activeTab === "content" && state.content_strategy && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Ad Variations */}
          <div>
            <h3 style={{ fontSize: "1.15rem", color: "#ffffff", marginBottom: "16px" }}>3 High-Converting Ad Copy Variations</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
              {state.content_strategy.ad_copy_variations.map((ad, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>{ad.platform}</span>
                    <span className="badge badge-recommendation">{ad.format}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                    Angle: {ad.target_angle}
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>
                    "{ad.headline}"
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "16px", whiteSpace: "pre-line" }}>
                    {ad.body_copy}
                  </p>
                  <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "8px 12px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>
                    CTA: {ad.call_to_action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Calendar */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.15rem", color: "#ffffff", marginBottom: "14px" }}>Weekly Editorial Content Calendar</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              {state.content_strategy.weekly_content_calendar.map((item, idx) => (
                <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#34d399", marginBottom: "4px" }}>{item.Day}</div>
                  <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginBottom: "6px" }}>{item.Format}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{item.Concept}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Campaign Plan */}
      {activeTab === "campaign" && (
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", color: "#ffffff" }}>Simulated Campaign Deployment Plan</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Human approval required prior to live advertising activation
              </p>
            </div>
            <span className="badge badge-verified">Simulated Sandbox</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {state.campaign_plan.map((cp, idx) => (
              <div key={idx} style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>{cp.campaign_name}</div>
                  <span style={{ fontSize: "0.75rem", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "3px 8px", borderRadius: "6px" }}>
                    {cp.execution_status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "10px" }}>
                  <div><strong>Platform:</strong> {cp.platform}</div>
                  <div><strong>Budget:</strong> INR {cp.budget_inr.toLocaleString()}</div>
                  <div><strong>Creative:</strong> {cp.creative_type}</div>
                  <div><strong>KPI Target:</strong> {cp.primary_kpis.join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
