"use client";

import { useState, useEffect, useRef } from "react";
import type { BudgetRange } from "@/lib/budget";

interface BudgetRangeBarProps {
  range: BudgetRange;
  listings: { id: string; perNight: number | null; totalCost: number | null }[];
  hoveredId: string | null;
  adults: number;
  nights: number | null;
  onNightsChange?: (nights: number) => void;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BudgetRangeBar({ range, listings, hoveredId, adults, nights, onNightsChange }: BudgetRangeBarProps) {
  const spread = range.max - range.min;
  if (spread <= 0) return null;

  const [localNights, setLocalNights] = useState(nights || 7);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync if prop changes externally
  useEffect(() => {
    setLocalNights(nights || 7);
  }, [nights]);

  function handleNightsChange(value: number) {
    setLocalNights(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onNightsChange?.(value);
    }, 500);
  }

  const totalAvg = range.avg * localNights;
  const perPersonAvg = adults > 0 ? Math.round(totalAvg / adults) : totalAvg;

  const stepBtn = (disabled: boolean): React.CSSProperties => ({
    width: 20, height: 20, borderRadius: "50%",
    border: "1px solid var(--color-border-dark)",
    background: disabled ? "var(--color-bg)" : "#fff",
    color: disabled ? "var(--color-text-light)" : "var(--color-text)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 13, fontWeight: 600, fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, lineHeight: 1,
  });

  return (
    <div style={{
      padding: "10px 20px 12px",
      background: "#fff",
      borderBottom: "1px solid var(--color-border-dark)",
      flexShrink: 0,
    }}>
      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 12, color: "var(--color-text-mid)", alignItems: "center" }}>
        <span>
          Avg <span className="font-mono" style={{ fontWeight: 600, color: "var(--color-text)" }}>{formatPrice(range.avg)}</span>/night
        </span>
        <span>
          ~<span className="font-mono" style={{ fontWeight: 600, color: "var(--color-text)" }}>{formatPrice(totalAvg)}</span> for {localNights} nights
        </span>
        {adults > 1 && (
          <span>
            ~<span className="font-mono" style={{ fontWeight: 600, color: "var(--color-text)" }}>{formatPrice(perPersonAvg)}</span>/person
          </span>
        )}
        {onNightsChange && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => handleNightsChange(Math.max(1, localNights - 1))}
              disabled={localNights <= 1}
              style={stepBtn(localNights <= 1)}
            >-</button>
            <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 18, textAlign: "center" }}>
              {localNights}
            </span>
            <button
              onClick={() => handleNightsChange(Math.min(30, localNights + 1))}
              disabled={localNights >= 30}
              style={stepBtn(localNights >= 30)}
            >+</button>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>nights</span>
          </div>
        )}
      </div>

      {/* Range bar */}
      <div style={{ position: "relative", height: 8, background: "var(--color-border)", borderRadius: 4 }}>
        {/* Sweet spot (p20-p80) */}
        <div style={{
          position: "absolute",
          left: `${((range.p20 - range.min) / spread) * 100}%`,
          width: `${((range.p80 - range.p20) / spread) * 100}%`,
          top: 0,
          bottom: 0,
          background: "var(--color-coral-light)",
          border: "1px solid var(--color-coral-border)",
          borderRadius: 4,
        }} />

        {/* Listing dots */}
        {listings.map((l) => {
          const price = l.perNight || l.totalCost;
          if (!price) return null;
          const pct = Math.min(Math.max(((price - range.min) / spread) * 100, 0), 100);
          const isHovered = l.id === hoveredId;
          return (
            <div
              key={l.id}
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: isHovered ? 10 : 6,
                height: isHovered ? 10 : 6,
                borderRadius: "50%",
                background: isHovered ? "var(--color-coral)" : "var(--color-text-muted)",
                border: isHovered ? "2px solid #fff" : "1px solid #fff",
                boxShadow: isHovered ? "0 0 6px rgba(224,90,71,0.4)" : "0 0 2px rgba(0,0,0,0.1)",
                transition: "all 0.15s var(--ease-spring)",
                zIndex: isHovered ? 10 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Min/Max labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--color-text-light)" }} className="font-mono">
        <span>{formatPrice(range.min)}</span>
        <span>{formatPrice(range.max)}</span>
      </div>
    </div>
  );
}
