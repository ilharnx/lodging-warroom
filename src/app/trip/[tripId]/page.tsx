"use client";

import { useState, useEffect, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetail } from "@/components/ListingDetail";
import { AddListingModal } from "@/components/AddListingModal";
import { ImportModal } from "@/components/ImportModal";
import { FilterBar } from "@/components/FilterBar";
import type { FilterState, Platform, KitchenType } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Trip {
  id: string;
  name: string;
  destination: string;
  centerLat: number;
  centerLng: number;
  adults: number;
  kids: number;
  nights: number | null;
  listings: Listing[];
}

interface Listing {
  id: string;
  url: string;
  source: string;
  name: string;
  description: string | null;
  totalCost: number | null;
  perNight: number | null;
  cleaningFee: number | null;
  serviceFee: number | null;
  taxes: number | null;
  currency: string;
  lat: number;
  lng: number;
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
  addedBy: string | null;
  scrapeStatus: string;
  scrapeError: string | null;
  address: string | null;
  neighborhood: string | null;
  photos: { id: string; url: string; category: string | null; caption: string | null }[];
  votes: { id: string; userName: string; value: number }[];
  comments: { id: string; userName: string; text: string; createdAt: string }[];
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

export default function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [userName, setUserName] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
      }
    } catch (err) {
      console.error("Failed to fetch trip:", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // Poll for pending scrapes
  useEffect(() => {
    if (!trip) return;
    const hasPending = trip.listings.some(
      (l) => l.scrapeStatus === "pending" || l.scrapeStatus === "scraping"
    );
    if (!hasPending) return;

    const interval = setInterval(fetchTrip, 3000);
    return () => clearInterval(interval);
  }, [trip, fetchTrip]);

  // Load userName from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lodging-warroom-username");
    if (stored) {
      setUserName(stored);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  function saveUserName(name: string) {
    setUserName(name);
    localStorage.setItem("lodging-warroom-username", name);
    setShowNamePrompt(false);
  }

  function getFilteredListings(): Listing[] {
    if (!trip) return [];

    let listings = [...trip.listings];

    // Filter by source
    if (filters.sources.length > 0) {
      listings = listings.filter((l) =>
        filters.sources.includes(l.source as Platform)
      );
    }

    // Filter by price
    if (filters.priceMax < Infinity) {
      listings = listings.filter((l) => {
        const cost = l.totalCost || l.perNight || 0;
        return cost >= filters.priceMin && cost <= filters.priceMax;
      });
    }

    // Filter by bedrooms
    if (filters.bedroomsMin > 0) {
      listings = listings.filter(
        (l) => (l.bedrooms || 0) >= filters.bedroomsMin
      );
    }

    // Filter by bathrooms
    if (filters.bathroomsMin > 0) {
      listings = listings.filter(
        (l) => (l.bathrooms || 0) >= filters.bathroomsMin
      );
    }

    // Filter by kitchen
    if (filters.kitchen.length > 0) {
      listings = listings.filter((l) =>
        filters.kitchen.includes(l.kitchen as KitchenType)
      );
    }

    // Filter by kid-friendly
    if (filters.kidFriendlyOnly) {
      listings = listings.filter((l) => l.kidFriendly);
    }

    // Filter by pool
    if (filters.hasPool) {
      listings = listings.filter((l) => {
        const amenities = Array.isArray(l.amenities) ? l.amenities : [];
        return amenities.some(
          (a: string) =>
            a.toLowerCase().includes("pool") ||
            a.toLowerCase().includes("swimming")
        );
      });
    }

    // Filter by rating
    if (filters.ratingMin > 0) {
      listings = listings.filter(
        (l) => (l.rating || 0) >= filters.ratingMin
      );
    }

    // Sort
    switch (filters.sortBy) {
      case "price_asc":
        listings.sort(
          (a, b) => (a.totalCost || a.perNight || 0) - (b.totalCost || b.perNight || 0)
        );
        break;
      case "votes_desc":
        listings.sort((a, b) => {
          const aVotes = a.votes.reduce((s, v) => s + v.value, 0);
          const bVotes = b.votes.reduce((s, v) => s + v.value, 0);
          return bVotes - aVotes;
        });
        break;
      case "rating":
        listings.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "recent":
      default:
        break; // Already sorted by createdAt desc from API
    }

    return listings;
  }

  const filteredListings = getFilteredListings();
  const detailListing = trip?.listings.find((l) => l.id === detailId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--navy-900)] flex items-center justify-center">
        <div className="text-[var(--navy-500)]">Loading trip...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[var(--navy-900)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Trip not found</h1>
          <a href="/" className="text-[var(--gold-400)] hover:underline">
            Back to trips
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--navy-900)]">
      {/* Name prompt modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-white mb-2">
              What&apos;s your name?
            </h2>
            <p className="text-sm text-[var(--navy-500)] mb-4">
              Used for votes and comments. No signup needed.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem(
                  "name"
                ) as HTMLInputElement;
                if (input.value.trim()) saveUserName(input.value.trim());
              }}
            >
              <input
                name="name"
                type="text"
                required
                placeholder="Your first name"
                autoFocus
                className="w-full px-4 py-2.5 bg-[var(--navy-900)] border border-[var(--navy-600)] rounded-lg text-white placeholder:text-[var(--navy-500)] focus:outline-none focus:border-[var(--gold-500)] mb-4"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[var(--navy-600)] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-[var(--navy-500)] hover:text-white transition"
          >
            &larr;
          </a>
          <div>
            <h1 className="text-lg font-bold text-white">{trip.name}</h1>
            <p className="text-xs text-[var(--navy-500)]">
              {trip.destination} &middot; {trip.adults} adults
              {trip.kids > 0 ? ` + ${trip.kids} kids` : ""} &middot;{" "}
              {trip.listings.length} listings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 text-sm bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-500)] rounded-lg hover:border-[var(--gold-500)] hover:text-[var(--gold-400)] transition"
          >
            Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-sm bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition"
          >
            + Add
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="h-[40vh] lg:h-full lg:flex-1 shrink-0">
          <MapView
            listings={filteredListings}
            center={[trip.centerLng, trip.centerLat]}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              // Scroll card into view
              const el = document.getElementById(`listing-${id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            adults={trip.adults}
          />
        </div>

        {/* Listing cards */}
        <div className="flex-1 lg:w-[420px] lg:flex-none overflow-y-auto border-l border-[var(--navy-600)]">
          {filteredListings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[var(--navy-500)] mb-4">
                {trip.listings.length === 0
                  ? "No listings yet. Add your first one!"
                  : "No listings match your filters."}
              </p>
              {trip.listings.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition"
                >
                  + Add Listing
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  adults={trip.adults}
                  isSelected={selectedId === listing.id}
                  userName={userName}
                  onSelect={() => setSelectedId(listing.id)}
                  onViewDetail={() => setDetailId(listing.id)}
                  onVote={async (value) => {
                    if (!userName) {
                      setShowNamePrompt(true);
                      return;
                    }
                    const existingVote = listing.votes.find((v) => v.userName === userName);
                    if (existingVote?.value === value) {
                      // Toggle off: remove vote
                      await fetch(`/api/listings/${listing.id}/vote?userName=${encodeURIComponent(userName)}`, {
                        method: "DELETE",
                      });
                    } else {
                      await fetch(`/api/listings/${listing.id}/vote`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userName, value }),
                      });
                    }
                    fetchTrip();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddListingModal
          tripId={trip.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchTrip();
          }}
          addedBy={userName}
        />
      )}

      {showImportModal && (
        <ImportModal
          tripId={trip.id}
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            fetchTrip();
          }}
        />
      )}

      {detailListing && (
        <ListingDetail
          listing={detailListing}
          adults={trip.adults}
          userName={userName}
          onClose={() => setDetailId(null)}
          onRefresh={fetchTrip}
          onNeedName={() => setShowNamePrompt(true)}
          onVote={async (value) => {
            if (!userName) {
              setShowNamePrompt(true);
              return;
            }
            await fetch(`/api/listings/${detailListing.id}/vote`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userName, value }),
            });
            fetchTrip();
          }}
          onRemoveVote={async () => {
            if (!userName) return;
            await fetch(`/api/listings/${detailListing.id}/vote?userName=${encodeURIComponent(userName)}`, {
              method: "DELETE",
            });
            fetchTrip();
          }}
        />
      )}
    </div>
  );
}
