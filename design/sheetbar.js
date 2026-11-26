// 시트로 보기 창 아래 달 막대 (출석부·수입·지출·통계 공통, 모양은 여기 한 곳). 원래 화면과 같은 기능:
// + = 해·월 골라 달 추가, ≡ = 모든 시트 목록(숨긴 시트 흐리게 + '숨김', 누르면 다시 보임), 탭 누르기 = 그 달 보기,
// 탭 오른쪽 클릭 = '시트 숨기기'(Shift+누르기로 여러 개 고르기, 하나는 꼭 남김).
// 원래 화면이 시트 내용에 bar = { color, tabs: [{ id: 'YYYY-MM', name, on }], all: [{ id, name, on, hidden }] } 를 넣어 주고,
// 누르면 localStorage 'sheetcmd.<page>' = { act: 'pick'|'hide'|'add', id, ids, t } 를 써서 원래 화면이 그대로 처리 → 시트 내용이 바뀌면 이 창도 따라감.
(function () {
  var FONT = "'Paperlogy', 'Paperlogy 4 Regular', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  var el = null, pop = null, page = '', bar = null, multi = [], anchor = '';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function send(o) {
    o.t = Date.now() + Math.random(); closePop();
    try { if (window.opener && window.opener.__sheetCmd) { window.opener.__sheetCmd(page, o); return; } } catch (e) {}
    try { localStorage.setItem('sheetcmd.' + page, JSON.stringify(o)); } catch (e) {}   // 창을 링크로 열어 opener가 없으면 저장소로 전함
  }
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function popAt(x, y, w, html) {
    closePop();
    pop = document.createElement('div');
    pop.style.cssText = 'position: fixed; z-index: 1000; left: ' + Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px; bottom: ' + Math.max(8, innerHeight - y + 6) + 'px; width: ' + w + 'px; padding: 8px; box-sizing: border-box; background: #FFFFFF; border: 1px solid #E1E6E3; border-radius: 12px; box-shadow: 0 12px 32px rgba(23, 32, 28, 0.18); font-family: ' + FONT + '; max-height: 70vh; overflow: auto';
    pop.innerHTML = html; document.body.appendChild(pop); return pop;
  }
  function addMenu(x, y, Y) {
    var have = (bar.all || []).map(function (a) { return a.id; }), h = '<div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 4px 8px"><button data-y="-1" style="width: 28px; height: 28px; border-radius: 8px; border: 1px solid #DDE2DF; background: #FFFFFF; cursor: pointer">‹</button><b style="font-size: 14px">' + Y + '년</b><button data-y="1" style="width: 28px; height: 28px; border-radius: 8px; border: 1px solid #DDE2DF; background: #FFFFFF; cursor: pointer">›</button></div><div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px">';
    for (var m = 1; m <= 12; m++) { var id = Y + '-' + String(m).padStart(2, '0'), has = have.indexOf(id) >= 0; h += '<button ' + (has ? 'disabled' : 'data-add="' + id + '"') + ' style="height: 34px; border-radius: 9px; font-family: ' + FONT + '; font-size: 13px; font-weight: 600; ' + (has ? 'border: 1px solid #EEF1F0; background: #F7F9F8; color: #B5BDB8' : 'border: 1px solid #DDE2DF; background: #FFFFFF; color: #17201C; cursor: pointer') + '">' + m + '월</button>'; }
    var p = popAt(x, y, 230, h + '</div>');
    p.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.y) addMenu(x, y, Y + (+b.dataset.y)); else if (b.dataset.add) send({ act: 'add', id: b.dataset.add }); };
  }
  function listMenu(x, y) {
    var C = bar.color || '#00A6AB', all = bar.all || [];
    var h = '<div style="padding: 4px 6px 8px; font-size: 12px; font-weight: 600; color: #5E6873">' + esc(bar.label || '시트') + ' ' + all.length + ' · 최신순</div>' + all.map(function (a) {
      return '<button data-pick="' + a.id + '" style="display: flex; align-items: center; gap: 10px; width: 100%; height: 36px; padding: 0 10px; border: none; border-radius: 7px; font-family: ' + FONT + '; font-size: 13px; cursor: pointer; text-align: left; ' + (a.on ? 'background: #EEF8F8; color: #17201C; font-weight: 600' : 'background: #FFFFFF; font-weight: 500; color: ' + (a.hidden ? '#8A949E' : '#17201C')) + '"><span style="width: 7px; height: 7px; border-radius: 50%; flex: none; background: ' + C + (a.hidden ? '; opacity: 0.4' : '') + '"></span><span style="flex: 1">' + esc(a.name) + '</span>' + (a.hidden ? '<span style="font-size: 10px; font-weight: 600; color: #5E6873; background: #EEF1F0; padding: 2px 6px; border-radius: 5px">숨김</span>' : '') + '</button>';
    }).join('');
    var p = popAt(x, y, 240, h);
    p.onclick = function (e) { var b = e.target.closest('[data-pick]'); if (b) send({ act: 'pick', id: b.dataset.pick }); };
  }
  function ctxMenu(x, y, id) {
    var ids = multi.indexOf(id) >= 0 ? multi.slice() : [id], vis = (bar.tabs || []).length, dis = vis - ids.length < 1;
    closePop();
    pop = document.createElement('div');
    pop.style.cssText = 'position: fixed; z-index: 1000; left: ' + Math.min(x, innerWidth - 180) + 'px; top: ' + Math.max(8, y - 52) + 'px; width: 168px; padding: 4px; box-sizing: border-box; background: #FFFFFF; border: 1px solid #E1E6E3; border-radius: 10px; box-shadow: 0 10px 28px rgba(23, 32, 28, 0.18); font-family: ' + FONT;
    pop.innerHTML = '<button ' + (dis ? 'disabled' : '') + ' style="display: flex; align-items: center; gap: 8px; width: 100%; height: 36px; padding: 0 10px; border: none; border-radius: 7px; background: #FFFFFF; font-family: ' + FONT + '; font-size: 13px; text-align: left; cursor: ' + (dis ? 'not-allowed; color: #B7C0BC' : 'pointer; color: #17201C') + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-10-8-10-8a18 18 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.2 3.2M1 1l22 22"></path></svg>' + (ids.length > 1 ? '시트 ' + ids.length + '개 숨기기' : '시트 숨기기') + '</button>';
    document.body.appendChild(pop);
    pop.onclick = function () { if (dis) return; multi = []; send({ act: 'hide', ids: ids }); };
  }
  function draw() {
    if (!el) {
      el = document.createElement('div');
      el.style.cssText = 'position: fixed; left: 0; right: 0; bottom: 0; height: 36px; z-index: 900; display: flex; align-items: stretch; gap: 0; padding: 0 8px; background: #FFFFFF; border-top: 1px solid #DDE2DF; font-family: ' + FONT + '; overflow-x: auto';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var r = b.getBoundingClientRect();
        if (b.dataset.act === 'add') { var on = (bar.tabs || []).filter(function (t) { return t.on; })[0]; addMenu(r.left, r.top, +((on && on.id) || new Date().getFullYear()).toString().slice(0, 4)); return; }
        if (b.dataset.act === 'list') { if (pop) closePop(); else listMenu(r.left, r.top); return; }
        var id = b.dataset.tab; if (!id) return;
        if (e.shiftKey && anchor) { var ids = (bar.tabs || []).map(function (t) { return t.id; }), a = ids.indexOf(anchor), z = ids.indexOf(id); if (a >= 0 && z >= 0) { multi = ids.slice(Math.min(a, z), Math.max(a, z) + 1); draw(); return; } }
        anchor = id; multi = []; send({ act: 'pick', id: id });
      });
      el.addEventListener('contextmenu', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; e.preventDefault(); ctxMenu(e.clientX, e.clientY, b.dataset.tab); });
      document.addEventListener('mousedown', function (e) { if (pop && !pop.contains(e.target) && !el.contains(e.target)) closePop(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); if (multi.length) { multi = []; draw(); } } });
      var w = document.getElementById('wrap'); if (w) w.style.height = 'calc(100% - 78px - 36px)';
    }
    var C = bar.color || '#00A6AB', bg = bar.onBg || '#FDF1F1';
    var ib = 'width: 30px; flex: none; border: none; background: none; color: #5E6873; font-size: 16px; cursor: pointer; font-family: ' + FONT;
    el.innerHTML = '<button data-act="add" aria-label="새 달 추가" style="' + ib + '">+</button><button data-act="list" aria-label="모든 시트" style="' + ib + '; font-size: 15px">≡</button><span style="width: 1px; margin: 8px 6px; background: #E1E6E3; flex: none"></span>'
      + (bar.tabs || []).map(function (t) {
        var m = multi.indexOf(t.id) >= 0;
        return '<button data-tab="' + t.id + '" style="display: inline-flex; align-items: center; gap: 6px; flex: none; height: 34px; padding: 0 11px; border: none; border-top: 2px solid ' + (t.on ? C : 'transparent') + '; font-family: ' + FONT + '; font-size: 12px; cursor: pointer; white-space: nowrap; ' + (t.on ? 'background: ' + bg + '; color: #17201C; font-weight: 600' : 'background: transparent; color: #5E6873; font-weight: 500') + (m ? '; background: #E6F6F6; box-shadow: inset 0 0 0 1.5px #00A6AB; border-radius: 6px' : '') + '"><span style="width: 9px; height: 9px; border-radius: 50%; flex: none; background: ' + (t.dot || C) + '"></span>' + esc(t.name) + '</button>';
      }).join('');
  }
  window.SheetBar = {
    render: function (b, pg) { if (!b || !b.tabs) { if (el) { el.remove(); el = null; } return; } bar = b; page = pg; draw(); }
  };
})();
