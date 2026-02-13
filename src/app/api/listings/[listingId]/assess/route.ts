import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assessListing } from "@/lib/ai/assess";
import type { TripPreferences } from "@/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { trip: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const preferences = listing.trip.preferences as TripPreferences | null;
    if (!preferences) {
      return NextResponse.json(
        { error: "Trip has no preferences set" },
        { status: 400 }
      );
    }

    const assessment = await assessListing(
      {
        name: listing.name,
        description: listing.description,
        perNight: listing.perNight,
        totalCost: listing.totalCost,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        kitchen: listing.kitchen,
        amenities: listing.amenities,
        beachDistance: listing.beachDistance,
        beachType: listing.beachType,
        kidFriendly: listing.kidFriendly,
        kidNotes: listing.kidNotes,
      },
      {
        adults: listing.trip.adults,
        kids: listing.trip.kids,
        preferences,
      }
    );

    // Store assessment on listing
    await prisma.listing.update({
      where: { id: listingId },
      data: { aiFitAssessment: JSON.parse(JSON.stringify(assessment)) },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error assessing listing:", error);
    const message = error instanceof Error ? error.message : "Assessment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
