import { evaluateAchievements } from './achievements';
import { addToCollection } from './collection';
import { cards } from '../content/data';
import type { Category } from '../content/types';
import type { Profile, TrainingOffer } from './types';

export const MATCH_POINTS = 100;
export const PACK_PRICE = 100;
export const CATEGORY_PACK_PRICE = 150;
export const CARD_PRICES = [0, 0, 0, 0, 300, 600, 1200, 2400];
export const RECYCLE_POINTS = [5, 10, 15, 25, 50, 100, 200, 400];
const categories: Category[] = ['基础算法', '图论', '数学', 'DP', '数据结构', '字符串', '计算几何'];
const cardById = Object.fromEntries(cards.map(card => [card.id, card]));

export function createTrainingOffers(random: () => number = Math.random): TrainingOffer[] {
  const offer = () => ({ id: crypto.randomUUID(), purchased: false });
  const offers: TrainingOffer[] = [{ ...offer(), kind: 'pack', price: PACK_PRICE }];
  const remainingCategories = [...categories];
  for (let i = 0; i < 2; i++) {
    const [category] = remainingCategories.splice(Math.floor(random() * remainingCategories.length), 1);
    offers.push({ ...offer(), kind: 'pack', category, price: CATEGORY_PACK_PRICE });
  }
  const remaining = cards.filter(card => card.rarity >= 4);
  for (let i = 0; i < 5; i++) {
    const tiers = [...new Set(remaining.map(card => card.rarity))];
    const rarity = tiers[Math.floor(random() * tiers.length)];
    const pool = remaining.filter(card => card.rarity === rarity);
    const card = pool[Math.floor(random() * pool.length)];
    remaining.splice(remaining.indexOf(card), 1);
    offers.push({ ...offer(), kind: 'card', cardId: card.id, price: CARD_PRICES[rarity] });
  }
  return offers;
}

export function restoreEconomy(profile: Profile): Profile {
  return { ...profile, trainingPoints: profile.trainingPoints ?? 0,
    trainingOffers: profile.trainingOffers ?? createTrainingOffers() };
}

export function purchaseOffer(profile: Profile, offerId: string): Profile {
  const offer = profile.trainingOffers.find(item => item.id === offerId);
  if (!offer || offer.purchased || profile.trainingPoints < offer.price) return profile;
  const updated = { ...profile, trainingPoints: profile.trainingPoints - offer.price,
    trainingOffers: profile.trainingOffers.map(item => item.id === offerId ? { ...item, purchased: true } : item) };
  if (offer.kind === 'pack') return { ...updated, packs: [...profile.packs,
    { id: crypto.randomUUID(), eventId: 'training', guarantee: 0, category: offer.category }] };
  return evaluateAchievements(addToCollection(updated, offer.cardId));
}

export function recycleCard(profile: Profile, cardId: string): Profile {
  const card = cardById[cardId];
  if (!card || !profile.collection[cardId]) return profile;
  const collection = { ...profile.collection };
  if (--collection[cardId] === 0) delete collection[cardId];
  const deck = [...profile.deck];
  if (deck.filter(id => id === cardId).length > (collection[cardId] ?? 0)) deck.splice(deck.indexOf(cardId), 1);
  const next = { ...profile, collection, deck, trainingPoints: profile.trainingPoints + RECYCLE_POINTS[card.rarity] };
  if (cardId !== 'template') return next;
  return evaluateAchievements({
    ...next,
    achievements: { ...next.achievements, progress: { ...next.achievements.progress, 'recycle-template': 1 } },
  }, false);
}
