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
import { UniversalOnboardingModal } from "./components/UniversalOnboardingModal";
import { MediaLibraryView } from "./components/MediaLibraryView";
import { ProductStudioView } from "./components/ProductStudioView";
import { VideoStudioView } from "./components/VideoStudioView";
import { CampaignManagerView } from "./components/CampaignManagerView";
import { UnifiedWorkflowView } from "./components/UnifiedWorkflowView";

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
  fetchBrands,
  fetchOnboardingStatus,
  runMarketingWorkflow,
  approveWorkflowCampaign,
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
import type { ProductItem, MarketingState, BrandProfile, MediaAssetItem } from "./types";
import { AlertCircle, ShieldCheck, Plus } from "lucide-react";

export function App() {
  const [currentModule, setCurrentModule] = useState<string>("dashboard");
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [activeBrand, setActiveBrand] = useState<BrandProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [studioSelectedAsset, setStudioSelectedAsset] = useState<MediaAssetItem | null>(null);
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

  // Load brands and check onboarding status on mount
  useEffect(() => {
    fetchBrands()
      .then((bList) => {
        setBrands(bList);
        const savedBrandId = localStorage.getItem("dm_active_brand_id");
        const matched = bList.find((b) => b.id === savedBrandId) || bList[0];
        if (matched) {
          setActiveBrand(matched);
        }
      })
      .catch((err) => console.warn("Error loading brands:", err));

    fetchOnboardingStatus()
      .then((status) => {
        if (!status.is_onboarded) {
          setIsOnboardingOpen(true);
        }
      })
      .catch((err) => console.warn("Error checking onboarding status:", err));
  }, []);

  // Sync activeBrand to localStorage and load its products
  useEffect(() => {
    if (activeBrand) {
      localStorage.setItem("dm_active_brand_id", activeBrand.id);
      fetchProducts(activeBrand.id)
        .then((prods) => {
          setProducts(prods);
          if (prods.length > 0) {
            setSelectedProduct(prods[0]);
          } else {
            setSelectedProduct(null);
          }
        })
        .catch((err) => console.warn("Error loading products for brand:", err));
    }
  }, [activeBrand?.id]);

  const handleOnboardingComplete = (brand: BrandProfile, product?: ProductItem) => {
    setBrands((prev) => {
      const exists = prev.some((b) => b.id === brand.id);
      return exists ? prev.map((b) => (b.id === brand.id ? brand : b)) : [brand, ...prev];
    });
    setActiveBrand(brand);
    if (product) {
      setProducts((prev) => [product, ...prev]);
      setSelectedProduct(product);
    }
    setCurrentModule("dashboard");
  };

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
      const res = await approveWorkflowCampaign(workflowId, campaignId);
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
    unified: "Unified Studio & Campaign Journey (Product C)",
    dashboard: "Command Center Overview",
    brand: "Brand Intelligence & Verified Guidelines",
    products: "Products, Strategy & Personas",
    studio: "AI Product Photography Studio",
    video: "AI Video Generation & Animation Studio",
    media: "Central Media Asset Library",
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
        brandName={activeBrand?.name || "Brand"}
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

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Active Brand Switcher */}
            {brands.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Brand:</span>
                <select
                  value={activeBrand?.id || (brands[0] ? brands[0].id : "")}
                  onChange={(e) => {
                    const found = brands.find((b) => b.id === e.target.value);
                    if (found) setActiveBrand(found);
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(20, 27, 44, 0.95)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.industry})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Brand: <strong style={{ color: "var(--text-primary)" }}>{activeBrand?.name || "Workspace"}</strong>
              </span>
            )}

            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="btn-secondary"
              style={{
                fontSize: "0.78rem",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                borderColor: "rgba(16, 185, 129, 0.4)",
                color: "#34d399",
              }}
            >
              <Plus size={13} />
              Onboard Brand
            </button>

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
          {/* 0. Product C Unified Workflow View */}
          {currentModule === "unified" && (
            <UnifiedWorkflowView
              activeBrand={activeBrand}
              brands={brands}
              products={products}
              onBrandSelect={(b) => setActiveBrand(b)}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onNavigate={(mod: string) => setCurrentModule(mod)}
              onNavigateToModule={(mod: string) => setCurrentModule(mod)}
            />
          )}

          {/* 1. Dashboard View */}
          {currentModule === "dashboard" && (
            <DashboardView
              onNavigate={(mod) => setCurrentModule(mod)}
              marketingState={marketingState}
              brandId={activeBrand?.id}
              brandName={activeBrand?.name}
              activeBrand={activeBrand}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectWorkflowStage={(stageNum) => {
                setCurrentStep(stageNum);
              }}
            />
          )}

          {/* 2. Brand Intelligence View */}
          {currentModule === "brand" && (
            <BrandIntelligenceView
              activeBrand={activeBrand}
              onBrandUpdated={(b) => {
                setActiveBrand(b);
                setBrands((prev) => prev.map((item) => (item.id === b.id ? b : item)));
              }}
            />
          )}

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
                  onProductCreated={(p) => setProducts((prev) => [p, ...prev])}
                  onProductUpdated={(p) => setProducts((prev) => prev.map((item) => (item.id === p.id ? p : item)))}
                  activeBrandName={activeBrand?.name}
                  activeBrandId={activeBrand?.id}
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

          {/* AI Product Photography Studio View */}
          {currentModule === "studio" && (
            <ProductStudioView
              activeBrand={activeBrand}
              products={products}
              preselectedAsset={studioSelectedAsset}
              onProductCreated={(p) => setProducts((prev) => [p, ...prev])}
              onNavigateToLibrary={() => setCurrentModule("media")}
              onNavigateToCampaign={(campId) => {
                if (campId) setSelectedCampaignId(campId);
                setCurrentModule("campaigns");
              }}
            />
          )}

          {/* AI Video Generation & Animation Studio View */}
          {currentModule === "video" && (
            <VideoStudioView
              activeBrand={activeBrand}
              products={products}
              preselectedAsset={studioSelectedAsset}
              onNavigateToLibrary={() => setCurrentModule("media")}
              onNavigateToCampaign={(campId) => {
                if (campId) setSelectedCampaignId(campId);
                setCurrentModule("campaigns");
              }}
            />
          )}

          {/* Central Media Asset Library View */}
          {currentModule === "media" && (
            <MediaLibraryView
              activeBrand={activeBrand}
              onNavigateToStudio={(asset) => {
                setStudioSelectedAsset(asset || null);
                setCurrentModule("studio");
              }}
              onNavigateToVideo={(asset) => {
                setStudioSelectedAsset(asset || null);
                setCurrentModule("video");
              }}
              onNavigateToCampaign={(campId) => {
                if (campId) setSelectedCampaignId(campId);
                setCurrentModule("campaigns");
              }}
            />
          )}

          {/* 4. AI Content Studio View */}
          {currentModule === "content" && (
            <ContentStudioView
              onNavigateToCalendar={() => setCurrentModule("calendar")}
              workflowId={workflowId || undefined}
              selectedCampaignId={selectedCampaignId}
              campaigns={marketingState?.campaign_plan || []}
              onWorkflowStateUpdated={setMarketingState}
              brandId={activeBrand?.id}
              brandName={activeBrand?.name}
            />
          )}

          {/* 5. Content Calendar View */}
          {currentModule === "calendar" && <ContentCalendarView brandId={activeBrand?.id} />}

          {/* 6. Campaign Manager & Orchestration View */}
          {currentModule === "campaigns" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {marketingState && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    onClick={() => setCurrentStep(10)}
                    className={currentStep === 10 || currentStep < 4 || currentStep > 8 ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  >
                    🚀 AI Campaign Planner & Creative Orchestrator
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className={currentStep === 4 ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  >
                    Legacy Plan Config
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className={currentStep === 5 ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  >
                    Simulated Sandbox Execution
                  </button>
                  {marketingState?.current_iteration && marketingState.current_iteration > 1 && (
                    <button
                      onClick={() => setCurrentStep(8)}
                      className={currentStep === 8 ? "btn-primary" : "btn-secondary"}
                      style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                    >
                      Revised Campaign (It. {marketingState.current_iteration})
                    </button>
                  )}
                </div>
              )}

              {(currentStep === 10 || !marketingState || currentStep < 4 || currentStep > 8) && (
                <CampaignManagerView
                  activeBrand={activeBrand}
                  products={products}
                  workflowId={workflowId}
                  marketingState={marketingState}
                  onNavigateToStudio={() => setCurrentModule("studio")}
                  onNavigateToVideo={() => setCurrentModule("video")}
                  onNavigateToLibrary={() => setCurrentModule("media")}
                />
              )}

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
            </div>
          )}

          {/* 7. AI Marketing Assistant View */}
          {currentModule === "assistant" && (
            <AssistantView brandId={activeBrand?.id} brandName={activeBrand?.name} />
          )}

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
          {currentModule === "business_presence" && (
            <BusinessPresenceView brandId={activeBrand?.id} />
          )}

          {/* 13. Settings View */}
          {currentModule === "settings" && (
            <SettingsView
              workflowId={workflowId}
              onResetSession={handleStartFresh}
            />
          )}
        </main>
      </div>

      <UniversalOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

export default App;
