// meta.js - 存档（按车手独立）/ 车库 / 商店 / 锦标赛
const Meta = (() => {
  const SAVE_KEY = 'krally_save_v3';
  const LEGACY_KEY = 'krally_save_v2';

  const CARS = [
    { id: 'kite',   name: 'KITE',   price: 0,     speed: 402, accel: 330, handling: 1.00, color: '#2ad0ff',
      desc: '入门车。均衡，好开，也容易被撞。' },
    { id: 'viper',  name: 'VIPER',  price: 2400,  speed: 428, accel: 356, handling: 1.06, color: '#ff3d8b',
      desc: '中段车。直线更快，转向略敏感。' },
    { id: 'wraith', name: 'WRAITH', price: 6500,  speed: 452, accel: 382, handling: 1.12, color: '#ffb02e',
      desc: '高级车。加速强，过弯稳。' },
    { id: 'novax',  name: 'NOVA-X', price: 13000, speed: 478, accel: 408, handling: 1.20, color: '#8b5cff',
      desc: '顶级车。全场最快，但很贵。' },
  ];

  const UPGRADES = {
    engine: { name: 'ENGINE',  zh: '引擎', desc: '直线速度与加速', costs: [600, 1400, 2800], per: { speed: 16, accel: 12 } },
    tires:  { name: 'TIRES',   zh: '轮胎', desc: '转向响应与抓地', costs: [500, 1200, 2400], per: { handling: 0.05 } },
    weapon: { name: 'WEAPONS', zh: '武器', desc: '开局自带武器',   costs: [800, 1600, 3200], per: {} },
  };

  const CHAMPS = [
    { id: 'rookie', name: 'ROOKIE CUP', zh: '新人杯',     skill: 0.86, laps: 3, tracks: [0, 1, 0], races: 3,
      prize: { cash: 800,  xp: 150 }, unlock: null,     desc: '新人杯。三场，对手水平一般。' },
    { id: 'champ',  name: 'CHAMPIONSHIP', zh: '冠军赛',   skill: 0.95, laps: 3, tracks: [1, 0, 1, 0], races: 4,
      prize: { cash: 2500, xp: 400 }, unlock: 'viper',  desc: '正赛。四场，奖金 $2500 / 400 XP。' },
    { id: 'master', name: 'MASTER LEAGUE', zh: '大师联赛',  skill: 1.03, laps: 4, tracks: [0, 1, 0, 1], races: 4,
      prize: { cash: 6000, xp: 900 }, unlock: 'wraith', desc: '大师联赛。四场，奖金 $6000 / 900 XP。' },
  ];

  const PAYOUT = [0, 600, 380, 220, 120];

  // ---------- 车手档案 ----------
  function blankChamps() {
    return {
      rookie: { started: false, event: 0, done: false },
      champ:  { started: false, event: 0, done: false },
      master: { started: false, event: 0, done: false },
    };
  }
  function blankProfile() {
    return {
      cash: 400, xp: 0,
      cars: ['kite'], currentCar: 'kite',
      upgrades: { kite: { engine: 0, tires: 0, weapon: 0 } },
      champs: blankChamps(),
      bestLaps: {}, races: 0, wins: 0, champsWon: 0, unlocked: [],
      rp: 1000, rpBest: 1000,
    };
  }

  function roster() { return (typeof window !== 'undefined' && window.DRIVERS) ? window.DRIVERS : []; }
  function nameOf(i) { const r = roster(); return (r[i] || {}).name || ('DRIVER' + i); }

  function normalizeProfile(raw) {
    const base = blankProfile();
    const out = Object.assign({}, base, raw || {});
    out.upgrades = out.upgrades || {};
    out.champs = Object.assign({}, base.champs, out.champs || {});
    CARS.forEach(c => { if (!out.upgrades[c.id]) out.upgrades[c.id] = { engine: 0, tires: 0, weapon: 0 }; });
    if (!out.cars || !out.cars.length) out.cars = ['kite'];
    if (!out.cars.includes(out.currentCar)) out.currentCar = out.cars[0];
    if (typeof out.champsWon !== 'number') out.champsWon = 0;
    return out;
  }

  let root = { driverIdx: 0, profiles: {} };
  let data = blankProfile();

  function activate(i) {
    const r = roster();
    const max = Math.max(0, r.length - 1);
    root.driverIdx = Math.min(max, Math.max(0, i | 0));
    const nm = nameOf(root.driverIdx);
    if (!root.profiles[nm]) root.profiles[nm] = blankProfile();
    root.profiles[nm] = normalizeProfile(root.profiles[nm]);
    data = root.profiles[nm];
    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        root = { driverIdx: parsed.driverIdx || 0, profiles: parsed.profiles || {} };
      } else {
        // 从旧的单档案存档迁移
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          root = { driverIdx: 0, profiles: {} };
          root.profiles[nameOf(0)] = normalizeProfile(JSON.parse(legacy));
        }
      }
    } catch (e) {
      root = { driverIdx: 0, profiles: {} };
    }
    activate(root.driverIdx);
    return data;
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(root)); } catch (e) {}
  }

  function reset() {
    root = { driverIdx: 0, profiles: {} };
    activate(0);
    save();
  }

  function setDriver(i) {
    activate(i);
    save();
    return data;
  }

  function profileOf(i) {
    const r = roster();
    const nm = (typeof i === 'number') ? nameOf(i) : i;
    if (!root.profiles[nm]) root.profiles[nm] = blankProfile();
    return root.profiles[nm];
  }
  function driverWins(nm) { return profileOf(nm).champsWon; }

  // ---------- 排位积分 ----------
  const TIERS = [
    { key: 'bronze',   min: 0,    zh: '青铜', en: 'BRONZE',   color: '#c98a4b' },
    { key: 'silver',   min: 1100, zh: '白银', en: 'SILVER',   color: '#c7d2dc' },
    { key: 'gold',     min: 1300, zh: '黄金', en: 'GOLD',     color: '#ffd479' },
    { key: 'platinum', min: 1500, zh: '铂金', en: 'PLATINUM', color: '#8fe9ff' },
    { key: 'diamond',  min: 1700, zh: '钻石', en: 'DIAMOND',  color: '#b9a7ff' },
  ];
  function tierOf(rp) {
    let t = TIERS[0];
    for (const x of TIERS) if (rp >= x.min) t = x;
    return t;
  }
  function addRP(delta) {
    const p = data;
    p.rp = Math.max(0, (p.rp || 1000) + delta);
    p.rpBest = Math.max(p.rpBest || 1000, p.rp);
    save();
    return p.rp;
  }
  function addDriverWin(nm) { profileOf(nm).champsWon += 1; save(); }

  // ---------- 车辆 ----------
  const get = (id) => CARS.find(c => c.id === id);
  const upgOf = (id) => data.upgrades[id] || { engine: 0, tires: 0, weapon: 0 };

  function stats(id) {
    const car = get(id || data.currentCar);
    const u = upgOf(car.id);
    let speed = car.speed, accel = car.accel, handling = car.handling;
    speed += u.engine * UPGRADES.engine.per.speed;
    accel += u.engine * UPGRADES.engine.per.accel;
    handling += u.tires * UPGRADES.tires.per.handling;
    return {
      id: car.id, name: car.name, color: car.color,
      speed, accel, handling,
      startWeapon: u.weapon > 0 ? 'rocket' : null,
      startAmmo: u.weapon > 0 ? u.weapon : 0,
    };
  }

  const level = () => Math.floor(data.xp / 500) + 1;

  function canAfford(n) { return data.cash >= n; }

  function buyCar(id) {
    const car = get(id);
    if (!car || data.cars.includes(id)) return { ok: false, msg: '已拥有' };
    if (!canAfford(car.price)) return { ok: false, msg: '现金不足' };
    data.cash -= car.price;
    data.cars.push(id);
    data.upgrades[id] = { engine: 0, tires: 0, weapon: 0 };
    save();
    return { ok: true, msg: '已购入 ' + car.name };
  }

  function upgradePrice(carId, slot) {
    const u = upgOf(carId)[slot] || 0;
    const costs = UPGRADES[slot].costs;
    return u >= costs.length ? null : costs[u];
  }

  function buyUpgrade(carId, slot) {
    const price = upgradePrice(carId, slot);
    if (price == null) return { ok: false, msg: '已满级' };
    if (!canAfford(price)) return { ok: false, msg: '现金不足' };
    data.cash -= price;
    data.upgrades[carId][slot] += 1;
    save();
    return { ok: true, msg: UPGRADES[slot].name + ' 升级成功' };
  }

  function selectCar(id) {
    if (!data.cars.includes(id)) return false;
    data.currentCar = id; save(); return true;
  }

  // ---------- 锦标赛 ----------
  function champState(id) { return data.champs[id]; }
  function champOf(id) { return CHAMPS.find(c => c.id === id); }

  function startChamp(id) {
    const st = data.champs[id];
    if (!st) return false;
    st.started = true; st.event = 0; save(); return true;
  }

  function nextEvent(id) {
    const st = data.champs[id];
    const ch = champOf(id);
    return { index: st.event, total: ch.races, track: ch.tracks[st.event % ch.tracks.length], laps: ch.laps, skill: ch.skill };
  }

  function finishEvent(id, position) {
    const st = data.champs[id];
    const ch = champOf(id);
    const cash = PAYOUT[Math.min(position, PAYOUT.length - 1)] || 60;
    const xp = 60 + Math.max(0, (4 - position)) * 40;
    data.cash += cash; data.xp += xp; data.races += 1;
    if (position === 1) data.wins += 1;

    st.event += 1;
    let champDone = false;
    if (st.event >= ch.races) {
      st.done = true; champDone = true;
      data.cash += ch.prize.cash; data.xp += ch.prize.xp;
      data.champsWon = (data.champsWon || 0) + 1;
      if (ch.unlock && !data.cars.includes(ch.unlock)) {
        data.unlocked = data.unlocked || [];
        if (!data.unlocked.includes(ch.unlock)) data.unlocked.push(ch.unlock);
      }
    }
    save();
    return { cash, xp, champDone, prize: champDone ? ch.prize : null, position };
  }

  function finishQuick(position) {
    const cash = Math.round((PAYOUT[Math.min(position, PAYOUT.length - 1)] || 60) * 0.6);
    const xp = 30 + Math.max(0, (4 - position)) * 20;
    data.cash += cash; data.xp += xp; data.races += 1;
    if (position === 1) data.wins += 1;
    save();
    return { cash, xp };
  }

  function recordBestLap(trackKey, t) {
    const cur = data.bestLaps[trackKey];
    if (!cur || t < cur) { data.bestLaps[trackKey] = t; save(); return true; }
    return false;
  }

  return {
    CARS, UPGRADES, CHAMPS, load, save, reset, get,
    get data() { return data; },
    get driverIdx() { return root.driverIdx; },
    stats, level, get car() { return get(data.currentCar); },
    canAfford, buyCar, buyUpgrade, upgradePrice, selectCar, upgOf,
    champState, champOf, startChamp, nextEvent, finishEvent, finishQuick, recordBestLap,
    setDriver, profileOf, driverWins, addDriverWin, nameOf,
    TIERS, tierOf, addRP,
  };
})();