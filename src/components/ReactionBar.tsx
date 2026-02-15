"use client";

export type ReactionType = "positive" | "maybe" | "pass";

/** Normalize legacy reaction types from the database */
function normalizeReaction(type: string): ReactionType {
  if (type === "fire" || type === "love" || type === "positive") return "positive";
  if (type === "think" || type === "maybe") return "maybe";
  return "pass";
}

interface TravelerInfo {
  id: string;
  name: string;
  color: string;
  isCreator: boolean;
}

interface Vote {
  userName: string;
  reactionType: string;
}

interface ReactionBarProps {
  votes: Vote[];
  userName: string;
  mode: "compact" | "full";
  onReact: (reactionType: ReactionType) => void;
  onRemoveReaction: () => void;
  onNeedName?: () => void;
  travelers?: TravelerInfo[];
}

const REACTION_COLORS: Record<ReactionType, string> = {
  positive: "#C4725A",
  maybe: "#B8A48E",
  pass: "#7A7269",
};

/* ── Hand-drawn SVG icons (stroke-based, organic curves) ── */

function ThumbsUpIcon({ size = 22, color = "#C4725A" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 11V4.5C7 4 7.5 3 9 3C10.5 3 11 4 11 4.5V10H16C17.5 10 18 11 18 12L16 19H9C7.5 19 7 18 7 17V11Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WavyLineIcon({ size = 22, color = "#B8A48E" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12C6 9 9 15 12 12C15 9 18 15 21 12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThumbsDownIcon({ size = 22, color = "#7A7269" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 13V19.5C7 20 7.5 21 9 21C10.5 21 11 20 11 19.5V14H16C17.5 14 18 13 18 12L16 5H9C7.5 5 7 6 7 7V13Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReactionIcon({ type, size = 22 }: { type: ReactionType; size?: number }) {
  const color = REACTION_COLORS[type];
  switch (type) {
    case "positive": return <ThumbsUpIcon size={size} color={color} />;
    case "maybe": return <WavyLineIcon size={size} color={color} />;
    case "pass": return <ThumbsDownIcon size={size} color={color} />;
  }
}

function getUserColor(name: string, travelers?: TravelerInfo[]): string {
  if (travelers) {
    const t = travelers.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (t) return t.color;
  }
  const USER_COLORS = [
    "#E05A47", "#3D67FF", "#4A9E6B", "#D4A843", "#8B5CF6",
    "#0891B2", "#DB2777", "#EA580C", "#6D28D9", "#059669",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export function ReactionBar({
  votes,
  userName,
  mode,
  onReact,
  onRemoveReaction,
  onNeedName,
  travelers,
}: ReactionBarProps) {
  // Normalize all votes to new types
  const normalizedVotes = votes.map((v) => ({
    ...v,
    reactionType: normalizeReaction(v.reactionType),
  }));

  const userVote = normalizedVotes.find((v) => v.userName === userName);

  function handleClick(type: ReactionType) {
    if (!userName && onNeedName) {
      onNeedName();
      return;
    }
    if (userVote?.reactionType === type) {
      onRemoveReaction();
    } else {
      onReact(type);
    }
  }

  if (mode === "compact") {
    // Compact mode: just the 3 small icons with counts
    const counts: Record<ReactionType, number> = { positive: 0, maybe: 0, pass: 0 };
    for (const v of normalizedVotes) {
      counts[v.reactionType]++;
    }

    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {(["positive", "maybe", "pass"] as ReactionType[]).map((type) => {
          const isActive = userVote?.reactionType === type;
          const count = counts[type];
          const color = REACTION_COLORS[type];
          return (
            <button
              key={type}
              aria-label={`${type}${isActive ? " (selected)" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleClick(type); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: count > 0 ? "4px 8px 4px 6px" : "4px 6px",
                borderRadius: 8,
                border: isActive
                  ? `1.5px solid ${color}`
                  : "1px solid var(--color-border-dark)",
                background: isActive
                  ? `${color}12`
                  : "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                minHeight: 34,
              }}
            >
              <ReactionIcon type={type} size={16} />
              {count > 0 && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? color : "var(--color-text-mid)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Full mode: avatar pips with reaction overlays + 3 tappable icons

  // Build voter list with their reactions
  const votersWithReactions = normalizedVotes.map((v) => ({
    name: v.userName,
    reaction: v.reactionType,
    color: getUserColor(v.userName, travelers),
  }));

  // Find travelers who haven't voted
  const votedNames = new Set(normalizedVotes.map((v) => v.userName.toLowerCase()));
  const nonVoters = (travelers || []).filter(
    (t) => !votedNames.has(t.name.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Avatar pips row */}
      {(votersWithReactions.length > 0 || nonVoters.length > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {votersWithReactions.map((voter) => (
            <div
              key={voter.name}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: voter.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                position: "relative",
              }}
              title={`${voter.name}: ${voter.reaction}`}
            >
              {voter.name.charAt(0).toUpperCase()}
              {/* Reaction icon overlay at bottom-right */}
              <div style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#FDFBF7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <ReactionIcon type={voter.reaction} size={9} />
              </div>
            </div>
          ))}
          {nonVoters.map((t) => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: t.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  opacity: 0.5,
                }}
              >
                {t.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 300 }}>
                {t.name} hasn&apos;t voted
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 3 tappable reaction icons — no labels, no boxes */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {(["positive", "maybe", "pass"] as ReactionType[]).map((type) => {
          const isSelected = userVote?.reactionType === type;
          const color = REACTION_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => handleClick(type)}
              title={type.charAt(0).toUpperCase() + type.slice(1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: isSelected ? `rgba(${hexToRgb(color)}, 0.12)` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                padding: 0,
                fontFamily: "inherit",
              }}
              onMouseOver={(e) => {
                if (!isSelected) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseOut={(e) => {
                if (!isSelected) e.currentTarget.style.background = "none";
              }}
            >
              <ReactionIcon type={type} size={22} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Convert hex color to r,g,b string */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
