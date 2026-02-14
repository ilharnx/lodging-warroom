import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    const travelers = await prisma.traveler.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        isCreator: true,
        createdAt: true,
      },
    });

    return NextResponse.json(travelers);
  } catch (error) {
    console.error("Error fetching travelers:", error);
    return NextResponse.json({ error: "Failed to fetch travelers" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();
    const { name, color, isCreator } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: "name and color are required" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const traveler = await prisma.traveler.create({
      data: {
        tripId,
        name: name.trim(),
        color,
        isCreator: isCreator ?? false,
      },
    });

    return NextResponse.json(traveler, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (duplicate name in trip)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A traveler with that name already exists in this trip" },
        { status: 409 }
      );
    }
    console.error("Error creating traveler:", error);
    return NextResponse.json({ error: "Failed to create traveler" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const { searchParams } = new URL(request.url);
    const travelerId = searchParams.get("travelerId");

    if (!travelerId) {
      return NextResponse.json({ error: "travelerId is required" }, { status: 400 });
    }

    const traveler = await prisma.traveler.findFirst({
      where: { id: travelerId, tripId },
    });

    if (!traveler) {
      return NextResponse.json({ error: "Traveler not found" }, { status: 404 });
    }

    await prisma.traveler.delete({ where: { id: travelerId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting traveler:", error);
    return NextResponse.json({ error: "Failed to delete traveler" }, { status: 500 });
  }
}
