import { Zap, AlertCircle, TrendingUp, CheckCircle } from "lucide-react";
import type { NextBestAction } from "../types";

interface NextBestActionCardProps {
  action: NextBestAction | null | undefined;
}

export const NextBestActionCard = ({ action }: NextBestActionCardProps) => {
  if (!action) return null;

  return (
    <div
      className="glass-panel pulse-glow"
      style={{
        background: "linear-gradient(135deg, rgba(20, 27, 44, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)",
        border: "1px solid rgba(16, 185, 129, 0.4)",
        boxShadow: "0 10px 30px rgba(16, 185, 129, 0.15)",
        padding: "24px",
        borderRadius: "16px",
        marginBottom: "28px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "6px",
        height: "100%",
        background: "linear-gradient(to bottom, #10b981, #06b6d4)"
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            padding: "8px",
            borderRadius: "10px",
            background: "rgba(16, 185, 129, 0.2)",
            color: "#10b981"
          }}>
            <Zap size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#34d399", fontWeight: 700 }}>
              DECISION ENGINE RECOMMENDATION
            </span>
            <h2 style={{ fontSize: "1.35rem", color: "#ffffff", fontWeight: 700 }}>
              Priority Next Best Action
            </h2>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="badge badge-priority-high">
            <AlertCircle size={12} />
            Priority: {action.priority}
          </span>
        </div>
      </div>

      <div style={{
        background: "rgba(10, 15, 26, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "12px",
        padding: "18px",
        marginBottom: "16px"
      }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
          Concrete Action To Execute:
        </div>
        <div style={{ fontSize: "1.1rem", color: "#34d399", fontWeight: 600 }}>
          {action.action}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            <AlertCircle size={13} color="#94a3b8" />
            Performance Finding:
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
            {action.finding}
          </div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            <CheckCircle size={13} color="#94a3b8" />
            Strategic Rationale:
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
            {action.reason}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              <TrendingUp size={13} color="#34d399" />
              Expected Impact:
            </div>
            <div style={{ fontSize: "0.9rem", color: "#34d399", fontWeight: 500 }}>
              {action.expected_impact}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
