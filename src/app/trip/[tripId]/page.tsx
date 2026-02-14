"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetail } from "@/components/ListingDetail";
import { AddListingModal } from "@/components/AddListingModal";
import { FilterBar } from "@/components/FilterBar";

import { TripPreferences } from "@/components/TripPreferences";
// budget range no longer used on cards/map
import { useIsMobile } from "@/hooks/useIsMobile";
import type { FilterState, KitchenType, TripPreferences as TripPreferencesType, ReactionType } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Trip = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listing = any;

const POLL_INTERVAL = 4000;

function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("stay_username") || "";
}

function setStoredName(name: string) {
  localStorage.setItem("stay_username", name);
}

function getStoredEmoji(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("stay_emoji") || "";
}

function setStoredEmoji(emoji: string) {
  localStorage.setItem("stay_emoji", emoji);
}

const defaultFilters: FilterState = {
  sources: [],
  priceMin: 0,
  priceMax: Infinity,
  bedroomsMin: 0,
  bathroomsMin: 0,
  kitchen: [],
  beachDistance: "",
  ratingMin: 0,
  sortBy: "recent",
};

type ConsensusGroup = "into" | "deciding" | "not";

interface GroupedListings {
  into: Listing[];
  deciding: Listing[];
  not: Listing[];
}

const GROUP_META: Record<ConsensusGroup, { label: string; icon: string; color: string; bgColor: string }> = {
  into:     { label: "Everyone\u2019s into these", icon: "\uD83D\uDD25", color: "var(--color-green)",      bgColor: "rgba(74,158,107,0.08)" },
  deciding: { label: "Still deciding",             icon: "\uD83E\uDD14", color: "var(--color-yellow)",     bgColor: "rgba(212,168,67,0.08)" },
  not:      { label: "Probably not",               icon: "\uD83D\uDC4B", color: "var(--color-text-muted)", bgColor: "rgba(0,0,0,0.03)" },
};

function computeConsensusGroups(listings: Listing[]): GroupedListings {
  const groups: GroupedListings = { into: [], deciding: [], not: [] };
  for (const listing of listings) {
    const votes: { reactionType: string }[] = listing.votes || [];
    const total = votes.length;
    const positive = votes.filter((v) => v.reactionType === "fire" || v.reactionType === "love").length;
    const negative = votes.filter((v) => v.reactionType === "pass").length;

    // Edge cases: 0 or 1 reaction → "Still deciding"
    if (total <= 1) {
      groups.deciding.push(listing);
    } else if (positive >= 2 && positive / total >= 0.5) {
      // Majority positive (≥50%) with minimum 2 positive reactions
      groups.into.push(listing);
    } else if (negative / total >= 0.5) {
      // Majority negative (≥50% pass reactions)
      groups.not.push(listing);
    } else {
      // Mixed or tied → "Still deciding"
      groups.deciding.push(listing);
    }
  }
  return groups;
}

function applyFilters(listings: Listing[], filters: FilterState): Listing[] {
  let result = [...listings];

  if (filters.sources.length > 0) {
    result = result.filter((l) => filters.sources.includes(l.source));
  }

  if (filters.priceMin > 0) {
    result = result.filter((l) => {
      const price = l.totalCost || l.perNight || 0;
      return price >= filters.priceMin;
    });
  }

  if (filters.priceMax < Infinity) {
    result = result.filter((l) => {
      const price = l.totalCost || l.perNight || Infinity;
      return price <= filters.priceMax;
    });
  }

  if (filters.bedroomsMin > 0) {
    result = result.filter(
      (l) => l.bedrooms != null && l.bedrooms >= filters.bedroomsMin
    );
  }

  if (filters.bathroomsMin > 0) {
    result = result.filter(
      (l) => l.bathrooms != null && l.bathrooms >= filters.bathroomsMin
    );
  }

  if (filters.kitchen.length > 0) {
    result = result.filter((l) =>
      filters.kitchen.includes(l.kitchen as KitchenType)
    );
  }


  if (filters.ratingMin > 0) {
    result = result.filter(
      (l) => l.rating != null && l.rating >= filters.ratingMin
    );
  }

  switch (filters.sortBy) {
    case "price_asc":
      result.sort((a, b) => {
        const pa = a.totalCost || a.perNight || Infinity;
        const pb = b.totalCost || b.perNight || Infinity;
        return pa - pb;
      });
      break;
    case "votes_desc":
      result.sort((a, b) => {
        const score = (votes: { reactionType: string }[]) => {
          let s = 0;
          for (const v of votes) {
            if (v.reactionType === "fire" || v.reactionType === "love") s += 1;
            else if (v.reactionType === "pass") s -= 1;
          }
          return s;
        };
        return score(b.votes || []) - score(a.votes || []);
      });
      break;
    case "rating":
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "recent":
    default:
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
  }

  return result;
}

function StepperRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const btn = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: "50%",
    border: "1px solid var(--color-border-dark)",
    background: disabled ? "var(--color-bg)" : "#fff",
    color: disabled ? "var(--color-text-light)" : "var(--color-text)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 18, fontWeight: 600, fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: "var(--color-text-mid)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => { if (value > min) onChange(value - 1); }} disabled={value <= min} style={btn(value <= min)}>-</button>
        <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{value}</span>
        <button onClick={() => { if (value < max) onChange(value + 1); }} disabled={value >= max} style={btn(value >= max)}>+</button>
      </div>
    </div>
  );
}

export default function TripPage({
  params: paramsPromise,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const params = use(paramsPromise);
  const { tripId } = params;

  const [trip, setTrip] = useState<Trip>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const detailListingRef = useRef<Listing | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmoji, setUserEmoji] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showPreferences, setShowPreferences] = useState(false);
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Mobile bottom sheet state
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const sheetDragStart = useRef<{ y: number; sheetTop: number } | null>(null);
  const [sheetTop, setSheetTop] = useState(60); // percentage from top (60% = map gets 60%)

  // Keep ref in sync so fetchTrip can read it without a dependency
  useEffect(() => {
    detailListingRef.current = detailListing;
  }, [detailListing]);

  // Load trip data
  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
        setFetchError(null);

        // If detail panel is open, refresh the listing data
        const currentDetail = detailListingRef.current;
        if (currentDetail) {
          const updated = data.listings.find(
            (l: Listing) => l.id === currentDetail.id
          );
          if (updated) setDetailListing(updated);
        }
      } else if (res.status === 404) {
        setFetchError("Trip not found");
      } else {
        setFetchError("Could not load trip — the database may need a schema update.");
      }
    } catch {
      setFetchError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  // Initial load + polling
  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  useEffect(() => {
    const hasPending = trip?.listings?.some(
      (l: Listing) =>
        l.scrapeStatus === "pending" || l.scrapeStatus === "scraping"
    );
    if (!hasPending) return;

    const interval = setInterval(fetchTrip, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [trip, fetchTrip]);

  // Username + emoji
  useEffect(() => {
    const stored = getStoredName();
    if (stored) {
      setUserName(stored);
    } else {
      setShowNamePrompt(true);
    }
    setUserEmoji(getStoredEmoji());
  }, []);

  // Scroll-to-center: fly map to the most visible card in the sidebar
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const visibilityMap = new Map<string, number>();
    let currentFocusedId: string | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-listing-id");
          if (id) visibilityMap.set(id, entry.intersectionRatio);
        });

        let maxRatio = 0;
        let maxId: string | null = null;
        visibilityMap.forEach((ratio, id) => {
          if (ratio > maxRatio) { maxRatio = ratio; maxId = id; }
        });

        if (maxId && maxRatio > 0.5 && maxId !== currentFocusedId) {
          currentFocusedId = maxId;
          // Only scroll-fly when no detail panel is open
          if (!detailListingRef.current) {
            setSelectedId(maxId);
          }
        }
      },
      { root: sidebar, threshold: [0, 0.25, 0.5, 0.75, 1.0] }
    );

    sidebar.querySelectorAll("[data-listing-id]").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [trip]);

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setUserName(nameInput.trim());
    setStoredName(nameInput.trim());
    setShowNamePrompt(false);
  }

  // Reactions
  async function handleReact(listingId: string, reactionType: ReactionType) {
    if (!userName) {
      setShowNamePrompt(true);
      return;
    }
    await fetch(`/api/listings/${listingId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, reactionType }),
    });
    fetchTrip();
  }

  async function handleRemoveVote(listingId: string) {
    await fetch(
      `/api/listings/${listingId}/vote?userName=${encodeURIComponent(userName)}`,
      { method: "DELETE" }
    );
    fetchTrip();
  }

  async function handleRescrape(listingId: string) {
    await fetch(`/api/listings/${listingId}/rescrape`, { method: "POST" });
    fetchTrip();
  }

  async function updateTripSettings(updates: { adults?: number; kids?: number; nights?: number }) {
    await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchTrip();
  }

  function openDetail(listing: Listing) {
    setDetailListing(listing);
    setSelectedId(listing.id);
    if (isMobile) {
      document.body.classList.add("mobile-detail-open");
    }
  }

  function closeDetail() {
    setDetailListing(null);
    document.body.classList.remove("mobile-detail-open");
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          color: "var(--color-text-mid)",
        }}
      >
        Loading trip...
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "var(--color-bg)",
          color: "var(--color-text-mid)",
        }}
      >
        <p>{fetchError || "Trip not found"}</p>
        {fetchError && fetchError !== "Trip not found" && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              background: "var(--color-coral)",
              color: "#fff",
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const listings: Listing[] = trip.listings || [];
  const filtered = applyFilters(listings, filters);
  const nights = trip.nights || 7;

  const isDetailOpen = detailListing !== null;
  const sidebarWidth = isDetailOpen ? 300 : 380;
  const tripPrefs: TripPreferencesType | null = trip.preferences || null;

  // Trip date formatting for header
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const checkInDate = trip.checkIn ? new Date(trip.checkIn) : null;
  const tripMonthLabel = checkInDate
    ? `${MONTHS[checkInDate.getMonth()]} \u2018${String(checkInDate.getFullYear()).slice(-2)}`
    : null;
  const daysUntilTrip = checkInDate
    ? Math.ceil((checkInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (showPreferences) {
    return (
      <TripPreferences
        tripId={tripId}
        initial={tripPrefs}
        hasKids={trip.kids > 0}
        onSave={() => {
          setShowPreferences(false);
          fetchTrip();
        }}
        onClose={() => setShowPreferences(false)}
        userName={userName}
        userEmoji={userEmoji}
        onProfileChange={(name, emoji) => {
          setUserName(name);
          setStoredName(name);
          setUserEmoji(emoji);
          setStoredEmoji(emoji);
        }}
        adults={trip.adults}
        kids={trip.kids}
        nights={trip.nights || 7}
        onTripSettingsChange={updateTripSettings}
      />
    );
  }

  // Consensus grouping — compute from reactions
  const consensusGroups = computeConsensusGroups(filtered);
  const hasMultipleGroups =
    [consensusGroups.into, consensusGroups.deciding, consensusGroups.not]
      .filter((g) => g.length > 0).length > 1;

  function renderGroupSection(groupKey: ConsensusGroup, listings: Listing[], indexOffset: number) {
    if (listings.length === 0) return null;
    const meta = GROUP_META[groupKey];
    return (
      <div key={groupKey}>
        {hasMultipleGroups && (
          <div className="consensus-group-header" style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: isMobile ? "10px 12px 4px" : "12px 14px 4px",
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "var(--color-bg)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: meta.bgColor,
            }}>
              <span style={{ fontSize: 13 }}>{meta.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-heading)",
                color: meta.color,
                letterSpacing: "0.01em",
              }}>
                {meta.label}
              </span>
            </div>
            <span style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-light)",
              fontWeight: 500,
            }}>
              {listings.length}
            </span>
            <div style={{
              flex: 1,
              height: 1,
              background: "var(--color-border)",
              marginLeft: 4,
            }} />
          </div>
        )}
        <div style={{
          padding: isMobile ? "4px 8px 8px" : "4px 12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 8 : 12,
          opacity: groupKey === "not" ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}>
          {listings.map((listing: Listing, i: number) => (
            <div key={listing.id} data-listing-id={listing.id}>
              <ListingCard
                listing={listing}
                adults={trip.adults}
                nights={nights}
                isSelected={selectedId === listing.id}
                isHovered={hoveredId === listing.id}
                index={indexOffset + i}
                onSelect={() => openDetail(listing)}
                onMouseEnter={() => setHoveredId(listing.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Shared sidebar content (used in both mobile list view and desktop sidebar)
  const sidebarContent = filtered.length === 0 ? (
    <div
      style={{
        padding: 32,
        textAlign: "center",
        color: "var(--color-text-mid)",
      }}
    >
      {listings.length === 0 ? (
        <>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>
            &#127968;
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
              marginBottom: 8,
              fontFamily: "var(--font-heading)",
            }}
          >
            No listings yet
          </h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Add your first vacation rental listing to get started.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--color-coral)",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add Listing
          </button>
        </>
      ) : (
        <p style={{ fontSize: 13 }}>No listings match your filters.</p>
      )}
    </div>
  ) : (
    <div>
      {renderGroupSection("into", consensusGroups.into, 0)}
      {renderGroupSection("deciding", consensusGroups.deciding, consensusGroups.into.length)}
      {renderGroupSection("not", consensusGroups.not, consensusGroups.into.length + consensusGroups.deciding.length)}
    </div>
  );

  const detailPanel = detailListing && (
    <ListingDetail
      listing={detailListing}
      adults={trip.adults}
      nights={nights}
      userName={userName}
      onClose={closeDetail}
      onRefresh={fetchTrip}
      onNeedName={() => setShowNamePrompt(true)}
      onReact={(reactionType) => handleReact(detailListing.id, reactionType)}
      onRemoveReaction={() => handleRemoveVote(detailListing.id)}
      onRescrape={() => handleRescrape(detailListing.id)}
      onNightsChange={(n) => updateTripSettings({ nights: n })}
      budgetRange={null}
      hasPreferences={!!tripPrefs}
      isMobile={isMobile}
    />
  );

  function handleMapPinSelect(id: string) {
    setSelectedId(id);

    if (isMobile) {
      // On mobile, don't open full-screen detail — just expand sheet and scroll to card
      setSheetTop((prev) => prev > 70 ? 55 : prev);
      setTimeout(() => {
        const cardEl = document.getElementById(`listing-${id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    } else {
      const listing = listings.find((l: Listing) => l.id === id);
      if (listing) openDetail(listing);
    }
  }

  const mapView = (
    <MapView
      listings={filtered}
      center={[trip.centerLng, trip.centerLat]}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={handleMapPinSelect}
      onHover={setHoveredId}
      adults={trip.adults}
      nights={nights}
    />
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Trip header */}
      <header
        style={{
          padding: isMobile ? "8px 12px" : "10px 20px",
          background: "#fff",
          borderBottom: "1px solid var(--color-border-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, minWidth: 0, flex: 1 }}>
          <a
            href="/"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-coral)",
              textDecoration: "none",
              fontFamily: "var(--font-heading)",
              flexShrink: 0,
            }}
          >
            Stay
          </a>
          <h1
            style={{
              fontSize: isMobile ? 14 : 16,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
              fontFamily: "var(--font-heading)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {trip.destination}
            {tripMonthLabel && (
              <span style={{ color: "var(--color-text-mid)", fontWeight: 400, fontSize: isMobile ? 13 : 14 }}>
                {" \u00B7 "}{tripMonthLabel}
              </span>
            )}
          </h1>
          {daysUntilTrip != null && daysUntilTrip > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--color-text-mid)",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {"\u2600\uFE0F"} {daysUntilTrip}d
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, flexShrink: 0 }}>
          {userName && !isMobile && (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-mid)",
                padding: "4px 10px",
                background: "var(--color-panel)",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {userEmoji && <span style={{ fontSize: 14 }}>{userEmoji}</span>}
              {userName}
            </span>
          )}
          {isMobile ? (
            <button
              onClick={() => setShowPreferences(true)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--color-panel)", border: "1px solid var(--color-border-dark)",
                cursor: "pointer", fontSize: userEmoji ? 18 : 13, fontWeight: 700,
                color: "var(--color-text-mid)", fontFamily: "inherit",
                transition: "all 0.15s", flexShrink: 0,
              }}
              title="Preferences"
            >
              {userEmoji || (userName ? userName.charAt(0).toUpperCase() : "\u2699")}
            </button>
          ) : (
            <button
              onClick={() => setShowPreferences(true)}
              style={{
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-panel)",
                color: "var(--color-text-mid)",
                borderRadius: 8,
                border: "1px solid var(--color-border-dark)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              Preferences
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--color-coral)",
                color: "#fff",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "var(--color-coral-hover)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "var(--color-coral)")
              }
            >
              + Add Listing
            </button>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} isMobile={isMobile} />

      {/* Main content */}
      {isMobile ? (
        <>
          {/* Mobile: map + draggable bottom sheet */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {/* Map fills the space */}
            <div style={{ position: "absolute", inset: 0 }}>
              {mapView}
            </div>

            {/* Draggable bottom sheet */}
            <div
              ref={sheetRef}
              className="mobile-bottom-sheet"
              style={{
                top: `${sheetTop}%`,
                transition: sheetDragStart.current ? "none" : "top 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Handle — only this element initiates drag */}
              <div
                className="sheet-handle"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  sheetDragStart.current = { y: touch.clientY, sheetTop };
                }}
                onTouchMove={(e) => {
                  if (!sheetDragStart.current) return;
                  e.preventDefault();
                  const touch = e.touches[0];
                  const containerHeight = sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
                  const deltaPct = ((touch.clientY - sheetDragStart.current.y) / containerHeight) * 100;
                  const newTop = Math.max(5, Math.min(85, sheetDragStart.current.sheetTop + deltaPct));
                  setSheetTop(newTop);
                }}
                onTouchEnd={() => {
                  if (!sheetDragStart.current) return;
                  sheetDragStart.current = null;
                  // Snap to nearest position: collapsed (85%), split (55%), expanded (10%)
                  setSheetTop((prev) => {
                    if (prev < 30) return 10;
                    if (prev > 70) return 85;
                    return 55;
                  });
                }}
              >
                <div className="sheet-handle-bar" />
              </div>

              {/* Scrollable content — pull down to collapse when at scroll top */}
              <div
                ref={(el) => {
                  sheetContentRef.current = el;
                  if (isMobile && el) {
                    sidebarRef.current = el;
                  }
                }}
                className="sheet-content"
                onTouchStart={(e) => {
                  const contentEl = sheetContentRef.current;
                  // Only allow pull-down-to-collapse when scrolled to top
                  if (contentEl && contentEl.scrollTop <= 0) {
                    sheetDragStart.current = { y: e.touches[0].clientY, sheetTop };
                  }
                }}
                onTouchMove={(e) => {
                  if (!sheetDragStart.current) return;
                  const deltaY = e.touches[0].clientY - sheetDragStart.current.y;
                  // Only drag down (collapse), not up — let scroll handle up
                  if (deltaY <= 0) {
                    sheetDragStart.current = null;
                    return;
                  }
                  e.preventDefault();
                  const containerHeight = sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
                  const deltaPct = (deltaY / containerHeight) * 100;
                  const newTop = Math.max(5, Math.min(85, sheetDragStart.current.sheetTop + deltaPct));
                  setSheetTop(newTop);
                }}
                onTouchEnd={() => {
                  if (!sheetDragStart.current) return;
                  sheetDragStart.current = null;
                  setSheetTop((prev) => {
                    if (prev < 30) return 10;
                    if (prev > 70) return 85;
                    return 55;
                  });
                }}
              >
                {sidebarContent}
              </div>
            </div>
          </div>

          {/* Mobile FAB for adding listings */}
          <button
            className="mobile-fab"
            onClick={() => setShowAddModal(true)}
            aria-label="Add listing"
          >
            +
          </button>

          {/* Mobile detail sheet */}
          {detailPanel}
        </>
      ) : (
        /* Desktop: three-column layout */
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Listing sidebar (LEFT) */}
          <div
            ref={sidebarRef}
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              borderRight: "1px solid var(--color-border-dark)",
              overflowY: "auto",
              background: "var(--color-bg)",
              transition: "width 0.25s var(--ease-spring)",
            }}
          >
            {sidebarContent}
          </div>

          {/* Map (CENTER) */}
          <div style={{ flex: 1, position: "relative" }}>
            {mapView}
          </div>

          {/* Detail panel (RIGHT, inline) */}
          {detailPanel}
        </div>
      )}

      {/* Add listing modal */}
      {showAddModal && (
        <AddListingModal
          tripId={tripId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchTrip();
          }}
          addedBy={userName}
        />
      )}

      {/* Name prompt — warm, casual, not a sign-up form */}
      {showNamePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(42,37,32,0.5)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: "linear-gradient(160deg, #FFF9F5 0%, #FFFFFF 100%)",
              borderRadius: 20,
              padding: isMobile ? 24 : 32,
              maxWidth: 380,
              width: "100%",
              margin: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#128075;</div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--color-text)",
                marginBottom: 6,
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
              }}
            >
              Before we dive in&mdash;
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--color-text-mid)",
                marginBottom: 20,
              }}
            >
              What should we call you?
            </p>
            <form onSubmit={submitName}>
              <input
                type="text"
                autoFocus
                placeholder="First name is perfect"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  fontSize: 17,
                  background: "var(--color-bg)",
                  border: "1.5px solid var(--color-border-dark)",
                  borderRadius: 12,
                  color: "var(--color-text)",
                  fontFamily: "inherit",
                  textAlign: "center",
                }}
              />
              <p style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                marginTop: 8,
                marginBottom: 16,
              }}>
                This is how your group will see your votes and comments.
              </p>
              <button
                type="submit"
                disabled={!nameInput.trim()}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  background: "var(--color-coral)",
                  color: "#fff",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: nameInput.trim() ? 1 : 0.5,
                  transition: "all 0.15s",
                  boxShadow: nameInput.trim() ? "0 4px 14px rgba(224,90,71,0.25)" : "none",
                }}
              >
                Let&apos;s go
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
