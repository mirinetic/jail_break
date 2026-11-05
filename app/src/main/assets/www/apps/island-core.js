/* 창가의 작은 섬 — rules and drawing, shared by the game (island.html), the Cove screensaver, the home
   tile and 나의 프로필. Everything is drawn from code (canvas shapes and emoji); no image files.

   State (one per profile, kept by Cove):
     {v, lvl, xp, shells, inv:{item:n}, tiles:{"x,y":{t:'crop'|'tree'|'deco', id, p, w, f}},
      vis:{id:{at, talked}}, vLast, beach:[{x,y,k}], bLast, req:{day, list}, wk:{key,h,c,v,r,claimed},
      dex:{items:{}, guests:{id:visits}, decos:{}}, mail:[{from, text, gift:{item:n}, at}], seed, stats}
   Env (from Cove): {now, shift (minutes, Cove's time zone), weather:{code, isDay, temp}|null}
*/
(function (G) {
  'use strict';
  var MIN = 60000, HOUR = 3600000;
  var COLS = 25, ROWS = 17, CX = 12, CY = 8;

  // Korean particles that follow the last syllable: 당근을, 사과를 / 고양이가, 곰이
  function jong(w) { var c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; }
  function eul(w) { return w + (jong(w) ? '을' : '를'); }
  function iga(w) { return w + (jong(w) ? '이' : '가'); }
  function h32(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function rnd(s) { return (h32(s) % 100003) / 100003; }
  function pick(list, s) { return list[h32(s) % list.length]; }

  // ---------- catalogue ----------
  // g = minutes to grow, y = harvest amount, lv = island level needed, season: 0 winter 1 spring 2 summer 3 autumn
  var CROPS = {
    carrot: { n: '당근', e: '🥕', g: 20, y: [2, 3], sell: 6, price: 4, xp: 2, lv: 1 },
    strawberry: { n: '딸기', e: '🍓', g: 45, y: [2, 4], sell: 9, price: 6, xp: 3, lv: 1 },
    daisy: { n: '데이지', e: '🌼', g: 30, y: [1, 2], sell: 8, price: 5, xp: 2, lv: 1, flower: 1 },
    potato: { n: '감자', e: '🥔', g: 90, y: [3, 4], sell: 12, price: 8, xp: 4, lv: 2 },
    tulip: { n: '튤립', e: '🌷', g: 40, y: [1, 2], sell: 12, price: 7, xp: 3, lv: 2, flower: 1, season: 1 },
    broccoli: { n: '브로콜리', e: '🥦', g: 60, y: [2, 3], sell: 13, price: 8, xp: 4, lv: 2 },
    sunflower: { n: '해바라기', e: '🌻', g: 120, y: [1, 2], sell: 22, price: 12, xp: 6, lv: 3, flower: 1 },
    eggplant: { n: '가지', e: '🍆', g: 150, y: [2, 3], sell: 20, price: 12, xp: 6, lv: 3 },
    corn: { n: '옥수수', e: '🌽', g: 180, y: [2, 4], sell: 22, price: 14, xp: 7, lv: 3 },
    rose: { n: '장미', e: '🌹', g: 180, y: [1, 2], sell: 34, price: 18, xp: 8, lv: 4, flower: 1 },
    mushroom: { n: '버섯', e: '🍄', g: 120, y: [2, 3], sell: 24, price: 14, xp: 6, lv: 4, season: 0 },
    pumpkin: { n: '호박', e: '🎃', g: 300, y: [1, 2], sell: 60, price: 26, xp: 12, lv: 4, season: 3 },
    watermelon: { n: '수박', e: '🍉', g: 360, y: [1, 2], sell: 70, price: 30, xp: 14, lv: 5, season: 2 },
    sweetpotato: { n: '고구마', e: '🍠', g: 240, y: [2, 3], sell: 30, price: 18, xp: 9, lv: 5, season: 3 }
  };
  // g = minutes until grown, f = minutes between fruit
  var TREES = {
    apple: { n: '사과나무', fruit: 'apple', fn: '사과', e: '🍎', g: 240, f: 180, y: [2, 3], sell: 14, price: 40, xp: 4, lv: 1, leaf: '#4caf50' },
    orange: { n: '귤나무', fruit: 'orange', fn: '귤', e: '🍊', g: 360, f: 240, y: [2, 4], sell: 16, price: 60, xp: 5, lv: 2, leaf: '#43a047' },
    lemon: { n: '레몬나무', fruit: 'lemon', fn: '레몬', e: '🍋', g: 360, f: 240, y: [2, 3], sell: 18, price: 70, xp: 5, lv: 3, leaf: '#66bb6a' },
    peach: { n: '복숭아나무', fruit: 'peach', fn: '복숭아', e: '🍑', g: 300, f: 210, y: [2, 3], sell: 20, price: 80, xp: 6, lv: 4, leaf: '#558b2f' },
    coconut: { n: '야자수', fruit: 'coconut', fn: '코코넛', e: '🥥', g: 480, f: 360, y: [1, 2], sell: 45, price: 120, xp: 8, lv: 5, palm: 1 },
    cherry: { n: '벚나무', fruit: 'petal', fn: '벚꽃잎', e: '🌸', g: 420, f: 300, y: [2, 4], sell: 15, price: 150, xp: 6, lv: 6, leaf: '#f8bbd0' }
  };
  var MATS = { wood: { n: '나무토막', sell: 5 }, stone: { n: '돌', sell: 5 }, pearl: { n: '진주', sell: 150 } };
  // Furniture. c = cost, v = drawn as a shape instead of an emoji
  var DECOS = {
    bench: { n: '벤치', v: 'bench', c: { wood: 3 }, lv: 1 },
    flowerbed: { n: '화단', v: 'flowerbed', c: { daisy: 2, stone: 1 }, lv: 1 },
    lantern: { n: '등불', e: '🏮', c: { wood: 1, stone: 1, shells: 10 }, lv: 1, light: 1 },
    mailbox: { n: '우체통', e: '📮', c: { wood: 2, stone: 1 }, lv: 1 },
    parasol: { n: '파라솔', e: '⛱️', c: { wood: 1, shells: 30 }, lv: 2 },
    canoe: { n: '카누', e: '🛶', c: { wood: 5 }, lv: 2 },
    tent: { n: '텐트', e: '⛺', c: { wood: 4, shells: 20 }, lv: 2 },
    campfire: { n: '모닥불', e: '🔥', c: { wood: 3, stone: 2 }, lv: 2, light: 1 },
    fountain: { n: '분수', e: '⛲', c: { stone: 4, shells: 40 }, lv: 3 },
    windmill: { n: '풍차', v: 'windmill', c: { wood: 6, stone: 2 }, lv: 3 },
    well: { n: '우물', v: 'well', c: { stone: 5, wood: 2 }, lv: 3 },
    scarecrow: { n: '허수아비', v: 'scarecrow', c: { wood: 2, corn: 1 }, lv: 3 },
    bike: { n: '자전거', e: '🚲', c: { stone: 2, shells: 30 }, lv: 3 },
    cactus: { n: '선인장 화분', e: '🌵', c: { stone: 1, shells: 15 }, lv: 2 },
    cabin: { n: '오두막', e: '🏠', c: { wood: 8, stone: 4, shells: 80 }, lv: 4 },
    statue: { n: '석상', e: '🗿', c: { stone: 6 }, lv: 4 },
    swing: { n: '그네', v: 'swing', c: { wood: 4, shells: 30 }, lv: 4 },
    piano: { n: '피아노', e: '🎹', c: { wood: 4, shells: 120 }, lv: 5 },
    telescope: { n: '망원경', e: '🔭', c: { stone: 2, shells: 60 }, lv: 5 },
    carousel: { n: '회전목마', e: '🎠', c: { wood: 6, shells: 150 }, lv: 6 },
    ferris: { n: '관람차', e: '🎡', c: { stone: 8, shells: 250 }, lv: 8 },
    castle: { n: '모래성', e: '🏰', c: { stone: 6, pearl: 1, shells: 100 }, lv: 7 },
    snowman: { n: '눈사람', e: '⛄', c: { shells: 10 }, lv: 1, season: 0 },
    xmastree: { n: '트리', e: '🎄', c: { wood: 3, shells: 20 }, lv: 2, season: 0 },
    koinobori: { n: '잉어 깃발', e: '🎏', c: { shells: 25, wood: 1 }, lv: 2, season: 1 },
    windbell: { n: '풍경', e: '🎐', c: { shells: 20 }, lv: 2, season: 2 },
    jackolantern: { n: '호박 등', e: '🎃', c: { pumpkin: 1 }, lv: 4, season: 3, light: 1 },
    trophy: { n: '주간 트로피', e: '🏆', c: null, lv: 1 },
    lighthouse: { n: '가족 등대', v: 'lighthouse', c: null, lv: 1, light: 1 }
  };
  // Building: floors lie under things and join their neighbours into paths; walls and gates join into
  // fences and walls when built side by side. Cost is per square.
  var STRUCT = {
    path_stone: { n: '돌길', layer: 'floor', c: { stone: 1 }, lv: 1, col: '#b8b0a3', edge: '#8f877a' },
    path_wood: { n: '나무 데크', layer: 'floor', c: { wood: 1 }, lv: 1, col: '#c99a62', edge: '#9a6d3f' },
    path_sand: { n: '모래길', layer: 'floor', c: { shells: 2 }, lv: 1, col: '#ecdcae', edge: '#cdb57f' },
    path_flower: { n: '꽃길', layer: 'floor', c: { daisy: 1 }, lv: 2, col: '#a7d98a', edge: '#78b35d' },
    path_brick: { n: '벽돌 바닥', layer: 'floor', c: { stone: 1, shells: 5 }, lv: 3, col: '#c8705a', edge: '#9a4e3c' },
    fence: { n: '나무 울타리', layer: 'wall', c: { wood: 1 }, lv: 1, style: 'fence' },
    picket: { n: '흰 울타리', layer: 'wall', c: { wood: 1, shells: 3 }, lv: 2, style: 'picket' },
    stonewall: { n: '돌담', layer: 'wall', c: { stone: 2 }, lv: 2, style: 'stone' },
    hedge: { n: '생울타리', layer: 'wall', c: { daisy: 1, shells: 4 }, lv: 3, style: 'hedge' },
    brickwall: { n: '벽돌담', layer: 'wall', c: { stone: 2, shells: 6 }, lv: 4, style: 'brick' },
    gate_wood: { n: '나무 문', layer: 'wall', c: { wood: 3 }, lv: 1, style: 'gate', gate: 1 },
    gate_arch: { n: '돌 아치 문', layer: 'wall', c: { stone: 4, shells: 10 }, lv: 3, style: 'arch', gate: 1 }
  };
  // Guests come when the island has what they like (and stay about a day).
  var GUESTS = {
    cat: { n: '고양이', e: '🐱', lv: 1, need: { deco: { bench: 1 } }, txt: '벤치가 있으면 와요' },
    rabbit: { n: '토끼', e: '🐰', lv: 1, need: { crop: { carrot: 1 }, deco: { flowerbed: 1 } }, txt: '당근 밭과 화단을 좋아해요' },
    dog: { n: '강아지', e: '🐶', lv: 1, need: { wall: { fence: 4 } }, txt: '나무 울타리를 4칸 이상 두르면 놀러 와요' },
    duck: { n: '오리', e: '🦆', lv: 2, need: { deco: { canoe: 1 } }, txt: '카누를 타고 싶어 해요' },
    turtle: { n: '거북', e: '🐢', lv: 2, need: { deco: { parasol: 1 } }, txt: '파라솔 그늘에서 쉬어요' },
    fox: { n: '여우', e: '🦊', lv: 2, need: { deco: { lantern: 1 }, night: 1 }, txt: '밤에 등불이 켜지면 와요' },
    penguin: { n: '펭귄', e: '🐧', lv: 2, need: { deco: { snowman: 1 } }, txt: '눈사람 친구를 찾아요' },
    bee: { n: '꿀벌', e: '🐝', lv: 3, need: { crop: { sunflower: 2 } }, txt: '해바라기 2송이가 피면 와요' },
    bear: { n: '곰', e: '🐻', lv: 3, need: { tree: { apple: 1 }, deco: { tent: 1 } }, txt: '사과나무와 텐트를 좋아해요' },
    frog: { n: '개구리', e: '🐸', lv: 3, need: { deco: { fountain: 1 }, rain: 1 }, txt: '비 오는 날 분수에 와요' },
    squirrel: { n: '다람쥐', e: '🐿️', lv: 3, need: { tree: { orange: 1 }, deco: { bench: 1 } }, txt: '귤나무 옆 벤치를 좋아해요' },
    crab: { n: '게', e: '🦀', lv: 3, need: { deco: { canoe: 1, parasol: 1 } }, txt: '카누와 파라솔이 있는 바닷가' },
    butterfly: { n: '나비', e: '🦋', lv: 4, need: { crop: { tulip: 1, rose: 1 } }, txt: '튤립과 장미가 함께 피면 와요' },
    hedgehog: { n: '고슴도치', e: '🦔', lv: 4, need: { crop: { mushroom: 1 }, deco: { flowerbed: 2 } }, txt: '버섯과 화단 2개' },
    panda: { n: '판다', e: '🐼', lv: 4, need: { deco: { cabin: 1 } }, txt: '오두막에서 쉬고 싶어 해요' },
    koala: { n: '코알라', e: '🐨', lv: 5, need: { tree: { coconut: 1 } }, txt: '야자수에 매달려요' },
    owl: { n: '부엉이', e: '🦉', lv: 5, need: { deco: { telescope: 1 }, night: 1 }, txt: '밤에 망원경으로 별을 봐요' },
    parrot: { n: '앵무새', e: '🦜', lv: 5, need: { tree: { coconut: 1 }, deco: { parasol: 1 } }, txt: '야자수와 파라솔' },
    octopus: { n: '문어', e: '🐙', lv: 6, need: { deco: { fountain: 1, canoe: 1 } }, txt: '분수와 카누를 좋아해요' },
    unicorn: { n: '유니콘', e: '🦄', lv: 8, need: { deco: { carousel: 1, ferris: 1 } }, txt: '회전목마와 관람차가 있는 섬' }
  };
  var XP_AT = [0, 40, 110, 220, 380, 600, 900, 1300, 1800, 2400];   // XP needed for level 1..10
  var LIGHTHOUSE = [
    { n: '기초', c: { stone: 10, wood: 5 } }, { n: '기둥', c: { stone: 20, wood: 10 } }, { n: '계단', c: { wood: 20, shells: 200 } },
    { n: '불빛', c: { pearl: 1, shells: 400, stone: 20 } }, { n: '완성', c: { shells: 800, wood: 30, stone: 30 } }
  ];
  var WEEK_GOALS = [['h', 40, '수확'], ['c', 4, '만들기'], ['v', 5, '손님과 이야기'], ['r', 6, '의뢰']];

  // ---------- time ----------
  function wall(env, t) { return new Date((t || env.now) + (env.shift || 0) * MIN); }
  function dayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function seasonOf(d) { var m = d.getMonth(); return m === 11 || m < 2 ? 0 : m < 5 ? 1 : m < 8 ? 2 : 3; }
  var SEASON_N = ['겨울', '봄', '여름', '가을'];
  function phase(d) { var h = d.getHours() + d.getMinutes() / 60; return h < 5 ? 'night' : h < 7 ? 'dawn' : h < 17 ? 'day' : h < 19.5 ? 'dusk' : 'night'; }
  function weatherKind(env) {
    var c = env.weather ? env.weather.code : 0;
    if (c === undefined || c === null) return 'clear';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'rain';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if (c >= 2) return 'cloud';
    return 'clear';
  }

  // ---------- island shape ----------
  function radii(lvl) { return [3.9 + lvl * 0.73, 2.5 + lvl * 0.47]; }
  var coastCache = {};
  function coast(seed) {
    if (!coastCache[seed]) coastCache[seed] = [2, 3, 4, 5].map(function (k) { return [k, rnd(seed + 'ph' + k) * 6.28, 0.05 + rnd(seed + 'am' + k) * 0.07]; });
    return coastCache[seed];
  }
  function isLand(x, y, lvl, seed) {
    if (x < 1 || y < 1 || x > COLS - 2 || y > ROWS - 2) return false;
    var r = radii(lvl), nx = (x - CX) / r[0], ny = (y - CY) / r[1], d = nx * nx + ny * ny, a = Math.atan2(ny, nx), w = 0;
    coast(seed).forEach(function (c) { w += Math.sin(a * c[0] + c[1]) * c[2]; });
    return d + w + (rnd(seed + ':' + x + ',' + y) - 0.5) * 0.08 <= 1;
  }
  function isBeach(x, y, lvl, seed) {
    if (isLand(x, y, lvl, seed) || x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (isLand(x + dx, y + dy, lvl, seed)) return true;
    return false;
  }
  function landCount(lvl, seed) { var n = 0; for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (isLand(x, y, lvl, seed)) n++; return n; }

  // ---------- state ----------
  function fresh(seed) {
    var s = { v: 2, floor: {}, lvl: 1, xp: 0, shells: 60, inv: { 'seed:carrot': 4, 'seed:strawberry': 2, 'tree:apple': 1, wood: 2 }, tiles: {}, vis: {}, vLast: 0,
      beach: [], bLast: 0, req: null, wk: null, dex: { items: {}, guests: {}, decos: {} }, mail: [], seed: seed || 'isle', stats: { h: 0, c: 0, v: 0 }, made: 0 };
    s.tiles[(CX - 1) + ',' + CY] = { t: 'crop', id: 'carrot', p: 0, w: 0 };   // a first carrot, ready to pick
    s.inv.wood = 6; s.inv.stone = 4;
    s.mail.push({ from: '섬 관리소', text: '창가의 작은 섬에 오신 걸 환영해요! 당근이 벌써 다 자랐어요. 섬을 돌아보세요.', at: 0 });
    return s;
  }
  function norm(s, seed) {
    if (!s || !s.v) return fresh(seed);
    if (s.v === 1) {   // the first version had a 13x9 board: spread everything out onto the finer one
      var moved = {};
      for (var k0 in s.tiles) {
        var q = k0.split(','), t0 = s.tiles[k0], nk = (CX + (+q[0] - 6) * 2) + ',' + (CY + (+q[1] - 4) * 2);
        if (t0.t === 'deco' && t0.id === 'fence') t0 = { t: 'wall', id: 'fence' };
        moved[nk] = t0;
      }
      s.tiles = moved; s.beach = []; s.v = 2;
      if (s.inv['deco:fence']) { s.inv.wood = (s.inv.wood || 0) + s.inv['deco:fence'] * 2; delete s.inv['deco:fence']; }
    }
    if (!s.floor || typeof s.floor !== 'object') s.floor = {};
    ['inv', 'tiles', 'vis'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    if (!s.dex) s.dex = { items: {}, guests: {}, decos: {} };
    ['items', 'guests', 'decos'].forEach(function (k) { if (!s.dex[k]) s.dex[k] = {}; });
    if (!Array.isArray(s.beach)) s.beach = [];
    if (!Array.isArray(s.mail)) s.mail = [];
    if (!s.stats) s.stats = { h: 0, c: 0, v: 0 };
    if (!s.seed) s.seed = seed || 'isle';
    return s;
  }
  function inv(s, k) { return s.inv[k] || 0; }
  function add(s, k, n) { s.inv[k] = (s.inv[k] || 0) + n; if (s.inv[k] <= 0) delete s.inv[k]; if (n > 0 && !/^(seed|tree|deco):/.test(k)) s.dex.items[k] = 1; }
  function has(s, cost) {
    for (var k in cost) if (cost.hasOwnProperty(k)) { if ((k === 'shells' ? s.shells : inv(s, k)) < cost[k]) return false; }
    return true;
  }
  function pay(s, cost) { for (var k in cost) if (cost.hasOwnProperty(k)) { if (k === 'shells') s.shells -= cost[k]; else add(s, k, -cost[k]); } }
  function gainXp(s, n) {
    s.xp += n;
    var up = false;
    while (s.lvl < 10 && s.xp >= XP_AT[s.lvl]) { s.lvl++; up = true; }
    return up;
  }
  function countWhere(s, t, id) { var n = 0; for (var k in s.tiles) if (s.tiles[k].t === t && s.tiles[k].id === id) n++; return n; }

  // ---------- items ----------
  function itemInfo(k) {
    if (CROPS[k]) return { n: CROPS[k].n, e: CROPS[k].e, sell: CROPS[k].sell };
    for (var t in TREES) if (TREES[t].fruit === k) return { n: TREES[t].fn, e: TREES[t].e, sell: TREES[t].sell };
    if (MATS[k]) return { n: MATS[k].n, e: k, sell: MATS[k].sell, mat: 1 };
    var m = /^(seed|tree|deco):(.+)$/.exec(k);
    if (m && m[1] === 'seed') return { n: CROPS[m[2]].n + ' 씨앗', e: CROPS[m[2]].e, seed: 1 };
    if (m && m[1] === 'tree') return { n: TREES[m[2]].n + ' 묘목', e: '🌱', seed: 1 };
    if (m && m[1] === 'deco') return { n: DECOS[m[2]].n, e: DECOS[m[2]].e || '', v: DECOS[m[2]].v, deco: 1 };
    if (STRUCT[k]) return { n: STRUCT[k].n, e: '', st: 1 };
    return { n: k, e: '❔', sell: 0 };
  }

  // ---------- growing ----------
  function speed(s, env, shared) {
    var w = weatherKind(env), ph = phase(wall(env));
    var sp = (w === 'clear' && (ph === 'day' || ph === 'dawn')) ? 1.2 : 1;
    if (shared && shared.light && shared.light.stage >= 5) sp *= 1.1;
    return sp;
  }
  function cropProg(tile, env, sp) {
    var c = CROPS[tile.id];
    if (!tile.w && tile.w !== 0) return 0;
    return Math.min(1, (env.now - tile.w) * sp / (c.g * MIN));
  }
  function treeState(tile, env, sp) {
    var tr = TREES[tile.id], grown = tile.p + tr.g * MIN / sp;
    if (env.now < grown) return { grown: false, prog: (env.now - tile.p) * sp / (tr.g * MIN) };
    var from = Math.max(grown, tile.f || 0);
    var fp = Math.min(1, (env.now - from) * sp / (tr.f * MIN));
    return { grown: true, fruit: fp >= 1, prog: fp };
  }
  function left(ms) { var m = Math.max(1, Math.ceil(ms / MIN)); return m >= 60 ? Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + m % 60 + '분' : '') : m + '분'; }

  // Brings the island up to now: rain waters, beach finds wash up, guests come and go, today's requests.
  function update(s, env, shared, pid) {
    var w = weatherKind(env), now = env.now, k;
    if (w === 'rain') for (k in s.tiles) { var t = s.tiles[k]; if (t.t === 'crop' && !t.w && t.w !== 0) t.w = now; }
    // beach finds every 90 minutes (up to 5 lying around)
    var slot = Math.floor(now / (90 * MIN));
    if (!s.bLast) s.bLast = slot - 3;
    for (var b = Math.max(s.bLast + 1, slot - 6); b <= slot; b++) {
      if (s.beach.length >= 5) break;
      var spots = [];
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (isBeach(x, y, s.lvl, s.seed) && !beachAt(s, x, y)) spots.push([x, y]);
      if (!spots.length) break;
      var sp0 = spots[h32(s.seed + ':b' + b) % spots.length], r = rnd(s.seed + ':k' + b);
      s.beach.push({ x: sp0[0], y: sp0[1], k: r < 0.05 ? 'pearl' : r < 0.5 ? 'shell' : r < 0.75 ? 'stone' : 'wood' });
    }
    s.bLast = slot;
    // guests: checked hour by hour, at most 3 at a time; each stays 18 hours
    var hour = Math.floor(now / HOUR);
    if (!s.vLast) s.vLast = hour - 1;
    for (var hh = Math.max(s.vLast + 1, hour - 12); hh <= hour; hh++) {
      for (k in s.vis) if (s.vis[k].at + 18 * HOUR < hh * HOUR) delete s.vis[k];
      var present = Object.keys(s.vis).length;
      var hEnv = { now: hh * HOUR, shift: env.shift, weather: env.weather };
      for (var gid in GUESTS) {
        if (present >= 3) break;
        if (s.vis[gid] || !guestOk(s, gid, hEnv)) continue;
        if (rnd(pid + ':' + gid + ':' + hh) < 0.32) { s.vis[gid] = { at: hh * HOUR, talked: false }; present++; }
      }
    }
    s.vLast = hour;
    // today's requests and this week's goals
    var today = dayKey(wall(env));
    if (!s.req || s.req.day !== today) s.req = { day: today, list: makeRequests(s, today) };
    var wk = weekKey(wall(env));
    if (!s.wk || s.wk.key !== wk) s.wk = { key: wk, h: 0, c: 0, v: 0, r: 0, claimed: false };
    // the family lighthouse, once finished, stands on every island
    if (shared && shared.light && shared.light.stage >= 5 && !s.gotLight) { add(s, 'deco:lighthouse', 1); s.gotLight = true; s.mail.unshift({ from: '가족 등대', text: '가족이 함께 등대를 완성했어요! 내 섬에도 등대를 세울 수 있어요. 작물이 10% 빨리 자라요.', at: now }); }
    return s;
  }
  function weekKey(d) { var a = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()); return dayKey(a); }
  function beachAt(s, x, y) { for (var i = 0; i < s.beach.length; i++) if (s.beach[i].x === x && s.beach[i].y === y) return s.beach[i]; return null; }
  function guestOk(s, gid, env) {
    var g = GUESTS[gid], n = g.need, k;
    if (s.lvl < g.lv) return false;
    if (n.night && phase(wall(env)) !== 'night') return false;
    if (n.rain && weatherKind(env) !== 'rain') return false;
    for (k in n.deco || {}) if (countWhere(s, 'deco', k) < n.deco[k]) return false;
    for (k in n.crop || {}) if (countWhere(s, 'crop', k) < n.crop[k]) return false;
    for (k in n.tree || {}) if (countWhere(s, 'tree', k) < n.tree[k]) return false;
    for (k in n.wall || {}) if (countWhere(s, 'wall', k) < n.wall[k]) return false;
    return true;
  }
  function produceList(s) {
    var out = [];
    for (var c in CROPS) if (CROPS[c].lv <= s.lvl) out.push(c);
    for (var t in TREES) if (TREES[t].lv <= s.lvl) out.push(TREES[t].fruit);
    return out;
  }
  function makeRequests(s, day) {
    var pool = produceList(s), list = [], used = {};
    var who = ['고양이', '토끼', '우체부 갈매기', '이웃 섬 할머니', '꼬마 해적', '등대지기'];
    for (var i = 0; i < 3 && pool.length; i++) {
      var item = pool[h32(s.seed + day + 'r' + i) % pool.length], tries = 0;
      while (used[item] && tries++ < 8) item = pool[h32(s.seed + day + 'r' + i + tries) % pool.length];
      used[item] = 1;
      var n = 2 + h32(day + item) % 4, info = itemInfo(item);
      list.push({ item: item, n: n, by: who[h32(day + i) % who.length], shells: Math.round(info.sell * n * 1.6 + 10), xp: 10 + n * 2, done: false });
    }
    return list;
  }

  // ---------- actions (each returns a message, or null when nothing happened) ----------
  function tileAt(s, x, y) { return s.tiles[x + ',' + y]; }
  function guestAt(s, x, y) {
    var spots = guestSpots(s);
    for (var gid in s.vis) if (spots[gid] && spots[gid][0] === x && spots[gid][1] === y) return gid;
    return null;
  }
  // Where each guest stands: a free land tile chosen from its name, so it stays put between visits.
  function guestSpots(s) {
    var free = [], out = {};
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (isLand(x, y, s.lvl, s.seed) && !s.tiles[x + ',' + y]) free.push([x, y]);
    Object.keys(s.vis).sort().forEach(function (gid) {
      if (!free.length) return;
      var i = h32(s.seed + gid + s.vis[gid].at) % free.length;
      out[gid] = free[i]; free.splice(i, 1);
    });
    return out;
  }
  function harvest(s, x, y, env, shared) {
    var k = x + ',' + y, t = s.tiles[k], sp = speed(s, env, shared), n, info;
    if (!t) return null;
    if (t.t === 'crop' && cropProg(t, env, sp) >= 1) {
      var c = CROPS[t.id];
      n = c.y[0] + h32(k + t.p) % (c.y[1] - c.y[0] + 1);
      add(s, t.id, n); delete s.tiles[k];
      s.stats.h++; if (s.wk) s.wk.h++;
      var up = gainXp(s, c.xp);
      return { msg: c.e + ' ' + c.n + ' ' + n + '개를 거뒀어요' + (up ? levelMsg(s) : ''), lvlUp: up };
    }
    if (t.t === 'tree') {
      var st = treeState(t, env, sp), tr = TREES[t.id];
      if (!st.fruit) return null;
      n = tr.y[0] + h32(k + (t.f || t.p)) % (tr.y[1] - tr.y[0] + 1);
      add(s, tr.fruit, n); t.f = env.now;
      var wood = h32(k + env.now) % 2;
      if (wood) add(s, 'wood', 1);
      s.stats.h++; if (s.wk) s.wk.h++;
      var up2 = gainXp(s, tr.xp);
      return { msg: tr.e + ' ' + tr.fn + ' ' + n + '개' + (wood ? ', 나무토막 1개' : '') + '를 땄어요' + (up2 ? levelMsg(s) : ''), lvlUp: up2 };
    }
    return null;
  }
  function levelMsg(s) { return ' · 섬이 Lv.' + s.lvl + '이 되었어요! 땅이 넓어졌어요'; }
  function water(s, x, y, env) { var t = s.tiles[x + ',' + y]; if (!t || t.t !== 'crop' || t.w || t.w === 0) return null; t.w = env.now; return { msg: '💧 물을 줬어요. ' + left(CROPS[t.id].g * MIN) + ' 뒤에 자라요' }; }
  function waterAll(s, env) { var n = 0; for (var k in s.tiles) { var t = s.tiles[k]; if (t.t === 'crop' && !t.w && t.w !== 0) { t.w = env.now; n++; } } return n; }
  function plant(s, x, y, item, env) {
    if (!isLand(x, y, s.lvl, s.seed) || s.tiles[x + ',' + y] || inv(s, item) <= 0) return null;
    if (s.floor[x + ',' + y]) return { msg: '길 위에는 심을 수 없어요', fail: 1 };
    var m = /^(seed|tree):(.+)$/.exec(item);
    if (!m) return null;
    add(s, item, -1);
    if (m[1] === 'seed') s.tiles[x + ',' + y] = { t: 'crop', id: m[2], p: env.now, w: weatherKind(env) === 'rain' ? env.now : null };
    else s.tiles[x + ',' + y] = { t: 'tree', id: m[2], p: env.now, f: 0 };
    return { msg: (m[1] === 'seed' ? CROPS[m[2]].e + ' ' + eul(CROPS[m[2]].n) + ' 심었어요' + (weatherKind(env) === 'rain' ? '. 비가 와서 물은 저절로 줬어요' : '. OK를 한 번 더 눌러 물을 주세요') : '🌱 ' + eul(TREES[m[2]].n) + ' 심었어요') };
  }
  function place(s, x, y, deco) {
    if (!isLand(x, y, s.lvl, s.seed) || s.tiles[x + ',' + y] || inv(s, 'deco:' + deco) <= 0) return null;
    add(s, 'deco:' + deco, -1);
    s.tiles[x + ',' + y] = { t: 'deco', id: deco };
    return { msg: eul(DECOS[deco].n) + ' 놓았어요' };
  }
  // Build one square of a floor or wall; OK on the same piece again takes it down and gives the materials back.
  function build(s, x, y, id) {
    var st = STRUCT[id], k = x + ',' + y, t = s.tiles[k];
    if (!st || !isLand(x, y, s.lvl, s.seed)) return null;
    if (st.layer === 'floor') {
      if (s.floor[k] === id) { delete s.floor[k]; refund(s, st.c); s.frev = (s.frev || 0) + 1; return { msg: st.n + ' 한 칸을 걷었어요' }; }
      if (t && (t.t === 'crop' || t.t === 'tree')) return { msg: '밭이나 나무가 있는 곳에는 깔 수 없어요', fail: 1 };
      if (!has(s, st.c)) return { msg: '재료가 모자라요', fail: 1 };
      if (s.floor[k]) refund(s, STRUCT[s.floor[k]].c);
      pay(s, st.c); s.floor[k] = id; s.frev = (s.frev || 0) + 1; s.dex.decos[id] = 1;
      return { msg: st.n + ' 한 칸', quiet: 1 };
    }
    if (t && t.t === 'wall' && t.id === id) { delete s.tiles[k]; refund(s, st.c); return { msg: st.n + ' 한 칸을 허물었어요' }; }
    if (t && t.t !== 'wall') return { msg: '이미 무언가 있어요', fail: 1 };
    if (!has(s, st.c)) return { msg: '재료가 모자라요', fail: 1 };
    var swapped = t ? STRUCT[t.id].n : '';
    if (t) refund(s, STRUCT[t.id].c);          // a different wall piece here: swap it (e.g. put a gate into a fence)
    pay(s, st.c); s.tiles[k] = { t: 'wall', id: id }; s.dex.decos[id] = 1;
    if (swapped) return { msg: swapped + ' 자리에 ' + st.n + '을 달았어요' };
    if (!s.built) s.built = 0;
    s.built++;
    if (s.built % 10 === 0) gainXp(s, 3);
    return { msg: st.n + ' 한 칸', quiet: 1 };
  }
  function refund(s, c) { for (var k in c) if (c.hasOwnProperty(k)) { if (k === 'shells') s.shells += c[k]; else add(s, k, c[k]); } }
  function pickUp(s, x, y) {
    var t = s.tiles[x + ',' + y];
    if (!t && s.floor[x + ',' + y]) { var fl = s.floor[x + ',' + y]; delete s.floor[x + ',' + y]; refund(s, STRUCT[fl].c); s.frev = (s.frev || 0) + 1; return { msg: STRUCT[fl].n + ' 한 칸을 걷었어요' }; }
    if (!t) return null;
    if (t.t === 'deco') { add(s, 'deco:' + t.id, 1); delete s.tiles[x + ',' + y]; return { msg: eul(DECOS[t.id].n) + ' 가방에 넣었어요' }; }
    if (t.t === 'wall') { delete s.tiles[x + ',' + y]; refund(s, STRUCT[t.id].c); return { msg: STRUCT[t.id].n + ' 한 칸을 허물었어요' }; }
    delete s.tiles[x + ',' + y];
    return { msg: eul(t.t === 'tree' ? TREES[t.id].n : CROPS[t.id].n) + ' 치웠어요' };
  }
  function collect(s, x, y) {
    var b = beachAt(s, x, y);
    if (!b) return null;
    s.beach.splice(s.beach.indexOf(b), 1);
    gainXp(s, 1);
    if (b.k === 'shell') { var n = 5 + h32(s.seed + x + y + s.bLast) % 11; s.shells += n; return { msg: '🐚 조개 ' + n + '개를 주웠어요' }; }
    add(s, b.k, 1);
    return { msg: b.k === 'pearl' ? '✨ 반짝이는 진주를 찾았어요!' : b.k === 'stone' ? '돌을 주웠어요' : '떠밀려 온 나무토막을 주웠어요' };
  }
  function talk(s, gid, env, pid) {
    var v = s.vis[gid], g = GUESTS[gid];
    if (!v) return null;
    var first = !s.dex.guests[gid];
    s.dex.guests[gid] = (s.dex.guests[gid] || 0) + (v.talked ? 0 : 1);
    if (v.talked) return { msg: g.e + ' ' + g.n + ': ' + pick(['오늘 섬이 참 좋아요!', '조금 더 쉬다 갈게요.', '여기 경치가 최고예요.', '또 올게요!'], gid + env.now) };
    v.talked = true;
    var shells = 8 * g.lv + h32(pid + gid + v.at) % (12 * g.lv), extra = '';
    s.shells += shells;
    var r = rnd(pid + gid + v.at + 'g');
    if (r < 0.06) { add(s, 'pearl', 1); extra = ', 진주 1개'; }
    else if (r < 0.4) { var seeds = Object.keys(CROPS).filter(function (c) { return CROPS[c].lv <= s.lvl; }); var sd = seeds[h32(gid + v.at) % seeds.length]; add(s, 'seed:' + sd, 2); extra = ', ' + CROPS[sd].n + ' 씨앗 2개'; }
    s.stats.v++; if (s.wk) s.wk.v++;
    var up = gainXp(s, 5);
    return { msg: g.e + ' ' + iga(g.n) + (first ? ' 처음 놀러 왔어요! 도감에 올렸어요' : ' 반가워해요') + ' · 선물: 조개 ' + shells + '개' + extra + (up ? levelMsg(s) : ''), lvlUp: up };
  }
  function craft(s, deco) {
    var d = DECOS[deco];
    if (!d || !d.c || !has(s, d.c)) return null;
    pay(s, d.c); add(s, 'deco:' + deco, 1);
    s.dex.decos[deco] = 1; s.stats.c++; if (s.wk) s.wk.c++;
    var cost = 0; for (var k in d.c) cost += d.c[k] * (k === 'shells' ? 0.2 : 3);
    var up = gainXp(s, Math.round(5 + cost / 3));
    return { msg: (d.e ? d.e + ' ' : '') + eul(d.n) + ' 만들었어요. 꾸미기에서 놓을 수 있어요' + (up ? levelMsg(s) : ''), lvlUp: up };
  }
  function buy(s, item) {
    var m = /^(seed|tree):(.+)$/.exec(item), price = m[1] === 'seed' ? CROPS[m[2]].price : TREES[m[2]].price;
    if (s.shells < price) return null;
    s.shells -= price; add(s, item, 1);
    return { msg: eul(itemInfo(item).n) + ' 샀어요 (조개 ' + price + ')' };
  }
  function sell(s, item, all) {
    var n = all ? inv(s, item) : 1, info = itemInfo(item);
    if (n <= 0 || !info.sell) return null;
    add(s, item, -n); s.shells += info.sell * n;
    return { msg: info.n + ' ' + n + '개를 팔았어요 (조개 +' + info.sell * n + ')' };
  }
  function deliver(s, i) {
    var r = s.req && s.req.list[i];
    if (!r || r.done || inv(s, r.item) < r.n) return null;
    add(s, r.item, -r.n); s.shells += r.shells; r.done = true;
    if (s.wk) s.wk.r++;
    var up = gainXp(s, r.xp);
    return { msg: r.by + '에게 ' + itemInfo(r.item).n + ' ' + r.n + '개를 전했어요 · 조개 +' + r.shells + (up ? levelMsg(s) : ''), lvlUp: up };
  }
  function weekDone(s) { return !!s.wk && WEEK_GOALS.every(function (g) { return s.wk[g[0]] >= g[1]; }); }
  function claimWeek(s) {
    if (!weekDone(s) || s.wk.claimed) return null;
    s.wk.claimed = true; s.shells += 300; add(s, 'deco:trophy', 1);
    return { msg: '🏆 이번 주 목표를 모두 채웠어요! 조개 300개와 트로피를 받았어요' };
  }
  function readMail(s, i) {
    var m = s.mail[i];
    if (!m) return null;
    s.mail.splice(i, 1);
    var got = [];
    if (m.gift) for (var k in m.gift) { if (k === 'shells') s.shells += m.gift[k]; else add(s, k, m.gift[k]); got.push(itemInfo(k === 'shells' ? 'shell' : k).n + ' ' + m.gift[k]); }
    return { msg: m.from + ': ' + m.text + (got.length ? ' (받음: ' + got.join(', ') + ')' : '') };
  }
  // A family member's visit: water their dry crops (once a day each) and maybe leave a gift.
  function visitWater(host, env, by) {
    var n = waterAll(host, env);
    if (n) host.mail.unshift({ from: by, text: '놀러 와서 작물 ' + n + '개에 물을 주고 갔어요 💧', at: env.now });
    return n;
  }
  function giveGift(me, host, item, by, env) {
    if (inv(me, item) <= 0) return null;
    add(me, item, -1);
    var g = {}; g[item] = 1;
    host.mail.unshift({ from: by, text: '선물을 두고 갔어요 🎁', gift: g, at: env.now });
    return { msg: eul(itemInfo(item).n) + ' 선물로 두고 왔어요' };
  }
  function contribute(s, shared, item) {
    var L = shared.light || (shared.light = { stage: 0, prog: {} });
    if (L.stage >= LIGHTHOUSE.length) return null;
    var need = LIGHTHOUSE[L.stage].c, want = (need[item] || 0) - (L.prog[item] || 0);
    if (want <= 0) return null;
    var have = item === 'shells' ? s.shells : inv(s, item), n = Math.min(have, want);
    if (n <= 0) return null;
    if (item === 'shells') s.shells -= n; else add(s, item, -n);
    L.prog[item] = (L.prog[item] || 0) + n;
    var done = Object.keys(need).every(function (k) { return (L.prog[k] || 0) >= need[k]; });
    var msg = '등대에 ' + (item === 'shells' ? '조개' : itemInfo(item).n) + ' ' + n + '개를 보탰어요';
    if (done) { L.stage++; L.prog = {}; msg += ' · 등대 "' + LIGHTHOUSE[L.stage - 1].n + '" 단계 완성!'; }
    gainXp(s, Math.max(1, Math.round(n / 4)));
    return { msg: msg };
  }
  function summary(s, env, shared) {
    var sp = speed(s, env, shared), ready = 0, dry = 0, k;
    for (k in s.tiles) {
      var t = s.tiles[k];
      if (t.t === 'crop') { if (!t.w && t.w !== 0) dry++; else if (cropProg(t, env, sp) >= 1) ready++; }
      else if (t.t === 'tree' && treeState(t, env, sp).fruit) ready++;
    }
    var talk = 0; for (k in s.vis) if (!s.vis[k].talked) talk++;
    return { ready: ready, dry: dry, beach: s.beach.length, guests: Object.keys(s.vis).length, talk: talk, mail: s.mail.length, lvl: s.lvl, shells: s.shells,
      todo: ready + s.beach.length + talk + (s.mail.length ? 1 : 0) };
  }

  // ---------- drawing ----------
  var EMOJI_FONT = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  // The camera frames the island (land and beach) so a small island is drawn large and grows outward.
  function layout(W, H, view, s) {
    var x0 = COLS, x1 = 0, y0 = ROWS, y1 = 0;
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) if (isLand(x, y, s.lvl, s.seed) || isBeach(x, y, s.lvl, s.seed)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    var bw = x1 - x0 + 1, bh = y1 - y0 + 1, thumb = view === 'thumb';
    var tw = Math.min(W * (thumb ? 0.9 : 0.52) / bw, H * (thumb ? 0.72 : 0.44) / (bh * 0.62), W / 10);
    var th = tw * 0.62;
    return { tw: tw, th: th, ox: W / 2 - (x0 + bw / 2) * tw, oy: H * (thumb ? 0.52 : 0.54) - (y0 + bh / 2) * th, cliff: th * 0.42 };
  }
  function skyColors(ph, season, w) {
    var c = { dawn: ['#3b3f78', '#f2a07b'], day: ['#5fa8e6', '#bfe3ff'], dusk: ['#3c2f6b', '#f08a6b'], night: ['#070b22', '#1c2554'] }[ph];
    if (w === 'rain' || w === 'cloud') c = ph === 'night' ? ['#0a0d1c', '#1d2333'] : ['#6b7a90', '#aeb9c8'];
    if (w === 'snow') c = ph === 'night' ? ['#0c1124', '#2a3350'] : ['#9fb3c9', '#e4edf6'];
    return c;
  }
  function seaColors(ph) { return { dawn: ['#3d5a8f', '#1f3566'], day: ['#3fb6d9', '#1574a8'], dusk: ['#4a4f8a', '#24305e'], night: ['#0d1b3d', '#071029'] }[ph]; }
  function grassColor(season, x, y) {
    var base = [['#cfe3d0', '#bcd6bf'], ['#8fd16f', '#7fc463'], ['#6cc04f', '#5fb345'], ['#9fb24f', '#93a647']][season];
    return base[(x + y) % 2];
  }
  // Draws the island into a 2D context. o = {t: seconds (for motion), cursor:[x,y], ghost:{e|v}, view:'game'|'ambient'|'thumb', label}
  function draw(ctx, W, H, s, env, shared, o) {
    o = o || {};
    var t = o.t || 0, now = wall(env), ph = phase(now), season = seasonOf(now), wk = weatherKind(env);
    var L = layout(W, H, o.view, s), tw = L.tw, th = L.th, x, y;
    var sp = speed(s, env, shared);
    // sky
    var sc = skyColors(ph, season, wk), g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, sc[0]); g.addColorStop(1, sc[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (ph === 'night' && wk !== 'rain') {
      for (var i = 0; i < 90; i++) { var a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.6 + i)); ctx.fillStyle = 'rgba(255,255,255,' + a * 0.8 + ')'; ctx.fillRect((h32('s' + i) % 1000) / 1000 * W, (h32('t' + i) % 1000) / 1000 * H * 0.45, 2, 2); }
    }
    // sun or moon
    var hr = now.getHours() + now.getMinutes() / 60, arc = ph === 'night' ? ((hr + 5) % 24) / 12 : (hr - 6) / 13;
    var bx = W * (0.1 + 0.8 * Math.max(0, Math.min(1, arc))), by = H * (0.34 - Math.sin(Math.PI * Math.max(0, Math.min(1, arc))) * 0.24);
    if (wk !== 'rain') {
      var glow = ctx.createRadialGradient(bx, by, 0, bx, by, H * 0.16);
      glow.addColorStop(0, ph === 'night' ? 'rgba(220,230,255,.35)' : 'rgba(255,240,200,.6)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(bx - H * 0.2, by - H * 0.2, H * 0.4, H * 0.4);
      ctx.fillStyle = ph === 'night' ? '#f1f3ff' : '#fff6d6'; ctx.beginPath(); ctx.arc(bx, by, H * 0.035, 0, 7); ctx.fill();
      if (ph === 'night') { ctx.fillStyle = sc[1]; ctx.beginPath(); ctx.arc(bx + H * 0.015, by - H * 0.008, H * 0.03, 0, 7); ctx.fill(); }
    }
    // clouds
    for (i = 0; i < 5; i++) {
      var cxp = ((h32('c' + i) % 1000) / 1000 * W + t * (8 + i * 3)) % (W + 300) - 150, cyp = H * (0.07 + 0.06 * i);
      ctx.fillStyle = wk === 'rain' || wk === 'cloud' ? 'rgba(220,226,236,.55)' : ph === 'night' ? 'rgba(160,170,210,.15)' : 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(cxp, cyp, 70 + i * 12, 20 + i * 3, 0, 0, 7); ctx.ellipse(cxp + 40, cyp - 12, 46, 22, 0, 0, 7); ctx.ellipse(cxp - 40, cyp - 6, 38, 16, 0, 0, 7); ctx.fill();
    }
    // sea
    var seaTop = H * 0.3, sea = (wk === 'rain' || wk === 'snow') && ph !== 'night' ? ['#5d7890', '#2f4a66'] : seaColors(ph);
    g = ctx.createLinearGradient(0, seaTop, 0, H);
    g.addColorStop(0, sea[0]); g.addColorStop(1, sea[1]);
    ctx.fillStyle = g; ctx.fillRect(0, seaTop, W, H - seaTop);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
    for (i = 0; i < 14; i++) {
      var wy = seaTop + (H - seaTop) * (i + 0.5) / 14, amp = 3 + i * 0.4;
      ctx.beginPath();
      for (x = 0; x <= W; x += 24) ctx.lineTo(x, wy + Math.sin(x / (60 + i * 6) + t * (0.6 + i * 0.05) + i) * amp);
      ctx.globalAlpha = 0.25 + (i % 3) * 0.1; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    var tile = function (gx, gy) { return { x: L.ox + gx * tw, y: L.oy + gy * th }; };
    // the ground (sand, cliffs, grass, paths) changes rarely: it is drawn once and kept
    var snowLand = (season === 0 && wk !== 'rain') || wk === 'snow';
    ctx.drawImage(terrain(s, L, W, H, season, snowLand), 0, 0);
    // tilled soil under crops
    for (var ck in s.tiles) {
      var ct = s.tiles[ck];
      if (ct.t !== 'crop') continue;
      var cq = ck.split(','), cpp = tile(+cq[0], +cq[1]), wet = ct.w || ct.w === 0;
      roundRect(ctx, cpp.x + tw * 0.08, cpp.y + th * 0.1, tw * 0.84, th * 0.8, th * 0.2, wet ? '#6b4a32' : '#b8936b');
      ctx.fillStyle = 'rgba(0,0,0,.14)'; for (var rr2 = 0; rr2 < 3; rr2++) ctx.fillRect(cpp.x + tw * 0.16, cpp.y + th * (0.3 + rr2 * 0.2), tw * 0.68, Math.max(1, th * 0.04));
    }
    // things on the island, back to front
    var spots = guestSpots(s), byRow = [];
    for (var key in s.tiles) { var pr = key.split(','); byRow.push({ x: +pr[0], y: +pr[1], tile: s.tiles[key] }); }
    s.beach.forEach(function (b) { byRow.push({ x: b.x, y: b.y, beach: b }); });
    for (var gid in spots) byRow.push({ x: spots[gid][0], y: spots[gid][1], guest: gid });
    byRow.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lights = [];
    byRow.forEach(function (it) {
      var p2 = tile(it.x, it.y), cx = p2.x + tw / 2, base = p2.y + th * 0.8;
      if (it.tile && it.tile.t === 'wall') drawWall(ctx, s, it.x, it.y, cx, p2.y + th / 2, tw, th, it.tile.id);
      else if (it.tile) drawThing(ctx, it.tile, cx, base, tw, th, t, env, sp, season, lights);
      else if (it.beach) drawBeach(ctx, it.beach.k, cx, base, tw, t);
      else if (it.guest) {
        var gb = Math.abs(Math.sin(t * 2 + it.x)) * th * 0.12;
        shadow(ctx, cx, base, tw * 0.28);
        emoji(ctx, GUESTS[it.guest].e, cx, base - gb, tw * 0.62);
        if (!s.vis[it.guest].talked && o.view !== 'thumb') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + tw * 0.3, base - tw * 0.72 - gb, tw * 0.13, 0, 7); ctx.fill(); ctx.fillStyle = '#f59e0b'; ctx.font = 'bold ' + (tw * 0.18) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', cx + tw * 0.3, base - tw * 0.66 - gb); }
      }
    });
    // night: dark wash with warm pools of light
    if (ph === 'night' || ph === 'dusk') {
      ctx.fillStyle = ph === 'night' ? 'rgba(8,12,40,.42)' : 'rgba(40,20,60,.18)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      lights.forEach(function (l) {
        var lg = ctx.createRadialGradient(l[0], l[1], 0, l[0], l[1], tw * 1.6);
        lg.addColorStop(0, 'rgba(255,190,110,.45)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = lg; ctx.fillRect(l[0] - tw * 2, l[1] - tw * 2, tw * 4, tw * 4);
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    // weather
    if (wk === 'rain') { ctx.strokeStyle = 'rgba(200,220,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (i = 0; i < 140; i++) { var rx = (h32('r' + i) % 1000) / 1000 * W, ry = ((h32('q' + i) % 1000) / 1000 * H + t * 600) % H; ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 18); } ctx.stroke(); }
    if (wk === 'snow' || (season === 0 && wk !== 'rain' && o.view !== 'thumb')) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (i = 0; i < 90; i++) { var sx = ((h32('w' + i) % 1000) / 1000 * W + Math.sin(t + i) * 20) % W, sy = ((h32('v' + i) % 1000) / 1000 * H + t * (30 + i % 20)) % H; ctx.beginPath(); ctx.arc(sx, sy, 2 + i % 3, 0, 7); ctx.fill(); } }
    if (season === 1 && wk !== 'rain' && o.view !== 'thumb') { ctx.fillStyle = 'rgba(255,183,212,.85)'; for (i = 0; i < 26; i++) { var px2 = ((h32('p' + i) % 1000) / 1000 * W + t * 30 + Math.sin(t + i) * 30) % W, py2 = ((h32('o' + i) % 1000) / 1000 * H + t * 24) % H; ctx.beginPath(); ctx.ellipse(px2, py2, 5, 3, t + i, 0, 7); ctx.fill(); } }
    // cursor and a ghost of what is being placed
    if (o.cursor) {
      var cp = tile(o.cursor[0], o.cursor[1]), pulse = 0.6 + 0.4 * Math.sin(t * 5);
      if (o.ghost && o.ghost.t === 'build') {
        var gst = STRUCT[o.ghost.id];
        ctx.globalAlpha = 0.65;
        if (gst.layer === 'floor') { ctx.fillStyle = gst.col; ctx.fillRect(cp.x, cp.y, tw, th); }
        else { var tmp = { tiles: {} }; tmp.tiles[o.cursor[0] + ',' + o.cursor[1]] = { t: 'wall', id: o.ghost.id }; for (var nk in s.tiles) if (s.tiles[nk].t === 'wall') tmp.tiles[nk] = s.tiles[nk]; drawWall(ctx, tmp, o.cursor[0], o.cursor[1], cp.x + tw / 2, cp.y + th / 2, tw, th, o.ghost.id); }
        ctx.globalAlpha = 1;
      } else if (o.ghost) { ctx.globalAlpha = 0.6; drawThing(ctx, o.ghost, cp.x + tw / 2, cp.y + th * 0.8, tw, th, t, env, sp, season, []); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(255,255,255,' + pulse + ')'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(cp.x + tw / 2, cp.y + th / 2, tw * 0.46, th * 0.46, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + pulse * 0.15 + ')'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath();
      var ay = cp.y - th * 0.55 - Math.abs(Math.sin(t * 4)) * 8;
      ctx.moveTo(cp.x + tw / 2 - 10, ay); ctx.lineTo(cp.x + tw / 2 + 10, ay); ctx.lineTo(cp.x + tw / 2, ay + 13); ctx.fill();
    }
    return L;
  }
  var terrCache = [];
  function terrain(s, L, W, H, season, snowLand) {
    var key = [s.seed, s.lvl, W, H, season, snowLand, s.frev || 0, Object.keys(s.floor || {}).length].join('|');
    for (var i = 0; i < terrCache.length; i++) if (terrCache[i].key === key) return terrCache[i].cv;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), tw = L.tw, th = L.th, x, y;
    var tile = function (gx, gy) { return { x: L.ox + gx * tw, y: L.oy + gy * th }; };
    var rx = tw * 0.72, ry = th * 0.8, cells = [], landCells = [];
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
      var isL = isLand(x, y, s.lvl, s.seed);
      if (isL || isBeach(x, y, s.lvl, s.seed)) { var p = tile(x, y); cells.push([p.x + tw / 2, p.y + th / 2, x, y]); if (isL) landCells.push([p.x + tw / 2, p.y + th / 2, x, y]); }
    }
    var blob = function (list, color, sx, sy, dy) { ctx.fillStyle = color; ctx.beginPath(); list.forEach(function (q) { ctx.moveTo(q[0] + rx * sx, q[1] + dy); ctx.ellipse(q[0], q[1] + dy, rx * sx, ry * sy, 0, 0, 7); }); ctx.fill(); };
    blob(cells, 'rgba(160,232,240,.35)', 1.32, 1.4, L.cliff * 0.5);
    blob(cells, 'rgba(255,255,255,.35)', 1.1, 1.16, L.cliff * 0.45);
    blob(cells, '#cdb07a', 1, 1, L.cliff * 0.42);
    blob(cells, '#f2e2b3', 1, 1, 0);
    blob(landCells, '#7a5a3e', 0.95, 0.92, L.cliff);
    blob(landCells, snowLand ? '#e8eef0' : grassColor(season, 0, 0), 0.95, 0.92, 0);
    landCells.forEach(function (q) {
      var gx = q[2], gy = q[3];
      ctx.fillStyle = season === 0 ? 'rgba(180,200,210,.45)' : 'rgba(40,90,30,.16)';
      for (var tt = 0; tt < 3; tt++) { var r1 = rnd(s.seed + gx + ',' + gy + 't' + tt), r2 = rnd(s.seed + gy + ',' + gx + 'u' + tt); ctx.beginPath(); ctx.ellipse(q[0] + (r1 - 0.5) * tw * 0.8, q[1] + (r2 - 0.5) * th * 0.7, tw * 0.05, th * 0.06, 0, 0, 7); ctx.fill(); }
      if (season === 3 && rnd(gx + 'a' + gy) < 0.4) { ctx.fillStyle = 'rgba(230,126,34,.6)'; ctx.beginPath(); ctx.ellipse(q[0] + (rnd(gy + 'b' + gx) - 0.5) * tw * 0.6, q[1], tw * 0.05, th * 0.04, 0.6, 0, 7); ctx.fill(); }
    });
    // paths and floors: neighbours of the same kind join without a border
    for (var fk in (s.floor || {})) {
      var fq = fk.split(','), fx = +fq[0], fy = +fq[1], fid = s.floor[fk], st = STRUCT[fid], fp = tile(fx, fy);
      if (!st) continue;
      var same = function (dx, dy) { return s.floor[(fx + dx) + ',' + (fy + dy)] === fid; };
      ctx.fillStyle = st.col; ctx.fillRect(fp.x - 0.5, fp.y - 0.5, tw + 1, th + 1);
      floorPattern(ctx, fid, fp.x, fp.y, tw, th, fx, fy);
      ctx.fillStyle = st.edge; var e = Math.max(2, th * 0.07);
      if (!same(0, -1)) ctx.fillRect(fp.x, fp.y, tw, e);
      if (!same(0, 1)) { ctx.fillRect(fp.x, fp.y + th - e, tw, e); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(fp.x, fp.y + th, tw, e); ctx.fillStyle = st.edge; }
      if (!same(-1, 0)) ctx.fillRect(fp.x, fp.y, e, th);
      if (!same(1, 0)) ctx.fillRect(fp.x + tw - e, fp.y, e, th);
    }
    terrCache.unshift({ key: key, cv: cv });
    if (terrCache.length > 3) terrCache.pop();
    return cv;
  }
  function floorPattern(ctx, id, x, y, tw, th, gx, gy) {
    var i;
    if (id === 'path_stone') { ctx.fillStyle = 'rgba(255,255,255,.35)'; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + tw * (0.25 + (i % 2) * 0.5) + (rnd(gx + 's' + gy + i) - 0.5) * tw * 0.1, y + th * (0.3 + Math.floor(i / 2) * 0.42), tw * 0.17, th * 0.15, 0, 0, 7); ctx.fill(); } ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; return; }
    if (id === 'path_wood') { ctx.fillStyle = 'rgba(0,0,0,.14)'; for (i = 1; i < 4; i++) ctx.fillRect(x, y + th * i / 4, tw, 1.5); ctx.fillRect(x + tw * ((gx + gy) % 2 ? 0.3 : 0.7), y, 1.5, th); return; }
    if (id === 'path_brick') { ctx.fillStyle = 'rgba(255,235,220,.45)'; for (i = 1; i < 3; i++) ctx.fillRect(x, y + th * i / 3, tw, 1.5); for (i = 0; i < 3; i++) ctx.fillRect(x + tw * (i % 2 ? 0.25 : 0.5) + tw * (i % 2 ? 0.5 : 0) * 0, y + th * i / 3, 1.5, th / 3); return; }
    if (id === 'path_flower') { ['#f8bbd0', '#fff59d', '#ffffff', '#ce93d8'].forEach(function (c, j) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + tw * (0.2 + rnd(gx + 'f' + gy + j) * 0.6), y + th * (0.2 + rnd(gy + 'g' + gx + j) * 0.6), tw * 0.05, 0, 7); ctx.fill(); }); return; }
    if (id === 'path_sand') { ctx.fillStyle = 'rgba(160,130,80,.25)'; for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + tw * rnd(gx + 'd' + gy + i), y + th * rnd(gy + 'e' + gx + i), 1.6, 0, 7); ctx.fill(); } }
  }
  // Walls and fences: a post in the middle and a segment toward every neighbour that is also a wall or gate.
  function drawWall(ctx, s, gx, gy, cx, cy, tw, th, id) {
    var st = STRUCT[id];
    if (!st) return;
    var isW = function (dx, dy) { var n = s.tiles[(gx + dx) + ',' + (gy + dy)]; return n && n.t === 'wall'; };
    var E = isW(1, 0), Wt = isW(-1, 0), N = isW(0, -1), S2 = isW(0, 1), style = st.style;
    var L = cx - tw / 2, R = cx + tw / 2, T = cy - th / 2, B = cy + th / 2;
    var P = { stone: [0.32, 0.5, '#8e959e', '#bcc3ca'], brick: [0.28, 0.56, '#b5533c', '#dc7d62'], hedge: [0.38, 0.56, '#3e8d3a', '#62b456'],
      fence: [0.07, 0.5, '#8d5f3e', '#b07a50'], picket: [0.06, 0.5, '#e8e8e8', '#ffffff'], gate: [0.08, 0.6, '#8d5f3e', '#b07a50'], arch: [0.3, 0.75, '#8e959e', '#bcc3ca'] }[style];
    var d = tw * P[0], h = tw * P[1];
    var box = function (x0, y0, x1, y1, hh, front, top) {
      ctx.fillStyle = front; ctx.fillRect(x0, y1 - hh, x1 - x0, hh);
      ctx.fillStyle = top; ctx.fillRect(x0, y0 - hh, x1 - x0, y1 - y0);
    };
    var tex = function (x0, x1, y1, hh) {
      if (style === 'stone' || style === 'arch') { ctx.fillStyle = 'rgba(0,0,0,.12)'; for (var i = 0; i < 3; i++) { ctx.fillRect(x0, y1 - hh * (0.33 * i + 0.3), x1 - x0, 1.5); } }
      if (style === 'brick') { ctx.fillStyle = 'rgba(255,230,210,.45)'; for (var j = 1; j < 4; j++) ctx.fillRect(x0, y1 - hh * j / 4, x1 - x0, 1.2); }
      if (style === 'hedge') { ctx.fillStyle = 'rgba(20,70,20,.35)'; for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * rnd(gx + 'h' + gy + k), y1 - hh * rnd(gy + 'i' + gx + k), tw * 0.03, 0, 7); ctx.fill(); } }
    };
    var solid = style === 'stone' || style === 'brick' || style === 'hedge';
    if (style === 'gate' || style === 'arch') {
      var across = !(N || S2) || E || Wt;   // a gate across a left-right wall faces the viewer
      if (across) {
        if (style === 'arch') {
          box(L, cy - d / 2, L + tw * 0.2, cy + d / 2, h, P[2], P[3]); box(R - tw * 0.2, cy - d / 2, R, cy + d / 2, h, P[2], P[3]);
          ctx.strokeStyle = P[2]; ctx.lineWidth = tw * 0.12; ctx.beginPath(); ctx.arc(cx, cy + d / 2 - h * 0.8, tw * 0.34, Math.PI, 0); ctx.stroke();
          ctx.strokeStyle = P[3]; ctx.lineWidth = tw * 0.04; ctx.beginPath(); ctx.arc(cx, cy + d / 2 - h * 0.8 - tw * 0.04, tw * 0.34, Math.PI, 0); ctx.stroke();
        } else {
          box(L, cy - d / 2, L + d, cy + d / 2, h, P[2], P[3]); box(R - d, cy - d / 2, R, cy + d / 2, h, P[2], P[3]);
          ctx.fillStyle = '#a8724a'; ctx.fillRect(L + d, cy + d / 2 - h * 0.78, tw - 2 * d, h * 0.72);
          ctx.fillStyle = 'rgba(0,0,0,.18)'; for (var g = 1; g < 4; g++) ctx.fillRect(L + d + (tw - 2 * d) * g / 4, cy + d / 2 - h * 0.78, 1.5, h * 0.72);
          ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(cx + tw * 0.08, cy + d / 2 - h * 0.42, tw * 0.025, 0, 7); ctx.fill();
        }
      } else {
        box(cx - d / 2, T, cx + d / 2, T + th * 0.25, h, P[2], P[3]); box(cx - d / 2, B - th * 0.25, cx + d / 2, B, h, P[2], P[3]);
        ctx.fillStyle = style === 'arch' ? P[3] : '#a8724a'; ctx.fillRect(cx - d / 2, T + th * 0.25 - h * 0.8, d, th * 0.5);
      }
      return;
    }
    // back segment first, then the sides and the post, the front segment last
    if (N) { box(cx - d / 2, T, cx + d / 2, cy, solid ? h : h * 0.85, P[2], P[3]); tex(cx - d / 2, cx + d / 2, cy, h); }
    var rails = function (x0, x1) {
      if (solid) { box(x0, cy - d / 2, x1, cy + d / 2, h, P[2], P[3]); tex(x0, x1, cy + d / 2, h); return; }
      ctx.fillStyle = P[2]; ctx.fillRect(x0, cy - h * 0.72, x1 - x0, h * 0.11); ctx.fillRect(x0, cy - h * 0.36, x1 - x0, h * 0.11);
      if (style === 'picket') { ctx.fillStyle = P[3]; for (var q = x0 + tw * 0.08; q < x1 - 1; q += tw * 0.16) { ctx.fillRect(q - tw * 0.03, cy - h * 0.9, tw * 0.06, h * 0.9); ctx.beginPath(); ctx.moveTo(q - tw * 0.03, cy - h * 0.9); ctx.lineTo(q, cy - h); ctx.lineTo(q + tw * 0.03, cy - h * 0.9); ctx.fill(); } }
    };
    if (Wt) rails(L, cx);
    if (E) rails(cx, R);
    if (solid) { box(cx - d / 2 - 1, cy - d / 2, cx + d / 2 + 1, cy + d / 2, h * 1.04, P[2], P[3]); tex(cx - d / 2, cx + d / 2, cy + d / 2, h); }
    else box(cx - tw * 0.05, cy - tw * 0.04, cx + tw * 0.05, cy + tw * 0.04, h * 1.1, P[2], P[3]);
    if (!E && !Wt && !N && !S2 && !solid) rails(cx - tw * 0.3, cx + tw * 0.3);
    if (S2) { box(cx - d / 2, cy, cx + d / 2, B, solid ? h : h * 0.85, P[2], P[3]); tex(cx - d / 2, cx + d / 2, B, h); }
  }
  function roundRect(ctx, x, y, w, h, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill(); }
  function shadow(ctx, x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, 7); ctx.fill(); }
  // (an opaque fill colour: Chrome fades colour emoji by the fill colour's alpha)
  function emoji(ctx, e, x, y, size) { ctx.fillStyle = '#000'; ctx.font = Math.round(size) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(e, x, y); }
  function drawBeach(ctx, k, x, y, tw, t) {
    if (k === 'shell') { shadow(ctx, x, y, tw * 0.16); emoji(ctx, '🐚', x, y, tw * 0.36); return; }
    if (k === 'pearl') { var a = 0.5 + 0.5 * Math.sin(t * 3); ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + a * 0.4) + ')'; ctx.beginPath(); ctx.arc(x, y - tw * 0.1, tw * 0.2, 0, 7); ctx.fill(); ctx.fillStyle = '#f5f3ff'; ctx.beginPath(); ctx.arc(x, y - tw * 0.1, tw * 0.09, 0, 7); ctx.fill(); return; }
    if (k === 'stone') { shadow(ctx, x, y, tw * 0.2); ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.ellipse(x, y - tw * 0.06, tw * 0.2, tw * 0.13, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c2c9d0'; ctx.beginPath(); ctx.ellipse(x - tw * 0.05, y - tw * 0.1, tw * 0.08, tw * 0.05, 0, 0, 7); ctx.fill(); return; }
    shadow(ctx, x, y, tw * 0.24); ctx.fillStyle = '#9b7653'; ctx.save(); ctx.translate(x, y - tw * 0.06); ctx.rotate(-0.25); ctx.fillRect(-tw * 0.26, -tw * 0.06, tw * 0.52, tw * 0.12); ctx.fillStyle = '#c49a6c'; ctx.beginPath(); ctx.ellipse(tw * 0.26, 0, tw * 0.03, tw * 0.06, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  function drawThing(ctx, tl, cx, base, tw, th, t, env, sp, season, lights) {
    if (tl.t === 'crop') {
      var c = CROPS[tl.id], pr = cropProg(tl, env, sp);
      if (pr >= 1) { var bob = Math.abs(Math.sin(t * 3 + cx)) * 4; emoji(ctx, c.e, cx, base - bob, tw * 0.55); ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 4 + cx)) + ')'; ctx.beginPath(); ctx.arc(cx + tw * 0.28, base - tw * 0.55, 3, 0, 7); ctx.fill(); }
      else { var hgt = 0.25 + pr * 0.45; ctx.fillStyle = (tl.w || tl.w === 0) ? '#5cb85c' : '#9ccc65'; for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(cx + i * tw * 0.14, base - tw * hgt * 0.5, tw * 0.06, tw * hgt * 0.5, i * 0.4, 0, 7); ctx.fill(); } if (pr > 0.6) { ctx.globalAlpha = 0.85; emoji(ctx, c.e, cx, base - tw * 0.2, tw * 0.28); ctx.globalAlpha = 1; } if (!tl.w && tl.w !== 0) { emoji(ctx, '💧', cx + tw * 0.3, base - tw * 0.4, tw * 0.22); } }
      return;
    }
    if (tl.t === 'tree') {
      var tr = TREES[tl.id], st = treeState(tl, env, sp), sz = st.grown ? 1 : 0.35 + 0.65 * Math.min(1, st.prog);
      shadow(ctx, cx, base, tw * 0.38 * sz);
      if (tr.palm) {
        ctx.strokeStyle = '#8d6e4f'; ctx.lineWidth = tw * 0.09 * sz; ctx.beginPath(); ctx.moveTo(cx, base); ctx.quadraticCurveTo(cx + tw * 0.15 * sz, base - tw * 0.6 * sz, cx + tw * 0.05, base - tw * 1.1 * sz); ctx.stroke();
        ctx.fillStyle = '#2e9d57'; var tx = cx + tw * 0.05, ty = base - tw * 1.1 * sz;
        for (var f = 0; f < 6; f++) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(f * 1.05 + Math.sin(t + f) * 0.05); ctx.beginPath(); ctx.ellipse(tw * 0.28 * sz, 0, tw * 0.3 * sz, tw * 0.07 * sz, 0.3, 0, 7); ctx.fill(); ctx.restore(); }
        if (st.fruit) { emoji(ctx, tr.e, tx - tw * 0.08, ty + tw * 0.18, tw * 0.24); emoji(ctx, tr.e, tx + tw * 0.12, ty + tw * 0.2, tw * 0.24); }
        return;
      }
      ctx.fillStyle = '#8d6e4f'; ctx.fillRect(cx - tw * 0.06 * sz, base - tw * 0.55 * sz, tw * 0.12 * sz, tw * 0.55 * sz);
      var leaf = tr.leaf;
      if (season === 3 && tl.id !== 'cherry') leaf = '#e67e22';
      if (season === 0) leaf = tl.id === 'cherry' ? '#cfd8dc' : '#7a9a7e';
      if (tl.id === 'cherry' && season !== 1) leaf = season === 0 ? '#cfd8dc' : '#66bb6a';
      var cy = base - tw * 0.85 * sz, sway = Math.sin(t * 0.8 + cx) * 2;
      ctx.fillStyle = leaf;
      [[0, 0, 0.42], [-0.26, 0.1, 0.3], [0.26, 0.1, 0.3], [0, -0.22, 0.3]].forEach(function (b) { ctx.beginPath(); ctx.arc(cx + b[0] * tw * sz + sway, cy + b[1] * tw * sz, b[2] * tw * sz, 0, 7); ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(cx - tw * 0.12 * sz + sway, cy - tw * 0.12 * sz, tw * 0.16 * sz, 0, 7); ctx.fill();
      if (season === 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(cx + sway, cy - tw * 0.3 * sz, tw * 0.3 * sz, tw * 0.1 * sz, 0, 0, 7); ctx.fill(); }
      if (st.fruit) [[-0.2, 0.05], [0.18, 0.1], [0.02, -0.15]].forEach(function (q) { emoji(ctx, tr.e, cx + q[0] * tw + sway, cy + q[1] * tw + tw * 0.1, tw * 0.22); });
      return;
    }
    var d = DECOS[tl.id];
    if (!d) return;
    if (d.light) lights.push([cx, base - tw * 0.4]);
    if (d.e) { shadow(ctx, cx, base, tw * 0.32); emoji(ctx, d.e, cx, base, tw * 0.68); return; }
    drawShape(ctx, d.v, cx, base, tw, t, lights);
  }
  function drawShape(ctx, v, cx, b, tw, t, lights) {
    var u = tw;
    ctx.lineCap = 'round';
    if (v === 'fence') { ctx.fillStyle = '#a1785a'; for (var i = -1; i <= 1; i++) ctx.fillRect(cx + i * u * 0.3 - u * 0.04, b - u * 0.42, u * 0.08, u * 0.42); ctx.fillRect(cx - u * 0.42, b - u * 0.34, u * 0.84, u * 0.07); ctx.fillRect(cx - u * 0.42, b - u * 0.18, u * 0.84, u * 0.07); return; }
    if (v === 'bench') { shadow(ctx, cx, b, u * 0.36); ctx.fillStyle = '#8d5a3b'; ctx.fillRect(cx - u * 0.36, b - u * 0.24, u * 0.72, u * 0.08); ctx.fillRect(cx - u * 0.36, b - u * 0.44, u * 0.72, u * 0.08); ctx.fillStyle = '#5d3a26'; ctx.fillRect(cx - u * 0.32, b - u * 0.24, u * 0.06, u * 0.24); ctx.fillRect(cx + u * 0.26, b - u * 0.24, u * 0.06, u * 0.24); ctx.fillRect(cx - u * 0.32, b - u * 0.44, u * 0.05, u * 0.22); ctx.fillRect(cx + u * 0.27, b - u * 0.44, u * 0.05, u * 0.22); return; }
    if (v === 'flowerbed') { ctx.fillStyle = '#a1785a'; ctx.fillRect(cx - u * 0.4, b - u * 0.16, u * 0.8, u * 0.16); ctx.fillStyle = '#6b4a32'; ctx.fillRect(cx - u * 0.36, b - u * 0.2, u * 0.72, u * 0.06); ['🌷', '🌼', '🌷'].forEach(function (f, j) { emoji(ctx, f, cx + (j - 1) * u * 0.26, b - u * 0.14, u * 0.3); }); return; }
    if (v === 'windmill') { shadow(ctx, cx, b, u * 0.3); ctx.fillStyle = '#f1e3c8'; ctx.beginPath(); ctx.moveTo(cx - u * 0.2, b); ctx.lineTo(cx - u * 0.12, b - u * 0.8); ctx.lineTo(cx + u * 0.12, b - u * 0.8); ctx.lineTo(cx + u * 0.2, b); ctx.fill(); ctx.fillStyle = '#c0573e'; ctx.beginPath(); ctx.moveTo(cx - u * 0.16, b - u * 0.8); ctx.lineTo(cx, b - u * 0.98); ctx.lineTo(cx + u * 0.16, b - u * 0.8); ctx.fill(); ctx.save(); ctx.translate(cx, b - u * 0.78); ctx.rotate(t * 1.2); ctx.fillStyle = '#fff'; for (i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-u * 0.04, 0, u * 0.08, u * 0.45); } ctx.fillStyle = '#5d3a26'; ctx.beginPath(); ctx.arc(0, 0, u * 0.05, 0, 7); ctx.fill(); ctx.restore(); return; }
    if (v === 'well') { shadow(ctx, cx, b, u * 0.32); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(cx - u * 0.28, b - u * 0.28, u * 0.56, u * 0.28); ctx.fillStyle = '#2b4d73'; ctx.fillRect(cx - u * 0.22, b - u * 0.3, u * 0.44, u * 0.06); ctx.fillStyle = '#8d5a3b'; ctx.fillRect(cx - u * 0.26, b - u * 0.7, u * 0.05, u * 0.42); ctx.fillRect(cx + u * 0.21, b - u * 0.7, u * 0.05, u * 0.42); ctx.fillStyle = '#c0573e'; ctx.beginPath(); ctx.moveTo(cx - u * 0.36, b - u * 0.66); ctx.lineTo(cx, b - u * 0.9); ctx.lineTo(cx + u * 0.36, b - u * 0.66); ctx.fill(); return; }
    if (v === 'scarecrow') { ctx.fillStyle = '#8d6e4f'; ctx.fillRect(cx - u * 0.03, b - u * 0.7, u * 0.06, u * 0.7); ctx.fillRect(cx - u * 0.3, b - u * 0.5, u * 0.6, u * 0.05); ctx.fillStyle = '#e57373'; ctx.fillRect(cx - u * 0.14, b - u * 0.56, u * 0.28, u * 0.26); ctx.fillStyle = '#f5deb3'; ctx.beginPath(); ctx.arc(cx, b - u * 0.66, u * 0.1, 0, 7); ctx.fill(); ctx.fillStyle = '#c49a3a'; ctx.beginPath(); ctx.ellipse(cx, b - u * 0.74, u * 0.18, u * 0.04, 0, 0, 7); ctx.fill(); return; }
    if (v === 'swing') { ctx.strokeStyle = '#8d5a3b'; ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.moveTo(cx - u * 0.36, b); ctx.lineTo(cx - u * 0.3, b - u * 0.8); ctx.lineTo(cx + u * 0.3, b - u * 0.8); ctx.lineTo(cx + u * 0.36, b); ctx.stroke(); var sw = Math.sin(t * 1.6) * 0.25; ctx.save(); ctx.translate(cx, b - u * 0.8); ctx.rotate(sw); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-u * 0.12, 0); ctx.lineTo(-u * 0.12, u * 0.55); ctx.moveTo(u * 0.12, 0); ctx.lineTo(u * 0.12, u * 0.55); ctx.stroke(); ctx.fillStyle = '#c0573e'; ctx.fillRect(-u * 0.16, u * 0.55, u * 0.32, u * 0.06); ctx.restore(); return; }
    if (v === 'lighthouse') { shadow(ctx, cx, b, u * 0.3); ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.moveTo(cx - u * 0.22, b); ctx.lineTo(cx - u * 0.13, b - u * 1.2); ctx.lineTo(cx + u * 0.13, b - u * 1.2); ctx.lineTo(cx + u * 0.22, b); ctx.fill(); ctx.fillStyle = '#e53935'; [0.25, 0.65].forEach(function (q) { ctx.fillRect(cx - u * (0.2 - q * 0.07), b - u * (q + 0.15), u * (0.4 - q * 0.14), u * 0.15); }); ctx.fillStyle = '#ffd54f'; ctx.fillRect(cx - u * 0.12, b - u * 1.38, u * 0.24, u * 0.18); ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.moveTo(cx - u * 0.17, b - u * 1.38); ctx.lineTo(cx, b - u * 1.55); ctx.lineTo(cx + u * 0.17, b - u * 1.38); ctx.fill(); lights.push([cx, b - u * 1.3]); var beam = (t * 0.6) % (Math.PI * 2); ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff3c4'; ctx.translate(cx, b - u * 1.3); ctx.rotate(beam); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(u * 4, -u * 0.5); ctx.lineTo(u * 4, u * 0.5); ctx.fill(); ctx.restore(); return; }
  }
  // HTML for an item's icon (materials get small drawings; the rest are emoji)
  function iconHtml(k) {
    if (STRUCT[k]) {
      var st = STRUCT[k];
      if (st.layer === 'floor') return '<svg viewBox="0 0 24 24" class="ico"><rect x="3" y="6" width="18" height="13" rx="3" fill="' + st.col + '" stroke="' + st.edge + '" stroke-width="1.5"/></svg>';
      var col = { fence: '#8d5f3e', picket: '#f2f2f2', stone: '#9aa1aa', hedge: '#4c9e45', brick: '#c0604a', gate: '#a8724a', arch: '#9aa1aa' }[st.style];
      return '<svg viewBox="0 0 24 24" class="ico">' + (st.gate ? '<rect x="3" y="7" width="3" height="13" fill="' + col + '"/><rect x="18" y="7" width="3" height="13" fill="' + col + '"/><rect x="6" y="9" width="12" height="11" rx="1" fill="' + (st.style === 'arch' ? 'none' : '#c08a5a') + '" stroke="' + col + '" stroke-width="1.5"/>'
        : st.style === 'fence' || st.style === 'picket' ? '<rect x="4" y="6" width="3" height="14" fill="' + col + '"/><rect x="11" y="6" width="3" height="14" fill="' + col + '"/><rect x="18" y="6" width="3" height="14" fill="' + col + '"/><rect x="2" y="9" width="20" height="2.5" fill="' + col + '"/><rect x="2" y="15" width="20" height="2.5" fill="' + col + '"/>'
        : '<rect x="2" y="8" width="20" height="12" rx="' + (st.style === 'hedge' ? 5 : 1.5) + '" fill="' + col + '"/><rect x="2" y="8" width="20" height="3.5" rx="1.5" fill="#fff" opacity=".3"/>') + '</svg>';
    }
    var info = itemInfo(k);
    if (info.mat || k === 'shell' || k === 'shells') {
      var svg = { wood: '<rect x="3" y="9" width="18" height="7" rx="3" fill="#9b7653" transform="rotate(-15 12 12)"/><ellipse cx="20" cy="10" rx="2" ry="3.5" fill="#d4a373" transform="rotate(-15 12 12)"/>',
        stone: '<ellipse cx="12" cy="14" rx="9" ry="6" fill="#9aa3ad"/><ellipse cx="9" cy="12" rx="3.5" ry="2" fill="#c8ced4"/>',
        pearl: '<circle cx="12" cy="12" r="7" fill="#f5f3ff"/><circle cx="9.5" cy="9.5" r="2.5" fill="#fff"/><circle cx="12" cy="12" r="7" fill="none" stroke="#c4b5fd" stroke-width="1.2"/>' }[k];
      if (svg) return '<svg viewBox="0 0 24 24" class="ico">' + svg + '</svg>';
      return '<span class="ico">🐚</span>';
    }
    if (info.v) return '<span class="ico">' + ({ fence: '🚧', bench: '🛋️', flowerbed: '🌷', windmill: '🌬️', well: '⛲', scarecrow: '🌾', swing: '🎪', lighthouse: '🗼' }[info.v] || '✨') + '</span>';
    return '<span class="ico">' + info.e + '</span>';
  }

  G.IslandCore = {
    COLS: COLS, ROWS: ROWS, CX: CX, CY: CY, STRUCT: STRUCT, build: build, CROPS: CROPS, TREES: TREES, DECOS: DECOS, GUESTS: GUESTS, MATS: MATS, XP_AT: XP_AT, LIGHTHOUSE: LIGHTHOUSE, WEEK_GOALS: WEEK_GOALS, SEASON_N: SEASON_N,
    fresh: fresh, norm: norm, update: update, summary: summary, speed: speed, cropProg: cropProg, treeState: treeState, left: left,
    isLand: isLand, isBeach: isBeach, landCount: landCount, tileAt: tileAt, guestAt: guestAt, beachAt: beachAt, guestOk: guestOk, countWhere: countWhere,
    harvest: harvest, water: water, waterAll: waterAll, plant: plant, place: place, pickUp: pickUp, collect: collect, talk: talk, craft: craft, buy: buy, sell: sell,
    deliver: deliver, weekDone: weekDone, claimWeek: claimWeek, readMail: readMail, visitWater: visitWater, giveGift: giveGift, contribute: contribute,
    eul: eul, iga: iga, has: has, inv: inv, itemInfo: itemInfo, iconHtml: iconHtml, draw: draw, layout: layout, wall: wall, phase: phase, seasonOf: seasonOf, weatherKind: weatherKind, dayKey: dayKey, h32: h32
  };
})(window);
