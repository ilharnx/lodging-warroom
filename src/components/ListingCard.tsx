"use client";

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
  isSelected: boolean;
  userName: string;
  onSelect: () => void;
  onViewDetail: () => void;
  onVote: (value: 1 | -1) => void;
  onRescrape?: () => void;
}

function formatPrice(amount: number | null, currency: string = "USD"): string {
  if (amount == null) return "—";
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
      }}
    >
      {labels[source] || source}
    </span>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function ListingCard({
  listing,
  adults,
  isSelected,
  userName,
  onSelect,
  onVote,
  onRescrape,
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

  return (
    <div
      id={`listing-${listing.id}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      style={{
        background: "#fff",
        border: isSelected ? "2px solid #E94E3C" : "1px solid #E8E6E3",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected
          ? "0 8px 30px rgba(233,78,60,0.12)"
          : "0 1px 6px rgba(0,0,0,0.04)",
      }}
    >
      {/* Photo or placeholder */}
      {listing.photos.length > 0 ? (
        <div style={{ height: 160, overflow: "hidden" }}>
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
            height: 80,
            background: "linear-gradient(135deg, #F3F0EB 0%, #E8E3DC 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #E8E6E3",
          }}
        >
          {isScraping ? (
            <span className="scraping-pulse" style={{ fontSize: 13, color: "#706B65" }}>
              Scraping...
            </span>
          ) : (
            <span style={{ fontSize: 32, opacity: 0.25 }} aria-hidden="true">&#127968;</span>
          )}
        </div>
      )}

      <div style={{ padding: "14px 16px 16px" }}>
        {/* Status banners */}
        {isFailed && (
          <div
            style={{
              marginBottom: 8, padding: "5px 10px",
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 6, fontSize: 12, color: "#dc2626",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>Scrape failed</span>
            {onRescrape && (
              <button
                onClick={(e) => { e.stopPropagation(); onRescrape(); }}
                style={{ fontSize: 10, fontWeight: 600, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", color: "#dc2626", fontFamily: "inherit" }}
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
            <span style={{ fontSize: 12, color: "#706B65", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ color: "#E94E3C" }}>&#9733;</span> {listing.rating}
              {listing.reviewCount ? <span style={{ color: "#8a8480" }}>({listing.reviewCount})</span> : null}
            </span>
          )}
          {listing.neighborhood && (
            <span style={{ fontSize: 11, color: "#8a8480", marginLeft: "auto" }}>{listing.neighborhood}</span>
          )}
        </div>

        {/* Title + Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3
            className="font-heading"
            style={{
              margin: 0, fontSize: 17, fontWeight: 600,
              color: isGenericName ? "#706B65" : "#1a1a1a",
              lineHeight: 1.3, flex: 1,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
            }}
          >
            {listing.name || "Untitled Listing"}
          </h3>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {listing.totalCost ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#E94E3C" }}>
                  {formatPrice(listing.totalCost, listing.currency)}
                </div>
                <div style={{ fontSize: 11, color: "#706B65" }}>
                  {perPerson ? `$${perPerson}/person` : "total"}
                </div>
              </>
            ) : listing.perNight ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#E94E3C" }}>
                  {formatPrice(listing.perNight, listing.currency)}
                </div>
                <div style={{ fontSize: 11, color: "#706B65" }}>/night</div>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "#8a8480", fontStyle: "italic" }}>
                {isScraping ? "..." : "—"}
              </span>
            )}
          </div>
        </div>

        {/* The Big 4 */}
        {(listing.bedrooms != null || listing.bathrooms != null || listing.kitchen || listing.beachType || listing.beachDistance) && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginTop: 12,
            padding: "10px 12px", background: "#F3F0EB", borderRadius: 10, border: "1px solid #E8E3DC",
          }}>
            {listing.bedrooms != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#555" }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center" }} aria-hidden="true">&#128716;</span>
                {listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""}
              </div>
            )}
            {listing.bathrooms != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#555" }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center" }} aria-hidden="true">&#128703;</span>
                {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
              </div>
            )}
            {listing.kitchen && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#555" }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center" }} aria-hidden="true">&#127859;</span>
                <span style={{ textTransform: "capitalize" }}>{listing.kitchen}</span>
              </div>
            )}
            {(listing.beachDistance || listing.beachType) && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#555" }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center" }} aria-hidden="true">&#127958;</span>
                {listing.beachDistance || listing.beachType}
              </div>
            )}
          </div>
        )}

        {/* Bathroom notes */}
        {listing.bathroomNotes && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#706B65", fontStyle: "italic" }}>
            {listing.bathroomNotes}
          </div>
        )}

        {/* Kid badge */}
        {listing.kidFriendly && (
          <div style={{
            marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "#2d8a4e", background: "rgba(45,138,78,0.06)",
            border: "1px solid rgba(45,138,78,0.15)", padding: "3px 10px", borderRadius: 6,
          }}>
            &#128118; {listing.kidNotes || "Kid-friendly"}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 14, paddingTop: 12, borderTop: "1px solid #E8E3DC",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              aria-label="Upvote"
              onClick={(e) => { e.stopPropagation(); onVote(1); }}
              style={{
                background: userVote?.value === 1 ? "rgba(233,78,60,0.08)" : "#fff",
                border: userVote?.value === 1 ? "1px solid #E94E3C" : "1px solid #DDD8D0",
                borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                fontSize: 13, color: voteTotal > 0 ? "#E94E3C" : "#706B65", fontWeight: 700, fontFamily: "inherit",
              }}
            >
              &#128293; {voteTotal}
            </button>
            <button
              aria-label="Downvote"
              onClick={(e) => { e.stopPropagation(); onVote(-1); }}
              style={{
                background: userVote?.value === -1 ? "rgba(239,68,68,0.08)" : "#fff",
                border: userVote?.value === -1 ? "1px solid #ef4444" : "1px solid #DDD8D0",
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 13, color: userVote?.value === -1 ? "#ef4444" : "#8a8480", fontFamily: "inherit",
              }}
            >
              &#128078;
            </button>
            {listing.addedBy && (
              <span style={{ fontSize: 11, color: "#8a8480", marginLeft: 4 }}>by {listing.addedBy}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 12, color: "#E94E3C", fontWeight: 600, textDecoration: "none",
                padding: "5px 12px", border: "1px solid #E94E3C", borderRadius: 8,
              }}
            >
              View &#8599;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
