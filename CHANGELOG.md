# Changelog

## V7.1 · 2026-08-24 · 工程基线重构

- 永久把根目录的 ` game.html` 重命名为干净的 `game.html`；Pages 不再依赖部署阶段临时改名。
- `game.html` 源码标题统一为 `咒术转盘 V7 · Unified Data`，由幂等维护脚本检查并修正。
- 新增 `core/v7-model.js`：HP、CE、效率、抗性、物理/术式输出、EX+ 递减成长、软爆发全部集中为纯函数唯一真值。
- `core/v7-data.js` 改为适配层，消费 V7 model，而不是继续拥有第二套公式。
- `core/v7-app.js` 增加旧 SL key 自动迁移，并把永久 `setInterval` 扫描改为有限初始化重试 + 有时限 `MutationObserver`。
- 新增 `JJKV7Lifecycle` 事件桥，提供 `ready / battle-start / wheel-commit` 生命周期事件，为后续删除 monkey-patch 做准备。
- 旧数值补丁 `current / v3 / v3b / v4 / v6` 移入 `archive/legacy-patches/`，线上只保留 V5 流程兼容层。
- README 更新为真实运行链：`v5 → v7-model → v7-data → v7-app`；Pages Source 明确使用 GitHub Actions。
- 新增 Node 测试：等级映射、HP/CE、低咒力高效率、零咒力、抗性、EX+、软爆发非硬上限、运行时结构检查。
- CI 除 `node --check` 外开始运行 V7 测试，失败不发布。
- 新增 `scripts/extract-embedded-data.mjs` 与 `docs/MONOLITH_SPLIT_V7.md`，正式开始 8MB 单体的数据外置迁移。

## V7 · 2026-08-24 · Unified Data

- 停止在线加载旧数值补丁链，重新建立统一数据系统。
- 等级轴：E- → EX，EX 后无限超越但边际收益持续递减。
- HP 由体质与体术决定；CE 以咒力总量为根基，操纵/效率不再凭空扩大蓝条。
- 物理输出与术式输出采用明确权重；术式威力真正参与实际伤害。
- 体质抗性改为平滑渐近曲线，体术主要负责命中/闪避。
- 通用卡与专用卡的输出差距系统性缩小。
- 所有角色统一使用软爆发曲线，不再给伏黑甚尔等角色设置固定百分比硬伤害上限。

## V6 · 2026-08-24 · 全局数值与剧情匹配修复

- 百鬼夜行不再默认所有高专参战者单挑夏油杰，改为按等级匹配敌手。
- 低咒力角色的 CE 虚胖得到修正。
- 高专地位加入年龄权重。
- 属性咒力继续抽具体性质。
- 怀玉→0卷加入多年成长/退步结算。

## V5 · 2026-08-24 · 流程稳定性

- 修复一键完整人生结束后偶发残留锁导致无法继续操作。
- “直奔地下抢到五条盒”必须通过实际羂索战验证。
- 删除“观众是否会投币”终局元互动。

## V3～V4 / Balance v2 / Hotfix

这些版本承担过 SL、一键车人、难度修正、甚尔爆发热修与术式威力热修。它们的数值实现已经停用，历史脚本保存在 `archive/legacy-patches/`，不应重新接回 V7 在线入口。

## Baseline

`game.html` 仍保留旧单文件运行时，以保障当前手机/离线玩法。V7 正按 `docs/MONOLITH_SPLIT_V7.md` 逐步外置数据、剧情、运行时和 UI。
