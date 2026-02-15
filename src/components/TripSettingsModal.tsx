"use client";

import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

interface TripData {
  id: string;
  name: string;
  destination: string;
  adults: number;
  kids: number;
  checkIn: string | null;
  checkOut: string | null;
  coverPhotoUrl: string | null;
  coverPhotoAttribution: string | null;
}

interface TripSettingsModalProps {
  trip: TripData;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const PLACEHOLDER_PHOTO =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=200&fit=crop";

export function TripSettingsModal({
  trip,
  onClose,
  onSaved,
  onDeleted,
}: TripSettingsModalProps) {
  const isMobile = useIsMobile();

  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [adults, setAdults] = useState(trip.adults);
  const [kids, setKids] = useState(trip.kids);
  const [checkIn, setCheckIn] = useState(
    trip.checkIn ? new Date(trip.checkIn).toISOString().split("T")[0] : ""
  );
  const [checkOut, setCheckOut] = useState(
    trip.checkOut ? new Date(trip.checkOut).toISOString().split("T")[0] : ""
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(
    trip.coverPhotoUrl
  );
  const [coverAttribution, setCoverAttribution] = useState<string | null>(
    trip.coverPhotoAttribution
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverChanged, setCoverChanged] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Unsplash photo for preview if no cover set
  useEffect(() => {
    if (coverPreview || coverChanged) return;
    let cancelled = false;
    fetch(`/api/unsplash?q=${encodeURIComponent(trip.destination)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.url) {
          setCoverPreview(data.url);
          setCoverAttribution(data.attribution);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trip.destination, coverPreview, coverChanged]);

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, showDeleteConfirm]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isMobile]);

  const dateNights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.round(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  async function handleSave() {
    if (!name.trim() || !destination.trim()) return;
    setSaving(true);
    try {
      // Geocode if destination changed
      let geoUpdates: { centerLat?: number; centerLng?: number } = {};
      if (destination.trim() !== trip.destination) {
        try {
          const geoRes = await fetch(
            `/api/geocode?q=${encodeURIComponent(destination.trim())}`
          );
          if (geoRes.ok) {
            const geo = await geoRes.json();
            geoUpdates = { centerLat: geo.lat, centerLng: geo.lng };
          }
        } catch {}

        // Also fetch new Unsplash cover if destination changed and user hasn't uploaded their own
        if (!coverFile && !coverChanged) {
          try {
            const unsplashRes = await fetch(
              `/api/unsplash?q=${encodeURIComponent(destination.trim())}`
            );
            if (unsplashRes.ok) {
              const data = await unsplashRes.json();
              if (data?.url) {
                setCoverPreview(data.url);
                setCoverAttribution(data.attribution);
                setCoverChanged(true);
              }
            }
          } catch {}
        }
      }

      // Upload file if user picked one
      let uploadedUrl: string | null = null;
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const uploadRes = await fetch(
          `/api/trips/${trip.id}/cover-photo`,
          { method: "POST", body: formData }
        );
        if (uploadRes.ok) {
          const { coverPhotoUrl } = await uploadRes.json();
          uploadedUrl = coverPhotoUrl;
        }
      }

      // Build update payload
      const payload: Record<string, unknown> = {
        name: name.trim(),
        destination: destination.trim(),
        adults,
        kids,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        nights: dateNights,
        ...geoUpdates,
      };

      if (uploadedUrl) {
        payload.coverPhotoUrl = uploadedUrl;
        payload.coverPhotoAttribution = null;
      } else if (coverChanged) {
        payload.coverPhotoUrl = coverPreview;
        payload.coverPhotoAttribution = coverAttribution;
      }

      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted();
      }
    } finally {
      setDeleting(false);
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

  function fetchNewUnsplashCover() {
    const q = destination.trim() || trip.destination;
    fetch(`/api/unsplash?q=${encodeURIComponent(q)}&t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
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

  const displayPhoto = coverPreview || PLACEHOLDER_PHOTO;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "#fff",
    border: "1px solid var(--color-border-dark)",
    borderRadius: 10,
    color: "var(--color-text)",
    fontFamily: "inherit",
    fontSize: 15,
    boxSizing: "border-box",
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

  const formContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: isMobile ? "20px 20px 40px" : "24px 28px 28px",
        overflowY: "auto",
        flex: 1,
      }}
    >
      {/* Cover Photo */}
      <div>
        <label style={labelStyle}>Cover Photo</label>
        <div
          style={{
            position: "relative",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--color-border-dark)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayPhoto}
            alt="Cover"
            style={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          {coverAttribution && (
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 8,
                fontSize: 9,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {coverAttribution}
            </div>
          )}
          {/* Change button */}
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
                backdropFilter: "blur(4px)",
              }}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={fetchNewUnsplashCover}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.5)",
                color: "rgba(255,255,255,0.85)",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
                backdropFilter: "blur(4px)",
              }}
            >
              Change
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Trip Name */}
      <div>
        <label style={labelStyle}>Trip Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder="e.g. Barbados 2026"
        />
      </div>

      {/* Destination */}
      <div>
        <label style={labelStyle}>Destination</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          style={inputStyle}
          placeholder="e.g. Barbados"
        />
        {destination.trim() !== trip.destination && destination.trim() && (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Saving will update the map center and cover photo.
          </p>
        )}
      </div>

      {/* Dates */}
      <div>
        <label style={labelStyle}>Dates</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Start date
            </span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              style={{
                ...inputStyle,
                fontSize: 16,
                color: checkIn ? "var(--color-text)" : "var(--color-text-muted)",
              }}
            />
          </div>
          <div>
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                display: "block",
                marginBottom: 4,
              }}
            >
              End date
            </span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              style={{
                ...inputStyle,
                fontSize: 16,
                color: checkOut
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
              }}
            />
          </div>
        </div>
        {dateNights != null && (
          <p
            className="font-mono"
            style={{
              fontSize: 12,
              color: "var(--color-text-mid)",
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            {dateNights} night{dateNights !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Group Size */}
      <div>
        <label style={labelStyle}>Group Size</label>
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-dark)",
            borderRadius: 10,
            padding: "8px 16px",
          }}
        >
          {/* Adults */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--color-text-mid)" }}>
              Adults
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => setAdults(Math.max(1, adults - 1))}
                disabled={adults <= 1}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border-dark)",
                  background: adults <= 1 ? "var(--color-bg)" : "#fff",
                  color:
                    adults <= 1
                      ? "var(--color-text-light)"
                      : "var(--color-text)",
                  cursor: adults <= 1 ? "default" : "pointer",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                -
              </button>
              <span
                className="font-mono"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {adults}
              </span>
              <button
                type="button"
                onClick={() => setAdults(Math.min(20, adults + 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border-dark)",
                  background: "#fff",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                +
              </button>
            </div>
          </div>
          {/* Kids */}
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--color-text-mid)" }}>
              Kids
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => setKids(Math.max(0, kids - 1))}
                disabled={kids <= 0}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border-dark)",
                  background: kids <= 0 ? "var(--color-bg)" : "#fff",
                  color:
                    kids <= 0
                      ? "var(--color-text-light)"
                      : "var(--color-text)",
                  cursor: kids <= 0 ? "default" : "pointer",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                -
              </button>
              <span
                className="font-mono"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {kids}
              </span>
              <button
                type="button"
                onClick={() => setKids(Math.min(20, kids + 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1px solid var(--color-border-dark)",
                  background: "#fff",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button — terracotta */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim() || !destination.trim()}
        style={{
          width: "100%",
          padding: "14px 16px",
          fontSize: 16,
          fontWeight: 600,
          background: "#C4725A",
          color: "#fff",
          borderRadius: 10,
          border: "none",
          cursor: saving ? "default" : "pointer",
          fontFamily: "inherit",
          opacity: saving || !name.trim() || !destination.trim() ? 0.6 : 1,
          transition: "all 0.15s",
          boxShadow: "0 4px 14px rgba(196,114,90,0.25)",
          marginTop: 4,
        }}
      >
        {saving ? "Saving..." : "Save"}
      </button>

      {/* Delete Trip */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 500,
              background: "none",
              color: "var(--color-text-muted)",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            Delete trip
          </button>
        ) : (
          <div
            style={{
              background: "rgba(185,28,28,0.04)",
              border: "1px solid rgba(185,28,28,0.15)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text)",
                margin: 0,
                marginBottom: 4,
              }}
            >
              Delete &ldquo;{trip.name}&rdquo;?
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-mid)",
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.4,
              }}
            >
              This will permanently delete this trip and all its listings, votes,
              and comments. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  background: "var(--color-panel)",
                  color: "var(--color-text-mid)",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "#b91c1c",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  cursor: deleting ? "default" : "pointer",
                  fontFamily: "inherit",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: full-page overlay
  if (isMobile) {
    return (
      <div
        ref={modalRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "var(--color-bg)",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s var(--ease-spring)",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--color-bg)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-text-mid)",
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            &larr; Back
          </button>
          <h2
            className="font-heading"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Trip Settings
          </h2>
          <div style={{ width: 60 }} />
        </header>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>{formContent}</div>
        </div>
      </div>
    );
  }

  // Desktop: modal with backdrop
  return (
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
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(42,37,32,0.4)",
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease-out",
        }}
      />
      {/* Modal */}
      <div
        ref={modalRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          background: "var(--color-card)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s var(--ease-spring)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <h2
            className="font-heading"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Trip Settings
          </h2>
          <button
            onClick={onClose}
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
        <div style={{ flex: 1, overflowY: "auto" }}>{formContent}</div>
      </div>
    </div>
  );
}
