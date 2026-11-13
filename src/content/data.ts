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
  // 算法卡
  // 灰（0）
  { id: 'enumerate', name: '枚举', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '所有答案都试试，总有一个没意见。', art: 'grid' },
  { id: 'quick-sort', name: '快速排序', type: 'algorithm', rarity: 0, score: 350, time: 4, categories: ['基础算法'], joke: '先排好队，再决定谁先过。', art: 'sort' },
  { id: 'two-pointers', name: '双指针', type: 'algorithm', rarity: 0, score: 350, time: 4, categories: ['基础算法'], joke: '两个人向中间走，总得碰个面。', art: 'search' },
  { id: 'prefix-sum', name: '前缀和', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['基础算法'], joke: '前人算过的账，后人直接减。', art: 'grid' },
  { id: 'gcd', name: '欧几里得算法', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '不停取余，直到双方都没余地。', art: 'math' },
  { id: 'sieve', name: '埃氏筛', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '把合数筛掉，质数就很突出。', art: 'grid' },
  { id: 'bfs', name: 'BFS', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['图论'], joke: '一层一层找，主打一个不插队。', art: 'graph' },
  { id: 'dfs', name: 'DFS', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['图论'], joke: '一条路走到黑，还好记得回头。', art: 'tree' },
  { id: 'insertion-sort', name: '插入排序', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '摸一张牌，找个位置插队。', art: 'sort' },
  { id: 'simulation', name: '模拟', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '题目说怎么做，咱就老实怎么做。', art: 'grid' },
  { id: 'sliding-window', name: '滑动窗口', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['基础算法'], joke: '窗口往右挪，风景也跟着更新。', art: 'search' },
  { id: 'horner', name: '秦九韶算法', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '括号套得好，乘法省不少。', art: 'math' },
  { id: 'flood-fill', name: '洪水填充', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['图论'], joke: '从一个格子出发，把邻居都叫醒。', art: 'grid' },
  { id: 'bubble-sort', name: '冒泡排序', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '两两换座，最大的同学喜提后排 VIP。', art: 'sort' },
  { id: 'selection-sort', name: '选择排序', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '每轮都找最矮的，体育老师直呼内行。', art: 'sort' },
  { id: 'counting-sort', name: '计数排序', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['基础算法'], joke: '不比较谁大，直接查户口排队。', art: 'sort' },
  { id: 'linear-search', name: '顺序查找', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['基础算法'], joke: '挨个敲门，最坏的消息总在最后一家。', art: 'search' },
  { id: 'stack', name: '栈', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['数据结构'], joke: '后来的先走，早来的先熬。', art: 'grid' },
  { id: 'queue', name: '队列', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['数据结构'], joke: '先来先走，终于有个地方讲排队了。', art: 'grid' },
  { id: 'deque', name: '双端队列', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数据结构'], joke: '两头都能进出，排队也能开双向门。', art: 'grid' },
  { id: 'linked-list', name: '链表', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数据结构'], joke: '大家靠地址保持联系，搬家前记得改通讯录。', art: 'graph' },
  { id: 'trial-division-primality', name: '试除法判素数', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '查到平方根就下班，后面的因子有同伙。', art: 'math' },
  { id: 'trial-division-factorization', name: '试除法分解质因数', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: '小因子请出去，剩下的大佬终于露面。', art: 'math' },
  { id: 'radix-conversion', name: '进制转换', type: 'algorithm', rarity: 0, score: 300, time: 4, categories: ['数学'], joke: '十进制待不下去了？换个底重新做人。', art: 'math' },
  { id: 'big-integer-addition', name: '高精度加法', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['数学'], joke: 'int 说装不下，我说一位一位来。', art: 'math' },
  { id: 'subset-enumeration', name: '子集枚举', type: 'algorithm', rarity: 0, score: 350, time: 5, categories: ['基础算法'], joke: '每样拿不拿都纠结，干脆把购物车穷举了。', art: 'grid' },

  // 绿（1）
  { id: 'binary-search', name: '二分查找', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '答案夹在中间，先砍掉一半。', art: 'search' },
  { id: 'knapsack', name: '0/1 背包', type: 'algorithm', rarity: 1, score: 400, time: 6, categories: ['DP'], joke: '都想带走，可惜背包不同意。', art: 'bag' },
  { id: 'greedy', name: '贪心', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '眼前选最好的，证明交给队友。', art: 'sort' },
  { id: 'difference', name: '差分', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '两头记一笔，中间自己悟。', art: 'grid' },
  { id: 'union-find', name: '并查集', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['数据结构', '图论'], joke: '先认个祖宗，再谈是不是一家人。', art: 'tree' },
  { id: 'fast-power', name: '快速幂', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['数学'], joke: '乘得太慢？把自己平方一下。', art: 'math' },
  { id: 'monotonic-stack', name: '单调栈', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['数据结构'], joke: '后来者更强，前面的人请出栈。', art: 'sort' },
  { id: 'merge-sort', name: '归并排序', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '先各自排好，再体面地合并。', art: 'sort' },
  { id: 'binary-search-answer', name: '二分答案', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['基础算法'], joke: '答案能不能做到？先猜一个问问。', art: 'search' },
  { id: 'complete-knapsack', name: '完全背包', type: 'algorithm', rarity: 1, score: 400, time: 6, categories: ['DP'], joke: '东西可以拿无数次，背包只有一个。', art: 'bag' },
  { id: 'binary-heap', name: '二叉堆', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['数据结构'], joke: '谁最小谁出头，剩下的人继续卷上级。', art: 'tree' },
  { id: 'coordinate-compression', name: '离散化', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '身价几个亿没关系，排名只给一个座位。', art: 'sort' },
  { id: 'linear-sieve', name: '线性筛', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['数学'], joke: '每个合数只挨一刀，拒绝重复劳动。', art: 'grid' },
  { id: 'extended-euclid', name: '扩展欧几里得', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['数学'], joke: '公约数找到了，顺手把 x 和 y 也抓来对账。', art: 'math' },
  { id: 'pascal-triangle', name: '杨辉三角', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['数学', 'DP'], joke: '上面两位凑个份子，下面的组合数就有了。', art: 'grid' },
  { id: 'longest-common-subsequence', name: '最长公共子序列', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['DP', '字符串'], joke: '删掉分歧后，我们居然还有这么多共同语言。', art: 'string' },
  { id: 'edit-distance', name: '编辑距离', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['DP', '字符串'], joke: '我们之间的距离，需要几次增删改才能挽回？', art: 'string' },
  { id: 'rolling-array', name: '滚动数组', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['DP'], joke: '昨天的作业交完就擦，内存租不起那么多房。', art: 'grid' },
  { id: 'interval-scheduling', name: '区间调度', type: 'algorithm', rarity: 1, score: 400, time: 5, categories: ['基础算法'], joke: '谁先结束就约谁，时间管理大师的贪心日程。', art: 'sort' },
  { id: 'ternary-search', name: '三分查找', type: 'algorithm', rarity: 1, score: 450, time: 6, categories: ['基础算法'], joke: '单峰才敢两边试探，多峰会让它当场迷路。', art: 'search' },

  // 青（2）
  { id: 'dijkstra', name: 'Dijkstra', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '绕路可以，负权不行。', art: 'graph' },
  { id: 'kruskal', name: 'Kruskal', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '最便宜的边先牵手，成环就分手。', art: 'tree' },
  { id: 'topological-sort', name: '拓扑排序', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '先做先修课，别让依赖打成结。', art: 'graph' },
  { id: 'fenwick-tree', name: '树状数组', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['数据结构'], joke: 'lowbit 很小，管的事不少。', art: 'tree' },
  { id: 'kmp', name: 'KMP', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['字符串'], joke: '匹配失败没关系，别从头再爱。', art: 'string' },
  { id: 'floyd', name: 'Floyd', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '两个人走不通，就找中间人介绍。', art: 'graph' },
  { id: 'trie', name: '字典树', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['字符串', '数据结构'], joke: '前缀相同的，先走同一条路。', art: 'tree' },
  { id: 'lis', name: '最长上升子序列', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['DP'], joke: '人生可以跳着走，但数字得往上。', art: 'sort' },
  { id: 'prim', name: 'Prim', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['图论'], joke: '从一个群友开始，谁入群便宜就拉谁。', art: 'tree' },
  { id: 'bellman-ford', name: 'Bellman-Ford', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['图论'], joke: '每条边都劝一遍，负环还在无限砍价。', art: 'graph' },
  { id: 'a-star', name: 'A* 搜索', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['基础算法', '图论'], joke: '已走的路加未来预算，导航开始有了盼头。', art: 'search' },
  { id: 'sparse-table', name: 'ST 表', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['数据结构'], joke: '区间可以重叠，最值不收双份工资。', art: 'grid' },
  { id: 'rolling-hash', name: '字符串哈希', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['字符串'], joke: '长字符串先领身份证，撞号了就尴尬。', art: 'string' },
  { id: 'tree-diameter', name: '树的直径', type: 'algorithm', rarity: 2, score: 550, time: 7, categories: ['图论'], joke: '从最远处再跑一趟，树的极限通勤找到了。', art: 'tree' },
  { id: 'euler-totient', name: '欧拉函数', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['数学'], joke: '给互质居民发通行证，质因子负责查户口。', art: 'math' },
  { id: 'monotonic-queue', name: '单调队列', type: 'algorithm', rarity: 2, score: 500, time: 6, categories: ['数据结构'], joke: '新来的又强又年轻，老同事当场出队。', art: 'sort' },

  // 蓝（3）
  { id: 'interval-dp', name: '区间 DP', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['DP'], joke: '小区间先凑合，大区间抄答案。', art: 'grid' },
  { id: 'segment-tree', name: '线段树', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['数据结构'], joke: '区间的事，分几个部门处理。', art: 'tree' },
  { id: 'lca', name: '最近公共祖先', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['图论', '数据结构'], joke: '往上翻家谱，总能翻到同一个人。', art: 'tree' },
  { id: 'convex-hull', name: '凸包', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['计算几何'], joke: '一根橡皮筋，圈住全场显眼包。', art: 'geometry' },
  { id: 'matrix-power', name: '矩阵快速幂', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['数学', 'DP'], joke: '递推太长，就让矩阵替你加班。', art: 'math' },
  { id: 'tree-dp', name: '树形 DP', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['DP', '图论'], joke: '孩子们先商量，家长最后拍板。', art: 'tree' },
  { id: 'state-compression-dp', name: '状压 DP', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['DP'], joke: '人太多记不住，就把大家塞进二进制。', art: 'grid' },
  { id: 'manacher', name: 'Manacher', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['字符串'], joke: '回文照镜子，半边的信息两边用。', art: 'string' },
  { id: 'gaussian-elimination', name: '高斯消元', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['数学'], joke: '未知数挨个请出去，方程终于说人话了。', art: 'math' },
  { id: 'chinese-remainder', name: '中国剩余定理', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['数学'], joke: '每个模数都有要求，答案只好开协调会。', art: 'math' },
  { id: 'hungarian', name: '匈牙利算法', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['图论'], joke: '对象被抢别急，顺着增广路再介绍一个。', art: 'graph' },
  { id: 'eulerian-path', name: '欧拉路径', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['图论'], joke: '一笔画完所有边，橡皮今天可以下班。', art: 'graph' },
  { id: 'meet-in-the-middle', name: '折半搜索', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['基础算法'], joke: '两边各穷举一半，在中间相亲成功。', art: 'search' },
  { id: 'sqrt-decomposition', name: '分块', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['数据结构'], joke: '整块交给批发，边角留给零售。', art: 'grid' },
  { id: 'monotonic-queue-dp', name: '单调队列优化 DP', type: 'algorithm', rarity: 3, score: 700, time: 9, categories: ['DP', '数据结构'], joke: '队列只留潜力股，过气决策请退群。', art: 'sort' },
  { id: 'bounded-knapsack', name: '多重背包', type: 'algorithm', rarity: 3, score: 650, time: 8, categories: ['DP'], joke: '同款限购几件，老板按二进制打包。', art: 'bag' },

  // 紫（4）
  { id: 'tarjan', name: 'Tarjan', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['图论'], joke: '绕来绕去，原来大家都在一个圈。', art: 'graph' },
  { id: 'heavy-light', name: '重链剖分', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['图论', '数据结构'], joke: '把树拆成链，树表示意见很大。', art: 'tree' },
  { id: 'aho-corasick', name: 'AC 自动机', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['字符串'], joke: '名字里有 AC，提交前还是要检查。', art: 'string' },
  { id: 'digit-dp', name: '数位 DP', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['数学', 'DP'], joke: '数太大数不完，那就按位讨价还价。', art: 'grid' },
  { id: 'dinic', name: 'Dinic', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['图论'], joke: '先分层，再让流量排队通过。', art: 'graph' },
  { id: 'mo', name: '莫队', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['基础算法', '数据结构'], joke: '问题排个队，指针少走冤枉路。', art: 'sort' },
  { id: 'splay', name: 'Splay', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['数据结构'], joke: '谁刚被访问，谁就转到最上面。', art: 'tree' },
  { id: 'fhq-treap', name: 'FHQ Treap', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['数据结构'], joke: '合久必分，分久必合，旋转就免了。', art: 'tree' },
  { id: 'leftist-heap', name: '左偏树', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['数据结构'], joke: '宁可左边挤成团，也不让右边排长队。', art: 'tree' },
  { id: 'dsu-on-tree', name: '树上启发式合并', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['图论', '数据结构'], joke: '重儿子的家当留着，轻儿子搬完就撤。', art: 'tree' },
  { id: 'convex-hull-trick', name: '斜率优化 DP', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['DP', '计算几何'], joke: '转移方程站成一排，没用的直线当场失业。', art: 'geometry' },
  { id: 'sweep-line', name: '扫描线', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['计算几何', '数据结构'], joke: '平面上的麻烦，排好时间一个个处理。', art: 'geometry' },
  { id: 'xor-basis', name: '线性基', type: 'algorithm', rarity: 4, score: 800, time: 10, categories: ['数学'], joke: '数字可以精简，异或的排面不能缩水。', art: 'math' },
  { id: 'extended-crt', name: '扩展中国剩余定理', type: 'algorithm', rarity: 4, score: 850, time: 11, categories: ['数学'], joke: '模数不互质也能谈，条件不合就散会。', art: 'math' },

  // 橙（5）
  { id: 'fft', name: 'FFT', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '换个世界乘一乘，再穿越回来。', art: 'math' },
  { id: 'ntt', name: 'NTT', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '不想处理精度，就换个模数生活。', art: 'math' },
  { id: 'suffix-array', name: '后缀数组', type: 'algorithm', rarity: 5, score: 1050, time: 13, categories: ['字符串'], joke: '把每个后缀排一遍，故事就有顺序了。', art: 'string' },
  { id: 'min-cost-flow', name: '最小费用最大流', type: 'algorithm', rarity: 5, score: 1050, time: 13, categories: ['图论'], joke: '流量要拉满，经费还得省。', art: 'graph' },
  { id: 'centroid-decomposition', name: '点分治', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['图论'], joke: '找到树的重心，再把问题各个击破。', art: 'tree' },
  { id: 'exkmp', name: '扩展 KMP', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['字符串'], joke: '前缀有多像，让每个位置自己回答。', art: 'string' },
  { id: 'mobius-inversion', name: '莫比乌斯反演', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '约数把贡献裹了几层，莫比乌斯负责拆快递。', art: 'math' },
  { id: 'lagrange-interpolation', name: '拉格朗日插值', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '给够几个点，整条多项式都得交代。', art: 'math' },
  { id: 'half-plane-intersection', name: '半平面交', type: 'algorithm', rarity: 5, score: 1050, time: 13, categories: ['计算几何'], joke: '每条直线都想划地盘，最后只剩共同出租屋。', art: 'geometry' },
  { id: 'fwt', name: 'FWT', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['数学'], joke: '别人卷乘法，我把与、或、异或都卷了。', art: 'math' },
  { id: 'li-chao-tree', name: '李超线段树', type: 'algorithm', rarity: 5, score: 1050, time: 13, categories: ['数据结构', '计算几何'], joke: '直线也要竞聘上岗，中点面试，区间分配。', art: 'tree' },
  { id: 'virtual-tree', name: '虚树', type: 'algorithm', rarity: 5, score: 1000, time: 12, categories: ['图论', '数据结构'], joke: '关键点开家长会，LCA 被迫全勤。', art: 'tree' },

  // 红（6）
  { id: 'segment-tree-divide-conquer', name: '线段树分治', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['数据结构', '基础算法'], joke: '把时间切成段，撤销键终于当上了主角。', art: 'tree' },
  { id: 'tree-of-trees', name: '树套树', type: 'algorithm', rarity: 6, score: 1250, time: 15, categories: ['数据结构'], joke: '一棵树管不住，就给每个部门再种一棵。', art: 'tree' },
  { id: 'long-chain-decomposition', name: '长链剖分', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['图论', 'DP'], joke: '挑最高的子树当长子，DP 数组直接继承家产。', art: 'tree' },
  { id: 'persistent-segment-tree', name: '可持久化线段树', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['数据结构'], joke: '旧版本全保留，祖传 bug 也能查。', art: 'tree' },
  { id: 'suffix-automaton', name: '后缀自动机', type: 'algorithm', rarity: 6, score: 1250, time: 15, categories: ['字符串'], joke: '子串太多记不住，那就造台机器。', art: 'string' },
  { id: 'cdq', name: 'CDQ 分治', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['基础算法', '数据结构'], joke: '把问题分开谈，贡献回头再算。', art: 'sort' },
  { id: 'polynomial', name: '多项式牛顿迭代', type: 'algorithm', rarity: 6, score: 1300, time: 16, categories: ['数学'], joke: '答案先猜一点，每轮把信心翻倍。', art: 'math' },
  { id: 'polynomial-inverse', name: '多项式求逆', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['数学'], joke: '乘起来要等于一，先从一项项试起。', art: 'math' },
  { id: 'palindromic-tree', name: '回文自动机', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['字符串', '数据结构'], joke: '回文太多，就请它们在树上安家。', art: 'tree' },
  { id: 'polynomial-logarithm', name: '多项式对数', type: 'algorithm', rarity: 6, score: 1250, time: 15, categories: ['数学'], joke: '求导、求逆、再积分，取个对数还得跑三个窗口。', art: 'math' },
  { id: 'polynomial-exponential', name: '多项式指数', type: 'algorithm', rarity: 6, score: 1300, time: 16, categories: ['数学'], joke: '说好只是算个指数，结果先把对数学会了。', art: 'math' },
  { id: 'parallel-binary-search', name: '整体二分', type: 'algorithm', rarity: 6, score: 1200, time: 14, categories: ['基础算法', '数据结构'], joke: '所有询问一起团购答案，统一享受折半优惠。', art: 'search' },

  // 黑红（7）
  { id: 'link-cut-tree', name: 'Link-Cut Tree', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['数据结构', '图论'], joke: '今天连，明天断，树也过上动态人生。', art: 'tree' },
  { id: 'dynamic-dp', name: '动态 DP', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['DP', '数据结构'], joke: '答案天天变，转移矩阵只好连夜上班。', art: 'grid' },
  { id: 'min25', name: 'Min_25 筛', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['数学'], joke: '数字大得离谱，筛子也得读过论文。', art: 'math' },
  { id: 'half-plane', name: '动态半平面交', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['计算几何', '数据结构'], joke: '每人划一条线，看看还有没有生存空间。', art: 'geometry' },
  { id: 'dynamic-convex-hull', name: '动态凸包', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['计算几何', '数据结构'], joke: '点来点去，橡皮筋也得跟着加班。', art: 'geometry' },
  { id: 'segment-tree-merge', name: '线段树合并', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['数据结构'], joke: '两棵树开会，重叠的部门当场合并。', art: 'tree' },
  { id: 'du-jiao-sieve', name: '杜教筛', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['数学'], joke: '筛不动就递归，把大数难题层层转包。', art: 'math' },
  { id: 'berlekamp-massey', name: 'Berlekamp-Massey', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['数学'], joke: '看几项就敢猜递推，主打有理有据地算命。', art: 'math' },
  { id: 'bostan-mori', name: 'Bostan-Mori', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['数学'], joke: '第 n 项不想排队，那就把 n 一路对半砍。', art: 'math' },
  { id: 'simplex', name: '单纯形法', type: 'algorithm', rarity: 7, score: 1450, time: 17, categories: ['数学'], joke: '沿着顶点反复横跳，名字单纯，心眼全是最优。', art: 'geometry' },
  { id: 'blossom', name: '带花树', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['图论'], joke: '奇环把相亲局搅黄了？缩成一朵花继续配。', art: 'graph' },
  { id: 'sais', name: 'SA-IS', type: 'algorithm', rarity: 7, score: 1500, time: 18, categories: ['字符串'], joke: '先给少数后缀排座位，再诱导全班自觉站好。', art: 'string' },

  // 技巧卡
  // 灰（0）
  { id: 'template', name: '祖传模板', type: 'technique', rarity: 0, score: 0, time: 3, categories: [], joke: '祖宗说能过。', effect: { kind: 'multiplier', amount: 0.2 }, effectText: '本题总分 +20%；离桌时销毁并移除加成。', art: 'template' },

  // 绿（1）
  { id: 'coffee', name: '咖啡', type: 'technique', rarity: 1, score: 0, time: 2, categories: [], joke: '把明天的精神借过来。', effect: { kind: 'coffee', duration: 60, factor: 0.75 }, effectText: '全局持续 60 分钟：其间开始处理的卡牌耗时 −25%；再次触发刷新时长。离桌时销毁。', art: 'coffee' },

  // 青（2）
  { id: 'maimai', name: '舞萌曲谱', type: 'technique', rarity: 2, score: 0, time: 4, categories: [], joke: '手速没用在正地方，但有用。', effect: { kind: 'draw', duration: 45, interval: 3 }, effectText: '全局持续 45 分钟：抽牌间隔由 4 分钟缩短为 3 分钟；再次触发刷新时长。离桌时销毁。', art: 'music' },

  // 蓝（3）
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
  '关于我转生成为测试点这件事', '退役战神归来，发现签到题还没过', '众里寻他千百度，答案却在下标负数', '没有技巧，全是溢出',
  '你这个常数保熟吗', '区间加一，血压加满', '环环相扣，扣的都是分', '薛定谔的可达性',
  '上岸第一剑，先斩递归链', '我推的孩子，怎么又回队头了', '数组越界，但爱无界', '山重水复疑无路，调试输出忘了删',
  '抽屉原理，但抽屉锁了', '这不是 BUG，这是隐藏测试点', '反演了，但没完全反演', '天若有情天亦老，人间正道是打表',
  '数列的尽头是考研', '你甚至不愿叫我一声父节点', '图穷匕见，边穷 RE', '九九八十一难，第八十二个测试点',
  '谁把我的无穷大加溢出了', '你的好友已被移出连通块', '哈希碰撞，责任五五开', '天降大任于斯人也，必先卡其常数',
  '我这棵树可见不得环', '先帝创业未半而内存不足', '两岸猿声啼不住，轻舟卡在输入处', '这个集合没有你的位置',
  '合并同类项，孤立我自己', '答案正确，但没完全正确', '你管这叫期望？', '最小割，割舍不下你',
];

export const teamNames = [
  '样例过了就是过了', '这题我去年见过', '三个人四种思路', '先吃饭再说',
  '我们真的有模板', '编译器不同意', '罚时是我们的勋章', 'O(能过)',
  '看榜五分钟', '递归到天亮', '队友说显然', '气球批发市场',
  '交完这发就睡', '暴力也是一种美', '我负责热键盘', '浮点误差不背锅',
  'long long ago', '没有队名的队', '别改了已经过了', '请把题目读完',
  '今天不写分号', '从零开始爆栈', '机房最后的灯', '第三个样例呢',
  '罚时贷逾期了', '评测机指定受害者', '答案仅队长可见', '键盘保养承包商',
  '我们仨都是读题位', 'cout 不出的人生', '这把算热身', '排名请倒着看',
  'Ctrl Z 救援中心', '会者不难难者退队', '代码和人总得跑一个', '沉默是今晚的编译器',
  '重在参与重载失败', '赛后题解首席读者', '队长正在重新连接', '三个人共享一个脑细胞',
  '请勿投喂隐藏数据', '有向无环有去无回', '不会证明但敢提交', '局部最优全场垫底',
  '封榜前先把嘴封了', '常数大队长', '这不是水题是海啸', '我与标程各执一词',
  '祖传代码拒绝认亲', '过不了就过年', '保底奖请直接联系我', '颁奖时叫醒我们',
  '打表打出工伤', '我们提交的是勇气',
  '牛牛牛', '一路向南', '聪明鸟', '思路堵死',
  '玩扫雷玩的', '入学申请的入字怎么写', '人工选择号', '小黄鸭叛徒',
  '三只大佬', '密码忘了', '铜色传说', '打麻将导致的',
];
