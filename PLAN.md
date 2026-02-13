# Stay Reskin & Feature Enhancement — Implementation Plan

## Current State Summary

The codebase is a Next.js 16 + Prisma + PostgreSQL app with Tailwind CSS v4, Mapbox GL, and no auth (name-only identity). It has 6 components (`ListingCard`, `ListingDetail`, `MapView`, `FilterBar`, `AddListingModal`, `ImportModal`), a dashboard page, and a trip page. The current font is Inter. ListingDetail is a center modal. Map pins are all one style. No preferences, no AI integration, no budget range visualization.

---

## Layer 1: Visual & Interaction Polish

### 1A. Typography — Switch to DM Sans + DM Mono
**Files:** `src/app/layout.tsx`, `src/app/globals.css`

- Import DM Sans (400, 500, 600, 700) and DM Mono (400, 500) from Google Fonts via `<link>` in `layout.tsx`
- Update `globals.css`:
  - Add CSS variables: `--font-body: 'DM Sans', sans-serif;` and `--font-mono: 'DM Mono', monospace;`
  - Change `body { font-family }` from Inter to `var(--font-body)`
  - Update `.price-marker` font-family to `var(--font-mono)`
- Update color tokens to match brief: `--color-bg: #F5F0EB`, `--color-coral: #E05A47`, etc.
- Replace `.font-heading` class definition to use DM Sans semibold instead of Georgia serif

### 1B. Dashboard Enhancements
**Files:** `src/app/page.tsx`, `src/app/globals.css`

- **Trip cards**: Add a header area with subtle gradient wash (warm tones). Include destination flag emoji (use a small utility map of country → emoji). Show summary stats: total travelers (adults+kids), listing count, avg price/night (needs API change — see below)
- **Hover state**: Add `translateY(-2px)` + increased shadow + coral accent bar that reveals "Open trip →" text
- **Empty state**: Below existing trip cards, add a dashed-border box: "Planning another escape?" with a subtle CTA to create another trip
- **API change for dashboard stats**: Modify `GET /api/trips` (`src/app/api/trips/route.ts`) to include `perNight` in the listings select so the frontend can compute avg price. Currently it only returns `{id, name, scrapeStatus}` per listing — add `perNight` and `totalCost`.

### 1C. Listing Detail — Center Modal → Slide-in Panel
**Files:** `src/components/ListingDetail.tsx`, `src/app/trip/[tripId]/page.tsx`, `src/app/globals.css`

This is the biggest change in Layer 1.

- **Replace the center modal** with a right-side slide-in panel:
  - Panel width: `420px`, position `fixed right-0 top-0 bottom-0`
  - Slide-in from right with `transform: translateX(100%) → translateX(0)` using `--ease-spring` (cubic-bezier(0.16, 1, 0.3, 1)), duration ~350ms
  - Semi-transparent overlay on map area when open
  - "← Back to list" button at top of panel (replaces close X)
  - Escape key and overlay click close the panel
- **Sidebar adjustment**: In `page.tsx`, when `detailId` is set, add a CSS class that narrows the listing sidebar slightly (from `420px` to ~320px`) with a smooth transition
- **Scroll position preserved**: Since this is a fixed panel instead of a modal, the listing sidebar scroll stays in place

### 1D. Map ↔ List Cross-Highlighting (Hover)
**Files:** `src/components/MapView.tsx`, `src/components/ListingCard.tsx`, `src/app/trip/[tripId]/page.tsx`

Currently only click-to-highlight works. Add hover in both directions:

- **New state in TripPage**: `hoveredId: string | null`
- **ListingCard → Map**: On `mouseenter`/`mouseleave` of a ListingCard, set `hoveredId`. Pass `hoveredId` to `MapView`. In MapView, add a `useEffect` that toggles a `.hovered` CSS class on the corresponding pin (scale(1.15), darken border, z-index bump)
- **Map → ListingCard**: In MapView, add `mouseenter`/`mouseleave` events to pin elements. Call a new `onHover(id | null)` callback. In TripPage, set `hoveredId`. ListingCard receives `isHovered` prop and applies subtle background/border highlight
- **CSS**: Add `.price-marker.hovered` styles in `globals.css`

### 1E. Micro-interactions
**Files:** `src/components/ListingCard.tsx`, `src/components/FilterBar.tsx`, `src/components/AddListingModal.tsx`, `src/app/globals.css`

- **Listing cards**: Add `translateY(-1px)` + shadow increase on hover (add transition to the card's container style)
- **Map pins**: Already have `scale(1.08)` on hover — increase to `scale(1.1)` and add shadow
- **Filter pills**: Ensure `transition: border-color 0.15s ease, background 0.15s ease` on all pill buttons (already partially done, verify and standardize)
- **Staggered fade-in for listing cards**: Add CSS `@keyframes fadeInUp` and apply via `animation-delay` based on card index. Pass `index` prop to ListingCard
- **Add Listing modal**: Change from instant appear to slide-up animation. Add `@keyframes slideUp` and apply to modal container

### 1F. Map Pins — Budget Context (Color-Coding)
**Files:** `src/components/MapView.tsx`, `src/app/globals.css`

- Compute price percentiles from all listings with prices:
  - Sort prices, find 20th and 80th percentile values
  - Bottom 20% → cool border/tint (blue-ish: `#4A7FB5`)
  - Middle 60% → default style (current)
  - Top 20% → warm border/tint (warm: `#D4A843`)
  - Selected → coral fill, white text (already done via `.active`)
- Apply as CSS classes: `.price-marker.budget-low`, `.price-marker.budget-high`
- Pass price percentile data to MapView or compute inside it

### 1G. Listing Cards — Enhancements
**Files:** `src/components/ListingCard.tsx`, `src/app/trip/[tripId]/page.tsx`

- **Budget range indicator**: Add a small horizontal line (40px wide) with a dot showing where this listing's price falls relative to min-max of all prices. Compute `allPrices` in TripPage and pass `priceRange: {min, max}` to each ListingCard
- **Amenity chips**: Show top 3 amenity chips below the Big 4 grid + "+N more" if more exist. Currently amenities aren't shown on cards at all — add them
- **Vote display**: Make net vote count larger/bolder, keep voter names as smaller text below

---

## Layer 2: Budget Range (Derived from Data)

### 2A. Budget Calculation Utility
**Files:** New `src/lib/budget.ts`

Create a pure utility function:
```ts
function computeBudgetRange(listings: {perNight: number | null, totalCost: number | null}[]) → {
  min, max, avg, median, p20, p80, prices: number[]
}
```
- Operates on `perNight` (preferred) or fallback `totalCost`
- Returns stats for display

### 2B. Trip Header — Budget Range Visualization
**Files:** New `src/components/BudgetRangeBar.tsx`, `src/app/trip/[tripId]/page.tsx`

- Add a new component `BudgetRangeBar` that renders:
  - A horizontal range bar showing min→max with the "sweet spot" (p20→p80) highlighted
  - Dots for each listing's price
  - Hovering a dot highlights the corresponding listing card
  - Stats below: avg/night, total for N nights, per-person split
- Place this in the trip header area (between the header and filter bar, or as part of the header)
- When hovering a listing card, its dot on the budget bar highlights (connect via `hoveredId`)

### 2C. Listing Card — Compact Budget Indicator
**Files:** `src/components/ListingCard.tsx`

- Already planned in 1G — the dot-on-line indicator. This uses the `priceRange` data from 2A

### 2D. Listing Detail Panel — Full Budget Version
**Files:** `src/components/ListingDetail.tsx`

- Below the price block, show the full budget range bar with this listing's price highlighted
- Same component as 2B but with `highlightedId` prop

---

## Layer 3: Trip Preferences

### 3A. Database Schema
**Files:** `prisma/schema.prisma`

Add to the Trip model:
```prisma
preferences  Json?    // TripPreferences object
```

Run `prisma db push` to apply.

### 3B. TypeScript Types
**Files:** `src/types/index.ts`

Add:
```ts
type Vibe = "chill" | "balanced" | "active";

interface TripPreferences {
  vibe: Vibe | null;
  mustHaves: string[];
  niceToHaves: string[];
  dealbreakers: string[];
  kidNeeds: string[];
  notes: string;
}
```

### 3C. API — Preferences CRUD
**Files:** `src/app/api/trips/[tripId]/route.ts`

- The existing `PATCH /api/trips/[tripId]` already accepts arbitrary fields — add `preferences` to the allowed update fields
- The existing `GET /api/trips/[tripId]` already returns the full trip — `preferences` will come along as a JSON field automatically

### 3D. Preferences Form Component
**Files:** New `src/components/TripPreferences.tsx`

Full-page edit view (not a modal):
1. **Vibe** — 3 large tappable cards: Chill & quiet / Mix of both / Active & social
2. **Must-haves** — chip grid (pool, walk to beach, full kitchen, parking, wifi, washer, AC, workspace, BBQ, gym)
3. **Nice to have** — same chips minus must-haves
4. **Kid needs** — only shown if `trip.kids > 0`. Options: crib, pool fence/safety, high chair, kid-friendly space, ground floor, enclosed yard
5. **Dealbreakers** — chip grid: no stairs, no shared spaces, not on busy road, must be near beach, needs natural light
6. **Anything else** — free text textarea
7. **Save** button → PATCH to API, return to trip view

### 3E. Trip Page Integration
**Files:** `src/app/trip/[tripId]/page.tsx`

- Add "Preferences" button in trip header
- Route to preferences full-page view (use client-side state toggle, not a new route — keep it simple)
- After save, return to trip view
- Show compact preference summary chips in header (vibe, must-have count, etc.)
- First-time prompt banner: "Set your trip preferences to get AI-powered fit scores" — dismissible, stored in localStorage

---

## Layer 4: AI Group Fit Assessment

### 4A. Listing Schema Extension
**Files:** `prisma/schema.prisma`

Add to Listing model:
```prisma
aiFitAssessment  Json?    // AIFitAssessment object
```

### 4B. TypeScript Types
**Files:** `src/types/index.ts`

```ts
type FitScore = "good" | "okay" | "poor";

interface AIFitAssessment {
  score: FitScore;
  checks: string[];
  warnings: string[];
  highlights: string[];
  summary: string;
  assessedAt: string;  // ISO date for cache invalidation
}
```

### 4C. AI Assessment API
**Files:** New `src/app/api/listings/[listingId]/assess/route.ts`, new `src/lib/ai/assess.ts`

- `POST /api/listings/[listingId]/assess` — triggers assessment
  - Fetches listing data + trip preferences
  - Calls Claude API (Anthropic SDK) with the prompt from the brief
  - Parses structured JSON response
  - Stores result in `listing.aiFitAssessment`
  - Returns assessment
- Install `@anthropic-ai/sdk` package
- Uses `ANTHROPIC_API_KEY` from env

### 4D. Assessment Trigger Logic
**Files:** `src/lib/scraper/index.ts`, `src/app/api/trips/[tripId]/route.ts`

- **On scrape completion**: After a listing finishes scraping, if trip has preferences, auto-trigger assessment via internal API call
- **On preferences save**: When preferences are updated via PATCH, re-assess ALL listings in the trip. Queue these and process. Use `after()` callback pattern.

### 4E. Frontend — Fit Display in Listing Detail
**Files:** `src/components/ListingDetail.tsx`

- Below price block, show assessment section:
  - Score badge: colored pill (green = "Strong fit" / yellow = "Decent fit" / red = "Some concerns")
  - Checks as `✓` items, warnings as `⚠` items, highlights as `★` items
  - Summary text
  - Loading state: "Assessing fit..." with spinner

### 4F. Frontend — Fit Badge in Listing Cards
**Files:** `src/components/ListingCard.tsx`

- Small colored dot/pill next to the title or in the vote area showing the fit score
- Green/yellow/red dot with optional short label

---

## Execution Order & Commit Strategy

Each sub-task gets its own commit. The order is:

1. **Layer 1A** — Typography (DM Sans/Mono, design tokens)
2. **Layer 1B** — Dashboard enhancements (cards, empty state, API stats)
3. **Layer 1C** — ListingDetail slide-in panel (the big refactor)
4. **Layer 1D** — Map ↔ List cross-highlighting (hover)
5. **Layer 1E** — Micro-interactions (animations, transitions)
6. **Layer 1F** — Map pin budget color-coding
7. **Layer 1G** — Listing card enhancements (amenity chips, budget dot, votes)
8. **Layer 2A-D** — Budget range (utility + visualization + integration)
9. **Layer 3A-E** — Trip preferences (schema + form + integration)
10. **Layer 4A-F** — AI fit assessment (schema + API + display)

---

## Files Changed Summary

| File | Layers | Type of Change |
|------|--------|----------------|
| `src/app/layout.tsx` | 1A | Add Google Fonts links |
| `src/app/globals.css` | 1A,1D,1E,1F | Design tokens, animations, pin styles |
| `src/app/page.tsx` | 1B | Dashboard card redesign |
| `src/app/trip/[tripId]/page.tsx` | 1C,1D,1G,2B,3E | Slide panel, hover state, budget, preferences |
| `src/components/ListingDetail.tsx` | 1C,2D,4E | Modal→panel, budget bar, AI fit |
| `src/components/ListingCard.tsx` | 1D,1E,1G,2C,4F | Hover, animations, amenities, budget dot, fit badge |
| `src/components/MapView.tsx` | 1D,1F | Hover callbacks, budget pin coloring |
| `src/components/FilterBar.tsx` | 1E | Transition polish |
| `src/components/AddListingModal.tsx` | 1E | Slide-up animation |
| `src/app/api/trips/route.ts` | 1B | Add perNight/totalCost to listing select |
| `src/app/api/trips/[tripId]/route.ts` | 3C,4D | Preferences in PATCH, re-assess trigger |
| `prisma/schema.prisma` | 3A,4A | Add preferences + aiFitAssessment fields |
| `src/types/index.ts` | 3B,4B | TripPreferences + AIFitAssessment types |
| **New:** `src/lib/budget.ts` | 2A | Budget calculation utility |
| **New:** `src/components/BudgetRangeBar.tsx` | 2B | Budget range visualization |
| **New:** `src/components/TripPreferences.tsx` | 3D | Preferences form |
| **New:** `src/lib/ai/assess.ts` | 4C | AI assessment logic |
| **New:** `src/app/api/listings/[listingId]/assess/route.ts` | 4C | Assessment API route |
| `package.json` | 4C | Add @anthropic-ai/sdk |

## Risk Assessment

- **Layer 1 (low risk)**: Pure frontend — no data model changes. Easily reversible.
- **Layer 2 (low risk)**: Pure frontend math on existing data. No schema changes.
- **Layer 3 (medium risk)**: Schema migration (`preferences` Json field on Trip). Non-breaking — nullable field, no data loss.
- **Layer 4 (medium risk)**: Schema migration (`aiFitAssessment` Json field on Listing). Requires `ANTHROPIC_API_KEY`. Non-breaking — nullable field.
