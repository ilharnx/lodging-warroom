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
  kitchen: string | null;
  rating: number | null;
  reviewCount: number | null;
  beachDistance: string | null;
  kidFriendly: boolean;
  scrapeStatus: string;
  scrapeError: string | null;
  address: string | null;
  neighborhood: string | null;
  photos: Photo[];
  votes: Vote[];
  amenities: string | null;
}

interface ListingCardProps {
  listing: Listing;
  adults: number;
  isSelected: boolean;
  userName: string;
  onSelect: () => void;
  onViewDetail: () => void;
  onVote: (value: 1 | -1) => void;
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

export function ListingCard({
  listing,
  adults,
  isSelected,
  userName,
  onSelect,
  onViewDetail,
  onVote,
}: ListingCardProps) {
  const voteTotal = listing.votes.reduce((sum, v) => sum + v.value, 0);
  const userVote = listing.votes.find((v) => v.userName === userName);
  const perPerson = listing.totalCost
    ? Math.round(listing.totalCost / adults)
    : null;

  const hasPool = listing.amenities
    ? JSON.parse(listing.amenities).some(
        (a: string) =>
          a.toLowerCase().includes("pool") ||
          a.toLowerCase().includes("swimming")
      )
    : false;

  const isScraping =
    listing.scrapeStatus === "pending" || listing.scrapeStatus === "scraping";
  const isFailed = listing.scrapeStatus === "failed";

  return (
    <div
      id={`listing-${listing.id}`}
      onClick={onSelect}
      className={`rounded-xl border transition cursor-pointer ${
        isSelected
          ? "border-[var(--gold-500)] bg-[var(--navy-700)]"
          : "border-[var(--navy-600)] bg-[var(--navy-800)] hover:border-[var(--navy-500)]"
      }`}
    >
      {/* Photo strip */}
      {listing.photos.length > 0 && (
        <div className="flex gap-0.5 overflow-hidden rounded-t-xl h-28">
          {listing.photos.slice(0, 3).map((photo, i) => (
            <div
              key={photo.id}
              className={`relative overflow-hidden ${
                i === 0 ? "flex-[2]" : "flex-1"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {listing.photos.length > 3 && (
            <div className="flex-1 bg-[var(--navy-700)] flex items-center justify-center text-xs text-[var(--navy-500)]">
              +{listing.photos.length - 3}
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        {/* Status badge for scraping/failed */}
        {isScraping && (
          <div className="mb-2 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded inline-block">
            Scraping...
          </div>
        )}
        {isFailed && (
          <div className="mb-2 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded inline-block">
            Scrape failed{listing.scrapeError ? `: ${listing.scrapeError}` : ""}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">
              {listing.name}
            </h3>
            {listing.neighborhood && (
              <p className="text-xs text-[var(--navy-500)] truncate">
                {listing.neighborhood}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${sourceColor(
              listing.source
            )}`}
          >
            {sourceLabel(listing.source)}
          </span>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          {listing.totalCost ? (
            <>
              <span className="text-lg font-bold text-[var(--gold-400)]">
                {formatPrice(listing.totalCost, listing.currency)}
              </span>
              <span className="text-xs text-[var(--navy-500)]">total</span>
              {perPerson && (
                <span className="text-xs text-[var(--gold-400)]/70">
                  ({formatPrice(perPerson)}/pp)
                </span>
              )}
            </>
          ) : listing.perNight ? (
            <>
              <span className="text-lg font-bold text-[var(--gold-400)]">
                {formatPrice(listing.perNight, listing.currency)}
              </span>
              <span className="text-xs text-[var(--navy-500)]">/night</span>
            </>
          ) : (
            <span className="text-sm text-[var(--navy-500)]">Price TBD</span>
          )}
        </div>

        {/* The Big 4 summary */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--navy-500)]">
          {listing.bedrooms != null && (
            <span>{listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""}</span>
          )}
          {listing.bathrooms != null && (
            <span>{listing.bathrooms} bath</span>
          )}
          {listing.kitchen && <span>{listing.kitchen} kitchen</span>}
          {listing.beachDistance && <span>{listing.beachDistance}</span>}
          {hasPool && <span>Pool</span>}
          {listing.kidFriendly && (
            <span className="text-green-400">Kid-friendly</span>
          )}
        </div>

        {/* Rating */}
        {listing.rating && (
          <div className="mt-1.5 text-xs text-[var(--navy-500)]">
            <span className="text-yellow-400">&#9733;</span> {listing.rating}
            {listing.reviewCount ? ` (${listing.reviewCount})` : ""}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between">
          {/* Voting */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVote(1);
              }}
              className={`p-1.5 rounded transition ${
                userVote?.value === 1
                  ? "text-green-400 bg-green-400/10"
                  : "text-[var(--navy-500)] hover:text-green-400"
              }`}
              title="Upvote"
            >
              &#9650;
            </button>
            <span
              className={`text-sm font-semibold min-w-[20px] text-center ${
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
              onClick={(e) => {
                e.stopPropagation();
                onVote(-1);
              }}
              className={`p-1.5 rounded transition ${
                userVote?.value === -1
                  ? "text-red-400 bg-red-400/10"
                  : "text-[var(--navy-500)] hover:text-red-400"
              }`}
              title="Downvote"
            >
              &#9660;
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail();
              }}
              className="px-3 py-1 text-xs bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-500)] rounded hover:border-[var(--gold-500)] hover:text-[var(--gold-400)] transition"
            >
              Details
            </button>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1 text-xs bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-500)] rounded hover:border-[var(--navy-500)] transition"
            >
              View &#8599;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
