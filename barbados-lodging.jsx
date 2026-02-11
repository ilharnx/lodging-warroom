import { useState, useEffect, useCallback, useRef } from "react";

const BARBADOS_CENTER = [13.1939, -59.5432];
const SOURCES = ["Airbnb", "VRBO", "Booking", "Other"];
const KITCHEN_OPTIONS = ["Full Kitchen", "Kitchenette", "Microwave Only", "None"];
const BEACH_TYPES = ["Beachfront", "< 5 min walk", "< 10 min drive", "No Beach Nearby"];
const BED_TYPES = ["King", "Queen", "Double", "Twin", "Pullout", "Crib"];

const NEIGHBORHOODS = {
  "South Coast": [13.0667, -59.5833],
  "West Coast": [13.1833, -59.6333],
  "Northwest": [13.2500, -59.6333],
  "Southeast": [13.1000, -59.5000],
  "Bridgetown": [13.1000, -59.6167],
  "North": [13.3000, -59.6167],
  "East Coast": [13.2000, -59.5300],
  "Custom": null,
};

const SAMPLE = [
  {
    id: "s1", url: "#", name: "Coral Cove Beach House", source: "Airbnb",
    totalCost: 3200, perNight: 457, bedrooms: 3, bathrooms: 2,
    kitchen: "Full Kitchen", beachType: "Beachfront",
    neighborhood: "South Coast", bedTypes: ["King", "Queen", "Twin"],
    bathroomNotes: "Master ensuite + shared full bath",
    amenities: ["pool", "ac", "wifi", "washer", "parking", "bbq"],
    kidFriendly: true, kidNotes: "Pool fence, crib, highchair",
    photos: [], notes: "Right on the water. Great reviews about the kitchen.",
    addedBy: "Alf", votes: 3, lat: 13.0694, lng: -59.5772,
    rating: 4.8, reviewCount: 127,
  },
  {
    id: "s2", url: "#", name: "Sandy Lane Garden Villa", source: "VRBO",
    totalCost: 4800, perNight: 686, bedrooms: 4, bathrooms: 3,
    kitchen: "Full Kitchen", beachType: "< 5 min walk",
    neighborhood: "West Coast", bedTypes: ["King", "King", "Queen", "Twin"],
    bathroomNotes: "2 ensuite + 1 powder room",
    amenities: ["pool", "ac", "wifi", "washer", "dryer", "parking", "gym"],
    kidFriendly: true, kidNotes: "Gated pool, playroom",
    photos: [], notes: "West coast has calmer water — better for the kids",
    addedBy: "Sarah", votes: 5, lat: 13.1756, lng: -59.6380,
    rating: 4.9, reviewCount: 84,
  },
  {
    id: "s3", url: "#", name: "Oistins Fisherman's Flat", source: "Booking",
    totalCost: 1800, perNight: 257, bedrooms: 2, bathrooms: 1,
    kitchen: "Kitchenette", beachType: "< 5 min walk",
    neighborhood: "South Coast", bedTypes: ["Queen", "Double"],
    bathroomNotes: "1 shared bathroom — could be tight",
    amenities: ["ac", "wifi"],
    kidFriendly: false, kidNotes: "",
    photos: [], notes: "Budget pick. Near the Friday night fish fry!",
    addedBy: "Mike", votes: 1, lat: 13.0582, lng: -59.5375,
    rating: 4.3, reviewCount: 42,
  },
];

/* ── Map ─────────────────────────────────────────────── */
function MapView({ listings, selectedId, onSelect }) {
  const ref = useRef(null);
  const map = useRef(null);
  const pins = useRef([]);

  useEffect(() => {
    if (map.current) return;
    const i = setInterval(() => {
      if (!window.L) return;
      clearInterval(i);
      const m = window.L.map(ref.current, { zoomControl: false, scrollWheelZoom: true })
        .setView(BARBADOS_CENTER, 11.5);
      window.L.control.zoom({ position: "bottomright" }).addTo(m);
      window.L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd", maxZoom: 19,
      }).addTo(m);
      map.current = m;
      setTimeout(() => m.invalidateSize(), 200);
    }, 80);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!map.current || !window.L) return;
    pins.current.forEach(p => p.remove());
    pins.current = [];
    listings.forEach(l => {
      if (!l.lat) return;
      const sel = l.id === selectedId;
      const price = l.totalCost ? `$${(l.totalCost/1000).toFixed(1)}k` : "?";
      const icon = window.L.divIcon({
        className: "x",
        html: `<div style="
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px; font-weight: 700;
          padding: 5px 12px; border-radius: 24px;
          white-space: nowrap; cursor: pointer;
          transition: all 0.15s;
          background: ${sel ? "#E94E3C" : "#fff"};
          color: ${sel ? "#fff" : "#1a1a1a"};
          border: ${sel ? "2px solid #E94E3C" : "2px solid #ddd"};
          box-shadow: 0 2px 10px rgba(0,0,0,${sel ? 0.25 : 0.1});
          transform: scale(${sel ? 1.15 : 1});
        ">${price}</div>`,
        iconSize: [70, 32], iconAnchor: [35, 16],
      });
      const mk = window.L.marker([l.lat, l.lng], { icon })
        .addTo(map.current).on("click", () => onSelect(l.id));
      pins.current.push(mk);
    });
  }, [listings, selectedId, onSelect]);

  useEffect(() => {
    if (!map.current || !selectedId) return;
    const l = listings.find(x => x.id === selectedId);
    if (l?.lat) map.current.panTo([l.lat, l.lng], { animate: true, duration: 0.3 });
  }, [selectedId, listings]);

  return <div ref={ref} style={{ width: "100%", height: "100%", borderRadius: 14 }} />;
}

/* ── Source Badge ─────────────────────────────────────── */
function Badge({ source }) {
  const c = { Airbnb: "#FF5A5F", VRBO: "#3D67FF", Booking: "#003B95", Other: "#999" };
  return <span style={{
    background: c[source] || c.Other, color: "#fff",
    padding: "2px 8px", borderRadius: 4, fontSize: 10,
    fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
    fontFamily: "'Inter', sans-serif",
  }}>{source}</span>;
}

/* ── Listing Card ────────────────────────────────────── */
function Card({ listing: l, selected, onSelect, onVote, onDelete }) {
  const pp = l.totalCost ? Math.round(l.totalCost / 4) : null;

  return (
    <div onClick={() => onSelect(l.id)} style={{
      background: "#fff",
      border: selected ? "2px solid #E94E3C" : "1px solid #E8E6E3",
      borderRadius: 14, overflow: "hidden", cursor: "pointer",
      transition: "all 0.2s ease",
      boxShadow: selected ? "0 8px 30px rgba(233,78,60,0.12)" : "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      {/* Photo placeholder */}
      {l.photos?.length > 0 ? (
        <div style={{ height: 160, overflow: "hidden" }}>
          <img src={l.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.parentElement.style.display = "none"; }} />
        </div>
      ) : (
        <div style={{
          height: 80,
          background: "linear-gradient(135deg, #FAF8F5 0%, #f0ede8 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderBottom: "1px solid #E8E6E3",
        }}>
          <span style={{ fontSize: 32, opacity: 0.25 }}>🏠</span>
        </div>
      )}

      <div style={{ padding: "14px 16px 16px" }}>
        {/* Source + Rating + Area */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Badge source={l.source} />
          {l.rating && (
            <span style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ color: "#E94E3C" }}>★</span> {l.rating}
              <span style={{ color: "#bbb" }}>({l.reviewCount})</span>
            </span>
          )}
          <span style={{ fontSize: 11, color: "#bbb", marginLeft: "auto" }}>{l.neighborhood}</span>
        </div>

        {/* Title + Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3 style={{
            margin: 0, fontSize: 17, fontWeight: 600, color: "#1a1a1a",
            lineHeight: 1.3, flex: 1,
            fontFamily: "'Georgia', 'Times New Roman', serif",
          }}>{l.name || "Untitled Listing"}</h3>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: 22, fontWeight: 800, color: "#E94E3C",
              fontFamily: "'Inter', sans-serif",
            }}>${l.totalCost?.toLocaleString() || "—"}</div>
            <div style={{ fontSize: 11, color: "#999" }}>
              {pp ? `$${pp}/person` : `$${l.perNight?.toLocaleString()}/night`}
            </div>
          </div>
        </div>

        {/* The Big 4 */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "6px 16px", marginTop: 12,
          padding: "10px 12px", background: "#FAF8F5", borderRadius: 10,
          border: "1px solid #f0ede8",
        }}>
          {[
            ["🛏", `${l.bedrooms || "?"} bed${l.bedrooms !== 1 ? "s" : ""}`],
            ["🚿", `${l.bathrooms || "?"} bath${l.bathrooms !== 1 ? "s" : ""}`],
            ["🍳", l.kitchen || "?"],
            ["🏖", l.beachType || "?"],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#555" }}>
              <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Bed types */}
        {l.bedTypes?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {l.bedTypes.map((b, i) => (
              <span key={i} style={{
                background: "#f5f3ef", padding: "3px 8px", borderRadius: 5,
                fontSize: 11, color: "#888", border: "1px solid #E8E6E3",
              }}>{b}</span>
            ))}
          </div>
        )}

        {/* Bathroom notes */}
        {l.bathroomNotes && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#999", fontStyle: "italic" }}>
            {l.bathroomNotes}
          </div>
        )}

        {/* Kid badge */}
        {l.kidFriendly && (
          <div style={{
            marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "#2d8a4e",
            background: "rgba(45,138,78,0.06)", border: "1px solid rgba(45,138,78,0.15)",
            padding: "3px 10px", borderRadius: 6,
          }}>👶 {l.kidNotes || "Kid-friendly"}</div>
        )}

        {/* Notes */}
        {l.notes && (
          <div style={{
            marginTop: 10, fontSize: 12, color: "#777",
            padding: "8px 12px", background: "#FDFCFA", borderRadius: 8,
            borderLeft: "3px solid #E94E3C",
          }}>"{l.notes}"</div>
        )}

        {/* Actions */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0ede8",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={e => { e.stopPropagation(); onVote(l.id, 1); }} style={{
              background: (l.votes||0) > 0 ? "rgba(233,78,60,0.08)" : "#fff",
              border: (l.votes||0) > 0 ? "1px solid #E94E3C" : "1px solid #ddd",
              borderRadius: 8, padding: "5px 12px", cursor: "pointer",
              fontSize: 13, color: (l.votes||0) > 0 ? "#E94E3C" : "#999",
              fontWeight: 700, fontFamily: "inherit",
            }}>🔥 {l.votes || 0}</button>
            <button onClick={e => { e.stopPropagation(); onVote(l.id, -1); }} style={{
              background: "#fff", border: "1px solid #ddd", borderRadius: 8,
              padding: "5px 10px", cursor: "pointer", fontSize: 13, color: "#ccc",
              fontFamily: "inherit",
            }}>👎</button>
            {l.addedBy && <span style={{ fontSize: 11, color: "#ccc", marginLeft: 4 }}>added by {l.addedBy}</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {l.url && l.url !== "#" && (
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()} style={{
                fontSize: 12, color: "#E94E3C", fontWeight: 600, textDecoration: "none",
                padding: "5px 12px", border: "1px solid #E94E3C", borderRadius: 8,
              }}>View ↗</a>
            )}
            <button onClick={e => { e.stopPropagation(); onDelete(l.id); }} style={{
              background: "none", border: "1px solid #ddd", borderRadius: 8,
              padding: "5px 8px", cursor: "pointer", fontSize: 11, color: "#ccc",
              fontFamily: "inherit",
            }}>✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add Modal ───────────────────────────────────────── */
function AddModal({ onAdd, onClose }) {
  const [f, setF] = useState({
    url: "", name: "", source: "Airbnb", totalCost: "", perNight: "",
    bedrooms: 3, bathrooms: 2, bedTypes: [], kitchen: "Full Kitchen",
    beachType: "< 5 min walk", neighborhood: "South Coast",
    customLat: "", customLng: "",
    bathroomNotes: "", kidFriendly: true, kidNotes: "",
    notes: "", addedBy: "",
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const togBed = b => set("bedTypes", f.bedTypes.includes(b) ? f.bedTypes.filter(x => x !== b) : [...f.bedTypes, b]);

  const submit = () => {
    const coords = f.neighborhood === "Custom"
      ? [parseFloat(f.customLat)||BARBADOS_CENTER[0], parseFloat(f.customLng)||BARBADOS_CENTER[1]]
      : NEIGHBORHOODS[f.neighborhood] || BARBADOS_CENTER;
    const j = () => (Math.random()-0.5)*0.008;
    onAdd({
      id: Date.now().toString(), ...f,
      totalCost: parseFloat(f.totalCost)||0, perNight: parseFloat(f.perNight)||0,
      photos: [], lat: coords[0]+j(), lng: coords[1]+j(),
      votes: 0, rating: null, reviewCount: 0,
    });
    onClose();
  };

  const inp = {
    width: "100%", padding: "10px 12px", background: "#fff",
    border: "1px solid #ddd", borderRadius: 8, color: "#1a1a1a",
    fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };
  const lbl = {
    fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 5,
    display: "block", textTransform: "uppercase", letterSpacing: 1.2,
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FDFCFA", borderRadius: 20, padding: 28, maxWidth: 520,
        width: "100%", maxHeight: "85vh", overflowY: "auto",
        border: "1px solid #E8E6E3", boxShadow: "0 30px 80px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: "#1a1a1a", fontFamily: "Georgia, serif" }}>
            Add a spot
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#bbb", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Listing URL</label>
          <input style={inp} placeholder="https://www.airbnb.com/rooms/..." value={f.url} onChange={e => set("url", e.target.value)} />
          <p style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>In the full version, pasting a URL auto-scrapes everything below ⚡</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>Name</label><input style={inp} placeholder="Beach House Paradise" value={f.name} onChange={e => set("name", e.target.value)} /></div>
          <div><label style={lbl}>Source</label>
            <select style={inp} value={f.source} onChange={e => set("source", e.target.value)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>Total Cost ($)</label><input style={inp} type="number" placeholder="3500" value={f.totalCost} onChange={e => set("totalCost", e.target.value)} /></div>
          <div><label style={lbl}>Per Night ($)</label><input style={inp} type="number" placeholder="500" value={f.perNight} onChange={e => set("perNight", e.target.value)} /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>Beds</label><input style={inp} type="number" min={0} value={f.bedrooms} onChange={e => set("bedrooms", +e.target.value||0)} /></div>
          <div><label style={lbl}>Baths</label><input style={inp} type="number" min={0} step={0.5} value={f.bathrooms} onChange={e => set("bathrooms", +e.target.value||0)} /></div>
          <div><label style={lbl}>Kitchen</label>
            <select style={inp} value={f.kitchen} onChange={e => set("kitchen", e.target.value)}>{KITCHEN_OPTIONS.map(k => <option key={k}>{k}</option>)}</select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Bed Types</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BED_TYPES.map(b => (
              <button key={b} onClick={() => togBed(b)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
                border: f.bedTypes.includes(b) ? "1.5px solid #E94E3C" : "1px solid #ddd",
                background: f.bedTypes.includes(b) ? "rgba(233,78,60,0.06)" : "#fff",
                color: f.bedTypes.includes(b) ? "#E94E3C" : "#999",
              }}>{b}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Bathroom Notes</label>
          <input style={inp} placeholder="2 ensuite, 1 half bath, outdoor shower..." value={f.bathroomNotes} onChange={e => set("bathroomNotes", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>Neighborhood</label>
            <select style={inp} value={f.neighborhood} onChange={e => set("neighborhood", e.target.value)}>
              {Object.keys(NEIGHBORHOODS).map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Beach</label>
            <select style={inp} value={f.beachType} onChange={e => set("beachType", e.target.value)}>
              {BEACH_TYPES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {f.neighborhood === "Custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div><label style={lbl}>Latitude</label><input style={inp} placeholder="13.19" value={f.customLat} onChange={e => set("customLat", e.target.value)} /></div>
            <div><label style={lbl}>Longitude</label><input style={inp} placeholder="-59.54" value={f.customLng} onChange={e => set("customLng", e.target.value)} /></div>
          </div>
        )}

        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ ...lbl, margin: 0 }}>Kid-Friendly</label>
          <button onClick={() => set("kidFriendly", !f.kidFriendly)} style={{
            width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
            background: f.kidFriendly ? "#E94E3C" : "#ddd", position: "relative", transition: "0.2s",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 2, left: f.kidFriendly ? 22 : 2,
              transition: "0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }} />
          </button>
          <input style={{ ...inp, flex: 1 }} placeholder="Pool fence, crib..." value={f.kidNotes} onChange={e => set("kidNotes", e.target.value)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Notes</label>
          <textarea style={{ ...inp, height: 60, resize: "vertical" }} placeholder="Any thoughts, vibes, concerns..." value={f.notes} onChange={e => set("notes", e.target.value)} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Your Name</label>
          <input style={inp} placeholder="Alf" value={f.addedBy} onChange={e => set("addedBy", e.target.value)} />
        </div>

        <button onClick={submit} style={{
          width: "100%", padding: "14px 0",
          background: "#E94E3C", color: "#fff", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: 0.3,
          transition: "opacity 0.15s",
        }}>Add This Spot</button>
      </div>
    </div>
  );
}

/* ── Filter Chips ────────────────────────────────────── */
function Filters({ filters, setFilters, count }) {
  const chip = (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
    border: active ? "1.5px solid #E94E3C" : "1px solid #ddd",
    background: active ? "rgba(233,78,60,0.06)" : "#fff",
    color: active ? "#E94E3C" : "#888",
    whiteSpace: "nowrap",
  });
  const dropStyle = {
    padding: "6px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 600, border: "1px solid #ddd",
    background: "#fff", color: "#888", outline: "none", appearance: "none",
    WebkitAppearance: "none", paddingRight: 24,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23bbb'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
  };

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
      padding: "12px 0",
    }}>
      <span style={{ fontSize: 13, color: "#bbb", fontWeight: 600, marginRight: 4 }}>
        {count} spot{count !== 1 ? "s" : ""}
      </span>

      {/* Source */}
      {SOURCES.map(s => (
        <button key={s} onClick={() => setFilters(f => ({ ...f, source: f.source === s ? null : s }))}
          style={chip(filters.source === s)}>{s}</button>
      ))}

      <span style={{ color: "#eee", margin: "0 2px" }}>|</span>

      {/* Min bedrooms */}
      <select value={filters.minBeds || ""} onChange={e => setFilters(f => ({ ...f, minBeds: e.target.value ? +e.target.value : null }))}
        style={{ ...dropStyle, color: filters.minBeds ? "#E94E3C" : "#888", borderColor: filters.minBeds ? "#E94E3C" : "#ddd" }}>
        <option value="">Beds</option>
        <option value="2">2+ beds</option>
        <option value="3">3+ beds</option>
        <option value="4">4+ beds</option>
      </select>

      {/* Min bathrooms */}
      <select value={filters.minBaths || ""} onChange={e => setFilters(f => ({ ...f, minBaths: e.target.value ? +e.target.value : null }))}
        style={{ ...dropStyle, color: filters.minBaths ? "#E94E3C" : "#888", borderColor: filters.minBaths ? "#E94E3C" : "#ddd" }}>
        <option value="">Baths</option>
        <option value="1.5">1.5+ baths</option>
        <option value="2">2+ baths</option>
        <option value="3">3+ baths</option>
      </select>

      {/* Amenity toggles — all scrapeable */}
      <button onClick={() => setFilters(f => ({ ...f, hasPool: f.hasPool ? null : true }))}
        style={chip(filters.hasPool)}>Pool</button>

      <button onClick={() => setFilters(f => ({ ...f, hasAC: f.hasAC ? null : true }))}
        style={chip(filters.hasAC)}>AC</button>

      <button onClick={() => setFilters(f => ({ ...f, fullKitchen: f.fullKitchen ? null : true }))}
        style={chip(filters.fullKitchen)}>Full Kitchen</button>

      {/* Sort */}
      <div style={{ marginLeft: "auto" }}>
        <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
          style={{ ...dropStyle, background: "#FAF8F5", borderColor: "#E8E6E3" }}>
          <option value="votes">Sort: 🔥 Votes</option>
          <option value="price">Sort: 💰 Price</option>
          <option value="rating">Sort: ⭐ Rating</option>
        </select>
      </div>
    </div>
  );
}

/* ── Main App ────────────────────────────────────────── */
export default function App() {
  const [listings, setListings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ source: null, minBeds: null, minBaths: null, hasPool: null, hasAC: null, fullKitchen: null, sort: "votes" });
  const cardRefs = useRef({});

  // Load
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("bb-listings-v2");
        if (r?.value) { setListings(JSON.parse(r.value)); }
        else { setListings(SAMPLE); }
      } catch { setListings(SAMPLE); }
      setLoading(false);
    })();
  }, []);

  // Save
  const save = useCallback(async (next) => {
    setListings(next);
    try { await window.storage.set("bb-listings-v2", JSON.stringify(next), true); } catch {}
  }, []);

  const addListing = l => save([...listings, l]);
  const vote = (id, d) => save(listings.map(l => l.id === id ? { ...l, votes: (l.votes||0)+d } : l));
  const del = id => { save(listings.filter(l => l.id !== id)); if (selectedId === id) setSelectedId(null); };

  const select = useCallback(id => {
    setSelectedId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // Filter + sort
  const filtered = listings
    .filter(l => !filters.source || l.source === filters.source)
    .filter(l => !filters.minBeds || (l.bedrooms || 0) >= filters.minBeds)
    .filter(l => !filters.minBaths || (l.bathrooms || 0) >= filters.minBaths)
    .filter(l => !filters.hasPool || (l.amenities && l.amenities.includes("pool")))
    .filter(l => !filters.hasAC || (l.amenities && l.amenities.includes("ac")))
    .filter(l => !filters.fullKitchen || l.kitchen === "Full Kitchen")
    .sort((a, b) => {
      if (filters.sort === "price") return (a.totalCost||99999)-(b.totalCost||99999);
      if (filters.sort === "rating") return (b.rating||0)-(a.rating||0);
      return (b.votes||0)-(a.votes||0);
    });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh",
      fontFamily: "'Inter', sans-serif", color: "#ccc", background: "#FAF8F5" }}>Loading...</div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #FAF8F5; color: #1a1a1a; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        .leaflet-control-attribution { display: none !important; }
        button:hover { opacity: 0.85; }
        input:focus, select:focus, textarea:focus { border-color: #E94E3C !important; }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#FAF8F5" }}>

        {/* Header */}
        <div style={{
          padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid #E8E6E3", background: "#fff",
        }}>
          <div>
            <h1 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 24, fontWeight: 400, color: "#1a1a1a", letterSpacing: -0.5,
            }}>
              <span style={{ color: "#E94E3C", fontWeight: 700 }}>Barbados</span> 2026
            </h1>
            <span style={{ fontSize: 12, color: "#bbb" }}>4 adults · 2 kids · {listings.length} spots saved</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              background: "#fff", border: "1px solid #ddd", borderRadius: 10,
              padding: "9px 18px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", color: "#888", fontFamily: "inherit",
            }}>Import Sheet</button>
            <button onClick={() => setShowAdd(true)} style={{
              background: "#E94E3C", border: "none", borderRadius: 10,
              padding: "9px 20px", fontSize: 13, fontWeight: 700,
              cursor: "pointer", color: "#fff", fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(233,78,60,0.25)",
            }}>+ Add Spot</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: "0 28px", background: "#fff", borderBottom: "1px solid #E8E6E3" }}>
          <Filters filters={filters} setFilters={setFilters} count={filtered.length} />
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Map */}
          <div style={{ flex: 1, padding: 16, minWidth: 0 }}>
            <div style={{
              height: "100%", borderRadius: 14, overflow: "hidden",
              border: "1px solid #E8E6E3", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}>
              <MapView listings={filtered} selectedId={selectedId} onSelect={select} />
            </div>
          </div>

          {/* Cards */}
          <div style={{
            width: 400, overflowY: "auto", padding: "16px 20px 24px 8px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.3 }}>🏖</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#999" }}>No spots yet</p>
                <p style={{ fontSize: 13, color: "#ccc", marginTop: 4 }}>
                  Click <span style={{ color: "#E94E3C", fontWeight: 700 }}>+ Add Spot</span> to start comparing
                </p>
              </div>
            ) : filtered.map(l => (
              <div key={l.id} ref={el => cardRefs.current[l.id] = el}>
                <Card listing={l} selected={l.id === selectedId}
                  onSelect={select} onVote={vote} onDelete={del} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAdd && <AddModal onAdd={addListing} onClose={() => setShowAdd(false)} />}
    </>
  );
}
