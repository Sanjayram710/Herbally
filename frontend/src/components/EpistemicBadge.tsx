import React from "react";
import { ShieldCheck, Globe, Sparkles, HelpCircle, Lightbulb, Activity } from "lucide-react";

interface EpistemicBadgeProps {
  category: "VERIFIED_FACT" | "RESEARCH_FINDING" | "AI_INFERENCE" | "MARKETING_SUGGESTION" | "ASSUMPTION" | "SIMULATED_DATA" | string;
  sourceText?: string;
}

export const EpistemicBadge: React.FC<EpistemicBadgeProps> = ({ category, sourceText }) => {
  switch (category) {
    case "VERIFIED_FACT":
      return (
        <span className="badge badge-verified" title={sourceText || "Verified brand source material"}>
          <ShieldCheck size={12} />
          Verified Fact
        </span>
      );
    case "RESEARCH_FINDING":
    case "EXTERNAL_RESEARCH":
      return (
        <span className="badge badge-research" title={sourceText || "External market research or benchmark"}>
          <Globe size={12} />
          Research Finding
        </span>
      );
    case "AI_INFERENCE":
      return (
        <span className="badge badge-recommendation" title={sourceText || "AI-generated persona or hypothesis"}>
          <Sparkles size={12} />
          AI Inference
        </span>
      );
    case "MARKETING_SUGGESTION":
    case "AI_RECOMMENDATION":
      return (
        <span className="badge badge-recommendation" title={sourceText || "Strategic marketing proposal"}>
          <Lightbulb size={12} />
          Marketing Suggestion
        </span>
      );
    case "SIMULATED_DATA":
      return (
        <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }} title={sourceText || "Simulated Sandbox Execution (No Live Ad Spend)"}>
          <Activity size={12} />
          Simulated Data
        </span>
      );
    case "ASSUMPTION":
    case "ASSUMPTION_OR_ESTIMATE":
    default:
      return (
        <span className="badge badge-assumption" title={sourceText || "Working estimate or assumption"}>
          <HelpCircle size={12} />
          Assumption
        </span>
      );
  }
};
