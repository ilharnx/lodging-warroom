export interface BedInfo {
  type: string;
  count: number;
}

export interface TripFormData {
  name: string;
  destination: string;
  centerLat: number;
  centerLng: number;
  adults?: number;
  kids?: number;
  nights?: number;
  checkIn?: string;
  checkOut?: string;
}

export interface ListingFormData {
  url: string;
  addedBy?: string;
}

export type ReactionType = "positive" | "maybe" | "pass";

/** Legacy types kept for backwards compatibility during migration */
export type LegacyReactionType = "fire" | "love" | "think";

/** Map legacy reaction types to new ones */
export function normalizeReactionType(type: string): ReactionType {
  if (type === "fire" || type === "love" || type === "positive") return "positive";
  if (type === "think" || type === "maybe") return "maybe";
  return "pass";
}

export const REACTIONS: { type: ReactionType; label: string; color: string }[] = [
  { type: "positive", label: "Positive", color: "#C4725A" },
  { type: "maybe", label: "Maybe", color: "#B8A48E" },
  { type: "pass", label: "Pass", color: "#7A7269" },
];

export const REACTION_VALUE: Record<ReactionType, number> = {
  positive: 1,
  maybe: 0,
  pass: -1,
};

export interface VoteData {
  userName: string;
  reactionType: ReactionType;
}

export interface CommentData {
  userName: string;
  text: string;
}

export type ScrapeStatus = "pending" | "scraping" | "done" | "partial" | "failed";
export type Platform = "airbnb" | "vrbo" | "booking" | "other";
export type KitchenType = "full" | "kitchenette" | "microwave" | "none";
export type PhotoCategory =
  | "exterior"
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "pool"
  | "living"
  | "view"
  | "dining"
  | "other";

export interface ScrapedListing {
  name: string;
  description?: string;
  source: Platform;
  externalId?: string;
  totalCost?: number;
  perNight?: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  currency?: string;
  address?: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  bedrooms?: number;
  beds?: BedInfo[];
  bathrooms?: number;
  bathroomNotes?: string;
  kitchen?: KitchenType;
  kitchenDetails?: string;
  photos?: { url: string; caption?: string; category?: PhotoCategory }[];
  amenities?: string[];
  kidFriendly?: boolean;
  kidNotes?: string;
  beachType?: string;
  beachDistance?: string;
  rating?: number;
  reviewCount?: number;
}

// Trip Preferences
export type Vibe = "chill" | "balanced" | "active";

export interface TripPreferences {
  vibe: Vibe | null;
  mustHaves: string[];
  niceToHaves: string[];
  dealbreakers: string[];
  kidNeeds: string[];
  notes: string;
}

export const EMPTY_PREFERENCES: TripPreferences = {
  vibe: null,
  mustHaves: [],
  niceToHaves: [],
  dealbreakers: [],
  kidNeeds: [],
  notes: "",
};

// AI Fit Assessment
export type FitScore = "good" | "okay" | "poor";

export interface AIFitAssessment {
  score: FitScore;
  checks: string[];
  warnings: string[];
  highlights: string[];
  summary: string;
  assessedAt: string;
}

export interface FilterState {
  sources: Platform[];
  priceMin: number;
  priceMax: number;
  bedroomsMin: number;
  bathroomsMin: number;
  kitchen: KitchenType[];
  beachDistance: string;
  ratingMin: number;
  sortBy: "price_asc" | "votes_desc" | "rating" | "recent";
}
