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

export interface VoteData {
  userName: string;
  value: 1 | -1;
}

export interface CommentData {
  userName: string;
  text: string;
}

export type ScrapeStatus = "pending" | "scraping" | "done" | "failed";
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

export interface FilterState {
  sources: Platform[];
  priceMin: number;
  priceMax: number;
  bedroomsMin: number;
  bathroomsMin: number;
  kitchen: KitchenType[];
  kidFriendlyOnly: boolean;
  beachDistance: string;
  ratingMin: number;
  hasPool: boolean;
  sortBy: "price_asc" | "votes_desc" | "rating" | "recent";
}
