// game.js - K-RALLY 重制版原型
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let VW = canvas.width, VH = canvas.height;
  let ZOOM = 0.62;
  function resizeCanvas() {
    const vw = window.innerWidth || document.documentElement.clientWidth || 800;
    const vh = window.innerHeight || document.documentElement.clientHeight || 360;
    const w = Math.max(320, vw | 0);
    const h = Math.max(200, vh | 0);
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

  const TALK = (CONTENT.dialogue || []).filter(s => s.length >= 12 && s.length <= 120);
  const UI = CONTENT.ui_labels || [];

  // ---------- 输入 ----------
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
    };
    ['tLeft','tRight','tGas','tBrake'].forEach(id => mk(id));
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
      const st = track.at(track.length + s0);
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
      this.lateralBias = rand(-0.45, 0.45);
    }

    get progress() { return (this.lap - 1) * this.track.length + this.s; }

    update(dt, input) {
      const track = this.track;
      const near = track.nearest(this.x, this.y);
      const halfW = track.width / 2;
      const offroad = Math.abs(near.lateral) > halfW * 0.92;

      // 转向
      const steerInput = input.steer;
      const speedFactor = clamp(1 - this.speed / (this.maxSpeed * 1.6), 0.35, 1);
      this.angle += steerInput * 2.9 * dt * speedFactor * this.handling * (offroad ? 0.7 : 1);

      // 加速 / 刹车
      let accel = 0;
      if (this.stun > 0) accel = -60;
      else {
        accel = input.gas ? this.accelStat : -90;
        if (input.brake) accel -= 520;
      }
      if (this.boost > 0) { accel += 520; this.boost -= dt; }

      const maxSpeed = this.maxSpeed * (this.boost > 0 ? 1.32 : 1) * (offroad ? 0.55 : 1);
      this.speed += accel * dt;
      this.speed -= this.speed * (offroad ? 2.4 : 0.55) * dt;
      this.speed = clamp(this.speed, offroad ? -60 : -150, maxSpeed);

      // 侧滑（漂移视觉）
      this.drift = lerp(this.drift, offroad ? 0.35 : Math.abs(steerInput) * 0.55 * (this.speed / this.maxSpeed), dt * 6);

      // 位移
      this.px = this.x; this.py = this.y;
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;

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
      if (lapNow !== this.lap) {
        this.lap = lapNow;
        if (this.lap > 1) {
          const lapTime = G.raceTime - this.lapStart;
          if (lapTime > 5 && (!this.bestLap || lapTime < this.bestLap)) this.bestLap = lapTime;
        }
        this.lapStart = G.raceTime;
        if (this.lap > G.laps && !this.finished) {
          this.finished = true;
          this.finishTime = G.raceTime;
          if (this.isPlayer) endRace();
        }
      }

      // 拖尾粒子
      if (Math.random() < this.drift * 0.9) {
        G.particles.push({ x: this.x, y: this.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.5, max: 0.5,
          r: rand(2, 5), color: offroad ? '120,90,60' : '160,200,255' });
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
    return new Track(def.points, def.width, def.name);
  }

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

  function startRace(trackIdx, opts) {
    opts = opts || {};
    G.career = opts.career || null;
    G.collisions = 0;
    G.tactics = { block: 0, ram: 0, loot: 0 };
    G.laps = opts.laps || LAPS;
    const track = buildTrack(trackIdx == null ? G.selectedTrack : trackIdx);
    G.track = track;
    G.mapCache = G.mapCache || {};
    const mapKey = track.name;
    if (!G.mapCache[mapKey] && typeof Terrain !== 'undefined') {
      try {
        G.mapCache[mapKey] = Terrain.build(track, (trackIdx == null ? G.selectedTrack : trackIdx));
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
  }

  function endRace() {
    G.state = 'finished';
    if (SND) { SND.engineStop(); SND.skidStop(); SND.musicStop(); }
    const p = G.player;
    const pos = positionOf(p);
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
    rw.innerHTML = '+$' + rewards.cash + ' &nbsp; +' + rewards.xp + ' ' + T('xp') +
      (champDone ? '<br><span style="color:#ffd479">' + T('champDone') + ' +$' + rewards.prize.cash + ' / +' + rewards.prize.xp + ' XP</span>' : '');
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
    if (!p || !p.weapon) { name.textContent = '--'; ammo.textContent = ''; return; }
    const label = p.weapon === 'rocket' ? T('rocket') : p.weapon === 'mine' ? T('mine') : T('turbo');
    name.textContent = label;
    ammo.textContent = p.weapon === 'turbo' ? T('spaceKey') : 'x' + p.ammo;
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
          if (c.isPlayer) updateWeaponHUD();
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
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    resizeCanvas();   // 每帧自愈：窗口/视口变化都能跟上
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 0.5) {
      fpsShown = Math.round(fpsFrames / fpsAcc);
      fpsAcc = 0; fpsFrames = 0;
      const el = document.getElementById('fps');
      if (el) el.textContent = fpsShown + ' FPS';
    }
    update(dt);
    render(now / 1000);
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
      if (G.countdown <= 0.6 && G.bannerTimer <= 0) { showBanner(T('go')); if (SND) SND.countdownBeep(true); }
      if (G.countdown <= 0) { G.state = 'racing'; }
    }
    if (G.state !== 'racing' && G.state !== 'countdown') return;

    if (G.state === 'racing') G.raceTime += dt;

    // 玩家输入
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
      if (G.state === 'countdown') inp = { steer: 0, gas: false, brake: true };
      c.update(dt, inp);
    }
    resolveCollisions(dt);

    // 相机
    const aheadX = p.x + Math.cos(p.angle) * Math.min(160, p.speed * 0.42);
    const aheadY = p.y + Math.sin(p.angle) * Math.min(160, p.speed * 0.42);
    G.camX = lerp(G.camX, aheadX, 1 - Math.pow(0.0009, dt));
    G.camY = lerp(G.camY, aheadY, 1 - Math.pow(0.0009, dt));

    // 粒子
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const q = G.particles[i];
      q.life -= dt;
      if (!q.boom) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; }
      if (q.life <= 0) G.particles.splice(i, 1);
    }

    // HUD
    if (G.state === 'racing') {
      document.getElementById('raceTime').textContent = fmtTime(G.raceTime);
      document.getElementById('lapNum').textContent = Math.max(1, Math.min(p.lap, LAPS));
      document.getElementById('spdNum').textContent = Math.round(Math.abs(p.speed) * 0.72);
      document.getElementById('posNum').textContent = positionOf(p);
      document.getElementById('bestLap').textContent = T('best') + ' ' + (p.bestLap ? fmtTime(p.bestLap) : '--:--.--');
      const f = document.getElementById('fps');
      if (f) f.textContent = fpsShown + ' FPS';
      const hf = document.getElementById('healthFill');
      hf.style.width = clamp(p.health, 0, 100) + '%';
      hf.style.background = p.health > 55 ? 'linear-gradient(90deg,#28e07a,#8ef03a)'
        : p.health > 25 ? 'linear-gradient(90deg,#e0c528,#f0a13a)' : 'linear-gradient(90deg,#e02828,#f06a3a)';
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
      ctx.fillStyle = G.map.theme.grass;
      ctx.fillRect(G.camX - halfW, G.camY - halfH, halfW * 2, halfH * 2);
    }

    // 预烘焙地图
    if (G.map) {
      ctx.drawImage(G.map.canvas, G.map.x, G.map.y);
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

    // 车影 + 车
    const sorted = [...G.cars].sort((a, b) => a.y - b.y);
    for (const c of sorted) {
      Art.car(ctx, c.x, c.y, c.angle, c.driver,
        { thrust: clamp(c.speed / c.maxSpeed, 0, 1), damage: 1 - c.health / 100, scale: c.isPlayer ? 1.1 : 1, braking: c.blocked > 0.5 });

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
      ctx.drawImage(G.map.canvas, ox, oy, dw, dh);

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

  function showView(name) {
    ['home', 'quick', 'career', 'garage', 'shop', 'drivers'].forEach(v => {
      const el = $('view-' + v);
      if (el) el.classList.toggle('hidden', v !== name);
    });
    G.view = name;
    refreshTopbar();
  }

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
        ' · 生涯胜场 ' + Meta.driverWins(d.name) + '</span></div>' +
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
    startRace(ev.track, { career: { champId: champId }, laps: ev.laps, skill: ev.skill });
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
        '<em>★' + r.p.champsWon + ' · ' + r.p.wins + T('wins') + ' / ' + r.p.races + T('races') + ' · ' + DOLLAR + r.p.cash + '</em>';

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
      li.innerHTML =
        '<div class="dv-avatar" style="background:radial-gradient(circle at 35% 30%,' + d.light + ',' + d.main + ' 55%,' + d.dark + ')">' +
          '<span>' + d.num + '</span></div>' +
        '<div class="dv-name">' + d.name + '</div>' +
        '<div class="dv-meta">$' + Meta.profileOf(i).cash + ' · ★' + Meta.driverWins(d.name) + '</div>' +
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