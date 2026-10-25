import React, { useState, useEffect } from "react";
import {
  Save,
  CheckCircle2,
  Eye,
  Smartphone,
  Monitor,
  Download
} from "lucide-react";
import { fetchLandingPageDraft, updateLandingPageDraft } from "../services/api";
import type { LandingPageDraftData } from "../types";

export const BusinessPresenceView: React.FC = () => {
  const [draft, setDraft] = useState<LandingPageDraftData | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchLandingPageDraft("herbally-brand")
      .then((d) => setDraft(d))
      .catch((err) => console.error("Error loading landing page draft:", err));
  }, []);

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await updateLandingPageDraft("herbally-brand", {
        title: draft.title,
        hero_headline: draft.hero_headline,
        hero_subheadline: draft.hero_subheadline,
        value_props: draft.value_props,
        call_to_action: draft.call_to_action,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description
      });
      setDraft(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save landing page draft: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportHtml = () => {
    if (!draft) return;
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${draft.seo_title}</title>
  <meta name="description" content="${draft.seo_description}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #0a0d14; color: #f8fafc; line-height: 1.6; }
    .hero { max-width: 900px; margin: 60px auto; padding: 40px 24px; text-align: center; }
    h1 { font-size: 2.5rem; color: #10b981; margin-bottom: 16px; }
    p.sub { font-size: 1.15rem; color: #94a3b8; max-width: 700px; margin: 0 auto 32px; }
    .btn { display: inline-block; background: #10b981; color: #fff; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; max-width: 1000px; margin: 60px auto; padding: 0 24px; }
    .card { background: #141b2c; border: 1px solid rgba(255,255,255,0.08); padding: 24px; border-radius: 12px; }
    .card h3 { color: #38bdf8; margin-top: 0; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${draft.hero_headline}</h1>
    <p class="sub">${draft.hero_subheadline}</p>
    <a href="#order" class="btn">${draft.call_to_action}</a>
  </div>
  <div class="features">
    ${draft.value_props.map((vp) => `<div class="card"><h3>${vp.title}</h3><p>${vp.description}</p></div>`).join("\n    ")}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "herbally-landing-page.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!draft) return <div style={{ color: "var(--text-muted)", padding: "40px" }}>Loading Presence Builder...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Brand Landing Page & Web Presence
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              SEO Metadata Configured
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Design and preview a high-converting, brand-grounded landing page draft. Export responsive HTML or inspect live preview.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleExportHtml} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Download size={14} /> Export HTML
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary" style={{ padding: "8px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
            {saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Draft"}
          </button>
        </div>
      </div>

      {/* Grid: Editor and Simulator Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "24px" }}>
        {/* Editor Form */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Page Content & SEO Architecture
          </h3>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Hero Headline</label>
            <input
              type="text"
              value={draft.hero_headline}
              onChange={(e) => setDraft({ ...draft, hero_headline: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Hero Subheadline & Value Statement</label>
            <textarea
              rows={3}
              value={draft.hero_subheadline}
              onChange={(e) => setDraft({ ...draft, hero_subheadline: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.85rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Call To Action Button Label</label>
            <input
              type="text"
              value={draft.call_to_action}
              onChange={(e) => setDraft({ ...draft, call_to_action: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>SEO Meta Title</label>
              <input
                type="text"
                value={draft.seo_title}
                onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>SEO Meta Description</label>
              <input
                type="text"
                value={draft.seo_description}
                onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.85rem" }}
              />
            </div>
          </div>
        </div>

        {/* Live Simulator Preview */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Eye size={16} color="var(--brand-cyan)" /> Live Viewport Simulator
            </h3>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setPreviewDevice("desktop")}
                style={{
                  background: previewDevice === "desktop" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: previewDevice === "desktop" ? "#38bdf8" : "var(--text-muted)",
                  padding: "4px 8px",
                  borderRadius: "6px"
                }}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                style={{
                  background: previewDevice === "mobile" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: previewDevice === "mobile" ? "#38bdf8" : "var(--text-muted)",
                  padding: "4px 8px",
                  borderRadius: "6px"
                }}
              >
                <Smartphone size={14} />
              </button>
            </div>
          </div>

          {/* Frame */}
          <div
            style={{
              flex: 1,
              background: "#0a0d14",
              borderRadius: "12px",
              border: "2px solid var(--border-subtle)",
              padding: "24px 18px",
              maxWidth: previewDevice === "mobile" ? "340px" : "100%",
              margin: "0 auto",
              width: "100%",
              overflowY: "auto"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--brand-emerald)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
                100% GOTS ORGANIC COTTON & BOTANICAL NEEM
              </div>
              <h2 style={{ fontSize: previewDevice === "mobile" ? "1.2rem" : "1.6rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "12px" }}>
                {draft.hero_headline}
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
                {draft.hero_subheadline}
              </p>
              <div style={{ display: "inline-block", background: "var(--brand-emerald)", color: "#fff", padding: "10px 22px", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem" }}>
                {draft.call_to_action}
              </div>
            </div>

            {/* Value Props */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {draft.value_props.map((vp, idx) => (
                <div key={idx} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#38bdf8" }}>{vp.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{vp.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
