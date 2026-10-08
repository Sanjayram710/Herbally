import React from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface WorkflowStepperProps {
  currentStep: number; // 1 to 5
  onSelectStep: (step: number) => void;
  strategyLoaded: boolean;
  analyticsLoaded: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onSelectStep,
  strategyLoaded,
  analyticsLoaded,
}) => {
  const steps = [
    { id: 1, label: "Product & Goal", completed: strategyLoaded },
    { id: 2, label: "Strategy & Creative", completed: strategyLoaded },
    { id: 3, label: "Campaign Plan", completed: strategyLoaded },
    { id: 4, label: "Analytics & CSV", completed: analyticsLoaded },
    { id: 5, label: "Optimization & Action", completed: analyticsLoaded },
  ];

  return (
    <div className="glass-panel" style={{ padding: "16px 24px", margin: "24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
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
                  gap: "10px",
                  background: isActive ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  color: isActive ? "#34d399" : isDone ? "#94a3b8" : "#64748b",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer"
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <Circle size={16} color={isActive ? "#34d399" : "#64748b"} />
                )}
                <span>{step.id}. {step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <ArrowRight size={14} color="#334155" style={{ display: "block" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
