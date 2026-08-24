# Data migration area

V7 正在把 `game.html` 中的内嵌数据逐步外置。

当前 `scripts/extract-embedded-data.mjs` 可以从单文件资源包提取 battle / duel / duel-dynamics JSON，默认输出到 `data/extracted-v7/`。

在外部数据加载器和回归测试完成前，提取结果只作为迁移镜像，不立即替代运行时真值。这样可以逐步拆掉 8MB 单体，同时保留手机离线单文件构建能力。
