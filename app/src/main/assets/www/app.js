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
    ['ocean-dusk', '해 질 녘 바다'], ['forest-fog', '안개 숲'], ['mirror-lake', '거울 호수'], ['soft-aurora', '오로라']
  ];
  var DESIGNS = {
    glass:   { name: 'Glass',   desc: '사진 위 유리 타일',     p: { layout: 'grid',    tiles: 'glass', labels: true,  font: 'modern', dim: 1, bg: { type: 'preset', id: 'blue-ridges' } } },
    icons:   { name: 'Icons',   desc: '브랜드 컬러 아이콘',     p: { layout: 'icons',   tiles: 'brand', labels: true,  font: 'modern', dim: 1, bg: { type: 'preset', id: 'golden-hour' } } },
    minimal: { name: 'Minimal', desc: '큰 시계와 로고 한 줄',   p: { layout: 'minimal', tiles: 'clear', labels: false, font: 'light',  dim: 1, bg: { type: 'preset', id: 'night-peaks' } } }
  };
  var DESIGN_IDS = ['glass', 'icons', 'minimal'];
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
  var DEFAULTS = { design: 'glass', clock: '24', shape: 'rounded', size: 'm', apps: null, autoAdd: true, nightBg: null, cats: null, cat: null, recentRow: false, recent: null, locked: null, weather: null };
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
  var armed = '';        // name of a row waiting for a second OK (reset, delete)
  var helpOpen = false;
  var update = null;     // {phase, ...result}
  var pinState = null;   // {mode:'check'|'new'|'confirm', title, onOk, entry, first, i}
  var unlockedUntil = 0; // a correct PIN keeps things open for 5 minutes

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
    ROOT.profiles.forEach(function (pr) { pr.prefs = withDefaults(pr.prefs); });
    if (!current()) ROOT.current = ROOT.profiles[0].id;
    P = current().prefs;
  }

  var saveTimer = null;
  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var s = JSON.stringify(ROOT);
      try { if (N) N.savePrefs(s); else localStorage.setItem('cove.prefs', s); } catch (e) {}
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

  function visibleApps() { return (P.apps || []).filter(function (p) { return BYPKG[p]; }); }
  function catById(id) { for (var i = 0; i < P.cats.length; i++) if (P.cats[i].id === id) return P.cats[i]; return null; }
  function catOf(pkg) { return catById(P.cat[pkg]) ? P.cat[pkg] : P.cats[0].id; }
  function appsIn(id) { return visibleApps().filter(function (p) { return catOf(p) === id; }); }
  function recentApps() { return P.recentRow ? P.recent.filter(function (p) { return BYPKG[p]; }).slice(0, 8) : []; }
  // Rows with titles. Minimal always stays one plain row of logos.
  function sectioned() { return P.layout !== 'minimal' && (P.cats.length > 1 || !!P.cats[0].name || recentApps().length > 0); }
  function iconUrl(a) { return N ? '/icon/' + encodeURIComponent(a.pkg) : a.icon; }
  function bannerUrl(a) { return N ? '/banner/' + encodeURIComponent(a.pkg) : a.bannerUrl; }
  function sortedApps() { return APPS.slice().sort(function (a, b) { return a.label.localeCompare(b.label, 'ko'); }); }

  // ---------- backgrounds ----------
  function bgList() {
    var list = PRESETS.map(function (p) { return { type: 'preset', id: p[0] }; });
    PHOTOS.forEach(function (id) { list.push({ type: 'photo', id: id }); });
    return list;
  }
  function bgUrl(b) { return b.type === 'photo' ? '/photo/' + b.id + '.jpg' : 'bg/' + b.id + '.jpg'; }
  function bgName(b) {
    if (!b) return '사용 안 함';
    if (b.type === 'photo') return '내 사진 ' + (PHOTOS.indexOf(b.id) + 1);
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i][0] === b.id) return PRESETS[i][1];
    return b.id;
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
    var url = bgUrl(activeBg());
    if (url === shownBg) return;
    shownBg = url;
    var a = $('bgA'), b = $('bgB');
    var next = a.classList.contains('on') ? b : a, prev = next === a ? b : a;
    next.onload = function () { next.classList.add('on'); prev.classList.remove('on'); };
    next.onerror = function () { if (!sameBg(P.bg, DEFAULTS.bg)) { P.bg = clone(DEFAULTS.bg); P.nightBg = null; render(); } };
    next.src = url;
  }

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
    if (base === 'drawer') renderDrawer();
    if (panel) renderPanel();
  }

  function tileHtml(a, opts) {
    var useBanner = opts.banner && a.banner && !opts.round;
    var inner = useBanner
      ? '<img class="banner" src="' + bannerUrl(a) + '" alt="">'
      : '<img class="icon" src="' + iconUrl(a) + '" alt="" onerror="this.outerHTML=\'<span class=initial>' + esc(a.label.charAt(0)) + '</span>\'">' +
        '<span class="pname">' + esc(a.label) + '</span>';
    var brand = (opts.forceBrand || (opts.banner && !a.banner)) ? ' brand' : '';
    return '<div class="tile focusable' + (moving === a.pkg && !opts.recent ? ' moving' : '') + '" data-pkg="' + esc(a.pkg) + '"' + (opts.recent ? ' data-recent="1"' : '') + '>' +
      '<div class="face' + brand + '" style="--brand:' + esc(a.color || '#2a2f3a') + '">' + inner +
      (P.locked.indexOf(a.pkg) >= 0 && hasPin() ? '<span class="lock"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#fff" stroke-width="2"/><rect x="5" y="10" width="14" height="11" rx="2" fill="#fff"/></svg></span>' : '') + '</div>' +
      '<div class="label">' + esc(a.label) + '</div></div>';
  }

  function renderTiles() {
    var ids = visibleApps();
    var n = ids.length;
    cols = (n <= 8 ? 4 : n <= 10 ? 5 : 6) + (P.size === 's' ? 1 : P.size === 'l' ? -1 : 0) + (P.tiles === 'poster' ? 2 : 0) + (P.shape === 'circle' ? 1 : 0);
    cols = Math.max(3, Math.min(9, cols));
    var box = $('tiles');
    var sec = sectioned();
    box.classList.toggle('sections', sec);
    box.style.setProperty('--cols', cols);
    var banner = P.tiles === 'banner', round = P.shape === 'circle';
    if (!sec) {
      box.innerHTML = ids.map(function (pkg) { return tileHtml(BYPKG[pkg], { banner: banner, round: round }); }).join('');
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
    $('empty').hidden = n > 0;
    if (base === 'home' && !panel) restoreFocus('home');
  }

  function renderDrawer() {
    var list = sortedApps();
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
      // whole rows: a row that doesn't fit is brought to the top edge
      if (cr.top < tlr.top || cr.bottom > tlr.bottom) tl.scrollTop += (cr.top - tlr.top);
    } else if (el.classList.contains('tile') && el.parentNode.id === 'tiles' && P.layout !== 'minimal') {
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
  function launch(pkg) {
    if (P.locked.indexOf(pkg) >= 0 && hasPin() && !unlocked()) {
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
    if (locked('설정 바꾸기', function () { set(changes); })) return;
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
    if (locked('모든 앱', openDrawer)) return;
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

  function setCat(pkg, id) { if (locked('줄 바꾸기', function () { setCat(pkg, id); })) return; P.cat[pkg] = id; savePrefs(); render(); }
  function addCat(name) {
    if (locked('줄 추가', function () { addCat(name); })) return null;
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
    if (locked('줄 이름 바꾸기', function () { renameCat(id, name); })) return;
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
    if (locked('위치 옮기기', function () { startMove(pkg); })) return;
    if (base !== 'home' || !onHome(pkg)) return;
    moving = pkg;
    lastFocus.home = pkg;
    renderTiles();
    toast(sectioned() && P.cats.length > 1 ? '◀ ▶로 순서, ▲ ▼로 다른 줄로 옮기고 OK를 누르세요' : '방향키로 옮기고 OK를 누르세요');
  }
  function shiftMoving(dir) {
    var list = visibleApps(), i = list.indexOf(moving);
    if (i < 0) { moving = null; renderTiles(); return; }
    if (sectioned()) {
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
    var j = dir === 'left' ? i - 1 : dir === 'right' ? i + 1 : (P.layout === 'minimal' ? i : dir === 'up' ? i - cols : i + cols);
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
  // True (and asks for the PIN) when the current profile protects its settings.
  function locked(title, retry) {
    if (current().guard && !unlocked()) { openPin({ mode: 'check', title: title, onOk: retry }); return true; }
    return false;
  }
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
      if (hashPin(st.entry) === ROOT.pinHash) { unlockedUntil = Date.now() + 5 * 60 * 1000; closePin(); if (st.onOk) st.onOk(); }
      else { st.entry = ''; st.bad = 'PIN이 맞지 않아요'; renderPin(); var d = $('pinDots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
    } else if (st.mode === 'new') {
      st.first = st.entry; st.entry = ''; st.mode = 'confirm'; renderPin();
    } else {
      if (st.entry === st.first) {
        ROOT.pinHash = hashPin(st.entry); savePrefs();
        unlockedUntil = Date.now() + 5 * 60 * 1000;
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
  function needPinFirst() { toast('설정에서 잠금 PIN을 먼저 만들어 주세요'); }

  // ---------- profiles ----------
  function switchProfile(id, quiet) {
    var pr = profileById(id);
    if (!pr) return;
    if (pr.lockIn && id !== ROOT.current && hasPin()) {
      openPin({ mode: 'check', title: '"' + pr.name + '" 프로필 열기', onOk: function () { doSwitch(id, quiet); } });
      return;
    }
    doSwitch(id, quiet);
  }
  function doSwitch(id, quiet) {
    if (profileById(id).guard) unlockedUntil = 0;   // a protected profile is locked again as soon as it opens
    ROOT.current = id;
    P = current().prefs;
    lastFocus.home = null;
    moving = null;
    savePrefs();
    render();
    if (!quiet) toast(current().name + ' 프로필로 바꿨어요');
  }
  function addProfile() {
    if (locked('프로필 추가', addProfile)) return;
    var used = ROOT.profiles.map(function (p) { return p.name; });
    var name = PROFILE_NAMES.filter(function (n) { return used.indexOf(n) < 0; })[0] || ('프로필 ' + (ROOT.profiles.length + 1));
    var pr = { id: 'p' + Date.now().toString(36), name: name, color: PROFILE_COLORS[ROOT.profiles.length % PROFILE_COLORS.length], prefs: clone(P) };
    ROOT.profiles.push(pr);
    switchProfile(pr.id, true);
    toast('"' + name + '" 프로필을 만들었어요. 지금 화면 설정을 그대로 복사했어요');
  }
  function renameProfile(name) {
    if (locked('프로필 이름 바꾸기', function () { renameProfile(name); })) return;
    name = String(name).trim().slice(0, 12);
    if (!name) return;
    current().name = name;
    savePrefs(); render();
    toast('프로필 이름을 "' + name + '"(으)로 바꿨어요');
  }
  function cycleName(d) {
    if (locked('프로필 이름 바꾸기', function () { cycleName(d); })) return;
    var others = ROOT.profiles.filter(function (p) { return p.id !== ROOT.current; }).map(function (p) { return p.name; });
    var names = PROFILE_NAMES.filter(function (n) { return others.indexOf(n) < 0; });
    var i = names.indexOf(current().name);
    current().name = names[(i + d + names.length) % names.length];
    savePrefs(); render();
  }
  function cycleColor(d) {
    if (locked('프로필 색 바꾸기', function () { cycleColor(d); })) return;
    var i = PROFILE_COLORS.indexOf(current().color);
    current().color = PROFILE_COLORS[(i + d + PROFILE_COLORS.length) % PROFILE_COLORS.length];
    savePrefs(); render();
  }
  function deleteProfile() {
    if (ROOT.profiles.length < 2) return;
    if (locked('프로필 삭제', deleteProfile)) return;
    var name = current().name;
    ROOT.profiles = ROOT.profiles.filter(function (p) { return p.id !== ROOT.current; });
    doSwitch(ROOT.profiles[0].id, true);
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
      { name: '배경', val: bgName(P.bg), thumb: bgUrl(P.bg), change: function (d) { set({ bg: stepBg(P.bg, d, false) }); } },
      { name: '밤 배경', sub: '오후 7시부터 오전 6시까지', val: bgName(P.nightBg), thumb: P.nightBg ? bgUrl(P.nightBg) : '', change: function (d) { set({ nightBg: stepBg(P.nightBg, d, true) }); } },
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
    var hidden = sortedApps().filter(function (a) { return vis.indexOf(a.pkg) < 0; }).map(function (a) { return a.pkg; });
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
    rows.push(home
      ? { name: '홈에서 빼기', action: true, act: function () { removeFromHome(pkg); closePanel(); toast('홈에서 뺐어요. 모든 앱에서 다시 추가할 수 있어요'); } }
      : { name: '홈에 추가', action: true, act: function () { addToHome(pkg); closePanel(); toast('홈 끝에 추가했어요'); } });
    if (home && base === 'home') rows.push({ name: '위치 옮기기', action: true, act: function () { closePanel(); startMove(pkg); } });
    if (home && P.cats.length > 1) rows.push({ name: '줄', sub: '◀ ▶로 다른 줄로 옮겨요', val: catById(catOf(pkg)).name || '내 앱',
      change: function (d) { var ids = P.cats.map(function (c) { return c.id; }); setCat(pkg, ids[(ids.indexOf(catOf(pkg)) + d + ids.length) % ids.length]); renderPanel(); } });
    var isLocked = P.locked.indexOf(pkg) >= 0;
    rows.push({ name: '잠금', sub: '열 때 PIN을 물어요', val: isLocked ? '켜짐' : '꺼짐', action: true, act: function () {
      if (!hasPin()) { needPinFirst(); return; }
      requirePin('앱 잠금 바꾸기', function () {
        if (isLocked) P.locked = P.locked.filter(function (x) { return x !== pkg; }); else P.locked.push(pkg);
        savePrefs(); render();
      });
    } });
    rows.push({ name: '앱 정보', sub: '저장공간, 권한, 강제 종료', action: true, act: function () { if (N) N.appInfo(pkg); else toast('TV에서만 열 수 있어요'); } });
    rows.push({ name: '앱 삭제', sub: 'TV의 삭제 확인 화면이 열려요', danger: true, action: true, act: function () { closePanel(); if (N) N.uninstall(pkg); else toast('TV에서만 삭제할 수 있어요'); } });
    return rows;
  }

  function profileRows() {
    var rows = ROOT.profiles.map(function (pr) {
      return { name: pr.name, dot: pr.color, val: pr.id === ROOT.current ? '사용 중' : '', action: pr.id !== ROOT.current,
        act: function () { if (pr.id !== ROOT.current) { switchProfile(pr.id); closePanel(); } } };
    });
    rows.push({ name: '새 프로필 추가', sub: '지금 화면 설정을 복사해서 만들어요', action: true, act: addProfile });
    rows.push({ name: '이름', sub: '폰 리모컨에서 "이름을 민수로 바꿔"라고 해도 돼요', val: current().name, change: cycleName });
    rows.push({ name: '색', dot: current().color, val: '', change: cycleColor });
    var cur = current();
    var toggle = function (key, title) {
      return function () {
        if (!hasPin()) { needPinFirst(); return; }
        requirePin(title, function () { cur[key] = !cur[key]; savePrefs(); renderPanel(); });
      };
    };
    rows.push({ name: '이 프로필로 바꿀 때 PIN', sub: '부모 프로필에 켜 두면 아이가 넘어오지 못해요', val: cur.lockIn ? '켜짐' : '꺼짐', action: true, act: toggle('lockIn', '프로필 잠금 바꾸기') });
    rows.push({ name: '이 프로필의 설정 잠그기', sub: '꾸미기, 설정, 모든 앱, 앱 메뉴에 PIN이 필요해요', val: cur.guard ? '켜짐' : '꺼짐', action: true, act: toggle('guard', '설정 잠금 바꾸기') });
    if (ROOT.profiles.length > 1) {
      rows.push({ name: '이 프로필 삭제', danger: true, action: true, val: armed === 'delprofile' ? '한 번 더 누르면 삭제' : '',
        act: function () { twice('delprofile', deleteProfile); } });
    }
    return rows;
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
      { name: '이름', sub: '폰에서 "줄 이름을 OO로 바꿔"라고 해도 돼요', val: c.name || '내 앱',
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
        act: function () {
          if (!N) { toast('TV에서만 바꿀 수 있어요'); return; }
          if (!st.service) { N.openAccessibility(); toast('접근성에서 "Cove 홈 버튼 전환"을 켜 주세요'); return; }
          N.setOverride(!st.enabled); renderPanel();
        } },
      { name: '권한이 켜지지 않을 때', sub: '안드로이드 "제한된 설정" 안내', val: helpOpen ? '닫기' : '보기', action: true,
        act: function () { helpOpen = !helpOpen; renderPanel(); } },
      { name: 'Cove 앱 정보 열기', sub: '여기서 "제한된 설정 허용"을 찾아요', action: true,
        act: function () { if (N) N.appInfo(N.selfPackage()); else toast('TV에서만 열 수 있어요'); } },
      { name: '잠금 PIN', sub: hasPin() ? 'OK를 누르면 PIN을 바꿔요' : '프로필, 설정, 앱 잠금에 쓰는 4자리', val: hasPin() ? '설정됨' : '없음', action: true,
        act: function () { requirePin('PIN 바꾸기', function () { openPin({ mode: 'new' }); }); } },
    ].concat(hasPin() ? [
      { name: 'PIN 끄기', sub: '모든 잠금이 풀려요', danger: true, action: true, val: armed === 'nopin' ? '한 번 더 누르면 끄기' : '',
        act: function () { requirePin('PIN 끄기', function () { twice('nopin', function () { ROOT.pinHash = ''; savePrefs(); render(); toast('PIN을 껐어요'); }); }); } }
    ] : []).concat([
      { name: '업데이트 확인', sub: '새 버전이 있으면 바로 설치해요', val: updateLabel(), action: true,
        act: function () {
          if (!N) { toast('TV에서만 확인할 수 있어요'); return; }
          if (update && update.ok && update.available && update.phase === 'result') { update.phase = 'download'; renderPanel(); N.installUpdate(); }
          else { update = { phase: 'checking' }; renderPanel(); N.checkUpdate(); }
        } },
      { name: 'TV 설정 열기', action: true, act: function () { if (N) N.openTvSettings(); } },
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
    return lookRows();
  }

  function openPanel(type, opts) {
    if (['look', 'apps', 'settings', 'profiles', 'app', 'cats', 'cat'].indexOf(type) < 0) return;
    if (type !== 'profiles' && locked(type === 'settings' ? '설정' : type === 'app' ? '앱 메뉴' : '꾸미기', function () { openPanel(type, opts); })) return;
    if (type === 'look' || type === 'settings') loadPhotos();
    if (moving) { moving = null; renderTiles(); }
    opts = opts || {};
    panel = { type: type, i: 0, pkg: opts.pkg, cat: opts.cat, back: opts.back };
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
      openPanel(back.type);
      var rows = rowsFor(back.type);
      for (var i = 0; i < rows.length; i++) if (rows[i].id === back.id) panel.i = i;
      renderPanel();
      return;
    }
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
      cats: ['Rows', '카테고리 줄'], cat: ['Row', ''] };
    $('pKicker').textContent = titles[panel.type][0];
    $('pTitle').textContent = panel.type === 'app' ? (BYPKG[panel.pkg] ? BYPKG[panel.pkg].label : '')
      : panel.type === 'cat' ? ((catById(panel.cat) || {}).name || '내 앱') : titles[panel.type][1];
    $('pExtra').innerHTML = panel.type === 'settings' ? (helpOpen ? helpBlock() : remoteBlock())
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
        (r.thumb ? '<img class="thumb" src="' + r.thumb + '" alt="">' : '') +
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
      cats: [['OK', '편집'], ['◀ ▶', '순서'], ['뒤로', '돌아가기']], cat: [['OK', '이 줄에 넣기 / 빼기'], ['◀ ▶', '이름'], ['뒤로', '돌아가기']] };
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
    if (pinState) { pinKey(k); return; }
    if (k.charAt(0) === 'n' && k.length === 2) return;   // number keys only matter on the PIN pad
    if (panel) { panelKey(k); return; }
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
      var act = focusEl && focusEl.getAttribute('data-act');
      if (act === 'drawer') openDrawer(); else if (act) openPanel(act);
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

  function say(text) {
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

    // designs
    if (has(t, ['글래스', 'glass', '유리'])) { applyDesign('glass'); done('Glass 디자인'); return; }
    if (has(t, ['아이콘', 'icons'])) { applyDesign('icons'); done('Icons 디자인'); return; }
    if (has(t, ['미니멀', 'minimal', '심플'])) { applyDesign('minimal'); done('Minimal 디자인'); return; }

    // background
    for (var b = 0; b < PRESETS.length; b++) {
      var key0 = norm(PRESETS[b][1]).slice(0, 2);
      if (t.indexOf(norm(PRESETS[b][1])) >= 0 || (has(t, ['배경']) && t.indexOf(key0) >= 0)) {
        set({ bg: { type: 'preset', id: PRESETS[b][0] } }); done(PRESETS[b][1] + ' 배경'); return;
      }
    }
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
        P.cats.forEach(function (c) { if (c.name && t.indexOf(norm(c.name)) >= 0) tc = c; });
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
    toast: toast,
    home: function () {
      closePanelQuiet();
      moving = null;
      if (base === 'drawer') { base = 'home'; $('drawer').hidden = true; }
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
      var parts = cmd.split(':');
      if (parts[0] === 'panel') {
        if (parts[1] === 'drawer') { if (base === 'drawer') closeDrawer(); else openDrawer(); }
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
      return { pkg: 'sample.app' + i, label: x[0], color: x[1], banner: i % 3 !== 2, icon: svg(192, 192, 90), bannerUrl: svg(640, 360, 120) };
    });
  }

  // ---------- start ----------
  loadPrefs();
  loadApps();
  loadPhotos();
  render();
  setInterval(tick, 10000);
})();
