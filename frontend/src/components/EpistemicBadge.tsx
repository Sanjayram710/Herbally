import React from "react";
import { ShieldCheck, Globe, Sparkles, HelpCircle } from "lucide-react";

interface EpistemicBadgeProps {
  category: "VERIFIED_FACT" | "EXTERNAL_RESEARCH" | "AI_RECOMMENDATION" | "ASSUMPTION_OR_ESTIMATE" | string;
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
    case "EXTERNAL_RESEARCH":
      return (
        <span className="badge badge-research" title={sourceText || "External market research or benchmark"}>
          <Globe size={12} />
          Market Research
        </span>
      );
    case "AI_RECOMMENDATION":
      return (
        <span className="badge badge-recommendation" title={sourceText || "Strategic AI-generated proposal"}>
          <Sparkles size={12} />
          AI Recommendation
        </span>
      );
    case "ASSUMPTION_OR_ESTIMATE":
    default:
      return (
        <span className="badge badge-assumption" title={sourceText || "Working estimate or assumption"}>
          <HelpCircle size={12} />
          Estimate / Assumption
        </span>
      );
  }
};
