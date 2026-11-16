import type { Profile } from './types';

export function addToCollection(profile: Profile, cardId: string, count = 1): Profile {
  return { ...profile, collection: { ...profile.collection, [cardId]: (profile.collection[cardId] ?? 0) + count },
    achievements: { ...profile.achievements, collected: [...new Set([...profile.achievements.collected, cardId])] } };
}
