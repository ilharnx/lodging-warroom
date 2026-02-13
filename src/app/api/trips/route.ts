import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, destination, centerLat, centerLng, adults, kids, nights, checkIn, checkOut } = body;

    if (!name || !destination || centerLat == null || centerLng == null) {
      return NextResponse.json(
        { error: "name, destination, centerLat, and centerLng are required" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        name,
        destination,
        centerLat,
        centerLng,
        adults: adults ?? 4,
        kids: kids ?? 2,
        nights: nights ?? null,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      include: { listings: { select: { id: true, name: true, scrapeStatus: true, perNight: true, totalCost: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}
