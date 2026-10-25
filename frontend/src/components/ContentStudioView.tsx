import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  Video,
  Image as ImageIcon,
  Calendar,
  Copy,
  Trash2,
  Edit3
} from "lucide-react";
import {
  fetchContentAssets,
  generateContentAssets,
  updateContentAsset,
  duplicateContentAsset,
  deleteContentAsset,
  scheduleContentAsset,
  attachMediaToCampaign,
  fetchContentAssetMedia,
  generateContentAssetImage,
} from "../services/api";
import { ProtectedMediaImage } from "./ProtectedMediaImage";
import type { CampaignPlanItem, ContentAssetItem, MarketingState } from "../types";

interface ContentStudioViewProps {
  onNavigateToCalendar?: () => void;
  workflowId?: string;
  selectedCampaignId?: string;
  campaigns?: CampaignPlanItem[];
  onWorkflowStateUpdated?: (state: MarketingState) => void;
  brandId?: string;
  brandName?: string;
}

export const ContentStudioView: React.FC<ContentStudioViewProps> = ({
  onNavigateToCalendar,
  workflowId,
  selectedCampaignId,
  campaigns = [],
  onWorkflowStateUpdated,
  brandId,
  brandName = "Brand",
}) => {
  const [assets, setAssets] = useState<ContentAssetItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "social_ads" | "video_reels" | "photoshoots">("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingMediaAssetId, setGeneratingMediaAssetId] = useState<string | null>(null);
  const [attachingMediaAssetId, setAttachingMediaAssetId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<ContentAssetItem | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ContentAssetItem | null>(null);
  const [scheduleTime, setScheduleTime] = useState<string>("2026-11-01T10:00");

  const effectiveBrandId = brandId || "herbally-brand";

  const loadAssets = () => {
    setIsLoading(true);
    fetchContentAssets(effectiveBrandId)
      .then((data) => setAssets(data))
      .catch((err) => console.error("Error loading content assets:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAssets();
  }, [effectiveBrandId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newAssets = await generateContentAssets({
        brand_id: effectiveBrandId,
        channels: ["Instagram", "Meta Ads", "Google Search"],
        asset_types: ["social_post", "ad_copy", "reel_script"]
      });
      setAssets((prev) => [...newAssets, ...prev]);
    } catch (err: any) {
      alert("Failed to generate content: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dupe = await duplicateContentAsset(id);
      setAssets((prev) => [dupe, ...prev]);
    } catch (err: any) {
      alert("Failed to duplicate asset: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content asset?")) return;
    try {
      await deleteContentAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert("Failed to delete asset: " + err.message);
    }
  };

  const handleStatusChange = async (asset: ContentAssetItem, newStatus: string) => {
    try {
      const updated = await updateContentAsset(asset.id, { status: newStatus });
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleTarget) return;
    try {
      await scheduleContentAsset(scheduleTarget.id, scheduleTarget.channel, scheduleTime);
      setAssets((prev) =>
        prev.map((a) => (a.id === scheduleTarget.id ? { ...a, status: "scheduled" } : a))
      );
      setScheduleTarget(null);
      alert(`Asset scheduled for ${scheduleTime}! View in Content Calendar.`);
    } catch (err: any) {
      alert("Failed to schedule asset: " + err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAsset) return;
    try {
      const updated = await updateContentAsset(editingAsset.id, {
        title: editingAsset.title,
        headline: editingAsset.headline,
        body_copy: editingAsset.body_copy,
        content: editingAsset.content,
        call_to_action: editingAsset.call_to_action,
        image_prompt: editingAsset.image_prompt,
      });
      setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? updated : a)));
      setEditingAsset(null);
    } catch (err: any) {
      alert("Failed to save changes: " + err.message);
    }
  };

  const handleGenerateImage = async (asset: ContentAssetItem) => {
    const confirmed = confirm(
      "Generate and store an image for this asset? This sends its saved image prompt to the configured image provider and may incur provider charges."
    );
    if (!confirmed) return;

    setGeneratingMediaAssetId(asset.id);
    try {
      const result = await generateContentAssetImage(asset.id, { confirmed: true, quality: "low" });
      setAssets((prev) => prev.map((item) => (
        item.id === asset.id ? { ...item, generated_media_url: result.generated_media_url } : item
      )));
      alert("Image generated and stored locally. Attach it to a campaign separately when ready.");
    } catch (err: any) {
      alert(err.message || "Image generation failed");
    } finally {
      setGeneratingMediaAssetId(null);
    }
  };

  const handleAttachLatestMedia = async (asset: ContentAssetItem) => {
    if (!workflowId || !selectedCampaignId) {
      alert("Start a marketing workflow and select a campaign before attaching media.");
      return;
    }
    const campaign = campaigns.find((item) => item.id === selectedCampaignId);
    if (!campaign) {
      alert("The selected campaign is no longer available in this workflow.");
      return;
    }
    if (!confirm(`Attach the latest stored image for “${asset.title}” to “${campaign.campaign_name}”?`)) return;

    setAttachingMediaAssetId(asset.id);
    try {
      const media = await fetchContentAssetMedia(asset.id);
      const latest = media.find((item) => item.media_url === asset.generated_media_url) || media[0];
      if (!latest) throw new Error("No stored generated image is available for this content asset");
      const result = await attachMediaToCampaign(workflowId, selectedCampaignId, latest.id);
      onWorkflowStateUpdated?.(result.state);
      alert("Stored image attached to the selected campaign draft.");
    } catch (err: any) {
      alert(err.message || "Failed to attach media to campaign");
    } finally {
      setAttachingMediaAssetId(null);
    }
  };

  // Filter assets
  const filteredAssets = assets.filter((a) => {
    if (activeTab === "social_ads" && !["social_post", "ad_copy"].includes(a.asset_type)) return false;
    if (activeTab === "video_reels" && a.asset_type !== "reel_script") return false;
    if (activeTab === "photoshoots" && !a.image_prompt) return false;
    if (selectedChannel !== "all" && a.channel !== selectedChannel) return false;
    if (selectedStatus !== "all" && a.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              AI Content Studio & Creative Lab
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              {brandName} Brand-Grounded
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Create, refine, approve, and schedule verified social posts, conversion ad copy, Reels scripts, and creative briefs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className="btn-secondary"
              style={{ padding: "10px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Calendar size={14} /> Open Calendar
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Sparkles size={16} />
            {isGenerating ? "Synthesizing Assets..." : "Generate Brand Assets"}
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Assets", icon: <FileText size={14} /> },
            { id: "social_ads", label: "Posts & Ad Copy", icon: <FileText size={14} /> },
            { id: "video_reels", label: "Reels & Video Scripts", icon: <Video size={14} /> },
            { id: "photoshoots", label: "Product Photoshoots (Prompts)", icon: <ImageIcon size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                background: activeTab === tab.id ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: activeTab === tab.id ? "#34d399" : "var(--text-secondary)",
                border: activeTab === tab.id ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                cursor: "pointer"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Channel & Status Dropdowns */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            style={{ padding: "6px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.82rem" }}
          >
            <option value="all">All Channels</option>
            <option value="Instagram">Instagram</option>
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Search">Google Search</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: "6px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.82rem" }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published_demo">Published (Demo)</option>
          </select>
        </div>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading creative assets...</div>
      ) : filteredAssets.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <Sparkles size={36} color="var(--brand-emerald)" style={{ marginBottom: "12px", opacity: 0.6 }} />
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>No assets found in this view</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "18px" }}>
            Click "Generate Brand Assets" above to synthesize brand-grounded ad copy, social posts, and video scripts.
          </p>
          <button onClick={handleGenerate} className="btn-primary" style={{ padding: "8px 18px", fontSize: "0.85rem" }}>
            Generate Assets Now
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {filteredAssets.map((asset) => {
            const isApproved = asset.status === "approved";
            const isPending = asset.status === "pending_approval";
            const isScheduled = asset.status === "scheduled";

            return (
              <div
                key={asset.id}
                className="glass-panel"
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: isApproved ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border-subtle)"
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", marginRight: "6px" }}>
                        {asset.channel}
                      </span>
                      <span className="badge" style={{
                        background: isApproved ? "rgba(16, 185, 129, 0.15)" : isPending ? "rgba(245, 158, 11, 0.15)" : isScheduled ? "rgba(139, 92, 246, 0.15)" : "rgba(255,255,255,0.06)",
                        color: isApproved ? "#34d399" : isPending ? "#f59e0b" : isScheduled ? "#a855f7" : "var(--text-secondary)"
                      }}>
                        {asset.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => setEditingAsset(asset)} title="Edit Asset" style={{ background: "transparent", color: "var(--text-muted)" }}>
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDuplicate(asset.id)} title="Duplicate Asset" style={{ background: "transparent", color: "var(--text-muted)" }}>
                        <Copy size={15} />
                      </button>
                      <button onClick={() => handleDelete(asset.id)} title="Delete Asset" style={{ background: "transparent", color: "var(--text-muted)" }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                    {asset.title}
                  </h4>

                  {/* Headline & Body Copy */}
                  {asset.headline && (
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "6px" }}>
                      "{asset.headline}"
                    </div>
                  )}

                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.45, maxHeight: "160px", overflowY: "auto", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>
                    {asset.body_copy || asset.content}
                  </div>

                  {/* CTA */}
                  {asset.call_to_action && (
                    <div style={{ fontSize: "0.78rem", color: "var(--brand-emerald)", fontWeight: 600, marginBottom: "10px" }}>
                      CTA: {asset.call_to_action}
                    </div>
                  )}

                  {/* Honest Text Prompt Disclosure Box */}
                  {asset.image_prompt && (
                    <div style={{ padding: "8px 10px", background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "6px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "4px" }}>
                        <ImageIcon size={12} /> Prompt for Image Studio (Text Spec)
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {asset.image_prompt}
                      </div>
                    </div>
                  )}

                  {asset.generated_media_url && (
                    <div style={{ marginBottom: "12px" }}>
                      <ProtectedMediaImage
                        mediaUrl={asset.generated_media_url}
                        alt={`Generated creative for ${asset.title}`}
                        style={{ width: "100%", maxHeight: "260px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                      />
                      <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#34d399" }}>
                        Generated image stored locally — not published or used in a live campaign.
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    v{asset.version} • {asset.provider_source.split("(")[0]}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {asset.status === "draft" && (
                      <button
                        onClick={() => handleStatusChange(asset, "pending_approval")}
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        Submit for Review
                      </button>
                    )}

                    {asset.status === "pending_approval" && (
                      <button
                        onClick={() => handleStatusChange(asset, "approved")}
                        className="btn-primary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem", background: "var(--brand-emerald)" }}
                      >
                        Approve Asset
                      </button>
                    )}

                    {(asset.status === "approved" || asset.status === "draft") && (
                      <button
                        onClick={() => setScheduleTarget(asset)}
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Calendar size={12} /> Schedule
                      </button>
                    )}
                    {asset.image_prompt && !asset.generated_media_url && (
                      <button
                        onClick={() => handleGenerateImage(asset)}
                        disabled={generatingMediaAssetId === asset.id}
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        {generatingMediaAssetId === asset.id ? "Generating..." : "Generate Image"}
                      </button>
                    )}
                    {asset.generated_media_url && (
                      <button
                        onClick={() => handleAttachLatestMedia(asset)}
                        disabled={!workflowId || !selectedCampaignId || attachingMediaAssetId === asset.id}
                        className="btn-secondary"
                        title={!workflowId || !selectedCampaignId ? "Start a workflow and select a campaign first" : "Attach stored image to the selected campaign"}
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        {attachingMediaAssetId === asset.id ? "Attaching..." : "Attach to Campaign"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "24px", background: "#111622", border: "1px solid var(--border-accent)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
              Edit Content Asset
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Title</label>
                <input
                  type="text"
                  value={editingAsset.title}
                  onChange={(e) => setEditingAsset({ ...editingAsset, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Headline</label>
                <input
                  type="text"
                  value={editingAsset.headline || ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, headline: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Content / Body Copy (Guardrails Applied)</label>
                <textarea
                  rows={5}
                  value={editingAsset.body_copy || editingAsset.content}
                  onChange={(e) => setEditingAsset({ ...editingAsset, body_copy: e.target.value, content: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Call to Action</label>
                <input
                  type="text"
                  value={editingAsset.call_to_action || ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, call_to_action: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setEditingAsset(null)} className="btn-secondary" style={{ padding: "8px 16px" }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="btn-primary" style={{ padding: "8px 16px" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "24px", background: "#111622", border: "1px solid var(--border-accent)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
              Schedule Content Publishing
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Assign publication time for <strong>{scheduleTarget.title}</strong> on <strong>{scheduleTarget.channel}</strong>.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.9rem" }}
              />
            </div>

            <div style={{ padding: "10px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)", fontSize: "0.78rem", color: "#60a5fa", marginBottom: "20px" }}>
              Note: Unconfigured official social connectors will execute in the safe Simulated Sandbox without committing live external posts.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setScheduleTarget(null)} className="btn-secondary" style={{ padding: "8px 16px" }}>
                Cancel
              </button>
              <button onClick={handleScheduleSubmit} className="btn-primary" style={{ padding: "8px 16px" }}>
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
