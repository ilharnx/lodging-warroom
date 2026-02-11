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
  beachType: string | null;
  kidFriendly: boolean;
  kidNotes: string | null;
  scrapeStatus: string;
  scrapeError: string | null;
  address: string | null;
  neighborhood: string | null;
  addedBy: string | null;
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
    airbnb: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    vrbo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    booking: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return colors[source] || colors.other;
}

function sourceBgGradient(source: string): string {
  const gradients: Record<string, string> = {
    airbnb: "from-rose-900/40 to-rose-950/60",
    vrbo: "from-blue-900/40 to-blue-950/60",
    booking: "from-indigo-900/40 to-indigo-950/60",
    other: "from-gray-800/40 to-gray-900/60",
  };
  return gradients[source] || gradients.other;
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
  onViewDetail,
  onVote,
  onRescrape,
}: ListingCardProps) {
  const voteTotal = listing.votes.reduce((sum, v) => sum + v.value, 0);
  const userVote = listing.votes.find((v) => v.userName === userName);
  const perPerson = listing.totalCost
    ? Math.round(listing.totalCost / adults)
    : null;

  const hasPool = Array.isArray(listing.amenities)
    ? listing.amenities.some(
        (a: string) =>
          a.toLowerCase().includes("pool") ||
          a.toLowerCase().includes("swimming")
      )
    : false;

  const isScraping =
    listing.scrapeStatus === "pending" || listing.scrapeStatus === "scraping";
  const isFailed = listing.scrapeStatus === "failed";
  const isPartial = listing.scrapeStatus === "partial";
  const isGenericName =
    listing.name.startsWith("Listing from") ||
    listing.name === "Loading..." ||
    listing.name.startsWith("VRBO ") ||
    listing.name.startsWith("Airbnb Listing");
  const hasBig4 =
    listing.bedrooms != null ||
    listing.bathrooms != null ||
    listing.kitchen ||
    listing.beachDistance ||
    listing.beachType;

  return (
    <div
      id={`listing-${listing.id}`}
      onClick={onSelect}
      className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? "border-[var(--gold-500)] bg-[var(--navy-700)] shadow-lg shadow-[var(--gold-500)]/10"
          : "border-[var(--navy-600)] bg-[var(--navy-800)] hover:border-[var(--navy-500)] hover:shadow-md hover:shadow-black/20"
      }`}
    >
      {/* Photo strip or placeholder */}
      {listing.photos.length > 0 ? (
        <div className="flex gap-0.5 overflow-hidden h-32">
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
                loading="lazy"
              />
            </div>
          ))}
          {listing.photos.length > 3 && (
            <div className="flex-1 bg-[var(--navy-700)] flex items-center justify-center text-xs text-[var(--navy-400)]">
              +{listing.photos.length - 3}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`h-24 bg-gradient-to-br ${sourceBgGradient(
            listing.source
          )} flex items-center justify-center gap-2`}
        >
          {isScraping ? (
            <div className="flex items-center gap-2 scraping-pulse">
              <div className="w-5 h-5 border-2 border-[var(--gold-400)]/40 border-t-[var(--gold-400)] rounded-full animate-spin" />
              <span className="text-sm text-[var(--navy-400)]">
                Scraping listing...
              </span>
            </div>
          ) : (
            <>
              <span className="text-2xl opacity-30">
                {listing.source === "airbnb"
                  ? "\u2302"
                  : listing.source === "vrbo"
                    ? "\u2616"
                    : "\u2302"}
              </span>
              <span className="text-sm text-[var(--navy-500)]">
                {getDomain(listing.url)}
              </span>
            </>
          )}
        </div>
      )}

      <div className="p-3.5">
        {/* Status badges */}
        {isScraping && listing.photos.length > 0 && (
          <div className="mb-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-md inline-flex items-center gap-1.5 scraping-pulse">
            <div className="w-3 h-3 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            Scraping details...
          </div>
        )}
        {isFailed && (
          <div className="mb-2 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md flex items-center justify-between">
            <span>Scrape failed</span>
            {onRescrape && (
              <button
                onClick={(e) => { e.stopPropagation(); onRescrape(); }}
                className="ml-2 text-[10px] font-semibold underline hover:text-red-300 transition"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {isPartial && (
          <div className="mb-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-md flex items-center justify-between">
            <span>Limited data scraped</span>
            {onRescrape && (
              <button
                onClick={(e) => { e.stopPropagation(); onRescrape(); }}
                className="ml-2 text-[10px] font-semibold underline hover:text-amber-300 transition"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Source + Rating row */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${sourceColor(
              listing.source
            )}`}
          >
            {sourceLabel(listing.source)}
          </span>
          {listing.rating != null && listing.rating > 0 && (
            <span className="text-xs text-[var(--navy-400)] flex items-center gap-1">
              <span className="text-yellow-400">&#9733;</span>
              <span className="text-white font-medium">{listing.rating}</span>
              {listing.reviewCount ? (
                <span className="text-[var(--navy-500)]">({listing.reviewCount})</span>
              ) : null}
            </span>
          )}
          {listing.neighborhood && (
            <span className="text-[11px] text-[var(--navy-500)] ml-auto truncate max-w-[120px]">
              {listing.neighborhood}
            </span>
          )}
        </div>

        {/* Title + Price side by side */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm leading-snug">
              {isGenericName ? (
                <span className="text-[var(--navy-400)]">
                  {listing.name}
                </span>
              ) : (
                <span className="line-clamp-2">{listing.name}</span>
              )}
            </h3>
            {isGenericName && (
              <p className="text-[10px] text-[var(--navy-500)] mt-0.5 truncate">
                {getDomain(listing.url)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            {listing.totalCost ? (
              <>
                <div className="text-lg font-bold text-[var(--gold-400)]">
                  {formatPrice(listing.totalCost, listing.currency)}
                </div>
                <div className="text-[10px] text-[var(--navy-400)]">
                  {perPerson ? `${formatPrice(perPerson)}/pp` : "total"}
                </div>
              </>
            ) : listing.perNight ? (
              <>
                <div className="text-lg font-bold text-[var(--gold-400)]">
                  {formatPrice(listing.perNight, listing.currency)}
                </div>
                <div className="text-[10px] text-[var(--navy-400)]">/night</div>
              </>
            ) : (
              <span className="text-xs text-[var(--navy-500)] italic">
                {isScraping ? "..." : "—"}
              </span>
            )}
          </div>
        </div>

        {/* The Big 4 grid - barbados style */}
        {hasBig4 && (
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 px-2.5 py-2 bg-[var(--navy-900)]/60 rounded-lg border border-[var(--navy-600)]/30">
            {listing.bedrooms != null && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--navy-400)]">
                <span className="text-[14px] w-5 text-center opacity-60">&#x1F6CF;&#xFE0F;</span>
                {listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""}
              </div>
            )}
            {listing.bathrooms != null && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--navy-400)]">
                <span className="text-[14px] w-5 text-center opacity-60">&#x1F6BF;</span>
                {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
              </div>
            )}
            {listing.kitchen && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--navy-400)]">
                <span className="text-[14px] w-5 text-center opacity-60">&#x1F373;</span>
                <span className="capitalize truncate">{listing.kitchen}</span>
              </div>
            )}
            {(listing.beachDistance || listing.beachType) && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--navy-400)]">
                <span className="text-[14px] w-5 text-center opacity-60">&#x1F3D6;&#xFE0F;</span>
                <span className="truncate">{listing.beachDistance || listing.beachType}</span>
              </div>
            )}
          </div>
        )}

        {/* Amenity highlights */}
        {(hasPool || listing.kidFriendly) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hasPool && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] rounded-md">
                Pool
              </span>
            )}
            {listing.kidFriendly && (
              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[11px] rounded-md">
                {listing.kidNotes
                  ? `Kid-friendly: ${listing.kidNotes}`
                  : "Kid-friendly"}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-[var(--navy-600)]/50 flex items-center justify-between">
          {/* Voting */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVote(1);
              }}
              className={`p-1.5 rounded-md transition-all ${
                userVote?.value === 1
                  ? "text-green-400 bg-green-400/15"
                  : "text-[var(--navy-400)] hover:text-green-400 hover:bg-green-400/10"
              }`}
              title="Upvote"
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
              onClick={(e) => {
                e.stopPropagation();
                onVote(-1);
              }}
              className={`p-1.5 rounded-md transition-all ${
                userVote?.value === -1
                  ? "text-red-400 bg-red-400/15"
                  : "text-[var(--navy-400)] hover:text-red-400 hover:bg-red-400/10"
              }`}
              title="Downvote"
            >
              &#9660;
            </button>
            {listing.addedBy && (
              <span className="text-[10px] text-[var(--navy-500)] ml-1.5">
                by {listing.addedBy}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail();
              }}
              className="px-3 py-1.5 text-xs font-medium bg-[var(--gold-500)]/10 border border-[var(--gold-500)]/30 text-[var(--gold-400)] rounded-lg hover:bg-[var(--gold-500)]/20 hover:border-[var(--gold-500)]/50 transition-all"
            >
              Details
            </button>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 text-xs font-medium bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-400)] rounded-lg hover:border-[var(--navy-500)] hover:text-white transition-all"
            >
              View &#8599;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
