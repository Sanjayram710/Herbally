import React from "react";
import {
  Database,
  FileDown,
  RotateCcw
} from "lucide-react";
import { downloadReport } from "../services/api";

interface SettingsViewProps {
  workflowId: string | null;
  onResetSession: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ workflowId, onResetSession }) => {

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Workspace Settings & System Health
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              Healthy • SQLite Local Storage
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Workspace isolation, report exports, environment configuration, and application diagnostics.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "20px" }}>
        {/* System Diagnostics */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={18} color="var(--brand-cyan)" /> Application Diagnostics
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Backend Server</span>
              <span style={{ color: "#34d399", fontWeight: 600 }}>FastAPI (Port 8001) • Online</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Database Storage</span>
              <span style={{ color: "var(--text-primary)" }}>SQLite (marketing_v2.db)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Execution Sandbox</span>
              <span style={{ color: "#38bdf8" }}>Simulated Mode (0 Live Ad Spend)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Medical Claim Guardrails</span>
              <span style={{ color: "#34d399" }}>Active (Strict Regex Compliance)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Current Workflow ID</span>
              <span style={{ color: "var(--brand-amber)", fontFamily: "monospace" }}>{workflowId || "None Selected"}</span>
            </div>
          </div>
        </div>

        {/* Strategy Report Exports */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileDown size={18} color="var(--brand-emerald)" /> Strategy Report Exports
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            Download the consolidated closed-loop marketing strategy report in executive Markdown or structured JSON format.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
            <button
              disabled={!workflowId}
              onClick={() => {
                if (!workflowId) {
                  alert("Execute a marketing workflow first to download report.");
                  return;
                }
                downloadReport(workflowId, "markdown").catch((error) => alert(error.message));
              }}
              className="btn-primary"
              style={{
                textAlign: "center",
                padding: "10px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: workflowId ? 1 : 0.6
              }}
            >
              <FileDown size={14} /> Download Executive Report (Markdown)
            </button>

            <button
              disabled={!workflowId}
              onClick={() => {
                if (!workflowId) {
                  alert("Execute a marketing workflow first to download state.");
                  return;
                }
                downloadReport(workflowId, "json").catch((error) => alert(error.message));
              }}
              className="btn-secondary"
              style={{
                textAlign: "center",
                padding: "10px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: workflowId ? 1 : 0.6
              }}
            >
              <FileDown size={14} /> Download Workflow State Snapshot (JSON)
            </button>
          </div>

          {/* Reset cache */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Troubleshooting & Cache Reset
            </div>
            <button
              onClick={onResetSession}
              className="btn-secondary"
              style={{ padding: "8px 14px", fontSize: "0.78rem", color: "#fb7185", border: "1px solid rgba(244, 63, 94, 0.3)", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={12} /> Clear Browser Local Storage & Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
