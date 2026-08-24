# JJK Life Wheel

《咒术回战》人生转盘 / 剧情战斗成长闭环的长期维护仓库。

## 在线游玩

稳定版统一放在仓库根目录：`game.html`。

GitHub Pages 首页 `index.html` 会自动检查 `game.html`，存在时直接进入游戏。

首次启用：

1. 将当前稳定版上传为根目录 `game.html`。
2. GitHub 仓库进入 **Settings → Pages**。
3. **Build and deployment** 选择 **Deploy from a branch**。
4. Branch 选择 **main**，目录选择 **/(root)**，保存。
5. 等待 GitHub Pages 发布后访问：`https://langdu24.github.io/JJK-Life-Wheel/`。

以后更新 `game.html` 后，Pages 会随 main 分支持续更新，不需要重新配置。

## 维护约定

- `game.html`：当前稳定可玩版
- `index.html`：GitHub Pages 在线入口
- `releases/`：历史完整版本归档
- `CHANGELOG.md`：版本与 Bug 修复记录
- GitHub Issues：记录剧情、世界线、战斗、领域、成长等 Bug 与新需求

后续修 Bug 或加入新机制时，优先保留一个可玩的稳定版，再推进新版本。
