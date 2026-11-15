import type { Medal, PodiumTitle } from './types';

export const medalNames: Record<Medal, string> = { gold: '金牌', silver: '银牌', bronze: '铜牌' };
export const titleNames: Record<PodiumTitle, string> = { champion: '冠军', 'runner-up': '亚军', 'third-place': '季军' };

export function contestAwards(eventId: string, rank: number, teams: number): { medal: Medal | null; title: PodiumTitle | null } {
  if (eventId === 'school' || eventId === 'online') return { medal: null, title: null };
  const percentile = rank / teams;
  const medal = percentile <= 0.1 ? 'gold' : percentile <= 0.3 ? 'silver' : percentile <= 0.6 ? 'bronze' : null;
  const title = rank === 1 ? 'champion' : rank === 2 ? 'runner-up' : rank === 3 ? 'third-place' : null;
  return { medal, title };
}
