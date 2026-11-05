/* Cove's own on-screen keyboard for the TV remote, with Korean (자모 are combined into syllables as
   you type, like a normal 두벌식 keyboard), English and numbers / symbols.
     CoveKeyboard.open(title, initial, done)   done(text) on 완료, done(null) on cancel
     CoveKeyboard.key(k)                       remote keys: 'up' 'down' 'left' 'right' 'ok' 'back' 'n0'..'n9'
     CoveKeyboard.insert(text)                 text typed on the phone remote goes straight in
   Back deletes one letter; with nothing left to delete it closes the keyboard. */
(function () {
  'use strict';
  // ---------- Hangul composition ----------
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  var JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  var JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  var V_JOIN = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  var C_JOIN = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  var V_SPLIT = {}, C_SPLIT = {};
  Object.keys(V_JOIN).forEach(function (k) { V_SPLIT[V_JOIN[k]] = k; });
  Object.keys(C_JOIN).forEach(function (k) { C_SPLIT[C_JOIN[k]] = k; });
  function isVowel(ch) { return JUNG.indexOf(ch) >= 0; }
  function isCons(ch) { return CHO.indexOf(ch) >= 0 || JONG.indexOf(ch) > 0; }

  // text = finished part; cur = the syllable being built {cho, jung, jong} (each a jamo or '')
  var text = '', cur = { cho: '', jung: '', jong: '' };
  function curStr() {
    if (cur.cho && cur.jung) return String.fromCharCode(0xAC00 + (CHO.indexOf(cur.cho) * 21 + JUNG.indexOf(cur.jung)) * 28 + Math.max(0, JONG.indexOf(cur.jong || ' ')));
    return cur.cho + cur.jung + cur.jong;
  }
  function commit() { text += curStr(); cur = { cho: '', jung: '', jong: '' }; }
  function typeJamo(ch) {
    if (isVowel(ch)) {
      if (cur.jong) {
        // the last consonant moves on to start the next syllable: 갑 + ㅏ -> 가바, 값 + ㅏ -> 갑사
        var split = C_SPLIT[cur.jong], moved;
        if (split) { cur.jong = split.charAt(0); moved = split.charAt(1); } else { moved = cur.jong; cur.jong = ''; }
        commit(); cur.cho = moved; cur.jung = ch; return;
      }
      if (cur.jung) {
        var j = V_JOIN[cur.jung + ch];
        if (j) { cur.jung = j; return; }
        commit(); cur.jung = ch; return;
      }
      if (cur.cho) { cur.jung = ch; return; }
      cur.jung = ch; return;
    }
    // consonant
    if (cur.cho && cur.jung) {
      if (!cur.jong) { if (JONG.indexOf(ch) > 0) { cur.jong = ch; return; } }
      else { var c = C_JOIN[cur.jong + ch]; if (c) { cur.jong = c; return; } }
    }
    commit(); cur.cho = ch;
  }
  function typeChar(ch) {
    if (isVowel(ch) || isCons(ch)) { typeJamo(ch); return; }
    commit(); text += ch;
  }
  function backspace() {
    if (cur.jong) { var s = C_SPLIT[cur.jong]; cur.jong = s ? s.charAt(0) : ''; return true; }
    if (cur.jung) { var v = V_SPLIT[cur.jung]; cur.jung = v ? v.charAt(0) : ''; return true; }
    if (cur.cho) { cur.cho = ''; return true; }
    if (!text) return false;
    // take the last finished syllable apart again, so 지우기 removes one 자모 at a time
    var last = text.charAt(text.length - 1), code = last.charCodeAt(0) - 0xAC00;
    text = text.slice(0, -1);
    if (code >= 0 && code < 11172) {
      cur = { cho: CHO.charAt(Math.floor(code / 588)), jung: JUNG.charAt(Math.floor(code % 588 / 28)), jong: code % 28 ? JONG.charAt(code % 28) : '' };
      return backspace();
    }
    return true;
  }
  function value() { return text + curStr(); }

  // ---------- layouts ----------
  var LAYOUTS = {
    ko: [['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ'], ['ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ', '.'],
      ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'], ['ㅐ', 'ㅒ', 'ㅔ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅟ', 'ㅢ', '?']],
    en: [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'"],
      ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.']],
    num: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', '(', ')', '~', '&', '@', '"', '·'],
      ['.', ',', '?', '!', '#', '%', '+', '=', '*', '♥']]
  };
  var BOTTOM = [['mode', '한/영'], ['num', '123'], ['space', '띄어쓰기'], ['del', '지우기'], ['done', '완료']];

  var st = null;   // {title, done, mode, shift, r, c}
  var box = null;
  function ensure() {
    if (box) return;
    var css = document.createElement('style');
    css.textContent = '' +
      '#kbd{position:fixed;inset:0;z-index:22;background:rgba(6,8,14,.8);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);display:grid;place-items:center}' +
      '#kbd[hidden]{display:none!important}' +
      '.kb-box{width:min(70rem,92vw);display:grid;gap:1.2rem}' +
      '.kb-box h2{margin:0;font-size:1.6rem;font-weight:500;color:#cfd5e2}' +
      '.kb-field{min-height:4.6rem;padding:1rem 1.4rem;border-radius:1rem;background:rgba(255,255,255,.1);font-size:2.2rem;line-height:1.3;word-break:break-all;color:#fff}' +
      '.kb-field i{display:inline-block;width:.14rem;height:2.2rem;margin-left:.08rem;vertical-align:-.3rem;background:#fff;animation:kbblink 1s steps(1) infinite}' +
      '.kb-field u{text-decoration:none;border-bottom:.15rem solid #8fb4ff}' +
      '@keyframes kbblink{50%{opacity:0}}' +
      '.kb-rows{display:grid;gap:.6rem}' +
      '.kb-row{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:.6rem}' +
      '.kb-k{height:4.2rem;border-radius:.8rem;background:rgba(255,255,255,.1);display:grid;place-items:center;font-size:1.7rem;color:#f4f5f8}' +
      '.kb-k.fn{font-size:1.15rem;background:rgba(255,255,255,.06)}' +
      '.kb-k.wide{grid-column:span 4}' +
      '.kb-k.on{background:rgba(143,180,255,.35)}' +
      '.kb-k.sel{background:#fff;color:#11141b;transform:scale(1.06)}' +
      '.kb-hint{display:flex;gap:1.6rem;font-size:1rem;color:#aab1c0;flex-wrap:wrap}' +
      '.kb-hint kbd{font:inherit;font-weight:700;padding:.1rem .5rem;border-radius:.3rem;background:rgba(255,255,255,.18);margin-right:.4rem;color:#fff}';
    document.head.appendChild(css);
    box = document.createElement('div');
    box.id = 'kbd'; box.hidden = true;
    box.innerHTML = '<div class="kb-box"><h2 id="kbTitle"></h2><div class="kb-field" id="kbField"></div><div class="kb-rows" id="kbRows"></div>' +
      '<div class="kb-hint"><span><kbd>방향키</kbd>글자 고르기</span><span><kbd>OK</kbd>입력</span><span><kbd>0-9</kbd>숫자</span><span><kbd>뒤로</kbd>한 글자 지우기 · 비었으면 닫기</span><span>폰 리모컨 입력창에 써도 여기로 들어와요</span></div></div>';
    document.body.appendChild(box);
  }
  function rows() {
    var l = LAYOUTS[st.mode].map(function (r) { return r.map(function (k) { return st.mode === 'en' && st.shift && k.length === 1 ? k.toUpperCase() : k; }); });
    return l.concat([BOTTOM.map(function (b) { return b[0]; })]);
  }
  function label(k) { for (var i = 0; i < BOTTOM.length; i++) if (BOTTOM[i][0] === k) return BOTTOM[i][1]; return k; }
  function render() {
    var rs = rows(), bottom = rs.length - 1;
    document.getElementById('kbTitle').textContent = st.title || '';
    var cs = curStr();
    document.getElementById('kbField').innerHTML = esc(text) + (cs ? '<u>' + esc(cs) + '</u>' : '') + '<i></i>';
    document.getElementById('kbRows').innerHTML = rs.map(function (r, ri) {
      return '<div class="kb-row">' + r.map(function (k, ci) {
        var fn = ri === bottom || k === '⇧';
        var on = (k === 'mode' && st.mode === 'ko') || (k === 'num' && st.mode === 'num') || (k === '⇧' && st.shift);
        return '<div class="kb-k' + (fn ? ' fn' : '') + (k === 'space' ? ' wide' : '') + (on ? ' on' : '') + (ri === st.r && ci === st.c ? ' sel' : '') + '">' +
          esc(k === 'mode' ? (st.mode === 'ko' ? '한 → 영' : '영 → 한') : label(k)) + '</div>';
      }).join('') + '</div>';
    }).join('');
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function press(k) {
    if (k === 'mode') { commit(); st.mode = st.mode === 'ko' ? 'en' : 'ko'; st.shift = false; }
    else if (k === 'num') { commit(); st.mode = st.mode === 'num' ? st.prev || 'ko' : (st.prev = st.mode, 'num'); }
    else if (k === '⇧') st.shift = !st.shift;
    else if (k === 'space') { commit(); text += ' '; }
    else if (k === 'del') backspace();
    else if (k === 'done') { finish(value()); return; }
    else { typeChar(k); if (st.shift && st.mode === 'en') st.shift = false; }
    if (value().length > st.max) { backspace(); }
    render();
  }
  function finish(v) { var cb = st.done; st = null; box.hidden = true; if (cb) cb(v); }

  window.CoveKeyboard = {
    isOpen: function () { return !!st; },
    open: function (title, initial, done, opts) {
      ensure();
      text = String(initial || ''); cur = { cho: '', jung: '', jong: '' };
      st = { title: title, done: done, mode: 'ko', shift: false, r: 0, c: 0, max: (opts && opts.max) || 200, prev: 'ko' };
      box.hidden = false;
      render();
    },
    insert: function (t) { if (!st) return; commit(); text += String(t); render(); },
    key: function (k) {
      if (!st) return false;
      var rs = rows();
      if (/^n\d$/.test(k)) { commit(); text += k.charAt(1); render(); return true; }
      if (k === 'back') { if (!backspace()) finish(null); else render(); return true; }
      if (k === 'ok' || k === 'longok') { press(rs[st.r][st.c]); return true; }
      if (k === 'left') st.c = (st.c - 1 + rs[st.r].length) % rs[st.r].length;
      else if (k === 'right') st.c = (st.c + 1) % rs[st.r].length;
      else if (k === 'up' || k === 'down') {
        var from = rs[st.r], pos = (st.c + .5) / from.length;
        st.r = (st.r + (k === 'down' ? 1 : -1) + rs.length) % rs.length;
        st.c = Math.min(rs[st.r].length - 1, Math.floor(pos * rs[st.r].length));
      }
      render();
      return true;
    },
    _value: value,
    _press: function (k) { press(k); }   // test hook
  };
})();
