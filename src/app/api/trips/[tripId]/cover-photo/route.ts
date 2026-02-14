import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Max 5MB upload
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WebP supported" }, { status: 400 });
    }

    // Save to public/uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", "covers");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${tripId}-${randomUUID().slice(0, 8)}.${ext}`;
    const filepath = join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filepath, buffer);

    const coverPhotoUrl = `/uploads/covers/${filename}`;

    await prisma.trip.update({
      where: { id: tripId },
      data: { coverPhotoUrl, coverPhotoAttribution: null },
    });

    return NextResponse.json({ coverPhotoUrl });
  } catch (error) {
    console.error("Cover photo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
