import React from "react";
import { Sparkles, ShieldCheck, Download, Activity, Plus } from "lucide-react";
import { downloadReport } from "../services/api";
import type { BrandProfile } from "../types";

interface HeaderProps {
  workflowId: string | null;
  activeBrand?: BrandProfile | null;
  brands?: BrandProfile[];
  onSelectBrand?: (brand: BrandProfile) => void;
  onOpenOnboarding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workflowId,
  activeBrand,
  brands = [],
  onSelectBrand,
  onOpenOnboarding,
}) => {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 13, 20, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "16px 0",
      }}
    >
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
            }}
          >
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700, margin: 0 }}>
                {activeBrand ? activeBrand.name : "Universal"} AI Marketing Engine
              </h1>
              <span className="badge badge-verified" style={{ fontSize: "0.68rem" }}>
                <ShieldCheck size={12} />
                Strict Grounding Active
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              Agentic Digital Marketing, Deterministic Analytics & Optimization Engine
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Brand Switcher */}
          {brands.length > 1 && onSelectBrand && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={activeBrand?.id}
                onChange={(e) => {
                  const found = brands.find((b) => b.id === e.target.value);
                  if (found) onSelectBrand(found);
                }}
                style={{
                  padding: "7px 12px",
                  background: "rgba(20, 27, 44, 0.95)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.industry})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Brand Onboarding Action */}
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="btn-secondary"
              style={{
                fontSize: "0.82rem",
                padding: "7px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderColor: "rgba(16, 185, 129, 0.4)",
                color: "#34d399",
              }}
            >
              <Plus size={14} />
              Onboard Brand
            </button>
          )}

          {workflowId && (
            <>
              <button
                onClick={() => downloadReport(workflowId, "markdown").catch((error) => alert(error.message))}
                className="btn-secondary"
              >
                <Download size={15} />
                Export Markdown
              </button>
              <button
                onClick={() => downloadReport(workflowId, "json").catch((error) => alert(error.message))}
                className="btn-secondary"
              >
                <Activity size={15} />
                Export JSON State
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
