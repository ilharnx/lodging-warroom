// Auto-assigned color palette for travelers.
// Assigned in order; cycles from the beginning once all 8 are used.
export const TRAVELER_COLORS = [
  '#C4725A', // terracotta
  '#7C8C6E', // sage
  '#D4A853', // gold
  '#5B7B8A', // slate blue
  '#B5636A', // dusty rose
  '#8B7355', // warm brown
  '#6B8F71', // forest
  '#C4956A', // sandy tan
];

export function getNextColor(usedColors: string[]): string {
  // Find first unused color, or cycle
  for (const color of TRAVELER_COLORS) {
    if (!usedColors.includes(color)) return color;
  }
  return TRAVELER_COLORS[usedColors.length % TRAVELER_COLORS.length];
}
