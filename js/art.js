// art.js - 拉力赛车俯视精灵 + 特效（全部程序化绘制）
const Art = (() => {
  let SS = 3;
  let CAR_SCALE = 0.65;         // 全局车辆缩放（默认 ×0.65，接近原作比例；不影响物理）
  let carShadowSprite = null;
  const spriteCache = new Map();

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexToRgb(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbs(c, k) {
    return 'rgb(' + c.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',') + ')';
  }
  function desat(hex, k) {
    const c = hexToRgb(hex);
    const g0 = c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
    return [c[0] + (g0 - c[0]) * k, c[1] + (g0 - c[1]) * k, c[2] + (g0 - c[2]) * k];
  }

  function getCarShadow() {
    if (carShadowSprite) return carShadowSprite;
    const R = 64;
    const c = document.createElement('canvas');
    c.width = c.height = R * 2;
    const cg = c.getContext('2d');
    const grd = cg.createRadialGradient(R, R, 0, R, R, R);
    grd.addColorStop(0, 'rgba(0,0,0,.62)');
    grd.addColorStop(0.6, 'rgba(0,0,0,.30)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = grd;
    cg.beginPath(); cg.arc(R, R, R, 0, Math.PI * 2); cg.fill();
    carShadowSprite = c;
    return c;
  }

  // 拉力赛车型比例：短前后悬、方正、车顶大
  const BODIES = {
    hatch:   { L: 30, Wd: 13.0, axleF: -17, axleR: 18, roofF: -6, roofB: 13, pod: true,  bed: false },
    sedan:   { L: 33, Wd: 13.4, axleF: -19, axleR: 20, roofF: -6, roofB: 11, pod: true,  bed: false },
    wagon:   { L: 34, Wd: 13.6, axleF: -19, axleR: 21, roofF: -7, roofB: 17, pod: true,  bed: false },
    compact: { L: 27, Wd: 12.4, axleF: -15, axleR: 16, roofF: -5, roofB: 12, pod: true,  bed: false },
    truck:   { L: 36, Wd: 14.4, axleF: -21, axleR: 22, roofF: -13, roofB: -2, pod: true, bed: true },
  };
  const ALIAS = { sport: 'hatch', muscle: 'sedan' };

  function buildCarSprite(style) {
    const key = ALIAS[style.body] || style.body;
    const B = BODIES[key] || BODIES.sedan;
    const pad = 24;
    const w = (B.Wd + pad) * 2 * SS;
    const h = (B.L + pad) * 2 * SS;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.translate(w / 2, h / 2);
    g.scale(SS, SS);

    const L = B.L, Wd = B.Wd;
    const base = desat(style.main, 0.18);
    const darkC = desat(style.dark, 0.22);
    const lightC = desat(style.light, 0.25);
    const roofC = desat(style.main, 0.10);

    // ---------- 轮胎（大颗粒越野胎，外凸）----------
    const tireW = 5.6, tireL = 11.5;
    function tire(cx, cy) {
      const grd = g.createLinearGradient(cx - tireW / 2, 0, cx + tireW / 2, 0);
      grd.addColorStop(0, '#08090b');
      grd.addColorStop(0.45, '#17191d');
      grd.addColorStop(0.7, '#232629');
      grd.addColorStop(1, '#07080a');
      g.fillStyle = grd;
      roundRect(g, cx - tireW / 2, cy - tireL / 2, tireW, tireL, 1.6);
      g.fill();
      // 胎块（越野颗粒）
      g.save();
      roundRect(g, cx - tireW / 2, cy - tireL / 2, tireW, tireL, 1.6);
      g.clip();
      g.fillStyle = 'rgba(0,0,0,.55)';
      for (let i = 0; i < 5; i++) {
        const yy = cy - tireL / 2 + 1.2 + i * (tireL / 5);
        g.fillRect(cx - tireW / 2, yy, tireW, 1.1);
      }
      g.fillStyle = 'rgba(255,255,255,.06)';
      for (let i = 0; i < 5; i++) {
        const yy = cy - tireL / 2 + 1.8 + i * (tireL / 5);
        g.fillRect(cx - tireW / 2, yy, tireW, 0.5);
      }
      g.restore();
    }
    tire(-Wd - 0.9, B.axleF); tire(Wd + 0.9, B.axleF);
    tire(-Wd - 0.9, B.axleR); tire(Wd + 0.9, B.axleR);

    // ---------- 泥挡 ----------
    g.fillStyle = 'rgba(18,20,24,.92)';
    roundRect(g, -Wd - 3.2, B.axleR + 5.2, 6.4, 3.6, 0.8); g.fill();
    roundRect(g, Wd - 3.2, B.axleR + 5.2, 6.4, 3.6, 0.8); g.fill();

    // ---------- 车身轮廓 ----------
    function halfW(y) {
      const t = y / L;
      let w2 = 1;
      if (t < -0.62) { const k = (-t - 0.62) / 0.38; w2 *= 0.70 + 0.30 * Math.sqrt(Math.max(0, 1 - k * k)); }
      if (t > 0.78) { const k = (t - 0.78) / 0.22; w2 *= 0.98 - 0.03 * k; }
      const flare = Math.exp(-Math.pow((y - B.axleF) / 7.5, 2)) * 0.06 +
                    Math.exp(-Math.pow((y - B.axleR) / 7.5, 2)) * 0.07;
      return Wd * (w2 + flare);
    }
    function bodyPath() {
      const N = 40;
      g.beginPath();
      g.moveTo(halfW(-L) * 0.72, -L);
      g.lineTo(-halfW(-L) * 0.72, -L);
      for (let i = 0; i <= N; i++) {
        const y = -L + (2 * L) * (i / N);
        g.lineTo(-halfW(y), y);
      }
      g.lineTo(-halfW(L) * 0.86, L);
      g.lineTo(halfW(L) * 0.86, L);
      for (let i = N; i >= 0; i--) {
        const y = -L + (2 * L) * (i / N);
        g.lineTo(halfW(y), y);
      }
      g.closePath();
    }

    const paint = g.createLinearGradient(-Wd, 0, Wd, 0);
    paint.addColorStop(0.00, rgbs(darkC, 0.86));
    paint.addColorStop(0.18, rgbs(base, 1));
    paint.addColorStop(0.40, rgbs(lightC, 1.02));
    paint.addColorStop(0.58, rgbs(base, 1));
    paint.addColorStop(0.86, rgbs(darkC, 0.94));
    paint.addColorStop(1.00, rgbs(darkC, 0.78));
    bodyPath();
    g.fillStyle = paint;
    g.fill();

    g.save();
    bodyPath(); g.clip();

    // 金属颗粒
    g.globalAlpha = 0.05;
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
      g.fillRect(-Wd + Math.random() * Wd * 2, -L + Math.random() * L * 2, 0.6, 0.6);
    }
    g.globalAlpha = 1;

    // 车身拉花（两道纵向条纹）
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.fillRect(-Wd * 0.30, -L, 2.6, L * 2);
    g.fillRect(Wd * 0.30, -L, 2.6, L * 2);

    // 车头进气格栅
    g.fillStyle = 'rgba(8,10,12,.9)';
    roundRect(g, -Wd * 0.34, -L + 0.4, Wd * 0.68, 4.2, 1.2); g.fill();
    // 前护杠
    g.fillStyle = 'rgba(30,32,36,.95)';
    roundRect(g, -Wd * 0.78, -L - 1.6, Wd * 1.56, 2.8, 1.2); g.fill();

    // 车轮泥污
    g.fillStyle = 'rgba(86,64,42,.18)';
    g.beginPath(); g.ellipse(-Wd + 1, B.axleR + 3, 7, 9, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(Wd - 1, B.axleR + 3, 7, 9, 0, 0, Math.PI * 2); g.fill();
    g.restore();

    // 车身描边
    bodyPath();
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = 0.7;
    g.stroke();

    // ---------- 引擎盖 / 车门 / 尾门接缝 ----------
    const hoodY = -L + L * 0.26;
    g.strokeStyle = 'rgba(0,0,0,.30)';
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(-halfW(hoodY) * 0.92, hoodY); g.lineTo(halfW(hoodY) * 0.92, hoodY);
    g.moveTo(-Wd * 0.94, B.roofB + 3); g.lineTo(-halfW(B.roofB + 3) * 0.86, B.roofB + 3);
    g.moveTo(Wd * 0.94, B.roofB + 3); g.lineTo(halfW(B.roofB + 3) * 0.86, B.roofB + 3);
    g.stroke();

    // ---------- 驾驶舱（全景车窗 + 车顶）----------
    const rF = B.roofF, rB = B.roofB;
    const roofW = Wd * 0.70;

    // 挡风玻璃（前倾）
    const wsY = rF - 4.2;
    const glass = g.createLinearGradient(0, wsY, 0, rF + 1);
    glass.addColorStop(0, 'rgba(30,40,50,.96)');
    glass.addColorStop(0.5, 'rgba(70,90,106,.92)');
    glass.addColorStop(1, 'rgba(36,48,60,.96)');
    g.fillStyle = glass;
    g.beginPath();
    g.moveTo(0, wsY);
    g.quadraticCurveTo(roofW * 1.02, wsY + 1.6, roofW * 1.06, rF + 0.6);
    g.lineTo(-roofW * 1.06, rF + 0.6);
    g.quadraticCurveTo(-roofW * 1.02, wsY + 1.6, 0, wsY);
    g.closePath();
    g.fill();
    // 玻璃反光
    g.save();
    g.beginPath();
    g.moveTo(0, wsY);
    g.quadraticCurveTo(roofW * 1.02, wsY + 1.6, roofW * 1.06, rF + 0.6);
    g.lineTo(-roofW * 1.06, rF + 0.6);
    g.quadraticCurveTo(-roofW * 1.02, wsY + 1.6, 0, wsY);
    g.closePath(); g.clip();
    g.globalAlpha = 0.26;
    g.fillStyle = '#dff0ff';
    g.beginPath();
    g.moveTo(-roofW * 0.62, wsY + 0.6); g.lineTo(roofW * 0.18, rF + 0.2);
    g.lineTo(roofW * 0.44, rF + 0.2); g.lineTo(-roofW * 0.30, wsY + 0.6);
    g.closePath(); g.fill();
    g.restore();

    // 后窗
    const rwY = rB + 4.0;
    const rw = g.createLinearGradient(0, rB, 0, rwY);
    rw.addColorStop(0, 'rgba(34,46,58,.95)');
    rw.addColorStop(0.55, 'rgba(72,94,110,.9)');
    rw.addColorStop(1, 'rgba(26,36,46,.96)');
    g.fillStyle = rw;
    g.beginPath();
    g.moveTo(-roofW * 1.0, rB + 0.2);
    g.lineTo(roofW * 1.0, rB + 0.2);
    g.quadraticCurveTo(roofW * 0.86, rwY, 0, rwY);
    g.quadraticCurveTo(-roofW * 0.86, rwY, -roofW * 1.0, rB + 0.2);
    g.closePath(); g.fill();

    // 侧窗
    g.fillStyle = 'rgba(34,46,58,.9)';
    roundRect(g, -roofW - 1.6, rF + 1.2, 2.0, (rB - rF) * 0.62, 0.8); g.fill();
    roundRect(g, roofW - 0.4, rF + 1.2, 2.0, (rB - rF) * 0.62, 0.8); g.fill();

    // 舱体基座（深色玻璃带，压在车顶外圈）
    g.fillStyle = 'rgba(26,36,46,.95)';
    roundRect(g, -roofW * 1.10, rF - 1.4, roofW * 2.20, (rB - rF) + 2.8, 3.2);
    g.fill();

    // 车顶面（内缩，露出四周玻璃带）
    const roofGrad = g.createLinearGradient(-roofW, rF, roofW, rB);
    roofGrad.addColorStop(0, rgbs(roofC, 0.80));
    roofGrad.addColorStop(0.45, rgbs(roofC, 0.95));
    roofGrad.addColorStop(1, rgbs(roofC, 0.74));
    g.fillStyle = roofGrad;
    roundRect(g, -roofW * 0.94, rF + 0.6, roofW * 1.88, (rB - rF) - 1.2, 2.2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.30)';
    g.lineWidth = 0.5;
    roundRect(g, -roofW * 0.94, rF + 0.6, roofW * 1.88, (rB - rF) - 1.2, 2.2);
    g.stroke();

    // 机盖散热口
    g.fillStyle = 'rgba(10,12,14,.55)';
    g.fillRect(-Wd * 0.30, hoodY - 4.2, 4.2, 2.2);
    g.fillRect(Wd * 0.30 - 4.2, hoodY - 4.2, 4.2, 2.2);

    // 车顶号码牌
    g.fillStyle = 'rgba(248,248,245,.95)';
    roundRect(g, -4.8, rF + (rB - rF) * 0.52, 9.6, 8.2, 1.3);
    g.fill();
    g.fillStyle = '#15181d';
    g.font = 'bold 7.6px "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(style.num || 7), 0, rF + (rB - rF) * 0.52 + 4.2);

    // 车顶纵向拉花
    g.globalAlpha = 0.22;
    g.fillStyle = '#ffffff';
    g.fillRect(-roofW * 0.62, rF + 1, 2.2, rB - rF - 2);
    g.fillRect(roofW * 0.62 - 2.2, rF + 1, 2.2, rB - rF - 2);
    g.globalAlpha = 1;

    // ---------- 车顶灯组（拉力标志）----------
    if (B.pod) {
      const podY = rF - 3.6;
      // 支架
      g.fillStyle = 'rgba(20,22,26,.95)';
      roundRect(g, -roofW * 1.10, podY - 2.0, roofW * 2.20, 3.8, 1.4); g.fill();
      // 四只灯
      const n = 4;
      for (let i = 0; i < n; i++) {
        const px = -roofW * 0.74 + (roofW * 1.48) * (i / (n - 1));
        const cy2 = podY + 1.2;
        g.fillStyle = '#12151a';
        g.beginPath(); g.arc(px, cy2, 2.35, 0, Math.PI * 2); g.fill();
        const lg = g.createRadialGradient(px - 0.6, cy2 - 0.6, 0.2, px, cy2, 2.1);
        lg.addColorStop(0, '#fffdf0');
        lg.addColorStop(0.6, '#ffe9a8');
        lg.addColorStop(1, '#c9a24a');
        g.fillStyle = lg;
        g.beginPath(); g.arc(px, cy2, 1.75, 0, Math.PI * 2); g.fill();
      }
    }

    // ---------- 车顶进气口 ----------
    const scoopY = rF + (rB - rF) * 0.10;
    g.fillStyle = 'rgba(16,18,22,.92)';
    roundRect(g, -3.4, scoopY, 6.8, 4.2, 1.2); g.fill();
    g.fillStyle = 'rgba(90,110,130,.5)';
    roundRect(g, -2.6, scoopY + 0.7, 5.2, 2.6, 0.8); g.fill();

    // ---------- 天线 ----------
    g.strokeStyle = 'rgba(10,12,14,.75)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(roofW * 0.55, rB - 1);
    g.lineTo(roofW * 0.55 + 2.4, rB + 3.4);
    g.stroke();

    // ---------- 灯 ----------
    // 前大灯
    g.fillStyle = 'rgba(252,246,224,.95)';
    roundRect(g, -halfW(-L) * 0.74, -L + 1.0, 4.0, 2.2, 0.9); g.fill();
    roundRect(g, halfW(-L) * 0.74 - 4.0, -L + 1.0, 4.0, 2.2, 0.9); g.fill();
    // 尾灯
    g.fillStyle = 'rgba(196,42,44,.95)';
    roundRect(g, -halfW(L) * 0.80, L - 3.2, 4.6, 2.2, 0.9); g.fill();
    roundRect(g, halfW(L) * 0.80 - 4.6, L - 3.2, 4.6, 2.2, 0.9); g.fill();

    // ---------- 赞助商字样 ----------
    g.save();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.font = 'bold 2.4px "Segoe UI", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // 车门位置横排赞助商
    g.save();
    g.translate(0, (rF + rB) / 2 + 6);
    g.fillText((style.sponsor || 'K-RALLY').toUpperCase().slice(0, 12), -roofW - 2.6, 0);
    g.restore();
    g.restore();

    return cv;
  }

  function setSuperSample(n) {
    n = Math.max(1, Math.min(10, Math.round(n)));
    if (n !== SS) { SS = n; spriteCache.clear(); carShadowSprite = null; }
  }

  function getCarSprite(style) {
    const key = style.name || (style.body + style.main);
    if (!spriteCache.has(key)) spriteCache.set(key, buildCarSprite(style));
    return spriteCache.get(key);
  }

  function setCarScale(v) { CAR_SCALE = Math.max(0.4, Math.min(1.6, v)); }
  function getCarScale() { return CAR_SCALE; }

  function car(ctx, x, y, angle, style, o = {}) {
    const scale = (o.scale || 1) * CAR_SCALE;
    const sp = getCarSprite(style);
    const w = sp.width / SS * scale;
    const h = sp.height / SS * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    const sh = getCarShadow();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sh, -w * 0.5 + 2, -h * 0.46 + 4, w, h * 0.94);
    ctx.restore();

    if (o.thrust > 0.05) {
      const t = o.thrust;
      const fy = 30;
      const fg = ctx.createLinearGradient(0, fy, 0, fy + 18 * t);
      fg.addColorStop(0, 'rgba(255,235,190,.5)');
      fg.addColorStop(0.45, 'rgba(255,150,70,.22)');
      fg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-3, fy); ctx.lineTo(3, fy); ctx.lineTo(0, fy + 18 * t);
      ctx.closePath(); ctx.fill();
    }

    if (o.braking) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(0, 30, 0, 0, 30, 24);
      rg.addColorStop(0, 'rgba(255,40,40,.40)');
      rg.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(0, 30, 24, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.drawImage(sp, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const PICKUP_COLORS = {
    rocket: ['#ff5c9c', '#ff2f8e'],
    mine:   ['#ffcf5c', '#ff9b1f'],
    turbo:  ['#5cf0ff', '#1fb6ff'],
  };

  function pickup(ctx, x, y, type, t) {
    const c = PICKUP_COLORS[type] || PICKUP_COLORS.turbo;
    const pulse = 0.75 + Math.sin(t * 4) * 0.25;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 1.2);
    ctx.shadowColor = c[1];
    ctx.shadowBlur = 22 * pulse;
    ctx.strokeStyle = c[0];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 13;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = c[1] + '44';
    ctx.fill();
    ctx.rotate(-t * 1.2);
    ctx.fillStyle = '#0a1420';
    if (type === 'rocket') {
      ctx.beginPath();
      ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-1, 0); ctx.lineTo(-3, 4);
      ctx.closePath(); ctx.fill();
    } else if (type === 'mine') {
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a1420'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 3.6, Math.sin(a) * 3.6);
        ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.stroke();
      }
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0a1420';
      for (let k = -1; k <= 1; k += 2) {
        ctx.beginPath();
        ctx.moveTo(k * 2 - 2, -4); ctx.lineTo(k * 2 + 2, 0); ctx.lineTo(k * 2 - 2, 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function mine(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 0.6 + Math.sin(t * 8) * 0.4;
    ctx.fillStyle = '#2a1c10';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb340'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,40,' + pulse + ')';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function rocket(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = '#ff2f8e'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffd0e6';
    roundRect(ctx, -10, -3.5, 20, 7, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,200,.7)';
    ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(18, 0); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function explosion(ctx, x, y, r, alpha) {
    if (alpha <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,220,' + alpha + ')');
    g.addColorStop(0.35, 'rgba(255,150,60,' + alpha * 0.8 + ')');
    g.addColorStop(1, 'rgba(255,40,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function skid(ctx, x, y, angle, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
    ctx.fillRect(-11, -2, 4, 4);
    ctx.fillRect(7, -2, 4, 4);
    ctx.restore();
  }

  return { car, pickup, mine, rocket, explosion, skid, roundRect, getCarSprite, setSuperSample, setCarScale, getCarScale, get ss() { return SS; } };
})();
