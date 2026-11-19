# 更新日志

## v0.8.0 — 硬件加速打通，30 → 90 FPS

### 根因
- Chromium 日志刷屏：`ERROR:gpu/command_buffer/service/shared_image/shared_image_representation.cc:593 Attempt to read from an uninitialized shared image`。
- 硬件加速下，烘焙用的**大画布被放进 GPU 共享图像**，切瓦片时 `drawImage` 触发 shared image 回读，GPU 通道卡死 → 界面停在「生成赛道…」。
- 另有 8 次 `getImageData` 采样边缘色，每次都是 GPU→CPU 同步回读。

### 修复
- 烘焙画布改用 `{ alpha:false, willReadFrequently:true }` → 强制留在 CPU 内存，切瓦片不再触发 GPU 回读。
- 删除 `getImageData`，出界填底色改由主题色推算。
- 瓦片画布 `alpha:false`。
- **Android 默认改为硬件加速**；需要回退时用 `--es hw 0` 启动。
- 相机钳制改为「玩家在地图内才钳制」，跑出地图时镜头继续跟随，不再丢车。
- 烘焙阶段写进加载提示（地面/岩体/路面/植被/光照/切块），并输出到 logcat。

### 实测
- OnePlus 7T Pro（90Hz）：**90 FPS**，连续跑 50 秒无崩溃、无 SIGSEGV。
- 之前软件渲染固定 30 FPS（降分辨率也不变，确认是合成上限）。


## v0.7.1 — 车库报错修复

- **修复车库崩溃**：`Meta.get` 没有导出（`meta.js` 里定义了但漏在 export 列表），车库渲染时抛 `TypeError`。
  - 顺带用脚本核对了 game.js 里所有 `Meta.*` / `Ghost.*` / `Terrain.*` 调用，确认现在没有缺失。
- **修复菜单里能看到触屏按钮**：`@media (pointer: coarse){ .touch{display:flex !important} }` 覆盖了 `.hidden`，导致刹车/油门/开火在菜单背后若隐若现；改为 `.touch:not(.hidden)`。
- 新增 `?smoke=1` 自检：依次打开首页/生涯/快速/车库/商店/车手/编辑器，异常写进页面标题，便于无头回归。