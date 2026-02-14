"use client";

import type { BudgetRange } from "@/lib/budget";

interface Photo {
  id: string;
  url: string;
  category: string | null;
}

interface Vote {
  id: string;
  userName: string;
  value: number;
}

interface Listing {
  id: string;
  name: string;
  source: string;
  url: string;
  totalCost: number | null;
  perNight: number | null;
  cleaningFee: number | null;
  serviceFee: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  bathroomNotes: string | null;
  kitchen: string | null;
  rating: number | null;
  reviewCount: number | null;
  beachDistance: string | null;
  beachType: string | null;
  kidFriendly: boolean;
  kidNotes: string | null;
  scrapeStatus: string;
  scrapeError: string | null;
  address: string | null;
  neighborhood: string | null;
  addedBy: string | null;
  description: string | null;
  photos: Photo[];
  votes: Vote[];
  amenities: unknown;
}

interface ListingCardProps {
  listing: Listing;
  adults: number;
  nights: number;
  isSelected: boolean;
  isHovered: boolean;
  userName: string;
  index: number;
  onSelect: () => void;
  onViewDetail: () => void;
  onVote: (value: 1 | -1) => void;
  onRescrape?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  budgetRange: BudgetRange | null;
}

function formatPrice(amount: number | null, currency: string = "USD"): string {
  if (amount == null) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function Badge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    airbnb: "#FF5A5F",
    vrbo: "#3D67FF",
    booking: "#003B95",
    other: "#706B65",
  };
  const labels: Record<string, string> = {
    airbnb: "Airbnb",
    vrbo: "VRBO",
    booking: "Booking",
    other: "Other",
  };
  return (
    <span
      style={{
        background: colors[source] || colors.other,
        color: "#fff",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        fontFamily: "var(--font-mono)",
      }}
    >
      {labels[source] || source}
    </span>
  );
}

export function ListingCard({
  listing,
  adults,
  nights,
  isSelected,
  isHovered,
  userName,
  index,
  onSelect,
  onVote,
  onRescrape,
  onMouseEnter,
  onMouseLeave,
  budgetRange,
}: ListingCardProps) {
  const voteTotal = listing.votes.reduce((sum, v) => sum + v.value, 0);
  const userVote = listing.votes.find((v) => v.userName === userName);
  const perPerson =
    listing.totalCost && adults > 0
      ? Math.round(listing.totalCost / adults)
      : null;

  const isScraping =
    listing.scrapeStatus === "pending" || listing.scrapeStatus === "scraping";
  const isFailed = listing.scrapeStatus === "failed";
  const isPartial = listing.scrapeStatus === "partial";
  const isGenericName =
    listing.name.startsWith("Listing from") ||
    listing.name === "Loading..." ||
    listing.name.startsWith("VRBO ") ||
    listing.name.startsWith("Airbnb Listing");

  const amenities: string[] = Array.isArray(listing.amenities) ? listing.amenities : [];
  const listingPrice = listing.perNight || listing.totalCost;

  const upvoters = listing.votes.filter((v) => v.value > 0).map((v) => v.userName);

  return (
    <div
      id={`listing-${listing.id}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="animate-fade-in-up"
      style={{
        background: "#fff",
        border: isSelected ? "2px solid var(--color-coral)" : isHovered ? "1.5px solid var(--color-coral-border)" : "1px solid var(--color-border)",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s var(--ease-spring)",
        boxShadow: isSelected
          ? "0 8px 30px rgba(224,90,71,0.12)"
          : isHovered
            ? "0 4px 16px rgba(0,0,0,0.08)"
            : "0 1px 6px rgba(0,0,0,0.04)",
        transform: isHovered && !isSelected ? "translateY(-1px)" : "none",
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Photo or placeholder */}
      {listing.photos.length > 0 ? (
        <div style={{ height: 150, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.photos[0].url}
            alt={listing.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          style={{
            height: 70,
            background: "linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-dark, #EDE7E0) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {isScraping ? (
            <span className="scraping-pulse" style={{ fontSize: 13, color: "var(--color-text-mid)" }}>
              Scraping...
            </span>
          ) : (
            <span style={{ fontSize: 28, opacity: 0.25 }} aria-hidden="true">&#127968;</span>
          )}
        </div>
      )}

      <div style={{ padding: "12px 14px 14px" }}>
        {/* Status banners */}
        {isFailed && (
          <div
            style={{
              marginBottom: 8, padding: "5px 10px",
              background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.15)",
              borderRadius: 6, fontSize: 12, color: "#b91c1c",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>Scrape failed</span>
            {onRescrape && (
              <button
                onClick={(e) => { e.stopPropagation(); onRescrape(); }}
                style={{ fontSize: 10, fontWeight: 600, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", color: "#b91c1c", fontFamily: "inherit" }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        {isPartial && (
          <div
            style={{
              marginBottom: 8, padding: "5px 10px",
              background: "rgba(139,105,20,0.06)", border: "1px solid rgba(139,105,20,0.15)",
              borderRadius: 6, fontSize: 12, color: "#7a5c12",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>Limited data</span>
            {onRescrape && (
              <button
                onClick={(e) => { e.stopPropagation(); onRescrape(); }}
                style={{ fontSize: 10, fontWeight: 600, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", color: "#7a5c12", fontFamily: "inherit" }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Source + Rating + Neighborhood */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Badge source={listing.source} />
          {listing.rating != null && listing.rating > 0 && (
            <span className="font-mono" style={{ fontSize: 12, color: "var(--color-text-mid)", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ color: "var(--color-coral)" }}>&#9733;</span> {listing.rating}
              {listing.reviewCount ? <span style={{ color: "var(--color-text-muted)" }}>({listing.reviewCount})</span> : null}
            </span>
          )}
          {listing.neighborhood && (
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: "auto" }}>{listing.neighborhood}</span>
          )}
        </div>

        {/* Title + Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3
            className="font-heading"
            style={{
              margin: 0, fontSize: 16, fontWeight: 600,
              color: isGenericName ? "var(--color-text-mid)" : "var(--color-text)",
              lineHeight: 1.3, flex: 1,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
            }}
          >
            {listing.name || "Untitled Listing"}
          </h3>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {listing.perNight ? (
              <>
                <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-coral)" }}>
                  {formatPrice(listing.perNight, listing.currency)}
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--color-text-mid)" }}>/night</div>
              </>
            ) : listing.totalCost ? (
              <>
                <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--color-coral)" }}>
                  {formatPrice(listing.totalCost, listing.currency)}
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: "var(--color-text-mid)" }}>total</div>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic" }}>
                {isScraping ? "..." : "\u2014"}
              </span>
            )}
          </div>
        </div>

        {/* Per-listing price context: total for N nights · per person */}
        {(listing.perNight || listing.totalCost) && (() => {
          const totalForStay = listing.perNight
            ? listing.perNight * nights
            : listing.totalCost!;
          const perPersonSplit = adults > 0 ? Math.round(totalForStay / adults) : null;
          return (
            <div className="font-mono" style={{
              fontSize: 11, color: "var(--color-text-muted)",
              marginTop: 4,
            }}>
              {formatPrice(totalForStay, listing.currency)} total{perPersonSplit ? ` · ${formatPrice(perPersonSplit, listing.currency)}/person` : ""}
            </div>
          );
        })()}

        {/* Budget range dot */}
        {budgetRange && listingPrice && budgetRange.max > budgetRange.min && (
          <div style={{ marginTop: 8 }}>
            <div style={{ position: "relative", height: 4, background: "var(--color-border)", borderRadius: 2 }}>
              <div style={{
                position: "absolute",
                left: `${Math.min(Math.max(((listingPrice - budgetRange.min) / (budgetRange.max - budgetRange.min)) * 100, 0), 100)}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-coral)",
                border: "1.5px solid #fff",
                boxShadow: "0 0 3px rgba(0,0,0,0.15)",
              }} />
            </div>
          </div>
        )}

        {/* The Big 4 */}
        {(listing.bedrooms != null || listing.bathrooms != null || listing.kitchen || listing.beachType || listing.beachDistance) && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px", marginTop: 10,
            padding: "8px 10px", background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)",
          }}>
            {listing.bedrooms != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-mid)" }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }} aria-hidden="true">&#128716;</span>
                {listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""}
              </div>
            )}
            {listing.bathrooms != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-mid)" }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }} aria-hidden="true">&#128703;</span>
                {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
              </div>
            )}
            {listing.kitchen && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-mid)" }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }} aria-hidden="true">&#127859;</span>
                <span style={{ textTransform: "capitalize" }}>{listing.kitchen}</span>
              </div>
            )}
            {(listing.beachDistance || listing.beachType) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-mid)" }}>
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }} aria-hidden="true">&#127958;</span>
                {listing.beachDistance || listing.beachType}
              </div>
            )}
          </div>
        )}

        {/* Amenity chips — top 3 + overflow */}
        {amenities.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {amenities.slice(0, 3).map((a: string, i: number) => (
              <span key={i} style={{
                padding: "2px 8px", background: "var(--color-panel)", color: "var(--color-text-mid)",
                fontSize: 11, borderRadius: 4, whiteSpace: "nowrap",
              }}>
                {a}
              </span>
            ))}
            {amenities.length > 3 && (
              <span style={{
                padding: "2px 8px", background: "var(--color-panel)", color: "var(--color-text-muted)",
                fontSize: 11, borderRadius: 4,
              }}>
                +{amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Kid badge */}
        {listing.kidFriendly && (
          <div style={{
            marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "var(--color-green)", background: "rgba(74,158,107,0.06)",
            border: "1px solid rgba(74,158,107,0.15)", padding: "2px 8px", borderRadius: 6,
          }}>
            &#128118; {listing.kidNotes || "Kid-friendly"}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--color-border)",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              aria-label="Upvote"
              onClick={(e) => { e.stopPropagation(); onVote(1); }}
              style={{
                background: userVote?.value === 1 ? "var(--color-coral-light)" : "#fff",
                border: userVote?.value === 1 ? "1px solid var(--color-coral)" : "1px solid var(--color-border-dark)",
                borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                color: userVote?.value === 1 ? "var(--color-coral)" : "var(--color-text-mid)",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 4,
                minHeight: 40,
              }}
            >
              &#128293;
              <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: voteTotal > 0 ? "var(--color-coral)" : "var(--color-text-mid)" }}>
                {voteTotal}
              </span>
            </button>
            <button
              aria-label="Downvote"
              onClick={(e) => { e.stopPropagation(); onVote(-1); }}
              style={{
                background: userVote?.value === -1 ? "rgba(185,28,28,0.06)" : "#fff",
                border: userVote?.value === -1 ? "1px solid #ef4444" : "1px solid var(--color-border-dark)",
                borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                fontSize: 12, fontFamily: "inherit",
                color: userVote?.value === -1 ? "#ef4444" : "var(--color-text-muted)",
                transition: "all 0.15s",
                minHeight: 40,
              }}
            >
              &#128078;
            </button>
            {upvoters.length > 0 && (
              <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: 2 }}>
                {upvoters.slice(0, 2).join(", ")}{upvoters.length > 2 ? ` +${upvoters.length - 2}` : ""}
              </span>
            )}
          </div>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 12, color: "var(--color-coral)", fontWeight: 600, textDecoration: "none",
              padding: "6px 12px", border: "1px solid var(--color-coral-border)", borderRadius: 8,
              transition: "all 0.15s",
              minHeight: 40,
              display: "flex",
              alignItems: "center",
            }}
          >
            View &#8599;
          </a>
        </div>
      </div>
    </div>
  );
}
