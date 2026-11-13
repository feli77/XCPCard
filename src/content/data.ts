import type { CardDefinition, EventDefinition, RarityDefinition } from './types';

export const rarities: RarityDefinition[] = [
  { name: '灰', color: '#858580', pattern: 'dots' },
  { name: '绿', color: '#638968', pattern: 'stripes' },
  { name: '青', color: '#528f94', pattern: 'crosses' },
  { name: '蓝', color: '#577eae', pattern: 'grid' },
  { name: '紫', color: '#9274a7', pattern: 'diamonds' },
  { name: '橙', color: '#bd8a50', pattern: 'chevrons' },
  { name: '红', color: '#bd6262', pattern: 'stars' },
  { name: '黑红', color: '#6c3540', pattern: 'circuit' },
];

export const rarityWeights = [0.4, 0.28, 0.16, 0.09, 0.04, 0.02, 0.008, 0.002];

export const cards: CardDefinition[] = [
  { id: 'enumerate', name: '枚举', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '所有答案都试试，总有一个没意见。', art: 'grid' },
  { id: 'quick-sort', name: '快速排序', type: 'algorithm', rarity: 0, score: 350, time: 4, categories: ['基础算法'], joke: '先排好队，再决定谁先过。', art: 'sort' },
  { id: 'two-pointers', name: '双指针', type: 'algorithm', rarity: 0, score: 350, time: 4, categories: ['基础算法'], joke: '两个人向中间走，总得碰个面。', art: 'search' },
  { id: 'prefix-sum', name: '前缀和', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['基础算法'], joke: '前人算过的账，后人直接减。', art: 'grid' },
  { id: 'gcd', name: '欧几里得算法', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '不停取余，直到双方都没余地。', art: 'math' },
  { id: 'sieve', name: '埃氏筛', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '把合数筛掉，质数就很突出。', art: 'grid' },
  { id: 'bfs', name: 'BFS', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['图论'], joke: '一层一层找，主打一个不插队。', art: 'graph' },
  { id: 'dfs', name: 'DFS', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['图论'], joke: '一条路走到黑，还好记得回头。', art: 'tree' },
  { id: 'binary-search', name: '二分查找', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '答案夹在中间，先砍掉一半。', art: 'search' },
  { id: 'knapsack', name: '0/1 背包', type: 'algorithm', rarity: 1, score: 400, time: 6, categories: ['DP'], joke: '都想带走，可惜背包不同意。', art: 'bag' },
  { id: 'greedy', name: '贪心', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '眼前选最好的，证明交给队友。', art: 'sort' },
  { id: 'difference', name: '差分', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '两头记一笔，中间自己悟。', art: 'grid' },
  { id: 'union-find', name: '并查集', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['数据结构', '图论'], joke: '先认个祖宗，再谈是不是一家人。', art: 'tree' },
  { id: 'fast-power', name: '快速幂', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['数学'], joke: '乘得太慢？把自己平方一下。', art: 'math' },
  { id: 'dijkstra', name: 'Dijkstra', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '绕路可以，负权不行。', art: 'graph' },
  { id: 'kruskal', name: 'Kruskal', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '最便宜的边先牵手，成环就分手。', art: 'tree' },
  { id: 'topological-sort', name: '拓扑排序', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '先做先修课，别让依赖打成结。', art: 'graph' },
  { id: 'fenwick-tree', name: '树状数组', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['数据结构'], joke: 'lowbit 很小，管的事不少。', art: 'tree' },
  { id: 'kmp', name: 'KMP', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['字符串'], joke: '匹配失败没关系，别从头再爱。', art: 'string' },
  { id: 'interval-dp', name: '区间 DP', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['DP'], joke: '小区间先凑合，大区间抄答案。', art: 'grid' },
  { id: 'segment-tree', name: '线段树', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['数据结构'], joke: '区间的事，分几个部门处理。', art: 'tree' },
  { id: 'lca', name: '最近公共祖先', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['图论', '数据结构'], joke: '往上翻家谱，总能翻到同一个人。', art: 'tree' },
  { id: 'convex-hull', name: '凸包', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['计算几何'], joke: '一根橡皮筋，圈住全场显眼包。', art: 'geometry' },
  { id: 'matrix-power', name: '矩阵快速幂', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['数学', 'DP'], joke: '递推太长，就让矩阵替你加班。', art: 'math' },
  { id: 'tarjan', name: 'Tarjan', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['图论'], joke: '绕来绕去，原来大家都在一个圈。', art: 'graph' },
  { id: 'heavy-light', name: '重链剖分', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['图论', '数据结构'], joke: '把树拆成链，树表示意见很大。', art: 'tree' },
  { id: 'aho-corasick', name: 'AC 自动机', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['字符串'], joke: '名字里有 AC，提交前还是要检查。', art: 'string' },
  { id: 'digit-dp', name: '数位 DP', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['数学', 'DP'], joke: '数太大数不完，那就按位讨价还价。', art: 'grid' },
  { id: 'fft', name: 'FFT', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '换个世界乘一乘，再穿越回来。', art: 'math' },
  { id: 'ntt', name: 'NTT', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '不想处理精度，就换个模数生活。', art: 'math' },
  { id: 'suffix-array', name: '后缀数组', type: 'algorithm', rarity: 5, score: 1050, time: 13, categories: ['字符串'], joke: '把每个后缀排一遍，故事就有顺序了。', art: 'string' },
  { id: 'min-cost-flow', name: '最小费用最大流', type: 'algorithm', rarity: 5, score: 1050, time: 13, categories: ['图论'], joke: '流量要拉满，经费还得省。', art: 'graph' },
  { id: 'persistent-segment-tree', name: '可持久化线段树', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['数据结构'], joke: '旧版本全保留，祖传 bug 也能查。', art: 'tree' },
  { id: 'suffix-automaton', name: '后缀自动机', type: 'algorithm', rarity: 6, score: 1250, time: 15, categories: ['字符串'], joke: '子串太多记不住，那就造台机器。', art: 'string' },
  { id: 'cdq', name: 'CDQ 分治', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['基础算法', '数据结构'], joke: '把问题分开谈，贡献回头再算。', art: 'sort' },
  { id: 'polynomial', name: '多项式牛顿迭代', type: 'algorithm', rarity: 6, score: 1300, time: 16, categories: ['数学'], joke: '答案先猜一点，每轮把信心翻倍。', art: 'math' },
  { id: 'link-cut-tree', name: 'Link-Cut Tree', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['数据结构', '图论'], joke: '今天连，明天断，树也过上动态人生。', art: 'tree' },
  { id: 'dynamic-dp', name: '动态 DP', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['DP', '数据结构'], joke: '答案天天变，转移矩阵只好连夜上班。', art: 'grid' },
  { id: 'min25', name: 'Min_25 筛', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['数学'], joke: '数字大得离谱，筛子也得读过论文。', art: 'math' },
  { id: 'half-plane', name: '动态半平面交', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['计算几何', '数据结构'], joke: '每人划一条线，看看还有没有生存空间。', art: 'geometry' },
  { id: 'template', name: '祖传模板', type: 'technique', rarity: 0, score: 0, time: 3, categories: [], joke: '祖宗说能过。', effect: { kind: 'multiplier', amount: 0.2 }, effectText: '本题总分 +20%；离桌时销毁并移除加成。', art: 'template' },
  { id: 'coffee', name: '咖啡', type: 'technique', rarity: 1, score: 0, time: 2, categories: [], joke: '把明天的精神借过来。', effect: { kind: 'coffee', duration: 60, factor: 0.75 }, effectText: '全局持续 60 分钟：其间开始处理的卡牌耗时 −25%；再次触发刷新时长。离桌时销毁。', art: 'coffee' },
  { id: 'maimai', name: '舞萌曲谱', type: 'technique', rarity: 2, score: 0, time: 4, categories: [], joke: '手速没用在正地方，但有用。', effect: { kind: 'draw', duration: 45, interval: 3 }, effectText: '全局持续 45 分钟：抽牌间隔由 4 分钟缩短为 3 分钟；再次触发刷新时长。离桌时销毁。', art: 'music' },
  { id: 'dice', name: '骰子', type: 'technique', rarity: 3, score: 0, time: 2, categories: [], joke: '证明略，点数如下。', effect: { kind: 'dice', sides: 6, unit: 100 }, effectText: '生效时等概率为本题增加 100～600 分；离桌时销毁并移除加分。', art: 'dice' },
];

export const initialDeck: string[] = [
  'enumerate', 'binary-search', 'quick-sort', 'two-pointers', 'prefix-sum',
  'gcd', 'sieve', 'bfs', 'dfs', 'knapsack', 'template', 'coffee',
].flatMap(id => [id, id]);

export const events: EventDefinition[] = [
  { id: 'school', name: '校赛', shortName: '校赛', kind: 'main', problems: 10, minDifficulty: 800, maxDifficulty: 1800, promotion: 0.5, guarantee: 0, description: '前 50% 且至少 1 AC 晋级网络赛。' },
  { id: 'online', name: '网络赛', shortName: '网络赛', kind: 'main', problems: 11, minDifficulty: 1000, maxDifficulty: 2200, promotion: 0.4, guarantee: 0, description: '前 40% 且至少 1 AC 晋级区域赛。' },
  { id: 'regional', name: '区域赛', shortName: '区域赛', kind: 'main', problems: 12, minDifficulty: 1400, maxDifficulty: 3000, promotion: 0.25, guarantee: 2, description: '前 25% 且至少 1 AC 晋级 ECF。' },
  { id: 'ecf', name: 'ECF', shortName: 'ECF', kind: 'main', problems: 13, minDifficulty: 1600, maxDifficulty: 3300, promotion: 0.2, guarantee: 3, description: '前 20% 且至少 1 AC 晋级 WF。' },
  { id: 'wf', name: 'WF', shortName: 'WF', kind: 'main', problems: 13, minDifficulty: 1800, maxDifficulty: 3500, guarantee: 4, description: '赛季终站。把模板带到世界尽头。' },
  { id: 'provincial', name: '省赛', shortName: '省赛', kind: 'side', problems: 11, minDifficulty: 1200, maxDifficulty: 2600, guarantee: 2, description: '赛季支线，每季一次；奖励卡包，不影响主线资格。' },
  { id: 'invitational', name: '邀请赛', shortName: '邀请赛', kind: 'side', problems: 12, minDifficulty: 1200, maxDifficulty: 2600, guarantee: 2, description: '赛季支线，每季一次；奖励卡包，不影响主线资格。' },
];

export const problemNames = [
  '签到题，但谁来签', '小明又有一棵树', '这次真不是 DP', '请输出显然',
  '样例只有一行', '没有负环的星期一', '排列组合与我无关', '最后一分钟的提交',
  '树上没有免费午餐', '老板又改需求了', '一眼题，第二眼不会', '区间里的邻里关系',
  '字符串想要一个家', '数学老师的报复', '所有点都很有意见', '小数点后第几位',
  '从前有座连通图', '背包里不能装队友', '这题有很多解', '证明留作赛后习题',
  '你画的圆不太圆', '模数是一种生活态度', '消失的边界条件', '复杂度过于美丽',
  '答案在风中排序', '每棵树都有根', '反正不是贪心', '你醒啦，已经超时了',
  '前缀和后缀的误会', '最短的路也要排队', '并不存在的特殊情况', '今天也在等一个 AC',
  '会场空调有点冷', '评测姬正在喝茶', '只有小明没有朋友', '数组从几开始',
  '平面上禁止内卷', '二分答案还是二分自己', '栈里还有多少梦想', '我们仍未知道那天的题意',
];

export const teamNames = [
  '样例过了就是过了', '这题我去年见过', '三个人四种思路', '先吃饭再说',
  '我们真的有模板', '编译器不同意', '罚时是我们的勋章', 'O(能过)',
  '看榜五分钟', '递归到天亮', '队友说显然', '气球批发市场',
  '交完这发就睡', '暴力也是一种美', '我负责热键盘', '浮点误差不背锅',
  'long long ago', '没有队名的队', '别改了已经过了', '请把题目读完',
  '今天不写分号', '从零开始爆栈', '机房最后的灯', '第三个样例呢',
];
