import { useState, useRef } from "react";

/*
  STAY — Mobile Redesign: Elimination Workflow
  
  Typography: Fraunces (headings) + Plus Jakarta Sans (body) + IBM Plex Mono (data)
  
  Core insight: The workflow is elimination, not comparison.
  People don't score 10 places — they react, the duds fall away,
  and you argue between 2-3 finalists.
  
  Key changes from current:
  1. Vote is the PRIMARY action on every card
  2. Reactions replace binary upvote/downvote (🔥 😍 🤔 👎)
  3. Comments are inline group-chat style, not buried
  4. Listings auto-group by consensus (everyone likes → still deciding → passed)
  5. Stats bar removed from top — price context lives inside listings
  6. Detail view reordered: photo → price-in-context → group reaction → AI fit → details
*/

const C = {
  bg: "#F5F0EB",
  card: "#FFFFFF",
  coral: "#E05A47",
  coralLight: "#E05A4712",
  coralMid: "#E05A4720",
  text: "#2A2520",
  textMid: "#6B6560",
  textMuted: "#8A8480",
  textLight: "#B5B0AC",
  border: "#E8E3DE",
  borderLight: "#F0ECE8",
  green: "#4A9E6B",
  greenLight: "#4A9E6B12",
  yellow: "#D4A843",
  yellowLight: "#D4A84315",
  blue: "#4A7FB5",
};

const REACTIONS = [
  { key: "love", emoji: "🔥", label: "Love it" },
  { key: "obsessed", emoji: "😍", label: "Obsessed" },
  { key: "maybe", emoji: "🤔", label: "Maybe" },
  { key: "pass", emoji: "👎", label: "Pass" },
];

const USERS = [
  { name: "Alf", color: "#E05A47" },
  { name: "Angie", color: "#4A7FB5" },
  { name: "Mike", color: "#4A9E6B" },
  { name: "Sarah", color: "#D4A843" },
];

const LISTINGS = [
  {
    id: 1, source: "airbnb", sourceColor: "#FF585D",
    title: "Ocean Reef 102 - Luxury Beachfront Condo",
    location: "Christ Church, Barbados",
    price: 620, rating: 4.97, reviews: 72,
    beds: 3, baths: 3, kitchen: "Full",
    photo: "🏖️",
    amenities: ["Shared beach access", "Kitchen", "WiFi", "Pool", "Elevator", "Washer", "Free parking", "AC", "Smart TV"],
    reactions: { "Alf": "love", "Angie": "obsessed", "Mike": "love" },
    comments: [
      { user: "Angie", text: "the pool overlooks the ocean!! 😍", time: "2h ago" },
      { user: "Alf", text: "price is steep but look at that view", time: "1h ago" },
    ],
    group: "favorites",
  },
  {
    id: 2, source: "vrbo", sourceColor: "#3B5FE5",
    title: "Family Villa w/ Private Pool and Beach Club Access",
    location: "Holetown, Saint James, Barbados",
    price: 1020, rating: 5.0, reviews: 11,
    beds: 3, baths: 3, kitchen: "Full",
    photo: "🏡",
    amenities: ["Private pool", "Beach club", "Kitchen", "WiFi", "AC", "Washer", "Dryer", "BBQ", "Workspace"],
    reactions: { "Alf": "love", "Angie": "love", "Mike": "obsessed", "Sarah": "love" },
    comments: [
      { user: "Mike", text: "this is THE one. private pool + beach club", time: "3h ago" },
      { user: "Sarah", text: "agree but $1k/night... can we swing it?", time: "2h ago" },
      { user: "Alf", text: "if we split 4 ways it's $2,040/person for 8 nights", time: "1h ago" },
    ],
    group: "favorites",
  },
  {
    id: 3, source: "airbnb", sourceColor: "#FF585D",
    title: "Cozy Beachside Apartment with Ocean Views",
    location: "Hastings, Barbados",
    price: 353, rating: 4.8, reviews: 156,
    beds: 2, baths: 2, kitchen: "Full",
    photo: "🌊",
    amenities: ["Beach access", "Kitchen", "WiFi", "AC", "Washer"],
    reactions: { "Alf": "maybe", "Angie": "maybe", "Mike": "pass" },
    comments: [
      { user: "Mike", text: "only 2 beds for 6 people?", time: "4h ago" },
    ],
    group: "deciding",
  },
  {
    id: 4, source: "booking", sourceColor: "#003B95",
    title: "Palm Terrace - Modern 3BR with Garden",
    location: "Speightstown, Barbados",
    price: 465, rating: 4.6, reviews: 89,
    beds: 3, baths: 2, kitchen: "Full",
    photo: "🌴",
    amenities: ["Garden", "Kitchen", "WiFi", "AC", "Parking", "Washer"],
    reactions: { "Alf": "love", "Sarah": "maybe" },
    comments: [],
    group: "deciding",
  },
  {
    id: 5, source: "airbnb", sourceColor: "#FF585D",
    title: "Sunset Ridge - Hilltop Retreat",
    location: "St. Lucy, Barbados",
    price: 523, rating: 4.5, reviews: 34,
    beds: 4, baths: 3, kitchen: "Full",
    photo: "🌅",
    amenities: ["Pool", "Kitchen", "WiFi", "AC", "Parking", "BBQ"],
    reactions: { "Alf": "pass", "Mike": "pass", "Sarah": "maybe" },
    comments: [
      { user: "Alf", text: "too far from everything", time: "5h ago" },
    ],
    group: "passed",
  },
];

const TRIP = { adults: 4, kids: 2, nights: 8, total: 6 };

// ── Components ──

const ReactionBar = ({ reactions, onReact, compact }) => {
  const [showPicker, setShowPicker] = useState(false);
  const myReaction = reactions["Alf"]; // current user

  // Group reactions by type
  const grouped = {};
  Object.entries(reactions).forEach(([user, reaction]) => {
    if (!grouped[reaction]) grouped[reaction] = [];
    grouped[reaction].push(user);
  });

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
        {/* Show grouped reactions */}
        {Object.entries(grouped).map(([reaction, users]) => {
          const r = REACTIONS.find(r => r.key === reaction);
          return (
            <div key={reaction} style={{
              display: "flex", alignItems: "center", gap: 3,
              padding: "4px 8px", borderRadius: 12,
              background: C.bg, fontSize: 12,
            }}>
              <span style={{ fontSize: 14 }}>{r?.emoji}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.textMid, fontWeight: 500 }}>
                {users.length}
              </span>
            </div>
          );
        })}

        {/* React button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
          style={{
            padding: "4px 10px", borderRadius: 12,
            border: myReaction ? `1.5px solid ${C.coral}` : `1.5px solid ${C.border}`,
            background: myReaction ? C.coralLight : "transparent",
            fontSize: 12, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: myReaction ? C.coral : C.textMuted, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 3,
          }}
        >
          {myReaction ? REACTIONS.find(r => r.key === myReaction)?.emoji : "+"} React
        </button>

        {/* Picker */}
        {showPicker && (
          <div style={{
            position: "absolute", top: -48, left: 0,
            background: C.card, borderRadius: 14, padding: "6px 4px",
            boxShadow: "0 8px 30px rgba(42,37,32,0.15)",
            display: "flex", gap: 2, zIndex: 20,
            border: `1px solid ${C.border}`,
          }}>
            {REACTIONS.map(r => (
              <button
                key={r.key}
                onClick={(e) => { e.stopPropagation(); onReact(r.key); setShowPicker(false); }}
                style={{
                  padding: "6px 10px", borderRadius: 10,
                  border: "none", cursor: "pointer", fontSize: 20,
                  background: myReaction === r.key ? C.coralLight : "transparent",
                  transition: "all 0.12s",
                }}
                title={r.label}
              >{r.emoji}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full reaction display (detail view)
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {Object.entries(reactions).map(([user, reaction]) => {
          const r = REACTIONS.find(r => r.key === reaction);
          const u = USERS.find(u => u.name === user);
          return (
            <div key={user} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 10,
              background: C.bg, fontSize: 12,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              <span style={{ fontSize: 14 }}>{r?.emoji}</span>
              <span style={{ fontWeight: 600, color: u?.color || C.text }}>{user}</span>
            </div>
          );
        })}
      </div>

      {/* Reaction picker */}
      <div style={{
        display: "flex", gap: 6,
        padding: "8px 0",
      }}>
        {REACTIONS.map(r => (
          <button
            key={r.key}
            onClick={() => onReact(r.key)}
            style={{
              flex: 1, padding: "10px 6px", borderRadius: 10,
              border: myReaction === r.key ? `2px solid ${C.coral}` : `1.5px solid ${C.border}`,
              background: myReaction === r.key ? C.coralLight : C.card,
              cursor: "pointer", textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 2 }}>{r.emoji}</div>
            <div style={{
              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
              color: myReaction === r.key ? C.coral : C.textLight,
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em",
            }}>{r.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

const CommentThread = ({ comments, compact }) => {
  const [newComment, setNewComment] = useState("");

  if (compact && comments.length === 0) return null;

  if (compact) {
    const last = comments[comments.length - 1];
    const u = USERS.find(u => u.name === last.user);
    return (
      <div style={{
        padding: "8px 10px", borderRadius: 8, background: C.bg,
        fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: "flex", gap: 6, alignItems: "flex-start",
      }}>
        <span style={{ fontWeight: 700, color: u?.color || C.text, flexShrink: 0 }}>{last.user}:</span>
        <span style={{ color: C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last.text}</span>
        {comments.length > 1 && (
          <span style={{ color: C.textLight, flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
            +{comments.length - 1}
          </span>
        )}
      </div>
    );
  }

  // Full thread
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {comments.map((c, i) => {
          const u = USERS.find(u => u.name === c.user);
          return (
            <div key={i} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `${u?.color || C.textLight}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: u?.color || C.text,
                fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0,
              }}>{c.user[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: u?.color || C.text,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>{c.user}</span>
                  <span style={{
                    fontSize: 10, color: C.textLight,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>{c.time}</span>
                </div>
                <p style={{
                  fontSize: 13, color: C.text, margin: "2px 0 0",
                  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4,
                }}>{c.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Say something..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 20,
            border: `1.5px solid ${C.border}`, fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            outline: "none", background: C.bg, color: C.text,
          }}
        />
        <button style={{
          padding: "10px 16px", borderRadius: 20,
          background: newComment ? C.coral : C.border,
          color: "white", border: "none", fontSize: 13, fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer",
          transition: "all 0.15s",
        }}>↑</button>
      </div>
    </div>
  );
};

// ── Listing Card ──
const ListingCard = ({ listing, index, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const positiveCount = Object.values(listing.reactions).filter(r => r === "love" || r === "obsessed").length;
  const totalReactions = Object.keys(listing.reactions).length;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card, borderRadius: 16, overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 8px 30px rgba(42,37,32,0.1)"
          : "0 1px 6px rgba(42,37,32,0.04)",
        opacity: 0,
        animation: `fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.06}s forwards`,
      }}
    >
      {/* Photo */}
      <div style={{
        height: 180, background: `linear-gradient(135deg, ${C.coral}08, ${C.bg})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 64, position: "relative",
      }}>
        {listing.photo}
        {/* Source badge */}
        <span style={{
          position: "absolute", top: 12, left: 12,
          padding: "3px 8px", borderRadius: 6,
          background: `${listing.sourceColor}15`, color: listing.sourceColor,
          fontSize: 10, fontWeight: 700,
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.03em", textTransform: "uppercase",
        }}>{listing.source}</span>

        {/* Consensus indicator */}
        {positiveCount >= 3 && (
          <span style={{
            position: "absolute", top: 12, right: 12,
            padding: "3px 8px", borderRadius: 6,
            background: `${C.green}20`, color: C.green,
            fontSize: 10, fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>🔥 {positiveCount}/{USERS.length}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        {/* Title + price row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600,
              margin: 0, color: C.text, lineHeight: 1.3,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{listing.title}</h3>
            <div style={{
              display: "flex", gap: 8, marginTop: 4,
              fontSize: 12, color: C.textMuted, fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>⭐ {listing.rating}</span>
              <span>{listing.beds}bd · {listing.baths}ba</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: C.text,
            }}>${listing.price}</div>
            <div style={{
              fontSize: 10, color: C.textLight, fontFamily: "'IBM Plex Mono', monospace",
            }}>/night</div>
          </div>
        </div>

        {/* Per-person quick math */}
        <div style={{
          fontSize: 11, color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 10,
        }}>
          ${(listing.price * TRIP.nights).toLocaleString()} total · ${Math.round((listing.price * TRIP.nights) / TRIP.adults).toLocaleString()}/person
        </div>

        {/* Reactions */}
        <div style={{ marginBottom: listing.comments.length > 0 ? 8 : 0 }} onClick={(e) => e.stopPropagation()}>
          <ReactionBar reactions={listing.reactions} onReact={() => {}} compact />
        </div>

        {/* Latest comment preview */}
        {listing.comments.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <CommentThread comments={listing.comments} compact />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Group Header ──
const GroupHeader = ({ group, count }) => {
  const config = {
    favorites: { label: "Everyone's into these", emoji: "🔥", color: C.green, bg: C.greenLight },
    deciding: { label: "Still deciding", emoji: "🤔", color: C.yellow, bg: C.yellowLight },
    passed: { label: "Probably not", emoji: "👋", color: C.textLight, bg: `${C.textLight}10` },
  };
  const c = config[group];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 0 8px",
    }}>
      <span style={{ fontSize: 14 }}>{c.emoji}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, color: c.color,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>{c.label}</span>
      <span style={{
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
        color: C.textLight, padding: "1px 6px", borderRadius: 4,
        background: c.bg,
      }}>{count}</span>
    </div>
  );
};

// ── Detail View ──
const DetailView = ({ listing, onBack }) => {
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: C.card, zIndex: 200, overflowY: "auto",
      animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      {/* Sticky header */}
      <div style={{
        padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: C.card, position: "sticky", top: 0, zIndex: 10,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", padding: "6px 0",
          fontSize: 14, cursor: "pointer", color: C.textMid,
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
        }}>← Back</button>
        <button style={{
          padding: "6px 14px", borderRadius: 8,
          border: `1.5px solid ${C.border}`, background: C.card,
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.coral,
        }}>View on {listing.source} ↗</button>
      </div>

      {/* Photo */}
      <div style={{
        height: 240, background: `linear-gradient(135deg, ${C.coral}08, ${C.bg})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 80, position: "relative",
      }}>
        {listing.photo}
        <span style={{
          position: "absolute", top: 12, left: 16,
          padding: "3px 8px", borderRadius: 6,
          background: `${listing.sourceColor}15`, color: listing.sourceColor,
          fontSize: 10, fontWeight: 700,
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.03em", textTransform: "uppercase",
        }}>{listing.source}</span>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Title */}
        <h2 style={{
          fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600,
          margin: 0, color: C.text, lineHeight: 1.25,
        }}>{listing.title}</h2>
        <p style={{
          fontSize: 13, color: C.textMuted, margin: "4px 0 0",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {listing.location} · <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>⭐ {listing.rating} ({listing.reviews})</span>
        </p>

        {/* ── Price in context ── */}
        <div style={{
          margin: "16px 0", padding: 16, background: C.bg, borderRadius: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700 }}>
                ${listing.price}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textMuted }}> /night</span>
            </div>
          </div>
          <div style={{
            display: "flex", gap: 16, marginTop: 10, paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
          }}>
            {[
              { label: `${TRIP.nights} nights`, val: `$${(listing.price * TRIP.nights).toLocaleString()}` },
              { label: "per person", val: `$${Math.round((listing.price * TRIP.nights) / TRIP.adults).toLocaleString()}` },
              { label: "per adult", val: `$${Math.round((listing.price * TRIP.nights) / TRIP.adults).toLocaleString()}` },
            ].slice(0, 2).map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: C.textLight, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Group reactions (the main event) ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: C.textLight,
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8,
          }}>Group vibes</div>
          <ReactionBar reactions={listing.reactions} onReact={() => {}} />
        </div>

        {/* ── Comments (group chat style) ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: C.textLight,
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8,
          }}>Discussion ({listing.comments.length})</div>
          <CommentThread comments={listing.comments} />
        </div>

        {/* ── Key details ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: C.textLight,
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8,
          }}>Key details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { icon: "🛏️", val: listing.beds, label: "beds" },
              { icon: "🚿", val: listing.baths, label: "baths" },
              { icon: "🍳", val: listing.kitchen, label: "kitchen" },
            ].map(d => (
              <div key={d.label} style={{
                padding: "12px 10px", background: C.bg, borderRadius: 10, textAlign: "center",
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{d.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{d.val}</div>
                <div style={{ fontSize: 10, color: C.textLight, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Amenities ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: C.textLight,
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8,
          }}>Amenities</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(showAllAmenities ? listing.amenities : listing.amenities.slice(0, 4)).map(a => (
              <span key={a} style={{
                padding: "5px 10px", borderRadius: 8, background: C.bg,
                fontSize: 12, color: C.textMid, fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>{a}</span>
            ))}
            {listing.amenities.length > 4 && !showAllAmenities && (
              <button
                onClick={() => setShowAllAmenities(true)}
                style={{
                  padding: "5px 10px", borderRadius: 8,
                  background: "transparent", border: `1.5px solid ${C.border}`,
                  fontSize: 12, color: C.textMuted, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>+{listing.amenities.length - 4}</button>
            )}
          </div>
        </div>

        {/* ── Description (collapsed) ── */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowDescription(!showDescription)}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: "transparent",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.textMid,
              textAlign: "left", display: "flex", justifyContent: "space-between",
            }}
          >
            <span>Full description</span>
            <span style={{ color: C.textLight }}>{showDescription ? "▲" : "▼"}</span>
          </button>
          {showDescription && (
            <p style={{
              fontSize: 13, color: C.textMid, margin: "10px 0 0",
              fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6,
              padding: "0 4px",
            }}>
              If you're looking for a luxurious, family-friendly stay in Barbados, we are delighted to introduce you to our exquisite 3-bedroom villa in Porters Place, Saint James, an area celebrated for its serene atmosphere and exclusive amenities.
            </p>
          )}
        </div>

        {/* Remove */}
        <button style={{
          width: "100%", padding: "12px", borderRadius: 10,
          border: "none", background: "#D4574A10",
          fontSize: 13, color: "#D4574A", fontWeight: 500, cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>Remove listing</button>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
};

// ── Main App ──
export default function StayMobile() {
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const groups = {
    favorites: LISTINGS.filter(l => l.group === "favorites"),
    deciding: LISTINGS.filter(l => l.group === "deciding"),
    passed: LISTINGS.filter(l => l.group === "passed"),
  };

  const filtered = activeFilter === "all"
    ? LISTINGS
    : LISTINGS.filter(l => l.source === activeFilter);

  const filteredGroups = {
    favorites: filtered.filter(l => l.group === "favorites"),
    deciding: filtered.filter(l => l.group === "deciding"),
    passed: filtered.filter(l => l.group === "passed"),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(42,37,32,0.12); border-radius: 2px; }
      `}</style>

      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: C.bg, minHeight: "100vh", color: C.text,
        maxWidth: 480, margin: "0 auto", position: "relative",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px", background: C.bg,
          position: "sticky", top: 0, zIndex: 50,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h1 style={{
                fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600,
                color: C.coral, margin: 0,
              }}>Stay</h1>
              <span style={{
                fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: C.text,
              }}>Barbados</span>
              <span style={{
                fontSize: 11, color: C.textMuted,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>4a, 2k · 8n</span>
            </div>
            <button style={{
              width: 40, height: 40, borderRadius: "50%",
              background: C.coral, color: "white", border: "none",
              fontSize: 22, cursor: "pointer", fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(224,90,71,0.3)",
            }}>+</button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { key: "all", label: `All (${LISTINGS.length})` },
              { key: "airbnb", label: "Airbnb" },
              { key: "vrbo", label: "VRBO" },
              { key: "booking", label: "Booking" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: "5px 12px", borderRadius: 8,
                  border: activeFilter === f.key ? `1.5px solid ${C.coral}` : `1.5px solid ${C.border}`,
                  background: activeFilter === f.key ? C.coralLight : "transparent",
                  color: activeFilter === f.key ? C.coral : C.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Listing groups */}
        <div style={{ padding: "8px 16px 80px" }}>
          {filteredGroups.favorites.length > 0 && (
            <>
              <GroupHeader group="favorites" count={filteredGroups.favorites.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredGroups.favorites.map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i} onClick={() => setSelectedListing(l)} />
                ))}
              </div>
            </>
          )}

          {filteredGroups.deciding.length > 0 && (
            <>
              <GroupHeader group="deciding" count={filteredGroups.deciding.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredGroups.deciding.map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i + filteredGroups.favorites.length} onClick={() => setSelectedListing(l)} />
                ))}
              </div>
            </>
          )}

          {filteredGroups.passed.length > 0 && (
            <>
              <GroupHeader group="passed" count={filteredGroups.passed.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.6 }}>
                {filteredGroups.passed.map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i + filteredGroups.favorites.length + filteredGroups.deciding.length} onClick={() => setSelectedListing(l)} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detail view */}
        {selectedListing && (
          <DetailView listing={selectedListing} onBack={() => setSelectedListing(null)} />
        )}

        {/* Demo label */}
        <div style={{
          position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
          background: C.text, color: C.bg, padding: "6px 14px", borderRadius: 20,
          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.5, zIndex: 300,
          pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          Tap a card to see detail · Reactions + comments are inline
        </div>
      </div>
    </>
  );
}
