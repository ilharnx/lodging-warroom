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
  beds: string | null;
  bathrooms: number | null;
  bathroomNotes: string | null;
  kitchen: string | null;
  kitchenDetails: string | null;
  amenities: string | null;
  kidFriendly: boolean;
  kidNotes: string | null;
  beachType: string | null;
  beachDistance: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  neighborhood: string | null;
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
}

function formatPrice(amount: number | null, currency: string = "USD"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
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
}: ListingDetailProps) {
  const [photoFilter, setPhotoFilter] = useState("all");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredPhotos =
    photoFilter === "all"
      ? listing.photos
      : listing.photos.filter((p) => p.category === photoFilter);

  const amenities: string[] = listing.amenities
    ? JSON.parse(listing.amenities)
    : [];
  const beds = listing.beds ? JSON.parse(listing.beds) : [];
  const perPerson = listing.totalCost
    ? Math.round(listing.totalCost / adults)
    : null;

  const voteTotal = listing.votes.reduce((sum, v) => sum + v.value, 0);

  // Check for "hidden costs"
  const nightlyTotal = listing.perNight ? listing.perNight * 7 : 0; // rough estimate
  const fees = (listing.cleaningFee || 0) + (listing.serviceFee || 0);
  const hiddenCostWarning =
    nightlyTotal > 0 && fees > nightlyTotal * 0.15;

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

  async function deleteListing() {
    if (!confirm("Remove this listing?")) return;
    await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
    onClose();
    onRefresh();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4">
      <div className="bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-2xl max-w-2xl w-full relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--navy-700)] text-[var(--navy-500)] hover:text-white transition"
        >
          &#10005;
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between pr-8">
            <div>
              <h2 className="text-xl font-bold text-white">{listing.name}</h2>
              <p className="text-sm text-[var(--navy-500)] mt-1">
                {listing.neighborhood || listing.address || listing.source}
              </p>
            </div>
            {listing.rating && (
              <div className="text-right shrink-0">
                <div className="text-sm text-white font-semibold">
                  <span className="text-yellow-400">&#9733;</span>{" "}
                  {listing.rating}
                </div>
                {listing.reviewCount && (
                  <div className="text-xs text-[var(--navy-500)]">
                    {listing.reviewCount} reviews
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price block */}
          <div className="mt-4 p-4 bg-[var(--navy-900)] rounded-lg">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-[var(--gold-400)]">
                {listing.totalCost
                  ? formatPrice(listing.totalCost, listing.currency)
                  : listing.perNight
                    ? formatPrice(listing.perNight, listing.currency)
                    : "Price TBD"}
              </span>
              <span className="text-sm text-[var(--navy-500)]">
                {listing.totalCost ? "total" : listing.perNight ? "/night" : ""}
              </span>
              {perPerson && (
                <span className="text-sm text-[var(--gold-400)]/70">
                  {formatPrice(perPerson)}/person
                </span>
              )}
            </div>

            {/* Cost breakdown */}
            {(listing.cleaningFee || listing.serviceFee || listing.taxes) && (
              <div className="mt-2 space-y-1 text-xs text-[var(--navy-500)]">
                {listing.perNight && (
                  <div className="flex justify-between">
                    <span>Nightly rate</span>
                    <span>{formatPrice(listing.perNight)}/night</span>
                  </div>
                )}
                {listing.cleaningFee && (
                  <div className="flex justify-between">
                    <span>Cleaning fee</span>
                    <span>{formatPrice(listing.cleaningFee)}</span>
                  </div>
                )}
                {listing.serviceFee && (
                  <div className="flex justify-between">
                    <span>Service fee</span>
                    <span>{formatPrice(listing.serviceFee)}</span>
                  </div>
                )}
                {listing.taxes && (
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span>{formatPrice(listing.taxes)}</span>
                  </div>
                )}
              </div>
            )}

            {hiddenCostWarning && (
              <div className="mt-2 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded">
                Heads up: fees are &gt;15% of the nightly total
              </div>
            )}
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
                        : "bg-[var(--navy-700)] text-[var(--navy-500)] hover:text-white"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Photos grid */}
            <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="aspect-video relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || ""}
                    className="w-full h-full object-cover"
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

        {/* The Big 4 */}
        <div className="p-6 space-y-4">
          {/* Bedrooms */}
          {listing.bedrooms != null && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                BEDROOMS ({listing.bedrooms})
              </h3>
              {beds.length > 0 ? (
                <ul className="text-sm text-[var(--navy-500)] space-y-0.5">
                  {beds.map(
                    (bed: { type: string; count: number }, i: number) => (
                      <li key={i}>
                        {bed.count}x {bed.type}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-sm text-[var(--navy-500)]">
                  {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Bathrooms */}
          {listing.bathrooms != null && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                BATHROOMS ({listing.bathrooms})
              </h3>
              <p className="text-sm text-[var(--navy-500)]">
                {listing.bathroomNotes ||
                  `${listing.bathrooms} bathroom${listing.bathrooms !== 1 ? "s" : ""}`}
              </p>
            </div>
          )}

          {/* Kitchen */}
          {listing.kitchen && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                KITCHEN:{" "}
                <span className="capitalize font-normal">
                  {listing.kitchen}
                </span>
              </h3>
              {listing.kitchenDetails && (
                <p className="text-sm text-[var(--navy-500)]">
                  {listing.kitchenDetails}
                </p>
              )}
            </div>
          )}

          {/* Beach */}
          {listing.beachDistance && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">BEACH</h3>
              <p className="text-sm text-[var(--navy-500)]">
                {listing.beachDistance}
                {listing.beachType ? ` — ${listing.beachType} water` : ""}
              </p>
            </div>
          )}

          {/* Kid stuff */}
          {listing.kidFriendly && (
            <div>
              <h3 className="text-sm font-semibold text-green-400 mb-1">
                KID STUFF
              </h3>
              <p className="text-sm text-[var(--navy-500)]">
                {listing.kidNotes || "Kid-friendly property"}
              </p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                AMENITIES
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((a: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-[var(--navy-700)] text-[var(--navy-500)] text-xs rounded"
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
              <h3 className="text-sm font-semibold text-white mb-1">
                DESCRIPTION
              </h3>
              <p className="text-sm text-[var(--navy-500)] line-clamp-6">
                {listing.description}
              </p>
            </div>
          )}
        </div>

        {/* Comments section */}
        <div className="border-t border-[var(--navy-600)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Comments ({listing.comments.length})
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  voteTotal > 0
                    ? "text-green-400"
                    : voteTotal < 0
                      ? "text-red-400"
                      : "text-[var(--navy-500)]"
                }
              >
                {voteTotal > 0 ? "+" : ""}
                {voteTotal} votes
              </span>
            </div>
          </div>

          {listing.comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {listing.comments.map((comment) => (
                <div key={comment.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-white">
                      {comment.userName}
                    </span>
                    <span className="text-[10px] text-[var(--navy-500)]">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--navy-500)] mt-0.5">
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
              className="flex-1 px-3 py-2 text-sm bg-[var(--navy-900)] border border-[var(--navy-600)] rounded-lg text-white placeholder:text-[var(--navy-500)] focus:outline-none focus:border-[var(--gold-500)]"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="px-4 py-2 text-sm bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition disabled:opacity-50"
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
            className="px-4 py-2 text-sm bg-[var(--navy-700)] border border-[var(--navy-600)] text-white rounded-lg hover:border-[var(--navy-500)] transition"
          >
            View Original Listing &#8599;
          </a>
          <button
            onClick={deleteListing}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
