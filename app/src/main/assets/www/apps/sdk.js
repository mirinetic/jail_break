/* Cove mini-app toolkit. A mini app is a page that runs inside Cove (no TV permission needed):
   Cove sends it the remote keys and the current profile, keeps its data per profile, and counts its use.
     CoveApp.onInit(function (profile, data) {})   profile = {id, name, kids}
     CoveApp.onKey(function (key) {})              'up' 'down' 'left' 'right' 'ok' 'back' 'menu'
     CoveApp.save(data)                            stored for this profile
     CoveApp.exit()                                back to the Cove home screen
   Opened on its own in a browser, it uses the keyboard and a preview profile (?kids=1 for a kids one). */
(function () {
  'use strict';
  var inHost = window.parent !== window;
  var keyFns = [], initFns = [], st = { profile: null, data: {} };
  var send = function (m) { if (inHost) window.parent.postMessage(m, '*'); };
  window.addEventListener('message', function (e) {
    if (inHost && e.source !== window.parent) return;
    var m = e.data || {};
    if (m.type === 'init') {
      st.profile = m.profile || {}; st.data = m.data || {};
      initFns.forEach(function (f) { f(st.profile, st.data); });
    } else if (m.type === 'key') keyFns.forEach(function (f) { f(m.key); });
  });
  var storeKey = 'coveapp.' + location.pathname;
  window.CoveApp = {
    onInit: function (f) { initFns.push(f); if (st.profile) f(st.profile, st.data); },
    onKey: function (f) { keyFns.push(f); },
    data: function () { return st.data; },
    save: function (d) {
      st.data = d;
      if (inHost) send({ type: 'save', data: d });
      else try { localStorage.setItem(storeKey, JSON.stringify(d)); } catch (e) {}
    },
    exit: function () { if (inHost) send({ type: 'exit' }); },
    toast: function (t) { send({ type: 'toast', text: t }); }
  };
  if (inHost) { send({ type: 'ready' }); return; }
  var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Escape: 'back', Backspace: 'back' };
  document.addEventListener('keydown', function (e) { var k = map[e.key]; if (k) { e.preventDefault(); keyFns.forEach(function (f) { f(k); }); } });
  setTimeout(function () {
    if (st.profile) return;
    var d = {};
    try { d = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch (e) {}
    st.profile = { id: 'preview', name: '미리보기', kids: /kids=1/.test(location.search) }; st.data = d;
    initFns.forEach(function (f) { f(st.profile, st.data); });
  }, 30);
})();
