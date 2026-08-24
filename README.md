# JJK Life Wheel

《咒术回战》人生转盘 / 剧情战斗成长闭环的长期维护仓库。

## 在线游玩

稳定版统一放在仓库根目录：`game.html`（**必须是干净文件名，不能有前导空格**）。

GitHub Pages 首页 `index.html` 会直接加载 `game.html` 并注入补丁层。

访问地址：https://langdu24.github.io/JJK-Life-Wheel/

## 首次启用 / 更新后发布

1. 确保根目录存在干净的 `game.html`（不要写成 ` game.html`）。
2. 仓库 **Settings → Pages**：
   - Build and deployment 选择 **Deploy from a branch**
   - Branch 选 **main**，目录选 **/(root)**，保存。
3. 推送到 `main` 后，Actions 会自动部署。也可以手动触发 workflow。

## 维护约定

| 文件 / 目录 | 说明 |
|-------------|------|
| `game.html` | **当前稳定可玩版**（干净文件名） |
| `index.html` | GitHub Pages 入口 + 补丁注入 |
| `patches/` | 运行时补丁层（current → v3 → v3b → v4 → v5） |
| `CHANGELOG.md` | 版本与 Bug 修复记录 |
| `.github/workflows/pages.yml` | 自动部署 + 文件名规范化安全网 |

### 本地修复带空格文件名（如果还存在）

```bash
git mv " game.html" game.html
git commit -m "fix: rename game.html remove leading space"
git push
```

之后 Pages 会自动用干净名称部署。

后续修 Bug 或加入新机制时，优先保留一个可玩的稳定版，再推进新版本。
