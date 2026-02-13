export interface BudgetRange {
  min: number;
  max: number;
  avg: number;
  median: number;
  p20: number;
  p80: number;
  prices: number[];
}

export function computeBudgetRange(
  listings: { perNight: number | null; totalCost: number | null }[]
): BudgetRange | null {
  const prices = listings
    .map((l) => l.perNight || l.totalCost)
    .filter((p): p is number => p != null && p > 0)
    .sort((a, b) => a - b);

  if (prices.length < 2) return null;

  const sum = prices.reduce((a, b) => a + b, 0);
  const avg = sum / prices.length;
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0
      ? (prices[mid - 1] + prices[mid]) / 2
      : prices[mid];

  const p20Idx = Math.floor(prices.length * 0.2);
  const p80Idx = Math.min(Math.floor(prices.length * 0.8), prices.length - 1);

  return {
    min: prices[0],
    max: prices[prices.length - 1],
    avg,
    median,
    p20: prices[p20Idx],
    p80: prices[p80Idx],
    prices,
  };
}

export type PriceTier = "low" | "mid" | "high";

export function getPriceTier(
  price: number | null,
  range: BudgetRange | null
): PriceTier {
  if (!price || !range) return "mid";
  if (price <= range.p20) return "low";
  if (price >= range.p80) return "high";
  return "mid";
}
