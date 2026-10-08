import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { NextBestActionCard } from "./components/NextBestActionCard";
import { ProductSetupSection } from "./components/ProductSetupSection";
import { StrategySection } from "./components/StrategySection";
import { CampaignExecutionSection } from "./components/CampaignExecutionSection";
import { AnalyticsSection } from "./components/AnalyticsSection";
import { OptimizationSection } from "./components/OptimizationSection";
import {
  fetchProducts,
  runMarketingWorkflow,
  approveCampaign,
  launchSimulatedCampaign,
  iterateNextCampaign,
  uploadCampaignCsv
} from "./services/api";
import type { ProductItem, MarketingState } from "./types";
import { AlertCircle } from "lucide-react";

export function App() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [marketingState, setMarketingState] = useState<MarketingState | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load products on start
  useEffect(() => {
    fetchProducts()
      .then((prods) => {
        setProducts(prods);
        if (prods.length > 0) {
          setSelectedProduct(prods[0]);
        }
      })
      .catch((err) => {
        console.error("Error loading products:", err);
      });
  }, []);

  // Handle Strategy Workflow execution
  const handleRunWorkflow = async (params: {
    product_name: string;
    brand: string;
    market: string;
    marketing_goal: string;
    budget: number;
    duration_days: number;
    target_audience_hint: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await runMarketingWorkflow({
        ...params,
        product_id: selectedProduct?.id,
      });
      setWorkflowId(res.workflow_id);
      setMarketingState(res.state);
      setCurrentStep(2); // Progress to Strategy & Creative review
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute workflow");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Human Campaign Approval
  const handleApproveCampaign = async (campaignId: string) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await approveCampaign(workflowId, campaignId);
      setMarketingState(res.state);
    } catch (err: any) {
      setErrorMessage(err.message || "Approval failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Simulated Sandbox Launch
  const handleLaunchCampaign = async (campaignId?: string) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await launchSimulatedCampaign(workflowId, campaignId);
      setMarketingState(res.state);
      setCurrentStep(5); // Progress directly to Analytics & Optimization
    } catch (err: any) {
      setErrorMessage(err.message || "Launch failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Closed-Loop Campaign Iteration
  const handleIterateCampaign = async () => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await iterateNextCampaign(workflowId);
      setMarketingState(res.state);
      setCurrentStep(4); // Takes user back to Campaign Execution stage to review & approve Iteration N+1!
    } catch (err: any) {
      setErrorMessage(err.message || "Iteration generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV Upload
  const handleUploadCsv = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await uploadCampaignCsv(file, workflowId || undefined);
      if (marketingState) {
        setMarketingState({
          ...marketingState,
          campaign_data_loaded: true,
          analytics: res.analytics,
          recommendations: res.recommendations,
          next_best_action: res.next_best_action,
        });
      }
      setCurrentStep(6); // Jump directly to Optimization & Actions
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload and parse CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const hasApprovedCampaigns = marketingState?.campaign_plan.some(
    (c) => c.status === "APPROVED" || c.status === "COMPLETED"
  ) ?? false;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header workflowId={workflowId} />

      <main className="container" style={{ flex: 1, paddingBottom: "60px" }}>
        {/* Error notification */}
        {errorMessage && (
          <div style={{
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            borderRadius: "10px",
            padding: "14px 18px",
            margin: "20px 0",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#fb7185"
          }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: "0.9rem" }}>{errorMessage}</span>
          </div>
        )}

        {/* Guided 6-Stage Workflow Stepper */}
        <WorkflowStepper
          currentStep={currentStep}
          onSelectStep={(step) => setCurrentStep(step)}
          strategyLoaded={!!marketingState}
          campaignApproved={hasApprovedCampaigns}
          analyticsLoaded={!!marketingState?.campaign_data_loaded}
          iteration={marketingState?.current_iteration || 1}
        />

        {/* Prominent Next Best Action Hero Card (Visible immediately once generated) */}
        {marketingState?.next_best_action && (
          <NextBestActionCard action={marketingState.next_best_action} />
        )}

        {/* Stage 1: Product & Goal */}
        {currentStep === 1 && (
          <ProductSetupSection
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            onSubmitWorkflow={handleRunWorkflow}
            isLoading={isLoading}
          />
        )}

        {/* Stage 2 & 3: Strategy & Creative / Plan */}
        {(currentStep === 2 || currentStep === 3) && marketingState && (
          <StrategySection state={marketingState} />
        )}

        {/* Stage 4: Campaign Execution (Human Approval & Simulation Launch) */}
        {currentStep === 4 && marketingState && (
          <CampaignExecutionSection
            campaigns={marketingState.campaign_plan}
            onApproveCampaign={handleApproveCampaign}
            onLaunchCampaign={handleLaunchCampaign}
            onProceedToAnalytics={() => setCurrentStep(5)}
            isLoading={isLoading}
          />
        )}

        {/* Stage 5: Analytics */}
        {currentStep === 5 && (
          <AnalyticsSection
            analytics={marketingState?.analytics}
            onUploadCsv={handleUploadCsv}
            isLoading={isLoading}
          />
        )}

        {/* Stage 6: Optimization & Next Action (Closed Loop) */}
        {currentStep === 6 && marketingState && (
          <OptimizationSection
            recommendations={marketingState.recommendations}
            nextBestAction={marketingState.next_best_action}
            sources={marketingState.sources}
            assumptions={marketingState.assumptions}
            currentIteration={marketingState.current_iteration}
            onIterateCampaign={handleIterateCampaign}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "20px 0",
        textAlign: "center",
        fontSize: "0.8rem",
        color: "var(--text-muted)"
      }}>
        Herbally AI Closed-Loop Digital Marketing Agent • Simulated Sandbox Mode • Zero Live Ad Spend
      </footer>
    </div>
  );
}

export default App;
