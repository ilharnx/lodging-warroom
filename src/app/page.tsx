"use client";

import { useState, useEffect } from "react";

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
  checkOut: string | null;
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

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getActivityStatus(trip: Trip): { text: string; time: string | null } {
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
    const time = relativeTime(recentListings[0].createdAt);
    if (recentListings.length === 1) {
      return { text: `${adder} added a new place`, time };
    }
    return { text: `${adder} added ${recentListings.length} new places`, time };
  }

  // Check for recent comments
  if (allComments.length > 0) {
    const latest = allComments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const age = Date.now() - new Date(latest.createdAt).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return {
        text: `${latest.userName}: "${latest.text.slice(0, 40)}${latest.text.length > 40 ? "..." : ""}"`,
        time: relativeTime(latest.createdAt),
      };
    }
  }

  // Check who hasn't voted yet
  const members = getMembers(trip);
  const voters = new Set(allVotes.map((v) => v.userName));
  const nonVoters = members.filter((m) => !voters.has(m));
  if (nonVoters.length > 0 && members.length > 1) {
    return { text: `waiting on ${nonVoters[0]} to vote`, time: null };
  }

  // Fallback — most recent listing creation as timestamp
  const latestListing = trip.listings.length > 0
    ? trip.listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;
  return {
    text: `${trip.listings.length} place${trip.listings.length !== 1 ? "s" : ""} saved`,
    time: latestListing ? relativeTime(latestListing.createdAt) : null,
  };
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    destination: "",
    checkIn: "",
    checkOut: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

  const presets = ["Barbados", "Cancun", "Maui", "Lisbon", "Bali", "Tulum"];

  function openCreateModal() {
    setForm({ name: "", destination: "", checkIn: "", checkOut: "" });
    setCreateStep(1);
    setShowCreate(true);
  }

  function handleChipPick(dest: string) {
    setForm({
      ...form,
      name: `${dest} ${new Date().getFullYear()}`,
      destination: dest,
    });
    setCreateStep(3);
  }

  async function createTrip() {
    setCreating(true);
    try {
      // Geocode the destination
      let centerLat = 0;
      let centerLng = 0;
      try {
        const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(form.destination)}`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          centerLat = geo.lat;
          centerLng = geo.lng;
        }
      } catch {}

      // Auto-fetch Unsplash cover
      let coverPhotoUrl: string | null = null;
      let coverPhotoAttribution: string | null = null;
      try {
        const unsplashRes = await fetch(`/api/unsplash?q=${encodeURIComponent(form.destination)}`);
        if (unsplashRes.ok) {
          const data = await unsplashRes.json();
          if (data?.url) {
            coverPhotoUrl = data.url;
            coverPhotoAttribution = data.attribution;
          }
        }
      } catch {}

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          destination: form.destination,
          centerLat,
          centerLng,
          adults: 2,
          kids: 0,
          checkIn: form.checkIn || null,
          checkOut: form.checkOut || null,
          nights: dateNights,
          coverPhotoUrl,
          coverPhotoAttribution,
        }),
      });
      if (res.ok) {
        const trip = await res.json();
        window.location.href = `/trip/${trip.id}`;
      }
    } finally {
      setCreating(false);
    }
  }

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
            onClick={() => openCreateModal()}
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
              onClick={() => openCreateModal()}
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
                    onClick={() => openCreateModal()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCreateModal(); } }}
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
                      margin: 0,
                    }}>
                      Where to next?
                    </p>
                    <p style={{
                      fontSize: 13,
                      color: "var(--color-text-muted)",
                      margin: 0,
                      marginTop: 4,
                    }}>
                      Start planning your next trip
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

        {/* Creation modal overlay */}
        {showCreate && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            {/* Backdrop */}
            <div
              onClick={() => setShowCreate(false)}
              className="animate-fade-in"
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(42,37,32,0.4)",
                backdropFilter: "blur(4px)",
              }}
            />

            {/* Modal */}
            <div
              className="animate-slide-up"
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 440,
                background: "var(--color-card)",
                borderRadius: 16,
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                overflow: "hidden",
              }}
            >
              {/* Header with X close */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px 0",
              }}>
                {/* Step dots */}
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      style={{
                        width: s === createStep ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        background: s === createStep ? "var(--color-coral)" : s < createStep ? "var(--color-coral)" : "var(--color-border-dark)",
                        transition: "all 0.25s var(--ease-spring)",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--color-panel)",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: 16,
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  &#10005;
                </button>
              </div>

              <div style={{ padding: "24px 24px 28px" }}>
                {/* Step 1 — Trip name + destination chips */}
                {createStep === 1 && (
                  <div>
                    <h2 style={{
                      fontSize: 22,
                      fontWeight: 600,
                      fontFamily: "var(--font-heading)",
                      fontStyle: "italic",
                      color: "var(--color-text)",
                      margin: 0,
                      marginBottom: 20,
                    }}>
                      What should we call this trip?
                    </h2>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Spring Break 2026"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && form.name.trim()) {
                          e.preventDefault();
                          setCreateStep(2);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        background: "#fff",
                        border: "1px solid var(--color-border-dark)",
                        borderRadius: 10,
                        color: "var(--color-text)",
                        fontFamily: "inherit",
                        fontSize: 16,
                      }}
                    />

                    {/* Quick-pick chips */}
                    <div style={{ marginTop: 20 }}>
                      <p style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        marginBottom: 10,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.05em",
                      }}>
                        Or pick a destination
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {presets.map((dest) => (
                          <button
                            key={dest}
                            type="button"
                            onClick={() => handleChipPick(dest)}
                            style={{
                              padding: "8px 16px",
                              fontSize: 13,
                              fontWeight: 500,
                              background: "var(--color-panel)",
                              border: "1px solid var(--color-border-dark)",
                              borderRadius: 24,
                              color: "var(--color-text-mid)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              transition: "all 0.15s",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.borderColor = "var(--color-coral-border)";
                              e.currentTarget.style.color = "var(--color-coral)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.borderColor = "var(--color-border-dark)";
                              e.currentTarget.style.color = "var(--color-text-mid)";
                            }}
                          >
                            {getFlag(dest)} {dest}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setCreateStep(2)}
                      disabled={!form.name.trim()}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        fontSize: 15,
                        fontWeight: 600,
                        background: form.name.trim() ? "var(--color-coral)" : "var(--color-panel)",
                        color: form.name.trim() ? "#fff" : "var(--color-text-light)",
                        borderRadius: 10,
                        border: "none",
                        cursor: form.name.trim() ? "pointer" : "default",
                        fontFamily: "inherit",
                        marginTop: 24,
                        transition: "all 0.15s",
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Step 2 — Destination */}
                {createStep === 2 && (
                  <div>
                    <h2 style={{
                      fontSize: 22,
                      fontWeight: 600,
                      fontFamily: "var(--font-heading)",
                      fontStyle: "italic",
                      color: "var(--color-text)",
                      margin: 0,
                      marginBottom: 20,
                    }}>
                      Where are you headed?
                    </h2>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Barbados"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && form.destination.trim()) {
                          e.preventDefault();
                          setCreateStep(3);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        background: "#fff",
                        border: "1px solid var(--color-border-dark)",
                        borderRadius: 10,
                        color: "var(--color-text)",
                        fontFamily: "inherit",
                        fontSize: 16,
                      }}
                    />

                    <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                      <button
                        onClick={() => setCreateStep(1)}
                        style={{
                          padding: "14px 16px",
                          fontSize: 15,
                          fontWeight: 500,
                          background: "var(--color-panel)",
                          color: "var(--color-text-mid)",
                          borderRadius: 10,
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCreateStep(3)}
                        disabled={!form.destination.trim()}
                        style={{
                          flex: 1,
                          padding: "14px 16px",
                          fontSize: 15,
                          fontWeight: 600,
                          background: form.destination.trim() ? "var(--color-coral)" : "var(--color-panel)",
                          color: form.destination.trim() ? "#fff" : "var(--color-text-light)",
                          borderRadius: 10,
                          border: "none",
                          cursor: form.destination.trim() ? "pointer" : "default",
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Dates */}
                {createStep === 3 && (
                  <div>
                    <h2 style={{
                      fontSize: 22,
                      fontWeight: 600,
                      fontFamily: "var(--font-heading)",
                      fontStyle: "italic",
                      color: "var(--color-text)",
                      margin: 0,
                      marginBottom: 20,
                    }}>
                      When are you going?
                    </h2>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>Arrival</span>
                        <input
                          type="date"
                          value={form.checkIn}
                          onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            background: "#fff",
                            border: "1px solid var(--color-border-dark)",
                            borderRadius: 10,
                            color: form.checkIn ? "var(--color-text)" : "var(--color-text-muted)",
                            fontFamily: "inherit",
                            fontSize: 15,
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>Departure</span>
                        <input
                          type="date"
                          value={form.checkOut}
                          min={form.checkIn || undefined}
                          onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            background: "#fff",
                            border: "1px solid var(--color-border-dark)",
                            borderRadius: 10,
                            color: form.checkOut ? "var(--color-text)" : "var(--color-text-muted)",
                            fontFamily: "inherit",
                            fontSize: 15,
                          }}
                        />
                      </div>
                    </div>
                    {dateNights != null && (
                      <p className="font-mono" style={{ fontSize: 12, color: "var(--color-text-mid)", marginTop: 8, marginBottom: 0 }}>
                        {dateNights} night{dateNights !== 1 ? "s" : ""}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
                      <button
                        onClick={() => setCreateStep(form.destination ? 2 : 1)}
                        style={{
                          padding: "14px 16px",
                          fontSize: 15,
                          fontWeight: 500,
                          background: "var(--color-panel)",
                          color: "var(--color-text-mid)",
                          borderRadius: 10,
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => createTrip()}
                        disabled={creating}
                        style={{
                          flex: 1,
                          padding: "14px 16px",
                          fontSize: 15,
                          fontWeight: 600,
                          background: "var(--color-coral)",
                          color: "#fff",
                          borderRadius: 10,
                          border: "none",
                          cursor: creating ? "default" : "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                          opacity: creating ? 0.6 : 1,
                          boxShadow: "0 4px 14px rgba(224,90,71,0.25)",
                        }}
                      >
                        {creating ? "Creating..." : "Let\u2019s go"}
                      </button>
                    </div>

                    {/* Skip for now */}
                    {!form.checkIn && !form.checkOut && (
                      <button
                        onClick={() => createTrip()}
                        disabled={creating}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "center" as const,
                          marginTop: 12,
                          fontSize: 13,
                          color: "var(--color-text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          padding: 4,
                        }}
                      >
                        Skip for now
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Trip Card ────────────────────────────────────────────── */

function formatDateRange(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return "Dates not set";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const start = new Date(checkIn);
  const startStr = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  if (!checkOut) return startStr;
  const end = new Date(checkOut);
  // Same month → "May 10 – 17"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startStr} \u2013 ${end.getDate()}`;
  }
  return `${startStr} \u2013 ${MONTHS[end.getMonth()]} ${end.getDate()}`;
}

// Fallback photo when Unsplash is not configured
const PLACEHOLDER_PHOTO = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=200&fit=crop";

function TripCard({ trip }: { trip: Trip }) {
  const [hovered, setHovered] = useState(false);
  const [unsplashPhoto, setUnsplashPhoto] = useState<{ url: string; attribution: string | null } | null>(null);
  const members = getMembers(trip);
  const activity = getActivityStatus(trip);

  // Countdown
  const checkInDate = trip.checkIn ? new Date(trip.checkIn) : null;
  const daysUntilTrip = checkInDate
    ? Math.ceil((checkInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Fetch Unsplash photo if no user-uploaded cover
  useEffect(() => {
    if (trip.coverPhotoUrl) return;
    let cancelled = false;
    fetch(`/api/unsplash?q=${encodeURIComponent(trip.destination)}`)
      .then((r) => {
        if (r.ok) return r.json();
        // Unsplash not configured or error — use placeholder
        return null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.url) {
          setUnsplashPhoto({ url: data.url, attribution: data.attribution });
        } else {
          // Use placeholder when Unsplash is unavailable
          setUnsplashPhoto({ url: PLACEHOLDER_PHOTO, attribution: null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnsplashPhoto({ url: PLACEHOLDER_PHOTO, attribution: null });
        }
      });
    return () => { cancelled = true; };
  }, [trip.coverPhotoUrl, trip.destination]);

  // Photo priority: user upload > Unsplash > placeholder
  const coverPhoto = trip.coverPhotoUrl || unsplashPhoto?.url || PLACEHOLDER_PHOTO;
  const attribution = trip.coverPhotoAttribution || unsplashPhoto?.attribution || null;

  const dateLabel = formatDateRange(trip.checkIn, trip.checkOut);

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
      {/* Photo header — always a real photo */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Background photo */}
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

        {/* Dark gradient overlay ON TOP of photo for text readability */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%)",
        }} />

        {/* Text content on top of gradient */}
        <div style={{ position: "relative", padding: "20px 20px 16px" }}>
          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#fff",
            margin: 0,
            lineHeight: 1.25,
            fontFamily: "var(--font-heading)",
            textShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}>
            {trip.name}
          </h3>
          <p style={{
            fontSize: 13,
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            margin: 0,
            marginTop: 3,
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}>
            {trip.destination}
          </p>
          <p style={{
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            margin: 0,
            marginTop: 4,
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            fontStyle: trip.checkIn ? "normal" : "italic",
          }}>
            {dateLabel}
          </p>
          {daysUntilTrip != null && daysUntilTrip > 0 && (
            <p className="font-mono" style={{
              fontSize: 12,
              fontWeight: 400,
              color: "rgba(255,255,255,0.75)",
              margin: 0,
              marginTop: 4,
              letterSpacing: 0.3,
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}>
              &#9728;&#65039; {daysUntilTrip}d away
            </p>
          )}
        </div>

        {/* Unsplash attribution */}
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
        {/* Member avatar row */}
        {members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
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

        {/* Activity status with timestamp */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <p style={{
            fontSize: 13,
            color: "var(--color-text-mid)",
            margin: 0,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}>
            {activity.text}
          </p>
          {activity.time && (
            <span className="font-mono" style={{
              fontSize: 11,
              color: "var(--color-text-light)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              {activity.time}
            </span>
          )}
        </div>

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
