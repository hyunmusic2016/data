// 화면 효과 (모든 페이지 공통). 페이지는 바뀔 때마다 통째로 다시 그려지므로,
// 다시 그리기 직전(before)과 직후(after)를 비교해서 "정말 바뀐 것"에만 짧은 효과를 준다.
// 컴퓨터의 '동작 줄이기' 설정이 켜져 있으면 아무 효과도 없음. 인쇄·내보내기에는 효과 없음.
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T0 = Date.now();
  var css = [
    '@keyframes fxPop{0%{scale:.55;opacity:.2}60%{scale:1.12;opacity:1}100%{scale:1}}',
    '@keyframes fxDlgIn{0%{scale:.96;opacity:0}100%{scale:1;opacity:1}}',
    '@keyframes fxDlgOut{0%{scale:1;opacity:1}100%{scale:.97;opacity:0}}',
    '@keyframes fxFade{0%{opacity:.25;translate:0 4px}100%{opacity:1;translate:0 0}}',
    '@keyframes fxGlow{0%,35%{background-color:rgba(255,214,102,.75);box-shadow:0 0 0 4px rgba(255,214,102,.75)}100%{background-color:rgba(255,214,102,0);box-shadow:0 0 0 4px rgba(255,214,102,0)}}',
    '@keyframes fxSlide{0%{opacity:0;translate:-14px 0}100%{opacity:1;translate:0 0}}',
    '@keyframes fxDot{0%,100%{scale:1;box-shadow:0 0 0 0 rgba(240,138,60,.55)}50%{scale:1.35;box-shadow:0 0 0 5px rgba(240,138,60,0)}}',
    '.fx-pop{animation:fxPop .28s ease-out}',
    '.fx-dlg{animation:fxDlgIn .16s ease-out}',
    '.fx-fade{animation:fxFade .22s ease-out}',
    '.fx-glow{animation:fxGlow 1.1s ease-out;border-radius:6px}',
    '.fx-slide{animation:fxSlide .3s ease-out}',
    '.fx-dot{animation:fxDot 1s ease-in-out 3}',
    'button{transition:scale .08s ease-out}',
    'button:not([data-cell]):not(:disabled):active{scale:.96}',
    '@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}button:active{scale:none!important}}',
    '@media print{*{animation:none!important;transition:none!important}}'
  ].join('\n');
  function addCss() { var s = document.createElement('style'); s.textContent = css; (document.head || document.documentElement).appendChild(s); }
  if (document.head) addCss(); else document.addEventListener('DOMContentLoaded', addCss);

  var prev = null, lastSig = null, exporting = function () { return !!document.querySelector('.html2canvas-container') || document.body.classList.contains('exporting'); };
  function attr(el, a) { return el.getAttribute(a) || ''; }
  function snap(app, comp) {
    var o = { dlg: {}, cell: {}, key: {}, col: {}, hl: {}, sig: sig(app, comp) };
    app.querySelectorAll('[role="dialog"]').forEach(function (d) { var k = attr(d, 'aria-label') || attr(d, 'id'); if (k && !o.dlg[k]) o.dlg[k] = d; });
    app.querySelectorAll('button[data-cell]').forEach(function (c) { o.cell[attr(c, 'data-cell')] = c.textContent; });
    app.querySelectorAll('[data-fxk]').forEach(function (e) { o.key[attr(e, 'data-fxk')] = e.textContent; });
    app.querySelectorAll('[data-fxc]').forEach(function (e) { o.col[attr(e, 'data-fxc')] = attr(e, 'style'); });
    app.querySelectorAll('[data-fxhl]').forEach(function (e) { o.hl[attr(e, 'data-fxhl')] = attr(e, 'style'); });
    return o;
  }
  // 보고 있는 화면(탭·달·종류)이 바뀌었는지 알아보는 표시
  function sig(app, comp) {
    var st = (comp && comp.state) || {}, p = location.pathname;
    var view = ['sheetScroll', 'clScroll', 'wlScroll'].filter(function (i) { return document.getElementById(i); }).join();
    if (p.indexOf('attendance') >= 0) return [st.teacher, st.sheet, view].join('|');
    if (p.indexOf('students') >= 0) return String(st.tab);
    if (p.indexOf('money') >= 0) return String(st.ym);
    if (p.indexOf('settings') >= 0) return String(st.view);
    return '';
  }
  var dlgRect = {};
  // 효과가 끝나기 전에 화면이 또 다시 그려져도 이어서 보이도록, 진행 중인 효과를 기억했다가 새 요소에 다시 붙임
  var live = [];
  function mark(el, cls, ms, find) { el.classList.add(cls); live.push({ cls: cls, find: find, t: Date.now(), ms: ms }); }
  function carry(app) {
    var now = Date.now(); live = live.filter(function (x) { return now - x.t < x.ms; });
    live.forEach(function (x) { var els = x.find(app); els.forEach(function (e) { if (!e.classList.contains(x.cls)) { e.classList.add(x.cls); e.style.animationDelay = (x.t - now) + 'ms'; } }); });
  }
  function q(sel) { return function (app) { return [].slice.call(app.querySelectorAll(sel)); }; }
  function esc(v) { return String(v).replace(/["\\]/g, '\\$&'); }
  window.__fx = {
    before: function (app, comp) {
      if (RM) return;
      prev = snap(app, comp);
      dlgRect = {}; Object.keys(prev.dlg).forEach(function (k) { var r = prev.dlg[k].getBoundingClientRect(); if (r.width) dlgRect[k] = r; });
    },
    after: function (app, comp) {
      if (RM || !prev || exporting()) { prev = null; return; }
      var now = snap(app, comp), P = prev; prev = null;
      carry(app);
      var sameView = lastSig === now.sig; lastSig = now.sig;
      // 1. 팝업 창: 새로 열린 창은 살짝 커지며 나타나고, 닫힌 창은 부드럽게 사라짐
      Object.keys(now.dlg).forEach(function (k) { if (!P.dlg[k]) mark(now.dlg[k], 'fx-dlg', 160, q('[role="dialog"][aria-label="' + esc(k) + '"]')); });
      Object.keys(P.dlg).forEach(function (k) {
        if (now.dlg[k] || !dlgRect[k]) return;
        var r = dlgRect[k], c = P.dlg[k].cloneNode(true);
        c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); }); c.setAttribute('aria-hidden', 'true'); c.classList.add('noexp', 'noprint');
        c.style.cssText += ';position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;transform:none;translate:none;pointer-events:none;z-index:2147483000;animation:fxDlgOut .14s ease-in forwards';
        document.body.appendChild(c); setTimeout(function () { c.remove(); }, 200);
      });
      // 3. 탭·달·화면을 바꾸면 표가 스르륵
      if (!sameView) { app.querySelectorAll('.shellscroll').forEach(function (s) { mark(s, 'fx-fade', 220, q('.shellscroll')); }); }
      else {
        // 2. 출결·수납을 넣은 칸만 톡 (한꺼번에 많이 바뀐 건 효과 없음)
        var ch = [];
        app.querySelectorAll('button[data-cell]').forEach(function (c) { var k = attr(c, 'data-cell'); if (k in P.cell && P.cell[k] !== c.textContent && c.textContent.trim()) ch.push(c); });
        if (ch.length && ch.length <= 40) ch.forEach(function (c) { var k = attr(c, 'data-cell'), f = function (app) { var e = app.querySelector('button[data-cell="' + esc(k) + '"]'); return e ? [e.firstElementChild || e] : []; }; mark(f(app)[0], 'fx-pop', 280, f); });
        // 6·7. 금액 합계·발송 날짜가 바뀌면 강조
        app.querySelectorAll('[data-fxk]').forEach(function (e) {
          var k = attr(e, 'data-fxk'); if (!(k in P.key) || P.key[k] === e.textContent) return;
          mark(e, /^nd:/.test(k) ? 'fx-slide' : 'fx-glow', /^nd:/.test(k) ? 300 : 1100, q('[data-fxk="' + esc(k) + '"]'));
        });
        app.querySelectorAll('[data-fxk^="nd:"]').forEach(function (e) { var k = attr(e, 'data-fxk'); if (!(k in P.key) && Object.keys(P.key).length) mark(e, 'fx-slide', 300, q('[data-fxk="' + esc(k) + '"]')); });
      }
      // 8. 제목 아이콘 색은 부드럽게, 형광펜 줄은 다시 그어지듯
      app.querySelectorAll('[data-fxc]').forEach(function (e) {
        var k = attr(e, 'data-fxc'), old = P.col[k]; if (old == null || old === attr(e, 'style')) return;
        var tmp = document.createElement('span'); tmp.style.cssText = old;
        var bg = tmp.style.backgroundColor, fg = tmp.style.color;
        var nbg = e.style.backgroundColor, nfg = e.style.color;
        e.style.transition = 'none'; if (bg) e.style.backgroundColor = bg; if (fg) e.style.color = fg;
        void e.offsetWidth;
        e.style.transition = 'background-color .35s ease, color .35s ease'; e.style.backgroundColor = nbg; e.style.color = nfg;
      });
      app.querySelectorAll('[data-fxhl]').forEach(function (e) {
        var k = attr(e, 'data-fxhl'); if (P.hl[k] == null || P.hl[k] === attr(e, 'style')) return;
        e.style.backgroundRepeat = 'no-repeat'; e.style.transition = 'none'; e.style.backgroundSize = '0% 100%';
        void e.offsetWidth;
        e.style.transition = 'background-size .4s ease-out'; e.style.backgroundSize = '100% 100%';
      });
      // 5. 주황 변경 점: 페이지를 연 뒤 3초 동안만 은은하게 깜빡 (다시 그려도 이어서)
      var age = Date.now() - T0;
      if (age < 3000) app.querySelectorAll('[aria-label="최근 3일 안에 바뀐 내용 있음"]').forEach(function (d) { d.classList.add('fx-dot'); d.style.animationDelay = (-age) + 'ms'; });
    }
  };
})();
