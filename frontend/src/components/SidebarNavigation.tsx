import React from "react";
import {
  LayoutDashboard,
  Brain,
  Package,
  Sparkles,
  Calendar,
  Rocket,
  MessageSquare,
  BarChart3,
  Zap,
  Link2,
  Settings,
  MessagesSquare,
  Globe,
  Camera,
  Images,
  Video,
  Compass,
} from "lucide-react";

interface SidebarNavigationProps {
  currentModule: string;
  onSelectModule: (module: string) => void;
  brandName?: string;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  currentModule,
  onSelectModule,
  brandName = "Brand"
}) => {
  const mainNav = [
    { id: "unified", label: "Unified Journey (Product C)", icon: <Compass size={17} /> },
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
    { id: "brand", label: "Brand Intelligence", icon: <Brain size={17} /> },
    { id: "products", label: "Products & Strategy", icon: <Package size={17} /> },
    { id: "studio", label: "AI Product Studio", icon: <Camera size={17} /> },
    { id: "video", label: "AI Video Studio", icon: <Video size={17} /> },
    { id: "media", label: "Media Library", icon: <Images size={17} /> },
    { id: "content", label: "AI Content Studio", icon: <Sparkles size={17} /> },
    { id: "calendar", label: "Content Calendar", icon: <Calendar size={17} /> },
    { id: "campaigns", label: "Campaign Manager", icon: <Rocket size={17} /> },
    { id: "assistant", label: "AI Assistant", icon: <MessageSquare size={17} /> },
    { id: "analytics", label: "Analytics & Heuristics", icon: <BarChart3 size={17} /> },
    { id: "automations", label: "Automation Center", icon: <Zap size={17} /> },
    { id: "integrations", label: "Integrations", icon: <Link2 size={17} /> },
  ];

  const nestedTools = [
    { id: "customer_messages", label: "Customer Inquiries", icon: <MessagesSquare size={16} /> },
    { id: "business_presence", label: "Landing Page Draft", icon: <Globe size={16} /> },
  ];


  return (
    <aside
      style={{
        width: "260px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0
      }}
    >
      <div>
        {/* Brand / Logo Header */}
        <div style={{ padding: "20px 20px 16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 50%, #10b981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1rem",
                color: "#fff",
                boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)"
              }}
            >
              Ω
            </div>
            <div>
              <div style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                OmniScale AI
              </div>
              <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                {brandName}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: "3px", overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px" }}>
            Core Workspace
          </div>

          {mainNav.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  fontSize: "0.86rem",
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "rgba(16, 185, 129, 0.12)" : "transparent",
                  color: isActive ? "#34d399" : "var(--text-secondary)",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <span style={{ color: isActive ? "#34d399" : "var(--text-muted)" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "12px 12px 6px" }}>
            Omnichannel Tools
          </div>

          {nestedTools.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.84rem",
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  color: isActive ? "#38bdf8" : "var(--text-secondary)",
                  border: isActive ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <span style={{ color: isActive ? "#38bdf8" : "var(--text-muted)" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / Settings & Mode */}
      <div style={{ padding: "14px 12px", borderTop: "1px solid var(--border-subtle)" }}>
        <button
          onClick={() => onSelectModule("settings")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "9px 12px",
            borderRadius: "8px",
            fontSize: "0.86rem",
            fontWeight: currentModule === "settings" ? 600 : 500,
            background: currentModule === "settings" ? "rgba(255, 255, 255, 0.08)" : "transparent",
            color: currentModule === "settings" ? "var(--text-primary)" : "var(--text-secondary)",
            border: "1px solid transparent",
            textAlign: "left",
            cursor: "pointer",
            marginBottom: "10px"
          }}
        >
          <Settings size={17} color="var(--text-muted)" />
          <span>Settings</span>
        </button>

        <div style={{ padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", display: "inline-block" }}></span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Simulated Sandbox</span>
        </div>
      </div>
    </aside>
  );
};
