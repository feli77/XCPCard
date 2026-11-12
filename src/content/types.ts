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
  problems: number;
  minDifficulty: number;
  maxDifficulty: number;
  promotion?: number;
  guarantee: number;
  description: string;
}
export interface RarityDefinition { name: string; color: string; pattern: string; }
