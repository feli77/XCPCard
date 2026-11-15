export const FIRST_SEASON_YEAR = 2026;

export function seasonYear(season: number): number {
  return season < FIRST_SEASON_YEAR ? FIRST_SEASON_YEAR + season - 1 : season;
}
