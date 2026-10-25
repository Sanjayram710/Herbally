import { useState, useEffect } from "react";
import { SidebarNavigation } from "./components/SidebarNavigation";
import { DashboardView } from "./components/DashboardView";
import { BrandIntelligenceView } from "./components/BrandIntelligenceView";
import { ContentStudioView } from "./components/ContentStudioView";
import { ContentCalendarView } from "./components/ContentCalendarView";
import { AssistantView } from "./components/AssistantView";
import { AutomationCenterView } from "./components/AutomationCenterView";
import { IntegrationsView } from "./components/IntegrationsView";
import { CustomerMessagesView } from "./components/CustomerMessagesView";
import { BusinessPresenceView } from "./components/BusinessPresenceView";
import { SettingsView } from "./components/SettingsView";

// Preserved core closed-loop components
import { ProductSetupSection } from "./components/ProductSetupSection";
import { StrategySection } from "./components/StrategySection";
import { CampaignPlanSection } from "./components/CampaignPlanSection";
import { CampaignExecutionSection } from "./components/CampaignExecutionSection";
import { AnalyticsSection } from "./components/AnalyticsSection";
import { OptimizationSection } from "./components/OptimizationSection";
import { RevisedCampaignSection } from "./components/RevisedCampaignSection";

import {
  fetchProducts,
  runMarketingWorkflow,
  approveCampaign,
  launchSimulatedCampaign,
  iterateNextCampaign,
  uploadCampaignCsv,
  fetchWorkflowState,
  updateCampaignStatus,
  resetCampaignRun,
  selectCampaign,
  reviseCampaign,
  createCampaignFromAssets,
} from "./services/api";
import type { ProductItem, MarketingState } from "./types";
import { AlertCircle, ShieldCheck } from "lucide-react";

export function App() {
  const [currentModule, setCurrentModule] = useState<string>("dashboard");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [marketingState, setMarketingState] = useState<MarketingState | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const savedModule = localStorage.getItem("dm_current_module");
      const savedWorkflowId = localStorage.getItem("dm_workflow_id");
      const savedState = localStorage.getItem("dm_marketing_state");
      const savedStep = localStorage.getItem("dm_current_step");
      const savedCampId = localStorage.getItem("dm_selected_campaign_id");

      if (savedModule) setCurrentModule(savedModule);
      if (savedWorkflowId) setWorkflowId(savedWorkflowId);
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 8) setCurrentStep(stepNum);
      }
      if (savedCampId) setSelectedCampaignId(savedCampId);

      if (savedState) {
        const parsed = JSON.parse(savedState);
        setMarketingState(parsed);
      }

      // Sync fresh state from server in background
      if (savedWorkflowId) {
        fetchWorkflowState(savedWorkflowId)
          .then((res) => {
            if (res && res.state) {
              setMarketingState(res.state);
              localStorage.setItem("dm_marketing_state", JSON.stringify(res.state));
            }
          })
          .catch((e) => {
            console.warn("Could not sync workflow state from backend:", e);
          });
      }
    } catch (err) {
      console.error("Failed to restore session from localStorage", err);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("dm_current_module", currentModule);
    if (workflowId) localStorage.setItem("dm_workflow_id", workflowId);
    if (marketingState) localStorage.setItem("dm_marketing_state", JSON.stringify(marketingState));
    localStorage.setItem("dm_current_step", currentStep.toString());
    if (selectedCampaignId) localStorage.setItem("dm_selected_campaign_id", selectedCampaignId);
  }, [currentModule, workflowId, marketingState, currentStep, selectedCampaignId]);

  // Load sample products on start
  useEffect(() => {
    fetchProducts()
      .then((prods) => {
        setProducts(prods);
        if (prods.length > 0 && !selectedProduct) {
          setSelectedProduct(prods[0]);
        }
      })
      .catch((err) => {
        console.error("Error loading products:", err);
      });
  }, []);

  // Update selected campaign ID default when marketingState changes
  useEffect(() => {
    if (marketingState?.campaign_plan && marketingState.campaign_plan.length > 0) {
      if (!selectedCampaignId || !marketingState.campaign_plan.some((c) => c.id === selectedCampaignId)) {
        setSelectedCampaignId(marketingState.campaign_plan[0].id);
      }
    }
  }, [marketingState, selectedCampaignId]);

  // Handle Strategy Workflow execution
  const handleRunWorkflow = async (params: {
    product_name: string;
    brand: string;
    product_url?: string;
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
      if (res.state.campaign_plan && res.state.campaign_plan.length > 0) {
        setSelectedCampaignId(res.state.campaign_plan[0].id);
      }
      setCurrentStep(2);
      setCurrentModule("products");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute workflow");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCampaign = async (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    if (workflowId) {
      try {
        const res = await selectCampaign(workflowId, campaignId);
        setMarketingState(res.state);
      } catch (err) {
        console.warn("Could not sync campaign selection to backend:", err);
      }
    }
  };

  const handleUpdateStatus = async (campaignId: string, status: string) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await updateCampaignStatus(workflowId, campaignId, status);
      setMarketingState(res.state);
    } catch (err: any) {
      setErrorMessage(err.message || "Status update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCampaign = async (campaignId: string) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await resetCampaignRun(workflowId, campaignId);
      setMarketingState(res.state);
    } catch (err: any) {
      setErrorMessage(err.message || "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCreateCampaign = async (campaignData: any) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await createCampaignFromAssets(workflowId, campaignData);
      setMarketingState(res.state);
      setSelectedCampaignId(res.campaign_id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchCampaign = async (campaignId?: string) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await launchSimulatedCampaign(workflowId, campaignId);
      setMarketingState(res.state);
      setCurrentStep(6);
      setCurrentModule("analytics");
    } catch (err: any) {
      setErrorMessage(err.message || "Launch failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviseCampaign = async (recommendationId?: string) => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const targetCampId = selectedCampaignId || marketingState?.campaign_plan[0]?.id || "CAMP-001";
      const res = await reviseCampaign(workflowId, targetCampId, recommendationId);
      setMarketingState(res.state);
      setCurrentStep(8);
      setCurrentModule("campaigns");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate revised campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIterateCampaign = async () => {
    if (!workflowId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await iterateNextCampaign(workflowId);
      setMarketingState(res.state);
      setCurrentStep(4);
      setCurrentModule("campaigns");
    } catch (err: any) {
      setErrorMessage(err.message || "Iteration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCsv = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await uploadCampaignCsv(file, workflowId || undefined);
      if (res.updated_state) {
        setMarketingState(res.updated_state);
      } else if (marketingState) {
        setMarketingState({
          ...marketingState,
          campaign_data_loaded: true,
          analytics: res.analytics,
          recommendations: res.recommendations,
          next_best_action: res.next_best_action,
        });
      }
      setCurrentStep(6);
      setCurrentModule("analytics");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process campaign CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFresh = () => {
    if (confirm("Reset local workflow session and start fresh?")) {
      localStorage.clear();
      setWorkflowId(null);
      setMarketingState(null);
      setSelectedCampaignId(undefined);
      setCurrentStep(1);
      setCurrentModule("dashboard");
    }
  };

  // Nav titles map
  const moduleTitles: Record<string, string> = {
    dashboard: "Command Center Overview",
    brand: "Brand Intelligence & Verified Guidelines",
    products: "Products, Strategy & Personas",
    content: "AI Content Studio & Creative Lab",
    calendar: "Publishing Calendar & Scheduling",
    campaigns: "Campaign Manager & Sandbox Execution",
    assistant: "AI Marketing Assistant",
    analytics: "Deterministic Analytics & Optimization",
    automations: "Marketing Automation Center",
    integrations: "Official Integrations & Connectors",
    customer_messages: "Customer Inquiries & Reputation",
    business_presence: "Brand Web Presence & Landing Page",
    settings: "Workspace Settings & System Health",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Persistent Sidebar Navigation */}
      <SidebarNavigation
        currentModule={currentModule}
        onSelectModule={(mod) => setCurrentModule(mod)}
        brandName="Herbally"
      />

      {/* Main Workspace Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: "64px",
            background: "rgba(17, 22, 34, 0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            position: "sticky",
            top: 0,
            zIndex: 30
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {moduleTitles[currentModule] || "Workspace"}
            </span>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={12} /> Guardrails Enforced
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Brand: <strong style={{ color: "var(--text-primary)" }}>Herbally Pure Neem Bedsheet</strong>
            </span>
            <span className="badge" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa" }}>
              Simulated Sandbox (0 Spend)
            </span>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div style={{ margin: "16px 28px 0 28px", padding: "12px 18px", background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "10px", color: "#fb7185", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} style={{ background: "transparent", color: "#fb7185", fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* Dynamic Module Views */}
        <main style={{ flex: 1, padding: "28px", overflowY: "auto" }}>
          {/* 1. Dashboard View */}
          {currentModule === "dashboard" && (
            <DashboardView
              onNavigate={(mod) => setCurrentModule(mod)}
              marketingState={marketingState}
              onSelectWorkflowStage={(stageNum) => {
                setCurrentStep(stageNum);
              }}
            />
          )}

          {/* 2. Brand Intelligence View */}
          {currentModule === "brand" && <BrandIntelligenceView />}

          {/* 3. Products & Strategy Section */}
          {currentModule === "products" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className={currentStep === 1 ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  >
                    1. Product & Goal Setup
                  </button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!marketingState}
                    className={currentStep === 2 ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "8px 16px", fontSize: "0.85rem", opacity: marketingState ? 1 : 0.5 }}
                  >
                    2. Strategy & Persona Analysis
                  </button>
                </div>
              </div>

              {currentStep === 1 && (
                <ProductSetupSection
                  products={products}
                  selectedProduct={selectedProduct}
                  onSelectProduct={setSelectedProduct}
                  onSubmitWorkflow={handleRunWorkflow}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 2 && marketingState && (
                <StrategySection
                  state={marketingState}
                  onProceedToContent={() => setCurrentModule("content")}
                />
              )}
            </div>
          )}

          {/* 4. AI Content Studio View */}
          {currentModule === "content" && (
            <ContentStudioView
              onNavigateToCalendar={() => setCurrentModule("calendar")}
            />
          )}

          {/* 5. Content Calendar View */}
          {currentModule === "calendar" && <ContentCalendarView />}

          {/* 6. Campaign Manager View */}
          {currentModule === "campaigns" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => setCurrentStep(4)}
                  className={currentStep === 4 ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Campaign Configurations
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className={currentStep === 5 ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Simulated Execution Dashboard
                </button>
                {marketingState?.current_iteration && marketingState.current_iteration > 1 && (
                  <button
                    onClick={() => setCurrentStep(8)}
                    className={currentStep === 8 ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  >
                    Revised Campaign (Iteration {marketingState.current_iteration})
                  </button>
                )}
              </div>

              {currentStep === 4 && marketingState && (
                <CampaignPlanSection
                  state={marketingState}
                  selectedCampaignId={selectedCampaignId}
                  onSelectCampaign={handleSelectCampaign}
                  onSubmitForApproval={(campId) => handleUpdateStatus(campId, "PENDING_APPROVAL")}
                  onCreateCampaign={handleCreateCampaign}
                  onProceedToExecution={() => setCurrentStep(5)}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 5 && marketingState && (
                <CampaignExecutionSection
                  campaigns={marketingState.campaign_plan}
                  selectedCampaignId={selectedCampaignId}
                  onSelectCampaign={handleSelectCampaign}
                  onApproveCampaign={handleApproveCampaign}
                  onLaunchCampaign={handleLaunchCampaign}
                  onUpdateStatus={handleUpdateStatus}
                  onResetCampaign={handleResetCampaign}
                  onProceedToAnalytics={() => {
                    setCurrentStep(6);
                    setCurrentModule("analytics");
                  }}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 8 && marketingState && (
                <RevisedCampaignSection
                  state={marketingState}
                  onSubmitForApproval={(campId) => handleUpdateStatus(campId, "PENDING_APPROVAL")}
                  onApproveCampaign={handleApproveCampaign}
                  onLaunchExecution={() => setCurrentStep(5)}
                  onBackToOptimization={() => {
                    setCurrentStep(7);
                    setCurrentModule("analytics");
                  }}
                  isLoading={isLoading}
                />
              )}

              {!marketingState && (
                <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
                  <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
                    No campaigns initialized yet. Kick off the strategy workflow in Products & Strategy first.
                  </p>
                  <button onClick={() => setCurrentModule("products")} className="btn-primary" style={{ padding: "8px 18px" }}>
                    Go to Products & Strategy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 7. AI Marketing Assistant View */}
          {currentModule === "assistant" && <AssistantView />}

          {/* 8. Analytics & Optimization View */}
          {currentModule === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setCurrentStep(6)}
                  className={currentStep === 6 ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Campaign KPIs & CSV Ingestion
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  disabled={!marketingState?.analytics}
                  className={currentStep === 7 ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "8px 16px", fontSize: "0.85rem", opacity: marketingState?.analytics ? 1 : 0.5 }}
                >
                  Optimization Decisions & Heuristics
                </button>
              </div>

              {currentStep === 6 && (
                <AnalyticsSection
                  analytics={marketingState?.analytics}
                  campaigns={marketingState?.campaign_plan}
                  selectedCampaignId={selectedCampaignId}
                  onSelectCampaign={handleSelectCampaign}
                  onUploadCsv={handleUploadCsv}
                  onProceedToOptimization={() => setCurrentStep(7)}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 7 && marketingState && (
                <OptimizationSection
                  recommendations={marketingState.recommendations}
                  nextBestAction={marketingState.next_best_action}
                  sources={marketingState.sources}
                  assumptions={marketingState.assumptions}
                  currentIteration={marketingState.current_iteration}
                  onIterateCampaign={handleIterateCampaign}
                  onReviseCampaign={handleReviseCampaign}
                  onProceedToRevised={() => {
                    setCurrentStep(8);
                    setCurrentModule("campaigns");
                  }}
                  isLoading={isLoading}
                />
              )}
            </div>
          )}

          {/* 9. Automation Center View */}
          {currentModule === "automations" && <AutomationCenterView />}

          {/* 10. Integrations View */}
          {currentModule === "integrations" && <IntegrationsView />}

          {/* 11. Nested: Customer Messages & Reputation */}
          {currentModule === "customer_messages" && <CustomerMessagesView />}

          {/* 12. Nested: Business Presence & Landing Page */}
          {currentModule === "business_presence" && <BusinessPresenceView />}

          {/* 13. Settings View */}
          {currentModule === "settings" && (
            <SettingsView
              workflowId={workflowId}
              onResetSession={handleStartFresh}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
