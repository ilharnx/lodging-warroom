import type { TripPreferences, AIFitAssessment } from "@/types";

interface ListingData {
  name: string;
  description: string | null;
  perNight: number | null;
  totalCost: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  kitchen: string | null;
  amenities: unknown;
  beachDistance: string | null;
  beachType: string | null;
  kidFriendly: boolean;
  kidNotes: string | null;
}

interface TripContext {
  adults: number;
  kids: number;
  preferences: TripPreferences;
}

function buildPrompt(listing: ListingData, context: TripContext): string {
  const amenityList = Array.isArray(listing.amenities)
    ? listing.amenities.join(", ")
    : "Not listed";

  return `You are assessing a vacation rental listing for a group trip.

TRIP CONTEXT:
- ${context.adults} adults, ${context.kids} kids
- Vibe preference: ${context.preferences.vibe || "not specified"}
- Must-haves: ${context.preferences.mustHaves.length > 0 ? context.preferences.mustHaves.join(", ") : "none specified"}
- Nice-to-haves: ${context.preferences.niceToHaves.length > 0 ? context.preferences.niceToHaves.join(", ") : "none specified"}
- Dealbreakers: ${context.preferences.dealbreakers.length > 0 ? context.preferences.dealbreakers.join(", ") : "none specified"}
- Kid needs: ${context.preferences.kidNeeds.length > 0 ? context.preferences.kidNeeds.join(", ") : "none specified"}
- Additional notes: ${context.preferences.notes || "none"}

LISTING DATA:
- Title: ${listing.name}
- Price: ${listing.perNight ? `$${listing.perNight}/night` : listing.totalCost ? `$${listing.totalCost} total` : "not listed"}
- Bedrooms: ${listing.bedrooms ?? "unknown"}, Bathrooms: ${listing.bathrooms ?? "unknown"}
- Kitchen: ${listing.kitchen || "unknown"}
- Amenities: ${amenityList}
- Beach: ${listing.beachDistance || "unknown"} ${listing.beachType ? `(${listing.beachType})` : ""}
- Kid-friendly: ${listing.kidFriendly ? "Yes" : "Not marked"}${listing.kidNotes ? ` - ${listing.kidNotes}` : ""}
- Description: ${listing.description || "No description available"}

Assess this listing's fit for the group. Return ONLY valid JSON with no other text:
{
  "score": "good" | "okay" | "poor",
  "checks": ["positive match 1", ...],
  "warnings": ["concern 1", ...],
  "highlights": ["standout feature 1", ...],
  "summary": "1-2 sentence natural language assessment"
}

Be concise. Focus on what matters to THIS group based on their preferences. Read the description carefully for details that aren't in the structured data (e.g., "steps from the beach", "gated community", "recently renovated").`;
}

export async function assessListing(
  listing: ListingData,
  context: TripContext
): Promise<AIFitAssessment> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const prompt = buildPrompt(listing, context);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("Empty response from Claude API");
  }

  // Parse JSON from response (may have markdown code fences)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and normalize
  const validScores = ["good", "okay", "poor"];
  const score = validScores.includes(parsed.score) ? parsed.score : "okay";

  return {
    score,
    checks: Array.isArray(parsed.checks) ? parsed.checks.slice(0, 8) : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 6) : [],
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 4) : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "Assessment complete.",
    assessedAt: new Date().toISOString(),
  };
}
