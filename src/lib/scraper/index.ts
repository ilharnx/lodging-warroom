import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Platform, ScrapedListing } from "@/types";
import { scrapeAirbnb } from "./airbnb";
import { scrapeGeneric } from "./generic";

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
      case "booking":
      case "other":
      default:
        data = await scrapeGeneric(url, platform);
        break;
    }

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
        scrapeStatus: "done",
        scrapeError: null,
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
