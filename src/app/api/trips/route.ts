import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, destination, centerLat, centerLng, adults, kids, nights, checkIn, checkOut, coverPhotoUrl, coverPhotoAttribution, travelers } = body;

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
        coverPhotoUrl: coverPhotoUrl || null,
        coverPhotoAttribution: coverPhotoAttribution || null,
        ...(Array.isArray(travelers) && travelers.length > 0
          ? {
              travelers: {
                create: travelers.map(
                  (t: { name: string; color: string; isCreator?: boolean }, i: number) => ({
                    name: t.name.trim(),
                    color: t.color,
                    isCreator: i === 0 ? true : (t.isCreator ?? false),
                  })
                ),
              },
            }
          : {}),
      },
      include: {
        travelers: { orderBy: { createdAt: "asc" } },
      },
    });

    // If travelers were created, set the creator's cookie
    const creator = trip.travelers.find((t) => t.isCreator);
    if (creator) {
      const response = NextResponse.json(trip, { status: 201 });
      response.cookies.set(`stay_traveler_${trip.id}`, creator.token, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 31536000,
        path: "/",
      });
      return response;
    }

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      select: {
        id: true,
        name: true,
        destination: true,
        adults: true,
        kids: true,
        checkIn: true,
        checkOut: true,
        coverPhotoUrl: true,
        coverPhotoAttribution: true,
        createdAt: true,
        travelers: {
          select: { id: true, name: true, color: true, isCreator: true },
          orderBy: { createdAt: "asc" },
        },
        listings: {
          select: {
            id: true,
            name: true,
            scrapeStatus: true,
            perNight: true,
            totalCost: true,
            addedBy: true,
            createdAt: true,
            photos: { select: { url: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
            votes: { select: { userName: true, value: true, createdAt: true } },
            comments: { select: { userName: true, text: true, createdAt: true }, orderBy: { createdAt: "desc" as const }, take: 3 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}
