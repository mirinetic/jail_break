/* Cove home screen.
   Runs inside the Android app (window.CoveNative is the bridge to the TV) and also in a normal desktop
   browser with sample apps, so the look can be tried without a TV:
   arrows move, Enter = OK, Shift+Enter or L = hold OK, Esc = Back, M = Menu. */
(function () {
  'use strict';

  var N = window.CoveNative || null;

  // ---------- catalogue ----------
  var PRESETS = [
    ['blue-ridges', '푸른 능선'], ['golden-hour', '골든 아워'], ['night-peaks', '밤의 봉우리'], ['desert-dunes', '사막 언덕'],
    ['ocean-dusk', '해 질 녘 바다'], ['forest-fog', '안개 숲'], ['mirror-lake', '거울 호수'], ['soft-aurora', '오로라'],
    ['snowy-peaks', '눈 덮인 산'], ['city-night', '도시 야경'], ['sunny-beach', '한낮 해변'], ['autumn-forest', '가을 숲'],
    ['milky-way', '은하수'], ['blossom-dawn', '벚꽃 새벽']
  ];
  // Moving backgrounds drawn on a canvas; "base" puts the effect over a wallpaper.
  var LIVE = [['flow', '흐르는 빛', null], ['stars', '반짝이는 별', null], ['snow', '내리는 눈', 'snowy-peaks']];
  var COLORS = [
    ['ink', '먹색', '#0d1017'], ['navy', '네이비', 'linear-gradient(160deg, #13203d, #070b16)'],
    ['pine', '짙은 초록', 'linear-gradient(160deg, #15302a, #08130f)'], ['wine', '와인', 'linear-gradient(160deg, #3a1424, #12060c)'],
    ['dusk', '노을 그라데이션', 'linear-gradient(160deg, #2b1d4a 0%, #7a3b5e 55%, #e0875a 100%)'],
    ['ocean', '바다 그라데이션', 'linear-gradient(160deg, #06263d 0%, #0f5c73 60%, #2fa3a0 100%)'],
    ['mint', '민트 그라데이션', 'linear-gradient(160deg, #0e2a2a 0%, #1f6b5c 60%, #6fbf93 100%)'],
    ['berry', '베리 그라데이션', 'linear-gradient(160deg, #1d0f2a 0%, #5b1f5e 55%, #c2417a 100%)']
  ];
  var DESIGNS = {
    glass:   { name: 'Glass',   desc: '사진 위 유리 타일',       p: { layout: 'grid',    tiles: 'glass',    labels: true,  font: 'modern', dim: 1, shape: 'rounded', size: 'm', bg: { type: 'preset', id: 'blue-ridges' } } },
    icons:   { name: 'Icons',   desc: '브랜드 컬러 아이콘',       p: { layout: 'icons',   tiles: 'brand',    labels: true,  font: 'modern', dim: 1, shape: 'rounded', size: 'm', bg: { type: 'preset', id: 'golden-hour' } } },
    minimal: { name: 'Minimal', desc: '큰 시계와 로고 한 줄',     p: { layout: 'minimal', tiles: 'clear',    labels: false, font: 'light',  dim: 1, shape: 'rounded', size: 'm', bg: { type: 'preset', id: 'night-peaks' } } },
    theater: { name: 'Theater', desc: '고른 앱을 크게, 앱 색 배경', p: { layout: 'theater', tiles: 'banner',   labels: false, font: 'modern', dim: 1, shape: 'rounded', size: 'm', bg: { type: 'app', id: 'focus' } } },
    column:  { name: 'Column',  desc: '왼쪽 목록, 오른쪽 앱',       p: { layout: 'column',  tiles: 'frosted',  labels: true,  font: 'modern', dim: 2, shape: 'rounded', size: 'm', bg: { type: 'preset', id: 'snowy-peaks' } } },
    dock:    { name: 'Dock',    desc: '큰 시계와 아래 아이콘 독',   p: { layout: 'dock',    tiles: 'clear',    labels: false, font: 'light',  dim: 1, shape: 'rounded', size: 'm', bg: { type: 'live', id: 'flow' } } },
    collage: { name: 'Collage', desc: '크고 작은 타일 배열',       p: { layout: 'collage', tiles: 'gradient', labels: true,  font: 'modern', dim: 2, shape: 'rounded', size: 'm', bg: { type: 'preset', id: 'city-night' } } }
  };
  var DESIGN_IDS = ['glass', 'icons', 'minimal', 'theater', 'column', 'dock', 'collage'];
  var TILES = [['banner', '앱 배너'], ['glass', '글래스'], ['brand', '브랜드 컬러'], ['gradient', '그라데이션'], ['neon', '네온'], ['frosted', '프로스트'],
    ['dark', '다크'], ['mono', '흑백'], ['poster', '포스터'], ['clear', '투명']];
  var SHAPES = [['rounded', '둥근 사각형'], ['circle', '원형'], ['pill', '알약형'], ['square', '각진 모양']];
  var SIZES = [['s', '작게'], ['m', '보통'], ['l', '크게']];
  var FONTS = [['modern', '모던'], ['light', '라이트'], ['classic', '클래식'], ['mono', '모노']];
  var CLOCKS = [['24', '24시간'], ['12', '12시간'], ['off', '숨김']];
  var DIMS = ['없음', '약하게', '보통', '강하게'];
  var DIM_VALUES = [0.05, 0.22, 0.4, 0.58];
  var NIGHT_FROM = 19, NIGHT_TO = 6;
  // Weather: Open-Meteo (free, no key). The TV has no location, so the city is chosen in Appearance.
  var CITIES = [
    ['seoul', '서울', 37.5665, 126.978], ['incheon', '인천', 37.4563, 126.7052], ['suwon', '수원', 37.2636, 127.0286],
    ['chuncheon', '춘천', 37.8813, 127.7298], ['gangneung', '강릉', 37.7519, 128.8761], ['daejeon', '대전', 36.3504, 127.3845],
    ['cheongju', '청주', 36.6424, 127.489], ['daegu', '대구', 35.8714, 128.6014], ['jeonju', '전주', 35.8242, 127.148],
    ['gwangju', '광주', 35.1595, 126.8526], ['busan', '부산', 35.1796, 129.0756], ['ulsan', '울산', 35.5384, 129.3114],
    ['changwon', '창원', 35.2279, 128.6811], ['jeju', '제주', 33.4996, 126.5312]
  ];   // 19:00 – 06:00 uses the night background
  var PROFILE_NAMES = ['나', '가족', '아빠', '엄마', '아이', '손님', '거실', '침실'];
  var PROFILE_COLORS = ['#8fb4ff', '#ffb36b', '#7ee0b0', '#ff8fb1', '#c7a6ff', '#ffd76b'];
  // Apps put on the home screen first when a profile starts with no list yet.
  var FAVOURITES = [
    'com.netflix.ninja', 'com.google.android.youtube.tv', 'com.amazon.amazonvideo.livingroom', 'com.disney.disneyplus',
    'com.wbd.stream', 'com.apple.atve.androidtv.appletv', 'com.spotify.tv.android', 'com.google.android.youtube.tvmusic',
    'com.google.android.videos', 'com.plexapp.android', 'tv.twitch.android.app', 'com.google.android.youtube.tvkids'
  ];
  var CAT_NAMES = ['즐겨찾기', '영화·드라마', '예능', '음악', '키즈', '게임', '스포츠', '뉴스', '유틸리티', '기타'];
  // cats: the home screen's rows, in order. cat: pkg -> row id (an app without one sits in the first row).
  var DEFAULTS = { design: 'glass', clock: '24', shape: 'rounded', size: 'm', apps: null, autoAdd: true, nightBg: null, cats: null, cat: null, recentRow: false, recent: null, locked: null, weather: null, calPreview: true, memoPreview: true };
  Object.keys(DESIGNS.glass.p).forEach(function (k) { DEFAULTS[k] = DESIGNS.glass.p[k]; });

  // ---------- state ----------
  var ROOT = null;       // {v:2, current, known:[pkg], profiles:[{id,name,color,prefs}]}
  var P = {};            // the current profile's appearance settings (an object inside ROOT)
  var APPS = [];         // installed apps [{pkg,label,color,banner}]
  var BYPKG = {};
  var PHOTOS = [];       // photo ids sent from the phone
  var base = 'home';     // 'home' | 'drawer'
  var panel = null;      // {type, i, pkg?, back?}
  var moving = null;     // pkg being moved on the home screen
  var focusEl = null;
  var lastFocus = { home: null, drawer: null };
  var cols = 5;
  var colSel = null;     // Column design: the list item whose apps are shown
  var armed = '';        // name of a row waiting for a second OK (reset, delete)
  var helpOpen = false;
  var update = null;     // {phase, ...result}
  var pinState = null;   // {mode:'check'|'new'|'confirm', title, onOk, entry, first, i}
  var unlockedUntil = 0; // a correct PIN keeps things open for 5 minutes
  var okGuardUntil = 0;  // OK is ignored briefly after a PIN is accepted (a "confirm" press must not open an app)
  var lastOkAt = 0;      // some remotes send two OK signals for one press

  var $ = function (id) { return document.getElementById(id); };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  // ---------- storage ----------
  function withDefaults(p) {
    var o = clone(DEFAULTS);
    Object.keys(p || {}).forEach(function (k) { o[k] = p[k]; });
    if (!Array.isArray(o.cats) || !o.cats.length) o.cats = [{ id: 'c1', name: '' }];
    if (!o.cat || typeof o.cat !== 'object') o.cat = {};
    if (!Array.isArray(o.recent)) o.recent = [];
    if (!Array.isArray(o.locked)) o.locked = [];
    return o;
  }
  function profileById(id) { for (var i = 0; i < ROOT.profiles.length; i++) if (ROOT.profiles[i].id === id) return ROOT.profiles[i]; return null; }
  function current() { return profileById(ROOT.current); }

  function loadPrefs() {
    var raw = '{}';
    try { raw = N ? N.loadPrefs() : (localStorage.getItem('cove.prefs') || '{}'); } catch (e) {}
    var saved = {};
    try { saved = JSON.parse(raw) || {}; } catch (e) {}
    if (saved.v === 2 && Array.isArray(saved.profiles) && saved.profiles.length) ROOT = saved;
    else ROOT = { v: 2, current: 'p1', known: null, profiles: [{ id: 'p1', name: '나', color: PROFILE_COLORS[0], prefs: saved }] }; // first run or old single-profile settings
    ROOT.profiles.forEach(function (pr) {
      pr.prefs = withDefaults(pr.prefs);
      // older versions: "protect this profile's settings" becomes a kids profile
      if (!pr.kind) pr.kind = pr.guard ? 'kids' : 'normal';
      if (pr.guard) { pr.kidsLook = false; delete pr.guard; }
      if (pr.kind === 'kids' && !Array.isArray(pr.allow)) pr.allow = (pr.prefs.apps || []).slice();
    });
    if (!profileById(ROOT.masterId)) ROOT.masterId = ROOT.profiles[0].id;
    if (!current()) ROOT.current = ROOT.profiles[0].id;
    P = current().prefs;
  }

  var saveTimer = null;
  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var s = JSON.stringify(ROOT);
      try { if (N) N.savePrefs(s); else localStorage.setItem('cove.prefs', s); } catch (e) {}
      saveSnapshot();
    }, 250);
  }

  function defaultApps() {
    var first = FAVOURITES.filter(function (p) { return BYPKG[p]; });
    APPS.forEach(function (a) { if (first.indexOf(a.pkg) < 0) first.push(a.pkg); });
    return first.slice(0, 10);
  }

  // Reads the installed apps. Apps installed since last time join the home screen of every profile
  // that has "새 앱 자동 추가" on.
  function loadApps() {
    try { APPS = N ? JSON.parse(N.apps()) : sampleApps(); } catch (e) { APPS = []; }
    BYPKG = {};
    APPS.forEach(function (a) { BYPKG[a.pkg] = a; });
    var pkgs = APPS.map(function (a) { return a.pkg; });
    var changed = false, fresh = [];
    if (Array.isArray(ROOT.known)) {
      fresh = pkgs.filter(function (p) { return ROOT.known.indexOf(p) < 0; });
      fresh.forEach(function (p) {
        ROOT.profiles.forEach(function (pr) {
          if (pr.prefs.autoAdd !== false && Array.isArray(pr.prefs.apps) && pr.prefs.apps.indexOf(p) < 0) { pr.prefs.apps.push(p); changed = true; }
        });
      });
    }
    if (!Array.isArray(ROOT.known) || ROOT.known.join() !== pkgs.join()) { ROOT.known = pkgs; changed = true; }
    ROOT.profiles.forEach(function (pr) { if (!Array.isArray(pr.prefs.apps)) { pr.prefs.apps = defaultApps(); changed = true; } });
    if (changed) savePrefs();
    if (fresh.length && P.autoAdd !== false) toast('새 앱을 홈에 추가했어요: ' + fresh.map(function (p) { return BYPKG[p].label; }).join(', '));
  }

  function loadPhotos() {
    try { PHOTOS = N ? JSON.parse(N.photos()) : []; } catch (e) { PHOTOS = []; }
    ROOT.profiles.forEach(function (pr) {
      var p = pr.prefs;
      if (p.bg && p.bg.type === 'photo' && PHOTOS.indexOf(p.bg.id) < 0) p.bg = clone(DESIGNS[p.design].p.bg);
      if (p.nightBg && p.nightBg.type === 'photo' && PHOTOS.indexOf(p.nightBg.id) < 0) p.nightBg = null;
    });
  }

  function kidsAllows(pkg) { return !isKids() || (current().allow || []).indexOf(pkg) >= 0; }
  function visibleApps() { return (P.apps || []).filter(function (p) { return BYPKG[p] && kidsAllows(p); }); }
  function catById(id) { for (var i = 0; i < P.cats.length; i++) if (P.cats[i].id === id) return P.cats[i]; return null; }
  function catOf(pkg) { return catById(P.cat[pkg]) ? P.cat[pkg] : P.cats[0].id; }
  function appsIn(id) { return visibleApps().filter(function (p) { return catOf(p) === id; }); }
  function recentApps() { return P.recentRow ? P.recent.filter(function (p) { return BYPKG[p]; }).slice(0, 8) : []; }
  // Rows with titles. Minimal always stays one plain row of logos.
  function hasRows() { return P.cats.length > 1 || !!P.cats[0].name || recentApps().length > 0; }
  function sectioned() { return ['grid', 'icons', 'theater', 'collage'].indexOf(P.layout) >= 0 && hasRows(); }
  // Minimal and Dock keep one row of apps; with categories they get tabs above it.
  function tabsMode() { return (P.layout === 'minimal' || P.layout === 'dock') && hasRows(); }
  // Designs that show apps in a single horizontal row
  function oneRow() { return P.layout === 'minimal' || P.layout === 'dock' || (P.layout === 'theater' && !sectioned()); }
  function iconUrl(a) { return N ? '/icon/' + encodeURIComponent(a.pkg) : a.icon; }
  function bannerUrl(a) { return N ? '/banner/' + encodeURIComponent(a.pkg) : a.bannerUrl; }
  function sortedApps() { return APPS.slice().sort(function (a, b) { return a.label.localeCompare(b.label, 'ko'); }); }

  // ---------- backgrounds ----------
  function bgList() {
    var list = PRESETS.map(function (p) { return { type: 'preset', id: p[0] }; });
    LIVE.forEach(function (l) { list.push({ type: 'live', id: l[0] }); });
    COLORS.forEach(function (c) { list.push({ type: 'color', id: c[0] }); });
    list.push({ type: 'app', id: 'focus' });
    PHOTOS.forEach(function (id) { list.push({ type: 'photo', id: id }); });
    return list;
  }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i]; return null; }
  function bgUrl(b) {
    if (b.type === 'photo') return '/photo/' + b.id + '.jpg';
    if (b.type === 'live') { var l = find(LIVE, b.id); return l && l[2] ? 'bg/' + l[2] + '.jpg' : ''; }
    if (b.type === 'preset') return 'bg/' + b.id + '.jpg';
    return '';
  }
  function bgName(b) {
    if (!b) return '사용 안 함';
    if (b.type === 'photo') return '내 사진 ' + (PHOTOS.indexOf(b.id) + 1);
    if (b.type === 'app') return '고른 앱 색';
    var e = find(b.type === 'live' ? LIVE : b.type === 'color' ? COLORS : PRESETS, b.id);
    return e ? e[1] : b.id;
  }
  // Small preview for the Appearance panel.
  function bgThumb(b) {
    if (!b) return '';
    if (b.type === 'color') return '<span class="thumb" style="background:' + esc(find(COLORS, b.id)[2]) + '"></span>';
    if (b.type === 'live' && !bgUrl(b)) return '<span class="thumb live-' + esc(b.id) + '"></span>';
    if (b.type === 'app') return '<span class="thumb live-app"></span>';
    return '<img class="thumb" src="' + bgUrl(b) + '" alt="">';
  }
  function validBg(b) {
    if (!b) return false;
    if (b.type === 'photo') return PHOTOS.indexOf(b.id) >= 0;
    if (b.type === 'app') return true;
    return !!find(b.type === 'live' ? LIVE : b.type === 'color' ? COLORS : PRESETS, b.id);
  }
  function sameBg(a, b) { return !!a && !!b && a.type === b.type && a.id === b.id; }
  function isNight() { var h = new Date().getHours(); return h >= NIGHT_FROM || h < NIGHT_TO; }
  function activeBg() { return (P.nightBg && isNight()) ? P.nightBg : P.bg; }
  function stepBg(cur, d, allowNone) {
    var list = bgList();
    if (allowNone) list.unshift(null);
    var i = -1;
    list.forEach(function (b, k) { if ((b === null && !cur) || sameBg(b, cur)) i = k; });
    return list[(i + d + list.length) % list.length];
  }

  var shownBg = '';
  function showBg() {
    var b = activeBg();
    if (!validBg(b)) b = DEFAULTS.bg;
    var kind = b.type === 'photo' ? 'preset' : b.type;
    var url = bgUrl(b);
    if (kind === 'live') kind = url ? 'overlay' : 'live';
    $('bg').setAttribute('data-kind', kind);
    if (kind === 'live' || kind === 'overlay') fx.start(b.id); else fx.stop();
    if (kind === 'color') { $('bgFill').style.background = find(COLORS, b.id)[2]; return; }
    if (kind === 'app') { appBg(true); return; }
    if (kind === 'live') return;
    if (url === shownBg) return;
    shownBg = url;
    var a = $('bgA'), b = $('bgB');
    var next = a.classList.contains('on') ? b : a, prev = next === a ? b : a;
    next.onload = function () { next.classList.add('on'); prev.classList.remove('on'); };
    next.onerror = function () { if (!sameBg(P.bg, DEFAULTS.bg)) { P.bg = clone(DEFAULTS.bg); P.nightBg = null; render(); } };
    next.src = url;
  }

  // Background that takes the colour (and blurred banner) of the focused app.
  var appBgPkg = null;
  function appBg(force) {
    if ($('bg').getAttribute('data-kind') !== 'app') return;
    var pkg = (focusEl && focusEl.getAttribute('data-pkg')) || lastFocus.home || visibleApps()[0];
    if (!pkg || !BYPKG[pkg] || (pkg === appBgPkg && !force)) return;
    appBgPkg = pkg;
    var a = BYPKG[pkg], img = $('bgAppImg');
    $('bgApp').style.setProperty('--appc', a.color || '#1a1f2b');
    if (a.banner) { img.src = bannerUrl(a); img.style.opacity = 1; } else { img.style.opacity = 0; }
  }

  // Moving backgrounds. Drawn small and scaled up, at most ~30 frames a second, and paused when hidden.
  var fx = {
    id: null, raf: 0, last: 0,
    start: function (id) {
      if (this.id === id) return;
      this.stop();
      this.id = id;
      var c = $('bgFx');
      var hi = id !== 'flow';
      c.width = hi ? 960 : 320; c.height = hi ? 540 : 180;
      this.ctx = c.getContext('2d');
      this.w = c.width; this.h = c.height;
      this.init(id);
      var self = this;
      var loop = function (t) {
        self.raf = requestAnimationFrame(loop);
        if (document.hidden || t - self.last < 33) return;
        self.last = t;
        self.draw(t / 1000);
      };
      this.raf = requestAnimationFrame(loop);
    },
    stop: function () { cancelAnimationFrame(this.raf); this.id = null; },
    init: function (id) {
      var w = this.w, h = this.h, i;
      this.p = [];
      if (id === 'stars') {
        for (i = 0; i < 420; i++) this.p.push({ x: Math.random() * w, y: Math.random() * h * 0.9, r: Math.random() < 0.92 ? 0.8 : 1.6, ph: Math.random() * 6.3, sp: 0.6 + Math.random() * 2.2 });
        this.shoot = null;
      } else if (id === 'snow') {
        for (i = 0; i < 260; i++) this.p.push({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 2.6, vy: 18 + Math.random() * 42, ph: Math.random() * 6.3 });
      }
      this.prev = 0;
    },
    draw: function (t) {
      var g = this.ctx, w = this.w, h = this.h, i, p;
      var dt = this.prev ? Math.min(0.1, t - this.prev) : 0.033;
      this.prev = t;
      if (this.id === 'flow') {
        g.fillStyle = '#0b1020'; g.fillRect(0, 0, w, h);
        var blobs = [['rgba(64,140,255,.55)', 0.13, 0], ['rgba(255,90,170,.45)', 0.09, 2], ['rgba(60,220,190,.45)', 0.11, 4], ['rgba(150,110,255,.5)', 0.07, 1]];
        g.globalCompositeOperation = 'lighter';
        blobs.forEach(function (b) {
          var x = w * (0.5 + 0.38 * Math.sin(t * b[1] + b[2])), y = h * (0.5 + 0.36 * Math.cos(t * b[1] * 1.3 + b[2] * 1.7));
          var gr = g.createRadialGradient(x, y, 0, x, y, w * 0.55);
          gr.addColorStop(0, b[0]); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
        });
        g.globalCompositeOperation = 'source-over';
      } else if (this.id === 'stars') {
        if (!this.sky) { this.sky = g.createLinearGradient(0, 0, 0, h); this.sky.addColorStop(0, '#02030a'); this.sky.addColorStop(0.7, '#0b1233'); this.sky.addColorStop(1, '#1b1d45'); }
        g.fillStyle = this.sky; g.fillRect(0, 0, w, h);
        for (i = 0; i < this.p.length; i++) {
          p = this.p[i];
          g.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph));
          g.fillStyle = '#fff'; g.fillRect(p.x, p.y, p.r, p.r);
        }
        g.globalAlpha = 1;
        if (!this.shoot && Math.random() < 0.004) this.shoot = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.3, life: 0 };
        if (this.shoot) {
          var s = this.shoot; s.life += dt;
          var len = 120, k = s.life * 600;
          var grd = g.createLinearGradient(s.x + k, s.y + k * 0.4, s.x + k - len, s.y + (k - len) * 0.4);
          grd.addColorStop(0, 'rgba(255,255,255,' + Math.max(0, 1 - s.life * 1.4) + ')'); grd.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = grd; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x + k, s.y + k * 0.4); g.lineTo(s.x + k - len, s.y + (k - len) * 0.4); g.stroke();
          if (s.life > 0.8) this.shoot = null;
        }
      } else if (this.id === 'snow') {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,.85)';
        for (i = 0; i < this.p.length; i++) {
          p = this.p[i];
          p.y += p.vy * dt; p.x += Math.sin(t * 0.8 + p.ph) * 12 * dt;
          if (p.y > h + 4) { p.y = -4; p.x = Math.random() * w; }
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
        }
      }
    }
  };

  // ---------- weather ----------
  var wx = { city: null, at: 0, data: null, busy: false };
  function cityOf(id) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === id) return CITIES[i]; return null; }
  function wxText(code) {
    if (code === 0) return '맑음';
    if (code === 1) return '대체로 맑음';
    if (code === 2) return '구름 조금';
    if (code === 3) return '흐림';
    if (code === 45 || code === 48) return '안개';
    if (code >= 51 && code <= 57) return '이슬비';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return code >= 80 ? '소나기' : '비';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '눈';
    if (code >= 95) return '뇌우';
    return '';
  }
  function wxIcon(code, day) {
    var sun = '<circle cx="12" cy="12" r="4.2" fill="#ffd76b"/><g stroke="#ffd76b" stroke-width="1.6" stroke-linecap="round"><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"/></g>';
    var moon = '<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5Z" fill="#dfe6ff"/>';
    var cloud = function (y, c) { return '<path d="M7 ' + (17 + y) + 'h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 ' + (17 + y) + 'Z" fill="' + (c || '#e8edf7') + '"/>'; };
    var drops = '<g stroke="#8fc1ff" stroke-width="1.6" stroke-linecap="round"><path d="M9 19.5l-1 2.5M13 19.5l-1 2.5M17 19.5l-1 2.5"/></g>';
    var flakes = '<g fill="#fff"><circle cx="8.5" cy="21" r="1.1"/><circle cx="12.5" cy="22" r="1.1"/><circle cx="16.5" cy="21" r="1.1"/></g>';
    var body;
    if (code <= 1) body = day ? sun : moon;
    else if (code === 2) body = '<g transform="translate(-3,-4) scale(.8)">' + (day ? sun : moon) + '</g>' + cloud(1);
    else if (code === 3) body = cloud(0, '#cfd6e4');
    else if (code === 45 || code === 48) body = '<g stroke="#dfe4ee" stroke-width="1.8" stroke-linecap="round"><path d="M4 9h16M3 13h18M5 17h14"/></g>';
    else if ((code >= 71 && code <= 77) || code === 85 || code === 86) body = cloud(-3) + flakes;
    else if (code >= 95) body = cloud(-3, '#aeb7c8') + '<path d="M12.5 15l-2.5 4h3l-2 4" fill="none" stroke="#ffd76b" stroke-width="1.6" stroke-linejoin="round"/>';
    else body = cloud(-3, '#cfd6e4') + drops;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }
  function showWeather() {
    var el = $('weather'), c = cityOf(P.weather);
    if (!c || !wx.data || wx.city !== P.weather) { el.hidden = true; return; }
    var cur = wx.data.current || {}, day = wx.data.daily || {};
    var hi = day.temperature_2m_max && day.temperature_2m_max[0], lo = day.temperature_2m_min && day.temperature_2m_min[0];
    el.innerHTML = wxIcon(cur.weather_code, cur.is_day !== 0) + '<b>' + Math.round(cur.temperature_2m) + '°</b>' +
      '<span>' + esc(c[1]) + ' · ' + wxText(cur.weather_code) + (hi !== undefined ? ' · 최고 ' + Math.round(hi) + '° 최저 ' + Math.round(lo) + '°' : '') + '</span>';
    el.hidden = false;
  }
  // Fetches at most every 30 minutes (or when the city changes).
  function refreshWeather(force) {
    var c = cityOf(P.weather);
    if (!c) { showWeather(); return; }
    var fresh = wx.city === c[0] && Date.now() - wx.at < 30 * 60 * 1000;
    if ((fresh && !force) || wx.busy) { showWeather(); return; }
    wx.busy = true;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + c[2] + '&longitude=' + c[3] +
      '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      wx = { city: c[0], at: Date.now(), data: d, busy: false };
      showWeather();
    }).catch(function () {
      wx.busy = false;
      if (wx.city !== c[0]) { wx.at = Date.now(); wx.city = null; }   // try again in 30 minutes
      showWeather();
    });
  }

  // ---------- clock ----------
  function tick() {
    var d = new Date();
    var h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2);
    var t = $('time');
    if (P.clock === '12') t.innerHTML = ((h % 12) || 12) + ':' + m + '<small>' + (h < 12 ? '오전' : '오후') + '</small>';
    else t.textContent = ('0' + h).slice(-2) + ':' + m;
    $('date').textContent = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
    showBg(); // switches to/from the night background on time
    refreshWeather(false);
    showNextEvent();
    showMemoLine();
    if (ROOT && ROOT.cal && ROOT.cal.subs && ROOT.cal.subs.length) syncCalendars(false);
    if (ROOT) idleCheck();
  }

  // ---------- render ----------
  function render() {
    var home = $('home');
    document.body.setAttribute('data-font', P.font);
    home.setAttribute('data-layout', P.layout);
    home.setAttribute('data-tiles', P.tiles);
    home.setAttribute('data-shape', P.shape);
    home.setAttribute('data-size', P.size);
    home.setAttribute('data-labels', P.labels ? 'on' : 'off');
    home.setAttribute('data-clock', P.clock === 'off' ? 'off' : 'on');
    document.documentElement.style.setProperty('--dim', DIM_VALUES[P.dim] || 0.22);
    var pr = current();
    $('pName').textContent = pr.name;
    $('pDot').style.setProperty('--pc', pr.color);
    tick();
    renderTiles();
    $('hero').hidden = P.layout !== 'theater';
    updateHero();
    if (base === 'drawer') renderDrawer();
    if (panel) renderPanel();
  }

  function tileHtml(a, opts) {
    var useBanner = opts.banner && a.banner && !opts.round;
    // A tile filled with colour takes the icon's own background colour, and shows only the logo layer of
    // adaptive icons, so tile and icon read as one surface in any shape.
    var filled = !useBanner && (opts.forceBrand || opts.banner || ['brand', 'gradient', 'poster'].indexOf(opts.style || P.tiles) >= 0);
    var glyph = filled && a.glyph && N;
    var inner = useBanner
      ? '<img class="banner" src="' + bannerUrl(a) + '" alt="">'
      : '<img class="icon' + (glyph ? ' glyph' : '') + '" src="' + (glyph ? '/glyph/' + encodeURIComponent(a.pkg) : iconUrl(a)) + '" alt="" onerror="this.outerHTML=\'<span class=initial>' + esc(a.label.charAt(0)) + '</span>\'">' +
        '<span class="pname">' + esc(a.label) + '</span>';
    var cls = (opts.forceBrand || (opts.banner && !a.banner) ? ' brand' : '') + (filled ? ' filled' : '') + (useBanner ? ' hasbanner' : '');
    var ibg = a.iconBg || a.color || '#2a2f3a';
    return '<div class="tile focusable' + (moving === a.pkg && !opts.recent ? ' moving' : '') + '" data-pkg="' + esc(a.pkg) + '"' + (opts.recent ? ' data-recent="1"' : '') + '>' +
      '<div class="face' + cls + '" style="--brand:' + esc(a.color || '#2a2f3a') + ';--ibg:' + esc(ibg) + '">' + inner +
      (P.locked.indexOf(a.pkg) >= 0 && hasPin() ? '<span class="lock"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#fff" stroke-width="2"/><rect x="5" y="10" width="14" height="11" rx="2" fill="#fff"/></svg></span>' : '') + '</div>' +
      '<div class="label">' + esc(a.label) + '</div></div>';
  }

  function renderTiles() {
    var ids = visibleApps();
    var n = ids.length;
    cols = (n <= 8 ? 4 : n <= 10 ? 5 : 6) + (P.size === 's' ? 1 : P.size === 'l' ? -1 : 0) + (P.tiles === 'poster' ? 2 : 0) + (P.shape === 'circle' ? 1 : 0);
    cols = Math.max(3, Math.min(9, cols));
    var box = $('tiles');
    var sec = sectioned() || P.layout === 'theater';
    box.classList.toggle('sections', sec);
    box.style.setProperty('--cols', cols);
    if (P.layout === 'dock') {
      // Icon size that lets every icon, plus the grown focused one and its neighbours, fit on screen.
      var dk = (82 - Math.max(0, n - 1) * 1.2) / (n + 0.9);
      box.style.setProperty('--dk', Math.max(3, Math.min(6.4 * (P.size === 's' ? 0.82 : P.size === 'l' ? 1.2 : 1), dk)).toFixed(2) + 'rem');
    }
    var banner = P.tiles === 'banner', round = P.shape === 'circle' || P.layout === 'dock';
    var tabs = $('rtabs');
    tabs.hidden = !tabsMode();
    if (tabsMode()) {
      var titems = colItems().filter(function (x) { return x[0] !== 'all'; });
      if (!colSel || !titems.some(function (x) { return x[0] === colSel; })) colSel = titems[0][0];
      tabs.innerHTML = titems.map(function (x) {
        return '<div class="rtab focusable' + (x[0] === colSel ? ' cur' : '') + '" data-col="' + esc(x[0]) + '">' + esc(x[1]) + '</div>';
      }).join('');
      ids = colApps(colSel);
      n = ids.length;
    }
    if (P.layout === 'dock') {
      var dk2 = (82 - Math.max(0, n - 1) * 1.2) / (n + 0.9);
      box.style.setProperty('--dk', Math.max(3, Math.min(6.4 * (P.size === 's' ? 0.82 : P.size === 'l' ? 1.2 : 1), dk2)).toFixed(2) + 'rem');
    }
    if (P.layout === 'column') {
      renderColumn(box, banner, round);
    } else if (P.layout === 'theater' && !sectioned()) {
      box.innerHTML = '<div class="cat"><div class="strip">' + ids.map(function (pkg) { return tileHtml(BYPKG[pkg], { banner: banner, round: round }); }).join('') + '</div></div>';
    } else if (!sec) {
      box.innerHTML = ids.length ? ids.map(function (pkg) { return tileHtml(BYPKG[pkg], { banner: banner, round: round, recent: colSel === 'recent' && tabsMode() }); }).join('')
        : (tabsMode() ? '<div class="hole">이 줄은 비어 있어요. 앱 메뉴의 "줄"로 앱을 넣을 수 있어요</div>' : '');
    } else {
      var html = '', rec = recentApps();
      var section = function (id, title, list, recent) {
        return '<div class="cat" data-cat="' + esc(id) + '"><h3>' + esc(title) + '</h3><div class="strip">' +
          (list.length ? list.map(function (p) { return tileHtml(BYPKG[p], { banner: banner, round: round, recent: recent }); }).join('')
            : '<div class="hole">비어 있어요. 앱 메뉴에서 이 줄로 옮길 수 있어요</div>') + '</div></div>';
      };
      if (rec.length) html += section('recent', '최근 실행', rec, true);
      P.cats.forEach(function (c) { html += section(c.id, c.name || '내 앱', appsIn(c.id), false); });
      box.innerHTML = html;
    }
    $('empty').hidden = visibleApps().length > 0;
    if (base === 'home' && !panel) restoreFocus('home');
  }

  // Minimal / Dock with tabs: show another tab's apps without moving the focus off the tab.
  function fillRow() {
    var keep = focusEl;
    var saved = base;
    base = 'tabs';           // renderTiles must not steal the focus from the tab
    renderTiles();
    base = saved;
    if (keep && document.body.contains(keep)) setFocus(keep);
    else { var t = document.querySelector('.rtab[data-col="' + cssEsc(colSel) + '"]'); if (t) setFocus(t); }
  }

  // Column design: a list of rows on the left, the chosen row's apps on the right.
  function colItems() {
    var items = [];
    if (recentApps().length) items.push(['recent', '최근 실행']);
    P.cats.forEach(function (c) { items.push([c.id, c.name || '내 앱']); });
    items.push(['all', '모든 앱']);
    return items;
  }
  function colApps(id) { return id === 'recent' ? recentApps() : appsIn(id); }
  function renderColumn(box, banner, round) {
    var items = colItems();
    if (!colSel || !items.some(function (x) { return x[0] === colSel && x[0] !== 'all'; })) colSel = items[0][0] === 'all' ? P.cats[0].id : items[0][0];
    box.innerHTML = '<nav class="colnav">' + items.map(function (x) {
      return '<div class="colitem focusable' + (x[0] === colSel ? ' cur' : '') + '" data-col="' + esc(x[0]) + '">' + esc(x[1]) +
        (x[0] === 'all' ? '' : '<span>' + colApps(x[0]).length + '</span>') + '</div>';
    }).join('') + '</nav><div class="colgrid" id="colGrid"></div>';
    fillColumn(banner, round);
  }
  function fillColumn(banner, round) {
    if (banner === undefined) { banner = P.tiles === 'banner'; round = P.shape === 'circle'; }
    var list = colApps(colSel);
    $('colGrid').innerHTML = list.length
      ? list.map(function (p) { return tileHtml(BYPKG[p], { banner: banner, round: round, recent: colSel === 'recent' }); }).join('')
      : '<div class="hole">이 목록은 비어 있어요. 앱 메뉴의 "줄"로 앱을 넣을 수 있어요</div>';
    Array.prototype.forEach.call(document.querySelectorAll('.colitem'), function (e) { e.classList.toggle('cur', e.getAttribute('data-col') === colSel); });
  }

  // Theater design: the focused app, large.
  function updateHero() {
    if (P.layout !== 'theater') return;
    var pkg = (focusEl && focusEl.getAttribute('data-pkg')) || lastFocus.home || visibleApps()[0];
    var a = pkg && BYPKG[pkg];
    if (!a) { $('hero').hidden = true; return; }
    $('hero').hidden = false;
    $('heroArt').style.setProperty('--brand', a.color || '#2a2f3a');
    $('heroArt').innerHTML = a.banner ? '<img src="' + bannerUrl(a) + '" alt="">' : '<img class="hicon" src="' + iconUrl(a) + '" alt="">';
    $('heroName').textContent = a.label;
    var c = catById(catOf(pkg));
    $('heroSub').textContent = (P.cats.length > 1 && c && c.name ? c.name + ' · ' : '') + 'OK로 실행 · 길게 누르면 메뉴';
  }

  function renderDrawer() {
    var list = sortedApps().filter(function (a) { return kidsAllows(a.pkg); });
    $('dCount').textContent = list.length + '개';
    $('dGrid').innerHTML = list.map(function (a) { return tileHtml(a, { banner: true, forceBrand: !a.banner }); }).join('');
    if (!panel) restoreFocus('drawer');
  }

  function restoreFocus(where) {
    var root = where === 'drawer' ? $('dGrid') : $('tiles');
    var pick = function (pkg) { return pkg && (root.querySelector('[data-pkg="' + cssEsc(pkg) + '"]:not([data-recent])') || root.querySelector('[data-pkg="' + cssEsc(pkg) + '"]')); };
    var keep = pick(lastFocus[where]);
    if (moving) keep = pick(moving) || keep;
    setFocus(keep || root.querySelector('.tile') || (where === 'home' ? document.querySelector('.qbtn[data-act="drawer"]') : null));
  }

  // ---------- focus & navigation ----------
  function focusables() {
    var sel = base === 'drawer' ? '#drawer .focusable' : '#home .focusable';
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function setFocus(el) {
    if (focusEl) focusEl.classList.remove('focus');
    focusEl = el || null;
    if (!focusEl) return;
    focusEl.classList.add('focus');
    var pkg = focusEl.getAttribute('data-pkg');
    if (pkg) lastFocus[base] = pkg;
    keepVisible(focusEl);
    appBg(false);
    updateHero();
    // Column design: moving onto a list item shows its apps
    var col = focusEl.getAttribute('data-col');
    if (col && col !== 'all' && col !== colSel) {
      colSel = col;
      if (P.layout === 'column') fillColumn(); else fillRow();
    }
    // Dock design: neighbours of the focused icon grow a little
    if (P.layout === 'dock') {
      Array.prototype.forEach.call(document.querySelectorAll('#tiles .near'), function (e) { e.classList.remove('near'); });
      if (focusEl.classList.contains('tile')) {
        if (focusEl.previousElementSibling) focusEl.previousElementSibling.classList.add('near');
        if (focusEl.nextElementSibling) focusEl.nextElementSibling.classList.add('near');
      }
    }
  }

  function keepVisible(el) {
    if (base === 'drawer') {
      var g = $('dGrid'), r = el.getBoundingClientRect(), gr = g.getBoundingClientRect();
      if (r.top < gr.top + 20) g.scrollTop -= (gr.top + 20 - r.top);
      else if (r.bottom > gr.bottom - 20) g.scrollTop += (r.bottom - gr.bottom + 20);
    } else if (el.classList.contains('tile') && el.parentNode.classList.contains('strip')) {
      var strip = el.parentNode, sr = strip.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (er.left < sr.left + 30) strip.scrollLeft -= (sr.left + 30 - er.left);
      else if (er.right > sr.right - 30) strip.scrollLeft += (er.right - sr.right + 30);
      var tl = $('tiles'), tlr = tl.getBoundingClientRect(), cr = strip.parentNode.getBoundingClientRect();
      // whole rows: a row that doesn't fit is brought to the top edge; a row taller than the area follows the tile
      if (cr.height > tlr.height - 20) {
        if (er.top < tlr.top + 40) tl.scrollTop -= (tlr.top + 40 - er.top);
        else if (er.bottom > tlr.bottom - 20) tl.scrollTop += (er.bottom - tlr.bottom + 20);
      } else {
        // keep the row clear of the faded top edge (the box's top padding)
        var padTop = parseFloat(getComputedStyle(tl).paddingTop) || 0;
        if (cr.top < tlr.top + padTop || cr.bottom > tlr.bottom) tl.scrollTop += (cr.top - (tlr.top + padTop));
      }
    } else if (el.classList.contains('tile') && el.parentNode.id === 'colGrid') {
      var cg = el.parentNode, cgr = cg.getBoundingClientRect(), ce = el.getBoundingClientRect();
      if (ce.top < cgr.top + 10) cg.scrollTop -= (cgr.top + 10 - ce.top);
      else if (ce.bottom > cgr.bottom - 10) cg.scrollTop += (ce.bottom - cgr.bottom + 10);
    } else if (el.classList.contains('tile') && el.parentNode.id === 'tiles' && P.layout !== 'minimal' && P.layout !== 'dock') {
      var box = $('tiles'), br = box.getBoundingClientRect(), tr0 = el.getBoundingClientRect();
      if (tr0.top < br.top + 10) box.scrollTop -= (br.top + 10 - tr0.top);
      else if (tr0.bottom > br.bottom - 10) box.scrollTop += (tr0.bottom - br.bottom + 10);
    } else if (P.layout === 'minimal' && el.classList.contains('tile')) {
      var row = $('tiles'), rr = row.getBoundingClientRect(), tr = el.getBoundingClientRect();
      if (tr.left < rr.left + 40) row.scrollLeft -= (rr.left + 40 - tr.left);
      else if (tr.right > rr.right - 40) row.scrollLeft += (tr.right - rr.right + 40);
    }
  }

  // Moves focus to the nearest element in the pressed direction.
  function move(dir) {
    var els = focusables();
    if (!focusEl || els.indexOf(focusEl) < 0) { setFocus(els.filter(function (e) { return e.classList.contains('tile'); })[0] || els[0]); return; }
    var a = focusEl.getBoundingClientRect();
    var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, bestScore = Infinity;
    els.forEach(function (el) {
      if (el === focusEl) return;
      var b = el.getBoundingClientRect();
      var bx = b.left + b.width / 2, by = b.top + b.height / 2, main, side;
      if (dir === 'left') { main = ax - bx; side = Math.abs(ay - by); }
      else if (dir === 'right') { main = bx - ax; side = Math.abs(ay - by); }
      else if (dir === 'up') { main = ay - by; side = Math.abs(ax - bx); }
      else { main = by - ay; side = Math.abs(ax - bx); }
      if (main <= 4) return;
      var score = main + side * 2.4;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) setFocus(best);
  }

  // ---------- actions ----------
  function launch(pkg, force) {
    if (!force && !kidsAllows(pkg) && !isAdmin()) {
      var lbl = BYPKG[pkg] ? BYPKG[pkg].label : pkg;
      if (hasPin()) openPin({ mode: 'check', title: '"' + lbl + '"은(는) 허용되지 않은 앱이에요', onOk: function () { launch(pkg, true); } });
      else toast('"' + lbl + '"은(는) 이 프로필에서 열 수 없어요');
      return;
    }
    if (!force && P.locked.indexOf(pkg) >= 0 && hasPin() && !unlocked()) {
      openPin({ mode: 'check', title: '"' + (BYPKG[pkg] ? BYPKG[pkg].label : pkg) + '" 열기', onOk: function () { launch(pkg); } });
      return;
    }
    var a = BYPKG[pkg];
    P.recent = [pkg].concat(P.recent.filter(function (x) { return x !== pkg; })).slice(0, 12);
    savePrefs();
    if (N) { if (!N.launch(pkg)) toast('앱을 열 수 없어요'); }
    else toast((a ? a.label : pkg) + ' 실행 (미리보기에서는 실제로 열리지 않아요)');
  }

  function set(changes) {
    var appKeys = ['apps', 'cats', 'cat', 'autoAdd', 'recentRow'];
    var kind = Object.keys(changes).some(function (k) { return appKeys.indexOf(k) >= 0; }) ? 'apps' : 'look';
    if (blocked(kind, '설정 바꾸기', function () { set(changes); })) return;
    Object.keys(changes).forEach(function (k) { P[k] = changes[k]; });
    armed = '';
    savePrefs();
    render();
  }
  function applyDesign(id) { var p = clone(DESIGNS[id].p); p.design = id; set(p); }
  function onHome(pkg) { return visibleApps().indexOf(pkg) >= 0; }
  function addToHome(pkg) { var l = visibleApps(); if (l.indexOf(pkg) < 0) l.push(pkg); set({ apps: l }); }
  function removeFromHome(pkg) { var l = visibleApps(), i = l.indexOf(pkg); if (i >= 0) l.splice(i, 1); set({ apps: l }); }

  function openDrawer() {
    closePanelQuiet();
    base = 'drawer';
    $('drawer').hidden = false;
    renderDrawer();
  }
  function closeDrawer() {
    base = 'home';
    $('drawer').hidden = true;
    restoreFocus('home');
  }

  function setCat(pkg, id) { if (blocked('apps', '줄 바꾸기', function () { setCat(pkg, id); })) return; P.cat[pkg] = id; savePrefs(); render(); }
  function addCat(name) {
    if (blocked('apps', '줄 추가', function () { addCat(name); })) return null;
    if (P.cats.length === 1 && !P.cats[0].name) P.cats[0].name = '즐겨찾기';
    var used = P.cats.map(function (c) { return c.name; });
    name = name || CAT_NAMES.filter(function (n) { return used.indexOf(n) < 0; })[0] || ('줄 ' + (P.cats.length + 1));
    var c = { id: 'c' + Date.now().toString(36), name: name };
    P.cats.push(c);
    savePrefs(); render();
    toast('"' + name + '" 줄을 만들었어요. 앱 메뉴나 위치 옮기기로 앱을 넣어 주세요');
    return c;
  }
  function renameCat(id, name) {
    if (blocked('apps', '줄 이름 바꾸기', function () { renameCat(id, name); })) return;
    var c = catById(id);
    name = String(name).trim().slice(0, 14);
    if (!c || !name) return;
    c.name = name; savePrefs(); render();
    toast('줄 이름을 "' + name + '"(으)로 바꿨어요');
  }
  function deleteCat(id) {
    if (P.cats.length < 2) return;
    var name = (catById(id) || {}).name;
    P.cats = P.cats.filter(function (c) { return c.id !== id; });
    Object.keys(P.cat).forEach(function (k) { if (P.cat[k] === id) delete P.cat[k]; });
    savePrefs(); render();
    toast('"' + (name || '줄') + '"을 지웠어요. 앱은 첫 줄로 옮겼어요');
  }

  function startMove(pkg) {
    if (blocked('apps', '위치 옮기기', function () { startMove(pkg); })) return;
    if (focusEl && focusEl.getAttribute('data-recent')) { toast('최근 실행 줄에서는 옮길 수 없어요. 원래 줄에서 옮겨 주세요'); return; }
    if (base !== 'home' || !onHome(pkg)) return;
    moving = pkg;
    lastFocus.home = pkg;
    renderTiles();
    toast(sectioned() && P.cats.length > 1 ? '◀ ▶로 순서, ▲ ▼로 다른 줄로 옮기고 OK를 누르세요' : '방향키로 옮기고 OK를 누르세요');
  }
  function shiftMoving(dir) {
    var list = visibleApps(), i = list.indexOf(moving);
    if (i < 0) { moving = null; renderTiles(); return; }
    if (tabsMode() && (dir === 'up' || dir === 'down')) return;
    if (sectioned() || tabsMode()) {
      var c = catOf(moving), same = list.filter(function (p) { return catOf(p) === c; }), k = same.indexOf(moving);
      if (dir === 'left' || dir === 'right') {
        var other = same[k + (dir === 'left' ? -1 : 1)];
        if (!other) return;
        var j2 = list.indexOf(other);
        list[i] = other; list[j2] = moving;
      } else {
        var ci = -1;
        P.cats.forEach(function (x, idx) { if (x.id === c) ci = idx; });
        var target = P.cats[ci + (dir === 'up' ? -1 : 1)];
        if (!target) return;
        P.cat[moving] = target.id;
        list.splice(i, 1); list.push(moving);   // last in its new row
      }
      P.apps = list;
      savePrefs();
      renderTiles();
      return;
    }
    if (P.layout === 'column') {
      var cc = catOf(moving), mine = list.filter(function (p) { return catOf(p) === cc; }), mk = mine.indexOf(moving);
      var mj = mk + (dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -4 : 4);
      if (mj < 0 || mj >= mine.length) return;
      var o2 = list.indexOf(mine[mj]);
      list[i] = mine[mj]; list[o2] = moving;
      P.apps = list; savePrefs(); renderTiles();
      return;
    }
    var j = dir === 'left' ? i - 1 : dir === 'right' ? i + 1 : (oneRow() ? i : dir === 'up' ? i - cols : i + cols);
    if (j < 0 || j >= list.length || j === i) return;
    list.splice(i, 1); list.splice(j, 0, moving);
    P.apps = list;
    savePrefs();
    renderTiles();
  }
  function endMove() { moving = null; renderTiles(); toast('위치를 저장했어요'); }

  // ---------- PIN ----------
  // A household PIN (stored as a hash). It keeps children out of grown-up profiles, settings and chosen apps;
  // it is a speed bump, not real security (the TV's own settings stay reachable).
  var PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'del'];
  function hashPin(pin) {
    var h = 2166136261, str = 'cove:' + pin;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16);
  }
  function hasPin() { return !!ROOT.pinHash; }
  function unlocked() { return !hasPin() || Date.now() < unlockedUntil; }
  function requirePin(title, fn) { if (unlocked()) fn(); else openPin({ mode: 'check', title: title, onOk: fn }); }

  // ---------- who may do what ----------
  // One master profile holds the grown-up controls. Anyone who enters the PIN counts as the master for 5 minutes.
  //   look  = appearance (design, background, tiles, fonts, clock, weather)   - every profile; kids if allowed
  //   apps  = which apps sit on the home screen, rows, positions              - every profile except kids
  //   self  = the profile's own name and colour                               - every profile except kids
  //   admin = PIN, profiles, kids settings, app locks, uninstall, system      - master only
  function master() { return profileById(ROOT.masterId) || ROOT.profiles[0]; }
  function isKids(pr) { return (pr || current()).kind === 'kids'; }
  function isAdmin() { return ROOT.current === master().id || Date.now() < unlockedUntil; }
  function may(kind) {
    if (isAdmin()) return true;
    if (kind === 'look') return !isKids() || current().kidsLook !== false;
    if (kind === 'apps') return true;              // kids too, but only among the apps the master allowed
    if (kind === 'self') return !isKids();
    return false;
  }
  function gate(kind, title, fn) {
    if (may(kind)) { fn(); return; }
    if (hasPin()) { openPin({ mode: 'check', title: title, onOk: fn }); return; }
    toast(kind === 'admin' ? '"' + master().name + '" (마스터) 프로필에서 할 수 있어요' : '이 프로필에서는 바꿀 수 없어요');
  }
  // For edit functions: true when not allowed (the PIN is asked for, and the edit runs again after it).
  function blocked(kind, title, retry) { if (may(kind)) return false; gate(kind, title, retry); return true; }
  function openPin(st) {
    pinState = st; st.entry = ''; st.i = 0; st.bad = '';
    $('pin').hidden = false;
    renderPin();
  }
  function closePin() { pinState = null; $('pin').hidden = true; }
  function renderPin() {
    var st = pinState;
    $('pinTitle').textContent = st.mode === 'new' ? '새 PIN 4자리' : st.mode === 'confirm' ? '한 번 더 입력하세요' : (st.title || 'PIN을 입력하세요');
    var sub = $('pinSub');
    sub.textContent = st.bad || (st.mode === 'check' ? 'PIN 4자리를 입력하세요' : '잊어버리면 Cove 앱 데이터를 지워야 해요');
    sub.className = st.bad ? 'bad' : '';
    var dots = '';
    for (var d = 0; d < 4; d++) dots += '<i class="' + (d < st.entry.length ? 'on' : '') + '"></i>';
    $('pinDots').innerHTML = dots;
    $('pinKeys').innerHTML = PIN_KEYS.map(function (k, i) {
      var label = k === 'x' ? '취소' : k === 'del' ? '지우기' : k;
      return '<span class="' + (i === st.i ? 'sel' : '') + (k.length > 1 ? ' small' : '') + '">' + label + '</span>';
    }).join('');
  }
  function pinPress(v) {
    var st = pinState;
    if (!st) return;
    if (v === 'x') { closePin(); return; }
    if (v === 'del') { st.entry = st.entry.slice(0, -1); renderPin(); return; }
    if (st.entry.length >= 4) return;
    st.entry += v; st.bad = '';
    if (st.entry.length < 4) { renderPin(); return; }
    pinSubmit();   // right away, so fast typing (or a pasted "12341234") is never dropped
  }
  function pinSubmit() {
    var st = pinState;
    if (!st) return;
    if (st.mode === 'check') {
      if (hashPin(st.entry) === ROOT.pinHash) { unlockedUntil = Date.now() + 5 * 60 * 1000; okGuardUntil = Date.now() + 1200; closePin(); if (st.onOk) st.onOk(); }
      else { st.entry = ''; st.bad = 'PIN이 맞지 않아요'; renderPin(); var d = $('pinDots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
    } else if (st.mode === 'new') {
      st.first = st.entry; st.entry = ''; st.mode = 'confirm'; renderPin();
    } else {
      if (st.entry === st.first) {
        ROOT.pinHash = hashPin(st.entry); savePrefs();
        unlockedUntil = Date.now() + 5 * 60 * 1000;
        okGuardUntil = Date.now() + 1200;
        closePin(); toast('PIN을 저장했어요');
        if (st.onOk) st.onOk();
        if (panel) renderPanel();
      } else { st.mode = 'new'; st.entry = ''; st.bad = '두 번 입력한 PIN이 달라요. 처음부터 다시 입력하세요'; renderPin(); }
    }
  }
  function pinKey(k) {
    var st = pinState;
    if (k.charAt(0) === 'n' && k.length === 2) { pinPress(k.charAt(1)); return; }
    if (k === 'back') { if (st.entry) pinPress('del'); else closePin(); return; }
    if (k === 'ok' || k === 'longok') { pinPress(PIN_KEYS[st.i]); return; }
    var r = Math.floor(st.i / 3), c = st.i % 3;
    if (k === 'up') r = Math.max(0, r - 1); else if (k === 'down') r = Math.min(3, r + 1);
    else if (k === 'left') c = Math.max(0, c - 1); else if (k === 'right') c = Math.min(2, c + 1);
    st.i = r * 3 + c; renderPin();
  }
  function needPinFirst() { toast('마스터 프로필의 설정에서 잠금 PIN을 먼저 만들어 주세요'); }

  // ---------- profiles ----------
  // Entering the master profile, a profile with "PIN to switch", or leaving a kids profile asks for the PIN.
  function switchProfile(id, quiet) {
    var pr = profileById(id);
    if (!pr || id === ROOT.current) return;
    var needPin = hasPin() && !isAdmin() && (id === master().id || pr.lockIn || isKids());
    if (needPin) {
      openPin({ mode: 'check', title: isKids() ? '키즈 프로필에서 나가기' : '"' + pr.name + '" 프로필 열기', onOk: function () { doSwitch(id, quiet); } });
      return;
    }
    doSwitch(id, quiet);
  }
  function doSwitch(id, quiet) {
    unlockedUntil = 0;   // grown-up access never carries over to another profile
    ROOT.current = id;
    P = current().prefs;
    lastFocus.home = null;
    moving = null;
    savePrefs();
    render();
    okGuardUntil = Math.max(okGuardUntil, Date.now() + 700);
    if (!quiet) toast(current().name + ' 프로필로 바꿨어요');
  }
  // "New profile" opens a screen to choose name, colour, kind and starting point; nothing is created until "추가".
  function addProfile() {
    gate('admin', '프로필 추가', function () {
      var used = ROOT.profiles.map(function (p) { return p.name; });
      var name = PROFILE_NAMES.filter(function (n) { return used.indexOf(n) < 0; })[0] || ('프로필 ' + (ROOT.profiles.length + 1));
      openPanel('newprofile', { draft: { name: name, color: PROFILE_COLORS[ROOT.profiles.length % PROFILE_COLORS.length], kind: 'normal', start: 'default' },
        back: panel && panel.type === 'profiles' ? { type: 'profiles', id: 'add' } : null });
    });
  }
  function kidsDefaults() {
    return APPS.filter(function (a) { return /kids|키즈|junior|주니어/i.test(a.label + ' ' + a.pkg); }).map(function (a) { return a.pkg; });
  }
  function createProfile(d) {
    if (d.kind === 'kids' && !hasPin()) {
      toast('키즈 프로필을 지키려면 PIN이 필요해요. 먼저 PIN을 만들어 주세요');
      openPin({ mode: 'new', onOk: function () { createProfile(d); } });
      return;
    }
    var prefs = d.start === 'copy' && d.kind !== 'kids' ? clone(P) : withDefaults({});
    var pr = { id: 'p' + Date.now().toString(36), name: d.name, color: d.color, kind: d.kind, prefs: prefs };
    if (d.kind === 'kids') { pr.allow = kidsDefaults(); pr.prefs.apps = pr.allow.slice(); pr.kidsLook = true; }
    else if (!Array.isArray(pr.prefs.apps)) pr.prefs.apps = defaultApps();
    ROOT.profiles.push(pr);
    closePanelQuiet();
    doSwitch(pr.id, true);
    toast(d.kind === 'kids'
      ? '"' + d.name + '" 키즈 프로필을 만들었어요. 허용 앱은 프로필 메뉴에서 PIN으로 바꿀 수 있어요'
      : '"' + d.name + '" 프로필을 만들었어요');
  }
  function renameProfile(name) {
    if (blocked('self', '프로필 이름 바꾸기', function () { renameProfile(name); })) return;
    name = String(name).trim().slice(0, 12);
    if (!name) return;
    current().name = name;
    savePrefs(); render();
    toast('프로필 이름을 "' + name + '"(으)로 바꿨어요');
  }
  function cycleName(d) {
    if (blocked('self', '프로필 이름 바꾸기', function () { cycleName(d); })) return;
    var others = ROOT.profiles.filter(function (p) { return p.id !== ROOT.current; }).map(function (p) { return p.name; });
    var names = PROFILE_NAMES.filter(function (n) { return others.indexOf(n) < 0; });
    var i = names.indexOf(current().name);
    current().name = names[(i + d + names.length) % names.length];
    savePrefs(); render();
  }
  function cycleColor(d) {
    if (blocked('self', '프로필 색 바꾸기', function () { cycleColor(d); })) return;
    var i = PROFILE_COLORS.indexOf(current().color);
    current().color = PROFILE_COLORS[(i + d + PROFILE_COLORS.length) % PROFILE_COLORS.length];
    savePrefs(); render();
  }
  function deleteProfileById(id) {
    if (id === master().id) return;
    var pr = profileById(id);
    if (!pr) return;
    ROOT.profiles = ROOT.profiles.filter(function (p) { return p.id !== id; });
    if (ROOT.current === id) doSwitch(master().id, true); else { savePrefs(); render(); }
    toast('"' + pr.name + '" 프로필을 지웠어요');
  }
  function deleteProfile() {
    if (ROOT.profiles.length < 2 || ROOT.current === master().id) return;
    if (blocked('admin', '프로필 삭제', deleteProfile)) return;
    var name = current().name;
    ROOT.profiles = ROOT.profiles.filter(function (p) { return p.id !== ROOT.current; });
    doSwitch(master().id, true);
    toast('"' + name + '" 프로필을 지웠어요');
  }

  // ---------- panels ----------
  function cycle(list, cur, d) {
    var keys = list.map(function (x) { return Array.isArray(x) ? x[0] : x; });
    var i = keys.indexOf(String(cur));
    return keys[(i + d + keys.length) % keys.length];
  }
  function labelOf(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === String(key)) return list[i][1];
    return key;
  }
  // A row that needs OK twice (reset, delete).
  function twice(id, fn) {
    if (armed !== id) { armed = id; renderPanel(); return; }
    armed = '';
    fn();
  }

  function lookRows() {
    var rows = [
      { name: '디자인', sub: DESIGNS[P.design].desc, val: DESIGNS[P.design].name, change: function (d) { applyDesign(cycle(DESIGN_IDS, P.design, d)); } },
      { name: '배경', val: bgName(P.bg), thumb: bgThumb(P.bg), change: function (d) { set({ bg: stepBg(P.bg, d, false) }); } },
      { name: '밤 배경', sub: '오후 7시부터 오전 6시까지', val: bgName(P.nightBg), thumb: bgThumb(P.nightBg), change: function (d) { set({ nightBg: stepBg(P.nightBg, d, true) }); } },
      { name: '배경 어둡게', val: DIMS[P.dim], change: function (d) { set({ dim: Math.max(0, Math.min(3, P.dim + d)) }); } },
      { name: '타일', val: labelOf(TILES, P.tiles), change: function (d) { set({ tiles: cycle(TILES, P.tiles, d) }); } },
      { name: '타일 모양', val: labelOf(SHAPES, P.shape), change: function (d) { set({ shape: cycle(SHAPES, P.shape, d) }); } },
      { name: '타일 크기', val: labelOf(SIZES, P.size), change: function (d) { set({ size: cycle(SIZES, P.size, d) }); } },
      { name: '앱 이름', val: P.labels ? '표시' : '숨김', change: function () { set({ labels: !P.labels }); } },
      { name: '글꼴', val: labelOf(FONTS, P.font), change: function (d) { set({ font: cycle(FONTS, P.font, d) }); } },
      { name: '시계', val: labelOf(CLOCKS, P.clock), change: function (d) { set({ clock: cycle(CLOCKS, P.clock, d) }); } },
      { name: '앱 고르기', id: 'apps', sub: '홈 화면에 둘 앱과 순서', val: visibleApps().length + '개', action: true, act: function () { openPanel('apps', { back: { type: 'look', id: 'apps' } }); } },
      { name: '날씨', sub: '시계 아래에 도시 날씨를 보여줘요', val: P.weather && cityOf(P.weather) ? cityOf(P.weather)[1] : '사용 안 함',
        change: function (d) {
          var ids = [null].concat(CITIES.map(function (c) { return c[0]; }));
          set({ weather: ids[(ids.indexOf(P.weather || null) + d + ids.length) % ids.length] });
        } },
      { name: '메모', sub: '시계 아래에 최근 메모를 한 줄로', val: P.memoPreview !== false ? '표시' : '숨김', change: function () { set({ memoPreview: P.memoPreview === false }); } },
      { name: '다음 일정', sub: '시계 아래에 오늘·내일 일정을 한 줄로', val: P.calPreview !== false ? '표시' : '숨김', change: function () { set({ calPreview: P.calPreview === false }); } },
      { name: '카테고리 줄', id: 'cats', sub: '앱을 소제목 달린 줄로 묶어요', val: P.cats.length > 1 || P.cats[0].name ? P.cats.length + '줄' : '사용 안 함', action: true,
        act: function () { openPanel('cats', { back: { type: 'look', id: 'cats' } }); } },
      { name: '새 앱 자동 추가', sub: '새로 설치한 앱을 홈 끝에 붙여요', val: P.autoAdd !== false ? '켜짐' : '꺼짐', change: function () { set({ autoAdd: P.autoAdd === false }); } }
    ];
    if (P.bg.type === 'photo') {
      rows.push({ name: '이 사진 삭제', danger: true, action: true, val: armed === 'photo' ? '한 번 더 누르면 삭제' : '', act: function () {
        twice('photo', function () {
          if (N) N.deletePhoto(P.bg.id);
          loadPhotos();
          set({ bg: clone(DESIGNS[P.design].p.bg) });
          toast('사진을 지웠어요');
        });
      } });
    }
    rows.push({ name: '처음 상태로', sub: '이 프로필의 꾸미기만 되돌려요', danger: true, action: true, val: armed === 'reset' ? '한 번 더 누르면 초기화' : '',
      act: function () {
        twice('reset', function () {
          var apps = P.apps, auto = P.autoAdd;
          current().prefs = withDefaults({ apps: apps, autoAdd: auto });
          P = current().prefs;
          savePrefs(); render(); toast('처음 상태로 되돌렸어요');
        });
      } });
    return rows;
  }

  function appRows() {
    var vis = visibleApps();
    var hidden = sortedApps().filter(function (a) { return vis.indexOf(a.pkg) < 0 && kidsAllows(a.pkg); }).map(function (a) { return a.pkg; });
    return vis.concat(hidden).map(function (pkg) {
      var a = BYPKG[pkg], pos = vis.indexOf(pkg);
      return {
        pkg: pkg, name: a.label, appicon: iconUrl(a), check: pos >= 0, val: pos >= 0 ? (pos + 1) + '번째' : '',
        act: function () { if (onHome(pkg)) removeFromHome(pkg); else addToHome(pkg); selectPkg(pkg); },
        change: function (d) {
          var list = visibleApps(), i = list.indexOf(pkg), j = i + d;
          if (i < 0 || j < 0 || j >= list.length) return;
          list.splice(i, 1); list.splice(j, 0, pkg);
          set({ apps: list });
          selectPkg(pkg);
        }
      };
    });
  }
  function selectPkg(pkg) {
    var rows = appRows();
    for (var i = 0; i < rows.length; i++) if (rows[i].pkg === pkg) { panel.i = i; break; }
    renderPanel();
  }

  function appMenuRows() {
    var pkg = panel.pkg, home = onHome(pkg), rows = [];
    rows.push({ name: '실행', action: true, act: function () { closePanel(); launch(pkg); } });
    if (!may('apps')) return rows.concat(adminAppRows(pkg));
    rows.push(home
      ? { name: '홈에서 빼기', action: true, act: function () { removeFromHome(pkg); closePanel(); toast('홈에서 뺐어요. 모든 앱에서 다시 추가할 수 있어요'); } }
      : { name: '홈에 추가', action: true, act: function () { addToHome(pkg); closePanel(); toast('홈 끝에 추가했어요'); } });
    if (home && base === 'home') rows.push({ name: '위치 옮기기', action: true, act: function () { closePanel(); startMove(pkg); } });
    if (home && P.cats.length > 1) rows.push({ name: '줄', sub: '◀ ▶로 다른 줄로 옮겨요', val: catById(catOf(pkg)).name || '내 앱',
      change: function (d) { var ids = P.cats.map(function (c) { return c.id; }); setCat(pkg, ids[(ids.indexOf(catOf(pkg)) + d + ids.length) % ids.length]); renderPanel(); } });
    return rows.concat(adminAppRows(pkg));
  }
  // Master-only rows of the app menu (other profiles see them too and are asked for the PIN).
  function adminAppRows(pkg) {
    var rows = [];
    if (!isKids()) {
      var isLocked = P.locked.indexOf(pkg) >= 0;
      rows.push({ name: '잠금', sub: '열 때 PIN을 물어요 · 마스터', val: isLocked ? '켜짐' : '꺼짐', action: true, act: function () {
        if (!hasPin()) { needPinFirst(); return; }
        gate('admin', '앱 잠금 바꾸기', function () {
          if (P.locked.indexOf(pkg) >= 0) P.locked = P.locked.filter(function (x) { return x !== pkg; }); else P.locked.push(pkg);
          savePrefs(); render();
        });
      } });
    }
    rows.push({ name: '앱 정보', sub: '저장공간, 권한, 강제 종료 · 마스터', action: true, act: function () { gate('admin', '앱 정보', function () { if (N) N.appInfo(pkg); else toast('TV에서만 열 수 있어요'); }); } });
    rows.push({ name: '앱 삭제', sub: 'TV의 삭제 확인 화면이 열려요 · 마스터', danger: true, action: true, act: function () {
      gate('admin', '앱 삭제', function () { closePanel(); if (N) N.uninstall(pkg); else toast('TV에서만 삭제할 수 있어요'); }); } });
    return rows;
  }

  function profileBadges(pr) {
    return [pr.id === master().id ? '마스터' : '', pr.kind === 'kids' ? '키즈' : '', pr.id !== master().id && pr.lockIn ? 'PIN 필요' : ''].filter(Boolean).join(' · ');
  }
  function profileRows() {
    var m = master(), cur = current();
    var rows = ROOT.profiles.map(function (pr) {
      return { name: pr.name, dot: pr.color, sub: profileBadges(pr), val: pr.id === ROOT.current ? '사용 중' : '', action: pr.id !== ROOT.current,
        act: function () { if (pr.id !== ROOT.current) { closePanelQuiet(); switchProfile(pr.id); if (!pinState) restoreFocus('home'); } } };
    });
    rows.push({ id: 'add', name: '새 프로필 추가', sub: '마스터만 만들 수 있어요', action: true, act: addProfile });
    if (!isKids()) rows.push({ name: '이름', sub: 'OK로 직접 입력, ◀ ▶로 추천 이름', val: cur.name, action: true,
      act: function () { gate('self', '프로필 이름 바꾸기', function () { askText('프로필 이름', cur.name, function (txt) { if (txt !== null && txt.trim()) { renameProfile(txt); renderPanel(); } }); }); },
      change: function (d) { cycleName(d); renderPanel(); } });
    if (!isKids()) rows.push({ name: '색', dot: cur.color, val: '', change: function (d) { cycleColor(d); renderPanel(); } });
    if (isKids(cur)) {
      rows.push({ name: '허용 앱 ' + (cur.allow || []).length + '개', sub: '이 중에서 홈 화면을 꾸밀 수 있어요. 허용 앱은 마스터가 프로필 관리에서 정해요' });
    }
    // 프로필 관리: one entry per profile for the master; others see a single entry that asks for the PIN
    if (!isAdmin()) {
      rows.push({ id: 'pm', name: '프로필 관리', sub: '이름, 종류, 키즈 허용 앱, 잠금 · 마스터', action: true,
        act: function () { gate('admin', '프로필 관리', function () { openPanel('profiles'); }); } });
      return rows;
    }
    ROOT.profiles.forEach(function (pr) {
      if (pr.id === m.id) return;
      rows.push({ id: 'pm' + pr.id, name: '프로필 관리 · ' + pr.name, dot: pr.color, sub: (profileBadges(pr) || '일반') + ' · 마스터', action: true,
        act: function () { gate('admin', '프로필 관리', function () { openPanel('profmanage', { target: pr.id, back: { type: 'profiles', id: 'pm' + pr.id } }); }); } });
    });
    return rows;
  }

  // Master: everything about one profile in one place.
  function manageRows() {
    var t = profileById(panel.target);
    if (!t) return [{ name: '이 프로필이 없어요' }];
    var kids = isKids(t);
    var rows = [
      { name: '이름', sub: 'OK로 직접 입력', val: t.name, action: true,
        act: function () { askText('프로필 이름', t.name, function (txt) { if (txt !== null && txt.trim()) { t.name = txt.trim().slice(0, 12); savePrefs(); render(); } }); } },
      { name: '색', dot: t.color, val: '', change: function (d) { t.color = PROFILE_COLORS[(PROFILE_COLORS.indexOf(t.color) + d + PROFILE_COLORS.length) % PROFILE_COLORS.length]; savePrefs(); render(); } },
      { name: '종류', sub: kids ? '허용한 앱만 보이고, 나가려면 PIN이 필요해요' : '모든 앱을 쓸 수 있어요', val: kids ? '키즈' : '일반',
        change: function () {
          if (!kids && !hasPin()) { needPinFirst(); return; }
          t.kind = kids ? 'normal' : 'kids';
          if (t.kind === 'kids') { t.allow = (t.prefs.apps || []).slice(); t.kidsLook = true; }
          savePrefs(); render();
        } }
    ];
    if (kids) {
      rows.push({ id: 'allow', name: '허용 앱', sub: t.name + ' 프로필에서 보이고 열리는 앱', val: (t.allow || []).length + '개', action: true,
        act: function () { openPanel('allow', { target: t.id, back: { type: 'profmanage', id: 'allow', opts: { target: t.id, back: panel.back } } }); } });
      rows.push({ name: '아이가 꾸미기 바꾸기', sub: '디자인, 배경, 타일', val: t.kidsLook !== false ? '허용' : '막음', change: function () { t.kidsLook = t.kidsLook === false; savePrefs(); renderPanel(); } });
    }
    rows.push({ name: '이 프로필로 바꿀 때 PIN', sub: '다른 프로필에서 넘어올 때 PIN을 물어요', val: t.lockIn ? '켜짐' : '꺼짐',
      change: function () { if (!hasPin()) { needPinFirst(); return; } t.lockIn = !t.lockIn; savePrefs(); renderPanel(); } });
    rows.push({ name: '이 프로필 삭제', danger: true, action: true, val: armed === 'delprofile' ? '한 번 더 누르면 삭제' : '',
      act: function () { twice('delprofile', function () { deleteProfileById(t.id); closePanelQuiet(); openPanel('profiles'); }); } });
    return rows;
  }

  function newProfileRows() {
    var d = panel.draft;
    var names = function () {
      var used = ROOT.profiles.map(function (p) { return p.name; });
      return PROFILE_NAMES.filter(function (n) { return used.indexOf(n) < 0 || n === d.name; });
    };
    var rows = [
      { name: '이름', sub: 'OK로 직접 입력, ◀ ▶로 추천 이름', val: d.name, action: true,
        act: function () { askText('프로필 이름', d.name, function (txt) { if (txt !== null && txt.trim()) { d.name = txt.trim().slice(0, 12); renderPanel(); } }); }, change: function (k) { var l = names(); d.name = l[(l.indexOf(d.name) + k + l.length) % l.length]; renderPanel(); } },
      { name: '색', dot: d.color, val: '', change: function (k) { d.color = PROFILE_COLORS[(PROFILE_COLORS.indexOf(d.color) + k + PROFILE_COLORS.length) % PROFILE_COLORS.length]; renderPanel(); } },
      { name: '종류', sub: d.kind === 'kids' ? '허용한 앱만 보이고, 나가려면 PIN이 필요해요' : '모든 앱을 쓸 수 있어요',
        val: d.kind === 'kids' ? '키즈' : '일반', change: function () {
          d.kind = d.kind === 'kids' ? 'normal' : 'kids';
          var used = ROOT.profiles.map(function (p) { return p.name; });
          if (d.kind === 'kids' && used.indexOf('아이') < 0) d.name = '아이';
          else if (d.kind === 'normal' && d.name === '아이') d.name = PROFILE_NAMES.filter(function (n) { return used.indexOf(n) < 0 && n !== '아이'; })[0] || d.name;
          renderPanel();
        } }
    ];
    if (d.kind !== 'kids') {
      rows.push({ name: '시작 상태', sub: d.start === 'copy' ? '지금 프로필의 디자인, 배경, 앱 목록을 복사해요' : '처음 설치했을 때와 같은 기본 상태로 시작해요',
        val: d.start === 'copy' ? '지금 설정 복사' : '기본 상태', change: function () { d.start = d.start === 'copy' ? 'default' : 'copy'; renderPanel(); } });
    }
    rows.push({ name: '"' + d.name + '" 프로필을 추가할까요?', sub: d.kind === 'kids' && !hasPin() ? '키즈 프로필은 PIN이 필요해서 PIN부터 만들어요' : '',
      val: '추가', action: true, act: function () { createProfile(d); } });
    rows.push({ name: '취소', action: true, act: closePanel });
    return rows;
  }

  // Kids profile: which apps it may see and open (master).
  function allowRows() {
    var t = profileById(panel.target) || current();
    if (!Array.isArray(t.allow)) t.allow = [];
    return sortedApps().map(function (a) {
      var on = t.allow.indexOf(a.pkg) >= 0;
      return { pkg: a.pkg, name: a.label, appicon: iconUrl(a), check: on, val: on ? '허용' : '',
        act: function () {
          var apps = t.prefs.apps || (t.prefs.apps = []);
          if (on) { t.allow = t.allow.filter(function (x) { return x !== a.pkg; }); t.prefs.apps = apps.filter(function (x) { return x !== a.pkg; }); }
          else { t.allow.push(a.pkg); if (apps.indexOf(a.pkg) < 0) apps.push(a.pkg); }   // newly allowed apps also land on the kid's home
          savePrefs(); render();
        } };
    });
  }

  function catRows() {
    var rows = P.cats.map(function (c, idx) {
      return { id: 'cat' + c.id, name: c.name || '내 앱', sub: appsIn(c.id).length + '개 앱 · ◀ ▶로 줄 순서 옮기기', action: true,
        act: function () { openPanel('cat', { cat: c.id, back: { type: 'cats', id: 'cat' + c.id } }); },
        change: function (d) {
          var j = idx + d;
          if (j < 0 || j >= P.cats.length) return;
          P.cats.splice(idx, 1); P.cats.splice(j, 0, c);
          savePrefs(); render(); panel.i = j; renderPanel();
        } };
    });
    rows.push({ name: '새 줄 추가', action: true, act: function () { addCat(); panel.i = P.cats.length - 1; renderPanel(); } });
    rows.push({ name: '최근 실행 줄', sub: '최근에 연 앱을 맨 위 줄에 보여줘요', val: P.recentRow ? '표시' : '숨김', change: function () { set({ recentRow: !P.recentRow }); } });
    return rows;
  }

  function catPanelRows() {
    var c = catById(panel.cat);
    if (!c) return [];
    var rows = [
      { name: '이름', sub: 'OK로 직접 입력, ◀ ▶로 추천 이름', val: c.name || '내 앱', action: true,
        act: function () { askText('줄 이름', c.name, function (txt) { if (txt !== null && txt.trim()) { renameCat(c.id, txt); renderPanel(); } }); },
        change: function (d) {
          var others = P.cats.filter(function (x) { return x.id !== c.id; }).map(function (x) { return x.name; });
          var names = CAT_NAMES.filter(function (n) { return others.indexOf(n) < 0; });
          c.name = names[(names.indexOf(c.name) + d + names.length) % names.length];
          savePrefs(); render();
        } }
    ];
    visibleApps().forEach(function (pkg) {
      var mine = catOf(pkg) === c.id;
      rows.push({ name: BYPKG[pkg].label, appicon: iconUrl(BYPKG[pkg]), check: mine, val: mine ? '' : (catById(catOf(pkg)).name || '내 앱'),
        act: function () {
          if (!mine) setCat(pkg, c.id);
          else { var other = P.cats.filter(function (x) { return x.id !== c.id; })[0]; if (other) setCat(pkg, other.id); }
          renderPanel();
        } });
    });
    if (P.cats.length > 1) rows.push({ name: '이 줄 삭제', sub: '앱은 첫 줄로 옮겨요', danger: true, action: true, val: armed === 'delcat' ? '한 번 더 누르면 삭제' : '',
      act: function () { twice('delcat', function () { deleteCat(c.id); closePanel(); }); } });
    return rows;
  }

  function overrideStatus() {
    var st = { service: false, enabled: true };
    try { if (N) st = JSON.parse(N.overrideStatus()); } catch (e) {}
    return st;
  }

  function updateLabel() {
    if (!update) return '';
    if (update.phase === 'checking') return '확인 중…';
    if (update.phase === 'download') return '받는 중…';
    if (update.phase === 'confirm') return '설치 화면 확인';
    if (!update.ok) return '확인 실패';
    return update.available ? (update.latestName + ' 설치하기') : '최신 버전이에요';
  }

  function settingsRows() {
    var st = overrideStatus();
    return [
      { name: '홈 버튼으로 Cove 열기', action: true,
        sub: !st.service ? 'OK를 누르면 접근성 설정으로 이동해요' : st.enabled ? 'OK를 누르면 잠시 꺼요' : 'OK를 누르면 다시 켜요',
        val: !st.service ? '권한 필요' : st.enabled ? '켜짐' : '일시 중지',
        act: function () { gate('admin', '홈 버튼 설정', function () {
          if (!N) { toast('TV에서만 바꿀 수 있어요'); return; }
          if (!st.service) { N.openAccessibility(); toast('접근성에서 "Cove 홈 버튼 전환"을 켜 주세요'); return; }
          N.setOverride(!st.enabled); renderPanel();
        }); } },
      { name: '권한이 켜지지 않을 때', sub: '안드로이드 "제한된 설정" 안내', val: helpOpen ? '닫기' : '보기', action: true,
        act: function () { helpOpen = !helpOpen; renderPanel(); } },
      { name: 'Cove 앱 정보 열기', sub: '여기서 "제한된 설정 허용"을 찾아요', action: true,
        act: function () { gate('admin', 'Cove 앱 정보', function () { if (N) N.appInfo(N.selfPackage()); else toast('TV에서만 열 수 있어요'); }); } },
      { name: '마스터 프로필', sub: '◀ ▶로 넘기기 · PIN, 프로필, 잠금을 관리해요', val: master().name,
        change: function (d) { gate('admin', '마스터 넘기기', function () {
          var list = ROOT.profiles.filter(function (p) { return p.kind !== 'kids'; });
          var i = list.indexOf(master());
          ROOT.masterId = list[(i + d + list.length) % list.length].id;
          savePrefs(); renderPanel(); toast('"' + master().name + '" 프로필이 마스터예요');
        }); } },
      { name: '화면 보호기 · 대기 화면', id: 'ambient', sub: '사진, 시계, 날씨, 일정, 메모', action: true, act: function () { openPanel('ambient', { back: { type: 'settings', id: 'ambient' } }); } },
      { name: '잠금 PIN', sub: hasPin() ? 'OK를 누르면 PIN을 바꿔요 · 마스터' : '프로필, 키즈, 앱 잠금에 쓰는 4자리 · 마스터', val: hasPin() ? '설정됨' : '없음', action: true,
        act: function () { gate('admin', 'PIN 바꾸기', function () { openPin({ mode: 'new' }); }); } },
    ].concat(hasPin() ? [
      { name: 'PIN 끄기', sub: '모든 잠금이 풀려요', danger: true, action: true, val: armed === 'nopin' ? '한 번 더 누르면 끄기' : '',
        act: function () { gate('admin', 'PIN 끄기', function () { twice('nopin', function () { ROOT.pinHash = ''; savePrefs(); render(); toast('PIN을 껐어요'); }); }); } }
    ] : []).concat([
      { name: '업데이트 확인', sub: '새 버전이 있으면 바로 설치해요', val: updateLabel(), action: true,
        act: function () {
          if (!N) { toast('TV에서만 확인할 수 있어요'); return; }
          if (update && update.ok && update.available && update.phase === 'result') { gate('admin', '업데이트 설치', function () { update.phase = 'download'; renderPanel(); N.installUpdate(); }); }
          else { update = { phase: 'checking' }; renderPanel(); N.checkUpdate(); }
        } },
      { name: 'TV 설정 열기', sub: '마스터', action: true, act: function () { gate('admin', 'TV 설정', function () { if (N) N.openTvSettings(); }); } },
      { name: '버전', val: N ? N.version() : '미리보기' }
    ]);
  }

  function rowsFor(type) {
    if (type === 'apps') return appRows();
    if (type === 'settings') return settingsRows();
    if (type === 'profiles') return profileRows();
    if (type === 'app') return appMenuRows();
    if (type === 'cats') return catRows();
    if (type === 'cat') return catPanelRows();
    if (type === 'newprofile') return newProfileRows();
    if (type === 'calset') return calRows();
    if (type === 'calev') return eventRows();
    if (type === 'ambient') return ambientRows();
    if (type === 'memoitem' || type === 'memoedit') return memoRows();
    if (type === 'allow') return allowRows();
    if (type === 'profmanage') return manageRows();
    return lookRows();
  }

  function openPanel(type, opts) {
    if (['look', 'apps', 'settings', 'profiles', 'app', 'cats', 'cat', 'newprofile', 'allow', 'calset', 'calev', 'ambient', 'memoitem', 'memoedit', 'profmanage'].indexOf(type) < 0) return;
    var need = type === 'look' ? 'look' : (type === 'apps' || type === 'cats' || type === 'cat') ? 'apps' : (type === 'newprofile' || type === 'allow' || type === 'profmanage') ? 'admin' : null;
    if (need && blocked(need, type === 'look' ? '꾸미기' : need === 'apps' ? '앱 정리' : '마스터 메뉴', function () { openPanel(type, opts); })) return;
    if (type === 'look' || type === 'settings') loadPhotos();
    if (moving) { moving = null; renderTiles(); }
    opts = opts || {};
    panel = { type: type, i: 0, pkg: opts.pkg, cat: opts.cat, back: opts.back, draft: opts.draft, target: opts.target };
    armed = '';
    if (type !== 'settings') helpOpen = false;
    if (focusEl) focusEl.classList.remove('focus');
    $('panel').hidden = false;
    renderPanel();
  }
  function closePanelQuiet() { panel = null; armed = ''; $('panel').hidden = true; }
  function closePanel() {
    var back = panel && panel.back;
    closePanelQuiet();
    if (back) {
      openPanel(back.type, back.opts);
      var rows = rowsFor(back.type);
      for (var i = 0; i < rows.length; i++) if (rows[i].id === back.id) panel.i = i;
      renderPanel();
      return;
    }
    if (base === 'cal') { renderCal(); return; }
    if (base === 'memo') { renderMemo(); return; }
    if (base === 'drawer') restoreFocus('drawer'); else restoreFocus('home');
  }

  function remoteBlock() {
    var info = { url: '', qr: '', running: false, error: '', port: 8765, ips: [] };
    try { info = N ? JSON.parse(N.remoteInfo()) : { url: 'http://192.168.0.10:8765/?t=preview', qr: '', running: true, error: '', port: 8765, ips: ['wlan0 192.168.0.10'] }; } catch (e) {}
    var addr = info.url.replace(/\?.*$/, '');
    var status = info.running
      ? '<span class="ok">● 리모컨 서버 실행 중</span>'
      : '<span class="bad">● 리모컨 서버가 꺼져 있어요' + (info.error ? ' (' + esc(info.error) + ')' : '') + '</span>';
    var tips = '연결이 안 되면 폰이 같은 와이파이인지 확인하세요. 게스트 와이파이나 모바일 데이터에서는 연결되지 않아요.';
    var ips = (info.ips || []).length > 1 ? '<div>TV 주소: ' + info.ips.map(esc).join(' · ') + '</div>' : '';
    if (!info.url) {
      return '<div class="pair"><div></div><div class="diag">' + status + '<div>와이파이나 유선 네트워크에 연결되면 폰 리모컨 QR이 여기 나타나요.</div>' + ips + '</div></div>';
    }
    return '<div class="pair"><div class="qr">' + info.qr + '</div><div class="diag">' +
      '<p>폰 카메라로 QR을 찍으면 리모컨이 열려요.</p><b>' + esc(addr) + '</b>' + status + '<div>' + tips + '</div>' + ips + '</div></div>';
  }

  function helpBlock() {
    var pkg = N ? N.selfPackage() : 'com.mirinetic.cove';
    return '<div class="help"><div><b>왜 꺼지나요?</b> Downloader나 USB로 설치한 앱은 안드로이드 13부터 접근성 권한이 막혀요. 켜자마자 다시 꺼진다면 이 경우예요.</div>' +
      '<div><b>1.</b> 아래 "Cove 앱 정보 열기" → 메뉴에서 "제한된 설정 허용" → 접근성에서 다시 켜기</div>' +
      '<div><b>2.</b> 그 메뉴가 없으면 PC에서 ADB로 실행:</div>' +
      '<code>adb shell appops set ' + esc(pkg) + ' ACCESS_RESTRICTED_SETTINGS allow</code></div>';
  }

  function renderPanel() {
    if (!panel) return;
    var rows = rowsFor(panel.type);
    panel.i = Math.max(0, Math.min(rows.length - 1, panel.i));
    var titles = { look: ['Appearance', '꾸미기'], apps: ['Apps', '앱 고르기'], settings: ['Settings', '설정'], profiles: ['Profiles', '프로필'], app: ['App', ''],
      cats: ['Rows', '카테고리 줄'], cat: ['Row', ''], newprofile: ['New profile', '새 프로필'], allow: ['Kids', '허용 앱'], calset: ['Calendar', '캘린더 설정'], calev: ['Event', '일정'], ambient: ['Screensaver', '화면 보호기'], memoitem: ['Memo', '메모'], memoedit: ['Memo', '메모'], profmanage: ['Manage profile', ''] };
    $('pKicker').textContent = titles[panel.type][0];
    $('pTitle').textContent = panel.type === 'app' ? (BYPKG[panel.pkg] ? BYPKG[panel.pkg].label : '')
      : panel.type === 'cat' ? ((catById(panel.cat) || {}).name || '내 앱')
      : panel.type === 'profmanage' ? (profileById(panel.target) || {}).name || ''
      : panel.type === 'allow' ? '허용 앱 · ' + ((profileById(panel.target) || current()).name) : titles[panel.type][1];
    $('pExtra').innerHTML = panel.type === 'settings' ? (helpOpen ? helpBlock() : remoteBlock())
      : panel.type === 'ambient' ? '<div class="help"><div><b>TV 화면 보호기 목록에 Cove가 없나요?</b> 일부 Google TV는 이 메뉴를 숨겨 둬요. PC나 폰에서 ADB로 한 번 설정하면 돼요:</div><code>adb shell settings put secure screensaver_components com.mirinetic.cove/.CoveDream</code></div>'
      : panel.type === 'calset' ? '<div class="help">구독 캘린더 추가와 일정 추가는 폰 리모컨의 <b>일정</b>에서 해요. Google 캘린더와 아이폰 캘린더 주소를 넣는 방법도 거기 있어요.</div>'
      : panel.type === 'allow' ? '<div class="help">체크한 앱만 "' + esc((profileById(panel.target) || current()).name) + '" 프로필의 홈과 모든 앱에 보이고 열려요. 아이는 이 앱들 안에서 꾸미기 → 앱 고르기로 자유롭게 정리할 수 있어요.</div>'
      : panel.type === 'apps' && isKids() ? '<div class="help">마스터가 허용한 앱 ' + (current().allow || []).length + '개 중에서 고를 수 있어요.</div>'
      : panel.type === 'cats' && P.layout === 'minimal' ? '<div class="help">Minimal 디자인은 줄 없이 로고 한 줄로 보여요. 줄은 Glass와 Icons에서 나타나요.</div>' : '';

    $('pRows').innerHTML = rows.map(function (r, i) {
      var cls = 'row' + (i === panel.i ? ' sel' : '') + (r.action ? ' action' : '') + (r.danger ? ' danger' : '');
      var left = (r.check !== undefined ? '<span class="check' + (r.check ? ' on' : '') + '">' + (r.check ? '✓' : '') + '</span>' : '') +
        (r.appicon ? '<img class="appicon" src="' + r.appicon + '" alt="">' : '') +
        (r.dot ? '<span class="dot" style="background:' + esc(r.dot) + '"></span>' : '');
      var val = r.change && !r.action && r.check === undefined
        ? '<span class="arrow">‹</span><b>' + esc(r.val) + '</b><span class="arrow">›</span>'
        : (r.val ? '<b>' + esc(r.val) + '</b>' : '') + (r.action ? '<span class="arrow">›</span>' : '');
      return '<div class="' + cls + '">' + left +
        '<div class="name">' + esc(r.name) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>' +
        (r.thumb || '') +
        '<div class="val">' + val + '</div></div>';
    }).join('');

    var box = $('pRows'), sel = box.querySelector('.sel');
    if (sel) {
      var top = sel.offsetTop, bottom = top + sel.offsetHeight;
      if (top < box.scrollTop) box.scrollTop = top;
      else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
    }

    var hints = { look: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '닫기']],
      apps: [['OK', '표시 / 숨김'], ['◀ ▶', '순서 옮기기'], ['뒤로', '돌아가기']],
      profiles: [['OK', '선택'], ['◀ ▶', '이름·색 바꾸기'], ['뒤로', '닫기']],
      settings: [['OK', '선택'], ['뒤로', '닫기']], app: [['OK', '선택'], ['뒤로', '닫기']],
      cats: [['OK', '편집'], ['◀ ▶', '순서'], ['뒤로', '돌아가기']], cat: [['OK', '이 줄에 넣기 / 빼기'], ['◀ ▶', '이름'], ['뒤로', '돌아가기']],
      newprofile: [['◀ ▶', '바꾸기'], ['OK', '추가'], ['뒤로', '취소']], allow: [['OK', '허용 / 막기'], ['뒤로', '돌아가기']], calset: [['OK', '선택'], ['뒤로', '닫기']], calev: [['▲ ▼', '이동'], ['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '취소']],
      ambient: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '닫기']], memoitem: [['◀ ▶', '색'], ['OK', '선택'], ['뒤로', '닫기']],
      memoedit: [['▲ ▼', '이동'], ['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '취소']], profmanage: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '돌아가기']] };
    $('pHint').innerHTML = hints[panel.type].map(function (h) { return '<span><kbd>' + h[0] + '</kbd>' + h[1] + '</span>'; }).join('');
  }

  function panelKey(k) {
    var rows = rowsFor(panel.type), r = rows[panel.i];
    if (k === 'up') { panel.i = Math.max(0, panel.i - 1); armed = ''; renderPanel(); }
    else if (k === 'down') { panel.i = Math.min(rows.length - 1, panel.i + 1); armed = ''; renderPanel(); }
    else if (k === 'left' || k === 'right') { if (r && r.change) r.change(k === 'left' ? -1 : 1); }
    else if (k === 'ok' || k === 'longok') { if (!r) return; if (r.act) r.act(); else if (r.change) r.change(1); }
    else if (k === 'back' || k === 'menu') closePanel();
  }

  // ---------- calendar ----------
  // Own events (added from the phone or by voice) plus read-only subscriptions (iCal links from Google
  // Calendar, iCloud, Outlook). Events belong to the family (everyone sees them) or to one profile.
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var SUB_COLORS = ['#8fb4ff', '#ff9f7a', '#7ee0b0', '#d7a6ff', '#ffd76b', '#ff8fb1'];
  var calFeeds = {};               // sub id -> {at, ok, error, series:[...]}
  var cal = { mode: 'day', day: null, scroll: 0 };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()); }
  function fmtTime(d) { var h = d.getHours(), m = pad2(d.getMinutes()); return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + m; }
  function fmtDay(d) { return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DOW[d.getDay()] + ')'; }
  function relDay(d) {
    var diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
    return diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === 2 ? '모레' : diff === -1 ? '어제' : fmtDay(d);
  }

  function calData() {
    if (!ROOT.cal) ROOT.cal = { events: [], subs: [] };
    if (!Array.isArray(ROOT.cal.events)) ROOT.cal.events = [];
    if (!Array.isArray(ROOT.cal.subs)) ROOT.cal.subs = [];
    return ROOT.cal;
  }
  function visibleOwner(owner) { return owner === 'family' || owner === ROOT.current; }
  function ownerName(owner) { if (owner === 'family') return '가족'; var p = profileById(owner); return p ? p.name : ''; }

  // --- iCal parsing ---
  function icsDate(val, params) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(val || '');
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(params || '')) return { d: new Date(+m[1], +m[2] - 1, +m[3]), allDay: !m[4] };
    if (m[7]) return { d: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))), allDay: false };
    return { d: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)), allDay: false };   // TZID time: shown as TV-local time
  }
  function icsText(v) { return String(v || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim(); }
  function parseIcs(text) {
    var lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    var out = [], ev = null, name = '';
    lines.forEach(function (line) {
      var i = line.indexOf(':');
      if (i < 0) return;
      var head = line.slice(0, i), val = line.slice(i + 1);
      var semi = head.indexOf(';'), key = (semi < 0 ? head : head.slice(0, semi)).toUpperCase(), params = semi < 0 ? '' : head.slice(semi + 1);
      if (key === 'X-WR-CALNAME' && !ev) name = icsText(val);
      if (key === 'BEGIN' && val === 'VEVENT') ev = { exdates: [] };
      else if (key === 'END' && val === 'VEVENT') { if (ev && ev.start) out.push(ev); ev = null; }
      else if (ev) {
        if (key === 'SUMMARY') ev.title = icsText(val);
        else if (key === 'UID') ev.uid = val;
        else if (key === 'DTSTART') { var s = icsDate(val, params); if (s) { ev.start = s.d; ev.allDay = s.allDay; } }
        else if (key === 'DTEND') { var e = icsDate(val, params); if (e) ev.end = e.d; }
        else if (key === 'RRULE') ev.rrule = val;
        else if (key === 'EXDATE') val.split(',').forEach(function (x) { var d = icsDate(x, params); if (d) ev.exdates.push(d.d.getTime()); });
        else if (key === 'RECURRENCE-ID') { var r = icsDate(val, params); if (r) ev.recurrenceId = r.d.getTime(); }
        else if (key === 'STATUS' && val === 'CANCELLED') ev.cancelled = true;
      }
    });
    return { name: name, events: out };
  }
  // Repeating events (daily / weekly with days / monthly by date or "2nd Monday" / yearly), within a window.
  function expand(ev, from, to, moved) {
    var out = [], dur = ev.end ? ev.end - ev.start : 0;
    var push = function (d) {
      if (d < from || d > to) return;
      if (ev.exdates.indexOf(d.getTime()) >= 0 || moved[ev.uid + '@' + d.getTime()]) return;
      out.push({ start: d, end: dur ? new Date(d.getTime() + dur) : null });
    };
    if (!ev.rrule) { if (!ev.cancelled) push(ev.start); return out; }
    var r = {};
    ev.rrule.split(';').forEach(function (kv) { var p = kv.split('='); r[p[0]] = p[1]; });
    var freq = r.FREQ, step = +(r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
    var until = r.UNTIL ? (icsDate(r.UNTIL) || {}).d : null;
    var days = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    var byday = r.BYDAY ? r.BYDAY.split(',') : null;
    var s = ev.start, n = 0, guard = 0;
    var ok = function (d) { return (!until || d <= until) && n < count; };
    if (freq === 'WEEKLY') {
      var wd = byday ? byday.map(function (x) { return days[x.slice(-2)]; }).sort() : [s.getDay()];
      var week0 = addDays(s, -s.getDay());
      for (var w = 0; guard++ < 2000; w += step) {
        var base = addDays(week0, w * 7);
        if (base > to) break;
        for (var k = 0; k < wd.length; k++) {
          var d = addDays(base, wd[k]);
          d.setHours(s.getHours(), s.getMinutes(), s.getSeconds());
          if (d < s) continue;
          if (!ok(d)) return out;
          n++; push(d);
        }
      }
    } else if (freq === 'MONTHLY' && byday) {
      var m0 = byday[0], nth = parseInt(m0, 10) || 1, dow = days[m0.slice(-2)];
      for (var mi = 0; guard++ < 600; mi += step) {
        var first = new Date(s.getFullYear(), s.getMonth() + mi, 1, s.getHours(), s.getMinutes());
        if (first > to) break;
        var d2;
        if (nth > 0) { d2 = new Date(first); d2.setDate(1 + ((dow - first.getDay() + 7) % 7) + (nth - 1) * 7); }
        else { var last = new Date(first.getFullYear(), first.getMonth() + 1, 0, s.getHours(), s.getMinutes()); d2 = new Date(last); d2.setDate(last.getDate() - ((last.getDay() - dow + 7) % 7) + (nth + 1) * 7); }
        if (d2.getMonth() !== first.getMonth() || d2 < s) continue;
        if (!ok(d2)) return out;
        n++; push(d2);
      }
    } else {
      for (var i = 0; guard++ < 3000; i += step) {
        var d3 = freq === 'DAILY' ? addDays(s, i)
          : freq === 'MONTHLY' ? new Date(s.getFullYear(), s.getMonth() + i, s.getDate(), s.getHours(), s.getMinutes())
          : freq === 'YEARLY' ? new Date(s.getFullYear() + i, s.getMonth(), s.getDate(), s.getHours(), s.getMinutes()) : null;
        if (!d3 || d3 > to) break;
        if (freq !== 'DAILY' && d3.getDate() !== s.getDate()) continue;   // e.g. the 31st in a short month
        if (!ok(d3)) break;
        n++; push(d3);
      }
    }
    return out;
  }

  // All visible occurrences between two dates, sorted.
  function occurrences(from, to) {
    var list = [], data = calData();
    data.events.forEach(function (e) {
      if (!visibleOwner(e.owner)) return;
      var s = new Date(e.start);
      if (s >= from && s <= to) list.push({ title: e.title, start: s, end: e.end ? new Date(e.end) : null, allDay: !!e.allDay, owner: e.owner, id: e.id, color: '#ffffff', src: '내 일정' });
    });
    data.subs.forEach(function (sub, si) {
      if (!visibleOwner(sub.owner)) return;
      var feed = calFeeds[sub.id];
      if (!feed || !feed.series) return;
      var moved = {};
      feed.series.forEach(function (ev) { if (ev.recurrenceId) moved[ev.uid + '@' + ev.recurrenceId] = true; });
      feed.series.forEach(function (ev) {
        expand(ev, from, to, moved).forEach(function (o) {
          if (ev.cancelled) return;
          list.push({ title: ev.title || '(제목 없음)', start: o.start, end: o.end, allDay: ev.allDay, owner: sub.owner, color: sub.color || SUB_COLORS[si % SUB_COLORS.length], src: sub.name });
        });
      });
    });
    list.sort(function (a, b) { return (a.start - b.start) || (b.allDay - a.allDay); });
    return list;
  }
  function eventsOn(day) { var d0 = startOfDay(day); return occurrences(d0, new Date(d0.getTime() + 86400000 - 1)); }

  // --- subscriptions ---
  function syncCalendars(force) {
    calData().subs.forEach(function (sub) {
      var f = calFeeds[sub.id];
      if (!force && f && Date.now() - f.at < 30 * 60 * 1000) return;
      calFeeds[sub.id] = { at: Date.now(), ok: f ? f.ok : false, series: f ? f.series : null, busy: true };
      if (N) N.fetchCalendar(sub.id, sub.url);
      else calFeeds[sub.id] = { at: Date.now(), ok: false, error: '미리보기에서는 불러올 수 없어요' };
    });
  }
  function calFetched(id, json) {
    var r = {};
    try { r = JSON.parse(json); } catch (e) {}
    var sub = null;
    calData().subs.forEach(function (x) { if (x.id === id) sub = x; });
    if (!sub) return;
    if (r.ok) {
      var parsed = parseIcs(r.ics || '');
      calFeeds[id] = { at: Date.now(), ok: true, series: parsed.events };
      if (!sub.name || sub.name === '구독 캘린더') { sub.name = parsed.name || sub.name; savePrefs(); }
      saveSnapshot();
    } else {
      var old = calFeeds[id] || {};
      calFeeds[id] = { at: Date.now(), ok: false, error: r.error || '불러오지 못했어요', series: old.series };
    }
    showNextEvent();
    if (base === 'cal') renderCal();
    if (panel && panel.type === 'calset') renderPanel();
  }

  // --- commands from the phone ---
  function calCmd(json) {
    var c = {};
    try { c = JSON.parse(json); } catch (e) { return; }
    var data = calData();
    var owner = c.owner && (c.owner === 'family' || profileById(c.owner)) ? c.owner : 'family';
    if (c.op === 'add' && c.title && c.start) {
      var ev = { id: 'e' + Date.now().toString(36), title: String(c.title).slice(0, 80), start: c.start, end: c.end || null, allDay: !!c.allDay, owner: owner };
      data.events.push(ev);
      savePrefs();
      toast('일정을 추가했어요: ' + relDay(new Date(ev.start)) + ' ' + (ev.allDay ? '' : fmtTime(new Date(ev.start)) + ' ') + ev.title);
    } else if (c.op === 'del') {
      data.events = data.events.filter(function (e) { return e.id !== c.id; });
      savePrefs();
      toast('일정을 지웠어요');
    } else if (c.op === 'sub' && c.url) {
      var sub = { id: 's' + Date.now().toString(36), name: String(c.name || '구독 캘린더').slice(0, 40), url: String(c.url).trim(), owner: owner,
        color: SUB_COLORS[data.subs.length % SUB_COLORS.length] };
      data.subs.push(sub);
      savePrefs();
      toast('"' + sub.name + '" 캘린더를 불러오는 중이에요');
      syncCalendars(true);
    } else if (c.op === 'unsub') {
      data.subs = data.subs.filter(function (s) { return s.id !== c.id; });
      delete calFeeds[c.id];
      savePrefs();
      toast('구독 캘린더를 지웠어요');
    } else if (c.op === 'memo') {
      addMemo(c.text, { color: MEMO_COLORS.indexOf(c.color) >= 0 ? c.color : null, to: c.to, by: c.by,
        from: /^\d{4}-\d{2}-\d{2}$/.test(c.from || '') ? c.from : null, days: +c.days || 0 });
    } else if (c.op === 'unmemo') {
      removeMemo(c.id);
      toast('메모를 뗐어요');
    } else if (c.op === 'refresh') {
      syncCalendars(true);
    }
    showNextEvent();
    if (base === 'cal') renderCal();
  }

  // --- home preview: the next event today (or tomorrow) under the clock ---
  function showNextEvent() {
    var el = $('nextEvt');
    if (!el) return;
    if (P.calPreview === false) { el.hidden = true; return; }
    var now = new Date(), list = occurrences(now, addDays(startOfDay(now), 2)).filter(function (o) { return o.allDay ? startOfDay(o.start) >= startOfDay(now) : o.start >= now; });
    var todayList = eventsOn(now).filter(function (o) { return o.allDay || o.start >= now; });
    var first = list[0];
    if (!first) { el.hidden = true; return; }
    var more = startOfDay(first.start).getTime() === startOfDay(now).getTime() ? todayList.length - 1 : 0;
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '<b>' + relDay(first.start) + (first.allDay ? '' : ' ' + fmtTime(first.start)) + '</b><span>' + esc(first.title) + (more > 0 ? ' 외 ' + more + '개' : '') + '</span>';
    el.hidden = false;
  }

  // --- the calendar screen ---
  // Arrow keys move the focus, OK opens what is focused. Up from the content reaches the top bar
  // (하루 / 이번 주 / 한 달 / 일정 추가 / 캘린더 설정).
  var CAL_HEAD = [['day', '하루'], ['week', '이번 주'], ['month', '한 달'], ['add', '＋ 일정 추가'], ['set', '캘린더 설정']];
  function openCal(mode, day) {
    closePanelQuiet();
    if (base === 'drawer') $('drawer').hidden = true;
    if (focusEl) focusEl.classList.remove('focus');
    base = 'cal';
    cal.mode = mode || 'month';
    cal.day = startOfDay(day || new Date());
    cal.zone = 'body';
    cal.hi = 0;
    cal.idx = 0;
    cal.prevMode = null;
    $('cal').hidden = false;
    syncCalendars(false);
    renderCal();
  }
  function closeCal() { base = 'home'; $('cal').hidden = true; restoreFocus('home'); }
  function dayItems() { return eventsOn(cal.day).concat([{ add: true }]); }
  function gridStart(day) { var m0 = new Date(day.getFullYear(), day.getMonth(), 1); return addDays(m0, -m0.getDay()); }

  function evRow(o, focused) {
    if (o.add) return '<div class="ev add' + (focused ? ' cfocus' : '') + '"><div class="ev-time">＋</div><div class="ev-main"><b>이 날에 일정 추가</b></div></div>';
    return '<div class="ev' + (focused ? ' cfocus' : '') + '" style="--evc:' + esc(o.color) + '"><div class="ev-time">' +
      (o.allDay ? '종일' : fmtTime(o.start)) + '</div><div class="ev-main"><b>' + esc(o.title) + '</b><span>' + esc(o.src) +
      (o.owner !== 'family' ? ' · ' + esc(ownerName(o.owner)) : '') + '</span></div></div>';
  }
  function renderCal() {
    var head = cal.zone === 'head';
    $('calTabs').innerHTML = CAL_HEAD.map(function (t, i) {
      return '<span class="' + (i < 3 ? 'ctab' : 'cbtn') + (cal.mode === t[0] ? ' cur' : '') + (head && cal.hi === i ? ' cfocus' : '') + '">' + t[1] + '</span>';
    }).join('');
    var subs = calData().subs.filter(function (x) { return visibleOwner(x.owner); });
    var errs = subs.filter(function (x) { return calFeeds[x.id] && !calFeeds[x.id].ok && !calFeeds[x.id].busy; });
    $('calSync').textContent = subs.length ? (errs.length ? '구독 ' + errs.length + '개를 불러오지 못했어요' : '구독 캘린더 ' + subs.length + '개') : '';
    var body = $('calBody'), html = '', bodyFocus = !head;
    if (cal.mode === 'day') {
      var items = dayItems();
      cal.idx = Math.max(0, Math.min(items.length - 1, cal.idx));
      html = '<div class="cal-day"><h3>' + fmtDay(cal.day) + ' <small>' + relDay(cal.day) + '</small></h3>' +
        (items.length === 1 ? '<p class="cal-empty">일정이 없어요</p>' : '') +
        '<div class="ev-list">' + items.map(function (o, i) { return evRow(o, bodyFocus && i === cal.idx); }).join('') + '</div></div>';
    } else if (cal.mode === 'week') {
      var w0 = addDays(cal.day, -cal.day.getDay());
      html = '<div class="cal-week">';
      for (var i = 0; i < 7; i++) {
        var d = addDays(w0, i), evs = eventsOn(d);
        html += '<div class="wk' + (dayKey(d) === dayKey(new Date()) ? ' today' : '') + (bodyFocus && dayKey(d) === dayKey(cal.day) ? ' cfocus' : '') + '"><h4>' + DOW[d.getDay()] + ' <b>' + d.getDate() + '</b></h4>' +
          evs.slice(0, 6).map(function (o) { return '<div class="chip" style="--evc:' + esc(o.color) + '">' + (o.allDay ? '' : '<i>' + pad2(o.start.getHours()) + ':' + pad2(o.start.getMinutes()) + '</i>') + esc(o.title) + '</div>'; }).join('') +
          (evs.length > 6 ? '<div class="more">+' + (evs.length - 6) + '</div>' : '') + '</div>';
      }
      html += '</div>';
    } else {
      var g0 = gridStart(cal.day);
      html = '<div class="cal-month"><div class="mgrid"><div class="mtitle">' + cal.day.getFullYear() + '년 ' + (cal.day.getMonth() + 1) + '월</div>' +
        DOW.map(function (x) { return '<div class="dow">' + x + '</div>'; }).join('');
      for (var j = 0; j < 42; j++) {
        var dd = addDays(g0, j), n = eventsOn(dd).length;
        html += '<div class="mday' + (dd.getMonth() !== cal.day.getMonth() ? ' out' : '') + (dayKey(dd) === dayKey(new Date()) ? ' today' : '') +
          (bodyFocus && dayKey(dd) === dayKey(cal.day) ? ' cfocus' : '') + '">' + dd.getDate() + (n ? '<i>' + (n > 3 ? '•••' : new Array(n + 1).join('•')) + '</i>' : '') + '</div>';
      }
      var dl = eventsOn(cal.day);
      html += '</div><div class="magenda"><h3>' + fmtDay(cal.day) + ' <small>' + relDay(cal.day) + '</small></h3>' +
        (dl.length ? '<div class="ev-list">' + dl.map(function (o) { return evRow(o, false); }).join('') + '</div>' : '<p class="cal-empty">일정이 없어요</p>') + '</div></div>';
    }
    body.innerHTML = html;
    var f = body.querySelector('.ev.cfocus');
    if (f) {
      var lst = f.parentNode, lr = lst.getBoundingClientRect(), fr = f.getBoundingClientRect();
      if (fr.bottom > lr.bottom) lst.scrollTop += fr.bottom - lr.bottom + 8; else if (fr.top < lr.top) lst.scrollTop -= lr.top - fr.top + 8;
    }
    var hints = head ? [['◀ ▶', '이동'], ['OK', '선택'], ['▼', '달력으로'], ['뒤로', '닫기']]
      : cal.mode === 'month' ? [['방향키', '날짜 이동'], ['OK', '그날 보기'], ['▲', '위 메뉴'], ['뒤로', '닫기']]
      : cal.mode === 'week' ? [['◀ ▶', '날짜 이동'], ['OK', '그날 보기'], ['▲', '위 메뉴'], ['뒤로', cal.prevMode ? '돌아가기' : '닫기']]
      : [['▲ ▼', '일정 이동'], ['◀ ▶', '다른 날'], ['OK', '열기'], ['뒤로', cal.prevMode ? '돌아가기' : '닫기']];
    $('calHint').innerHTML = hints.map(function (h) { return '<span><kbd>' + h[0] + '</kbd>' + h[1] + '</span>'; }).join('');
  }
  function calKey(k) {
    if (k === 'back') {
      if (cal.zone === 'head') cal.zone = 'body';
      else if (cal.prevMode) { cal.mode = cal.prevMode; cal.prevMode = null; }
      else { closeCal(); return; }
      renderCal(); return;
    }
    if (k === 'menu') { openPanel('calset'); return; }
    if (cal.zone === 'head') {
      if (k === 'left') cal.hi = Math.max(0, cal.hi - 1);
      else if (k === 'right') cal.hi = Math.min(CAL_HEAD.length - 1, cal.hi + 1);
      else if (k === 'down') cal.zone = 'body';
      else if (k === 'ok' || k === 'longok') {
        var item = CAL_HEAD[cal.hi][0];
        if (item === 'add') { openEventEditor(null); return; }
        if (item === 'set') { openPanel('calset'); return; }
        cal.mode = item; cal.prevMode = null; cal.idx = 0; cal.zone = 'body';
      }
      renderCal(); return;
    }
    var toHead = function () { cal.zone = 'head'; cal.hi = Math.max(0, ['day', 'week', 'month'].indexOf(cal.mode)); };
    if (cal.mode === 'month') {
      var row = Math.floor((startOfDay(cal.day) - gridStart(cal.day)) / 86400000 / 7);
      if (k === 'up' && row === 0) toHead();
      else if (k === 'left' || k === 'right' || k === 'up' || k === 'down') cal.day = addDays(cal.day, k === 'left' ? -1 : k === 'right' ? 1 : k === 'up' ? -7 : 7);
      else if (k === 'ok') { cal.prevMode = 'month'; cal.mode = 'day'; cal.idx = 0; }
      else if (k === 'longok') { openEventEditor(null); return; }
    } else if (cal.mode === 'week') {
      if (k === 'up') toHead();
      else if (k === 'left' || k === 'right') cal.day = addDays(cal.day, k === 'left' ? -1 : 1);
      else if (k === 'ok') { cal.prevMode = 'week'; cal.mode = 'day'; cal.idx = 0; }
      else if (k === 'longok') { openEventEditor(null); return; }
    } else {
      var items = dayItems();
      if (k === 'up') { if (cal.idx === 0) toHead(); else cal.idx--; }
      else if (k === 'down') cal.idx = Math.min(items.length - 1, cal.idx + 1);
      else if (k === 'left' || k === 'right') { cal.day = addDays(cal.day, k === 'left' ? -1 : 1); cal.idx = 0; }
      else if (k === 'ok' || k === 'longok') {
        var it = items[cal.idx];
        if (it.add) openEventEditor(null); else openEventEditor(it);
        return;
      }
    }
    renderCal();
  }

  // --- adding / editing an event on the TV ---
  var textAsks = {}, textSeq = 0;
  function askText(title, initial, cb) {
    var id = 't' + (++textSeq);
    textAsks[id] = cb;
    if (N && N.askText) N.askText(id, title, initial || '');
    else setTimeout(function () { window.Cove.textResult(id, window.prompt(title, initial || '')); }, 0);
  }
  function textResult(id, text) { var cb = textAsks[id]; delete textAsks[id]; if (cb) cb(text); }

  // 30-minute steps; null = all day
  var TIME_STEPS = [null];
  for (var ts = 0; ts < 48; ts++) TIME_STEPS.push({ h: Math.floor(ts / 2), m: ts % 2 ? 30 : 0 });
  function timeLabel(t) { return t ? fmtTime(new Date(2000, 0, 1, t.h, t.m)) : '종일'; }
  function stepTime(t, d) {
    var i = 0;
    TIME_STEPS.forEach(function (x, k) { if (x && t && x.h === t.h && x.m === t.m) i = k; });
    return TIME_STEPS[(i + d + TIME_STEPS.length) % TIME_STEPS.length];
  }
  function ownerList() { return ['family'].concat(ROOT.profiles.map(function (p) { return p.id; })); }

  // o = an occurrence (edit / view) or null (new event on the focused day)
  function openEventEditor(o) {
    if (o && !o.id) { openPanel('calev', { draft: { view: o } }); return; }   // subscribed event: details only
    gate('self', o ? '일정 수정' : '일정 추가', function () {
      var now = new Date(), day = cal.day || startOfDay(now);
      var draft = o ? { id: o.id, title: o.title, day: startOfDay(o.start), time: o.allDay ? null : { h: o.start.getHours(), m: o.start.getMinutes() }, owner: o.owner }
        : { title: '', day: day, time: dayKey(day) === dayKey(now) ? { h: Math.min(23, now.getHours() + 1), m: 0 } : { h: 10, m: 0 }, owner: ROOT.current };
      openPanel('calev', { draft: draft });
      if (!o) askText('일정 제목', '', function (txt) { if (txt !== null && panel && panel.draft === draft) { draft.title = txt.trim(); panel.i = 4; renderPanel(); } });
    });
  }
  function eventRows() {
    var d = panel.draft;
    if (d.view) {
      var v = d.view;
      return [
        { name: v.title, sub: relDay(v.start) + ' · ' + (v.allDay ? '종일' : fmtTime(v.start)) },
        { name: '캘린더', val: v.src },
        { name: '닫기', action: true, act: closePanel }
      ];
    }
    var rows = [
      { name: '제목', sub: 'OK를 누르면 TV 키보드가 열려요 (마이크로 말해도 돼요)', val: d.title || '입력하기', action: true,
        act: function () { askText('일정 제목', d.title, function (txt) { if (txt !== null) { d.title = txt.trim(); renderPanel(); } }); } },
      { name: '날짜', val: fmtDay(d.day), change: function (k) { d.day = addDays(d.day, k); renderPanel(); } },
      { name: '시간', val: timeLabel(d.time), change: function (k) { d.time = stepTime(d.time, k); renderPanel(); } },
      { name: '누구 일정', sub: d.owner === 'family' ? '모든 프로필에 보여요' : ownerName(d.owner) + ' 프로필에서만 보여요',
        val: d.owner === 'family' ? '가족 모두 (공용)' : ownerName(d.owner) + ' (개인)', change: function (k) { var l = ownerList(); d.owner = l[(l.indexOf(d.owner) + k + l.length) % l.length]; renderPanel(); } },
      { name: d.id ? '저장' : '추가', sub: d.title ? relDay(d.day) + ' ' + (d.time ? timeLabel(d.time) + ' ' : '') + d.title : '먼저 제목을 넣어 주세요', action: true,
        act: function () {
          if (!d.title) { toast('제목을 넣어 주세요'); panel.i = 0; renderPanel(); return; }
          var start = d.time ? dayKey(d.day) + 'T' + pad2(d.time.h) + ':' + pad2(d.time.m) : dayKey(d.day);
          var data = calData();
          if (d.id) {
            data.events.forEach(function (e) { if (e.id === d.id) { e.title = d.title.slice(0, 80); e.start = start; e.allDay = !d.time; e.owner = d.owner; } });
            savePrefs(); toast('일정을 고쳤어요');
          } else {
            calCmd(JSON.stringify({ op: 'add', title: d.title, start: start, allDay: !d.time, owner: d.owner }));
          }
          closePanelQuiet();
          cal.day = d.day; cal.mode = cal.mode || 'day'; cal.zone = 'body';
          showNextEvent();
          if (base === 'cal') renderCal();
        } }
    ];
    if (d.id) rows.push({ name: '삭제', danger: true, action: true, val: armed === 'delev' ? '한 번 더 누르면 삭제' : '',
      act: function () { twice('delev', function () { calCmd(JSON.stringify({ op: 'del', id: d.id })); closePanelQuiet(); if (base === 'cal') renderCal(); }); } });
    rows.push({ name: '취소', action: true, act: closePanel });
    return rows;
  }

  // Calendar settings panel (subscriptions + preview), opened with OK held on the calendar screen.
  function calRows() {
    var rows = calData().subs.map(function (s) {
      var f = calFeeds[s.id] || {};
      var status = f.busy ? '불러오는 중' : f.ok ? (f.series ? f.series.length + '개 일정' : '연결됨') : (f.error ? '오류: ' + f.error : '대기 중');
      return { name: s.name, dot: s.color, sub: ownerName(s.owner) + ' · ' + status, val: armed === 'unsub' + s.id ? '한 번 더 누르면 삭제' : '삭제', danger: true, action: true,
        act: function () { gate('self', '캘린더 삭제', function () { twice('unsub' + s.id, function () { calCmd(JSON.stringify({ op: 'unsub', id: s.id })); renderPanel(); }); }); } };
    });
    rows.push({ name: '지금 다시 불러오기', action: true, act: function () { syncCalendars(true); toast('구독 캘린더를 다시 불러와요'); } });
    rows.push({ name: '홈 화면에 다음 일정', sub: '시계 아래에 오늘·내일 일정을 한 줄로', val: P.calPreview !== false ? '표시' : '숨김', change: function () { set({ calPreview: P.calPreview === false }); } });
    return rows;
  }

  // ---------- screensaver / idle screen ----------
  var AMB_PHOTOS = [['all', '배경 사진 모두'], ['mine', '내 사진만'], ['current', '지금 배경']];
  var AMB_INTERVALS = [[15, '15초'], [30, '30초'], [60, '1분'], [300, '5분']];
  var AMB_IDLE = [[0, '끄기'], [5, '5분'], [10, '10분'], [30, '30분']];
  var ambient = null, lastInput = Date.now();
  function ambSettings() {
    if (!ROOT.ambient) ROOT.ambient = { photos: 'all', interval: 30, info: true, side: true, idle: 10 };
    return ROOT.ambient;
  }
  function ambImages() {
    var a = ambSettings(), photos = PHOTOS.map(function (id) { return '/photo/' + id + '.jpg'; });
    var walls = PRESETS.map(function (p) { return 'bg/' + p[0] + '.jpg'; });
    if (a.photos === 'mine' && photos.length) return photos;
    if (a.photos === 'current') { var u = bgUrl(activeBg()); if (u) return [u]; }
    return walls.concat(photos);
  }
  function snapshot() {
    var a = ambSettings(), w = null, c = cityOf(P.weather);
    if (c && wx.data && wx.city === P.weather) {
      var cur = wx.data.current || {}, day = wx.data.daily || {};
      w = { temp: cur.temp_2m !== undefined ? cur.temp_2m : cur.temperature_2m, text: wxText(cur.weather_code), city: c[1],
        hi: day.temperature_2m_max ? day.temperature_2m_max[0] : null, lo: day.temperature_2m_min ? day.temperature_2m_min[0] : null };
    }
    var now = new Date();
    var agenda = occurrences(startOfDay(now), addDays(startOfDay(now), 8)).map(function (o) { return { start: o.start.toISOString(), allDay: o.allDay, title: o.title, color: o.color }; });
    return { clock: P.clock === 'off' ? '24' : P.clock, images: ambImages(), interval: a.interval, info: a.info, side: a.side,
      weather: w, agenda: agenda.slice(0, 20), memos: activeMemos().map(function (m) { return { text: m.text, color: m.color }; }), at: Date.now() };
  }
  var snapTimer = null;
  function saveSnapshot() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(function () {
      var s = JSON.stringify(snapshot());
      try { if (N && N.saveSnapshot) N.saveSnapshot(s); else localStorage.setItem('cove.snapshot', s); } catch (e) {}
    }, 1500);
  }
  function showAmbient() {
    if (ambient) return;
    closePanelQuiet();
    $('ambient').hidden = false;
    ambient = window.CoveAmbient.create($('ambient'), snapshot);
    ambient.start();
  }
  // Any key (or a phone command) wakes the home screen; the key itself is not used.
  function wake() {
    lastInput = Date.now();
    if (!ambient) return false;
    ambient.stop(); ambient = null;
    $('ambient').hidden = true;
    return true;
  }
  function idleCheck() {
    var mins = ambSettings().idle;
    if (!mins || ambient || base !== 'home' || panel || pinState || moving || document.hidden) return;
    if (Date.now() - lastInput > mins * 60000) showAmbient();
  }
  function ambientRows() {
    var a = ambSettings();
    var ch = function (key, list) { return function (d) { a[key] = cycle(list, a[key], d); if (key === 'interval' || key === 'idle') a[key] = +a[key]; savePrefs(); saveSnapshot(); renderPanel(); }; };
    return [
      { name: '지금 보기', sub: '아무 버튼이나 누르면 돌아와요', action: true, act: function () { closePanelQuiet(); showAmbient(); } },
      { name: '사진', val: labelOf(AMB_PHOTOS, a.photos), change: ch('photos', AMB_PHOTOS) },
      { name: '넘김 간격', val: labelOf(AMB_INTERVALS, a.interval), change: ch('interval', AMB_INTERVALS) },
      { name: '시계·날씨', val: a.info ? '표시' : '숨김', change: function () { a.info = !a.info; savePrefs(); saveSnapshot(); renderPanel(); } },
      { name: '일정·메모', val: a.side ? '표시' : '숨김', change: function () { a.side = !a.side; savePrefs(); saveSnapshot(); renderPanel(); } },
      { name: 'Cove 대기 화면', sub: 'Cove 홈을 그대로 두면 이 화면으로 바뀌어요', val: labelOf(AMB_IDLE, a.idle), change: ch('idle', AMB_IDLE) },
      { name: 'TV 화면 보호기로 쓰기', sub: '다른 앱을 쓰다 TV가 쉴 때도 나와요 · 마스터', action: true,
        act: function () { gate('admin', '화면 보호기 설정', function () { if (N) N.openDreamSettings(); toast('화면 보호기 목록에서 Cove를 골라 주세요. 목록이 없으면 아래 안내를 봐 주세요'); }); } }
    ];
  }

  // ---------- memo board ----------
  // A memo is written by one profile, shown to the family or one profile, from a date, for a while.
  var MEMO_COLORS = ['#ffe58a', '#ffb3c1', '#b5e8c9', '#b9d4ff', '#e2c9ff'];
  var MEMO_DAYS = [[0, '지울 때까지'], [1, '그날 하루'], [3, '3일'], [7, '1주일'], [30, '한 달']];
  var memoSel = 0;
  function memos() {
    if (!Array.isArray(ROOT.memos)) ROOT.memos = [];
    var old = dayKey(addDays(new Date(), -7));
    for (var i = ROOT.memos.length - 1; i >= 0; i--) {   // tidy up a week after they end (in place: callers keep the same list)
      if (ROOT.memos[i].until && ROOT.memos[i].until < old) ROOT.memos.splice(i, 1);
    }
    ROOT.memos.forEach(function (m) {
      if (!m.to) m.to = 'family';
      if (!m.from) m.from = dayKey(new Date(m.at || Date.now()));
      if (m.by && !profileById(m.by)) { m.byName = m.byName || m.by; m.by = null; }
    });
    return ROOT.memos;
  }
  function memoVisible(m) {
    var today = dayKey(new Date());
    return (m.to === 'family' || m.to === ROOT.current) && m.from <= today && (!m.until || m.until >= today);
  }
  function activeMemos() { return memos().filter(memoVisible); }
  // The board also lists what this profile sent (scheduled, for someone else, or ended).
  function boardMemos() { return memos().filter(function (m) { return memoVisible(m) || m.by === ROOT.current; }); }
  function memoAuthor(m) { var p = m.by && profileById(m.by); return p ? p.name : (m.byName || ''); }
  function memoTo(m) { return m.to === 'family' ? '가족' : ownerName(m.to); }
  function untilFor(fromKey, days) { if (!days) return null; var f = new Date(fromKey + 'T00:00'); return dayKey(addDays(f, days - 1)); }
  function memoStatus(m) {
    var today = dayKey(new Date()), md = function (k) { var p = k.split('-'); return +p[1] + '/' + +p[2]; };
    if (m.from > today) return md(m.from) + '부터';
    if (m.until && m.until < today) return '끝남';
    return m.until ? md(m.until) + '까지' : '';
  }
  function addMemo(text, opts) {
    opts = opts || {};
    text = String(text || '').trim().slice(0, 200);
    if (!text) return;
    var from = opts.from || dayKey(new Date());
    memos().unshift({ id: 'm' + Date.now().toString(36), text: text, color: opts.color || MEMO_COLORS[memos().length % MEMO_COLORS.length], at: Date.now(),
      by: opts.by && profileById(opts.by) ? opts.by : ROOT.current, to: opts.to && (opts.to === 'family' || profileById(opts.to)) ? opts.to : 'family',
      from: from, until: opts.until || untilFor(from, opts.days) });
    savePrefs(); saveSnapshot(); showMemoLine();
    if (base === 'memo') renderMemo();
    var m = memos()[0];
    toast('메모를 붙였어요' + (m.to !== 'family' ? ' · ' + memoTo(m) + '에게' : '') + (memoStatus(m) ? ' · ' + memoStatus(m) : ''));
  }
  function removeMemo(id) {
    ROOT.memos = memos().filter(function (m) { return m.id !== id; });
    savePrefs(); saveSnapshot(); showMemoLine();
    if (base === 'memo') renderMemo();
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? '방금' : m < 60 ? m + '분 전' : m < 1440 ? Math.round(m / 60) + '시간 전' : Math.round(m / 1440) + '일 전';
  }
  function showMemoLine() {
    var el = $('memoLine');
    if (!el) return;
    var list = activeMemos();
    if (!list.length || P.memoPreview === false) { el.hidden = true; return; }
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v11l-5 5H5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 20v-5h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
      '<b>메모</b><span>' + esc(list[0].text.split('\n')[0]) + (list.length > 1 ? ' 외 ' + (list.length - 1) + '개' : '') + '</span>';
    el.hidden = false;
  }
  function openMemo() {
    closePanelQuiet();
    if (base === 'drawer') $('drawer').hidden = true;
    if (focusEl) focusEl.classList.remove('focus');
    base = 'memo'; memoSel = 0;
    $('memo').hidden = false;
    renderMemo();
  }
  function closeMemo() { base = 'home'; $('memo').hidden = true; restoreFocus('home'); }
  function renderMemo() {
    var list = boardMemos();
    memoSel = Math.max(0, Math.min(list.length, memoSel));
    $('memoGrid').innerHTML = '<div class="note add' + (memoSel === 0 ? ' cfocus' : '') + '"><b>＋</b><span>메모 붙이기</span></div>' +
      list.map(function (m, i) {
        var st = memoStatus(m), dim = !memoVisible(m);
        return '<div class="note' + (memoSel === i + 1 ? ' cfocus' : '') + (dim ? ' later' : '') + '" style="--c:' + esc(m.color) + ';--r:' + ((i % 3) - 1) * 0.8 + 'deg"><p>' + esc(m.text) + '</p>' +
          '<small>' + esc(memoAuthor(m)) + ' → ' + esc(memoTo(m)) + ' · ' + (st ? st : ago(m.at)) + '</small></div>';
      }).join('');
    var f = $('memoGrid').querySelector('.cfocus');
    if (f) { var g = $('memoGrid'), gr = g.getBoundingClientRect(), fr = f.getBoundingClientRect();
      if (fr.bottom > gr.bottom) g.scrollTop += fr.bottom - gr.bottom + 20; else if (fr.top < gr.top) g.scrollTop -= gr.top - fr.top + 20; }
  }
  function memoDraft(m) {
    if (!m) return { text: '', color: MEMO_COLORS[memos().length % MEMO_COLORS.length], to: 'family', from: startOfDay(new Date()), days: 0, by: ROOT.current };
    var from = new Date(m.from + 'T00:00'), days = 0;
    if (m.until) days = Math.round((new Date(m.until + 'T00:00') - from) / 86400000) + 1;
    return { id: m.id, text: m.text, color: m.color, to: m.to, from: from, days: days, by: m.by || ROOT.current };
  }
  function memoKey(k) {
    var n = boardMemos().length + 1, cols = 4;
    if (k === 'back') { closeMemo(); return; }
    if (k === 'left') memoSel = Math.max(0, memoSel - 1);
    else if (k === 'right') memoSel = Math.min(n - 1, memoSel + 1);
    else if (k === 'up') memoSel = Math.max(0, memoSel - cols);
    else if (k === 'down') memoSel = Math.min(n - 1, memoSel + cols);
    else if (k === 'ok' || k === 'longok') {
      if (memoSel === 0) {
        var draft = memoDraft(null);
        openPanel('memoedit', { draft: draft });
        askText('메모', '', function (txt) { if (txt !== null && panel && panel.draft === draft) { draft.text = txt.trim().slice(0, 200); panel.i = 5; renderPanel(); } });
      } else openPanel('memoedit', { draft: memoDraft(boardMemos()[memoSel - 1]) });
      return;
    }
    renderMemo();
  }
  function memoRows() {
    var d = panel.draft, tos = ['family'].concat(ROOT.profiles.map(function (p) { return p.id; }));
    var dayNames = MEMO_DAYS;
    var rows = [
      { name: '내용', sub: d.text || 'OK를 누르면 TV 키보드가 열려요', val: d.text ? '고치기' : '쓰기', action: true,
        act: function () { askText('메모', d.text, function (txt) { if (txt !== null) { d.text = txt.trim().slice(0, 200); renderPanel(); } }); } },
      { name: '받는 사람', sub: d.to === 'family' ? '모든 프로필에 보여요' : memoTo(d) + ' 프로필에만 보여요', val: d.to === 'family' ? '가족 모두' : memoTo(d),
        change: function (k) { d.to = tos[(tos.indexOf(d.to) + k + tos.length) % tos.length]; renderPanel(); } },
      { name: '보이는 날', val: fmtDay(d.from) + ' · ' + relDay(d.from), change: function (k) { var nd = addDays(d.from, k); if (nd >= startOfDay(new Date()) || d.id) d.from = nd; renderPanel(); } },
      { name: '보이는 기간', val: labelOf(dayNames, d.days), change: function (k) { d.days = +cycle(dayNames, d.days, k); renderPanel(); } },
      { name: '색', dot: d.color, val: '', change: function (k) { d.color = MEMO_COLORS[(MEMO_COLORS.indexOf(d.color) + k + MEMO_COLORS.length) % MEMO_COLORS.length]; renderPanel(); } },
      { name: d.id ? '저장' : '붙이기', sub: d.text ? (current().name + ' → ' + (d.to === 'family' ? '가족' : memoTo(d)) + ' · ' + relDay(d.from) + (d.days ? '부터 ' + labelOf(dayNames, d.days) : '부터')) : '먼저 내용을 써 주세요', action: true,
        act: function () {
          if (!d.text) { toast('메모 내용을 써 주세요'); panel.i = 0; renderPanel(); return; }
          var from = dayKey(d.from);
          if (d.id) {
            memos().forEach(function (m) { if (m.id === d.id) { m.text = d.text; m.to = d.to; m.from = from; m.until = untilFor(from, d.days); m.color = d.color; } });
            savePrefs(); saveSnapshot(); showMemoLine(); toast('메모를 고쳤어요');
          } else addMemo(d.text, { color: d.color, to: d.to, from: from, days: d.days });
          closePanelQuiet();
          if (base === 'memo') renderMemo();
        } }
    ];
    if (d.id) rows.push({ name: '떼기', danger: true, action: true, val: armed === 'delmemo' ? '한 번 더 누르면 삭제' : '', act: function () { twice('delmemo', function () { removeMemo(d.id); closePanelQuiet(); if (base === 'memo') renderMemo(); }); } });
    rows.push({ name: '취소', action: true, act: closePanel });
    return rows;
  }

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }

  // ---------- keys ----------
  function key(k) {
    if (wake()) return;
    if (pinState) { pinKey(k); return; }
    // An OK that would open an app right after a PIN / profile switch is a stray "confirm" press;
    // a second OK within 0.3 s is a doubled signal. Menus and panels are not affected.
    if ((k === 'ok' || k === 'longok') && !panel && (base === 'home' || base === 'drawer') && focusEl && focusEl.getAttribute('data-pkg')) {
      var t0 = Date.now();
      if (t0 < okGuardUntil || t0 - lastOkAt < 300) return;
      lastOkAt = t0;
    }
    if (k.charAt(0) === 'n' && k.length === 2) return;   // number keys only matter on the PIN pad
    if (panel) { panelKey(k); return; }
    if (base === 'cal') { calKey(k); return; }
    if (base === 'memo') { memoKey(k); return; }
    if (moving) {
      if (k === 'ok' || k === 'back' || k === 'longok') endMove();
      else if (['up', 'down', 'left', 'right'].indexOf(k) >= 0) shiftMoving(k);
      return;
    }
    var pkg = focusEl && focusEl.getAttribute('data-pkg');
    if (base === 'drawer') {
      if (k === 'back') closeDrawer();
      else if (k === 'ok') { if (pkg) launch(pkg); }
      else if (k === 'longok' || k === 'menu') { if (pkg) openPanel('app', { pkg: pkg }); }
      else move(k);
      return;
    }
    if (k === 'menu') { openPanel('look'); return; }
    if (k === 'back') { var first = document.querySelector('#tiles .tile'); if (first) setFocus(first); return; }
    if (k === 'longok') { if (pkg) openPanel('app', { pkg: pkg }); return; }
    if (k === 'ok') {
      if (pkg) { launch(pkg); return; }
      var colId = focusEl && focusEl.getAttribute('data-col');
      if (colId === 'all') { openDrawer(); return; }
      if (colId) { var firstT = P.layout === 'column' ? ($('colGrid') && $('colGrid').querySelector('.tile')) : $('tiles').querySelector('.tile'); if (firstT) setFocus(firstT); return; }
      var act = focusEl && focusEl.getAttribute('data-act');
      if (act === 'drawer') openDrawer(); else if (act === 'calendar') openCal('month'); else if (act === 'memo') openMemo(); else if (act) openPanel(act);
      return;
    }
    move(k);
  }

  // ---------- voice / typed commands from the phone ----------
  // Simple keyword rules, all on the TV. Korean app names are mapped to the English words in app labels.
  var ALIAS = [
    ['넷플릭스', 'netflix'], ['유튜브', 'youtube'], ['뮤직', 'music'], ['키즈', 'kids'], ['디즈니', 'disney'], ['프라임', 'prime'],
    ['비디오', 'video'], ['스포티파이', 'spotify'], ['애플', 'apple'], ['티빙', 'tving'], ['웨이브', 'wavve'], ['쿠팡', 'coupang'],
    ['왓챠', 'watcha'], ['트위치', 'twitch'], ['플렉스', 'plex'], ['맥스', 'max'], ['구글', 'google'], ['플레이', 'play'],
    ['스토어', 'store'], ['크롬', 'chrome'], ['티비', 'tv'], ['라이브', 'live'], ['파라마운트', 'paramount'], ['훌루', 'hulu']
  ];
  function norm(s) { return String(s).toLowerCase().replace(/[\s.,!?~'"·:;()+&\-]/g, ''); }
  function has(t, words) { for (var i = 0; i < words.length; i++) if (t.indexOf(words[i]) >= 0) return true; return false; }

  function findApp(t) {
    var en = t;
    ALIAS.forEach(function (a) { en = en.split(a[0]).join(a[1]); });
    // Whole name first ("youtube music" beats "youtube"), then the first word of a name ("prime" for "Prime Video").
    var best = null, len = 0;
    APPS.forEach(function (a) {
      var l = norm(a.label);
      if (l.length >= 2 && (en.indexOf(l) >= 0 || t.indexOf(l) >= 0) && l.length > len) { best = a; len = l.length; }
    });
    if (best) return best;
    APPS.forEach(function (a) {
      var w = norm(String(a.label).split(/\s+/)[0]);
      if (w.length >= 3 && (en.indexOf(w) >= 0 || t.indexOf(w) >= 0) && w.length > len) { best = a; len = w.length; }
    });
    return best;
  }

  // "내일 오후 3시", "다음 주 금요일 7시 반", "11월 20일", "오늘 저녁 8시" -> {day, time, rest}
  function parseWhen(raw) {
    var t = ' ' + raw + ' ', now = new Date(), day = null, time = null, m;
    var cut = function (re) { t = t.replace(re, ' '); };
    var rel = { '오늘': 0, '내일': 1, '모레': 2, '글피': 3 };
    if ((m = /(오늘|내일|모레|글피)/.exec(t))) { day = addDays(startOfDay(now), rel[m[1]]); cut(m[0]); }
    if (!day && (m = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(t))) {
      day = new Date(now.getFullYear(), +m[1] - 1, +m[2]);
      if (day < addDays(startOfDay(now), -30)) day = new Date(now.getFullYear() + 1, +m[1] - 1, +m[2]);
      cut(m[0]);
    }
    if (!day && (m = /(이번\s*주|다음\s*주|다다음\s*주)?\s*([월화수목금토일])요일/.exec(t))) {
      var target = '일월화수목금토'.indexOf(m[2]), today0 = startOfDay(now);
      if (m[1]) {
        var wk = /다다음/.test(m[1]) ? 2 : /다음/.test(m[1]) ? 1 : 0;
        day = addDays(today0, wk * 7 - today0.getDay() + target);
      } else day = addDays(today0, (target - today0.getDay() + 7) % 7);
      cut(m[0]);
    }
    if (!day && (m = /(\d{1,2})\s*일(?![요정])/.exec(t))) {
      day = new Date(now.getFullYear(), now.getMonth(), +m[1]);
      if (day < startOfDay(now)) day = new Date(now.getFullYear(), now.getMonth() + 1, +m[1]);
      cut(m[0]);
    }
    if ((m = /(오전|오후|아침|낮|저녁|밤|새벽)?\s*(\d{1,2})\s*시\s*(반|(\d{1,2})\s*분)?/.exec(t))) {
      // a time-of-day word anywhere counts: "7시 가족 저녁" is 7 in the evening
      var h = +m[2], mi = m[3] === '반' ? 30 : m[4] ? +m[4] : 0,
        q = m[1] || (/(오후|저녁|밤)/.test(raw) ? '오후' : /(오전|아침|새벽)/.test(raw) ? '오전' : '');
      if (/오후|저녁|밤/.test(q) && h < 12) h += 12;
      else if (/낮/.test(q) && h < 6) h += 12;
      else if (!q && h >= 1 && h <= 6) h += 12;     // "3시 치과" usually means the afternoon
      if (/오전|아침|새벽/.test(q) && h === 12) h = 0;
      time = { h: h % 24, m: mi };
      cut(m[0]);
    } else if ((m = /(\d{1,2}):(\d{2})/.exec(t))) { time = { h: +m[1], m: +m[2] }; cut(m[0]); }
    else if (/정오/.test(t)) { time = { h: 12, m: 0 }; cut(/정오/); }
    return { day: day, time: time, rest: t };
  }

  function say(text) {
    wake();
    var raw = String(text || '').trim();
    var t = norm(raw);
    if (!t) return;
    if (pinState) { raw.replace(/\D/g, '').split('').forEach(pinPress); return; }
    var done = function (msg) { toast('🎙 "' + raw + '" → ' + msg); };

    // row rename: "줄 이름을 영화로 바꿔" (the row of the focused app)
    var mc = raw.match(/(?:줄|카테고리)\s*이름(?:을|를)?\s*(.+?)\s*(?:으로|로)\s*(?:바꿔|변경|해)/);
    if (mc) { var fp = focusEl && focusEl.getAttribute('data-pkg'); renameCat(fp ? catOf(fp) : P.cats[0].id, mc[1]); return; }
    if (has(t, ['줄추가', '카테고리추가', '새줄', '새카테고리'])) { addCat(); return; }
    if (has(t, ['최근실행'])) { set({ recentRow: !has(t, ['숨', '꺼', '빼']) }); done('최근 실행 줄 ' + (P.recentRow ? '표시' : '숨김')); return; }

    // profile rename: "이름을 민수로 바꿔"
    var m = raw.match(/이름(?:을|를)?\s*(.+?)\s*(?:으로|로)\s*(?:바꿔|변경|해)/);
    if (m) { renameProfile(m[1]); return; }

    // profiles by name
    for (var i = 0; i < ROOT.profiles.length; i++) {
      var pn = norm(ROOT.profiles[i].name);
      if (pn && t.indexOf(pn) >= 0 && (has(t, ['프로필', '모드']) || t === pn)) { switchProfile(ROOT.profiles[i].id, true); done(ROOT.profiles[i].name + ' 프로필'); return; }
    }
    if (has(t, ['새프로필', '프로필추가', '프로필만들'])) { addProfile(); return; }

    // screens
    if (has(t, ['모든앱', '전체앱', '앱목록'])) { openDrawer(); done('모든 앱'); return; }
    if (has(t, ['꾸미기'])) { openPanel('look'); done('꾸미기'); return; }
    if (has(t, ['프로필'])) { openPanel('profiles'); done('프로필'); return; }
    if (has(t, ['업데이트'])) { openPanel('settings'); if (N) { update = { phase: 'checking' }; renderPanel(); N.checkUpdate(); } done('업데이트 확인'); return; }
    if (has(t, ['닫아', '닫기', '홈으로', '처음화면'])) { window.Cove.home(); done('홈'); return; }

    // memos: "메모 남겨 6시에 저녁 먹자", "메모 보여줘"
    if (has(t, ['메모', '쪽지'])) {
      var to = 'family', mt;
      if ((mt = /(\S+?)\s*(에게|한테)/.exec(raw))) {
        ROOT.profiles.forEach(function (pr) { if (norm(pr.name) === norm(mt[1])) to = pr.id; });
        if (to !== 'family' || /가족|모두/.test(mt[1])) raw = raw.replace(mt[0], ' ');
      }
      var mw = /(오늘|내일|모레|글피|[월화수목금토일]요일|\d{1,2}\s*월\s*\d{1,2}\s*일)/.test(raw) ? parseWhen(raw) : { day: null };
      var body = raw.replace(/(메모|쪽지)(를|을|에)?/g, ' ').replace(/(남겨|추가|붙여|써|적어|등록)\s*(줘|주세요|해\s*줘|해)?/g, ' ');
      if (mw.day) body = body.replace(/(오늘|내일|모레|글피|(이번\s*주|다음\s*주)?\s*[월화수목금토일]요일|\d{1,2}\s*월\s*\d{1,2}\s*일)(에|부터)?/, ' ');
      body = body.replace(/\s+/g, ' ').trim();
      if (body && !/^(보여|열어|확인|봐)/.test(body)) { addMemo(body, { to: to, from: mw.day ? dayKey(mw.day) : null }); return; }
      openMemo(); done('메모'); return;
    }
    if (has(t, ['화면보호기', '대기화면', '액자'])) { showAmbient(); return; }

    // calendar: "오늘 일정", "이번 주 스케줄 보여줘", "내일 오후 3시 치과 추가", "금요일 7시 가족 저녁 등록"
    var addWord = has(t, ['추가', '등록', '잡아', '넣어', '기억해']);
    var calWord = has(t, ['일정', '스케줄', '캘린더', '달력', '약속']);
    var when = parseWhen(raw);
    if (addWord && (when.day || when.time) && !findApp(t)) {
      if (blocked('self', '일정 추가', function () { say(raw); })) return;
      var d0 = when.day || startOfDay(new Date());
      var title = when.rest.replace(/(일정|스케줄|캘린더|달력)(을|를|에)?/g, ' ')
        .replace(/(추가|등록|기억)\s*(해\s*줘|해\s*주세요|해|하기)?|잡아\s*줘|잡아|넣어\s*줘|넣어/g, ' ')
        .replace(/\s+(에|은|는|을|를|이|가)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
      // personal unless the family is mentioned ("가족 저녁", "우리 여행", "모두")
      var owner = /(가족|우리|모두|다\s*같이|공용)/.test(raw) ? 'family' : ROOT.current;
      title = title.replace(/^(내\s*)/, '').trim() || '일정';
      var start = when.time ? new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), when.time.h, when.time.m) : d0;
      var ev = { op: 'add', title: title, start: when.time ? dayKey(start) + 'T' + pad2(start.getHours()) + ':' + pad2(start.getMinutes()) : dayKey(start), allDay: !when.time, owner: owner };
      calCmd(JSON.stringify(ev));
      openCal('day', d0);
      return;
    }
    if (calWord) {
      var mode = has(t, ['이번주', '주간', '일주일']) ? 'week' : has(t, ['이번달', '한달', '월간', '달력']) ? 'month' : 'day';
      if (has(t, ['다음주']) && !when.day) { openCal('week', addDays(new Date(), 7)); done('다음 주 일정'); return; }
      openCal(mode, when.day || new Date());
      done(mode === 'week' ? '이번 주 일정' : mode === 'month' ? '이번 달 일정' : relDay(when.day || new Date()) + ' 일정');
      return;
    }

    // designs
    if (has(t, ['시어터', '씨어터', '극장', 'theater'])) { applyDesign('theater'); done('Theater 디자인'); return; }
    if (has(t, ['칼럼', '컬럼', 'column', '사이드'])) { applyDesign('column'); done('Column 디자인'); return; }
    if (has(t, ['도크', 'dock', '독으로', '독디자인'])) { applyDesign('dock'); done('Dock 디자인'); return; }
    if (has(t, ['콜라주', 'collage'])) { applyDesign('collage'); done('Collage 디자인'); return; }
    if (has(t, ['글래스', 'glass', '유리'])) { applyDesign('glass'); done('Glass 디자인'); return; }
    if (has(t, ['아이콘', 'icons'])) { applyDesign('icons'); done('Icons 디자인'); return; }
    if (has(t, ['미니멀', 'minimal', '심플'])) { applyDesign('minimal'); done('Minimal 디자인'); return; }

    // background by name (wallpapers, moving, colours)
    var allBg = bgList().filter(function (x) { return x.type !== 'photo'; });
    var hit = null, hitLen = 0;
    allBg.forEach(function (x) {
      var nm = norm(bgName(x));
      if (nm.length > hitLen && (t.indexOf(nm) >= 0 || (has(t, ['배경']) && t.indexOf(nm.slice(0, 2)) >= 0 && nm.length >= 2))) { hit = x; hitLen = nm.length; }
    });
    if (!hit && has(t, ['앱색', '앱컬러'])) hit = { type: 'app', id: 'focus' };
    if (hit) { set({ bg: hit }); done(bgName(hit) + ' 배경'); return; }
    if (has(t, ['배경']) && has(t, ['이전', '전'])) { set({ bg: stepBg(P.bg, -1, false) }); done('이전 배경'); return; }
    if (has(t, ['배경'])) { set({ bg: stepBg(P.bg, 1, false) }); done('다음 배경'); return; }
    if (has(t, ['어둡게', '어둡'])) { set({ dim: Math.min(3, P.dim + 1) }); done('배경 어둡게'); return; }
    if (has(t, ['밝게', '밝'])) { set({ dim: Math.max(0, P.dim - 1) }); done('배경 밝게'); return; }

    // weather: "날씨 부산", "날씨 꺼"
    if (has(t, ['날씨'])) {
      if (has(t, ['꺼', '숨', '없'])) { set({ weather: null }); done('날씨 숨김'); return; }
      var city = null;
      CITIES.forEach(function (c) { if (t.indexOf(c[1]) >= 0) city = c; });
      if (city) { set({ weather: city[0] }); refreshWeather(true); done(city[1] + ' 날씨'); return; }
      if (!P.weather) { set({ weather: 'seoul' }); refreshWeather(true); done('서울 날씨'); return; }
      refreshWeather(true); done('날씨 새로고침'); return;
    }

    // clock & tiles
    if (has(t, ['시계'])) {
      if (has(t, ['숨', '꺼', '없'])) set({ clock: 'off' });
      else if (has(t, ['12'])) set({ clock: '12' });
      else set({ clock: '24' });
      done('시계 ' + labelOf(CLOCKS, P.clock)); return;
    }
    for (var ti = 0; ti < TILES.length; ti++) {
      if (has(t, ['타일', '스타일']) && t.indexOf(norm(TILES[ti][1])) >= 0) { set({ tiles: TILES[ti][0] }); done('타일 ' + TILES[ti][1]); return; }
    }
    for (var si = 0; si < SHAPES.length; si++) {
      if (t.indexOf(norm(SHAPES[si][1])) >= 0 || (SHAPES[si][0] === 'circle' && has(t, ['동그랗', '동그라미']))) { set({ shape: SHAPES[si][0] }); done('타일 ' + SHAPES[si][1]); return; }
    }
    if (has(t, ['타일', '아이콘']) && has(t, ['크게', '키워'])) { set({ size: P.size === 's' ? 'm' : 'l' }); done('타일 ' + labelOf(SIZES, P.size)); return; }
    if (has(t, ['타일', '아이콘']) && has(t, ['작게', '줄여'])) { set({ size: P.size === 'l' ? 'm' : 's' }); done('타일 ' + labelOf(SIZES, P.size)); return; }
    if (has(t, ['네온', '포스터', '흑백', '그라데이션'])) {
      for (var tj = 0; tj < TILES.length; tj++) if (t.indexOf(norm(TILES[tj][1])) >= 0) { set({ tiles: TILES[tj][0] }); done('타일 ' + TILES[tj][1]); return; }
    }
    if (has(t, ['타일'])) { set({ tiles: cycle(TILES, P.tiles, 1) }); done('타일 ' + labelOf(TILES, P.tiles)); return; }

    // apps
    var app = findApp(t);
    if (app) {
      if (has(t, ['옮겨', '이동', '줄로', '줄에'])) {
        var tc = null;
        P.cats.forEach(function (c) {
          if (!c.name) return;
          var words = c.name.split(/[·\s,]+/).map(norm).filter(function (w) { return w.length >= 2; });
          if (t.indexOf(norm(c.name)) >= 0 || words.some(function (w) { return t.indexOf(w) >= 0; })) tc = c;
        });
        if (tc) { if (!onHome(app.pkg)) addToHome(app.pkg); setCat(app.pkg, tc.id); done(app.label + ' → ' + tc.name + ' 줄'); return; }
      }
      if (has(t, ['빼', '숨겨', '지워'])) { removeFromHome(app.pkg); done(app.label + ' 홈에서 빼기'); return; }
      if (has(t, ['추가', '넣어'])) { addToHome(app.pkg); done(app.label + ' 홈에 추가'); return; }
      done(app.label + ' 실행');
      launch(app.pkg);
      return;
    }

    // remote keys
    var dirs = [['위', 'up'], ['아래', 'down'], ['왼쪽', 'left'], ['오른쪽', 'right'], ['선택', 'ok'], ['확인', 'ok'], ['뒤로', 'back']];
    for (var d = 0; d < dirs.length; d++) if (t === dirs[d][0] || t === dirs[d][0] + '로') { key(dirs[d][1]); return; }
    if (has(t, ['설정'])) { openPanel('settings'); done('설정'); return; }

    toast('🎙 "' + raw + '" 명령을 이해하지 못했어요');
  }

  // ---------- entry points (called by the Android app and the phone remote) ----------
  window.Cove = {
    key: key,
    say: say,
    calFetched: calFetched,
    memo: function (text, color) { addMemo(text, color); },
    textResult: textResult,
    calCmd: calCmd,
    // Test hook: focus the n-th element matching a selector (used by the layout checks)
    _focus: function (sel, n) { var e = document.querySelectorAll(sel)[n || 0]; if (e) setFocus(e); return !!e; },
    toast: toast,
    home: function () {
      closePanelQuiet();
      moving = null;
      if (base === 'drawer') { base = 'home'; $('drawer').hidden = true; }
      if (base === 'cal') { base = 'home'; $('cal').hidden = true; }
      if (base === 'memo') { base = 'home'; $('memo').hidden = true; }
      wake();
      lastFocus.home = null;
      renderTiles();
    },
    resume: function () { loadApps(); loadPhotos(); render(); },
    appsChanged: function () { loadApps(); render(); },
    photoAdded: function (id) { loadPhotos(); set({ bg: { type: 'photo', id: id } }); toast('폰에서 보낸 사진을 배경으로 설정했어요'); },
    updateResult: function (json) {
      try { update = JSON.parse(json); } catch (e) { update = { ok: false }; }
      update.phase = 'result';
      if (panel && panel.type === 'settings') renderPanel();
      toast(!update.ok ? '업데이트 정보를 받지 못했어요. 인터넷 연결을 확인해 주세요'
        : update.available ? '새 버전 ' + update.latestName + '이(가) 있어요. "업데이트 확인"을 한 번 더 누르면 설치해요'
        : '최신 버전을 쓰고 있어요');
    },
    updateProgress: function (phase) {
      if (!update) update = {};
      if (phase === 'permission') { update.phase = 'result'; toast('Cove에 "출처를 알 수 없는 앱 설치"를 허용한 뒤 다시 눌러 주세요'); }
      else if (phase === 'download') { update.phase = 'download'; toast('새 버전을 받는 중이에요'); }
      else if (phase === 'confirm') { update.phase = 'confirm'; toast('설치 화면에서 "업데이트"를 눌러 주세요'); }
      else { update.phase = 'result'; update.ok = false; toast('업데이트를 설치하지 못했어요'); }
      if (panel && panel.type === 'settings') renderPanel();
    },
    remote: function (cmd) {
      wake();
      var parts = cmd.split(':');
      if (parts[0] === 'panel') {
        if (parts[1] === 'memo') { if (base === 'memo') closeMemo(); else openMemo(); }
        else if (parts[1] === 'calendar') { if (base === 'cal') closeCal(); else openCal('month'); }
        else if (parts[1] === 'drawer') { if (base === 'drawer') closeDrawer(); else openDrawer(); }
        else if (panel && panel.type === parts[1]) closePanel();
        else openPanel(parts[1]);
      }
      else if (parts[0] === 'design' && DESIGNS[parts[1]]) applyDesign(parts[1]);
      else if (parts[0] === 'bg') set({ bg: stepBg(P.bg, parts[1] === 'prev' ? -1 : 1, false) });
      else if (parts[0] === 'tiles') set({ tiles: cycle(TILES, P.tiles, 1) });
      else if (parts[0] === 'profile' && profileById(parts[1])) switchProfile(parts[1]);
      else if (parts[0] === 'home') window.Cove.home();
    }
  };

  // Desktop preview: keyboard instead of the TV remote.
  document.addEventListener('keydown', function (e) {
    var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: e.shiftKey ? 'longok' : 'ok', Escape: 'back', Backspace: 'back', m: 'menu', l: 'longok' };
    if (/^[0-9]$/.test(e.key)) map[e.key] = 'n' + e.key;
    if (map[e.key]) { e.preventDefault(); key(map[e.key]); }
  });

  // ---------- sample apps for the desktop preview ----------
  function sampleApps() {
    var list = [['Netflix', '#e50914', 'N'], ['YouTube', '#ff0033', '▶'], ['Prime Video', '#1a98ff', 'P'], ['Disney+', '#113ccf', 'D+'],
      ['Spotify', '#1ed760', '♪'], ['Max', '#002be7', 'M'], ['Apple TV', '#1c1c1e', 'A'], ['Twitch', '#9146ff', 'T'],
      ['Plex', '#e5a00d', '›'], ['YouTube Music', '#ff0033', '♫'], ['Google TV', '#4285f4', 'G'], ['Settings', '#5f6368', '⚙'],
      ['YouTube Kids', '#ff4e45', 'K'], ['TVING', '#ff153c', 'T'], ['Wavve', '#1f4ef5', 'W'], ['Chrome', '#1a73e8', 'C']];
    return list.map(function (x, i) {
      var svg = function (w, h, fs) {
        return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><rect width="100%" height="100%" rx="' + (w === h ? 40 : 0) + '" fill="' + x[1] + '"/><text x="50%" y="54%" font-family="sans-serif" font-weight="700" font-size="' + fs + '" fill="#fff" text-anchor="middle" dominant-baseline="middle">' + x[2] + '</text></svg>');
      };
      return { pkg: 'sample.app' + i, label: x[0], color: x[1], iconBg: x[1], banner: i % 3 !== 2, icon: svg(192, 192, 90), bannerUrl: svg(640, 360, 120) };
    });
  }

  // ---------- start ----------
  loadPrefs();
  loadApps();
  loadPhotos();
  render();
  syncCalendars(true);
  setInterval(tick, 10000);
})();
