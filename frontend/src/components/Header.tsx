import React from "react";
import { Sparkles, ShieldCheck, Download, Activity } from "lucide-react";
import { getReportDownloadUrl } from "../services/api";

interface HeaderProps {
  workflowId: string | null;
}

export const Header: React.FC<HeaderProps> = ({ workflowId }) => {
  return (
    <header style={{
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(10, 13, 20, 0.8)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      padding: "16px 0"
    }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)"
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700 }}>
                Herbally AI Marketing Strategist
              </h1>
              <span className="badge badge-verified" style={{ fontSize: "0.68rem" }}>
                <ShieldCheck size={12} />
                Strict Grounding Active
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Agentic Digital Marketing, Deterministic Analytics & Optimization Engine
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {workflowId && (
            <>
              <a
                href={getReportDownloadUrl(workflowId, "markdown")}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ textDecoration: "none" }}
              >
                <Download size={15} />
                Export Markdown
              </a>
              <a
                href={getReportDownloadUrl(workflowId, "json")}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ textDecoration: "none" }}
              >
                <Activity size={15} />
                Export JSON State
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
