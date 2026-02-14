"use client";

import { useState, useEffect, useCallback } from "react";

interface TripVote {
  userName: string;
  value: number;
  createdAt: string;
}

interface TripComment {
  userName: string;
  text: string;
  createdAt: string;
}

interface TripListing {
  id: string;
  name: string;
  scrapeStatus: string;
  perNight: number | null;
  totalCost: number | null;
  addedBy: string | null;
  createdAt: string;
  photos: { url: string }[];
  votes: TripVote[];
  comments: TripComment[];
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  adults: number;
  kids: number;
  checkIn: string | null;
  coverPhotoUrl: string | null;
  coverPhotoAttribution: string | null;
  createdAt: string;
  listings: TripListing[];
}

const DESTINATION_FLAGS: Record<string, string> = {
  barbados: "\u{1F1E7}\u{1F1E7}",
  mexico: "\u{1F1F2}\u{1F1FD}",
  cancun: "\u{1F1F2}\u{1F1FD}",
  tulum: "\u{1F1F2}\u{1F1FD}",
  hawaii: "\u{1F1FA}\u{1F1F8}",
  maui: "\u{1F1FA}\u{1F1F8}",
  portugal: "\u{1F1F5}\u{1F1F9}",
  lisbon: "\u{1F1F5}\u{1F1F9}",
  bali: "\u{1F1EE}\u{1F1E9}",
  indonesia: "\u{1F1EE}\u{1F1E9}",
  spain: "\u{1F1EA}\u{1F1F8}",
  france: "\u{1F1EB}\u{1F1F7}",
  italy: "\u{1F1EE}\u{1F1F9}",
  greece: "\u{1F1EC}\u{1F1F7}",
  japan: "\u{1F1EF}\u{1F1F5}",
  thailand: "\u{1F1F9}\u{1F1ED}",
  "costa rica": "\u{1F1E8}\u{1F1F7}",
  colombia: "\u{1F1E8}\u{1F1F4}",
  "dominican republic": "\u{1F1E9}\u{1F1F4}",
  jamaica: "\u{1F1EF}\u{1F1F2}",
  "puerto rico": "\u{1F1F5}\u{1F1F7}",
  aruba: "\u{1F1E6}\u{1F1FC}",
};

function getFlag(destination: string): string {
  const lower = destination.toLowerCase();
  for (const [key, flag] of Object.entries(DESTINATION_FLAGS)) {
    if (lower.includes(key)) return flag;
  }
  return "\u{1F30D}";
}

const USER_COLORS = [
  "#E05A47", "#3D67FF", "#4A9E6B", "#D4A843", "#8B5CF6",
  "#0891B2", "#DB2777", "#EA580C", "#6D28D9", "#059669",
];

function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getMembers(trip: Trip): string[] {
  const names = new Set<string>();
  trip.listings.forEach((l) => {
    if (l.addedBy) names.add(l.addedBy);
    l.votes.forEach((v) => names.add(v.userName));
    l.comments.forEach((c) => names.add(c.userName));
  });
  return Array.from(names);
}

function getActivityStatus(trip: Trip): string {
  // Find most recent activity
  const allComments = trip.listings.flatMap((l) => l.comments);
  const allVotes = trip.listings.flatMap((l) => l.votes);

  // Check for recent additions (listings added in the last 24 hours)
  const recentListings = trip.listings.filter((l) => {
    const age = Date.now() - new Date(l.createdAt).getTime();
    return age < 24 * 60 * 60 * 1000 && l.addedBy;
  });

  if (recentListings.length > 0) {
    const adder = recentListings[0].addedBy;
    if (recentListings.length === 1) {
      return `${adder} added a new place`;
    }
    return `${adder} added ${recentListings.length} new places`;
  }

  // Check for recent comments
  if (allComments.length > 0) {
    const latest = allComments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const age = Date.now() - new Date(latest.createdAt).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return `${latest.userName}: "${latest.text.slice(0, 40)}${latest.text.length > 40 ? "..." : ""}"`;
    }
  }

  // Check who hasn't voted yet
  const members = getMembers(trip);
  const voters = new Set(allVotes.map((v) => v.userName));
  const nonVoters = members.filter((m) => !voters.has(m));
  if (nonVoters.length > 0 && members.length > 1) {
    return `waiting on ${nonVoters[0]} to vote`;
  }

  // Fallback
  return `${trip.listings.length} place${trip.listings.length !== 1 ? "s" : ""} saved`;
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    destination: "",
    centerLat: "",
    centerLng: "",
    adults: "4",
    kids: "2",
    checkIn: "",
    checkOut: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<{ url: string; attribution: string | null; source: "unsplash" | "upload" } | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fetchingCover, setFetchingCover] = useState(false);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setTrips(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load trips:", err);
        setError("Could not load trips — the database may need a schema update. Try running: npx prisma db push");
        setLoading(false);
      });
  }, []);

  // Auto-calculate nights from dates
  const dateNights = form.checkIn && form.checkOut
    ? Math.max(1, Math.round((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // Fetch Unsplash cover photo when destination changes
  const fetchUnsplash = useCallback((dest: string) => {
    if (!dest.trim()) { setCoverPreview(null); return; }
    setFetchingCover(true);
    fetch(`/api/unsplash?q=${encodeURIComponent(dest)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.url) {
          setCoverPreview({ url: data.url, attribution: data.attribution, source: "unsplash" });
        }
      })
      .catch(() => {})
      .finally(() => setFetchingCover(false));
  }, []);

  useEffect(() => {
    if (!form.destination.trim() || coverPreview?.source === "upload") return;
    const timer = setTimeout(() => fetchUnsplash(form.destination), 600);
    return () => clearTimeout(timer);
  }, [form.destination, fetchUnsplash, coverPreview?.source]);

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview({ url: objectUrl, attribution: null, source: "upload" });
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    // Determine cover photo to include at creation
    const coverPhotoUrl = coverPreview?.source === "unsplash" ? coverPreview.url : null;
    const coverPhotoAttribution = coverPreview?.source === "unsplash" ? coverPreview.attribution : null;

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        destination: form.destination,
        centerLat: parseFloat(form.centerLat) || 13.1939,
        centerLng: parseFloat(form.centerLng) || -59.5432,
        adults: parseInt(form.adults) || 4,
        kids: parseInt(form.kids) || 2,
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        nights: dateNights,
        coverPhotoUrl,
        coverPhotoAttribution,
      }),
    });
    if (res.ok) {
      const trip = await res.json();
      // Upload user photo if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        await fetch(`/api/trips/${trip.id}/cover-photo`, {
          method: "POST",
          body: formData,
        });
      }
      window.location.href = `/trip/${trip.id}`;
    }
  }

  const presets = [
    { name: "Barbados", lat: 13.1939, lng: -59.5432 },
    { name: "Cancun", lat: 21.1619, lng: -86.8515 },
    { name: "Maui", lat: 20.7984, lng: -156.3319 },
    { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
    { name: "Bali", lat: -8.3405, lng: 115.092 },
    { name: "Tulum", lat: 20.2114, lng: -87.4654 },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <header style={{ borderBottom: "1px solid var(--color-border-dark)", padding: "16px 24px" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="entrance entrance-d0" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#2E2A26", fontFamily: "var(--font-heading)", letterSpacing: -0.5, margin: 0 }}>
              stay<span style={{ color: "#C4725A" }}>.</span>
            </h1>
            <span className="font-mono" style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#C4725A", background: "rgba(196,114,90,0.12)", borderRadius: 4, padding: "3px 8px" }}>
              Alpha
            </span>
          </div>
          <button
            className="entrance entrance-d1"
            onClick={() => setShowCreate(true)}
            style={{
              padding: "8px 16px",
              background: "var(--color-coral)",
              color: "#fff",
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-coral-hover)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--color-coral)")}
          >
            + New Trip
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--color-text-mid)" }}>
            Loading...
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text)", marginBottom: 8, fontFamily: "var(--font-heading)" }}>
              Something went wrong
            </h2>
            <p style={{ color: "var(--color-text-mid)", marginBottom: 24, maxWidth: 480, marginInline: "auto", fontSize: 14 }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                background: "var(--color-coral)",
                color: "#fff",
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
              }}
            >
              Retry
            </button>
          </div>
        ) : trips.length === 0 && !showCreate ? (
          /* Empty state — warm and inviting */
          <div
            className="text-center entrance entrance-d2"
            style={{
              maxWidth: 420,
              marginInline: "auto",
              marginTop: 48,
              padding: "40px 32px",
              borderRadius: 20,
              background: "linear-gradient(160deg, rgba(224,90,71,0.06) 0%, rgba(212,168,67,0.05) 50%, rgba(74,158,107,0.04) 100%)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>&#9992;&#65039;</div>
            <h2 style={{
              fontSize: 26,
              fontWeight: 600,
              color: "var(--color-text)",
              marginBottom: 8,
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
            }}>
              Where to next?
            </h2>
            <p style={{ color: "var(--color-text-mid)", marginBottom: 28, fontSize: 15, lineHeight: 1.5 }}>
              Start planning your next trip
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "14px 32px",
                background: "var(--color-coral)",
                color: "#fff",
                fontWeight: 600,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 16,
                transition: "all 0.15s",
                boxShadow: "0 4px 14px rgba(224,90,71,0.25)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--color-coral-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "var(--color-coral)";
                e.currentTarget.style.transform = "none";
              }}
            >
              Create a trip
            </button>
          </div>
        ) : (
          <>
            {!showCreate && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trips.map((trip, i) => (
                    <div key={trip.id} className="entrance" style={{ animationDelay: `${240 + i * 120}ms` }}>
                      <TripCard trip={trip} />
                    </div>
                  ))}

                  {/* Create trip card — warm, inviting */}
                  <div
                    className="entrance"
                    style={{ animationDelay: `${240 + trips.length * 120}ms` }}
                  >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowCreate(true)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowCreate(true); } }}
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.2s var(--ease-spring)",
                      background: "linear-gradient(160deg, rgba(224,90,71,0.05) 0%, rgba(212,168,67,0.04) 50%, rgba(74,158,107,0.03) 100%)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "32px 24px",
                      minHeight: 160,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-coral-border)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--color-coral-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      color: "var(--color-coral)",
                      marginBottom: 12,
                    }}>
                      +
                    </div>
                    <p style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text-mid)",
                      fontFamily: "var(--font-heading)",
                      fontStyle: "italic",
                    }}>
                      Where to next?
                    </p>
                  </div>
                  </div>
                </div>

                {/* Footer — stay. wordmark with wavy divider */}
                <DashboardFooter />
              </>
            )}
          </>
        )}

        {showCreate && (
          <div className="max-w-lg mx-auto animate-slide-up">
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text)", marginBottom: 24, fontFamily: "var(--font-heading)" }}>
              Create a Trip
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Trip Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Barbados 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#fff",
                    border: "1px solid var(--color-border-dark)",
                    borderRadius: 8,
                    color: "var(--color-text)",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Destination
                </label>
                <input
                  type="text"
                  required
                  placeholder="Barbados"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#fff",
                    border: "1px solid var(--color-border-dark)",
                    borderRadius: 8,
                    color: "var(--color-text)",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          destination: p.name,
                          name: form.name || `${p.name} ${new Date().getFullYear()}`,
                          centerLat: String(p.lat),
                          centerLng: String(p.lng),
                        })
                      }
                      style={{
                        padding: "4px 12px",
                        fontSize: 12,
                        background: "var(--color-panel)",
                        border: "1px solid var(--color-border-dark)",
                        borderRadius: 20,
                        color: "var(--color-text-mid)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates — optional */}
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Dates <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontFamily: "inherit" }}>(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={form.checkIn}
                    onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                    placeholder="Arrival"
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: form.checkIn ? "var(--color-text)" : "var(--color-text-muted)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                  <input
                    type="date"
                    value={form.checkOut}
                    min={form.checkIn || undefined}
                    onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                    placeholder="Departure"
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: form.checkOut ? "var(--color-text)" : "var(--color-text-muted)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
                {dateNights != null && (
                  <p className="font-mono" style={{ fontSize: 12, color: "var(--color-text-mid)", marginTop: 6 }}>
                    {dateNights} night{dateNights !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Center Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="13.1939"
                    value={form.centerLat}
                    onChange={(e) => setForm({ ...form, centerLat: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Center Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-59.5432"
                    value={form.centerLng}
                    onChange={(e) => setForm({ ...form, centerLng: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.adults}
                    onChange={(e) => setForm({ ...form, adults: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Kids
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.kids}
                    onChange={(e) => setForm({ ...form, kids: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              {/* Cover photo — optional */}
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Cover Photo <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontFamily: "inherit" }}>(optional)</span>
                </label>
                {coverPreview ? (
                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--color-border-dark)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreview.url}
                      alt="Cover preview"
                      style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                    />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 100%)",
                    }} />
                    {coverPreview.attribution && (
                      <div style={{
                        position: "absolute", bottom: 4, right: 8,
                        fontSize: 9, color: "rgba(255,255,255,0.5)",
                      }}>
                        {coverPreview.attribution}
                      </div>
                    )}
                    <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                      {coverPreview.source === "unsplash" && (
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 10,
                          background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)",
                        }}>
                          Auto
                        </span>
                      )}
                      <label style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 10,
                        background: "rgba(0,0,0,0.5)", color: "#fff",
                        cursor: "pointer",
                      }}>
                        Upload
                        <input type="file" accept="image/*" onChange={handleCoverFileChange} style={{ display: "none" }} />
                      </label>
                      <button
                        type="button"
                        onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                        style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 10,
                          background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)",
                          border: "none", cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{
                      flex: 1, padding: "10px 16px", fontSize: 13, fontWeight: 500,
                      background: "var(--color-panel)", border: "1px solid var(--color-border-dark)",
                      borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                      color: "var(--color-text-mid)", textAlign: "center" as const,
                    }}>
                      {fetchingCover ? "Loading..." : "Upload your own"}
                      <input type="file" accept="image/*" onChange={handleCoverFileChange} style={{ display: "none" }} />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "var(--color-coral)",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                >
                  Create Trip
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{
                    padding: "10px 16px",
                    background: "var(--color-panel)",
                    border: "1px solid var(--color-border-dark)",
                    color: "var(--color-text-mid)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Trip Card ────────────────────────────────────────────── */

function TripCard({ trip }: { trip: Trip }) {
  const [hovered, setHovered] = useState(false);
  const [unsplashPhoto, setUnsplashPhoto] = useState<{ url: string; attribution: string } | null>(null);
  const flag = getFlag(trip.destination);
  const members = getMembers(trip);
  const activityStatus = getActivityStatus(trip);

  // Countdown
  const checkInDate = trip.checkIn ? new Date(trip.checkIn) : null;
  const daysUntilTrip = checkInDate
    ? Math.ceil((checkInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine cover photo: user upload > first listing photo > Unsplash
  const firstListingPhoto = trip.listings.find((l) => l.photos.length > 0)?.photos[0]?.url;
  const coverPhoto = trip.coverPhotoUrl || firstListingPhoto || unsplashPhoto?.url || null;
  const attribution = trip.coverPhotoAttribution || (unsplashPhoto && !trip.coverPhotoUrl && !firstListingPhoto ? unsplashPhoto.attribution : null);

  // Fetch Unsplash fallback if no other photo
  useEffect(() => {
    if (trip.coverPhotoUrl || firstListingPhoto) return;
    let cancelled = false;
    fetch(`/api/unsplash?q=${encodeURIComponent(trip.destination)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data?.url) {
          setUnsplashPhoto({ url: data.url, attribution: data.attribution });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trip.coverPhotoUrl, firstListingPhoto, trip.destination]);

  return (
    <a
      href={`/trip/${trip.id}`}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid var(--color-border-dark)",
        borderRadius: 14,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "all 0.2s var(--ease-spring)",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.08)"
          : "0 1px 4px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo header */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Photo or gradient fallback */}
        {coverPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverPhoto}
              alt=""
              className="trip-card-ken-burns"
              style={{
                position: "absolute",
                inset: "-10%",
                width: "120%",
                height: "120%",
                objectFit: "cover",
              }}
            />
            {/* Dark gradient overlay for text readability */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 100%)",
            }} />
          </>
        ) : (
          <>
            <div
              className="trip-card-ken-burns"
              style={{
                position: "absolute",
                inset: "-10%",
                background: "linear-gradient(135deg, #FCEEE8 0%, #F7E4D8 40%, #EDE7E0 100%)",
              }}
            />
            <svg
              style={{ position: "absolute", bottom: 0, left: "-5%", width: "110%", height: "40%" }}
              viewBox="0 0 400 100"
              preserveAspectRatio="none"
              fill="#fff"
            >
              <path className="trip-card-wave-a" d="M0 50C60 35 140 65 200 45S320 55 400 42L400 100H0Z" opacity="0.06" />
              <path className="trip-card-wave-b" d="M0 62C80 48 160 72 240 55S360 68 400 58L400 100H0Z" opacity="0.08" />
              <path className="trip-card-wave-c" d="M0 72C50 60 130 82 210 68S330 78 400 70L400 100H0Z" opacity="0.1" />
            </svg>
          </>
        )}

        {/* Content on top */}
        <div style={{ position: "relative", padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 26, lineHeight: 1, textShadow: coverPhoto ? "0 1px 3px rgba(0,0,0,0.3)" : "none" }}>{flag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: coverPhoto ? "#fff" : "var(--color-text)",
                margin: 0,
                lineHeight: 1.25,
                fontFamily: "var(--font-heading)",
                textShadow: coverPhoto ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}>
                {trip.name}
              </h3>
              <p style={{
                fontSize: 13,
                color: coverPhoto ? "rgba(255,255,255,0.85)" : "var(--color-text-mid)",
                margin: 0,
                marginTop: 3,
                textShadow: coverPhoto ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
              }}>
                {trip.destination}
              </p>

              {/* Countdown */}
              {daysUntilTrip != null && daysUntilTrip > 0 && (
                <p className="font-mono" style={{
                  fontSize: 12,
                  color: coverPhoto ? "rgba(255,255,255,0.75)" : "var(--color-text-mid)",
                  margin: 0,
                  marginTop: 6,
                  letterSpacing: 0.3,
                  textShadow: coverPhoto ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                }}>
                  &#9728;&#65039; {daysUntilTrip}d away
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Unsplash attribution — tiny, bottom-right corner */}
        {attribution && (
          <div style={{
            position: "absolute",
            bottom: 4,
            right: 8,
            fontSize: 8,
            color: "rgba(255,255,255,0.4)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            lineHeight: 1,
            pointerEvents: "none",
          }}>
            {attribution}
          </div>
        )}

        {/* Coral accent bar on hover */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--color-coral)",
            transform: hovered ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 0.25s var(--ease-spring)",
            zIndex: 1,
          }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: "14px 20px 16px" }}>
        {/* Member avatar pips */}
        {members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ display: "flex" }}>
              {members.slice(0, 6).map((name, i) => (
                <div
                  key={name}
                  title={name}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: getUserColor(name),
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    border: "2px solid #fff",
                    marginLeft: i > 0 ? -6 : 0,
                    position: "relative",
                    zIndex: members.length - i,
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > 6 && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--color-panel)",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    border: "2px solid #fff",
                    marginLeft: -6,
                  }}
                >
                  +{members.length - 6}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity status */}
        <p style={{
          fontSize: 13,
          color: "var(--color-text-mid)",
          margin: 0,
          lineHeight: 1.4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {activityStatus}
        </p>

        {/* Hover CTA */}
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-coral)",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(-4px)",
            transition: "all 0.2s var(--ease-spring)",
          }}
        >
          Open trip &rarr;
        </div>
      </div>
    </a>
  );
}

/* ── Dashboard Footer ──────────────────────────────────────── */

function DashboardFooter() {
  return (
    <div style={{ marginTop: 48, textAlign: "center", paddingBottom: 32 }}>
      {/* Wavy line divider */}
      <svg
        width="120"
        height="12"
        viewBox="0 0 120 12"
        fill="none"
        style={{ display: "inline-block", marginBottom: 16, opacity: 0.25 }}
      >
        <path
          d="M2 6c6-4 12 4 18 0s12-4 18 0 12 4 18 0 12-4 18 0 12 4 18 0 12-4 18 0"
          stroke="var(--color-text-mid)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <p style={{
        fontSize: 18,
        fontFamily: "var(--font-heading)",
        color: "var(--color-text-light)",
        fontWeight: 600,
        letterSpacing: -0.5,
        margin: 0,
      }}>
        stay<span style={{ color: "#C4725A", opacity: 0.6 }}>.</span>
      </p>
    </div>
  );
}
