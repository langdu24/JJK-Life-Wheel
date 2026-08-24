# JJK Life Wheel

《咒术回战》世界观下的随机人生、剧情实战与世界线 Roguelike 模拟器。

当前维护线：**V8：命运与抉择**。

核心方向：

> 随机决定你出生时拿到什么牌。  
> 玩家决定这一生怎么打这些牌。  
> 系统负责记住后果。

## 在线游玩

GitHub Pages：

https://langdu24.github.io/JJK-Life-Wheel/

仓库根目录稳定游戏文件固定为 `game.html`，不允许前导空格或其它别名。

## 当前运行时

`index.html` 加载 `game.html` 后，按顺序注入：

1. `patches/v5.js`：剧情流程稳定性兼容层
2. `core/v7-model.js`：V7 纯函数战斗数值模型
3. `core/v7-data.js`：把 V7 数值模型接入旧战斗运行时
4. `core/v7-app.js`：SL、难度、年龄权重、时代成长、百鬼夜行匹配等既有应用层
5. `core/v8-state.js`：V8 人物状态、世界 Flag、执念、抉择、一致性校验的纯状态核心
6. `core/v8-app.js`：V8 与人生转盘的集成层

V7 不被推翻。V8 在其上增加“命运、选择与后果”，避免再次把战斗数值体系推倒重写。

旧数值补丁 `current / v3 / v3b / v4 / v6` 已归档到 `archive/legacy-patches/`，线上不加载。

## V8.0：命运骨架

当前第一阶段已经开始落地：

- Base / Current / Permanent / Temporary 四层人物状态
- 12 个核心世界状态 Flag
- 人生执念、执念进度与稀缺执念点
- 关键抉择框架
- 关键选择即时反馈
- 一键完整人生遇到关键抉择时暂停，交给玩家决定
- 选择不会直接购买战斗胜利，只会改变机会与后续事件权重
- 规则一致性校验器骨架
- 软世界观冲突转化为“世界观异常”而不是直接删除
- `命运面板` 查看当前有效属性、执念、核心世界状态、关键选择与异常

首个接入的关键历史节点是涩谷事变，用来验证“玩家选择 → 后续权重改变 → 世界状态继续传播”整条链，而不是一次性把所有历史事件都重写。

## 人物状态原则

`Base`：初始生成属性。  
`Permanent`：永久伤势、觉醒、束缚、身体改变等长期修正。  
`Temporary`：有持续时间的 Buff / Debuff。  
`Current`：真正参与当前人生与战斗的有效属性。

普通界面优先显示 Current。Base 与修正来源用于命运面板、高级模式和完整导出。

旧 V7 存档迁入 V8 时，会把既有成长/伤势差值标记为“V7既有长期成长/伤势”，避免直接覆盖 Base。

## 12 个核心世界 Flag

V8.0 只保留有限核心状态：

- 顺平
- 真人
- 五条封印
- 羂索
- 宿傩容器
- 伏黑惠
- 野蔷薇
- 东堂
- 乙骨
- 死灭回游
- 天元
- 宿傩最终状态

其它剧情优先使用局部变量，避免一开始制造上百个全局 Flag。

## 目录约定

| 路径 | 用途 |
| --- | --- |
| `game.html` | 当前兼容单文件本体，仍在逐步拆分 |
| `index.html` | GitHub Pages 启动器 |
| `core/v7-model.js` | V7 战斗数值唯一真值 |
| `core/v7-data.js` | V7 战斗运行时适配层 |
| `core/v7-app.js` | V7 应用层兼容功能 |
| `core/v8-state.js` | V8 命运状态纯核心，不依赖 DOM / `state` |
| `core/v8-app.js` | V8 人生转盘集成与 UI |
| `patches/v5.js` | 暂时保留的旧流程稳定层 |
| `data/extracted-v7/` | 从旧单体抽出的卡牌 / 角色 / 领域数据镜像 |
| `tests/` | Node 单元与结构测试 |
| `docs/` | 数据系统、V8 路线与拆分计划 |
| `archive/` | 已停用历史代码 |
| `scripts/` | 源码维护与单体拆分工具 |

## 本地验证

需要 Node.js。

```bash
node --check core/v7-model.js
node --check core/v7-data.js
node --check core/v7-app.js
node --check core/v8-state.js
node --check core/v8-app.js
node tests/v7-model.test.js
node tests/v8-state.test.js
node tests/verify-runtime.js
```

Pages 部署会自动执行同一组检查，失败则不发布。

## GitHub Pages

仓库使用自定义 GitHub Actions 工作流 `.github/workflows/pages.yml`。

在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**，不是 `Deploy from a branch`。

## 维护边界

- V7 负责“角色数据如何变成战斗数值”。
- V8 State 负责“这个人现在是谁、经历过什么、世界变成了什么”。
- V8 App 负责“这些状态如何接入人生转盘、关键抉择与 UI”。
- 执念点只能购买机会，不能直接增加属性、直接赢战斗或自动复活。
- 硬规则冲突自动修正；有趣的软冲突登记为世界观异常并留给后续剧情。
- 新系统必须最终影响人物状态、执念、关系、世界线、传奇事件或最终评价之一，否则不优先加入。

## 单体拆分状态

`game.html` 仍然约 8MB，是当前最大的工程债。战斗卡牌、角色、领域等数据已经可同步抽出到 `data/extracted-v7/` 并做 JSON 校验。后续继续按低风险顺序拆：

1. 卡牌 / 角色 / 领域正式外置为运行时数据源
2. 剧情节点 / 世界线规则
3. 战斗运行时
4. UI

最终目标是模块化开发，同时保留可重新打包的手机本地单 HTML 版本。

详见：

- `docs/DATA_SYSTEM_V7.md`
- `docs/MONOLITH_SPLIT_V7.md`
- `docs/V8_ROADMAP.md`
