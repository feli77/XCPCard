import { createProfile } from '../src/game/engine';

export function createTestProfile() {
  const profile = createProfile();
  profile.deck = [
    'enumerate', 'binary-search', 'quick-sort', 'two-pointers', 'prefix-sum',
    'gcd', 'sieve', 'bfs', 'dfs', 'knapsack', 'template', 'coffee',
  ].flatMap(id => [id, id]);
  profile.collection = {};
  for (const id of profile.deck) profile.collection[id] = (profile.collection[id] ?? 0) + 1;
  profile.packs = [];
  return profile;
}
