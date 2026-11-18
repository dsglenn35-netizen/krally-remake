// art.js - 写实俯视车辆 + 特效（全部程序化绘制）
const Art = (() => {
  const SS = 3;                 // 精灵超采样倍数
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

  // 各车型比例（半长 L / 半宽 Wd / 轮距 / 驾驶舱位置）
  const BODIES = {
    sport:   { L: 31, Wd: 12.5, wheelL: 10, axleF: -19, axleR: 20, cabinY: -2, cabinW: 8.2, wing: true,  scoop: true },
    muscle:  { L: 30, Wd: 14,   wheelL: 10, axleF: -18, axleR: 19, cabinY: -1, cabinW: 9.2, wing: false, scoop: true },
    sedan:   { L: 32, Wd: 13,   wheelL: 9.5, axleF: -20, axleR: 21, cabinY: 0, cabinW: 9.6, wing: false, scoop: false },
    compact: { L: 24, Wd: 12,   wheelL: 8, axleF: -14, axleR: 15, cabinY: -1, cabinW: 9.2, wing: false, scoop: false },
    truck:   { L: 34, Wd: 15,   wheelL: 10.5, axleF: -22, axleR: 23, cabinY: -14, cabinW: 10, wing: false, scoop: false, bed: true },
    wagon:   { L: 33, Wd: 13.5, wheelL: 9.5, axleF: -21, axleR: 22, cabinY: 2, cabinW: 10, wing: false, scoop: false },
  };

  // 生成一辆车的精灵（超采样绘制，运行时缩放）
  function buildCarSprite(style) {
    const B = BODIES[style.body] || BODIES.sedan;
    const pad = 26;
    const w = (B.Wd + pad) * 2 * SS;
    const h = (B.L + pad) * 2 * SS;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.translate(w / 2, h / 2);
    g.scale(SS, SS);

    const L = B.L, Wd = B.Wd;
    const main = style.main, dark = style.dark, light = style.light;

    // ---- 轮胎 ----
    function tire(x, y, len) {
      // 轮胎：柱面明暗 + 胎面花纹 + 轮毂
      const gx = g.createLinearGradient(x, 0, x + 7, 0);
      gx.addColorStop(0, '#050607');
      gx.addColorStop(0.35, '#26282d');
      gx.addColorStop(0.58, '#15171b');
      gx.addColorStop(1, '#07080a');
      g.fillStyle = gx;
      roundRect(g, x, y, 7, len, 2.2); g.fill();
      g.save();
      roundRect(g, x, y, 7, len, 2.2); g.clip();
      g.globalAlpha = 0.55;
      g.strokeStyle = '#000';
      g.lineWidth = 0.45;
      for (let i = 1; i < 9; i++) {
        g.beginPath();
        g.moveTo(x, y + (len / 9) * i);
        g.lineTo(x + 7, y + (len / 9) * i + 0.5);
        g.stroke();
      }
      g.globalAlpha = 0.30;
      g.fillStyle = '#b8c2cc';
      g.fillRect(x + 2.6, y + len * 0.24, 1.8, len * 0.52);
      g.restore();
    }

    const wl = B.wheelL;

    // ---- 车身轮廓 ----
    function bodyPath() {
      g.beginPath();
      if (style.body === 'truck') {
        g.moveTo(-Wd, -L);
        g.lineTo(Wd, -L);
        g.lineTo(Wd, L * 0.15);
        g.lineTo(Wd * 0.92, L);
        g.lineTo(-Wd * 0.92, L);
        g.lineTo(-Wd, L * 0.15);
        g.closePath();
        return;
      }
      const nose = style.body === 'sport' ? 0.62 : 0.78;
      g.moveTo(0, -L);
      g.bezierCurveTo(Wd * nose, -L * 0.86, Wd, -L * 0.42, Wd, 0);
      g.bezierCurveTo(Wd, L * 0.44, Wd * 0.84, L * 0.88, 0, L);
      g.bezierCurveTo(-Wd * 0.84, L * 0.88, -Wd, L * 0.44, -Wd, 0);
      g.bezierCurveTo(-Wd, -L * 0.42, -Wd * nose, -L * 0.86, 0, -L);
      g.closePath();
    }

    // 车漆（横向金属渐变）
    const paint = g.createLinearGradient(-Wd, 0, Wd, 0);
    paint.addColorStop(0.00, dark);
    paint.addColorStop(0.18, main);
    paint.addColorStop(0.36, light);
    paint.addColorStop(0.46, '#ffffff');
    paint.addColorStop(0.54, light);
    paint.addColorStop(0.74, main);
    paint.addColorStop(1.00, dark);
    bodyPath();
    g.fillStyle = paint;
    g.fill();

    // 车漆细节：金属颗粒 + 曲面明暗 + 环境光遮蔽 + 镜面高光
    g.save();
    bodyPath(); g.clip();
    // 金属颗粒
    g.globalAlpha = 0.05;
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#000000';
      g.fillRect(-Wd + Math.random() * Wd * 2, -L + Math.random() * L * 2, 0.6, 0.6);
    }
    g.globalAlpha = 1;
    // 横向曲面明暗（模拟圆柱受光）
    const curve = g.createLinearGradient(-Wd, 0, Wd, 0);
    curve.addColorStop(0, 'rgba(0,0,0,.42)');
    curve.addColorStop(0.20, 'rgba(0,0,0,0)');
    curve.addColorStop(0.5, 'rgba(255,255,255,.10)');
    curve.addColorStop(0.80, 'rgba(0,0,0,0)');
    curve.addColorStop(1, 'rgba(0,0,0,.48)');
    g.fillStyle = curve;
    g.fillRect(-Wd, -L, Wd * 2, L * 2);
    // 前后收边（AO）
    const edge = g.createLinearGradient(0, -L, 0, L);
    edge.addColorStop(0, 'rgba(0,0,0,.50)');
    edge.addColorStop(0.10, 'rgba(0,0,0,0)');
    edge.addColorStop(0.90, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = edge;
    g.fillRect(-Wd, -L, Wd * 2, L * 2);
    // 左侧镜面高光
    g.globalAlpha = 0.55;
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-Wd + 2.4, -L * 0.55);
    g.quadraticCurveTo(-Wd + 1.4, 0, -Wd + 2.6, L * 0.6);
    g.stroke();
    // 右侧轮廓光
    g.globalAlpha = 0.30;
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(Wd - 2.2, -L * 0.5);
    g.quadraticCurveTo(Wd - 3.2, 0, Wd - 2.4, L * 0.55);
    g.stroke();
    g.restore();

    // 车身描边
    bodyPath();
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = 0.8;
    g.stroke();

    // ---- 引擎盖 / 行李箱分区线 ----
    g.strokeStyle = 'rgba(0,0,0,.28)';
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(-Wd * 0.92, -L * 0.34); g.lineTo(Wd * 0.92, -L * 0.34);
    g.moveTo(-Wd * 0.92, L * 0.34);  g.lineTo(Wd * 0.92, L * 0.34);
    g.stroke();

    // ---- 驾驶舱（车顶） ----
    const cy = B.cabinY, cw = B.cabinW;
    const cabinTop = cy - L * 0.26, cabinBot = cy + L * 0.24;
    const roof = g.createLinearGradient(-cw, 0, cw, 0);
    roof.addColorStop(0, dark);
    roof.addColorStop(0.35, main);
    roof.addColorStop(0.5, light);
    roof.addColorStop(0.65, main);
    roof.addColorStop(1, dark);
    g.fillStyle = roof;
    roundRect(g, -cw, cabinTop, cw * 2, cabinBot - cabinTop, 4); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.7;
    roundRect(g, -cw, cabinTop, cw * 2, cabinBot - cabinTop, 4); g.stroke();

    // ---- 挡风玻璃 ----
    const glass = g.createLinearGradient(0, cabinTop - 8, 0, cabinTop + 2);
    glass.addColorStop(0, 'rgba(24,36,52,.96)');
    glass.addColorStop(0.45, 'rgba(120,170,200,.92)');
    glass.addColorStop(1, 'rgba(30,46,64,.96)');
    g.fillStyle = glass;
    g.beginPath();
    g.moveTo(0, cabinTop - 7.5);
    g.quadraticCurveTo(cw * 0.72, cabinTop - 6, cw * 0.62, cabinTop + 1.5);
    g.lineTo(-cw * 0.62, cabinTop + 1.5);
    g.quadraticCurveTo(-cw * 0.72, cabinTop - 6, 0, cabinTop - 7.5);
    g.closePath(); g.fill();
    // 玻璃反光
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(-cw * 0.42, cabinTop - 5.6);
    g.lineTo(cw * 0.08, cabinTop + 0.8);
    g.lineTo(cw * 0.3, cabinTop + 0.2);
    g.lineTo(-cw * 0.2, cabinTop - 6.2);
    g.closePath(); g.fill();
    g.restore();

    // ---- 后窗 ----
    const rw = g.createLinearGradient(0, cabinBot - 1, 0, cabinBot + 8);
    rw.addColorStop(0, 'rgba(30,46,64,.95)');
    rw.addColorStop(0.6, 'rgba(90,130,160,.85)');
    rw.addColorStop(1, 'rgba(22,34,48,.95)');
    g.fillStyle = rw;
    g.beginPath();
    g.moveTo(-cw * 0.6, cabinBot - 1.5);
    g.lineTo(cw * 0.6, cabinBot - 1.5);
    g.quadraticCurveTo(cw * 0.66, cabinBot + 6, 0, cabinBot + 8);
    g.quadraticCurveTo(-cw * 0.66, cabinBot + 6, -cw * 0.6, cabinBot - 1.5);
    g.closePath(); g.fill();

    // ---- 车顶天线 / 后视镜 ----
    g.fillStyle = dark;
    g.fillRect(-cw - 2.6, cabinTop + 1.5, 2.4, 3);   // 左镜
    g.fillRect(cw + 0.2, cabinTop + 1.5, 2.4, 3);    // 右镜

    // ---- 引擎盖细节 ----
    if (B.scoop) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      roundRect(g, -3.2, -L * 0.78, 6.4, 4.2, 1.4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(-3.2, -L * 0.78, 6.4, 0.8);
      // 通风格栅
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(-Wd * 0.7, -L * 0.5 + i * 1.6); g.lineTo(-Wd * 0.2, -L * 0.5 + i * 1.6); g.stroke();
      }
    }

    // ---- 号码 ----
    g.save();
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.beginPath(); g.arc(0, -L * 0.6, 4.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#14171c';
    g.font = 'bold 5.6px "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(style.num || 0), 0, -L * 0.6 + 0.3);
    g.restore();

    // ---- 车灯 ----
    g.fillStyle = 'rgba(255,250,225,.95)';
    roundRect(g, -Wd * 0.86, -L * 0.99, 5.2, 2.8, 1.2); g.fill();
    roundRect(g, Wd * 0.86 - 5.2, -L * 0.99, 5.2, 2.8, 1.2); g.fill();
    g.fillStyle = 'rgba(255,60,50,.95)';
    roundRect(g, -Wd * 0.88, L * 0.9, 5.4, 2.8, 1.2); g.fill();
    roundRect(g, Wd * 0.88 - 5.4, L * 0.9, 5.4, 2.8, 1.2); g.fill();

    // ---- 尾翼 ----
    if (B.wing) {
      g.fillStyle = '#1a1d22';
      roundRect(g, -Wd - 1.4, L * 0.74, (Wd + 1.4) * 2, 4.2, 1.6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(-Wd - 1.4, L * 0.74, (Wd + 1.4) * 2, 1.1);
      g.fillStyle = '#2b2f36';
      g.fillRect(-Wd * 0.55, L * 0.68, 2, 6);
      g.fillRect(Wd * 0.55 - 2, L * 0.68, 2, 6);
    }

    // ---- 货斗（皮卡）----
    if (B.bed) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(-Wd + 1, -L * 0.02, Wd * 2 - 2, 1.6);
    }
    if (false)
    if (B.bed) {
      g.fillStyle = 'rgba(0,0,0,.45)';
      roundRect(g, -Wd * 0.82, L * 0.2, Wd * 1.64, L * 0.72, 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)';
      g.lineWidth = 0.7;
      for (let i = 1; i < 4; i++) {
        g.beginPath();
        g.moveTo(-Wd * 0.82, L * 0.2 + (L * 0.72 / 4) * i);
        g.lineTo(Wd * 0.82, L * 0.2 + (L * 0.72 / 4) * i);
        g.stroke();
      }
    }

    // ---- 轮拱阴影 + 轮胎（后画，露出车身外）----
    function arch(x, y) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.beginPath();
      g.ellipse(x, y, 4.4, wl * 0.62, 0, 0, Math.PI * 2);
      g.fill();
    }
    arch(-Wd + 1.5, B.axleF); arch(Wd - 1.5, B.axleF);
    arch(-Wd + 1.5, B.axleR); arch(Wd - 1.5, B.axleR);
    tire(-Wd - 2.6, B.axleF - wl / 2, wl);
    tire(Wd - 4.4, B.axleF - wl / 2, wl);
    tire(-Wd - 2.6, B.axleR - wl / 2, wl);
    tire(Wd - 4.4, B.axleR - wl / 2, wl);

    // ---- 侧窗（驾驶舱两侧的深色条）----
    g.fillStyle = 'rgba(24,36,52,.85)';
    roundRect(g, -cw - 0.6, cabinTop + 3, 2.2, (cabinBot - cabinTop) * 0.62, 1); g.fill();
    roundRect(g, cw - 1.6, cabinTop + 3, 2.2, (cabinBot - cabinTop) * 0.62, 1); g.fill();

    // ---- 车顶高光 ----
    const top = g.createLinearGradient(-cw, cabinTop, cw, cabinBot);
    top.addColorStop(0, 'rgba(255,255,255,.22)');
    top.addColorStop(0.5, 'rgba(255,255,255,.02)');
    top.addColorStop(1, 'rgba(255,255,255,.14)');
    g.fillStyle = top;
    roundRect(g, -cw, cabinTop, cw * 2, cabinBot - cabinTop, 4); g.fill();

    return cv;
  }

  function getCarSprite(style) {
    const key = style.name || (style.body + style.main);
    if (!spriteCache.has(key)) spriteCache.set(key, buildCarSprite(style));
    return spriteCache.get(key);
  }

  // 画一辆车（含投影、尾焰、刹车灯）
  function car(ctx, x, y, angle, style, o = {}) {
    const scale = o.scale || 1;
    const sp = getCarSprite(style);
    const w = sp.width / SS * scale;
    const h = sp.height / SS * scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    // 投影
    const sh = getCarShadow();
    const shW = w * 0.95, shH = h * 0.95;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(sh, -shW / 2 + 3, -shH / 2 + 4, shW, shH);
    ctx.restore();

    // 尾焰
    if (o.thrust > 0.05) {
      const t = o.thrust;
      const B = BODIES[style.body] || BODIES.sedan;
      const fy = B.L * 0.95;
      const fg = ctx.createLinearGradient(0, fy, 0, fy + 22 * t);
      fg.addColorStop(0, 'rgba(255,240,190,.9)');
      fg.addColorStop(0.4, 'rgba(255,150,60,.5)');
      fg.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-4, fy); ctx.lineTo(4, fy); ctx.lineTo(0, fy + 22 * t);
      ctx.closePath(); ctx.fill();
    }

    // 刹车红光
    if (o.braking) {
      const B = BODIES[style.body] || BODIES.sedan;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(0, B.L * 0.95, 0, 0, B.L * 0.95, 26);
      rg.addColorStop(0, 'rgba(255,40,40,.5)');
      rg.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(0, B.L * 0.95, 26, 0, Math.PI * 2); ctx.fill();
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
    // 图标（不跟随六边形旋转）
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

  return { car, pickup, mine, rocket, explosion, skid, roundRect, getCarSprite };
})();