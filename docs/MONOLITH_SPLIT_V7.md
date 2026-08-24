# V7 单体拆分计划

当前 `game.html` 仍然约 8MB。V7 已先完成数值核心外置，但卡牌、角色、领域、剧情、UI 与战斗运行时仍大多嵌在单文件里。

拆分原则：**先外置数据，再拆逻辑；先建立兼容构建，再删除旧内嵌内容。**

## 阶段 A：数据镜像

`scripts/extract-embedded-data.mjs` 能读取旧单文件里的 `data-jjk-single-file-resources` 资源包，把 `data/battle/`、`data/duel/` 与 `assets/duel-dynamics/*.json` 提取到外部目录。首次提取只是迁移镜像，不立刻切换运行来源。

## 阶段 B：外部数据成为真值

为卡牌 / 角色 / 领域建立明确 schema 与加载器。仓库直接 diff 外部数据，构建步骤仍可重新打包单文件供手机离线使用。只有“外部数据 → 构建 → 单文件”可逆且测试通过，才删除旧内嵌真值。

## 阶段 C：剧情与世界线

把剧情节点、时代条件、世界线分支拆成独立数据模块，避免长期靠标题字符串扫描决定关键逻辑。

## 阶段 D：运行时

最后拆战斗运行时和 UI，并把临时函数包装替换为 `onReady / onWheelCommit / onBattleStart / onBattleEnd / onEraChange` 等正式生命周期 API。

V7 采用渐进迁移：每接管一块先加测试，再删除对应旧实现，不为追求目录好看而破坏手机单文件玩法。
