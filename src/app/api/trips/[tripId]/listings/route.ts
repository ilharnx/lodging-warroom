import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlatform } from "@/lib/scraper/detect";
import { scrapeUrl } from "@/lib/scraper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();
    const { url, addedBy } = body;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const platform = detectPlatform(url);

    // Create listing with pending status
    const listing = await prisma.listing.create({
      data: {
        tripId,
        url,
        source: platform,
        name: "Loading...",
        lat: trip.centerLat,
        lng: trip.centerLng,
        scrapeStatus: "pending",
        addedBy: addedBy || null,
      },
    });

    // Use after() to keep the serverless function alive for the scrape
    after(async () => {
      try {
        await scrapeUrl(listing.id, url, platform);
      } catch (err) {
        console.error(`Scrape failed for ${listing.id}:`, err);
      }
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Error adding listing:", error);
    return NextResponse.json({ error: "Failed to add listing" }, { status: 500 });
  }
}
