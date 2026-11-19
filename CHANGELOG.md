# 更新日志

## v0.8.1 — 触屏按键恢复显示

- **修复比赛中看不到方向键/刹车/油门/开火**：v0.7.1 把 CSS 改成 `.touch:not(.hidden)` 后，`#touch` 初始就带 `hidden`，而代码里从来没有在开赛时移除它（之前是靠 `!important` 强制显示）。
  - 新增 `setTouchVisible(on)`：开赛时显示、返回任意菜单界面时隐藏。


## v0.8.0 — 硬件加速打通，30 → 90 FPS

### 根因
- Chromium 日志刷屏：`ERROR:gpu/command_buffer/service/shared_image/shared_image_representation.cc:593 Attempt to read from an uninitialized shared image`。
- 硬件加速下，烘焙用的**大画布被放进 GPU 共享图像**，切瓦片时 `drawImage` 触发 shared image 回读，GPU 通道卡死 → 界面停在「生成赛道…」。
- 另有 8 次 `getImageData` 采样边缘色，每次都是 GPU→CPU 同步回读。