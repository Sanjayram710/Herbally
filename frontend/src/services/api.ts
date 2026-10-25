import type { MarketingState, ProductItem } from "../types";

const API_BASE = "http://localhost:8001/api";

export async function fetchProducts(): Promise<ProductItem[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Failed to load products");
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

export async function approveCampaign(
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

export function getReportDownloadUrl(workflowId: string, format: "markdown" | "json"): string {
  return `${API_BASE}/reports/${workflowId}/${format}`;
}

// -------------------------------------------------------------
// Executive Dashboard
// -------------------------------------------------------------
export async function fetchDashboardSummary(brandId: string = "herbally-brand"): Promise<any> {
  const res = await fetch(`${API_BASE}/dashboard/summary?brand_id=${brandId}`);
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

export async function fetchAssistantHistory(brandId: string = "herbally-brand"): Promise<any[]> {
  const res = await fetch(`${API_BASE}/assistant/history?brand_id=${brandId}`);
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
export async function fetchLandingPageDraft(brandId: string = "herbally-brand"): Promise<any> {
  const res = await fetch(`${API_BASE}/landing-page?brand_id=${brandId}`);
  if (!res.ok) throw new Error("Failed to load landing page draft");
  return res.json();
}

export async function updateLandingPageDraft(brandId: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/landing-page?brand_id=${brandId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update landing page");
  return res.json();
}
