"use client";

import { useState } from "react";
import type { FilterState, KitchenType } from "@/types";

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  isMobile?: boolean;
  onAddListing?: () => void;
}

export function FilterBar({ filters, onChange, isMobile, onAddListing }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(filters);

  function update(partial: Partial<FilterState>) {
    onChange({ ...filters, ...partial });
  }

  function toggleKitchen(type: KitchenType) {
    const kitchen = filters.kitchen.includes(type)
      ? filters.kitchen.filter((k) => k !== type)
      : [...filters.kitchen, type];
    update({ kitchen });
  }

  function clearAll() {
    onChange({
      sources: [], priceMin: 0, priceMax: Infinity,
      bedroomsMin: 0, bathroomsMin: 0, kitchen: [],
      beachDistance: "", ratingMin: 0, sortBy: "recent",
    });
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? "8px 14px" : "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    transition: "all 0.15s",
    border: active ? "1.5px solid #E94E3C" : "1px solid #DDD8D0",
    background: active ? "rgba(233,78,60,0.06)" : "#fff",
    color: active ? "#E94E3C" : "#706B65",
    whiteSpace: "nowrap",
    minHeight: isMobile ? 40 : undefined,
    display: "flex",
    alignItems: "center",
  });

  const dropStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 20,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    border: "1px solid #DDD8D0",
    background: "#fff",
    color: "#706B65",
    paddingRight: 24,
  };

  return (
    <div style={{ borderTop: "1px solid #E8E3DC", borderBottom: "1px solid #DDD8D0", flexShrink: 0, background: "#fff" }}>
      <div style={{
        padding: isMobile ? "8px 12px" : "8px 20px",
        display: "flex",
        flexWrap: isMobile ? "nowrap" : "wrap",
        gap: isMobile ? 6 : 8,
        alignItems: "center",
        overflowX: isMobile ? "auto" : undefined,
        WebkitOverflowScrolling: "touch" as const,
      }}>
        {/* Sort — styled as a minimal text link with chevron */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={filters.sortBy}
            onChange={(e) => update({ sortBy: e.target.value as FilterState["sortBy"] })}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none" as const,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: 13,
              color: "#8A847D",
              padding: "4px 18px 4px 0",
              borderRadius: 6,
              outline: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-panel)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <option value="recent">Sort: Recent</option>
            <option value="votes_desc">Sort: Votes</option>
            <option value="price_asc">Sort: Price</option>
            <option value="rating">Sort: Rating</option>
          </select>
          {/* Custom chevron */}
          <span style={{
            position: "absolute",
            right: 2,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            fontSize: 10,
            color: "#8A847D",
            lineHeight: 1,
          }}>{"\u25BE"}</span>
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            ...chip(activeCount > 0),
            marginLeft: "auto",
          }}
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""} {expanded ? "\u25B2" : "\u25BC"}
        </button>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#E94E3C", fontWeight: 600, fontFamily: "inherit",
              padding: "6px 8px",
            }}
          >
            Clear
          </button>
        )}

        {/* Add Listing — desktop only */}
        {onAddListing && !isMobile && (
          <button
            onClick={onAddListing}
            style={{
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--color-coral)",
              color: "#fff",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
              whiteSpace: "nowrap",
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

      {/* Expanded filters */}
      {expanded && (
        <div style={{
          padding: isMobile ? "12px 12px 16px" : "12px 20px 16px",
          borderTop: "1px solid #E8E3DC",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12,
        }}>
          <div>
            <label className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: "#706B65", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Min Bedrooms
            </label>
            <select
              value={filters.bedroomsMin}
              onChange={(e) => update({ bedroomsMin: Number(e.target.value) })}
              style={{ ...dropStyle, width: "100%", borderRadius: 8 }}
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: "#706B65", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Min Bathrooms
            </label>
            <select
              value={filters.bathroomsMin}
              onChange={(e) => update({ bathroomsMin: Number(e.target.value) })}
              style={{ ...dropStyle, width: "100%", borderRadius: 8 }}
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: "#706B65", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Kitchen
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["full", "kitchenette"] as KitchenType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleKitchen(type)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
                    border: filters.kitchen.includes(type) ? "1.5px solid #E94E3C" : "1px solid #DDD8D0",
                    background: filters.kitchen.includes(type) ? "rgba(233,78,60,0.06)" : "#fff",
                    color: filters.kitchen.includes(type) ? "#E94E3C" : "#706B65",
                  }}
                >
                  {type === "full" ? "Full" : "Kitchenette"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: "#706B65", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Min Rating
            </label>
            <select
              value={filters.ratingMin}
              onChange={(e) => update({ ratingMin: Number(e.target.value) })}
              style={{ ...dropStyle, width: "100%", borderRadius: 8 }}
            >
              <option value="0">Any</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.bedroomsMin > 0) count++;
  if (filters.bathroomsMin > 0) count++;
  if (filters.kitchen.length > 0) count++;
  if (filters.ratingMin > 0) count++;
  if (filters.priceMax < Infinity) count++;
  return count;
}
