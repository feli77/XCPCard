export type Category = '基础算法' | '图论' | '数学' | 'DP' | '数据结构' | '字符串' | '计算几何';
export type CardEffect = { kind: 'multiplier'; amount: number } | { kind: 'coffee'; duration: number; factor: number } | { kind: 'draw'; duration: number; interval: number } | { kind: 'dice'; sides: number; unit: number };
export interface CardDefinition {
  id: string;
  name: string;
  type: 'algorithm' | 'technique';
  rarity: number;
  score: number;
  time: number;
  categories: Category[];
  joke: string;
  effect?: CardEffect;
  effectText?: string;
  art: string;
}
export interface EventDefinition {
  id: string;
  name: string;
  shortName: string;
  kind: 'main' | 'side';
  teams: number;
  problems: number;
  minDifficulty: number;
  maxDifficulty: number;
  promotion?: number;
  guarantee: number;
  description: string;
}
export interface RarityDefinition { name: string; color: string; pattern: string; }

export type AchievementMetric =
  | 'retries'
  | 'late-ac'
  | 'first-try'
  | 'late-start'
  | 'under-score'
  | 'all-verdicts'
  | 'zero-ac'
  | 'clean-sweep'
  | 'read-all'
  | 'ac-automaton-wa'
  | 'over-score-wa'
  | 'mismatch-ac'
  | 'no-algorithm-ac'
  | 'dual-buff'
  | 'recycle-template';
export type AchievementCondition =
  | { kind: 'cards'; cardIds: string[] }
  | { kind: 'category'; category: Category; count: number }
  | { kind: 'gold'; eventId: 'regional' | 'ecf' | 'wf' }
  | { kind: 'match'; metric: AchievementMetric; target: number };
export type AchievementReward =
  | { kind: 'pack'; guarantee: number }
  | { kind: 'card'; cardId: string; count: number }
  | { kind: 'points'; amount: number };
export interface AchievementLevel {
  id: string;
  title: string;
  conditionText: string;
  condition: AchievementCondition;
  reward: AchievementReward;
}
export interface AchievementDefinition {
  id: string;
  title: string;
  hidden: boolean;
  levels: AchievementLevel[];
}
