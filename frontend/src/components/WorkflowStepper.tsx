import React from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface WorkflowStepperProps {
  currentStep: number; // 1 to 6
  onSelectStep: (step: number) => void;
  strategyLoaded: boolean;
  campaignApproved: boolean;
  analyticsLoaded: boolean;
  iteration: number;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onSelectStep,
  strategyLoaded,
  campaignApproved,
  analyticsLoaded,
  iteration,
}) => {
  const steps = [
    { id: 1, label: "Product & Goal", completed: strategyLoaded },
    { id: 2, label: "Strategy & Assets", completed: strategyLoaded },
    { id: 3, label: "Campaign Plan", completed: campaignApproved || analyticsLoaded },
    { id: 4, label: "Campaign Execution", completed: analyticsLoaded },
    { id: 5, label: "Analytics", completed: analyticsLoaded },
    { id: 6, label: "Optimization & Action", completed: analyticsLoaded },
  ];

  return (
    <div className="glass-panel" style={{ padding: "16px 24px", margin: "24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Closed-Loop Marketing Lifecycle
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            Iteration {iteration}
          </span>
          <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
            Simulated Sandbox
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isDone = step.completed;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStep(step.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: isActive ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  color: isActive ? "#34d399" : isDone ? "#94a3b8" : "#64748b",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={15} color="#10b981" />
                ) : (
                  <Circle size={15} color={isActive ? "#34d399" : "#64748b"} />
                )}
                <span>{step.id}. {step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <ArrowRight size={13} color="#334155" style={{ display: "block" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
