import React, { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import type { AnalyticsOutput } from "../types";

interface AnalyticsSectionProps {
  analytics: AnalyticsOutput | null | undefined;
  campaigns?: { id: string; campaign_name: string; platform: string }[];
  selectedCampaignId?: string;
  onSelectCampaign?: (campaignId: string) => void;
  onUploadCsv: (file: File) => void;
  onProceedToOptimization?: () => void;
  isLoading: boolean;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  analytics,
  campaigns: _campaigns = [],
  selectedCampaignId,
  onSelectCampaign,
  onUploadCsv,
  onProceedToOptimization,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadCsv(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadCsv(e.dataTransfer.files[0]);
    }
  };

  // Provide a sample CSV button to simulate instant file upload
  const handleLoadSampleCsv = () => {
    const sampleCsvData = `campaign_id,campaign_name,platform,creative_variant,spend,impressions,clicks,conversions,revenue
CAMP-001,IG-Reel-AcneSafeSleep,Instagram,Reel-UGC-MorningSkin,12500,185000,6290,264,923736
CAMP-002,Meta-Carousel-FabricComparison,Meta Ads,Carousel-GOTS-vs-Polyester,14000,165000,2970,71,248429
CAMP-003,Google-Search-AyurvedicBedding,Google Search,SearchAd-PureNeemOrganic,11500,42000,1680,64,223936
CAMP-004,Meta-Static-LuxuryDecorBanner,Meta Ads,Static-Banner-GenericAesthetic,8500,120000,720,11,38489
CAMP-005,IG-Story-InfluencerGifting,Instagram,Story-TestimonialCut,3500,48000,1440,58,202942`;

    const blob = new Blob([sampleCsvData], { type: "text/csv" });
    const file = new File([blob], "sample_campaign.csv", { type: "text/csv" });
    onUploadCsv(file);
  };

  const rows = analytics?.campaign_rows || [];
  const selectedRow = rows.find(r => r.campaign_id === selectedCampaignId) || rows[0];

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Campaign Selector Pills */}
      {rows.length > 0 && (
        <div className="glass-panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 600 }}>
            SELECT CAMPAIGN TO INSPECT STORED PERFORMANCE METRICS:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {rows.map((r) => {
              const active = selectedRow?.campaign_id === r.campaign_id;
              return (
                <button
                  key={r.campaign_id}
                  onClick={() => onSelectCampaign && onSelectCampaign(r.campaign_id)}
                  className="btn-secondary"
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    borderColor: active ? "#10b981" : "var(--border-subtle)",
                    background: active ? "rgba(16, 185, 129, 0.15)" : "transparent",
                    color: active ? "#34d399" : "var(--text-secondary)",
                    fontWeight: active ? 700 : 500
                  }}
                >
                  {r.campaign_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Campaign Detailed Metrics Hero Card */}
      {selectedRow && (
        <div className="glass-panel" style={{ padding: "24px", border: "1.5px solid rgba(16, 185, 129, 0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <div>
              <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", marginBottom: "6px" }}>
                Active Selection: {selectedRow.campaign_id}
              </span>
              <h3 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700 }}>
                {selectedRow.campaign_name} ({selectedRow.platform})
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Deterministic Python calculations from stored execution data • Zero division protected
              </p>
            </div>

            {onProceedToOptimization && (
              <button
                className="btn-primary"
                onClick={onProceedToOptimization}
                style={{ padding: "10px 18px", fontSize: "0.88rem" }}
              >
                View Optimizations for this Campaign →
              </button>
            )}
          </div>

          {/* Raw Inputs vs Computed Output Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            {/* Raw Inputs */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Raw Inputs</div>
              <div style={{ marginTop: "6px", fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div>Spend: <strong>INR {selectedRow.spend.toLocaleString()}</strong></div>
                <div>Impressions: <strong>{selectedRow.impressions.toLocaleString()}</strong></div>
                <div>Clicks: <strong>{selectedRow.clicks.toLocaleString()}</strong></div>
                <div>Conversions: <strong>{selectedRow.conversions}</strong></div>
                <div>Revenue: <strong>INR {selectedRow.revenue.toLocaleString()}</strong></div>
              </div>
            </div>

            {/* CTR */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase" }}>CTR (Click-Through Rate)</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", margin: "6px 0" }}>
                {selectedRow.ctr}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Formula: clicks ({selectedRow.clicks}) / impr ({selectedRow.impressions}) × 100
              </div>
            </div>

            {/* CPC */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "#fbbf24", textTransform: "uppercase" }}>CPC (Cost Per Click)</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", margin: "6px 0" }}>
                INR {selectedRow.cpc}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Formula: spend ({selectedRow.spend}) / clicks ({selectedRow.clicks})
              </div>
            </div>

            {/* CPA */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "#34d399", textTransform: "uppercase" }}>CPA (Cost Per Acquisition)</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", margin: "6px 0" }}>
                INR {selectedRow.cpa.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Formula: spend ({selectedRow.spend}) / conv ({selectedRow.conversions})
              </div>
            </div>

            {/* ROAS */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.75rem", color: "#a855f7", textTransform: "uppercase" }}>ROAS (Return on Ad Spend)</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", margin: "6px 0" }}>
                {selectedRow.roas}x
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Formula: revenue ({selectedRow.revenue}) / spend ({selectedRow.spend})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate KPI Summary Cards */}
      {analytics && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            <div className="glass-panel" style={{ padding: "16px" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Blended Ad Spend</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", marginTop: "4px" }}>
                INR {analytics.total_spend.toLocaleString()}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Total Conversions</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#34d399", marginTop: "4px" }}>
                {analytics.total_conversions}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Blended ROAS</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#a78bfa", marginTop: "4px" }}>
                {analytics.overall_roas}x
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Average CPA</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", marginTop: "4px" }}>
                INR {analytics.overall_cpa.toLocaleString()}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Overall CTR</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#38bdf8", marginTop: "4px" }}>
                {analytics.overall_ctr}%
              </div>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "14px" }}>
              Campaign Breakdown & Verified Formulas
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>Campaign</th>
                    <th style={{ padding: "10px" }}>Platform</th>
                    <th style={{ padding: "10px" }}>Spend</th>
                    <th style={{ padding: "10px" }}>Impr</th>
                    <th style={{ padding: "10px" }}>Clicks</th>
                    <th style={{ padding: "10px" }}>CTR (%)</th>
                    <th style={{ padding: "10px" }}>Conv</th>
                    <th style={{ padding: "10px" }}>CPA (INR)</th>
                    <th style={{ padding: "10px" }}>ROAS</th>
                    <th style={{ padding: "10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isSelected = selectedRow?.campaign_id === row.campaign_id;
                    return (
                      <tr
                        key={row.campaign_id}
                        onClick={() => onSelectCampaign && onSelectCampaign(row.campaign_id)}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: isSelected ? "rgba(16, 185, 129, 0.1)" : "transparent",
                          cursor: "pointer"
                        }}
                      >
                        <td style={{ padding: "10px", fontWeight: 600, color: "#ffffff" }}>
                          {row.campaign_name}
                        </td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{row.platform}</td>
                        <td style={{ padding: "10px", color: "#ffffff" }}>INR {row.spend.toLocaleString()}</td>
                        <td style={{ padding: "10px", color: "var(--text-muted)" }}>{row.impressions.toLocaleString()}</td>
                        <td style={{ padding: "10px", color: "var(--text-muted)" }}>{row.clicks.toLocaleString()}</td>
                        <td style={{ padding: "10px", color: "#38bdf8" }}>{row.ctr}%</td>
                        <td style={{ padding: "10px", color: "#34d399", fontWeight: 600 }}>{row.conversions}</td>
                        <td style={{ padding: "10px", color: "#ffffff" }}>INR {row.cpa.toLocaleString()}</td>
                        <td style={{ padding: "10px", fontWeight: 700, color: "#a78bfa" }}>{row.roas}x</td>
                        <td style={{ padding: "10px" }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCampaign && onSelectCampaign(row.campaign_id);
                            }}
                          >
                            {isSelected ? "Active" : "Inspect"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload Box (Local import supported) */}
      <div
        className="glass-panel"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          padding: "24px",
          textAlign: "center",
          border: dragActive ? "2px dashed #10b981" : "1px dashed var(--border-subtle)",
          background: dragActive ? "rgba(16, 185, 129, 0.05)" : "var(--bg-card)",
          borderRadius: "14px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <UploadCloud size={20} color="#38bdf8" />
          <h4 style={{ fontSize: "1rem", color: "#ffffff", fontWeight: 600 }}>
            Import External Performance Dataset (CSV)
          </h4>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
          Optionally load local CSV performance files to calculate deterministic metrics.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{ fontSize: "0.8rem" }}
          >
            <UploadCloud size={14} />
            Choose CSV File
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleLoadSampleCsv}
            disabled={isLoading}
            style={{ fontSize: "0.8rem" }}
          >
            <FileSpreadsheet size={14} color="#34d399" />
            Load Sample CSV
          </button>
        </div>
      </div>
    </div>
  );
};
