import type { Category } from '../content/types';

export interface CardInstance { uid: string; cardId: string }
export interface TableCard extends CardInstance {
  progress: number;
  duration: number | null;
  active: boolean;
  dice?: number;
}
export type Verdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE';
export interface Attempt { time: number; result: 'AC' | 'WA'; verdict?: Verdict; score: number }
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
  judging?: { duration: number; remaining: number; attempt: Attempt; text: string };
}
export type Action =
  | { type: 'switch'; problem: number }
  | { type: 'play'; uids: string[]; problem?: number }
  | { type: 'discard-hand'; uids: string[] }
  | { type: 'discard-table'; uids: string[]; problem?: number }
  | { type: 'reorder-table'; uid: string; toIndex: number; problem?: number }
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
  feedback: { id: number; problem: number; result: 'AC' | 'WA'; verdict?: Verdict; text: string } | null;
}
export interface Pack { id: string; eventId: string; guarantee: number; category?: Category; achievementId?: string; levelId?: string }
export type TrainingOffer = { id: string; price: number; purchased: boolean } & (
  { kind: 'pack'; category?: Category } | { kind: 'card'; cardId: string }
);
export interface Standing {
  id: string;
  name: string;
  player: boolean;
  solved: number;
  penalty: number;
  lastAc: number;
  rank: number;
  problems: { result: 'AC' | 'WA' | null; attempts: number; time: number | null; firstBlood: boolean }[];
}
export interface MatchResult {
  matchId: string;
  eventId: string;
  season: number;
  rank: number;
  teams: number;
  solved: number;
  penalty: number;
  packs: number;
  trainingPoints?: number;
  promoted: boolean;
  seasonEnded: boolean;
  medal: Medal | null;
  title: PodiumTitle | null;
}
export type Medal = 'gold' | 'silver' | 'bronze';
export type PodiumTitle = 'champion' | 'runner-up' | 'third-place';
export interface AchievementState {
  collected: string[];
  unlocked: string[];
  rewarded: string[];
  notifications: string[];
  progress: Record<string, number>;
  match: { id: string; attempts: Record<string, number> } | null;
}
export interface Profile {
  achievements: AchievementState;
  trainingPoints: number;
  trainingOffers: TrainingOffer[];
  collection: Record<string, number>;
  deck: string[];
  season: number;
  mainIndex: number;
  seasonEnded: boolean;
  playedEvents: string[];
  packs: Pack[];
  history: MatchResult[];
}
