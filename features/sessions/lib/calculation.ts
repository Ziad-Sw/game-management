import { PricingMode, PricingUnit, StationType } from "@/types/database";

export interface SessionCostInput {
  station_type: StationType;
  mode: PricingMode;
  unit: PricingUnit;
  rate: number;
  start_time: string;
  end_time: string | null;
  games_count: number | null;
  sale_items_total: number;
  billiard_game_entries_cost?: number;
  station_game_entries_cost?: number;
}

export interface SessionCostOutput {
  duration_hours: number;
  session_cost: number;
  products_cost: number;
  billiard_game_entries_cost: number;
  station_game_entries_cost: number;
  total_cost: number;
}

/**
 * Calculate session cost based on server time and pricing rules
 * 
 * Formula: duration_hours * rate
 * - duration_hours is calculated with fractional minutes (no rounding)
 * - rate is the hourly/game rate from pricing_rules
 * - When unit = 'game', cost = games_count * rate
 * - When unit = 'hour', cost = duration_hours * rate
 * - Accumulated game entries (billiard or station) add their cost
 */
export function calculateSessionCost(input: SessionCostInput): SessionCostOutput {
  const { unit, rate, start_time, end_time, games_count, sale_items_total, billiard_game_entries_cost, station_game_entries_cost } = input;

  let duration_hours = 0;
  let session_cost = 0;

  if (unit === 'game') {
    const games = games_count || 0;
    session_cost = games * rate;
    duration_hours = 0;
  } else {
    const startTime = new Date(start_time);
    const endTime = end_time ? new Date(end_time) : new Date();
    
    const durationMs = endTime.getTime() - startTime.getTime();
    duration_hours = durationMs / (1000 * 60 * 60);
    
    session_cost = duration_hours * rate;
  }

  const billiardCost = billiard_game_entries_cost ?? 0;
  const stationCost = station_game_entries_cost ?? 0;
  const total_cost = session_cost + sale_items_total + billiardCost + stationCost;

  return {
    duration_hours,
    session_cost,
    products_cost: sale_items_total,
    billiard_game_entries_cost: billiardCost,
    station_game_entries_cost: stationCost,
    total_cost,
  };
}

function sumGameEntries(
  entries: { games_count: number; price_per_game: number }[]
): number {
  return entries.reduce(
    (sum, e) => sum + calculateGameEntrySubtotal(e.games_count, e.price_per_game),
    0
  );
}

/**
 * Single source of truth: compute one billiard game entry batch subtotal.
 * Called by UI per-row display — never compute games_count * price_per_game inline.
 */
export function calculateGameEntrySubtotal(
  games_count: number,
  price_per_game: number
): number {
  return games_count * price_per_game;
}

/**
 * Single source of truth: sum billiard game entries cost.
 * Called by both preview-close and confirm-close — never duplicate inline.
 */
export function calculateBilliardGameEntriesCost(
  entries: { games_count: number; price_per_game: number }[]
): number {
  return sumGameEntries(entries);
}

export function calculateStationGameEntriesCost(
  entries: { games_count: number; price_per_game: number }[]
): number {
  return sumGameEntries(entries);
}

export function calculateGameEntriesCount(
  entries: { games_count: number }[]
): number {
  return entries.reduce((sum, entry) => sum + entry.games_count, 0);
}

/**
 * Format duration for display (e.g., "1h 30m", "45m", "2h")
 */
export function formatDuration(durationHours: number): string {
  const hours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - hours) * 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}س ${minutes}د`;
  } else if (hours > 0) {
    return `${hours}س`;
  } else if (minutes > 0) {
    return `${minutes}د`;
  } else {
    return '0د';
  }
}
