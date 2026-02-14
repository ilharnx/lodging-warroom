# Stay Brief — Addendum: Workflow & UX Overhaul

**Feed this to Claude Code alongside the original `stay-claude-code-brief.md`**

This addendum supersedes specific sections of the original brief. Where conflicts exist, this document wins.

---

## Typography Correction (IMPORTANT — applies everywhere)

The original brief specified DM Sans + DM Mono. **Replace with:**

```css
/* Typography — UPDATED */
--font-heading: 'Fraunces', serif;
--font-body: 'Plus Jakarta Sans', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

Google Fonts imports:
```
https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap
https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap
https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap
```

Usage rules:
- **Fraunces** (serif, weight 600): "Stay" wordmark, trip names, listing titles. Never on buttons or small UI.
- **Plus Jakarta Sans** (sans-serif): Default body font. Descriptions, buttons, amenity chips, metadata text, comments.
- **IBM Plex Mono** (monospace): Prices, all-caps labels (AIRBNB, VRBO, BEDROOMS, GROUP FIT), budget stats, filter metadata, source badges, review counts.

---

## Kill the Stats Bar

The existing secondary bar showing `Avg $590/night ~$4,720 for 8 nights ~$1,180/person` with the nights stepper — **remove it from the trip header.**

That math is useless as a global overview. Instead, it belongs **inside each listing card and listing detail**, contextualized to that specific property:

On every listing card, below the price, show:
```
$4,960 total · $1,240/person
```
(calculated as: price × trip nights, then ÷ adults)

In the listing detail view, show a fuller breakdown:
```
$620/night
──────────
8 NIGHTS    PER PERSON
$4,960      $1,240
```

Use IBM Plex Mono for all these numbers.

---

## Reactions Replace Upvote/Downvote

**Replace the existing binary 🔥/👎 upvote/downvote system** with multi-reaction support.

### Reaction Options
```
🔥 Love it
😍 Obsessed  
🤔 Maybe
👎 Pass
```

### Data Model Change
Currently votes are stored as a simple up/down count with voter names. Change to:

```json
{
  "reactions": {
    "Alf": "love",
    "Angie": "obsessed",
    "Mike": "maybe"
  }
}
```

Each user can have exactly one reaction per listing. Selecting a different reaction replaces their previous one. Selecting the same reaction removes it (toggle off).

### Display on Listing Cards
Show grouped reaction counts as small pills:
```
[🔥 2] [😍 1] [🤔 1]    [+ React]
```

The "+ React" button opens a horizontal picker (4 emoji buttons) floating above the card. If the current user already reacted, show their emoji instead of "+".

### Display in Listing Detail
Show each person's reaction individually:
```
[🔥 Alf] [😍 Angie] [🤔 Mike]
```
Each pill shows the emoji + name, colored with that user's assigned color.

Below that, show the 4 reaction options as tappable buttons so the user can react or change their reaction.

### Migration
Existing upvotes → map to "love" reaction. Existing downvotes → map to "pass" reaction. Preserve voter names.

---

## Elimination Grouping (Auto-Sort by Consensus)

**Listings should automatically group by consensus** based on reactions, not display in a flat list.

### Three Groups

1. **"Everyone's into these"** (🔥 green header)
   - Condition: majority of reactors chose "love" or "obsessed" (≥50% positive, minimum 2 positive reactions)
   - These float to the top of the list

2. **"Still deciding"** (🤔 yellow header)
   - Condition: mixed reactions, or fewer than 2 total reactions
   - Middle of the list

3. **"Probably not"** (👋 dimmed header)
   - Condition: majority of reactors chose "pass" (≥50% pass reactions)
   - Bottom of the list, displayed at reduced opacity (0.6)

### Implementation
- Compute group assignment dynamically from reactions data — don't store it
- Display a small section header above each group with emoji + label + count
- Within each group, maintain the existing sort order (whatever the user's sort selection is)
- This grouping applies to both the listing sidebar AND the map — pins for "passed" listings could be smaller/dimmer

### Edge Cases
- 0 reactions on a listing → goes in "Still deciding"
- Only 1 person has reacted → goes in "Still deciding" regardless of what they picked
- Tied (equal positive and negative) → "Still deciding"

---

## Comments Become Inline Group Chat

**Move comments from the buried bottom of the detail view to a prominent position, and preview them on cards.**

### On Listing Cards
If a listing has comments, show the most recent one as a preview below the reactions:
```
[A avatar] Alf: the pool looks amazing but no fence 😬    +2
```
- User name in their assigned color, bold
- Comment text truncated to one line with ellipsis
- "+N" count if more than one comment exists
- Background: subtle bg color pill/row
- Tapping the comment preview opens the listing detail scrolled to the discussion section

### In Listing Detail — Reordered Position
Comments section should appear **right after the group reactions**, before key details and amenities. The priority order for the detail view top-to-bottom is:

1. Photo (swipeable if multiple)
2. Title + location + rating
3. **Price in context** (price/night + total for N nights + per person)
4. **Group vibes** (who reacted with what + reaction picker)
5. **Discussion** (comment thread + input)
6. Key details grid (beds, baths, kitchen)
7. Amenities (show 4, collapse rest behind "+N" button)
8. Description (fully collapsed by default behind "Full description ▼" toggle)
9. View on source link
10. Remove listing

### Comment Input Style
Replace the formal "Add a comment..." + "Post" button with a chat-style input:
- Rounded pill input field with placeholder "Say something..."
- Circular send button (arrow up icon) that's gray when empty, coral when text is entered
- Each comment shows: user avatar circle (first letter, colored) + name (bold, colored) + timestamp (IBM Plex Mono, light) + message text

---

## Listing Detail View — Mobile Reorder

On mobile, the listing detail is a **full-screen slide-up view** (not a side panel — there's no room). The original brief's slide-in-from-right panel applies to desktop only.

### Mobile Detail Structure
```
[← Back]                    [View on Airbnb ↗]
─────────────────────────────────────────────
[  Photo area — 240px tall, swipeable  ]
[SOURCE badge top-left]

Title (Fraunces, 22px, weight 600)
Location · ⭐ 4.97 (72)

┌─────────────────────────────┐
│ $620 /night                 │
│ ─────────────              │
│ 8 NIGHTS     PER PERSON    │
│ $4,960       $1,240        │
└─────────────────────────────┘

GROUP VIBES
[🔥 Alf] [😍 Angie] [🔥 Mike]
[🔥 Love it] [😍 Obsessed] [🤔 Maybe] [👎 Pass]

DISCUSSION (3)
[A] Alf: price is steep but look at that view     1h ago
[M] Mike: this is THE one                         3h ago
[Say something...                          ] [↑]

KEY DETAILS
[🛏️ 3 beds] [🚿 3 baths] [🍳 Full kitchen]

AMENITIES
[Beach access] [Kitchen] [WiFi] [Pool] [+5]

[Full description ▼]

[View on Airbnb ↗ — full width button]
[Remove listing — subtle red text]
```

---

## Reference Prototype

Add to the reference prototypes list:
- `stay-mobile-workflow.jsx` — Mobile elimination workflow: reaction-based voting, consensus grouping, inline comments, reordered detail view. Uses finalized Fraunces + Plus Jakarta Sans + IBM Plex Mono typography.

This is a **design and interaction reference**, not source code. The patterns to implement from it:
1. ReactionBar component (compact + full modes)
2. CommentThread component (preview + full modes)  
3. GroupHeader component (consensus-based section headers)
4. ListingCard layout (photo + title/price + per-person math + reactions + comment preview)
5. DetailView priority ordering

---

## Execution Notes

These workflow changes touch Layer 1 (visual/interaction) and create a new concern (reactions data model). Suggested approach:

1. **Typography swap first** — find-and-replace DM Sans → Plus Jakarta Sans, DM Mono → IBM Plex Mono, add Fraunces for headings. Quick, low risk.
2. **Kill stats bar** — remove the component, add per-listing price math to cards and detail.
3. **Reactions data model** — migrate existing votes to reactions format, build ReactionBar component.
4. **Elimination grouping** — compute groups from reactions, render section headers, sort.
5. **Comments rework** — move position in detail view, add card preview, restyle as chat.
6. **Mobile detail reorder** — restructure the detail view content order per the spec above.

Test after each step. The reactions migration (step 3) is the riskiest since it changes stored data — make sure existing votes aren't lost.
