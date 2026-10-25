import React, { useState, useEffect } from "react";
import {
  Play,
  ShieldCheck,
  RefreshCw,
  Power
} from "lucide-react";
import {
  fetchAutomationRules,
  toggleAutomationRule,
  runAutomationRule,
  fetchAutomationExecutions
} from "../services/api";
import type { AutomationRuleItem, AutomationExecutionItem } from "../types";

export const AutomationCenterView: React.FC = () => {
  const [rules, setRules] = useState<AutomationRuleItem[]>([]);
  const [executions, setExecutions] = useState<AutomationExecutionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([fetchAutomationRules(), fetchAutomationExecutions()])
      .then(([r, e]) => {
        setRules(r);
        setExecutions(e);
      })
      .catch((err) => console.error("Error loading automations:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (ruleId: string, currentStatus: boolean) => {
    try {
      const updated = await toggleAutomationRule(ruleId, !currentStatus);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch (err: any) {
      alert("Failed to toggle rule: " + err.message);
    }
  };

  const handleRunNow = async (ruleId: string) => {
    setRunningRuleId(ruleId);
    try {
      const exec = await runAutomationRule(ruleId);
      setExecutions((prev) => [exec, ...prev]);
      alert(`Rule executed successfully!\nDetails: ${exec.details}`);
    } catch (err: any) {
      alert("Rule execution failed: " + err.message);
    } finally {
      setRunningRuleId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Marketing Automation Center
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={13} /> Approval Gate Guard Active
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Configure recurring marketing tasks, draft content generation triggers, budget drag anomaly checks, and audit logs.
          </p>
        </div>

        <button onClick={loadData} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh Logs
        </button>
      </div>

      {/* Safety Notice */}
      <div style={{ padding: "12px 18px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
        <ShieldCheck size={20} color="var(--brand-amber)" />
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Autonomous Spending Safeguard:</strong> Automation rules synthesize drafts and perform metric audits only. No automation rule is permitted to commit real advertising spend or publish externally without explicit human confirmation.
        </div>
      </div>

      {/* Rules Grid */}
      <div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
          Configured Automation Rules
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px" }}>
          {rules.map((rule) => {
            const isRunning = runningRuleId === rule.id;
            return (
              <div
                key={rule.id}
                className="glass-panel"
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: rule.is_enabled ? 1 : 0.65,
                  border: rule.is_enabled ? "1px solid var(--border-subtle)" : "1px dashed var(--border-subtle)"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span className="badge" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#c084fc" }}>
                      {rule.frequency}
                    </span>
                    <button
                      onClick={() => handleToggle(rule.id, rule.is_enabled)}
                      style={{
                        background: rule.is_enabled ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        color: rule.is_enabled ? "#34d399" : "var(--text-muted)",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        border: "1px solid var(--border-subtle)"
                      }}
                    >
                      <Power size={11} style={{ marginRight: "4px" }} />
                      {rule.is_enabled ? "ENABLED" : "PAUSED"}
                    </button>
                  </div>

                  <h4 style={{ fontSize: "0.98rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                    {rule.name}
                  </h4>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: "14px" }}>
                    {rule.description}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {rule.last_run_at ? `Last run: ${new Date(rule.last_run_at).toLocaleDateString()}` : "Not run recently"}
                  </div>

                  <button
                    onClick={() => handleRunNow(rule.id)}
                    disabled={isRunning}
                    className="btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Play size={12} /> {isRunning ? "Executing..." : "Run Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Audit Log */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
          Recent Automation Execution History
        </h3>

        {executions.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
            No executions logged yet. Click "Run Now" on any rule to execute a task.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 8px" }}>Rule</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}>Execution Details</th>
                <th style={{ padding: "10px 8px", textAlign: "right" }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {e.rule_name}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <span className="badge" style={{
                      background: e.status === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                      color: e.status === "success" ? "#34d399" : "#fb7185"
                    }}>
                      {e.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                    {e.details}
                  </td>
                  <td style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "0.78rem", textAlign: "right" }}>
                    {e.executed_at ? new Date(e.executed_at).toLocaleString() : "Just now"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
