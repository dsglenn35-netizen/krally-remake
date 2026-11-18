// ghost.js - 最佳圈幽灵车记录/回放
const Ghost = (() => {
  const KEY = (track) => 'krally_ghost_' + track;
  const RATE = 0.05;   // 20Hz 采样

  function save(track, lapTime, pts) {
    try { localStorage.setItem(KEY(track), JSON.stringify({ lap: lapTime, pts: pts })); } catch (e) {}
  }
  function load(track) {
    try {
      const raw = localStorage.getItem(KEY(track));
      if (!raw) return null;
      const g = JSON.parse(raw);
      if (!g || !g.pts || !g.pts.length) return null;
      g.rate = RATE;
      return g;
    } catch (e) { return null; }
  }
  function clear(track) {
    try { localStorage.removeItem(KEY(track)); } catch (e) {}
  }
  return { save, load, clear, RATE };
})();
if (typeof window !== 'undefined') window.Ghost = Ghost;
