import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Target,
  FileCheck2
} from "lucide-react";
import { fetchBrands, updateBrand, ingestBrandWebsite } from "../services/api";
import type { BrandProfile } from "../types";

export const BrandIntelligenceView: React.FC = () => {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchBrands()
      .then((brands) => {
        if (brands && brands.length > 0) {
          setBrand(brands[0]);
          setWebsiteUrl(brands[0].website_url || "https://herbally.in");
        }
      })
      .catch((err) => console.error("Error loading brand:", err));
  }, []);

  const handleSave = async () => {
    if (!brand) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await updateBrand(brand.id, {
        name: brand.name,
        industry: brand.industry,
        description: brand.description,
        website_url: websiteUrl,
        target_audience: brand.target_audience,
        brand_voice: brand.brand_voice,
        brand_guidelines: brand.brand_guidelines,
        factual_claims: brand.factual_claims,
        prohibited_claims: brand.prohibited_claims,
        marketing_objectives: brand.marketing_objectives,
        preferred_channels: brand.preferred_channels,
      });
      setBrand(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save brand profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIngestWebsite = async () => {
    if (!websiteUrl) return;
    setIsScraping(true);
    setScrapeError(null);
    setScrapeResult(null);
    try {
      const res = await ingestBrandWebsite(websiteUrl);
      setScrapeResult(res);
      if (brand && res.description && !brand.description) {
        setBrand({ ...brand, description: res.description });
      }
    } catch (err: any) {
      setScrapeError(err.message || "Failed to ingest website context");
    } finally {
      setIsScraping(false);
    }
  };

  if (!brand) {
    return <div style={{ color: "var(--text-muted)", padding: "40px" }}>Loading Brand Profile...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Brand Intelligence & Verified Guidelines
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={13} /> Strict Guardrails Enforced
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Maintain canonical brand context, voice, verified claims, and guidelines. Every AI content and campaign asset is grounded in this truth source.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
          style={{ padding: "10px 20px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}
        >
          {saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {isSaving ? "Saving..." : saveSuccess ? "Saved Successfully!" : "Save Brand Profile"}
        </button>
      </div>

      {/* Website Context Ingestion (SSRF-Protected) */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Globe size={18} color="var(--brand-cyan)" /> Public Website Context Ingestion
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Server-side DNS validation, SSRF protection, and bounded size limits ensure safe retrieval of verified brand messaging.
            </p>
          </div>
          <span className="badge" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#38bdf8", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
            SSRF Protection Active
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://herbally.in"
            style={{
              flex: 1,
              minWidth: "260px",
              padding: "10px 14px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "0.9rem"
            }}
          />
          <button
            onClick={handleIngestWebsite}
            disabled={isScraping || !websiteUrl}
            className="btn-secondary"
            style={{ padding: "10px 18px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Sparkles size={14} />
            {isScraping ? "Validating & Fetching..." : "Safely Ingest Context"}
          </button>
        </div>

        {scrapeError && (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", color: "#fb7185", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={16} /> {scrapeError}
          </div>
        )}

        {scrapeResult && (
          <div style={{ marginTop: "16px", padding: "14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--brand-cyan)", marginBottom: "4px" }}>
              Successfully Extracted Metadata:
            </div>
            {scrapeResult.title && <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "4px" }}><strong>Title:</strong> {scrapeResult.title}</div>}
            {scrapeResult.description && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}><strong>Meta Description:</strong> {scrapeResult.description}</div>}
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxHeight: "100px", overflowY: "auto", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
              {scrapeResult.extracted_text}
            </div>
          </div>
        )}
      </div>

      {/* Brand Identity & Voice Form */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "20px" }}>
        {/* Core Attributes */}
        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Target size={18} color="var(--brand-emerald)" /> Brand Profile & Market Definition
          </h3>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Brand Name</label>
            <input
              type="text"
              value={brand.name}
              onChange={(e) => setBrand({ ...brand, name: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Industry Category</label>
            <input
              type="text"
              value={brand.industry}
              onChange={(e) => setBrand({ ...brand, industry: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Brand Description & Mission</label>
            <textarea
              rows={3}
              value={brand.description}
              onChange={(e) => setBrand({ ...brand, description: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.88rem", resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Primary Target Audiences</label>
            <textarea
              rows={2}
              value={brand.target_audience}
              onChange={(e) => setBrand({ ...brand, target_audience: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.88rem" }}
            />
          </div>
        </div>

        {/* Voice, Guidelines & Claims */}
        <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck2 size={18} color="var(--brand-violet)" /> Brand Voice & Strict Claim Boundaries
          </h3>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Brand Voice & Tone Guidelines</label>
            <textarea
              rows={3}
              value={brand.brand_voice}
              onChange={(e) => setBrand({ ...brand, brand_voice: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.88rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Editorial Brand Guidelines</label>
            <textarea
              rows={3}
              value={brand.brand_guidelines || ""}
              onChange={(e) => setBrand({ ...brand, brand_guidelines: e.target.value })}
              style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.88rem" }}
            />
          </div>

          {/* Factual Claims vs Prohibited Claims */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", marginBottom: "6px" }}>
                ✓ Verified Product Claims
              </div>
              <ul style={{ fontSize: "0.75rem", color: "var(--text-secondary)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {brand.factual_claims.map((claim, idx) => (
                  <li key={idx}>{claim}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: "12px", background: "rgba(244, 63, 94, 0.06)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fb7185", marginBottom: "6px" }}>
                ✕ Strictly Prohibited Claims
              </div>
              <ul style={{ fontSize: "0.75rem", color: "var(--text-secondary)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {brand.prohibited_claims.map((claim, idx) => (
                  <li key={idx}>{claim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
