import type { MatchResult, Medal, PodiumTitle, Profile } from './types';

export const medalNames: Record<Medal, string> = { gold: '金牌', silver: '银牌', bronze: '铜牌' };
export const titleNames: Record<PodiumTitle, string> = { champion: '冠军', 'runner-up': '亚军', 'third-place': '季军' };

export function contestAwards(eventId: string, rank: number, teams: number): { medal: Medal | null; title: PodiumTitle | null } {
  if (eventId === 'school' || eventId === 'online') return { medal: null, title: null };
  const percentile = rank / teams;
  const medal = percentile <= 0.1 ? 'gold' : percentile <= 0.3 ? 'silver' : percentile <= 0.6 ? 'bronze' : null;
  const title = rank === 1 ? 'champion' : rank === 2 ? 'runner-up' : rank === 3 ? 'third-place' : null;
  return { medal, title };
}

export function restoreHistory(profile: Profile): Profile {
  let season = profile.season;
  if (profile.history.at(-1)?.seasonEnded && !profile.seasonEnded) season--;
  const history = [...profile.history].reverse().map((result, index) => {
    if (index > 0 && result.seasonEnded) season--;
    return { ...result, season: result.season ?? season, ...contestAwards(result.eventId, result.rank, result.teams) };
  }).reverse();
  return { ...profile, history };
}

const eventLevels: Record<string, number> = { wf: 4, ecf: 3, regional: 2, provincial: 1, invitational: 1 };

export function highestHonor(history: MatchResult[]): MatchResult | undefined {
  return history.filter(result => result.medal || result.title).sort((a, b) =>
    eventLevels[b.eventId] - eventLevels[a.eventId] || a.rank - b.rank || b.season - a.season,
  )[0];
}
