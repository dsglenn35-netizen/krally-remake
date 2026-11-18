// i18n.js - 多语言（zh / en）
const I18N = (() => {
  const DICT = {
    zh: {
      driversTitle: '车手选择', useDriver: '选用该车手', rank: '排名', record: '战绩',
      career: '生涯', quick: '快速比赛', garage: '车库', shop: '商店',
      careerDesc: '从新手杯开始的三档锦标赛',
      quickDesc: '随便跑一场，拿少量奖金',
      garageDesc: '查看与升级你的车',
      shopDesc: '买车 / 买升级',
      current: '当前', speed: '速度', accel: '加速', grip: '抓地',
      back: '返回', start: '开始', cont: '继续', again: '再战', next: '下一场',
      progress: '进度', lockedBy: '需先完成', done: '已完成', replay: '再战',
      cars: '车辆', upgrades: '升级', buy: '购买', owned: '已拥有', max: '满级',
      buyCar: '买车', detail: '详情', chooseItem: '选择一件商品',
      yourCars: '你的车', stats: '属性', upgradeHint: '到商店购买升级。',
      startRace: '开始比赛', driver: '车手', track: '赛道',
      lap: '圈', best: '最佳', winner: '冠军!', finish: '完赛',
      total: '总时间', bestLap: '最佳单圈', resume: '继续', quit: '退出',
      menu: '主菜单', paused: '暂停', ready: '准备', go: '出发!',
      cash: '现金', level: '等级', record: '战绩', wins: '胜', races: '场',
      prize: '奖金', xp: '经验', champDone: '锦标赛完成',
      rocket: '火箭', mine: '地雷', turbo: '涡轮', none: '--', weapon: '武器',
      hint: 'WASD / 方向键 驾驶 · 空格 开火 · Shift 弃武器 · P 暂停 · M 静音',
      spaceKey: '空格', gridTitle: '发车顺序', gridHint: '准备起步…', you: '你', gridTitle: '发车顺序', gridHint: '准备起步…', you: '你', aggr: '攻击', block: '封堵', loot: '抢道具', lapLabel: '圈', pausedTitle: '暂停', statsTitle: '属性', tabCars: '车辆', tabUpg: '升级',
      detailTitle: '详情', btnBrake: '刹车', btnGas: '油门', btnFire: '开火',
      subtitle: '重制版 · 生涯原型', turboShout: '涡轮加速!', boostShout: '加速!',
      bodySport: '跑车', bodyMuscle: '肌肉车', bodySedan: '轿车', bodyCompact: '小型车',
      bodyTruck: '皮卡', bodyWagon: '旅行车',
    },
    en: {
      driversTitle: 'DRIVERS', useDriver: 'SELECT DRIVER', rank: 'RANK', record: 'RECORD',
      career: 'CAREER', quick: 'QUICK RACE', garage: 'GARAGE', shop: 'SHOP',
      careerDesc: 'Three championships, start with Rookie Cup',
      quickDesc: 'A single race, small payout',
      garageDesc: 'Inspect and tune your car',
      shopDesc: 'Cars and upgrades',
      current: 'CURRENT', speed: 'SPEED', accel: 'ACCEL', grip: 'GRIP',
      back: 'BACK', start: 'START', cont: 'CONTINUE', again: 'RACE AGAIN', next: 'NEXT RACE',
      progress: 'Progress', lockedBy: 'Clear', done: 'Completed', replay: 'Again',
      cars: 'CARS', upgrades: 'UPGRADES', buy: 'BUY', owned: 'OWNED', max: 'MAX',
      buyCar: 'Cars', detail: 'DETAIL', chooseItem: 'Pick an item',
      yourCars: 'YOUR CARS', stats: 'STATS', upgradeHint: 'Buy upgrades in the shop.',
      startRace: 'START RACE', driver: 'DRIVER', track: 'TRACK',
      lap: 'LAP', best: 'BEST', winner: 'WINNER!', finish: 'FINISH',
      total: 'TOTAL', bestLap: 'BEST LAP', resume: 'RESUME', quit: 'QUIT',
      menu: 'MAIN MENU', paused: 'PAUSED', ready: 'READY', go: 'GO!',
      cash: 'CASH', level: 'LV', record: 'RECORD', wins: 'W', races: 'R',
      prize: 'prize', xp: 'XP', champDone: 'CHAMPIONSHIP COMPLETE',
      rocket: 'ROCKET', mine: 'MINE', turbo: 'TURBO', none: '--', weapon: 'WEAPON',
      hint: 'WASD / Arrows drive · SPACE fire · SHIFT drop · P pause · M mute',
      spaceKey: 'SPACE', gridTitle: 'STARTING GRID', gridHint: 'Get ready…', you: 'YOU', gridTitle: 'STARTING GRID', gridHint: 'Get ready…', you: 'YOU', aggr: 'AGGR', block: 'BLOCK', loot: 'LOOT', lapLabel: 'LAP', pausedTitle: 'PAUSED', statsTitle: 'STATS', tabCars: 'CARS', tabUpg: 'UPGRADES',
      detailTitle: 'DETAIL', btnBrake: 'BRAKE', btnGas: 'GAS', btnFire: 'FIRE',
      subtitle: 'REMAKE · CAREER PROTOTYPE', turboShout: 'TURBO!', boostShout: 'BOOST!',
      bodySport: 'SPORT', bodyMuscle: 'MUSCLE', bodySedan: 'SEDAN', bodyCompact: 'COMPACT',
      bodyTruck: 'TRUCK', bodyWagon: 'WAGON',
    },
  };

  let lang = (typeof localStorage !== 'undefined' && localStorage.getItem('krally_lang')) || 'zh';

  function t(k) {
    const d = DICT[lang] || DICT.zh;
    return (k in d) ? d[k] : (DICT.en[k] !== undefined ? DICT.en[k] : k);
  }
  function set(l) {
    lang = (l === 'en') ? 'en' : 'zh';
    try { localStorage.setItem('krally_lang', lang); } catch (e) {}
    document.documentElement.lang = (lang === 'en' ? 'en' : 'zh-CN');
    applyStatic();
  }
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
  }
  const get = () => lang;
  const toggle = () => { set(lang === 'zh' ? 'en' : 'zh'); return lang; };

  return { t, set, get, toggle, applyStatic, DICT };
})();