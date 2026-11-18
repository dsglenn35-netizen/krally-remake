// terrain.js - 写实风格赛道地图（一次性烘焙）
const Terrain = (() => {
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // 噪点贴图（用于沥青/草地/砂石）
  function noisePattern(g, size, alpha, color) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cg = c.getContext('2d');
    const img = cg.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 120;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    const pat = g.createPattern(c, 'repeat');
    return { pat, alpha, color };
  }

  function fillNoise(g, pat, x, y, w, h, alpha) {
    g.save();
    g.globalAlpha = alpha;
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = pat;
    g.fillRect(x, y, w, h);
    g.restore();
  }

  const THEMES = [
    { // 0 夜间海港
      grass: '#2c3a26', grassDark: '#1e2a1a', grassLight: '#3a4a30',
      dirt: '#4a3d2c', asphalt: '#33363c', asphaltDark: '#26282d', asphaltLight: '#41454d',
      curbA: '#b6332f', curbB: '#d9d5cc', line: '#e8e4d8',
      treeA: '#2f4a2a', treeB: '#3d6034', treeC: '#1d3018',
      rock: '#5b5b58', rockLight: '#7a7a74', bldg: '#3b3d42', bldgRoof: '#4f5257',
      lamp: 'rgba(255,214,150,0.55)', rim: '#c8ccd2',
    },
    { // 1 荒漠夜路
      grass: '#4a3f2e', grassDark: '#3a3122', grassLight: '#5a4c38',
      dirt: '#6a583f', asphalt: '#3a3b3e', asphaltDark: '#2b2c2f', asphaltLight: '#494a4e',
      curbA: '#c07a2a', curbB: '#ddd6c4', line: '#eee6d2',
      treeA: '#4a5a34', treeB: '#5c6e40', treeC: '#334024',
      rock: '#6b6157', rockLight: '#8c8275', bldg: '#4a4136', bldgRoof: '#5e5346',
      lamp: 'rgba(255,190,120,0.5)', rim: '#d8cfc0',
    },
    { // 2 雪山
      grass: '#c9d4dc', grassDark: '#a8b6c2', grassLight: '#e2ebf2',
      dirt: '#8f9aa3', asphalt: '#3c4149', asphaltDark: '#2e323a', asphaltLight: '#4a5058',
      curbA: '#3b6ea8', curbB: '#f2f6fa', line: '#ffffff',
      treeA: '#2c4a3c', treeB: '#3a5f4c', treeC: '#1e332a',
      rock: '#8b939b', rockLight: '#b4bcc4', bldg: '#4a5560', bldgRoof: '#5f6c78',
      lamp: 'rgba(210,230,255,0.55)', rim: '#e8eef4',
    },
    { // 3 沙漠
      grass: '#b09163', grassDark: '#9c7f54', grassLight: '#c4a878',
      dirt: '#8d7148', asphalt: '#43413c', asphaltDark: '#33312d', asphaltLight: '#53504a',
      curbA: '#c2552e', curbB: '#efe3c8', line: '#f6efd8',
      treeA: '#5c6b32', treeB: '#728040', treeC: '#40491f',
      rock: '#8a7a62', rockLight: '#ab9a7c', bldg: '#5a4f3e', bldgRoof: '#6f6250',
      lamp: 'rgba(255,200,120,0.45)', rim: '#e6d9bf',
    },
    { // 4 丛林
      grass: '#25472a', grassDark: '#193520', grassLight: '#2f5c34',
      dirt: '#4a3a24', asphalt: '#2f3334', asphaltDark: '#23262a', asphaltLight: '#3c4142',
      curbA: '#c8a12e', curbB: '#e8e2c8', line: '#e4e2ce',
      treeA: '#1f4a26', treeB: '#2c6533', treeC: '#143019',
      rock: '#4f5a4a', rockLight: '#6b7763', bldg: '#3a4234', bldgRoof: '#4d5645',
      lamp: 'rgba(200,255,170,0.35)', rim: '#cfe0c4',
    },
    { // 5 集装箱码头
      grass: '#3a3a34', grassDark: '#2c2c27', grassLight: '#4a4a42',
      dirt: '#5a5145', asphalt: '#3f4247', asphaltDark: '#303338', asphaltLight: '#4e5258',
      curbA: '#d8a021', curbB: '#d5d2c8', line: '#efeade',
      treeA: '#3a4432', treeB: '#4c5940', treeC: '#262d21',
      rock: '#5f6259', rockLight: '#7f8378', bldg: '#4a4d52', bldgRoof: '#5f6469',
      lamp: 'rgba(255,230,160,0.5)', rim: '#d6dadd',
    },
    { // 6 红岩峡谷
      grass: '#7a3b2a', grassDark: '#5e2c20', grassLight: '#9a4d36',
      dirt: '#8a4a2e', asphalt: '#3d3a37', asphaltDark: '#2e2c29', asphaltLight: '#4b4744',
      curbA: '#d9541f', curbB: '#f0e0c8', line: '#f6ead4',
      treeA: '#4a5230', treeB: '#5e6a3a', treeC: '#333b20',
      rock: '#8e4d33', rockLight: '#b06a48', bldg: '#5a4034', bldgRoof: '#70513f',
      lamp: 'rgba(255,170,90,0.5)', rim: '#e8cdb4',
    },
    { // 7 秋日林道
      grass: '#4a3a1c', grassDark: '#392c14', grassLight: '#5e4a24',
      dirt: '#6a5228', asphalt: '#37373a', asphaltDark: '#29292c', asphaltLight: '#454548',
      curbA: '#c86a1e', curbB: '#e8dcbc', line: '#f4e8c8',
      treeA: '#8a5a1e', treeB: '#c07a24', treeC: '#5e3c12',
      rock: '#6a5a44', rockLight: '#8a765a', bldg: '#4a3c28', bldgRoof: '#5e4c34',
      lamp: 'rgba(255,190,110,0.5)', rim: '#e6d6b8',
    },
  ];

  function build(track, themeIdx) {
    const T = THEMES[themeIdx % THEMES.length];
    const rnd = mulberry32(20240117 + themeIdx * 3157);
    // 移动端把细节密度降到 ~45%，避免主线程长时间阻塞
    const MOBILE = (typeof navigator !== 'undefined') &&
      (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
       (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches));
    const K = MOBILE ? 0.45 : 1;
    const N = (n) => Math.max(1, Math.round(n * K));

    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of track.points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const pad = 560;
    const x0 = Math.floor(minX - pad), y0 = Math.floor(minY - pad);
    const w = Math.ceil(maxX - minX + pad * 2), h = Math.ceil(maxY - minY + pad * 2);

    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.translate(-x0, -y0);

    const W = track.width;
    const pts = track.points;

    // ---------------- 地面 ----------------
    g.fillStyle = T.grass;
    g.fillRect(x0, y0, w, h);

    // 细颗粒底纹
    const grassPat = noisePattern(g, 192, 1, '#fff');
    fillNoise(g, grassPat.pat, x0, y0, w, h, 0.20);

    // 柔和色斑精灵（避免大量 radialGradient 拖慢烘焙）
    function rgba(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function makeBlobSprite(hex, innerA, midA) {
      const R = 96;
      const c = document.createElement('canvas');
      c.width = c.height = R * 2;
      const cg = c.getContext('2d');
      const grd = cg.createRadialGradient(R, R, R * 0.05, R, R, R);
      grd.addColorStop(0, rgba(hex, innerA));
      grd.addColorStop(0.45, rgba(hex, midA));
      grd.addColorStop(1, rgba(hex, 0));
      cg.fillStyle = grd;
      cg.beginPath(); cg.arc(R, R, R, 0, Math.PI * 2); cg.fill();
      return c;
    }
    const blobDark = makeBlobSprite(T.grassDark, 0.85, 0.38);
    const blobLight = makeBlobSprite(T.grassLight, 0.85, 0.38);

    function stamp(sprite, cx, cy, r, alpha) {
      g.save();
      g.globalAlpha = alpha;
      g.drawImage(sprite, cx - r, cy - r, r * 2, r * 2);
      g.restore();
    }

    // 大尺度地形起伏（很淡）
    for (let i = 0; i < 90; i++) {
      const cx = x0 + rnd() * w, cy = y0 + rnd() * h;
      stamp(rnd() < 0.5 ? blobDark : blobLight, cx, cy, 240 + rnd() * 460, 0.12 + rnd() * 0.10);
    }
    // 中尺度斑驳（细节层次）
    for (let i = 0; i < N(1400); i++) {
      const cx = x0 + rnd() * w, cy = y0 + rnd() * h;
      stamp(rnd() < 0.5 ? blobDark : blobLight, cx, cy, 14 + rnd() * 70, 0.10 + rnd() * 0.13);
    }
    // 泥土斑（边缘不规则）
    for (let i = 0; i < 110; i++) {
      const cx = x0 + rnd() * w, cy = y0 + rnd() * h;
      const r = 30 + rnd() * 110;
      g.save();
      g.globalAlpha = 0.10 + rnd() * 0.10;
      g.translate(cx, cy); g.rotate(rnd() * Math.PI);
      g.fillStyle = T.dirt;
      g.beginPath();
      const n = 9 + ((rnd() * 5) | 0);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = r * (0.6 + rnd() * 0.55);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr * (0.5 + rnd() * 0.4);
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
      g.restore();
    }
    // 草簇（成片的明暗块，近看有层次）
    for (let i = 0; i < N(520); i++) {
      const cx = x0 + rnd() * w, cy = y0 + rnd() * h;
      stamp(rnd() < 0.6 ? blobLight : blobDark, cx, cy, 22 + rnd() * 55, 0.10 + rnd() * 0.12);
    }

    // 草丛（方向、明度、长度都有变化）
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < N(9000); i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      const len = 1.6 + rnd() * 4.5;
      const tone = rnd();
      g.strokeStyle = tone < 0.33 ? 'rgba(88,120,64,.42)'
                    : tone < 0.66 ? 'rgba(52,76,40,.42)'
                    : 'rgba(126,156,92,.30)';
      g.lineWidth = 0.6 + rnd() * 0.8;
      const lean = (rnd() - 0.5) * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + lean * len, y - len * 0.6, x + lean * len * 1.6, y - len);
      g.stroke();
    }
    g.restore();
    // 碎石 / 土粒
    for (let i = 0; i < N(2400); i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      g.fillStyle = rnd() < 0.5 ? 'rgba(132,124,108,.30)' : 'rgba(58,56,48,.30)';
      const r = 0.6 + rnd() * 2.0;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // 极细噪点（近看有颗粒感）
    for (let i = 0; i < N(6000); i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)';
      g.fillRect(x, y, 1, 1);
    }
    // 大块云影（压出层次）
    g.save();
    g.globalAlpha = 0.12;
    for (let i = 0; i < 26; i++) {
      const cx = x0 + rnd() * w, cy = y0 + rnd() * h;
      g.save();
      g.translate(cx, cy);
      g.scale(1, 0.55 + rnd() * 0.4);
      g.fillStyle = 'rgba(10,14,8,.5)';
      g.beginPath(); g.arc(0, 0, 200 + rnd() * 420, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.restore();

    // ---------------- 路面 ----------------
    function strokePath(width, color, dx, dy) {
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) g.moveTo(p.x + dx, p.y + dy); else g.lineTo(p.x + dx, p.y + dy);
      }
      g.closePath();
      g.lineWidth = width; g.strokeStyle = color;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.stroke();
    }

    // 路基环境光遮蔽（草被压暗）
    strokePath(W + 58, 'rgba(20,24,16,.45)', 0, 12);
    strokePath(W + 34, 'rgba(16,20,12,.55)', 0, 6);
    // 路肩斜坡
    strokePath(W + 18, '#4c4436', 0, 0);

    // 沥青
    strokePath(W, T.asphalt, 0, 0);
    const asphaltPat = noisePattern(g, 96, 1, '#fff');
    g.save();
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
    }
    g.closePath();
    g.lineWidth = W; g.strokeStyle = T.asphalt; g.stroke();
    g.globalAlpha = 0.3;
    g.lineWidth = W;
    g.strokeStyle = asphaltPat.pat;
    g.stroke();
    g.restore();

    // 车轮磨痕（每条车道两条）
    for (const laneFrac of [-0.55, -0.18, 0.18, 0.55]) {
      const lane = W * laneFrac * 0.5;
      g.save();
      g.globalAlpha = 0.22;
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const x = p.x + p.nx * lane, y = p.y + p.ny * lane;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.lineWidth = 13; g.strokeStyle = '#1a1c20'; g.stroke();
      g.restore();
    }

    // 油渍 / 修补块
    for (let i = 0; i < 220; i++) {
      const p = pts[(rnd() * pts.length) | 0];
      const off = (rnd() - 0.5) * W * 0.92;
      const x = p.x + p.nx * off, y = p.y + p.ny * off;
      const r = 6 + rnd() * 30;
      g.save();
      if (rnd() < 0.45) {
        g.globalAlpha = 0.25 + rnd() * 0.2;
        g.fillStyle = '#141518';
      } else {
        g.globalAlpha = 0.10 + rnd() * 0.12;
        g.fillStyle = '#6a6d74';
      }
      g.beginPath();
      g.ellipse(x, y, r, r * (0.35 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    // 裂缝
    g.save();
    g.strokeStyle = 'rgba(15,16,18,.5)';
    for (let i = 0; i < 140; i++) {
      const p = pts[(rnd() * pts.length) | 0];
      const off = (rnd() - 0.5) * W * 0.9;
      let x = p.x + p.nx * off, y = p.y + p.ny * off;
      g.lineWidth = 0.7 + rnd();
      g.beginPath(); g.moveTo(x, y);
      let a = rnd() * Math.PI * 2;
      for (let k = 0; k < 4 + rnd() * 5; k++) {
        a += (rnd() - 0.5) * 1.2;
        x += Math.cos(a) * (3 + rnd() * 7);
        y += Math.sin(a) * (3 + rnd() * 7);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();

    // ---- 修补块（沥青补丁，不规则、低对比）----
    for (let i = 0; i < 70; i++) {
      const p = pts[(rnd() * pts.length) | 0];
      const off = (rnd() - 0.5) * W * 0.75;
      const x = p.x + p.nx * off, y = p.y + p.ny * off;
      const rx = 10 + rnd() * 26, ry = 8 + rnd() * 20;
      g.save();
      g.translate(x, y);
      g.rotate(Math.atan2(p.ty, p.tx) + (rnd() - 0.5) * 0.35);
      g.globalAlpha = 0.22 + rnd() * 0.16;
      g.fillStyle = rnd() < 0.5 ? '#232529' : '#43474e';
      const n = 7 + ((rnd() * 4) | 0);
      g.beginPath();
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = 0.72 + rnd() * 0.4;
        const px = Math.cos(a) * rx * rr, py = Math.sin(a) * ry * rr;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
      g.globalAlpha = 0.18;
      g.strokeStyle = '#101215';
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }

    // ---- 沥青接缝（横向细线）----
    g.save();
    g.strokeStyle = 'rgba(12,13,15,.55)';
    for (let s = 0; s < track.length; s += 90 + rnd() * 70) {
      const p = track.at(s);
      const a = Math.atan2(p.ty, p.tx) + Math.PI / 2;
      g.lineWidth = 1.2 + rnd();
      g.beginPath();
      g.moveTo(p.x - Math.cos(a) * W / 2, p.y - Math.sin(a) * W / 2);
      g.lineTo(p.x + Math.cos(a) * W / 2, p.y + Math.sin(a) * W / 2);
      g.stroke();
    }
    g.restore();

    // ---- 湿痕 / 反光（沿行车线）----
    g.save();
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 40; i++) {
      const s = rnd() * track.length;
      const p = track.at(s);
      const off = (rnd() - 0.5) * W * 0.7;
      const len = 40 + rnd() * 130;
      const grd = g.createLinearGradient(p.x, p.y, p.x + p.tx * len, p.y + p.ty * len);
      grd.addColorStop(0, 'rgba(150,180,210,0)');
      grd.addColorStop(0.5, 'rgba(150,180,210,.07)');
      grd.addColorStop(1, 'rgba(150,180,210,0)');
      g.fillStyle = grd;
      g.save();
      g.translate(p.x + p.nx * off, p.y + p.ny * off);
      g.rotate(Math.atan2(p.ty, p.tx));
      g.fillRect(0, -8 - rnd() * 8, len, 16 + rnd() * 16);
      g.restore();
    }
    g.restore();

    // ---- 路肩碎石 ----
    for (let i = 0; i < N(2600); i++) {
      const s = rnd() * track.length;
      const p = track.at(s);
      const side = rnd() < 0.5 ? -1 : 1;
      const off = (W / 2 + 8 + rnd() * 26) * side;
      const x = p.x + p.nx * off + (rnd() - 0.5) * 4;
      const y = p.y + p.ny * off + (rnd() - 0.5) * 4;
      g.fillStyle = rnd() < 0.5 ? 'rgba(120,116,104,.5)' : 'rgba(70,68,60,.5)';
      g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    // 边线（白实线，带磨损）
    for (const side of [-1, 1]) {
      g.save();
      g.globalAlpha = 0.9;
      g.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const x = p.x + p.nx * (W / 2 - 6) * side;
        const y = p.y + p.ny * (W / 2 - 6) * side;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.lineWidth = 3.5; g.strokeStyle = T.line; g.stroke();
      // 磨损缺口
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 160; k++) {
        const s = rnd() * track.length;
        const pp = track.at(s);
        g.beginPath();
        g.arc(pp.x + pp.nx * (W / 2 - 6) * side, pp.y + pp.ny * (W / 2 - 6) * side, 1 + rnd() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    // 中线虚线
    g.save();
    g.globalAlpha = 0.55;
    g.setLineDash([26, 34]);
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
    }
    g.closePath();
    g.lineWidth = 3; g.strokeStyle = T.line; g.stroke();
    g.setLineDash([]);
    g.restore();

    // 路肩（带阴影的立体块）
    const curbStep = 24;
    for (const side of [-1, 1]) {
      for (let s = 0; s < track.length; s += curbStep) {
        const p = track.at(s);
        const idx = Math.floor(s / curbStep);
        const dx = p.x + p.nx * (W / 2 + 6) * side;
        const dy = p.y + p.ny * (W / 2 + 6) * side;
        g.save();
        g.translate(dx, dy);
        g.rotate(Math.atan2(p.ty, p.tx));
        // 侧面阴影
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(-curbStep / 2, -2, curbStep, 10);
        // 顶面
        g.fillStyle = (idx % 2) ? T.curbA : T.curbB;
        g.fillRect(-curbStep / 2, -6, curbStep, 9);
        // 高光
        g.fillStyle = 'rgba(255,255,255,.18)';
        g.fillRect(-curbStep / 2, -6, curbStep, 2.2);
        g.restore();
      }
    }

    // 起跑线
    const s0 = pts[0];
    g.save();
    g.translate(s0.x, s0.y);
    g.rotate(Math.atan2(s0.ty, s0.tx));
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 2; j++) {
        g.fillStyle = ((i + j) % 2) ? '#f2f6fa' : '#161a20';
        g.fillRect(-8 + j * 8, -W / 2 + i * (W / 12), 8, W / 12);
      }
    }
    g.restore();

    // ---------------- 检查点门 ----------------
    if (track.checkpoints && track.checkpoints.length) {
      track.checkpoints.forEach((cpS, i) => {
        const p = track.at(cpS);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(Math.atan2(p.ty, p.tx));
        // 横跨路面的旗线
        g.strokeStyle = 'rgba(255,212,121,.75)';
        g.lineWidth = 3;
        g.setLineDash([12, 8]);
        g.beginPath(); g.moveTo(0, -W / 2); g.lineTo(0, W / 2); g.stroke();
        g.setLineDash([]);
        // 两侧立柱
        g.fillStyle = '#20242a';
        g.fillRect(-3, -W / 2 - 7, 6, 14);
        g.fillRect(-3, W / 2 - 7, 6, 14);
        g.fillStyle = '#ffd479';
        g.fillRect(-4, -W / 2 - 9, 8, 4);
        g.fillRect(-4, W / 2 + 5, 8, 4);
        g.restore();
      });
    }

    // ---------------- 场景物 ----------------
    const roadDist = (x, y) => Math.abs(track.nearest(x, y).lateral);

    // ---- 预渲染精灵（避免逐物体 filter/blur，烘焙才够快）----
    function makeShadowSprite(r) {
      const c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const cg = c.getContext('2d');
      const grd = cg.createRadialGradient(r, r, 0, r, r, r);
      grd.addColorStop(0, 'rgba(0,0,0,.55)');
      grd.addColorStop(0.55, 'rgba(0,0,0,.28)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      cg.fillStyle = grd;
      cg.beginPath(); cg.arc(r, r, r, 0, Math.PI * 2); cg.fill();
      return c;
    }

    function makeTreeSprite(seed, conifer) {
      const R = 34;
      const c = document.createElement('canvas');
      c.width = c.height = R * 2;
      const cg = c.getContext('2d');
      const rr = mulberry32(seed);

      if (conifer) {
        // 针叶树：三层锥形叶团
        const layers = 3;
        for (let L = 0; L < layers; L++) {
          const w = R * (0.34 + L * 0.22);
          const y = R - 4 + L * R * 0.36;
          const grd = cg.createRadialGradient(R - w * 0.3, y - R * 0.25, w * 0.15, R, y, w);
          grd.addColorStop(0, T.treeB);
          grd.addColorStop(0.6, T.treeA);
          grd.addColorStop(1, T.treeC);
          cg.fillStyle = grd;
          cg.beginPath();
          cg.moveTo(R, y - R * 0.5);
          cg.lineTo(R + w, y);
          cg.lineTo(R - w, y);
          cg.closePath(); cg.fill();
        }
        cg.fillStyle = 'rgba(0,0,0,.35)';
        cg.fillRect(R - 1.6, R, 3.2, R * 0.45);
        return c;
      }

      // 阔叶树：6-10 个叶团叠出体积
      const lobes = 6 + ((rr() * 5) | 0);
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2 + rr() * 0.6;
        const d = R * (0.10 + rr() * 0.42);
        const px = R + Math.cos(a) * d, py = R + Math.sin(a) * d * 0.92;
        const rad = R * (0.26 + rr() * 0.18);
        const grd = cg.createRadialGradient(px - rad * 0.35, py - rad * 0.4, rad * 0.08, px, py, rad);
        const pick = rr();
        const base = pick < 0.34 ? T.treeB : pick < 0.75 ? T.treeA : T.treeC;
        grd.addColorStop(0, base);
        grd.addColorStop(0.62, pick < 0.5 ? T.treeA : T.treeC);
        grd.addColorStop(1, 'rgba(0,0,0,.55)');
        cg.fillStyle = grd;
        cg.beginPath();
        cg.arc(px, py, rad, 0, Math.PI * 2);
        cg.fill();
      }
      // 叶面高光碎点
      for (let i = 0; i < 40; i++) {
        const a = rr() * Math.PI * 2, d = rr() * R * 0.6;
        cg.fillStyle = 'rgba(200,235,160,' + (0.10 + rr() * 0.26).toFixed(2) + ')';
        cg.beginPath();
        cg.ellipse(R + Math.cos(a) * d, R + Math.sin(a) * d * 0.9, 0.8 + rr() * 1.5, 0.5 + rr() * 0.9, rr() * 3, 0, Math.PI * 2);
        cg.fill();
      }
      // 中心阴影（增加层次）
      const cg2 = cg.createRadialGradient(R, R, R * 0.1, R, R, R * 0.8);
      cg2.addColorStop(0, 'rgba(0,0,0,0)');
      cg2.addColorStop(1, 'rgba(0,0,0,.28)');
      cg.fillStyle = cg2;
      cg.beginPath(); cg.arc(R, R, R * 0.8, 0, Math.PI * 2); cg.fill();
      return c;
    }

    function makeRockSprite(seed) {
      const R = 20;
      const c = document.createElement('canvas');
      c.width = c.height = R * 2;
      const cg = c.getContext('2d');
      const rr = mulberry32(seed);
      const n = 6;
      const verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rr() * 0.3;
        const r = R * (0.5 + rr() * 0.38);
        verts.push([R + Math.cos(a) * r, R + Math.sin(a) * r * 0.9]);
      }
      const grd = cg.createLinearGradient(0, 0, R * 2, R * 2);
      grd.addColorStop(0, T.rockLight);
      grd.addColorStop(0.55, T.rock);
      grd.addColorStop(1, '#1a1a18');
      cg.fillStyle = grd;
      cg.beginPath();
      verts.forEach((v, i) => i ? cg.lineTo(v[0], v[1]) : cg.moveTo(v[0], v[1]));
      cg.closePath(); cg.fill();
      // 受光面
      cg.globalAlpha = 0.5;
      cg.fillStyle = T.rockLight;
      cg.beginPath();
      cg.moveTo(verts[0][0], verts[0][1]);
      cg.lineTo(verts[1][0], verts[1][1]);
      cg.lineTo(R * 0.9, R * 0.9);
      cg.closePath(); cg.fill();
      return c;
    }

    const shadowSprite = makeShadowSprite(32);
    const treeSprites = [makeTreeSprite(1), makeTreeSprite(2.2), makeTreeSprite(4.1), makeTreeSprite(6.3)];
    const coniferSprite = makeTreeSprite(9.1, true);
    const rockSprites = [makeRockSprite(7), makeRockSprite(13)];

    function blob(sprite, x, y, scale, alpha) {
      const s = sprite.width * scale;
      g.save();
      g.globalAlpha = alpha;
      g.drawImage(sprite, x - s / 2, y - s / 2, s, s);
      g.restore();
    }

    // 灌木：多个叶片团簇成的精灵
    function makeBushSprite(seed) {
      const R = 30;
      const c = document.createElement('canvas');
      c.width = c.height = R * 2;
      const cg = c.getContext('2d');
      const rr = mulberry32(seed);
      const n = 9 + ((rr() * 5) | 0);
      for (let i = 0; i < n; i++) {
        const a = rr() * Math.PI * 2;
        const d = rr() * R * 0.48;
        const px = R + Math.cos(a) * d;
        const py = R + Math.sin(a) * d * 0.85;
        const rad = R * (0.24 + rr() * 0.2);
        const grd = cg.createRadialGradient(px - rad * 0.4, py - rad * 0.45, rad * 0.1, px, py, rad);
        const shade = 0.55 + rr() * 0.45;
        grd.addColorStop(0, 'rgba(' + Math.round(120 * shade) + ',' + Math.round(180 * shade) + ',' + Math.round(90 * shade) + ',.95)');
        grd.addColorStop(0.7, 'rgba(' + Math.round(58 * shade) + ',' + Math.round(96 * shade) + ',' + Math.round(48 * shade) + ',.95)');
        grd.addColorStop(1, 'rgba(' + Math.round(30 * shade) + ',' + Math.round(56 * shade) + ',' + Math.round(28 * shade) + ',.85)');
        cg.fillStyle = grd;
        cg.beginPath(); cg.arc(px, py, rad, 0, Math.PI * 2); cg.fill();
      }
      // 叶片高光点
      for (let i = 0; i < 26; i++) {
        const a = rr() * Math.PI * 2, d = rr() * R * 0.62;
        cg.fillStyle = 'rgba(190,225,150,' + (0.12 + rr() * 0.22).toFixed(2) + ')';
        cg.beginPath();
        cg.ellipse(R + Math.cos(a) * d, R + Math.sin(a) * d * 0.85, 1.6 + rr() * 1.6, 0.9 + rr(), rr() * 3, 0, Math.PI * 2);
        cg.fill();
      }
      return c;
    }
    const bushSprites = [makeBushSprite(11), makeBushSprite(23), makeBushSprite(37), makeBushSprite(51)];
    for (let i = 0; i < N(300); i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      if (roadDist(x, y) < W / 2 + 30) continue;
      const sc = 0.55 + rnd() * 0.9;
      blob(shadowSprite, x + 3, y + 4, sc * 0.5, 0.45);
      blob(bushSprites[(rnd() * 4) | 0], x, y, sc * 0.72, 1);
    }

    // 树 / 岩石
    for (let i = 0; i < N(340); i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      if (roadDist(x, y) < W / 2 + 44) continue;
      const sc = 0.75 + rnd() * 0.85;
      blob(shadowSprite, x + 6, y + 8, sc * 0.85, 0.5);
      if (rnd() < 0.7) blob(treeSprites[(rnd() * 4) | 0], x, y, sc, 1);
      else if (rnd() < 0.55) blob(coniferSprite, x, y, sc, 1);
      else blob(rockSprites[(rnd() * 2) | 0], x, y, sc * 0.8, 1);
    }
    // 木桶
    for (let i = 0; i < N(200); i++) {
      const s = rnd() * track.length;
      const p = track.at(s);
      const side = rnd() < 0.5 ? -1 : 1;
      const off = (W / 2 + 15 + rnd() * 22) * side;
      const x = p.x + p.nx * off, y = p.y + p.ny * off;
      blob(shadowSprite, x + 2, y + 3, 0.28, 0.6);
      g.fillStyle = rnd() < 0.5 ? '#a5432f' : '#b8873a';
      g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.beginPath(); g.arc(x - 2, y - 2, 2.6, 0, Math.PI * 2); g.fill();
    }
    // 建筑（屋顶 + 设备 + 阴影）
    for (let i = 0; i < 20; i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      if (roadDist(x, y) < W / 2 + 150) continue;
      const bw = 70 + rnd() * 110, bh = 56 + rnd() * 96;
      // 投影
      blob(shadowSprite, x + 14, y + 18, Math.max(bw, bh) / 40, 0.6);
      // 墙体
      const wall = g.createLinearGradient(x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2);
      wall.addColorStop(0, T.bldg);
      wall.addColorStop(1, '#20232a');
      g.fillStyle = wall;
      g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
      // 屋顶
      const roof = g.createLinearGradient(x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2);
      roof.addColorStop(0, T.bldgRoof);
      roof.addColorStop(1, '#3a3d43');
      g.fillStyle = roof;
      g.fillRect(x - bw / 2 + 4, y - bh / 2 + 4, bw - 8, bh - 8);
      // 屋顶颗粒
      g.save();
      g.globalAlpha = 0.35;
      g.fillStyle = asphaltPat.pat;
      g.fillRect(x - bw / 2 + 4, y - bh / 2 + 4, bw - 8, bh - 8);
      g.restore();
      // 空调外机 / 天窗
      for (let k = 0; k < 2 + ((rnd() * 2) | 0); k++) {
        const uw = 8 + rnd() * (bw * 0.22), uh = 8 + rnd() * (bh * 0.22);
        const ux = x - bw / 2 + 8 + rnd() * (bw - uw - 16);
        const uy = y - bh / 2 + 8 + rnd() * (bh - uh - 16);
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(ux + 2, uy + 2, uw, uh);
        g.fillStyle = '#6d727a';
        g.fillRect(ux, uy, uw, uh);
        g.fillStyle = 'rgba(255,255,255,.18)';
        g.fillRect(ux, uy, uw, 2);
      }
      // 边缘高光 + 描边
      g.fillStyle = 'rgba(255,255,255,.10)';
      g.fillRect(x - bw / 2 + 4, y - bh / 2 + 4, bw - 8, 2);
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2;
      g.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
    }

    // 护栏
    for (const side of [-1, 1]) {
      for (let s = 0; s < track.length; s += 18) {
        if (rnd() < 0.62) continue;
        const p = track.at(s);
        const off = (W / 2 + 22) * side;
        const x = p.x + p.nx * off, y = p.y + p.ny * off;
        g.save();
        g.translate(x, y);
        g.rotate(Math.atan2(p.ty, p.tx));
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(-9, 1, 18, 4);
        g.fillStyle = T.rim;
        g.fillRect(-9, -2, 18, 3);
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.fillRect(-9, -2, 18, 1);
        g.restore();
      }
    }

    // 弯道箭头牌
    for (let s = 0; s < track.length; s += 40) {
      const b = track.at(s + 90), c = track.at(s + 180);
      let d = Math.atan2(c.ty, c.tx) - Math.atan2(b.ty, b.tx);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.24 || rnd() < 0.6) continue;
      const p = track.at(s);
      const side = d > 0 ? 1 : -1;
      const x = p.x + p.nx * (W / 2 + 30) * side;
      const y = p.y + p.ny * (W / 2 + 30) * side;
      blob(shadowSprite, x + 3, y + 4, 0.3, 0.5);
      g.save();
      g.translate(x, y);
      g.rotate(Math.atan2(p.ty, p.tx) + Math.PI / 2);
      g.fillStyle = '#e6e2d6';
      g.fillRect(-8, -11, 16, 22);
      g.fillStyle = T.curbA;
      for (let i = 0; i < 3; i++) g.fillRect(-5, -8 + i * 7, 10, 4);
      g.restore();
    }

    // 广告牌
    const ADS = ['K-RALLY', 'IDREAMS.PL', 'NEON', 'TURBO'];
    for (let i = 0; i < 12; i++) {
      const s = rnd() * track.length;
      const p = track.at(s);
      const side = rnd() < 0.5 ? -1 : 1;
      const x = p.x + p.nx * (W / 2 + 62 + rnd() * 36) * side;
      const y = p.y + p.ny * (W / 2 + 62 + rnd() * 36) * side;
      blob(shadowSprite, x + 8, y + 10, 0.8, 0.45);
      g.save();
      g.translate(x, y);
      g.rotate(Math.atan2(p.ty, p.tx));
      g.fillStyle = '#23262b';
      g.fillRect(-2.5, -4, 5, 18);
      g.fillStyle = '#14171b';
      g.fillRect(-28, -20, 56, 20);
      g.strokeStyle = '#5a6068'; g.lineWidth = 1.5;
      g.strokeRect(-28, -20, 56, 20);
      g.fillStyle = '#cfd6de';
      g.font = 'bold 8px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText(ADS[i % ADS.length], 0, -7);
      g.restore();
    }

    // 路灯
    for (let s = 150; s < track.length; s += 320) {
      const p = track.at(s);
      for (const side of [-1, 1]) {
        const x = p.x + p.nx * (W / 2 + 24) * side;
        const y = p.y + p.ny * (W / 2 + 24) * side;
        const grd = g.createRadialGradient(x, y, 0, x, y, 70);
        grd.addColorStop(0, T.lamp);
        grd.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, 70, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2a2d33';
        g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff3d0';
        g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
      }
    }

    // ---------------- 光照 ----------------
    const light = g.createRadialGradient(x0 + w * 0.42, y0 + h * 0.32, 0, x0 + w * 0.42, y0 + h * 0.32, Math.max(w, h) * 0.75);
    light.addColorStop(0, 'rgba(255,240,210,.10)');
    light.addColorStop(0.5, 'rgba(0,0,0,0)');
    light.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = light;
    g.fillRect(x0, y0, w, h);

    // 取边缘平均色，供镜头出界时填底（消除接缝）
    let edgeColor = T.grass;
    try {
      const sc = cv.getContext('2d');
      const spots = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3],
                     [Math.floor(w / 2), 2], [Math.floor(w / 2), h - 3],
                     [2, Math.floor(h / 2)], [w - 3, Math.floor(h / 2)]];
      let er = 0, eg = 0, eb = 0, n = 0;
      for (const sp of spots) {
        const d = sc.getImageData(sp[0], sp[1], 1, 1).data;
        er += d[0]; eg += d[1]; eb += d[2]; n++;
      }
      edgeColor = 'rgb(' + Math.round(er / n) + ',' + Math.round(eg / n) + ',' + Math.round(eb / n) + ')';
    } catch (e) {}

    // 小地图缩略图（避免每帧缩放整张大图）
    const thumbSize = 256;
    const tScale = Math.min(thumbSize / w, thumbSize / h);
    const thumb = document.createElement('canvas');
    thumb.width = Math.max(1, Math.round(w * tScale));
    thumb.height = Math.max(1, Math.round(h * tScale));
    thumb.getContext('2d').drawImage(cv, 0, 0, thumb.width, thumb.height);

    // 把整张地图切成 512 的瓦片，之后只按可视范围绘制；大画布可以释放
    const TILE = 512;
    const tiles = [];
    for (let ty = 0; ty < h; ty += TILE) {
      for (let tx = 0; tx < w; tx += TILE) {
        const tw = Math.min(TILE, w - tx);
        const th = Math.min(TILE, h - ty);
        const tc = document.createElement('canvas');
        tc.width = tw; tc.height = th;
        tc.getContext('2d').drawImage(cv, tx, ty, tw, th, 0, 0, tw, th);
        tiles.push({ x: x0 + tx, y: y0 + ty, w: tw, h: th, canvas: tc });
      }
    }

    // 释放整张大画布，只保留瓦片与缩略图（显著降低内存峰值）
    try { cv.width = 1; cv.height = 1; } catch (e) {}

    return {
      canvas: null, tiles: tiles, x: x0, y: y0, w: w, h: h,
      theme: T, thumb: thumb, edgeColor: edgeColor,
    };
  }

  return { build, THEMES };
})();