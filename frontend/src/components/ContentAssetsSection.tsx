import React, { useState } from "react";
import { CheckSquare, Square, Sparkles, FileText, Globe, Layers, Video, Tag } from "lucide-react";
import type { MarketingState } from "../types";

interface ContentAssetsSectionProps {
  state: MarketingState;
  onProceedToCampaigns: (selectedAssets: string[]) => void;
}

export const ContentAssetsSection: React.FC<ContentAssetsSectionProps> = ({
  state,
  onProceedToCampaigns,
}) => {
  const assets = state.content_strategy?.asset_bundle;

  // Track selected assets by unique key
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<string[]>([
    "meta_feed_ad",
    "instagram_reel_script",
    "google_search_ad",
  ]);

  const toggleAsset = (key: string) => {
    setSelectedAssetKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isSelected = (key: string) => selectedAssetKeys.includes(key);

  const creativePlaceholders = [
    {
      id: "placeholder_ugc_bed",
      title: "Hero Product Texture — Satin Weave 300TC",
      format: "1080 x 1350 (4:5 Portrait)",
      type: "Visual Placeholder Mockup",
      color: "linear-gradient(135deg, #134e4a 0%, #064e3b 100%)",
      copyAngle: "Macro Neem herbal infusion wash & GOTS organic certified cotton",
      tag: "UGC / Feed"
    },
    {
      id: "placeholder_morning_routine",
      title: "Morning Skin Wellness Concept",
      format: "1080 x 1920 (9:16 Vertical Video)",
      type: "Reel Video Placeholder",
      color: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
      copyAngle: "Clean bedsheet contact for acne-prone skin in humid weather",
      tag: "Reels / TikTok"
    },
    {
      id: "placeholder_trust_badge",
      title: "Clean Sleep Trust Certification Banner",
      format: "1200 x 628 (Landscape)",
      type: "Display / Search Retargeting Banner",
      color: "linear-gradient(135deg, #0c4a6e 0%, #075985 100%)",
      copyAngle: "GOTS Standard #CU814892 • Zero Toxic Synthetic Dyes",
      tag: "Display Banner"
    }
  ];

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner & Selection Summary */}
      <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", color: "#ffffff", fontWeight: 700 }}>
                Stage 3: Usable Content & Marketing Asset Library
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Select structured assets (social copy, ad creative, headlines, CTAs) to flow directly into Campaign Planning.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="badge badge-verified" style={{ fontSize: "0.82rem", padding: "6px 12px" }}>
            {selectedAssetKeys.length} Assets Selected
          </span>
          <button
            className="btn-primary"
            onClick={() => onProceedToCampaigns(selectedAssetKeys)}
            disabled={selectedAssetKeys.length === 0}
            style={{ padding: "10px 18px" }}
          >
            Configure Campaign Plan from Selected Assets →
          </button>
        </div>
      </div>

      {/* Asset Selection Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* 1. Meta Feed Ad Copy */}
        {assets?.meta_ad_copy && (
          <div
            className="glass-panel"
            onClick={() => toggleAsset("meta_feed_ad")}
            style={{
              padding: "20px",
              cursor: "pointer",
              border: isSelected("meta_feed_ad") ? "1px solid #10b981" : "1px solid var(--border-subtle)",
              background: isSelected("meta_feed_ad") ? "rgba(16, 185, 129, 0.04)" : "var(--bg-card)",
              transition: "border 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", color: "#1877f2", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={16} /> 1. Meta Feed Ad Copy
              </span>
              <div style={{ color: isSelected("meta_feed_ad") ? "#10b981" : "var(--text-muted)" }}>
                {isSelected("meta_feed_ad") ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginBottom: "8px" }}>
              "{assets.meta_ad_copy.headline || "Pure Neem Botanical Sleep"}"
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "12px" }}>
              {assets.meta_ad_copy.primary_text || "Experience clean, certified organic cotton infused with Neem botanicals for sensitive skin."}
            </p>
            <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }}>
              CTA: {assets.meta_ad_copy.call_to_action || "Shop Now"}
            </div>
          </div>
        )}

        {/* 2. Instagram Reel Script */}
        {assets?.instagram_reel_script && (
          <div
            className="glass-panel"
            onClick={() => toggleAsset("instagram_reel_script")}
            style={{
              padding: "20px",
              cursor: "pointer",
              border: isSelected("instagram_reel_script") ? "1px solid #10b981" : "1px solid var(--border-subtle)",
              background: isSelected("instagram_reel_script") ? "rgba(16, 185, 129, 0.04)" : "var(--bg-card)",
              transition: "border 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", color: "#e1306c", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <Video size={16} /> 2. Instagram Reel Script (UGC Hook)
              </span>
              <div style={{ color: isSelected("instagram_reel_script") ? "#10b981" : "var(--text-muted)" }}>
                {isSelected("instagram_reel_script") ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#38bdf8", marginBottom: "8px" }}>
              Hook: "{assets.instagram_reel_script.hook || "Stop sleeping on chemical sheets that trigger redness."}"
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px", marginBottom: "10px" }}>
              <strong>Voiceover:</strong> {assets.instagram_reel_script.voiceover || "Switch to 100% GOTS organic Neem bedding."}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Audio Vibe: {assets.instagram_reel_script.audio_vibe || "Calm acoustic lo-fi"}
            </div>
          </div>
        )}

        {/* 3. Google Responsive Search Ad */}
        {assets?.google_search_ad && (
          <div
            className="glass-panel"
            onClick={() => toggleAsset("google_search_ad")}
            style={{
              padding: "20px",
              cursor: "pointer",
              border: isSelected("google_search_ad") ? "1px solid #10b981" : "1px solid var(--border-subtle)",
              background: isSelected("google_search_ad") ? "rgba(16, 185, 129, 0.04)" : "var(--bg-card)",
              transition: "border 0.2s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", color: "#4285f4", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <Globe size={16} /> 3. Google Responsive Search Ad
              </span>
              <div style={{ color: isSelected("google_search_ad") ? "#10b981" : "var(--text-muted)" }}>
                {isSelected("google_search_ad") ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <strong style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Sample Headlines:</strong>
              <div style={{ fontSize: "0.85rem", color: "#38bdf8", marginTop: "4px" }}>
                • {assets.google_search_ad.headlines?.[0] || "Premium Certified Product"}
                <br />
                • {assets.google_search_ad.headlines?.[1] || "100% GOTS Certified Organic Cotton"}
              </div>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {assets.google_search_ad.descriptions?.[0] || "Natural antimicrobial sleep. Breathable, hypoallergenic satin weave."}
            </p>
          </div>
        )}

        {/* 4. High-Converting Headline Variants */}
        <div
          className="glass-panel"
          onClick={() => toggleAsset("headlines_variants")}
          style={{
            padding: "20px",
            cursor: "pointer",
            border: isSelected("headlines_variants") ? "1px solid #10b981" : "1px solid var(--border-subtle)",
            background: isSelected("headlines_variants") ? "rgba(16, 185, 129, 0.04)" : "var(--bg-card)",
            transition: "border 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "#a855f7", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={16} /> 4. Headline Variants (5 Concepts)
            </span>
            <div style={{ color: isSelected("headlines_variants") ? "#10b981" : "var(--text-muted)" }}>
              {isSelected("headlines_variants") ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
          </div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", color: "#ffffff" }}>
            {(assets?.headline_variants || [
              "Your Night Cream Deserves Better Bedding.",
              "Experience the Night-time Purity of Pure Neem Botanicals.",
              "Zero Toxic Chemicals. 100% Certified Organic Cotton."
            ]).slice(0, 3).map((hl, i) => (
              <li key={i}>• "{hl}"</li>
            ))}
          </ul>
        </div>

        {/* 5. Call To Action Variants */}
        <div
          className="glass-panel"
          onClick={() => toggleAsset("cta_variants")}
          style={{
            padding: "20px",
            cursor: "pointer",
            border: isSelected("cta_variants") ? "1px solid #10b981" : "1px solid var(--border-subtle)",
            background: isSelected("cta_variants") ? "rgba(16, 185, 129, 0.04)" : "var(--bg-card)",
            transition: "border 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <Tag size={16} /> 5. Call to Action (CTA) Variants
            </span>
            <div style={{ color: isSelected("cta_variants") ? "#10b981" : "var(--text-muted)" }}>
              {isSelected("cta_variants") ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {(assets?.cta_variants || [
              "Shop Pure Neem Bedsheets",
              "Upgrade Your Sleep Hygiene",
              "Experience Botanical Purity"
            ]).map((cta, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.8rem", color: "#34d399" }}>
                {cta}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Creative Placeholders */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h4 style={{ fontSize: "1.1rem", color: "#ffffff", fontWeight: 600, marginBottom: "8px" }}>
          Locally-Renderable Creative Placeholders
        </h4>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "18px" }}>
          Sandbox visual specifications ready for digital ad channel deployment.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {creativePlaceholders.map((p) => {
            const selected = isSelected(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleAsset(p.id)}
                style={{
                  borderRadius: "12px",
                  border: selected ? "1px solid #10b981" : "1px solid var(--border-subtle)",
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "rgba(0,0,0,0.25)"
                }}
              >
                <div style={{
                  height: "120px",
                  background: p.color,
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.5)", color: "#ffffff", padding: "3px 8px", borderRadius: "4px" }}>
                      {p.tag}
                    </span>
                    <div style={{ color: selected ? "#10b981" : "#ffffff" }}>
                      {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>
                    {p.title}
                  </div>
                </div>

                <div style={{ padding: "12px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <div><strong>Format:</strong> {p.format}</div>
                  <div style={{ marginTop: "4px" }}><strong>Angle:</strong> {p.copyAngle}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn-primary"
          onClick={() => onProceedToCampaigns(selectedAssetKeys)}
          disabled={selectedAssetKeys.length === 0}
          style={{ padding: "12px 24px", fontSize: "0.95rem" }}
        >
          Proceed to Campaign Planning ({selectedAssetKeys.length} assets selected) →
        </button>
      </div>
    </div>
  );
};
