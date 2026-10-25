import React, { useState, useEffect } from "react";
import {
  Rocket,
  Plus,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Layers,
  ArrowRight,
  Share2,
  FileText,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon,
  Check,
  HelpCircle,
  History
} from "lucide-react";
import type {
  BrandProfile,
  ProductItem,
  CampaignItem,
  CampaignContentItem,
  CampaignCalendarEntryItem,
  CampaignApprovalHistoryItem,
  MediaAssetItem
} from "../types";
import {
  fetchCampaignsList,
  createCampaign,
  fetchCampaignDetail,
  deleteCampaign,
  generateCampaignStrategy,
  fetchCampaignContent,
  createCampaignContent,
  generateContentVariants,
  attachAssetToCampaign,
  submitCampaignForReview,
  approveCampaign,
  rejectCampaign,
  requestCampaignRevision,
  markCampaignReadyToPublish,
  fetchCampaignApprovalHistory,
  fetchCalendarEntries,
  rescheduleCalendarEntry,
  fetchMediaAssets,
  resolveMediaUrl
} from "../services/api";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

interface CampaignManagerViewProps {
  activeBrand: BrandProfile | null;
  products: ProductItem[];
  workflowId?: string | null;
  marketingState?: any;
  onNavigateToStudio?: () => void;
  onNavigateToVideo?: () => void;
  onNavigateToLibrary?: () => void;
}

const OBJECTIVE_OPTIONS = [
  { id: "awareness", label: "Brand Awareness", desc: "Maximize reach and impressions for top-of-funnel recall." },
  { id: "traffic", label: "Website Traffic", desc: "Drive high-intent visits to catalog, storefront, or landing pages." },
  { id: "engagement", label: "Community Engagement", desc: "Boost social interactions, saves, shares, and discussions." },
  { id: "leads", label: "Lead Generation", desc: "Acquire newsletter signups, inquiries, and consultation requests." },
  { id: "conversions", label: "Direct Conversions", desc: "Optimize for verified add-to-carts and completed checkout conversions." },
  { id: "sales", label: "Product Sales & ROAS", desc: "Focus strictly on scalable revenue and return on ad spend." }
];

const AVAILABLE_CHANNELS = [
  { id: "instagram", label: "Instagram", color: "#E1306C", icon: "📸" },
  { id: "meta", label: "Meta / Facebook", color: "#1877F2", icon: "🌐" },
  { id: "google_search", label: "Google Search", color: "#4285F4", icon: "🔍" },
  { id: "youtube", label: "YouTube Shorts", color: "#FF0000", icon: "▶️" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "💼" },
  { id: "pinterest", label: "Pinterest", color: "#BD081C", icon: "📌" }
];

export const CampaignManagerView: React.FC<CampaignManagerViewProps> = ({
  activeBrand,
  products,
  onNavigateToStudio,
  onNavigateToVideo,
  onNavigateToLibrary
}) => {
  // Navigation tabs: 'dashboard' | 'wizard' | 'detail' | 'creative' | 'approval' | 'calendar'
  const [activeTab, setActiveTab] = useState<"dashboard" | "wizard" | "detail" | "creative" | "approval" | "calendar">("dashboard");

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Campaign Detail State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
  const [campaignContent, setCampaignContent] = useState<CampaignContentItem[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<CampaignApprovalHistoryItem[]>([]);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  // Creation Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [wizName, setWizName] = useState("");
  const [wizDesc, setWizDesc] = useState("");
  const [wizProductId, setWizProductId] = useState("");
  const [wizObjective, setWizObjective] = useState("conversions");
  const [wizSegment, setWizSegment] = useState("");
  const [wizGeography, setWizGeography] = useState("India Tier-1 metros and Tier-2 wellness hubs");
  const [wizChannels, setWizChannels] = useState<string[]>(["instagram", "meta"]);
  const [wizStartDate, setWizStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [wizEndDate, setWizEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [wizBudget, setWizBudget] = useState("25000");
  const [wizCurrency, setWizCurrency] = useState("INR");
  const [wizFrequency, setWizFrequency] = useState("4x per week");
  const [wizWindows, setWizWindows] = useState<string[]>(["Morning 09:00 - 11:00 IST", "Evening 18:00 - 21:00 IST"]);
  const [wizPrimaryKpi, setWizPrimaryKpi] = useState("ROAS >= 3.2x");
  const [wizSecondaryKpis, setWizSecondaryKpis] = useState("CTR > 2.0%, CAC < 450 INR");
  const [wizBrief, setWizBrief] = useState("");
  const [wizKeyMessages, setWizKeyMessages] = useState("Engineered for maximum performance, Verified authentic quality");
  const [wizOffer, setWizOffer] = useState("15% off first order with code LAUNCH15");
  const [wizCta, setWizCta] = useState("Shop Now");
  const [wizConstraints, setWizConstraints] = useState("Adhere to compliance guidelines. Do not make unsubstantiated claims.");
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false);

  // Creative Orchestrator State
  const [isCreateContentOpen, setIsCreateContentOpen] = useState(false);
  const [newContentChannel, setNewContentChannel] = useState("instagram");
  const [newContentHeadline, setNewContentHeadline] = useState("");
  const [newContentBody, setNewContentBody] = useState("");
  const [newContentCta, setNewContentCta] = useState("Shop Now");
  const [newContentHashtags, setNewContentHashtags] = useState("#ProductLaunch, #NewArrivals");
  const [newContentScheduleTime, setNewContentScheduleTime] = useState(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
  const [selectedMediaForContent, setSelectedMediaForContent] = useState<string>("");
  const [isSubmittingContent, setIsSubmittingContent] = useState(false);

  // Media Asset Picker Modal
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [pickerTargetContentId, setPickerTargetContentId] = useState<string | null>(null);
  const [availableMedia, setAvailableMedia] = useState<MediaAssetItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Content Variant Generator
  const [generatingVariantsForId, setGeneratingVariantsForId] = useState<string | null>(null);

  // Approval Modal State
  const [approvalModalType, setApprovalModalType] = useState<"approve" | "reject" | "revision" | "submit" | "ready_publish" | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Calendar State
  const [calendarEntries, setCalendarEntries] = useState<CampaignCalendarEntryItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [reschedulingEntry, setReschedulingEntry] = useState<CampaignCalendarEntryItem | null>(null);
  const [newRescheduleTime, setNewRescheduleTime] = useState("");
  const [calendarViewMode, setCalendarViewMode] = useState<"list" | "month">("list");

  // 1. Load Campaigns
  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCampaignsList({
        brand_id: activeBrand?.id,
        status: statusFilter !== "all" ? statusFilter : undefined
      });
      setCampaigns(data);
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [activeBrand?.id, statusFilter]);

  // Load detailed campaign data
  const loadCampaignDetail = async (id: string) => {
    try {
      const camp = await fetchCampaignDetail(id);
      setSelectedCampaign(camp);
      const content = await fetchCampaignContent(id);
      setCampaignContent(content);
      const history = await fetchCampaignApprovalHistory(id);
      setApprovalHistory(history);
    } catch (err: any) {
      console.error("Failed to load campaign details:", err);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignDetail(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // Load Calendar Entries
  const loadCalendar = async () => {
    setIsLoadingCalendar(true);
    try {
      const entries = await fetchCalendarEntries({
        brand_id: activeBrand?.id,
        campaign_id: selectedCampaignId || undefined
      });
      setCalendarEntries(entries);
    } catch (err: any) {
      console.error("Failed to load calendar entries:", err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (activeTab === "calendar") {
      loadCalendar();
    }
  }, [activeTab, activeBrand?.id, selectedCampaignId]);

  // Load workspace media assets for association
  const openMediaPicker = async (contentAssetId?: string) => {
    setPickerTargetContentId(contentAssetId || null);
    setIsMediaPickerOpen(true);
    setIsLoadingMedia(true);
    try {
      const assets = await fetchMediaAssets({ brand_id: activeBrand?.id });
      setAvailableMedia(assets);
    } catch (err) {
      console.error("Failed to load media assets for picker:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Handle Attach Media Asset
  const handleAttachMedia = async (mediaAssetId: string) => {
    if (!selectedCampaign) return;
    try {
      await attachAssetToCampaign(selectedCampaign.id, mediaAssetId, pickerTargetContentId || undefined);
      setIsMediaPickerOpen(false);
      await loadCampaignDetail(selectedCampaign.id);
    } catch (err: any) {
      alert(err.message || "Failed to attach media asset");
    }
  };

  // Handle Strategy Generation
  const handleGenerateStrategy = async () => {
    if (!selectedCampaign) return;
    setIsGeneratingStrategy(true);
    try {
      const strat = await generateCampaignStrategy(selectedCampaign.id, true);
      setSelectedCampaign((prev) => prev ? { ...prev, strategy_recommendation: strat } : null);
      await loadCampaignDetail(selectedCampaign.id);
    } catch (err: any) {
      alert(err.message || "Strategy generation failed");
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  // Handle Wizard Submit
  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand) {
      alert("Please select or configure an active workspace brand first.");
      return;
    }
    const budgetNum = parseFloat(wizBudget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      alert("Total budget must be a positive number.");
      return;
    }
    if (new Date(wizEndDate) <= new Date(wizStartDate)) {
      alert("End date must be after start date.");
      return;
    }

    setIsSubmittingWizard(true);
    try {
      const created = await createCampaign({
        name: wizName.trim(),
        description: wizDesc.trim(),
        brand_id: activeBrand.id,
        product_id: wizProductId || undefined,
        objective: wizObjective,
        customer_segment: wizSegment.trim(),
        geographic_target: wizGeography.trim(),
        channels: wizChannels,
        start_date: new Date(wizStartDate).toISOString(),
        end_date: new Date(wizEndDate).toISOString(),
        budget: budgetNum,
        currency: wizCurrency,
        content_frequency: wizFrequency,
        preferred_publishing_windows: wizWindows,
        primary_kpi: wizPrimaryKpi.trim(),
        secondary_kpis: wizSecondaryKpis.split(",").map((s) => s.trim()).filter(Boolean),
        brief: wizBrief.trim(),
        key_messages: wizKeyMessages.split(",").map((s) => s.trim()).filter(Boolean),
        offer: wizOffer.trim(),
        cta: wizCta.trim(),
        brand_constraints: wizConstraints.trim()
      });

      setCampaigns((prev) => [created, ...prev]);
      setSelectedCampaignId(created.id);
      setSelectedCampaign(created);
      setActiveTab("detail");
    } catch (err: any) {
      alert(err.message || "Failed to create campaign");
    } finally {
      setIsSubmittingWizard(false);
    }
  };

  // Handle Add Creative Content
  const handleAddContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setIsSubmittingContent(true);
    try {
      await createCampaignContent(selectedCampaign.id, {
        channel: newContentChannel,
        headline: newContentHeadline.trim(),
        body: newContentBody.trim(),
        body_copy: newContentBody.trim(),
        call_to_action: newContentCta.trim(),
        hashtags: newContentHashtags.split(",").map((h) => h.trim()).filter(Boolean),
        scheduled_time: newContentScheduleTime ? new Date(newContentScheduleTime).toISOString() : undefined,
        media_asset_id: selectedMediaForContent || undefined
      });
      setIsCreateContentOpen(false);
      setNewContentHeadline("");
      setNewContentBody("");
      setSelectedMediaForContent("");
      await loadCampaignDetail(selectedCampaign.id);
    } catch (err: any) {
      alert(err.message || "Failed to create content item");
    } finally {
      setIsSubmittingContent(false);
    }
  };

  // Handle Variant Generation
  const handleGenerateVariants = async (contentId: string) => {
    if (!selectedCampaign) return;
    setGeneratingVariantsForId(contentId);
    try {
      await generateContentVariants(selectedCampaign.id, contentId, {
        number_of_variants: 3,
        angles: ["direct_response", "storytelling", "social_proof"]
      });
      await loadCampaignDetail(selectedCampaign.id);
    } catch (err: any) {
      alert(err.message || "Variant generation failed");
    } finally {
      setGeneratingVariantsForId(null);
    }
  };

  // Handle State Machine Transitions
  const handleApprovalActionConfirm = async () => {
    if (!selectedCampaign || !approvalModalType) return;
    setIsProcessingApproval(true);
    try {
      let updated: CampaignItem;
      if (approvalModalType === "submit") {
        updated = await submitCampaignForReview(selectedCampaign.id, approvalComment);
      } else if (approvalModalType === "approve") {
        updated = await approveCampaign(selectedCampaign.id, approvalComment);
      } else if (approvalModalType === "reject") {
        if (!approvalComment.trim()) {
          alert("A specific rejection reason comment is required.");
          setIsProcessingApproval(false);
          return;
        }
        updated = await rejectCampaign(selectedCampaign.id, approvalComment);
      } else if (approvalModalType === "revision") {
        if (!approvalComment.trim()) {
          alert("Revision feedback details are required.");
          setIsProcessingApproval(false);
          return;
        }
        updated = await requestCampaignRevision(selectedCampaign.id, approvalComment);
      } else if (approvalModalType === "ready_publish") {
        updated = await markCampaignReadyToPublish(selectedCampaign.id, approvalComment);
      } else {
        return;
      }
      setSelectedCampaign(updated);
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setApprovalModalType(null);
      setApprovalComment("");
      await loadCampaignDetail(selectedCampaign.id);
    } catch (err: any) {
      alert(err.message || "Approval transition failed");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Reschedule calendar entry
  const handleConfirmReschedule = async () => {
    if (!reschedulingEntry || !newRescheduleTime) return;
    try {
      await rescheduleCalendarEntry(reschedulingEntry.schedule_id, new Date(newRescheduleTime).toISOString());
      setReschedulingEntry(null);
      await loadCalendar();
    } catch (err: any) {
      alert(err.message || "Failed to reschedule calendar entry");
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    const s = (status || "draft").toLowerCase();
    switch (s) {
      case "approved":
        return <span className="badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.4)" }}><CheckCircle2 size={12} /> Approved</span>;
      case "ready_to_publish":
        return <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.4)" }}><Send size={12} /> Ready to Publish</span>;
      case "pending_review":
        return <span className="badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.4)" }}><Clock size={12} /> In Review</span>;
      case "rejected":
        return <span className="badge" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.4)" }}><XCircle size={12} /> Rejected</span>;
      case "revision_requested":
        return <span className="badge" style={{ background: "rgba(236, 72, 153, 0.2)", color: "#ec4899", border: "1px solid rgba(236, 72, 153, 0.4)" }}><Edit3 size={12} /> Revisions Requested</span>;
      default:
        return <span className="badge" style={{ background: "rgba(148, 163, 184, 0.2)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.4)" }}><FileText size={12} /> Draft</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>
      {/* Top Banner & Module Navigation */}
      <div
        className="card"
        style={{
          padding: "24px",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontSize: "1.4rem" }}>🚀</span>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              AI Campaign Planner & Creative Orchestration
            </h2>
            <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={12} /> Milestone 4 Production
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: "700px" }}>
            Organize multi-channel marketing campaigns, synthesize structured AI strategies, orchestrate media from the Product and Video Studios, and enforce verified approval guardrails.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => {
              setActiveTab("wizard");
              setWizardStep(1);
            }}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", fontWeight: 600 }}
          >
            <Plus size={16} /> New Campaign Wizard
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "4px", overflowX: "auto" }}>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={activeTab === "dashboard" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Layers size={15} /> All Campaigns ({campaigns.length})
        </button>

        {selectedCampaign && (
          <>
            <button
              onClick={() => setActiveTab("detail")}
              className={activeTab === "detail" ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Sparkles size={15} /> Strategy & Overview
            </button>
            <button
              onClick={() => setActiveTab("creative")}
              className={activeTab === "creative" ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Share2 size={15} /> Creative Orchestrator ({campaignContent.length})
            </button>
            <button
              onClick={() => setActiveTab("approval")}
              className={activeTab === "approval" ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <ShieldCheck size={15} /> Approval State Machine
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("calendar")}
          className={activeTab === "calendar" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Calendar size={15} /> Publishing Calendar
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ALL CAMPAIGNS DASHBOARD
      ========================================================================= */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Summary KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div className="card" style={{ padding: "18px", borderLeft: "4px solid #818cf8" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Campaigns</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
                {campaigns.length}
              </div>
            </div>
            <div className="card" style={{ padding: "18px", borderLeft: "4px solid #f59e0b" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>In Review</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f59e0b", marginTop: "4px" }}>
                {campaigns.filter((c) => c.status === "pending_review").length}
              </div>
            </div>
            <div className="card" style={{ padding: "18px", borderLeft: "4px solid #10b981" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Approved & Staged</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
                {campaigns.filter((c) => c.status === "approved" || c.status === "ready_to_publish").length}
              </div>
            </div>
            <div className="card" style={{ padding: "18px", borderLeft: "4px solid #38bdf8" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Planned Budget</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#38bdf8", marginTop: "4px" }}>
                ₹{campaigns.reduce((acc, c) => acc + (c.budget || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {/* Filter Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["all", "draft", "pending_review", "approved", "ready_to_publish", "rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={statusFilter === st ? "btn btn-primary" : "btn btn-secondary"}
                  style={{ padding: "6px 14px", fontSize: "0.8rem", textTransform: "capitalize" }}
                >
                  {st.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: "12px", top: "10px", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 12px 8px 34px",
                    borderRadius: "8px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem"
                  }}
                />
              </div>
              <button onClick={loadCampaigns} className="btn btn-secondary" title="Refresh">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Campaigns Grid */}
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 12px" }} />
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px" }}>
              <Rocket size={40} style={{ color: "var(--text-muted)", margin: "0 auto 16px", opacity: 0.5 }} />
              <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "8px" }}>No Campaigns Found</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", maxWidth: "450px", margin: "0 auto 20px" }}>
                Create your first structured multi-channel campaign with target demographics, budget caps, creative assets, and review workflows.
              </p>
              <button
                onClick={() => {
                  setActiveTab("wizard");
                  setWizardStep(1);
                }}
                className="btn btn-primary"
              >
                Launch Campaign Wizard
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "18px" }}>
              {campaigns
                .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((camp) => (
                  <div
                    key={camp.id}
                    className="card"
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                      border: selectedCampaignId === camp.id ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                      boxShadow: selectedCampaignId === camp.id ? "0 0 15px rgba(99, 102, 241, 0.2)" : "none"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                          {camp.name}
                        </h4>
                        {renderStatusBadge(camp.status)}
                      </div>
                      <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", margin: "0 0 12px", minHeight: "36px" }}>
                        {camp.description || camp.brief || "Structured multi-channel marketing campaign."}
                      </p>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                        <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)", fontSize: "0.75rem" }}>
                          🎯 {camp.objective.toUpperCase()}
                        </span>
                        <span className="badge" style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", fontSize: "0.75rem" }}>
                          ₹{camp.budget.toLocaleString()} {camp.currency}
                        </span>
                        {camp.channels?.slice(0, 3).map((ch) => (
                          <span key={ch} className="badge" style={{ background: "rgba(255, 255, 255, 0.05)", fontSize: "0.75rem" }}>
                            {ch}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        <div>Duration: {camp.duration_days || 30} days</div>
                        <div>Creatives: {camp.content_count || 0} items</div>
                        <div>Primary KPI: {camp.primary_kpi || "ROAS"}</div>
                        <div>Media Linked: {camp.media_count || 0} assets</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
                      <button
                        onClick={() => {
                          setSelectedCampaignId(camp.id);
                          setSelectedCampaign(camp);
                          setActiveTab("detail");
                        }}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: "8px 12px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                      >
                        <Eye size={14} /> Open Campaign
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete campaign "${camp.name}"?`)) {
                            await deleteCampaign(camp.id);
                            loadCampaigns();
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "8px 12px", color: "var(--danger)" }}
                        title="Delete Campaign"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: CAMPAIGN CREATION WIZARD
      ========================================================================= */}
      {activeTab === "wizard" && (
        <div className="card" style={{ padding: "32px", maxWidth: "860px", margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Campaign Creation Wizard
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                Step {wizardStep} of 4: Define goals, audience, budget ceiling, channels, and brand constraints.
              </p>
            </div>
            <button onClick={() => setActiveTab("dashboard")} className="btn btn-secondary" style={{ padding: "6px 12px" }}>
              Cancel
            </button>
          </div>

          {/* Stepper Header */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
            {[
              { num: 1, label: "Basics & Goal" },
              { num: 2, label: "Targeting & Channels" },
              { num: 3, label: "Budget & Schedule" },
              { num: 4, label: "Brief & Compliance" }
            ].map((st) => (
              <div
                key={st.num}
                onClick={() => setWizardStep(st.num)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  background: wizardStep === st.num ? "rgba(99, 102, 241, 0.15)" : "var(--bg-secondary)",
                  border: wizardStep === st.num ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.75rem", color: wizardStep === st.num ? "var(--accent-primary)" : "var(--text-muted)" }}>
                  Step {st.num}
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {st.label}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateCampaignSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Step 1: Basics & Goal */}
            {wizardStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spring Radiance Launch 2026"
                    value={wizName}
                    onChange={(e) => setWizName(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Campaign Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief high-level overview of this marketing initiative..."
                    value={wizDesc}
                    onChange={(e) => setWizDesc(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Associated Product (Optional)
                  </label>
                  <select
                    value={wizProductId}
                    onChange={(e) => setWizProductId(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    <option value="">-- Workspace General / All Products --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.category || "General"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "10px", color: "var(--text-primary)" }}>
                    Primary Marketing Objective *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                    {OBJECTIVE_OPTIONS.map((obj) => (
                      <div
                        key={obj.id}
                        onClick={() => setWizObjective(obj.id)}
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          background: wizObjective === obj.id ? "rgba(99, 102, 241, 0.15)" : "var(--bg-secondary)",
                          border: wizObjective === obj.id ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: "4px" }}>
                          {obj.label}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {obj.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Targeting & Channels */}
            {wizardStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Target Customer Segment
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eco-conscious women aged 25-45 looking for clean skincare"
                    value={wizSegment}
                    onChange={(e) => setWizSegment(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Geographic Targeting
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India Tier-1 metros and Tier-2 wellness hubs"
                    value={wizGeography}
                    onChange={(e) => setWizGeography(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "10px", color: "var(--text-primary)" }}>
                    Supported Social & Ad Channels
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                    {AVAILABLE_CHANNELS.map((ch) => {
                      const isSelected = wizChannels.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => {
                            if (isSelected) {
                              setWizChannels(wizChannels.filter((c) => c !== ch.id));
                            } else {
                              setWizChannels([...wizChannels, ch.id]);
                            }
                          }}
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            background: isSelected ? "rgba(99, 102, 241, 0.15)" : "var(--bg-secondary)",
                            border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>{ch.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                            {ch.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Budget & Schedule */}
            {wizardStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Total Campaign Budget Ceiling *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={wizBudget}
                      onChange={(e) => setWizBudget(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Guardrail: AI strategy allocation will never exceed this budget cap.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Currency
                    </label>
                    <select
                      value={wizCurrency}
                      onChange={(e) => setWizCurrency(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Campaign Start Date
                    </label>
                    <input
                      type="date"
                      value={wizStartDate}
                      onChange={(e) => setWizStartDate(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Campaign End Date
                    </label>
                    <input
                      type="date"
                      value={wizEndDate}
                      onChange={(e) => setWizEndDate(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Publishing Cadence & Frequency
                  </label>
                  <input
                    type="text"
                    value={wizFrequency}
                    onChange={(e) => setWizFrequency(e.target.value)}
                    placeholder="e.g. 4x per week (2 Reels, 2 Carousel Posts)"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Primary KPI Target
                    </label>
                    <input
                      type="text"
                      value={wizPrimaryKpi}
                      onChange={(e) => setWizPrimaryKpi(e.target.value)}
                      placeholder="e.g. ROAS >= 3.5x"
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Secondary KPIs (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={wizSecondaryKpis}
                      onChange={(e) => setWizSecondaryKpis(e.target.value)}
                      placeholder="CTR > 2.0%, CAC < 450 INR"
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Preferred Publishing Windows (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={wizWindows.join(", ")}
                    onChange={(e) => setWizWindows(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    placeholder="e.g. Morning 09:00 - 11:00 IST, Evening 18:00 - 21:00 IST"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Brief & Compliance */}
            {wizardStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Creative Brief & Core Angle
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the main creative narrative, sensory hooks, and customer pain points to solve..."
                    value={wizBrief}
                    onChange={(e) => setWizBrief(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Key Messages (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified authentic quality, Direct-to-consumer value"
                    value={wizKeyMessages}
                    onChange={(e) => setWizKeyMessages(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Special Offer / Discount
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15% off first order with code GLOW15"
                      value={wizOffer}
                      onChange={(e) => setWizOffer(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                      Call to Action (CTA)
                    </label>
                    <input
                      type="text"
                      placeholder="Shop Now, Claim Offer, Learn More"
                      value={wizCta}
                      onChange={(e) => setWizCta(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text-primary)" }}>
                    Brand & Regulatory Constraints (AYUSH/FDA Guardrails)
                  </label>
                  <textarea
                    rows={2}
                    value={wizConstraints}
                    onChange={(e) => setWizConstraints(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "0.75rem", color: "#34d399" }}>
                    <ShieldCheck size={14} /> Built-in compliance checks prevent false medical or unverified therapeutic assertions.
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "20px" }}>
              <button
                type="button"
                onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
                disabled={wizardStep === 1}
                className="btn btn-secondary"
                style={{ opacity: wizardStep === 1 ? 0.4 : 1 }}
              >
                Back
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => Math.min(4, prev + 1))}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmittingWizard}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px" }}
                >
                  {isSubmittingWizard ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                  Create Campaign & Plan Strategy
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CAMPAIGN DETAIL & AI STRATEGY
      ========================================================================= */}
      {activeTab === "detail" && selectedCampaign && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Header Card */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    {selectedCampaign.name}
                  </h3>
                  {renderStatusBadge(selectedCampaign.status)}
                </div>
                <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  {selectedCampaign.description || "Campaign strategic overview and orchestrator."}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                    🎯 Goal: {selectedCampaign.objective.toUpperCase()}
                  </span>
                  <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                    Budget Ceiling: ₹{selectedCampaign.budget.toLocaleString()} {selectedCampaign.currency}
                  </span>
                  <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                    Cadence: {selectedCampaign.content_frequency || "Daily"}
                  </span>
                  <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                    Primary KPI: {selectedCampaign.primary_kpi || "ROAS"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleGenerateStrategy}
                  disabled={isGeneratingStrategy}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Sparkles size={15} className={isGeneratingStrategy ? "animate-spin" : ""} />
                  {isGeneratingStrategy ? "Synthesizing AI Plan..." : "Generate AI Strategy"}
                </button>
                <button
                  onClick={() => setActiveTab("creative")}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Share2 size={15} /> Content & Media ({campaignContent.length})
                </button>
                <button
                  onClick={() => setActiveTab("approval")}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <ShieldCheck size={15} /> Review & Approve
                </button>
              </div>
            </div>
          </div>

          {/* AI Strategy Breakdown */}
          {selectedCampaign.strategy_recommendation ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Demo Mode Notice */}
              {selectedCampaign.strategy_recommendation.is_demo && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "8px",
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    color: "#38bdf8",
                    fontSize: "0.85rem"
                  }}
                >
                  <HelpCircle size={18} />
                  <div>
                    <strong>Deterministic Demo Strategy Generated:</strong> Unconfigured live LLM credentials safely fell back to deterministic strategy synthesis. Zero paid calls were executed.
                  </div>
                </div>
              )}

              {/* Strategy Summary & Budget Distribution */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                <div className="card" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
                    Strategic Summary & Objective
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5, margin: "0 0 14px" }}>
                    {selectedCampaign.strategy_recommendation.summary || selectedCampaign.strategy_recommendation.campaign_summary}
                  </p>

                  <h5 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    Audience & Messaging Hypotheses
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedCampaign.strategy_recommendation.audience_hypotheses?.map((aud, i) => (
                      <div key={i} style={{ padding: "10px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", fontSize: "0.82rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-primary)", marginBottom: "3px" }}>
                          Segment: {aud.segment}
                        </div>
                        <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>
                          Pain Point: {aud.pain_point}
                        </div>
                        <div style={{ color: "var(--text-primary)", fontStyle: "italic" }}>
                          "{aud.hook}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget Distribution Ceiling */}
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                      Budget Allocation Guardrail
                    </h4>
                    <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                      Sum ≤ Total Budget
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                    {selectedCampaign.strategy_recommendation.budget_allocation?.map((item, i) => {
                      const pct = Math.round((item.allocated_amount / selectedCampaign.budget) * 100);
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 600, textTransform: "capitalize", color: "var(--text-primary)" }}>
                              {item.channel}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}>
                              ₹{item.allocated_amount.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent-primary)", borderRadius: "3px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", fontSize: "0.78rem", color: "#f59e0b" }}>
                    <strong>Zero-Cost Guardrail:</strong> Allocations are recommendations. Real external ad accounts will never be charged without explicit user approval.
                  </div>
                </div>
              </div>

              {/* Content Pillars & Recommended Formats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="card" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>
                    Content Pillars & Creative Angles
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedCampaign.strategy_recommendation.content_pillars?.map((cp, idx) => (
                      <div key={idx} style={{ padding: "10px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "3px" }}>
                          Pillar {idx + 1}: {cp.pillar}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {cp.theme}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>
                    Recommended Asset Formats & Channels
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {selectedCampaign.strategy_recommendation.asset_formats?.map((af, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        <CheckCircle2 size={15} style={{ color: "var(--accent-primary)" }} />
                        {af}
                      </div>
                    ))}
                  </div>

                  <h5 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" }}>
                    Publishing Windows & Cadence
                  </h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedCampaign.strategy_recommendation.publishing_calendar?.map((pw, idx) => (
                      <div key={idx} style={{ padding: "8px 12px", borderRadius: "6px", background: "var(--bg-secondary)", fontSize: "0.8rem" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{pw.window}</strong>: {pw.best_days.join(", ")} — <em>{pw.focus}</em>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "50px" }}>
              <Sparkles size={36} style={{ color: "var(--accent-primary)", margin: "0 auto 14px" }} />
              <h4 style={{ fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "8px" }}>
                AI Strategy Not Yet Generated
              </h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", maxWidth: "500px", margin: "0 auto 20px" }}>
                Generate a structured, provider-agnostic campaign plan synthesizing channel mixes, audience hooks, content pillars, publishing schedules, and budget allocations.
              </p>
              <button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy} className="btn btn-primary">
                {isGeneratingStrategy ? "Synthesizing AI Plan..." : "Generate AI Strategy Now"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: CREATIVE ORCHESTRATION & VARIANTS
      ========================================================================= */}
      {activeTab === "creative" && selectedCampaign && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header & Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Creative Orchestration for "{selectedCampaign.name}"
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Associate studio photos and videos, generate creative copy angles, and prepare content items for publishing.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => openMediaPicker()}
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ImageIcon size={14} /> Link Media Asset
              </button>
              <button
                onClick={() => setIsCreateContentOpen(true)}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={14} /> Add Content Post
              </button>
            </div>
          </div>

          {/* Content Items List */}
          {campaignContent.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px" }}>
              <Share2 size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px", opacity: 0.5 }} />
              <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "6px" }}>No Creative Content Items Yet</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto 18px" }}>
                Add your first platform post, attach media generated from the Product Studio or Video Studio, and generate angle variants.
              </p>
              <button onClick={() => setIsCreateContentOpen(true)} className="btn btn-primary">
                Create First Content Post
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
              {campaignContent.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px"
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span className="badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary)", textTransform: "capitalize" }}>
                        {item.channel}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        v{item.version} • {item.angle || "Base Creative"}
                      </span>
                    </div>

                    {/* Media Preview if attached */}
                    {item.generated_media_url ? (
                      <div style={{ borderRadius: "8px", overflow: "hidden", maxHeight: "180px", marginBottom: "12px", background: "#000" }}>
                        {item.generated_media_url.endsWith(".mp4") || item.generated_media_url.includes("video") ? (
                          <video
                            src={resolveMediaUrl(item.generated_media_url)}
                            controls
                            style={{ width: "100%", maxHeight: "180px", objectFit: "contain" }}
                          />
                        ) : (
                          <ProtectedMediaImage
                            mediaUrl={item.generated_media_url}
                            alt={item.headline || "Content Asset"}
                            style={{ width: "100%", height: "180px", objectFit: "cover" }}
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => openMediaPicker(item.id)}
                        style={{
                          height: "90px",
                          borderRadius: "8px",
                          border: "1px dashed var(--border-subtle)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          marginBottom: "12px",
                          background: "rgba(255, 255, 255, 0.02)"
                        }}
                      >
                        <ImageIcon size={18} style={{ color: "var(--text-muted)", marginBottom: "4px" }} />
                        <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>+ Attach Studio Media</span>
                      </div>
                    )}

                    {/* Headline & Body Copy */}
                    <h5 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                      {item.headline || item.title}
                    </h5>
                    <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.4 }}>
                      {item.body_copy || item.body || item.content}
                    </p>

                    {/* Call to action & hashtags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                      {item.call_to_action && (
                        <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.72rem" }}>
                          CTA: {item.call_to_action}
                        </span>
                      )}
                      {item.hashtags?.map((h, idx) => (
                        <span key={idx} style={{ fontSize: "0.75rem", color: "var(--accent-primary)" }}>
                          {h}
                        </span>
                      ))}
                    </div>

                    {item.scheduled_time && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> Scheduled: {new Date(item.scheduled_time).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
                    <button
                      onClick={() => handleGenerateVariants(item.id)}
                      disabled={generatingVariantsForId === item.id}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: "6px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      <Sparkles size={13} className={generatingVariantsForId === item.id ? "animate-spin" : ""} />
                      {generatingVariantsForId === item.id ? "Generating..." : "Generate 3 Angles"}
                    </button>
                    <button
                      onClick={() => openMediaPicker(item.id)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                      title="Attach or replace media"
                    >
                      <ImageIcon size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: APPROVAL WORKFLOW & STATE MACHINE
      ========================================================================= */}
      {activeTab === "approval" && selectedCampaign && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* State Stepper Visualizer */}
          <div className="card" style={{ padding: "24px" }}>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
              Campaign Approval Lifecycle & State Machine
            </h4>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "24px" }}>
              {[
                { key: "draft", label: "Draft" },
                { key: "pending_review", label: "Pending Review" },
                { key: "approved", label: "Approved" },
                { key: "ready_to_publish", label: "Ready to Publish" }
              ].map((step, idx) => {
                const isCurrent = (selectedCampaign.status || "draft").toLowerCase() === step.key;
                return (
                  <React.Fragment key={step.key}>
                    <div
                      style={{
                        padding: "10px 16px",
                        borderRadius: "8px",
                        background: isCurrent ? "rgba(99, 102, 241, 0.2)" : "var(--bg-secondary)",
                        border: isCurrent ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: isCurrent ? "var(--accent-primary)" : "var(--text-muted)" }}>
                        Stage {idx + 1}
                      </div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {step.label}
                      </div>
                    </div>
                    {idx < 3 && <ChevronRight size={18} style={{ color: "var(--text-muted)", opacity: 0.5 }} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Current Status Banner */}
            <div style={{ padding: "16px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Current Workflow Status:</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  {renderStatusBadge(selectedCampaign.status)}
                  {selectedCampaign.rejection_reason && (
                    <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>
                      Reason: {selectedCampaign.rejection_reason}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons based on status */}
              <div style={{ display: "flex", gap: "10px" }}>
                {selectedCampaign.status === "draft" && (
                  <button
                    onClick={() => {
                      setApprovalModalType("submit");
                      setApprovalComment("Submitting draft campaign for team review.");
                    }}
                    className="btn btn-primary"
                  >
                    Submit for Review
                  </button>
                )}

                {selectedCampaign.status === "pending_review" && (
                  <>
                    <button
                      onClick={() => {
                        setApprovalModalType("reject");
                        setApprovalComment("");
                      }}
                      className="btn btn-secondary"
                      style={{ color: "var(--danger)" }}
                    >
                      Reject with Comments
                    </button>
                    <button
                      onClick={() => {
                        setApprovalModalType("revision");
                        setApprovalComment("");
                      }}
                      className="btn btn-secondary"
                    >
                      Request Revisions
                    </button>
                    <button
                      onClick={() => {
                        setApprovalModalType("approve");
                        setApprovalComment("Approved for staging.");
                      }}
                      className="btn btn-primary"
                    >
                      Approve Campaign
                    </button>
                  </>
                )}

                {selectedCampaign.status === "approved" && (
                  <button
                    onClick={() => {
                      setApprovalModalType("ready_publish");
                      setApprovalComment("Staged and ready for connectors.");
                    }}
                    className="btn btn-primary"
                  >
                    Mark Ready to Publish
                  </button>
                )}

                {(selectedCampaign.status === "rejected" || selectedCampaign.status === "revision_requested") && (
                  <button
                    onClick={() => {
                      setApprovalModalType("revision");
                      setApprovalComment("Reopening draft for revisions.");
                    }}
                    className="btn btn-primary"
                  >
                    Reopen for Editing
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Immutable Audit Log History */}
          <div className="card" style={{ padding: "24px" }}>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <History size={16} /> Immutable Approval & Action History Trail
            </h4>

            {approvalHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                No approval records logged yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {approvalHistory.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: "14px",
                      borderRadius: "8px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", textTransform: "capitalize" }}>
                          {h.action.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          ({h.from_status} → {h.to_status})
                        </span>
                      </div>
                      <div style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                        {h.comment || "No comment provided."}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      <div>Actor: {h.actor_id}</div>
                      <div>{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: CAMPAIGN PUBLISHING CALENDAR
      ========================================================================= */}
      {activeTab === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Calendar Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Publishing Calendar & Schedule
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Chronological schedule of planned content entries across channels with date rescheduling validation.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCalendarViewMode("list")}
                className={calendarViewMode === "list" ? "btn btn-primary" : "btn btn-secondary"}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >
                List View
              </button>
              <button
                onClick={() => setCalendarViewMode("month")}
                className={calendarViewMode === "month" ? "btn btn-primary" : "btn btn-secondary"}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >
                Month Grid
              </button>
              <button onClick={loadCalendar} className="btn btn-secondary" title="Refresh Calendar">
                <RefreshCw size={14} className={isLoadingCalendar ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Calendar Items */}
          {isLoadingCalendar ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 12px" }} />
              Loading calendar schedule...
            </div>
          ) : calendarEntries.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px" }}>
              <Calendar size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px", opacity: 0.5 }} />
              <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "6px" }}>No Scheduled Content Entries</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "450px", margin: "0 auto" }}>
                Add content items with scheduled publishing times in your campaign creative orchestrator to populate this calendar.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {calendarEntries.map((entry) => (
                <div
                  key={entry.schedule_id}
                  className="card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderLeft: "4px solid var(--accent-primary)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--accent-primary)", fontWeight: 700 }}>
                        {new Date(entry.scheduled_time).toLocaleString("en-US", { month: "short" }).toUpperCase()}
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {new Date(entry.scheduled_time).getDate()}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)", fontSize: "0.75rem", textTransform: "capitalize" }}>
                          {entry.channel}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {entry.campaign_name}
                        </span>
                      </div>
                      <h5 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 2px", color: "var(--text-primary)" }}>
                        {entry.headline || entry.title}
                      </h5>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {entry.content_snippet}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <div>{new Date(entry.scheduled_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST</div>
                      <div style={{ color: "#34d399" }}>{entry.is_simulated || "PLANNED"}</div>
                    </div>

                    <button
                      onClick={() => {
                        setReschedulingEntry(entry);
                        setNewRescheduleTime(new Date(entry.scheduled_time).toISOString().slice(0, 16));
                      }}
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Clock size={13} /> Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD CONTENT ITEM
      ========================================================================= */}
      {isCreateContentOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "550px", width: "100%", padding: "24px" }}>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
              Create Creative Content Post
            </h4>

            <form onSubmit={handleAddContentSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Channel *
                </label>
                <select
                  value={newContentChannel}
                  onChange={(e) => setNewContentChannel(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  {AVAILABLE_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Headline / Hook *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Experience the Next-Gen Performance Upgrade"
                  value={newContentHeadline}
                  onChange={(e) => setNewContentHeadline(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Primary Copy / Caption *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Platform caption highlighting clean ingredients and verified benefits..."
                  value={newContentBody}
                  onChange={(e) => setNewContentBody(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                    Call To Action
                  </label>
                  <input
                    type="text"
                    value={newContentCta}
                    onChange={(e) => setNewContentCta(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newContentScheduleTime}
                    onChange={(e) => setNewContentScheduleTime(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-primary)" }}>
                  Hashtags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newContentHashtags}
                  onChange={(e) => setNewContentHashtags(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setIsCreateContentOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingContent} className="btn btn-primary">
                  {isSubmittingContent ? "Saving..." : "Save Content Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: MEDIA ASSET PICKER
      ========================================================================= */}
      {isMediaPickerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "780px", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Select Asset from Central Media Library
              </h4>
              <button onClick={() => setIsMediaPickerOpen(false)} className="btn btn-secondary" style={{ padding: "4px 8px" }}>
                ✕
              </button>
            </div>

            {isLoadingMedia ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Loading media assets...</div>
            ) : availableMedia.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <p>No media assets found in workspace. Create product photos or video animations:</p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "12px", flexWrap: "wrap" }}>
                  {onNavigateToStudio && (
                    <button onClick={() => { setIsMediaPickerOpen(false); onNavigateToStudio(); }} className="btn btn-secondary" style={{ fontSize: "0.8rem" }}>
                      Open Product Studio
                    </button>
                  )}
                  {onNavigateToVideo && (
                    <button onClick={() => { setIsMediaPickerOpen(false); onNavigateToVideo(); }} className="btn btn-secondary" style={{ fontSize: "0.8rem" }}>
                      Open Video Studio
                    </button>
                  )}
                  {onNavigateToLibrary && (
                    <button onClick={() => { setIsMediaPickerOpen(false); onNavigateToLibrary(); }} className="btn btn-secondary" style={{ fontSize: "0.8rem" }}>
                      Browse Media Library
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px", paddingRight: "6px" }}>
                {availableMedia.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleAttachMedia(m.id)}
                    style={{
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-secondary)",
                      cursor: "pointer",
                      transition: "transform 0.15s ease"
                    }}
                  >
                    <div style={{ height: "120px", background: "#000" }}>
                      {m.asset_type === "video" ? (
                        <video src={resolveMediaUrl(m.media_url)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <ProtectedMediaImage mediaUrl={m.media_url} alt={m.prompt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ padding: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.provider} ({m.aspect_ratio})
                      </div>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.prompt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: APPROVAL / REJECTION CONFIRMATION
      ========================================================================= */}
      {approvalModalType && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)", textTransform: "capitalize" }}>
              {approvalModalType.replace(/_/g, " ")} Campaign
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
              {approvalModalType === "reject"
                ? "Provide a mandatory rejection reason to return the campaign to editing."
                : approvalModalType === "revision"
                ? "Provide specific feedback on which sections require adjustments."
                : "Add optional confirmation comments for the audit history log."}
            </p>

            <textarea
              rows={3}
              required={approvalModalType === "reject" || approvalModalType === "revision"}
              placeholder="Enter feedback comments for the immutable audit trail..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", marginBottom: "16px" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setApprovalModalType(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleApprovalActionConfirm}
                disabled={isProcessingApproval}
                className="btn btn-primary"
                style={{
                  background: approvalModalType === "reject" ? "var(--danger)" : undefined
                }}
              >
                {isProcessingApproval ? "Updating..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: RESCHEDULE CALENDAR ENTRY
      ========================================================================= */}
      {reschedulingEntry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "440px", width: "100%", padding: "24px" }}>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>
              Reschedule Content Entry
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
              Update the scheduled ISO publishing timestamp for "{reschedulingEntry.headline || reschedulingEntry.title}".
            </p>

            <input
              type="datetime-local"
              value={newRescheduleTime}
              onChange={(e) => setNewRescheduleTime(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", marginBottom: "16px" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setReschedulingEntry(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmReschedule} className="btn btn-primary">
                Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
