"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetail } from "@/components/ListingDetail";
import { AddListingModal } from "@/components/AddListingModal";
import { FilterBar } from "@/components/FilterBar";
import { BudgetRangeBar } from "@/components/BudgetRangeBar";
import { TripPreferences } from "@/components/TripPreferences";
import { computeBudgetRange } from "@/lib/budget";
import type { FilterState, KitchenType, TripPreferences as TripPreferencesType } from "@/types";

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

const defaultFilters: FilterState = {
  sources: [],
  priceMin: 0,
  priceMax: Infinity,
  bedroomsMin: 0,
  bathroomsMin: 0,
  kitchen: [],
  kidFriendlyOnly: false,
  beachDistance: "",
  ratingMin: 0,
  hasPool: false,
  sortBy: "recent",
};

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

  if (filters.kidFriendlyOnly) {
    result = result.filter((l) => l.kidFriendly);
  }

  if (filters.hasPool) {
    result = result.filter((l) => {
      const amenities: string[] = Array.isArray(l.amenities)
        ? l.amenities
        : [];
      return amenities.some(
        (a) =>
          a.toLowerCase().includes("pool") &&
          !a.toLowerCase().includes("pool table")
      );
    });
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
        const va = (a.votes || []).reduce(
          (s: number, v: { value: number }) => s + v.value,
          0
        );
        const vb = (b.votes || []).reduce(
          (s: number, v: { value: number }) => s + v.value,
          0
        );
        return vb - va;
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
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showPreferences, setShowPreferences] = useState(false);

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

  // Username
  useEffect(() => {
    const stored = getStoredName();
    if (stored) {
      setUserName(stored);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setUserName(nameInput.trim());
    setStoredName(nameInput.trim());
    setShowNamePrompt(false);
  }

  // Voting
  async function handleVote(listingId: string, value: 1 | -1) {
    if (!userName) {
      setShowNamePrompt(true);
      return;
    }
    await fetch(`/api/listings/${listingId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, value }),
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

  function openDetail(listing: Listing) {
    setDetailListing(listing);
    setSelectedId(listing.id);
  }

  function closeDetail() {
    setDetailListing(null);
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
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
          height: "100vh",
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
  const budgetRange = computeBudgetRange(listings);

  const isDetailOpen = detailListing !== null;
  const sidebarWidth = isDetailOpen ? 320 : 420;
  const tripPrefs: TripPreferencesType | null = trip.preferences || null;

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
      />
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Trip header */}
      <header
        style={{
          padding: "10px 20px",
          background: "#fff",
          borderBottom: "1px solid var(--color-border-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-coral)",
              textDecoration: "none",
              fontFamily: "var(--font-heading)",
            }}
          >
            Stay
          </a>
          <span
            style={{ color: "var(--color-text-light)", fontSize: 13 }}
          >
            /
          </span>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
              fontFamily: "var(--font-heading)",
            }}
          >
            {trip.name}
          </h1>
          <span style={{ fontSize: 14, color: "var(--color-text-mid)" }}>
            {trip.destination}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {trip.adults} adults{trip.kids > 0 ? `, ${trip.kids} kids` : ""}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {userName && (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-mid)",
                padding: "4px 10px",
                background: "var(--color-panel)",
                borderRadius: 20,
              }}
            >
              {userName}
            </span>
          )}
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
        </div>
      </header>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Budget range bar */}
      {budgetRange && (
        <BudgetRangeBar
          range={budgetRange}
          listings={listings}
          hoveredId={hoveredId}
          adults={trip.adults}
          nights={trip.nights}
        />
      )}

      {/* Main content: Map + Sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapView
            listings={filtered}
            center={[trip.centerLng, trip.centerLat]}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={(id) => {
              setSelectedId(id);
              const listing = listings.find((l: Listing) => l.id === id);
              if (listing) openDetail(listing);
            }}
            onHover={setHoveredId}
            adults={trip.adults}
            budgetRange={budgetRange}
          />
        </div>

        {/* Listing sidebar */}
        <div
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            borderLeft: "1px solid var(--color-border-dark)",
            overflowY: "auto",
            background: "var(--color-bg)",
            transition: "width 0.25s var(--ease-spring)",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--color-text-mid)",
              }}
            >
              {listings.length === 0 ? (
                <>
                  <div
                    style={{
                      fontSize: 40,
                      marginBottom: 12,
                      opacity: 0.25,
                    }}
                  >
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
                <p style={{ fontSize: 13 }}>
                  No listings match your filters.
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {filtered.map((listing: Listing, index: number) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  adults={trip.adults}
                  isSelected={selectedId === listing.id}
                  isHovered={hoveredId === listing.id}
                  userName={userName}
                  index={index}
                  onSelect={() => openDetail(listing)}
                  onViewDetail={() => openDetail(listing)}
                  onVote={(value) => handleVote(listing.id, value)}
                  onRescrape={() => handleRescrape(listing.id)}
                  onMouseEnter={() => setHoveredId(listing.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  budgetRange={budgetRange}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {detailListing && (
        <ListingDetail
          listing={detailListing}
          adults={trip.adults}
          userName={userName}
          onClose={closeDetail}
          onRefresh={fetchTrip}
          onNeedName={() => setShowNamePrompt(true)}
          onVote={(value) => handleVote(detailListing.id, value)}
          onRemoveVote={() => handleRemoveVote(detailListing.id)}
          onRescrape={() => handleRescrape(detailListing.id)}
          budgetRange={budgetRange}
          hasPreferences={!!tripPrefs}
        />
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

      {/* Name prompt */}
      {showNamePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 28,
              maxWidth: 360,
              width: "100%",
              margin: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--color-text)",
                marginBottom: 4,
                fontFamily: "var(--font-heading)",
              }}
            >
              What&apos;s your name?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-mid)",
                marginBottom: 16,
              }}
            >
              Used for votes and comments — no account needed.
            </p>
            <form onSubmit={submitName}>
              <input
                type="text"
                autoFocus
                placeholder="Your first name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: 14,
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border-dark)",
                  borderRadius: 8,
                  color: "var(--color-text)",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={!nameInput.trim()}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "var(--color-coral)",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: nameInput.trim() ? 1 : 0.5,
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
