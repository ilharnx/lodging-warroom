"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ReactionBar } from "./ReactionBar";
import type { ReactionType } from "./ReactionBar";

interface Photo {
  id: string;
  url: string;
  category: string | null;
  caption: string | null;
}

interface Vote {
  id: string;
  userName: string;
  reactionType: ReactionType;
}

interface Comment {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface Listing {
  id: string;
  name: string;
  source: string;
  url: string;
  description: string | null;
  totalCost: number | null;
  perNight: number | null;
  cleaningFee: number | null;
  serviceFee: number | null;
  taxes: number | null;
  currency: string;
  bedrooms: number | null;
  beds: unknown;
  bathrooms: number | null;
  bathroomNotes: string | null;
  kitchen: string | null;
  kitchenDetails: string | null;
  amenities: unknown;
  kidFriendly: boolean;
  kidNotes: string | null;
  beachType: string | null;
  beachDistance: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  neighborhood: string | null;
  aiFitAssessment: AIFitAssessmentData | null;
  scrapeStatus: string;
  scrapeError: string | null;
  photos: Photo[];
  votes: Vote[];
  comments: Comment[];
}

interface AIFitAssessmentData {
  score: "good" | "okay" | "poor";
  checks: string[];
  warnings: string[];
  highlights: string[];
  summary: string;
}

interface BudgetRange {
  min: number;
  max: number;
  p20: number;
  p80: number;
}

interface ListingDetailProps {
  listing: Listing;
  adults: number;
  nights: number;
  userName: string;
  onClose: () => void;
  onRefresh: () => void;
  onNeedName: () => void;
  onReact: (reactionType: ReactionType) => void;
  onRemoveReaction: () => void;
  onRescrape?: () => void;
  budgetRange?: BudgetRange | null;
  hasPreferences?: boolean;
  isMobile?: boolean;
}

function formatPrice(amount: number | null, currency: string = "USD"): string {
  if (amount == null) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    airbnb: "Airbnb",
    vrbo: "VRBO",
    booking: "Booking",
    other: "Other",
  };
  return labels[source] || source;
}

function sourceColor(source: string): string {
  const colors: Record<string, string> = {
    airbnb: "bg-[#FF5A5F]/15 text-[#c4403f]",
    vrbo: "bg-[#3D67FF]/15 text-[#2a4bb3]",
    booking: "bg-[#003B95]/15 text-[#003B95]",
    other: "bg-[#706B65]/15 text-[#706B65]",
  };
  return colors[source] || colors.other;
}

const USER_COLORS = [
  "#E05A47", "#3D67FF", "#4A9E6B", "#D4A843", "#8B5CF6",
  "#0891B2", "#DB2777", "#EA580C", "#6D28D9", "#059669",
];

function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function FitBadge({ score }: { score: "good" | "okay" | "poor" }) {
  const config = {
    good: { label: "Strong fit", bg: "rgba(74,158,107,0.1)", border: "rgba(74,158,107,0.2)", color: "#4A9E6B" },
    okay: { label: "Decent fit", bg: "rgba(212,168,67,0.1)", border: "rgba(212,168,67,0.2)", color: "#D4A843" },
    poor: { label: "Some concerns", bg: "rgba(185,28,28,0.06)", border: "rgba(185,28,28,0.15)", color: "#b91c1c" },
  };
  const c = config[score];
  return (
    <span className="font-mono" style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, border: `1px solid ${c.border}`, color: c.color, letterSpacing: 0.3, textTransform: "uppercase" as const }}>
      {c.label}
    </span>
  );
}

function FitSection({ assessment, listingId, hasPreferences }: { assessment: AIFitAssessmentData | null; listingId: string; hasPreferences: boolean }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AIFitAssessmentData | null>(assessment);

  async function runAssessment() {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/assess`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!hasPreferences) return null;

  if (!data && !loading) {
    return (
      <div style={{ padding: "0 20px 16px" }}>
        <button
          onClick={runAssessment}
          style={{
            width: "100%", padding: "10px 16px", fontSize: 13, fontWeight: 500,
            background: "var(--color-panel)", border: "1px solid var(--color-border-dark)",
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit", color: "var(--color-text-mid)",
            transition: "all 0.15s",
          }}
        >
          Assess fit for your group
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "0 20px 16px" }}>
        <div className="scraping-pulse" style={{
          padding: 16, background: "var(--color-bg)", borderRadius: 10,
          border: "1px solid var(--color-border-dark)", textAlign: "center" as const,
          color: "var(--color-text-mid)", fontSize: 13,
        }}>
          Assessing fit...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: "0 20px 16px" }}>
      <div style={{ padding: 16, background: "var(--color-bg)", borderRadius: 10, border: "1px solid var(--color-border-dark)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <h3 className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", margin: 0 }}>
            Group Fit
          </h3>
          <FitBadge score={data.score} />
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5, margin: "0 0 10px" }}>
          {data.summary}
        </p>
        {data.checks.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            {data.checks.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: "#4A9E6B", marginBottom: 2 }}>&#10003; {c}</div>
            ))}
          </div>
        )}
        {data.warnings.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            {data.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: "#D4A843", marginBottom: 2 }}>&#9888; {w}</div>
            ))}
          </div>
        )}
        {data.highlights.length > 0 && (
          <div>
            {data.highlights.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--color-text-mid)", marginBottom: 2 }}>&#9733; {h}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const photoCategories = [
  { key: "all", label: "All" },
  { key: "exterior", label: "Exterior" },
  { key: "bedroom", label: "Bedrooms" },
  { key: "bathroom", label: "Bathrooms" },
  { key: "kitchen", label: "Kitchen" },
  { key: "pool", label: "Pool" },
  { key: "living", label: "Living" },
  { key: "view", label: "Views" },
  { key: "dining", label: "Dining" },
];

export function ListingDetail({
  listing,
  adults,
  nights,
  userName,
  onClose,
  onRefresh,
  onNeedName,
  onReact,
  onRemoveReaction,
  onRescrape,
  budgetRange,
  hasPreferences,
  isMobile,
}: ListingDetailProps) {
  const [photoFilter, setPhotoFilter] = useState("all");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(listing.name);
  const [editPerNight, setEditPerNight] = useState(
    listing.perNight != null ? String(listing.perNight) : ""
  );
  const [editTotalCost, setEditTotalCost] = useState(
    listing.totalCost != null ? String(listing.totalCost) : ""
  );
  const [editBedrooms, setEditBedrooms] = useState(
    listing.bedrooms != null ? String(listing.bedrooms) : ""
  );
  const [editBathrooms, setEditBathrooms] = useState(
    listing.bathrooms != null ? String(listing.bathrooms) : ""
  );
  const [saving, setSaving] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedPhotoIdx !== null) {
          setSelectedPhotoIdx(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, selectedPhotoIdx]);

  const filteredPhotos =
    photoFilter === "all"
      ? listing.photos
      : listing.photos.filter((p) => p.category === photoFilter);

  const handleLightboxKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedPhotoIdx === null) return;
    if (e.key === "ArrowLeft" && selectedPhotoIdx > 0) {
      setSelectedPhotoIdx(selectedPhotoIdx - 1);
    } else if (e.key === "ArrowRight" && selectedPhotoIdx < filteredPhotos.length - 1) {
      setSelectedPhotoIdx(selectedPhotoIdx + 1);
    }
  }, [selectedPhotoIdx, filteredPhotos.length]);

  useEffect(() => {
    if (selectedPhotoIdx !== null) {
      document.addEventListener("keydown", handleLightboxKeyDown);
      return () => document.removeEventListener("keydown", handleLightboxKeyDown);
    }
  }, [selectedPhotoIdx, handleLightboxKeyDown]);

  const amenities: string[] = Array.isArray(listing.amenities)
    ? listing.amenities
    : [];
  const beds = Array.isArray(listing.beds) ? listing.beds : [];
  const perPerson = listing.totalCost
    ? Math.round(listing.totalCost / adults)
    : null;

  const isGenericName =
    listing.name.startsWith("Listing from") ||
    listing.name === "Loading..." ||
    listing.name.startsWith("VRBO ");
  const isScraping =
    listing.scrapeStatus === "pending" || listing.scrapeStatus === "scraping";
  const isFailed = listing.scrapeStatus === "failed";
  const isPartial = listing.scrapeStatus === "partial";
  const hasAnyDetail =
    listing.bedrooms != null ||
    listing.bathrooms != null ||
    listing.kitchen ||
    listing.beachDistance ||
    listing.kidFriendly ||
    amenities.length > 0 ||
    listing.description;

  const nightlyTotal = listing.perNight ? listing.perNight * 7 : 0;
  const fees = (listing.cleaningFee || 0) + (listing.serviceFee || 0);
  const hiddenCostWarning = nightlyTotal > 0 && fees > nightlyTotal * 0.15;

  const listingPrice = listing.perNight || listing.totalCost;

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userName) {
      onNeedName();
      return;
    }
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      await fetch(`/api/listings/${listing.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, text: commentText.trim() }),
      });
      setCommentText("");
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/listings/${listing.id}/comments?commentId=${commentId}`, {
      method: "DELETE",
    });
    onRefresh();
  }

  async function deleteListing() {
    if (!confirm("Remove this listing?")) return;
    await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
    onClose();
    onRefresh();
  }

  async function saveEdits() {
    setSaving(true);
    try {
      await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || listing.name,
          perNight: editPerNight ? parseFloat(editPerNight) : null,
          totalCost: editTotalCost ? parseFloat(editTotalCost) : null,
          bedrooms: editBedrooms ? parseInt(editBedrooms) : null,
          bathrooms: editBathrooms ? parseFloat(editBathrooms) : null,
        }),
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Detail panel: full-screen sheet on mobile, inline on desktop */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label={listing.name}
        className={isMobile ? "mobile-detail-sheet" : undefined}
        style={isMobile ? undefined : {
          width: 420,
          flexShrink: 0,
          background: "var(--color-card)",
          borderLeft: "1px solid var(--color-border-dark)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Panel header */}
        <div style={{
          padding: isMobile ? "12px 16px" : "14px 20px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-text-mid)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "8px 12px" : "4px 8px",
              borderRadius: 6,
              transition: "all 0.15s",
              minHeight: 44,
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-coral)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-text-mid)")}
          >
            &larr; Back to list
          </button>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-coral)",
              textDecoration: "none",
              padding: isMobile ? "8px 14px" : "4px 10px",
              border: "1px solid var(--color-coral-border)",
              borderRadius: 6,
              minHeight: isMobile ? 44 : undefined,
              display: "flex",
              alignItems: "center",
            }}
          >
            View on {sourceLabel(listing.source)} &#8599;
          </a>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Mobile: photo hero at top, before title */}
          {isMobile && listing.photos.length > 0 && (
            <div
              style={{
                height: 240,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() => setSelectedPhotoIdx(0)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.photos[0].url}
                alt={listing.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span
                className={`shrink-0 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide font-mono ${sourceColor(listing.source)}`}
                style={{ position: "absolute", top: 12, left: 16 }}
              >
                {sourceLabel(listing.source)}
              </span>
              {listing.photos.length > 1 && (
                <div
                  className="font-mono"
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 16,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  1 / {listing.photos.length}
                </div>
              )}
            </div>
          )}

          {/* Header info */}
          <div style={{ padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
              <span
                className={`shrink-0 mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide font-mono ${sourceColor(
                  listing.source
                )}`}
              >
                {sourceLabel(listing.source)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: "100%",
                      fontSize: 18,
                      fontWeight: 700,
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                    }}
                    placeholder="Listing name"
                  />
                ) : (
                  <h2 className="font-heading" style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: isGenericName ? "var(--color-text-mid)" : "var(--color-text)",
                    lineHeight: 1.3,
                    margin: 0,
                  }}>
                    {listing.name || "Untitled Listing"}
                  </h2>
                )}
                <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginTop: 4, margin: 0 }}>
                  {listing.neighborhood || listing.address || getDomain(listing.url)}
                </p>
              </div>
              {listing.rating != null && listing.rating > 0 && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                    <span style={{ color: "#D4A017" }}>&#9733;</span>{" "}
                    {listing.rating}
                  </div>
                  {listing.reviewCount != null && listing.reviewCount > 0 && (
                    <div className="font-mono" style={{ fontSize: 11, color: "var(--color-text-mid)" }}>
                      {listing.reviewCount.toLocaleString()} reviews
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scrape status */}
            {isScraping && (
              <div className="scraping-pulse" style={{
                marginTop: 12, padding: "8px 12px",
                background: "rgba(139,105,20,0.06)", border: "1px solid rgba(139,105,20,0.15)",
                color: "#8B6914", fontSize: 13, borderRadius: 8,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ width: 14, height: 14, border: "2px solid rgba(139,105,20,0.3)", borderTopColor: "#8B6914", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Scraping in progress...
              </div>
            )}
            {isFailed && (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.15)",
                color: "#b91c1c", fontSize: 13, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>Scrape failed{listing.scrapeError ? `: ${listing.scrapeError}` : ""}.</span>
                {onRescrape && (
                  <button
                    onClick={onRescrape}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: "rgba(185,28,28,0.1)", border: "1px solid rgba(185,28,28,0.2)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", color: "#b91c1c" }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {isPartial && (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: "rgba(139,105,20,0.06)", border: "1px solid rgba(139,105,20,0.15)",
                color: "#7a5c12", fontSize: 13, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>Limited data extracted.</span>
                {onRescrape && (
                  <button
                    onClick={onRescrape}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: "rgba(139,105,20,0.1)", border: "1px solid rgba(139,105,20,0.2)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", color: "#7a5c12" }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Price block */}
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ padding: 16, background: "var(--color-bg)", borderRadius: 12, border: "1px solid var(--color-border-dark)" }}>
              {editing ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", display: "block", marginBottom: 4 }}>
                      Per Night ($)
                    </label>
                    <input
                      type="number"
                      value={editPerNight}
                      onChange={(e) => setEditPerNight(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", fontSize: 13, background: "#fff", border: "1px solid var(--color-border-dark)", borderRadius: 6, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
                      placeholder="250"
                    />
                  </div>
                  <div>
                    <label className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", display: "block", marginBottom: 4 }}>
                      Total ($)
                    </label>
                    <input
                      type="number"
                      value={editTotalCost}
                      onChange={(e) => setEditTotalCost(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", fontSize: 13, background: "#fff", border: "1px solid var(--color-border-dark)", borderRadius: 6, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
                      placeholder="2500"
                    />
                  </div>
                  <div>
                    <label className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", display: "block", marginBottom: 4 }}>
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      value={editBedrooms}
                      onChange={(e) => setEditBedrooms(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", fontSize: 13, background: "#fff", border: "1px solid var(--color-border-dark)", borderRadius: 6, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", display: "block", marginBottom: 4 }}>
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={editBathrooms}
                      onChange={(e) => setEditBathrooms(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", fontSize: 13, background: "#fff", border: "1px solid var(--color-border-dark)", borderRadius: 6, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
                      placeholder="2"
                    />
                  </div>
                </div>
              ) : listing.totalCost || listing.perNight ? (
                <>
                  {/* Primary price */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className="font-mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text)" }}>
                      {listing.perNight
                        ? formatPrice(listing.perNight, listing.currency)
                        : formatPrice(listing.totalCost, listing.currency)}
                    </span>
                    <span className="font-mono" style={{ fontSize: 13, color: "var(--color-text-mid)" }}>
                      {listing.perNight ? "/night" : "total"}
                    </span>
                  </div>

                  {/* Contextual breakdown: N nights + per person */}
                  {(() => {
                    const totalForStay = listing.perNight
                      ? listing.perNight * nights
                      : listing.totalCost!;
                    const perPersonSplit = adults > 0 ? Math.round(totalForStay / adults) : null;
                    return (
                      <div style={{
                        display: "flex", gap: 16, marginTop: 10, paddingTop: 10,
                        borderTop: "1px solid var(--color-border-dark)",
                      }}>
                        <div>
                          <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "var(--color-text-light)" }}>
                            {nights} nights
                          </div>
                          <div className="font-mono" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
                            {formatPrice(totalForStay, listing.currency)}
                          </div>
                        </div>
                        {perPersonSplit && adults > 1 && (
                          <div>
                            <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "var(--color-text-light)" }}>
                              Per person
                            </div>
                            <div className="font-mono" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
                              {formatPrice(perPersonSplit, listing.currency)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Cost breakdown */}
                  {(listing.cleaningFee || listing.serviceFee || listing.taxes) && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border-dark)" }}>
                      {listing.perNight && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-mid)", marginBottom: 4 }}>
                          <span>Nightly rate</span>
                          <span className="font-mono" style={{ color: "var(--color-text)" }}>{formatPrice(listing.perNight)}/night</span>
                        </div>
                      )}
                      {listing.cleaningFee && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-mid)", marginBottom: 4 }}>
                          <span>Cleaning fee</span>
                          <span className="font-mono" style={{ color: "var(--color-text)" }}>{formatPrice(listing.cleaningFee)}</span>
                        </div>
                      )}
                      {listing.serviceFee && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-mid)", marginBottom: 4 }}>
                          <span>Service fee</span>
                          <span className="font-mono" style={{ color: "var(--color-text)" }}>{formatPrice(listing.serviceFee)}</span>
                        </div>
                      )}
                      {listing.taxes && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-mid)", marginBottom: 4 }}>
                          <span>Taxes</span>
                          <span className="font-mono" style={{ color: "var(--color-text)" }}>{formatPrice(listing.taxes)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {hiddenCostWarning && (
                    <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(139,105,20,0.06)", border: "1px solid rgba(139,105,20,0.15)", color: "#8B6914", fontSize: 12, borderRadius: 6 }}>
                      Heads up: fees are &gt;15% of the nightly total
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 8 }}>
                  <span style={{ color: "var(--color-text-mid)", fontSize: 13 }}>
                    {isScraping ? "Fetching price..." : "Price not available"}
                  </span>
                  {!isScraping && (
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                      Click Edit to add pricing manually
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Edit controls */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              {editing ? (
                <>
                  <button
                    onClick={saveEdits}
                    disabled={saving}
                    style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "var(--color-coral)", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.5 : 1 }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    style={{ padding: "5px 12px", fontSize: 12, color: "var(--color-text-mid)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  style={{ padding: "5px 12px", fontSize: 12, fontWeight: 500, background: "var(--color-panel)", border: "1px solid var(--color-border-dark)", color: "var(--color-text-mid)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                >
                  Edit
                </button>
              )}
            </div>

            {/* Reactions */}
            <div style={{ marginTop: 12 }}>
              <ReactionBar
                votes={listing.votes}
                userName={userName}
                mode="full"
                onReact={onReact}
                onRemoveReaction={onRemoveReaction}
                onNeedName={onNeedName}
              />
            </div>
          </div>

          {/* Discussion — group chat style */}
          <div style={{ padding: "0 20px 16px" }}>
            <h3 className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 10 }}>
              Discussion ({listing.comments.length})
            </h3>

            {listing.comments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
                {listing.comments.map((comment) => {
                  const color = getUserColor(comment.userName);
                  const initial = comment.userName.charAt(0).toUpperCase();
                  const timeAgo = formatTimeAgo(comment.createdAt);
                  return (
                    <div
                      key={comment.id}
                      className="group"
                      style={{ display: "flex", gap: 8, padding: "6px 0" }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, marginTop: 1,
                      }}>
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{comment.userName}</span>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 400 }}>
                            {timeAgo}
                          </span>
                          {comment.userName === userName && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              className="opacity-0 group-hover:opacity-100"
                              style={{ fontSize: 10, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s", marginLeft: "auto" }}
                              title="Delete"
                            >
                              &#10005;
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.45, margin: "1px 0 0" }}>{comment.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={submitComment} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Say something..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  flex: 1, padding: isMobile ? "10px 14px" : "8px 14px", fontSize: isMobile ? 16 : 13,
                  background: "var(--color-bg)", border: "1px solid var(--color-border-dark)",
                  borderRadius: 20, color: "var(--color-text)", fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                aria-label="Send"
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: commentText.trim() ? "var(--color-coral)" : "var(--color-border-dark)",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  transition: "background 0.15s",
                  flexShrink: 0,
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                &#8593;
              </button>
            </form>
          </div>

          {/* AI Fit Assessment */}
          <FitSection
            assessment={listing.aiFitAssessment}
            listingId={listing.id}
            hasPreferences={!!hasPreferences}
          />

          {/* Mobile: comments/discussion moved up — after group vibes, before details */}
          {isMobile && (
            <div style={{ padding: "0 20px 16px" }}>
              <h3 className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 12 }}>
                Discussion ({listing.comments.length})
              </h3>

              {listing.comments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {listing.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "var(--color-panel)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "var(--color-text)",
                        fontFamily: "inherit", flexShrink: 0,
                      }}>{comment.userName[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>{comment.userName}</span>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                          {comment.userName === userName && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              style={{ fontSize: 10, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}
                            >
                              delete
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: "var(--color-text-mid)", margin: "2px 0 0", lineHeight: 1.4 }}>{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Say something..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{
                    flex: 1, padding: "12px 14px", fontSize: 16,
                    background: "var(--color-bg)", border: "1px solid var(--color-border-dark)",
                    borderRadius: 20, color: "var(--color-text)", fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: commentText.trim() ? "var(--color-coral)" : "var(--color-border-dark)",
                    color: "#fff", border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 16, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: submitting ? 0.5 : 1,
                    transition: "background 0.15s",
                  }}
                >
                  &#8593;
                </button>
              </form>
            </div>
          )}

          {/* Desktop: Photo gallery in original position */}
          {!isMobile && listing.photos.length > 0 && (
            <div style={{ padding: "0 20px 16px" }}>
              {/* Category tabs */}
              <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
                {photoCategories.map((cat) => {
                  const count =
                    cat.key === "all"
                      ? listing.photos.length
                      : listing.photos.filter((p) => p.category === cat.key).length;
                  if (cat.key !== "all" && count === 0) return null;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setPhotoFilter(cat.key)}
                      style={{
                        padding: "4px 12px", fontSize: 11, borderRadius: 20, whiteSpace: "nowrap" as const, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, border: "none",
                        transition: "all 0.15s",
                        background: photoFilter === cat.key ? "var(--color-coral)" : "var(--color-panel)",
                        color: photoFilter === cat.key ? "#fff" : "var(--color-text-mid)",
                      }}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Photo grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, borderRadius: 8, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
                {filteredPhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    role="button"
                    tabIndex={0}
                    style={{ aspectRatio: "16/10", position: "relative", cursor: "pointer", overflow: "hidden" }}
                    onClick={() => setSelectedPhotoIdx(idx)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPhotoIdx(idx); } }}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || listing.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Property details */}
          {hasAnyDetail && !editing ? (
            <div style={{ padding: "0 20px 16px" }}>
              {/* The Big 4 */}
              {(listing.bedrooms != null || listing.bathrooms != null || listing.kitchen || listing.beachDistance) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {listing.bedrooms != null && (
                    <div style={{ padding: 12, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border-dark)" }}>
                      <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 4 }}>Bedrooms</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{listing.bedrooms}</div>
                      {beds.length > 0 && (
                        <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-text-mid)" }}>
                          {beds.map((bed: { type: string; count: number }, i: number) => (
                            <span key={i}>{i > 0 ? ", " : ""}{bed.count}x {bed.type}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {listing.bathrooms != null && (
                    <div style={{ padding: 12, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border-dark)" }}>
                      <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 4 }}>Bathrooms</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{listing.bathrooms}</div>
                      {listing.bathroomNotes && <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-text-mid)" }}>{listing.bathroomNotes}</div>}
                    </div>
                  )}
                  {listing.kitchen && (
                    <div style={{ padding: 12, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border-dark)" }}>
                      <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 4 }}>Kitchen</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", textTransform: "capitalize" as const }}>{listing.kitchen}</div>
                      {listing.kitchenDetails && <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-text-mid)" }}>{listing.kitchenDetails}</div>}
                    </div>
                  )}
                  {listing.beachDistance && (
                    <div style={{ padding: 12, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border-dark)" }}>
                      <div className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 4 }}>Beach</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{listing.beachDistance}</div>
                      {listing.beachType && <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-text-mid)" }}>{listing.beachType} water</div>}
                    </div>
                  )}
                </div>
              )}

              {listing.kidFriendly && (
                <div style={{ padding: 12, background: "rgba(74,158,107,0.05)", border: "1px solid rgba(74,158,107,0.15)", borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-green)", marginBottom: 2 }}>Kid-Friendly</div>
                  <p style={{ fontSize: 13, color: "var(--color-text-mid)", margin: 0 }}>
                    {listing.kidNotes || "This property is marked as kid-friendly"}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h3 className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 8 }}>
                    Amenities
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(isMobile && !showAllAmenities ? amenities.slice(0, 4) : amenities).map((a: string, i: number) => (
                      <span key={i} style={{ padding: "4px 10px", background: "var(--color-panel)", color: "var(--color-text-mid)", fontSize: 12, borderRadius: 6 }}>
                        {a}
                      </span>
                    ))}
                    {isMobile && amenities.length > 4 && !showAllAmenities && (
                      <button
                        onClick={() => setShowAllAmenities(true)}
                        className="font-mono"
                        style={{
                          padding: "4px 10px", borderRadius: 6,
                          background: "transparent", border: "1.5px solid var(--color-border-dark)",
                          fontSize: 12, color: "var(--color-text-mid)", cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        +{amenities.length - 4}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {listing.description && (
                isMobile ? (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={() => setShowDescription(!showDescription)}
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: 10,
                        border: "1.5px solid var(--color-border-dark)", background: "transparent",
                        fontSize: 13, fontWeight: 500, cursor: "pointer",
                        fontFamily: "inherit", color: "var(--color-text-mid)",
                        textAlign: "left" as const, display: "flex", justifyContent: "space-between",
                      }}
                    >
                      <span>Full description</span>
                      <span style={{ color: "var(--color-text-light)" }}>{showDescription ? "\u25B2" : "\u25BC"}</span>
                    </button>
                    {showDescription && (
                      <p style={{
                        fontSize: 13, color: "var(--color-text-mid)", margin: "10px 0 0",
                        lineHeight: 1.6, padding: "0 4px",
                      }}>
                        {listing.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 8 }}>
                      Description
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--color-text-mid)", lineHeight: 1.6, margin: 0 }}>
                      {listing.description}
                    </p>
                  </div>
                )
              )}
            </div>
          ) : !editing ? (
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ textAlign: "center", padding: 24, background: "var(--color-bg)", borderRadius: 12, border: "1px solid var(--color-border-dark)" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>
                  {isScraping ? "\u23F3" : "\u270F"}
                </div>
                <p style={{ fontSize: 13, color: "var(--color-text-mid)" }}>
                  {isScraping ? "Scraping property details..." : "No details available."}
                </p>
                {!isScraping && (
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                    Click Edit to add details manually.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Desktop: Comments in original position */}
          {!isMobile && (
            <div style={{ borderTop: "1px solid var(--color-border-dark)", padding: 20 }}>
              <h3 className="font-mono" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "var(--color-text-mid)", marginBottom: 12 }}>
                Comments ({listing.comments.length})
              </h3>

              {listing.comments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {listing.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group"
                      style={{ padding: 10, background: "var(--color-bg)", borderRadius: 8 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{comment.userName}</span>
                          <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {comment.userName === userName && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100"
                            style={{ fontSize: 10, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                            title="Delete comment"
                          >
                            delete
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginTop: 4, margin: 0 }}>{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 12px", fontSize: 13,
                    background: "var(--color-bg)", border: "1px solid var(--color-border-dark)",
                    borderRadius: 8, color: "var(--color-text)", fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  style={{
                    padding: "8px 14px", fontSize: 13, fontWeight: 600,
                    background: "var(--color-coral)", color: "#fff", borderRadius: 8,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    opacity: submitting || !commentText.trim() ? 0.5 : 1,
                  }}
                >
                  Post
                </button>
              </form>
            </div>
          )}

          {/* Mobile: full-width source link near bottom */}
          {isMobile && (
            <div style={{ padding: "0 20px 12px" }}>
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "100%", padding: "14px", borderRadius: 10,
                  border: "1px solid var(--color-coral-border)",
                  fontSize: 14, fontWeight: 600,
                  color: "var(--color-coral)", textDecoration: "none",
                  minHeight: 48,
                }}
              >
                View on {sourceLabel(listing.source)} &#8599;
              </a>
            </div>
          )}

          {/* Footer */}
          <div style={{
            borderTop: isMobile ? undefined : "1px solid var(--color-border-dark)",
            padding: isMobile ? "0 20px 24px" : "12px 20px",
            display: "flex",
            justifyContent: isMobile ? "center" : "flex-end",
          }}>
            <button
              onClick={deleteListing}
              style={{
                padding: isMobile ? "12px" : "6px 14px",
                fontSize: 13,
                color: "var(--color-red)",
                background: isMobile ? "rgba(185,28,28,0.06)" : "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: isMobile ? 10 : 6,
                transition: "all 0.15s",
                width: isMobile ? "100%" : undefined,
                fontWeight: isMobile ? 500 : undefined,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(185,28,28,0.06)")}
              onMouseOut={(e) => { if (!isMobile) e.currentTarget.style.background = "none"; }}
            >
              Remove listing
            </button>
          </div>

          {/* Mobile: extra bottom padding for safe area */}
          {isMobile && <div style={{ height: 20 }} />}
        </div>
      </div>

      {/* Photo lightbox */}
      {selectedPhotoIdx !== null && filteredPhotos[selectedPhotoIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
          className="fixed inset-0 z-[60]"
          style={{ background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setSelectedPhotoIdx(null)}
        >
          <button
            onClick={() => setSelectedPhotoIdx(null)}
            aria-label="Close lightbox"
            style={{ position: "absolute", top: 16, right: 16, color: "rgba(255,255,255,0.7)", fontSize: 24, background: "none", border: "none", cursor: "pointer", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            &#10005;
          </button>
          {selectedPhotoIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(selectedPhotoIdx - 1); }}
              aria-label="Previous photo"
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.7)", fontSize: 32, background: "rgba(0,0,0,0.3)", border: "none", cursor: "pointer", width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              &#8249;
            </button>
          )}
          {selectedPhotoIdx < filteredPhotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedPhotoIdx(selectedPhotoIdx + 1); }}
              aria-label="Next photo"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.7)", fontSize: 32, background: "rgba(0,0,0,0.3)", border: "none", cursor: "pointer", width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              &#8250;
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={filteredPhotos[selectedPhotoIdx].url}
            alt={filteredPhotos[selectedPhotoIdx].caption || listing.name}
            style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, touchAction: "pan-y" }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 50) {
                if (dx < 0 && selectedPhotoIdx < filteredPhotos.length - 1) {
                  setSelectedPhotoIdx(selectedPhotoIdx + 1);
                } else if (dx > 0 && selectedPhotoIdx > 0) {
                  setSelectedPhotoIdx(selectedPhotoIdx - 1);
                }
              }
            }}
          />
          <div style={{ position: "absolute", bottom: 16, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, width: "100%" }}>
            {selectedPhotoIdx + 1} / {filteredPhotos.length}
          </div>
        </div>
      )}
    </>
  );
}
