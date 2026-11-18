// editor.js - 赛道编辑器
const Editor = (() => {
  const KEY = 'krally_custom_tracks';
  const state = {
    points: [],
    width: 160,
    theme: 0,
    name: '自定义赛道',
    closed: true,
    checkpoints: 0,
    drag: -1,
    view: { s: 1, ox: 0, oy: 0 },
  };
  let cv = null, g = null;

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function saveAll(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function worldToScreen(x, y) {
    const v = state.view;
    return { x: (x - v.minX) * v.s + v.ox, y: (y - v.minY) * v.s + v.oy };
  }
  function screenToWorld(sx, sy) {
    const v = state.view;
    return { x: (sx - v.ox) / v.s + v.minX, y: (sy - v.oy) / v.s + v.minY };
  }

  function fitView() {
    const W = cv.width, H = cv.height, pad = 36;
    if (!state.points.length) {
      state.view = { s: 1, minX: 0, minY: 0, ox: 0, oy: 0 };
      return;
    }
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    state.points.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
    const s = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    state.view = {
      s: s, minX: minX, minY: minY,
      ox: pad + ((W - pad * 2) - spanX * s) / 2,
      oy: pad + ((H - pad * 2) - spanY * s) / 2,
    };
  }

  function draw() {
    if (!cv) return;
    const W = cv.width, H = cv.height;
    const T = (typeof Terrain !== 'undefined' ? Terrain.THEMES : [])[state.theme] || { grass: '#2c3a26', asphalt: '#33363c', line: '#e8e4d8', curbA: '#b6332f', curbB: '#d9d5cc' };
    g.clearRect(0, 0, W, H);
    g.fillStyle = T.grass;
    g.fillRect(0, 0, W, H);

    fitView();
    if (state.points.length >= 3 && typeof Track !== 'undefined') {
      // 用实际赛道样条预览，保证所见即所得
      const t = new Track(state.points, state.width, 'preview', { closed: state.closed, checkpoints: state.checkpoints });
      const pts = [];
      for (let s = 0; s < t.length; s += 6) {
        const p = t.at(s);
        pts.push(worldToScreen(p.x, p.y));
      }
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      if (state.closed) g.closePath();
      g.strokeStyle = 'rgba(0,0,0,.55)';
      g.lineWidth = state.width * state.view.s + 10;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.stroke();
      g.strokeStyle = T.asphalt;
      g.lineWidth = state.width * state.view.s;
      g.stroke();
      g.strokeStyle = T.line;
      g.lineWidth = 2;
      g.setLineDash([8, 10]);
      g.stroke();
      g.setLineDash([]);

      // 检查点标记
      if (t.checkpoints && t.checkpoints.length) {
        t.checkpoints.forEach((cpS, i) => {
          const cp = t.at(cpS);
          const sc = worldToScreen(cp.x, cp.y);
          const half = (state.width * state.view.s) / 2 + 6;
          g.save();
          g.translate(sc.x, sc.y);
          g.rotate(Math.atan2(cp.ty, cp.tx) + Math.PI / 2);
          g.strokeStyle = 'rgba(255,212,121,.85)';
          g.lineWidth = 2;
          g.setLineDash([5, 5]);
          g.beginPath(); g.moveTo(-half, 0); g.lineTo(half, 0); g.stroke();
          g.setLineDash([]);
          g.fillStyle = '#ffd479';
          g.font = 'bold 9px sans-serif';
          g.textAlign = 'center';
          g.fillText('CP' + (i + 1), 0, -3);
          g.restore();
        });
      }
    } else if (state.points.length >= 2) {
      const pts = state.points.map(p => worldToScreen(p.x, p.y));
      const closed = false;
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      if (closed) g.closePath();
      g.strokeStyle = 'rgba(0,0,0,.55)';
      g.lineWidth = state.width * state.view.s + 10;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.stroke();
      g.strokeStyle = T.asphalt;
      g.lineWidth = state.width * state.view.s;
      g.stroke();
      g.strokeStyle = T.line;
      g.lineWidth = 2;
      g.setLineDash([8, 10]);
      g.stroke();
      g.setLineDash([]);
    }

    // 控制点
    state.points.forEach((p, i) => {
      const s = worldToScreen(p.x, p.y);
      g.beginPath();
      g.arc(s.x, s.y, i === state.drag ? 8 : 6, 0, Math.PI * 2);
      g.fillStyle = i === 0 ? '#3fd2ff' : 'rgba(230,245,255,.9)';
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.6)';
      g.lineWidth = 1.5;
      g.stroke();
      if (i === 0) {
        g.fillStyle = '#062430';
        g.font = '9px sans-serif';
        g.fillText('S', s.x - 3, s.y + 3);
      }
    });

    if (!state.points.length) {
      g.fillStyle = 'rgba(200,225,245,.7)';
      g.font = '14px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText('点击画布添加控制点（至少 3 个）', W / 2, H / 2 - 6);
      g.fillText('拖动可移动，右键删除', W / 2, H / 2 + 16);
      g.textAlign = 'left';
    }
  }

  function hitTest(sx, sy) {
    for (let i = 0; i < state.points.length; i++) {
      const s = worldToScreen(state.points[i].x, state.points[i].y);
      if (Math.hypot(s.x - sx, s.y - sy) < 12) return i;
    }
    return -1;
  }

  function bindCanvas() {
    cv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const idx = hitTest((e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height));
      if (idx >= 0) { state.points.splice(idx, 1); draw(); }
    });
    cv.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const r = cv.getBoundingClientRect();
      const sx = (e.clientX - r.left) * (cv.width / r.width);
      const sy = (e.clientY - r.top) * (cv.height / r.height);
      const idx = hitTest(sx, sy);
      if (idx >= 0) { state.drag = idx; }
      else {
        const w = screenToWorld(sx, sy);
        state.points.push({ x: Math.round(w.x), y: Math.round(w.y) });
        draw();
      }
    });
    cv.addEventListener('mousemove', (e) => {
      if (state.drag < 0) return;
      const r = cv.getBoundingClientRect();
      const w = screenToWorld((e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height));
      state.points[state.drag] = { x: Math.round(w.x), y: Math.round(w.y) };
      draw();
    });
    addEventListener('mouseup', () => { state.drag = -1; });
  }

  function refreshList() {
    const list = loadAll();
    const ul = document.getElementById('editorList');
    if (!ul) return;
    ul.innerHTML = '';
    if (!list.length) {
      ul.innerHTML = '<li style="opacity:.5;font-size:11px">还没有保存的赛道</li>';
      return;
    }
    list.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'ed-item';
      li.innerHTML = '<b>' + t.name + '</b><span>' + t.points.length + ' 点 · 宽 ' + t.width + '</span>';
      li.onclick = () => {
        state.points = t.points.map(p => ({ x: p.x, y: p.y }));
        state.width = t.width; state.theme = t.theme; state.name = t.name;
        state.closed = t.closed !== false;
        state.checkpoints = t.checkpoints || 0;
        syncControls();
        draw();
      };
      const del = document.createElement('button');
      del.textContent = '删';
      del.className = 'ed-del';
      del.onclick = (e) => {
        e.stopPropagation();
        const l2 = loadAll(); l2.splice(i, 1); saveAll(l2); refreshList();
      };
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function syncControls() {
    const n = document.getElementById('edName');
    const w = document.getElementById('edWidth');
    const th = document.getElementById('edTheme');
    if (n) n.value = state.name;
    if (w) { w.value = state.width; document.getElementById('edWidthVal').textContent = state.width; }
    if (th) th.value = String(state.theme);
    const cl = document.getElementById('edClosed');
    const cp = document.getElementById('edCheckpoints');
    if (cl) cl.checked = state.closed;
    if (cp) { cp.value = state.checkpoints; document.getElementById('edCpVal').textContent = state.checkpoints; }
  }

  function save() {
    if (state.points.length < 3) { toast('至少需要 3 个控制点'); return; }
    const list = loadAll();
    const name = (document.getElementById('edName').value || '自定义赛道').trim();
    state.name = name;
    list.push({
      name: name, theme: state.theme, width: state.width,
      points: state.points.map(p => ({ x: p.x, y: p.y })),
      closed: state.closed, checkpoints: state.checkpoints,
    });
    saveAll(list);
    refreshList();
    toast('已保存：' + name);
    if (typeof Game !== 'undefined' && Game.reloadTracks) Game.reloadTracks();
  }

  function open() {
    cv = document.getElementById('edCanvas');
    if (!cv) return;
    g = cv.getContext('2d');
    if (!cv.dataset.bound) {
      cv.dataset.bound = '1';
      bindCanvas();
    }
    const w = document.getElementById('edWidth');
    if (w && !w.dataset.bound) {
      w.dataset.bound = '1';
      w.oninput = () => {
        state.width = parseInt(w.value, 10);
        document.getElementById('edWidthVal').textContent = state.width;
        draw();
      };
    }
    const th = document.getElementById('edTheme');
    if (th && !th.dataset.bound) {
      th.dataset.bound = '1';
      th.onchange = () => { state.theme = parseInt(th.value, 10); draw(); };
    }
    const cl = document.getElementById('edClosed');
    if (cl && !cl.dataset.bound) {
      cl.dataset.bound = '1';
      cl.onchange = () => { state.closed = cl.checked; draw(); };
    }
    const cp = document.getElementById('edCheckpoints');
    if (cp && !cp.dataset.bound) {
      cp.dataset.bound = '1';
      cp.oninput = () => {
        state.checkpoints = parseInt(cp.value, 10);
        document.getElementById('edCpVal').textContent = state.checkpoints;
        draw();
      };
    }
    const n = document.getElementById('edName');
    if (n && !n.dataset.bound) {
      n.dataset.bound = '1';
      n.oninput = () => { state.name = n.value; };
    }
    if (location.search.includes('edemo') && !state.points.length) {
      const demo = location.search.includes('edopen')
        ? [[300,700],[700,300],[1100,650],[1500,320],[1800,700]]
        : [[400,200],[900,160],[1300,320],[1450,700],[1150,980],[800,860],[520,1000],[260,700]];
      state.points = demo.map(p => ({ x: p[0], y: p[1] }));
      if (location.search.includes('edopen')) state.closed = false;
      const cpm = /edcp=(\d+)/.exec(location.search);
      if (cpm) state.checkpoints = parseInt(cpm[1], 10);
    }
    refreshList();
    syncControls();
    draw();
  }

  function play() {
    if (state.points.length < 3) { toast('至少需要 3 个控制点'); return; }
    state.name = (document.getElementById('edName').value || '自定义赛道').trim();
    Game.startCustomTrack({
      name: state.name, theme: state.theme, width: state.width, points: state.points,
      closed: state.closed, checkpoints: state.checkpoints,
    });
  }

  function clear() {
    state.points = [];
    draw();
  }
  function undo() {
    state.points.pop();
    draw();
  }

  return { open, draw, save, play, clear, undo, loadAll, state, refreshList };
})();
if (typeof window !== 'undefined') window.Editor = Editor;
