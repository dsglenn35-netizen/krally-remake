// portrait.js - 程序化车手头像（头盔 + 赛车服，非复用素材）
const Portrait = (() => {
  const cache = new Map();
  const SS = 2;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function build(d) {
    const S = 96;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S * SS;
    const g = cv.getContext('2d');
    g.scale(SS, SS);

    // 背景：车队色氛围
    const bg = g.createRadialGradient(S * 0.38, S * 0.3, 6, S * 0.5, S * 0.55, S * 0.72);
    bg.addColorStop(0, d.light + '55');
    bg.addColorStop(0.55, d.main + '33');
    bg.addColorStop(1, '#070b12');
    g.fillStyle = bg;
    roundRect(g, 0, 0, S, S, 10); g.fill();

    // 背景细斜纹
    g.save();
    g.beginPath(); roundRect(g, 0, 0, S, S, 10); g.clip();
    g.globalAlpha = 0.07;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    for (let i = -S; i < S * 2; i += 18) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke();
    }
    g.restore();

    const cx = S / 2;

    // ---- 肩部 / 赛车服 ----
    const suit = g.createLinearGradient(cx - 34, S, cx + 34, S - 40);
    suit.addColorStop(0, '#101722');
    suit.addColorStop(0.5, '#1c2734');
    suit.addColorStop(1, '#0b1119');
    g.fillStyle = suit;
    g.beginPath();
    g.moveTo(cx - 40, S);
    g.quadraticCurveTo(cx - 34, S - 30, cx - 14, S - 38);
    g.lineTo(cx + 14, S - 38);
    g.quadraticCurveTo(cx + 34, S - 30, cx + 40, S);
    g.closePath();
    g.fill();

    // 肩部条纹（车队色）
    g.fillStyle = d.main;
    g.beginPath();
    g.moveTo(cx - 26, S);
    g.quadraticCurveTo(cx - 22, S - 24, cx - 10, S - 33);
    g.lineTo(cx - 4, S - 31);
    g.quadraticCurveTo(cx - 16, S - 22, cx - 18, S);
    g.closePath(); g.fill();
    g.fillStyle = d.main;
    g.beginPath();
    g.moveTo(cx + 26, S);
    g.quadraticCurveTo(cx + 22, S - 24, cx + 10, S - 33);
    g.lineTo(cx + 4, S - 31);
    g.quadraticCurveTo(cx + 16, S - 22, cx + 18, S);
    g.closePath(); g.fill();

    // 领口
    g.fillStyle = '#0a0f16';
    g.beginPath();
    g.ellipse(cx, S - 34, 12, 6, 0, 0, Math.PI * 2);
    g.fill();

    // ---- 头盔 ----
    const hy = S * 0.44, hw = 26, hh = 27;
    const shell = g.createLinearGradient(cx - hw, hy - hh, cx + hw * 0.6, hy + hh);
    shell.addColorStop(0, d.light);
    shell.addColorStop(0.30, d.main);
    shell.addColorStop(0.62, d.dark);
    shell.addColorStop(1, '#0a0d13');

    // 头盔主体
    g.fillStyle = shell;
    g.beginPath();
    g.ellipse(cx, hy, hw, hh, 0, 0, Math.PI * 2);
    g.fill();

    // 盔壳高光
    g.save();
    g.beginPath(); g.ellipse(cx, hy, hw, hh, 0, 0, Math.PI * 2); g.clip();
    const hl = g.createLinearGradient(cx - hw, hy - hh, cx, hy);
    hl.addColorStop(0, 'rgba(255,255,255,.55)');
    hl.addColorStop(0.45, 'rgba(255,255,255,.05)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.fillRect(cx - hw, hy - hh, hw * 2, hh * 2);

    // 盔顶细条纹
    g.globalAlpha = 0.5;
    g.strokeStyle = d.light;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - 4, hy - hh + 2);
    g.quadraticCurveTo(cx + 2, hy, cx + 4, hy + hh - 4);
    g.stroke();
    g.globalAlpha = 1;
    g.restore();

    // ---- 面罩（护目镜）----
    const visor = g.createLinearGradient(cx - 18, hy - 12, cx + 18, hy + 6);
    visor.addColorStop(0, '#0d1a26');
    visor.addColorStop(0.35, '#3f7fa8');
    visor.addColorStop(0.55, '#9fd8f2');
    visor.addColorStop(0.75, '#2b5f80');
    visor.addColorStop(1, '#0a1420');
    g.fillStyle = visor;
    g.beginPath();
    g.moveTo(cx - 20, hy - 3);
    g.quadraticCurveTo(cx - 16, hy - 15, cx + 2, hy - 15);
    g.quadraticCurveTo(cx + 19, hy - 15, cx + 21, hy - 1);
    g.quadraticCurveTo(cx + 14, hy + 11, cx - 2, hy + 11);
    g.quadraticCurveTo(cx - 17, hy + 10, cx - 20, hy - 3);
    g.closePath();
    g.fill();
    // 面罩反光
    g.save();
    g.beginPath();
    g.moveTo(cx - 20, hy - 3);
    g.quadraticCurveTo(cx - 16, hy - 15, cx + 2, hy - 15);
    g.quadraticCurveTo(cx + 19, hy - 15, cx + 21, hy - 1);
    g.quadraticCurveTo(cx + 14, hy + 11, cx - 2, hy + 11);
    g.quadraticCurveTo(cx - 17, hy + 10, cx - 20, hy - 3);
    g.closePath(); g.clip();
    g.globalAlpha = 0.55;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(cx - 16, hy - 9);
    g.lineTo(cx - 2, hy + 8);
    g.lineTo(cx + 6, hy + 6);
    g.lineTo(cx - 8, hy - 11);
    g.closePath(); g.fill();
    g.restore();

    // 面罩边框
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(cx - 20, hy - 3);
    g.quadraticCurveTo(cx - 16, hy - 15, cx + 2, hy - 15);
    g.quadraticCurveTo(cx + 19, hy - 15, cx + 21, hy - 1);
    g.quadraticCurveTo(cx + 14, hy + 11, cx - 2, hy + 11);
    g.quadraticCurveTo(cx - 17, hy + 10, cx - 20, hy - 3);
    g.closePath();
    g.stroke();

    // 下巴护罩
    g.fillStyle = d.dark;
    g.beginPath();
    g.moveTo(cx - 17, hy + 9);
    g.quadraticCurveTo(cx, hy + 22, cx + 17, hy + 8);
    g.quadraticCurveTo(cx + 8, hy + 24, cx - 8, hy + 24);
    g.closePath(); g.fill();

    // 侧面号码
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.font = 'bold 11px "Arial Narrow", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(d.num), cx + 15, hy + 3);

    // 盔顶通风口
    g.fillStyle = 'rgba(0,0,0,.45)';
    roundRect(g, cx - 8, hy - hh + 4, 16, 3.5, 1.6); g.fill();

    return cv;
  }

  function get(d) {
    if (!cache.has(d.name)) cache.set(d.name, build(d));
    return cache.get(d.name);
  }

  return { get, build };
})();
if (typeof window !== 'undefined') window.Portrait = Portrait;
