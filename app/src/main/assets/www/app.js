/* Cove home screen.
   Runs inside the Android app (window.CoveNative is the bridge to the TV) and also in a normal desktop
   browser with sample apps, so the look can be tried without a TV:
   arrows move, Enter = OK, Shift+Enter or L = hold OK, Esc = Back, M = Menu. */
(function () {
  'use strict';

  var N = window.CoveNative || null;
  var SN = window.StudyNative || null;   // 사용자 평가 (the 평가 키트's native side)
  // Study signals: what the evaluated features just did (only heard while 평가 모드 runs)
  function sig(name, data) { if (window.TVStudy) window.TVStudy.signal(name, data || {}); }

  // ---------- catalogue ----------
  var PRESETS = [
    ['blue-ridges', '푸른 능선'], ['golden-hour', '골든 아워'], ['night-peaks', '밤의 봉우리'], ['desert-dunes', '사막 언덕'],
    ['ocean-dusk', '해 질 녘 바다'], ['forest-fog', '안개 숲'], ['mirror-lake', '거울 호수'], ['soft-aurora', '오로라'],
    ['snowy-peaks', '눈 덮인 산'], ['city-night', '도시 야경'], ['sunny-beach', '한낮 해변'], ['autumn-forest', '가을 숲'],
    ['milky-way', '은하수'], ['blossom-dawn', '벚꽃 새벽'], ['dawn-sea', '여명 바다'], ['ringed-planet', '고리 행성']
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
  var DEFAULTS = { design: 'glass', clock: '24', shape: 'rounded', size: 'm', apps: null, autoAdd: true, nightBg: null, cats: null, cat: null, recentRow: false, recent: null, locked: null, weather: null, calPreview: true, memoPreview: true, topBtns: false };
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

  // ---------- time zone ----------
  // The TV's own time zone can be wrong (it is often left on another country). Cove works in the zone
  // chosen in 설정 › 시간 · 지역 (Seoul by default): wall(t) is a Date whose local fields read the time
  // in that zone, and NOW() is the current such time. Everything shown or compared uses them.
  var TZS = [['Asia/Seoul', '서울 (한국)'], ['system', 'TV 설정 따르기'], ['Asia/Tokyo', '도쿄 (일본)'], ['Asia/Shanghai', '베이징 · 상하이 (중국)'],
    ['Asia/Taipei', '타이베이'], ['Asia/Hong_Kong', '홍콩'], ['Asia/Singapore', '싱가포르'], ['Asia/Bangkok', '방콕 · 하노이'], ['Asia/Kolkata', '인도'],
    ['Asia/Dubai', '두바이'], ['Europe/London', '런던'], ['Europe/Paris', '파리 · 베를린'], ['America/New_York', '뉴욕 (미국 동부)'],
    ['America/Chicago', '시카고 (미국 중부)'], ['America/Denver', '덴버 (미국 산악)'], ['America/Los_Angeles', 'LA (미국 서부)'], ['Pacific/Honolulu', '하와이'],
    ['Australia/Sydney', '시드니'], ['Pacific/Auckland', '오클랜드']];
  var TZ = 'Asia/Seoul', tzCache = {};
  function setZone(id) {
    TZ = id && id !== 'system' ? id : null;
    try { if (TZ) new Intl.DateTimeFormat('en-US', { timeZone: TZ }); } catch (e) { TZ = null; }
    tzCache = {};
  }
  // minutes to add to a real instant so that its local fields show the chosen zone's time
  function tzShift(t) {
    if (!TZ) return 0;
    var key = Math.floor(t / 1800000);
    if (tzCache[key] !== undefined) return tzCache[key];
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
    var target = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(t / 60000) * 60000) / 60000);
    return (tzCache[key] = target + new Date(t).getTimezoneOffset());
  }
  function sysZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '알 수 없음'; } catch (e) { return '알 수 없음'; } }
  function setTimeZone(id) { ROOT.tz = id; setZone(id); savePrefs(); tick(); render(); }
  function wall(t) { t = t instanceof Date ? t.getTime() : t; return new Date(t + tzShift(t) * 60000); }
  function NOW() { return wall(Date.now()); }
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
      if ((pr.kind === 'kids' || pr.kind === 'guest') && !Array.isArray(pr.allow)) pr.allow = (pr.prefs.apps || []).slice();
    });
    if (!profileById(ROOT.masterId)) ROOT.masterId = ROOT.profiles[0].id;
    if (!current()) ROOT.current = ROOT.profiles[0].id;
    if (!ROOT.tz) ROOT.tz = 'Asia/Seoul';
    // the calendar and memo now have home tiles: the top bar's buttons start hidden (once, for everyone)
    if (!ROOT.topBtnsV2) { ROOT.profiles.forEach(function (pr) { if (pr.prefs) pr.prefs.topBtns = false; }); ROOT.topBtnsV2 = true; }
    setZone(ROOT.tz);
    P = current().prefs;
  }

  var saveTimer = null;
  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var s = JSON.stringify(ROOT);
      try { if (N) N.savePrefs(s); else localStorage.setItem('cove.prefs', s); } catch (e) {}
      saveSnapshot();
      refreshLive();
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
    APPS = APPS.concat(miniApps());
    BYPKG = {};
    APPS.forEach(function (a) { BYPKG[a.pkg] = a; });
    var pkgs = APPS.map(function (a) { return a.pkg; });
    var changed = false, fresh = [];
    if (Array.isArray(ROOT.known)) {
      fresh = pkgs.filter(function (p) { return ROOT.known.indexOf(p) < 0; });
      fresh.forEach(function (p) {
        ROOT.profiles.forEach(function (pr) {
          if (pr.prefs.autoAdd !== false && Array.isArray(pr.prefs.apps) && pr.prefs.apps.indexOf(p) < 0) { pr.prefs.apps.push(p); changed = true; }
          // Cove's own mini apps are safe for children (the cinema shows them only all-ages titles)
          if ((pr.kind === 'kids' || pr.kind === 'guest') && BYPKG[p].mini && Array.isArray(pr.allow) && pr.allow.indexOf(p) < 0) { pr.allow.push(p); changed = true; }
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

  function kidsAllows(pkg) { return !isKids() && !isGuest() || (current().allow || []).indexOf(pkg) >= 0; }
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
  function iconUrl(a) { return N && !a.mini ? '/icon/' + encodeURIComponent(a.pkg) : a.icon; }
  function bannerUrl(a) { return N && !a.mini ? '/banner/' + encodeURIComponent(a.pkg) : a.bannerUrl; }
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
  function isNight() { var h = NOW().getHours(); return h >= NIGHT_FROM || h < NIGHT_TO; }
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
    if (!c) { el.className = 'weather empty'; el.innerHTML = wxIcon(1, true) + '<span>날씨 · OK로 도시 고르기</span>'; el.hidden = false; layoutWidgets(); return; }
    if (!wx.data || wx.city !== P.weather) { el.className = 'weather empty'; el.innerHTML = wxIcon(2, true) + '<span>' + esc(c[1]) + ' 날씨 받는 중…</span>'; el.hidden = false; return; }
    el.className = 'weather';
    var cur = wx.data.current || {}, day = wx.data.daily || {};
    var hi = day.temperature_2m_max && day.temperature_2m_max[0], lo = day.temperature_2m_min && day.temperature_2m_min[0];
    el.innerHTML = wxIcon(cur.weather_code, cur.is_day !== 0) + '<b>' + Math.round(cur.temperature_2m) + '°</b>' +
      '<span>' + esc(c[1]) + ' · ' + wxText(cur.weather_code) + (hi !== undefined ? ' · 최고 ' + Math.round(hi) + '° 최저 ' + Math.round(lo) + '°' : '') + '</span>';
    el.hidden = false;
    layoutWidgets();
  }
  // Fetches at most every 30 minutes (or when the city changes).
  function refreshWeather(force) {
    var c = cityOf(P.weather);
    if (!c) { showWeather(); return; }
    var fresh = wx.city === c[0] && Date.now() - wx.at < 30 * 60 * 1000;
    if ((fresh && !force) || wx.busy) { showWeather(); return; }
    wx.busy = true;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + c[2] + '&longitude=' + c[3] +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,weather_code' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=7';
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      wx = { city: c[0], at: Date.now(), data: d, busy: false };
      showWeather(); renderWxPage();
    }).catch(function () {
      wx.busy = false;
      if (wx.city !== c[0]) { wx.at = Date.now(); wx.city = null; }   // try again in 30 minutes
      showWeather();
    });
  }

  // ---------- home widgets ----------
  // Widgets sit in the free part of the home screen: the area above the apps (and below or beside the top
  // bar), measured from where each design actually draws them. That area is split into slots, 3 across and
  // up to 3 down; a widget lives in a slot and can be moved between slots, so it never covers an app.
  var WIDGETS = [['clock', '시계'], ['weather', '날씨'], ['news', '뉴스']];
  var WDEF = {
    minimal: { clock: [0, 1], weather: [1, 1], news: [2, 1] },
    dock: { clock: [0, 1], weather: [1, 1], news: [2, 1] },
    theater: { clock: [0, 0], weather: [0, 1], news: [0, 2] },
    icons: { clock: [0, 0], weather: [0, 1], news: [0, 2] },
    _: { clock: [0, 0], weather: [1, 0], news: [0, 2] }
  };
  var wmove = null;   // {w, orig}
  function widgetOn(w) {
    var o = P.widgets || {};
    if (w === 'clock' && P.clock === 'off') return false;
    if (w === 'news' && o.news === undefined && isKids()) return false;   // off for kids unless turned on
    return o[w] !== false;
  }
  function wSlot(w) {
    var saved = P.wpos && P.wpos[P.layout] && P.wpos[P.layout][w];
    return saved || (WDEF[P.layout] || WDEF._)[w] || [0, 0];
  }
  function freeZone() {
    var home = $('home'), hr = home.getBoundingClientRect(), cs = getComputedStyle(home);
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var z = { L: hr.left + parseFloat(cs.paddingLeft), R: hr.right - parseFloat(cs.paddingRight), T: hr.top + parseFloat(cs.paddingTop), B: hr.bottom - parseFloat(cs.paddingBottom), rem: rem, hr: hr };
    // the highest thing the apps area draws: tiles, row titles, the Column list, the Theater hero, the row tabs
    var stop = z.B, box = $('tiles').getBoundingClientRect();
    Array.prototype.forEach.call(document.querySelectorAll('#tiles .tile, #tiles .cat h3, #tiles .colnav, #tiles .hole, #rtabs:not([hidden]), #hero:not([hidden])'), function (e) {
      var r = e.getBoundingClientRect(), top = r.top;
      if (e.closest('#tiles')) { if (r.bottom <= box.top) return; top = Math.max(top, box.top); }   // rows scrolled out of view
      if (r.height > 0 && top < stop) stop = top;
    });
    z.B = stop - rem * 0.8;
    var q = document.querySelector('.quick').getBoundingClientRect();
    z.Q = q;
    return z;
  }
  // Designs whose apps start near the top keep a band for the widgets as tall as the clock widget.
  var BAND_LAYOUTS = ['grid', 'column', 'collage', 'icons', 'theater'];
  function fitBand(extra) {
    var home = $('home'), ck = $('clock'), want = '';
    if (BAND_LAYOUTS.indexOf(P.layout) >= 0 && ((ck && widgetOn('clock')) || extra)) {
      var rem = parseFloat(getComputedStyle(document.documentElement).fontSize), ch = 0;
      if (ck && widgetOn('clock')) { ck.hidden = false; ch = ck.offsetHeight; }
      want = Math.max(ch + rem * 1.4, rem * 6) + (extra || 0) * rem + 'px';
    }
    if (home.style.getPropertyValue('--band') !== want) { if (want) home.style.setProperty('--band', want); else home.style.removeProperty('--band'); return true; }
    return false;
  }
  function layoutWidgets() {
    if (!ROOT || !P) return;
    var news = $('wNews');
    if (news) news.classList.remove('compact');
    // grow the band (designs that have one) until every widget that is on finds a place
    for (var extra = 0; extra <= 14; extra += 3.5) {
      fitBand(extra);
      if (!placeWidgets() || BAND_LAYOUTS.indexOf(P.layout) < 0) break;
    }
  }
  // one placement pass; returns how many widgets that are on found no place
  function placeWidgets() {
    var z = freeZone(), H = Math.max(0, z.B - z.T), rem = z.rem, gap = rem * 0.9;
    var rows = Math.max(1, Math.min(3, Math.floor(H / (rem * 8.5))));
    var rowH = H / rows, placed = [];
    var Q = { x: z.Q.left, y: z.Q.top, w: z.Q.width, h: z.Q.height };
    var hits = function (a, b) { return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap; };
    var fits = function (p) { return p.x >= z.L - 1 && p.x + p.w <= z.R + 1 && p.y >= z.T - 1 && p.y + p.h <= z.B + rem * 0.4 && !hits(p, Q) && placed.every(function (o) { return !hits(p, o); }); };
    // where a widget of size w x h goes in slot (r, c); a slot under the top bar moves below it
    var slotPos = function (r, c, w, h) {
      var x = c === 0 ? z.L : c === 1 ? (z.L + z.R) / 2 - w / 2 : z.R - w;
      var y = z.T + r * rowH + (r > 0 && rows > 1 ? Math.max(0, (rowH - h) / 2) : 0);
      var p = { x: x, y: y, w: w, h: h };
      if (hits(p, Q)) p.y = Q.y + Q.h + gap;
      return p;
    };
    var missing = 0;
    WIDGETS.forEach(function (wd) {
      var el = document.querySelector('.widget[data-w="' + wd[0] + '"]');
      if (!el) return;
      el.hidden = !widgetOn(wd[0]);
      el.classList.remove('nofit');
      if (el.hidden) return;
      var pick = findSpot(el, wd[0]);
      if (!pick && wd[0] === 'news') { el.classList.add('compact'); pick = findSpot(el, wd[0]); }   // one-line headlines when space is tight
      if (!pick) { el.hidden = true; el.classList.add('nofit'); missing++; return; }   // never over the apps
      placed.push(pick);
      el.style.left = (pick.x - z.hr.left) + 'px';
      el.style.top = (pick.y - z.hr.top) + 'px';
      var sr = Math.max(0, Math.min(rows - 1, Math.floor((pick.y + pick.h / 2 - z.T) / rowH))), sc = Math.max(0, Math.min(2, Math.floor((pick.x + pick.w / 2 - z.L) / ((z.R - z.L) / 3))));
      el.setAttribute('data-slot', sr + ',' + sc);
    });
    return missing;
    function findSpot(el, id) {
      var w = el.offsetWidth, h = el.offsetHeight, want = wSlot(id), r0 = Math.min(want[0], rows - 1), c0 = want[1];
      // candidates: the chosen slot, then right under or beside widgets already placed, then the other slots
      var cands = [slotPos(r0, c0, w, h)];
      placed.forEach(function (o) {
        cands.push({ x: c0 === 2 ? o.x + o.w - w : c0 === 1 ? o.x + o.w / 2 - w / 2 : o.x, y: o.y + o.h + gap, w: w, h: h });
        cands.push({ x: o.x + o.w + gap * 2, y: o.y, w: w, h: h });
      });
      var others = [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < 3; c++) others.push([r, c, Math.abs(r - r0) * 1.2 + Math.abs(c - c0)]);
      others.sort(function (a, b2) { return a[2] - b2[2]; }).forEach(function (o) { cands.push(slotPos(o[0], o[1], w, h)); });
      for (var i = 0; i < cands.length; i++) if (fits(cands[i])) return cands[i];
      return null;
    }
  }
  function startWidgetMove(w) {
    closePanelQuiet();
    var el = document.querySelector('.widget[data-w="' + w + '"]');
    wmove = { w: w, orig: P.wpos && P.wpos[P.layout] && P.wpos[P.layout][w] ? P.wpos[P.layout][w].slice() : null };
    var cur = (el.getAttribute('data-slot') || '0,0').split(',');
    setWpos(w, [+cur[0], +cur[1]]);
    el.classList.add('wmove'); setFocus(el);
    toast('방향키로 자리를 옮겨요 · OK 여기에 두기 · 뒤로 취소');
  }
  function setWpos(w, rc) { P.wpos = P.wpos || {}; P.wpos[P.layout] = P.wpos[P.layout] || {}; P.wpos[P.layout][w] = rc; }
  function widgetMoveKey(k) {
    var el = document.querySelector('.widget[data-w="' + wmove.w + '"]'), cur = wSlot(wmove.w).slice();
    if (k === 'ok' || k === 'longok' || k === 'back') {
      if (k === 'back') { if (wmove.orig) setWpos(wmove.w, wmove.orig); else delete P.wpos[P.layout][wmove.w]; }
      else { var real = (el.getAttribute('data-slot') || '0,0').split(','); setWpos(wmove.w, [+real[0], +real[1]]); }
      el.classList.remove('wmove'); wmove = null; savePrefs(); layoutWidgets();
      toast(k === 'back' ? '옮기기를 취소했어요' : '여기에 뒀어요');
      return;
    }
    var z = freeZone(), rows = Math.max(1, Math.min(3, Math.floor((z.B - z.T) / (z.rem * 8.5))));
    if (k === 'left') cur[1] = Math.max(0, cur[1] - 1); else if (k === 'right') cur[1] = Math.min(2, cur[1] + 1);
    else if (k === 'up') cur[0] = Math.max(0, cur[0] - 1); else if (k === 'down') cur[0] = Math.min(rows - 1, cur[0] + 1);
    setWpos(wmove.w, cur);
    layoutWidgets();
    var got = (el.getAttribute('data-slot') || '').split(',');
    if (+got[0] !== cur[0] || +got[1] !== cur[1]) toast('그 자리는 앱이나 다른 위젯에 가려서 가장 가까운 빈자리에 뒀어요');
  }
  function widgetRows() {
    var w = panel.w, name = labelOf(WIDGETS, w);
    return [
      { name: name + ' 열기', action: true, act: function () { closePanelQuiet(); openWidget(w); } },
      { need: 'look', name: '위치 옮기기', sub: '앱을 가리지 않는 빈자리 안에서 옮겨요', action: true, act: function () { startWidgetMove(w); } },
      { need: 'look', name: '위젯 삭제', sub: '홈에서 빼요 · 꾸미기 → 시계 · 위젯에서 다시 추가해요', danger: true, action: true, val: armed === 'wdel' ? '한 번 더 누르면 삭제' : '', act: function () { twice('wdel', function () { var o = P.widgets || {}; o[w] = false; if (w === 'clock' && P.clock === 'off') P.clock = '24'; set({ widgets: o }); closePanel(); toast(name + ' 위젯을 뺐어요. 꾸미기 → 시계 · 위젯에서 다시 추가할 수 있어요'); }); } },
      { need: 'look', name: '위젯 자리 처음대로', sub: '이 디자인의 기본 배치로 돌아가요', action: true, act: function () { if (P.wpos) delete P.wpos[P.layout]; savePrefs(); layoutWidgets(); closePanel(); toast('기본 배치로 돌렸어요'); } }
    ];
  }
  function openWidget(w) { if (w === 'clock') openClockPage(); else if (w === 'weather') openWxPage(); else if (w === 'news') openNewsPage(widgetNewsCat(), Math.max(0, nwRot.i)); }

  // ---------- clock page: a desk clock ----------
  var CSTYLES = [['digital', '디지털'], ['analog', '아날로그'], ['flip', '플립']];
  var page = null;   // {kind:'clock'|'wx', gear:bool, timer}
  function pageBg(el) { var u = bgUrl(activeBg()); $(el).style.backgroundImage = u ? 'url("' + u + '")' : 'linear-gradient(135deg,#1e293b,#0f172a)'; }
  function openClockPage() {
    closePanelQuiet();
    if (focusEl) focusEl.classList.remove('focus');
    base = 'clockpg'; page = { kind: 'clock', gear: false };
    pageBg('cpBg'); $('clockPage').hidden = false;
    renderClockPage();
    page.timer = setInterval(renderClockPage, 1000);
  }
  function closePage() {
    if (page && page.timer) clearInterval(page.timer);
    $('clockPage').hidden = true; $('wxPage').hidden = true; $('newsPage').hidden = true;
    page = null; base = 'home';
    restoreFocus('home');
  }
  function renderClockPage() {
    if (!page || page.kind !== 'clock') return;
    var d = NOW(), h = d.getHours(), m = pad2(d.getMinutes()), sec = pad2(d.getSeconds()), h12 = P.clock === '12';
    var hh = h12 ? String((h % 12) || 12) : pad2(h), ap = h < 12 ? '오전' : '오후', st = P.cstyle || 'digital', html;
    if (st === 'analog') {
      var a = function (v, len, w, col) { var r = v * Math.PI / 180; return '<line x1="50" y1="50" x2="' + (50 + Math.sin(r) * len) + '" y2="' + (50 - Math.cos(r) * len) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; };
      var ticks = '';
      for (var i = 0; i < 60; i++) { var r = i * 6 * Math.PI / 180, big = i % 5 === 0; ticks += '<line x1="' + (50 + Math.sin(r) * (big ? 40 : 43)) + '" y1="' + (50 - Math.cos(r) * (big ? 40 : 43)) + '" x2="' + (50 + Math.sin(r) * 46) + '" y2="' + (50 - Math.cos(r) * 46) + '" stroke="rgba(255,255,255,' + (big ? .85 : .3) + ')" stroke-width="' + (big ? 1.4 : .6) + '"/>'; }
      html = '<svg class="cp-analog" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="rgba(10,14,24,.45)" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>' + ticks +
        a((h % 12) * 30 + d.getMinutes() * 0.5, 24, 3, '#fff') + a(d.getMinutes() * 6 + d.getSeconds() * 0.1, 35, 2, '#fff') +
        (P.csec !== false ? a(d.getSeconds() * 6, 39, .7, '#ff8a80') : '') + '<circle cx="50" cy="50" r="2.2" fill="#fff"/></svg>';
    } else if (st === 'flip') {
      var digits = (hh.length < 2 ? ' ' + hh : hh) + m;
      html = '<div class="cp-flip">' + digits.split('').map(function (ch, i) { return (i === 2 ? '<i>:</i>' : '') + '<b>' + (ch === ' ' ? '' : ch) + '</b>'; }).join('') + (h12 ? '<small>' + ap + '</small>' : '') + '</div>';
    } else {
      html = '<div class="cp-digital">' + hh + ':' + m + (P.csec !== false ? '<em>' + sec + '</em>' : '') + (h12 ? '<small>' + ap + '</small>' : '') + '</div>';
    }
    var night = P.cnight !== false && (h >= 22 || h < 6);
    $('cpMain').className = 'cp-main' + (night ? ' night' : '');
    $('cpMain').innerHTML = html + '<div class="cp-date">' + d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) + '</div>';
    var ne = nextEvent(), cw = wx.data && wx.city === P.weather ? (wx.data.current || {}) : null;
    $('cpUnder').innerHTML = (cw ? '<span>' + wxIcon(cw.weather_code, cw.is_day !== 0) + Math.round(cw.temperature_2m) + '° ' + esc(cityOf(P.weather)[1]) + '</span>' : '') +
      (ne ? '<span>📅 ' + esc(relDay(ne.first.start)) + (ne.first.allDay ? '' : ' ' + esc(fmtTime(ne.first.start))) + ' ' + esc(ne.first.title) + '</span>' : '');
    $('cpGear').className = 'cp-gear' + (page.gear ? ' sel' : '');
  }
  function clockSetRows() {
    return [
      { name: '시계 모양', val: labelOf(CSTYLES, P.cstyle || 'digital'), change: function (d) { set({ cstyle: cycle(CSTYLES, P.cstyle || 'digital', d) }); renderClockPage(); } },
      { name: '시간 형식', val: P.clock === '12' ? '12시간 (오전/오후)' : '24시간', change: function () { set({ clock: P.clock === '12' ? '24' : '12' }); renderClockPage(); } },
      { name: '초 표시', val: P.csec !== false ? '표시' : '숨김', change: function () { set({ csec: P.csec === false }); renderClockPage(); } },
      { name: '밤에는 어둡게', sub: '밤 10시부터 아침 6시까지 은은하게', val: P.cnight !== false ? '켜짐' : '꺼짐', change: function () { set({ cnight: P.cnight === false }); renderClockPage(); } },
      { need: 'admin', name: '시간대', sub: 'TV 자체 시간대: ' + sysZone(), val: labelOf(TZS, ROOT.tz), change: function (d) { setTimeZone(cycle(TZS, ROOT.tz, d)); renderClockPage(); renderPanel(); } },
      { name: '홈에 시계 위젯', val: widgetOn('clock') ? '표시' : '숨김', change: function () { var o = P.widgets || {}; o.clock = !widgetOn('clock'); if (o.clock && P.clock === 'off') P.clock = '24'; set({ widgets: o }); } }
    ];
  }

  // ---------- weather page ----------
  function openWxPage() {
    closePanelQuiet();
    if (focusEl) focusEl.classList.remove('focus');
    base = 'wxpg'; page = { kind: 'wx', gear: false };
    pageBg('wxBg'); $('wxPage').hidden = false;
    refreshWeather(false);
    renderWxPage();
  }
  function renderWxPage() {
    if (!page || page.kind !== 'wx') return;
    var c = cityOf(P.weather), d = wx.data && wx.city === P.weather ? wx.data : null;
    $('wxGear').className = 'cp-gear' + (page.gear ? ' sel' : '');
    if (!c) { $('wxBody').innerHTML = '<div class="wx-empty"><b>어느 도시의 날씨를 볼까요?</b>◀ ▶로 도시를 골라요</div>'; return; }
    if (!d) { $('wxBody').innerHTML = '<div class="wx-empty"><b>' + esc(c[1]) + '</b>날씨를 받아오는 중이에요…</div>'; return; }
    var cur = d.current || {}, dy = d.daily || {}, hr = d.hourly || {};
    var now = '<div class="wx-now"><div class="city"><b>' + esc(c[1]) + '</b>◀ ▶</div>' + wxIcon(cur.weather_code, cur.is_day !== 0).replace('<svg', '<svg class="big"') +
      '<div class="temp">' + Math.round(cur.temperature_2m) + '°</div><div class="desc">' + wxText(cur.weather_code) + '</div>' +
      (dy.temperature_2m_max ? '<div class="hilo">최고 ' + Math.round(dy.temperature_2m_max[0]) + '° · 최저 ' + Math.round(dy.temperature_2m_min[0]) + '°</div>' : '') +
      '<div class="wx-facts">' + [['체감', cur.apparent_temperature !== undefined ? Math.round(cur.apparent_temperature) + '°' : '-'], ['습도', cur.relative_humidity_2m !== undefined ? cur.relative_humidity_2m + '%' : '-'],
        ['바람', cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m / 3.6 * 10) / 10 + 'm/s' : '-'], ['강수 확률', dy.precipitation_probability_max ? dy.precipitation_probability_max[0] + '%' : '-'],
        ['해 뜨는 시각', dy.sunrise ? dy.sunrise[0].slice(11, 16) : '-'], ['해 지는 시각', dy.sunset ? dy.sunset[0].slice(11, 16) : '-']].map(function (f) { return '<div>' + f[0] + '<b>' + f[1] + '</b></div>'; }).join('') + '</div></div>';
    // the next 24 hours: temperature line and chance of rain
    var hours = '';
    if (hr.time) {
      var start = 0, nowKey = (cur.time || '').slice(0, 13);
      for (var i = 0; i < hr.time.length; i++) if (hr.time[i].slice(0, 13) >= nowKey) { start = i; break; }
      var T = hr.temperature_2m.slice(start, start + 25), PP = (hr.precipitation_probability || []).slice(start, start + 25), TM = hr.time.slice(start, start + 25);
      var lo = Math.min.apply(null, T), hi = Math.max.apply(null, T), W = 1000, Hh = 150, n = T.length;
      var X = function (k) { return 20 + k * (W - 40) / Math.max(1, n - 1); }, Y = function (v) { return 30 + (hi - v) / Math.max(1, hi - lo) * 70; };
      var line = T.map(function (v, k) { return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
      var svg = '<svg viewBox="0 0 ' + W + ' ' + Hh + '">';
      PP.forEach(function (p, k) { if (p) svg += '<rect x="' + (X(k) - 9) + '" y="' + (Hh - 18 - p * 0.32) + '" width="18" height="' + (p * 0.32) + '" rx="3" fill="rgba(143,193,255,.45)"/>'; });
      svg += '<path d="' + line + ' L' + X(n - 1) + ' ' + (Hh - 18) + ' L' + X(0) + ' ' + (Hh - 18) + 'Z" fill="rgba(255,215,107,.12)"/><path d="' + line + '" fill="none" stroke="#ffd76b" stroke-width="3" stroke-linejoin="round"/>';
      for (var k = 0; k < n; k += 3) svg += '<text x="' + X(k) + '" y="' + (Y(T[k]) - 9) + '" fill="#fff" font-size="15" text-anchor="middle">' + Math.round(T[k]) + '°</text><text x="' + X(k) + '" y="' + (Hh - 2) + '" fill="rgba(255,255,255,.6)" font-size="13" text-anchor="middle">' + (k ? +TM[k].slice(11, 13) + '시' : '지금') + '</text>' + (PP[k] ? '<text x="' + X(k) + '" y="' + (Hh - 22 - PP[k] * 0.32) + '" fill="#8fc1ff" font-size="12" text-anchor="middle">' + PP[k] + '%</text>' : '');
      hours = '<div class="wx-card wx-hours"><h3>앞으로 24시간 · 기온과 비 올 확률</h3>' + svg + '</svg></div>';
    }
    var days = '';
    if (dy.time) {
      days = '<div class="wx-card"><h3>이번 주</h3><div class="wx-days">' + dy.time.map(function (t, k) {
        var dt = new Date(t + 'T12:00');
        return '<div class="wx-day' + (k === 0 ? ' today' : '') + '"><span>' + (k === 0 ? '오늘' : k === 1 ? '내일' : DOW[dt.getDay()] + '요일') + '</span>' + wxIcon(dy.weather_code[k], true) +
          '<b>' + Math.round(dy.temperature_2m_max[k]) + '° / ' + Math.round(dy.temperature_2m_min[k]) + '°</b>' + (dy.precipitation_probability_max && dy.precipitation_probability_max[k] ? '<small>☂ ' + dy.precipitation_probability_max[k] + '%</small>' : '<small>&nbsp;</small>') + '</div>';
      }).join('') + '</div></div>';
    }
    $('wxBody').innerHTML = now + hours + days;
  }
  function stepCity(d) {
    var ids = CITIES.map(function (c) { return c[0]; }), i = ids.indexOf(P.weather);
    set({ weather: ids[(i + d + ids.length) % ids.length] });
    refreshWeather(true); renderWxPage();
  }
  function wxSetRows() {
    return [
      { name: '도시', val: P.weather && cityOf(P.weather) ? cityOf(P.weather)[1] : '사용 안 함', change: function (d) { var ids = [null].concat(CITIES.map(function (c) { return c[0]; })); set({ weather: ids[(ids.indexOf(P.weather || null) + d + ids.length) % ids.length] }); refreshWeather(true); renderWxPage(); } },
      { name: '홈에 날씨 위젯', val: widgetOn('weather') ? '표시' : '숨김', change: function () { var o = P.widgets || {}; o.weather = !widgetOn('weather'); set({ widgets: o }); } }
    ];
  }
  function pageKey(k) {
    if (k === 'back') { closePage(); return; }
    if (k === 'down') { page.gear = true; } else if (k === 'up') { page.gear = false; }
    else if (k === 'ok' || k === 'longok') { if (page.gear) openPanel(page.kind === 'clock' ? 'clockset' : 'wxset'); return; }
    else if (k === 'left' || k === 'right') {
      var d = k === 'left' ? -1 : 1;
      if (page.kind === 'clock') { if (!blocked('look', '시계 모양 바꾸기', function () {})) { set({ cstyle: cycle(CSTYLES, P.cstyle || 'digital', d) }); toast('시계 모양 · ' + labelOf(CSTYLES, P.cstyle)); } }
      else if (!blocked('look', '도시 바꾸기', function () {})) stepCity(d);
    }
    if (page.kind === 'clock') renderClockPage(); else renderWxPage();
  }

  // ---------- news ----------
  // Google News (Korea) RSS: no key needed. The TV app downloads the feeds (web pages may not read them
  // directly); each category is fetched at most every 30 minutes. Only headlines, outlets and links are
  // shown; the full article opens on the phone through a QR code.
  var GN = 'hl=ko&gl=KR&ceid=KR:ko';
  var NEWS_CATS = [['top', '주요 뉴스', '', '#ef4444'], ['nation', '국내', 'NATION', '#3b82f6'], ['world', '세계', 'WORLD', '#8b5cf6'], ['business', '경제', 'BUSINESS', '#10b981'],
    ['tech', 'IT·과학', 'TECHNOLOGY', '#06b6d4'], ['ent', '연예', 'ENTERTAINMENT', '#ec4899'], ['sports', '스포츠', 'SPORTS', '#f59e0b'], ['health', '건강', 'HEALTH', '#22c55e']];
  var NEWS_DEFAULT = ['top', 'nation', 'world', 'business', 'tech', 'sports', 'ent'];
  var news = {};       // category -> {at, items, busy, error}
  var nwRot = { i: -1, at: 0, cat: null };
  function newsUrl(cat) {
    if (cat.indexOf('q:') === 0) return 'https://news.google.com/rss/search?q=' + encodeURIComponent(cat.slice(2)) + '&' + GN;
    var c = find(NEWS_CATS, cat);
    return c && c[2] ? 'https://news.google.com/rss/headlines/section/topic/' + c[2] + '?' + GN : 'https://news.google.com/rss?' + GN;
  }
  function newsTabs() {
    var l = (P.newsCats || NEWS_DEFAULT).filter(function (c) { return find(NEWS_CATS, c); });
    return l.concat((P.newsKeys || []).map(function (k) { return 'q:' + k; }));
  }
  function catName(cat) { return cat.indexOf('q:') === 0 ? '“' + cat.slice(2) + '”' : (find(NEWS_CATS, cat) || [0, cat])[1]; }
  function catColor(cat) { return cat.indexOf('q:') === 0 ? '#94a3b8' : (find(NEWS_CATS, cat) || [0, 0, 0, '#94a3b8'])[3]; }
  function timeAgo(t) {
    if (!t) return '';
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? '방금' : m < 60 ? m + '분 전' : m < 1440 ? Math.round(m / 60) + '시간 전' : Math.round(m / 1440) + '일 전';
  }
  function fetchNews(cat, force) {
    var n = news[cat] || (news[cat] = { at: 0, items: [], busy: false, error: '' });
    if (n.busy || (!force && n.items.length && Date.now() - n.at < 30 * 60000) || (!force && n.error && Date.now() - n.at < 5 * 60000)) return;
    n.busy = true;
    if (N && N.fetchFeed) N.fetchFeed('news:' + cat, newsUrl(cat));
    else setTimeout(function () { feedFetched('news:' + cat, JSON.stringify({ ok: true, text: sampleFeed(cat) })); }, 150);
  }
  function feedFetched(id, json) {
    if (id.indexOf('news:') !== 0) return;
    var cat = id.slice(5), n = news[cat] || (news[cat] = { items: [] }), r = {};
    try { r = JSON.parse(json); } catch (e) {}
    n.busy = false; n.at = Date.now();
    if (r.ok) { var items = parseFeed(r.text || ''); if (items.length) { n.items = items; n.error = ''; } else n.error = 'empty'; }
    else n.error = r.error || 'error';
    if (cat === widgetNewsCat()) renderNewsWidget(true);
    if (page && page.kind === 'news') renderNewsPage();
  }
  function parseFeed(text) {
    var doc;
    try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) { return []; }
    var nodes = doc.getElementsByTagName('item');
    if (!nodes.length) nodes = doc.getElementsByTagName('entry');
    var out = [];
    for (var i = 0; i < nodes.length && out.length < 40; i++) {
      var it = nodes[i], g = function (tag) { var e = it.getElementsByTagName(tag)[0]; return e ? (e.textContent || '').trim() : ''; };
      var title = g('title'), src = g('source'), link = g('link');
      if (!link) { var le = it.getElementsByTagName('link')[0]; if (le) link = le.getAttribute('href') || ''; }
      if (!src) { var m = /\s[-–]\s([^-–]{2,30})$/.exec(title); if (m) src = m[1].trim(); }
      if (src && title.slice(-src.length) === src) title = title.slice(0, -src.length).replace(/\s*[-–]\s*$/, '').trim();
      var when = new Date(g('pubDate') || g('updated') || g('published')), related = [], desc = g('description') || g('summary'), summary = '';
      if (desc && desc.indexOf('<') >= 0) {
        var hd = new DOMParser().parseFromString(desc, 'text/html');
        Array.prototype.forEach.call(hd.querySelectorAll('li'), function (li) {
          var a = li.querySelector('a'), f = li.querySelector('font');
          if (!a) return;
          var t = a.textContent.trim();
          if (t && t !== title && t.indexOf(title) !== 0) related.push({ title: t, source: f ? f.textContent.trim() : '' });
        });
        if (!related.length) summary = (hd.body ? hd.body.textContent : '').trim().slice(0, 180);
      } else if (desc) summary = desc.slice(0, 180);
      if (title) out.push({ title: title, source: src, link: link, time: isNaN(when.getTime()) ? 0 : when.getTime(), related: related.slice(0, 4), summary: summary });
    }
    return out;
  }
  // the widget: the newest headlines of one category, one after another
  function widgetNewsCat() { var c = P.newsWidget || 'top'; return find(NEWS_CATS, c) || c.indexOf('q:') === 0 ? c : 'top'; }
  function renderNewsWidget(force) {
    var el = $('wNews');
    if (!el || !widgetOn('news')) return;
    var cat = widgetNewsCat(), n = news[cat];
    if (!n || !n.items.length) fetchNews(cat);
    $('wnCat').textContent = catName(cat);
    el.style.setProperty('--nc', catColor(cat));
    var items = n && n.items ? n.items.slice(0, 10) : [], stage = $('wnStage');
    if (!items.length) { stage.innerHTML = '<div class="wn-item cur"><b>' + (n && n.error ? '뉴스를 받지 못했어요' : '뉴스를 받아오는 중…') + '</b><small>Google 뉴스</small></div>'; nwRot.i = -1; return; }
    if (!force && Date.now() - nwRot.at < 7000) return;
    if (nwRot.cat !== cat) { nwRot.cat = cat; nwRot.i = -1; }
    nwRot.at = Date.now();
    nwRot.i = (nwRot.i + 1) % items.length;
    var it = items[nwRot.i];
    Array.prototype.forEach.call(stage.querySelectorAll('.wn-item'), function (old) {
      if (!old.classList.contains('cur')) { old.parentNode.removeChild(old); return; }
      old.classList.remove('cur'); old.classList.add('out');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 800);
    });
    var d = document.createElement('div');
    d.className = 'wn-item';
    d.innerHTML = '<b>' + esc(it.title) + '</b><small>' + esc(it.source || '') + (it.time ? ' · ' + timeAgo(it.time) : '') + '</small>';
    stage.appendChild(d); void d.offsetWidth; d.classList.add('cur');
    $('wnPos').innerHTML = items.map(function (x, k) { return '<i class="' + (k === nwRot.i ? 'on' : '') + '"></i>'; }).join('');
    var bar = el.querySelector('.wn-bar i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
  }
  setInterval(function () { if (ROOT && base === 'home' && !document.hidden && !ambient) renderNewsWidget(false); }, 1000);

  // the news page: a front page of the chosen category
  function openNewsPage(cat, pick) {
    closePanelQuiet();
    if (focusEl) focusEl.classList.remove('focus');
    var tabs = newsTabs();
    cat = cat || tabs[0] || 'top';
    base = 'newspg';
    page = { kind: 'news', cat: cat, zone: 'list', i: pick || 0, art: null, extra: tabs.indexOf(cat) < 0 ? cat : null };
    pageBg('nwBg'); $('newsPage').hidden = false;
    fetchNews(cat);
    renderNewsPage();
  }
  function pageTabs() { var t = newsTabs(); return page.extra ? t.concat([page.extra]) : t; }
  function renderNewsPage() {
    if (!page || page.kind !== 'news') return;
    var tabs = pageTabs(), cat = page.cat, n = news[cat] || { items: [] }, items = n.items || [], col = catColor(cat), d = NOW();
    page.i = Math.max(0, Math.min(Math.max(0, items.length - 1), page.i));
    var head = '<header class="nw-head"><div><h1>오늘의 뉴스</h1><p>' + d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }) +
      ' · Google 뉴스' + (n.at && items.length ? ' · ' + timeAgo(n.at) + ' 업데이트' : '') + '</p></div><nav class="nw-tabs">' +
      tabs.map(function (t) { return '<span class="' + (t === cat ? 'on' : '') + (page.zone === 'tabs' && t === cat ? ' sel' : '') + '" style="--nc:' + catColor(t) + '">' + esc(catName(t)) + '</span>'; }).join('') + '</nav></header>';
    var body;
    if (!items.length) body = '<div class="nw-empty">' + (n.error ? '뉴스를 받지 못했어요<br><small>인터넷 연결을 확인해 주세요. 잠시 뒤 다시 받아요</small>' : '뉴스를 받아오는 중…') + '</div>';
    else {
      var top = items[0];
      body = '<div class="nw-main" style="--nc:' + col + '"><article class="nw-hero' + (page.zone === 'list' && page.i === 0 ? ' sel' : '') + '">' +
        '<span class="nw-kicker">' + esc(catName(cat)) + ' · 톱 기사</span><h2>' + esc(top.title) + '</h2><p class="nw-meta">' + esc(top.source) + (top.time ? ' · ' + timeAgo(top.time) : '') + '</p>' +
        (top.related.length ? '<div class="nw-rel"><small>관련 보도</small><ul>' + top.related.map(function (r) { return '<li>' + esc(r.title) + (r.source ? ' <em>' + esc(r.source) + '</em>' : '') + '</li>'; }).join('') + '</ul></div>'
          : top.summary ? '<p class="nw-sum">' + esc(top.summary) + '</p>' : '') + '<span class="nw-open">OK 자세히 · QR로 원문 보기</span></article>' +
        '<div class="nw-list" id="nwList">' + items.slice(1, 30).map(function (it, k) {
          return '<div class="nw-item' + (page.zone === 'list' && page.i === k + 1 ? ' sel' : '') + '"><span class="nw-num">' + (k + 2) + '</span><div><b>' + esc(it.title) + '</b><small>' + esc(it.source) + (it.time ? ' · ' + timeAgo(it.time) : '') + '</small></div></div>';
        }).join('') + '</div></div>';
    }
    $('nwBody').innerHTML = head + body;
    var list = $('nwList'), sel = list && list.querySelector('.sel');
    if (sel) { var top2 = sel.offsetTop - list.offsetTop; if (top2 < list.scrollTop + 10) list.scrollTop = Math.max(0, top2 - 20); else if (top2 + sel.offsetHeight > list.scrollTop + list.clientHeight - 10) list.scrollTop = top2 + sel.offsetHeight - list.clientHeight + 20; }
    else if (list && page.i === 0) list.scrollTop = 0;
    $('nwGear').className = 'cp-gear' + (page.zone === 'gear' ? ' sel' : '');
    // one article, with a QR code for the original
    var art = $('nwArticle');
    if (page.art) {
      var a = page.art, qr = N && N.qrSvg && a.link ? N.qrSvg(a.link) : '';
      art.innerHTML = '<div class="nw-art" style="--nc:' + col + '"><div><span class="nw-kicker">' + esc(catName(cat)) + '</span><h2>' + esc(a.title) + '</h2>' +
        '<p class="nw-meta">' + esc(a.source) + (a.time ? ' · ' + new Date(a.time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (' + timeAgo(a.time) + ')' : '') + '</p>' +
        (a.summary ? '<p class="nw-sum">' + esc(a.summary) + '</p>' : '') +
        (a.related.length ? '<div class="nw-rel"><small>관련 보도</small><ul>' + a.related.map(function (r) { return '<li>' + esc(r.title) + (r.source ? ' <em>' + esc(r.source) + '</em>' : '') + '</li>'; }).join('') + '</ul></div>' : '') +
        '<p class="nw-note">기사 원문은 언론사 사이트에서 읽어요. 출처: ' + esc(a.source || 'Google 뉴스') + '</p></div>' +
        '<div class="nw-qr">' + (qr || '<div class="nw-qr-ph">TV에서는 여기에<br>QR 코드가 나와요</div>') + '<b>폰으로 원문 보기</b><small>폰 카메라로 QR을 찍으면<br>기사가 열려요</small></div>' +
        '<div class="p-hint nw-art-hint"><span><kbd>뒤로</kbd>닫기</span></div></div>';
      art.hidden = false;
    } else art.hidden = true;
  }
  function newsKey(k) {
    if (page.art) { if (k === 'back' || k === 'ok') { page.art = null; renderNewsPage(); } return; }
    if (k === 'back') { closePage(); return; }
    var tabs = pageTabs(), items = (news[page.cat] || { items: [] }).items || [], last = Math.min(items.length, 30) - 1;
    if (page.zone === 'tabs') {
      if (k === 'left' || k === 'right') { var ti = tabs.indexOf(page.cat); page.cat = tabs[(ti + (k === 'left' ? -1 : 1) + tabs.length) % tabs.length]; page.i = 0; fetchNews(page.cat); }
      else if (k === 'down' || k === 'ok') page.zone = 'list';
    } else if (page.zone === 'list') {
      if (k === 'up') { if (page.i <= 1) page.zone = 'tabs'; else page.i--; }
      else if (k === 'down') { if (page.i === 0 || page.i >= last) page.zone = 'gear'; else page.i++; }
      else if (k === 'right' && page.i === 0 && last >= 1) page.i = 1;
      else if (k === 'left' && page.i > 0) page.i = 0;
      else if (k === 'ok' || k === 'longok') { if (items[page.i]) page.art = items[page.i]; }
    } else {
      if (k === 'up') page.zone = 'list';
      else if (k === 'ok' || k === 'longok') { openPanel('newsset'); return; }
    }
    renderNewsPage();
  }
  function newsSetRows() {
    var on = P.newsCats || NEWS_DEFAULT, rows = [];
    rows.push({ name: '홈에 뉴스 위젯', val: widgetOn('news') ? '표시' : '숨김', change: function () { var o = P.widgets || {}; o.news = !widgetOn('news'); set({ widgets: o }); } });
    rows.push({ name: '위젯에 보여줄 분야', val: catName(widgetNewsCat()), change: function (d) { var t = newsTabs(); set({ newsWidget: t[(t.indexOf(widgetNewsCat()) + d + t.length) % t.length] }); nwRot.cat = null; renderNewsWidget(true); } });
    NEWS_CATS.forEach(function (c) {
      var has2 = on.indexOf(c[0]) >= 0;
      rows.push({ name: c[1] + ' 탭', check: has2, dot: c[3], act: function () {
        var l = on.slice(), i = l.indexOf(c[0]);
        if (i >= 0) { if (l.length + (P.newsKeys || []).length <= 1) { toast('탭이 하나는 있어야 해요'); return; } l.splice(i, 1); }
        else l = NEWS_CATS.map(function (x) { return x[0]; }).filter(function (x) { return x === c[0] || l.indexOf(x) >= 0; });
        set({ newsCats: l });
      } });
    });
    (P.newsKeys || []).forEach(function (kw) {
      rows.push({ name: '“' + kw + '” 탭 빼기', sub: '키워드 탭', danger: true, action: true, act: function () { set({ newsKeys: (P.newsKeys || []).filter(function (x) { return x !== kw; }) }); } });
    });
    if ((P.newsKeys || []).length < 5) rows.push({ name: '키워드 탭 추가', sub: '예: 날씨, 반도체, 우리 동네 이름', action: true, act: function () {
      askText('뉴스 키워드', '', function (txt) { txt = String(txt || '').trim().slice(0, 20); if (!txt) return; var l = (P.newsKeys || []).filter(function (x) { return x !== txt; }); l.push(txt); set({ newsKeys: l }); fetchNews('q:' + txt); });
    } });
    return rows;
  }
  // invented headlines for the desktop preview (no real outlet's name or story)
  function sampleFeed(cat) {
    var base = { top: ['도심 공원 산책로 새 단장, 주말부터 개방', '올겨울 첫 한파 예보… 출근길 대비하세요', '동네 도서관 야간 개방 시범 운영', '전통시장 온라인 장보기 서비스 확대', '가을 단풍 절정 시기 지역별로 달라'],
      business: ['소비자물가 상승세 둔화', '중소기업 수출 지원 프로그램 신청 시작', '전기요금 체계 개편 논의'], tech: ['가정용 로봇 청소기 신제품 경쟁', '스마트TV 앱 생태계 커져', '인공지능 번역 정확도 크게 개선'],
      sports: ['프로야구 가을 무대 개막', '마라톤 대회 시민 참가 신청 마감 임박', '청소년 축구대표팀 결승 진출'], ent: ['가족 영화 흥행 1위', '인기 예능 새 시즌 방송 확정', '겨울 콘서트 일정 잇따라 발표'] };
    var list = (base[cat] || base.top).concat(base.top), outlets = ['코브일보', '샘플뉴스', '미리보기신문', '예시방송'];
    return '<rss><channel>' + list.slice(0, 12).map(function (t, i) {
      return '<item><title>' + t + ' - ' + outlets[i % 4] + '</title><link>https://example.com/news/' + cat + '/' + i + '</link><pubDate>' + new Date(Date.now() - (i * 17 + 5) * 60000).toUTCString() + '</pubDate><source url="https://example.com">' + outlets[i % 4] + '</source>' +
        '<description>&lt;ol&gt;&lt;li&gt;&lt;a href="#"&gt;' + t + '&lt;/a&gt; &lt;font&gt;' + outlets[i % 4] + '&lt;/font&gt;&lt;/li&gt;&lt;li&gt;&lt;a href="#"&gt;' + t.split(' ')[0] + ' 관련 후속 보도&lt;/a&gt; &lt;font&gt;' + outlets[(i + 1) % 4] + '&lt;/font&gt;&lt;/li&gt;&lt;li&gt;&lt;a href="#"&gt;전문가 "' + t.split(' ').slice(-1)[0] + '" 전망&lt;/a&gt; &lt;font&gt;' + outlets[(i + 2) % 4] + '&lt;/font&gt;&lt;/li&gt;&lt;/ol&gt;</description></item>';
    }).join('') + '</channel></rss>';
  }

  // ---------- clock ----------
  function tick() {
    var d = NOW();
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
    if (ROOT) { idleCheck(); limitTick(); refreshLive(); if (widgetOn('news')) fetchNews(widgetNewsCat()); }
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
    home.setAttribute('data-clock', 'on');
    document.documentElement.style.setProperty('--dim', DIM_VALUES[P.dim] || 0.22);
    ['calendar', 'memo'].forEach(function (act) { document.querySelector('.qbtn[data-act="' + act + '"]').hidden = P.topBtns !== true; });
    var pr = current();
    $('pName').textContent = pr.name;
    $('pDot').style.setProperty('--pc', pr.color);
    $('pDot').textContent = avatarOf(pr);
    $('pDot').classList.toggle('emoji', !!avatarOf(pr));
    if (base === 'me') renderMe();
    tick();
    renderTiles();
    $('hero').hidden = P.layout !== 'theater';
    updateHero();
    if (base === 'drawer') renderDrawer();
    if (panel) renderPanel();
    layoutWidgets();
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
    setTimeout(layoutWidgets, 0);
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
    return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) { return e.getClientRects().length > 0; });
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
  // Arrow keys. The screen is made of areas: the top bar, the row tabs, each row of apps, the Column
  // list and its apps. ◀ ▶ move inside the same line of the same area and stop at its end (a plain grid
  // of apps continues on the next line). Only ▲ ▼ leave an area, and coming back to an area returns to
  // the item that was last focused there.
  var areaMem = {};
  function areaOf(el) {
    var a = el.closest('#widgets, .quick, #rtabs, .colnav, #colGrid, .strip, #dGrid, #tiles');
    if (!a) return 'other';
    if (a.classList.contains('strip')) return 'strip' + Array.prototype.indexOf.call(document.querySelectorAll('.strip'), a);
    return a.id || a.className.split(' ')[0];
  }
  function sameLine(a, b) { var o = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return o > Math.min(a.height, b.height) * 0.4; }
  function nearest(els, from, dir) {
    var a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bestScore = Infinity;
    els.forEach(function (el) {
      if (el === from) return;
      var b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, main, side;
      if (dir === 'left') { main = ax - bx; side = Math.abs(ay - by); }
      else if (dir === 'right') { main = bx - ax; side = Math.abs(ay - by); }
      else if (dir === 'up') { main = ay - by; side = Math.abs(ax - bx); }
      else { main = by - ay; side = Math.abs(ax - bx); }
      if (main <= 4) return;
      var score = main + side * 2.4;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    return best;
  }
  function move(dir) {
    var els = focusables();
    if (!focusEl || els.indexOf(focusEl) < 0) { setFocus(els.filter(function (e) { return e.classList.contains('tile'); })[0] || els[0]); return; }
    var here = areaOf(focusEl), r = focusEl.getBoundingClientRect();
    areaMem[here] = focusEl;
    var target = null;
    if (dir === 'left' || dir === 'right') {
      var mine = els.filter(function (e) { return areaOf(e) === here; });
      target = nearest(mine.filter(function (e) { return sameLine(r, e.getBoundingClientRect()); }), focusEl, dir);
      // a plain grid (one area of several lines) continues on the next / previous line
      if (!target && !/^(quick|rtabs|colnav)$/.test(here)) {
        var i = mine.indexOf(focusEl), j = i + (dir === 'right' ? 1 : -1);
        if (mine[j] && !sameLine(r, mine[j].getBoundingClientRect())) target = mine[j];
      }
      // Column design: the list and its apps sit side by side
      if (!target && P.layout === 'column' && (here === 'colGrid' && dir === 'left' || here === 'colnav' && dir === 'right')) {
        var other = els.filter(function (e) { return dir === 'left' ? areaOf(e) === 'colnav' : areaOf(e) === 'colGrid'; });
        target = (dir === 'left' ? document.querySelector('.colitem.cur') : null) || nearest(other, focusEl, dir) || other[0] || null;
      }
    } else {
      target = nearest(els, focusEl, dir);
      if (target) {
        var there = areaOf(target), back = areaMem[there];
        if (there !== here && back && back !== focusEl && els.indexOf(back) >= 0) target = back;
      }
    }
    if (target) setFocus(target);
  }

  // ---------- actions ----------
  // intent: what a mini app should do right away (Cove 시네마: {play, resume})
  function launch(pkg, force, intent) {
    if (!force && !kidsAllows(pkg) && !isAdmin()) {
      var lbl = BYPKG[pkg] ? BYPKG[pkg].label : pkg;
      if (hasPin()) openPin({ mode: 'check', title: '"' + lbl + '"은(는) 허용되지 않은 앱이에요', onOk: function () { launch(pkg, true, intent); } });
      else toast('"' + lbl + '"은(는) 이 프로필에서 열 수 없어요');
      return;
    }
    if (!force && P.locked.indexOf(pkg) >= 0 && hasPin() && !unlocked()) {
      openPin({ mode: 'check', title: '"' + (BYPKG[pkg] ? BYPKG[pkg].label : pkg) + '" 열기', onOk: function () { launch(pkg, false, intent); } });
      return;
    }
    var a = BYPKG[pkg];
    if (a && a.screen) { countOpen(pkg); if (a.screen === 'cal') openCal('month'); else openMemo(); return; }   // not limited by time
    if (msLeft(current()) <= 0) { timeUp(function () { launch(pkg, true, intent); }); return; }
    if (!isGuest()) { P.recent = [pkg].concat(P.recent.filter(function (x) { return x !== pkg; })).slice(0, 12); savePrefs(); }
    if (a && a.mini) { openMini(pkg, intent); return; }
    if (N) {
      if (!N.launch(pkg)) { toast('앱을 열 수 없어요'); return; }
      countOpen(pkg);
      away = { pkg: pkg, pid: ROOT.current, t: Date.now() };
    }
    else { countOpen(pkg); toast((a ? a.label : pkg) + ' 실행 (미리보기에서는 실제로 열리지 않아요)'); }
  }

  // ---------- mini apps: pages that run inside Cove ----------
  // They need no TV permission. Cove passes them the remote keys and the profile, keeps their data per
  // profile (ROOT.appdata) and counts their use; Back at their first screen returns here.
  var MINI = [
    { pkg: 'cove.cinema', label: 'Cove 시네마', page: 'apps/cinema.html', c1: '#3b0764', c2: '#db2777', tag: '가상 OTT · 이어 보기', words: ['시네마', '영화관'],
      sym: '<defs><linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffe1ef"/></linearGradient>' +
        '<linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ec4899"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs>' +
        '<path d="M60 34l26 22M132 34l-26 22" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>' +
        '<g filter="url(#sh)"><rect x="34" y="54" width="124" height="84" rx="18" fill="url(#scr)"/><path d="M84 76v40l36-20z" fill="url(#pl)" stroke="url(#pl)" stroke-width="6" stroke-linejoin="round"/>' +
        '<rect x="66" y="146" width="60" height="9" rx="4.5" fill="#fff" opacity=".9"/></g>' +
        '<path d="M150 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff"/><circle cx="38" cy="38" r="3.5" fill="#fff" opacity=".8"/>' },
    { pkg: 'cove.cards', label: 'Cove 게임', page: 'apps/cards.html', c1: '#065f46', c2: '#14b8a6', tag: '짝꿍 카드 · 오목 · 블록 쌓기', words: ['게임', '짝꿍', '카드게임', '카드놀이', '같은그림'],
      sym: '<defs><linearGradient id="pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9f5ee"/></linearGradient></defs>' +
        '<g filter="url(#sh)"><path d="M58 70h76a26 26 0 0 1 25 19l9 34a17 17 0 0 1-29 15l-15-17H68l-15 17a17 17 0 0 1-29-15l9-34a26 26 0 0 1 25-19z" fill="url(#pad)"/></g>' +
        '<path d="M66 92v22M55 103h22" stroke="#0f766e" stroke-width="7" stroke-linecap="round"/><circle cx="124" cy="96" r="6" fill="#f59e0b"/><circle cx="138" cy="108" r="6" fill="#ef4444"/><circle cx="110" cy="108" r="6" fill="#3b82f6"/><circle cx="124" cy="120" r="6" fill="#22c55e"/>' +
        '<rect x="36" y="30" width="22" height="22" rx="5" fill="#fbbf24" transform="rotate(-12 47 41)"/><circle cx="148" cy="44" r="10" fill="#111827"/><circle cx="126" cy="38" r="10" fill="#f8fafc"/>' },
    { pkg: 'cove.sports', label: 'Cove 스포츠', page: 'apps/sports.html', c1: '#14532d', c2: '#22c55e', tag: '가상 리그 · 일정 · 라이브', words: ['스포츠', '축구', '야구', '경기일정', '경기결과', '코브리그'],
      sym: '<defs><linearGradient id="ball" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dcfce7"/></linearGradient></defs>' +
        '<path d="M30 150h132" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/><path d="M96 150V128" stroke="#fff" stroke-width="5" opacity=".55"/>' +
        '<g filter="url(#sh)"><circle cx="96" cy="88" r="44" fill="url(#ball)"/></g>' +
        '<path d="M96 70l17 12-6 20H85l-6-20z" fill="#14532d"/><path d="M96 70V48M113 82l20-8M107 102l12 18M85 102l-12 18M79 82l-20-8" stroke="#14532d" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="152" cy="40" r="12" fill="#ef4444"/><text x="152" y="45" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="sans-serif">●</text>' }
  ];
  // 창가의 작은 섬: a game that grows in real time; its tile shows what is waiting on the island.
  MINI.push({ pkg: 'cove.island', label: '창가의 작은 섬', page: 'apps/island.html', c1: '#0369a1', c2: '#22d3ee', live: 'island', words: ['작은섬', '섬열어', '섬켜', '섬가자', '섬보여'] });
  // Calendar and memo are Cove's own screens, shown as app tiles too. Their pictures are drawn live:
  // today's date and the next event, the newest memo and how many there are.
  MINI.push({ pkg: 'cove.calendar', label: '일정', screen: 'cal', c1: '#1e3a8a', c2: '#0ea5e9' },
            { pkg: 'cove.memo', label: '메모', screen: 'memo', c1: '#b45309', c2: '#fbbf24' });
  function xesc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]; }); }
  function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  var FONT = 'font-family="Noto Sans KR, Roboto, sans-serif"';
  function islandOf(pid) {
    var C = window.IslandCore, d = appData(pid, 'cove.island');
    if (!C || !d || !d.v) return null;
    var s = C.norm(JSON.parse(JSON.stringify(d)), pid);
    C.update(s, { now: Date.now(), shift: tzShift(Date.now()), weather: miniEnv().weather }, sharedData('cove.island'), pid);
    return s;
  }
  function islandSummary(pid) {
    var s = islandOf(pid);
    return s ? window.IslandCore.summary(s, { now: Date.now(), shift: tzShift(Date.now()), weather: miniEnv().weather }, sharedData('cove.island')) : null;
  }
  function liveSym(m) {
    if (m.live === 'island') {
      var sm = islandSummary(ROOT.current), n = sm ? sm.todo : 0;
      return '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>' +
        '<circle cx="140" cy="54" r="16" fill="#fde68a"/>' +
        '<g filter="url(#sh)"><ellipse cx="96" cy="128" rx="70" ry="26" fill="url(#sea)"/><ellipse cx="96" cy="118" rx="56" ry="18" fill="#fde7b0"/><ellipse cx="96" cy="112" rx="44" ry="13" fill="#6cc04f"/></g>' +
        '<path d="M88 112c4-22 2-40-4-54" stroke="#8d6e4f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<g fill="#2e9d57"><ellipse cx="66" cy="58" rx="24" ry="8" transform="rotate(-20 66 58)"/><ellipse cx="102" cy="52" rx="24" ry="8" transform="rotate(18 102 52)"/><ellipse cx="80" cy="44" rx="20" ry="7" transform="rotate(-70 80 44)"/><ellipse cx="96" cy="64" rx="18" ry="7" transform="rotate(40 96 64)"/></g>' +
        '<circle cx="118" cy="104" r="7" fill="#ef4444"/><circle cx="64" cy="106" r="6" fill="#f59e0b"/>' +
        (n ? '<g filter="url(#sh)"><circle cx="150" cy="44" r="22" fill="#ef4444"/></g><text x="150" y="52" ' + FONT + ' font-weight="800" font-size="' + (n > 9 ? 20 : 24) + '" fill="#fff" text-anchor="middle">' + (n > 99 ? '99' : n) + '</text>' : '');
    }
    var now = NOW();
    if (m.screen === 'cal') {
      return '<defs><linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f87171"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs>' +
        '<g filter="url(#sh)"><rect x="38" y="42" width="116" height="116" rx="24" fill="#fff"/><path d="M38 66a24 24 0 0 1 24-24h68a24 24 0 0 1 24 24v12H38z" fill="url(#hd)"/></g>' +
        '<rect x="66" y="32" width="10" height="22" rx="5" fill="#1e293b"/><rect x="116" y="32" width="10" height="22" rx="5" fill="#1e293b"/>' +
        '<text x="96" y="71" ' + FONT + ' font-weight="700" font-size="17" fill="#fff" text-anchor="middle">' + '일월화수목금토'.charAt(now.getDay()) + '요일</text>' +
        '<text x="96" y="140" ' + FONT + ' font-weight="800" font-size="58" fill="#1f2937" text-anchor="middle">' + now.getDate() + '</text>';
    }
    var n = activeMemos().length;
    return '<defs><linearGradient id="nt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff9c4"/><stop offset="1" stop-color="#fde047"/></linearGradient></defs>' +
      '<g filter="url(#sh)" transform="rotate(-4 96 100)"><path d="M44 42h106v82l-34 34H44z" fill="url(#nt)"/><path d="M116 158v-26a8 8 0 0 1 8-8h26z" fill="#facc15"/>' +
      '<path d="M62 78h70M62 100h56M62 122h38" stroke="#a16207" stroke-width="7" stroke-linecap="round" opacity=".75"/></g>' +
      '<circle cx="96" cy="44" r="10" fill="#ef4444"/><circle cx="93" cy="41" r="3" fill="#fff" opacity=".7"/>' +
      (n ? '<g filter="url(#sh)"><circle cx="150" cy="44" r="22" fill="#ef4444"/></g><text x="150" y="52" ' + FONT + ' font-weight="800" font-size="' + (n > 9 ? 20 : 24) + '" fill="#fff" text-anchor="middle">' + (n > 99 ? '99' : n) + '</text>' : '');
  }
  function liveText(m) {
    var now = NOW();
    if (m.live === 'island') {
      var sm = islandSummary(ROOT.current);
      if (!sm) return ['창가의 작은 섬', '나만의 섬을 시작해요', '진짜 시간으로 자라는 섬'];
      return ['내 섬 Lv.' + sm.lvl, sm.todo ? '할 일 ' + sm.todo + '개가 기다려요' : '모두 자라는 중이에요', '수확 ' + sm.ready + ' · 손님 ' + sm.guests + (sm.mail ? ' · 우편 ' + sm.mail : '')];
    }
    if (m.screen === 'cal') {
      var ne = nextEvent();
      return [(now.getMonth() + 1) + '월 ' + now.getDate() + '일',
        ne ? relDay(ne.first.start) + (ne.first.allDay ? '' : ' ' + fmtTime(ne.first.start)) : '다가오는 일정이 없어요',
        ne ? cut(ne.first.title, 13) + (ne.more > 0 ? ' 외 ' + ne.more + '개' : '') : ''];
    }
    var list = activeMemos();
    return ['메모', list.length ? '메모 ' + list.length + '개' : '새 메모가 없어요', list.length ? cut(list[0].text.split('\n')[0], 13) : ''];
  }
  // Tile pictures: a gradient with a soft light from the top left and a drop-shadowed symbol. Banners carry
  // only the name, like the banners of other TV apps; live state (date, counts) stays inside the icon.
  function nameSize(label) {
    var em = 0;
    String(label).split('').forEach(function (ch) { em += /[가-힣]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.62; });
    return Math.round(Math.min(56, 310 / Math.max(em, 1)));
  }
  function miniSvg(m, w, h) {
    var live = m.screen || m.live, sq = w === h, sym = live ? liveSym(m) : m.sym;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m.c1 + '"/><stop offset="1" stop-color="' + m.c2 + '"/></linearGradient>' +
      '<radialGradient id="lt" cx=".2" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".28"/></filter></defs>' +
      '<rect width="' + w + '" height="' + h + '" rx="' + (sq ? 42 : 0) + '" fill="url(#g)"/><rect width="' + w + '" height="' + h + '" rx="' + (sq ? 42 : 0) + '" fill="url(#lt)"/>' +
      (sq ? sym
        : '<circle cx="590" cy="40" r="150" fill="#fff" opacity=".06"/><circle cx="640" cy="330" r="120" fill="#fff" opacity=".05"/>' +
          '<g transform="translate(22 48) scale(1.38)">' + sym + '</g>' +
          '<text x="300" y="' + (180 + nameSize(m.label) * 0.36) + '" ' + FONT + ' font-weight="800" font-size="' + nameSize(m.label) + '" letter-spacing="-1" fill="#fff">' + xesc(m.label) + '</text>') + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }
  // Redraws the calendar and memo tiles when what they show has changed.
  function refreshLive() {
    var changed = false;
    MINI.forEach(function (m) {
      var a = BYPKG[m.pkg];
      if (!(m.screen || m.live) || !a) return;
      var ic = miniSvg(m, 192, 192), bn = miniSvg(m, 640, 360);
      if (ic !== a.icon || bn !== a.bannerUrl) { a.icon = ic; a.bannerUrl = bn; changed = true; }
    });
    if (!changed) return;
    renderTiles();
    if (P.layout === 'theater') updateHero();
    if (base === 'drawer') renderDrawer();
  }
  function miniApps() {
    return MINI.map(function (m) {
      return { pkg: m.pkg, label: m.label, color: m.c1, iconBg: m.c1, banner: true, mini: true, page: m.page, screen: m.screen, icon: miniSvg(m, 192, 192), bannerUrl: miniSvg(m, 640, 360) };
    });
  }
  function isMini(pkg) { return !!(BYPKG[pkg] && BYPKG[pkg].mini); }

  var mini = null;   // the open mini app {pkg, pid, start, from, frame, ready}
  var away = null;   // a TV app opened from Cove {pkg, pid, t}: its time is the time until Cove comes back
  // Data the whole family shares for one mini app (the island's lighthouse)
  function sharedData(pkg) { return ((ROOT.appdata || {}).family || {})[pkg] || {}; }
  // What a mini app may know about the world: Cove's time zone and the weather on the home screen
  function miniEnv() {
    var cur = wx.data && wx.city === P.weather ? (wx.data.current || {}) : null;
    return { shift: tzShift(Date.now()), weather: cur ? { code: cur.weather_code, isDay: cur.is_day, temp: cur.temperature_2m } : null, city: cityOf(P.weather) ? cityOf(P.weather)[1] : '' };
  }
  function appData(pid, pkg) { ROOT.appdata = ROOT.appdata || {}; var d = ROOT.appdata[pid] = ROOT.appdata[pid] || {}; return d[pkg] || {}; }
  function openMini(pkg, intent) {
    if (mini) endMini();   // another mini app was open: count its time before switching
    leaveMe(true);
    var a = BYPKG[pkg];
    var from = base === 'drawer' ? 'drawer' : 'home';
    closePanelQuiet();
    if (focusEl) { lastFocus[from] = focusEl.getAttribute('data-pkg') || lastFocus[from]; focusEl.classList.remove('focus'); }
    $('drawer').hidden = true;
    base = 'mini';
    var box = $('mini');
    box.innerHTML = '<iframe src="' + a.page + '" tabindex="-1" title="' + esc(a.label) + '"></iframe>';
    box.hidden = false;
    mini = { pkg: pkg, pid: ROOT.current, start: Date.now(), from: from, frame: box.querySelector('iframe'), ready: false, intent: intent || null, guest: isGuest() };
    countOpen(pkg);
  }
  function endMini() {
    if (!mini) return null;
    // collect what the app had not sent yet (it may close in the middle of a delayed save)
    try {
      var last = mini.frame.contentWindow.CoveApp && mini.frame.contentWindow.CoveApp._close();
      if (last && !mini.guest) {
        if (last.data && typeof last.data === 'object') { appData(mini.pid, mini.pkg); ROOT.appdata[mini.pid][mini.pkg] = last.data; }
        for (var op in last.forOthers) if (profileById(op) && op !== mini.pid) { appData(op, mini.pkg); ROOT.appdata[op][mini.pkg] = last.forOthers[op]; }
        savePrefs();
      }
    } catch (e) {}
    if (mini.start && !mini.guest) addTime(mini.pid, mini.pkg, Date.now() - mini.start);
    var from = mini.from;
    mini = null;
    $('mini').hidden = true;
    $('mini').innerHTML = '';
    base = 'home';
    return from;
  }
  function closeMini() {
    var from = endMini();
    if (backToMe()) return;
    if (from === 'drawer') openDrawer(); else restoreFocus('home');
  }
  function miniPost(m) { if (mini && mini.frame.contentWindow) mini.frame.contentWindow.postMessage(m, '*'); }
  function miniKey(k) {
    if (!mini.ready) { if (k === 'back') closeMini(); return; }
    miniPost({ type: 'key', key: k === 'longok' ? 'ok' : k });
  }
  window.addEventListener('message', function (e) {
    if (!mini || e.source !== mini.frame.contentWindow) return;
    var m = e.data || {};
    if (m.type === 'ready') {
      mini.ready = true;
      var pr = profileById(mini.pid);
      // a guest starts every app fresh and never sees or touches the family's data
      miniPost({ type: 'init', profile: { id: pr.id, name: pr.name, kids: pr.kind === 'kids' || (mini.guest && !!pr.allAges), guest: mini.guest, color: pr.color, avatar: pr.avatar || '' },
        data: mini.guest ? {} : appData(mini.pid, mini.pkg),
        family: ROOT.profiles.filter(function (x) { return x.id !== pr.id && !mini.guest && x.kind !== 'guest'; }).map(function (x) { return { id: x.id, name: x.name, color: x.color, avatar: x.avatar || '', kids: x.kind === 'kids', data: appData(x.id, mini.pkg) }; }),
        shared: mini.guest ? {} : sharedData(mini.pkg), env: miniEnv(), intent: mini.intent });
    } else if (mini.guest && /^(save|saveFor|saveShared)$/.test(m.type)) {
      // kept nowhere: the app starts over next time
    } else if (mini.guest && m.type === 'addEvent') {
      toast('손님 프로필에서는 일정을 추가할 수 없어요');
    } else if (m.type === 'save' && m.data && typeof m.data === 'object') {
      appData(mini.pid, mini.pkg);
      ROOT.appdata[mini.pid][mini.pkg] = m.data;
      savePrefs();
    } else if (m.type === 'saveFor' && m.data && typeof m.data === 'object' && profileById(m.pid) && m.pid !== mini.pid) {
      appData(m.pid, mini.pkg);
      ROOT.appdata[m.pid][mini.pkg] = m.data;
      savePrefs();
    } else if (m.type === 'saveShared' && m.data && typeof m.data === 'object') {
      ROOT.appdata = ROOT.appdata || {};
      ROOT.appdata.family = ROOT.appdata.family || {};
      ROOT.appdata.family[mini.pkg] = m.data;
      savePrefs();
    } else if (m.type === 'addEvent' && m.event && m.event.title && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(m.event.start || '')) {
      calCmd(JSON.stringify({ op: 'add', title: String(m.event.title).slice(0, 60), start: m.event.start, allDay: false, owner: mini.pid }));
    } else if (m.type === 'exit') closeMini();
    else if (m.type === 'toast') toast(String(m.text || '').slice(0, 120));
  });

  // ---------- usage history and the daily time limit ----------
  // ROOT.usage[profileId][pkg] = {opens, ms, last, days: {'2026-11-04': ms}}. Mini apps are timed exactly;
  // a TV app's time is how long Cove stayed in the background after opening it (an estimate).
  var LIMITS = [['0', '끄기'], ['15', '15분'], ['30', '30분'], ['45', '45분'], ['60', '1시간'], ['75', '1시간 15분'], ['90', '1시간 30분'], ['105', '1시간 45분'], ['120', '2시간'], ['150', '2시간 30분'], ['180', '3시간'], ['240', '4시간']];
  var EXTRA_MIN = 30;
  var warned = {};
  function todayKey() { return dayKey(NOW()); }
  function usageOf(pid, pkg) {
    ROOT.usage = ROOT.usage || {};
    var u = ROOT.usage[pid] = ROOT.usage[pid] || {};
    if (!u[pkg]) u[pkg] = { opens: 0, ms: 0, last: 0, days: {} };
    return u[pkg];
  }
  function pruneDays(u) { var old = dayKey(wall(Date.now() - 14 * 86400000)); Object.keys(u.days).forEach(function (k) { if (k < old) delete u.days[k]; }); }
  function countOpen(pkg) { if (isGuest()) return; var u = usageOf(ROOT.current, pkg); u.opens++; u.last = Date.now(); pruneDays(u); savePrefs(); }
  function addTime(pid, pkg, ms) {
    if (!(ms > 0)) return;
    ms = Math.min(ms, 3 * 3600000);   // a TV left on in an app overnight should not count as a whole night
    var u = usageOf(pid, pkg), k = todayKey();
    u.ms += ms; u.days[k] = (u.days[k] || 0) + ms;
    savePrefs();
  }
  function daysMs(u, n) { var t = 0; for (var i = 0; i < n; i++) t += u.days[dayKey(wall(Date.now() - i * 86400000))] || 0; return t; }
  function profileMs(pid, n) {
    var u = (ROOT.usage || {})[pid] || {}, t = 0;
    Object.keys(u).forEach(function (pkg) { t += daysMs(u[pkg], n); });
    if (mini && mini.pid === pid && mini.start) t += Date.now() - mini.start;
    return t;
  }
  function limitOf(pr) { return pr.id === ROOT.masterId || pr.kind === 'guest' ? 0 : (pr.limit || 0); }
  function msLeft(pr) {
    var lim = limitOf(pr);
    if (!lim) return Infinity;
    var extra = pr.extra && pr.extra.day === todayKey() ? pr.extra.min : 0;
    return (lim + extra) * 60000 - profileMs(pr.id, 1);
  }
  function fmtMs(ms) {
    var m = Math.round(ms / 60000);
    if (ms > 0 && m < 1) return '1분 미만';
    var h = Math.floor(m / 60);
    return h ? h + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') : m + '분';
  }
  // Out of time: the PIN gives 30 more minutes.
  function timeUp(then) {
    var pr = current();
    if (!hasPin()) { toast('오늘 쓸 수 있는 시간이 끝났어요'); return; }
    openPin({ mode: 'check', title: '오늘 쓸 수 있는 시간이 끝났어요', sub: '어른이 PIN을 넣으면 ' + EXTRA_MIN + '분 더 쓸 수 있어요', onOk: function () {
      var day = todayKey(), had = pr.extra && pr.extra.day === day ? pr.extra.min : 0;
      // the extra time counts from now, even if the limit was passed a while ago
      var over = Math.max(0, -msLeft(pr)) / 60000;
      pr.extra = { day: day, min: had + Math.ceil(over) + EXTRA_MIN };
      delete warned[pr.id];
      savePrefs();
      toast(EXTRA_MIN + '분 더 쓸 수 있어요');
      if (then) then();
    } });
  }
  // Every 10 s: warn 5 minutes before the end, and close a mini app when the time is up.
  function limitTick() {
    if (!mini) return;
    var pr = profileById(mini.pid), left = msLeft(pr);
    if (left === Infinity) return;
    if (left <= 0) { closeMini(); toast('오늘 쓸 수 있는 시간이 끝났어요'); return; }
    if (left <= 5 * 60000 && warned[pr.id] !== todayKey()) { warned[pr.id] = todayKey(); toast('오늘 쓸 수 있는 시간이 ' + fmtMs(left) + ' 남았어요'); }
  }
  function backFromApp() {
    if (!away) return;
    if (!isGuest(profileById(away.pid) || current())) addTime(away.pid, away.pkg, Date.now() - away.t);
    away = null;
  }

  function usageRows() {
    return ROOT.profiles.filter(function (pr) { return !isGuest(pr); }).map(function (pr) {
      var lim = limitOf(pr);
      return { id: pr.id, name: pr.name, dot: pr.color, action: true,
        sub: '오늘 ' + fmtMs(profileMs(pr.id, 1)) + ' · 최근 7일 ' + fmtMs(profileMs(pr.id, 7)),
        val: lim ? '하루 ' + labelOf(LIMITS, lim) : (pr.id === ROOT.masterId ? '마스터' : ''),
        act: function () { openPanel('usageprof', { target: pr.id, back: { type: 'usage', id: pr.id } }); } };
    });
  }
  function whenText(t) {
    if (!t) return '';
    var d = wall(t), today = todayKey(), hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (dayKey(d) === today) return '오늘 ' + hm;
    if (dayKey(d) === dayKey(wall(Date.now() - 86400000))) return '어제 ' + hm;
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
  }
  function usageProfRows() {
    var pr = profileById(panel.target);
    if (!pr) return [{ name: '이 프로필이 없어요' }];
    var isMaster = pr.id === ROOT.masterId, rows = [];
    rows.push({ name: '하루 사용 시간', sub: isMaster ? '마스터 프로필에는 제한이 없어요' : '다 쓰면 앱이 열리지 않아요. PIN으로 ' + EXTRA_MIN + '분씩 늘려요',
      val: isMaster ? '제한 없음' : labelOf(LIMITS, pr.limit || 0),
      change: function (d) {
        if (isMaster) { toast('마스터 프로필에는 시간 제한을 걸 수 없어요'); return; }
        if (!hasPin()) { needPinFirst(); return; }
        gate('admin', '사용 시간 제한 바꾸기', function () { pr.limit = +cycle(LIMITS, pr.limit || 0, d); savePrefs(); renderPanel(); });
      } });
    var left = msLeft(pr);
    if (left !== Infinity) rows.push({ name: '오늘 남은 시간', val: left > 0 ? fmtMs(left) : '다 썼어요' });
    var u = (ROOT.usage || {})[pr.id] || {};
    var list = Object.keys(u).filter(function (p) { return u[p].opens || u[p].ms; })
      .sort(function (a, b) { return (daysMs(u[b], 7) - daysMs(u[a], 7)) || (u[b].last - u[a].last); });
    if (!list.length) rows.push({ name: '아직 기록이 없어요', sub: '이 프로필에서 앱을 열면 여기에 쌓여요' });
    list.forEach(function (p) {
      var a = BYPKG[p], x = u[p], est = a && !a.mini ? '약 ' : '';
      rows.push({ name: a ? a.label : p, appicon: a ? iconUrl(a) : '',
        sub: a && a.screen ? x.opens + '번 열기' : '오늘 ' + est + fmtMs(daysMs(x, 1)) + ' · 7일 ' + est + fmtMs(daysMs(x, 7)) + ' · ' + x.opens + '번 열기',
        val: whenText(x.last) });
    });
    var cin = appData(pr.id, 'cove.cinema').hist || [];
    cin.slice(0, 5).forEach(function (h) {
      rows.push({ name: '🎬 ' + h.title, sub: h.done ? '끝까지 봤어요' : fmtMs(h.pos * 1000) + ' / ' + fmtMs(h.dur * 1000) + '까지 봤어요', val: whenText(h.t) });
    });
    var ism = islandSummary(pr.id);
    if (ism) rows.push({ name: '🏝️ 창가의 작은 섬 Lv.' + ism.lvl, sub: '조개 ' + ism.shells + ' · 손님 ' + ism.guests + ' · 할 일 ' + ism.todo + '개' });
    var cgd = appData(pr.id, 'cove.cards');
    if (cgd.gomoku) rows.push({ name: '⚫ 오목', sub: '컴퓨터 상대 ' + (cgd.gomoku.w || 0) + '승 ' + (cgd.gomoku.l || 0) + '패' + (cgd.gomoku.pvp ? ' · 둘이서 ' + cgd.gomoku.pvp + '판' : '') });
    if (cgd.blocks && cgd.blocks.best) rows.push({ name: '🧱 블록 쌓기 최고 ' + cgd.blocks.best.toLocaleString() + '점', sub: cgd.blocks.played + '판 · 가장 많이 지운 줄 ' + (cgd.blocks.lines || 0) });
    var best = cgd.best || {};
    Object.keys(best).sort().forEach(function (lv) {
      var b = best[lv];
      rows.push({ name: '🃏 짝꿍 카드 ' + lv.replace('x', '×') + ' 최고 기록', sub: b.moves + '번 뒤집기 · ' + fmtSecs(b.secs), val: whenText(b.t) });
    });
    if (list.length) rows.push({ name: '이 프로필의 사용 기록 지우기', danger: true, action: true, val: armed === 'delusage' ? '한 번 더 누르면 지우기' : '',
      act: function () { twice('delusage', function () { delete ROOT.usage[pr.id]; savePrefs(); renderPanel(); toast('사용 기록을 지웠어요'); }); } });
    return rows;
  }
  function fmtSecs(s) { s = Math.round(s || 0); return Math.floor(s / 60) + '분 ' + ('0' + s % 60).slice(-2) + '초'; }

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
    leaveMe(false);
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
    moveOrig = { apps: clone(P.apps), cat: clone(P.cat) };
    lastFocus.home = pkg;
    renderTiles();
    toast((sectioned() && P.cats.length > 1 ? '◀ ▶로 순서, ▲ ▼로 다른 줄로 옮겨요' : '방향키로 옮겨요') + ' · OK 여기에 두기 · 뒤로 취소');
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
  // OK keeps the new place; Back puts the app back where it was.
  var moveOrig = null;
  function endMove(keep) {
    var pkg = moving;
    if (!keep && moveOrig) { P.apps = moveOrig.apps; P.cat = moveOrig.cat; savePrefs(); }
    moving = null; moveOrig = null;
    renderTiles();
    lastFocus.home = pkg; restoreFocus('home');
    toast(keep ? '여기에 뒀어요' : '옮기기를 취소했어요');
  }

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
  // 손님 (shared) profile: only the apps the master allows, nothing of its own is kept, and it sees only
  // the events and memos marked "손님 프로필에 보이기".
  function isGuest(pr) { return (pr || current()).kind === 'guest'; }
  function guestProfile() { for (var i = 0; i < ROOT.profiles.length; i++) if (ROOT.profiles[i].kind === 'guest') return ROOT.profiles[i]; return null; }
  var GUEST_COLOR = '#64748b', GUEST_AVATAR = '🛋️';
  var GUEST_NOTE = '손님 프로필에서는 볼 수만 있어요';
  function isAdmin() { return ROOT.current === master().id || Date.now() < unlockedUntil; }
  function may(kind) {
    if (isAdmin()) return true;
    if (isGuest()) return kind === 'apps' || (kind === 'look' && current().guestLook !== false);   // home look and apps (within the allowed ones), if the master lets it
    if (kind === 'look') return !isKids() || current().kidsLook !== false;
    if (kind === 'adult') return !isKids();
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
  function closePin() { pinState = null; $('pin').hidden = true; if (base === 'home' && !panel && backToMe()) return; }
  function renderPin() {
    var st = pinState;
    $('pinTitle').textContent = st.mode === 'new' ? '새 PIN 4자리' : st.mode === 'confirm' ? '한 번 더 입력하세요' : (st.title || 'PIN을 입력하세요');
    var sub = $('pinSub');
    sub.textContent = st.bad || st.sub || (st.mode === 'check' ? 'PIN 4자리를 입력하세요' : '잊어버리면 Cove 앱 데이터를 지워야 해요');
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
      sig('cove.pin.ask', { why: 'switch' });
      openPin({ mode: 'check', title: isKids() ? '키즈 프로필에서 나가기' : '"' + pr.name + '" 프로필 열기', onOk: function () { sig('cove.pin.ok', { why: 'switch' }); doSwitch(id, quiet); } });
      return;
    }
    doSwitch(id, quiet);
  }
  function doSwitch(id, quiet) {
    if (edits.length) { dropEdits(true); closePanelQuiet(); }
    unlockedUntil = 0;   // grown-up access never carries over to another profile
    ROOT.current = id;
    P = current().prefs;
    sig('cove.profile.switch', { id: id, kind: current().kind || 'normal', master: id === master().id });
    lastFocus.home = null;
    moving = null;
    savePrefs();
    render();
    okGuardUntil = Math.max(okGuardUntil, Date.now() + 700);
    var left = msLeft(current());
    if (!quiet) toast(current().name + ' 프로필로 바꿨어요' + (left !== Infinity ? ' · 오늘 ' + (left > 0 ? fmtMs(left) + ' 남았어요' : '쓸 시간이 끝났어요') : ''));
  }
  // "New profile" opens a screen to choose name, colour, kind and starting point; nothing is created until "추가".
  function addProfile() {
    gate('admin', '프로필 추가', function () {
      var used = ROOT.profiles.map(function (p) { return p.name; });
      var name = PROFILE_NAMES.filter(function (n) { return used.indexOf(n) < 0; })[0] || ('프로필 ' + (ROOT.profiles.length + 1));
      openPanel('newprofile', { draft: { name: name, color: PROFILE_COLORS[ROOT.profiles.length % PROFILE_COLORS.length], kind: 'normal', start: 'default' },
        back: panel && panel.type === 'profset' ? { type: 'profset', id: 'add', opts: { back: panel.back } } : null });
    });
  }
  function kidsDefaults() {
    return APPS.filter(function (a) { return a.mini || /kids|키즈|junior|주니어/i.test(a.label + ' ' + a.pkg); }).map(function (a) { return a.pkg; });
  }
  function guestDefaults() {
    return APPS.filter(function (a) { return (a.mini && !a.screen) || /youtube|유튜브/i.test(a.label + ' ' + a.pkg); }).map(function (a) { return a.pkg; });
  }
  function createProfile(d) {
    if (d.kind === 'guest' && guestProfile()) { toast('손님 프로필은 하나만 만들 수 있어요'); return; }
    if (d.kind === 'kids' && !hasPin()) {
      toast('키즈 프로필을 지키려면 PIN이 필요해요. 먼저 PIN을 만들어 주세요');
      openPin({ mode: 'new', onOk: function () { createProfile(d); } });
      return;
    }
    var prefs = d.start === 'copy' && d.kind === 'normal' ? clone(P) : withDefaults({});
    var pr = { id: 'p' + Date.now().toString(36), name: d.name, color: d.color, kind: d.kind, prefs: prefs };
    if (d.kind === 'guest') {
      // the plainest home: the basic design, no widgets, the allowed apps only; the city follows the master's
      pr.color = GUEST_COLOR; pr.avatar = GUEST_AVATAR; pr.allow = guestDefaults(); pr.prefs.apps = pr.allow.slice();
      pr.prefs.widgets = { clock: false, weather: false, news: false }; pr.prefs.calPreview = false; pr.prefs.memoPreview = false;
      pr.prefs.weather = master().prefs.weather || null;
    } else if (d.kind === 'kids') { pr.allow = kidsDefaults(); pr.prefs.apps = pr.allow.slice(); pr.kidsLook = true; }
    else if (!Array.isArray(pr.prefs.apps)) pr.prefs.apps = defaultApps();
    dropEdits(false);   // creating a profile is final; it must not be undone with the page it was made from
    ROOT.profiles.push(pr);
    closePanelQuiet();
    doSwitch(pr.id, true);
 toast(d.kind === 'guest' ? '"' + d.name + '" 손님 프로필을 만들었어요. 쓸 수 있는 앱은 마스터 메뉴에서 정해요'
      : d.kind === 'kids'
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
  // Every ◀ ▶ list wraps around. Keys may be numbers or text; they are compared as text.
  function cycle(list, cur, d) {
    var keys = list.map(function (x) { return Array.isArray(x) ? x[0] : x; });
    var i = keys.map(String).indexOf(String(cur));
    if (i < 0) i = d > 0 ? -1 : 0;
    return keys[(i + d + keys.length) % keys.length];
  }
  function labelOf(list, key) {
    for (var i = 0; i < list.length; i++) if (String(list[i][0]) === String(key)) return list[i][1];
    return key;
  }
  // A row that needs OK twice (reset, delete).
  function twice(id, fn) {
    if (armed !== id) { armed = id; renderPanel(); return; }
    armed = '';
    fn();
  }

  // 꾸미기 is two levels: groups with a summary of what is set, then the group's own page.
  var LOOK_GROUPS = [
    ['design', '디자인', 'look'], ['bg', '배경', 'look'], ['tiles', '타일', 'look'], ['home', '홈 앱 · 줄', 'apps'], ['info', '시계 · 위젯', 'look']
  ];
  function onOff(v) { return v ? '켜짐' : '꺼짐'; }
  function lookSummary(id) {
    if (id === 'design') return DESIGNS[P.design].name + ' · ' + DESIGNS[P.design].desc;
    if (id === 'bg') return bgName(P.bg) + (P.nightBg ? ' · 밤 ' + bgName(P.nightBg) : '') + ' · 어둡게 ' + DIMS[P.dim];
    if (id === 'tiles') return labelOf(TILES, P.tiles) + ', ' + labelOf(SHAPES, P.shape) + ', ' + labelOf(SIZES, P.size) + (P.labels ? '' : ' · 이름 숨김');
    if (id === 'home') return visibleApps().length + '개 앱' + (P.cats.length > 1 || P.cats[0].name ? ' · ' + P.cats.length + '줄' : '') + (P.recentRow ? ' · 최근 실행 줄' : '');
    return '위젯 ' + WIDGETS.filter(function (w) { return widgetOn(w[0]); }).map(function (w) { return w[1]; }).join(', ') + ' · ' + labelOf(FONTS, P.font);
  }
  function lookRows() {
    var rows = LOOK_GROUPS.map(function (g) {
      return { id: g[0], need: g[2], name: g[1], sub: lookSummary(g[0]), action: true, act: function () { openPanel('lookgrp', { grp: g[0], back: { type: 'look', id: g[0] } }); } };
    });
    if (!may('look')) rows.unshift(isGuest() ? { name: '마스터가 손님 프로필의 꾸미기를 막아 두었어요', sub: '홈 앱 정리는 할 수 있어요' } : { name: '이 프로필은 마스터가 꾸미기를 막아 두었어요', sub: '홈 앱 정리는 할 수 있어요' });
    rows.push({ need: 'look', name: '처음 상태로', sub: '이 프로필의 꾸미기만 되돌려요', danger: true, action: true, val: armed === 'reset' ? '한 번 더 누르면 초기화' : '',
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
  function lookGroupRows(grp) {
    var rows;
    if (grp === 'design') {
      return DESIGN_IDS.map(function (id) {
        return { name: DESIGNS[id].name, sub: DESIGNS[id].desc, check: P.design === id, act: function () { if (P.design !== id) applyDesign(id); } };
      });
    }
    if (grp === 'bg') {
      rows = [
        { name: '배경', val: bgName(P.bg), thumb: bgThumb(P.bg), change: function (d) { set({ bg: stepBg(P.bg, d, false) }); } },
        { name: '밤 배경', sub: '오후 7시부터 오전 6시까지', val: bgName(P.nightBg), thumb: bgThumb(P.nightBg), change: function (d) { set({ nightBg: stepBg(P.nightBg, d, true) }); } },
        { name: '배경 어둡게', val: DIMS[P.dim], change: function (d) { set({ dim: (P.dim + d + 4) % 4 }); } }
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
      return rows;
    }
    if (grp === 'tiles') {
      return [
        { name: '타일 스타일', val: labelOf(TILES, P.tiles), change: function (d) { set({ tiles: cycle(TILES, P.tiles, d) }); } },
        { name: '타일 모양', val: labelOf(SHAPES, P.shape), change: function (d) { set({ shape: cycle(SHAPES, P.shape, d) }); } },
        { name: '타일 크기', val: labelOf(SIZES, P.size), change: function (d) { set({ size: cycle(SIZES, P.size, d) }); } },
        { name: '앱 이름', val: P.labels ? '표시' : '숨김', change: function () { set({ labels: !P.labels }); } }
      ];
    }
    if (grp === 'home') {
      return [
        { name: '앱 고르기', id: 'apps', sub: '홈 화면에 둘 앱과 순서', val: visibleApps().length + '개', action: true,
          act: function () { openPanel('apps', { back: { type: 'lookgrp', id: 'apps', opts: { grp: 'home', back: { type: 'look', id: 'home' } } } }); } },
        { name: '카테고리 줄', id: 'cats', sub: '앱을 소제목 달린 줄로 묶어요', val: P.cats.length > 1 || P.cats[0].name ? P.cats.length + '줄' : '사용 안 함', action: true,
          act: function () { openPanel('cats', { back: { type: 'lookgrp', id: 'cats', opts: { grp: 'home', back: { type: 'look', id: 'home' } } } }); } },
        { name: '최근 실행 줄', sub: '최근에 연 앱을 맨 위 줄에 보여줘요', val: P.recentRow ? '표시' : '숨김', change: function () { set({ recentRow: !P.recentRow }); } },
        { name: '새 앱 자동 추가', sub: '새로 설치한 앱을 홈 끝에 붙여요', val: onOff(P.autoAdd !== false), change: function () { set({ autoAdd: P.autoAdd === false }); } }
      ];
    }
    return [
      { name: '시계 위젯', sub: '시계를 누르면 탁상시계 화면 · 형식은 거기서', val: widgetOn('clock') ? '홈에 있음' : '빠져 있음', change: function () { var o = P.widgets || {}; o.clock = !widgetOn('clock'); if (o.clock && P.clock === 'off') P.clock = '24'; set({ widgets: o }); } },
      { name: '날씨 위젯', sub: '날씨를 누르면 자세한 날씨 · 도시는 거기서', val: widgetOn('weather') ? '홈에 있음' : '빠져 있음', change: function () { var o = P.widgets || {}; o.weather = !widgetOn('weather'); set({ widgets: o }); } },
      { name: '뉴스 위젯', sub: '헤드라인이 돌아가며 나와요 · 분야는 뉴스 화면 ⚙에서', val: widgetOn('news') ? '홈에 있음' : '빠져 있음', change: function () { var o = P.widgets || {}; o.news = !widgetOn('news'); set({ widgets: o }); } },
      { name: '위젯 자리 처음대로', sub: '위젯은 길게 OK → 위치 옮기기로 옮겨요', action: true, act: function () { if (P.wpos) delete P.wpos[P.layout]; savePrefs(); layoutWidgets(); toast('이 디자인의 기본 배치로 돌렸어요'); } },
      { name: '글꼴', val: labelOf(FONTS, P.font), change: function (d) { set({ font: cycle(FONTS, P.font, d) }); } },
      { name: '시계 아래 다음 일정', sub: '오늘·내일 일정을 한 줄로', val: P.calPreview !== false ? '표시' : '숨김', change: function () { set({ calPreview: P.calPreview === false }); } },
      { name: '시계 아래 메모', sub: '최근 메모를 한 줄로', val: P.memoPreview !== false ? '표시' : '숨김', change: function () { set({ memoPreview: P.memoPreview === false }); } },
      { name: '위쪽 일정·메모 버튼', sub: '홈의 일정·메모 타일로도 열 수 있어요', val: P.topBtns === true ? '표시' : '숨김', change: function () { set({ topBtns: P.topBtns !== true }); } }
    ];
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
    if (isMini(pkg)) return rows;
    rows.push({ name: '앱 정보', sub: '저장공간, 권한, 강제 종료 · 마스터', action: true, act: function () { gate('admin', '앱 정보', function () { if (N) N.appInfo(pkg); else toast('TV에서만 열 수 있어요'); }); } });
    rows.push({ name: '앱 삭제', sub: 'TV의 삭제 확인 화면이 열려요 · 마스터', danger: true, action: true, act: function () {
      gate('admin', '앱 삭제', function () { closePanel(); if (N) N.uninstall(pkg); else toast('TV에서만 삭제할 수 있어요'); }); } });
    return rows;
  }

  function profileBadges(pr) {
    return [pr.id === master().id ? '마스터' : '', pr.kind === 'kids' ? '키즈' : '', pr.kind === 'guest' ? '손님 · 공용' : '', pr.id !== master().id && pr.lockIn ? 'PIN 필요' : ''].filter(Boolean).join(' · ');
  }
  // 프로필 설정: only what this profile may change. The master sees everything, including each
  // other profile's management page; a kids profile sees its icon (if allowed) and its allowed apps.
  function profileRows() {
    var cur = current(), rows = [];
    if (!isGuest(cur)) rows.push({ need: 'look', name: '아이콘', sub: '◀ ▶로 골라요', val: cur.avatar || '이름 첫 글자',
      change: function (d) { cur.avatar = AVATARS[(AVATARS.indexOf(cur.avatar || '') + d + AVATARS.length) % AVATARS.length]; render(); renderPanel(); } });
    rows.push({ need: 'self', name: '이름', sub: 'OK로 직접 입력, ◀ ▶로 추천 이름', val: cur.name, action: true,
      act: function () { askText('프로필 이름', cur.name, function (txt) { if (txt !== null && txt.trim()) { cur.name = txt.trim().slice(0, 12); render(); renderPanel(); } }); },
      change: function (d) {
        var others = ROOT.profiles.filter(function (p) { return p.id !== cur.id; }).map(function (p) { return p.name; });
        var names = PROFILE_NAMES.filter(function (n) { return others.indexOf(n) < 0; });
        cur.name = names[(names.indexOf(cur.name) + d + names.length) % names.length]; render(); renderPanel();
      } });
    rows.push({ need: 'self', name: '색', dot: cur.color, val: '', change: function (d) { cur.color = PROFILE_COLORS[(PROFILE_COLORS.indexOf(cur.color) + d + PROFILE_COLORS.length) % PROFILE_COLORS.length]; render(); renderPanel(); } });
    if (hasPin() && cur.id !== master().id) rows.push({ need: 'self', name: '이 프로필로 바꿀 때 PIN', sub: '다른 프로필에서 넘어올 때 PIN을 물어요', val: onOff(cur.lockIn), change: function () { cur.lockIn = !cur.lockIn; renderPanel(); } });
    if (isGuest(cur)) rows.push({ name: '손님 프로필이에요', sub: '쓸 수 있는 앱 ' + (cur.allow || []).length + '개는 마스터가 정해요. 앱 기록은 남지 않고, 공개된 일정 · 메모만 볼 수 있어요. 꾸미기는 할 수 있어요' });
    if (isKids(cur)) rows.push({ name: '허용 앱 ' + (cur.allow || []).length + '개', sub: '이 중에서 홈 화면을 꾸밀 수 있어요. 허용 앱은 마스터가 정해요' });
    if (isAdmin()) {
      ROOT.profiles.forEach(function (pr) {
        if (pr.id === cur.id) return;
        rows.push({ id: 'pm' + pr.id, name: '프로필 관리 · ' + (pr.avatar ? pr.avatar + ' ' : '') + pr.name, dot: pr.color, sub: (profileBadges(pr) || '일반') + ' · 마스터', action: true,
          act: function () { openPanel('profmanage', { target: pr.id, back: { type: 'profset', id: 'pm' + pr.id, opts: { back: panel.back } } }); } });
      });
      rows.push({ id: 'add', name: '새 프로필 추가', action: true, act: addProfile });
    } else if (hasPin()) {
      rows.push({ id: 'master', name: '마스터 메뉴 열기', sub: '다른 프로필 관리, 새 프로필은 마스터가 해요', action: true,
        act: function () { gate('admin', '마스터 메뉴', function () { renderPanel(); }); } });
    }
    return rows;
  }

  // ---------- profile switcher (the top bar's profile button) ----------
  // Profiles side by side, a ＋ at the end, and two buttons below: 나의 프로필 and 프로필 설정.
  var sw = null;   // {row: 0 profiles | 1 buttons, i, b}
  function openSwitcher() {
    closePanelQuiet();
    var list = ROOT.profiles;
    sw = { row: 0, i: Math.max(0, list.indexOf(current())), b: 0 };
    $('switcher').hidden = false;
    sig('cove.switcher.open');
    renderSwitcher();
  }
  function closeSwitcher(quiet) { sw = null; $('switcher').hidden = true; if (!quiet) restoreFocus('home'); }
  function renderSwitcher() {
    var list = ROOT.profiles, n = list.length;
    $('swList').innerHTML = list.map(function (pr, i) {
      return '<div class="sw-p' + (sw.row === 0 && sw.i === i ? ' cfocus' : '') + (pr.id === ROOT.current ? ' cur' : '') + '">' + avatarHtml(pr, 'mid') +
        '<b>' + esc(pr.name) + '</b><small>' + (pr.id === ROOT.current ? '사용 중' : esc(profileBadges(pr) || '')) + (pr.lockIn || (pr.id === master().id && pr.id !== ROOT.current) && hasPin() ? ' 🔒' : '') + '</small></div>';
    }).join('') + '<div class="sw-p add' + (sw.row === 0 && sw.i === n ? ' cfocus' : '') + '"><span class="av mid plus">＋</span><b>추가</b><small>' + (isAdmin() ? '새 프로필' : '마스터') + '</small></div>';
    var btns = isGuest() ? ['프로필 설정'] : ['나의 프로필', '프로필 설정'];
    $('swBtns').innerHTML = btns.map(function (t, i) { return '<span class="me-btn' + (sw.row === 1 && sw.b === i ? ' cfocus' : '') + '">' + t + '</span>'; }).join('');
  }
  function switcherKey(k) {
    var n = ROOT.profiles.length;
    if (k === 'back') { closeSwitcher(); return; }
    if (sw.row === 0) {
      if (k === 'left') sw.i = Math.max(0, sw.i - 1);
      else if (k === 'right') sw.i = Math.min(n, sw.i + 1);
      else if (k === 'down') sw.row = 1;
      else if (k === 'ok' || k === 'longok') {
        if (sw.i === n) { closeSwitcher(true); addProfile(); return; }
        var pr = ROOT.profiles[sw.i];
        closeSwitcher(pr.id !== ROOT.current);
        if (pr.id !== ROOT.current) { switchProfile(pr.id); if (!pinState) restoreFocus('home'); }
        return;
      }
    } else {
      if (k === 'left') sw.b = 0; else if (k === 'right') sw.b = isGuest() ? 0 : 1; else if (k === 'up') sw.row = 0;
      else if (k === 'ok' || k === 'longok') { var which = isGuest() ? 1 : sw.b; closeSwitcher(true); if (which === 0) openMe(); else openPanel('profset'); return; }
    }
    renderSwitcher();
  }


  // Master: everything about one profile in one place.
  function manageRows() {
    var t = profileById(panel.target);
    if (!t) return [{ name: '이 프로필이 없어요' }];
    var kids = isKids(t);
    if (isGuest(t)) return guestManageRows(t);
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
    rows.push({ id: 'usage', name: '사용 기록 · 시간 제한', sub: t.id === ROOT.masterId ? '마스터 프로필에는 제한이 없어요' : '하루에 쓸 수 있는 시간', val: limitOf(t) ? labelOf(LIMITS, t.limit) : '', action: true,
      act: function () { openPanel('usageprof', { target: t.id, back: { type: 'profmanage', id: 'usage', opts: { target: t.id, back: panel.back } } }); } });
    rows.push({ name: '이 프로필로 바꿀 때 PIN', sub: '다른 프로필에서 넘어올 때 PIN을 물어요', val: t.lockIn ? '켜짐' : '꺼짐',
      change: function () { if (!hasPin()) { needPinFirst(); return; } t.lockIn = !t.lockIn; savePrefs(); renderPanel(); } });
    rows.push({ name: '이 프로필 삭제', danger: true, action: true, val: armed === 'delprofile' ? '한 번 더 누르면 삭제' : '',
      act: function () { twice('delprofile', function () { dropEdits(false); deleteProfileById(t.id); closePanelQuiet(); openPanel('profset'); }); } });
    return rows;
  }

  function guestManageRows(t) {
    var rows = [
      { name: '이름', sub: 'OK로 직접 입력', val: t.name, action: true,
        act: function () { askText('프로필 이름', t.name, function (txt) { if (txt !== null && txt.trim()) { t.name = txt.trim().slice(0, 12); savePrefs(); render(); } }); } },
      { name: '종류', sub: '공용 프로필 · 기록이 남지 않고, 공개한 일정 · 메모만 봐요', val: '손님' },
      { id: 'allow', name: '쓸 수 있는 앱', sub: '로그인된 앱(넷플릭스 등)은 그 계정 그대로 쓰게 돼요', val: (t.allow || []).length + '개', action: true,
        act: function () { openPanel('allow', { target: t.id, back: { type: 'profmanage', id: 'allow', opts: { target: t.id, back: panel.back } } }); } },
      { name: '손님이 꾸미기 바꾸기', sub: '디자인, 배경, 타일, 시계 · 위젯, 홈 앱 정리(쓸 수 있는 앱 안에서)', val: t.guestLook !== false ? '허용' : '막음', change: function () { t.guestLook = t.guestLook === false; savePrefs(); renderPanel(); } },
      { name: 'Cove 시네마 관람 등급', sub: '어린 손님이 많으면 전체 관람가만 보여 줘요', val: t.allAges ? '전체 관람가만' : '모든 작품', change: function () { t.allAges = !t.allAges; savePrefs(); renderPanel(); } },
      { name: '이 프로필로 바꿀 때 PIN', sub: '다른 프로필에서 넘어올 때 PIN을 물어요', val: t.lockIn ? '켜짐' : '꺼짐',
        change: function () { if (!hasPin()) { needPinFirst(); return; } t.lockIn = !t.lockIn; savePrefs(); renderPanel(); } },
      { name: '이 프로필 삭제', danger: true, action: true, val: armed === 'delprofile' ? '한 번 더 누르면 삭제' : '',
        act: function () { twice('delprofile', function () { dropEdits(false); deleteProfileById(t.id); closePanelQuiet(); openPanel('profset'); }); } }
    ];
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
      { name: '종류', sub: d.kind === 'kids' ? '허용한 앱만 보이고, 나가려면 PIN이 필요해요' : d.kind === 'guest' ? '공용 · 정해 준 앱만, 기록 없이, 공개한 일정 · 메모만 봐요' : '모든 앱을 쓸 수 있어요',
        val: d.kind === 'kids' ? '키즈' : d.kind === 'guest' ? '손님 (공용)' : '일반', change: function (k) {
          var kinds = guestProfile() ? ['normal', 'kids'] : ['normal', 'kids', 'guest'], was = d.kind;
          d.kind = kinds[(kinds.indexOf(d.kind) + (k || 1) + kinds.length) % kinds.length];
          var used = ROOT.profiles.map(function (p) { return p.name; }), free = function (n) { return used.indexOf(n) < 0; };
          if (d.kind === 'kids' && free('아이')) d.name = '아이';
          else if (d.kind === 'guest') d.name = free('손님') ? '손님' : '거실';
          else if (d.kind === 'normal' && (was === 'kids' && d.name === '아이' || was === 'guest')) d.name = PROFILE_NAMES.filter(function (n) { return free(n) && n !== '아이' && n !== '손님'; })[0] || d.name;
          if (d.kind === 'guest') d.color = GUEST_COLOR;
          renderPanel();
        } }
    ];
    if (d.kind === 'guest') rows.splice(1, 1);   // its colour is fixed
    if (d.kind === 'guest') rows.push({ name: '시작 상태', sub: '가장 기본 홈에 위젯 없이 시작해요. 꾸미기는 손님도 바꿀 수 있어요 (아이콘 · 색은 고정)', val: '기본 상태' });
    if (d.kind === 'normal') {
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

  // 설정 is two levels as well. Groups and rows a profile cannot use are not shown at all; other
  // profiles get one "마스터 메뉴 열기" row instead, which asks for the PIN.
  var SET_GROUPS = [
    ['remote', '폰 리모컨', null], ['time', '시간 · 지역', 'admin'], ['ambient', '화면 보호기 · 대기 화면', 'adult'], ['calendar', '캘린더', 'adult'],
    ['family', '가족 · 프로필', 'admin'], ['system', '시스템', 'admin'], ['study', '사용자 평가', 'admin'], ['about', '업데이트 · 정보', null]
  ];
  function setSummary(id) {
    var st;
    if (id === 'remote') { var info = {}; try { info = N ? JSON.parse(N.remoteInfo()) : { running: true }; } catch (e) {} return info.running ? '폰으로 QR을 찍어 연결해요' : '리모컨 서버가 꺼져 있어요'; }
    if (id === 'time') return labelOf(TZS, ROOT.tz) + (ROOT.tz !== 'system' && sysZone() !== ROOT.tz ? ' · TV 시간대 ' + sysZone() : '');
    if (id === 'ambient') { var a = ambSettings(); return '대기 화면 ' + labelOf(AMB_IDLE, a.idle) + ' · 넘김 ' + labelOf(AMB_INTERVALS, a.interval); }
    if (id === 'calendar') { var n = calData().subs.length; return n ? '구독 캘린더 ' + n + '개' : '구독 캘린더 없음'; }
    if (id === 'family') return ROOT.profiles.length + '명 · 마스터 ' + master().name + ' · PIN ' + (hasPin() ? '있음' : '없음');
    if (id === 'study') { st = studyStatus(); return !st.configured ? '평가 서버 연결 필요 · 폰으로 QR' : st.kit ? '평가 키트 준비됨 · 평가 모드 시작' : '평가 키트를 받는 중…'; }
    if (id === 'system') { st = overrideStatus(); return '홈 버튼 전환 ' + (!st.service ? '권한 필요' : st.enabled ? '켜짐' : '일시 중지'); }
    return (N ? N.version() : '미리보기') + (update && update.ok && update.available ? ' · 새 버전 ' + update.latestName : '');
  }
  function settingsRows() {
    var rows = SET_GROUPS.map(function (g) {
      return { id: g[0], need: g[2], name: g[1], sub: setSummary(g[0]), action: true, act: function () {
        if (g[0] === 'ambient') openPanel('ambient', { back: { type: 'settings', id: 'ambient' } });
        else if (g[0] === 'calendar') openPanel('calset', { back: { type: 'settings', id: 'calendar' } });
        else openPanel('setgrp', { grp: g[0], back: { type: 'settings', id: g[0] } });
      } };
    });
    if (!isAdmin()) rows.push({ id: 'master', name: '마스터 메뉴 열기', sub: hasPin() ? 'PIN을 넣으면 5분 동안 모든 메뉴가 보여요' : '마스터 프로필에서 PIN을 만들면 쓸 수 있어요', action: true,
      act: function () { gate('admin', '마스터 메뉴', function () { renderPanel(); toast('5분 동안 마스터 메뉴가 열려요'); }); } });
    return rows;
  }
  function setGroupRows(grp) {
    var st;
    if (grp === 'remote') return [{ name: '연결이 안 될 때', sub: '폰과 TV가 같은 와이파이인지 확인하세요. 게스트 와이파이나 모바일 데이터에서는 연결되지 않아요' }];
    if (grp === 'time') return [
      { name: '시간대', sub: 'TV 자체 시간대: ' + sysZone() + (ROOT.tz === 'system' ? '' : ' · 시계, 일정, 메모를 이 시간대로 맞춰요'), val: labelOf(TZS, ROOT.tz),
        change: function (d) { setTimeZone(cycle(TZS, ROOT.tz, d)); renderPanel(); } }
    ];
    if (grp === 'family') return [
      { id: 'profiles', name: '프로필 관리', sub: '프로필 추가, 이름, 종류, 키즈 허용 앱, 잠금', action: true, act: function () { openPanel('profset', { back: { type: 'setgrp', id: 'profiles', opts: { grp: 'family', back: { type: 'settings', id: 'family' } } } }); } },
      { id: 'usage', name: '사용 기록 · 시간 제한', sub: '프로필별 앱 사용 시간, 하루 제한', action: true, act: function () { openPanel('usage', { back: { type: 'setgrp', id: 'usage', opts: { grp: 'family', back: { type: 'settings', id: 'family' } } } }); } },
      { name: '마스터 프로필', sub: '◀ ▶로 넘기기 · PIN, 프로필, 잠금을 관리해요', val: master().name,
        change: function (d) {
          var list = ROOT.profiles.filter(function (p) { return p.kind !== 'kids'; });
          var i = list.indexOf(master());
          ROOT.masterId = list[(i + d + list.length) % list.length].id;
          renderPanel();
        } },
      { name: '잠금 PIN', sub: hasPin() ? 'OK를 누르면 PIN을 바꿔요' : '프로필, 키즈, 앱 잠금에 쓰는 4자리', val: hasPin() ? '설정됨' : '없음', action: true,
        act: function () { openPin({ mode: 'new' }); } }
    ].concat(hasPin() ? [{ name: 'PIN 끄기', sub: '모든 잠금이 풀려요', danger: true, action: true, val: armed === 'nopin' ? '한 번 더 누르면 끄기' : '',
        act: function () { twice('nopin', function () { ROOT.pinHash = ''; savePrefs(); render(); toast('PIN을 껐어요'); }); } }] : []);
    if (grp === 'study') {
      st = studyStatus();
      return [
        { name: '평가 모드 시작', sub: !st.configured ? '먼저 아래 QR로 평가 서버를 연결해요' : !st.kit ? '평가 키트를 받는 중이에요. 잠시 뒤 다시 눌러요' : '대기 화면이 열리고, 참가자 · 평가자 폰을 QR로 연결해요', action: true,
          act: function () {
            if (!SN) { toast('TV에서만 할 수 있어요'); return; }
            if (!st.configured) { toast('먼저 폰으로 QR을 찍어 평가 서버를 연결해 주세요'); return; }
            if (!window.TVStudy) { loadKit(st.kit); SN.studyRefresh(); toast('평가 키트를 준비하는 중이에요. 잠시 뒤 다시 눌러 주세요'); return; }
            closePanelQuiet(); window.TVStudy.open();
          } },
        { name: '평가 서버', sub: st.configured ? '연결됨 · 바꾸려면 아래 QR' : '폰으로 아래 QR을 찍어 주소와 업로드 키를 넣어요', val: st.configured ? '연결됨' : '연결 안 됨' },
        { name: '평가 키트', sub: '평가 화면 · 폰 페이지 묶음 (평가 서버에서 받아요, 앱 업데이트 없이 바뀌어요)', val: st.kit || '없음', action: true,
          act: function () { if (SN) { SN.studyRefresh(); toast('새 평가 키트가 있는지 확인해요'); } } }
      ];
    }
    if (grp === 'system') {
      st = overrideStatus();
      return [
        { name: '홈 버튼으로 Cove 열기', action: true,
          sub: !st.service ? 'OK를 누르면 접근성 설정으로 이동해요' : st.enabled ? 'OK를 누르면 잠시 꺼요' : 'OK를 누르면 다시 켜요',
          val: !st.service ? '권한 필요' : st.enabled ? '켜짐' : '일시 중지',
          act: function () {
            if (!N) { toast('TV에서만 바꿀 수 있어요'); return; }
            if (!st.service) { N.openAccessibility(); toast('접근성에서 "Cove 홈 버튼 전환"을 켜 주세요'); return; }
            N.setOverride(!st.enabled); renderPanel();
          } },
        { name: '권한이 켜지지 않을 때', sub: '안드로이드 "제한된 설정" 안내', val: helpOpen ? '닫기' : '보기', action: true, act: function () { helpOpen = !helpOpen; renderPanel(); } },
        { name: 'Cove 앱 정보 열기', sub: '여기서 "제한된 설정 허용"을 찾아요', action: true, act: function () { if (N) N.appInfo(N.selfPackage()); else toast('TV에서만 열 수 있어요'); } },
        { name: 'TV 설정 열기', action: true, act: function () { if (N) N.openTvSettings(); else toast('TV에서만 열 수 있어요'); } }
      ].concat(exitRows(st));
    }
    return [
      { need: 'admin', name: '업데이트 확인', sub: '새 버전이 있으면 바로 설치해요', val: updateLabel(), action: true,
        act: function () {
          if (!N) { toast('TV에서만 확인할 수 있어요'); return; }
          if (update && update.ok && update.available && update.phase === 'result') { update.phase = 'download'; renderPanel(); N.installUpdate(); }
          else { update = { phase: 'checking' }; renderPanel(); N.checkUpdate(); }
        } },
      { name: '버전', val: N ? N.version() : '미리보기' }
    ].concat(exitRows(overrideStatus()));
  }

  // Cove is the TV's home, so Back never closes it; closing is a settings action that shows the TV's own home.
  function exitRows(st) {
    var back = st.service && st.enabled;
    function go(off) {
      if (!N || !N.exit) { toast('TV에서만 종료할 수 있어요'); return; }
      try { if (SN && SN.studyFlush) SN.studyFlush(); } catch (e) {}
      N.exit(!!off);
    }
    return [
      { need: 'admin', id: 'exit', name: 'Cove 종료 (앱 닫기)', danger: true, action: true,
        sub: back ? 'TV 기본 홈으로 나가요 · 홈 버튼을 누르면 다시 Cove가 열려요' : 'TV 기본 홈으로 나가요 · 앱 목록에서 Cove를 누르면 다시 열려요',
        val: armed === 'exit' ? '한 번 더 누르면 종료' : '',
        act: function () { twice('exit', function () { go(false); }); } }
    ].concat(back ? [{ need: 'admin', id: 'exitoff', name: 'Cove 종료 + 홈 버튼 전환 끄기', danger: true, action: true,
        sub: '홈 버튼도 TV 기본 홈으로 · 다시 쓰려면 Cove를 열고 시스템 → 홈 버튼으로 Cove 열기',
        val: armed === 'exitoff' ? '한 번 더 누르면 종료' : '',
        act: function () { twice('exitoff', function () { go(true); }); } }] : []);
  }

  function rowsFor(type) {
    if (panel && panel.confirm && type === panel.type) return confirmRows();
    var rows = baseRows(type).filter(function (r) { return r && (!r.need || may(r.need)); });
    if (edit && panel && type === panel.type && edit.key === editKey(panel)) {
      var dirty = isDirty();
      rows.push({ id: 'save', name: '저장', sub: dirty ? '바꾼 내용을 확정해요' : '바뀐 내용이 없어요', action: true, save: true, act: function () { saveEdit(); } });
      rows.push({ id: 'cancel', name: '취소', sub: dirty ? '바꾸기 전으로 되돌려요' : '', action: true, act: function () { cancelEdit(); } });
    }
    return rows;
  }
  function baseRows(type) {
    if (type === 'lookgrp') return lookGroupRows(panel.grp);
    if (type === 'setgrp') return setGroupRows(panel.grp);
    if (type === 'apps') return appRows();
    if (type === 'settings') return settingsRows();
    if (type === 'profiles' || type === 'profset' || type === 'mine') return profileRows();
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
    if (type === 'usage') return usageRows();
    if (type === 'widget') return widgetRows();
    if (type === 'clockset') return clockSetRows();
    if (type === 'wxset') return wxSetRows();
    if (type === 'newsset') return newsSetRows();
    if (type === 'usageprof') return usageProfRows();
    return lookRows();
  }

  // ---------- save / cancel ----------
  // Pages that change settings work on a draft: changes show at once as a preview, and 저장 keeps
  // them, 취소 (or leaving and choosing 버리기) puts everything back as it was.
  var EDIT_TYPES = ['lookgrp', 'setgrp', 'ambient', 'mine', 'profset', 'profmanage', 'usageprof', 'clockset', 'wxset', 'newsset'];
  // A page opened from another settings page gets its own draft on top of the first one: its 저장 /
  // 취소 cover only what was changed there, and cancelling the outer page undoes everything inside it.
  var edits = [];    // [{key, orig}], innermost last
  var edit = null;   // the innermost draft
  function topEdit() { edit = edits.length ? edits[edits.length - 1] : null; return edit; }
  function popEdit() { edits.pop(); topEdit(); }
  function dropEdits(revert) {
    if (revert && edits.length && editState() !== edits[0].orig) { edit = edits[0]; restoreEdit(); }
    edits = []; edit = null;
  }
  function editKey(pn) { return pn.type + ':' + (pn.grp || pn.target || ''); }
  function editState() { return JSON.stringify({ profiles: ROOT.profiles, ambient: ROOT.ambient || null, tz: ROOT.tz, masterId: ROOT.masterId }); }
  function isDirty() { return !!edit && editState() !== edit.orig; }
  function restoreEdit() {
    var o = JSON.parse(edit.orig);
    ROOT.profiles = o.profiles; ROOT.ambient = o.ambient || undefined; ROOT.tz = o.tz; ROOT.masterId = o.masterId;
    setZone(ROOT.tz);
    P = current().prefs;
    savePrefs(); saveSnapshot(); render();
  }
  function saveEdit() {
    var dirty = isDirty();
    popEdit(); savePrefs();
    if (dirty) toast('저장했어요');
    closePanel();
  }
  function cancelEdit() {
    var dirty = isDirty();
    if (dirty) restoreEdit();
    popEdit();
    if (dirty) toast('바꾸기 전으로 되돌렸어요');
    closePanel();
  }
  function confirmRows() {
    return [
      { name: '저장하기', sub: '바꾼 내용을 확정해요', action: true, act: function () { panel.confirm = false; saveEdit(); } },
      { name: '저장하지 않고 나가기', sub: '바꾸기 전으로 되돌려요', danger: true, action: true, act: function () { panel.confirm = false; cancelEdit(); } },
      { name: '계속 고치기', action: true, act: function () { panel.confirm = false; panel.i = 0; renderPanel(); } }
    ];
  }

  function openPanel(type, opts) {
    if (['look', 'apps', 'settings', 'profiles', 'app', 'cats', 'cat', 'newprofile', 'allow', 'calset', 'calev', 'ambient', 'memoitem', 'memoedit', 'profmanage', 'usage', 'usageprof', 'mine', 'lookgrp', 'setgrp', 'profset', 'widget', 'clockset', 'wxset', 'newsset'].indexOf(type) < 0) return;
    var g = (opts || {}).grp, need = type === 'lookgrp' ? (g === 'home' ? 'apps' : 'look')
      : type === 'setgrp' ? (g === 'remote' || g === 'about' ? null : 'admin')
      : (type === 'apps' || type === 'cats' || type === 'cat') ? 'apps'
      : (type === 'ambient' || type === 'calset') ? 'adult'
      : (type === 'newprofile' || type === 'allow' || type === 'profmanage' || type === 'usage' || (type === 'usageprof' && (opts || {}).target !== ROOT.current)) ? 'admin' : null;
    if (need && blocked(need, need === 'look' ? '꾸미기' : need === 'apps' ? '앱 정리' : need === 'adult' ? '이 설정' : '마스터 메뉴', function () { openPanel(type, opts); })) return;
    if (type === 'look' || type === 'settings') loadPhotos();
    if (moving) { moving = null; renderTiles(); }
    opts = opts || {};
    if (edits.length && !opts.back) dropEdits(false);   // a new menu from the top: an old draft was already settled
    panel = { type: type, i: 0, pkg: opts.pkg, cat: opts.cat, back: opts.back, draft: opts.draft, target: opts.target, grp: opts.grp, w: opts.w };
    if (EDIT_TYPES.indexOf(type) >= 0) {
      var key = editKey(panel), at = -1;
      edits.forEach(function (e, i) { if (e.key === key) at = i; });
      if (at >= 0) edits.length = at + 1;          // back on a page that already has its draft
      else edits.push({ key: key, orig: editState() });
      topEdit();
    }
    armed = '';
    if (type !== 'settings') helpOpen = false;
    if (focusEl) focusEl.classList.remove('focus');
    $('panel').hidden = false;
    renderPanel();
  }
  function closePanelQuiet() { panel = null; armed = ''; $('panel').hidden = true; }
  function closePanel() {
    if (panel && panel.confirm) { panel.confirm = false; panel.i = 0; renderPanel(); return; }
    if (panel && edit && edit.key === editKey(panel)) {
      if (isDirty()) { panel.confirm = true; panel.i = 0; renderPanel(); return; }
      popEdit();
    }
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
    if (base === 'me') { renderMe(); return; }
    if (base === 'clockpg') { renderClockPage(); return; }
    if (base === 'wxpg') { renderWxPage(); return; }
    if (base === 'newspg') { renderNewsPage(); return; }
    if (backToMe()) return;
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

  function studyStatus() { try { return SN ? JSON.parse(SN.studyStatus()) : { configured: false, kit: '', setup: '', qr: '' }; } catch (e) { return { configured: false, kit: '' }; } }
  function studyBlock() {
    var st = studyStatus();
    return '<div class="pair"><div class="qr">' + (st.qr || '') + '</div><div class="diag"><p>' + (st.configured ? '평가 서버를 바꾸려면' : '처음 한 번,') + ' 폰으로 QR을 찍어 평가 서버 주소와 업로드 키를 넣어요.</p>' +
      '<div>평가는 TV Home과 같은 평가 서버 · 대시보드로 모여요. 평가 화면은 평가 키트로 받아서 Cove 앱 크기는 그대로예요.</div></div></div>';
  }
  // The 평가 키트: a script from the study server, kept on this TV (files/kit). Loaded once it is there.
  var kitLoaded = '';
  function loadKit(ver) {
    if (!ver || kitLoaded || window.TVStudy) return;
    kitLoaded = ver;
    var s = document.createElement('script');
    s.src = '/kit/study-kit.js?v=' + encodeURIComponent(ver);
    s.onload = function () { if (window.TVStudy) window.TVStudy.onHome = function () { window.Cove.home(); }; };
    s.onerror = function () { kitLoaded = ''; };
    document.body.appendChild(s);
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
      cats: ['Rows', '카테고리 줄'], cat: ['Row', ''], newprofile: ['New profile', '새 프로필'], allow: ['Kids', '허용 앱'], calset: ['Calendar', '캘린더 설정'], calev: ['Event', '일정'], ambient: ['Screensaver', '화면 보호기'], memoitem: ['Memo', '메모'], memoedit: ['Memo', '메모'], profmanage: ['Manage profile', ''], usage: ['Usage', '사용 기록 · 시간 제한'], usageprof: ['Usage', ''], mine: ['My profile', '프로필 아이콘 · 이름 · 색'], lookgrp: ['꾸미기', ''], setgrp: ['설정', ''], profset: ['Profile', '프로필 설정'], widget: ['Widget', ''], clockset: ['Clock', '시계 설정'], wxset: ['Weather', '날씨 설정'], newsset: ['News', '뉴스 설정'] };
    $('pKicker').textContent = titles[panel.type][0];
    $('pTitle').textContent = panel.type === 'app' ? (BYPKG[panel.pkg] ? BYPKG[panel.pkg].label : '')
      : panel.type === 'cat' ? ((catById(panel.cat) || {}).name || '내 앱')
      : panel.type === 'profmanage' ? (profileById(panel.target) || {}).name || ''
      : panel.type === 'usageprof' ? ((profileById(panel.target) || {}).name || '') + ' · 사용 기록'
      : panel.type === 'profset' ? '프로필 설정 · ' + current().name
      : panel.type === 'widget' ? labelOf(WIDGETS, panel.w) + ' 위젯'
      : panel.type === 'lookgrp' ? (LOOK_GROUPS.filter(function (x) { return x[0] === panel.grp; })[0] || [0, ''])[1]
      : panel.type === 'setgrp' ? (SET_GROUPS.filter(function (x) { return x[0] === panel.grp; })[0] || [0, ''])[1]
      : panel.type === 'allow' ? '허용 앱 · ' + ((profileById(panel.target) || current()).name) : titles[panel.type][1];
    $('pExtra').innerHTML = panel.confirm ? '<div class="help"><b>바꾼 내용을 저장할까요?</b> 저장하지 않으면 바꾸기 전으로 돌아가요.</div>'
      : panel.type === 'setgrp' && panel.grp === 'remote' ? remoteBlock()
      : panel.type === 'setgrp' && panel.grp === 'study' ? studyBlock()
      : panel.type === 'setgrp' && panel.grp === 'system' && helpOpen ? helpBlock()
      : panel.type === 'usage' ? '<div class="help">프로필마다 앱을 얼마나 썼는지 보고, 하루 사용 시간을 정해요. Cove 미니 앱은 정확히, TV 앱은 Cove로 돌아오기까지의 시간으로 어림잡아요.</div>'
      : panel.type === 'ambient' ? '<div class="help"><div><b>TV 화면 보호기 목록에 Cove가 없나요?</b> 일부 Google TV는 이 메뉴를 숨겨 둬요. PC나 폰에서 ADB로 한 번 설정하면 돼요:</div><code>adb shell settings put secure screensaver_components com.mirinetic.cove/.CoveDream</code></div>'
      : panel.type === 'calset' ? '<div class="help">구독 캘린더 추가와 일정 추가는 폰 리모컨의 <b>일정</b>에서 해요. Google 캘린더와 아이폰 캘린더 주소를 넣는 방법도 거기 있어요.</div>'
      : panel.type === 'allow' ? '<div class="help">체크한 앱만 "' + esc((profileById(panel.target) || current()).name) + '" 프로필의 홈과 모든 앱에 보이고 열려요. 아이는 이 앱들 안에서 꾸미기 → 앱 고르기로 자유롭게 정리할 수 있어요.</div>'
      : panel.type === 'apps' && (isKids() || isGuest()) ? '<div class="help">마스터가 허용한 앱 ' + (current().allow || []).length + '개 중에서 고를 수 있어요.</div>'
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

    var hints = { look: [['OK', '열기'], ['뒤로', '닫기']],
      apps: [['OK', '표시 / 숨김'], ['◀ ▶', '순서 옮기기'], ['뒤로', '돌아가기']],
      profiles: [['OK', '선택'], ['◀ ▶', '이름·색 바꾸기'], ['뒤로', '닫기']],
      settings: [['OK', '열기'], ['뒤로', '닫기']], app: [['OK', '선택'], ['뒤로', '닫기']],
      cats: [['OK', '편집'], ['◀ ▶', '순서'], ['뒤로', '돌아가기']], cat: [['OK', '이 줄에 넣기 / 빼기'], ['◀ ▶', '이름'], ['뒤로', '돌아가기']],
      newprofile: [['◀ ▶', '바꾸기'], ['OK', '추가'], ['뒤로', '취소']], allow: [['OK', '허용 / 막기'], ['뒤로', '돌아가기']], calset: [['OK', '선택'], ['뒤로', '닫기']], calev: [['▲ ▼', '이동'], ['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '취소']],
      ambient: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '닫기']], memoitem: [['◀ ▶', '색'], ['OK', '선택'], ['뒤로', '닫기']],
      memoedit: [['▲ ▼', '이동'], ['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '취소']], profmanage: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '돌아가기']],
      usage: [['OK', '자세히'], ['뒤로', '돌아가기']], usageprof: [['◀ ▶', '시간 제한'], ['OK', '선택'], ['뒤로', '돌아가기']], mine: [['◀ ▶', '바꾸기'], ['OK', '입력'], ['뒤로', '돌아가기']],
      lookgrp: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '돌아가기']], setgrp: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '돌아가기']], profset: [['OK', '선택'], ['뒤로', '돌아가기']], widget: [['OK', '선택'], ['뒤로', '닫기']], clockset: [['◀ ▶', '바꾸기'], ['뒤로', '돌아가기']], wxset: [['◀ ▶', '바꾸기'], ['뒤로', '돌아가기']], newsset: [['OK', '켜기 / 끄기'], ['◀ ▶', '바꾸기'], ['뒤로', '돌아가기']] };
    $('pHint').innerHTML = (panel.confirm ? [['OK', '선택'], ['뒤로', '계속 고치기']] : hints[panel.type] || hints.settings).map(function (h) { return '<span><kbd>' + h[0] + '</kbd>' + h[1] + '</span>'; }).join('');
  }

  var arrowHintAt = 0;
  function hintArrows() { if (Date.now() - arrowHintAt > 4000) { arrowHintAt = Date.now(); toast('◀ ▶ 버튼으로 바꿔요'); } }
  function panelKey(k) {
    var rows = rowsFor(panel.type), r = rows[panel.i];
    if (k === 'up') { panel.i = Math.max(0, panel.i - 1); armed = ''; renderPanel(); }
    else if (k === 'down') { panel.i = Math.min(rows.length - 1, panel.i + 1); armed = ''; renderPanel(); }
    else if (k === 'left' || k === 'right') { if (r && r.change) r.change(k === 'left' ? -1 : 1); }
    else if (k === 'ok' || k === 'longok') { if (!r) return; if (r.act) r.act(); else if (r.change) hintArrows(); }   // values change only with ◀ ▶
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
    var diff = Math.round((startOfDay(d) - startOfDay(NOW())) / 86400000);
    return diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === 2 ? '모레' : diff === -1 ? '어제' : fmtDay(d);
  }

  function calData() {
    if (!ROOT.cal) ROOT.cal = { events: [], subs: [] };
    if (!Array.isArray(ROOT.cal.events)) ROOT.cal.events = [];
    if (!Array.isArray(ROOT.cal.subs)) ROOT.cal.subs = [];
    return ROOT.cal;
  }
  function visibleOwner(owner) { return owner === 'family' || owner === ROOT.current; }
  // what this profile sees: its own and the family's; a guest sees only what was marked for guests
  function seen(x) { return isGuest() ? !!x.pub : visibleOwner(x.owner); }
  function ownerName(owner) { if (owner === 'family') return '가족'; var p = profileById(owner); return p ? p.name : ''; }

  // --- iCal parsing ---
  function icsDate(val, params) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(val || '');
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(params || '')) return { d: new Date(+m[1], +m[2] - 1, +m[3]), allDay: !m[4] };
    if (m[7]) return { d: wall(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))), allDay: false };
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
      if (!seen(e)) return;
      var s = new Date(e.start);
      if (s >= from && s <= to) list.push({ title: e.title, start: s, end: e.end ? new Date(e.end) : null, allDay: !!e.allDay, owner: e.owner, id: e.id, pub: !!e.pub, color: '#ffffff', src: isGuest() ? '공개 일정' : '내 일정' });
    });
    data.subs.forEach(function (sub, si) {
      if (!seen(sub)) return;
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
    if (isGuest() && /^(add|del|sub|unsub|memo)$/.test(c.op)) { toast(GUEST_NOTE); return; }
    var data = calData();
    var owner = c.owner && (c.owner === 'family' || (profileById(c.owner) && !isGuest(profileById(c.owner)))) ? c.owner : 'family';
    if (c.op === 'add' && c.title && c.start) {
      var ev = { id: 'e' + Date.now().toString(36), title: String(c.title).slice(0, 80), start: c.start, end: c.end || null, allDay: !!c.allDay, owner: owner, pub: !!c.pub };
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
  // The next event today or tomorrow, and how many more follow today.
  function nextEvent() {
    var now = NOW(), list = occurrences(now, addDays(startOfDay(now), 2)).filter(function (o) { return o.allDay ? startOfDay(o.start) >= startOfDay(now) : o.start >= now; });
    var todayList = eventsOn(now).filter(function (o) { return o.allDay || o.start >= now; });
    var first = list[0];
    if (!first) return null;
    return { first: first, more: startOfDay(first.start).getTime() === startOfDay(now).getTime() ? todayList.length - 1 : 0 };
  }
  function showNextEvent() {
    var el = $('nextEvt');
    if (!el) return;
    if (P.calPreview === false) { el.hidden = true; return; }
    var ne = nextEvent();
    if (!ne) { el.hidden = true; return; }
    var first = ne.first, more = ne.more;
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
      '<b>' + relDay(first.start) + (first.allDay ? '' : ' ' + fmtTime(first.start)) + '</b><span>' + esc(first.title) + (more > 0 ? ' 외 ' + more + '개' : '') + '</span>';
    el.hidden = false;
  }

  // --- the calendar screen ---
  // Arrow keys move the focus, OK opens what is focused. Up from the content reaches the top bar
  // (하루 / 이번 주 / 한 달 / 일정 추가 / 캘린더 설정).
  var CAL_HEAD = [['day', '하루'], ['week', '이번 주'], ['month', '한 달'], ['add', '＋ 일정 추가'], ['set', '캘린더 설정']];
  function openCal(mode, day) {
    leaveMe(true);
    closePanelQuiet();
    if (base === 'drawer') $('drawer').hidden = true;
    if (focusEl) focusEl.classList.remove('focus');
    base = 'cal';
    cal.mode = mode || 'month';
    cal.day = startOfDay(day || NOW());
    cal.zone = 'body';
    cal.hi = 0;
    cal.idx = 0;
    cal.prevMode = null;
    $('cal').hidden = false;
    syncCalendars(false);
    renderCal();
  }
  function closeCal() { base = 'home'; $('cal').hidden = true; if (!backToMe()) restoreFocus('home'); }
  function dayItems() { return eventsOn(cal.day).concat([{ add: true }]); }
  function gridStart(day) { var m0 = new Date(day.getFullYear(), day.getMonth(), 1); return addDays(m0, -m0.getDay()); }

  function evRow(o, focused) {
    if (o.add) return '<div class="ev add' + (focused ? ' cfocus' : '') + '"><div class="ev-time">＋</div><div class="ev-main"><b>' + (isGuest() ? '손님 프로필은 공개된 일정만 볼 수 있어요' : '이 날에 일정 추가') + '</b></div></div>';
    return '<div class="ev' + (focused ? ' cfocus' : '') + '" style="--evc:' + esc(o.color) + '"><div class="ev-time">' +
      (o.allDay ? '종일' : fmtTime(o.start)) + '</div><div class="ev-main"><b>' + esc(o.title) + '</b><span>' + esc(o.src) +
      (o.owner !== 'family' ? ' · ' + esc(ownerName(o.owner)) : '') + '</span></div></div>';
  }
  function renderCal() {
    var head = cal.zone === 'head';
    $('calTabs').innerHTML = CAL_HEAD.map(function (t, i) {
      return '<span class="' + (i < 3 ? 'ctab' : 'cbtn') + (cal.mode === t[0] ? ' cur' : '') + (head && cal.hi === i ? ' cfocus' : '') + '">' + (isGuest() && t[0] === 'add' ? '👀 공개 일정만' : t[1]) + '</span>';
    }).join('');
    var subs = calData().subs.filter(seen);
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
        html += '<div class="wk' + (dayKey(d) === dayKey(NOW()) ? ' today' : '') + (bodyFocus && dayKey(d) === dayKey(cal.day) ? ' cfocus' : '') + '"><h4>' + DOW[d.getDay()] + ' <b>' + d.getDate() + '</b></h4>' +
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
        html += '<div class="mday' + (dd.getMonth() !== cal.day.getMonth() ? ' out' : '') + (dayKey(dd) === dayKey(NOW()) ? ' today' : '') +
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
    // Cove's own keyboard (keyboard.js): the TV's system keyboard often has no Korean
    window.CoveKeyboard.open(title, initial || '', function (t) { textResult(id, t); });
  }
  function textResult(id, text) { var cb = textAsks[id]; delete textAsks[id]; if (cb) cb(text); }

  // 30-minute steps; null = all day
  var TIME_STEPS = [null];
  for (var ts = 0; ts < 96; ts++) TIME_STEPS.push({ h: Math.floor(ts / 4), m: (ts % 4) * 15 });
  function timeLabel(t) { return t ? fmtTime(new Date(2000, 0, 1, t.h, t.m)) : '종일'; }
  function stepTime(t, d) {
    var i = 0;
    TIME_STEPS.forEach(function (x, k) { if (x && t && x.h === t.h && x.m === t.m) i = k; });
    return TIME_STEPS[(i + d + TIME_STEPS.length) % TIME_STEPS.length];
  }
  function ownerList() { return ['family'].concat(ROOT.profiles.filter(function (p) { return !isGuest(p); }).map(function (p) { return p.id; })); }

  // "손님 프로필에 보이기" for an event or a memo (only when there is a guest profile)
  function guestRow(d) {
    var g = guestProfile();
    if (!g) return null;
    return { name: g.name + ' 프로필에 보이기', sub: d.pub ? '손님(공용) 프로필에서도 볼 수 있어요' : '손님(공용) 프로필에는 안 보여요', val: d.pub ? '보임' : '안 보임',
      change: function () { d.pub = !d.pub; renderPanel(); } };
  }
  // o = an occurrence (edit / view) or null (new event on the focused day)
  function openEventEditor(o) {
    if (o && !o.id) { openPanel('calev', { draft: { view: o } }); return; }   // subscribed event: details only
    if (isGuest()) { if (o) openPanel('calev', { draft: { view: { title: o.title, start: o.start, allDay: o.allDay, src: o.owner === 'family' ? '가족 일정' : ownerName(o.owner) + '의 일정' } } }); else toast(GUEST_NOTE); return; }
    gate('self', o ? '일정 수정' : '일정 추가', function () {
      var now = NOW(), day = cal.day || startOfDay(now);
      var draft = o ? { id: o.id, title: o.title, day: startOfDay(o.start), time: o.allDay ? null : { h: o.start.getHours(), m: o.start.getMinutes() }, owner: o.owner, pub: !!o.pub }
        : { title: '', day: day, time: dayKey(day) === dayKey(now) ? { h: Math.min(23, now.getHours() + 1), m: 0 } : { h: 10, m: 0 }, owner: ROOT.current };
      openPanel('calev', { draft: draft });
      if (!o) askText('일정 제목', '', function (txt) { if (txt !== null && panel && panel.draft === draft) { draft.title = txt.trim(); panel.i = guestProfile() ? 5 : 4; renderPanel(); } });
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
      guestRow(d),
      { name: d.id ? '저장' : '추가', sub: d.title ? relDay(d.day) + ' ' + (d.time ? timeLabel(d.time) + ' ' : '') + d.title : '먼저 제목을 넣어 주세요', action: true,
        act: function () {
          if (!d.title) { toast('제목을 넣어 주세요'); panel.i = 0; renderPanel(); return; }
          var start = d.time ? dayKey(d.day) + 'T' + pad2(d.time.h) + ':' + pad2(d.time.m) : dayKey(d.day);
          var data = calData();
          if (d.id) {
            data.events.forEach(function (e) { if (e.id === d.id) { e.title = d.title.slice(0, 80); e.start = start; e.allDay = !d.time; e.owner = d.owner; e.pub = !!d.pub; } });
            savePrefs(); toast('일정을 고쳤어요');
          } else {
            calCmd(JSON.stringify({ op: 'add', title: d.title, start: start, allDay: !d.time, owner: d.owner, pub: !!d.pub }));
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
    if (guestProfile()) calData().subs.forEach(function (s) {
      rows.push({ name: s.name + ' · ' + guestProfile().name + ' 프로필에 보이기', dot: s.color, val: s.pub ? '보임' : '안 보임',
        change: function () { gate('self', '캘린더 공개 바꾸기', function () { s.pub = !s.pub; savePrefs(); renderPanel(); }); } });
    });
    rows.push({ name: '지금 다시 불러오기', action: true, act: function () { syncCalendars(true); toast('구독 캘린더를 다시 불러와요'); } });
    rows.push({ name: '홈 화면에 다음 일정', sub: '시계 아래에 오늘·내일 일정을 한 줄로', val: P.calPreview !== false ? '표시' : '숨김', change: function () { set({ calPreview: P.calPreview === false }); } });
    return rows;
  }

  // ---------- screensaver / idle screen ----------
  var AMB_PHOTOS = [['all', '배경 사진 모두'], ['mine', '내 사진만'], ['current', '지금 배경'], ['island', '내 섬 (창가의 작은 섬)']];
  var AMB_INTERVALS = [[10, '10초'], [15, '15초'], [20, '20초'], [30, '30초'], [45, '45초'], [60, '1분'], [120, '2분'], [300, '5분'], [600, '10분']];
  var AMB_IDLE = [[0, '끄기'], [1, '1분'], [2, '2분'], [3, '3분'], [5, '5분'], [10, '10분'], [15, '15분'], [20, '20분'], [30, '30분'], [60, '1시간']];
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
    var now = NOW();
    var agenda = occurrences(startOfDay(now), addDays(startOfDay(now), 8)).map(function (o) { return { start: o.start.toISOString(), allDay: o.allDay, title: o.title, color: o.color }; });
    return { clock: P.clock === 'off' ? '24' : P.clock, images: ambImages(), interval: a.interval, info: a.info, side: a.side,
      weather: w, agenda: agenda.slice(0, 20), memos: activeMemos().map(function (m) { return { text: m.text, color: m.color }; }), at: Date.now(), shift: tzShift(Date.now()),
      island: a.photos === 'island' ? { state: islandOf(ROOT.current), shared: sharedData('cove.island'), weather: miniEnv().weather } : null };
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
    if (!mins || ambient || base !== 'home' || panel || pinState || moving || sw || document.hidden) return;
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
  var MEMO_DAYS = [[0, '지울 때까지'], [1, '그날 하루'], [2, '2일'], [3, '3일'], [5, '5일'], [7, '1주일'], [14, '2주일'], [30, '한 달'], [90, '3개월']];
  var memoSel = 0;
  function memos() {
    if (!Array.isArray(ROOT.memos)) ROOT.memos = [];
    var old = dayKey(addDays(NOW(), -7));
    for (var i = ROOT.memos.length - 1; i >= 0; i--) {   // tidy up a week after they end (in place: callers keep the same list)
      if (ROOT.memos[i].until && ROOT.memos[i].until < old) ROOT.memos.splice(i, 1);
    }
    ROOT.memos.forEach(function (m) {
      if (!m.to) m.to = 'family';
      if (!m.from) m.from = dayKey(wall(m.at || Date.now()));
      if (m.by && !profileById(m.by)) { m.byName = m.byName || m.by; m.by = null; }
    });
    return ROOT.memos;
  }
  function memoVisible(m) {
    var today = dayKey(NOW());
    return (isGuest() ? !!m.pub : m.to === 'family' || m.to === ROOT.current) && m.from <= today && (!m.until || m.until >= today);
  }
  function activeMemos() { return memos().filter(memoVisible); }
  // The board also lists what this profile sent (scheduled, for someone else, or ended).
  function boardMemos() { return memos().filter(function (m) { return memoVisible(m) || m.by === ROOT.current; }); }
  function memoAuthor(m) { var p = m.by && profileById(m.by); return p ? p.name : (m.byName || ''); }
  function memoTo(m) { return m.to === 'family' ? '가족' : ownerName(m.to); }
  function untilFor(fromKey, days) { if (!days) return null; var f = new Date(fromKey + 'T00:00'); return dayKey(addDays(f, days - 1)); }
  function memoStatus(m) {
    var today = dayKey(NOW()), md = function (k) { var p = k.split('-'); return +p[1] + '/' + +p[2]; };
    if (m.from > today) return md(m.from) + '부터';
    if (m.until && m.until < today) return '끝남';
    return m.until ? md(m.until) + '까지' : '';
  }
  function addMemo(text, opts) {
    opts = opts || {};
    if (isGuest()) { toast(GUEST_NOTE); return; }
    text = String(text || '').trim().slice(0, 200);
    if (!text) return;
    var from = opts.from || dayKey(NOW());
    memos().unshift({ id: 'm' + Date.now().toString(36), text: text, color: opts.color || MEMO_COLORS[memos().length % MEMO_COLORS.length], at: Date.now(),
      by: opts.by && profileById(opts.by) ? opts.by : ROOT.current, to: opts.to && (opts.to === 'family' || profileById(opts.to)) ? opts.to : 'family',
      from: from, until: opts.until || untilFor(from, opts.days), pub: !!opts.pub });
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
    leaveMe(true);
    closePanelQuiet();
    if (base === 'drawer') $('drawer').hidden = true;
    if (focusEl) focusEl.classList.remove('focus');
    base = 'memo'; memoSel = 0;
    $('memo').hidden = false;
    renderMemo();
  }
  function closeMemo() { base = 'home'; $('memo').hidden = true; if (!backToMe()) restoreFocus('home'); }
  function renderMemo() {
    var list = boardMemos();
    memoSel = Math.max(0, Math.min(list.length, memoSel));
    $('memoGrid').innerHTML = '<div class="note add' + (memoSel === 0 ? ' cfocus' : '') + '"><b>' + (isGuest() ? '👀' : '＋') + '</b><span>' + (isGuest() ? '공개된 메모만 보여요' : '메모 붙이기') + '</span></div>' +
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
    if (!m) return { text: '', color: MEMO_COLORS[memos().length % MEMO_COLORS.length], to: 'family', from: startOfDay(NOW()), days: 0, by: ROOT.current, pub: false };
    var from = new Date(m.from + 'T00:00'), days = 0;
    if (m.until) days = Math.round((new Date(m.until + 'T00:00') - from) / 86400000) + 1;
    return { id: m.id, text: m.text, color: m.color, to: m.to, from: from, days: days, by: m.by || ROOT.current, pub: !!m.pub };
  }
  function memoKey(k) {
    var n = boardMemos().length + 1, cols = 4;
    if (k === 'back') { closeMemo(); return; }
    if (k === 'left') memoSel = Math.max(0, memoSel - 1);
    else if (k === 'right') memoSel = Math.min(n - 1, memoSel + 1);
    else if (k === 'up') memoSel = Math.max(0, memoSel - cols);
    else if (k === 'down') memoSel = Math.min(n - 1, memoSel + cols);
    else if (k === 'ok' || k === 'longok') {
      if (isGuest()) { toast(GUEST_NOTE); return; }
      if (memoSel === 0) {
        var draft = memoDraft(null);
        openPanel('memoedit', { draft: draft });
        askText('메모', '', function (txt) { if (txt !== null && panel && panel.draft === draft) { draft.text = txt.trim().slice(0, 200); panel.i = guestProfile() ? 6 : 5; renderPanel(); } });
      } else openPanel('memoedit', { draft: memoDraft(boardMemos()[memoSel - 1]) });
      return;
    }
    renderMemo();
  }
  function memoRows() {
    var d = panel.draft, tos = ['family'].concat(ROOT.profiles.filter(function (p) { return !isGuest(p); }).map(function (p) { return p.id; }));
    var dayNames = MEMO_DAYS;
    var rows = [
      { name: '내용', sub: d.text || 'OK를 누르면 TV 키보드가 열려요', val: d.text ? '고치기' : '쓰기', action: true,
        act: function () { askText('메모', d.text, function (txt) { if (txt !== null) { d.text = txt.trim().slice(0, 200); renderPanel(); } }); } },
      { name: '받는 사람', sub: d.to === 'family' ? '모든 프로필에 보여요' : memoTo(d) + ' 프로필에만 보여요', val: d.to === 'family' ? '가족 모두' : memoTo(d),
        change: function (k) { d.to = tos[(tos.indexOf(d.to) + k + tos.length) % tos.length]; renderPanel(); } },
      { name: '보이는 날', val: fmtDay(d.from) + ' · ' + relDay(d.from), change: function (k) { var nd = addDays(d.from, k); if (nd >= startOfDay(NOW()) || d.id) d.from = nd; renderPanel(); } },
      { name: '보이는 기간', val: labelOf(dayNames, d.days), change: function (k) { d.days = +cycle(dayNames, d.days, k); renderPanel(); } },
      guestRow(d),
      { name: '색', dot: d.color, val: '', change: function (k) { d.color = MEMO_COLORS[(MEMO_COLORS.indexOf(d.color) + k + MEMO_COLORS.length) % MEMO_COLORS.length]; renderPanel(); } },
      { name: d.id ? '저장' : '붙이기', sub: d.text ? (current().name + ' → ' + (d.to === 'family' ? '가족' : memoTo(d)) + ' · ' + relDay(d.from) + (d.days ? '부터 ' + labelOf(dayNames, d.days) : '부터')) : '먼저 내용을 써 주세요', action: true,
        act: function () {
          if (!d.text) { toast('메모 내용을 써 주세요'); panel.i = 0; renderPanel(); return; }
          var from = dayKey(d.from);
          if (d.id) {
            memos().forEach(function (m) { if (m.id === d.id) { m.text = d.text; m.to = d.to; m.from = from; m.until = untilFor(from, d.days); m.color = d.color; m.pub = !!d.pub; } });
            savePrefs(); saveSnapshot(); showMemoLine(); toast('메모를 고쳤어요');
          } else addMemo(d.text, { color: d.color, to: d.to, from: from, days: d.days, pub: d.pub });
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
  function key(k, rep) {
    // 평가 모드 first: its screens, menus and a new feature open full screen take the remote
    if (window.TVStudy && window.TVStudy.active() && window.TVStudy.key(k, rep || 0)) return;
    if (k === 'longback') k = 'back';
    if (wake()) return;
    if (pinState) { pinKey(k); return; }
    if (window.CoveKeyboard.isOpen()) { window.CoveKeyboard.key(k); return; }
    // An OK that would open an app right after a PIN / profile switch is a stray "confirm" press;
    // a second OK within 0.3 s is a doubled signal. Menus and panels are not affected.
    if ((k === 'ok' || k === 'longok') && !panel && (base === 'home' || base === 'drawer') && focusEl && focusEl.getAttribute('data-pkg')) {
      var t0 = Date.now();
      if (t0 < okGuardUntil || t0 - lastOkAt < 300) return;
      lastOkAt = t0;
    }
    if (k.charAt(0) === 'n' && k.length === 2) return;   // number keys only matter on the PIN pad
    if (sw) { switcherKey(k); return; }
    if (panel) { panelKey(k); return; }
    if (base === 'cal') { calKey(k); return; }
    if (base === 'memo') { memoKey(k); return; }
    if (base === 'mini') { if (mini) miniKey(k); else base = 'home'; return; }
    if (base === 'me') { meKey(k); return; }
    if (base === 'clockpg' || base === 'wxpg') { if (page) pageKey(k); else base = 'home'; return; }
    if (base === 'newspg') { if (page) newsKey(k); else base = 'home'; return; }
    if (wmove) { widgetMoveKey(k); return; }
    if (moving) {
      if (k === 'ok' || k === 'longok') endMove(true);
      else if (k === 'back') endMove(false);
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
    if (k === 'back') { var first = document.querySelector('#tiles .tile'); if (first) setFocus(first); return; }
    var wdg = focusEl && focusEl.getAttribute('data-w');
    if ((k === 'longok' || k === 'menu') && wdg) { openPanel('widget', { w: wdg }); return; }
    if (k === 'menu') { openPanel('look'); return; }
    if (k === 'longok') { if (pkg) openPanel('app', { pkg: pkg }); return; }
    if (k === 'ok') {
      if (wdg) { openWidget(wdg); return; }
      if (pkg) { launch(pkg); return; }
      var colId = focusEl && focusEl.getAttribute('data-col');
      if (colId === 'all') { openDrawer(); return; }
      if (colId) { var firstT = P.layout === 'column' ? ($('colGrid') && $('colGrid').querySelector('.tile')) : $('tiles').querySelector('.tile'); if (firstT) setFocus(firstT); return; }
      var act = focusEl && focusEl.getAttribute('data-act');
      if (act === 'drawer') openDrawer(); else if (act === 'calendar') openCal('month'); else if (act === 'memo') openMemo(); else if (act === 'profiles') openSwitcher(); else if (act) openPanel(act);
      return;
    }
    move(k);
  }

  // ---------- 나의 프로필: everything this profile has, on one screen ----------
  var AVATARS = ['', '🙂', '😎', '🤓', '🥰', '🐱', '🐶', '🐻', '🐰', '🦊', '🐼', '🐯', '🐸', '🐧', '🦄', '🐳', '🌸', '🌻', '⭐', '🌙', '🚀', '⚽', '🎮', '🎧', '🎨', '📚', '🍀', '🍓'];
  function avatarOf(pr) { return pr.avatar || ''; }
  function avatarHtml(pr, cls) {
    return '<span class="av ' + (cls || '') + (pr.avatar ? ' emoji' : '') + '" style="--pc:' + esc(pr.color) + '">' + esc(pr.avatar || pr.name.charAt(0)) + '</span>';
  }
  var meSel = 0, meItems = [], returnMe = false;
  function openMe(again) {
    if (isGuest()) { toast('손님 프로필에는 나의 프로필이 없어요'); return; }
    if (!again) meSel = 0;   // a fresh visit starts at the top; coming back keeps the card
    closePanelQuiet();
    if (base === 'drawer') $('drawer').hidden = true;
    if (focusEl) focusEl.classList.remove('focus');
    base = 'me';
    $('me').hidden = false;
    renderMe();
    sig('cove.me.open', { again: !!again });
  }
  // which card of 나의 프로필 (for study signals)
  function meCard(it) {
    if (!it) return '';
    var m = /mr-(usage|home|cal|memo|cin|cards|island)/.exec(it.cls);
    return m ? m[1] : it.html === '프로필 설정' ? 'profset' : it.html === '다른 프로필' ? 'switch' : 'other';
  }
  function closeMe() { sig('cove.me.close'); base = 'home'; $('me').hidden = true; restoreFocus('home'); }
  // Opens another screen from a card; Back there comes back here.
  function fromMe(fn) { returnMe = true; $('me').hidden = true; base = 'home'; fn(); if (base === 'home' && !panel && !pinState) { returnMe = false; openMe(true); } }
  // Another screen opening on top of 나의 프로필 (voice, a PIN that let a card through): Back returns here.
  function leaveMe(keep) { if (base !== 'me') return; $('me').hidden = true; returnMe = !!keep; base = 'home'; }
  function backToMe() { if (!returnMe) return false; returnMe = false; openMe(true); return true; }

  // 마이 룸: each kind of information drawn in its own way. Widgets are focusable; OK opens what they show.
  function hexA(hex, a) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 'rgba(143,180,255,' + a + ')'; var n = parseInt(m[1], 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function hue(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
  function dayTotals(pid, n) {
    var u = (ROOT.usage || {})[pid] || {}, out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = wall(Date.now() - i * 86400000), k = dayKey(d), t = 0;
      Object.keys(u).forEach(function (p) { t += u[p].days[k] || 0; });
      if (i === 0 && mini && mini.pid === pid && mini.start) t += Date.now() - mini.start;
      out.push({ d: d, ms: t });
    }
    return out;
  }
  function ringSvg(frac, color) {
    var r = 42, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
    return '<svg viewBox="0 0 100 100" class="mr-ring"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="9"/>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (c * f) + ' ' + c + '" transform="rotate(-90 50 50)"/></svg>';
  }
  function homePreview() {
    var b = P.bg, bg = '';
    if (b && (b.type === 'preset' || b.type === 'photo')) bg = 'background-image:url(&quot;' + bgUrl(b) + '&quot;)';
    else if (b && b.type === 'color') bg = 'background:' + esc(find(COLORS, b.id)[2]).replace(/"/g, '&quot;');
    else bg = 'background:linear-gradient(135deg,#1e293b,#0f172a)';
    var apps = visibleApps().slice(0, P.layout === 'dock' || P.layout === 'minimal' ? 8 : 10);
    var now = NOW(), hm = P.clock === '12' ? ((now.getHours() % 12) || 12) + ':' + pad2(now.getMinutes()) : pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var round = P.shape === 'circle' ? ' round' : P.shape === 'square' ? ' sq' : '';
    var icons = apps.map(function (p) { return '<i class="' + round + '" style="background-image:url(&quot;' + iconUrl(BYPKG[p]) + '&quot;)"></i>'; }).join('');
    return '<div class="mr-mock lay-' + esc(P.layout) + '" style="' + bg + '"><div class="mr-dim" style="opacity:' + (DIM_VALUES[P.dim] || .2) + '"></div>' +
      (P.clock === 'off' ? '' : '<b class="mr-clock">' + hm + '</b>') + '<div class="mr-apps">' + icons + '</div></div>';
  }
  function miniMonth() {
    var now = NOW(), first = new Date(now.getFullYear(), now.getMonth(), 1), start = addDays(first, -first.getDay());
    var last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    var occ = occurrences(first, new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59)), has = {};
    occ.forEach(function (o) { has[dayKey(o.start)] = (has[dayKey(o.start)] || '') || (o.owner === ROOT.current ? 'mine' : 'fam'); });
    var weeks = Math.ceil((first.getDay() + last.getDate()) / 7), html = DOW.map(function (d, i) { return '<span class="h' + (i === 0 ? ' sun' : '') + '">' + d + '</span>'; }).join('');
    for (var i = 0; i < weeks * 7; i++) {
      var d = addDays(start, i), k = dayKey(d), out = d.getMonth() !== now.getMonth();
      html += '<span class="' + (out ? 'out' : '') + (k === dayKey(now) ? ' today' : '') + (d.getDay() === 0 ? ' sun' : '') + '">' + d.getDate() + (has[k] && !out ? '<em class="' + has[k] + '"></em>' : '') + '</span>';
    }
    return '<div class="mr-month"><b>' + (now.getMonth() + 1) + '월</b><div class="mr-mgrid">' + html + '</div></div>';
  }
  function renderMe() {
    var pr = current(), now = NOW(), kids = isKids(pr);
    var w = [];   // widgets in reading order: {cls, html, act}
    // profile
    var chips = [pr.id === master().id ? '마스터' : kids ? '키즈' : '일반', pr.lockIn && hasPin() ? '🔒 바꿀 때 PIN' : '', kids ? '허용 앱 ' + (pr.allow || []).length + '개' : '', limitOf(pr) ? '하루 ' + labelOf(LIMITS, pr.limit) : ''].filter(Boolean);
    var hero = '<div class="mr-hero">' + avatarHtml(pr, 'huge') + '<div><h2>' + esc(pr.name) + '</h2><div class="mr-chips">' + chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<p>' + esc(DESIGNS[P.design].name) + ' 디자인 · 앱 ' + visibleApps().length + '개' + (P.weather && cityOf(P.weather) ? ' · ' + esc(cityOf(P.weather)[1]) + ' 날씨' : '') + '</p></div></div>';
    w.push({ cls: 'mr-btn', html: '프로필 설정', act: function () { openPanel('profset'); } });
    w.push({ cls: 'mr-btn', html: '다른 프로필', act: function () { openSwitcher(); } });

    // usage
    var days = dayTotals(pr.id, 7), today = days[6].ms, max = Math.max.apply(null, days.map(function (d) { return d.ms; }).concat([60000]));
    var lim = limitOf(pr), left = msLeft(pr), frac = lim ? today / ((lim + (pr.extra && pr.extra.day === todayKey() ? pr.extra.min : 0)) * 60000) : today / max;
    var u = (ROOT.usage || {})[pr.id] || {};
    var topApps = Object.keys(u).filter(function (p) { return BYPKG[p] && !BYPKG[p].screen && daysMs(u[p], 7) > 0; }).sort(function (a, b) { return daysMs(u[b], 7) - daysMs(u[a], 7); }).slice(0, 3);
    w.push({ cls: 'mr-w mr-usage', act: function () { openPanel('usageprof', { target: pr.id }); }, html:
      '<h3>사용 시간</h3><div class="mr-urow"><div class="mr-ringbox">' + ringSvg(frac, lim && left <= 0 ? '#f87171' : pr.color) + '<div><b>' + fmtMs(today) + '</b><small>' + (lim ? (left > 0 ? fmtMs(left) + ' 남음' : '다 썼어요') : '오늘') + '</small></div></div>' +
      '<div class="mr-bars">' + days.map(function (d, i) { return '<div><i style="height:' + Math.max(4, Math.round(100 * d.ms / max)) + '%' + (i === 6 ? ';background:' + esc(pr.color) : '') + '"></i><span>' + (i === 6 ? '오늘' : DOW[d.d.getDay()]) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="mr-stats"><span><b>' + fmtMs(days.reduce(function (t, d) { return t + d.ms; }, 0)) + '</b>최근 7일</span><span><b>' + fmtMs(days.reduce(function (t, d) { return t + d.ms; }, 0) / 7) + '</b>하루 평균</span><span><b>' +
        Object.keys(u).reduce(function (t, p) { return t + (BYPKG[p] && !BYPKG[p].screen ? u[p].opens : 0); }, 0) + '번</b>앱 열기</span></div>' +
      '<div class="mr-top">' + (topApps.length ? topApps.map(function (p) { return '<span><img src="' + iconUrl(BYPKG[p]) + '" alt="">' + esc(cut(BYPKG[p].label, 8)) + ' <em>' + fmtMs(daysMs(u[p], 7)) + '</em></span>'; }).join('') : '<span class="dim">아직 기록이 없어요</span>') + '</div>' });

    // my home
    w.push({ cls: 'mr-w mr-home', act: function () { openPanel('look'); }, html: '<h3>내 홈 화면 <small>' + esc(DESIGNS[P.design].name) + ' · ' + esc(bgName(P.bg)) + '</small></h3>' + homePreview() });

    // calendar
    var evs = occurrences(now, addDays(startOfDay(now), 14)).filter(function (o) { return o.allDay ? startOfDay(o.start) >= startOfDay(now) : o.start >= now; });
    w.push({ cls: 'mr-w mr-cal', act: function () { openCal('month'); }, html: '<h3>일정</h3><div class="mr-crow">' + miniMonth() + '<ul class="mr-evs">' +
      (evs.length ? evs.slice(0, 4).map(function (o) { return '<li class="' + (o.owner === pr.id ? 'mine' : 'fam') + '"><b>' + esc(relDay(o.start)) + (o.allDay ? '' : ' ' + esc(fmtTime(o.start))) + '</b>' + esc(cut(o.title, 14)) + '</li>'; }).join('')
        : '<li class="none">2주 안에 일정이 없어요</li>') + '</ul></div>' });

    // memos
    var inbox = activeMemos(), sent = memos().filter(function (m) { return m.by === pr.id; });
    w.push({ cls: 'mr-w mr-memo', act: function () { openMemo(); }, html: '<h3>메모 <small>받은 ' + inbox.length + ' · 보낸 ' + sent.length + '</small></h3><div class="mr-notes">' +
      (inbox.length ? inbox.slice(0, 3).map(function (m, i) { var from = profileById(m.by);
        return '<div class="mr-note" style="--c:' + esc(m.color || '#ffe58a') + ';--r:' + [-3, 2, -1][i] + 'deg"><p>' + esc(cut(m.text, 40)) + '</p><small>' + esc(from ? from.name : '') + '</small></div>'; }).join('')
        : '<div class="mr-note empty"><p>나에게 온 메모가 없어요</p></div>') + '</div>' });

    // cinema
    var cin = appData(pr.id, 'cove.cinema'), hist = (cin.hist || []).slice(0, 2);
    w.push({ cls: 'mr-w mr-cin', act: function () { launch('cove.cinema'); }, html: '<h3>Cove 시네마 <small>찜 ' + (cin.fav || []).length + '편</small></h3><div class="mr-posters">' +
      (hist.length ? hist.map(function (h) { var c = hue(h.title);
        return '<div class="mr-poster" style="background:linear-gradient(160deg,hsl(' + c + ',60%,38%),hsl(' + ((c + 50) % 360) + ',70%,18%))"><b>' + esc(cut(h.title, 7)) + '</b><i><em style="width:' + (h.done ? 100 : Math.round(100 * h.pos / h.dur)) + '%"></em></i><small>' + (h.done ? '다 봤어요' : '이어 보기') + '</small></div>'; }).join('')
        : '<div class="mr-poster empty"><b>아직 본 작품이 없어요</b></div>') + '</div>' });

    // card game
    var cg = appData(pr.id, 'cove.cards'), best = cg.best || {};
    var gom = cg.gomoku || {}, blk = cg.blocks || {};
    w.push({ cls: 'mr-w mr-cards', act: function () { launch('cove.cards'); }, html: '<h3>Cove 게임 <small>' + ((cg.played || 0) + (blk.played || 0) + (gom.w || 0) + (gom.l || 0) + (gom.pvp || 0)) + '판</small></h3><div class="mr-trophy">' +
      '<svg viewBox="0 0 64 64"><path d="M18 8h28v12a14 14 0 0 1-28 0z" fill="#fbbf24"/><path d="M18 12H9a9 9 0 0 0 11 13M46 12h9a9 9 0 0 1-11 13" fill="none" stroke="#fbbf24" stroke-width="4"/><path d="M28 34h8v10h-8z" fill="#f59e0b"/><rect x="20" y="44" width="24" height="7" rx="2" fill="#b45309"/></svg>' +
      '<div><span class="' + (Object.keys(best).length ? '' : 'dim') + '"><b>카드</b>' + (best['4x4'] ? best['4x4'].moves + '번 (보통)' : best['3x4'] ? best['3x4'].moves + '번 (쉬움)' : '기록 없음') + '</span>' +
      '<span class="' + (gom.w || gom.l ? '' : 'dim') + '"><b>오목</b>' + (gom.w || gom.l ? (gom.w || 0) + '승 ' + (gom.l || 0) + '패' : '기록 없음') + '</span>' +
      '<span class="' + (blk.best ? '' : 'dim') + '"><b>블록</b>' + (blk.best ? blk.best.toLocaleString() + '점' : '기록 없음') + '</span></div></div>' });

    // 창가의 작은 섬: a live miniature of the island
    var ism = islandSummary(pr.id);
    w.push({ cls: 'mr-w mr-island', act: function () { launch('cove.island'); }, html: '<h3>창가의 작은 섬 <small>' + (ism ? 'Lv.' + ism.lvl + ' · 손님 ' + ism.guests + ' · 🐚' + ism.shells : '아직 시작하지 않았어요') + '</small></h3>' +
      (ism ? '<canvas class="mr-isl" id="mrIsl"></canvas><div class="mr-islinfo">' + (ism.todo ? '할 일 ' + ism.todo + '개 · 수확 ' + ism.ready + ' · 모래사장 ' + ism.beach + (ism.mail ? ' · 우편 ' + ism.mail : '') : '모두 자라는 중이에요') + '</div>'
        : '<div class="mr-poster empty"><b>OK를 눌러 나만의 섬을 시작해요</b></div>') });

    meItems = w;
    meSel = Math.max(0, Math.min(w.length - 1, meSel));
    var bgImg = P.bg && (P.bg.type === 'preset' || P.bg.type === 'photo') ? 'url(&quot;' + bgUrl(P.bg) + '&quot;)' : 'none';
    var html = function (i) { var x = w[i]; return '<div class="' + x.cls + (i === meSel ? ' cfocus' : '') + '" data-mi="' + i + '">' + x.html + '</div>'; };
    $('meHead').innerHTML = '';
    $('meGrid').innerHTML = '<div class="mr-bg" style="--pc:' + esc(pr.color) + ';background-image:linear-gradient(120deg,' + hexA(pr.color, .38) + ',rgba(8,10,16,.9) 50%,rgba(8,10,16,.94)),' + bgImg + '"></div>' +
      '<div class="mr-col left">' + hero + '<div class="mr-btns">' + html(0) + html(1) + '</div>' + html(2) + '</div>' +
      '<div class="mr-col mid">' + html(3) + html(4) + '</div>' +
      '<div class="mr-col right">' + html(5) + html(8) + '<div class="mr-pair">' + html(6) + html(7) + '</div></div>';
    var cv = $('mrIsl'), isl = cv && islandOf(pr.id);
    if (cv && isl) {
      var W = cv.clientWidth * 2, H = cv.clientHeight * 2; cv.width = W; cv.height = H;
      window.IslandCore.draw(cv.getContext('2d'), W, H, isl, { now: Date.now(), shift: tzShift(Date.now()), weather: miniEnv().weather }, sharedData('cove.island'), { t: 0, view: 'thumb' });
    }
  }
  // Arrow keys in 나의 프로필 follow the layout: three columns, each a stack of rows (some rows hold two
  // widgets side by side). Up/down stay in the column; left/right move along the row, then to the
  // neighbouring column at the same height.
  var ME_COLS = [[[0, 1], [2]], [[3], [4]], [[5], [8], [6, 7]]];
  function meKey(k) {
    if (k === 'back') { closeMe(); return; }
    if (k === 'ok' || k === 'longok') { var it = meItems[meSel]; if (it) { sig('cove.me.go', { card: meCard(it) }); fromMe(it.act); } return; }
    var box = function (i) { var e = document.querySelector('#meGrid [data-mi="' + i + '"]'); return e ? e.getBoundingClientRect() : null; };
    var c, r, j;
    ME_COLS.forEach(function (col, ci) { col.forEach(function (row, ri) { var x = row.indexOf(meSel); if (x >= 0) { c = ci; r = ri; j = x; } }); });
    if (c === undefined) { meSel = 0; renderMe(); return; }
    var me = box(meSel), cx = me.left + me.width / 2, cy = me.top + me.height / 2, next = null;
    // the item below/above that lines up best; when it is close to a tie, the left one (reading order)
    var nearestX = function (row) {
      var d = row.map(function (i) { var b = box(i); return Math.abs(b.left + b.width / 2 - cx); }), best = 0;
      for (var q = 1; q < row.length; q++) if (d[q] < d[best] - Math.max(box(row[q]).width, me.width) * 0.25) best = q;
      return row[best];
    };
    if (k === 'up' || k === 'down') {
      var row = ME_COLS[c][r + (k === 'up' ? -1 : 1)];
      if (row) next = nearestX(row);
    } else {
      var here = ME_COLS[c][r], step = k === 'left' ? -1 : 1;
      if (here[j + step] !== undefined) next = here[j + step];
      else if (ME_COLS[c + step]) {
        var best = null, bd = Infinity;
        ME_COLS[c + step].forEach(function (rw) {
          var b = box(rw[0]), d = cy < b.top ? b.top - cy : cy > b.bottom ? cy - b.bottom : 0;   // 0 when the row spans this height
          if (d < bd) { bd = d; best = rw; }
        });
        if (best) next = step > 0 ? best[0] : best[best.length - 1];
      }
    }
    if (next !== null && next !== undefined) { meSel = next; renderMe(); sig('cove.me.focus', { card: meCard(meItems[meSel]) }); }
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
    for (var mi = 0; mi < MINI.length; mi++) if (MINI[mi].words && BYPKG[MINI[mi].pkg] && has(t, MINI[mi].words)) return BYPKG[MINI[mi].pkg];
    var en = t;
    ALIAS.forEach(function (a) { en = en.split(a[0]).join(a[1]); });
    // Whole name first ("youtube music" beats "youtube"), then the first word of a name ("prime" for "Prime Video").
    var best = null, len = 0;
    APPS.forEach(function (a) {
      if (a.screen) return;
      var l = norm(a.label);
      if (l.length >= 2 && (en.indexOf(l) >= 0 || t.indexOf(l) >= 0) && l.length > len) { best = a; len = l.length; }
    });
    if (best) return best;
    APPS.forEach(function (a) {
      if (a.screen) return;
      var w = norm(String(a.label).split(/\s+/)[0]);
      if (w.length >= 3 && (en.indexOf(w) >= 0 || t.indexOf(w) >= 0) && w.length > len) { best = a; len = w.length; }
    });
    return best;
  }

  // "내일 오후 3시", "다음 주 금요일 7시 반", "11월 20일", "오늘 저녁 8시" -> {day, time, rest}
  function parseWhen(raw) {
    var t = ' ' + raw + ' ', now = NOW(), day = null, time = null, m;
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

  // 창가의 작은 섬 by voice. While the game is open, island sentences go to the game (it holds the island);
  // otherwise sentences with "섬" act on the saved island: "섬 어때", "섬 다 수확해 줘", "섬에 당근 5개 심어 줘".
  var ISLAND_WORDS = ['섬', '수확', '물줘', '물주', '심어', '씨앗', '조개', '손님', '모래', '의뢰', '도감', '상점', '건축', '만들어', '팔아', '놀러', '우편', '인사', '이야기', '주워'];
  function islandVoice(raw, t, done) {
    if (mini && mini.pkg === 'cove.island' && mini.ready) {
      if (!has(t, ISLAND_WORDS)) return false;
      miniPost({ type: 'say', text: raw });
      return true;
    }
    if (!has(t, ['섬']) || has(t, ['열어', '켜줘', '켜', '가자', '들어가', '실행'])) return false;
    if (!BYPKG['cove.island'] || !window.IslandCore) return false;
    if (!kidsAllows('cove.island') && !isAdmin()) { done('이 프로필에서는 섬을 쓸 수 없어요'); return true; }
    var isl = islandOf(ROOT.current);
    if (!isl) { done('아직 섬이 없어요. "섬 열어"라고 말해서 시작해 보세요'); return true; }
    var env = { now: Date.now(), shift: tzShift(Date.now()), weather: miniEnv().weather };
    var r = window.IslandCore.voice(isl, t, env, sharedData('cove.island'), ROOT.current);
    if (!r) return false;
    if (r.changed) { appData(ROOT.current, 'cove.island'); ROOT.appdata[ROOT.current]['cove.island'] = isl; savePrefs(); }
    done('🏝️ ' + r.msg);
    return true;
  }
  // Cove 시네마 by voice: "보던 거 이어 보기", "찜한 거 틀어 줘", or a title ("달빛 정원 틀어 줘")
  function cinemaVoice(raw, t, done) {
    var cat = window.CoveCinema, a = BYPKG['cove.cinema'];
    if (!cat || !a) return false;
    var d = appData(ROOT.current, 'cove.cinema'), kids = isKids();
    var ok = function (it) { return !kids || it.rate === 0; };
    var byId = function (id) { for (var i = 0; i < cat.length; i++) if (cat[i].id === id) return cat[i]; return null; };
    var playVerb = has(t, ['틀어', '재생', '보여', '볼래', '보자', '봐', '켜']);
    var item = null, resume = false, what = '';
    if (has(t, ['이어보', '이어서', '보던', '계속보', '마저'])) {
      var h = (d.hist || []).filter(function (x) { return !x.done && byId(x.id) && ok(byId(x.id)); }).sort(function (x, y) { return y.t - x.t; })[0];
      if (!h) { done('이어 볼 작품이 없어요'); return true; }
      item = byId(h.id); resume = true; what = '이어 보기 · ' + item.title + ' (' + Math.floor(h.pos / 60) + '분부터)';
    } else if (has(t, ['찜'])) {
      var favs = (d.fav || []).map(byId).filter(function (x) { return x && ok(x); });
      if (!favs.length) { done('찜한 작품이 없어요'); return true; }
      item = favs[0]; resume = true; what = '찜한 작품 ' + favs.length + '편 중 "' + item.title + '"';
    } else {
      // a title, or a distinctive part of one ("모모", "은하 끝 편의점")
      var best = null, len = 0;
      cat.forEach(function (c) {
        var n = norm(c.title);
        if (t.indexOf(n) >= 0 && n.length > len) { best = c; len = n.length; }
        else String(c.title).split(/\s+/).forEach(function (w) { w = norm(w); if (w.length >= 2 && playVerb && t.indexOf(w) >= 0 && w.length > len && !/^(마지막|하루|서울)$/.test(w)) { best = c; len = w.length; } });
      });
      if (!best) return false;
      if (!playVerb && len < 4) return false;
      item = best; resume = true; what = '"' + item.title + '"';
    }
    if (!ok(item)) { var jc = item.title.charCodeAt(item.title.length - 1) - 0xAC00; done('"' + item.title + '"' + (jc >= 0 && jc % 28 ? '은' : '는') + ' 키즈 프로필에서 볼 수 없는 작품이에요'); return true; }
    done('Cove 시네마 · ' + what);
    launch('cove.cinema', false, { play: item.id, resume: resume });
    return true;
  }
  function say(text) {
    wake();
    var raw = String(text || '').trim();
    var t = norm(raw);
    if (!t) return;
    if (pinState) { raw.replace(/\D/g, '').split('').forEach(pinPress); return; }
    if (window.CoveKeyboard.isOpen()) { window.CoveKeyboard.insert(raw); return; }   // typed on the phone
    var done = function (msg) { toast('🎙 "' + raw + '" → ' + msg); };
    if (has(t, ['내프로필', '나의프로필', '프로필정보', '내정보'])) { if (isGuest()) { done('손님 프로필에는 나의 프로필이 없어요'); return; } openMe(); done('나의 프로필'); return; }
    if (has(t, ['축구', '야구', '스포츠', '경기일정', '경기결과']) && !has(t, ['뉴스', '기사']) && BYPKG['cove.sports']) {
      var slg = has(t, ['야구']) ? 'baseball' : has(t, ['축구']) ? 'soccer' : '';
      done(slg === 'baseball' ? '코브 베이스볼' : slg ? '코브 리그' : 'Cove 스포츠'); launch('cove.sports', false, { lg: slg, live: has(t, ['라이브', '생중계', '중계']) }); return;
    }
    if (has(t, ['오목', '블록쌓기', '블록게임', '짝꿍카드', '카드게임']) && BYPKG['cove.cards']) {
      var gid = has(t, ['오목']) ? 'gomoku' : has(t, ['블록']) ? 'blocks' : 'cards';
      done({ gomoku: '오목', blocks: '블록 쌓기', cards: '짝꿍 카드' }[gid]); launch('cove.cards', false, { game: gid }); return;
    }
    if (cinemaVoice(raw, t, done)) return;
    if (islandVoice(raw, t, done)) return;

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
    if (has(t, ['프로필'])) { openSwitcher(); done('프로필'); return; }
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
      if (isGuest()) { done(GUEST_NOTE); return; }
      if (blocked('self', '일정 추가', function () { say(raw); })) return;
      var d0 = when.day || startOfDay(NOW());
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
      if (has(t, ['다음주']) && !when.day) { openCal('week', addDays(NOW(), 7)); done('다음 주 일정'); return; }
      openCal(mode, when.day || NOW());
      done(mode === 'week' ? '이번 주 일정' : mode === 'month' ? '이번 달 일정' : relDay(when.day || NOW()) + ' 일정');
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
    if (has(t, ['뉴스', '헤드라인', '기사'])) {
      var nc = null;
      NEWS_CATS.forEach(function (c) { if (has(t, [norm(c[1]).replace('뉴스', '')]) && c[0] !== 'top') nc = c[0]; });
      if (!nc && has(t, ['경제'])) nc = 'business'; if (!nc && has(t, ['과학', '테크', 'it'])) nc = 'tech'; if (!nc && has(t, ['해외', '국제'])) nc = 'world';
      if (!nc) {
        var kw = raw.split(/뉴스|기사|헤드라인/)[0].replace(/(오늘|최신|요즘|지금|주요|의|좀|관련)/g, '').trim();
        if (kw && kw.length <= 20) nc = 'q:' + kw;
      }
      openNewsPage(nc || newsTabs()[0]); done(nc ? catName(nc) + ' 뉴스' : '오늘의 뉴스'); return;
    }
    if (has(t, ['시계']) && has(t, ['보여', '열어', '켜', '띄워'])) { openClockPage(); done('탁상시계'); return; }
    if (has(t, ['날씨']) && has(t, ['보여', '열어', '어때', '자세히', '주간', '이번주', '내일'])) { if (!P.weather) set({ weather: 'seoul' }); openWxPage(); done('날씨'); return; }
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
    if (has(t, ['종료', '앱 닫기', '꺼 줘', '꺼줘']) && has(t, ['cove', '코브', '앱'])) { openPanel('setgrp', { grp: 'about', back: { type: 'settings', id: 'about' } }); toast('여기서 Cove 종료를 두 번 누르면 닫혀요'); done('종료'); return; }
    if (has(t, ['설정'])) { openPanel('settings'); done('설정'); return; }

    toast('🎙 "' + raw + '" 명령을 이해하지 못했어요');
  }

  // ---------- entry points (called by the Android app and the phone remote) ----------
  window.Cove = {
    key: key,
    say: say,
    calFetched: calFetched,
    // a new 평가 키트 arrived: used right away when none is loaded yet (a newer one replaces it at the next start)
    kitReady: function (ver) { loadKit(ver); if (panel && panel.type === 'setgrp') renderPanel(); },
    feedFetched: feedFetched,
    memo: function (text, color) { addMemo(text, color); },
    textResult: textResult,
    calCmd: calCmd,
    // Test hook: focus the n-th element matching a selector (used by the layout checks)
    // Test hook: from widget i of 나의 프로필, press key k; returns where the focus lands
    _meNav: function (i, k) { if (base !== 'me') openMe(); meSel = i; renderMe(); meKey(k); return base === 'me' ? meSel : null; },
    _focus: function (sel, n) { var e = document.querySelectorAll(sel)[n || 0]; if (e) setFocus(e); return !!e; },
    toast: toast,
    home: function () {
      if (mini) endMini();
      backFromApp();
      returnMe = false;
      dropEdits(true);   // Home leaves without saving
      if (sw) closeSwitcher(true);
      if (page) { if (page.timer) clearInterval(page.timer); page = null; $('clockPage').hidden = true; $('wxPage').hidden = true; $('newsPage').hidden = true; base = 'home'; }
      if (wmove) { document.querySelector('.widget.wmove') && document.querySelector('.widget.wmove').classList.remove('wmove'); if (wmove.orig) setWpos(wmove.w, wmove.orig); wmove = null; }
      if (base === 'me') { base = 'home'; $('me').hidden = true; }
      closePanelQuiet();
      moving = null;
      if (base === 'drawer') { base = 'home'; $('drawer').hidden = true; }
      if (base === 'cal') { base = 'home'; $('cal').hidden = true; }
      if (base === 'memo') { base = 'home'; $('memo').hidden = true; }
      wake();
      lastFocus.home = null;
      renderTiles();
    },
    // Android pauses Cove when the TV sleeps or another app comes to the front: a mini app's clock stops meanwhile.
    pause: function () { if (mini && mini.start) { addTime(mini.pid, mini.pkg, Date.now() - mini.start); mini.start = 0; } },
    resume: function () { backFromApp(); if (mini && !mini.start) mini.start = Date.now(); loadApps(); loadPhotos(); if (!mini) render(); },
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
        else if (parts[1] === 'me') { if (base === 'me') closeMe(); else openMe(); }
        else if (parts[1] === 'profiles') { if (sw) closeSwitcher(); else openSwitcher(); }
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

  window.addEventListener('resize', function () { layoutWidgets(); });
  // ---------- start ----------
  loadPrefs();
  loadApps();
  loadPhotos();
  render();
  syncCalendars(true);
  setInterval(tick, 10000);
  if (SN) loadKit(studyStatus().kit);   // 사용자 평가, when a 평가 키트 is already on this TV
})();
