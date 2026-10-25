import React, { useState, useEffect } from "react";
import {
  Images,
  Search,
  Download,
  Trash2,
  Sparkles,
  Camera,
  ShieldCheck,
  Eye,
  X,
  RefreshCw,
  Layers,
  HardDrive,
  FileImage,
  Video,
  Rocket,
  Check,
} from "lucide-react";
import type { BrandProfile, MediaAssetItem, CampaignItem } from "../types";
import {
  fetchMediaAssets,
  deleteMediaAsset,
  resolveMediaUrl,
  fetchCampaignsList,
  attachAssetToCampaign,
} from "../services/api";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

interface MediaLibraryViewProps {
  activeBrand?: BrandProfile | null;
  onNavigateToStudio?: (selectedAsset?: MediaAssetItem) => void;
  onNavigateToVideo?: (selectedAsset?: MediaAssetItem) => void;
  onNavigateToCampaign?: (campaignId?: string, mediaAssetId?: string) => void;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  activeBrand,
  onNavigateToStudio,
  onNavigateToVideo,
  onNavigateToCampaign,
}) => {
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [previewAsset, setPreviewAsset] = useState<MediaAssetItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campaign reuse modal state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignTargetAsset, setCampaignTargetAsset] = useState<MediaAssetItem | null>(null);
  const [campaignsList, setCampaignsList] = useState<CampaignItem[]>([]);
  const [selectedCampaignToAttach, setSelectedCampaignToAttach] = useState<string>("");
  const [isAttachingCampaign, setIsAttachingCampaign] = useState(false);
  const [campaignAttachSuccess, setCampaignAttachSuccess] = useState<string | null>(null);

  const loadAssets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMediaAssets({
        brand_id: activeBrand?.id,
        asset_type: selectedType === "all" ? undefined : selectedType,
        search: searchQuery.trim() || undefined,
      });
      setAssets(data);
    } catch (err: any) {
      setError(err.message || "Failed to load media assets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [activeBrand?.id, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAssets();
  };

  const handleDelete = async (mediaId: string) => {
    setDeletingId(mediaId);
    try {
      await deleteMediaAsset(mediaId);
      setAssets((prev) => prev.filter((a) => a.id !== mediaId));
      setDeleteConfirmId(null);
      if (previewAsset?.id === mediaId) setPreviewAsset(null);
      setSuccessMsg("Media asset permanently deleted.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Could not delete media asset");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAuthorizedDownload = async (asset: MediaAssetItem) => {
    try {
      const fullUrl = resolveMediaUrl(asset.media_url);
      const res = await fetch(fullUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dm_api_token") || "herbally-local-dev-token"}`,
        },
      });
      if (!res.ok) throw new Error("Could not download file");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const isVid = (asset.mime_type || "").includes("mp4") || asset.asset_type === "video";
      const ext = isVid ? "mp4" : asset.mime_type === "image/png" ? "png" : asset.mime_type === "image/webp" ? "webp" : "jpg";
      a.download = `${asset.id}_${asset.asset_type || "media"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert("Download failed: " + err.message);
    }
  };

  const handleOpenCampaignModal = async (asset: MediaAssetItem) => {
    if (!activeBrand) return;
    setCampaignTargetAsset(asset);
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
    if (!campaignTargetAsset || !selectedCampaignToAttach) return;
    setIsAttachingCampaign(true);
    try {
      await attachAssetToCampaign(selectedCampaignToAttach, campaignTargetAsset.id);
      setCampaignAttachSuccess("Successfully attached media creative to campaign!");
      setTimeout(() => {
        setIsCampaignModalOpen(false);
        if (onNavigateToCampaign) {
          onNavigateToCampaign(selectedCampaignToAttach, campaignTargetAsset.id);
        }
      }, 1200);
    } catch (err: any) {
      alert("Failed to attach to campaign: " + (err.message || err));
    } finally {
      setIsAttachingCampaign(false);
    }
  };

  // Compute Stats
  const totalCount = assets.length;
  const uploadsCount = assets.filter((a) => a.asset_type === "product_upload").length;
  const studioCount = assets.filter((a) => a.asset_type === "studio_generation" || a.asset_type === "variation").length;
  const totalBytes = assets.reduce((acc, a) => acc + (a.byte_size || 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  const assetTypeFilters = [
    { id: "all", label: "All Assets" },
    { id: "product_upload", label: "Product Uploads" },
    { id: "studio_generation", label: "Studio Generations" },
    { id: "video", label: "AI Videos" },
    { id: "variation", label: "Variations" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(20, 27, 44, 0.95) 0%, rgba(13, 18, 30, 0.98) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
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
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Central Media Library
            </h2>
            <span
              className="badge"
              style={{
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              <ShieldCheck size={12} /> Bearer Authenticated
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
            Unified vault for {activeBrand?.name || "workspace"} product photos, AI studio variations, and campaign ad assets.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {onNavigateToVideo && (
            <button
              onClick={() => onNavigateToVideo()}
              className="btn-secondary"
              style={{
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.88rem",
                color: "#818cf8",
                borderColor: "rgba(99, 102, 241, 0.4)",
              }}
            >
              <Video size={16} /> Open AI Video Studio
            </button>
          )}
          <button
            onClick={() => onNavigateToStudio && onNavigateToStudio()}
            className="btn-primary"
            style={{
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.88rem",
            }}
          >
            <Camera size={16} /> Open AI Product Studio
          </button>
          <button
            onClick={loadAssets}
            className="btn-secondary"
            style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "6px" }}
            title="Refresh assets"
          >
            <RefreshCw size={15} className={isLoading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Images size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ffffff" }}>{totalCount}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Library Media</div>
          </div>
        </div>

        <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileImage size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ffffff" }}>{uploadsCount}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Product Photo Uploads</div>
          </div>
        </div>

        <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(168, 85, 247, 0.12)",
              color: "#c084fc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ffffff" }}>{studioCount}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>AI Studio Generations</div>
          </div>
        </div>

        <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HardDrive size={20} />
          </div>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ffffff" }}>{totalMb} MB</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Secure Local Storage</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Type Filter Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {assetTypeFilters.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: selectedType === tab.id ? 600 : 500,
                background: selectedType === tab.id ? "rgba(56, 189, 248, 0.16)" : "rgba(255, 255, 255, 0.04)",
                color: selectedType === tab.id ? "#38bdf8" : "var(--text-secondary)",
                border: selectedType === tab.id ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px" }}>
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search
              size={15}
              style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search by prompt, ID, provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                background: "rgba(13, 18, 30, 0.9)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.82rem",
              }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: "8px 14px", fontSize: "0.82rem" }}>
            Search
          </button>
        </form>
      </div>

      {/* Messages */}
      {successMsg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            fontSize: "0.85rem",
          }}
        >
          {successMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            fontSize: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button onClick={loadAssets} className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
            Retry
          </button>
        </div>
      )}

      {/* Media Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                height: "320px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(17, 24, 39, 0.4)",
              }}
            >
              <RefreshCw size={24} className="spin" style={{ color: "var(--text-muted)", marginBottom: "8px" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading asset preview...</span>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.1)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Images size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
              No media assets found
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto" }}>
              {selectedType !== "all" || searchQuery
                ? "No media matches your search filters. Try clearing your filters or search terms."
                : `No media has been uploaded or generated for ${activeBrand?.name || "this workspace"} yet.`}
            </p>
          </div>
          <button
            onClick={() => onNavigateToStudio && onNavigateToStudio()}
            className="btn-primary"
            style={{ marginTop: "8px", padding: "10px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Camera size={15} /> Launch AI Product Studio
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {assets.map((asset) => {
            const isVideo = asset.asset_type === "video" || (asset.mime_type || "").startsWith("video/");
            const isUpload = asset.asset_type === "product_upload";
            const isVariation = asset.asset_type === "variation";
            const isStudio = asset.asset_type === "studio_generation";
            const isDemo = asset.status === "demo_simulation" || asset.provider === "demo_mode";

            return (
              <div
                key={asset.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  padding: 0,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  border: isDemo
                    ? "1px solid rgba(245, 158, 11, 0.3)"
                    : isStudio
                    ? "1px solid rgba(168, 85, 247, 0.3)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                {/* Image Container with Badges */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "220px",
                    background: "#080c14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => setPreviewAsset(asset)}
                >
                  <ProtectedMediaImage
                    mediaUrl={asset.media_url}
                    alt={asset.prompt}
                    isVideo={isVideo}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  {/* Top Badges Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background: isVideo
                          ? "rgba(99, 102, 241, 0.85)"
                          : isUpload
                          ? "rgba(16, 185, 129, 0.85)"
                          : isVariation
                          ? "rgba(56, 189, 248, 0.85)"
                          : "rgba(168, 85, 247, 0.85)",
                        color: "#ffffff",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      {isVideo ? "AI Video" : isUpload ? "Photo Upload" : isVariation ? "Variation" : "AI Studio"}
                    </span>

                    {isDemo && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: "rgba(245, 158, 11, 0.9)",
                          color: "#000000",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        Demo Mode
                      </span>
                    )}
                  </div>

                  {/* Aspect Ratio Badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      background: "rgba(0, 0, 0, 0.75)",
                      color: "#94a3b8",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {asset.aspect_ratio || "1:1"}
                  </div>

                  {/* Derived from parent indicator */}
                  {asset.source_asset_id && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "8px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        background: "rgba(30, 41, 59, 0.85)",
                        color: "#38bdf8",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <Layers size={10} /> Derived
                    </div>
                  )}
                </div>

                {/* Details Footer */}
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      lineHeight: "1.35",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      height: "34px",
                    }}
                    title={asset.prompt}
                  >
                    {asset.prompt}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      paddingTop: "6px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <span>{asset.provider} ({asset.provider_model})</span>
                    <span>{(asset.byte_size / 1024).toFixed(0)} KB</span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                    <button
                      onClick={() => setPreviewAsset(asset)}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        fontSize: "0.76rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <Eye size={12} /> Inspect
                    </button>

                    <button
                      onClick={() => handleAuthorizedDownload(asset)}
                      className="btn-secondary"
                      style={{
                        padding: "6px 10px",
                        fontSize: "0.76rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#38bdf8",
                      }}
                      title="Download authorized image"
                    >
                      <Download size={13} />
                    </button>

                    {onNavigateToVideo && (
                      <button
                        onClick={() => onNavigateToVideo(asset)}
                        className="btn-secondary"
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.76rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#818cf8",
                        }}
                        title="Animate in AI Video Studio"
                      >
                        <Video size={13} />
                      </button>
                    )}

                    {onNavigateToStudio && (
                      <button
                        onClick={() => onNavigateToStudio(asset)}
                        className="btn-secondary"
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.76rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#c084fc",
                        }}
                        title="Create studio variation with this image"
                      >
                        <Sparkles size={13} />
                      </button>
                    )}

                    {onNavigateToCampaign && (
                      <button
                        onClick={() => handleOpenCampaignModal(asset)}
                        className="btn-secondary"
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.76rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#34d399",
                        }}
                        title="Use in Campaign"
                      >
                        <Rocket size={13} />
                      </button>
                    )}

                    {deleteConfirmId === asset.id ? (
                      <button
                        disabled={deletingId === asset.id}
                        onClick={() => handleDelete(asset.id)}
                        className="btn-primary"
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.76rem",
                          background: "#ef4444",
                          borderColor: "#ef4444",
                        }}
                      >
                        {deletingId === asset.id ? "..." : "Confirm"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(asset.id)}
                        className="btn-secondary"
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.76rem",
                          color: "#ef4444",
                        }}
                        title="Delete asset"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Attachment Modal */}
      {isCampaignModalOpen && campaignTargetAsset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: "20px",
          }}
          onClick={() => setIsCampaignModalOpen(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: "500px",
              width: "100%",
              padding: "24px",
              background: "var(--card-bg, #18181b)",
              border: "1px solid var(--border-color, #27272a)",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Rocket size={18} style={{ color: "#34d399" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Attach Creative to Campaign</h3>
              </div>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Link this media creative ({campaignTargetAsset.asset_type || "image"}) to an active marketing campaign to preserve end-to-end creative lineage and copy generation.
            </p>

            {campaignAttachSuccess ? (
              <div style={{ padding: "12px", background: "rgba(52, 211, 153, 0.1)", border: "1px solid #34d399", borderRadius: "8px", color: "#34d399", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Check size={16} />
                <span>{campaignAttachSuccess}</span>
              </div>
            ) : null}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px" }}>
                Select Target Campaign
              </label>
              {campaignsList.length === 0 ? (
                <div style={{ padding: "12px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  No active campaigns found for {activeBrand?.name || "this brand"}. Please create a campaign first.
                </div>
              ) : (
                <select
                  value={selectedCampaignToAttach}
                  onChange={(e) => setSelectedCampaignToAttach(e.target.value)}
                  className="input-field"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)" }}
                >
                  {campaignsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.objective} &bull; {c.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="btn-secondary"
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                disabled={!selectedCampaignToAttach || isAttachingCampaign || campaignsList.length === 0}
                onClick={handleConfirmAttachToCampaign}
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                {isAttachingCampaign ? <RefreshCw size={14} className="spin" /> : <Rocket size={14} />}
                Attach & View Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Res Inspection Modal */}
      {previewAsset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              background: "#0d131f",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Asset Provenance & Inspection
                </h3>
                <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                  {previewAsset.id}
                </span>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Large Preview */}
            <div
              style={{
                width: "100%",
                maxHeight: "420px",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#05080e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ProtectedMediaImage
                mediaUrl={previewAsset.media_url}
                alt={previewAsset.prompt}
                isVideo={(previewAsset.mime_type || "").startsWith("video/") || previewAsset.asset_type === "video"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "420px",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Provenance Metadata Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                fontSize: "0.82rem",
                background: "rgba(17, 24, 39, 0.6)",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Provider: </span>
                <strong style={{ color: "#ffffff" }}>{previewAsset.provider}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Model: </span>
                <strong style={{ color: "#ffffff" }}>{previewAsset.provider_model}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Aspect Ratio: </span>
                <strong style={{ color: "#ffffff" }}>{previewAsset.aspect_ratio || "1:1"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Mime Type: </span>
                <strong style={{ color: "#ffffff" }}>{previewAsset.mime_type}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Size: </span>
                <strong style={{ color: "#ffffff" }}>{(previewAsset.byte_size / 1024).toFixed(1)} KB</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Status: </span>
                <strong style={{ color: previewAsset.status === "demo_simulation" ? "#fbbf24" : "#34d399" }}>
                  {previewAsset.status}
                </strong>
              </div>
              {previewAsset.source_asset_id && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--text-muted)" }}>Parent Source Asset: </span>
                  <code style={{ color: "#38bdf8", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px" }}>
                    {previewAsset.source_asset_id}
                  </code>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)" }}>SHA-256 Checksum: </span>
                <code style={{ fontSize: "0.72rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                  {previewAsset.checksum_sha256}
                </code>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--text-muted)" }}>Creative Prompt: </span>
                <p style={{ color: "#ffffff", marginTop: "4px", lineHeight: "1.4" }}>{previewAsset.prompt}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => handleAuthorizedDownload(previewAsset)}
                className="btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
              >
                <Download size={15} /> Download Original File
              </button>
              {onNavigateToStudio && (
                <button
                  onClick={() => {
                    const target = previewAsset;
                    setPreviewAsset(null);
                    onNavigateToStudio(target);
                  }}
                  className="btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#c084fc" }}
                >
                  <Sparkles size={15} /> Create Variations in Studio
                </button>
              )}
              {onNavigateToCampaign && (
                <button
                  onClick={() => {
                    const target = previewAsset;
                    setPreviewAsset(null);
                    handleOpenCampaignModal(target);
                  }}
                  className="btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#34d399" }}
                >
                  <Rocket size={15} /> Use in Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
