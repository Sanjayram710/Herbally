import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle,
  UploadCloud,
  Plus,
  Loader2,
  X,
  ImageIcon,
} from "lucide-react";
import type { ProductItem } from "../types";
import { ProtectedMediaImage } from "./ProtectedMediaImage";
import { uploadProductImage, createProduct } from "../services/api";

interface ProductSetupSectionProps {
  products: ProductItem[];
  selectedProduct: ProductItem | null;
  onSelectProduct: (product: ProductItem) => void;
  onProductCreated?: (newProduct: ProductItem) => void;
  onProductUpdated?: (updated: ProductItem) => void;
  activeBrandName?: string;
  activeBrandId?: string;
  onSubmitWorkflow: (params: {
    product_name: string;
    brand: string;
    product_url?: string;
    market: string;
    marketing_goal: string;
    budget: number;
    duration_days: number;
    target_audience_hint: string;
  }) => void;
  isLoading: boolean;
}

export const ProductSetupSection: React.FC<ProductSetupSectionProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onProductCreated,
  onProductUpdated,
  activeBrandName = "Brand",
  activeBrandId,
  onSubmitWorkflow,
  isLoading,
}) => {
  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem("dm_brief_budget");
    return saved ? Number(saved) : 50000;
  });
  const [duration, setDuration] = useState<number>(() => {
    const saved = localStorage.getItem("dm_brief_duration");
    return saved ? Number(saved) : 30;
  });
  const [goal, setGoal] = useState<string>(() => {
    return localStorage.getItem("dm_brief_goal") || "Increase online D2C sales";
  });
  const [market, setMarket] = useState<string>(() => {
    return localStorage.getItem("dm_brief_market") || "India (Tier-1 Metros)";
  });
  const [audienceHint, setAudienceHint] = useState<string>(() => {
    return localStorage.getItem("dm_brief_audience") || "Health-conscious urban professionals seeking high quality";
  });
  const [productUrl, setProductUrl] = useState<string>(() => {
    return localStorage.getItem("dm_brief_url") || "";
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Image Upload state
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // New Product Modal state
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>("");
  const [newProdCategory, setNewProdCategory] = useState<string>("Direct to Consumer");
  const [newProdPrice, setNewProdPrice] = useState<string>("2499");
  const [newProdDesc, setNewProdDesc] = useState<string>("");
  const [newProdFeatures, setNewProdFeatures] = useState<string>("");
  const [newProdUrl, setNewProdUrl] = useState<string>("");
  const [newProdImageFile, setNewProdImageFile] = useState<File | null>(null);
  const [newProdImagePreview, setNewProdImagePreview] = useState<string | null>(null);

  // When selectedProduct changes, update productUrl if available
  useEffect(() => {
    if (selectedProduct?.official_url) {
      setProductUrl(selectedProduct.official_url);
    } else if (!productUrl && selectedProduct) {
      setProductUrl(`https://example.com/products/${selectedProduct.id}`);
    }
  }, [selectedProduct?.id, selectedProduct?.official_url]);

  // Sync state to localStorage for persistence
  useEffect(() => {
    localStorage.setItem("dm_brief_budget", String(budget));
    localStorage.setItem("dm_brief_duration", String(duration));
    localStorage.setItem("dm_brief_goal", goal);
    localStorage.setItem("dm_brief_market", market);
    localStorage.setItem("dm_brief_audience", audienceHint);
    localStorage.setItem("dm_brief_url", productUrl);
  }, [budget, duration, goal, market, audienceHint, productUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setValidationError("Product image must be PNG, JPEG, or WebP format.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setValidationError("Product image file size must be less than 15MB.");
      return;
    }

    setIsUploadingImage(true);
    setValidationError(null);
    try {
      const res = await uploadProductImage(selectedProduct.id, file);
      if (res && res.image_url) {
        const updated = { ...selectedProduct, image_url: res.image_url };
        onSelectProduct(updated);
        if (onProductUpdated) onProductUpdated(updated);
      }
    } catch (err: any) {
      setValidationError(err.message || "Failed to upload product image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setValidationError("Product name is required.");
      return;
    }

    setIsCreatingProduct(true);
    setValidationError(null);
    try {
      const created = await createProduct({
        name: newProdName.trim(),
        brand: activeBrandName || (selectedProduct?.brand || "Brand"),
        brand_id: activeBrandId,
        category: newProdCategory.trim() || "General",
        price_inr: parseFloat(newProdPrice) || 1999,
        description: newProdDesc.trim() || `Verified ${newProdName.trim()} offering premium value and reliability.`,
        verified_features: newProdFeatures.split("\n").map((s) => s.trim()).filter(Boolean),
        explicitly_supported_benefits: [
          `Authentic, premium everyday performance for ${newProdName.trim()}`,
          "Direct brand quality guarantee"
        ],
        prohibited_medical_claims: [
          "Cannot make unsubstantiated medical claims or therapeutic cure promises",
          "Cannot misrepresent materials or regulatory certifications"
        ],
        official_url: newProdUrl.trim() || undefined,
      });

      let finalProduct = created;
      if (newProdImageFile) {
        try {
          const imgRes = await uploadProductImage(created.id, newProdImageFile);
          if (imgRes && imgRes.image_url) {
            finalProduct = { ...created, image_url: imgRes.image_url };
          }
        } catch (imgErr) {
          console.warn("Failed to upload image during product creation:", imgErr);
        }
      }

      if (onProductCreated) onProductCreated(finalProduct);
      onSelectProduct(finalProduct);
      setShowAddProductModal(false);
      setNewProdName("");
      setNewProdDesc("");
      setNewProdFeatures("");
      setNewProdUrl("");
      setNewProdImageFile(null);
      setNewProdImagePreview(null);
    } catch (err: any) {
      setValidationError(err.message || "Failed to create product.");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!productUrl || (!productUrl.startsWith("http://") && !productUrl.startsWith("https://"))) {
      setValidationError("Product URL must be a valid URL starting with http:// or https://");
      return;
    }
    if (budget <= 0) {
      setValidationError("Budget must be a positive number greater than 0.");
      return;
    }
    if (duration <= 0) {
      setValidationError("Campaign duration must be at least 1 day.");
      return;
    }

    setValidationError(null);
    onSubmitWorkflow({
      product_name: selectedProduct.name,
      brand: selectedProduct.brand,
      product_url: productUrl,
      market,
      marketing_goal: goal,
      budget,
      duration_days: duration,
      target_audience_hint: audienceHint,
    });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
      {/* Left: Product Information & Guardrails */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", color: "#ffffff", margin: 0 }}>Verified Product Grounding</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                Official brand specifications and safety guardrails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddProductModal(true)}
            className="btn-secondary"
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>

        {/* Product selector if multiple */}
        {products.length > 1 && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Select Active Product:
            </label>
            <select
              value={selectedProduct?.id}
              onChange={(e) => {
                const found = products.find((p) => p.id === e.target.value);
                if (found) onSelectProduct(found);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(20, 27, 44, 0.95)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.85rem",
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedProduct ? (
          <div>
            {/* Product Image Preview & Secure Upload */}
            <div style={{ marginBottom: "16px" }}>
              {selectedProduct.image_url ? (
                <div style={{ position: "relative" }}>
                  <ProtectedMediaImage
                    mediaUrl={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    style={{
                      width: "100%",
                      height: "190px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      border: "1px solid var(--border-subtle)",
                    }}
                  />
                  <label
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      background: "rgba(15, 23, 42, 0.85)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      color: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                    }}
                  >
                    {isUploadingImage ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    {isUploadingImage ? "Uploading..." : "Replace Photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              ) : (
                <div
                  style={{
                    border: "2px dashed var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "20px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <label style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={28} color="#94a3b8" />
                    <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: 600 }}>
                      {isUploadingImage ? "Securing and Uploading..." : "+ Upload Product Photograph"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      PNG, JPEG, WebP. Stored in encrypted media vault.
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              )}
            </div>

            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>
              {selectedProduct.name}
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", color: "#38bdf8", background: "rgba(6, 182, 212, 0.1)", padding: "3px 8px", borderRadius: "6px" }}>
                {selectedProduct.category || "General"}
              </span>
              <span style={{ fontSize: "0.85rem", color: "#34d399", fontWeight: 600 }}>
                INR {selectedProduct.price_inr?.toLocaleString() || "1,999"}
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "18px", lineHeight: 1.6 }}>
              {selectedProduct.description}
            </p>

            {/* Verified Features */}
            {selectedProduct.verified_features && selectedProduct.verified_features.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#34d399", fontWeight: 600, marginBottom: "8px" }}>
                  Verified Features (Facts):
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedProduct.verified_features.map((feat, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: "3px" }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strict Guardrails */}
            {selectedProduct.prohibited_medical_claims && selectedProduct.prohibited_medical_claims.length > 0 && (
              <div style={{
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                borderRadius: "10px",
                padding: "12px 16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fb7185", fontWeight: 600, fontSize: "0.8rem", marginBottom: "6px" }}>
                  <AlertTriangle size={15} />
                  Strict Claim Guardrails:
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  {selectedProduct.prohibited_medical_claims.map((claim, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      • {claim}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            <p>No products found in this workspace.</p>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="btn-primary"
              style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={15} /> Add First Product
            </button>
          </div>
        )}
      </div>

      {/* Right: Campaign Objective & Execution Trigger Form */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", color: "#ffffff", margin: 0 }}>Campaign Parameters</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              Define budget, target market, and strategic goals
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {validationError && (
            <div style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#fb7185",
              fontSize: "0.82rem"
            }}>
              {validationError}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Product Landing URL
            </label>
            <input
              type="url"
              required
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://example.com/products/flagship"
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Target Market
            </label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Marketing Goal
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Target Audience Hint
            </label>
            <input
              type="text"
              value={audienceHint}
              onChange={(e) => setAudienceHint(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Total Budget (INR)
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.9rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.9rem"
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedProduct}
            className="btn-primary"
            style={{
              marginTop: "8px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "0.95rem"
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Executing Multi-Agent Strategy Flow...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Strategy & Campaign Plan
              </>
            )}
          </button>
        </form>
      </div>

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            backgroundColor: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(10px)",
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
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid var(--border-subtle)",
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.98) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "1.15rem", color: "#ffffff", margin: 0 }}>Add New Product</h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Cotton Linen, AI Analytics Suite"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Product Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key value proposition and product summary..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Verified Features (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  value={newProdFeatures}
                  onChange={(e) => setNewProdFeatures(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Official URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://yourbrand.com/products/item"
                  value={newProdUrl}
                  onChange={(e) => setNewProdUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Product Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setNewProdImageFile(f);
                      setNewProdImagePreview(URL.createObjectURL(f));
                    }
                  }}
                  style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}
                />
                {newProdImagePreview && (
                  <img
                    src={newProdImagePreview}
                    alt="Preview"
                    style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", marginTop: "8px" }}
                  />
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="btn-secondary"
                  disabled={isCreatingProduct}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isCreatingProduct ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
