// drivers.js - 原作 14 名车手（名字取自 KRally.exe / data.pak 解包文本）
// perk: 速度/加速/抓地 倍率，armor 减伤倍率，prize/xp 收益倍率，pickup 拾取范围倍率
const DRIVERS = [
  { name: 'JURIJ', main: '#2ad0ff', dark: '#0b4d68', light: '#a8f0ff', body: 'sport', num: 7,
    traits: { aggr: 0.34, block: 0.46, loot: 0.55 }, bio: 'Challenge is all I need!', bioZh: '我只想要挑战！',
    sponsor: 'NEONWORKS', perkText: '极速 +4%',
    perk: { speed: 1.04, accel: 1.00, grip: 1.00, armor: 1.00, prize: 1.00, xp: 1.00, pickup: 1.00 } },

  { name: 'MARKO', main: '#ff3d8b', dark: '#6b1030', light: '#ffb3d0', body: 'muscle', num: 3,
    traits: { aggr: 0.88, block: 0.50, loot: 0.38 }, bio: 'focused, hard working, no fun no jokes ex soldier.', bioZh: '专注、拼命、不讲笑话——前军人。',
    sponsor: 'IRONCLAD', perkText: '抗撞 +28%，奖金 +5%',
    perk: { speed: 1.00, accel: 1.02, grip: 1.00, armor: 1.28, prize: 1.05, xp: 1.00, pickup: 1.00 } },

  { name: 'DR.DRILL', main: '#ffb02e', dark: '#6a3f05', light: '#ffe3a8', body: 'sedan', num: 11,
    traits: { aggr: 0.38, block: 0.92, loot: 0.42 }, bio: 'Precise, confident driving. Well done!', bioZh: '精准、自信的驾驶。干得漂亮！',
    sponsor: 'PRECISION', perkText: '抓地 +9%',
    perk: { speed: 1.00, accel: 1.00, grip: 1.09, armor: 1.05, prize: 1.00, xp: 1.00, pickup: 1.00 } },

  { name: 'RUSTY', main: '#c96a2e', dark: '#5a2c10', light: '#f0c090', body: 'truck', num: 44,
    traits: { aggr: 0.62, block: 0.55, loot: 0.35 }, bio: 'I have a family!', bioZh: '我有一家人要养！',
    sponsor: 'JUNKYARD', perkText: '抗撞 +35%，极速 -3%',
    perk: { speed: 0.97, accel: 1.00, grip: 1.02, armor: 1.35, prize: 1.00, xp: 1.00, pickup: 1.00 } },

  { name: 'KIDDO', main: '#5fe06a', dark: '#1c5e23', light: '#c4ffca', body: 'compact', num: 8,
    traits: { aggr: 0.30, block: 0.35, loot: 0.72 }, bio: "Let', bioZh: '来比赛吧！'s race!",
    sponsor: 'TOYBOX', perkText: '道具 +30%，经验 +10%',
    perk: { speed: 1.00, accel: 1.03, grip: 1.00, armor: 0.95, prize: 0.95, xp: 1.10, pickup: 1.30 } },

  { name: 'THE VIKING', main: '#8b5cff', dark: '#2c1a6b', light: '#d8c6ff', body: 'muscle', num: 13,
    traits: { aggr: 0.75, block: 0.60, loot: 0.30 }, bio: 'Show me what you have got!', bioZh: '让我看看你有什么本事！',
    sponsor: 'VALHALLA', perkText: '抗撞 +15%，奖金 +5%',
    perk: { speed: 1.00, accel: 1.00, grip: 1.00, armor: 1.15, prize: 1.05, xp: 1.00, pickup: 1.00 } },

  { name: 'EGGHEAD', main: '#f2e14c', dark: '#6b6108', light: '#fff8b8', body: 'compact', num: 21,
    traits: { aggr: 0.22, block: 0.70, loot: 0.50 }, bio: 'That is no proper way to race!', bioZh: '这可不是比赛该有的样子！',
    sponsor: 'TECHLAB', perkText: '抓地 +12%，经验 +10%',
    perk: { speed: 0.99, accel: 1.00, grip: 1.12, armor: 1.05, prize: 1.00, xp: 1.10, pickup: 1.00 } },

  { name: 'FIXER', main: '#9aa7b4', dark: '#3a444e', light: '#e2ecf4', body: 'wagon', num: 5,
    traits: { aggr: 0.45, block: 0.62, loot: 0.66 }, bio: 'Good day for a race!', bioZh: '今天适合跑一场！',
    sponsor: 'GREYMARKET', perkText: '奖金 +18%',
    perk: { speed: 1.00, accel: 1.00, grip: 1.00, armor: 1.05, prize: 1.18, xp: 1.00, pickup: 1.00 } },

  { name: 'T.SHARQUE', main: '#22c4b8', dark: '#0a4a46', light: '#a8f4ef', body: 'sport', num: 9,
    traits: { aggr: 0.55, block: 0.48, loot: 0.60 }, bio: 'Catch me if you can!', bioZh: '追得上我就来啊！',
    sponsor: 'DEEPBLUE', perkText: '极速 +5%，道具 +5%',
    perk: { speed: 1.05, accel: 1.00, grip: 0.99, armor: 1.00, prize: 1.00, xp: 1.00, pickup: 1.05 } },

  { name: 'SWEETHART', main: '#ff8fc4', dark: '#6b2444', light: '#ffd6e8', body: 'compact', num: 2,
    traits: { aggr: 0.28, block: 0.40, loot: 0.78 }, bio: 'You got lucky this time!', bioZh: '这次算你走运！',
    sponsor: 'SUGARLINE', perkText: '道具 +35%，奖金 -5%',
    perk: { speed: 0.98, accel: 1.00, grip: 1.02, armor: 0.95, prize: 0.95, xp: 1.05, pickup: 1.35 } },

  { name: 'BOBBY D.', main: '#e04b4b', dark: '#5d1616', light: '#ffb0b0', body: 'sedan', num: 17,
    traits: { aggr: 0.58, block: 0.55, loot: 0.45 }, bio: 'Better luck next time!', bioZh: '下次好运吧！',
    sponsor: 'BIG D', perkText: '加速 +8%',
    perk: { speed: 1.01, accel: 1.08, grip: 1.00, armor: 1.00, prize: 1.02, xp: 1.00, pickup: 1.00 } },

  { name: 'THUGS', main: '#6b6b6b', dark: '#262626', light: '#b8b8b8', body: 'truck', num: 66,
    traits: { aggr: 0.82, block: 0.45, loot: 0.25 }, bio: 'It is all about talent, you know!', bioZh: '这全靠天赋，你懂的！',
    sponsor: 'SCRAPCREW', perkText: '抗撞 +30%，奖金 -10%',
    perk: { speed: 1.00, accel: 1.00, grip: 0.98, armor: 1.30, prize: 0.90, xp: 1.00, pickup: 0.95 } },

  { name: 'VULTAR', main: '#b14bff', dark: '#3d1260', light: '#e3c2ff', body: 'sport', num: 1,
    traits: { aggr: 0.70, block: 0.65, loot: 0.40 }, bio: 'I expected more from someone like you!', bioZh: '我以为你能更强一点！',
    sponsor: 'VULTURE', perkText: '极速 +6%，抓地 -3%',
    perk: { speed: 1.06, accel: 1.02, grip: 0.97, armor: 0.95, prize: 1.00, xp: 1.05, pickup: 1.00 } },

  { name: 'GUILY', main: '#3f7bff', dark: '#132a63', light: '#b9cfff', body: 'wagon', num: 27,
    traits: { aggr: 0.40, block: 0.58, loot: 0.52 }, bio: 'See you at the finish line!', bioZh: '终点线见！',
    sponsor: 'BLUELINE', perkText: '奖金 +10%，经验 +10%',
    perk: { speed: 1.02, accel: 1.00, grip: 1.00, armor: 1.00, prize: 1.10, xp: 1.10, pickup: 1.00 } },
];
if (typeof window !== 'undefined') window.DRIVERS = DRIVERS;