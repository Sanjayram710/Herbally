import React, { useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Upload,
  Download,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Rocket,
  X,
  Check,
} from "lucide-react";
import type { BrandProfile, ProductItem, MediaAssetItem, ProviderInfo, StudioGenerateResponse, CampaignItem } from "../types";
import {
  fetchImageProviders,
  generateStudioAsset,
  uploadProductImage,
  resolveMediaUrl,
  createProduct,
  fetchCampaignsList,
  attachAssetToCampaign,
  fetchMediaAssets,
} from "../services/api";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

interface ProductStudioViewProps {
  activeBrand: BrandProfile | null;
  products: ProductItem[];
  preselectedAsset?: MediaAssetItem | null;
  onProductCreated?: (product: ProductItem) => void;
  onNavigateToLibrary?: () => void;
  onNavigateToCampaign?: (campaignId?: string, mediaAssetId?: string) => void;
}

export const ProductStudioView: React.FC<ProductStudioViewProps> = ({
  activeBrand,
  products,
  preselectedAsset,
  onProductCreated,
  onNavigateToLibrary,
  onNavigateToCampaign,
}) => {
  // 1. Brand & Product Selection
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("999");
  const [newProductDesc, setNewProductDesc] = useState("");

  // 2. Source Image
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(preselectedAsset?.id || null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(preselectedAsset?.media_url || null);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [libraryMediaAssets, setLibraryMediaAssets] = useState<MediaAssetItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // 3. Style Presets & Templates
  const stylePresets = [
    {
      id: "product_hero",
      title: "Product Hero Showcase",
      tagline: "Motorized turntable, rim lighting & premium detailing",
      icon: "💎",
      promptTemplate: "High-end commercial hero studio photography of {PRODUCT_NAME}. Centered on smooth matte background with gentle gradient rim lighting, soft natural drop shadow, tack-sharp packaging details, 8k commercial quality.",
    },
    {
      id: "lifestyle",
      title: "Lifestyle Scene",
      tagline: "Sun-drenched modern vanity or organic living space",
      icon: "🌿",
      promptTemplate: "Warm natural lifestyle photography featuring {PRODUCT_NAME} placed elegantly in a sun-drenched modern room, warm morning sunbeams, shallow depth of field, architectural interior elements, authentic organic living atmosphere.",
    },
    {
      id: "product_showcase",
      title: "Product Showcase & Details",
      tagline: "Dynamic angled composition highlighting ergonomics & finish",
      icon: "✨",
      promptTemplate: "Detailed product showcase demonstrating {PRODUCT_NAME}. Clean minimalist studio, dynamic angles highlighting ergonomic design, premium texture and pristine finish.",
    },
    {
      id: "ugc_concept",
      title: "UGC-Style Concept",
      tagline: "Authentic creator smartphone handheld perspective",
      icon: "📱",
      promptTemplate: "Authentic handheld social media creator perspective showcasing {PRODUCT_NAME} on a sunlit wooden desk. Natural daylight, gentle smartphone camera angle, authentic lifestyle environment.",
    },
    {
      id: "product_demo",
      title: "Product Demonstration",
      tagline: "Hands showcasing effortless application and texture",
      icon: "🧴",
      promptTemplate: "Step-by-step product demonstration of {PRODUCT_NAME}. Hands showcasing effortless application, gentle diffuse studio lighting, clear product benefits, high resolution commercial packshot.",
    },
    {
      id: "ecommerce",
      title: "E-Commerce Packshot",
      tagline: "Crisp marketplace white background compliant",
      icon: "🛍️",
      promptTemplate: "Crisp marketplace product packshot of {PRODUCT_NAME} isolated against a pristine studio white background, balanced commercial lighting, zero distracting glare, true-to-life colors, ready for online catalog.",
    },
    {
      id: "custom",
      title: "Custom Creative Vision",
      tagline: "Free-form bespoke artistic direction",
      icon: "🎨",
      promptTemplate: "Editorial artistic creative showcasing {PRODUCT_NAME}...",
    },
  ];

  const [selectedPresetId, setSelectedPresetId] = useState<string>("product_hero");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");

  // 4. Output Settings
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [outputQuality, setOutputQuality] = useState<"standard" | "hd">("standard");

  // 5. Providers
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("demo_mode");
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [allowDemoFallback, setAllowDemoFallback] = useState<boolean>(true);

  // 6. Generation State & Results
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<StudioGenerateResponse | null>(null);

  // 7. Campaign Reuse Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignsList, setCampaignsList] = useState<CampaignItem[]>([]);
  const [selectedCampaignToAttach, setSelectedCampaignToAttach] = useState<string>("");
  const [isAttachingCampaign, setIsAttachingCampaign] = useState(false);
  const [campaignAttachSuccess, setCampaignAttachSuccess] = useState<string | null>(null);

  // Selected product reference
  const selectedProduct = products.find((p) => p.id === selectedProductId) || (products.length > 0 ? products[0] : null);

  // Initialize selected product
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Synchronize source image reference when selected product changes
  useEffect(() => {
    if (selectedProduct?.image_url) {
      setSourcePreviewUrl(selectedProduct.image_url);
      const candidateId = selectedProduct.image_url.split("/").pop()?.split(".")[0];
      if (candidateId && candidateId.startsWith("med-")) {
        setSourceAssetId(candidateId);
      }
    }
  }, [selectedProductId, selectedProduct?.image_url]);

  // Load Providers on mount
  useEffect(() => {
    fetchImageProviders()
      .then((provs) => {
        setProviders(provs);
        const configured = provs.find((p) => p.is_configured && p.id !== "demo_mode");
        if (configured) {
          setSelectedProviderId(configured.id);
        } else {
          setSelectedProviderId("demo_mode");
        }
      })
      .catch((err) => console.warn("Failed to load providers:", err));
  }, []);

  // Update prompt whenever product or preset changes
  useEffect(() => {
    const prodName = selectedProduct?.name || activeBrand?.name || "Product";
    const preset = stylePresets.find((p) => p.id === selectedPresetId);
    if (preset) {
      const templated = preset.promptTemplate.replace("{PRODUCT_NAME}", prodName);
      setCustomPrompt(templated);
    }
  }, [selectedProductId, selectedProduct?.name, selectedPresetId, activeBrand?.name]);

  // Handle Quick Create Product
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand?.id) return;
    try {
      const newProd = await createProduct({
        brand_id: activeBrand.id,
        name: newProductName.trim(),
        category: newProductCategory.trim() || "General",
        price_inr: parseFloat(newProductPrice) || 999,
        description: newProductDesc.trim() || `${newProductName} by ${activeBrand.name}`,
      });
      if (onProductCreated) onProductCreated(newProd);
      setSelectedProductId(newProd.id);
      setIsQuickCreateOpen(false);
      setNewProductName("");
    } catch (err: any) {
      alert("Error creating product: " + err.message);
    }
  };

  // Handle Source Image File Upload
  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProductId) return;
    setIsUploadingSource(true);
    try {
      const updated = await uploadProductImage(selectedProductId, file);
      setSourcePreviewUrl(updated.image_url || null);
      const mediaId =
        updated.media_asset?.id ||
        (updated.image_url ? updated.image_url.split("/").pop()?.split(".")[0] : null);
      setSourceAssetId(mediaId || null);
    } catch (err: any) {
      alert("Source image upload failed: " + err.message);
    } finally {
      setIsUploadingSource(false);
    }
  };

  // Handle Generate
  const handleGenerate = async () => {
    if (!activeBrand?.id) {
      setErrorMsg("Please select or onboard a brand first.");
      return;
    }
    if (!confirmed) {
      setErrorMsg("Please confirm generation before proceeding.");
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedResult(null);

    try {
      const res = await generateStudioAsset({
        brand_id: activeBrand.id,
        product_id: selectedProductId || undefined,
        source_asset_id: sourceAssetId || undefined,
        style_preset: selectedPresetId,
        custom_prompt: customPrompt,
        aspect_ratio: aspectRatio,
        provider: selectedProviderId,
        output_quality: outputQuality,
        confirmed: true,
        allow_demo_fallback: allowDemoFallback,
      });
      setGeneratedResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Studio generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (mediaUrl: string, assetId: string) => {
    try {
      const fullUrl = resolveMediaUrl(mediaUrl);
      const res = await fetch(fullUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dm_api_token") || "herbally-local-dev-token"}`,
        },
      });
      if (!res.ok) throw new Error("Download request failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${assetId}_studio.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert("Download error: " + err.message);
    }
  };

  // Load library assets for source picker
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

  // Campaign modal
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
    if (!generatedResult || !selectedCampaignToAttach) return;
    setIsAttachingCampaign(true);
    try {
      await attachAssetToCampaign(selectedCampaignToAttach, generatedResult.media.id);
      setCampaignAttachSuccess("Successfully attached studio creative to campaign!");
      setTimeout(() => {
        setIsCampaignModalOpen(false);
        if (onNavigateToCampaign) {
          onNavigateToCampaign(selectedCampaignToAttach, generatedResult.media.id);
        }
      }, 1200);
    } catch (err: any) {
      alert("Failed to attach to campaign: " + (err.message || err));
    } finally {
      setIsAttachingCampaign(false);
    }
  };

  const activeProviderInfo = providers.find((p) => p.id === selectedProviderId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Studio Header Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(20, 27, 44, 0.95) 0%, rgba(13, 18, 30, 0.98) 100%)",
          border: "1px solid rgba(168, 85, 247, 0.25)",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
              AI Product Photography Studio
            </h2>
            <span
              className="badge"
              style={{
                background: "rgba(168, 85, 247, 0.15)",
                color: "#c084fc",
                border: "1px solid rgba(168, 85, 247, 0.3)",
              }}
            >
              <Sparkles size={12} /> Scalio-Inspired Creative Pipeline
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
            Generate hyper-realistic commercial packshots, editorial lifestyle scenes, and social ad creatives with cryptographic provenance.
          </p>
        </div>

        {onNavigateToLibrary && (
          <button
            onClick={onNavigateToLibrary}
            className="btn-secondary"
            style={{ padding: "9px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ImageIcon size={15} /> Central Media Library
          </button>
        )}
      </div>

      {/* Main Studio Grid: Controls (Left) vs Real-time Canvas & Output (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "28px", alignItems: "start" }}>
        {/* LEFT COLUMN: 6-Step Workflow Configuration */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* STEP 1: Brand & Product Selection */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#c084fc",
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                  Product & Brand Association
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {isQuickCreateOpen ? "Cancel" : "+ Quick Add Product"}
              </button>
            </div>

            {isQuickCreateOpen ? (
              <form onSubmit={handleQuickCreate} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="Product Name (e.g. Linen Throw Pillow)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  required
                  style={{
                    padding: "8px 12px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                  }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder="Category"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Price INR"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.9)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Product Description (optional)"
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                  }}
                />
                <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "0.82rem" }}>
                  Save & Select Product
                </button>
              </form>
            ) : products.length === 0 ? (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px dashed rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: 600 }}>
                    No products cataloged for this workspace
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Add your flagship product or select an onboarded brand to start studio generation.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickCreateOpen(true)}
                  className="btn-primary"
                  style={{ fontSize: "0.78rem", padding: "6px 12px", whiteSpace: "nowrap" }}
                >
                  + Add Product
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Select Flagship Product
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(13, 18, 30, 0.95)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category || "General"}) — ₹{p.price_inr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Source Image Upload or Selection */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#c084fc",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                2
              </span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                Source Product Reference (Optional)
              </span>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "14px" }}>
              Provide a real product photo to generate contextual variations or background replacements.
            </p>

            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {selectedProduct?.image_url || sourcePreviewUrl ? (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "2px solid #38bdf8",
                    background: "#080c14",
                    flexShrink: 0,
                  }}
                >
                  <ProtectedMediaImage
                    mediaUrl={sourcePreviewUrl || selectedProduct?.image_url || ""}
                    alt="Source product reference"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "8px",
                    border: "1px dashed var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.7rem",
                    flexShrink: 0,
                  }}
                >
                  No Photo
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <label
                    className="btn-secondary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      padding: "8px 14px",
                    }}
                  >
                    <Upload size={14} />
                    {isUploadingSource ? "Uploading..." : "Upload New Product Photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleSourceUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenMediaPicker}
                    className="btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#38bdf8" }}
                  >
                    <ImageIcon size={14} /> Select from Library
                  </button>
                  {sourceAssetId && (
                    <button
                      type="button"
                      onClick={() => { setSourceAssetId(null); setSourcePreviewUrl(null); }}
                      style={{ background: "transparent", border: "none", color: "#f87171", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  PNG, JPEG, WebP up to 20MB. Magic byte & dimension validated.
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: Creative Style Presets */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#c084fc",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                3
              </span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                Creative Style Template
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {stylePresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: isSelected ? "1.5px solid #c084fc" : "1px solid var(--border-subtle)",
                      background: isSelected ? "rgba(168, 85, 247, 0.12)" : "rgba(255, 255, 255, 0.02)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "1.1rem" }}>{preset.icon}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "#c084fc" : "#ffffff" }}>
                        {preset.title}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: "1.3" }}>
                      {preset.tagline}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Prompt Editor */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#c084fc",
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  4
                </span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                  Creative Prompt & Language Direction
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(13, 18, 30, 0.9)",
                    border: "1px solid var(--border-subtle)",
                    color: "#ffffff",
                    fontSize: "0.75rem",
                  }}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                </select>
                <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.7rem" }}>
                  <ShieldCheck size={11} /> Guardrails Checked
                </span>
              </div>
            </div>

            <textarea
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe lighting, surface textures, background props, and camera mood..."
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(13, 18, 30, 0.9)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.84rem",
                lineHeight: "1.45",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Prohibited disease cure claims are automatically blocked.</span>
              <span>{customPrompt.length} / 4000 chars</span>
            </div>
          </div>

          {/* STEP 5: Aspect Ratio & Output Dimensions */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#c084fc",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                5
              </span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                Aspect Ratio & Dimensions
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {[
                { ratio: "1:1", label: "Square (1:1)", desc: "Feed / Catalog" },
                { ratio: "9:16", label: "Story (9:16)", desc: "Reels / TikTok" },
                { ratio: "16:9", label: "Landscape (16:9)", desc: "Hero Banner" },
                { ratio: "4:5", label: "Portrait (4:5)", desc: "Instagram Post" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.ratio}
                  onClick={() => setAspectRatio(item.ratio)}
                  style={{
                    padding: "10px 6px",
                    borderRadius: "8px",
                    border: aspectRatio === item.ratio ? "1.5px solid #38bdf8" : "1px solid var(--border-subtle)",
                    background: aspectRatio === item.ratio ? "rgba(56, 189, 248, 0.15)" : "transparent",
                    color: aspectRatio === item.ratio ? "#38bdf8" : "var(--text-secondary)",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{item.ratio}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>{item.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Render Quality:</span>
              {(["standard", "hd"] as const).map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setOutputQuality(q)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "0.76rem",
                    fontWeight: outputQuality === q ? 700 : 500,
                    background: outputQuality === q ? "rgba(168, 85, 247, 0.2)" : "transparent",
                    color: outputQuality === q ? "#c084fc" : "var(--text-muted)",
                    border: outputQuality === q ? "1px solid #c084fc" : "1px solid var(--border-subtle)",
                    cursor: "pointer",
                  }}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 6: Provider Architecture & Execution Guard */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#c084fc",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                6
              </span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                Provider Pipeline & Authorization
              </span>
            </div>

            {/* Provider Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {providers.map((p) => {
                const isSelected = selectedProviderId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProviderId(p.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: isSelected ? "1.5px solid #38bdf8" : "1px solid var(--border-subtle)",
                      background: isSelected ? "rgba(56, 189, 248, 0.08)" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ffffff" }}>{p.name}</span>
                        {p.is_configured ? (
                          <span style={{ fontSize: "0.68rem", color: "#34d399", background: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: "4px" }}>
                            Live Configured
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.68rem", color: "#fbbf24", background: "rgba(245, 158, 11, 0.15)", padding: "1px 6px", borderRadius: "4px" }}>
                            Unconfigured
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {p.notes}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: isSelected ? "5px solid #38bdf8" : "2px solid var(--border-subtle)",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Safety Confirmation Guard */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              <span>
                I confirm this studio generation. Output will be authenticated and saved to durable local storage with cryptographic hash.
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", fontSize: "0.76rem", color: "var(--text-muted)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allowDemoFallback}
                onChange={(e) => setAllowDemoFallback(e.target.checked)}
              />
              <span>Fallback to watermarked demo mode if provider is unconfigured ({activeProviderInfo?.name || "Demo Studio"})</span>
            </label>

            {errorMsg && (
              <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "0.82rem" }}>
                {errorMsg}
              </div>
            )}

            {/* Generate Trigger Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !confirmed}
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "12px",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                borderColor: "#a855f7",
                boxShadow: "0 4px 15px rgba(168, 85, 247, 0.3)",
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={17} className="spin" /> Generating Studio Asset...
                </>
              ) : (
                <>
                  <Sparkles size={17} /> Generate Studio Photography
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Preview & Variation Inspection Canvas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "84px" }}>
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff", marginBottom: "14px" }}>
              Studio Canvas & Inspection
            </h3>

            {isGenerating ? (
              <div
                style={{
                  height: "400px",
                  borderRadius: "12px",
                  background: "#080c14",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px",
                  border: "1px dashed rgba(168, 85, 247, 0.4)",
                }}
              >
                <RefreshCw size={36} className="spin" style={{ color: "#c084fc" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 600, color: "#ffffff" }}>Composing Studio Shot</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Executing pipeline with prompt guardrails and aspect ratio {aspectRatio}...
                  </div>
                </div>
              </div>
            ) : generatedResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Result Image */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "380px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#05080e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1.5px solid rgba(168, 85, 247, 0.4)",
                  }}
                >
                  <ProtectedMediaImage
                    mediaUrl={generatedResult.media.media_url}
                    alt={generatedResult.media.prompt}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />

                  {generatedResult.is_demo && (
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(245, 158, 11, 0.95)",
                        color: "#000000",
                        fontWeight: 700,
                        fontSize: "0.74rem",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      Demo Simulation Mode
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(0, 0, 0, 0.75)",
                      color: "#94a3b8",
                      fontSize: "0.72rem",
                    }}
                  >
                    {generatedResult.media.aspect_ratio || aspectRatio}
                  </div>
                </div>

                {/* Warning note if demo or text-to-image notification */}
                {generatedResult.warning && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      color: "#fbbf24",
                      fontSize: "0.78rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {generatedResult.warning}
                  </div>
                )}

                {/* Side-by-Side Comparison if Source Image Was Linked */}
                {generatedResult.source_media && (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#38bdf8", marginBottom: "8px" }}>
                      Variation Lineage: Source vs Generated
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Source Reference</div>
                        <div style={{ height: "100px", borderRadius: "6px", overflow: "hidden", background: "#000" }}>
                          <ProtectedMediaImage
                            mediaUrl={generatedResult.source_media.media_url}
                            alt="Source product"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Studio Variation</div>
                        <div style={{ height: "100px", borderRadius: "6px", overflow: "hidden", background: "#000" }}>
                          <ProtectedMediaImage
                            mediaUrl={generatedResult.media.media_url}
                            alt="Generated variation"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata & Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={handleOpenCampaignModal}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      padding: "11px",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      borderColor: "#10b981",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <Rocket size={16} /> Use in Campaign
                  </button>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => handleDownload(generatedResult.media.media_url, generatedResult.media.id)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: "9px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      <Download size={14} /> Download PNG
                    </button>

                    {onNavigateToLibrary && (
                      <button
                        onClick={onNavigateToLibrary}
                        className="btn-secondary"
                        style={{ padding: "9px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <ImageIcon size={14} /> View in Library
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: "360px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <Camera size={34} style={{ color: "var(--text-muted)" }} />
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>
                  Ready to Capture Creative
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "280px", margin: 0 }}>
                  Select your product and style template on the left, then click Generate to produce your studio visual.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MEDIA PICKER MODAL (For selecting source reference from Library) */}
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
                Select Product Source Reference from Library
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
                {libraryMediaAssets.map((asset) => (
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
                      isVideo={asset.mime_type.startsWith("video/")}
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
                No assets found in Media Library for {activeBrand?.name}. Upload a product photo to begin.
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
                  Attach Creative to Campaign
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
              Associate this generated studio image with a persistent marketing campaign in your workspace.
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
                      onNavigateToCampaign(undefined, generatedResult?.media.id);
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
