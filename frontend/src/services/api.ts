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

export function getReportDownloadUrl(workflowId: string, format: "markdown" | "json"): string {
  return `${API_BASE}/reports/${workflowId}/${format}`;
}
