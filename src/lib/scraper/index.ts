import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Platform, ScrapedListing } from "@/types";
import { scrapeAirbnb } from "./airbnb";
import { scrapeVrbo } from "./vrbo";
import { scrapeGeneric } from "./generic";

const GENERIC_NAMES = [
  "loading...",
  "listing from airbnb",
  "listing from vrbo",
  "listing from booking",
  "listing from other",
  "airbnb listing",
  "vrbo listing",
];

/** Check if scraped data is essentially empty / fallback */
function isPartialData(data: ScrapedListing): boolean {
  const nameIsGeneric =
    !data.name ||
    GENERIC_NAMES.some((g) => data.name.toLowerCase().startsWith(g)) ||
    /^(airbnb|vrbo)\s+\d*$/i.test(data.name.trim());
  const noPrice = !data.perNight && !data.totalCost;
  const noPhotos = !data.photos || data.photos.length === 0;

  // If name is generic AND (no price AND no photos) => partial
  if (nameIsGeneric && noPrice && noPhotos) return true;
  // If absolutely nothing useful
  if (nameIsGeneric && noPrice && !data.bedrooms && !data.description) return true;
  return false;
}

/** Merge two ScrapedListing results, keeping the better value for each field */
function mergeBest(a: ScrapedListing, b: ScrapedListing): ScrapedListing {
  const pick = <T>(av: T | undefined, bv: T | undefined): T | undefined =>
    av ?? bv;
  const pickStr = (av: string | undefined, bv: string | undefined): string | undefined => {
    if (av && !GENERIC_NAMES.some((g) => av.toLowerCase().startsWith(g))) return av;
    if (bv && !GENERIC_NAMES.some((g) => bv.toLowerCase().startsWith(g))) return bv;
    return av || bv;
  };

  return {
    name: pickStr(a.name, b.name) || a.name,
    description: a.description || b.description,
    source: a.source,
    externalId: a.externalId || b.externalId,
    totalCost: pick(a.totalCost, b.totalCost),
    perNight: pick(a.perNight, b.perNight),
    cleaningFee: pick(a.cleaningFee, b.cleaningFee),
    serviceFee: pick(a.serviceFee, b.serviceFee),
    taxes: pick(a.taxes, b.taxes),
    currency: a.currency || b.currency,
    address: a.address || b.address,
    neighborhood: a.neighborhood || b.neighborhood,
    lat: a.lat !== 0 ? a.lat : b.lat,
    lng: a.lng !== 0 ? a.lng : b.lng,
    bedrooms: pick(a.bedrooms, b.bedrooms),
    beds: a.beds?.length ? a.beds : b.beds,
    bathrooms: pick(a.bathrooms, b.bathrooms),
    bathroomNotes: a.bathroomNotes || b.bathroomNotes,
    kitchen: a.kitchen || b.kitchen,
    kitchenDetails: a.kitchenDetails || b.kitchenDetails,
    photos:
      (a.photos?.length ?? 0) >= (b.photos?.length ?? 0)
        ? a.photos
        : b.photos,
    amenities:
      (a.amenities?.length ?? 0) >= (b.amenities?.length ?? 0)
        ? a.amenities
        : b.amenities,
    kidFriendly: a.kidFriendly || b.kidFriendly,
    kidNotes: a.kidNotes || b.kidNotes,
    beachType: a.beachType || b.beachType,
    beachDistance: a.beachDistance || b.beachDistance,
    rating: pick(a.rating, b.rating),
    reviewCount: pick(a.reviewCount, b.reviewCount),
  };
}

/** Attempt to fetch a URL with a mobile user agent (sites often serve simpler HTML) */
async function fetchWithMobileUA(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Parse basic data from any HTML page (fallback parser) */
function parseMinimalHtml(html: string, platform: Platform): ScrapedListing {
  const result: ScrapedListing = {
    name: "",
    source: platform,
    lat: 0,
    lng: 0,
  };

  // OG title
  const ogTitleMatch =
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
    html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/);
  if (ogTitleMatch) {
    result.name = ogTitleMatch[1]
      .replace(/\s*[-|].*$/g, "")
      .replace(/&amp;/g, "&")
      .trim();
  }

  // Page title fallback
  if (!result.name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) {
      result.name = titleMatch[1]
        .replace(/\s*[-|].*$/g, "")
        .replace(/&amp;/g, "&")
        .trim();
    }
  }

  // OG image
  const ogImgMatch =
    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/) ||
    html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"/);
  if (ogImgMatch) {
    result.photos = [{ url: ogImgMatch[1].replace(/&amp;/g, "&") }];
  }

  // OG description
  const ogDescMatch =
    html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) ||
    html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:description"/);
  if (ogDescMatch) {
    result.description = ogDescMatch[1].replace(/&amp;/g, "&");
  }

  // Price pattern
  const priceMatch = html.match(/\$(\d[\d,]*)\s*(?:per|\/)\s*night/i);
  if (priceMatch) {
    const price = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (price > 10 && price < 100000) result.perNight = price;
  }

  // Coordinates
  const latMatch = html.match(/"lat(?:itude)?":\s*([-\d.]+)/);
  const lngMatch = html.match(/"(?:lng|longitude)":\s*([-\d.]+)/);
  if (latMatch && lngMatch) {
    result.lat = parseFloat(latMatch[1]);
    result.lng = parseFloat(lngMatch[1]);
  }

  // Bedrooms / bathrooms
  const bedroomMatch = html.match(/(\d+)\s*bedroom/i);
  if (bedroomMatch) result.bedrooms = parseInt(bedroomMatch[1]);
  const bathroomMatch = html.match(/([\d.]+)\s*bathroom/i);
  if (bathroomMatch) result.bathrooms = parseFloat(bathroomMatch[1]);

  return result;
}

export async function scrapeUrl(
  listingId: string,
  url: string,
  platform: Platform
): Promise<void> {
  try {
    // Mark as scraping
    await prisma.listing.update({
      where: { id: listingId },
      data: { scrapeStatus: "scraping" },
    });

    let data: ScrapedListing;

    switch (platform) {
      case "airbnb":
        data = await scrapeAirbnb(url);
        break;
      case "vrbo":
        data = await scrapeVrbo(url);
        break;
      case "booking":
      case "other":
      default:
        data = await scrapeGeneric(url, platform);
        break;
    }

    // If first attempt yielded partial data, retry with mobile UA
    if (isPartialData(data)) {
      console.log(`Partial data for ${url}, retrying with mobile UA...`);
      try {
        // Short delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1500));
        const mobileHtml = await fetchWithMobileUA(url);
        const mobileData = parseMinimalHtml(mobileHtml, platform);
        data = mergeBest(data, mobileData);
      } catch (retryErr) {
        console.error(`Mobile UA retry failed for ${url}:`, retryErr);
        // Keep whatever we got from the first attempt
      }
    }

    const scrapeStatus = isPartialData(data) ? "partial" : "done";

    // Create photos if any
    if (data.photos && data.photos.length > 0) {
      await prisma.photo.createMany({
        data: data.photos.map((p, i) => ({
          listingId,
          url: p.url,
          caption: p.caption || null,
          category: p.category || null,
          sortOrder: i,
        })),
      });
    }

    // Update listing with scraped data
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        name: data.name,
        description: data.description || null,
        source: data.source,
        externalId: data.externalId || null,
        totalCost: data.totalCost || null,
        perNight: data.perNight || null,
        cleaningFee: data.cleaningFee || null,
        serviceFee: data.serviceFee || null,
        taxes: data.taxes || null,
        currency: data.currency || "USD",
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        lat: data.lat,
        lng: data.lng,
        bedrooms: data.bedrooms || null,
        beds: data.beds ? (data.beds as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        bathrooms: data.bathrooms || null,
        bathroomNotes: data.bathroomNotes || null,
        kitchen: data.kitchen || null,
        kitchenDetails: data.kitchenDetails || null,
        amenities: data.amenities ? (data.amenities as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        kidFriendly: data.kidFriendly || false,
        kidNotes: data.kidNotes || null,
        beachType: data.beachType || null,
        beachDistance: data.beachDistance || null,
        rating: data.rating || null,
        reviewCount: data.reviewCount || null,
        scrapeStatus,
        scrapeError: scrapeStatus === "partial" ? "Limited data extracted — try editing manually" : null,
        lastScraped: new Date(),
      },
    });
  } catch (error) {
    console.error(`Scrape error for ${url}:`, error);
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        scrapeStatus: "failed",
        scrapeError: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
