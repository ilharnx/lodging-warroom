"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetail } from "@/components/ListingDetail";
import { AddListingModal } from "@/components/AddListingModal";
import { FilterBar } from "@/components/FilterBar";

import { TripPreferences } from "@/components/TripPreferences";
// budget range no longer used on cards/map
import { useIsMobile } from "@/hooks/useIsMobile";
import { TRAVELER_COLORS, getNextColor } from "@/lib/traveler-colors";
import type { FilterState, KitchenType, TripPreferences as TripPreferencesType, ReactionType } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Trip = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listing = any;

interface Traveler {
  id: string;
  name: string;
  color: string;
  isCreator: boolean;
}

const POLL_INTERVAL = 4000;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("stay_username") || "";
}

function setStoredName(name: string) {
  localStorage.setItem("stay_username", name);
}

function getStoredEmoji(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("stay_emoji") || "";
}

function setStoredEmoji(emoji: string) {
  localStorage.setItem("stay_emoji", emoji);
}

const defaultFilters: FilterState = {
  sources: [],
  priceMin: 0,
  priceMax: Infinity,
  bedroomsMin: 0,
  bathroomsMin: 0,
  kitchen: [],
  beachDistance: "",
  ratingMin: 0,
  sortBy: "recent",
};

type ConsensusGroup = "into" | "deciding" | "not";

interface GroupedListings {
  into: Listing[];
  deciding: Listing[];
  not: Listing[];
}

const GROUP_META: Record<ConsensusGroup, { label: string; icon: string; color: string; bgColor: string }> = {
  into:     { label: "Everyone\u2019s into these", icon: "\uD83D\uDD25", color: "var(--color-green)",      bgColor: "rgba(74,158,107,0.08)" },
  deciding: { label: "Still deciding",             icon: "\uD83E\uDD14", color: "var(--color-yellow)",     bgColor: "rgba(212,168,67,0.08)" },
  not:      { label: "Probably not",               icon: "\uD83D\uDC4B", color: "var(--color-text-muted)", bgColor: "rgba(0,0,0,0.03)" },
};

function computeConsensusGroups(listings: Listing[]): GroupedListings {
  const groups: GroupedListings = { into: [], deciding: [], not: [] };
  for (const listing of listings) {
    const votes: { reactionType: string }[] = listing.votes || [];
    const total = votes.length;
    const positive = votes.filter((v) => v.reactionType === "fire" || v.reactionType === "love").length;
    const negative = votes.filter((v) => v.reactionType === "pass").length;

    // Edge cases: 0 or 1 reaction → "Still deciding"
    if (total <= 1) {
      groups.deciding.push(listing);
    } else if (positive >= 2 && positive / total >= 0.5) {
      // Majority positive (≥50%) with minimum 2 positive reactions
      groups.into.push(listing);
    } else if (negative / total >= 0.5) {
      // Majority negative (≥50% pass reactions)
      groups.not.push(listing);
    } else {
      // Mixed or tied → "Still deciding"
      groups.deciding.push(listing);
    }
  }
  return groups;
}

function applyFilters(listings: Listing[], filters: FilterState): Listing[] {
  let result = [...listings];

  if (filters.sources.length > 0) {
    result = result.filter((l) => filters.sources.includes(l.source));
  }

  if (filters.priceMin > 0) {
    result = result.filter((l) => {
      const price = l.totalCost || l.perNight || 0;
      return price >= filters.priceMin;
    });
  }

  if (filters.priceMax < Infinity) {
    result = result.filter((l) => {
      const price = l.totalCost || l.perNight || Infinity;
      return price <= filters.priceMax;
    });
  }

  if (filters.bedroomsMin > 0) {
    result = result.filter(
      (l) => l.bedrooms != null && l.bedrooms >= filters.bedroomsMin
    );
  }

  if (filters.bathroomsMin > 0) {
    result = result.filter(
      (l) => l.bathrooms != null && l.bathrooms >= filters.bathroomsMin
    );
  }

  if (filters.kitchen.length > 0) {
    result = result.filter((l) =>
      filters.kitchen.includes(l.kitchen as KitchenType)
    );
  }


  if (filters.ratingMin > 0) {
    result = result.filter(
      (l) => l.rating != null && l.rating >= filters.ratingMin
    );
  }

  switch (filters.sortBy) {
    case "price_asc":
      result.sort((a, b) => {
        const pa = a.totalCost || a.perNight || Infinity;
        const pb = b.totalCost || b.perNight || Infinity;
        return pa - pb;
      });
      break;
    case "votes_desc":
      result.sort((a, b) => {
        const score = (votes: { reactionType: string }[]) => {
          let s = 0;
          for (const v of votes) {
            if (v.reactionType === "fire" || v.reactionType === "love") s += 1;
            else if (v.reactionType === "pass") s -= 1;
          }
          return s;
        };
        return score(b.votes || []) - score(a.votes || []);
      });
      break;
    case "rating":
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "recent":
    default:
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
  }

  return result;
}

function StepperRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const btn = (disabled: boolean): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: "50%",
    border: "1px solid var(--color-border-dark)",
    background: disabled ? "var(--color-bg)" : "#fff",
    color: disabled ? "var(--color-text-light)" : "var(--color-text)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 20, fontWeight: 600, fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: "var(--color-text-mid)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => { if (value > min) onChange(value - 1); }} disabled={value <= min} style={btn(value <= min)}>-</button>
        <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{value}</span>
        <button onClick={() => { if (value < max) onChange(value + 1); }} disabled={value >= max} style={btn(value >= max)}>+</button>
      </div>
    </div>
  );
}

/* ── Identity Picker (full-screen interstitial) ────────── */

function IdentityPicker({
  trip,
  travelers,
  onClaim,
}: {
  trip: { id: string; name: string; destination: string; checkIn: string | null; checkOut: string | null };
  travelers: Traveler[];
  onClaim: (traveler: Traveler) => void;
}) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const checkInDate = trip.checkIn ? new Date(trip.checkIn) : null;
  const checkOutDate = trip.checkOut ? new Date(trip.checkOut) : null;
  const dateLabel = checkInDate
    ? `${MONTHS[checkInDate.getMonth()]} ${checkInDate.getDate()}${checkOutDate ? ` \u2013 ${checkInDate.getMonth() === checkOutDate.getMonth() ? checkOutDate.getDate() : `${MONTHS[checkOutDate.getMonth()]} ${checkOutDate.getDate()}`}` : ""}`
    : null;

  async function handleClaim(travelerId: string) {
    setClaiming(travelerId);
    try {
      const res = await fetch(`/api/trips/${trip.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelerId }),
      });
      if (res.ok) {
        const traveler = await res.json();
        onClaim(traveler);
      }
    } finally {
      setClaiming(null);
    }
  }

  async function handleJoin() {
    if (!newName.trim()) return;
    setClaiming("new");
    try {
      const usedColors = travelers.map((t) => t.color);
      const color = getNextColor(usedColors);
      const res = await fetch(`/api/trips/${trip.id}/travelers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color }),
      });
      if (res.ok) {
        const newTraveler = await res.json();
        await handleClaim(newTraveler.id);
      }
    } finally {
      setClaiming(null);
    }
  }

  // Format trip name: add spaces around '&' if missing
  const displayName = trip.name.replace(/(\S)&(\S)/g, "$1 & $2");

  return (
    <div style={{
      minHeight: "100dvh",
      background: "rgba(245,240,232,0.85)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      {/* Logo */}
      <h1 style={{
        fontSize: 24,
        fontWeight: 600,
        color: "#2E2A26",
        fontFamily: "var(--font-heading)",
        margin: 0,
        marginBottom: 32,
      }}>
        stay<span style={{ color: "#C4725A" }}>.</span>
      </h1>

      {/* Trip info */}
      <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 360 }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 600,
          fontFamily: "var(--font-heading)",
          fontStyle: "italic",
          color: "var(--color-text)",
          margin: 0,
          marginBottom: 8,
        }}>
          Who dis
        </h2>
        <p style={{
          fontSize: 14,
          color: "var(--color-text-muted)",
          margin: 0,
        }}>
          {displayName}{dateLabel ? ` \u00B7 ${dateLabel}` : ""}
        </p>
      </div>

      {/* Traveler cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        {travelers.map((t) => (
          <button
            key={t.id}
            onClick={() => handleClaim(t.id)}
            disabled={claiming !== null}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              background: "#FDFBF7",
              border: "1px solid #E8E2D8",
              borderRadius: 12,
              cursor: claiming ? "default" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s var(--ease-spring)",
              opacity: claiming && claiming !== t.id ? 0.5 : 1,
            }}
            onMouseOver={(e) => {
              if (!claiming) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
            onMouseDown={(e) => {
              if (!claiming) {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
              }
            }}
            onMouseUp={(e) => {
              if (!claiming) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)";
              }
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: t.color,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {t.name.charAt(0).toUpperCase()}
            </div>
            <span style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--color-text)",
            }}>
              {t.name}
            </span>
            {claiming === t.id && (
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted)" }}>...</span>
            )}
          </button>
        ))}
      </div>

      {/* "Someone else?" */}
      {!showJoinForm ? (
        <button
          onClick={() => setShowJoinForm(true)}
          style={{
            marginTop: 20,
            fontSize: 14,
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            color: "#C4725A",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          Someone else?
        </button>
      ) : (
        <div style={{ marginTop: 20, width: "100%", maxWidth: 320 }}>
          <input
            type="text"
            autoFocus
            placeholder="Your name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                e.preventDefault();
                handleJoin();
              }
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#FDFBF7",
              border: "1px solid #E8E2D8",
              borderRadius: 10,
              color: "var(--color-text)",
              fontFamily: "inherit",
              fontSize: 15,
            }}
          />
          <button
            onClick={handleJoin}
            disabled={!newName.trim() || claiming !== null}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 600,
              background: newName.trim() ? "#C4725A" : "var(--color-panel)",
              color: newName.trim() ? "#fff" : "var(--color-text-light)",
              borderRadius: 10,
              border: "none",
              cursor: newName.trim() ? "pointer" : "default",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {claiming === "new" ? "Joining..." : "Join trip"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Trip Settings View ──────────────────────────────────── */

interface TripSettingsProps {
  trip: {
    id: string;
    name: string;
    destination: string;
    adults: number;
    kids: number;
    nights: number | null;
    checkIn: string | null;
    checkOut: string | null;
    centerLat: number;
    centerLng: number;
    coverPhotoUrl: string | null;
    coverPhotoAttribution: string | null;
    travelers?: Traveler[];
  };
  onSave: (updates: {
    name?: string; destination?: string;
    adults?: number; kids?: number; nights?: number | null;
    checkIn?: string | null; checkOut?: string | null;
    centerLat?: number; centerLng?: number;
    coverPhotoUrl?: string | null; coverPhotoAttribution?: string | null;
  }) => Promise<void>;
  onClose: () => void;
  onRefresh: () => void;
}

function TripSettingsView({ trip, onSave, onClose, onRefresh }: TripSettingsProps) {
  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [adults, setAdults] = useState(trip.adults);
  const [kids, setKids] = useState(trip.kids);
  const [coverPreview, setCoverPreview] = useState<string | null>(trip.coverPhotoUrl);
  const [coverAttribution, setCoverAttribution] = useState<string | null>(trip.coverPhotoAttribution);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverChanged, setCoverChanged] = useState(false);
  const [checkIn, setCheckIn] = useState(
    trip.checkIn ? new Date(trip.checkIn).toISOString().split("T")[0] : ""
  );
  const [checkOut, setCheckOut] = useState(
    trip.checkOut ? new Date(trip.checkOut).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);
  const [travelers, setTravelers] = useState<Traveler[]>(trip.travelers || []);
  const [newTravelerName, setNewTravelerName] = useState("");
  const [addingTraveler, setAddingTraveler] = useState(false);

  async function handleAddTraveler() {
    if (!newTravelerName.trim() || addingTraveler) return;
    setAddingTraveler(true);
    try {
      const usedColors = travelers.map((t) => t.color);
      const color = getNextColor(usedColors);
      const res = await fetch(`/api/trips/${trip.id}/travelers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTravelerName.trim(), color }),
      });
      if (res.ok) {
        const t = await res.json();
        const updated = [...travelers, t];
        setTravelers(updated);
        setAdults(updated.length);
        setNewTravelerName("");
        onRefresh();
      }
    } finally {
      setAddingTraveler(false);
    }
  }

  async function handleRemoveTraveler(travelerId: string) {
    const res = await fetch(`/api/trips/${trip.id}/travelers?travelerId=${travelerId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const updated = travelers.filter((t) => t.id !== travelerId);
      setTravelers(updated);
      if (updated.length > 0) setAdults(updated.length);
      onRefresh();
    }
  }

  const dateNights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const hasDates = !!(trip.checkIn || trip.checkOut);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Geocode if destination changed
      let geoUpdates: { centerLat?: number; centerLng?: number } = {};
      if (destination.trim() !== trip.destination) {
        try {
          const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(destination.trim())}`);
          if (geoRes.ok) {
            const geo = await geoRes.json();
            geoUpdates = { centerLat: geo.lat, centerLng: geo.lng };
          }
        } catch {}
      }

      // If user uploaded a new file, upload it
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const uploadRes = await fetch(`/api/trips/${trip.id}/cover-photo`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const { coverPhotoUrl } = await uploadRes.json();
          await onSave({
            name: name.trim(), destination: destination.trim(),
            adults, kids, checkIn: checkIn || null, checkOut: checkOut || null,
            nights: dateNights, coverPhotoUrl, coverPhotoAttribution: null,
            ...geoUpdates,
          });
          return;
        }
      }

      await onSave({
        name: name.trim(),
        destination: destination.trim(),
        adults,
        kids,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        nights: dateNights,
        ...geoUpdates,
        ...(coverChanged && !coverFile ? { coverPhotoUrl: coverPreview, coverPhotoAttribution: coverAttribution } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverAttribution(null);
    setCoverChanged(true);
  }

  function fetchUnsplashCover() {
    fetch(`/api/unsplash?q=${encodeURIComponent(destination || trip.destination)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.url) {
          setCoverPreview(data.url);
          setCoverAttribution(data.attribution);
          setCoverFile(null);
          setCoverChanged(true);
        }
      })
      .catch(() => {});
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "#fff",
    border: "1px solid var(--color-border-dark)",
    borderRadius: 10,
    color: "var(--color-text)",
    fontFamily: "inherit",
    fontSize: 15,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: "var(--color-text-mid)",
    marginBottom: 6,
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: 600,
  };

  // Gentle prompt style for empty optional fields
  const promptStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 16px",
    background: "var(--color-coral-light)",
    border: "1px solid var(--color-coral-border)",
    borderRadius: 10,
    fontSize: 14,
    color: "var(--color-text-mid)",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  };

  return (
    <div style={{
      height: "100dvh",
      background: "var(--color-bg)",
      overflowY: "auto",
    }}>
      {/* Header */}
      <header style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--color-bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600,
            color: "var(--color-text-mid)", padding: "8px 12px",
            borderRadius: 6,
          }}
        >
          &larr; Back
        </button>
        <h2 className="font-heading" style={{
          fontSize: 16, fontWeight: 600, color: "var(--color-text)", margin: 0,
        }}>
          Trip Settings
        </h2>
        <div style={{ width: 60 }} />
      </header>

      <form onSubmit={handleSave} style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "28px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        {/* Cover Photo — at top for visual impact */}
        <div>
          <label style={labelStyle}>Cover Photo</label>
          {coverPreview ? (
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--color-border-dark)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Cover"
                style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.35) 100%)",
              }} />
              {coverAttribution && (
                <div style={{ position: "absolute", bottom: 4, right: 8, fontSize: 9, color: "rgba(255,255,255,0.5)" }}>
                  {coverAttribution}
                </div>
              )}
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                <label style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 8,
                  background: "rgba(0,0,0,0.5)", color: "#fff",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  Upload new
                  <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: "none" }} />
                </label>
                <button
                  type="button"
                  onClick={fetchUnsplashCover}
                  style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 8,
                    background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Unsplash
                </button>
                <button
                  type="button"
                  onClick={() => { setCoverPreview(null); setCoverAttribution(null); setCoverFile(null); setCoverChanged(true); }}
                  style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 8,
                    background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.7)",
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
                flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 500,
                background: "#fff", border: "1px solid var(--color-border-dark)",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                color: "var(--color-text-mid)", textAlign: "center" as const,
              }}>
                Upload photo
                <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: "none" }} />
              </label>
              <button
                type="button"
                onClick={fetchUnsplashCover}
                style={{
                  flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 500,
                  background: "#fff", border: "1px solid var(--color-border-dark)",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  color: "var(--color-text-mid)",
                }}
              >
                Unsplash suggestion
              </button>
            </div>
          )}
        </div>

        {/* Trip name */}
        <div>
          <label style={labelStyle}>Trip Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Barbados 2026"
          />
        </div>

        {/* Destination */}
        <div>
          <label style={labelStyle}>Destination</label>
          <input
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={inputStyle}
            placeholder="Barbados"
          />
          {destination.trim() !== trip.destination && destination.trim() && (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, marginBottom: 0 }}>
              Map center will update when you save.
            </p>
          )}
        </div>

        {/* Dates — with gentle prompt if missing */}
        <div>
          <label style={labelStyle}>Dates</label>
          {!hasDates && !checkIn && !checkOut ? (
            <div
              onClick={() => {
                // Focus the first date input by setting a dummy value and clearing
                const today = new Date().toISOString().split("T")[0];
                setCheckIn(today);
              }}
              style={promptStyle}
            >
              <span style={{ fontSize: 18, color: "var(--color-coral)", lineHeight: 1 }}>+</span>
              <span>Add your travel dates</span>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>Arrival</span>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    style={{
                      ...inputStyle,
                      color: checkIn ? "var(--color-text)" : "var(--color-text-muted)",
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>Departure</span>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || undefined}
                    onChange={(e) => setCheckOut(e.target.value)}
                    style={{
                      ...inputStyle,
                      color: checkOut ? "var(--color-text)" : "var(--color-text-muted)",
                    }}
                  />
                </div>
              </div>
              {dateNights != null && (
                <p className="font-mono" style={{ fontSize: 12, color: "var(--color-text-mid)", marginTop: 8, marginBottom: 0 }}>
                  {dateNights} night{dateNights !== 1 ? "s" : ""}
                </p>
              )}
              {(checkIn || checkOut) && (
                <button
                  type="button"
                  onClick={() => { setCheckIn(""); setCheckOut(""); }}
                  style={{
                    fontSize: 12, color: "var(--color-text-muted)", background: "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0,
                    marginTop: 6,
                  }}
                >
                  Clear dates
                </button>
              )}
            </>
          )}
        </div>

        {/* Group size */}
        <div>
          <label style={labelStyle}>Group Size</label>
          <div style={{
            background: "#fff",
            border: "1px solid var(--color-border-dark)",
            borderRadius: 10,
            padding: "8px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 14, color: "var(--color-text-mid)" }}>Adults</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  disabled={adults <= 1}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "1px solid var(--color-border-dark)",
                    background: adults <= 1 ? "var(--color-bg)" : "#fff",
                    color: adults <= 1 ? "var(--color-text-light)" : "var(--color-text)",
                    cursor: adults <= 1 ? "default" : "pointer",
                    fontSize: 18, fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >-</button>
                <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults(Math.min(20, adults + 1))}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "1px solid var(--color-border-dark)",
                    background: "#fff", color: "var(--color-text)",
                    cursor: "pointer", fontSize: 18, fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >+</button>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 14, color: "var(--color-text-mid)" }}>Kids</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setKids(Math.max(0, kids - 1))}
                  disabled={kids <= 0}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "1px solid var(--color-border-dark)",
                    background: kids <= 0 ? "var(--color-bg)" : "#fff",
                    color: kids <= 0 ? "var(--color-text-light)" : "var(--color-text)",
                    cursor: kids <= 0 ? "default" : "pointer",
                    fontSize: 18, fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >-</button>
                <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{kids}</span>
                <button
                  type="button"
                  onClick={() => setKids(Math.min(20, kids + 1))}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "1px solid var(--color-border-dark)",
                    background: "#fff", color: "var(--color-text)",
                    cursor: "pointer", fontSize: 18, fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >+</button>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, marginBottom: 0 }}>
            Changing adults updates all per-person price calculations.
          </p>
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={saving || !name.trim() || !destination.trim()}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 16,
            fontWeight: 600,
            background: "var(--color-coral)",
            color: "#fff",
            borderRadius: 10,
            border: "none",
            cursor: saving ? "default" : "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.6 : 1,
            transition: "all 0.15s",
            boxShadow: "0 4px 14px rgba(224,90,71,0.25)",
            marginTop: 4,
          }}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Travelers section */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-heading)", display: "block", marginBottom: 12 }}>
          Travelers
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {travelers.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "#fff",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.color,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 14, color: "var(--color-text)", flex: 1 }}>
                {t.name}
              </span>
              {t.isCreator && (
                <span style={{
                  fontSize: 10,
                  color: "var(--color-text-muted)",
                  background: "var(--color-panel)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontWeight: 500,
                }}>
                  creator
                </span>
              )}
              {!t.isCreator && (
                <button
                  onClick={() => handleRemoveTraveler(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    fontSize: 16,
                    padding: 0,
                    lineHeight: 1,
                    fontFamily: "inherit",
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Add traveler input */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            type="text"
            placeholder="Add traveler..."
            value={newTravelerName}
            onChange={(e) => setNewTravelerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTraveler();
              }
            }}
            style={{
              flex: 1,
              padding: "10px 14px",
              background: "#fff",
              border: "1px solid var(--color-border-dark)",
              borderRadius: 8,
              color: "var(--color-text)",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={handleAddTraveler}
            disabled={!newTravelerName.trim() || addingTraveler}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: newTravelerName.trim() ? "var(--color-coral)" : "var(--color-panel)",
              color: newTravelerName.trim() ? "#fff" : "var(--color-text-light)",
              borderRadius: 8,
              border: "none",
              cursor: newTravelerName.trim() ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripPage({
  params: paramsPromise,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const params = use(paramsPromise);
  const { tripId } = params;

  const [trip, setTrip] = useState<Trip>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const detailListingRef = useRef<Listing | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmoji, setUserEmoji] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [currentTraveler, setCurrentTraveler] = useState<Traveler | null>(null);
  const [showIdentityPicker, setShowIdentityPicker] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [miniPreview, setMiniPreview] = useState<Listing | null>(null);
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Mobile bottom sheet state — three positions: full (0%), half (50%), collapsed (88%)
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const sheetDragStart = useRef<{ y: number; sheetTop: number; time: number } | null>(null);
  const sheetGestureMode = useRef<"expand" | "collapse" | "handle" | null>(null);
  const sheetLastTouch = useRef<{ y: number; time: number } | null>(null);
  const [sheetTop, setSheetTop] = useState(50); // percentage from top
  const [sheetDragging, setSheetDragging] = useState(false);
  const isSheetFull = sheetTop <= 3;
  const isSheetCollapsed = sheetTop >= 80;

  // Dismiss mini preview when sheet leaves collapsed
  useEffect(() => {
    if (!isSheetCollapsed) setMiniPreview(null);
  }, [isSheetCollapsed]);

  // Keep ref in sync so fetchTrip can read it without a dependency
  useEffect(() => {
    detailListingRef.current = detailListing;
  }, [detailListing]);

  // Load trip data
  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
        setFetchError(null);

        // If detail panel is open, refresh the listing data
        const currentDetail = detailListingRef.current;
        if (currentDetail) {
          const updated = data.listings.find(
            (l: Listing) => l.id === currentDetail.id
          );
          if (updated) setDetailListing(updated);
        }
      } else if (res.status === 404) {
        setFetchError("Trip not found");
      } else {
        setFetchError("Could not load trip — the database may need a schema update.");
      }
    } catch {
      setFetchError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  // Initial load + polling
  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  useEffect(() => {
    const hasPending = trip?.listings?.some(
      (l: Listing) =>
        l.scrapeStatus === "pending" || l.scrapeStatus === "scraping"
    );
    if (!hasPending) return;

    const interval = setInterval(fetchTrip, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [trip, fetchTrip]);

  // Username + emoji + traveler identity
  useEffect(() => {
    const stored = getStoredName();
    if (stored) {
      setUserName(stored);
    }
    setUserEmoji(getStoredEmoji());
  }, []);

  // Resolve traveler identity from cookie once trip loads
  // Falls back to localStorage if cookie is lost (e.g. after deploy to new preview URL)
  useEffect(() => {
    if (!trip || identityChecked) return;

    const travelers: Traveler[] = trip.travelers || [];
    if (travelers.length === 0) {
      // Legacy trip without travelers — use localStorage name prompt
      if (!getStoredName()) {
        setShowNamePrompt(true);
      }
      setIdentityChecked(true);
      return;
    }

    // Helper: finalize identity from a traveler object
    function applyIdentity(traveler: Traveler) {
      setCurrentTraveler(traveler);
      setUserName(traveler.name);
      setStoredName(traveler.name);
      // Persist to localStorage so it survives domain/cookie changes
      try { localStorage.setItem(`stay_identity_${tripId}`, traveler.id); } catch {}
    }

    // Helper: try to auto-reclaim from localStorage
    async function tryLocalStorageFallback(): Promise<boolean> {
      try {
        const savedId = localStorage.getItem(`stay_identity_${tripId}`);
        if (!savedId) return false;
        // Verify the traveler still exists by matching against trip data
        const match = travelers.find((t) => t.id === savedId);
        if (!match) return false;
        // Re-claim to refresh the cookie
        const res = await fetch(`/api/trips/${tripId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ travelerId: savedId }),
        });
        if (res.ok) {
          const t = await res.json();
          applyIdentity(t);
          return true;
        }
      } catch {}
      return false;
    }

    // Resolve from server (reads cookie server-side)
    fetch(`/api/trips/${tripId}/me`)
      .then((r) => r.ok ? r.json() : { traveler: null })
      .then(async (data: { traveler: Traveler | null }) => {
        if (data.traveler) {
          applyIdentity(data.traveler);
          setIdentityChecked(true);
        } else {
          // Cookie missing — try localStorage fallback
          const recovered = await tryLocalStorageFallback();
          if (!recovered) setShowIdentityPicker(true);
          setIdentityChecked(true);
        }
      })
      .catch(async () => {
        const recovered = await tryLocalStorageFallback();
        if (!recovered) setShowIdentityPicker(true);
        setIdentityChecked(true);
      });
  }, [trip, tripId, identityChecked]);

  // Scroll-to-center: fly map to the most visible card in the sidebar
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const visibilityMap = new Map<string, number>();
    let currentFocusedId: string | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-listing-id");
          if (id) visibilityMap.set(id, entry.intersectionRatio);
        });

        let maxRatio = 0;
        let maxId: string | null = null;
        visibilityMap.forEach((ratio, id) => {
          if (ratio > maxRatio) { maxRatio = ratio; maxId = id; }
        });

        if (maxId && maxRatio > 0.5 && maxId !== currentFocusedId) {
          currentFocusedId = maxId;
          // Only scroll-fly when no detail panel is open
          if (!detailListingRef.current) {
            setSelectedId(maxId);
          }
        }
      },
      { root: sidebar, threshold: [0, 0.25, 0.5, 0.75, 1.0] }
    );

    sidebar.querySelectorAll("[data-listing-id]").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [trip]);

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setUserName(nameInput.trim());
    setStoredName(nameInput.trim());
    setShowNamePrompt(false);
  }

  // Reactions
  async function handleReact(listingId: string, reactionType: ReactionType) {
    if (!userName) {
      setShowNamePrompt(true);
      return;
    }
    await fetch(`/api/listings/${listingId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, reactionType }),
    });
    fetchTrip();
  }

  async function handleRemoveVote(listingId: string) {
    await fetch(
      `/api/listings/${listingId}/vote?userName=${encodeURIComponent(userName)}`,
      { method: "DELETE" }
    );
    fetchTrip();
  }

  async function handleRescrape(listingId: string) {
    await fetch(`/api/listings/${listingId}/rescrape`, { method: "POST" });
    fetchTrip();
  }

  async function updateTripSettings(updates: {
    name?: string; destination?: string;
    adults?: number; kids?: number; nights?: number | null;
    checkIn?: string | null; checkOut?: string | null;
    centerLat?: number; centerLng?: number;
    coverPhotoUrl?: string | null; coverPhotoAttribution?: string | null;
  }) {
    await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchTrip();
  }

  function openDetail(listing: Listing) {
    setDetailListing(listing);
    setSelectedId(listing.id);
    if (isMobile) {
      document.body.classList.add("mobile-detail-open");
    }
  }

  function closeDetail() {
    setDetailListing(null);
    document.body.classList.remove("mobile-detail-open");
  }

  /** Snap sheet with velocity: fast flick overrides positional thresholds */
  function snapSheet(velocity: number) {
    // velocity in %/ms — positive = moving down, negative = moving up
    const FLICK_THRESHOLD = 0.15; // %/ms
    setSheetTop((prev) => {
      if (Math.abs(velocity) > FLICK_THRESHOLD) {
        // Fast flick — snap in direction of movement
        if (velocity < 0) {
          // Swiping up — go to next higher position
          return prev > 60 ? 50 : 0;
        } else {
          // Swiping down — go to next lower position
          return prev < 25 ? 50 : 88;
        }
      }
      // Slow drag — snap to nearest
      return prev < 25 ? 0 : prev < 70 ? 50 : 88;
    });
  }

  if (loading) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          color: "var(--color-text-mid)",
        }}
      >
        Loading trip...
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "var(--color-bg)",
          color: "var(--color-text-mid)",
        }}
      >
        <p>{fetchError || "Trip not found"}</p>
        {fetchError && fetchError !== "Trip not found" && (
          <button
            onClick={() => window.location.reload()}
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
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Show identity picker if needed
  const tripTravelers: Traveler[] = trip.travelers || [];
  if (showIdentityPicker && tripTravelers.length > 0) {
    return (
      <IdentityPicker
        trip={trip}
        travelers={tripTravelers}
        onClaim={(traveler) => {
          setCurrentTraveler(traveler);
          setUserName(traveler.name);
          setStoredName(traveler.name);
          try { localStorage.setItem(`stay_identity_${tripId}`, traveler.id); } catch {}
          setShowIdentityPicker(false);
          setShowNamePrompt(false);
        }}
      />
    );
  }

  const listings: Listing[] = trip.listings || [];
  const filtered = applyFilters(listings, filters);
  const nights = trip.nights || 7;
  // Use travelers count for per-person pricing when travelers exist
  const adults = tripTravelers.length > 0 ? tripTravelers.length : trip.adults;

  const isDetailOpen = detailListing !== null;
  const sidebarWidth = isDetailOpen ? 300 : 380;
  const tripPrefs: TripPreferencesType | null = trip.preferences || null;

  // Trip date formatting for header
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const checkInDate = trip.checkIn ? new Date(trip.checkIn) : null;
  const tripMonthLabel = checkInDate
    ? `${MONTHS[checkInDate.getMonth()]} \u2018${String(checkInDate.getFullYear()).slice(-2)}`
    : null;
  const daysUntilTrip = checkInDate
    ? Math.ceil((checkInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (showSettings) {
    return (
      <TripSettingsView
        trip={trip}
        onSave={async (updates) => {
          await updateTripSettings(updates);
          setShowSettings(false);
        }}
        onClose={() => setShowSettings(false)}
        onRefresh={fetchTrip}
      />
    );
  }

  if (showPreferences) {
    return (
      <TripPreferences
        tripId={tripId}
        initial={tripPrefs}
        hasKids={trip.kids > 0}
        onSave={() => {
          setShowPreferences(false);
          fetchTrip();
        }}
        onClose={() => setShowPreferences(false)}
        userName={userName}
        userEmoji={userEmoji}
        onProfileChange={(name, emoji) => {
          setUserName(name);
          setStoredName(name);
          setUserEmoji(emoji);
          setStoredEmoji(emoji);
        }}
        adults={adults}
        kids={trip.kids}
        nights={trip.nights || 7}
        onTripSettingsChange={updateTripSettings}
      />
    );
  }

  // Consensus grouping — compute from reactions
  const consensusGroups = computeConsensusGroups(filtered);
  const hasMultipleGroups =
    [consensusGroups.into, consensusGroups.deciding, consensusGroups.not]
      .filter((g) => g.length > 0).length > 1;

  // Compute named waiting message for group headers
  function getGroupLabel(groupKey: ConsensusGroup): string {
    const meta = GROUP_META[groupKey];
    if (groupKey !== "deciding" || tripTravelers.length === 0) return meta.label;

    // Find who hasn't voted across all listings in this group
    const allVoters = new Set<string>();
    for (const listing of filtered) {
      for (const v of (listing.votes || [])) {
        allVoters.add(v.userName);
      }
    }

    const nonVoters = tripTravelers.filter((t) => !allVoters.has(t.name));
    if (nonVoters.length === 0) return meta.label;

    if (allVoters.size > 0 && nonVoters.length <= 2) {
      const names = nonVoters.map((t) => t.name);
      return `Waiting on ${names.join(" and ")}`;
    }

    return meta.label;
  }

  function renderGroupSection(groupKey: ConsensusGroup, listings: Listing[], indexOffset: number) {
    if (listings.length === 0) return null;
    const meta = GROUP_META[groupKey];
    const label = getGroupLabel(groupKey);

    // Check if everyone voted on ALL listings in "into" group
    const allVotedLabel = groupKey === "into" && tripTravelers.length > 0
      ? (() => {
          const allVoted = listings.every((l: Listing) => {
            const voters = new Set((l.votes || []).map((v: { userName: string }) => v.userName));
            return tripTravelers.every((t) => voters.has(t.name));
          });
          return allVoted ? "\u2713 everyone\u2019s in" : null;
        })()
      : null;

    return (
      <div key={groupKey}>
        {hasMultipleGroups && (
          <div className="consensus-group-header" style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: isMobile ? "10px 12px 4px" : "12px 14px 4px",
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "var(--color-bg)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: meta.bgColor,
            }}>
              <span style={{ fontSize: 13 }}>{meta.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-heading)",
                color: meta.color,
                letterSpacing: "0.01em",
              }}>
                {label}
              </span>
              {allVotedLabel && (
                <span style={{
                  fontSize: 11,
                  color: "var(--color-green)",
                  fontWeight: 500,
                  marginLeft: 4,
                }}>
                  {allVotedLabel}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-light)",
              fontWeight: 500,
            }}>
              {listings.length}
            </span>
            <div style={{
              flex: 1,
              height: 1,
              background: "var(--color-border)",
              marginLeft: 4,
            }} />
          </div>
        )}
        <div style={{
          padding: isMobile ? "4px 8px 8px" : "4px 12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 8 : 12,
          opacity: groupKey === "not" ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}>
          {listings.map((listing: Listing, i: number) => (
            <div key={listing.id} data-listing-id={listing.id}>
              <ListingCard
                listing={listing}
                adults={adults}
                nights={nights}
                isSelected={selectedId === listing.id}
                isHovered={hoveredId === listing.id}
                index={indexOffset + i}
                onSelect={() => openDetail(listing)}
                onMouseEnter={() => setHoveredId(listing.id)}
                onMouseLeave={() => setHoveredId(null)}
                travelers={tripTravelers}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Shared sidebar content (used in both mobile list view and desktop sidebar)
  const sidebarContent = filtered.length === 0 ? (
    <div
      style={{
        padding: 32,
        textAlign: "center",
        color: "var(--color-text-mid)",
      }}
    >
      {listings.length === 0 ? (
        <>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>
            &#127968;
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
              marginBottom: 8,
              fontFamily: "var(--font-heading)",
            }}
          >
            No listings yet
          </h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Add your first vacation rental listing to get started.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--color-coral)",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add Listing
          </button>
        </>
      ) : (
        <p style={{ fontSize: 13 }}>No listings match your filters.</p>
      )}
    </div>
  ) : (
    <div>
      {renderGroupSection("into", consensusGroups.into, 0)}
      {renderGroupSection("deciding", consensusGroups.deciding, consensusGroups.into.length)}
      {renderGroupSection("not", consensusGroups.not, consensusGroups.into.length + consensusGroups.deciding.length)}
    </div>
  );

  const detailPanel = detailListing && (
    <ListingDetail
      listing={detailListing}
      adults={adults}
      nights={nights}
      userName={userName}
      onClose={closeDetail}
      onRefresh={fetchTrip}
      onNeedName={() => setShowNamePrompt(true)}
      onReact={(reactionType) => handleReact(detailListing.id, reactionType)}
      onRemoveReaction={() => handleRemoveVote(detailListing.id)}
      onRescrape={() => handleRescrape(detailListing.id)}
      onNightsChange={(n) => updateTripSettings({ nights: n })}
      budgetRange={null}
      hasPreferences={!!tripPrefs}
      isMobile={isMobile}
      travelers={tripTravelers}
    />
  );

  function handleMapPinSelect(id: string) {
    setSelectedId(id);

    if (isMobile) {
      const listing = listings.find((l: Listing) => l.id === id);
      if (isSheetCollapsed && listing) {
        // When sheet is collapsed, show mini preview instead of pulling up the full list
        setMiniPreview(listing);
      } else {
        // Ensure sheet is at least at half so the card is visible
        setSheetTop((prev) => prev > 50 ? 50 : prev);
        setTimeout(() => {
          const cardEl = document.getElementById(`listing-${id}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    } else {
      const listing = listings.find((l: Listing) => l.id === id);
      if (listing) openDetail(listing);
    }
  }

  const mapView = (
    <MapView
      listings={filtered}
      center={[trip.centerLng, trip.centerLat]}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={handleMapPinSelect}
      onHover={setHoveredId}
      adults={adults}
      nights={nights}
    />
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Trip header */}
      <header
        style={{
          padding: isMobile ? "8px 12px" : "10px 20px",
          background: "#fff",
          borderBottom: "1px solid var(--color-border-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, minWidth: 0, flex: 1 }}>
          <a
            href="/"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#2E2A26",
              textDecoration: "none",
              fontFamily: "var(--font-heading)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            stay<span style={{ color: "#C4725A" }}>.</span>
            <span className="font-mono" style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#C4725A", background: "rgba(196,114,90,0.12)", borderRadius: 4, padding: "3px 8px" }}>
              Alpha
            </span>
          </a>
          <h1
            style={{
              fontSize: isMobile ? 14 : 16,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
              fontFamily: "var(--font-heading)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {trip.destination}
            {tripMonthLabel && (
              <span style={{ color: "var(--color-text-mid)", fontWeight: 400, fontSize: isMobile ? 13 : 14 }}>
                {" \u00B7 "}{tripMonthLabel}
              </span>
            )}
          </h1>
          {daysUntilTrip != null && daysUntilTrip > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--color-text-mid)",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {"\u2600\uFE0F"} {daysUntilTrip}d
            </span>
          )}
          {/* Traveler avatar pips in header */}
          {!isMobile && tripTravelers.length > 0 && (
            <div style={{ display: "flex", marginLeft: 8, flexShrink: 0 }}>
              {tripTravelers.slice(0, 5).map((t, i) => (
                <div
                  key={t.id}
                  title={t.name}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: t.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 600,
                    border: currentTraveler?.id === t.id ? "2px solid var(--color-coral)" : "2px solid #fff",
                    marginLeft: i > 0 ? -5 : 0,
                    position: "relative" as const,
                    zIndex: tripTravelers.length - i,
                  }}
                >
                  {t.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {tripTravelers.length > 5 && (
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--color-panel)",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  fontWeight: 600,
                  border: "2px solid #fff",
                  marginLeft: -5,
                }}>
                  +{tripTravelers.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, flexShrink: 0 }}>
          {currentTraveler && !isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 12,
                color: "var(--color-text-mid)",
                padding: "4px 10px",
                background: "var(--color-panel)",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: currentTraveler.color,
                  flexShrink: 0,
                }} />
                {currentTraveler.name}
              </span>
              <button
                onClick={() => {
                  clearCookie(`stay_traveler_${tripId}`);
                  setCurrentTraveler(null);
                  setShowIdentityPicker(true);
                  setIdentityChecked(false);
                }}
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Not {currentTraveler.name}?
              </button>
            </div>
          )}
          {!currentTraveler && userName && !isMobile && (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-mid)",
                padding: "4px 10px",
                background: "var(--color-panel)",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {userEmoji && <span style={{ fontSize: 14 }}>{userEmoji}</span>}
              {userName}
            </span>
          )}
          {/* Trip settings gear — only visible to the trip creator */}
          {(currentTraveler?.isCreator || tripTravelers.length === 0) && (
            <button
              onClick={() => setShowSettings(true)}
              style={{
                width: isMobile ? 36 : 32, height: isMobile ? 36 : 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "1px solid var(--color-border-dark)",
                cursor: "pointer", fontSize: 15, color: "var(--color-text-muted)",
                fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0,
              }}
              title="Trip settings"
            >
              &#9881;
            </button>
          )}
          {isMobile ? (
            <button
              onClick={() => setShowPreferences(true)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--color-panel)", border: "1px solid var(--color-border-dark)",
                cursor: "pointer", fontSize: userEmoji ? 18 : 13, fontWeight: 700,
                color: "var(--color-text-mid)", fontFamily: "inherit",
                transition: "all 0.15s", flexShrink: 0,
              }}
              title="Preferences"
            >
              {userEmoji || (userName ? userName.charAt(0).toUpperCase() : "\u2699")}
            </button>
          ) : (
            <button
              onClick={() => setShowPreferences(true)}
              style={{
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-panel)",
                color: "var(--color-text-mid)",
                borderRadius: 8,
                border: "1px solid var(--color-border-dark)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              Preferences
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--color-coral)",
                color: "#fff",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "var(--color-coral-hover)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "var(--color-coral)")
              }
            >
              + Add Listing
            </button>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} isMobile={isMobile} />

      {/* Main content */}
      {isMobile ? (
        <>
          {/* Mobile: map + Airbnb-style bottom sheet */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {/* Map fills the space */}
            <div style={{ position: "absolute", inset: 0 }}>
              {mapView}
            </div>

            {/* Bottom sheet — three positions: full (0%), half (50%), collapsed (88%) */}
            <div
              ref={sheetRef}
              className="mobile-bottom-sheet"
              data-full={isSheetFull}
              data-collapsed={isSheetCollapsed}
              data-dragging={sheetDragging}
              style={{ top: `${sheetTop}%` }}
            >
              {/* Handle — generous 44px touch target, always allows drag */}
              <div
                className="sheet-handle"
                onTouchStart={(e) => {
                  const now = Date.now();
                  sheetDragStart.current = { y: e.touches[0].clientY, sheetTop, time: now };
                  sheetLastTouch.current = { y: e.touches[0].clientY, time: now };
                  sheetGestureMode.current = "handle";
                  setSheetDragging(true);
                }}
                onTouchMove={(e) => {
                  if (!sheetDragStart.current) return;
                  e.preventDefault();
                  const now = Date.now();
                  const touchY = e.touches[0].clientY;
                  sheetLastTouch.current = { y: touchY, time: now };
                  const containerHeight = sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
                  const deltaPct = ((touchY - sheetDragStart.current.y) / containerHeight) * 100;
                  setSheetTop(Math.max(0, Math.min(88, sheetDragStart.current.sheetTop + deltaPct)));
                }}
                onTouchEnd={() => {
                  if (!sheetDragStart.current) return;
                  // Calculate velocity
                  const last = sheetLastTouch.current;
                  const start = sheetDragStart.current;
                  const containerHeight = sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
                  let velocity = 0;
                  if (last && last.time > start.time) {
                    const dt = last.time - start.time;
                    const dy = ((last.y - start.y) / containerHeight) * 100;
                    velocity = dy / dt;
                  }
                  sheetDragStart.current = null;
                  sheetGestureMode.current = null;
                  sheetLastTouch.current = null;
                  setSheetDragging(false);
                  snapSheet(velocity);
                }}
              >
                <div className="sheet-handle-bar" />
              </div>

              {/* Scrollable content */}
              <div
                ref={(el) => {
                  sheetContentRef.current = el;
                  if (isMobile && el) {
                    sidebarRef.current = el;
                  }
                }}
                className="sheet-content"
                style={{
                  overflowY: isSheetFull && !sheetDragging ? "auto" : "hidden",
                  touchAction: isSheetFull && !sheetDragging ? "pan-y" : "none",
                }}
                onTouchStart={(e) => {
                  const now = Date.now();
                  sheetDragStart.current = { y: e.touches[0].clientY, sheetTop, time: now };
                  sheetLastTouch.current = { y: e.touches[0].clientY, time: now };
                  sheetGestureMode.current = null; // decide on first move
                }}
                onTouchMove={(e) => {
                  if (!sheetDragStart.current) return;
                  const touchY = e.touches[0].clientY;
                  const deltaY = touchY - sheetDragStart.current.y;
                  const startTop = sheetDragStart.current.sheetTop;

                  // Decide gesture mode once on first significant movement (8px dead zone)
                  if (sheetGestureMode.current === null) {
                    if (Math.abs(deltaY) < 8) return;
                    const contentEl = sheetContentRef.current;

                    if (startTop > 3) {
                      // Sheet at half or collapsed — any vertical swipe drags the sheet
                      sheetGestureMode.current = deltaY < 0 ? "expand" : "collapse";
                      setSheetDragging(true);
                    } else {
                      // Sheet at full — only pull-down at scroll-top collapses
                      if (contentEl && contentEl.scrollTop <= 0 && deltaY > 0) {
                        sheetGestureMode.current = "collapse";
                        setSheetDragging(true);
                      } else {
                        // Normal scroll — release the gesture completely
                        sheetDragStart.current = null;
                        return;
                      }
                    }
                  }

                  // Track velocity
                  const now = Date.now();
                  sheetLastTouch.current = { y: touchY, time: now };

                  // Move the sheet
                  e.preventDefault();
                  const containerHeight = sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
                  const deltaPct = (deltaY / containerHeight) * 100;
                  setSheetTop(Math.max(0, Math.min(88, startTop + deltaPct)));
                }}
                onTouchEnd={() => {
                  if (!sheetDragStart.current || !sheetGestureMode.current) {
                    sheetDragStart.current = null;
                    sheetGestureMode.current = null;
                    sheetLastTouch.current = null;
                    setSheetDragging(false);
                    return;
                  }
                  // Calculate velocity
                  const last = sheetLastTouch.current;
                  const start = sheetDragStart.current;
                  const containerHeight = sheetRef.current?.parentElement?.clientHeight || window.innerHeight;
                  let velocity = 0;
                  if (last && last.time > start.time) {
                    const dt = last.time - start.time;
                    const dy = ((last.y - start.y) / containerHeight) * 100;
                    velocity = dy / dt;
                  }
                  sheetDragStart.current = null;
                  sheetGestureMode.current = null;
                  sheetLastTouch.current = null;
                  setSheetDragging(false);
                  snapSheet(velocity);
                }}
              >
                {sidebarContent}
              </div>
            </div>
          </div>

          {/* Mini preview card — Airbnb-style, shown when tapping a pin with sheet collapsed */}
          {miniPreview && isSheetCollapsed && !detailListing && (
            <div
              className="mobile-mini-preview"
              onClick={() => {
                openDetail(miniPreview);
                setMiniPreview(null);
              }}
            >
              <div style={{ position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                {miniPreview.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={miniPreview.photos[0]}
                    alt={miniPreview.title || "Listing"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--color-panel)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, opacity: 0.3 }}>
                    &#127968;
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <h4 style={{
                  margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {miniPreview.title || "Untitled"}
                </h4>
                {(miniPreview.totalCost || miniPreview.perNight) && (
                  <p className="font-mono" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                    ${Math.round((miniPreview.totalCost || (miniPreview.perNight * nights)) / adults)}
                    <span style={{ fontWeight: 400, fontSize: 11, color: "var(--color-text-muted)" }}>/person</span>
                  </p>
                )}
                {miniPreview.bedrooms != null && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
                    {miniPreview.bedrooms} bed{miniPreview.bedrooms !== 1 ? "s" : ""}
                    {miniPreview.bathrooms != null && ` \u00B7 ${miniPreview.bathrooms} bath`}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setMiniPreview(null); }}
                style={{
                  position: "absolute", top: 8, right: 8,
                  width: 24, height: 24, borderRadius: "50%",
                  background: "rgba(0,0,0,0.06)", border: "none",
                  cursor: "pointer", fontSize: 14, color: "var(--color-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1, padding: 0,
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Floating Map pill — visible when list covers the map */}
          {isSheetFull && !detailListing && (
            <button
              className="mobile-map-pill"
              onClick={() => setSheetTop(50)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Map
            </button>
          )}

          {/* Mobile FAB for adding listings */}
          {!isSheetFull && (
            <button
              className="mobile-fab"
              onClick={() => setShowAddModal(true)}
              aria-label="Add listing"
            >
              +
            </button>
          )}

          {/* Mobile detail sheet */}
          {detailPanel}
        </>
      ) : (
        /* Desktop: three-column layout */
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Listing sidebar (LEFT) */}
          <div
            ref={sidebarRef}
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              borderRight: "1px solid var(--color-border-dark)",
              overflowY: "auto",
              background: "var(--color-bg)",
              transition: "width 0.25s var(--ease-spring)",
            }}
          >
            {sidebarContent}
          </div>

          {/* Map (CENTER) */}
          <div style={{ flex: 1, position: "relative" }}>
            {mapView}
          </div>

          {/* Detail panel (RIGHT, inline) */}
          {detailPanel}
        </div>
      )}

      {/* Add listing modal */}
      {showAddModal && (
        <AddListingModal
          tripId={tripId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchTrip();
          }}
          addedBy={userName}
        />
      )}

      {/* Name prompt — warm, casual, not a sign-up form */}
      {showNamePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "rgba(42,37,32,0.5)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="animate-slide-up"
            style={{
              background: "linear-gradient(160deg, #FFF9F5 0%, #FFFFFF 100%)",
              borderRadius: 20,
              padding: isMobile ? 24 : 32,
              maxWidth: 380,
              width: "100%",
              margin: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#128075;</div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "var(--color-text)",
                marginBottom: 6,
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
              }}
            >
              Before we dive in&mdash;
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--color-text-mid)",
                marginBottom: 20,
              }}
            >
              What should we call you?
            </p>
            <form onSubmit={submitName}>
              <input
                type="text"
                autoFocus
                placeholder="First name is perfect"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  fontSize: 17,
                  background: "var(--color-bg)",
                  border: "1.5px solid var(--color-border-dark)",
                  borderRadius: 12,
                  color: "var(--color-text)",
                  fontFamily: "inherit",
                  textAlign: "center",
                }}
              />
              <p style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                marginTop: 8,
                marginBottom: 16,
              }}>
                This is how your group will see your votes and comments.
              </p>
              <button
                type="submit"
                disabled={!nameInput.trim()}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  background: "var(--color-coral)",
                  color: "#fff",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: nameInput.trim() ? 1 : 0.5,
                  transition: "all 0.15s",
                  boxShadow: nameInput.trim() ? "0 4px 14px rgba(224,90,71,0.25)" : "none",
                }}
              >
                Let&apos;s go
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
