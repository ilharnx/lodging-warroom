"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Listing {
  id: string;
  lat: number;
  lng: number;
  name: string;
  totalCost: number | null;
  perNight: number | null;
  source: string;
  scrapeStatus: string;
}

interface MapViewProps {
  listings: Listing[];
  center: [number, number];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  adults: number;
  nights: number;
  editingLocationId?: string | null;
  onLocationDrag?: (lat: number, lng: number) => void;
  onLocationSave?: () => void;
  onLocationCancel?: () => void;
}

export default function MapView({
  listings,
  center,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  adults,
  nights,
  editingLocationId,
  onLocationDrag,
  onLocationSave,
  onLocationCancel,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(
    new Map()
  );
  const editMarker = useRef<mapboxgl.Marker | null>(null);
  const [noToken, setNoToken] = useState(false);
  const prevSelectedId = useRef<string | null>(null);
  const userInteracting = useRef(false);
  const easeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEasing = useRef(false);
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setNoToken(true);
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    // Debounced resize — prevents rapid resize() calls during CSS transitions
    // from interrupting easeTo animations
    const ro = new ResizeObserver(() => {
      if (isEasing.current) return; // never resize while easing
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        resizeTimer.current = null;
        map.current?.resize();
      }, 80);
    });
    ro.observe(mapContainer.current);

    return () => {
      if (easeTimeout.current) clearTimeout(easeTimeout.current);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      ro.disconnect();
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || noToken) return;

    const currentIds = new Set(listings.map((l) => l.id));

    markers.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    });

    listings.forEach((listing) => {
      if (listing.lat === 0 && listing.lng === 0) return;

      // Per-person-per-night price for pin labels
      let price = "?";
      if (listing.perNight && adults > 0) {
        price = `$${Math.round(listing.perNight / adults)}`;
      } else if (listing.totalCost && nights > 0 && adults > 0) {
        price = `$${Math.round(listing.totalCost / nights / adults)}`;
      }

      // Skip creating/updating normal marker for listing being edited
      if (listing.id === editingLocationId) {
        const existing = markers.current.get(listing.id);
        if (existing) {
          existing.el.style.display = "none";
        }
        return;
      }

      const existing = markers.current.get(listing.id);
      if (existing) {
        existing.el.textContent = price;
        existing.el.style.display = "";
        existing.marker.setLngLat([listing.lng, listing.lat]);
      } else {
        const el = document.createElement("div");
        el.className = "price-marker";
        el.textContent = price;

        el.addEventListener("click", () => onSelect(listing.id));
        el.addEventListener("mouseenter", () => onHover(listing.id));
        el.addEventListener("mouseleave", () => onHover(null));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([listing.lng, listing.lat])
          .addTo(map.current!);

        markers.current.set(listing.id, { marker, el });
      }
    });
  }, [listings, noToken, onSelect, onHover, adults, nights, editingLocationId]);

  // Location editor: draggable pin for desktop
  useEffect(() => {
    if (!map.current || noToken) return;

    // Clean up previous edit marker
    if (editMarker.current) {
      editMarker.current.remove();
      editMarker.current = null;
    }

    if (!editingLocationId) return;

    const listing = listings.find((l) => l.id === editingLocationId);
    if (!listing) return;

    // Create a terracotta pulsing draggable marker
    const el = document.createElement("div");
    el.className = "edit-location-marker";
    el.innerHTML = `
      <div class="edit-marker-pulse"></div>
      <div class="edit-marker-pin"></div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      .edit-location-marker {
        position: relative;
        width: 32px;
        height: 32px;
        cursor: grab;
      }
      .edit-location-marker:active { cursor: grabbing; }
      .edit-marker-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        margin: -20px 0 0 -20px;
        border-radius: 50%;
        background: rgba(196, 114, 90, 0.2);
        animation: editPulse 1.5s ease-in-out infinite;
      }
      .edit-marker-pin {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        border-radius: 50%;
        background: #C4725A;
        border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      @keyframes editPulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.6); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const lat = listing.lat || center[1];
    const lng = listing.lng || center[0];

    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(map.current);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      onLocationDrag?.(lngLat.lat, lngLat.lng);
    });

    editMarker.current = marker;

    // Ease to the editing pin
    map.current.easeTo({
      center: [lng, lat],
      duration: 600,
      easing: (t) => t * (2 - t),
    });

    return () => {
      marker.remove();
      style.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLocationId, noToken]);

  // Track user map interaction to suppress flyTo during drags/zooms
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const onStart = () => { userInteracting.current = true; };
    const onEnd = () => { userInteracting.current = false; };

    m.on("dragstart", onStart);
    m.on("dragend", onEnd);

    return () => {
      m.off("dragstart", onStart);
      m.off("dragend", onEnd);
    };
  }, [noToken]);

  // Update selected/hovered marker classes
  useEffect(() => {
    markers.current.forEach((entry, id) => {
      if (id === selectedId) {
        entry.el.classList.add("active");
      } else {
        entry.el.classList.remove("active");
      }

      if (id === hoveredId && id !== selectedId) {
        entry.el.classList.add("hovered");
      } else {
        entry.el.classList.remove("hovered");
      }
    });
  }, [selectedId, hoveredId]);

  // Ease to selected listing — only when selectedId genuinely changes
  // and user is not actively dragging the map.
  // Uses isEasing ref to suppress ResizeObserver resize() calls that
  // would otherwise interrupt the animation mid-flight.
  useEffect(() => {
    // Don't ease when editing location — the edit marker effect handles it
    if (editingLocationId) return;

    if (
      selectedId &&
      selectedId !== prevSelectedId.current &&
      map.current &&
      !userInteracting.current
    ) {
      if (easeTimeout.current) clearTimeout(easeTimeout.current);

      const listing = listings.find((l) => l.id === selectedId);
      if (listing && listing.lat !== 0) {
        // Wait for layout transitions to settle, then do a single
        // resize + ease sequence with resize suppressed during the ease.
        easeTimeout.current = setTimeout(() => {
          easeTimeout.current = null;
          // Final resize before easing so the map has correct dimensions
          map.current?.resize();

          isEasing.current = true;
          map.current?.easeTo({
            center: [listing.lng, listing.lat],
            duration: 900,
            easing: (t) => t * (2 - t), // ease-out quadratic
          });

          // Release resize lock after the animation finishes
          setTimeout(() => { isEasing.current = false; }, 950);
        }, 350);
      }
    }
    prevSelectedId.current = selectedId;
  }, [selectedId, listings, editingLocationId]);

  if (noToken) {
    return (
      <div style={{
        height: "100%", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
      }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.3 }}>&#127758;</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
            Map View
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginBottom: 16 }}>
            Set <code style={{ color: "var(--color-coral)", background: "var(--color-panel)", padding: "1px 6px", borderRadius: 4 }}>
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code> in your <code>.env</code> to enable the map.
          </p>
          {listings.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {listings.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  style={{
                    width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 8,
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    border: selectedId === l.id ? "1px solid var(--color-coral)" : "1px solid var(--color-border-dark)",
                    background: selectedId === l.id ? "var(--color-coral-light)" : "#fff",
                    color: selectedId === l.id ? "var(--color-coral)" : "var(--color-text-mid)",
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ height: "100%", width: "100%", borderRadius: 14 }} />

      {/* Location editor banner */}
      {editingLocationId && (
        <div style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          background: "#fff",
          borderRadius: 10,
          padding: "10px 14px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          zIndex: 5,
        }}>
          <span style={{
            fontSize: 13,
            color: "var(--color-text-mid)",
            fontWeight: 500,
          }}>
            Drag pin to update location
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onLocationCancel}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "none",
                border: "1px solid var(--color-border-dark)",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--color-text-mid)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onLocationSave}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "#C4725A",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
