import React, { useState } from "react";
import { Sparkles, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import type { ProductItem } from "../types";

interface ProductSetupSectionProps {
  products: ProductItem[];
  selectedProduct: ProductItem | null;
  onSelectProduct: (product: ProductItem) => void;
  onSubmitWorkflow: (params: {
    product_name: string;
    brand: string;
    product_url?: string;
    market: string;
    marketing_goal: string;
    budget: number;
    duration_days: number;
    target_audience_hint: string;
  }) => void;
  isLoading: boolean;
}

export const ProductSetupSection: React.FC<ProductSetupSectionProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onSubmitWorkflow,
  isLoading,
}) => {
  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem("herbally_brief_budget");
    return saved ? Number(saved) : 50000;
  });
  const [duration, setDuration] = useState<number>(() => {
    const saved = localStorage.getItem("herbally_brief_duration");
    return saved ? Number(saved) : 30;
  });
  const [goal, setGoal] = useState<string>(() => {
    return localStorage.getItem("herbally_brief_goal") || "Increase online D2C sales";
  });
  const [market, setMarket] = useState<string>(() => {
    return localStorage.getItem("herbally_brief_market") || "India (Tier-1 Metros)";
  });
  const [audienceHint, setAudienceHint] = useState<string>(() => {
    return localStorage.getItem("herbally_brief_audience") || "Premium wellness and conscious lifestyle consumers";
  });
  const [productUrl, setProductUrl] = useState<string>(() => {
    return localStorage.getItem("herbally_brief_url") || "https://herbally.in/products/neem-organic-bedsheet";
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state to localStorage for persistence
  React.useEffect(() => {
    localStorage.setItem("herbally_brief_budget", String(budget));
    localStorage.setItem("herbally_brief_duration", String(duration));
    localStorage.setItem("herbally_brief_goal", goal);
    localStorage.setItem("herbally_brief_market", market);
    localStorage.setItem("herbally_brief_audience", audienceHint);
    localStorage.setItem("herbally_brief_url", productUrl);
  }, [budget, duration, goal, market, audienceHint, productUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // Strict validation
    if (!productUrl || (!productUrl.startsWith("http://") && !productUrl.startsWith("https://"))) {
      setValidationError("Product URL must be a valid URL starting with http:// or https://");
      return;
    }
    if (budget <= 0) {
      setValidationError("Budget must be a positive number greater than 0.");
      return;
    }
    if (duration <= 0) {
      setValidationError("Campaign duration must be at least 1 day.");
      return;
    }

    setValidationError(null);
    onSubmitWorkflow({
      product_name: selectedProduct.name,
      brand: selectedProduct.brand,
      product_url: productUrl,
      market,
      marketing_goal: goal,
      budget,
      duration_days: duration,
      target_audience_hint: audienceHint,
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
      {/* Left: Product Information & Guardrails */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", color: "#ffffff" }}>Verified Product Grounding</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Official brand specifications and safety guardrails
              </p>
            </div>
          </div>
          <span className="badge badge-verified">Verified Brand</span>
        </div>

        {/* Product selector if multiple */}
        {products.length > 1 && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Select Product:
            </label>
            <select
              value={selectedProduct?.id}
              onChange={(e) => {
                const found = products.find((p) => p.id === e.target.value);
                if (found) onSelectProduct(found);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(20, 27, 44, 0.95)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.85rem"
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedProduct ? (
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>
              {selectedProduct.name}
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", color: "#38bdf8", background: "rgba(6, 182, 212, 0.1)", padding: "3px 8px", borderRadius: "6px" }}>
                {selectedProduct.category}
              </span>
              <span style={{ fontSize: "0.85rem", color: "#34d399", fontWeight: 600 }}>
                INR {selectedProduct.price_inr?.toLocaleString() || "3,499"}
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "18px", lineHeight: 1.6 }}>
              {selectedProduct.description}
            </p>

            {/* Verified Features */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#34d399", fontWeight: 600, marginBottom: "8px" }}>
                Verified Features (Facts):
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedProduct.verified_features.map((feat, idx) => (
                  <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                    <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: "3px" }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strict Guardrails */}
            <div style={{
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              borderRadius: "10px",
              padding: "12px 16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fb7185", fontWeight: 600, fontSize: "0.8rem", marginBottom: "6px" }}>
                <AlertTriangle size={15} />
                Strict Medical Claim Guardrails:
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedProduct.prohibited_medical_claims.map((claim, idx) => (
                  <li key={idx} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    • {claim}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Loading verified Herbally catalog...
          </div>
        )}
      </div>

      {/* Right: Campaign Objective & Execution Trigger Form */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", color: "#ffffff" }}>Campaign Parameters</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Define budget, target market, and strategic goals
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {validationError && (
            <div style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#fb7185",
              fontSize: "0.82rem"
            }}>
              {validationError}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Product Landing URL
            </label>
            <input
              type="url"
              required
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://herbally.in/products/neem-organic-bedsheet"
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Target Market
            </label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Primary Marketing Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(20, 27, 44, 0.95)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            >
              <option value="Increase online D2C sales">Increase online D2C sales</option>
              <option value="Acquire new wellness customers with ROAS > 3.0x">Acquire new wellness customers (ROAS &gt; 3.0x)</option>
              <option value="Promote sleep hygiene awareness & collect emails">Brand discovery & sleep hygiene email capture</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Budget (INR)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="5000"
                  step="5000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 32px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.9rem"
                  }}
                />
                <span style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  ₹
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Duration (Days)
              </label>
              <input
                type="number"
                min="7"
                max="90"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.9rem"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Target Audience Focus Hint
            </label>
            <input
              type="text"
              value={audienceHint}
              onChange={(e) => setAudienceHint(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !selectedProduct}
            style={{ marginTop: "10px", justifyContent: "center", width: "100%", padding: "14px" }}
          >
            {isLoading ? (
              <>Executing Marketing Orchestrator...</>
            ) : (
              <>
                <Sparkles size={18} />
                Generate End-to-End Marketing Strategy
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
