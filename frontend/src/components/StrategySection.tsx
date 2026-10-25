import { useState } from "react";
import {
  Compass, Users, TrendingUp, Search, Target,
  Megaphone, Check, FileText, Video, Mail, Globe, Layers, Copy
} from "lucide-react";
import type { MarketingState } from "../types";
import { EpistemicBadge } from "./EpistemicBadge";

interface StrategySectionProps {
  state: MarketingState;
  onProceedToContent?: () => void;
}

export const StrategySection: React.FC<StrategySectionProps> = ({ state, onProceedToContent }) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "personas" | "research" | "channels" | "seo" | "content" | "assets"
  >("overview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const strat = state.strategy;
  const research = state.research;
  const assets = state.content_strategy?.asset_bundle;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
          { id: "assets", label: "Marketing Asset Bundle (8 Formats)", icon: Layers },
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
              <EpistemicBadge category="MARKETING_SUGGESTION" />
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
                <EpistemicBadge category="AI_INFERENCE" />
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
                <EpistemicBadge category="RESEARCH_FINDING" sourceText={research.provider_source} />
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
            <EpistemicBadge category="MARKETING_SUGGESTION" />
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

      {/* Tab 7: Comprehensive Marketing Asset Bundle (Section 5.2) */}
      {activeTab === "assets" && assets && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", color: "#ffffff" }}>Generated Marketing Assets (8 Formats)</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Ready-to-deploy creatives following strictly grounded brand claims
              </p>
            </div>
            <EpistemicBadge category="MARKETING_SUGGESTION" />
          </div>

          {/* 1. Instagram Post & 2. Instagram Reel Script */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {/* Instagram Post */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.85rem", color: "#e1306c", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Megaphone size={16} /> 1. Instagram Feed Post
                </span>
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => handleCopy("ig_post", assets.instagram_post.caption || "")}
                >
                  <Copy size={12} /> {copiedKey === "ig_post" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: "12px" }}>
                {assets.instagram_post.caption}
              </p>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginBottom: "8px" }}>
                {assets.instagram_post.hashtags?.join(" ")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                <strong>Visual Concept:</strong> {assets.instagram_post.image_concept}
              </div>
            </div>

            {/* Instagram Reel Script */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.85rem", color: "#e1306c", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Video size={16} /> 2. Instagram Reel Video Script
                </span>
              </div>
              <div style={{ background: "rgba(225, 48, 108, 0.1)", border: "1px solid rgba(225, 48, 108, 0.25)", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>
                <strong style={{ fontSize: "0.78rem", color: "#f43f5e", display: "block" }}>3-Second Hook:</strong>
                <span style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: 600 }}>"{assets.instagram_reel_script.hook}"</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {assets.instagram_reel_script.scenes?.map((sc, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.8rem" }}>
                    <span style={{ color: "#38bdf8", fontWeight: 600 }}>[{sc.second}]</span> {sc.visual}
                    <div style={{ color: "#34d399", fontSize: "0.75rem", marginTop: "2px" }}>Overlay: "{sc.text_overlay}"</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                <strong>Voiceover:</strong> {assets.instagram_reel_script.voiceover}
              </div>
            </div>
          </div>

          {/* 3. Meta Ad Copy & 4. Google Search Ad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {/* Meta Ad Copy */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.85rem", color: "#1877f2", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText size={16} /> 3. Meta Feed Ad Copy
                </span>
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => handleCopy("meta_ad", assets.meta_ad_copy.primary_text || "")}
                >
                  <Copy size={12} /> {copiedKey === "meta_ad" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>
                "{assets.meta_ad_copy.headline}"
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12px" }}>
                {assets.meta_ad_copy.primary_text}
              </p>
              <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>
                CTA Button: {assets.meta_ad_copy.call_to_action}
              </div>
            </div>

            {/* Google Search Ad */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "0.85rem", color: "#4285f4", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Globe size={16} /> 4. Google Responsive Search Ad
              </span>
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Headlines:</strong>
                <ul style={{ listStyle: "none", fontSize: "0.84rem", color: "#38bdf8" }}>
                  {assets.google_search_ad.headlines?.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Descriptions:</strong>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  {assets.google_search_ad.descriptions?.join(" ")}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {assets.google_search_ad.sitelinks?.map((sl, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", padding: "6px 8px", borderRadius: "6px", fontSize: "0.75rem" }}>
                    <div style={{ color: "#34d399", fontWeight: 600 }}>{sl.title}</div>
                    <div style={{ color: "var(--text-muted)" }}>{sl.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Email Marketing & 6. Blog SEO */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            {/* Email Marketing */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "0.85rem", color: "#a855f7", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Mail size={16} /> 5. Lifecycle Email Campaign
              </span>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#ffffff", marginBottom: "4px" }}>
                Subject: {assets.email_marketing.subject_line}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                Preview: {assets.email_marketing.preview_text}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", whiteSpace: "pre-line", marginBottom: "10px" }}>
                {assets.email_marketing.body_markdown}
              </div>
              <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>
                CTA: {assets.email_marketing.cta_text}
              </div>
            </div>

            {/* Blog SEO Content */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Search size={16} /> 6. Blog & On-Page SEO Outline
              </span>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
                {assets.blog_seo_content.title}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginBottom: "12px" }}>
                Target Keyword: "{assets.blog_seo_content.target_keyword}"
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {assets.blog_seo_content.outline_sections?.map((sec, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {sec}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7. CTA Variants & 8. Headline Variants */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
            <div className="glass-panel" style={{ padding: "20px" }}>
              <h4 style={{ fontSize: "0.9rem", color: "#34d399", fontWeight: 600, marginBottom: "12px" }}>
                7. Call to Action (CTA) Variants
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                {assets.cta_variants.map((cta, i) => (
                  <li key={i} style={{ background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.84rem", color: "#ffffff" }}>
                    • {cta}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-panel" style={{ padding: "20px" }}>
              <h4 style={{ fontSize: "0.9rem", color: "#38bdf8", fontWeight: 600, marginBottom: "12px" }}>
                8. High-Converting Headline Variants
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                {assets.headline_variants.map((hl, i) => (
                  <li key={i} style={{ background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.84rem", color: "#ffffff" }}>
                    • "{hl}"
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {onProceedToContent && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            className="btn-primary"
            onClick={onProceedToContent}
            style={{ padding: "12px 24px", fontSize: "0.95rem" }}
          >
            Proceed to Stage 3: Usable Content & Assets Library →
          </button>
        </div>
      )}
    </div>
  );
};
