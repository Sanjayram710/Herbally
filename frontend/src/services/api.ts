import type {
  MarketingState,
  MediaAssetItem,
  ProductItem,
  UniversalOnboardingRequest,
  UniversalOnboardingResponse,
  OnboardingStatusResponse,
  ProviderInfo,
  StudioGenerateRequest,
  StudioGenerateResponse,
  MediaDeleteResponse,
  VideoProviderInfo,
  VideoJobItem,
  VideoJobCreateRequest,
  CampaignItem,
  CampaignCreatePayload,
  CampaignUpdatePayload,
  CampaignContentItem,
  CampaignContentCreatePayload,
  CampaignCalendarEntryItem,
  CampaignStrategyOutput,
  CampaignApprovalHistoryItem,
} from "../types";

export const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8001/api"
    : (import.meta.env.VITE_API_BASE as string | undefined) || "http://localhost:8001/api";
const configuredToken = import.meta.env.VITE_HERBALLY_API_TOKEN as string | undefined;
// The fallback exists only for the explicitly local backend default. Production
// builds must receive an authentication mechanism from their deployment setup.
const API_TOKEN = configuredToken || (import.meta.env.DEV ? "herbally-local-dev-token" : "");

async function fetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const activeToken =
    (typeof localStorage !== "undefined" && localStorage.getItem("dm_api_token")) ||
    API_TOKEN ||
    "herbally-local-dev-token";
  if (activeToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${activeToken}`);
  }
  return globalThis.fetch(input, { ...init, headers });
}

export function resolveMediaUrl(mediaUrl: string): string {
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const apiOrigin = API_BASE.replace(/\/api$/, "");
  return `${apiOrigin}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;
}

export async function fetchProtectedMedia(mediaUrl: string): Promise<string> {
  const res = await fetch(resolveMediaUrl(mediaUrl));
  if (!res.ok) throw new Error("Unable to load protected media preview");
  return URL.createObjectURL(await res.blob());
}

export async function submitOnboarding(payload: UniversalOnboardingRequest): Promise<UniversalOnboardingResponse> {
  const res = await fetch(`${API_BASE}/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Onboarding submission failed" }));
    throw new Error(err.detail || "Onboarding failed");
  }
  return res.json();
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatusResponse> {
  const res = await fetch(`${API_BASE}/onboarding/status`);
  if (!res.ok) throw new Error("Failed to load onboarding status");
  return res.json();
}

export async function fetchProducts(brandId?: string): Promise<ProductItem[]> {
  const url = brandId ? `${API_BASE}/products?brand_id=${encodeURIComponent(brandId)}` : `${API_BASE}/products`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function createProduct(productData: Partial<ProductItem>): Promise<ProductItem> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create product" }));
    throw new Error(err.detail || "Product creation failed");
  }
  return res.json();
}

export async function updateProduct(productId: string, productData: Partial<ProductItem>): Promise<ProductItem> {
  const res = await fetch(`${API_BASE}/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update product" }));
    throw new Error(err.detail || "Product update failed");
  }
  return res.json();
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/products/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

export async function uploadProductImage(
  productId: string,
  file: File
): Promise<{ success: boolean; image_url: string; media_asset: any }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/products/${productId}/image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to upload product image" }));
    throw new Error(err.detail || "Product image upload failed");
  }
  return res.json();
}

export async function runMarketingWorkflow(payload: {
  product_name: string;
  brand: string;
  market: string;
  marketing_goal: string;
  budget: number;
  duration_days: number;
  product_id?: string;
  target_audience_hint?: string;
}): Promise<{ workflow_id: string; status: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/marketing/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Workflow execution failed" }));
    throw new Error(err.detail || "Workflow execution failed");
  }
  return res.json();
}

export async function approveWorkflowCampaign(
  workflowId: string,
  campaignId: string = "all"
): Promise<{ workflow_id: string; status: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to approve campaign" }));
    throw new Error(err.detail || "Approval failed");
  }
  return res.json();
}

export async function launchSimulatedCampaign(
  workflowId: string,
  campaignId?: string
): Promise<{ workflow_id: string; status: string; state: MarketingState; message: string }> {
  const res = await fetch(`${API_BASE}/campaigns/launch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId, campaign_id: campaignId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Campaign simulation launch failed" }));
    throw new Error(err.detail || "Launch failed");
  }
  return res.json();
}

export async function iterateNextCampaign(
  workflowId: string
): Promise<{ workflow_id: string; current_iteration: number; state: MarketingState; message: string }> {
  const res = await fetch(`${API_BASE}/campaigns/iterate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create next campaign iteration" }));
    throw new Error(err.detail || "Iteration failed");
  }
  return res.json();
}

export async function uploadCampaignCsv(
  file: File,
  workflowId?: string
): Promise<{
  filename: string;
  rows_parsed: number;
  message: string;
  analytics: any;
  recommendations: any[];
  next_best_action: any;
  updated_state?: MarketingState;
}> {
  const formData = new FormData();
  formData.append("file", file);
  if (workflowId) {
    formData.append("workflow_id", workflowId);
  }

  const res = await fetch(`${API_BASE}/analytics/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "CSV upload failed" }));
    throw new Error(err.detail || "CSV upload failed");
  }
  return res.json();
}

export async function fetchWorkflowState(
  workflowId: string
): Promise<{ workflow_id: string; status: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/marketing/workflow/${workflowId}`);
  if (!res.ok) throw new Error("Failed to load workflow state");
  return res.json();
}

export async function updateCampaignStatus(
  workflowId: string,
  campaignId: string,
  status: string
): Promise<{ workflow_id: string; campaign_id: string; status: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId, status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update campaign status" }));
    throw new Error(err.detail || "Status update failed");
  }
  return res.json();
}

export async function resetCampaignRun(
  workflowId: string,
  campaignId: string
): Promise<{ workflow_id: string; campaign_id: string; status: string; state: MarketingState; message: string }> {
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to reset campaign" }));
    throw new Error(err.detail || "Reset failed");
  }
  return res.json();
}

export async function selectCampaign(
  workflowId: string,
  campaignId: string
): Promise<{ workflow_id: string; selected_campaign_id: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to select campaign" }));
    throw new Error(err.detail || "Selection failed");
  }
  return res.json();
}

export async function reviseCampaign(
  workflowId: string,
  campaignId: string,
  recommendationId?: string
): Promise<{ workflow_id: string; source_campaign_id: string; current_iteration: number; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId, recommendation_id: recommendationId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to revise campaign" }));
    throw new Error(err.detail || "Revision failed");
  }
  return res.json();
}

export async function createCampaignFromAssets(
  workflowId: string,
  campaign: any
): Promise<{ workflow_id: string; campaign_id: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/campaigns/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId, campaign }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create campaign" }));
    throw new Error(err.detail || "Campaign creation failed");
  }
  return res.json();
}

export async function downloadReport(workflowId: string, format: "markdown" | "json"): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${workflowId}/${format}`);
  if (!res.ok) throw new Error("Failed to download report");
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `herbally-report-${workflowId}.${format === "markdown" ? "md" : "json"}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// Executive Dashboard
// -------------------------------------------------------------
export async function fetchDashboardSummary(brandId?: string): Promise<any> {
  const url = brandId ? `${API_BASE}/dashboard/summary?brand_id=${encodeURIComponent(brandId)}` : `${API_BASE}/dashboard/summary`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load dashboard summary");
  return res.json();
}

// -------------------------------------------------------------
// Brand Intelligence & Onboarding
// -------------------------------------------------------------
export async function fetchBrands(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/brands`);
  if (!res.ok) throw new Error("Failed to load brands");
  return res.json();
}

export async function createBrand(brandData: any): Promise<any> {
  const res = await fetch(`${API_BASE}/brands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brandData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create brand" }));
    throw new Error(err.detail || "Brand creation failed");
  }
  return res.json();
}

export async function updateBrand(brandId: string, updates: any): Promise<any> {
  const res = await fetch(`${API_BASE}/brands/${brandId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update brand");
  return res.json();
}

export async function ingestBrandWebsite(url: string): Promise<any> {
  const res = await fetch(`${API_BASE}/brands/ingest-website`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "SSRF validation or fetch failed" }));
    throw new Error(err.detail || "Website ingestion failed");
  }
  return res.json();
}

// -------------------------------------------------------------
// AI Content Studio & Calendar
// -------------------------------------------------------------
export async function fetchContentAssets(brandId?: string, channel?: string): Promise<any[]> {
  let url = `${API_BASE}/content/assets`;
  const params = new URLSearchParams();
  if (brandId) params.append("brand_id", brandId);
  if (channel) params.append("channel", channel);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load content assets");
  return res.json();
}

export async function generateContentAssets(payload: {
  brand_id?: string;
  product_id?: string;
  channels: string[];
  asset_types: string[];
}): Promise<any[]> {
  const res = await fetch(`${API_BASE}/content/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to generate content assets");
  return res.json();
}

export async function generateContentAssetImage(
  assetId: string,
  options: { confirmed: boolean; size?: string; quality?: "low" | "medium" | "high" }
): Promise<{ media: MediaAssetItem; content_asset_id: string; generated_media_url: string; message: string }> {
  const res = await fetch(`${API_BASE}/content/assets/${assetId}/media/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      confirmed: options.confirmed,
      size: options.size || "1024x1024",
      quality: options.quality || "low",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Image generation failed" }));
    throw new Error(err.detail || "Image generation failed");
  }
  return res.json();
}

export async function fetchContentAssetMedia(assetId: string): Promise<MediaAssetItem[]> {
  const res = await fetch(`${API_BASE}/content/assets/${assetId}/media`);
  if (!res.ok) throw new Error("Failed to load generated media");
  return res.json();
}

export async function attachMediaToCampaign(
  workflowId: string,
  campaignId: string,
  mediaAssetId: string
): Promise<{ workflow_id: string; campaign_id: string; media_asset_id: string; state: MarketingState }> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/campaigns/${campaignId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_asset_id: mediaAssetId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to attach media to campaign" }));
    throw new Error(err.detail || "Failed to attach media to campaign");
  }
  return res.json();
}

export async function createContentAsset(data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/content/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create content asset");
  return res.json();
}

export async function updateContentAsset(assetId: string, updates: any): Promise<any> {
  const res = await fetch(`${API_BASE}/content/assets/${assetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update content asset");
  return res.json();
}

export async function duplicateContentAsset(assetId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/assets/${assetId}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate content asset");
  return res.json();
}

export async function deleteContentAsset(assetId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/assets/${assetId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete content asset");
  return res.json();
}

export async function scheduleContentAsset(assetId: string, channel: string, scheduledTime: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/assets/${assetId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, scheduled_time: scheduledTime }),
  });
  if (!res.ok) throw new Error("Failed to schedule content asset");
  return res.json();
}

export async function fetchContentSchedules(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/content/schedules`);
  if (!res.ok) throw new Error("Failed to load schedules");
  return res.json();
}

export async function triggerPublishDemo(scheduleId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/content/schedules/${scheduleId}/publish-demo`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to execute simulated publishing");
  return res.json();
}

// -------------------------------------------------------------
// Campaign Manager
// -------------------------------------------------------------
export async function fetchAllCampaigns(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/campaigns`);
  if (!res.ok) throw new Error("Failed to load campaigns");
  return res.json();
}

// -------------------------------------------------------------
// AI Marketing Assistant
// -------------------------------------------------------------
export async function sendAssistantMessage(brandId: string, content: string): Promise<any> {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brand_id: brandId, content }),
  });
  if (!res.ok) throw new Error("Assistant response failed");
  return res.json();
}

export async function fetchAssistantHistory(brandId?: string): Promise<any[]> {
  const url = brandId ? `${API_BASE}/assistant/history?brand_id=${encodeURIComponent(brandId)}` : `${API_BASE}/assistant/history`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load assistant history");
  return res.json();
}

// -------------------------------------------------------------
// Automation Center
// -------------------------------------------------------------
export async function fetchAutomationRules(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/automations/rules`);
  if (!res.ok) throw new Error("Failed to load automation rules");
  return res.json();
}

export async function toggleAutomationRule(ruleId: string, isEnabled: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/automations/rules/${ruleId}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
  if (!res.ok) throw new Error("Failed to toggle automation rule");
  return res.json();
}

export async function runAutomationRule(ruleId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/automations/rules/${ruleId}/run`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to execute automation rule");
  return res.json();
}

export async function fetchAutomationExecutions(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/automations/executions`);
  if (!res.ok) throw new Error("Failed to load automation executions");
  return res.json();
}

// -------------------------------------------------------------
// Integrations
// -------------------------------------------------------------
export async function fetchIntegrations(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/integrations`);
  if (!res.ok) throw new Error("Failed to load integrations");
  return res.json();
}

export async function testIntegrationConnection(integrationId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/integrations/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integration_id: integrationId }),
  });
  if (!res.ok) throw new Error("Failed to test integration");
  return res.json();
}

// -------------------------------------------------------------
// Customer Messages & Reviews
// -------------------------------------------------------------
export async function fetchCustomerMessages(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/customer-messages`);
  if (!res.ok) throw new Error("Failed to load customer messages");
  return res.json();
}

export async function updateCustomerMessageReply(messageId: string, draftReply: string): Promise<any> {
  const res = await fetch(`${API_BASE}/customer-messages/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft_reply: draftReply }),
  });
  if (!res.ok) throw new Error("Failed to update reply");
  return res.json();
}

export async function approveAndSendCustomerMessage(messageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/customer-messages/${messageId}/approve-send`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to approve and simulate send");
  return res.json();
}

// -------------------------------------------------------------
// Landing Page & Presence
// -------------------------------------------------------------
export async function fetchLandingPageDraft(brandId?: string): Promise<any> {
  const url = brandId ? `${API_BASE}/landing-page?brand_id=${encodeURIComponent(brandId)}` : `${API_BASE}/landing-page`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load landing page draft");
  return res.json();
}

export async function updateLandingPageDraft(brandId: string | undefined, data: any): Promise<any> {
  const url = brandId ? `${API_BASE}/landing-page?brand_id=${encodeURIComponent(brandId)}` : `${API_BASE}/landing-page`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update landing page");
  return res.json();
}

// -------------------------------------------------------------
// Media Library & AI Product Studio
// -------------------------------------------------------------
export async function fetchMediaAssets(params?: {
  brand_id?: string;
  asset_type?: string;
  product_id?: string;
  search?: string;
}): Promise<MediaAssetItem[]> {
  const query = new URLSearchParams();
  if (params?.brand_id) query.set("brand_id", params.brand_id);
  if (params?.asset_type) query.set("asset_type", params.asset_type);
  if (params?.product_id) query.set("product_id", params.product_id);
  if (params?.search) query.set("search", params.search);
  const qStr = query.toString();
  const url = qStr ? `${API_BASE}/media?${qStr}` : `${API_BASE}/media`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load workspace media library");
  return res.json();
}

export async function fetchImageProviders(): Promise<ProviderInfo[]> {
  const res = await fetch(`${API_BASE}/media/providers`);
  if (!res.ok) throw new Error("Failed to load image providers");
  return res.json();
}

export async function generateStudioAsset(payload: StudioGenerateRequest): Promise<StudioGenerateResponse> {
  const res = await fetch(`${API_BASE}/media/studio/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Studio asset generation failed" }));
    throw new Error(err.detail || "Studio asset generation failed");
  }
  return res.json();
}

export async function deleteMediaAsset(mediaId: string): Promise<MediaDeleteResponse> {
  const res = await fetch(`${API_BASE}/media/${encodeURIComponent(mediaId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete media asset" }));
    throw new Error(err.detail || "Failed to delete media asset");
  }
  return res.json();
}

export async function fetchVideoProviders(): Promise<VideoProviderInfo[]> {
  const res = await fetch(`${API_BASE}/video/providers`);
  if (!res.ok) throw new Error("Failed to load video providers");
  return res.json();
}

export async function createVideoJob(payload: VideoJobCreateRequest): Promise<VideoJobItem> {
  const res = await fetch(`${API_BASE}/video/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create video job" }));
    throw new Error(err.detail || "Failed to create video job");
  }
  return res.json();
}

export async function fetchVideoJobs(params?: {
  brand_id?: string;
  product_id?: string;
}): Promise<VideoJobItem[]> {
  const query = new URLSearchParams();
  if (params?.brand_id) query.set("brand_id", params.brand_id);
  if (params?.product_id) query.set("product_id", params.product_id);
  const qStr = query.toString();
  const url = qStr ? `${API_BASE}/video/jobs?${qStr}` : `${API_BASE}/video/jobs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load video generation history");
  return res.json();
}

export async function fetchVideoJob(jobId: string): Promise<VideoJobItem> {
  const res = await fetch(`${API_BASE}/video/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error("Failed to poll video job status");
  return res.json();
}

export async function cancelVideoJob(jobId: string): Promise<VideoJobItem> {
  const res = await fetch(`${API_BASE}/video/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to cancel video job" }));
    throw new Error(err.detail || "Failed to cancel video job");
  }
  return res.json();
}

export async function retryVideoJob(jobId: string): Promise<VideoJobItem> {
  const res = await fetch(`${API_BASE}/video/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to retry video job" }));
    throw new Error(err.detail || "Failed to retry video job");
  }
  return res.json();
}

// -------------------------------------------------------------
// Milestone 4: Campaign Planner, Creative Orchestration & Approvals
// -------------------------------------------------------------

export async function fetchCampaignsList(params?: {
  brand_id?: string;
  status?: string;
}): Promise<CampaignItem[]> {
  const query = new URLSearchParams();
  if (params?.brand_id) query.set("brand_id", params.brand_id);
  if (params?.status) query.set("status", params.status);
  const qStr = query.toString();
  const url = qStr ? `${API_BASE}/campaigns?${qStr}` : `${API_BASE}/campaigns`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load workspace campaigns");
  return res.json();
}

export async function createCampaign(payload: CampaignCreatePayload): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create campaign" }));
    throw new Error(err.detail || "Failed to create campaign");
  }
  return res.json();
}

export async function fetchCampaignDetail(campaignId: string): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}`);
  if (!res.ok) throw new Error("Failed to load campaign details");
  return res.json();
}

export async function updateCampaign(
  campaignId: string,
  payload: CampaignUpdatePayload
): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update campaign" }));
    throw new Error(err.detail || "Failed to update campaign");
  }
  return res.json();
}

export async function deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete campaign" }));
    throw new Error(err.detail || "Failed to delete campaign");
  }
  return res.json();
}

export async function generateCampaignStrategy(
  campaignId: string,
  confirmed: boolean = true
): Promise<CampaignStrategyOutput> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/strategy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed, allow_demo_fallback: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to generate AI campaign strategy" }));
    throw new Error(err.detail || "Failed to generate AI campaign strategy");
  }
  return res.json();
}

export async function fetchCampaignStrategy(campaignId: string): Promise<CampaignStrategyOutput> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/strategy`);
  if (!res.ok) throw new Error("Failed to load campaign strategy");
  return res.json();
}

export async function fetchCampaignContent(campaignId: string): Promise<CampaignContentItem[]> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/content`);
  if (!res.ok) throw new Error("Failed to load campaign creative content");
  return res.json();
}

export async function createCampaignContent(
  campaignId: string,
  payload: CampaignContentCreatePayload
): Promise<CampaignContentItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create campaign creative asset" }));
    throw new Error(err.detail || "Failed to create campaign creative asset");
  }
  return res.json();
}

export async function updateCampaignContent(
  campaignId: string,
  contentId: string,
  payload: any
): Promise<CampaignContentItem> {
  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/content/${encodeURIComponent(contentId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update creative content" }));
    throw new Error(err.detail || "Failed to update creative content");
  }
  return res.json();
}

export async function generateContentVariants(
  campaignId: string,
  contentId: string,
  payload: {
    number_of_variants?: number;
    angle_style?: string;
    angles?: string[];
  }
): Promise<CampaignContentItem[]> {
  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/content/${encodeURIComponent(contentId)}/variants`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to generate creative variants" }));
    throw new Error(err.detail || "Failed to generate creative variants");
  }
  return res.json();
}

export async function attachAssetToCampaign(
  campaignId: string,
  mediaAssetId: string,
  contentAssetId?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/assets/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_asset_id: mediaAssetId,
      content_asset_id: contentAssetId || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to associate media asset to campaign" }));
    throw new Error(err.detail || "Failed to associate media asset to campaign");
  }
  return res.json();
}

export async function submitCampaignForReview(
  campaignId: string,
  comment?: string
): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/submit-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, confirmed: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to submit campaign for review" }));
    throw new Error(err.detail || "Failed to submit campaign for review");
  }
  return res.json();
}

export async function approveCampaign(
  campaignId: string,
  comment?: string
): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, confirmed: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to approve campaign" }));
    throw new Error(err.detail || "Failed to approve campaign");
  }
  return res.json();
}

export async function rejectCampaign(
  campaignId: string,
  comment: string
): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, confirmed: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to reject campaign" }));
    throw new Error(err.detail || "Failed to reject campaign");
  }
  return res.json();
}

export async function requestCampaignRevision(
  campaignId: string,
  comment: string
): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/request-revision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, confirmed: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to request revisions" }));
    throw new Error(err.detail || "Failed to request revisions");
  }
  return res.json();
}

export async function markCampaignReadyToPublish(
  campaignId: string,
  comment?: string
): Promise<CampaignItem> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/ready-publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment, confirmed: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to mark campaign ready to publish" }));
    throw new Error(err.detail || "Failed to mark campaign ready to publish");
  }
  return res.json();
}

export async function fetchCampaignApprovalHistory(
  campaignId: string
): Promise<CampaignApprovalHistoryItem[]> {
  const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(campaignId)}/history`);
  if (!res.ok) throw new Error("Failed to load approval audit history");
  return res.json();
}

export async function fetchCalendarEntries(params?: {
  campaign_id?: string;
  brand_id?: string;
}): Promise<CampaignCalendarEntryItem[]> {
  const query = new URLSearchParams();
  if (params?.campaign_id) query.set("campaign_id", params.campaign_id);
  if (params?.brand_id) query.set("brand_id", params.brand_id);
  const qStr = query.toString();
  const url = qStr ? `${API_BASE}/calendar/entries?${qStr}` : `${API_BASE}/calendar/entries`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load campaign calendar schedule");
  return res.json();
}

export async function rescheduleCalendarEntry(
  scheduleId: string,
  scheduledTime: string
): Promise<any> {
  const res = await fetch(
    `${API_BASE}/calendar/entries/${encodeURIComponent(scheduleId)}/reschedule`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_time: scheduledTime }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to reschedule calendar entry" }));
    throw new Error(err.detail || "Failed to reschedule calendar entry");
  }
  return res.json();
}

