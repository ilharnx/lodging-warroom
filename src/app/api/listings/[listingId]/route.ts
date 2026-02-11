import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        votes: true,
        comments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      "name", "description", "totalCost", "perNight", "cleaningFee",
      "serviceFee", "taxes", "currency", "address", "neighborhood",
      "lat", "lng", "bedrooms", "beds", "bathrooms", "bathroomNotes",
      "kitchen", "kitchenDetails", "amenities", "kidFriendly", "kidNotes",
      "beachType", "beachDistance", "rating", "reviewCount",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data,
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        votes: true,
        comments: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    await prisma.listing.delete({ where: { id: listingId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting listing:", error);
    return NextResponse.json({ error: "Failed to delete listing" }, { status: 500 });
  }
}
