import type { Platform } from "@/types";

export function detectPlatform(url: string): Platform {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("airbnb")) return "airbnb";
    if (hostname.includes("vrbo")) return "vrbo";
    if (hostname.includes("booking.com")) return "booking";
    return "other";
  } catch {
    return "other";
  }
}

export function extractAirbnbId(url: string): string | null {
  const match = url.match(/airbnb\.[^/]+\/rooms\/(\d+)/);
  return match ? match[1] : null;
}

export function extractVrboId(url: string): string | null {
  // Handle all Vrbo URL patterns:
  // vrbo.com/1234567
  // vrbo.com/vacation-rentals/barbados/1234567
  // vrbo.com/en-us/vacation-rentals/1234567
  // vrbo.com/vacation-rentals/some-slug/p1234567
  const pPrefixed = url.match(/vrbo\.[^/]+\/.*\/p(\d{5,})/);
  if (pPrefixed) return pPrefixed[1];
  // Find a numeric segment (5+ digits) anywhere in the path
  const pathMatch = url.match(/vrbo\.[^/]+\/(?:[^?#]*\/)?(\d{5,})/);
  return pathMatch ? pathMatch[1] : null;
}
