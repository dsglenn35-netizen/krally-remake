// ghost.js - 多圈幽灵车（最佳 / 平均）与实时差值
const Ghost = (() => {
  const KEY = (track) => 'krally_ghost_' + track;
  const RATE = 0.05;
  const MAX_LAPS = 5;

  function save(track, laps) {
    try { localStorage.setItem(KEY(track), JSON.stringify({ laps: laps })); } catch (e) {}
  }
  function load(track) {
    try {
      const raw = localStorage.getItem(KEY(track));
      if (!raw) return null;
      const g = JSON.parse(raw);
      if (!g || !g.laps || !g.laps.length) return null;
      g.laps.sort((a, b) => a.t - b.t);
      g.best = g.laps[0];
      g.avg = g.laps.reduce((s, l) => s + l.t, 0) / g.laps.length;
      g.rate = RATE;
      return g;
    } catch (e) { return null; }
  }
  function push(track, lap) {
    const g = load(track) || { laps: [] };
    g.laps.push(lap);
    g.laps.sort((a, b) => a.t - b.t);
    if (g.laps.length > MAX_LAPS) g.laps = g.laps.slice(0, MAX_LAPS);
    save(track, g.laps);
    return load(track);
  }
  function clear(track) {
    try { localStorage.removeItem(KEY(track)); } catch (e) {}
  }
  // 幽灵在进度 s 处的时间（线性插值）
  function timeAtS(lap, s) {
    const pts = lap.pts;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][3] >= s) {
        if (i === 0) return i * RATE;
        const prev = pts[i - 1];
        const k = (s - prev[3]) / Math.max(1e-6, pts[i][3] - prev[3]);
        return (i - 1 + k) * RATE;
      }
    }
    return pts.length * RATE;
  }
  return { save, load, push, clear, timeAtS, RATE, MAX_LAPS };
})();
if (typeof window !== 'undefined') window.Ghost = Ghost;
