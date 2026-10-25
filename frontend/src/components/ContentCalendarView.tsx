import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  Send
} from "lucide-react";
import { fetchContentSchedules, triggerPublishDemo, fetchContentAssets } from "../services/api";
import type { ContentScheduleItem, ContentAssetItem } from "../types";

interface ContentCalendarViewProps {
  brandId?: string;
}

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({ brandId }) => {
  const [schedules, setSchedules] = useState<ContentScheduleItem[]>([]);
  const [assets, setAssets] = useState<ContentAssetItem[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    const targetBrand = brandId || "";
    Promise.all([fetchContentSchedules(), fetchContentAssets(targetBrand)])
      .then(([scheds, asts]) => {
        setSchedules(scheds);
        setAssets(asts);
      })
      .catch((err) => console.error("Error loading calendar data:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [brandId]);

  const handlePublishDemo = async (scheduleId: string) => {
    setExecutingId(scheduleId);
    try {
      const updated = await triggerPublishDemo(scheduleId);
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? updated : s)));
    } catch (err: any) {
      alert("Failed to execute simulated publishing: " + err.message);
    } finally {
      setExecutingId(null);
    }
  };

  const getAssetTitle = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    return asset ? asset.title : `Asset ${assetId}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Content Publishing Calendar
            </h2>
            <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
              Simulated Sandbox Execution
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Manage scheduled publications across Instagram, Meta Ads, and Google Search. All operations run in local demo mode until live platform connectors are authorized.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          >
            Switch to {viewMode === "list" ? "Weekly Calendar" : "Queue List"}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div style={{ padding: "12px 18px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
        <ShieldCheck size={20} color="var(--brand-emerald)" />
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Safe Execution Sandbox:</strong> Scheduling a post registers it in the internal lifecycle queue. Clicking "Execute Demo Run" verifies the pipeline without triggering live third-party network posts.
        </div>
      </div>

      {/* Content Schedules */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading publishing calendar...</div>
      ) : schedules.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <CalendarIcon size={36} color="var(--brand-cyan)" style={{ marginBottom: "12px", opacity: 0.6 }} />
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>No Scheduled Content Yet</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "18px" }}>
            Schedule approved content assets from the AI Content Studio to populate your publishing timeline.
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="glass-panel" style={{ padding: "20px 24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 8px" }}>Channel</th>
                <th style={{ padding: "12px 8px" }}>Content Asset</th>
                <th style={{ padding: "12px 8px" }}>Scheduled Time</th>
                <th style={{ padding: "12px 8px" }}>Status</th>
                <th style={{ padding: "12px 8px" }}>Attempts</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((sched) => {
                const isPublished = sched.status === "published_demo";
                return (
                  <tr key={sched.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "14px 8px" }}>
                      <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                        {sched.channel}
                      </span>
                    </td>
                    <td style={{ padding: "14px 8px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {getAssetTitle(sched.asset_id)}
                    </td>
                    <td style={{ padding: "14px 8px", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={13} color="var(--text-muted)" />
                        {new Date(sched.scheduled_time).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: "14px 8px" }}>
                      <span className="badge" style={{
                        background: isPublished ? "rgba(16, 185, 129, 0.15)" : "rgba(139, 92, 246, 0.15)",
                        color: isPublished ? "#34d399" : "#a855f7"
                      }}>
                        {isPublished ? "PUBLISHED (DEMO)" : "SCHEDULED"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {sched.attempts_count} attempt(s)
                    </td>
                    <td style={{ padding: "14px 8px", textAlign: "right" }}>
                      {!isPublished && (
                        <button
                          onClick={() => handlePublishDemo(sched.id)}
                          disabled={executingId === sched.id}
                          className="btn-primary"
                          style={{ padding: "6px 12px", fontSize: "0.78rem", background: "var(--brand-emerald)" }}
                        >
                          <Send size={12} /> {executingId === sched.id ? "Publishing..." : "Publish (Demo Sandbox)"}
                        </button>
                      )}
                      {isPublished && (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          Simulation Complete
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Calendar View Mock */
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "16px" }}>
            Weekly Publishing Schedule (Simulated Sandbox)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
              <div key={day} style={{ padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", minHeight: "140px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>
                  {day} (Day {idx + 1})
                </div>
                {schedules.slice(idx, idx + 1).map((s) => (
                  <div key={s.id} style={{ padding: "6px", background: "rgba(56, 189, 248, 0.1)", borderRadius: "6px", fontSize: "0.72rem", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    <div style={{ fontWeight: 600, color: "#38bdf8" }}>{s.channel}</div>
                    <div style={{ color: "var(--text-primary)", marginTop: "2px" }}>{getAssetTitle(s.asset_id)}</div>
                    <div style={{ color: s.status === "published_demo" ? "#34d399" : "#a855f7", marginTop: "4px", fontSize: "0.68rem" }}>
                      ● {s.status}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
