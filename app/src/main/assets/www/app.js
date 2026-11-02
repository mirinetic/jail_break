/* Cove home screen.
   Runs inside the Android app (window.CoveNative is the bridge to the TV) and also in a normal desktop
   browser with sample apps, so the look can be tried without a TV (arrow keys, Enter, Esc). */
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
  var TILES = [['banner', '앱 배너'], ['glass', '글래스'], ['brand', '브랜드 컬러'], ['frosted', '프로스트'], ['dark', '다크'], ['clear', '투명']];
  var FONTS = [['modern', '모던'], ['light', '라이트'], ['classic', '클래식'], ['mono', '모노']];
  var CLOCKS = [['24', '24시간'], ['12', '12시간'], ['off', '숨김']];
  var DIMS = ['없음', '약하게', '보통', '강하게'];
  var DIM_VALUES = [0.05, 0.22, 0.4, 0.58];
  // Apps put on the home screen first when Cove starts for the first time.
  var FAVOURITES = [
    'com.netflix.ninja', 'com.google.android.youtube.tv', 'com.amazon.amazonvideo.livingroom', 'com.disney.disneyplus',
    'com.wbd.stream', 'com.apple.atve.androidtv.appletv', 'com.spotify.tv.android', 'com.google.android.youtube.tvmusic',
    'com.google.android.videos', 'com.plexapp.android', 'tv.twitch.android.app', 'com.google.android.youtube.tvkids'
  ];
  var DEFAULTS = { design: 'glass', clock: '24', apps: null };
  Object.keys(DESIGNS.glass.p).forEach(function (k) { DEFAULTS[k] = DESIGNS.glass.p[k]; });

  // ---------- state ----------
  var P = {};            // appearance settings
  var APPS = [];         // installed apps [{pkg,label,color,banner}]
  var BYPKG = {};
  var PHOTOS = [];       // photo ids sent from the phone
  var layer = 'home';    // 'home' | 'panel'
  var focusEl = null;
  var lastTile = null;   // pkg of the last focused tile, kept across re-renders
  var panel = null;      // {type, i}
  var resetArmed = false;

  var $ = function (id) { return document.getElementById(id); };

  // ---------- storage & native ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadPrefs() {
    var raw = '{}';
    try { raw = N ? N.loadPrefs() : (localStorage.getItem('cove.prefs') || '{}'); } catch (e) {}
    var saved = {};
    try { saved = JSON.parse(raw) || {}; } catch (e) {}
    P = clone(DEFAULTS);
    Object.keys(saved).forEach(function (k) { P[k] = saved[k]; });
  }

  var saveTimer = null;
  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var s = JSON.stringify(P);
      try { if (N) N.savePrefs(s); else localStorage.setItem('cove.prefs', s); } catch (e) {}
    }, 250);
  }

  function loadApps() {
    try { APPS = N ? JSON.parse(N.apps()) : sampleApps(); } catch (e) { APPS = []; }
    BYPKG = {};
    APPS.forEach(function (a) { BYPKG[a.pkg] = a; });
    if (!Array.isArray(P.apps)) {
      var first = FAVOURITES.filter(function (p) { return BYPKG[p]; });
      APPS.forEach(function (a) { if (first.indexOf(a.pkg) < 0) first.push(a.pkg); });
      P.apps = first.slice(0, 10);
      savePrefs();
    }
  }

  function loadPhotos() {
    try { PHOTOS = N ? JSON.parse(N.photos()) : []; } catch (e) { PHOTOS = []; }
    if (P.bg && P.bg.type === 'photo' && PHOTOS.indexOf(P.bg.id) < 0) P.bg = clone(DESIGNS[P.design].p.bg);
  }

  function visibleApps() { return (P.apps || []).filter(function (p) { return BYPKG[p]; }); }
  function iconUrl(a) { return N ? '/icon/' + encodeURIComponent(a.pkg) : a.icon; }
  function bannerUrl(a) { return N ? '/banner/' + encodeURIComponent(a.pkg) : a.bannerUrl; }

  // ---------- backgrounds ----------
  function bgList() {
    var list = PRESETS.map(function (p) { return { type: 'preset', id: p[0] }; });
    PHOTOS.forEach(function (id) { list.push({ type: 'photo', id: id }); });
    return list;
  }
  function bgUrl(b) { return b.type === 'photo' ? '/photo/' + b.id + '.jpg' : 'bg/' + b.id + '.jpg'; }
  function bgName(b) {
    if (b.type === 'photo') return '내 사진 ' + (PHOTOS.indexOf(b.id) + 1);
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i][0] === b.id) return PRESETS[i][1];
    return b.id;
  }
  function sameBg(a, b) { return a && b && a.type === b.type && a.id === b.id; }

  var shownBg = '';
  function showBg() {
    var url = bgUrl(P.bg);
    if (url === shownBg) return;
    shownBg = url;
    var a = $('bgA'), b = $('bgB');
    var next = a.classList.contains('on') ? b : a, prev = next === a ? b : a;
    next.onload = function () { next.classList.add('on'); prev.classList.remove('on'); };
    next.onerror = function () { if (!sameBg(P.bg, DEFAULTS.bg)) { P.bg = clone(DEFAULTS.bg); render(); } };
    next.src = url;
  }

  // ---------- clock ----------
  function tick() {
    var d = new Date();
    var h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2);
    var t = $('time');
    if (P.clock === '12') {
      t.innerHTML = ((h % 12) || 12) + ':' + m + '<small>' + (h < 12 ? '오전' : '오후') + '</small>';
    } else {
      t.textContent = ('0' + h).slice(-2) + ':' + m;
    }
    $('date').textContent = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  }

  // ---------- render ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  function render() {
    var home = $('home');
    document.body.setAttribute('data-font', P.font);
    home.setAttribute('data-layout', P.layout);
    home.setAttribute('data-tiles', P.tiles);
    home.setAttribute('data-labels', P.labels ? 'on' : 'off');
    home.setAttribute('data-clock', P.clock === 'off' ? 'off' : 'on');
    document.documentElement.style.setProperty('--dim', DIM_VALUES[P.dim] || 0.22);
    showBg();
    tick();
    renderTiles();
    if (layer === 'panel') renderPanel();
  }

  function renderTiles() {
    var ids = visibleApps();
    var n = ids.length;
    var cols = P.layout === 'icons' ? (n <= 8 ? 4 : n <= 10 ? 5 : 6) : (n <= 8 ? 4 : n <= 10 ? 5 : 6);
    var box = $('tiles');
    box.style.setProperty('--cols', cols);
    box.innerHTML = ids.map(function (pkg) {
      var a = BYPKG[pkg];
      var useBanner = P.tiles === 'banner' && a.banner;
      var inner = useBanner
        ? '<img class="banner" src="' + bannerUrl(a) + '" alt="">'
        : '<img class="icon" src="' + iconUrl(a) + '" alt="" onerror="this.outerHTML=\'<span class=initial>' + esc(a.label.charAt(0)) + '</span>\'">';
      var brand = (P.tiles === 'banner' && !a.banner) ? ' brand' : '';
      return '<div class="tile focusable" data-pkg="' + esc(pkg) + '">' +
        '<div class="face' + brand + '" style="--brand:' + esc(a.color || '#2a2f3a') + '">' + inner + '</div>' +
        '<div class="label">' + esc(a.label) + '</div></div>';
    }).join('');
    $('empty').hidden = n > 0;
    if (layer === 'home') {
      var keep = lastTile && box.querySelector('[data-pkg="' + cssEsc(lastTile) + '"]');
      setFocus(keep || box.querySelector('.tile') || document.querySelector('.qbtn'));
    }
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  // ---------- home navigation ----------
  function focusables() {
    return Array.prototype.slice.call(document.querySelectorAll('#home .focusable'));
  }

  function setFocus(el) {
    if (focusEl) focusEl.classList.remove('focus');
    focusEl = el || null;
    if (!focusEl) return;
    focusEl.classList.add('focus');
    if (focusEl.classList.contains('tile')) {
      lastTile = focusEl.getAttribute('data-pkg');
      if (P.layout === 'minimal') {
        var row = $('tiles'), r = focusEl.getBoundingClientRect(), rr = row.getBoundingClientRect();
        if (r.left < rr.left + 40) row.scrollLeft -= (rr.left + 40 - r.left);
        else if (r.right > rr.right - 40) row.scrollLeft += (r.right - rr.right + 40);
      }
    }
  }

  // Moves focus to the nearest element in the pressed direction.
  function move(dir) {
    var els = focusables();
    if (!focusEl || els.indexOf(focusEl) < 0) { setFocus(els[els.length > 2 ? 2 : 0]); return; }
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

  function activate(el) {
    if (!el) return;
    var pkg = el.getAttribute('data-pkg');
    if (pkg) { launch(pkg); return; }
    var act = el.getAttribute('data-act');
    if (act) openPanel(act);
  }

  function launch(pkg) {
    var a = BYPKG[pkg];
    if (N) { if (!N.launch(pkg)) toast('앱을 열 수 없어요'); }
    else toast((a ? a.label : pkg) + ' 실행 (미리보기에서는 실제로 열리지 않아요)');
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
  function set(changes) {
    Object.keys(changes).forEach(function (k) { P[k] = changes[k]; });
    resetArmed = false;
    savePrefs();
    render();
  }
  function applyDesign(id) {
    var p = clone(DESIGNS[id].p);
    p.design = id;
    set(p);
  }

  function lookRows() {
    var rows = [
      { name: '디자인', sub: DESIGNS[P.design].desc, val: DESIGNS[P.design].name,
        change: function (d) { applyDesign(cycle(DESIGN_IDS, P.design, d)); } },
      { name: '배경', val: bgName(P.bg), thumb: bgUrl(P.bg),
        change: function (d) {
          var list = bgList(), i = -1;
          list.forEach(function (b, k) { if (sameBg(b, P.bg)) i = k; });
          set({ bg: list[(i + d + list.length) % list.length] });
        } },
      { name: '배경 어둡게', val: DIMS[P.dim], change: function (d) { set({ dim: Math.max(0, Math.min(3, P.dim + d)) }); } },
      { name: '타일', val: labelOf(TILES, P.tiles), change: function (d) { set({ tiles: cycle(TILES, P.tiles, d) }); } },
      { name: '앱 이름', val: P.labels ? '표시' : '숨김', change: function () { set({ labels: !P.labels }); } },
      { name: '글꼴', val: labelOf(FONTS, P.font), change: function (d) { set({ font: cycle(FONTS, P.font, d) }); } },
      { name: '시계', val: labelOf(CLOCKS, P.clock), change: function (d) { set({ clock: cycle(CLOCKS, P.clock, d) }); } },
      { name: '앱 고르기', sub: '홈 화면에 둘 앱과 순서', val: visibleApps().length + '개', action: true,
        act: function () { openPanel('apps'); } }
    ];
    if (P.bg.type === 'photo') {
      rows.push({ name: '이 사진 삭제', danger: true, action: true, act: function () {
        if (N) N.deletePhoto(P.bg.id);
        loadPhotos();
        set({ bg: clone(DESIGNS[P.design].p.bg) });
        toast('사진을 지웠어요');
      } });
    }
    rows.push({ name: '처음 상태로', danger: true, action: true, val: resetArmed ? '한 번 더 누르면 초기화' : '',
      act: function () {
        if (!resetArmed) { resetArmed = true; renderPanel(); return; }
        var apps = P.apps;
        P = clone(DEFAULTS); P.apps = apps;
        resetArmed = false; savePrefs(); render(); toast('처음 상태로 되돌렸어요');
      } });
    return rows;
  }

  function appRows() {
    var vis = visibleApps();
    var hidden = APPS.filter(function (a) { return vis.indexOf(a.pkg) < 0; }).map(function (a) { return a.pkg; });
    return vis.concat(hidden).map(function (pkg) {
      var a = BYPKG[pkg], pos = vis.indexOf(pkg);
      return {
        pkg: pkg, name: a.label, appicon: iconUrl(a), check: pos >= 0, val: pos >= 0 ? (pos + 1) + '번째' : '',
        act: function () {
          var list = visibleApps(), i = list.indexOf(pkg);
          if (i >= 0) list.splice(i, 1); else list.push(pkg);
          set({ apps: list });
          selectPkg(pkg);
        },
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

  function overrideRow() {
    var st = { service: false, enabled: true };
    try { if (N) st = JSON.parse(N.overrideStatus()); } catch (e) {}
    var val = !st.service ? '접근성 권한 필요' : (st.enabled ? '켜짐' : '꺼짐');
    return { name: '홈 버튼으로 Cove 열기', sub: '기본 홈 화면이 뜨면 Cove로 바꿔요', val: val, action: true,
      act: function () {
        if (!N) { toast('TV에서만 바꿀 수 있어요'); return; }
        if (!st.service) { N.openAccessibility(); toast('접근성에서 "Cove 홈 버튼 전환"을 켜 주세요'); return; }
        N.setOverride(!st.enabled); renderPanel();
      } };
  }

  function settingsRows() {
    return [
      overrideRow(),
      { name: 'TV 설정 열기', action: true, act: function () { if (N) N.openTvSettings(); } },
      { name: '버전', val: N ? N.version() : '미리보기' }
    ];
  }

  function rowsFor(type) { return type === 'apps' ? appRows() : type === 'settings' ? settingsRows() : lookRows(); }

  function openPanel(type) {
    if (type !== 'look' && type !== 'apps' && type !== 'settings') return;
    if (type === 'look' || type === 'settings') loadPhotos();
    layer = 'panel';
    panel = { type: type, i: 0 };
    resetArmed = false;
    $('panel').hidden = false;
    renderPanel();
  }
  function closePanel() {
    if (panel && panel.type === 'apps') { openPanel('look'); panel.i = 7; renderPanel(); return; }
    layer = 'home';
    panel = null;
    $('panel').hidden = true;
    renderTiles();
  }

  function renderPanel() {
    if (!panel) return;
    var rows = rowsFor(panel.type);
    panel.i = Math.max(0, Math.min(rows.length - 1, panel.i));
    var titles = { look: ['Appearance', '꾸미기'], apps: ['Apps', '앱 고르기'], settings: ['Settings', '설정'] };
    $('pKicker').textContent = titles[panel.type][0];
    $('pTitle').textContent = titles[panel.type][1];

    var extra = '';
    if (panel.type === 'settings') {
      var info = { url: '', qr: '' };
      try { info = N ? JSON.parse(N.remoteInfo()) : { url: 'http://192.168.0.10:8765/?t=preview', qr: '' }; } catch (e) {}
      extra = info.url
        ? '<div class="pair"><div class="qr">' + info.qr + '</div><div><p>폰 카메라로 QR을 찍으면 리모컨이 열려요. 폰과 TV가 같은 와이파이여야 해요.</p><b>' +
          esc(info.url.replace(/\?.*$/, '')) + '</b></div></div>'
        : '<div class="pair"><div></div><p>와이파이나 유선 네트워크에 연결되면 폰 리모컨 QR이 여기 나타나요.</p></div>';
    }
    $('pExtra').innerHTML = extra;

    $('pRows').innerHTML = rows.map(function (r, i) {
      var cls = 'row' + (i === panel.i ? ' sel' : '') + (r.action ? ' action' : '') + (r.danger ? ' danger' : '');
      var left = (r.check !== undefined ? '<span class="check' + (r.check ? ' on' : '') + '">' + (r.check ? '✓' : '') + '</span>' : '') +
        (r.appicon ? '<img class="appicon" src="' + r.appicon + '" alt="">' : '');
      var val = r.change && !r.action && r.check === undefined
        ? '<span class="arrow">‹</span><b>' + esc(r.val) + '</b><span class="arrow">›</span>'
        : (r.val ? '<b>' + esc(r.val) + '</b>' : '') + (r.action ? '<span class="arrow">›</span>' : '');
      return '<div class="' + cls + '">' + left +
        '<div class="name">' + esc(r.name) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div>' +
        (r.thumb ? '<img class="thumb" src="' + r.thumb + '" alt="">' : '') +
        '<div class="val">' + val + '</div></div>';
    }).join('');

    // keep the selected row in view in long lists
    var box = $('pRows'), sel = box.querySelector('.sel');
    if (sel) {
      var top = sel.offsetTop, bottom = top + sel.offsetHeight;
      if (top < box.scrollTop) box.scrollTop = top;
      else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
    }

    var hints = { look: [['◀ ▶', '바꾸기'], ['OK', '선택'], ['뒤로', '닫기']],
      apps: [['OK', '표시 / 숨김'], ['◀ ▶', '순서 옮기기'], ['뒤로', '돌아가기']],
      settings: [['OK', '선택'], ['뒤로', '닫기']] };
    $('pHint').innerHTML = hints[panel.type].map(function (h) { return '<span><kbd>' + h[0] + '</kbd>' + h[1] + '</span>'; }).join('');
  }

  function panelKey(k) {
    var rows = rowsFor(panel.type), r = rows[panel.i];
    if (k === 'up') { panel.i = Math.max(0, panel.i - 1); resetArmed = false; renderPanel(); }
    else if (k === 'down') { panel.i = Math.min(rows.length - 1, panel.i + 1); resetArmed = false; renderPanel(); }
    else if (k === 'left' || k === 'right') { if (r && r.change) r.change(k === 'left' ? -1 : 1); }
    else if (k === 'ok') { if (!r) return; if (r.act) r.act(); else if (r.change) r.change(1); }
    else if (k === 'back' || k === 'menu') closePanel();
  }

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  // ---------- entry points (called by the Android app and the phone remote) ----------
  function key(k) {
    if (layer === 'panel') { panelKey(k); return; }
    if (k === 'menu') { openPanel('look'); return; }
    if (k === 'back') { var first = document.querySelector('#tiles .tile'); if (first) setFocus(first); return; }
    if (k === 'ok') { activate(focusEl); return; }
    move(k);
  }

  window.Cove = {
    key: key,
    home: function () { if (layer === 'panel') { panel = null; layer = 'home'; $('panel').hidden = true; } lastTile = null; renderTiles(); },
    resume: function () { loadApps(); loadPhotos(); render(); },
    appsChanged: function () { loadApps(); render(); },
    toast: toast,
    photoAdded: function (id) { loadPhotos(); set({ bg: { type: 'photo', id: id } }); toast('폰에서 보낸 사진을 배경으로 설정했어요'); },
    remote: function (cmd) {
      var parts = cmd.split(':');
      if (parts[0] === 'panel') { if (layer === 'panel' && panel.type === parts[1]) closePanel(); else openPanel(parts[1]); }
      else if (parts[0] === 'design' && DESIGNS[parts[1]]) applyDesign(parts[1]);
      else if (parts[0] === 'bg') { var list = bgList(), i = -1; list.forEach(function (b, k) { if (sameBg(b, P.bg)) i = k; });
        set({ bg: list[(i + (parts[1] === 'prev' ? -1 : 1) + list.length) % list.length] }); }
      else if (parts[0] === 'tiles') set({ tiles: cycle(TILES, P.tiles, 1) });
      else if (parts[0] === 'home') window.Cove.home();
    }
  };

  // Desktop preview: keyboard instead of the TV remote.
  document.addEventListener('keydown', function (e) {
    var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Escape: 'back', Backspace: 'back', m: 'menu' };
    if (map[e.key]) { e.preventDefault(); key(map[e.key]); }
  });

  // ---------- sample apps for the desktop preview ----------
  function sampleApps() {
    var list = [['Netflix', '#e50914', 'N'], ['YouTube', '#ff0033', '▶'], ['Prime Video', '#1a98ff', 'P'], ['Disney+', '#113ccf', 'D+'],
      ['Spotify', '#1ed760', '♪'], ['Max', '#002be7', 'M'], ['Apple TV', '#1c1c1e', ''], ['Twitch', '#9146ff', 'T'],
      ['Plex', '#e5a00d', '›'], ['YouTube Music', '#ff0033', '♫'], ['Google TV', '#4285f4', 'G'], ['Settings', '#5f6368', '⚙']];
    return list.map(function (x, i) {
      var svg = function (w, h, fs) {
        return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><rect width="100%" height="100%" rx="' + (w === h ? 40 : 0) + '" fill="' + x[1] + '"/><text x="50%" y="54%" font-family="sans-serif" font-weight="700" font-size="' + fs + '" fill="#fff" text-anchor="middle" dominant-baseline="middle">' + (x[2] || x[0].charAt(0)) + '</text></svg>');
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
