import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  User,
  Bot,
  Zap,
  ShieldCheck
} from "lucide-react";
import { sendAssistantMessage, fetchAssistantHistory } from "../services/api";
import type { AssistantMessageItem } from "../types";

interface AssistantViewProps {
  brandId?: string;
  brandName?: string;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  brandId,
  brandName = "Brand",
}) => {
  const [messages, setMessages] = useState<AssistantMessageItem[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => {
    fetchAssistantHistory(brandId)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Default greeting
          setMessages([
            {
              id: "msg-init",
              brand_id: brandId || "default-brand",
              role: "assistant",
              content: `Hello! I am your **${brandName} AI Marketing Strategist Assistant**.\n\nI am grounded in verified specifications, positioning, and safety guardrails.\n\nHow can I assist your marketing workflow today?`,
              created_at: new Date().toISOString()
            }
          ]);
        }
      })
      .catch((err) => console.error("Error loading chat history:", err));
  };

  useEffect(() => {
    loadHistory();
  }, [brandId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: AssistantMessageItem = {
      id: `temp-${Date.now()}`,
      brand_id: brandId || "default-brand",
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const res = await sendAssistantMessage(brandId || "default-brand", text);
      if (res && res.assistant_message) {
        setMessages((prev) => [...prev, res.assistant_message]);
      }
    } catch (err: any) {
      alert("Assistant request failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const starterPrompts = [
    { label: "📊 Explain Analytics", query: "Explain our current campaign analytics and KPIs" },
    { label: "✍️ Generate Instagram Copy", query: "Generate fresh Instagram and Meta ad copy drafts" },
    { label: "🛡️ Check Approvals Queue", query: "What campaigns or assets are pending approval?" },
    { label: "💬 Draft Customer Reply", query: "Draft a customer reply about neem bedsheet benefits" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: "560px", gap: "16px" }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
            <Sparkles size={20} color="var(--brand-emerald)" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              AI Marketing Strategist Assistant
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Active Brand: {brandName} • Actionable Tool Calling • Strict Guardrail Compliance
            </p>
          </div>
        </div>

        <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          <ShieldCheck size={13} /> 0 Medical Claims Permitted
        </span>
      </div>

      {/* Chat Messages Feed */}
      <div
        className="glass-panel"
        style={{
          flex: 1,
          padding: "24px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id || idx}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                justifyContent: isUser ? "flex-end" : "flex-start"
              }}
            >
              {!isUser && (
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.3)", flexShrink: 0 }}>
                  <Bot size={16} color="var(--brand-emerald)" />
                </div>
              )}

              <div
                style={{
                  maxWidth: "75%",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  background: isUser ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  border: isUser ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  lineHeight: 1.55
                }}
              >
                {/* Tool Called Pill */}
                {msg.tool_called && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "6px", fontSize: "0.72rem", color: "#c084fc", marginBottom: "8px" }}>
                    <Zap size={11} /> Tool Executed: {msg.tool_called}
                  </div>
                )}

                <div style={{ whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>
              </div>

              {isUser && (
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(56, 189, 248, 0.3)", flexShrink: 0 }}>
                  <User size={16} color="#38bdf8" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color="var(--brand-emerald)" />
            </div>
            <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Analyzing brand data & executing tools...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Starter Chips */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {starterPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.query)}
            disabled={isLoading}
            style={{
              padding: "6px 12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              cursor: "pointer"
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="glass-panel" style={{ padding: "12px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={`Ask anything about ${brandName} marketing, analytics, or generate ad copy...`}
          disabled={isLoading}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: "0.9rem"
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Send size={14} /> Send
        </button>
      </div>
    </div>
  );
};
