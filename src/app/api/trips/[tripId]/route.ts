import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true, name: true, destination: true,
        centerLat: true, centerLng: true,
        adults: true, kids: true,
        nights: true, checkIn: true, checkOut: true,
        createdAt: true,
        listings: {
          select: {
            id: true, tripId: true, url: true, source: true, externalId: true,
            name: true, description: true,
            totalCost: true, perNight: true, cleaningFee: true,
            serviceFee: true, taxes: true, currency: true,
            address: true, neighborhood: true, lat: true, lng: true,
            bedrooms: true, beds: true, bathrooms: true, bathroomNotes: true,
            kitchen: true, kitchenDetails: true, amenities: true,
            kidFriendly: true, kidNotes: true, beachType: true, beachDistance: true,
            rating: true, reviewCount: true, addedBy: true,
            scrapeStatus: true, scrapeError: true, lastScraped: true,
            createdAt: true, updatedAt: true,
            photos: { orderBy: { sortOrder: "asc" } },
            votes: true,
            comments: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();

    const existing = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.destination !== undefined) data.destination = body.destination;
    if (body.centerLat !== undefined) data.centerLat = Number(body.centerLat);
    if (body.centerLng !== undefined) data.centerLng = Number(body.centerLng);
    if (body.adults !== undefined) data.adults = Number(body.adults);
    if (body.kids !== undefined) data.kids = Number(body.kids);
    if (body.nights !== undefined) data.nights = body.nights ? Number(body.nights) : null;
    if (body.checkIn !== undefined) data.checkIn = body.checkIn ? new Date(body.checkIn) : null;
    if (body.checkOut !== undefined) data.checkOut = body.checkOut ? new Date(body.checkOut) : null;
    if (body.preferences !== undefined) data.preferences = body.preferences;

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data,
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}
