"use client";

import { useState } from "react";
import type { TripPreferences as TripPreferencesType, Vibe } from "@/types";
import { EMPTY_PREFERENCES } from "@/types";

interface TripPreferencesProps {
  tripId: string;
  initial: TripPreferencesType | null;
  hasKids: boolean;
  onSave: (prefs: TripPreferencesType) => void;
  onClose: () => void;
  userName: string;
  userEmoji: string;
  onProfileChange: (name: string, emoji: string) => void;
  adults: number;
  kids: number;
  nights: number;
  onTripSettingsChange: (updates: { adults?: number; kids?: number; nights?: number }) => void;
}

const AVATAR_EMOJI = [
  "\uD83D\uDE0E", "\uD83E\uDDD1", "\uD83C\uDFC4", "\uD83C\uDF34",
  "\uD83D\uDE80", "\uD83C\uDF1E", "\uD83E\uDD99", "\uD83D\uDC27",
  "\uD83D\uDC36", "\uD83C\uDF3B",
];

const VIBE_OPTIONS: { key: Vibe; label: string; desc: string; icon: string }[] = [
  { key: "chill", label: "Chill & quiet", desc: "Low-key relaxation, minimal crowds, peaceful vibes", icon: "\u{1F3D6}\uFE0F" },
  { key: "balanced", label: "Mix of both", desc: "Some chill, some adventure, flexible itinerary", icon: "\u2696\uFE0F" },
  { key: "active", label: "Active & social", desc: "Exploring, nightlife, group activities, things to do", icon: "\u{1F3C4}" },
];

const MUST_HAVE_OPTIONS = [
  "Pool", "Walk to beach", "Full kitchen", "Parking", "WiFi",
  "Washer", "AC", "Workspace", "BBQ", "Gym",
];

const DEALBREAKER_OPTIONS = [
  "No stairs", "No shared spaces", "Not on busy road",
  "Must be near beach", "Needs natural light",
];

const KID_NEED_OPTIONS = [
  "Crib", "Pool fence/safety", "High chair",
  "Kid-friendly space", "Ground floor", "Enclosed yard",
];

function ChipGrid({
  options,
  selected,
  disabled,
  onChange,
}: {
  options: string[];
  selected: string[];
  disabled?: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        const isDisabled = disabled?.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (isSelected) {
                onChange(selected.filter((s) => s !== opt));
              } else {
                onChange([...selected, opt]);
              }
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              cursor: isDisabled ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              border: isSelected
                ? "1.5px solid var(--color-coral)"
                : "1px solid var(--color-border-dark)",
              background: isSelected
                ? "var(--color-coral-light)"
                : isDisabled
                  ? "var(--color-bg)"
                  : "#fff",
              color: isSelected
                ? "var(--color-coral)"
                : isDisabled
                  ? "var(--color-text-light)"
                  : "var(--color-text-mid)",
              opacity: isDisabled ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: "50%",
    border: "1px solid var(--color-border-dark)",
    background: disabled ? "var(--color-bg)" : "#fff",
    color: disabled ? "var(--color-text-light)" : "var(--color-text)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 18, fontWeight: 600, fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 14, color: "var(--color-text-mid)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => { if (value > min) onChange(value - 1); }} disabled={value <= min} style={btnStyle(value <= min)}>-</button>
        <span className="font-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{value}</span>
        <button type="button" onClick={() => { if (value < max) onChange(value + 1); }} disabled={value >= max} style={btnStyle(value >= max)}>+</button>
      </div>
    </div>
  );
}

export function TripPreferences({
  tripId,
  initial,
  hasKids,
  onSave,
  onClose,
  userName,
  userEmoji,
  onProfileChange,
  adults,
  kids,
  nights,
  onTripSettingsChange,
}: TripPreferencesProps) {
  const prefs = initial || EMPTY_PREFERENCES;
  const [vibe, setVibe] = useState<Vibe | null>(prefs.vibe);
  const [mustHaves, setMustHaves] = useState<string[]>(prefs.mustHaves);
  const [niceToHaves, setNiceToHaves] = useState<string[]>(prefs.niceToHaves);
  const [dealbreakers, setDealbreakers] = useState<string[]>(prefs.dealbreakers);
  const [kidNeeds, setKidNeeds] = useState<string[]>(prefs.kidNeeds);
  const [notes, setNotes] = useState(prefs.notes);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editEmoji, setEditEmoji] = useState(userEmoji);

  async function handleSave() {
    setSaving(true);
    const preferences: TripPreferencesType = {
      vibe,
      mustHaves,
      niceToHaves,
      dealbreakers,
      kidNeeds,
      notes,
    };
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });
      if (res.ok) {
        if (editName.trim() && (editName.trim() !== userName || editEmoji !== userEmoji)) {
          onProfileChange(editName.trim(), editEmoji);
        }
        onSave(preferences);
      }
    } finally {
      setSaving(false);
    }
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: 32,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "var(--color-text-mid)",
    marginBottom: 4,
    display: "block",
    fontFamily: "var(--font-mono)",
  };
  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--color-text)",
    marginBottom: 12,
    fontFamily: "var(--font-heading)",
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      {/* Header */}
      <header style={{
        padding: "14px 24px",
        background: "#fff",
        borderBottom: "1px solid var(--color-border-dark)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600,
            color: "var(--color-text-mid)", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          &larr; Back to trip
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", margin: 0, fontFamily: "var(--font-heading)" }}>
          Trip Preferences
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 20px", fontSize: 14, fontWeight: 600,
            background: "var(--color-coral)", color: "#fff", borderRadius: 8,
            border: "none", cursor: "pointer", fontFamily: "inherit",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </header>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        {/* Profile */}
        <div style={{ ...sectionStyle, paddingBottom: 24, borderBottom: "1px solid var(--color-border-dark)" }}>
          <span style={labelStyle}>Your profile</span>
          <h2 style={titleStyle}>Name &amp; avatar</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--color-text-mid)", display: "block", marginBottom: 6 }}>
              Display name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your first name"
              style={{
                width: "100%", padding: "10px 14px", fontSize: 15,
                background: "#fff", border: "1px solid var(--color-border-dark)",
                borderRadius: 8, color: "var(--color-text)", fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--color-text-mid)", display: "block", marginBottom: 8 }}>
              Pick your avatar
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AVATAR_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEditEmoji(e)}
                  style={{
                    width: 44, height: 44, borderRadius: "50%", fontSize: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    border: editEmoji === e ? "2px solid var(--color-coral)" : "1px solid var(--color-border-dark)",
                    background: editEmoji === e ? "var(--color-coral-light)" : "#fff",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trip details */}
        <div style={{ ...sectionStyle, paddingBottom: 24, borderBottom: "1px solid var(--color-border-dark)" }}>
          <span style={labelStyle}>Trip details</span>
          <h2 style={titleStyle}>Group size &amp; duration</h2>
          <div style={{ maxWidth: 280 }}>
            <Stepper label="Adults" value={adults} min={1} max={20} onChange={(v) => onTripSettingsChange({ adults: v })} />
            <Stepper label="Kids" value={kids} min={0} max={20} onChange={(v) => onTripSettingsChange({ kids: v })} />
            <Stepper label="Nights" value={nights} min={1} max={30} onChange={(v) => onTripSettingsChange({ nights: v })} />
          </div>
        </div>

        {/* 1. Vibe */}
        <div style={sectionStyle}>
          <span style={labelStyle}>1 / {hasKids ? "6" : "5"}</span>
          <h2 style={titleStyle}>What&apos;s the vibe?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {VIBE_OPTIONS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVibe(v.key)}
                style={{
                  padding: "20px 16px",
                  borderRadius: 14,
                  border: vibe === v.key ? "2px solid var(--color-coral)" : "1px solid var(--color-border-dark)",
                  background: vibe === v.key ? "var(--color-coral-light)" : "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: vibe === v.key ? "var(--color-coral)" : "var(--color-text)",
                }}>
                  {v.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-mid)", marginTop: 4 }}>
                  {v.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Must-haves */}
        <div style={sectionStyle}>
          <span style={labelStyle}>2 / {hasKids ? "6" : "5"}</span>
          <h2 style={titleStyle}>Must-haves</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginBottom: 12 }}>
            These are non-negotiable for this trip.
          </p>
          <ChipGrid options={MUST_HAVE_OPTIONS} selected={mustHaves} onChange={setMustHaves} />
        </div>

        {/* 3. Nice to have */}
        <div style={sectionStyle}>
          <span style={labelStyle}>3 / {hasKids ? "6" : "5"}</span>
          <h2 style={titleStyle}>Nice to have</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginBottom: 12 }}>
            Would be great, but not dealbreakers if missing.
          </p>
          <ChipGrid
            options={MUST_HAVE_OPTIONS}
            selected={niceToHaves}
            disabled={mustHaves}
            onChange={setNiceToHaves}
          />
        </div>

        {/* 4. Kid needs (only if kids > 0) */}
        {hasKids && (
          <div style={sectionStyle}>
            <span style={labelStyle}>4 / 6</span>
            <h2 style={titleStyle}>Kid needs</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginBottom: 12 }}>
              What do you need for the little ones?
            </p>
            <ChipGrid options={KID_NEED_OPTIONS} selected={kidNeeds} onChange={setKidNeeds} />
          </div>
        )}

        {/* 5. Dealbreakers */}
        <div style={sectionStyle}>
          <span style={labelStyle}>{hasKids ? "5 / 6" : "4 / 5"}</span>
          <h2 style={titleStyle}>Dealbreakers</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginBottom: 12 }}>
            Hard nos for this trip.
          </p>
          <ChipGrid options={DEALBREAKER_OPTIONS} selected={dealbreakers} onChange={setDealbreakers} />
        </div>

        {/* 6. Notes */}
        <div style={sectionStyle}>
          <span style={labelStyle}>{hasKids ? "6 / 6" : "5 / 5"}</span>
          <h2 style={titleStyle}>Anything else?</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., We want somewhere walkable to restaurants. One person needs a ground-floor bedroom. We're celebrating a birthday."
            rows={4}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 14,
              background: "#fff",
              border: "1px solid var(--color-border-dark)",
              borderRadius: 10,
              color: "var(--color-text)",
              fontFamily: "inherit",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Save button at bottom */}
        <div style={{ paddingBottom: 48 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              background: "var(--color-coral)",
              color: "#fff",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "Saving preferences..." : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
