/* Cove ambient screen: crossfading photos with a slow zoom, clock, date, weather, upcoming events and memos.
   Used inside the home screen (idle) and by the TV screensaver (ambient.html).
   Data: {clock:'24'|'12', images:[url], interval:seconds, info:bool, side:bool,
          weather:{temp, text, hi, lo, city}|null, agenda:[{start, allDay, title, color}], memos:[{text, color}]} */
(function () {
  'use strict';
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var CSS = '' +
    '.amb{position:absolute;inset:0;overflow:hidden;background:#000;color:#f5f7fb;font-family:"Roboto","Noto Sans CJK KR","Noto Sans KR",sans-serif;cursor:none}' +
    '.amb-img{position:absolute;inset:-4%;background-size:cover;background-position:center;opacity:0;transition:opacity 2.4s ease}' +
    '.amb-img.on{opacity:1;animation:amb-zoom 40s linear forwards}' +
    '@keyframes amb-zoom{from{transform:scale(1)}to{transform:scale(1.08) translate(-1%,-1%)}}' +
    '.amb-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.6)),linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,0) 50%)}' +
    '.amb-info{position:absolute;left:5vw;bottom:6vw;transition:transform 1.5s ease;text-shadow:0 .2vw 1.4vw rgba(0,0,0,.5)}' +
    '.amb-time{font-size:9vw;font-weight:200;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}' +
    '.amb-time small{font-size:.32em;font-weight:300;margin-left:.3em}' +
    '.amb-date{font-size:1.7vw;margin-top:1vw;opacity:.85}' +
    '.amb-wx{font-size:1.5vw;margin-top:.6vw;opacity:.85}' +
    '.amb-side{position:absolute;right:4.5vw;bottom:6vw;width:28vw;display:grid;gap:.9vw;transition:transform 1.5s ease}' +
    '.amb-card{background:rgba(10,12,18,.55);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-radius:1.2vw;padding:1.1vw 1.3vw;display:grid;gap:.6vw}' +
    '.amb-card h4{margin:0;font-size:1vw;font-weight:500;letter-spacing:.12em;opacity:.7}' +
    '.amb-ev{display:grid;grid-template-columns:8.5vw 1fr;gap:.8vw;font-size:1.25vw;align-items:baseline}' +
    '.amb-ev b{font-weight:400;opacity:.75;font-variant-numeric:tabular-nums;border-left:.25vw solid var(--c,#fff);padding-left:.6vw}' +
    '.amb-ev span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.amb-memo{background:var(--c,#ffe58a);color:#1d1a12;border-radius:.9vw;padding:.9vw 1.1vw;font-size:1.25vw;line-height:1.4;transform:rotate(var(--r,0deg));box-shadow:0 .6vw 1.6vw rgba(0,0,0,.35);white-space:pre-wrap;word-break:keep-all}';

  var SHIFT = 0;   // minutes: Cove's chosen time zone (the TV's own zone can be wrong)
  function nowD() { return new Date(Date.now() + SHIFT * 60000); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function relDay(d) {
    var a = nowD(); a.setHours(0, 0, 0, 0);
    var b = new Date(d); b.setHours(0, 0, 0, 0);
    var n = Math.round((b - a) / 86400000);
    return n === 0 ? '오늘' : n === 1 ? '내일' : (b.getMonth() + 1) + '/' + b.getDate() + '(' + DOW[b.getDay()] + ')';
  }
  function timeText(d, clock) {
    var h = d.getHours(), m = pad(d.getMinutes());
    return clock === '12' ? ((h % 12) || 12) + ':' + m + '<small>' + (h < 12 ? '오전' : '오후') + '</small>' : pad(h) + ':' + m;
  }

  function Ambient(root, getData) { this.root = root; this.getData = getData; this.timers = []; this.layer = 0; this.order = []; this.pos = 0; }
  Ambient.prototype.start = function () {
    if (!document.getElementById('amb-css')) { var st = document.createElement('style'); st.id = 'amb-css'; st.textContent = CSS; document.head.appendChild(st); }
    this.root.innerHTML = '<div class="amb"><div class="amb-img"></div><div class="amb-img"></div><div class="amb-shade"></div>' +
      '<div class="amb-info"><div class="amb-time"></div><div class="amb-date"></div><div class="amb-wx"></div></div><div class="amb-side"></div></div>';
    var self = this, d = this.getData() || {};
    this.next();
    this.tick();
    this.timers.push(setInterval(function () { self.next(); }, Math.max(10, d.interval || 30) * 1000));
    this.timers.push(setInterval(function () { self.tick(); }, 15000));
  };
  Ambient.prototype.stop = function () { this.timers.forEach(clearInterval); this.timers = []; this.root.innerHTML = ''; };
  Ambient.prototype.next = function () {
    var d = this.getData() || {}, imgs = (d.images && d.images.length) ? d.images : ['bg/blue-ridges.jpg'];
    if (this.order.length !== imgs.length) { this.order = imgs.slice().sort(function () { return Math.random() - 0.5; }); this.pos = 0; }
    var url = this.order[this.pos++ % this.order.length];
    var layers = this.root.querySelectorAll('.amb-img');
    if (!layers.length) return;
    var next = layers[this.layer], prev = layers[1 - this.layer];
    this.layer = 1 - this.layer;
    var pic = new Image();
    pic.onload = function () { next.style.backgroundImage = 'url("' + url + '")'; next.classList.remove('on'); void next.offsetWidth; next.classList.add('on'); prev.classList.remove('on'); };
    pic.src = url;
  };
  Ambient.prototype.tick = function () {
    var d = this.getData() || {}, root = this.root;
    SHIFT = d.shift || 0;
    var now = nowD();
    var q = function (s) { return root.querySelector(s); };
    if (!q('.amb-time')) return;
    var info = q('.amb-info');
    info.style.display = d.info === false ? 'none' : '';
    q('.amb-time').innerHTML = timeText(now, d.clock);
    q('.amb-date').textContent = (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + DOW[now.getDay()] + '요일';
    var w = d.weather;
    q('.amb-wx').textContent = w ? Math.round(w.temp) + '° ' + (w.text || '') + (w.city ? ' · ' + w.city : '') + (w.hi !== undefined && w.hi !== null ? ' · 최고 ' + Math.round(w.hi) + '° 최저 ' + Math.round(w.lo) + '°' : '') : '';
    // burn-in care: move the text a little every minute
    var m = now.getMinutes(), dx = (m % 5) * 0.4 - 0.8, dy = (Math.floor(m / 5) % 4) * -0.3;
    info.style.transform = 'translate(' + dx + 'vw,' + dy + 'vw)';
    var side = q('.amb-side'), html = '';
    if (d.side !== false) {
      var evs = (d.agenda || []).filter(function (e) { var s = new Date(e.start); return e.allDay ? s >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) : s >= now; }).slice(0, 4);
      if (evs.length) {
        html += '<div class="amb-card"><h4>다가오는 일정</h4>' + evs.map(function (e) {
          var s = new Date(e.start);
          return '<div class="amb-ev" style="--c:' + esc(e.color || '#fff') + '"><b>' + relDay(s) + (e.allDay ? '' : ' ' + pad(s.getHours()) + ':' + pad(s.getMinutes())) + '</b><span>' + esc(e.title) + '</span></div>';
        }).join('') + '</div>';
      }
      (d.memos || []).slice(0, 3).forEach(function (mm, i) {
        html += '<div class="amb-memo" style="--c:' + esc(mm.color || '#ffe58a') + ';--r:' + (i % 2 ? 1.2 : -1) + 'deg">' + esc(mm.text) + '</div>';
      });
    }
    side.innerHTML = html;
    side.style.transform = 'translate(' + (-dx) + 'vw,' + dy + 'vw)';
  };

  window.CoveAmbient = { create: function (root, getData) { return new Ambient(root, getData); } };
})();
