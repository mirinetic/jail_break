/* Cove mini-app toolkit. A mini app is a page that runs inside Cove (no TV permission needed):
   Cove sends it the remote keys and the current profile, keeps its data per profile, and counts its use.
     CoveApp.onInit(function (profile, data, extra) {})   profile = {id, name, kids}
                                   extra = {family:[{id, name, color, avatar, kids, data}], shared, env:{shift, weather}, intent}
                                   intent = what the home screen asked for when opening the app (e.g. {play, resume})
     CoveApp.onKey(function (key) {})              'up' 'down' 'left' 'right' 'ok' 'back' 'menu'
     CoveApp.save(data)                            stored for this profile
     CoveApp.saveFor(profileId, data)              another family member's data for this app (visits, gifts)
     CoveApp.saveShared(data)                      data the whole family shares for this app
     CoveApp.onSay(function (text) {})            voice/typed text from the phone while the app is open
     CoveApp.exit()                                back to the Cove home screen
   Opened on its own in a browser, it uses the keyboard and a preview profile (?kids=1 for a kids one). */
(function () {
  'use strict';
  var inHost = window.parent !== window;
  var keyFns = [], initFns = [], envFns = [], sayFns = [], closeFns = [], unsent = { data: null, forOthers: {} }, st = { profile: null, data: {}, extra: { family: [], shared: {}, env: { shift: 0, weather: null } } };
  var send = function (m) { if (inHost) window.parent.postMessage(m, '*'); };
  window.addEventListener('message', function (e) {
    if (inHost && e.source !== window.parent) return;
    var m = e.data || {};
    if (m.type === 'init') {
      st.profile = m.profile || {}; st.data = m.data || {};
      st.extra = { family: m.family || [], shared: m.shared || {}, env: m.env || { shift: 0, weather: null }, intent: m.intent || null };
      initFns.forEach(function (f) { f(st.profile, st.data, st.extra); });
    } else if (m.type === 'key') keyFns.forEach(function (f) { f(m.key); });
    else if (m.type === 'say') sayFns.forEach(function (f) { f(m.text); });
    else if (m.type === 'env') { st.extra.env = m.env; envFns.forEach(function (f) { f(m.env); }); }
  });
  var storeKey = 'coveapp.' + location.pathname;
  window.CoveApp = {
    onInit: function (f) { initFns.push(f); if (st.profile) f(st.profile, st.data, st.extra); },
    onEnv: function (f) { envFns.push(f); },
    onSay: function (f) { sayFns.push(f); },
    // Cove calls this just before closing the app (Back at the top, the TV Home button): the app saves
    // what is still pending, and Cove takes the result at once instead of waiting for messages.
    onClose: function (f) { closeFns.push(f); },
    _close: function () { closeFns.forEach(function (f) { try { f(); } catch (e) {} }); var out = unsent; unsent = { data: null, forOthers: {} }; return out; },
    extra: function () { return st.extra; },
    onKey: function (f) { keyFns.push(f); },
    data: function () { return st.data; },
    save: function (d) {
      st.data = d; unsent.data = d;
      if (inHost) send({ type: 'save', data: d });
      else try { localStorage.setItem(storeKey, JSON.stringify(d)); } catch (e) {}
    },
    saveFor: function (pid, d) {
      st.extra.family.forEach(function (m) { if (m.id === pid) m.data = d; });
      unsent.forOthers[pid] = d;
      if (inHost) send({ type: 'saveFor', pid: pid, data: d });
    },
    saveShared: function (d) {
      st.extra.shared = d;
      if (inHost) send({ type: 'saveShared', data: d });
      else try { localStorage.setItem(storeKey + ':shared', JSON.stringify(d)); } catch (e) {}
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
    try { st.extra.shared = JSON.parse(localStorage.getItem(storeKey + ':shared') || '{}'); } catch (e) {}
    initFns.forEach(function (f) { f(st.profile, st.data, st.extra); });
  }, 30);
})();
