import type { Category } from '../content/types';

export interface CardInstance { uid: string; cardId: string }
export interface TableCard extends CardInstance {
  progress: number;
  duration: number | null;
  active: boolean;
  dice?: number;
}
export interface Attempt { time: number; result: 'AC' | 'WA'; score: number }
export interface Problem {
  id: string;
  label: string;
  name: string;
  difficulty: number;
  categories: Category[];
  readTime: number;
  readProgress: number;
  table: TableCard[];
  attempts: Attempt[];
  acTime: number | null;
  revision: number;
  waRevision: number | null;
  submitQueued: boolean;
}
export type Action =
  | { type: 'switch'; problem: number }
  | { type: 'play'; uids: string[]; problem?: number }
  | { type: 'discard-hand'; uids: string[] }
  | { type: 'discard-table'; uids: string[]; problem?: number }
  | { type: 'submit'; problem?: number };
export interface OpponentProblem { attempts: number; acTime: number | null }
export interface Opponent {
  id: string;
  name: string;
  strength: number;
  preference: Category;
  order: number[];
  target: number;
  nextAction: number;
  results: OpponentProblem[];
}
export interface Match {
  id: string;
  eventId: string;
  time: number;
  paused: boolean;
  status: 'playing' | 'finished';
  currentProblem: number;
  problems: Problem[];
  hand: CardInstance[];
  deck: CardInstance[];
  discard: CardInstance[];
  drawProgress: number;
  globalEffects: {
    coffee?: { expiresAt: number; factor: number };
    draw?: { expiresAt: number; interval: number };
  };
  opponents: Opponent[];
  pendingActions: Action[];
  randomState: number;
  feedback: { id: number; problem: number; result: 'AC' | 'WA'; text: string } | null;
}
export interface Pack { id: string; eventId: string; guarantee: number }
export interface Standing {
  id: string;
  name: string;
  player: boolean;
  solved: number;
  penalty: number;
  lastAc: number;
  rank: number;
  problems: { result: 'AC' | 'WA' | null; attempts: number; time: number | null }[];
}
export interface MatchResult {
  matchId: string;
  eventId: string;
  rank: number;
  teams: number;
  solved: number;
  penalty: number;
  packs: number;
  promoted: boolean;
  seasonEnded: boolean;
}
export interface Profile {
  collection: Record<string, number>;
  deck: string[];
  season: number;
  mainIndex: number;
  seasonEnded: boolean;
  playedEvents: string[];
  packs: Pack[];
  history: MatchResult[];
}
