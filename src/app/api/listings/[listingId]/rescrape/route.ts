import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlatform } from "@/lib/scraper/detect";
import { scrapeUrl } from "@/lib/scraper";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Delete old photos so they get re-created
    await prisma.photo.deleteMany({ where: { listingId } });

    // Reset status
    await prisma.listing.update({
      where: { id: listingId },
      data: { scrapeStatus: "pending", scrapeError: null },
    });

    const platform = detectPlatform(listing.url);

    after(async () => {
      try {
        await scrapeUrl(listingId, listing.url, platform);
      } catch (err) {
        console.error(`Re-scrape failed for ${listingId}:`, err);
      }
    });

    return NextResponse.json({ status: "queued" });
  } catch (error) {
    console.error("Error re-scraping listing:", error);
    return NextResponse.json({ error: "Failed to re-scrape" }, { status: 500 });
  }
}
