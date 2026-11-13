# XCPCard

五分钟一场的算法竞赛卡牌游戏。初始获得 8 个普通卡包，开包后组建最多 24 张的卡组，读题、排队出牌、提交，带着比赛奖励继续下一站。

运行：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。收藏、卡组、赛季及比赛自动保存在浏览器；刷新后比赛暂停，点击“继续比赛”恢复。

```sh
npm test          # 规则测试
npm run test:e2e # 浏览器流程测试，首次运行需 npx playwright install chromium
npm run build   # 生产构建
```

卡牌、题名、队名与赛事配置在 `src/content/`，比赛及赛季规则在 `src/game/`，界面在 `src/ui/`。新卡沿用现有效果时只需添加内容数据；新效果需扩展效果类型和引擎处理。
