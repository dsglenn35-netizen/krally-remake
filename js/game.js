// game.js - K-RALLY 重制版原型
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let VW = canvas.width, VH = canvas.height;
  let ZOOM = 0.62;
  function resizeCanvas() {
    const vw = window.innerWidth || document.documentElement.clientWidth || 800;
    const vh = window.innerHeight || document.documentElement.clientHeight || 360;
    // 渲染分辨率系数：软件渲染下降低位图尺寸能显著提升帧率，CSS 仍铺满
    const RS = G.renderScale || 1;
    const w = Math.max(320, Math.round((vw | 0) * RS));
    const h = Math.max(200, Math.round((vh | 0) * RS));
    // CSS 负责铺满，这里只改位图分辨率
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    VW = canvas.width; VH = canvas.height;
    // 视野：高度约 900 世界单位，宽度不超过 1700
    ZOOM = Math.max(VH / 900, VW / 1700);
  }
  addEventListener('resize', resizeCanvas);
  addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));
  const CONTENT = window.GAME_CONTENT || { dialogue: [], ui_labels: [] };
  const SND = window.Sound;
  const T = (typeof I18N !== 'undefined') ? function (k) { return I18N.t(k); } : function (k) { return k; };
  const isZh = () => (typeof I18N !== 'undefined' && I18N.get() === 'zh');
  const trackName = (tr) => (isZh() && tr && tr.zh) ? tr.zh : (tr ? tr.name : '');
  const champName = (ch) => (isZh() && ch && ch.zh) ? ch.zh : (ch ? ch.name : '');
  const upgName = (u) => (isZh() && u && u.zh) ? u.zh : (u ? u.name : '');
  const bodyName = (b) => T('body' + b.charAt(0).toUpperCase() + b.slice(1));
  const tierName = (t) => (isZh() ? t.zh : t.en);
  const RP_TABLE = [0, 25, 12, -8, -20];
  function audioInit() { if (SND) { SND.init(); } }
  const KEYS = {};
  const AUTOPLAY = location.search.includes('autoplay');
  const NOAVOID = location.search.includes('noavoid');   // A/B 测试用：关闭避让

  // ---------- 车手（台词/设定取自解包文本） ----------
  const ROSTER = (typeof window !== 'undefined' && window.DRIVERS) ? window.DRIVERS : [];
  const DRIVERS = ROSTER;;

  const LAPS = 3;
  const TAU = Math.PI * 2;

  // ---------- 工具 ----------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr.length ? arr[(Math.random() * arr.length) | 0] : '';

  // 中文垃圾话（原作文案为英文剧情文本，比赛中直接用会突兀，这里重写为中文挑衅台词）
  const TALK_ZH = [
    '就这？我奶奶开得都比你快。',
    '让开，别挡着我的尾流。',
    '你的车是不是漏气了？',
    '别看了，冠军是我。',
    '这弯道我闭着眼都能过。',
    '回去换台车再来吧。',
    '你的保险买了吗？',
    '刚才那下是我让着你。',
    '油门踩到底也叫技术？',
    '我后视镜里看不见你了。',
    '别紧张，垫底也是一种名次。',
    '这条路我熟得像自己家后院。',
    '你的车灯挺亮，就是跑不快。',
    '要不要我放慢点等等你？',
    '吃灰吧，朋友。',
    '你的驾照是抽奖送的吧？',
    '再来一次也是一样的结果。',
    '这速度，我走路都比你快。',
    '撞我一下试试？',
    '领奖台只站得下三个人，可惜不是你。',
    '你刚才是不是踩了刹车？',
    '别追了，你追不上的。',
    '我的车可不是样子货。',
    '看清楚我的尾灯颜色了吗？',
    '想超我？先练两年。',
    '这条路今晚归我了。',
    '你的技术配不上这台车。',
    '别慌，倒数第一也是第一。',
    '我听见你引擎在求饶。',
    '下次记得早点刹车。',
    '这就是你所谓的全力？',
    '你跑得比路边的石头还稳，就是不快。',
    '让保险公司给你算算赔率。',
    '我不介意再多一个手下败将。',
    '你的车过弯姿势挺好看的。',
    '别跟丢了，我怕你找不到路。',
    '油门是踩的，不是摸的。',
    '我数到三，你就看不见我了。',
    '这么慢，是怕费油吗？',
    '你的车技和你的车一样廉价。',
    '谢谢陪跑。',
    '前面的弯，记得打方向。',
    '别哭，下次还有机会垫底。',
    '我加速的时候，你最好别回头。',
    '你的名字我记不住，反正也不重要。',
    '这条路太窄，容不下两个冠军。',
    '我让你三个车身，你还是输。',
    '回去多练练，别浪费油钱。',
    '你刚才是不是熄火了？',
    '看见我的车尾灯了吗？记住它。',
    '想赢我，得先学会不撞墙。',
    '你的速度让我想睡觉。',
    '别急，终点线不会跑。',
    '这就是你的极限？我还没热身。',
    '你的车不错，可惜车手不行。',
    '下次别来了，省点修理费。',
  ];
  const TALK = TALK_ZH;
  const UI = CONTENT.ui_labels || [];

  // ---------- 输入 ----------
  // 移动端长按会触发系统菜单/文字选择，直接屏蔽
  document.addEventListener('contextmenu', (e) => { e.preventDefault(); }, { passive: false });
  document.addEventListener('selectstart', (e) => { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => { e.preventDefault(); }, { passive: false });

  addEventListener('keydown', (e) => {
    KEYS[e.code] = true;
    audioInit();
    if (e.code === 'KeyM' && SND) SND.toggleMute();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyP' && G.state === 'racing') togglePause();
    if (e.code === 'Space' && G.state === 'racing') playerFire();
    if (e.code === 'ShiftLeft' && G.state === 'racing') playerDrop();
  });
  addEventListener('keyup', (e) => { KEYS[e.code] = false; });

  // 触屏控制（安卓）
  const touch = { left: false, right: false, gas: false, brake: false };
  function bindTouch() {
    const mk = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); touch[prop] = true; };
      const off = (e) => { e.preventDefault(); touch[prop] = false; };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); touch[prop] = true; }, { passive: false });
      el.addEventListener('pointerup', (e) => { e.preventDefault(); touch[prop] = false; }, { passive: false });
      el.addEventListener('pointercancel', () => { touch[prop] = false; });
      el.addEventListener('pointerleave', () => { touch[prop] = false; });
    };
    // 注意：必须传入 prop，否则 touch[undefined] 会被置位，触摸控制全部失效
    [['tLeft', 'left'], ['tRight', 'right'], ['tGas', 'gas'], ['tBrake', 'brake']]
      .forEach(pair => mk(pair[0], pair[1]));
    const fire = document.getElementById('tFire');
    if (fire) fire.addEventListener('touchstart', (e) => { e.preventDefault(); playerFire(); }, { passive: false });
  }

  // ---------- 车辆 ----------
  class Car {
    constructor(driver, track, isPlayer, slot, stats) {
      this.driver = driver;
      this.track = track;
      this.isPlayer = isPlayer;
      this.slot = slot;
      this.stats = stats || null;
      const p = track.startPose();
      const off = (slot - 1.5) * 46;
      const s0 = 80 + slot * 42;
      const st = track.open ? track.at(20 + slot * 46) : track.at(track.length + s0);
      this.x = st.x + st.nx * off;
      this.y = st.y + st.ny * off;
      this.angle = Math.atan2(st.ty, st.tx);
      this.speed = 0;
      this.maxSpeed = stats ? stats.speed : (isPlayer ? 430 : 402 + rand(-14, 22));
      this.accelStat = stats ? stats.accel : 330;
      this.handling = stats ? stats.handling : 1;
      this.health = 100;
      this.armor = (stats && stats.armor) ? stats.armor : 1;
      this.pickupR = (stats && stats.pickup) ? stats.pickup : 1;
      this.lap = 1;
      this.s = st.s;
      this.prevS = st.s;
      this.dist = 0;
      this.lapStart = 0;
      this.bestLap = null;
      this.finished = false;
      this.finishTime = 0;
      this.weapon = (stats && stats.startWeapon) ? stats.startWeapon : null;
      this.ammo = (stats && stats.startAmmo) ? stats.startAmmo : 0;
      this.stun = 0;
      this.boost = 0;
      this.thrust = 0;
      this.drift = 0;
      this.px = this.x; this.py = this.y;
      this.velAngle = this.angle;      // 实际速度方向（与车头方向的差 = 滑移）
      this.slip = 0;
      this.grip = G.surfaceGrip || 1;  // 路面抓地力（雪地 0.52）
      this.lateralBias = rand(-0.45, 0.45);
    }

    get progress() { return (this.lap - 1) * this.track.length + this.s; }

    update(dt, input) {
      const track = this.track;
      const near = track.nearest(this.x, this.y);
      const halfW = track.width / 2;
      const offroad = Math.abs(near.lateral) > halfW * 0.92;

      // 转向（低抓地路面转向更迟滞）
      const steerInput = input.steer;
      const speedFactor = clamp(1 - this.speed / (this.maxSpeed * 1.6), ASSIST[ASSIST_IDX].speedFloor, 1);
      const AS = ASSIST[ASSIST_IDX];
      // 雪地在轻松档下不那么滑
      const grip = this.grip < 0.7 ? Math.min(1, this.grip / AS.snow) : this.grip;
      const steerRate = 2.9 * (0.72 + 0.28 * grip) * AS.steer;
      this.angle += steerInput * steerRate * dt * speedFactor * this.handling * (offroad ? 0.7 : 1);

      // 自动回正（仅轻松档、仅玩家）：松开方向时车头缓慢对齐前方赛道
      if (AS.center > 0 && this.isPlayer && Math.abs(steerInput) < 0.05 && this.speed > 60) {
        // 瞄准赛道中线前方一点（而不是只对齐切线），这样才会从边上回到中间
        const look = track.at(this.s + 105 + this.speed * 0.30);
        const want = Math.atan2(look.y - this.y, look.x - this.x);
        const diff = wrapAngle(want - this.angle);
        const k = AS.center * Math.min(1, this.speed / 180);
        this.angle += diff * Math.min(1, k * dt);
      }

      // 加速 / 刹车
      let accel = 0;
      if (this.stun > 0) accel = -60;
      else {
        // 低抓地路面起步/加速也更弱（打滑损失）
        accel = input.gas ? this.accelStat * (0.60 + 0.40 * grip) : -90;
        if (input.brake) accel -= 520 * (0.55 + 0.45 * grip) * ASSIST[ASSIST_IDX].brake;   // 雪地刹车距离更长
      }
      if (this.boost > 0) { accel += 520; this.boost -= dt; }

      const maxSpeed = this.maxSpeed * (this.boost > 0 ? 1.32 : 1) * (offroad ? 0.55 : 1);
      this.speed += accel * dt;
      this.speed -= this.speed * (offroad ? 2.4 : 0.55) * dt;
      this.speed = clamp(this.speed, offroad ? -60 : -150, maxSpeed);

      // 速度方向向车头收敛：抓地力越低越慢 → 产生滑移
      const conv = grip * (offroad ? 5.0 : 9.0) * ASSIST[ASSIST_IDX].conv;
      const dAng = wrapAngle(this.angle - this.velAngle);
      this.velAngle += dAng * Math.min(1, conv * dt);
      if (Math.abs(this.speed) < 45) this.velAngle = this.angle;
      this.slip = clamp(wrapAngle(this.angle - this.velAngle), -1.0, 1.0);

      // 滑移视觉强度
      const slipAmt = Math.min(1, Math.abs(this.slip) * 2.2);
      this.drift = lerp(this.drift, offroad ? 0.35 : Math.max(slipAmt * 0.9, Math.abs(steerInput) * 0.5 * (this.speed / this.maxSpeed)), dt * 6);

      // 位移（沿实际速度方向）
      this.px = this.x; this.py = this.y;
      this.x += Math.cos(this.velAngle) * this.speed * dt;
      this.y += Math.sin(this.velAngle) * this.speed * dt;

      // 进度 / 圈数（用累计里程判定，避免 s 跳变误判）
      this.prevS = this.s;
      this.s = near.s;
      let ds = this.s - this.prevS;
      const L = track.length;
      if (ds > L * 0.5) ds -= L;
      else if (ds < -L * 0.5) ds += L;
      this.dist += ds;
      if (this.dist < 0) this.dist = 0;
      const lapNow = Math.max(1, Math.floor(this.dist / L) + 1);
      // 幽灵车采样（仅玩家）
    if (this.isPlayer && G.state === 'racing') {
      G.recT = (G.recT || 0) + dt;
      if (G.recT >= 0.05) {
        G.recT = 0;
        G.rec = G.rec || [];
        G.rec.push({ t: G.raceTime, x: this.x, y: this.y, a: this.angle, s: this.s });
        if (G.rec.length > 8000) G.rec.shift();
      }
    }

    // 检查点：按顺序记录
    if (track.checkpoints && track.checkpoints.length) {
      this.cpIdx = this.cpIdx || 0;
      while (this.cpIdx < track.checkpoints.length && this.s >= track.checkpoints[this.cpIdx] - 25) {
        this.cpIdx++;
        if (this.isPlayer) showBanner((T('checkpoint') || 'CHECKPOINT') + ' ' + this.cpIdx + '/' + track.checkpoints.length);
      }
    }

    // 开放赛道：单程计时，冲过终点线即完赛
    if (track.open) {
      this.dist = this.s;
      this.lap = 1;
      const allCp = !track.checkpoints || track.checkpoints.length === 0 || (this.cpIdx || 0) >= track.checkpoints.length;
      if (!this.finished && this.s >= track.length - 20 && allCp) {
        this.finished = true;
        this.finishTime = G.raceTime;
        if (this.isPlayer) endRace();
      }
    } else if (lapNow !== this.lap) {
        this.lap = lapNow;
        if (this.lap > 1) {
          const lapTime = G.raceTime - this.lapStart;
          if (lapTime > 5 && (!this.bestLap || lapTime < this.bestLap)) {
          this.bestLap = lapTime;
          if (this.isPlayer && typeof Ghost !== 'undefined' && G.track) {
            const from = G.raceTime - lapTime;
            const pts = (G.rec || []).filter(s => s.t >= from)
              .map(s => [Math.round(s.x), Math.round(s.y), Math.round(s.a * 100) / 100, Math.round(s.s || 0)]);
            if (pts.length > 20) {
              G.ghost = Ghost.push(G.track.name, { t: lapTime, pts: pts });
              G.ghostNew = true;
              updateGhostHud();
            }
          }
        }
        }
        this.lapStart = G.raceTime;
        if (this.lap > G.laps && !this.finished) {
          this.finished = true;
          this.finishTime = G.raceTime;
          if (this.isPlayer) endRace();
        }
      }

      // 拖尾粒子（雪地扬雪 / 泥地扬尘 / 路面火花）
      const snowy = this.grip < 0.7 && !offroad;
      const rate = this.drift * (snowy ? 1.5 : 0.9);
      if (Math.random() < rate) {
        const col = snowy ? '238,246,255' : (offroad ? '120,90,60' : '160,200,255');
        G.particles.push({ x: this.x, y: this.y, vx: rand(-26, 26), vy: rand(-26, 26),
          life: snowy ? 0.62 : 0.5, max: snowy ? 0.62 : 0.5,
          r: rand(2, snowy ? 6.5 : 5), color: col });
      }
      // 雪地：明显打滑时在车后额外喷一团雪
      if (snowy && Math.abs(this.slip) > 0.25 && Math.abs(this.speed) > 140 && Math.random() < 0.5) {
        const bx = this.x - Math.cos(this.velAngle) * 18;
        const by = this.y - Math.sin(this.velAngle) * 18;
        G.particles.push({ x: bx, y: by, vx: rand(-40, 40), vy: rand(-40, 40),
          life: 0.75, max: 0.75, r: rand(4, 9), color: '245,250,255' });
      }
      if (this.stun > 0) this.stun -= dt;
    }
  }

  // ---------- 世界状态 ----------
  const G = {
    state: 'menu',
    track: null,
    cars: [],
    player: null,
    pickups: [],
    rockets: [],
    mines: [],
    particles: [],
    raceTime: 0,
    countdown: 0,
    camX: 0, camY: 0,
    tauntTimer: 0,
    bannerTimer: 0,
    selectedDriver: 0,
    selectedTrack: 0,
    lastLapShown: 1,
  };

  function buildTrack(idx) {
    const def = TRACKS[idx];
    return new Track(def.points, def.width, def.name, {
      closed: def.closed !== false,
      checkpoints: def.checkpoints || 0,
    });
  }

  // ---------- 自定义赛道 ----------
  function registerAllCustom() {
    if (typeof Editor === 'undefined') return;
    const list = Editor.loadAll();
    list.forEach(t => {
      const existing = TRACKS.findIndex(x => x.name === t.name && x.custom);
      const def = {
        name: t.name, theme: t.theme, width: t.width, points: t.points, custom: true,
        closed: t.closed !== false, checkpoints: t.checkpoints || 0,
      };
      if (existing >= 0) TRACKS[existing] = def; else TRACKS.push(def);
    });
  }

  function registerCustom(def) {
    const idx = TRACKS.findIndex(x => x.custom && x.name === def.name);
    const full = {
      name: def.name, theme: def.theme, width: def.width, points: def.points, custom: true,
      closed: def.closed !== false, checkpoints: def.checkpoints || 0,
    };
    if (idx >= 0) { TRACKS[idx] = full; return idx; }
    TRACKS.push(full);
    return TRACKS.length - 1;
  }

  window.Game = {
    startCustomTrack(def) {
      const idx = registerCustom(def);
      G.selectedTrack = idx;
      G.driverReturn = null;
      // 延后一帧，等启动流程（renderHome/showView）跑完再开赛
      setTimeout(() => {
        startRace(idx, {});
        const wm = /warmup=(\d+)/.exec(location.search);
        if (wm) {
          G.countdown = 0.05; G.state = 'racing';
          document.getElementById('banner').classList.add('hidden');
          const n = parseInt(wm[1], 10);
          for (let i = 0; i < n; i++) update(1 / 60);
          if (G.state === 'racing') hideLineup();
        }
      }, 0);
    },
    reloadTracks() { registerAllCustom(); },
    openEditor() { showView('editor'); if (typeof Editor !== 'undefined') Editor.open(); },
  };

  function spawnPickups(track) {
    const types = ['rocket', 'turbo', 'mine', 'rocket', 'turbo', 'mine', 'rocket', 'turbo'];
    const list = [];
    const n = types.length;
    for (let i = 0; i < n; i++) {
      const p = track.at((i + 0.5) * (track.length / n));
      list.push({ x: p.x + p.nx * rand(-40, 40), y: p.y + p.ny * rand(-40, 40), type: types[i], respawn: 0, alive: true });
    }
    return list;
  }

  function updateGhostHud() {
    const gl = document.getElementById('ghostLap');
    if (!gl) return;
    if (!G.ghost || !G.ghost.best) { gl.textContent = ''; return; }
    gl.textContent = '幽灵 ' + fmtTime(G.ghost.best.t) +
      (G.ghost.laps.length > 1 ? ' · 平均 ' + fmtTime(G.ghost.avg) : '') +
      (G.ghostNew ? ' ★' : '');
  }

  // ---------- 发车界面 / 名次条 ----------
  function renderLineup() {
    const ul = $('lineupList');
    ul.innerHTML = '';
    G.cars.forEach((c, i) => {
      const li = document.createElement('li');
      li.className = 'lu-row' + (c.isPlayer ? ' me' : '');
      li.innerHTML =
        '<span class="lu-pos">' + (i + 1) + '</span>' +
        '<img class="lu-pic" src="' + Portrait.dataUrl(c.driver) + '" alt="">' +
        '<span class="lu-name">' + c.driver.name + (c.isPlayer ? ' <em>' + T('you') + '</em>' : '') + '</span>' +
        '<span class="lu-num">#' + c.driver.num + '</span>';
      ul.appendChild(li);
    });
    $('lineupHint').textContent = T('gridHint');
    $('lineup').classList.remove('hidden');
    $('ladder').classList.add('hidden');
  }

  function hideLineup() {
    $('lineup').classList.add('hidden');
    $('ladder').classList.remove('hidden');
    updateLadder(true);
  }

  function updateLadder(force) {
    const el = $('ladder');
    if (!el || el.classList.contains('hidden')) return;
    const total = G.track ? G.track.length * G.laps : 1;
    const rows = [...G.cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    const pct = (c) => Math.max(2, Math.min(100, (c.progress / total) * 100));
    const sig = rows.map(c => c.driver.name).join(',');
    if (!force && el.dataset.sig === sig) {
      rows.forEach((c, i) => {
        const bar = el.querySelector('.ld-bar[data-i="' + i + '"]');
        if (bar) bar.style.width = pct(c) + '%';
      });
      return;
    }
    el.dataset.sig = sig;
    el.innerHTML = rows.map((c, i) =>
      '<div class="ld-row' + (c.isPlayer ? ' me' : '') + '" data-car="' + G.cars.indexOf(c) + '">' +
        '<span class="ld-pos">' + (i + 1) + '</span>' +
        '<img class="ld-pic" src="' + Portrait.dataUrl(c.driver) + '" alt="">' +
        '<span class="ld-info"><b>' + c.driver.name + '</b>' +
          '<span class="ld-track"><i class="ld-bar" data-i="' + i + '" style="width:' + pct(c) + '%"></i></span>' +
        '</span>' +
      '</div>').join('');
    el.querySelectorAll('.ld-row').forEach(row => {
      row.onclick = () => showOppCard(parseInt(row.dataset.car, 10));
    });
  }

  // 操控辅助档位：0=硬核 1=标准 2=轻松（可用 ?assist=0/1/2 切换）
  const ASSIST = [
    { name: '硬核', steer: 1.00, speedFloor: 0.35, conv: 1.00, snow: 1.00, brake: 1.00, center: 0.00 },
    { name: '标准', steer: 1.12, speedFloor: 0.45, conv: 1.18, snow: 0.86, brake: 1.10, center: 0.00 },
    { name: '轻松', steer: 1.28, speedFloor: 0.55, conv: 1.40, snow: 0.72, brake: 1.22, center: 1.60 },
  ];
  let ASSIST_IDX = 1;

  // ?cscale=0.8 调整车辆视觉大小
  (function () {
    const m = /cscale=([\d.]+)/.exec(location.search);
    if (m && Art.setCarScale) Art.setCarScale(parseFloat(m[1]));
    // ?track=N 直接指定地图（调试/分享用）
    const t = /track=(\d+)/.exec(location.search);
    if (t) { G.selectedTrack = Math.max(0, Math.min(TRACKS.length - 1, parseInt(t[1], 10))); }
    const a = /assist=(\d)/.exec(location.search);
    if (a) ASSIST_IDX = Math.max(0, Math.min(2, parseInt(a[1], 10)));
    // 渲染分辨率系数（?rs=0.75）；手机默认 0.8，靠 CSS 拉伸铺满
    const rs = parseFloat((/rs=([\d.]+)/.exec(location.search) || [])[1]);
    G.renderScale = rs || 1;   // 实测软件渲染固定 30fps，降分辨率无收益，保持清晰
  })();

  function startRace(trackIdx, opts) {
    const idx = trackIdx == null ? G.selectedTrack : trackIdx;
    const def = TRACKS[idx] || {};
    const cached = G.mapCache && def.name && G.mapCache[def.name];
    if (opts && opts.defer && !cached && typeof Terrain !== 'undefined') {
      // 先让加载提示绘制出来，再烘焙地图（烘焙是同步且较慢的）
      const el = document.getElementById('loading');
      if (el) el.classList.remove('hidden');
      setTimeout(() => {
        try { startRaceNow(trackIdx, opts); } finally { if (el) el.classList.add('hidden'); }
      }, 60);
      return;
    }
    startRaceNow(trackIdx, opts);
  }

  function startRaceNow(trackIdx, opts) {
    opts = opts || {};
    G.career = opts.career || null;
    G.collisions = 0;
    G.tactics = { block: 0, ram: 0, loot: 0 };
    const defLaps = (TRACKS[trackIdx == null ? G.selectedTrack : trackIdx] || {});
    G.laps = defLaps.closed === false ? 1 : (opts.laps || LAPS);
    G.posHist = [];
    G.posT = 0;
    G.rec = [];
    G.recT = 0;
    G.ghostNew = false;
    const track = buildTrack(trackIdx == null ? G.selectedTrack : trackIdx);
    G.track = track;
    G.ghost = (typeof Ghost !== 'undefined') ? Ghost.load(track.name) : null;
    updateGhostHud();
    if (location.search.includes('fakeghost')) {
      const pts = [];
      const step = 8;
      for (let s = 0; s < track.length; s += step) {
        const p = track.at(s);
        pts.push([Math.round(p.x), Math.round(p.y), Math.round(p.angle * 100) / 100]);
      }
      G.ghost = { lap: (pts.length * 0.05), pts: pts, rate: 0.05 };
    }
    G.mapCache = G.mapCache || {};
    const mapKey = track.name;
    if (!G.mapCache[mapKey] && typeof Terrain !== 'undefined') {
      try {
        const defIdx = (trackIdx == null ? G.selectedTrack : trackIdx);
        const defTheme = (TRACKS[defIdx] && TRACKS[defIdx].theme != null) ? TRACKS[defIdx].theme : defIdx;
        // 按设备分档：桌面 1.5× 烘焙 / 手机 1×；?hd=2 可手动指定
        const isMobileDev = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
          (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
        const hdParam = parseFloat((/hd=([\d.]+)/.exec(location.search) || [])[1]);
        const mapScale = hdParam || (isMobileDev ? 1 : 1.5);
        const mapDetail = isMobileDev ? 1 : 1.35;
        G.mapCache[mapKey] = Terrain.build(track, defTheme, { scale: mapScale, detail: mapDetail });
        G.mapScale = mapScale;
        G.surfaceGrip = (typeof Terrain.gripOf === 'function') ? Terrain.gripOf(defTheme) : 1;
      } catch (e) {
        G.mapCache[mapKey] = null;
        window.__MAPERR = (e && e.message) + ' | ' + ((e && e.stack) ? e.stack.split('\n')[1] : '');
      }
    }
    G.map = G.mapCache[mapKey] || null;
    G.cars = [];
    const pstats = Meta.stats();
    const drv0 = DRIVERS[G.selectedDriver] || DRIVERS[0];
    const PK = drv0.perk || {};
    pstats.speed *= (PK.speed || 1);
    pstats.accel *= (PK.accel || 1);
    pstats.handling *= (PK.grip || 1);
    pstats.armor = PK.armor || 1;
    pstats.pickup = PK.pickup || 1;
    const skill = opts.skill || 0.9;
    const aiSpeed = 330 + skill * 80;
    const aiAccel = 296 + skill * 74;
    const aiHandling = 0.96 + (skill - 0.9) * 0.6;
    const order = [0, 1, 2, 3].map(i => (G.selectedDriver + i) % DRIVERS.length);
    for (let i = 0; i < 4; i++) {
      const drv = DRIVERS[order[i]] || DRIVERS[0];
      const dp = drv.perk || {};
      const st = i === 0 ? pstats : {
        speed: (aiSpeed + rand(-8, 8)) * (dp.speed || 1),
        accel: aiAccel * (dp.accel || 1),
        handling: aiHandling * (dp.grip || 1),
        armor: dp.armor || 1,
        pickup: dp.pickup || 1,
      };
      const car = new Car(drv, track, i === 0, i, st);
      if (i === 0 && pstats.startWeapon) { car.weapon = pstats.startWeapon; car.ammo = pstats.startAmmo; }
      car.traits = DRIVERS[order[i]].traits;
      car.picked = 0;
      G.cars.push(car);
    }
    G.player = G.cars[0];
    const giveM = /give=(rocket|mine|turbo)/.exec(location.search);
    if (giveM) { G.player.weapon = giveM[1]; G.player.ammo = giveM[1] === 'turbo' ? 1 : 3; updateWeaponHUD(); }
    G.pickups = spawnPickups(track);
    G.rockets = []; G.mines = []; G.particles = [];
    G.raceTime = 0; G.countdown = 3.6; G.tauntTimer = 0; G.bannerTimer = 0;
    G.lastLapShown = 1;
    G.camX = G.player.x; G.camY = G.player.y;
    G.state = 'countdown';
    G.lastBeep = 99;
    if (SND) { SND.init(); SND.engineStart(); SND.musicStart(); }
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('lapTotal').textContent = G.laps;
    updateWeaponHUD();
    showBanner(T('ready'));
    renderLineup();
  }

  // 结算：名次变化曲线
  function drawPosChart() {
    const cv = document.getElementById('posChart');
    if (!cv) return;
    const hist = G.posHist || [];
    if (hist.length < 2) { cv.classList.add('hidden'); return; }
    cv.classList.remove('hidden');
    const g2 = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g2.clearRect(0, 0, W, H);
    const padL = 22, padR = 10, padT = 8, padB = 8;
    const n = hist.length;
    const px = (i) => padL + (W - padL - padR) * (i / (n - 1));
    const py = (rank) => padT + (H - padT - padB) * ((rank - 1) / 3);

    g2.strokeStyle = 'rgba(120,170,200,.16)';
    g2.lineWidth = 1;
    for (let r = 1; r <= 4; r++) {
      g2.beginPath(); g2.moveTo(padL, py(r)); g2.lineTo(W - padR, py(r)); g2.stroke();
    }

    // 3 点中值平滑，压掉并排换位造成的锯齿
    const rankAt = (idx) => hist.map(snap => snap.indexOf(idx) + 1);
    const smooth = (arr) => arr.map((v, i) => {
      const a = arr[Math.max(0, i - 1)], b = arr[i], c = arr[Math.min(arr.length - 1, i + 1)];
      const s = [a, b, c].filter(x => x > 0).sort((x, y) => x - y);
      return s.length ? s[Math.floor(s.length / 2)] : 0;
    });

    G.cars.forEach((c, idx) => {
      const ranks = smooth(rankAt(idx));
      g2.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const rank = ranks[i];
        if (!rank) continue;
        const x = px(i), y = py(rank);
        if (!started) { g2.moveTo(x, y); started = true; } else g2.lineTo(x, y);
      }
      g2.strokeStyle = c.driver.main;
      g2.lineWidth = c.isPlayer ? 2.8 : 1.4;
      g2.globalAlpha = c.isPlayer ? 1 : 0.7;
      g2.stroke();
      g2.globalAlpha = 1;
    });

    g2.fillStyle = 'rgba(170,200,220,.75)';
    g2.font = '10px "Segoe UI", sans-serif';
    g2.fillText('1', 6, py(1) + 3);
    g2.fillText('4', 6, py(4) + 3);
  }

  // 对手车况卡
  function showOppCard(carIdx) {
    const el = $('oppCard');
    const c = G.cars[carIdx];
    if (!c) return;
    if (el.dataset.idx === String(carIdx) && !el.classList.contains('hidden')) {
      el.classList.add('hidden');
      return;
    }
    el.dataset.idx = String(carIdx);
    const hp = Math.max(0, Math.min(100, c.health));
    const weapon = c.weapon ? (c.weapon === 'rocket' ? T('rocket') : c.weapon === 'mine' ? T('mine') : T('turbo')) : T('none');
    el.innerHTML =
      '<div class="oc-top">' +
        '<img src="' + Portrait.dataUrl(c.driver) + '" alt="">' +
        '<div><b>' + c.driver.name + '</b><span>#' + c.driver.num + ' · ' + bodyName(c.driver.body) + '</span></div>' +
      '</div>' +
      '<div class="oc-row"><i>' + T('lap') + '</i><b>' + Math.max(1, Math.min(c.lap, G.laps)) + '/' + G.laps + '</b></div>' +
      '<div class="oc-row"><i>' + T('speed') + '</i><b>' + Math.round(c.speed / 2.4) + ' km/h</b></div>' +
      '<div class="oc-row"><i>' + T('weapon') + '</i><b>' + weapon + (c.ammo ? ' x' + c.ammo : '') + '</b></div>' +
      '<div class="oc-hp"><i style="width:' + hp + '%"></i></div>';
    el.classList.remove('hidden');
  }

  function endRace() {
    G.state = 'finished';
    $('ladder').classList.add('hidden');
    if (SND) { SND.engineStop(); SND.skidStop(); SND.musicStop(); }
    const p = G.player;
    const pos = positionOf(p);
    if (G.track && G.track.open && !p.bestLap) p.bestLap = p.finishTime;
    if (p.bestLap && G.track) Meta.recordBestLap(G.track.name, p.bestLap);

    let rewards = null, champDone = false;
    if (G.career) {
      rewards = Meta.finishEvent(G.career.champId, pos);
      champDone = rewards.champDone;
      if (champDone) Meta.addDriverWin((DRIVERS[G.selectedDriver] || {}).name);
      G.resultAction = champDone ? 'career' : 'next';
    } else {
      rewards = Meta.finishQuick(pos);
      G.resultAction = 'again';
    }
    const rpDelta = RP_TABLE[Math.min(pos, 4)] || 0;
    const rpNow = Meta.addRP(rpDelta);
    G.rpDelta = rpDelta;
    G.rpNow = rpNow;

    const drvPerk = (DRIVERS[G.selectedDriver] || {}).perk || {};
    rewards.cash = Math.round(rewards.cash * (drvPerk.prize || 1));
    rewards.xp = Math.round(rewards.xp * (drvPerk.xp || 1));
    refreshTopbar();

    document.getElementById('result').classList.remove('hidden');
    document.getElementById('resultTitle').textContent = pos === 1 ? T('winner') : (T('finish') + ' ' + pos + '/4');
    if (SND) {
      if (pos === 1) SND.finish(true); else SND.finish(false);
    }
    document.getElementById('resultStats').innerHTML =
      T('total') + ' ' + fmtTime(p.finishTime) + '<br>' +
      T('bestLap') + ' ' + (p.bestLap ? fmtTime(p.bestLap) : '--');
    const rw = document.getElementById('resultRewards');
    const tier = Meta.tierOf(G.rpNow);
    const rpText = (G.rpDelta >= 0 ? '+' : '') + G.rpDelta + ' RP';
    rw.innerHTML = '+$' + rewards.cash + ' &nbsp; +' + rewards.xp + ' ' + T('xp') +
      ' &nbsp; <span style="color:' + (G.rpDelta >= 0 ? '#7ef0c0' : '#ff8fa0') + '">' + rpText + '</span>' +
      ' <span style="color:' + tier.color + '">· ' + tierName(tier) + ' ' + G.rpNow + '</span>' +
      (champDone ? '<br><span style="color:#ffd479">' + T('champDone') + ' +$' + rewards.prize.cash + ' / +' + rewards.prize.xp + ' XP</span>' : '');
    drawPosChart();
    const oc = document.getElementById('oppCard');
    if (oc) oc.classList.add('hidden');
    const btn = document.getElementById('againBtn');
    btn.textContent = champDone ? T('back') : (G.career ? T('next') : T('again'));
  }

  function positionOf(car) {
    const sorted = [...G.cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    return sorted.indexOf(car) + 1;
  }

  function fmtTime(t) {
    if (t == null) return '--:--.--';
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  // ---------- 武器 ----------
  function playerFire() {
    const p = G.player;
    if (!p || p.finished) return;
    if (p.weapon === 'rocket' && p.ammo > 0) {
      G.rockets.push({ x: p.x + Math.cos(p.angle) * 30, y: p.y + Math.sin(p.angle) * 30,
        angle: p.angle, speed: 780, life: 2.2, owner: p });
      if (SND) SND.rocket();
      p.ammo--;
      if (p.ammo <= 0) { p.weapon = null; }
      updateWeaponHUD();
    } else if (p.weapon === 'mine' && p.ammo > 0) {
      // 手机端没有 Shift，开火键对地雷等价于投放
      G.mines.push({ x: p.x - Math.cos(p.angle) * 34, y: p.y - Math.sin(p.angle) * 34, life: 26, owner: p });
      if (SND) SND.mineDrop();
      p.ammo--;
      if (p.ammo <= 0) p.weapon = null;
      updateWeaponHUD();
    } else if (p.weapon === 'turbo') {
      p.boost = 1.6; p.weapon = null; p.ammo = 0; updateWeaponHUD();
      if (SND) { SND.rocket(); SND.pickup(); }
      showTaunt(pick([T('turboShout'), T('boostShout')]));
    }
  }

  function playerDrop() {
    const p = G.player;
    if (!p || p.finished) return;
    if (p.weapon === 'mine' && p.ammo > 0) {
      G.mines.push({ x: p.x - Math.cos(p.angle) * 34, y: p.y - Math.sin(p.angle) * 34, life: 26, owner: p });
      if (SND) SND.mineDrop();
      p.ammo--;
      if (p.ammo <= 0) p.weapon = null;
      updateWeaponHUD();
    } else {
      p.weapon = null; p.ammo = 0; updateWeaponHUD();
    }
  }

  function updateWeaponHUD() {
    const p = G.player;
    const name = document.getElementById('weaponName');
    const ammo = document.getElementById('weaponAmmo');
    if (!p || !p.weapon) { name.textContent = '无武器'; ammo.textContent = '拾取路上的发光六边形'; return; }
    const label = p.weapon === 'rocket' ? T('rocket') : p.weapon === 'mine' ? T('mine') : T('turbo');
    name.textContent = label + (p.weapon === 'turbo' ? '' : ' x' + p.ammo);
    ammo.textContent = '点击使用';
  }

  // ---------- AI：循迹 + 避让 + 战术层（封堵 / 撞人 / 抢道具） ----------
  const NOTACTICS = location.search.includes('notactics');

  // 战术决策（每 0.2~0.35 秒重算一次，避免抖动）
  function aiDecide(car, fx, fy, track) {
    const T = car.traits;

    // 1) 抢道具：附近有道具，且（手里没武器 或 想抢在别人前面）
    let pkBest = null, pkD = Infinity;
    for (const pk of G.pickups) {
      if (!pk.alive) continue;
      const d = Math.hypot(pk.x - car.x, pk.y - car.y);
      if (d < 230 && d < pkD) { pkD = d; pkBest = pk; }
    }
    if (pkBest) {
      const wantIt = !car.weapon || car.weapon !== pkBest.type;
      if (wantIt && Math.random() < T.loot) {
        const contested = G.cars.some(o => o !== car && !o.finished &&
          Math.hypot(o.x - pkBest.x, o.y - pkBest.y) < pkD + 45);
        return { mode: 'loot', pickup: pkBest, contested: contested };
      }
    }

    // 2) 故意撞人：近距离、偏角不大、目标比我慢或并排
    let ramBest = null, ramScore = 0;
    for (const o of G.cars) {
      if (o === car || o.finished) continue;
      const dx = o.x - car.x, dy = o.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 130 || dist < 12) continue;
      const forward = dx * fx + dy * fy;
      const side = dx * -fy + dy * fx;
      if (forward < -20) continue;
      const ang = Math.abs(Math.atan2(side, forward));
      if (ang > 1.15) continue;
      const gain = o.speed <= car.speed * 1.05 ? 1 : 0.55;   // 撞更快的收益低
      const score = (1 - dist / 130) * gain * T.aggr;
      if (score > ramScore) { ramScore = score; ramBest = o; }
    }
    // 撞人有冷却，避免一路撞过去
    if (ramBest && (car.ramCd || 0) <= 0 && Math.random() < T.aggr * 0.32) {
      car.ramCd = 2.5 + Math.random() * 2;
      return { mode: 'ram', rival: ramBest };
    }

    // 3) 封堵：后方有更快/更近的车想超
    let chase = null, chaseScore = 0;
    for (const o of G.cars) {
      if (o === car || o.finished) continue;
      const dx = o.x - car.x, dy = o.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 200) continue;
      const forward = dx * fx + dy * fy;
      if (forward > -10) continue;                            // 必须在后方
      const threat = (o.speed > car.speed - 6) || (car.progress - o.progress < 140);
      if (!threat) continue;
      const score = (1 - Math.abs(forward) / 200) * T.block;
      if (score > chaseScore) { chaseScore = score; chase = o; }
    }
    if (chase && Math.random() < T.block * 0.9) return { mode: 'block', chaser: chase };

    return { mode: 'race' };
  }

  function aiInput(car, dt) {
    const track = car.track;
    const look = 150 + car.speed * 0.55;
    const target = track.at(car.s + look);
    const lateral = car.lateralBias * (track.width * 0.22);
    const tx = target.x + target.nx * lateral;
    const ty = target.y + target.ny * lateral;
    const desired = Math.atan2(ty - car.y, tx - car.x);
    const diff = wrapAngle(desired - car.angle);

    const ahead = track.at(car.s + 260);
    const curv = Math.abs(wrapAngle(Math.atan2(ahead.ty, ahead.tx) - Math.atan2(target.ty, target.tx)));
    let gas = curv > 0.55 ? car.speed < car.maxSpeed * 0.62 : true;

    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);

    // ---- 战术决策 ----
    let tactic = 'race', dec = { mode: 'race' };
    if (!NOTACTICS && car.traits) {
      car.decTimer = (car.decTimer || 0) - dt;
      if (car.decTimer <= 0) {
        car.decTimer = 0.2 + Math.random() * 0.15;
        car.ramCd = Math.max(0, (car.ramCd || 0) - car.decTimer);
        car.dec = aiDecide(car, fx, fy, track);
      }
      dec = car.dec || { mode: 'race' };
      tactic = dec.mode;
    }
    // 撞击目标不参与避让，否则会互相抵消
    const ramTarget = (tactic === 'ram') ? dec.rival : null;

    // ---- 基础避让 ----
    let avoid = 0, blocked = 0;
    for (const o of G.cars) {
      if (NOAVOID) break;
      if (o === car || o.finished || o === ramTarget) continue;
      const dx = o.x - car.x, dy = o.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 150 || dist < 0.01) continue;
      const forward = (dx * fx + dy * fy);
      const side = (dx * -fy + dy * fx);
      const weight = 1 - dist / 150;
      avoid += (side > 0 ? -1 : 1) * weight * 0.85;
      if (forward > 0 && Math.abs(side) < 34 && dist < 110) {
        blocked = Math.max(blocked, (1 - dist / 110) * (1 - Math.abs(side) / 34));
      }
    }
    for (const m of G.mines) {
      if (NOAVOID) break;
      const dx = m.x - car.x, dy = m.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 130 || dist < 0.01) continue;
      const forward = (dx * fx + dy * fy);
      const side = (dx * -fy + dy * fx);
      if (forward > 0) {
        const w = 1 - dist / 130;
        avoid += (side > 0 ? -1 : 1) * w * 1.1;
        if (Math.abs(side) < 26) blocked = Math.max(blocked, w * 0.7);
      }
    }

    // ---- 战术转向 ----
    let steer = clamp(diff * 2.4 + avoid, -1, 1);
    let brake = blocked > 0.75;

    if (tactic === 'loot' && dec.pickup && dec.pickup.alive) {
      const ang = Math.atan2(dec.pickup.y - car.y, dec.pickup.x - car.x);
      const dd = wrapAngle(ang - car.angle);
      steer = clamp(dd * 2.9 + avoid * 0.45 + diff * 0.25, -1, 1);
      gas = true;
      if (dec.contested && car.weapon === 'turbo') { car.boost = 1.3; car.weapon = null; }
      if (G.tactics) G.tactics.loot += dt;
    } else if (tactic === 'ram' && dec.rival && !dec.rival.finished) {
      const rv = dec.rival;
      const ang = Math.atan2(rv.y - car.y, rv.x - car.x);
      const dd = wrapAngle(ang - car.angle);
      steer = clamp(dd * 2.8 + avoid * 0.35, -1, 1);
      gas = true;
      brake = false;
      // 撞击瞬间给一点加成，让"故意撞"更有威胁
      if (car.traits.aggr > 0.6 && car.boost <= 0 && Math.random() < dt * 0.5) car.boost = 0.45;
      if (G.tactics) G.tactics.ram += dt;
    } else if (tactic === 'block' && dec.chaser && !dec.chaser.finished) {
      const ch = dec.chaser;
      const chLat = track.nearest(ch.x, ch.y).lateral;
      const want = clamp(chLat, -track.width * 0.3, track.width * 0.3);
      const p2 = track.at(car.s + 95);
      const bx = p2.x + p2.nx * want;
      const by = p2.y + p2.ny * want;
      const ang = Math.atan2(by - car.y, bx - car.x);
      const dd = wrapAngle(ang - car.angle);
      steer = clamp(dd * 2.6 + diff * 0.3, -1, 1);
      gas = true;
      if (G.tactics) G.tactics.block += dt;
      // 封堵时故意挤一点车距，但不主动撞
      if (Math.hypot(ch.x - car.x, ch.y - car.y) < 60) brake = false;
    }

    const gasOut = gas && (tactic !== 'race' ? true : blocked < 0.55);

    // ---- 武器 ----
    if (car.weapon === 'rocket' && car.ammo > 0 && Math.random() < dt * 0.35) {
      const aheadCar = G.cars.find(c => c !== car && !c.finished &&
        (c.progress - car.progress) > 0 && (c.progress - car.progress) < 180);
      if (aheadCar) {
        G.rockets.push({ x: car.x + Math.cos(car.angle) * 30, y: car.y + Math.sin(car.angle) * 30,
          angle: car.angle, speed: 760, life: 2.0, owner: car });
        car.ammo--; if (car.ammo <= 0) car.weapon = null;
      }
    }
    if (car.weapon === 'turbo' && Math.random() < dt * 0.25) { car.boost = 1.4; car.weapon = null; }

    car.blocked = blocked;
    car.tactic = tactic;
    return { steer: steer, gas: gasOut, brake: brake };
  }

  // ---------- 碰撞 ----------
  function resolveCollisions(dt) {
    for (let i = 0; i < G.cars.length; i++) {
      for (let j = i + 1; j < G.cars.length; j++) {
        const a = G.cars[i], b = G.cars[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = 34;
        if (d < minD && d > 0.001) {
          G.collisions = (G.collisions || 0) + 1;
          const push = (minD - d) / 2;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
          a.speed *= 0.94; b.speed *= 0.94;
          if (Math.random() < 0.02) spark((a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      }
    }

    // 火箭
    for (let i = G.rockets.length - 1; i >= 0; i--) {
      const r = G.rockets[i];
      r.x += Math.cos(r.angle) * r.speed * dt;
      r.y += Math.sin(r.angle) * r.speed * dt;
      r.life -= dt;
      if (Math.random() < 0.7) G.particles.push({ x: r.x, y: r.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, max: 0.3, r: 3, color: '255,80,180' });
      let hit = false;
      for (const c of G.cars) {
        if (c === r.owner || c.finished) continue;
        if (Math.hypot(c.x - r.x, c.y - r.y) < 26) {
          c.health -= 34 / (c.armor || 1); c.speed *= 0.45; c.stun = 0.65;
          hit = true;
          explosion(c.x, c.y);
          if (SND) { SND.explosion(); if (c.isPlayer) SND.damage(); }
          if (c.health <= 0) { c.health = 100; c.speed = 0; showTaunt(pick(['CAR DAMAGED!', '#PS1CAR DAMAGED!'])); }
          if (c.isPlayer) showTaunt(pick(TALK));
          break;
        }
      }
      const near = G.track.nearest(r.x, r.y);
      if (hit || r.life <= 0 || Math.abs(near.lateral) > G.track.width * 0.8) G.rockets.splice(i, 1);
    }

    // 地雷
    for (let i = G.mines.length - 1; i >= 0; i--) {
      const m = G.mines[i];
      m.life -= dt;
      for (const c of G.cars) {
        if (c.finished || c === m.owner) continue;
        if (Math.hypot(c.x - m.x, c.y - m.y) < 24) {
          c.health -= 26 / (c.armor || 1); c.speed *= 0.3; c.stun = 0.8;
          explosion(m.x, m.y);
          if (SND) { SND.explosion(); if (c.isPlayer) SND.damage(); }
          m.life = -1;
          if (c.isPlayer) showTaunt(pick(TALK));
          break;
        }
      }
      if (m.life <= 0) G.mines.splice(i, 1);
    }

    // 拾取
    for (const pk of G.pickups) {
      if (!pk.alive) { pk.respawn -= dt; if (pk.respawn <= 0) pk.alive = true; continue; }
      for (const c of G.cars) {
        if (c.finished) continue;
        if (Math.hypot(c.x - pk.x, c.y - pk.y) < 28 * (c.pickupR || 1)) {
          pk.alive = false; pk.respawn = 9;
          if (SND && c.isPlayer) SND.pickup();
          c.picked = (c.picked || 0) + 1;
          c.weapon = pk.type;
          c.ammo = pk.type === 'turbo' ? 1 : 3;
          if (c.isPlayer) {
            updateWeaponHUD();
            const wn = pk.type === 'rocket' ? T('rocket') : pk.type === 'mine' ? T('mine') : T('turbo');
            toast('获得 ' + wn + (pk.type === 'turbo' ? ' · 点击开火加速' : pk.type === 'mine' ? ' · 点击开火布雷' : ' x' + c.ammo + ' · 点击开火发射'));
          }
          break;
        }
      }
    }
  }

  function spark(x, y) {
    for (let i = 0; i < 6; i++) {
      G.particles.push({ x, y, vx: rand(-90, 90), vy: rand(-90, 90), life: 0.35, max: 0.35, r: rand(1, 3), color: '255,220,140' });
    }
  }
  function explosion(x, y) {
    G.particles.push({ x, y, vx: 0, vy: 0, life: 0.55, max: 0.55, r: 46, color: '255,150,60', boom: true });
    for (let i = 0; i < 14; i++) {
      G.particles.push({ x, y, vx: rand(-220, 220), vy: rand(-220, 220), life: rand(0.3, 0.7), max: 0.7, r: rand(2, 6), color: '255,120,60' });
    }
  }

  // ---------- UI ----------
  function showTaunt(text) {
    if (!text) return;
    const el = document.getElementById('taunt');
    el.textContent = text;
    el.classList.remove('hidden');
    G.tauntTimer = 3.2;
  }
  function showBanner(text) {
    const el = document.getElementById('banner');
    el.textContent = text;
    el.classList.remove('hidden');
    G.bannerTimer = 1.4;
  }
  function togglePause() {
    if (G.state === 'racing') { G.state = 'paused'; if (SND) { SND.engineStop(); SND.skidStop(); } document.getElementById('pause').classList.remove('hidden'); }
    else if (G.state === 'paused') { G.state = 'racing'; if (SND) SND.engineStart(); document.getElementById('pause').classList.add('hidden'); }
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  let fpsAcc = 0, fpsFrames = 0, fpsShown = 0;
  function frame(now) {
    const rawDt = (now - last) / 1000;
    const dt = Math.min(0.033, rawDt);
    // ?perf=1：每 90 帧输出一次帧时间统计，用于定位卡顿
    if (location.search.includes('perf')) {
      G.__mx = Math.max(G.__mx || 0, rawDt);
      G.__acc = (G.__acc || 0) + rawDt;
      G.__n = (G.__n || 0) + 1;
      if (G.__n >= 90) {
        G.__perfTxt = 'avg ' + ((G.__acc / G.__n) * 1000).toFixed(1) + 'ms · max ' + (G.__mx * 1000).toFixed(0) + 'ms';
        G.__mx = 0; G.__acc = 0; G.__n = 0;
      }
    }
    last = now;
    resizeCanvas();   // 每帧自愈：窗口/视口变化都能跟上
    fpsAcc += dt; fpsFrames++;

    if (fpsAcc >= 0.5) {
      fpsShown = Math.round(fpsFrames / fpsAcc);
      fpsAcc = 0; fpsFrames = 0;
      const el = document.getElementById('fps');
      if (el) {
        let txt = fpsShown + ' FPS';

        el.textContent = txt;
      }
    }
    try {
      update(dt);
      render(now / 1000);
    } catch (err) {
      G._err = (err && err.stack) ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err);
      try { console.log('FRAME_ERR ' + G._err); } catch (e) {}
      const ed = document.getElementById('fps');
      if (ed) ed.textContent = 'ERR ' + String(err).slice(0, 60);
    }
    requestAnimationFrame(frame);
  }

  function writeStats() {
    try {
      const p = G.player || {};
      const t = G.tactics || {};
      let aiPicked = 0;
      if (G.cars) for (const c of G.cars) if (!c.isPlayer) aiPicked += (c.picked || 0);
      const txt = 'COLL=' + (G.collisions || 0)
        + ' BLOCK=' + (Number(t.block) || 0).toFixed(1)
        + ' RAM=' + (Number(t.ram) || 0).toFixed(1)
        + ' LOOT=' + (Number(t.loot) || 0).toFixed(1)
        + ' AIPICK=' + aiPicked
        + ' PPICK=' + (p.picked || 0)
        + ' LAP=' + (p.lap || 0);
      let d = document.getElementById('simstats');
      if (!d) {
        d = document.createElement('div');
        d.id = 'simstats';
        d.style.cssText = 'position:fixed;left:10px;bottom:10px;background:rgba(0,20,30,.92);color:#7dffb0;font:12px monospace;padding:8px 10px;z-index:99999;border:1px solid #2a6';
        (document.body || document.documentElement).appendChild(d);
      }
      d.textContent = txt + (window.__WARMUP_ERR ? (' ERR: ' + window.__WARMUP_ERR) : '');
      document.title = 'SIMTITLE ' + txt;
    } catch (err) {
      document.title = 'ERR ' + (err && err.message);
    }
  }

  function update(dt) {
    if (G.state === 'countdown') {
      G.countdown -= dt;
      const n = Math.ceil(G.countdown - 0.6);
      if (n <= 3 && n >= 1 && G.bannerTimer <= 0) showBanner(String(n));
      if (n !== G.lastBeep && n >= 1 && n <= 3) { G.lastBeep = n; if (SND) SND.countdownBeep(false); }
      if (G.countdown <= 0.6 && G.bannerTimer <= 0) { showBanner(T('go')); hideLineup(); if (SND) SND.countdownBeep(true); }
      if (G.countdown <= 0) { G.state = 'racing'; }
    }
    if (G.state !== 'racing' && G.state !== 'countdown') return;

    if (G.state === 'racing') G.raceTime += dt;

    // 玩家输入
    // 进入比赛后收起发车面板（兜底，防止倒计时被打断时残留）
    if (G.state === 'racing' && G.cars.length) {
      const lu = $('lineup');
      if (lu && !lu.classList.contains('hidden')) hideLineup();
    }

    const p = G.player;
    let steer = 0, gas = false, brake = false;
    if (G.state === 'racing') {
      if (KEYS['KeyA'] || KEYS['ArrowLeft'] || touch.left) steer -= 1;
      if (KEYS['KeyD'] || KEYS['ArrowRight'] || touch.right) steer += 1;
      gas = !!(KEYS['KeyW'] || KEYS['ArrowUp'] || touch.gas);
      brake = !!(KEYS['KeyS'] || KEYS['ArrowDown'] || touch.brake);
    }
    for (const c of G.cars) {
      if (c.finished) continue;
      let inp;
      if (c === p && !AUTOPLAY) inp = { steer, gas, brake };
      else inp = aiInput(c, dt);
      // 倒计时不要踩刹车（会把静止的车推向负速度，看起来像倒车）
      if (G.state === 'countdown') inp = { steer: 0, gas: false, brake: false };
      c.update(dt, inp);
    }
    resolveCollisions(dt);

    // 相机
    const aheadX = p.x + Math.cos(p.angle) * Math.min(160, p.speed * 0.42);
    const aheadY = p.y + Math.sin(p.angle) * Math.min(160, p.speed * 0.42);
    G.camX = lerp(G.camX, aheadX, 1 - Math.pow(0.0009, dt));
    G.camY = lerp(G.camY, aheadY, 1 - Math.pow(0.0009, dt));

    // 相机软钳制：只保证镜头不飞出地图太多，绝不把玩家挤出画面
    if (G.map) {
      const inset = 40;   // 只允许镜头略微出界，避免露出大面积纯色边缘
      G.camX = Math.max(G.map.x + inset, Math.min(G.map.x + G.map.w - inset, G.camX));
      G.camY = Math.max(G.map.y + inset, Math.min(G.map.y + G.map.h - inset, G.camY));
    }

    // 粒子
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const q = G.particles[i];
      q.life -= dt;
      if (!q.boom) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; }
      if (q.life <= 0) G.particles.splice(i, 1);
    }

    if (location.search.includes('banners') && G.state === 'racing') {
      G.__bt = (G.__bt || 0) + dt;
      if (G.__bt >= 2) { G.__bt = 0; showBanner(T('lap') + ' ' + (1 + (Math.random() * 3 | 0))); }
    }

    // HUD（只在值变化时写 DOM，避免每帧重排/重绘）
    if (G.state === 'racing') {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el && el._v !== val) { el._v = val; el.textContent = val; }
      };
      G.hudT = (G.hudT || 0) + dt;
      if (G.hudT >= 0.05) {      // 计时/速度 20Hz 刷新足够
        G.hudT = 0;
        setTxt('raceTime', fmtTime(G.raceTime));
        setTxt('spdNum', String(Math.round(Math.abs(p.speed) * 0.72)));
        setTxt('posNum', String(positionOf(p)));
        setTxt('bestLap', T('best') + ' ' + (p.bestLap ? fmtTime(p.bestLap) : '--:--.--'));
      }
      setTxt('lapNum', String(Math.max(1, Math.min(p.lap, LAPS))));
      const f = document.getElementById('fps');
      const ftxt = fpsShown + ' FPS' + (G.__perfTxt ? ' · ' + G.__perfTxt : '');
      if (f && f._v !== ftxt) { f._v = ftxt; f.textContent = ftxt; }
      const hf = document.getElementById('healthFill');
      const hp = clamp(p.health, 0, 100);
      if (hf && hf._hp !== hp) {
        hf._hp = hp;
        hf.style.width = hp + '%';
        const col = hp > 55 ? 'linear-gradient(90deg,#28e07a,#8ef03a)'
          : hp > 25 ? 'linear-gradient(90deg,#e0c528,#f0a13a)' : 'linear-gradient(90deg,#e02828,#f06a3a)';
        if (hf._col !== col) { hf._col = col; hf.style.background = col; }
      }
      if (p.lap !== G.lastLapShown && p.lap <= LAPS) {
        G.lastLapShown = p.lap;
        showBanner(T('lap') + ' ' + p.lap);
        if (SND) SND.lapChime();
      }
      // 引擎 / 打滑音频
      if (SND && SND.ready) {
        const ratio = clamp(Math.abs(p.speed) / p.maxSpeed, 0, 1);
        const near = G.track.nearest(p.x, p.y);
        const off = Math.abs(near.lateral) > G.track.width / 2 * 0.92;
        SND.engineUpdate(ratio, gas ? 1 : 0, off);
        if (p.stun > 0 || p.finished) { /* 撞击后引擎降噪 */ }
        if (p.drift > 0.18 || off) { SND.skidStart(); SND.skidUpdate(Math.max(p.drift, off ? 0.5 : 0), off); }
        else SND.skidStop();
      }
      // 超车台词
      if (Math.random() < dt * 0.06) showTaunt(pick(TALK));
    }

    if (G.state === 'racing') {
      G.posT = (G.posT || 0) + dt;
      if (G.posT >= 0.5) {
        G.posT = 0;
        const snap = [...G.cars].sort((a, b) => {
          if (a.finished && b.finished) return a.finishTime - b.finishTime;
          if (a.finished) return -1;
          if (b.finished) return 1;
          return b.progress - a.progress;
        });
        G.posHist.push(snap.map(c => G.cars.indexOf(c)));
        if (G.posHist.length > 240) G.posHist.shift();
      }
    }

    // 幽灵实时差值（对比最佳圈）
    G.ghostT = (G.ghostT || 0) + dt;
    if (G.ghostT > 0.1) {
      G.ghostT = 0;
      const gd = document.getElementById('ghostDelta');
      if (gd) {
        if (G.ghost && G.ghost.best && G.player && G.state === 'racing' && typeof Ghost !== 'undefined') {
          const p = G.player;
          const lapElapsed = G.raceTime - (p.lapStart || 0);
          const gt = Ghost.timeAtS(G.ghost.best, p.s);
          const d = lapElapsed - gt;
          gd.textContent = (d >= 0 ? '+' : '') + d.toFixed(2) + 's';
          gd.style.color = d <= 0 ? '#7ef0c0' : '#ff8fa0';
        } else {
          gd.textContent = '';
        }
      }
    }

    G.ladderT = (G.ladderT || 0) + dt;
    if (G.ladderT > 0.2) { G.ladderT = 0; updateLadder(false); }

    if (G.tauntTimer > 0) { G.tauntTimer -= dt; if (G.tauntTimer <= 0) document.getElementById('taunt').classList.add('hidden'); }
    if (G.bannerTimer > 0) { G.bannerTimer -= dt; if (G.bannerTimer <= 0) document.getElementById('banner').classList.add('hidden'); }
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07080d';
    ctx.fillRect(0, 0, VW, VH);
    if (!G.track) return;

    const Z = ZOOM;
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.scale(Z, Z);
    ctx.translate(-G.camX, -G.camY);

    // 地图外区域用主题底色填满，避免出现黑边
    if (G.map && G.map.theme) {
      const halfW = (VW / Z) / 2 + 40, halfH = (VH / Z) / 2 + 40;
      ctx.fillStyle = G.map.edgeColor || G.map.theme.grass;
      ctx.fillRect(G.camX - halfW, G.camY - halfH, halfW * 2, halfH * 2);
    }

    // 地图瓦片：只绘制与可视范围相交的块
    if (G.map && G.map.tiles) {
      const halfW = (VW / Z) / 2 + 40, halfH = (VH / Z) / 2 + 40;
      const left = G.camX - halfW, right = G.camX + halfW;
      const top = G.camY - halfH, bottom = G.camY + halfH;
      const tiles = G.map.tiles;
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        if (t.x > right || t.x + t.w < left || t.y > bottom || t.y + t.h < top) continue;
        // 瓦片位图可能是高清的（S>1），必须按世界尺寸绘制
        ctx.drawImage(t.canvas, t.x, t.y, t.w, t.h);
      }
    }

    // 拾取物
    for (const pk of G.pickups) {
      if (!pk.alive) continue;
      Art.pickup(ctx, pk.x, pk.y, pk.type, t);
    }
    // 地雷
    for (const m of G.mines) Art.mine(ctx, m.x, m.y, t);

    // 爆炸（车下层）
    for (const q of G.particles) {
      if (q.boom) Art.explosion(ctx, q.x, q.y, q.r * (1.6 - q.life / q.max), q.life / q.max);
    }

    // 幽灵车（最佳圈回放）
    if (G.ghost && G.ghost.best && G.player && (G.state === 'racing' || G.state === 'countdown')) {
      const elapsed = Math.max(0, G.raceTime - (G.player.lapStart || 0));
      const gi = Math.floor(elapsed / (G.ghost.rate || 0.05));
      const gp = G.ghost.best.pts[gi];
      if (gp) {
        ctx.save();
        ctx.globalAlpha = 0.42;
        Art.car(ctx, gp[0], gp[1], gp[2],
          { name: 'ghost', main: '#9fe8ff', dark: '#173743', light: '#e8fbff', body: 'sport', num: 0 },
          { scale: 1.0 });
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = 'rgba(140,230,255,.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(gp[0], gp[1], 26, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 车影 + 车
    const sorted = [...G.cars].sort((a, b) => a.y - b.y);
    for (const c of sorted) {
      Art.car(ctx, c.x, c.y, c.angle, c.driver,
        { thrust: clamp(c.speed / c.maxSpeed, 0, 1), damage: 1 - c.health / 100, scale: 1, braking: c.blocked > 0.5 });

      if (!c.isPlayer) {
        ctx.fillStyle = 'rgba(210,230,250,.6)';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.driver.name, c.x, c.y - 34);
      }
    }

    // 火箭 / 普通粒子
    for (const r of G.rockets) Art.rocket(ctx, r.x, r.y, r.angle);
    for (const q of G.particles) {
      if (q.boom) continue;
      const a = q.life / q.max;
      ctx.fillStyle = 'rgba(' + q.color + ',' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r * a, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // 暗角（缓存渐变）
    if (!G._vg || G._vgW !== VW || G._vgH !== VH) {
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,.55)');
      G._vg = vg; G._vgW = VW; G._vgH = VH;
    }
    ctx.fillStyle = G._vg;
    ctx.fillRect(0, 0, VW, VH);

    drawMinimap();
  }

  function drawMinimap() {
    const pad = 16;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    let size = Math.round(Math.min(150, Math.max(96, VH * 0.18)));
    const bx = VW - size - pad, by = VH - size - pad - (coarse ? 92 : 0);

    ctx.save();
    ctx.beginPath();
    Art.roundRect(ctx, bx, by, size, size, 8);
    ctx.clip();
    ctx.fillStyle = 'rgba(8,14,20,.9)';
    ctx.fillRect(bx, by, size, size);

    if (G.map) {
      const s2 = Math.min(size / G.map.w, size / G.map.h);
      const dw = G.map.w * s2, dh = G.map.h * s2;
      const ox = bx + (size - dw) / 2;
      const oy = by + (size - dh) / 2;
      if (G.map.thumb) ctx.drawImage(G.map.thumb, ox, oy, dw, dh);

      // 车手位置
      for (const c of G.cars) {
        const px = ox + (c.x - G.map.x) * s2;
        const py = oy + (c.y - G.map.y) * s2;
        ctx.fillStyle = c.isPlayer ? '#ffffff' : c.driver.main;
        ctx.beginPath(); ctx.arc(px, py, c.isPlayer ? 3.4 : 2.4, 0, TAU); ctx.fill();
        if (c.isPlayer) {
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, 6.5, 0, TAU); ctx.stroke();
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(90,200,255,.45)';
    ctx.lineWidth = 1.5;
    Art.roundRect(ctx, bx, by, size, size, 8);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 菜单 / 生涯 / 车库 / 商店 ----------
  const $ = (id) => document.getElementById(id);

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add('hidden'), 1600);
  }

  function refreshTopbar() {
    $('uiCash').textContent = '$ ' + Meta.data.cash.toLocaleString();
    $('uiLevel').textContent = T('level') + ' ' + Meta.level() + ' · ' + Meta.data.xp + ' ' + T('xp');
    $('uiRecord').textContent = Meta.data.wins + T('wins') + ' / ' + Meta.data.races + T('races');
  }

  // 首页背景：赛道弧线 + 玩家车（一次性绘制，不参与每帧）
  function drawMenuBg() {
    const cv = document.getElementById('menuBg');
    if (!cv || !cv.clientWidth) return;
    const w = cv.clientWidth | 0, h = cv.clientHeight | 0;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, w, h);

    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a1420'); bg.addColorStop(0.55, '#0a1018'); bg.addColorStop(1, '#05070b');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);

    const glow = g.createRadialGradient(w * 0.72, h * 0.42, 10, w * 0.72, h * 0.42, w * 0.5);
    glow.addColorStop(0, 'rgba(40,150,220,.22)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);

    // 赛道弧线
    g.save();
    g.lineCap = 'round';
    const road = (lw, style) => {
      g.beginPath();
      g.moveTo(w * 0.28, h * 1.28);
      g.quadraticCurveTo(w * 0.60, h * 0.12, w * 1.22, h * 0.34);
      g.lineWidth = lw; g.strokeStyle = style; g.stroke();
    };
    road(h * 0.52, '#1b1f25');
    road(h * 0.50, '#31363d');
    road(h * 0.008, 'rgba(215,225,235,.5)');
    g.setLineDash([h * 0.05, h * 0.04]);
    road(h * 0.010, 'rgba(240,240,230,.32)');
    g.setLineDash([]);
    g.restore();

    const drv = DRIVERS[Meta.driverIdx] || DRIVERS[0];
    const cs = Math.max(2.0, h / 200);
    Art.setSuperSample(4);
    const cg = g.createRadialGradient(w * 0.70, h * 0.60, 4, w * 0.70, h * 0.60, h * 0.36);
    cg.addColorStop(0, 'rgba(90,200,255,.26)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cg; g.fillRect(0, 0, w, h);
    Art.car(g, w * 0.70, h * 0.58, -Math.PI / 2 + 0.42, drv, { scale: cs });

    const vg = g.createRadialGradient(w * 0.55, h * 0.5, h * 0.25, w * 0.55, h * 0.5, w * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.76)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }

  function showView(name) {
    ['home', 'quick', 'career', 'garage', 'shop', 'drivers', 'editor'].forEach(v => {
      const el = $('view-' + v);
      if (el) el.classList.toggle('hidden', v !== name);
    });
    G.view = name;
    refreshTopbar();
    if (name === 'home') {
      renderHome();
      drawMenuBg();
      const first = document.querySelector('.menu-item');
      if (first) first.classList.add('sel');
    }
  }
  addEventListener('resize', () => { if (G.view === 'home') drawMenuBg(); });

  function renderHome() {
    const st = Meta.champState('rookie');
    const ch = Meta.champOf('rookie');
    $('careerHint').textContent = st.done ? 'ROOKIE CUP 已完成，继续挑战正赛'
      : (st.started ? ('进行中 · 第 ' + (st.event + 1) + '/' + ch.races + ' 场') : ch.desc);
    $('garageHint').textContent = Meta.car.name + ' · ' + Meta.data.cars.length + ' ' + T('cars');
    const s = Meta.stats();
    $('currentCarInfo').textContent = T('current') + '  ' + s.name +
      '   ' + T('speed') + ' ' + Math.round(s.speed) + '   ' + T('accel') + ' ' + Math.round(s.accel) +
      '   ' + T('grip') + ' ' + s.handling.toFixed(2) + (s.startWeapon ? '   · 自带 ROCKET x' + s.startAmmo : '');
  }

  function renderCareer() {
    const dv = $('careerDriver');
    if (dv) {
      const d = DRIVERS[G.selectedDriver];
      dv.innerHTML =
        '<div class="db-avatar" style="background:radial-gradient(circle at 35% 30%,' + d.light + ',' + d.main + ' 55%,' + d.dark + ')">' + d.num + '</div>' +
        '<div class="db-text"><b>' + d.name + '</b><span>赞助商 ' + (d.sponsor || '-') + ' · ' + (d.perkText || '') +
        ' · 生涯胜场 ' + Meta.driverWins(d.name) + '</span>' +
        '<span style="color:' + Meta.tierOf(Meta.profileOf(G.selectedDriver).rp || 1000).color + '">' +
        tierName(Meta.tierOf(Meta.profileOf(G.selectedDriver).rp || 1000)) + ' ' +
        (Meta.profileOf(G.selectedDriver).rp || 1000) + ' RP</span></div>' +
        '<button class="db-change" id="changeDriver">换车手</button>';
      const cb = document.getElementById('changeDriver');
      if (cb) cb.onclick = () => {
        if (SND) SND.uiClick();
        G.driverReturn = 'career';
        renderDrivers();
        showView('drivers');
      };
    }
    const box = $('champList');
    box.innerHTML = '';
    Meta.CHAMPS.forEach((ch, i) => {
      const st = Meta.champState(ch.id);
      const prev = i === 0 ? null : Meta.CHAMPS[i - 1];
      const locked = prev ? !Meta.champState(prev.id).done : false;
      const div = document.createElement('div');
      div.className = 'champ' + (locked ? ' locked' : '');
      const info = document.createElement('div');
      info.innerHTML = '<h3>' + champName(ch) + '</h3><p>' + ch.desc + '</p>' +
        '<div class="meta">' + (locked ? (T('lockedBy') + ' ' + champName(prev))
          : (st.done ? T('done') : T('progress') + ' ' + st.event + '/' + ch.races)) + '</div>';
      const btn = document.createElement('button');
      btn.textContent = st.done ? T('replay') : (st.started ? T('cont') : T('start'));
      btn.disabled = locked;
      btn.onclick = () => { if (SND) SND.uiConfirm(); startCareerRace(ch.id); };
      div.appendChild(info);
      div.appendChild(btn);
      box.appendChild(div);
    });
  }

  function startCareerRace(champId) {
    const st = Meta.champState(champId);
    if (!st.started) Meta.startChamp(champId);
    const ev = Meta.nextEvent(champId);
    startRace(ev.track, { career: { champId: champId }, laps: ev.laps, skill: ev.skill, defer: true });
  }

  function statBar(label, v) {
    const w = Math.round(clamp(v, 0.04, 1) * 100);
    return '<div class="statsbar"><span class="lbl">' + label + '</span>' +
      '<span class="bar"><i style="width:' + w + '%"></i></span><span>' + w + '</span></div>';
  }

  function renderGarage() {
    const ul = $('garageList');
    ul.innerHTML = '';
    Meta.data.cars.forEach(id => {
      const car = Meta.get(id);
      const li = document.createElement('li');
      li.textContent = car.name + (id === Meta.data.currentCar ? ' ✓' : '');
      li.className = id === Meta.data.currentCar ? 'active' : '';
      li.onclick = () => {
        Meta.selectCar(id);
        if (SND) SND.uiClick();
        renderGarage(); renderHome(); refreshTopbar();
      };
      ul.appendChild(li);
    });
    const s = Meta.stats();
    $('garageCarName').textContent = s.name;
    const u = Meta.upgOf(s.id);
    $('garageStats').innerHTML =
      statBar(T('speed'), (s.speed - 380) / 120) +
      statBar(T('accel'), (s.accel - 300) / 130) +
      statBar(T('grip'), (s.handling - 0.9) / 0.4) +
      '<div class="detail">' + Meta.UPGRADES.engine.name + ' Lv.' + u.engine +
      ' &nbsp;·&nbsp; ' + Meta.UPGRADES.tires.name + ' Lv.' + u.tires +
      ' &nbsp;·&nbsp; ' + Meta.UPGRADES.weapon.name + ' Lv.' + u.weapon +
      '<br>' + T('upgradeHint') + '</div>';
  }

  let shopTab = 'cars';

  function renderShop() {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === shopTab));
    const ul = $('shopList');
    ul.innerHTML = '';
    if (shopTab === 'cars') {
      Meta.CARS.forEach(car => {
        const owned = Meta.data.cars.includes(car.id);
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = car.name;
        const right = document.createElement('span');
        right.style.cssText = 'display:flex;gap:10px;align-items:center';
        const price = document.createElement('span');
        price.style.color = owned ? '#7dffb0' : '#ffd479';
        price.textContent = owned ? T('owned') : '$' + car.price;
        right.appendChild(price);
        if (!owned) {
          const b = document.createElement('button');
          b.textContent = T('buy');
          b.style.cssText = 'padding:5px 14px;font-size:11px;letter-spacing:1px';
          b.onclick = (e) => {
            e.stopPropagation();
            const r = Meta.buyCar(car.id);
            toast(r.msg);
            if (SND) SND.uiClick();
            renderShop(); renderGarage(); renderHome(); refreshTopbar();
          };
          right.appendChild(b);
        }
        li.appendChild(label); li.appendChild(right);
        li.onclick = () => {
          $('shopDetail').innerHTML = '<b style="color:' + car.color + '">' + car.name + '</b><br>' + car.desc +
            '<br><br>SPEED ' + car.speed + ' · ACCEL ' + car.accel + ' · GRIP ' + car.handling.toFixed(2) +
            '<br>价格 $' + car.price;
        };
        ul.appendChild(li);
      });
      $('shopDetail').innerHTML = T('chooseItem') + '<br><br>' + T('current') + ': ' + Meta.car.name;
    } else {
      const carId = Meta.data.currentCar;
      ['engine', 'tires', 'weapon'].forEach(slot => {
        const up = Meta.UPGRADES[slot];
        const lv = Meta.upgOf(carId)[slot];
        const price = Meta.upgradePrice(carId, slot);
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = upgName(up) + '  ' + T('level') + ' ' + lv + '/3';
        const right = document.createElement('span');
        right.style.cssText = 'display:flex;gap:10px;align-items:center';
        const priceEl = document.createElement('span');
        priceEl.style.color = price == null ? '#8fa8bd' : '#ffd479';
        priceEl.textContent = price == null ? T('max') : '$' + price;
        right.appendChild(priceEl);
        if (price != null) {
          const b = document.createElement('button');
          b.textContent = T('buy');
          b.style.cssText = 'padding:5px 14px;font-size:11px;letter-spacing:1px';
          b.onclick = (e) => {
            e.stopPropagation();
            const r = Meta.buyUpgrade(carId, slot);
            toast(r.msg);
            if (SND) SND.uiClick();
            renderShop(); renderGarage(); renderHome(); refreshTopbar();
          };
          right.appendChild(b);
        }
        li.appendChild(label); li.appendChild(right);
        li.onclick = () => {
          $('shopDetail').innerHTML = '<b>' + up.name + '</b><br>' + up.desc +
            '<br><br>当前等级 ' + lv + ' / 3' + (price != null ? ('<br>升级价格 $' + price) : '<br>已满级');
        };
        ul.appendChild(li);
      });
      $('shopDetail').innerHTML = '升级对象：' + Meta.car.name + '<br><br>' +
        'ENGINE +速度/加速 · TIRES +转向 · WEAPONS 开局携带火箭';
    }
  }

  function navClick(id, fn) {
    const el = $(id);
    if (!el) return;
    el.onclick = () => { if (SND) SND.uiClick(); fn(); };
  }

  navClick('navCareer', () => { renderCareer(); showView('career'); });
  navClick('navQuick', () => { buildQuickLists(); showView('quick'); });
  navClick('navGarage', () => { renderGarage(); showView('garage'); });
  navClick('navShop', () => { renderShop(); showView('shop'); });
  navClick('backQuick', () => showView('home'));
  navClick('backCareer', () => { renderHome(); showView('home'); });
  navClick('backGarage', () => { renderHome(); showView('home'); });
  navClick('backShop', () => { renderHome(); showView('home'); });

  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => { shopTab = t.dataset.tab; if (SND) SND.uiClick(); renderShop(); };
  });

  // ---------- 车手选择（头像 + 排名） ----------
  let driverSel = 0;
  const DOLLAR = String.fromCharCode(36);

  function rosterRanked() {
    const rows = DRIVERS.map((d, i) => ({ d: d, i: i, p: Meta.profileOf(i) }));
    rows.sort((a, b) =>
      (b.p.champsWon - a.p.champsWon) ||
      (b.p.wins - a.p.wins) ||
      (b.p.xp - a.p.xp) ||
      a.d.name.localeCompare(b.d.name));
    rows.forEach((r, idx) => { r.rank = idx + 1; });
    return rows;
  }

  function renderDrivers() {
    driverSel = G.selectedDriver;
    const ul = $('driverRoster');
    ul.innerHTML = '';
    rosterRanked().forEach(r => {
      const li = document.createElement('li');
      li.className = 'roster-row' + (r.i === driverSel ? ' active' : '');
      const rankCls = r.rank === 1 ? ' gold' : (r.rank <= 3 ? ' top' : '');

      const rank = document.createElement('div');
      rank.className = 'rr-rank' + rankCls;
      rank.textContent = r.rank;

      const pic = document.createElement('canvas');
      pic.className = 'rr-pic';
      pic.width = 88; pic.height = 88;
      pic.getContext('2d').drawImage(Portrait.get(r.d), 0, 0, 88, 88);

      const info = document.createElement('div');
      info.className = 'rr-info';
      info.innerHTML =
        '<b>' + r.d.name + '</b>' +
        '<span>' + (r.d.sponsor || '-') + '</span>' +
        '<em><span style="color:' + Meta.tierOf(r.p.rp || 1000).color + '">' + tierName(Meta.tierOf(r.p.rp || 1000)) + ' ' + (r.p.rp || 1000) + '</span>' +
          ' · ★' + r.p.champsWon + ' · ' + r.p.wins + T('wins') + ' / ' + r.p.races + T('races') + '</em>';

      li.appendChild(rank);
      li.appendChild(pic);
      li.appendChild(info);
      li.onclick = () => { driverSel = r.i; if (SND) SND.uiClick(); renderDrivers(); };
      ul.appendChild(li);
    });
    renderDriverDetail();
  }

  function renderDriverDetail() {
    const d = DRIVERS[driverSel];
    const p = Meta.profileOf(driverSel);
    const box = $('driverDetail');
    box.innerHTML =
      '<div class="dd-top">' +
        '<canvas class="dd-pic" width="260" height="260"></canvas>' +
        '<div class="dd-id"><b>' + d.name + '</b><span>#' + d.num + ' · ' + bodyName(d.body) + '</span></div>' +
      '</div>' +
      '<div class="dd-bio">' + ((isZh() && d.bioZh) ? d.bioZh : d.bio) + '</div>' +
      '<div class="dd-line"><i>赞助商</i><b>' + (d.sponsor || '-') + '</b></div>' +
      '<div class="dd-line"><i>特权</i><b class="perk">' + (d.perkText || '-') + '</b></div>' +
      '<div class="dd-line"><i>战绩</i><b>★' + p.champsWon + ' 冠军 · ' + p.wins + ' 胜 / ' + p.races + ' 场</b></div>' +
      '<div class="dd-line"><i>现金</i><b>' + DOLLAR + p.cash + ' · ' + T('level') + ' ' + (Math.floor(p.xp / 500) + 1) + '</b></div>' +
      '<div class="dd-bars">' +
        ddBar('攻击', d.traits.aggr, '#ff5c6e') +
        ddBar('封堵', d.traits.block, '#4bd0ff') +
        ddBar('抢道具', d.traits.loot, '#ffd479') +
      '</div>';
    const cv = box.querySelector('.dd-pic');
    if (cv) cv.getContext('2d').drawImage(Portrait.get(d), 0, 0, 260, 260);
  }

  function ddBar(label, v, color) {
    return '<div class="dd-bar"><i>' + label + '</i><span><b style="width:' +
      Math.round(v * 100) + '%;background:' + color + '"></b></span><em>' +
      Math.round(v * 100) + '</em></div>';
  }

  function buildQuickLists() {
    const dl = $('driverList');
    dl.className = 'drivergrid';
    dl.innerHTML = '';
    DRIVERS.forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'driver-card' + (i === G.selectedDriver ? ' active' : '');
      const prf = Meta.profileOf(i);
      const tinfo = Meta.tierOf(prf.rp || 1000);
      li.innerHTML =
        '<div class="dv-avatar" style="background:radial-gradient(circle at 35% 30%,' + d.light + ',' + d.main + ' 55%,' + d.dark + ')">' +
          '<span>' + d.num + '</span></div>' +
        '<div class="dv-name">' + d.name + '</div>' +
        '<div class="dv-meta" style="color:' + tinfo.color + '">' + tierName(tinfo) + ' ' + (prf.rp || 1000) + ' · ★' + Meta.driverWins(d.name) + '</div>' +
        '<div class="dv-traits">' +
          '<i title="aggression" style="width:' + Math.round(d.traits.aggr * 100) + '%;background:#ff5c6e"></i>' +
        '</div>';
      li.onclick = () => {
        G.selectedDriver = i;
        Meta.setDriver(i);
        if (SND) SND.uiClick();
        refreshTopbar();
        buildQuickLists();
      };
      dl.appendChild(li);
    });
    const tl = $('trackList');
    tl.className = 'trackgrid';
    tl.innerHTML = '';
    TRACKS.forEach((tr, i) => {
      const li = document.createElement('li');
      li.className = 'track-card' + (i === G.selectedTrack ? ' active' : '');
      li.innerHTML = '<b>' + trackName(tr) + '</b><span>' + tr.width + '</span>';
      li.onclick = () => { G.selectedTrack = i; if (SND) SND.uiClick(); buildQuickLists(); };
      tl.appendChild(li);
    });
    const d = DRIVERS[G.selectedDriver];
    const bioTxt = (isZh() && d.bioZh) ? d.bioZh : d.bio;
    $('driverBio').innerHTML = '<b>' + d.name + '</b> · ' + bioTxt +
      '<br><span style="color:#7fe3ff">赞助商 ' + (d.sponsor || '-') + '</span>' +
      ' <span style="color:#ffd479">· ' + (d.perkText || '') + '</span>' +
      ' <span style="opacity:.5">[' + T('aggr') + ' ' + Math.round(d.traits.aggr * 100) +
      ' / ' + T('block') + ' ' + Math.round(d.traits.block * 100) +
      ' / ' + T('loot') + ' ' + Math.round(d.traits.loot * 100) + ']</span>' +
      ' <span style="opacity:.5">· 生涯胜场 ' + Meta.driverWins(d.name) + '</span>';
  }

  const navEditor = document.getElementById('navEditor');
  if (navEditor) navEditor.onclick = () => {
    if (SND) SND.uiClick();
    showView('editor');
    if (typeof Editor !== 'undefined') Editor.open();
  };
  const edBack = document.getElementById('edBack');
  if (edBack) edBack.onclick = () => { if (SND) SND.uiClick(); showView('home'); renderHome(); };
  const edSave = document.getElementById('edSave');
  if (edSave) edSave.onclick = () => { if (SND) SND.uiClick(); Editor.save(); };
  const edPlay = document.getElementById('edPlay');
  if (edPlay) edPlay.onclick = () => { if (SND) SND.uiConfirm(); Editor.play(); };
  const edClear = document.getElementById('edClear');
  if (edClear) edClear.onclick = () => { if (SND) SND.uiClick(); Editor.clear(); };
  const edUndo = document.getElementById('edUndo');
  if (edUndo) edUndo.onclick = () => { if (SND) SND.uiClick(); Editor.undo(); };

  $('driverConfirm').onclick = () => {
    G.selectedDriver = driverSel;
    Meta.setDriver(driverSel);
    if (SND) SND.uiConfirm();
    refreshTopbar();
    renderHome();
    if (G.driverReturn === 'career') { renderCareer(); showView('career'); }
    else showView('home');
  };
  $('driverBack').onclick = () => {
    if (SND) SND.uiClick();
    if (G.driverReturn === 'career') { renderCareer(); showView('career'); }
    else showView('home');
  };

  $('startBtn').onclick = () => { audioInit(); if (SND) SND.uiConfirm(); startRace(G.selectedTrack, { defer: true }); };
  const weaponBox = document.getElementById('weaponBox');
  if (weaponBox) {
    weaponBox.style.pointerEvents = 'auto';
    weaponBox.style.cursor = 'pointer';
    weaponBox.addEventListener('pointerdown', (e) => { e.preventDefault(); audioInit(); playerFire(); });
    weaponBox.addEventListener('touchstart', (e) => { e.preventDefault(); audioInit(); playerFire(); }, { passive: false });
  }

  // 通用确认框
  let confirmCb = null;
  function askConfirm(msg, yesLabel, cb) {
    const box = document.getElementById('confirm');
    const text = document.getElementById('confirmMsg');
    const yes = document.getElementById('confirmYes');
    if (!box) { if (cb) cb(); return; }
    if (text) text.textContent = msg;
    if (yes && yesLabel) yes.textContent = yesLabel;
    confirmCb = cb || null;
    box.classList.remove('hidden');
  }
  function closeConfirm() {
    const box = document.getElementById('confirm');
    if (box) box.classList.add('hidden');
    confirmCb = null;
  }

  function exitGame() {
    if (SND) SND.uiClick();
    askConfirm(T('exitConfirm'), T('exitApp'), () => {
      try {
        if (window.AndroidHost && window.AndroidHost.exitApp) { window.AndroidHost.exitApp(); return; }
      } catch (e) {}
      try { window.close(); } catch (e) {}
      toast('网页版请直接关闭标签页');
    });
  }
  // 手感档位：暂停面板可循环切换（0 硬核 / 1 标准 / 2 轻松）
  function assistLabel() { return '手感：' + ASSIST[ASSIST_IDX].name; }
  function refreshAssistBtn() {
    const b = document.getElementById('assistBtn');
    if (b) b.textContent = assistLabel();
  }
  try {
    const saved = localStorage.getItem('krally_assist');
    if (saved != null) ASSIST_IDX = Math.max(0, Math.min(2, parseInt(saved, 10) || 0));
  } catch (e) {}
  const assistBtn = document.getElementById('assistBtn');
  if (assistBtn) assistBtn.onclick = () => {
    ASSIST_IDX = (ASSIST_IDX + 1) % 3;
    try { localStorage.setItem('krally_assist', String(ASSIST_IDX)); } catch (e) {}
    refreshAssistBtn();
    if (SND) SND.uiClick();
  };
  refreshAssistBtn();

  const exitHome = document.getElementById('exitHome');
  if (exitHome) exitHome.onclick = exitGame;
  const exitBtn = document.getElementById('exitBtn');
  if (exitBtn) exitBtn.onclick = exitGame;
  const confirmYes = document.getElementById('confirmYes');
  if (confirmYes) confirmYes.onclick = () => { const cb = confirmCb; closeConfirm(); if (cb) cb(); };
  const confirmNo = document.getElementById('confirmNo');
  if (confirmNo) confirmNo.onclick = () => { if (SND) SND.uiClick(); closeConfirm(); };
  const confirmBox = document.getElementById('confirm');
  if (confirmBox) confirmBox.onclick = (e) => { if (e.target === confirmBox) closeConfirm(); };
  if (location.search.includes('showconfirm')) setTimeout(() => exitGame(), 300);

  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) pauseBtn.onclick = () => {
    if (SND) SND.uiClick();
    if (G.state === 'racing' || G.state === 'paused') togglePause();
  };
  $('resumeBtn').onclick = () => { if (SND) SND.uiClick(); togglePause(); };
  $('quitBtn').onclick = () => toMenu();
  $('menuBtn').onclick = () => toMenu();

  $('againBtn').onclick = () => {
    if (SND) SND.uiConfirm();
    $('result').classList.add('hidden');
    if (G.resultAction === 'career') { toMenu(); renderCareer(); showView('career'); }
    else if (G.resultAction === 'next') { startCareerRace(G.career.champId); }
    else { startRace(G.selectedTrack, {}); }
  };

  function toMenu() {
    G.state = 'menu';
    $('lineup').classList.add('hidden');
    $('ladder').classList.add('hidden');
    G.career = null;
    if (SND) { SND.engineStop(); SND.skidStop(); SND.musicStop(); SND.uiClick(); }
    $('result').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('menu').classList.remove('hidden');
    renderHome();
    showView('home');
  }

  // ---------- 启动 ----------
  resizeCanvas();

  if (typeof I18N !== 'undefined') {
    const lm = /lang=(zh|en)/.exec(location.search);
    I18N.set(lm ? lm[1] : I18N.get());
    const lb = document.getElementById('langBtn');
    if (lb) lb.onclick = () => {
      I18N.toggle();
      refreshTopbar();
      renderHome();
      const vq = document.getElementById('view-quick');
      const vc = document.getElementById('view-career');
      if (vq && !vq.classList.contains('hidden')) buildQuickLists();
      if (vc && !vc.classList.contains('hidden')) renderCareer();
    };
  }

  Meta.load();
  G.selectedDriver = Math.min(DRIVERS.length - 1, Math.max(0, Meta.driverIdx || 0));
  if (typeof Editor !== 'undefined') {
    Editor.loadAll().forEach(t => {
      TRACKS.push({
        name: t.name, theme: t.theme, width: t.width, points: t.points, custom: true,
        closed: t.closed !== false, checkpoints: t.checkpoints || 0,
      });
    });
  }

  refreshTopbar();
  renderHome();
  showView('home');
  bindTouch();

  (function () {
    const vm = /view=(quick|career|garage|shop|drivers|editor)/.exec(location.search);
    if (!vm) return;
    const v = vm[1];
    if (v === 'quick') buildQuickLists();
    if (v === 'drivers') renderDrivers();
    if (v === 'editor' && typeof Editor !== 'undefined') {
      Editor.open();
      if (location.search.includes('edplay')) Editor.play();
    }
    if (v === 'career') renderCareer();
    if (v === 'garage') renderGarage();
    if (v === 'shop') renderShop();
    showView(v);
  })();

  if (location.search.includes('autostart')) {
    (function () {
      const tm = /track=(\d+)/.exec(location.search);
      startRace(tm ? parseInt(tm[1], 10) : 0, {});
      G.countdown = 0.05; G.state = 'racing';
      document.getElementById('banner').classList.add('hidden');
      const m = /warmup=(\d+)/.exec(location.search);
      if (m) {
        const n = parseInt(m[1], 10);
        try {
          for (let i = 0; i < n; i++) update(1 / 60);
        } catch (err) {
          window.__WARMUP_ERR = (err && err.stack) ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err);
        }
        document.getElementById('banner').classList.add('hidden');
        document.getElementById('taunt').classList.add('hidden');
      }
      if (location.search.includes('autofire')) { setTimeout(() => { playerFire(); }, 100); }
      if (location.search.includes('taunt')) { setTimeout(() => { showTaunt(pick(TALK)); }, 300); }
      if (location.search.includes('ghostinfo')) {
        const pl = G.player || {};
        document.title = 'DBG rec=' + ((G.rec || []).length) + ' spd=' + Math.round(pl.speed || 0) +
          ' dist=' + Math.round(pl.dist || 0) + ' rt=' + (Math.round((G.raceTime || 0) * 10) / 10) + ' lap=' + pl.lap +
          ' best=' + (pl.bestLap ? Math.round(pl.bestLap * 100) / 100 : 'null') +
          ' ghost=' + (G.ghost ? (Math.round(G.ghost.lap * 100) / 100 + 's/' + G.ghost.pts.length) : 'none');
      }
      const oppm = /opp=(\d+)/.exec(location.search);
      if (oppm) { showOppCard(parseInt(oppm[1], 10)); }
      if (location.search.includes('aistats')) {
        document.title = 'AI ' + G.cars.map(function (c) {
          return c.driver.name + ' v=' + Math.round(c.maxSpeed) + ' a=' + Math.round(c.accelStat) + ' arm=' + c.armor.toFixed(2);
        }).join(' | ');
      }
      if (window.__MAPERR) {
        const e2 = document.createElement('div');
        e2.style.cssText = 'position:fixed;top:40%;left:0;right:0;background:#500;color:#fff;font:12px monospace;padding:8px;z-index:99999';
        e2.textContent = 'MAPERR: ' + window.__MAPERR;
        document.body.appendChild(e2);
      }
    })();
  }

  requestAnimationFrame(frame);

  if (location.search.includes('clickstart')) {
    setTimeout(() => {
      try {
        const tm = /ctrack=(\d+)/.exec(location.search);
        if (tm) G.selectedTrack = parseInt(tm[1], 10);
        document.getElementById('startBtn').click();
        document.title = 'CLICKED track=' + G.selectedTrack + ' state=' + G.state;
      } catch (e) {
        document.title = 'CLICKERR ' + e.message;
      }
    }, 600);
  }

  if (location.search.includes('dbgstate')) {
    setTimeout(() => {
      document.title = 'STATE ' + G.state + ' rt=' + (G.raceTime || 0).toFixed(2) +
        ' cd=' + (G.countdown || 0).toFixed(2) + ' cars=' + (G.cars || []).length;
    }, 4000);
  }
})();
