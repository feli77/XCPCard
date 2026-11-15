import { describe, expect, it } from 'vitest';
import { cards } from '../content/data';
import type { Category } from '../content/types';
import { createProfile, nextSeason, openPack, rollCategoryPack, settleMatch, startMatch, advanceMatch } from './engine';
import { CARD_PRICES, createTrainingOffers, purchaseOffer, RECYCLE_POINTS, recycleCard, restoreEconomy } from './economy';

function seededRandom() {
  let state = 42;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

describe('训练点与加训', () => {
  it('每轮有一个通用包、两个不同类别包和五张不重复的紫以上卡牌', () => {
    const offers = createTrainingOffers(seededRandom());
    const packs = offers.filter(o => o.kind === 'pack');
    const singles = offers.filter(o => o.kind === 'card');
    expect(packs.map(o => o.price)).toEqual([100, 150, 150]);
    expect(packs[0].category).toBeUndefined();
    expect(new Set(packs.slice(1).map(o => o.category)).size).toBe(2);
    expect(singles).toHaveLength(5);
    expect(new Set(singles.map(o => o.cardId)).size).toBe(5);
    for (const offer of singles) {
      const card = cards.find(c => c.id === offer.cardId)!;
      expect(card.rarity).toBeGreaterThanOrEqual(4);
      expect(offer.price).toBe(CARD_PRICES[card.rarity]);
    }
  });
  it('单卡各档上架概率接近相等', () => {
    const rng = seededRandom();
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) {
      const first = createTrainingOffers(rng).find(o => o.kind === 'card')!;
      if (first.kind === 'card') counts[cards.find(c => c.id === first.cardId)!.rarity - 4]++;
    }
    expect(counts.every(count => count > 400 && count < 600)).toBe(true);
  });
  it('余额不足不扣款；兑换入包、入收藏，各商品只能购买一次', () => {
    let profile = createProfile();
    const pack = profile.trainingOffers[0];
    expect(purchaseOffer(profile, pack.id)).toBe(profile);
    profile = { ...profile, trainingPoints: 5000 };
    const bought = purchaseOffer(profile, pack.id);
    expect(bought.trainingPoints).toBe(4900);
    expect(bought.packs).toHaveLength(profile.packs.length + 1);
    expect(bought.packs.at(-1)?.eventId).toBe('training');
    expect(purchaseOffer(bought, pack.id)).toBe(bought);
    const single = bought.trainingOffers.find(o => o.kind === 'card')!;
    const updated = purchaseOffer(bought, single.id);
    if (single.kind === 'card') expect(updated.collection[single.cardId]).toBe(1);
    expect(purchaseOffer(updated, single.id)).toBe(updated);
  });
  it('全部类别都只出匹配的五张算法卡，兑换包按类别开包', () => {
    const rng = seededRandom();
    const categories = [...new Set(cards.flatMap(card => card.categories))];
    for (const category of categories) for (let i = 0; i < 100; i++) {
      const contents = rollCategoryPack(category as Category, rng);
      expect(contents).toHaveLength(5);
      for (const id of contents) {
        const card = cards.find(c => c.id === id)!;
        expect(card.type).toBe('algorithm');
        expect(card.categories).toContain(category);
      }
    }
    const profile = { ...createProfile(), trainingPoints: 150, packs: [] };
    const offer = profile.trainingOffers[1];
    const bought = purchaseOffer(profile, offer.id);
    const opened = openPack(bought);
    expect(opened.cards.every(id => cards.find(c => c.id === id)!.categories.includes(bought.packs[0].category!))).toBe(true);
  });
  it('完赛发100点并换货一次，换季保留余额和货品', () => {
    const profile = createProfile();
    const match = advanceMatch(startMatch(profile, 'school', 42), 300);
    const settled = settleMatch(profile, match);
    expect(settled.profile.trainingPoints).toBe(100);
    expect(settled.result.trainingPoints).toBe(100);
    expect(settled.profile.trainingOffers).not.toEqual(profile.trainingOffers);
    expect(settleMatch(settled.profile, match).profile).toBe(settled.profile);
    const next = nextSeason({ ...settled.profile, seasonEnded: true });
    expect(next.trainingOffers).toEqual(settled.profile.trainingOffers);
    expect(next.trainingPoints).toBe(100);
  });
  it('旧档补充经济状态，已有状态原样保留', () => {
    const profile = createProfile();
    const { trainingPoints, trainingOffers, ...old } = profile;
    const restored = restoreEconomy(old as typeof profile);
    expect(restored.trainingPoints).toBe(0);
    expect(restored.trainingOffers).toHaveLength(8);
    expect(restored.collection).toEqual(profile.collection);
    expect(restoreEconomy({ ...profile, trainingPoints: 123 })).toEqual({ ...profile, trainingPoints: 123 });
  });
  it('每档回炉收益正确，优先闲置副本，必要时移出卡组', () => {
    for (let rarity = 0; rarity < 8; rarity++) {
      const card = cards.find(c => c.rarity === rarity)!;
      const profile = { ...createProfile(), collection: { [card.id]: 2 }, deck: [card.id] };
      const first = recycleCard(profile, card.id);
      expect(first.trainingPoints).toBe(RECYCLE_POINTS[rarity]);
      expect(first.deck).toEqual([card.id]);
      const second = recycleCard(first, card.id);
      expect(second.trainingPoints).toBe(RECYCLE_POINTS[rarity] * 2);
      expect(second.deck).toEqual([]);
      expect(second.collection).toEqual({});
      expect(recycleCard(second, card.id)).toBe(second);
    }
  });
});
