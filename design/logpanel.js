// 변경 기록 칸 (모든 페이지 공통 디자인). 디자인은 여기 한 곳에서만 고친다.
// LogPanel.render({ sub, color: [진한, 옅은, 형광펜], iconBg, iconFg, scopes: [{label, on}], onScope(i), note, groups: [{ at, who, where, count, sel, lines: [글 | {who, head, a, b, bad}] }], onPick(i), onClose, empty })
(function () {
  var FONT = "'Paperlogy', 'Paperlogy 4 Regular', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  var el = null, q = '', last = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // 글 한 줄 '이름 · 내용 옛값 → 새값' 을 나눔
  function split(l) {
    if (l && typeof l === 'object') return l;
    var who = '', body = String(l), m = /^(.+?) · (.+)$/.exec(body);
    if (m && m[1].length <= 24) { who = m[1]; body = m[2]; }
    var head = body, a = null, b = null, i = body.lastIndexOf(' → ');
    if (i > 0) { var left = body.slice(0, i), sp = left.lastIndexOf(' '); head = sp > 0 ? left.slice(0, sp) : ''; a = sp > 0 ? left.slice(sp + 1) : left; b = body.slice(i + 3); }
    return { who: who, head: head, a: a, b: b, bad: /지움|삭제|취소|뺌/.test(String(l)), add: /추가|발송|수납|복귀|되살림|등록|출석/.test(String(l)) };
  }
  function lineHTML(l, C, chipFg) {
    var x = split(l), dot = x.bad ? '#D9746C' : x.add ? C[0] : '#AEB7B2';
    return '<div style="display: flex; gap: 8px; align-items: flex-start; padding: 5px 0; border-top: 1px dashed #EEF1EF">'
      + '<span style="flex: none; width: 6px; height: 6px; margin-top: 7px; border-radius: 50%; background: ' + dot + '"></span>'
      + '<span style="min-width: 0; font-size: 13px; line-height: 1.55; color: #3A4450; word-break: keep-all; overflow-wrap: anywhere">'
      + (x.who ? '<span style="display: inline-block; margin-right: 5px; padding: 0 7px; border-radius: 6px; background: ' + C[1] + '; color: ' + chipFg + '; font-size: 12px; font-weight: 600; line-height: 20px">' + esc(x.who) + '</span>' : '')
      + esc(x.head)
      + (x.a != null || x.b != null ? ' <span style="color: #8A949E; text-decoration: line-through; text-decoration-color: #C9D0CC">' + esc(x.a) + '</span> <span style="color: #AEB7B2">→</span> <span style="font-weight: 600; color: #17201C; background: linear-gradient(transparent 58%, ' + C[2] + ' 58%)">' + esc(x.b) + '</span>' : '')
      + '</span></div>';
  }
  function txt(l) { var x = split(l); return [x.who, x.head, x.a, x.b].join(' '); }
  function draw() {
    var o = last, C = o.color || ['#00A6AB', '#E6F6F6', '#BFEAEB'], chipFg = o.chipFg || C[0];
    var WD = '일월화수목금토', h = '', day = '', td = new Date(), yd = new Date(Date.now() - 864e5), total = 0, qq = q.trim();
    var same = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
    (o.groups || []).forEach(function (g, gi) {
      var lines = qq ? g.lines.filter(function (l) { return txt(l).indexOf(qq) >= 0 || (g.who || '').indexOf(qq) >= 0 || (g.where || '').indexOf(qq) >= 0; }) : g.lines;
      if (!lines.length) return; total += g.n || lines.length;
      var t = new Date(g.at), dk = (t.getMonth() + 1) + '월 ' + t.getDate() + '일 (' + WD[t.getDay()] + ')';
      if (dk !== day) {
        day = dk; var tag = same(t, td) ? '오늘' : same(t, yd) ? '어제' : '';
        h += '<div style="position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 6px; padding: 14px 4px 8px; background: #F7F9F8"><span style="font-size: 13px; font-weight: 600; color: #17201C">' + dk + '</span>' + (tag ? '<span style="padding: 1px 8px; border-radius: 999px; background: ' + C[0] + '; color: ' + (o.tagFg || '#FFFFFF') + '; font-size: 11px; font-weight: 600">' + tag + '</span>' : '') + '<span style="flex: 1; height: 1px; background: #E1E6E3"></span></div>';
      }
      var tm = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'), ini = (g.who || '?').replace(/ 원장님| 강사님/, '').slice(0, 1);
      h += '<div data-lp-g="' + gi + '" style="display: flex; gap: 10px; margin: 0 0 10px;' + (o.onPick ? ' cursor: pointer' : '') + '">'
        + '<span style="flex: none; width: 30px; height: 30px; border-radius: 50%; background: ' + C[1] + '; color: ' + chipFg + '; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 3px ' + C[2] + '">' + esc(ini) + '</span>'
        + '<div style="flex: 1; min-width: 0; padding: 10px 12px 6px; border-radius: 14px; border: 1px solid ' + (g.sel ? '#7FCF95' : '#E6EAE8') + '; background: ' + (g.sel ? '#F1FAF3' : '#FFFFFF') + '; box-shadow: 0 1px 3px rgba(23, 32, 28, 0.05)">'
        + '<div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px"><span style="font-size: 14px; font-weight: 600; color: #17201C">' + esc(g.who || '알 수 없음') + '</span><span style="font-size: 12px; color: #8A949E">' + tm + '</span><span style="margin-left: auto; padding: 0 7px; border-radius: 999px; background: #F1F3F2; color: #6B7570; font-size: 11px; font-weight: 600; line-height: 18px; white-space: nowrap">' + esc(g.count || (lines.length + '건')) + '</span></div>'
        + (g.where ? '<div style="font-size: 12px; color: #2952A3; margin-bottom: 2px">' + esc(g.where) + '</div>' : '')
        + lines.map(function (l) { return lineHTML(l, C, chipFg); }).join('') + '</div></div>';
    });
    var list = el.querySelector('[data-lp-list]'), top = list.scrollTop;
    list.innerHTML = h || '<div style="padding: 48px 12px; text-align: center; color: #8A949E"><div style="width: 44px; height: 44px; margin: 0 auto 10px; border-radius: 14px; background: ' + C[1] + '; display: flex; align-items: center; justify-content: center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + chipFg + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 2"></path><circle cx="12" cy="12" r="9"></circle></svg></div><div style="font-size: 13px">' + (qq ? '찾는 기록이 없습니다' : (o.empty || '아직 기록이 없습니다')) + '</div></div>';
    list.scrollTop = top;
    el.querySelector('[data-lp-count]').textContent = total ? total + '건' : '';
    var sc = el.querySelector('[data-lp-scopes]');
    sc.style.display = o.scopes && o.scopes.length ? 'flex' : 'none';
    sc.innerHTML = (o.scopes || []).map(function (s, i) { return '<button type="button" data-lp-s="' + i + '" style="height: 30px; padding: 0 11px; border-radius: 999px; font-family: ' + FONT + '; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid ' + (s.on ? C[0] + '; background: ' + C[1] + '; color: ' + chipFg : '#DDE2DF; background: #FFFFFF; color: #5E6873') + '">' + esc(s.label) + '</button>'; }).join('');
    var nt = el.querySelector('[data-lp-note]'); nt.textContent = o.note || ''; nt.style.display = o.note ? 'block' : 'none'; nt.style.background = o.noteWarn ? '#FFF4E0' : 'transparent'; nt.style.color = o.noteWarn ? '#9A5B00' : '#8A949E'; nt.style.padding = o.noteWarn ? '8px 10px' : '0 2px';
  }
  function build() {
    var o = last, C = o.color || ['#00A6AB', '#E6F6F6', '#BFEAEB'];
    el = document.createElement('div');
    el.className = 'noprint noexp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '변경 기록');
    el.style.cssText = 'position: fixed; top: 52px; right: 0; bottom: 0; z-index: 1002; width: 380px; max-width: 94vw; display: flex; flex-direction: column; background: #F7F9F8; border-top: 1px solid #DDE2DF; border-left: 1px solid #DDE2DF; border-top-left-radius: 18px; box-shadow: -12px 0 32px rgba(23, 32, 28, 0.10); font-family: ' + FONT + '; color: #17201C; overflow: hidden';
    el.innerHTML = '<div style="padding: 18px 18px 12px; background: #FFFFFF; border-bottom: 1px solid #E6EAE8; display: flex; flex-direction: column; gap: 10px">'
      + '<div style="display: flex; align-items: center; gap: 10px">'
      + '<span data-lp-icon style="width: 32px; height: 32px; flex: none; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(23, 32, 28, 0.12)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l3 2"></path></svg></span>'
      + '<span style="display: flex; flex-direction: column; gap: 1px"><span data-lp-title style="font-size: 18px; font-weight: 600; letter-spacing: -0.2px; padding: 0 2px">변경 기록</span><span style="font-size: 12px; color: #8A949E"><span data-lp-sub></span> <span data-lp-count style="font-weight: 600"></span></span></span>'
      + '<button type="button" data-lp-close aria-label="닫기" style="margin-left: auto; width: 34px; height: 34px; border-radius: 10px; border: 1px solid #DDE2DF; background: #FFFFFF; color: #5E6873; font-family: ' + FONT + '; font-size: 17px; cursor: pointer">×</button></div>'
      + '<div data-lp-scopes style="display: none; gap: 6px; flex-wrap: wrap"></div>'
      + '<div style="position: relative"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A949E" stroke-width="2.2" stroke-linecap="round" style="position: absolute; left: 11px; top: 10px"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input id="lp_search" type="text" data-noclear="1" placeholder="이름·내용 찾기" aria-label="기록 찾기" style="width: 100%; box-sizing: border-box; height: 36px; padding: 0 12px 0 32px; border-radius: 10px; border: 1px solid #DDE2DF; background: #F7F9F8; font-family: ' + FONT + '; font-size: 13px; color: #17201C; outline: none"></div>'
      + '<div data-lp-note style="display: none; border-radius: 9px; font-size: 12px; font-weight: 600"></div></div>'
      + '<div data-lp-list style="flex: 1; overflow: auto; padding: 0 14px 18px"></div>';
    document.body.appendChild(el);
    var inp = el.querySelector('#lp_search');
    inp.value = q;
    inp.onfocus = function () { inp.style.borderColor = (last.focus || last.color[0]); inp.style.background = '#FFFFFF'; };
    inp.onblur = function () { inp.style.borderColor = '#DDE2DF'; inp.style.background = '#F7F9F8'; };
    inp.oninput = function () { q = inp.value; draw(); };
    el.querySelector('[data-lp-close]').onclick = function () { var f = last.onClose; LogPanel.close(); if (f) f(); };
    el.addEventListener('click', function (e) {
      var s = e.target.closest('[data-lp-s]'); if (s && last.onScope) { last.onScope(+s.getAttribute('data-lp-s')); return; }
      var g = e.target.closest('[data-lp-g]'); if (g && last.onPick) last.onPick(+g.getAttribute('data-lp-g'));
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var f = last.onClose; LogPanel.close(); if (f) f(); } });
  }
  var LogPanel = {
    render: function (o) {
      last = o; if (!el || !el.isConnected) { q = ''; build(); }
      var C = o.color || ['#00A6AB', '#E6F6F6', '#BFEAEB'];
      var ic = el.querySelector('[data-lp-icon]'); ic.style.background = o.iconBg || C[0]; ic.style.color = o.iconFg || '#FFFFFF';
      el.querySelector('[data-lp-title]').style.background = 'linear-gradient(transparent 60%, ' + C[2] + ' 60%)';
      el.querySelector('[data-lp-sub]').textContent = o.sub || '';
      el.querySelector('[data-lp-count]').style.color = o.countFg || C[0];
      draw();
    },
    close: function () { if (el) el.remove(); el = null; },
    isOpen: function () { return !!(el && el.isConnected); }
  };
  window.LogPanel = LogPanel;
})();
