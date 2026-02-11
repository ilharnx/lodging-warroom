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
  const match = url.match(/vrbo\.[^/]+\/(?:vacation-rentals\/)?(\d+)/);
  return match ? match[1] : null;
}
