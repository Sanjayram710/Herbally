import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Download,
  Info,
  Layers,
  Globe,
  Film,
  X,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  Rocket,
  Image as ImageIcon,
} from "lucide-react";
import type {
  BrandProfile,
  ProductItem,
  MediaAssetItem,
  VideoProviderInfo,
  VideoJobItem,
  CampaignItem,
} from "../types";
import {
  fetchVideoProviders,
  createVideoJob,
  fetchVideoJobs,
  fetchVideoJob,
  cancelVideoJob,
  retryVideoJob,
  fetchProtectedMedia,
  uploadProductImage,
  fetchCampaignsList,
  attachAssetToCampaign,
  fetchMediaAssets,
} from "../services/api";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

interface VideoStudioViewProps {
  activeBrand: BrandProfile | null;
  products: ProductItem[];
  preselectedAsset?: MediaAssetItem | null;
  onNavigateToLibrary?: () => void;
  onNavigateToCampaign?: (campaignId?: string, mediaAssetId?: string) => void;
}

interface CreativeTemplate {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  prompt: string;
  defaultScript: string;
  conceptNote: string;
}

const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  {
    id: "product_hero",
    title: "Product Hero Showcase",
    tagline: "3D turntable rotation with studio lighting and packaging focus",
    icon: "💎",
    prompt:
      "Cinematic 3D rotating hero shot of {PRODUCT_NAME}. Smooth motorized turntable glide, high-end commercial rim lighting highlighting premium product textures, soft atmospheric backdrop, 8k commercial quality.",
    defaultScript:
      "Engineered with precision and premium materials. Elevate your everyday standards with verified quality.",
    conceptNote: "Visual concept template — camera orbits smoothly around hero product.",
  },
  {
    id: "promotional_ad",
    title: "Promotional Ad Burst",
    tagline: "High-energy commercial advertisement with vibrant transitions",
    icon: "⚡",
    prompt:
      "Dynamic high-energy commercial advertisement for {PRODUCT_NAME}. Fast-paced fluid camera push-in, kinetic color transitions, vibrant modern commercial lighting, clean energetic studio atmosphere.",
    defaultScript:
      "Unlock modern performance and confidence today. Thoughtfully crafted for your lifestyle.",
    conceptNote: "Visual concept template — kinetic pacing suited for high-impact social promotions.",
  },
  {
    id: "ugc_concept",
    title: "UGC-Style Social Concept",
    tagline: "Authentic creator smartphone handheld aesthetic",
    icon: "📱",
    prompt:
      "Authentic handheld social media creator perspective showcasing {PRODUCT_NAME} on a sunlit wooden desk. Natural daylight, gentle smartphone camera movement, authentic lifestyle environment.",
    defaultScript:
      "I've been using this every single day and my routine feels completely upgraded. Look at that texture!",
    conceptNote: "Visual concept template — mimics organic user-generated content framing.",
  },
  {
    id: "before_after",
    title: "Before / After Transition",
    tagline: "Split-second visual revitalizing transformation",
    icon: "✨",
    prompt:
      "Visual split transition sequence featuring {PRODUCT_NAME}. First half shows conventional baseline performance, smoothly wiping into a radiant, high-performance visual finish.",
    defaultScript:
      "From ordinary to visibly upgraded in seconds. See the breakthrough difference.",
    conceptNote: "Visual concept template — represents transformative aesthetic without prohibited medical claims.",
  },
  {
    id: "recipe_demo",
    title: "Feature / Usage Walkthrough",
    tagline: "Step-by-step showcase highlighting product features and ergonomics",
    icon: "✨",
    prompt:
      "Step-by-step showcase demonstrating {PRODUCT_NAME}. Hands showcasing effortless functionality and ergonomic finish in a modern studio environment.",
    defaultScript:
      "Simple, effortless, and intuitive. Feel the quality difference immediately.",
    conceptNote: "Visual concept template — demonstrates usage ritual and texture aesthetics.",
  },
  {
    id: "asmr_sensory",
    title: "ASMR Sensory Macro",
    tagline: "Ultra slow-motion droplets, smooth pump glide, and natural mist",
    icon: "💧",
    prompt:
      "Hypnotic ultra-slow-motion macro capture of {PRODUCT_NAME}. Subtle reflections gliding softly across premium contours, tactile precision, satisfying sensory visual detail against sleek aesthetic backdrop.",
    defaultScript:
      "Engineered with purpose down to every detail. Pure craftsmanship in action.",
    conceptNote: "Visual concept template — sensory macro focus designed for immersive engagement.",
  },
  {
    id: "grwm_routine",
    title: "GRWM Morning Routine",
    tagline: "Modern vanity aesthetic blending personal care with morning light",
    icon: "☀️",
    prompt:
      "Get Ready With Me morning vanity aesthetic featuring {PRODUCT_NAME}. Warm golden hour sunlight streaming across marble bathroom vanity, reaching for the elegant bottle, soft ambient morning atmosphere.",
    defaultScript:
      "My morning routine isn't complete without this step. Start every day glowing from within.",
    conceptNote: "Visual concept template — lifestyle morning routine framing popular in creator reels.",
  },
];

const SUPPORTED_LANGUAGES = [
  { name: "English", label: "English" },
  { name: "Hindi", label: "Hindi (हिंदी)" },
  { name: "Bengali", label: "Bengali (বাংলা)" },
  { name: "Telugu", label: "Telugu (తెలుగు)" },
  { name: "Marathi", label: "Marathi (मराठी)" },
  { name: "Tamil", label: "Tamil (தமிழ்)" },
  { name: "Urdu", label: "Urdu (اردو)" },
  { name: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { name: "Kannada", label: "Kannada (ಕನ್ನಡ)" },
  { name: "Odia", label: "Odia (ଓଡ଼ିଆ)" },
  { name: "Punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
];

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({
  activeBrand,
  products,
  preselectedAsset,
  onNavigateToLibrary,
  onNavigateToCampaign,
}) => {
  // 1. Providers State
  const [providers, setProviders] = useState<VideoProviderInfo[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("demo_mode");

  // 2. Form Configuration State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("product_hero");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [aspectRatio, setAspectRatio] = useState<string>("9:16");
  const [durationSeconds, setDurationSeconds] = useState<number>(8);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [customScript, setCustomScript] = useState<string>("");

  // Source Keyframe
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(preselectedAsset?.id || null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(
    preselectedAsset?.media_url || null
  );
  const [isUploadingSource, setIsUploadingSource] = useState<boolean>(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [libraryMediaAssets, setLibraryMediaAssets] = useState<MediaAssetItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Review & Generation Flow
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Job & History
  const [activeJob, setActiveJob] = useState<VideoJobItem | null>(null);
  const [jobHistory, setJobHistory] = useState<VideoJobItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [activeVideoBlobUrl, setActiveVideoBlobUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);

  // Campaign reuse state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignsList, setCampaignsList] = useState<CampaignItem[]>([]);
  const [selectedCampaignToAttach, setSelectedCampaignToAttach] = useState<string>("");
  const [isAttachingCampaign, setIsAttachingCampaign] = useState(false);
  const [campaignAttachSuccess, setCampaignAttachSuccess] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  // Load providers on mount
  useEffect(() => {
    fetchVideoProviders()
      .then((data) => {
        setProviders(data);
        if (data.length > 0) {
          // Default to demo_mode for zero-cost safety
          const demo = data.find((p) => p.id === "demo_mode");
          setSelectedProviderId(demo ? demo.id : data[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not load video providers:", err);
      });
  }, []);

  // Update prompt & script when template or product changes
  useEffect(() => {
    const tmpl = CREATIVE_TEMPLATES.find((t) => t.id === selectedTemplateId) || CREATIVE_TEMPLATES[0];
    const prod = products.find((p) => p.id === selectedProductId);
    const prodName = prod ? prod.name : activeBrand?.name || "Featured Product";

    setCustomPrompt(tmpl.prompt.replace(/{PRODUCT_NAME}/g, prodName));
    setCustomScript(tmpl.defaultScript);
  }, [selectedTemplateId, selectedProductId, activeBrand]);

  // Load Job History
  const reloadHistory = () => {
    setIsLoadingHistory(true);
    fetchVideoJobs({ brand_id: activeBrand?.id })
      .then((jobs) => {
        setJobHistory(jobs);
        // If there's an ongoing job in history, make it active
        const running = jobs.find((j) => j.status === "queued" || j.status === "processing");
        if (running && !activeJob) {
          setActiveJob(running);
        }
      })
      .catch((err) => console.warn("Failed to load video job history:", err))
      .finally(() => setIsLoadingHistory(false));
  };

  useEffect(() => {
    reloadHistory();
  }, [activeBrand]);

  // Polling logic for activeJob
  useEffect(() => {
    if (!activeJob || (activeJob.status !== "queued" && activeJob.status !== "processing")) {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const updated = await fetchVideoJob(activeJob.id);
        setActiveJob(updated);
        if (updated.status === "completed" || updated.status === "failed" || updated.status === "cancelled") {
          reloadHistory();
        }
      } catch (err) {
        console.warn("Polling error for job:", activeJob.id, err);
      }
    };

    pollIntervalRef.current = window.setInterval(poll, 2000);
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeJob?.id, activeJob?.status]);

  // Load protected video blob when activeJob is completed
  useEffect(() => {
    if (activeJob?.status === "completed" && activeJob.output_media_url) {
      setIsVideoLoading(true);
      fetchProtectedMedia(activeJob.output_media_url)
        .then((blobUrl) => {
          setActiveVideoBlobUrl(blobUrl);
        })
        .catch((err) => {
          console.warn("Failed to fetch protected video blob:", err);
          setActiveVideoBlobUrl(null);
        })
        .finally(() => setIsVideoLoading(false));
    } else {
      setActiveVideoBlobUrl(null);
    }
  }, [activeJob?.id, activeJob?.status, activeJob?.output_media_url]);

  // Handle Keyframe Upload
  const handleKeyframeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSource(true);
    setErrorMessage(null);
    try {
      const prodId = selectedProductId || (products[0] ? products[0].id : "");
      if (!prodId) {
        throw new Error("Please select or create a product first before uploading a keyframe image.");
      }
      const updatedProduct = await uploadProductImage(prodId, file);
      if (updatedProduct.image_url) {
        const mediaId = updatedProduct.image_url.split("/").pop();
        setSourceAssetId(mediaId || null);
        setSourcePreviewUrl(updatedProduct.image_url);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload keyframe image");
    } finally {
      setIsUploadingSource(false);
    }
  };

  const handleOpenMediaPicker = async () => {
    setIsMediaPickerOpen(true);
    setIsLoadingLibrary(true);
    try {
      const assets = await fetchMediaAssets({ brand_id: activeBrand?.id });
      setLibraryMediaAssets(assets);
    } catch (err) {
      console.warn("Failed to load media assets for picker:", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleSelectMediaForSource = (asset: MediaAssetItem) => {
    setSourceAssetId(asset.id);
    setSourcePreviewUrl(asset.media_url);
    setIsMediaPickerOpen(false);
  };

  const handleOpenCampaignModal = async () => {
    if (!activeBrand) return;
    setIsCampaignModalOpen(true);
    setCampaignAttachSuccess(null);
    try {
      const list = await fetchCampaignsList({ brand_id: activeBrand.id });
      setCampaignsList(list);
      if (list.length > 0 && !selectedCampaignToAttach) {
        setSelectedCampaignToAttach(list[0].id);
      }
    } catch (err) {
      console.warn("Failed to load campaigns list:", err);
    }
  };

  const handleConfirmAttachToCampaign = async () => {
    if (!activeJob || !selectedCampaignToAttach) return;
    setIsAttachingCampaign(true);
    try {
      const mediaId = activeJob.output_media_url ? activeJob.output_media_url.split("/").pop() : undefined;
      if (!mediaId) throw new Error("No output media asset found for completed job");
      await attachAssetToCampaign(selectedCampaignToAttach, mediaId);
      setCampaignAttachSuccess("Successfully attached completed video creative to campaign!");
      setTimeout(() => {
        setIsCampaignModalOpen(false);
        if (onNavigateToCampaign) {
          onNavigateToCampaign(selectedCampaignToAttach, mediaId);
        }
      }, 1200);
    } catch (err: any) {
      alert("Failed to attach to campaign: " + (err.message || err));
    } finally {
      setIsAttachingCampaign(false);
    }
  };

  // Submission handler
  const handleStartGeneration = async () => {
    if (!activeBrand) {
      setErrorMessage("Please select a brand first.");
      return;
    }
    if (!confirmed) {
      setErrorMessage("Please confirm video generation authorization.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const job = await createVideoJob({
        brand_id: activeBrand.id,
        product_id: selectedProductId || undefined,
        source_asset_id: sourceAssetId || undefined,
        prompt: customPrompt,
        script: customScript || undefined,
        template_id: selectedTemplateId,
        language: selectedLanguage,
        aspect_ratio: aspectRatio,
        duration_seconds: durationSeconds,
        provider: selectedProviderId,
        confirmed: true,
        allow_demo_fallback: true,
      });

      setActiveJob(job);
      setIsReviewOpen(false);
      setConfirmed(false);
      reloadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || "Video generation failed to start.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Handler
  const handleCancelActiveJob = async () => {
    if (!activeJob) return;
    try {
      const cancelled = await cancelVideoJob(activeJob.id);
      setActiveJob(cancelled);
      reloadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel job");
    }
  };

  // Retry Handler
  const handleRetryJob = async (jobId: string) => {
    try {
      const retried = await retryVideoJob(jobId);
      setActiveJob(retried);
      reloadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retry job");
    }
  };

  // Download Handler
  const handleDownloadVideo = () => {
    if (!activeVideoBlobUrl || !activeJob) return;
    const a = document.createElement("a");
    a.href = activeVideoBlobUrl;
    a.download = `${activeBrand?.name || "brand"}-video-${activeJob.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];
  const selectedTemplate =
    CREATIVE_TEMPLATES.find((t) => t.id === selectedTemplateId) || CREATIVE_TEMPLATES[0];

  // Provider duration compatibility check
  const isDurationSupportedByProvider =
    selectedProvider?.supported_durations.includes(durationSeconds) ?? true;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: "14px",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                borderRadius: "8px",
                padding: "6px",
                display: "inline-flex",
                color: "#fff",
              }}
            >
              <Video size={20} />
            </span>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 700, margin: 0, color: "#fff" }}>
              AI Video Generation & Animation Studio
            </h1>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(168, 85, 247, 0.2)",
                color: "#c084fc",
                border: "1px solid rgba(168, 85, 247, 0.4)",
              }}
            >
              Scalio-Inspired Universal Engine
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "#94a3b8", maxWidth: "680px" }}>
            Generate short-form social reels, kinetic product commercials, and concept stories with
            multilingual narrative direction, keyframe references, and AYUSH/FDA claim guardrails.
          </p>
        </div>

        {/* Demo Mode / Active Provider Status Badge */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "10px 16px",
            textAlign: "right",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: selectedProvider?.is_configured ? "#10b981" : "#f59e0b",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>
              {selectedProvider?.name || "Demo Simulation"}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
            {selectedProvider?.official_pricing_note || "Zero cost ($0.00)"}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            padding: "12px 18px",
            color: "#f87171",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Left Column: Configuration Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* 1. Target Product Selector */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Layers size={17} color="#818cf8" />
              <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#fff" }}>
                1. Target Brand & Product
              </h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Active Brand
                </label>
                <div
                  style={{
                    padding: "9px 12px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {activeBrand?.name || "No Brand Selected"}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Featured Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="">General Brand Showcase (No specific product)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || "General"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Keyframe Image Reference */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Film size={17} color="#a855f7" />
                <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#fff" }}>
                  2. Keyframe Reference Image (Image-to-Video)
                </h3>
              </div>
              {onNavigateToLibrary && (
                <button
                  onClick={onNavigateToLibrary}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#818cf8",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Browse Media Library
                </button>
              )}
            </div>

            <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 0, marginBottom: "12px" }}>
              Provide a start frame to guide packaging geometry and realistic product animation.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {sourcePreviewUrl ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={sourcePreviewUrl}
                    alt="Keyframe Preview"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      border: "2px solid #818cf8",
                    }}
                  />
                  <button
                    onClick={() => {
                      setSourceAssetId(null);
                      setSourcePreviewUrl(null);
                    }}
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    title="Remove keyframe"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <label
                    style={{
                      border: "2px dashed rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      color: "#94a3b8",
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleKeyframeUpload}
                      style={{ display: "none" }}
                      disabled={isUploadingSource}
                    />
                    <Sparkles size={16} color="#818cf8" />
                    <span>{isUploadingSource ? "Uploading..." : "Upload keyframe PNG/JPEG"}</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleOpenMediaPicker}
                    className="btn-secondary"
                    style={{
                      padding: "14px 20px",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <ImageIcon size={16} color="#38bdf8" />
                    <span>Pick from Library</span>
                  </button>
                </div>
              )}
              <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                {sourceAssetId
                  ? `Active keyframe attached (${sourceAssetId}). Real providers (Luma Ray-2 / Runway Gen-3) use this as opening anchor.`
                  : "Optional. When omitted, video renders from pure text prompt guidance."}
              </div>
            </div>
          </div>

          {/* 3. Creative Concept Template Gallery */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={17} color="#fbbf24" />
                <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#fff" }}>
                  3. Creative Concept Template Gallery
                </h3>
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                💡 Concept templates
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "10px",
              }}
            >
              {CREATIVE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    style={{
                      background: isSelected ? "rgba(99, 102, 241, 0.15)" : "rgba(15, 23, 42, 0.6)",
                      border: isSelected
                        ? "2px solid #818cf8"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "1.1rem" }}>{tmpl.icon}</span>
                      <strong style={{ fontSize: "0.85rem", color: isSelected ? "#fff" : "#e2e8f0" }}>
                        {tmpl.title}
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.35 }}>
                      {tmpl.tagline}
                    </p>
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "0.68rem",
                        color: isSelected ? "#a5b4fc" : "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      {tmpl.conceptNote}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Language, Aspect Ratio & Duration Selectors */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Sliders size={17} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#fff" }}>
                4. Video Settings & Language
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              {/* Language Selector */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                  <Globe size={13} /> Video Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.name} value={lang.name}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
                  Directs on-screen script & caption language
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                  Aspect Ratio
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { ratio: "9:16", label: "9:16 (Reel)" },
                    { ratio: "16:9", label: "16:9 (Landscape)" },
                  ].map((r) => (
                    <button
                      key={r.ratio}
                      type="button"
                      onClick={() => setAspectRatio(r.ratio)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: "6px",
                        background: aspectRatio === r.ratio ? "#6366f1" : "rgba(15, 23, 42, 0.8)",
                        border: "1px solid",
                        borderColor: aspectRatio === r.ratio ? "#818cf8" : "rgba(255, 255, 255, 0.1)",
                        color: "#fff",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                  <Clock size={13} /> Requested Duration
                </label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[4, 8, 12, 25].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationSeconds(d)}
                      style={{
                        flex: 1,
                        padding: "8px 2px",
                        borderRadius: "6px",
                        background: durationSeconds === d ? "#8b5cf6" : "rgba(15, 23, 42, 0.8)",
                        border: "1px solid",
                        borderColor: durationSeconds === d ? "#a78bfa" : "rgba(255, 255, 255, 0.1)",
                        color: "#fff",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Provider Duration Capability Notice */}
            {!isDurationSupportedByProvider && selectedProvider?.id !== "demo_mode" && (
              <div
                style={{
                  marginTop: "12px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.75rem",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Info size={14} />
                <span>
                  <strong>Provider Limitation:</strong> {selectedProvider.name} generates {selectedProvider.supported_durations.join("s or ")}s videos natively. Requested {durationSeconds}s will require demo fallback or provider adjustment.
                </span>
              </div>
            )}
          </div>

          {/* 5. Prompt & Script Editors */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sparkles size={17} color="#ec4899" />
              <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#fff" }}>
                5. Visual Prompt & Narrative Script
              </h3>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                Visual Scene Direction Prompt
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>
                Voiceover / On-Screen Narrative Script ({selectedLanguage})
              </label>
              <textarea
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Claim Guardrails Banner */}
            <div
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.74rem",
                color: "#6ee7b7",
              }}
            >
              <ShieldCheck size={14} />
              <span>
                <strong>AYUSH / FDA Guardrails Active:</strong> Medical treatment or permanent disease cure claims are strictly blocked on both prompt and script.
              </span>
            </div>
          </div>

          {/* 6. Provider Selection & Cost Transparency */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Info size={17} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#fff" }}>
                6. Video Engine Provider
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {providers.map((p) => {
                const isSelected = selectedProviderId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProviderId(p.id)}
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.6)",
                      border: isSelected
                        ? "2px solid #38bdf8"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "0.85rem", color: isSelected ? "#fff" : "#cbd5e1" }}>
                          {p.name}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: p.is_configured ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                            color: p.is_configured ? "#34d399" : "#fbbf24",
                          }}
                        >
                          {p.is_configured ? "Ready" : "Simulation Fallback"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                        {p.official_pricing_note}
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button to Open Review Screen */}
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            style={{
              padding: "14px 20px",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Eye size={18} />
            Review & Configure Generation Spec
          </button>
        </div>

        {/* Right Column: Generation Monitor, Video Player, and History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Active Job Player / Progress Monitor */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Film size={18} color="#818cf8" />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#fff" }}>
                  Active Generation Studio
                </h3>
              </div>
              {activeJob && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background:
                      activeJob.status === "completed"
                        ? "rgba(16, 185, 129, 0.2)"
                        : activeJob.status === "processing"
                        ? "rgba(99, 102, 241, 0.2)"
                        : activeJob.status === "failed"
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(148, 163, 184, 0.2)",
                    color:
                      activeJob.status === "completed"
                        ? "#34d399"
                        : activeJob.status === "processing"
                        ? "#818cf8"
                        : activeJob.status === "failed"
                        ? "#f87171"
                        : "#cbd5e1",
                  }}
                >
                  {activeJob.status}
                </span>
              )}
            </div>

            {/* Video Player or Progress Card */}
            {activeJob ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {activeJob.status === "processing" || activeJob.status === "queued" ? (
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      padding: "28px 20px",
                      textAlign: "center",
                    }}
                  >
                    <RefreshCw
                      size={28}
                      color="#818cf8"
                      style={{ animation: "spin 2s linear infinite", margin: "0 auto 12px" }}
                    />
                    <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#fff", marginBottom: "4px" }}>
                      Rendering Video with {activeJob.provider_model}...
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: "14px" }}>
                      Job ID: {activeJob.id}
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${activeJob.progress_percent || 45}%`,
                          background: "linear-gradient(90deg, #6366f1, #a855f7)",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: 600 }}>
                      {activeJob.progress_percent ? `${activeJob.progress_percent}% Progress` : "Rendering frames..."}
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelActiveJob}
                      style={{
                        marginTop: "16px",
                        padding: "6px 14px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "6px",
                        color: "#f87171",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel Job
                    </button>
                  </div>
                ) : activeJob.status === "completed" ? (
                  <div>
                    {activeJob.is_demo && (
                      <div
                        style={{
                          background: "rgba(245, 158, 11, 0.12)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "0.75rem",
                          color: "#fbbf24",
                          marginBottom: "12px",
                        }}
                      >
                        🧪 <strong>Demonstration Simulation:</strong> Valid MP4 simulation container created without external paid API calls.
                      </div>
                    )}

                    {isVideoLoading ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                        Loading secure video stream...
                      </div>
                    ) : activeVideoBlobUrl ? (
                      <div
                        style={{
                          borderRadius: "10px",
                          overflow: "hidden",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          background: "#000",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <video
                          src={activeVideoBlobUrl}
                          controls
                          autoPlay
                          muted
                          playsInline
                          style={{
                            maxWidth: "100%",
                            maxHeight: "360px",
                            display: "block",
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                        Private video stream ready at <code>{activeJob.output_media_url}</code>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={handleOpenCampaignModal}
                        className="btn-primary"
                        style={{
                          width: "100%",
                          padding: "10px",
                          fontSize: "0.88rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          borderColor: "#10b981",
                        }}
                      >
                        <Rocket size={16} /> Use in Campaign
                      </button>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={handleDownloadVideo}
                          style={{
                            flex: 1,
                            padding: "9px 14px",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <Download size={15} /> Download MP4
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetryJob(activeJob.id)}
                          style={{
                            padding: "9px 14px",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <RotateCcw size={15} /> Re-render
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "20px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: "8px",
                      color: "#f87171",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div><strong>Generation Failed:</strong> {activeJob.error_details || "Unknown error"}</div>
                    <button
                      type="button"
                      onClick={() => handleRetryJob(activeJob.id)}
                      style={{
                        marginTop: "12px",
                        padding: "6px 12px",
                        background: "#ef4444",
                        border: "none",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                      }}
                    >
                      Retry Job
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  border: "2px dashed rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                <Play size={28} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No video actively rendering</div>
                <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                  Configure your creative concept and click Review & Generate.
                </div>
              </div>
            )}
          </div>

          {/* Historical Video Jobs Table */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                Generation History ({jobHistory.length})
              </h3>
              <button
                onClick={reloadHistory}
                disabled={isLoadingHistory}
                style={{
                  background: "none",
                  border: "none",
                  color: "#818cf8",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <RefreshCw size={12} className={isLoadingHistory ? "spin" : ""} /> Refresh
              </button>
            </div>

            {jobHistory.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "#64748b", textAlign: "center", padding: "16px" }}>
                No video jobs in this workspace yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                {jobHistory.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => setActiveJob(j)}
                    style={{
                      padding: "10px 12px",
                      background: activeJob?.id === j.id ? "rgba(99, 102, 241, 0.15)" : "rgba(15, 23, 42, 0.5)",
                      border: "1px solid",
                      borderColor: activeJob?.id === j.id ? "#818cf8" : "rgba(255, 255, 255, 0.06)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fff" }}>
                        {j.template_id} • {j.duration_seconds}s ({j.aspect_ratio})
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {j.language} • {j.provider}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background:
                          j.status === "completed"
                            ? "rgba(16, 185, 129, 0.2)"
                            : j.status === "processing"
                            ? "rgba(99, 102, 241, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                        color:
                          j.status === "completed"
                            ? "#34d399"
                            : j.status === "processing"
                            ? "#818cf8"
                            : "#f87171",
                      }}
                    >
                      {j.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Screen Modal Before Generation */}
      {isReviewOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "14px",
              padding: "28px",
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={20} color="#818cf8" />
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                  Review Generation Specification
                </h2>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Brand</div>
                  <strong style={{ fontSize: "0.85rem", color: "#fff" }}>{activeBrand?.name}</strong>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Concept Template</div>
                  <strong style={{ fontSize: "0.85rem", color: "#fff" }}>{selectedTemplate.title}</strong>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Language & Ratio</div>
                  <strong style={{ fontSize: "0.85rem", color: "#fff" }}>{selectedLanguage} • {aspectRatio}</strong>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Duration & Engine</div>
                  <strong style={{ fontSize: "0.85rem", color: "#fff" }}>{durationSeconds}s • {selectedProvider.name}</strong>
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "2px" }}>Visual Prompt</div>
                <div style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{customPrompt}</div>
              </div>

              {customScript && (
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "10px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "2px" }}>Script / On-Screen Narrative</div>
                  <div style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{customScript}</div>
                </div>
              )}

              {/* Pricing & Policy Disclosure */}
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.78rem",
                  color: "#6ee7b7",
                }}
              >
                <strong>Cost & Development Policy:</strong> {selectedProvider.official_pricing_note}. No paid API charges will be incurred without explicit approval.
              </div>

              {/* Confirmation Checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "0.82rem",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  marginTop: "6px",
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>I confirm and authorize dispatching this video generation task.</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                style={{
                  padding: "10px 16px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleStartGeneration}
                disabled={!confirmed || isSubmitting}
                style={{
                  padding: "10px 20px",
                  background: confirmed && !isSubmitting ? "#6366f1" : "rgba(99, 102, 241, 0.4)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: confirmed && !isSubmitting ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm & Dispatch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEDIA PICKER MODAL (For selecting keyframe source from Library) */}
      {isMediaPickerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                Select Keyframe Image from Media Library
              </div>
              <button
                onClick={() => setIsMediaPickerOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingLibrary ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                Loading media assets...
              </div>
            ) : libraryMediaAssets.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px" }}>
                {libraryMediaAssets
                  .filter((a) => !a.mime_type.startsWith("video/"))
                  .map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectMediaForSource(asset)}
                      style={{
                        height: "120px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: "pointer",
                        position: "relative",
                        background: "#080c14",
                      }}
                    >
                      <ProtectedMediaImage
                        mediaUrl={asset.media_url}
                        alt={asset.prompt}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          insetInline: 0,
                          padding: "3px 6px",
                          background: "rgba(0, 0, 0, 0.75)",
                          fontSize: "0.65rem",
                          color: "#cbd5e1",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {asset.aspect_ratio} • {(asset.byte_size / 1024).toFixed(0)}KB
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No image assets found in Media Library for {activeBrand?.name}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMPAIGN ATTACHMENT MODAL */}
      {isCampaignModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Rocket size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                  Attach Completed Video to Campaign
                </h3>
              </div>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Associate this generated MP4 video with a marketing campaign in your workspace.
            </p>

            {campaignAttachSuccess ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34d399",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Check size={18} /> {campaignAttachSuccess}
              </div>
            ) : campaignsList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Select Target Campaign ({activeBrand?.name})
                </label>
                <select
                  value={selectedCampaignToAttach}
                  onChange={(e) => setSelectedCampaignToAttach(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    color: "#fff",
                    fontSize: "0.88rem",
                  }}
                >
                  {campaignsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status}) — ₹{c.budget}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleConfirmAttachToCampaign}
                  disabled={isAttachingCampaign || !selectedCampaignToAttach}
                  className="btn-primary"
                  style={{
                    padding: "12px",
                    fontSize: "0.92rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "#10b981",
                    borderColor: "#10b981",
                  }}
                >
                  {isAttachingCampaign ? "Attaching..." : "Confirm & Attach to Campaign"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "14px", background: "rgba(245, 158, 11, 0.1)", color: "#fbbf24", borderRadius: "8px", fontSize: "0.82rem" }}>
                  No active campaigns found for {activeBrand?.name}. Create a campaign first in Campaign Manager or Unified Journey.
                </div>
                {onNavigateToCampaign && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCampaignModalOpen(false);
                      onNavigateToCampaign(undefined, activeJob?.output_media_url ? activeJob.output_media_url.split("/").pop() : undefined);
                    }}
                    className="btn-primary"
                    style={{ padding: "10px" }}
                  >
                    Create New Campaign
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
