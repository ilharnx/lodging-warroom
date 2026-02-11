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
      include: {
        listings: {
          include: {
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

    const existing = await prisma.trip.findUnique({ where: { id: tripId } });
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
