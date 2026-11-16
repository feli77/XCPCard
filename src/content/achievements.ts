import type { AchievementDefinition, AchievementMetric, AchievementReward } from './types';

const funny = (id: string, title: string, description: string, conditionText: string, metric: AchievementMetric, reward: AchievementReward, hidden = false): AchievementDefinition => ({
  id, title, description, category: '搞笑', hidden,
  levels: [{ id: '1', title: '达成', conditionText, condition: { kind: 'match', metric, target: 1 }, reward }],
});
export const achievementDefinitions: AchievementDefinition[] = [
  { id: 'sorting', category: '收集', title: '排序全家桶', description: '复杂度可以不同，队形必须整齐。', hidden: false,
    levels: [{ id: '1', title: '集齐', conditionText: '曾入藏快速、插入、冒泡、选择、计数和归并排序各一张',
      condition: { kind: 'cards', cardIds: ['quick-sort', 'insertion-sort', 'bubble-sort', 'selection-sort', 'counting-sort', 'merge-sort'] }, reward: { kind: 'card', cardId: 'binary-heap', count: 1 } }] },
  { id: 'geometry', category: '收集', title: '几何不会就是不会', description: '图画得很对，答案另说。', hidden: false,
    levels: [{ id: '1', title: '入门', conditionText: '曾入藏 5 种不同的计算几何卡牌', condition: { kind: 'category', category: '计算几何', count: 5 }, reward: { kind: 'pack', guarantee: 0 } }] },
  { id: 'gold', category: '荣誉', title: '金牌只是起点', description: '下一站继续坐牢。', hidden: false,
    levels: (['regional', 'ecf', 'wf'] as const).map((eventId, i) => ({ id: eventId, title: ['区域赛', 'EC-Final', 'World Finals'][i],
      conditionText: `获得${['区域赛', 'EC-Final', 'World Finals'][i]}金牌`, condition: { kind: 'gold', eventId }, reward: { kind: 'pack', guarantee: i + 2 } })) },
  { id: 'retry', category: '搞笑', title: '再交一发就过', description: '这次真的只差一点。', hidden: false,
    levels: [1, 3, 5].map((target, i) => ({ id: String(target), title: `第 ${i + 1} 级`, conditionText: `同一道题至少 ${target} 次未通过提交后 AC`, condition: { kind: 'match', metric: 'retries', target },
      reward: i === 2 ? { kind: 'pack', guarantee: 0 } : { kind: 'points', amount: [50, 100][i] } })) },
  funny('last-minute', '留给中国队的时间不多了', '现在开始相信奇迹。', '最后 5 分钟提交并最终 AC（295 ≤ 提交时间 < 300）', 'late-ac', { kind: 'pack', guarantee: 0 }, true),
  funny('sample', '样例居然没骗人', '过了，别碰它。', '某题首次提交即 AC', 'first-try', { kind: 'points', amount: 50 }),
  funny('warmup', '四小时热身', '刚找到比赛状态。', '本场首次 AC 的提交时间不早于第 240 分钟', 'late-start', { kind: 'card', cardId: 'coffee', count: 1 }, true),
  funny('proof', '证明略', '正确性由评测机补全。', '提交分数低于题目难度，最终 AC', 'under-score', { kind: 'card', cardId: 'template', count: 1 }, true),
  funny('verdicts', '评测机今天认识我了', '一个题号，四种死法。', '同题经历 WA、TLE、MLE、RE 后 AC', 'all-verdicts', { kind: 'pack', guarantee: 0 }, true),
  funny('attendance', '来都来了', '提交记录证明我来过。', '完赛时至少提交一次，且零 AC', 'zero-ac', { kind: 'points', amount: 50 }, true),
  funny('penalty', '罚时管理大师', '错题本暂时用不上。', '完赛至少 3 AC，所有已解题均一次通过', 'clean-sweep', { kind: 'pack', guarantee: 0 }),
];
