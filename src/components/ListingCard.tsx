"use client";

import { useState, useRef, useCallback } from "react";
import type { ReactionType } from "./ReactionBar";

interface Photo {
  id: string;
  url: string;
  category: string | null;
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
  comments: Comment[];
  amenities: unknown;
}

interface ListingCardProps {
  listing: Listing;
  adults: number;
  nights: number;
  isSelected: boolean;
  isHovered: boolean;
  index: number;
  onSelect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
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

function formatPrice(amount: number | null, currency: string = "USD"): string {
  if (amount == null) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const SOURCE_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  vrbo: "VRBO",
  booking: "Booking",
  other: "Other",
};

function PhotoCarousel({ photos, name }: { photos: Photo[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef<number | null>(null);
  const touchDelta = useRef(0);

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(idx, photos.length - 1)));
  }, [photos.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    touchDelta.current = e.touches[0].clientX - touchStart.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta.current) > 40) {
      goTo(current + (touchDelta.current < 0 ? 1 : -1));
    }
    touchStart.current = null;
    touchDelta.current = 0;
  };

  if (photos.length === 0) return null;

  return (
    <div
      style={{ position: "relative", height: 180, overflow: "hidden", background: "#f0ede8" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[current].url}
        alt={name}
        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }}
        loading="lazy"
      />

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
        }}>
          {photos.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === current ? "#fff" : "rgba(255,255,255,0.5)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
          {photos.length > 5 && (
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", lineHeight: "6px" }}>
              +{photos.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Left/right arrows on hover (desktop) */}
      {photos.length > 1 && current > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
          style={{
            position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)",
            border: "none", cursor: "pointer", fontSize: 13, color: "#333",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.15s",
          }}
          className="carousel-arrow"
          aria-label="Previous photo"
        >
          &#8249;
        </button>
      )}
      {photos.length > 1 && current < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)",
            border: "none", cursor: "pointer", fontSize: 13, color: "#333",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.15s",
          }}
          className="carousel-arrow"
          aria-label="Next photo"
        >
          &#8250;
        </button>
      )}
    </div>
  );
}

export function ListingCard({
  listing,
  adults,
  nights,
  isSelected,
  isHovered,
  index,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: ListingCardProps) {
  const isScraping =
    listing.scrapeStatus === "pending" || listing.scrapeStatus === "scraping";

  // Per-person-per-night price
  const perPersonPerNight = listing.perNight && adults > 0
    ? Math.round(listing.perNight / adults)
    : listing.totalCost && nights > 0 && adults > 0
      ? Math.round(listing.totalCost / nights / adults)
      : null;

  const location = listing.neighborhood || listing.address;
  const sourceLabel = SOURCE_LABELS[listing.source] || listing.source;

  // Recent comment for inline quote
  const latestComment = listing.comments.length > 0
    ? listing.comments[listing.comments.length - 1]
    : null;
  const extraComments = listing.comments.length - 1;

  return (
    <div
      id={`listing-${listing.id}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="animate-fade-in-up listing-card"
      style={{
        background: "#fff",
        border: isSelected
          ? "2px solid var(--color-coral)"
          : isHovered
            ? "1.5px solid var(--color-coral-border)"
            : "1px solid var(--color-border)",
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
      {/* Photo carousel or placeholder */}
      {listing.photos.length > 0 ? (
        <PhotoCarousel photos={listing.photos} name={listing.name} />
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

      <div style={{ padding: "10px 14px 12px" }}>
        {/* Title — one line */}
        <h3
          className="font-heading"
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text)",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.name || "Untitled Listing"}
        </h3>

        {/* Location · Source */}
        <div style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {location && <span>{location} · </span>}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {sourceLabel}
          </span>
        </div>

        {/* Per-person-per-night price */}
        <div style={{ marginTop: 6 }}>
          {perPersonPerNight ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--color-coral)" }}>
                {formatPrice(perPersonPerNight, listing.currency)}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                /person/night
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic" }}>
              {isScraping ? "Loading price..." : "Price unavailable"}
            </span>
          )}
        </div>

        {/* Reaction pips + inline quote */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, minHeight: 24 }}>
          {listing.votes.length > 0 ? (
            <>
              {/* Avatar pips with emoji */}
              <div style={{ display: "flex", gap: -4 }}>
                {listing.votes.slice(0, 5).map((vote) => {
                  const color = getUserColor(vote.userName);
                  const initial = vote.userName.charAt(0).toUpperCase();
                  const REACTION_EMOJI: Record<string, string> = { fire: "\uD83D\uDD25", love: "\uD83D\uDE0D", think: "\uD83E\uDD14", pass: "\uD83D\uDC4E" };
                  const emoji = REACTION_EMOJI[vote.reactionType] || "\uD83E\uDD14";
                  return (
                    <div
                      key={vote.id}
                      title={vote.userName}
                      style={{
                        position: "relative",
                        width: 26,
                        height: 26,
                        marginRight: -4,
                      }}
                    >
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        border: "2px solid #fff",
                      }}>
                        {initial}
                      </div>
                      <span style={{
                        position: "absolute",
                        bottom: -2,
                        right: -3,
                        fontSize: 10,
                        lineHeight: 1,
                      }}>
                        {emoji}
                      </span>
                    </div>
                  );
                })}
                {listing.votes.length > 5 && (
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "var(--color-panel)", color: "var(--color-text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, border: "2px solid #fff",
                  }}>
                    +{listing.votes.length - 5}
                  </div>
                )}
              </div>

              {/* Inline comment quote */}
              {latestComment ? (
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11,
                  color: "var(--color-text-mid)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  background: "var(--color-bg)",
                  borderRadius: 8,
                  padding: "3px 8px",
                }}>
                  <span style={{ fontWeight: 600, color: getUserColor(latestComment.userName) }}>
                    {latestComment.userName}:
                  </span>{" "}
                  {latestComment.text}
                  {extraComments > 0 && (
                    <span style={{ color: "var(--color-text-light)", marginLeft: 4 }}>
                      +{extraComments}
                    </span>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <span style={{ fontSize: 11, color: "var(--color-text-light)" }}>
              No reactions yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
