import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Lock,
  Zap
} from "lucide-react";
import { fetchIntegrations, testIntegrationConnection } from "../services/api";
import type { IntegrationItem } from "../types";

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; status: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = () => {
    setIsLoading(true);
    fetchIntegrations()
      .then((data) => setIntegrations(data))
      .catch((err) => console.error("Error loading integrations:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestPing = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await testIntegrationConnection(id);
      setTestResult({ id: res.integration_id, status: res.status, message: res.message });
    } catch (err: any) {
      setTestResult({ id, status: "error", message: err.message || "Connection test failed." });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Official Platform Integrations & Connectors
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={13} /> Strict Zero-Leak Credentials
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Truthful provider connectivity status, required OAuth permissions, supported operations, and safe sandbox fallbacks.
          </p>
        </div>

        <button onClick={loadData} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh Status
        </button>
      </div>

      {/* Security Banner */}
      <div style={{ padding: "14px 20px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "14px" }}>
        <Lock size={22} color="#60a5fa" />
        <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
          <strong style={{ color: "var(--text-primary)" }}>Server-Side Secret Isolation:</strong> API keys, developer tokens, and OAuth secrets are managed strictly server-side in backend environment configuration (`.env`). Credentials are never exposed to browser client bundles or public repositories.
        </div>
      </div>

      {/* Integrations Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
        {integrations.map((conn) => {
          const isConnected = conn.status === "connected";
          const isTesting = testingId === conn.id;
          const currentResult = testResult?.id === conn.id ? testResult : null;

          return (
            <div
              key={conn.id}
              className="glass-panel"
              style={{
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: isConnected ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border-subtle)"
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.72rem" }}>
                      {conn.category}
                    </span>
                  </div>

                  <span className="badge" style={{
                    background: isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: isConnected ? "#34d399" : "#f59e0b",
                    border: isConnected ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)"
                  }}>
                    {isConnected ? "CONNECTED (LOCAL MOCK)" : "UNCONFIGURED (SANDBOX ACTIVE)"}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                  {conn.name}
                </h3>

                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.4 }}>
                  {conn.setup_instructions}
                </p>

                {/* Permissions List */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                    Required Permissions
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {conn.permissions.map((p, idx) => (
                      <span key={idx} style={{ padding: "3px 8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", fontSize: "0.72rem", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Supported Operations */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                    Supported Actions
                  </div>
                  <ul style={{ fontSize: "0.76rem", color: "var(--text-secondary)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    {conn.supported_actions.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>

                {/* Test Result Feedback */}
                {currentResult && (
                  <div style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    marginBottom: "14px",
                    fontSize: "0.78rem",
                    background: currentResult.status === "connected" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    border: currentResult.status === "connected" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                    color: currentResult.status === "connected" ? "#34d399" : "#f59e0b"
                  }}>
                    {currentResult.message}
                  </div>
                )}
              </div>

              {/* Action */}
              <div style={{ paddingTop: "14px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  {conn.last_sync_at ? `Synced: ${new Date(conn.last_sync_at).toLocaleTimeString()}` : "No live sync recorded"}
                </span>

                <button
                  onClick={() => handleTestPing(conn.id)}
                  disabled={isTesting}
                  className="btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Zap size={13} /> {isTesting ? "Testing Ping..." : "Test Connection"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
