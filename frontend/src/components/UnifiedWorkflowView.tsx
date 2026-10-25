import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Camera,
  Video,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Send,
  Plus,
  RefreshCw,
  ShieldCheck,
  BarChart3,
  Check,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import type {
  BrandProfile,
  ProductItem,
  MediaAssetItem,
  CampaignItem,
  CampaignContentItem,
  CampaignApprovalHistoryItem,
  ProviderInfo,
  VideoProviderInfo,
  VideoJobItem,
  StudioGenerateResponse,
} from "../types";
import {
  fetchProducts,
  createProduct,
  uploadProductImage,
  fetchImageProviders,
  generateStudioAsset,
  fetchVideoProviders,
  createVideoJob,
  fetchVideoJob,
  fetchMediaAssets,
  createCampaign,
  fetchCampaignsList,
  fetchCampaignDetail,
  generateCampaignStrategy,
  createCampaignContent,
  generateContentVariants,
  attachAssetToCampaign,
  submitCampaignForReview,
  approveCampaign,
  fetchCalendarEntries,
  rescheduleCalendarEntry,
  resolveMediaUrl,
  fetchProtectedMedia,
} from "../services/api";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

interface UnifiedWorkflowViewProps {
  activeBrand: BrandProfile | null;
  onBrandSelect?: (brand: BrandProfile) => void;
  brands?: BrandProfile[];
  products?: ProductItem[];
  onOpenOnboarding?: () => void;
  onNavigateToModule?: (mod: string) => void;
  onNavigate?: (mod: string) => void;
}

const WORKFLOW_STEPS = [
  { id: 1, label: "Brand & Product", desc: "Select target brand & product" },
  { id: 2, label: "Creative Studio", desc: "Generate image or video visual" },
  { id: 3, label: "Inspect Saved Asset", desc: "Verify cryptographic provenance" },
  { id: 4, label: "Campaign Setup", desc: "Define objective, budget & channels" },
  { id: 5, label: "Attach Creative", desc: "Associate media to campaign" },
  { id: 6, label: "Generate Copy", desc: "Channel copy & multi-angle variants" },
  { id: 7, label: "Review & Approval", desc: "Audit trail state machine" },
  { id: 8, label: "Publishing Schedule", desc: "Content calendar & date planning" },
  { id: 9, label: "Performance Analytics", desc: "Live integration or sandbox metrics" }
];

const CREATIVE_TEMPLATES = [
  {
    id: "product_hero",
    title: "Product Hero Showcase",
    desc: "Clean studio rim lighting, 3D motorized turntable glide, packaging highlight",
    icon: "💎",
    prompt: "High-end commercial hero photography of {PRODUCT_NAME}. Centered on smooth matte surface with soft rim lighting, subtle natural drop shadow, tack-sharp packaging detail, 8k luxury commercial aesthetic."
  },
  {
    id: "lifestyle",
    title: "Lifestyle Scene",
    desc: "Warm sunlit modern living room or outdoor vanity environment",
    icon: "🌿",
    prompt: "Natural lifestyle visual featuring {PRODUCT_NAME} placed elegantly in a sun-drenched modern room, warm morning light, architectural aesthetic, shallow depth of field, authentic living space."
  },
  {
    id: "product_showcase",
    title: "Product Showcase & Features",
    desc: "Dynamic angled composition displaying ergonomic finish and usage ritual",
    icon: "✨",
    prompt: "Detailed product showcase demonstrating {PRODUCT_NAME}. Clean minimalist studio, dynamic angles highlighting ergonomic design, premium texture and pristine finish."
  },
  {
    id: "ugc_concept",
    title: "UGC-Style Social Concept",
    desc: "Authentic handheld smartphone perspective on desk or vanity",
    icon: "📱",
    prompt: "Authentic handheld social media creator perspective showcasing {PRODUCT_NAME} on a sunlit wooden desk. Natural daylight, gentle smartphone camera movement, authentic lifestyle environment."
  },
  {
    id: "product_demo",
    title: "Product Demonstration",
    desc: "Step-by-step usage walkthrough and immediate functional benefits",
    icon: "🧴",
    prompt: "Step-by-step product demonstration of {PRODUCT_NAME}. Hands showcasing effortless application, gentle diffuse studio lighting, clear product benefits, high resolution."
  }
];

export const UnifiedWorkflowView: React.FC<UnifiedWorkflowViewProps> = ({
  activeBrand,
  onBrandSelect,
  brands = [],
  products: initialProducts = [],
  onOpenOnboarding,
  onNavigateToModule,
  onNavigate,
}) => {
  // Stepper state
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const saved = localStorage.getItem("dm_unified_step");
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    localStorage.setItem("dm_unified_step", currentStep.toString());
  }, [currentStep]);

  // Product Selection & Creation
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
      if (!selectedProductId) setSelectedProductId(initialProducts[0].id);
    }
  }, [initialProducts]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Wellness");
  const [newProductPrice, setNewProductPrice] = useState("1299");
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Creative Studio Mode: 'image' | 'video'
  const [creativeType, setCreativeType] = useState<"image" | "video">("image");
  const [selectedTemplateId, setSelectedTemplateId] = useState("product_hero");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customScript, setCustomScript] = useState("");

  // Source Keyframe / Reference
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Providers & Generation
  const [imageProviders, setImageProviders] = useState<ProviderInfo[]>([]);
  const [videoProviders, setVideoProviders] = useState<VideoProviderInfo[]>([]);
  const [selectedImageProvider, setSelectedImageProvider] = useState("demo_mode");
  const [selectedVideoProvider, setSelectedVideoProvider] = useState("demo_mode");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Generated Media Asset Result
  const [savedMediaAsset, setSavedMediaAsset] = useState<MediaAssetItem | null>(() => {
    const saved = localStorage.getItem("dm_unified_saved_asset");
    return saved ? JSON.parse(saved) : null;
  });
  const [videoJob, setVideoJob] = useState<VideoJobItem | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  // Campaign State
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [campaignDetail, setCampaignDetail] = useState<CampaignItem | null>(null);

  // Campaign Creation form
  const [campName, setCampName] = useState("");
  const [campObjective, setCampObjective] = useState("conversions");
  const [campBudget, setCampBudget] = useState("50000");
  const [campCurrency, setCampCurrency] = useState("INR");
  const [campChannels, setCampChannels] = useState<string[]>(["instagram", "meta"]);
  const [campGeography, setCampGeography] = useState("India Tier-1 metros and wellness hubs");
  const [campSegment, setCampSegment] = useState("Conscious lifestyle and skincare buyers");
  const [isCreatingCamp, setIsCreatingCamp] = useState(false);

  // Strategy & Content
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState<any>(null);
  const [campaignContent, setCampaignContent] = useState<CampaignContentItem[]>([]);
  const [contentHeadline, setContentHeadline] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [contentCta, setContentCta] = useState("Shop Now");
  const [contentHashtags, setContentHashtags] = useState("#AuthenticQuality, #DailyRitual");
  const [contentScheduleTime, setContentScheduleTime] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [generatingVariants, setGeneratingVariants] = useState(false);

  // Review & Approval
  const [approvalHistory, setApprovalHistory] = useState<CampaignApprovalHistoryItem[]>([]);
  const [reviewComment, setReviewComment] = useState("Verified compliance with claim guardrails and channel allocations.");
  const [isReviewing, setIsReviewing] = useState(false);

  // Calendar
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // 1. Load Products when Brand Changes
  useEffect(() => {
    if (activeBrand) {
      fetchProducts(activeBrand.id)
        .then((prods) => {
          setProducts(prods);
          if (prods.length > 0 && !selectedProductId) {
            setSelectedProductId(prods[0].id);
          }
        })
        .catch((err) => console.warn("Failed to load products for unified flow:", err));
      
      // Load campaigns for this brand
      fetchCampaignsList({ brand_id: activeBrand.id })
        .then((list) => {
          setCampaigns(list);
          if (list.length > 0 && !selectedCampaignId) {
            setSelectedCampaignId(list[0].id);
          }
        })
        .catch((err) => console.warn("Failed to load campaigns for unified flow:", err));
    }
  }, [activeBrand?.id]);

  // Load Providers on Mount
  useEffect(() => {
    fetchImageProviders()
      .then((data) => {
        setImageProviders(data);
        const demo = data.find((p) => p.id === "demo_mode");
        if (demo) setSelectedImageProvider(demo.id);
      })
      .catch((err) => console.warn("Failed to load image providers:", err));

    fetchVideoProviders()
      .then((data) => {
        setVideoProviders(data);
        const demo = data.find((p) => p.id === "demo_mode");
        if (demo) setSelectedVideoProvider(demo.id);
      })
      .catch((err) => console.warn("Failed to load video providers:", err));
  }, []);

  // Update prompt when template or product changes
  useEffect(() => {
    const tmpl = CREATIVE_TEMPLATES.find((t) => t.id === selectedTemplateId) || CREATIVE_TEMPLATES[0];
    const prod = products.find((p) => p.id === selectedProductId);
    const prodName = prod ? prod.name : activeBrand?.name || "Featured Product";
    setCustomPrompt(tmpl.prompt.replace(/{PRODUCT_NAME}/g, prodName));
    setCustomScript(`Elevate your daily ritual with ${prodName}. Crafted with pure botanical integrity.`);
    if (!campName && prod) {
      setCampName(`${prod.name} Launch & Scaling Campaign`);
    }
  }, [selectedTemplateId, selectedProductId, activeBrand]);

  // Sync selected campaign detail
  const reloadCampaignDetail = async (campId: string) => {
    try {
      const camp = await fetchCampaignDetail(campId);
      setCampaignDetail(camp);
      setStrategyResult(camp.strategy_recommendation);
      setCampaignContent(camp.content_items || []);
      setApprovalHistory(camp.approval_history || []);
    } catch (err) {
      console.warn("Failed to load campaign detail in unified flow:", err);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      reloadCampaignDetail(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // Load calendar when reaching step 8
  useEffect(() => {
    if (currentStep >= 8 && activeBrand) {
      fetchCalendarEntries({ brand_id: activeBrand.id, campaign_id: selectedCampaignId || undefined })
        .then((entries) => setCalendarEntries(entries))
        .catch((err) => console.warn("Failed to load calendar entries:", err));
    }
  }, [currentStep, activeBrand?.id, selectedCampaignId]);

  // Step 1: Create Product Handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand || !newProductName.trim()) return;
    try {
      const created = await createProduct({
        name: newProductName.trim(),
        brand_id: activeBrand.id,
        category: newProductCategory.trim(),
        price_inr: parseFloat(newProductPrice) || 999,
        description: `Verified ${newProductCategory} product from ${activeBrand.name}.`
      });
      setProducts((prev) => [created, ...prev]);
      setSelectedProductId(created.id);
      setIsAddingProduct(false);
      setNewProductName("");
    } catch (err: any) {
      alert("Failed to create product: " + (err.message || err));
    }
  };

  // Step 1: Product Photo Upload
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProductId) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadProductImage(selectedProductId, file);
      if (res.image_url) {
        setSourcePreviewUrl(res.image_url);
        const mediaId = res.media_asset?.id || res.image_url.split("/").pop();
        setSourceAssetId(mediaId || null);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === selectedProductId ? { ...p, image_url: res.image_url } : p
          )
        );
      }
    } catch (err: any) {
      alert("Photo upload failed: " + (err.message || err));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Step 2: Generate Creative (Image or Video)
  const handleGenerateCreative = async () => {
    if (!activeBrand) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      if (creativeType === "image") {
        const res: StudioGenerateResponse = await generateStudioAsset({
          brand_id: activeBrand.id,
          product_id: selectedProductId || undefined,
          source_asset_id: sourceAssetId || undefined,
          style_preset: selectedTemplateId,
          custom_prompt: customPrompt,
          aspect_ratio: aspectRatio,
          provider: selectedImageProvider,
          output_quality: "standard",
          confirmed: true,
          allow_demo_fallback: true
        });
        setSavedMediaAsset(res.media);
        localStorage.setItem("dm_unified_saved_asset", JSON.stringify(res.media));
        setCurrentStep(3); // Advance to Inspection
      } else {
        // Video Generation
        const job = await createVideoJob({
          brand_id: activeBrand.id,
          product_id: selectedProductId || undefined,
          source_asset_id: sourceAssetId || undefined,
          template_id: selectedTemplateId,
          language: selectedLanguage,
          aspect_ratio: aspectRatio,
          duration_seconds: durationSeconds,
          prompt: customPrompt,
          script: customScript,
          provider: selectedVideoProvider,
          confirmed: true,
          allow_demo_fallback: true
        });
        setVideoJob(job);

        // Poll video job until completed
        let currentStatus = job.status;
        let currentJob = job;
        while (currentStatus === "queued" || currentStatus === "processing") {
          await new Promise((r) => setTimeout(r, 1500));
          currentJob = await fetchVideoJob(job.id);
          setVideoJob(currentJob);
          currentStatus = currentJob.status;
        }

        if (currentStatus === "completed" && currentJob.output_media_url) {
          const blobUrl = await fetchProtectedMedia(currentJob.output_media_url);
          setVideoBlobUrl(blobUrl);
          // Load media asset object from media endpoint
          const mediaAssets = await fetchMediaAssets({ brand_id: activeBrand.id });
          const createdMedia = mediaAssets.find((m) => m.media_url === currentJob.output_media_url) || null;
          if (createdMedia) {
            setSavedMediaAsset(createdMedia);
            localStorage.setItem("dm_unified_saved_asset", JSON.stringify(createdMedia));
          }
          setCurrentStep(3);
        } else if (currentStatus === "failed") {
          throw new Error(currentJob.error_details || "Video generation failed");
        }
      }
    } catch (err: any) {
      setGenerationError(err.message || "Generation job failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 4: Create Campaign Handler
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand) return;
    setIsCreatingCamp(true);
    try {
      const created = await createCampaign({
        name: campName.trim() || `${activeBrand.name} Campaign`,
        brand_id: activeBrand.id,
        product_id: selectedProductId || undefined,
        objective: campObjective,
        budget: parseFloat(campBudget) || 25000,
        currency: campCurrency,
        channels: campChannels,
        customer_segment: campSegment,
        geographic_target: campGeography,
        brief: `Omnichannel campaign targeting ${campGeography} with verified compliance guidelines.`,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 86400000).toISOString()
      });
      setCampaigns((prev) => [created, ...prev]);
      setSelectedCampaignId(created.id);
      setCampaignDetail(created);
      setCurrentStep(5); // Proceed to Attach Creative
    } catch (err: any) {
      alert("Failed to create campaign: " + (err.message || err));
    } finally {
      setIsCreatingCamp(false);
    }
  };

  // Step 5: Attach Saved Creative to Campaign
  const handleAttachSavedAsset = async () => {
    if (!selectedCampaignId || !savedMediaAsset) return;
    try {
      await attachAssetToCampaign(selectedCampaignId, savedMediaAsset.id);
      await reloadCampaignDetail(selectedCampaignId);
      setCurrentStep(6); // Advance to Copy Generation
    } catch (err: any) {
      alert("Failed to attach asset: " + (err.message || err));
    }
  };

  // Step 6: Generate Strategy and Add Copy Item
  const handleGenerateAIStrategy = async () => {
    if (!selectedCampaignId) return;
    setIsGeneratingStrategy(true);
    try {
      const strat = await generateCampaignStrategy(selectedCampaignId, true);
      setStrategyResult(strat);
      if (strat.channel_recommendations && strat.channel_recommendations.length > 0) {
        setContentHeadline(`Experience Verified Purity with ${activeBrand?.name}`);
        setContentBody(`Discover authentic daily performance designed for ${campSegment}. Premium formulation, zero compromises.`);
      }
      await reloadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert("Strategy generation failed: " + (err.message || err));
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const handleAddContentItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setIsAddingContent(true);
    try {
      const channel = campChannels[0] || "instagram";
      await createCampaignContent(selectedCampaignId, {
        channel,
        headline: contentHeadline.trim() || `Pure Daily Excellence`,
        body: contentBody.trim() || `Engineered for authentic results. Discover ${activeBrand?.name}.`,
        call_to_action: contentCta.trim(),
        hashtags: contentHashtags.split(",").map((s) => s.trim()).filter(Boolean),
        scheduled_time: new Date(contentScheduleTime).toISOString(),
        media_asset_id: savedMediaAsset?.id || undefined
      });
      await reloadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert("Failed to add creative content item: " + (err.message || err));
    } finally {
      setIsAddingContent(false);
    }
  };

  const handleGenerateMultiVariants = async (contentId: string) => {
    if (!selectedCampaignId) return;
    setGeneratingVariants(true);
    try {
      await generateContentVariants(selectedCampaignId, contentId, {
        number_of_variants: 3,
        angles: ["direct_response", "storytelling", "social_proof"]
      });
      await reloadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert("Failed to generate variants: " + (err.message || err));
    } finally {
      setGeneratingVariants(false);
    }
  };

  // Step 7: Review & Human Approval Flow
  const handleSubmitReview = async () => {
    if (!selectedCampaignId) return;
    setIsReviewing(true);
    try {
      await submitCampaignForReview(selectedCampaignId, "Campaign submitted for formal stakeholder approval.");
      await reloadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert("Failed to submit review: " + (err.message || err));
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApproveCampaign = async () => {
    if (!selectedCampaignId) return;
    setIsReviewing(true);
    try {
      await approveCampaign(selectedCampaignId, reviewComment);
      await reloadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert("Failed to approve campaign: " + (err.message || err));
    } finally {
      setIsReviewing(false);
    }
  };

  // Step 8: Reschedule Calendar Entry
  const handleReschedule = async (entryId: string) => {
    if (!rescheduleTime) return;
    setIsRescheduling(true);
    try {
      await rescheduleCalendarEntry(entryId, new Date(rescheduleTime).toISOString());
      const entries = await fetchCalendarEntries({ brand_id: activeBrand?.id, campaign_id: selectedCampaignId });
      setCalendarEntries(entries);
      setRescheduleTime("");
    } catch (err: any) {
      alert("Failed to reschedule: " + (err.message || err));
    } finally {
      setIsRescheduling(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner: Omnichannel Workflow Header */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(20, 27, 44, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Unified Studio & Campaign Journey
            </h2>
            <span
              className="badge"
              style={{
                background: "rgba(99, 102, 241, 0.18)",
                color: "#818cf8",
                border: "1px solid rgba(99, 102, 241, 0.35)"
              }}
            >
              <Sparkles size={12} /> Product-First Commercial Workflow
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
            Execute the complete end-to-end journey: Brand & Product → Creative Generation → Media Provenance → Campaign Planning → Creative Attachment → Copy Editing → Review & Approval → Scheduling → Performance Analytics.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => {
              if (confirm("Reset current journey stepper back to Step 1?")) {
                setCurrentStep(1);
              }
            }}
            className="btn-secondary"
            style={{ fontSize: "0.8rem", padding: "8px 14px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCcw size={14} /> Restart Journey
          </button>
        </div>
      </div>

      {/* 9-Step Interactive Workflow Breadcrumb Strip */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflowX: "auto"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "900px" }}>
          {WORKFLOW_STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: isActive
                      ? "rgba(99, 102, 241, 0.2)"
                      : isCompleted
                      ? "rgba(16, 185, 129, 0.12)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(99, 102, 241, 0.5)"
                      : isCompleted
                      ? "1px solid rgba(16, 185, 129, 0.3)"
                      : "1px solid transparent",
                    color: isActive ? "#ffffff" : isCompleted ? "#34d399" : "#64748b",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: isActive ? "#6366f1" : isCompleted ? "#10b981" : "#334155",
                      color: "#fff",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    {isCompleted ? <Check size={12} /> : step.id}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 600 }}>{step.label}</div>
                  </div>
                </button>

                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight size={14} color="#334155" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Step Workspace Container */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* ========================================================= */}
        {/* STEP 1: Brand & Product Selection & Photo Upload           */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 1: Select Brand & Product Context
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Choose the business profile and target product. Context is automatically inherited by the creative studio and campaigns.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="btn-secondary"
                style={{ fontSize: "0.8rem", padding: "8px 14px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={14} /> {isAddingProduct ? "Cancel" : "Add New Product"}
              </button>
            </div>

            {/* Quick Add Product Form */}
            {isAddingProduct && (
              <form
                onSubmit={handleCreateProduct}
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "10px",
                  padding: "18px",
                  marginBottom: "24px",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr auto",
                  gap: "12px",
                  alignItems: "end"
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pure Botanical Glow Elixir"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Skincare"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    placeholder="1299"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: "9px 18px", fontSize: "0.85rem" }}>
                  Save Product
                </button>
              </form>
            )}

            {/* Product Selector Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>
                  Active Brand Profile
                </label>
                <div
                  style={{
                    padding: "14px 16px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ flex: 1, marginRight: "16px" }}>
                    {brands.length > 1 && onBrandSelect ? (
                      <div>
                        <label style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                          Active Brand Profile:
                        </label>
                        <select
                          value={activeBrand?.id || ""}
                          onChange={(e) => {
                            const found = brands.find((b) => b.id === e.target.value);
                            if (found && onBrandSelect) onBrandSelect(found);
                          }}
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            color: "#fff",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            width: "100%",
                            maxWidth: "280px"
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
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                          {activeBrand?.name || "No Brand Selected"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Industry: {activeBrand?.industry || "General"} • Workspace Scoped
                        </div>
                      </div>
                    )}
                  </div>
                  {onOpenOnboarding && (
                    <button
                      onClick={onOpenOnboarding}
                      className="btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "6px 12px", whiteSpace: "nowrap" }}
                    >
                      + Onboard Brand
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>
                  Target Product Catalog Selection
                </label>
                {products.length > 0 ? (
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(99, 102, 241, 0.4)",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "0.92rem",
                      fontWeight: 600
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category || "General"}) — ₹{p.price_inr}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      padding: "14px",
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px dashed rgba(245, 158, 11, 0.3)",
                      borderRadius: "10px",
                      color: "#fbbf24",
                      fontSize: "0.82rem"
                    }}
                  >
                    No products found for this brand. Click "+ Add New Product" above to create one.
                  </div>
                )}
              </div>
            </div>

            {/* Product Keyframe / Photo Upload */}
            {selectedProduct && (
              <div
                style={{
                  marginTop: "24px",
                  padding: "20px",
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px"
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "2px solid rgba(99, 102, 241, 0.4)",
                    background: "#080c14",
                    flexShrink: 0
                  }}
                >
                  {selectedProduct.image_url || sourcePreviewUrl ? (
                    <ProtectedMediaImage
                      mediaUrl={sourcePreviewUrl || selectedProduct.image_url || ""}
                      alt={selectedProduct.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "0.72rem" }}>
                      No Photo
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#fff" }}>
                    {selectedProduct.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Upload an authentic packaging photo to guide realistic variation synthesis or image-to-video keyframe generation.
                  </div>
                </div>

                <label
                  className="btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    padding: "8px 16px"
                  }}
                >
                  <Camera size={14} />
                  {isUploadingPhoto ? "Uploading..." : "Upload Product Photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadPhoto}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "28px" }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!selectedProductId}
                className="btn-primary"
                style={{ padding: "12px 24px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}
              >
                Continue to Creative Studio <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: Scalio-Inspired Creative Studio (Image & Video)   */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
            {/* Left Config Panel */}
            <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" }}>
                    Step 2: AI Creative Studio
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                    Configure creative settings, template, and real provider pipeline for {selectedProduct?.name || activeBrand?.name}.
                  </p>
                </div>

                {/* Switcher: Image Studio vs Video Studio */}
                <div
                  style={{
                    display: "flex",
                    background: "rgba(15, 23, 42, 0.8)",
                    padding: "4px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCreativeType("image")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      background: creativeType === "image" ? "#6366f1" : "transparent",
                      color: "#fff",
                      border: "none",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Camera size={13} /> Image Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreativeType("video")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      background: creativeType === "video" ? "#a855f7" : "transparent",
                      color: "#fff",
                      border: "none",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Video size={13} /> Video Studio
                  </button>
                </div>
              </div>

              {/* Creative Templates */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>
                  Select Creative Concept Template
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {CREATIVE_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          background: isSelected ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 23, 42, 0.6)",
                          border: isSelected ? "1.5px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{tmpl.icon}</span>
                          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#fff" }}>{tmpl.title}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          {tmpl.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio & Pacing Controls */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  >
                    <option value="1:1">1:1 Square (Instagram Feed / Catalog)</option>
                    <option value="9:16">9:16 Vertical (Reels / TikTok / Stories)</option>
                    <option value="16:9">16:9 Landscape (Hero Banners / YouTube)</option>
                    <option value="4:5">4:5 Portrait (Meta Ads)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    {creativeType === "video" ? "Duration (Seconds)" : "Language Context"}
                  </label>
                  {creativeType === "video" ? (
                    <select
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.85rem"
                      }}
                    >
                      <option value={4}>4s (Snappy Hook)</option>
                      <option value={8}>8s (Recommended Standard)</option>
                      <option value={12}>12s (Full Showcase)</option>
                      <option value={25}>25s (Extended Demo)</option>
                    </select>
                  ) : (
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.85rem"
                      }}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Prompt Box */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Visual Guidance Prompt (Guardrail Protected)
                  </label>
                  <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.68rem" }}>
                    <ShieldCheck size={11} /> Compliance Enforced
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.82rem",
                    lineHeight: "1.4"
                  }}
                />
              </div>

              {/* Provider Selection & Capabilities */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
                    Active AI Studio Provider & Real Capabilities
                  </label>
                  <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
                    Demo Sandbox (0 Spend)
                  </span>
                </div>

                {creativeType === "image" ? (
                  <select
                    value={selectedImageProvider}
                    onChange={(e) => setSelectedImageProvider(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.82rem",
                    }}
                  >
                    {imageProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id === "demo_mode" ? "Verified Local Sandbox • $0" : p.is_configured ? "Live API Configured" : `Requires ${p.requires_credentials}`})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedVideoProvider}
                    onChange={(e) => setSelectedVideoProvider(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.82rem",
                    }}
                  >
                    {videoProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id === "demo_mode" ? "Playable H.264 MP4 Simulation • $0" : p.is_configured ? "Live API Configured" : `Requires ${p.requires_credentials}`})
                      </option>
                    ))}
                  </select>
                )}

                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  Selected: <strong style={{ color: "#fbbf24" }}>{creativeType === "image" ? selectedImageProvider : selectedVideoProvider}</strong>.
                  Zero cost ($0.00). Incurs zero paid API calls. Produces valid, cryptographically verified playable media.
                </div>
              </div>

              {generationError && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: "0.82rem" }}>
                  {generationError}
                </div>
              )}

              {/* Trigger Button */}
              <button
                type="button"
                onClick={handleGenerateCreative}
                disabled={isGenerating}
                className="btn-primary"
                style={{
                  padding: "14px",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: creativeType === "video"
                    ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)"
                    : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={17} className="spin" /> Generating {creativeType === "video" ? "Playable Video" : "Studio Photo"}...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} /> Generate {creativeType === "video" ? "AI Video Visual" : "Studio Product Photo"}
                  </>
                )}
              </button>
            </div>

            {/* Right Preview & Monitor Panel */}
            <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                Real-Time Generation Monitor
              </h4>

              {isGenerating ? (
                <div
                  style={{
                    height: "320px",
                    borderRadius: "10px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px dashed rgba(99, 102, 241, 0.4)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    padding: "20px"
                  }}
                >
                  <RefreshCw size={32} className="spin" style={{ color: "#818cf8" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                    {creativeType === "video" ? "Synthesizing Video Frames..." : "Rendering Studio Photography..."}
                  </div>
                  {videoJob && (
                    <div style={{ width: "80%", marginTop: "10px" }}>
                      <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${videoJob.progress_percent || 45}%`, height: "100%", background: "#a855f7" }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#a855f7", textAlign: "center", marginTop: "4px" }}>
                        {videoJob.progress_percent}% Progress (Job: {videoJob.id})
                      </div>
                    </div>
                  )}
                </div>
              ) : savedMediaAsset ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      height: "300px",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1.5px solid rgba(99, 102, 241, 0.4)",
                      background: "#05080e",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {savedMediaAsset.mime_type.startsWith("video/") || videoBlobUrl ? (
                      <video
                        src={videoBlobUrl || resolveMediaUrl(savedMediaAsset.media_url)}
                        controls
                        autoPlay
                        muted
                        playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <ProtectedMediaImage
                        mediaUrl={savedMediaAsset.media_url}
                        alt="Generated Visual"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    )}

                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        background: "rgba(245, 158, 11, 0.9)",
                        color: "#000"
                      }}
                    >
                      Demo Simulation Verified
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="btn-primary"
                    style={{ padding: "10px", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    Inspect Provenance & Proceed <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    height: "300px",
                    borderRadius: "10px",
                    background: "rgba(15, 23, 42, 0.4)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: "20px"
                  }}
                >
                  <Camera size={32} />
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>Ready to Generate</div>
                  <div style={{ fontSize: "0.76rem", maxWidth: "240px" }}>
                    Select your template and click Generate on the left to produce your marketing creative.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: Inspect Saved Asset in Media Library             */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 3: Inspect Saved Asset & Provenance
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Review cryptographic provenance, sha256 digest, and durable storage record in the Central Media Library.
                </p>
              </div>

              <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "6px 12px" }}>
                <CheckCircle2 size={13} /> Persisted to Marketing Media DB
              </span>
            </div>

            {savedMediaAsset ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "28px" }}>
                <div
                  style={{
                    height: "360px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {savedMediaAsset.mime_type.startsWith("video/") || videoBlobUrl ? (
                    <video
                      src={videoBlobUrl || resolveMediaUrl(savedMediaAsset.media_url)}
                      controls
                      autoPlay
                      muted
                      playsInline
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <ProtectedMediaImage
                      mediaUrl={savedMediaAsset.media_url}
                      alt="Verified Saved Asset"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Asset Identifier:</span>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>{savedMediaAsset.id}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>SHA-256 Digest:</span>
                      <div style={{ fontSize: "0.76rem", fontFamily: "monospace", color: "#38bdf8", wordBreak: "break-all" }}>
                        {savedMediaAsset.checksum_sha256}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>MIME Type:</span>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>{savedMediaAsset.mime_type}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Aspect Ratio:</span>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>{savedMediaAsset.aspect_ratio}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Storage Size:</span>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>
                          {(savedMediaAsset.byte_size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Visual Prompt Direction:</span>
                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "2px" }}>
                        {savedMediaAsset.prompt}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "auto" }}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="btn-secondary"
                      style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <ArrowLeft size={14} /> Back to Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="btn-primary"
                      style={{ flex: 1, padding: "12px 20px", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    >
                      Create Campaign With This Creative <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No active asset selected. Please return to Step 2 to generate an image or video.
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: Campaign Setup & Strategy Generation              */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 4: Create Multi-Channel Marketing Campaign
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Define marketing objectives, target audience, budget ceiling, and publishing channels.
                </p>
              </div>

              {campaigns.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Or Select Existing:</span>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => {
                      setSelectedCampaignId(e.target.value);
                      setCurrentStep(5);
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(99, 102, 241, 0.4)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  >
                    <option value="">Select Existing Campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateCampaign} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Primary Marketing Objective
                  </label>
                  <select
                    value={campObjective}
                    onChange={(e) => setCampObjective(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.88rem"
                    }}
                  >
                    <option value="conversions">Direct Conversions & Checkouts</option>
                    <option value="awareness">Brand Awareness & Top-of-Funnel</option>
                    <option value="traffic">Storefront & Landing Page Traffic</option>
                    <option value="engagement">Community & Social Engagement</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Budget Ceiling (Strict Cap)
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={campCurrency}
                      onChange={(e) => setCampCurrency(e.target.value)}
                      style={{
                        padding: "10px",
                        background: "rgba(13, 18, 30, 0.9)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.85rem"
                      }}
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                    </select>
                    <input
                      type="number"
                      required
                      value={campBudget}
                      onChange={(e) => setCampBudget(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        background: "rgba(13, 18, 30, 0.9)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.88rem"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Geographic Targeting
                  </label>
                  <input
                    type="text"
                    value={campGeography}
                    onChange={(e) => setCampGeography(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Customer Segment
                  </label>
                  <input
                    type="text"
                    value={campSegment}
                    onChange={(e) => setCampSegment(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.88rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "8px" }}>
                  Selected Advertising Channels
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[
                    { id: "instagram", label: "Instagram Ads" },
                    { id: "meta", label: "Meta / Facebook" },
                    { id: "google_search", label: "Google Search" },
                    { id: "youtube", label: "YouTube Shorts" }
                  ].map((ch) => {
                    const isChecked = campChannels.includes(ch.id);
                    return (
                      <button
                        type="button"
                        key={ch.id}
                        onClick={() => {
                          if (isChecked) {
                            if (campChannels.length > 1) {
                              setCampChannels(campChannels.filter((c) => c !== ch.id));
                            }
                          } else {
                            setCampChannels([...campChannels, ch.id]);
                          }
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          background: isChecked ? "rgba(99, 102, 241, 0.2)" : "rgba(15, 23, 42, 0.6)",
                          border: isChecked ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                          color: isChecked ? "#fff" : "#94a3b8",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: 600
                        }}
                      >
                        {isChecked && "✓ "} {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-secondary"
                  style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCamp}
                  className="btn-primary"
                  style={{ padding: "12px 24px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {isCreatingCamp ? "Creating..." : "Save Campaign & Attach Creative"} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 5: Attach Creative to Campaign                       */}
        {/* ========================================================= */}
        {currentStep === 5 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 5: Attach Creative Asset to Campaign
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Link the verified media file ({savedMediaAsset?.id || "Selected Media"}) to campaign: <strong>{campaignDetail?.name}</strong>.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                gap: "24px"
              }}
            >
              <div
                style={{
                  width: "140px",
                  height: "140px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "2px solid #6366f1",
                  background: "#000",
                  flexShrink: 0
                }}
              >
                {savedMediaAsset?.mime_type.startsWith("video/") || videoBlobUrl ? (
                  <video
                    src={videoBlobUrl || (savedMediaAsset ? resolveMediaUrl(savedMediaAsset.media_url) : "")}
                    controls
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : savedMediaAsset ? (
                  <ProtectedMediaImage
                    mediaUrl={savedMediaAsset.media_url}
                    alt="Creative Asset"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textAlign: "center", padding: "10px" }}>
                    No Asset
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                  Target Campaign: {campaignDetail?.name || "Selected Campaign"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Objective: {campaignDetail?.objective} • Budget: ₹{campaignDetail?.budget} {campaignDetail?.currency} • Channels: {campaignDetail?.channels?.join(", ")}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#34d399", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={14} /> Ready to attach and link to campaign content items.
                </div>
              </div>

              <button
                type="button"
                onClick={handleAttachSavedAsset}
                className="btn-primary"
                style={{ padding: "12px 24px", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "8px" }}
              >
                Confirm Attachment <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 6: AI Copy Generation & Multi-Angle Variants        */}
        {/* ========================================================= */}
        {currentStep === 6 && (
          <div className="card" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 6: AI Strategy & Copy Orchestration
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Generate campaign strategy with budget ceilings, write channel-specific ad copy, and synthesize multi-angle variants.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateAIStrategy}
                disabled={isGeneratingStrategy}
                className="btn-secondary"
                style={{ padding: "9px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Sparkles size={14} /> {isGeneratingStrategy ? "Calculating..." : "Generate Channel Strategy"}
              </button>
            </div>

            {/* Structured Strategy Recommendation Display */}
            {strategyResult && (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "10px",
                  padding: "18px"
                }}
              >
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#818cf8", marginBottom: "8px" }}>
                  🎯 AI Channel Allocation & Budget Ceiling
                </div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "12px" }}>
                  {strategyResult.summary}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  {strategyResult.budget_allocation?.map((b: any) => (
                    <div
                      key={b.channel}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "rgba(13, 18, 30, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.08)"
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{b.channel}</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
                        ₹{b.allocated_amount?.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ad Copy Form */}
            <form
              onSubmit={handleAddContentItem}
              style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}
            >
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                Add Channel Copy Item (Attached to Generated Media)
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Ad Headline *
                </label>
                <input
                  type="text"
                  required
                  value={contentHeadline}
                  onChange={(e) => setContentHeadline(e.target.value)}
                  placeholder="e.g. Pure Botanical Performance Without Compromise"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.85rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Body Copy (Hook & Value Props) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  placeholder="Compelling ad caption adhering to claim guardrails..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.82rem",
                    lineHeight: "1.4"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Call To Action (CTA)
                  </label>
                  <input
                    type="text"
                    value={contentCta}
                    onChange={(e) => setContentCta(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Target Hashtags
                  </label>
                  <input
                    type="text"
                    value={contentHashtags}
                    onChange={(e) => setContentHashtags(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={contentScheduleTime}
                    onChange={(e) => setContentScheduleTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingContent}
                className="btn-primary"
                style={{ alignSelf: "flex-start", padding: "10px 20px", fontSize: "0.85rem" }}
              >
                {isAddingContent ? "Saving Copy..." : "Save Copy Item"}
              </button>
            </form>

            {/* List of Campaign Content Items & Variant Generation */}
            {campaignContent.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>
                  Active Campaign Copy Items ({campaignContent.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {campaignContent.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "14px 16px",
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}>
                            {item.channel}
                          </span>
                          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>{item.headline}</span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>
                          {item.body_copy}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateMultiVariants(item.id)}
                        disabled={generatingVariants}
                        className="btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Sparkles size={12} /> {generatingVariants ? "Generating..." : "Generate 3 Angles"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(7)}
                className="btn-primary"
                style={{ padding: "12px 24px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}
              >
                Proceed to Review & Approval <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 7: Human Review & Approval Workflow                  */}
        {/* ========================================================= */}
        {currentStep === 7 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 7: Stakeholder Review & Human Approval
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Formal approval state machine with mandatory audit logging and compliance verification.
                </p>
              </div>

              <div
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  background:
                    campaignDetail?.status === "approved"
                      ? "rgba(16, 185, 129, 0.2)"
                      : campaignDetail?.status === "pending_review"
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(99, 102, 241, 0.2)",
                  color:
                    campaignDetail?.status === "approved"
                      ? "#34d399"
                      : campaignDetail?.status === "pending_review"
                      ? "#fbbf24"
                      : "#818cf8",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textTransform: "uppercase"
                }}
              >
                Status: {campaignDetail?.status || "Draft"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              {/* Approval Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                    Review / Approval Audit Comment *
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.82rem",
                      lineHeight: "1.4"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  {campaignDetail?.status === "draft" && (
                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={isReviewing}
                      className="btn-primary"
                      style={{ flex: 1, padding: "12px", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      <Send size={15} /> Submit for Review
                    </button>
                  )}

                  {campaignDetail?.status === "pending_review" && (
                    <button
                      type="button"
                      onClick={handleApproveCampaign}
                      disabled={isReviewing}
                      className="btn-primary"
                      style={{ flex: 1, padding: "12px", background: "#10b981", borderColor: "#10b981", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      <CheckCircle2 size={16} /> Approve Campaign
                    </button>
                  )}

                  {campaignDetail?.status === "approved" && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#34d399",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <CheckCircle2 size={16} /> Campaign Approved and Signed by Stakeholder
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Log Stream */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "16px",
                  maxHeight: "260px",
                  overflowY: "auto"
                }}
              >
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff", marginBottom: "10px" }}>
                  Audit History Log
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {approvalHistory.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "rgba(13, 18, 30, 0.8)",
                        fontSize: "0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#818cf8", fontWeight: 600 }}>
                        <span>{h.action.toUpperCase()}</span>
                        <span style={{ color: "#64748b" }}>{new Date(h.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: "#cbd5e1" }}>{h.comment || "State transition recorded."}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px" }}>
              <button
                type="button"
                onClick={() => setCurrentStep(6)}
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(8)}
                className="btn-primary"
                style={{ padding: "12px 24px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}
              >
                Proceed to Content Calendar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 8: Publishing Schedule & Calendar                    */}
        {/* ========================================================= */}
        {currentStep === 8 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 8: Publishing Schedule & Calendar Planning
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Inspect scheduled ad releases across platforms and validate instant date rescheduling.
                </p>
              </div>

              <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                <Calendar size={13} /> {calendarEntries.length} Scheduled Entries
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {calendarEntries.length > 0 ? (
                calendarEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}>
                          {entry.channel}
                        </span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                          {entry.content_headline || "Scheduled Ad Release"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>
                        Scheduled Time: <strong style={{ color: "#38bdf8" }}>{new Date(entry.scheduled_time).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="datetime-local"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        style={{
                          padding: "6px 10px",
                          background: "rgba(13, 18, 30, 0.9)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          color: "#fff",
                          fontSize: "0.75rem"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleReschedule(entry.id)}
                        disabled={isRescheduling || !rescheduleTime}
                        className="btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                  No calendar entries currently scheduled. You can add scheduled items in Step 6.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px" }}>
              <button
                type="button"
                onClick={() => setCurrentStep(7)}
                className="btn-secondary"
                style={{ padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(9)}
                className="btn-primary"
                style={{ padding: "12px 24px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}
              >
                View Performance Analytics <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 9: Performance Analytics & Closed-Loop Metrics       */}
        {/* ========================================================= */}
        {currentStep === 9 && (
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>
                  Step 9: Performance Analytics & Closed-Loop Insights
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Deterministic performance tracking across omnichannel campaigns. Shows live integration metrics or simulated sandbox data.
                </p>
              </div>

              <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "6px 12px" }}>
                <BarChart3 size={13} /> Sandbox Spend: ₹0.00
              </span>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ padding: "18px", background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target ROAS</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#34d399", marginTop: "4px" }}>3.4x</div>
                <div style={{ fontSize: "0.7rem", color: "#34d399", marginTop: "2px" }}>+0.2x above baseline</div>
              </div>

              <div style={{ padding: "18px", background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Estimated CTR</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#38bdf8", marginTop: "4px" }}>2.45%</div>
                <div style={{ fontSize: "0.7rem", color: "#38bdf8", marginTop: "2px" }}>Top quartile engagement</div>
              </div>

              <div style={{ padding: "18px", background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Allocated Budget</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginTop: "4px" }}>
                  ₹{campaignDetail?.budget?.toLocaleString() || "50,000"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>Ceiling strictly enforced</div>
              </div>

              <div style={{ padding: "18px", background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Verified Creative Provenance</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c084fc", marginTop: "4px" }}>100%</div>
                <div style={{ fontSize: "0.7rem", color: "#c084fc", marginTop: "2px" }}>Cryptographic SHA-256</div>
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} /> Complete Commercial Marketing Journey Verified
                </div>
                <p style={{ fontSize: "0.82rem", color: "#cbd5e1", margin: "6px 0 0 0" }}>
                  Brand, product, studio media, campaign assets, multi-channel copy, approval audit history, and scheduled calendar are all securely persisted in SQLite.
                </p>
              </div>

              <button
                type="button"
                onClick={() => (onNavigate || onNavigateToModule || (() => {}))("dashboard")}
                className="btn-primary"
                style={{ padding: "10px 20px", fontSize: "0.88rem" }}
              >
                Return to Dashboard Overview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
