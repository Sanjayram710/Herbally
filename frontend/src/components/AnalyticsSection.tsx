import React, { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import type { AnalyticsOutput } from "../types";

interface AnalyticsSectionProps {
  analytics: AnalyticsOutput | null | undefined;
  onUploadCsv: (file: File) => void;
  isLoading: boolean;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  analytics,
  onUploadCsv,
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

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Upload Box */}
      <div
        className="glass-panel"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          padding: "32px",
          textAlign: "center",
          border: dragActive ? "2px dashed #10b981" : "2px dashed var(--border-subtle)",
          background: dragActive ? "rgba(16, 185, 129, 0.05)" : "var(--bg-card)",
          borderRadius: "16px"
        }}
      >
        <div style={{
          width: "54px",
          height: "54px",
          borderRadius: "14px",
          background: "rgba(6, 182, 212, 0.15)",
          color: "#38bdf8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <UploadCloud size={28} />
        </div>

        <h3 style={{ fontSize: "1.2rem", color: "#ffffff", marginBottom: "8px" }}>
          Upload Campaign Performance CSV
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 20px" }}>
          Drop your campaign CSV with spend, impressions, clicks, conversions, and revenue.
          Calculations are computed safely with deterministic zero-division protection.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <UploadCloud size={16} />
            Choose CSV File
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleLoadSampleCsv}
            disabled={isLoading}
          >
            <FileSpreadsheet size={16} color="#34d399" />
            Load Herbally Sample CSV (Demo)
          </button>
        </div>
      </div>

      {/* Analytics Results (if loaded) */}
      {analytics && analytics.campaign_rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* KPI Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>Total Ad Spend</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff" }}>
                INR {analytics.total_spend.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "4px" }}>
                Across {analytics.campaign_rows.length} campaigns
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>Conversions</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#34d399" }}>
                {analytics.total_conversions.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Conv Rate: {analytics.overall_conv_rate}%
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>Blended ROAS</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#a78bfa" }}>
                {analytics.overall_roas}x
              </div>
              <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: "4px" }}>
                Revenue: INR {analytics.total_revenue.toLocaleString()}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>Average CPA</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#ffffff" }}>
                INR {analytics.overall_cpa.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                CPC: INR {analytics.overall_cpc}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>Overall CTR</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#38bdf8" }}>
                {analytics.overall_ctr}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {analytics.total_clicks.toLocaleString()} Clicks
              </div>
            </div>
          </div>

          {/* Performance Interpretation */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "6px" }}>
              Deterministic Analytics Interpretation:
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
              {analytics.interpretation}
            </p>
          </div>

          {/* Metrics Table */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "16px" }}>
              Campaign Breakdown & Formulas
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px" }}>Campaign</th>
                    <th style={{ padding: "10px" }}>Platform</th>
                    <th style={{ padding: "10px" }}>Spend</th>
                    <th style={{ padding: "10px" }}>Clicks</th>
                    <th style={{ padding: "10px" }}>CTR (%)</th>
                    <th style={{ padding: "10px" }}>Conv</th>
                    <th style={{ padding: "10px" }}>CPA (INR)</th>
                    <th style={{ padding: "10px" }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.campaign_rows.map((row, idx) => {
                    const isTop = row.roas >= 4.0;
                    const isWorst = row.roas < 1.5;

                    return (
                      <tr key={idx} style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: isTop ? "rgba(16, 185, 129, 0.05)" : isWorst ? "rgba(244, 63, 94, 0.05)" : "transparent"
                      }}>
                        <td style={{ padding: "12px 10px", fontWeight: 600, color: "#ffffff" }}>
                          {row.campaign_name}
                          {isTop && <span className="badge badge-verified" style={{ marginLeft: "8px", fontSize: "0.65rem" }}>Top Performer</span>}
                          {isWorst && <span className="badge badge-priority-high" style={{ marginLeft: "8px", fontSize: "0.65rem" }}>Budget Drag</span>}
                        </td>
                        <td style={{ padding: "12px 10px", color: "var(--text-secondary)" }}>{row.platform}</td>
                        <td style={{ padding: "12px 10px", color: "#ffffff" }}>INR {row.spend.toLocaleString()}</td>
                        <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>{row.clicks.toLocaleString()}</td>
                        <td style={{ padding: "12px 10px", color: "#38bdf8" }}>{row.ctr}%</td>
                        <td style={{ padding: "12px 10px", color: "#34d399", fontWeight: 600 }}>{row.conversions}</td>
                        <td style={{ padding: "12px 10px", color: isTop ? "#34d399" : isWorst ? "#fb7185" : "#ffffff" }}>
                          INR {row.cpa.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 10px", fontWeight: 700, color: isTop ? "#34d399" : isWorst ? "#fb7185" : "#a78bfa" }}>
                          {row.roas}x
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
    </div>
  );
};
