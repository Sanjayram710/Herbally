import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Send,
  Edit3,
  Sparkles
} from "lucide-react";
import {
  fetchCustomerMessages,
  updateCustomerMessageReply,
  approveAndSendCustomerMessage
} from "../services/api";
import type { CustomerMessageItem } from "../types";

export const CustomerMessagesView: React.FC = () => {
  const [messages, setMessages] = useState<CustomerMessageItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedReply, setEditedReply] = useState<string>("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadData = () => {
    fetchCustomerMessages()
      .then((data) => setMessages(data))
      .catch((err) => console.error("Error loading customer messages:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (msg: CustomerMessageItem) => {
    setEditingId(msg.id);
    setEditedReply(msg.draft_reply || "");
  };

  const handleSaveReply = async (msgId: string) => {
    try {
      const res = await updateCustomerMessageReply(msgId, editedReply);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, draft_reply: res.draft_reply } : m))
      );
      setEditingId(null);
    } catch (err: any) {
      alert("Failed to update reply: " + err.message);
    }
  };

  const handleApproveSend = async (msgId: string) => {
    setSendingId(msgId);
    try {
      const res = await approveAndSendCustomerMessage(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: "sent_demo" } : m))
      );
      alert(res.message);
    } catch (err: any) {
      alert("Failed to approve and send: " + err.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Customer Messages & Reputation Center
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={13} /> Human Approval Gate Enforced
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Review incoming inquiries from Instagram DMs and reviews. AI drafts replies grounded strictly in verified brand facts; human sign-off is required prior to dispatch.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div style={{ padding: "12px 18px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
        <ShieldCheck size={20} color="#60a5fa" />
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Truthful Delivery Status:</strong> External message sending requires authorized Instagram Graph and Google Business API tokens. In demo mode, approved messages transition to <code>sent_demo</code> within the local sandbox.
        </div>
      </div>

      {/* Messages List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.map((msg) => {
          const isSent = msg.status === "sent_demo";
          const isEditing = editingId === msg.id;
          const isSending = sendingId === msg.id;

          return (
            <div key={msg.id} className="glass-panel" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                    {msg.channel}
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    {msg.customer_name}
                  </span>
                </div>

                <span className="badge" style={{
                  background: isSent ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: isSent ? "#34d399" : "#f59e0b"
                }}>
                  {isSent ? "SENT (DEMO SANDBOX)" : "DRAFT REPLY (AWAITING APPROVAL)"}
                </span>
              </div>

              {/* Inbound Message */}
              <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "16px" }}>
                "{msg.message_text}"
              </div>

              {/* AI Draft Reply */}
              <div style={{ padding: "14px 18px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={13} /> Grounded AI Reply Draft
                  </div>
                  {!isSent && !isEditing && (
                    <button onClick={() => handleEditClick(msg)} style={{ background: "transparent", color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Edit3 size={13} /> Edit Draft
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <textarea
                      rows={4}
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.85rem" }}
                    />
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
                        Cancel
                      </button>
                      <button onClick={() => handleSaveReply(msg.id)} className="btn-primary" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
                        Save Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--text-primary)", fontSize: "0.85rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {msg.draft_reply}
                  </div>
                )}
              </div>

              {/* Action */}
              {!isSent && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    onClick={() => handleApproveSend(msg.id)}
                    disabled={isSending}
                    className="btn-primary"
                    style={{ padding: "8px 18px", fontSize: "0.85rem", background: "var(--brand-emerald)", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Send size={14} /> {isSending ? "Dispatching..." : "Approve & Send (Demo Sandbox)"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
