// track.js - 程序化赛道（Catmull-Rom 闭合样条）
class Track {
  constructor(controlPoints, width, name) {
    this.name = name || 'NEON HARBOR';
    this.width = width;
    this.control = controlPoints;
    this.points = [];
    this.build();
  }

  static catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  build() {
    const cp = this.control, n = cp.length, STEP = 14;
    const raw = [];
    for (let i = 0; i < n; i++) {
      const p0 = cp[(i - 1 + n) % n], p1 = cp[i], p2 = cp[(i + 1) % n], p3 = cp[(i + 2) % n];
      for (let j = 0; j < STEP; j++) raw.push(Track.catmull(p0, p1, p2, p3, j / STEP));
    }
    // 切线 / 法线 / 弧长
    let s = 0;
    for (let i = 0; i < raw.length; i++) {
      const a = raw[(i - 1 + raw.length) % raw.length], b = raw[(i + 1) % raw.length];
      const tx = b.x - a.x, ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;
      const p = raw[i];
      if (i > 0) s += Math.hypot(p.x - raw[i - 1].x, p.y - raw[i - 1].y);
      this.points.push({
        x: p.x, y: p.y,
        tx: tx / len, ty: ty / len,
        nx: -ty / len, ny: tx / len,
        s,
      });
    }
    this.length = s + Math.hypot(raw[0].x - raw[raw.length - 1].x, raw[0].y - raw[raw.length - 1].y);
  }

  at(s) {
    const L = this.length;
    s = ((s % L) + L) % L;
    const pts = this.points;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].s < s) lo = mid + 1; else hi = mid;
    }
    return pts[lo];
  }

  // 找最近的路面点（分段粗查 + 局部细查）
  nearest(x, y) {
    const pts = this.points;
    let best = null, bestD = Infinity;
    for (let i = 0; i < pts.length; i += 4) {
      const p = pts[i];
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    const from = (best - 6 + pts.length) % pts.length;
    for (let k = 0; k < 13; k++) {
      const i = (from + k) % pts.length;
      const p = pts[i];
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    const p = pts[best];
    const dx = x - p.x, dy = y - p.y;
    const lateral = dx * p.nx + dy * p.ny;
    return { i: best, s: p.s, lateral, dist: Math.sqrt(bestD), point: p };
  }

  startPose() {
    const p = this.points[0];
    return { x: p.x, y: p.y, angle: Math.atan2(p.ty, p.tx) };
  }
}

// 赛道定义（世界坐标）
const TRACKS = [
  { name: 'NEON HARBOR', zh: '霓虹港', theme: 0, width: 168, points: [
      { x: 420, y: 300 }, { x: 900, y: 230 }, { x: 1420, y: 300 }, { x: 1780, y: 520 },
      { x: 1830, y: 860 }, { x: 1560, y: 1060 }, { x: 1180, y: 980 }, { x: 980, y: 1180 },
      { x: 700, y: 1260 }, { x: 380, y: 1100 }, { x: 260, y: 780 }, { x: 330, y: 500 } ] },
  { name: 'MIDNIGHT SPINE', zh: '午夜山脊', theme: 1, width: 156, points: [
      { x: 360, y: 980 }, { x: 300, y: 620 }, { x: 560, y: 360 }, { x: 980, y: 300 },
      { x: 1240, y: 520 }, { x: 1180, y: 800 }, { x: 1420, y: 980 }, { x: 1760, y: 900 },
      { x: 1840, y: 600 }, { x: 1600, y: 420 }, { x: 1560, y: 780 }, { x: 1180, y: 1240 },
      { x: 720, y: 1220 } ] },
  { name: 'FROZEN PASS', zh: '冰封山口', theme: 2, width: 150, points: [
      { x: 300, y: 300 }, { x: 820, y: 240 }, { x: 1300, y: 320 }, { x: 1620, y: 620 },
      { x: 1500, y: 1000 }, { x: 1080, y: 1080 }, { x: 760, y: 900 }, { x: 560, y: 1150 },
      { x: 280, y: 950 }, { x: 220, y: 620 } ] },
  { name: 'DESERT RIDGE', zh: '荒漠山脊', theme: 3, width: 174, points: [
      { x: 400, y: 260 }, { x: 1040, y: 200 }, { x: 1560, y: 380 }, { x: 1840, y: 760 },
      { x: 1680, y: 1120 }, { x: 1240, y: 1220 }, { x: 980, y: 1000 }, { x: 1180, y: 760 },
      { x: 860, y: 640 }, { x: 520, y: 820 }, { x: 300, y: 620 } ] },
  { name: 'JUNGLE RUN', zh: '丛林赛道', theme: 4, width: 146, points: [
      { x: 520, y: 220 }, { x: 1080, y: 260 }, { x: 1480, y: 520 }, { x: 1420, y: 900 },
      { x: 1120, y: 1080 }, { x: 760, y: 980 }, { x: 620, y: 1220 }, { x: 320, y: 1100 },
      { x: 260, y: 760 }, { x: 460, y: 560 }, { x: 780, y: 640 } ] },
  { name: 'DOCKYARD 7', zh: '七号码头', theme: 5, width: 162, points: [
      { x: 360, y: 900 }, { x: 340, y: 480 }, { x: 700, y: 260 }, { x: 1180, y: 300 },
      { x: 1500, y: 520 }, { x: 1740, y: 820 }, { x: 1520, y: 1120 }, { x: 1120, y: 1180 },
      { x: 860, y: 980 }, { x: 620, y: 1120 } ] },
  { name: 'RED CANYON', zh: '赤岩峡谷', theme: 6, width: 160, points: [
      { x: 380, y: 420 }, { x: 760, y: 240 }, { x: 1240, y: 260 }, { x: 1660, y: 460 },
      { x: 1820, y: 820 }, { x: 1520, y: 1080 }, { x: 1120, y: 1000 }, { x: 900, y: 1220 },
      { x: 560, y: 1120 }, { x: 300, y: 820 } ] },
  { name: 'AUTUMN LOOP', zh: '秋日环道', theme: 7, width: 152, points: [
      { x: 520, y: 300 }, { x: 1020, y: 220 }, { x: 1500, y: 380 }, { x: 1620, y: 760 },
      { x: 1340, y: 1020 }, { x: 980, y: 880 }, { x: 760, y: 1080 }, { x: 420, y: 980 },
      { x: 260, y: 640 }, { x: 340, y: 420 } ] },
  { name: 'SALT FLATS', zh: '盐滩', theme: 3, width: 196, points: [
      { x: 340, y: 700 }, { x: 420, y: 360 }, { x: 880, y: 220 }, { x: 1420, y: 260 },
      { x: 1800, y: 520 }, { x: 1820, y: 940 }, { x: 1420, y: 1160 }, { x: 900, y: 1200 },
      { x: 500, y: 1020 } ] },
];