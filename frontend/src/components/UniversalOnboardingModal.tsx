import React, { useState } from "react";
import {
  Sparkles,
  Building2,
  Target,
  Globe,
  UploadCloud,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { submitOnboarding, uploadProductImage, ingestBrandWebsite } from "../services/api";
import type { BrandProfile, ProductItem, UniversalOnboardingRequest } from "../types";

interface UniversalOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (brand: BrandProfile, product?: ProductItem) => void;
}

const INDUSTRIES = [
  "E-Commerce / Direct-to-Consumer",
  "Health & Wellness",
  "Organic Living & Eco-Textiles",
  "Fashion & Apparel",
  "Beauty & Skincare",
  "Software & SaaS",
  "Food & Beverage",
  "Home & Interior Decor",
  "Consumer Electronics",
  "Professional Services",
  "Other"
];

const GOALS = [
  "Acquire New Customers & Drive Sales",
  "Scale Omnichannel Brand Awareness",
  "Increase Ad Return On Spend (ROAS)",
  "Launch Flagship Product to Market",
  "Retain Customers & Boost Repeat Purchases"
];

const MARKETS = [
  "India (Tier-1 Metros)",
  "India (Pan-India D2C)",
  "North America (US & Canada)",
  "United Kingdom & Europe",
  "Southeast Asia (Singapore, UAE, etc.)",
  "Global Multi-Region"
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Bilingual (English + Hindi)",
  "Spanish",
  "German",
  "French"
];

const BUDGET_RANGES = [
  "INR 25,000 - 50,000 / mo (Starter)",
  "INR 50,000 - 1,50,000 / mo (Growth)",
  "INR 1,50,000 - 5,00,000 / mo (Scale)",
  "INR 5,00,000+ / mo (Enterprise)",
  "USD $1,000 - $5,000 / mo",
  "USD $5,000 - $25,000 / mo"
];

export const UniversalOnboardingModal: React.FC<UniversalOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState<string>("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [marketingGoal, setMarketingGoal] = useState<string>(GOALS[0]);
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [geographicMarket, setGeographicMarket] = useState<string>(MARKETS[0]);
  const [preferredLanguage, setPreferredLanguage] = useState<string>(LANGUAGES[0]);
  const [budgetRange, setBudgetRange] = useState<string>(BUDGET_RANGES[1]);
  const [brandVoice, setBrandVoice] = useState<string>("Authentic, premium, transparent, and customer-first");

  // Optional Flagship Product
  const [addFlagshipProduct, setAddFlagshipProduct] = useState<boolean>(true);
  const [flagshipName, setFlagshipName] = useState<string>("");
  const [flagshipDesc, setFlagshipDesc] = useState<string>("");
  const [flagshipPrice, setFlagshipPrice] = useState<string>("2499");
  const [flagshipImageFile, setFlagshipImageFile] = useState<File | null>(null);
  const [flagshipImagePreview, setFlagshipImagePreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWebsiteAutoFill = async () => {
    if (!websiteUrl || !/^https?:\/\//i.test(websiteUrl)) {
      setErrorMessage("Please enter a valid website URL starting with https:// or http://");
      return;
    }
    setIsScraping(true);
    setErrorMessage(null);
    try {
      const data = await ingestBrandWebsite(websiteUrl);
      if (data.title && !businessName) {
        setBusinessName(data.title.split(/[-|—]/)[0].trim());
      }
      if (data.meta_description) {
        setDescription(data.meta_description);
      }
      if (data.discovered_claims && data.discovered_claims.length > 0 && !targetAudience) {
        setTargetAudience(`Discerning buyers interested in ${data.title}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not analyze website. Please enter details manually.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setErrorMessage("Only PNG, JPEG, and WebP image formats are supported.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage("Image file must be under 15MB.");
        return;
      }
      setFlagshipImageFile(file);
      setFlagshipImagePreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      setErrorMessage("Business name is required.");
      setStep(1);
      return;
    }
    if (!targetAudience.trim()) {
      setErrorMessage("Target audience description is required.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: UniversalOnboardingRequest = {
      business_name: businessName.trim(),
      industry,
      website_url: websiteUrl.trim() || undefined,
      marketing_goal: marketingGoal,
      target_audience: targetAudience.trim(),
      geographic_market: geographicMarket,
      preferred_language: preferredLanguage,
      budget_range: budgetRange,
      brand_voice: brandVoice.trim(),
      flagship_product_name: addFlagshipProduct && flagshipName.trim() ? flagshipName.trim() : undefined,
      flagship_product_description: addFlagshipProduct && flagshipDesc.trim() ? flagshipDesc.trim() : undefined,
      flagship_product_price: addFlagshipProduct && flagshipPrice ? parseFloat(flagshipPrice) : undefined,
    };

    try {
      const response = await submitOnboarding(payload);
      let updatedProduct = response.product;

      // If flagship product was created and user selected an image, upload it securely
      if (response.product && flagshipImageFile) {
        try {
          const imgRes = await uploadProductImage(response.product.id, flagshipImageFile);
          if (imgRes && imgRes.image_url) {
            updatedProduct = {
              ...response.product,
              image_url: imgRes.image_url,
            };
          }
        } catch (imgErr) {
          console.warn("Product image upload failed after brand creation:", imgErr);
        }
      }

      onComplete(response.brand, updatedProduct);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          border: "1px solid var(--border-subtle)",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.98) 100%)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.15)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)",
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", color: "#ffffff", fontWeight: 700, margin: 0 }}>
                Universal Business Onboarding
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                Step {step} of 4 — Configure your brand workspace & strategy parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-subtle)",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          {[
            { num: 1, title: "Business Profile" },
            { num: 2, title: "Market & Goals" },
            { num: 3, title: "Flagship Product" },
            { num: 4, title: "Review & Launch" },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => step > s.num && setStep(s.num)}
              style={{
                flex: 1,
                padding: "10px 16px",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: step === s.num ? "#10b981" : step > s.num ? "#94a3b8" : "var(--text-muted)",
                borderBottom: step === s.num ? "2px solid #10b981" : "2px solid transparent",
                cursor: step > s.num ? "pointer" : "default",
                transition: "all 0.2s ease",
              }}
            >
              {s.num}. {s.title}
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              padding: "12px 24px",
              background: "rgba(239, 68, 68, 0.15)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontWeight: 600, fontSize: "0.9rem" }}>
                <Building2 size={18} />
                <span>Core Business Identity</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Business / Brand Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lumina Apparel, NexaTech SaaS, Sunday Roasters"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Primary Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(20, 27, 44, 0.95)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                    }}
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Website / Store URL <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="url"
                      placeholder="https://yourbrand.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        color: "#ffffff",
                        fontSize: "0.9rem",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleWebsiteAutoFill}
                      disabled={isScraping || !websiteUrl}
                      style={{
                        padding: "0 14px",
                        background: "rgba(6, 182, 212, 0.15)",
                        border: "1px solid rgba(6, 182, 212, 0.4)",
                        borderRadius: "8px",
                        color: "#38bdf8",
                        cursor: isScraping || !websiteUrl ? "not-allowed" : "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isScraping ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                      Scan Site
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Brand Description & Mission
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what your brand makes, your origin story, and what sets you apart..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a78bfa", fontWeight: 600, fontSize: "0.9rem" }}>
                <Target size={18} />
                <span>Market Strategy & Audience Goals</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Primary Marketing Goal
                </label>
                <select
                  value={marketingGoal}
                  onChange={(e) => setMarketingGoal(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(20, 27, 44, 0.95)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                  }}
                >
                  {GOALS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Target Audience Persona <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Health-conscious urban professionals aged 25-45 seeking clean, restorative sleep"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Geographic Market
                  </label>
                  <select
                    value={geographicMarket}
                    onChange={(e) => setGeographicMarket(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(20, 27, 44, 0.95)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                    }}
                  >
                    {MARKETS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Preferred Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(20, 27, 44, 0.95)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Monthly Budget Range
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(20, 27, 44, 0.95)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                    }}
                  >
                    {BUDGET_RANGES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Brand Voice & Tone
                  </label>
                  <input
                    type="text"
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="e.g. Modern, aspirational, scientific, warm"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: 600, fontSize: "0.9rem" }}>
                  <UploadCloud size={18} />
                  <span>Flagship Product & Creative Image</span>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={addFlagshipProduct}
                    onChange={(e) => setAddFlagshipProduct(e.target.checked)}
                  />
                  <span>Create initial flagship product</span>
                </label>
              </div>

              {addFlagshipProduct ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Product Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pure Botanical Silk Pillowcase, AI Agent Pro"
                        value={flagshipName}
                        onChange={(e) => setFlagshipName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        Price (INR)
                      </label>
                      <input
                        type="number"
                        placeholder="2499"
                        value={flagshipPrice}
                        onChange={(e) => setFlagshipPrice(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Product Highlights & Features
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Key specifications, materials, and benefits for campaign generation..."
                      value={flagshipDesc}
                      onChange={(e) => setFlagshipDesc(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        color: "#ffffff",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  {/* Product Image Dropzone */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Product Photo <span style={{ color: "var(--text-muted)" }}>(Encrypted & Stored in Protected Media Vault)</span>
                    </label>
                    <div
                      style={{
                        border: "2px dashed var(--border-subtle)",
                        borderRadius: "12px",
                        padding: "20px",
                        textAlign: "center",
                        background: "rgba(255, 255, 255, 0.02)",
                        position: "relative",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageChange}
                        style={{
                          position: "absolute",
                          inset: 0,
                          opacity: 0,
                          cursor: "pointer",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                      {flagshipImagePreview ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                          <img
                            src={flagshipImagePreview}
                            alt="Flagship Preview"
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid var(--border-subtle)",
                            }}
                          />
                          <div style={{ textAlign: "left" }}>
                            <div style={{ color: "#34d399", fontWeight: 600, fontSize: "0.85rem" }}>
                              Photo Selected
                            </div>
                            <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                              {flagshipImageFile?.name} ({(flagshipImageFile!.size / 1024).toFixed(1)} KB)
                            </div>
                            <div style={{ color: "#38bdf8", fontSize: "0.75rem", marginTop: "4px" }}>
                              Click or drop to replace
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                          <UploadCloud size={28} color="#94a3b8" />
                          <div style={{ fontSize: "0.88rem", color: "#f8fafc", fontWeight: 600 }}>
                            Upload Product Photograph
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            PNG, JPEG, or WebP up to 15MB. Saved securely via Bearer token auth.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  You can add products anytime later from the Products & Strategy view.
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#10b981", fontWeight: 600, fontSize: "0.9rem" }}>
                <CheckCircle2 size={18} />
                <span>Review Workspace Configuration</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  background: "rgba(255, 255, 255, 0.02)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Brand Name</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>{businessName || "Untitled"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Industry</span>
                  <div style={{ fontSize: "0.95rem", color: "#38bdf8" }}>{industry}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Primary Goal</span>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{marketingGoal}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Target Market</span>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{geographicMarket} ({preferredLanguage})</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Target Audience</span>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "2px" }}>{targetAudience}</div>
                </div>
                {addFlagshipProduct && flagshipName && (
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Flagship Product</span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                      <span style={{ fontWeight: 600, color: "#ffffff" }}>{flagshipName}</span>
                      <span style={{ color: "#34d399", fontWeight: 600 }}>INR {flagshipPrice}</span>
                    </div>
                    {flagshipImageFile && (
                      <span style={{ fontSize: "0.75rem", color: "#06b6d4", display: "block", marginTop: "2px" }}>
                        ✓ Photo attached ({flagshipImageFile.name})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "0.82rem",
                  color: "#a7f3d0",
                  lineHeight: 1.5,
                }}
              >
                ✓ Workspace isolation and claim guardrails are automatically bound to this brand.
                All generated campaigns, content variants, and media assets will be scoped securely.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(10, 15, 30, 0.9)",
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !businessName.trim()) {
                  setErrorMessage("Please enter your business or brand name.");
                  return;
                }
                if (step === 2 && !targetAudience.trim()) {
                  setErrorMessage("Please specify your target audience.");
                  return;
                }
                setErrorMessage(null);
                setStep(step + 1);
              }}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              Next Step
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Brand Workspace...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Launch Workspace & Strategy
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
