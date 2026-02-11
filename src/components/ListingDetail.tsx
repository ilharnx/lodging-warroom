"use client";

import { useState } from "react";

interface Photo {
  id: string;
  url: string;
  category: string | null;
  caption: string | null;
}

interface Vote {
  id: string;
  userName: string;
  value: number;
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
  scrapeStatus: string;
  scrapeError: string | null;
  photos: Photo[];
  votes: Vote[];
  comments: Comment[];
}

interface ListingDetailProps {
  listing: Listing;
  adults: number;
  userName: string;
  onClose: () => void;
  onRefresh: () => void;
  onNeedName: () => void;
  onVote: (value: 1 | -1) => void;
  onRemoveVote: () => void;
}

function formatPrice(amount: number | null, currency: string = "USD"): string {
  if (amount == null) return "—";
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
    airbnb: "bg-rose-500/20 text-rose-400",
    vrbo: "bg-blue-500/20 text-blue-400",
    booking: "bg-indigo-500/20 text-indigo-400",
    other: "bg-gray-500/20 text-gray-400",
  };
  return colors[source] || colors.other;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
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
  userName,
  onClose,
  onRefresh,
  onNeedName,
  onVote,
  onRemoveVote,
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

  const filteredPhotos =
    photoFilter === "all"
      ? listing.photos
      : listing.photos.filter((p) => p.category === photoFilter);

  const amenities: string[] = Array.isArray(listing.amenities)
    ? listing.amenities
    : [];
  const beds = Array.isArray(listing.beds) ? listing.beds : [];
  const perPerson = listing.totalCost
    ? Math.round(listing.totalCost / adults)
    : null;

  const voteTotal = listing.votes.reduce((sum, v) => sum + v.value, 0);
  const userVote = listing.votes.find((v) => v.userName === userName);
  const isGenericName =
    listing.name.startsWith("Listing from") ||
    listing.name === "Loading..." ||
    listing.name.startsWith("VRBO ");
  const isScraping =
    listing.scrapeStatus === "pending" || listing.scrapeStatus === "scraping";
  const isFailed = listing.scrapeStatus === "failed";
  const hasAnyDetail =
    listing.bedrooms != null ||
    listing.bathrooms != null ||
    listing.kitchen ||
    listing.beachDistance ||
    listing.kidFriendly ||
    amenities.length > 0 ||
    listing.description;

  // Check for "hidden costs"
  const nightlyTotal = listing.perNight ? listing.perNight * 7 : 0;
  const fees = (listing.cleaningFee || 0) + (listing.serviceFee || 0);
  const hiddenCostWarning = nightlyTotal > 0 && fees > nightlyTotal * 0.15;

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
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-2xl max-w-2xl w-full relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-400)] hover:text-white hover:border-[var(--navy-500)] transition"
        >
          &#10005;
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-3 pr-10">
            <span
              className={`shrink-0 mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${sourceColor(
                listing.source
              )}`}
            >
              {sourceLabel(listing.source)}
            </span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xl font-bold bg-[var(--navy-900)] border border-[var(--navy-600)] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[var(--gold-500)]"
                  placeholder="Listing name"
                />
              ) : (
                <h2 className="text-xl font-bold text-white leading-tight">
                  {isGenericName ? (
                    <span className="text-[var(--navy-400)]">{listing.name}</span>
                  ) : (
                    listing.name
                  )}
                </h2>
              )}
              <p className="text-sm text-[var(--navy-400)] mt-1">
                {listing.neighborhood || listing.address || getDomain(listing.url)}
              </p>
            </div>
            {listing.rating != null && listing.rating > 0 && (
              <div className="text-right shrink-0">
                <div className="text-sm text-white font-semibold">
                  <span className="text-yellow-400">&#9733;</span>{" "}
                  {listing.rating}
                </div>
                {listing.reviewCount != null && listing.reviewCount > 0 && (
                  <div className="text-xs text-[var(--navy-400)]">
                    {listing.reviewCount.toLocaleString()} reviews
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrape status banner */}
          {isScraping && (
            <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg flex items-center gap-2 scraping-pulse">
              <div className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
              Scraping in progress... details will update automatically.
            </div>
          )}
          {isFailed && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              Scrape failed{listing.scrapeError ? `: ${listing.scrapeError}` : ""}.
              You can edit details manually or view the original listing.
            </div>
          )}

          {/* Price block */}
          <div className="mt-4 p-4 bg-[var(--navy-900)] rounded-xl border border-[var(--navy-600)]/50">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1 block">
                      Per Night ($)
                    </label>
                    <input
                      type="number"
                      value={editPerNight}
                      onChange={(e) => setEditPerNight(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-lg text-white focus:outline-none focus:border-[var(--gold-500)]"
                      placeholder="e.g. 250"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1 block">
                      Total Cost ($)
                    </label>
                    <input
                      type="number"
                      value={editTotalCost}
                      onChange={(e) => setEditTotalCost(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-lg text-white focus:outline-none focus:border-[var(--gold-500)]"
                      placeholder="e.g. 2500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1 block">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      value={editBedrooms}
                      onChange={(e) => setEditBedrooms(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-lg text-white focus:outline-none focus:border-[var(--gold-500)]"
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1 block">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={editBathrooms}
                      onChange={(e) => setEditBathrooms(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-lg text-white focus:outline-none focus:border-[var(--gold-500)]"
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
              </div>
            ) : listing.totalCost || listing.perNight ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-[var(--gold-400)]">
                    {listing.totalCost
                      ? formatPrice(listing.totalCost, listing.currency)
                      : formatPrice(listing.perNight, listing.currency)}
                  </span>
                  <span className="text-sm text-[var(--navy-400)]">
                    {listing.totalCost ? "total" : "/night"}
                  </span>
                  {perPerson && (
                    <span className="text-sm font-medium text-[var(--gold-400)] opacity-70">
                      {formatPrice(perPerson)}/person
                    </span>
                  )}
                </div>

                {/* Cost breakdown */}
                {(listing.cleaningFee || listing.serviceFee || listing.taxes) && (
                  <div className="mt-3 pt-3 border-t border-[var(--navy-600)]/50 space-y-1.5 text-xs">
                    {listing.perNight && (
                      <div className="flex justify-between text-[var(--navy-400)]">
                        <span>Nightly rate</span>
                        <span className="text-white">
                          {formatPrice(listing.perNight)}/night
                        </span>
                      </div>
                    )}
                    {listing.cleaningFee && (
                      <div className="flex justify-between text-[var(--navy-400)]">
                        <span>Cleaning fee</span>
                        <span className="text-white">
                          {formatPrice(listing.cleaningFee)}
                        </span>
                      </div>
                    )}
                    {listing.serviceFee && (
                      <div className="flex justify-between text-[var(--navy-400)]">
                        <span>Service fee</span>
                        <span className="text-white">
                          {formatPrice(listing.serviceFee)}
                        </span>
                      </div>
                    )}
                    {listing.taxes && (
                      <div className="flex justify-between text-[var(--navy-400)]">
                        <span>Taxes</span>
                        <span className="text-white">
                          {formatPrice(listing.taxes)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {hiddenCostWarning && (
                  <div className="mt-2 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-lg">
                    Heads up: fees are &gt;15% of the nightly total
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-2">
                <span className="text-[var(--navy-400)] text-sm">
                  {isScraping
                    ? "Fetching price..."
                    : "Price not available from scrape"}
                </span>
                <p className="text-xs text-[var(--navy-500)] mt-1">
                  {isScraping
                    ? ""
                    : "Click Edit to add pricing manually"}
                </p>
              </div>
            )}
          </div>

          {/* Edit / Save buttons + Vote controls */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={saveEdits}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium bg-[var(--gold-500)] text-[var(--navy-900)] rounded-lg hover:bg-[var(--gold-400)] transition disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 text-xs text-[var(--navy-400)] hover:text-white transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-400)] rounded-lg hover:border-[var(--navy-500)] hover:text-white transition"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Voting in detail view */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (!userName) { onNeedName(); return; }
                  if (userVote?.value === 1) { onRemoveVote(); } else { onVote(1); }
                }}
                className={`p-1.5 rounded-md transition-all ${
                  userVote?.value === 1
                    ? "text-green-400 bg-green-400/15"
                    : "text-[var(--navy-400)] hover:text-green-400 hover:bg-green-400/10"
                }`}
                title={userVote?.value === 1 ? "Remove upvote" : "Upvote"}
              >
                &#9650;
              </button>
              <span
                className={`text-sm font-bold min-w-[24px] text-center ${
                  voteTotal > 0
                    ? "text-green-400"
                    : voteTotal < 0
                      ? "text-red-400"
                      : "text-[var(--navy-500)]"
                }`}
              >
                {voteTotal}
              </span>
              <button
                onClick={() => {
                  if (!userName) { onNeedName(); return; }
                  if (userVote?.value === -1) { onRemoveVote(); } else { onVote(-1); }
                }}
                className={`p-1.5 rounded-md transition-all ${
                  userVote?.value === -1
                    ? "text-red-400 bg-red-400/15"
                    : "text-[var(--navy-400)] hover:text-red-400 hover:bg-red-400/10"
                }`}
                title={userVote?.value === -1 ? "Remove downvote" : "Downvote"}
              >
                &#9660;
              </button>
            </div>
          </div>
        </div>

        {/* Photo gallery */}
        {listing.photos.length > 0 && (
          <div className="px-6">
            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
              {photoCategories.map((cat) => {
                const count =
                  cat.key === "all"
                    ? listing.photos.length
                    : listing.photos.filter((p) => p.category === cat.key)
                        .length;
                if (cat.key !== "all" && count === 0) return null;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setPhotoFilter(cat.key)}
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition ${
                      photoFilter === cat.key
                        ? "bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold"
                        : "bg-[var(--navy-700)] text-[var(--navy-400)] hover:text-white"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Photos grid */}
            <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              {filteredPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="aspect-video relative cursor-pointer hover:opacity-90 transition"
                  onClick={() => setSelectedPhotoIdx(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-0.5 text-[10px] text-white truncate">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo lightbox */}
        {selectedPhotoIdx !== null && filteredPhotos[selectedPhotoIdx] && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhotoIdx(null)}
          >
            <button
              onClick={() => setSelectedPhotoIdx(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
            >
              &#10005;
            </button>
            {selectedPhotoIdx > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIdx(selectedPhotoIdx - 1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl"
              >
                &#8249;
              </button>
            )}
            {selectedPhotoIdx < filteredPhotos.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIdx(selectedPhotoIdx + 1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl"
              >
                &#8250;
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filteredPhotos[selectedPhotoIdx].url}
              alt={filteredPhotos[selectedPhotoIdx].caption || ""}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 text-center text-white/50 text-sm">
              {selectedPhotoIdx + 1} / {filteredPhotos.length}
            </div>
          </div>
        )}

        {/* Property details */}
        {hasAnyDetail && !editing ? (
          <div className="p-6 space-y-4">
            {/* The Big 4 - grid layout */}
            {(listing.bedrooms != null ||
              listing.bathrooms != null ||
              listing.kitchen ||
              listing.beachDistance) && (
              <div className="grid grid-cols-2 gap-3">
                {listing.bedrooms != null && (
                  <div className="p-3 bg-[var(--navy-900)] rounded-lg border border-[var(--navy-600)]/30">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1">
                      Bedrooms
                    </div>
                    <div className="text-lg font-bold text-white">
                      {listing.bedrooms}
                    </div>
                    {beds.length > 0 && (
                      <div className="mt-1 text-xs text-[var(--navy-400)]">
                        {beds.map(
                          (bed: { type: string; count: number }, i: number) => (
                            <span key={i}>
                              {i > 0 ? ", " : ""}
                              {bed.count}x {bed.type}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {listing.bathrooms != null && (
                  <div className="p-3 bg-[var(--navy-900)] rounded-lg border border-[var(--navy-600)]/30">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1">
                      Bathrooms
                    </div>
                    <div className="text-lg font-bold text-white">
                      {listing.bathrooms}
                    </div>
                    {listing.bathroomNotes && (
                      <div className="mt-1 text-xs text-[var(--navy-400)]">
                        {listing.bathroomNotes}
                      </div>
                    )}
                  </div>
                )}

                {listing.kitchen && (
                  <div className="p-3 bg-[var(--navy-900)] rounded-lg border border-[var(--navy-600)]/30">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1">
                      Kitchen
                    </div>
                    <div className="text-lg font-bold text-white capitalize">
                      {listing.kitchen}
                    </div>
                    {listing.kitchenDetails && (
                      <div className="mt-1 text-xs text-[var(--navy-400)]">
                        {listing.kitchenDetails}
                      </div>
                    )}
                  </div>
                )}

                {listing.beachDistance && (
                  <div className="p-3 bg-[var(--navy-900)] rounded-lg border border-[var(--navy-600)]/30">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-1">
                      Beach
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {listing.beachDistance}
                    </div>
                    {listing.beachType && (
                      <div className="mt-1 text-xs text-[var(--navy-400)]">
                        {listing.beachType} water
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Kid stuff */}
            {listing.kidFriendly && (
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div className="text-sm font-semibold text-green-400 mb-0.5">
                  Kid-Friendly
                </div>
                <p className="text-sm text-[var(--navy-400)]">
                  {listing.kidNotes || "This property is marked as kid-friendly"}
                </p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-2">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-[var(--navy-700)] text-[var(--navy-400)] text-xs rounded-md"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-2">
                  Description
                </h3>
                <p className="text-sm text-[var(--navy-400)] leading-relaxed line-clamp-6">
                  {listing.description}
                </p>
              </div>
            )}
          </div>
        ) : !editing ? (
          /* Empty state when no details were scraped */
          <div className="p-6">
            <div className="text-center py-6 px-4 bg-[var(--navy-900)] rounded-xl border border-[var(--navy-600)]/30">
              <div className="text-3xl mb-2 opacity-30">
                {isScraping ? "\u23F3" : "\u270F"}
              </div>
              <p className="text-sm text-[var(--navy-400)]">
                {isScraping
                  ? "Scraping property details..."
                  : "No property details available from scrape."}
              </p>
              <p className="text-xs text-[var(--navy-500)] mt-1">
                {isScraping
                  ? "This should take a few seconds."
                  : "Click Edit above to add details manually."}
              </p>
            </div>
          </div>
        ) : null}

        {/* Comments section */}
        <div className="border-t border-[var(--navy-600)] p-6">
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--navy-500)] mb-4">
            Comments ({listing.comments.length})
          </h3>

          {listing.comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {listing.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 bg-[var(--navy-900)] rounded-lg group"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-white">
                        {comment.userName}
                      </span>
                      <span className="text-[10px] text-[var(--navy-500)]">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {comment.userName === userName && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-[10px] text-[var(--navy-500)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete comment"
                      >
                        delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[var(--navy-400)] mt-1">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submitComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-[var(--navy-900)] border border-[var(--navy-600)] rounded-lg text-white placeholder:text-[var(--navy-500)] focus:outline-none focus:border-[var(--gold-500)] transition"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 text-sm bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition disabled:opacity-40"
            >
              Post
            </button>
          </form>
        </div>

        {/* Footer actions */}
        <div className="border-t border-[var(--navy-600)] p-4 flex items-center justify-between">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium bg-[var(--navy-700)] border border-[var(--navy-600)] text-white rounded-lg hover:border-[var(--navy-500)] transition"
          >
            View on {sourceLabel(listing.source)} &#8599;
          </a>
          <button
            onClick={deleteListing}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
