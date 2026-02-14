"use client";

export type ReactionType = "fire" | "love" | "think" | "pass";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "fire", emoji: "\uD83D\uDD25", label: "Fire" },
  { type: "love", emoji: "\uD83D\uDE0D", label: "Love" },
  { type: "think", emoji: "\uD83E\uDD14", label: "Hmm" },
  { type: "pass", emoji: "\uD83D\uDC4E", label: "Pass" },
];

interface Vote {
  userName: string;
  reactionType: ReactionType;
}

interface ReactionBarProps {
  votes: Vote[];
  userName: string;
  mode: "compact" | "full";
  onReact: (reactionType: ReactionType) => void;
  onRemoveReaction: () => void;
  onNeedName?: () => void;
}

function countReactions(votes: Vote[]): Record<ReactionType, number> {
  const counts: Record<ReactionType, number> = { fire: 0, love: 0, think: 0, pass: 0 };
  for (const v of votes) {
    if (counts[v.reactionType] !== undefined) {
      counts[v.reactionType]++;
    }
  }
  return counts;
}

function votersByReaction(votes: Vote[]): Record<ReactionType, string[]> {
  const map: Record<ReactionType, string[]> = { fire: [], love: [], think: [], pass: [] };
  for (const v of votes) {
    if (map[v.reactionType]) {
      map[v.reactionType].push(v.userName);
    }
  }
  return map;
}

export function ReactionBar({
  votes,
  userName,
  mode,
  onReact,
  onRemoveReaction,
  onNeedName,
}: ReactionBarProps) {
  const userVote = votes.find((v) => v.userName === userName);
  const counts = countReactions(votes);
  const voters = mode === "full" ? votersByReaction(votes) : null;

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
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {REACTIONS.map((r) => {
          const isActive = userVote?.reactionType === r.type;
          const count = counts[r.type];
          const isPositive = r.type === "fire" || r.type === "love";
          const isNegative = r.type === "pass";
          return (
            <button
              key={r.type}
              aria-label={`${r.label}${isActive ? " (selected)" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleClick(r.type); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: count > 0 ? "4px 8px 4px 6px" : "4px 6px",
                borderRadius: 8,
                border: isActive
                  ? `1.5px solid ${isNegative ? "#ef4444" : "var(--color-coral)"}`
                  : "1px solid var(--color-border-dark)",
                background: isActive
                  ? isNegative ? "rgba(239,68,68,0.08)" : "var(--color-coral-light)"
                  : "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "inherit",
                transition: "all 0.15s",
                minHeight: 34,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{r.emoji}</span>
              {count > 0 && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive
                      ? isNegative ? "#ef4444" : "var(--color-coral)"
                      : "var(--color-text-mid)",
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

  // Full mode
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {REACTIONS.map((r) => {
          const isActive = userVote?.reactionType === r.type;
          const count = counts[r.type];
          const isNegative = r.type === "pass";
          return (
            <button
              key={r.type}
              aria-label={`${r.label}${isActive ? " (selected)" : ""}`}
              onClick={()  => handleClick(r.type)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "8px 12px",
                borderRadius: 10,
                border: isActive
                  ? `2px solid ${isNegative ? "#ef4444" : "var(--color-coral)"}`
                  : "1.5px solid var(--color-border-dark)",
                background: isActive
                  ? isNegative ? "rgba(239,68,68,0.08)" : "var(--color-coral-light)"
                  : "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                flex: 1,
                minHeight: 52,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{r.emoji}</span>
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isActive
                    ? isNegative ? "#ef4444" : "var(--color-coral)"
                    : "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {r.label}
              </span>
              {count > 0 && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive
                      ? isNegative ? "#ef4444" : "var(--color-coral)"
                      : "var(--color-text-mid)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Show who reacted */}
      {voters && votes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          {REACTIONS.map((r) => {
            const names = voters[r.type];
            if (names.length === 0) return null;
            return (
              <span
                key={r.type}
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  padding: "2px 6px",
                  background: "var(--color-bg)",
                  borderRadius: 4,
                }}
              >
                {r.emoji} {names.join(", ")}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
