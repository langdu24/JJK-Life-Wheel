# JJK Life Wheel

《咒术回战》人生转盘、剧情实战与长期成长模拟器。

当前维护线：**V7 Unified Data**。

## 在线游玩

GitHub Pages：

https://langdu24.github.io/JJK-Life-Wheel/

仓库根目录的稳定游戏文件必须叫：

`game.html`

不允许前导空格或其它别名。

## 当前运行时

`index.html` 加载 `game.html` 后，只注入以下运行层：

1. `patches/v5.js`：剧情流程稳定性兼容层
2. `core/v7-model.js`：纯函数数值模型，浏览器与 Node 测试共用
3. `core/v7-data.js`：把 V7 数值模型接入旧战斗运行时
4. `core/v7-app.js`：SL、难度、年龄权重、时代成长、百鬼夜行匹配等应用层

旧数值补丁 `current / v3 / v3b / v4 / v6` 已移到：

`archive/legacy-patches/`

它们只用于历史追溯，线上不加载。

## 目录约定

| 路径 | 用途 |
| --- | --- |
| `game.html` | 现阶段兼容用单文件游戏本体，仍在逐步拆分 |
| `index.html` | GitHub Pages 启动器 |
| `core/v7-model.js` | V7 数值唯一真值，禁止引用 DOM / state |
| `core/v7-data.js` | 战斗运行时适配层 |
| `core/v7-app.js` | 人生转盘应用层功能 |
| `patches/v5.js` | 暂时保留的旧流程稳定层 |
| `tests/` | Node 单元与结构测试 |
| `docs/` | 数值系统与拆分计划 |
| `archive/` | 已停用历史代码 |
| `scripts/` | 源码维护与单体拆分工具 |

## 本地验证

需要 Node.js。

```bash
node --check core/v7-model.js
node --check core/v7-data.js
node --check core/v7-app.js
node tests/v7-model.test.js
node tests/verify-runtime.js
```

Pages 部署会自动执行同一组检查。任何一项失败都不会发布。

## GitHub Pages

仓库使用自定义 GitHub Actions 工作流：

`.github/workflows/pages.yml`

在 **Settings → Pages → Build and deployment → Source** 中选择：

**GitHub Actions**

不是 `Deploy from a branch`。

## V7 维护边界

数值真值只能放在 `core/v7-model.js`。

HP、CE、效率、体质抗性、物理/术式输出、EX+递减成长和软爆发曲线都必须通过模型函数计算。`v7-app.js` 可以管理剧情、年龄、SL、敌手匹配等应用规则，但不能复制一套战斗数值公式。

详见：

- `docs/DATA_SYSTEM_V7.md`
- `docs/MONOLITH_SPLIT_V7.md`

## 单体拆分状态

`game.html` 仍然约 8MB，这是当前最大的维护债。

V7 已先把数值系统抽离。下一阶段按低风险顺序拆：

1. 卡牌 / 角色 / 领域等数据
2. 剧情节点 / 世界线数据
3. 战斗运行时
4. UI

`scripts/extract-embedded-data.mjs` 已提供从旧单文件资源包中提取数据文件的工具。外置数据切换为正式运行来源前，必须通过回归测试，不能为了“看起来模块化”而破坏手机单文件玩法。

## 发布原则

- 先保证稳定可玩，再推进拆分。
- 不再新增角色专属伤害热修作为长期数值规则。
- 旧兼容逻辑必须明确标记为 compatibility / migration。
- 新数值规则必须有测试。
