# K-RALLY 重制版（Android / Web 原型）

用解包出的原作文本 + 完全重画的程序化美术 + 程序化音频，从零实现的可玩原型。
含生涯模式、车库、商店、车辆升级、AI 战术层。

> 仓库：https://github.com/dsglenn35-netizen/krally-remake
> 发布：https://github.com/dsglenn35-netizen/krally-remake/releases/tag/v0.1.0
> 许可：MIT（见 [LICENSE](LICENSE)）

## 运行

| 方式 | 命令 |
|---|---|
| 浏览器 | 直接打开 `index.html`（或 `python -m http.server` 后访问） |
| Android | 安装 `KRallyRemake.apk`（minSdk 24 / targetSdk 35） |

操作：WASD / 方向键 驾驶，SPACE 开火，SHIFT 弃武器，P 暂停，M 静音；手机端用屏幕虚拟按键。

## 玩法系统

### 生涯（CAREER）
三档锦标赛，逐级解锁：

| 赛事 | 场次 | 圈数 | AI 强度 | 冠军奖励 |
|---|---|---|---|---|
| ROOKIE CUP | 3 | 3 | 0.86 | $800 / 150 XP |
| CHAMPIONSHIP | 4 | 3 | 0.95 | $2500 / 400 XP |
| MASTER LEAGUE | 4 | 4 | 1.03 | $6000 / 900 XP |

每场按名次发奖金（1st $600 / 2nd $380 / 3rd $220 / 4th $120）+ XP。前一档完成才解锁下一档。

### 车库（GARAGE）
4 辆车，速度 / 加速 / 抓地三条属性，可切换当前用车，属性以进度条呈现。

### 商店（SHOP）
- **CARS**：KITE（初始）/ VIPER $2400 / WRAITH $6500 / NOVA-X $13000
- **UPGRADES**：ENGINE（速度 +16 / 加速 +12，3 级）、TIRES（抓地 +0.05/级）、
  WEAPONS（开局自带 ROCKET，等级=弹药）

### 存档
localStorage `krally_save_v2`：现金、XP、车辆、每车升级、锦标赛进度、最佳圈。

## 版权与免责

- 代码、美术（车辆/地形/头像/UI 全部程序化绘制）、音效（WebAudio 合成）均为本项目原创，以 MIT 许可发布。
- 游戏内的**文字内容**（车手名、台词、菜单文案）来自对原作 SISX 包的解包与内存转储，仅用于技术研究与兼容性呈现；原作及其素材版权归 Infinite Dreams / 原发行方所有。
- 本项目不包含任何原作二进制、贴图、音频或模型文件。若版权方有异议，请联系删除。
