import { cards, events, problemNames, teamNames, rarityWeights } from '../content/data';
import type { Category, CardDefinition } from '../content/types';
import type { Action, CardInstance, Match, MatchResult, Opponent, Pack, Profile, Standing, TableCard } from './types';

export const MATCH_DURATION = 300;
export const HAND_LIMIT = 8;
export const TABLE_LIMIT = 5;
export const DECK_SIZE = 24;
export const cardById = Object.fromEntries(cards.map(card => [card.id, card]));
const categories: Category[] = ['基础算法', '图论', '数学', 'DP', '数据结构', '字符串', '计算几何'];
const mainEvents = events.filter(event => event.kind === 'main');

function random(state: { randomState: number }): number {
  state.randomState = (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}
function shuffle<T>(list: T[], state: { randomState: number }): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const seed = () => Math.floor(Math.random() * 4294967296);
const uniqueId = () => crypto.randomUUID();

export function createProfile(): Profile {
  const packs: Pack[] = Array.from({ length: 8 }, () => ({ id: uniqueId(), eventId: 'starter', guarantee: 0 }));
  return { collection: {}, deck: [], season: 1, mainIndex: 0, seasonEnded: false, playedEvents: [], packs, history: [] };
}

export function availableEvents(profile: Profile) {
  if (profile.seasonEnded) return [];
  const next = mainEvents[profile.mainIndex];
  return events.filter(event => event.id === next?.id || (event.kind === 'side' && profile.mainIndex > 0 && !profile.playedEvents.includes(event.id)));
}

export function setDeck(profile: Profile, deck: string[]): Profile {
  const counts: Record<string, number> = {};
  for (const id of deck) counts[id] = (counts[id] ?? 0) + 1;
  if (deck.length > DECK_SIZE || Object.entries(counts).some(([id, count]) => count > (profile.collection[id] ?? 0))) return profile;
  return { ...profile, deck: [...deck] };
}

export function nextSeason(profile: Profile): Profile {
  if (!profile.seasonEnded) return profile;
  return { ...profile, season: profile.season + 1, mainIndex: 0, seasonEnded: false, playedEvents: [] };
}

export function startMatch(profile: Profile, eventId: string, randomSeed = seed()): Match {
  const event = events.find(item => item.id === eventId)!;
  const rng = { randomState: randomSeed };
  const difficulties = Array.from({ length: event.problems }, (_, i) => {
    const fraction = i / (event.problems - 1);
    return Math.round((event.minDifficulty + (event.maxDifficulty - event.minDifficulty) * fraction + (random(rng) - 0.5) * 80) / 50) * 50;
  }).map(value => Math.max(event.minDifficulty, Math.min(event.maxDifficulty, value)));
  const names = shuffle(problemNames, rng);
  const problems = shuffle(difficulties, rng).map((difficulty, i) => ({
    id: `problem-${i}`, label: String.fromCharCode(65 + i), name: names[i % names.length], difficulty,
    categories: shuffle(categories, rng).slice(0, random(rng) < 0.25 ? 2 : 1),
    readTime: 3 + Math.floor(random(rng) * 6), readProgress: 0, table: [], attempts: [], acTime: null,
    revision: 0, waRevision: null, submitQueued: false,
  }));
  const deck = shuffle(profile.deck.map((cardId, i) => ({ uid: `card-${i}`, cardId })), rng);
  const opponentNames = shuffle(teamNames, rng).slice(0, 19);
  const opponents: Opponent[] = opponentNames.map((name, i) => {
    const preference = categories[Math.floor(random(rng) * categories.length)];
    const strength = event.minDifficulty + 50 + (event.maxDifficulty - event.minDifficulty) * random(rng) * 0.9;
    const jitter = problems.map(() => random(rng) * 500);
    const order = problems.map((_, index) => index).sort((a, b) =>
      (problems[a].difficulty - (problems[a].categories.includes(preference) ? 350 : 0) + jitter[a]) -
      (problems[b].difficulty - (problems[b].categories.includes(preference) ? 350 : 0) + jitter[b]));
    return { id: `team-${i}`, name, strength, preference, order, target: 0,
      nextAction: 12 + random(rng) * 35,
      results: problems.map(() => ({ attempts: 0, acTime: null })) };
  });
  return { id: uniqueId(), eventId, time: 0, paused: false, status: 'playing', currentProblem: 0,
    problems, hand: deck.splice(0, HAND_LIMIT), deck, discard: [], drawProgress: 0, globalEffects: {},
    opponents, pendingActions: [], randomState: rng.randomState, feedback: null };
}

export function tableScore(match: Match, problemIndex = match.currentProblem): number {
  const problem = match.problems[problemIndex];
  let sum = 0;
  let multiplier = 0;
  for (const instance of problem.table) {
    if (!instance.active) continue;
    const card = cardById[instance.cardId];
    if (card.type === 'algorithm') sum += card.score * (card.categories.some(category => problem.categories.includes(category)) ? 1 : 0.5);
    else {
      sum += card.score;
      if (card.effect?.kind === 'multiplier') multiplier += card.effect.amount * 100;
      if (card.effect?.kind === 'dice') sum += instance.dice!;
    }
  }
  return Math.floor(sum * (100 + multiplier) / 100);
}

export function canSubmit(match: Match, problemIndex = match.currentProblem): boolean {
  const problem = match.problems[problemIndex];
  return match.status === 'playing' && match.time < MATCH_DURATION && problem.acTime === null &&
    problem.readProgress >= problem.readTime && problem.table.length > 0 && problem.table.every(card => card.active) &&
    problem.waRevision !== problem.revision;
}

// 800 at equal score, 950 at +400, capped at 980 (per thousand).
export function acceptanceChance(score: number, difficulty: number): number {
  return Math.min(0.98, 1 / (1 + Math.exp(-(Math.log(4) + (score - difficulty) * Math.log(19 / 4) / 400))));
}

function submit(match: Match, index: number) {
  if (index !== match.currentProblem || !canSubmit(match, index)) return false;
  const problem = match.problems[index];
  const score = tableScore(match, index);
  const accepted = random(match) < acceptanceChance(score, problem.difficulty);
  problem.attempts.push({ time: match.time, result: accepted ? 'AC' : 'WA', score });
  if (accepted) {
    problem.acTime = match.time;
    match.discard.push(...problem.table.filter(card => cardById[card.cardId].type === 'algorithm').map(({ uid, cardId }) => ({ uid, cardId })));
    problem.table = [];
  } else problem.waRevision = problem.revision;
  problem.submitQueued = false;
  match.feedback = { id: (match.feedback?.id ?? 0) + 1, problem: index, result: accepted ? 'AC' : 'WA', text: accepted ? '过了，别碰它。' : '样例：我尽力了。' };
  return true;
}

function runAction(match: Match, action: Action, scheduled = false) {
  const index = 'problem' in action ? (action.problem ?? match.currentProblem) : match.currentProblem;
  const problem = match.problems[index];
  switch (action.type) {
    case 'switch':
      match.currentProblem = action.problem;
      break;
    case 'play': {
      if (index !== match.currentProblem || problem.acTime !== null || problem.readProgress < problem.readTime) break;
      const playing = [...new Set(action.uids)].map(uid => match.hand.find(card => card.uid === uid)).filter((card): card is CardInstance => !!card);
      if (!playing.length || problem.table.length + playing.length > TABLE_LIMIT) break;
      match.hand = match.hand.filter(card => !playing.some(item => item.uid === card.uid));
      problem.table.push(...playing.map(card => ({ ...card, progress: 0, duration: null, active: false })));
      problem.revision++;
      startNextCard(match, index);
      break;
    }
    case 'discard-hand': {
      const discarded = match.hand.filter(card => action.uids.includes(card.uid));
      match.discard.push(...discarded);
      match.hand = match.hand.filter(card => !action.uids.includes(card.uid));
      break;
    }
    case 'discard-table': {
      const discarded = problem.table.filter(card => action.uids.includes(card.uid));
      if (!discarded.length) break;
      match.discard.push(...discarded.filter(card => cardById[card.cardId].type === 'algorithm').map(({ uid, cardId }) => ({ uid, cardId })));
      problem.table = problem.table.filter(card => !action.uids.includes(card.uid));
      problem.revision++;
      startNextCard(match, index);
      break;
    }
    case 'submit':
      if (scheduled) problem.submitQueued = true;
      else submit(match, index);
      break;
  }
}

export function act(match: Match, action: Action): Match {
  if (match.status !== 'playing') return match;
  const next = structuredClone(match);
  if (next.paused) {
    const target = 'problem' in action && action.problem !== undefined ? action.problem : next.pendingActions.reduce((current, item) => item.type === 'switch' ? item.problem : current, next.currentProblem);
    next.pendingActions.push(action.type === 'play' || action.type === 'discard-table' || action.type === 'submit' ? { ...action, problem: target } : action);
  } else {
    runAction(next, action);
    executeQueuedSubmission(next);
  }
  return next;
}

export function setPaused(match: Match, paused: boolean): Match {
  if (match.status !== 'playing') return match;
  const next = structuredClone(match);
  next.paused = paused;
  if (!paused) {
    const actions = next.pendingActions;
    next.pendingActions = [];
    for (const action of actions) {
      runAction(next, action, true);
      executeQueuedSubmission(next);
    }
    startNextCard(next, next.currentProblem);
    executeQueuedSubmission(next);
  }
  return next;
}

function startNextCard(match: Match, index: number) {
  if (index !== match.currentProblem) return;
  const card = match.problems[index].table.find(item => !item.active);
  if (!card || card.duration !== null) return;
  const coffee = match.globalEffects.coffee;
  card.duration = cardById[card.cardId].time * (coffee && coffee.expiresAt > match.time ? coffee.factor : 1);
}

function activate(match: Match, instance: TableCard) {
  instance.active = true;
  const effect = cardById[instance.cardId].effect;
  if (!effect) return;
  if (effect.kind === 'coffee') match.globalEffects.coffee = { expiresAt: match.time + effect.duration, factor: effect.factor };
  else if (effect.kind === 'draw') match.globalEffects.draw = { expiresAt: match.time + effect.duration, interval: effect.interval };
  else if (effect.kind === 'dice') instance.dice = (1 + Math.floor(random(match) * effect.sides)) * effect.unit;
}

function executeQueuedSubmission(match: Match) {
  if (match.problems[match.currentProblem].submitQueued && canSubmit(match)) submit(match, match.currentProblem);
}

function drawCard(match: Match) {
  if (!match.deck.length && match.discard.length) {
    match.deck = shuffle(match.discard, match);
    match.discard = [];
  }
  const card = match.deck.shift();
  if (card) match.hand.push(card);
}

function advanceOpponents(match: Match) {
  for (const team of match.opponents) {
    if (team.target >= team.order.length || team.nextAction > match.time) continue;
    const index = team.order[team.target];
    const problem = match.problems[index];
    const result = team.results[index];
    const effective = team.strength + (problem.categories.includes(team.preference) ? 250 : 0);
    const chance = Math.min(0.94, 1 / (1 + Math.exp((problem.difficulty - effective) / 350)));
    result.attempts++;
    if (random(match) < chance) {
      result.acTime = match.time;
      team.target++;
      const next = match.problems[team.order[team.target]];
      team.nextAction = match.time + (next ? 18 + Math.max(0, next.difficulty - effective) / 30 + random(match) * 32 : MATCH_DURATION);
    } else if (result.attempts >= 2 && random(match) < 0.35) {
      team.target++;
      team.nextAction = match.time + 15 + random(match) * 25;
    } else team.nextAction = match.time + 10 + random(match) * 24;
  }
}

export function advanceMatch(match: Match, minutes = 1): Match {
  if (match.paused || match.status !== 'playing' || minutes <= 0) return match;
  const next = structuredClone(match);
  let remaining = Math.min(minutes, MATCH_DURATION - next.time);
  while (remaining > 0.000001) {
    startNextCard(next, next.currentProblem);
    const problem = next.problems[next.currentProblem];
    const processing = problem.table.find(card => !card.active);
    const drawInterval = next.globalEffects.draw && next.globalEffects.draw.expiresAt > next.time ? next.globalEffects.draw.interval : 4;
    const boundaries = [remaining, MATCH_DURATION - next.time];
    if (problem.acTime === null && problem.readProgress < problem.readTime) boundaries.push(problem.readTime - problem.readProgress);
    if (processing?.duration !== null && processing) boundaries.push(processing.duration - processing.progress);
    if (next.hand.length < HAND_LIMIT && (next.deck.length || next.discard.length)) boundaries.push(Math.max(0, drawInterval - next.drawProgress));
    for (const effect of Object.values(next.globalEffects)) if (effect.expiresAt > next.time) boundaries.push(effect.expiresAt - next.time);
    for (const team of next.opponents) {
      if (team.target < team.order.length) boundaries.push(Math.max(0, team.nextAction - next.time));
    }
    const dt = Math.min(...boundaries);
    next.time += dt;
    remaining -= dt;
    if (problem.acTime === null && problem.readProgress < problem.readTime) problem.readProgress = Math.min(problem.readTime, problem.readProgress + dt);
    if (processing && processing.duration !== null) processing.progress = Math.min(processing.duration, processing.progress + dt);
    next.drawProgress = next.hand.length < HAND_LIMIT ? next.drawProgress + dt : 0;
    for (const key of ['coffee', 'draw'] as const) {
      if (next.globalEffects[key] && next.globalEffects[key]!.expiresAt <= next.time) delete next.globalEffects[key];
    }
    if (processing && processing.duration !== null && processing.progress >= processing.duration) activate(next, processing);
    if (next.hand.length < HAND_LIMIT && next.drawProgress >= drawInterval) {
      drawCard(next);
      next.drawProgress = 0;
    }
    if (next.time < MATCH_DURATION) advanceOpponents(next);
    if (next.time >= MATCH_DURATION) {
      next.status = 'finished';
      next.paused = false;
      next.pendingActions = [];
      break;
    }
    executeQueuedSubmission(next);
  }
  return next;
}

export function standings(match: Match): Standing[] {
  const playerProblems = match.problems.map(problem => ({
    result: problem.acTime !== null ? 'AC' as const : problem.attempts.length ? 'WA' as const : null,
    attempts: problem.attempts.length,
    time: problem.acTime,
  }));
  const rows = [{ id: 'player', name: '我交我自己', player: true, problems: playerProblems },
    ...match.opponents.map(team => ({ id: team.id, name: team.name, player: false,
      problems: team.results.map(result => ({ result: result.acTime !== null ? 'AC' as const : result.attempts ? 'WA' as const : null, attempts: result.attempts, time: result.acTime })) }))];
  return rows.map(row => ({ ...row,
    solved: row.problems.filter(problem => problem.result === 'AC').length,
    penalty: row.problems.reduce((sum, problem) => sum + (problem.time !== null ? Math.floor(problem.time) + (problem.attempts - 1) * 20 : 0), 0),
    lastAc: Math.max(0, ...row.problems.flatMap(problem => problem.time === null ? [] : [problem.time])), rank: 0,
  })).sort((a, b) => b.solved - a.solved || a.penalty - b.penalty || a.lastAc - b.lastAc).map((row, index) => ({ ...row, rank: index + 1 }));
}

export function settleMatch(profile: Profile, match: Match): { profile: Profile; result: MatchResult } {
  const existing = profile.history.find(result => result.matchId === match.id);
  if (existing) return { profile, result: existing };
  const event = events.find(item => item.id === match.eventId)!;
  const ranking = standings(match);
  const player = ranking.find(row => row.player)!;
  const percentile = player.rank / ranking.length;
  const count = 1 + (player.solved > 0 ? 1 : 0) + (percentile <= 0.3 ? 1 : 0) + (percentile <= 0.1 ? 1 : 0);
  const promoted = event.kind === 'main' && player.solved > 0 && event.promotion !== undefined && percentile <= event.promotion;
  const seasonEnded = event.kind === 'main' && (!promoted || event.id === mainEvents[mainEvents.length - 1].id);
  const result: MatchResult = { matchId: match.id, eventId: match.eventId, rank: player.rank, teams: ranking.length,
    solved: player.solved, penalty: player.penalty, packs: count, promoted, seasonEnded };
  const packs: Pack[] = Array.from({ length: count }, () => ({ id: uniqueId(), eventId: event.id, guarantee: event.guarantee }));
  return { profile: { ...profile, mainIndex: event.kind === 'main' && promoted ? profile.mainIndex + 1 : profile.mainIndex,
    seasonEnded: profile.seasonEnded || seasonEnded, playedEvents: [...profile.playedEvents, event.id], packs: [...profile.packs, ...packs],
    history: [...profile.history, result] }, result };
}

function weightedRarity(minRarity: number, randomValue: number): number {
  const total = rarityWeights.reduce((sum, weight, i) => sum + (i >= minRarity ? weight : 0), 0);
  let point = randomValue * total;
  for (let i = minRarity; i < rarityWeights.length; i++) {
    point -= rarityWeights[i];
    if (point < 0) return i;
  }
  return rarityWeights.length - 1;
}

export function rollPack(guarantee: number, randomValue: () => number = Math.random): string[] {
  const contents: CardDefinition[] = [];
  const techniqueCount = cards.filter(card => card.type === 'technique').length;
  for (let i = 0; i < 5; i++) {
    const needsGuarantee = i === 4 && !contents.some(card => card.rarity >= guarantee);
    if (needsGuarantee) {
      const pool = cards.filter(card => card.rarity >= guarantee).map(card => ({
        card,
        weight: card.type === 'technique' ? 0.2 / techniqueCount :
          0.8 * rarityWeights[card.rarity] / rarityWeights.reduce((sum, value) => sum + value, 0) /
          cards.filter(candidate => candidate.type === 'algorithm' && candidate.rarity === card.rarity).length,
      }));
      let point = randomValue() * pool.reduce((sum, item) => sum + item.weight, 0);
      const chosen = pool.find(item => { point -= item.weight; return point < 0; })!;
      contents.push(chosen.card);
    } else {
      const algorithm = randomValue() < 0.8;
      const rarity = algorithm ? weightedRarity(0, randomValue()) : null;
      const pool = cards.filter(card => algorithm ? card.type === 'algorithm' && card.rarity === rarity : card.type === 'technique');
      contents.push(pool[Math.floor(randomValue() * pool.length)]);
    }
  }
  return contents.map(card => card.id);
}

export function openPack(profile: Profile, index = 0): { profile: Profile; cards: string[] } {
  const pack = profile.packs[index];
  const opened = rollPack(pack.guarantee);
  return { profile: { ...profile, packs: profile.packs.filter((_, i) => i !== index) }, cards: opened };
}

export function collectCard(profile: Profile, cardId: string): Profile {
  return { ...profile, collection: { ...profile.collection, [cardId]: (profile.collection[cardId] ?? 0) + 1 } };
}
