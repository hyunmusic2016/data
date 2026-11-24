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
    '@keyframes fxSweep{0%{background-size:0% 100%}100%{background-size:100% 100%}}',
    '.fx-tabz{z-index:2;position:relative}.fx-tabbare{background:transparent!important;border-color:transparent!important}',
    '.fx-sweep{background-repeat:no-repeat;animation:fxSweep .45s ease-out}',
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
  var dlgRect = {}, entered = false;
  var SL = 500, EZ = 'cubic-bezier(.3,.7,.3,1)'; // 탭 바탕이 미끄러지는 시간
  // 페이지를 떠날 때 제목 아이콘 색을 기억 (같은 창 안에서만)
  window.addEventListener('pagehide', function () {
    var l = document.querySelector('[data-fxc]'); if (!l) return;
    var c = getComputedStyle(l);
    var t = activeTab(), r = t && t.getBoundingClientRect();
    try { sessionStorage.setItem('fx.title', JSON.stringify({ p: location.pathname, bg: c.backgroundColor, fg: c.color, tab: r ? { l: r.left, t: r.top, w: r.width, h: r.height } : null })); } catch (e) {}
  });
  // 맨 위 메뉴 탭 중 지금 페이지 탭
  function activeTab() {
    var me = location.pathname.split('/').pop();
    return [].slice.call(document.querySelectorAll('nav[aria-label="주 메뉴"] a[href]')).filter(function (a) { return a.getAttribute('href').split('/').pop().split('?')[0] === me; })[0] || null;
  }
  // 선택된 메뉴 탭: 앞 페이지 탭 자리에서 이 페이지 탭 자리로 미끄러져 옴
  function tabSlide(o) {
    var a = activeTab(); if (!a || !o.tab) return;
    var r = a.getBoundingClientRect(), c = getComputedStyle(a); if (!r.width || Math.abs(r.left - o.tab.l) < 2) return;
    var d = document.createElement('div'); d.className = 'noexp noprint'; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;z-index:1;pointer-events:none;box-sizing:border-box;left:' + o.tab.l + 'px;top:' + r.top + 'px;width:' + o.tab.w + 'px;height:' + r.height + 'px;background:' + c.backgroundColor + ';border:' + c.borderTopWidth + ' solid ' + c.borderTopColor + ';border-bottom-color:' + c.borderBottomColor + ';border-radius:' + c.borderTopLeftRadius + ' ' + c.borderTopRightRadius + ' 0 0;transition:left ' + SL + 'ms ' + EZ + ',width ' + SL + 'ms ' + EZ;
    document.body.appendChild(d);
    var all = q('nav[aria-label="주 메뉴"] a[href]'), me = function () { var x = activeTab(); return x ? [x] : []; };
    all(document).forEach(function (x) { mark(x, 'fx-tabz', SL + 60, all); });
    mark(a, 'fx-tabbare', SL + 60, me);
    void d.offsetWidth; d.style.left = r.left + 'px'; d.style.width = r.width + 'px';
    setTimeout(function () { d.remove(); document.querySelectorAll('.fx-tabz,.fx-tabbare').forEach(function (x) { x.classList.remove('fx-tabz', 'fx-tabbare'); }); }, SL + 70);
  }
  // 선택된 탭 바탕 상자를 old 자리에서 el 자리로 옮김 (상자는 탭 묶음 안에 넣어 같은 층에서 글자 아래로)
  function slideBox(el, old, allF, meF) {
    var r = el.getBoundingClientRect(), c = getComputedStyle(el); if (!r.width || !old || Math.abs(r.left - old.left) + Math.abs(r.top - old.top) < 2) return;
    var d = document.createElement('div'); d.className = 'noexp noprint'; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;z-index:1;pointer-events:none;box-sizing:border-box;left:' + old.left + 'px;top:' + old.top + 'px;width:' + old.width + 'px;height:' + old.height + 'px;background:' + c.backgroundColor + ';border-style:solid;border-width:' + c.borderTopWidth + ' ' + c.borderRightWidth + ' ' + c.borderBottomWidth + ' ' + c.borderLeftWidth + ';border-color:' + c.borderTopColor + ' ' + c.borderRightColor + ' ' + c.borderBottomColor + ' ' + c.borderLeftColor + ';border-radius:' + c.borderRadius + ';box-shadow:' + c.boxShadow + ';transition:left ' + SL + 'ms ' + EZ + ',top ' + SL + 'ms ' + EZ + ',width ' + SL + 'ms ' + EZ + ',height ' + SL + 'ms ' + EZ;
    var host = el.parentNode; host.appendChild(d);
    allF(document).forEach(function (x) { mark(x, 'fx-tabz', SL + 60, allF); });
    mark(el, 'fx-tabbare', SL + 60, meF);
    void d.offsetWidth; d.style.left = r.left + 'px'; d.style.top = r.top + 'px'; d.style.width = r.width + 'px'; d.style.height = r.height + 'px';
    slides.push({ d: d, until: Date.now() + SL + 60, host: function (a) { var m = meF(a)[0]; return m && m.parentNode; } });
    setTimeout(function () { d.remove(); slides = slides.filter(function (x) { return x.d !== d; }); document.querySelectorAll('.fx-tabz,.fx-tabbare').forEach(function (x) { x.classList.remove('fx-tabz', 'fx-tabbare'); }); }, SL + 70);
  }
  var slides = [];
  // 탭 묶음들: 키 = 묶음 이름(aria-label), 값 = 선택된 탭(글자·자리)과 다시 찾는 방법
  var GROUPS = '[role="tablist"], nav[aria-label="시트"]';
  function tabState(app) {
    var o = {};
    [].slice.call(app.querySelectorAll(GROUPS)).forEach(function (g, gi) {
      var k = (g.getAttribute('aria-label') || '') + '#' + gi, sel = g.querySelector('[role="tab"][aria-selected="true"], [aria-pressed="true"]'); if (!sel || o[k]) return;
      var find = function (a) { return [].slice.call(a.querySelectorAll(GROUPS))[gi] || null; };
      o[k] = { t: sel.textContent, r: sel.getBoundingClientRect(), el: sel,
        all: function (a) { var x = find(a); return x ? [].slice.call(x.querySelectorAll('[role="tab"], button, a')) : []; },
        me: function (a) { var x = find(a), m = x && x.querySelector('[role="tab"][aria-selected="true"], [aria-pressed="true"]'); return m ? [m] : []; } };
    });
    return o;
  }
  function pageEnter(app) {
    var o = null; try { o = JSON.parse(sessionStorage.getItem('fx.title') || 'null'); sessionStorage.removeItem('fx.title'); } catch (e) {}
    if (!o || o.p === location.pathname) return;
    var st = document.createElement('style');
    st.textContent = '@keyframes fxFromPrev{0%{background-color:' + o.bg + ';color:' + o.fg + '}}.fx-from{animation:fxFromPrev .45s ease}';
    document.head.appendChild(st);
    app.querySelectorAll('[data-fxc]').forEach(function (e) { mark(e, 'fx-from', 450, q('[data-fxc]')); });
    app.querySelectorAll('[data-fxhl]').forEach(function (e) { mark(e, 'fx-sweep', 450, q('[data-fxhl]')); });
    tabSlide(o);
  }
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
      prev.tabs = tabState(app);
      dlgRect = {}; Object.keys(prev.dlg).forEach(function (k) { var r = prev.dlg[k].getBoundingClientRect(); if (r.width) dlgRect[k] = r; });
    },
    after: function (app, comp) {
      if (RM || !prev || exporting()) { prev = null; return; }
      var now = snap(app, comp), P = prev; prev = null;
      carry(app);
      slides.forEach(function (x) { if (!x.d.isConnected) { var h = x.host(app); if (h) h.appendChild(x.d); } });
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
      // 맨 위 메뉴 탭으로 다른 페이지에 오면: 제목 아이콘이 앞 페이지 색에서 이 페이지 색으로, 형광펜 줄은 다시 그어지듯
      if (!entered) { entered = true; pageEnter(app); }
      // 출석부 강사 탭: 선택된 탭 바탕이 앞 강사 탭 자리에서 새 탭 자리로 미끄러짐
      // 탭 묶음(role=tablist, 아래 시트 막대)에서 선택된 탭이 바뀌면 바탕이 앞 탭 자리에서 새 탭 자리로 미끄러짐
      var NT = tabState(app); Object.keys(NT).forEach(function (k) { var o = (P.tabs || {})[k], n = NT[k]; if (o && n && o.t !== n.t) slideBox(n.el, o.r, n.all, n.me); });
      if (sameView) {
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
