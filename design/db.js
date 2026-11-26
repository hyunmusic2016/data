// 현실용음악학원 · Supabase 연결과 로그인
// - 이 파일에는 공개용(publishable) 키만 넣는다. 비밀(secret / service_role) 키는 절대 넣지 않는다.
// - 데이터는 로그인한 직원(staff 표에 등록된 계정)만 볼 수 있다 (Supabase 보안 규칙 RLS).
(function () {
  var URL = 'https://aooohoacxbpsmfbjhphi.supabase.co';
  var KEY = 'sb_publishable_PwAydZuvV3RLHhRcN3yL9g_JFZu5vDs';

  var lib = window.supabase;
  if (!lib || !lib.createClient) { console.warn('Supabase 도구를 불러오지 못했습니다'); return; }
  var sb = lib.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  var A = window.academy = { sb: sb, staff: null, ready: false };

  // ---------- 로그인 화면 ----------
  var css = '' +
    '#acLogin{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:#F3F5F4;font-family:inherit}' +
    '#acLogin form{width:380px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:32px 28px;display:flex;flex-direction:column;gap:14px;background:#FFFFFF;border:1px solid #E1E6E3;border-radius:24px;box-shadow:0 24px 60px rgba(23,32,28,.12)}' +
    '#acLogin .t{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:800;color:#17201C;margin-bottom:6px}' +
    '#acLogin .ic{width:36px;height:36px;border-radius:11px;background:#00A6AB;color:#fff;display:inline-flex;align-items:center;justify-content:center}' +
    '#acLogin label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#5E6873}' +
    '#acLogin input{height:46px;padding:0 14px;box-sizing:border-box;border-radius:12px;border:1px solid #D5DBD8;background:#FAFBFA;font-family:inherit;font-size:15px;color:#17201C;outline:none}' +
    '#acLogin input:focus{border-color:#00A6AB;background:#fff}' +
    '#acLogin button{height:50px;border:none;border-radius:14px;background:#00A6AB;color:#fff;font-family:inherit;font-size:16px;font-weight:600;cursor:pointer;margin-top:6px}' +
    '#acLogin button[disabled]{opacity:.6;cursor:default}' +
    '#acLogin .err{min-height:18px;font-size:13px;font-weight:600;color:#B4332B}' +
    '#acUser{position:fixed;top:10px;right:24px;z-index:900;display:flex;align-items:center;gap:8px;font-size:12px;color:#3A4450}' +
    '#acUser b{font-weight:600}#acUser button{height:26px;padding:0 10px;border-radius:8px;border:1px solid #D9DEE3;background:#fff;font-family:inherit;font-size:12px;font-weight:600;color:#5E6873;cursor:pointer}' +
    '@media print{#acLogin,#acUser{display:none!important}}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }

  function showLogin(msg) {
    var box = document.getElementById('acLogin');
    if (!box) {
      box = el('<div id="acLogin"><form autocomplete="on">' +
        '<div class="t"><span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4"></path></svg></span>현실용음악학원</div>' +
        '<label>이메일<input id="acEmail" type="email" autocomplete="username" required></label>' +
        '<label>비밀번호<input id="acPw" type="password" autocomplete="current-password" required></label>' +
        '<div class="err" id="acErr"></div>' +
        '<button type="submit" id="acGo">로그인</button></form></div>');
      document.body.appendChild(box);
      box.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = document.getElementById('acGo'), err = document.getElementById('acErr');
        btn.disabled = true; btn.textContent = '로그인 중…'; err.textContent = '';
        sb.auth.signInWithPassword({ email: document.getElementById('acEmail').value.trim(), password: document.getElementById('acPw').value })
          .then(function (r) {
            btn.disabled = false; btn.textContent = '로그인';
            if (r.error) { err.textContent = '이메일 또는 비밀번호가 맞지 않습니다.'; return; }
            check();
          });
      });
    }
    box.style.display = 'flex';
    var err = document.getElementById('acErr'); if (err) err.textContent = msg || '';
    setTimeout(function () { var i = document.getElementById('acEmail'); if (i && !i.value) i.focus(); }, 30);
  }

  function loading(on) {
    var f = document.querySelector('#acLogin form'); if (!f) return;
    f.style.display = on ? 'none' : 'flex';
    var m = document.getElementById('acLoading');
    if (!m) { m = el('<div id="acLoading" style="font-size:15px;font-weight:600;color:#5E6873">불러오는 중…</div>'); document.getElementById('acLogin').appendChild(m); }
    m.style.display = on ? 'block' : 'none';
  }
  function hideLogin() { var b = document.getElementById('acLogin'); if (b) b.style.display = 'none'; }

  function showUser(st) {
    var u = document.getElementById('acUser');
    if (!u) {
      u = el('<div id="acUser"><span id="acUserName"></span><button type="button" id="acOut">로그아웃</button></div>');
      document.body.appendChild(u);
      document.getElementById('acOut').addEventListener('click', function () { clearCache(); sb.auth.signOut().then(function () { location.reload(); }); });
    }
    document.getElementById('acUserName').innerHTML = '<b style="font-weight: 600">' + st.name + '</b> ' + (st.title || '');
  }

  // quiet: 페이지를 옮길 때처럼 저장해 둔 데이터로 이미 화면을 보여 준 경우, 가리지 않고 뒤에서 새로 불러온다
  function check(quiet) {
    return sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) { clearCache(); loading(false); showLogin(); return null; }
      return sb.from('staff').select('*').eq('id', s.user.id).maybeSingle().then(function (q) {
        if (!q.data || !q.data.active) { clearCache(); sb.auth.signOut(); loading(false); showLogin('직원 명단에 등록되지 않은 계정입니다. 원장님께 등록을 요청하세요.'); return null; }
        A.staff = q.data; A.ready = true;
        showUser(q.data);
        if (!quiet) loading(true);
        return A.load().then(function () {
          if (!quiet) { loading(false); hideLogin(); }
          rerender();
          document.dispatchEvent(new CustomEvent('academy:login', { detail: q.data }));
          return q.data;
        }, function (e) { loading(false); showLogin('데이터를 불러오지 못했습니다. 새로고침해 주세요.'); console.warn(e); });
      });
    });
  }
  function rerender() { try { if (typeof comp !== 'undefined' && comp && comp.setState) comp.setState({}); } catch (e) {} }
  function clearCache() { try { localStorage.removeItem('academy.cache'); } catch (e) {} }
  A.check = check;


  // =====================================================================
  // 데이터: Supabase 표 ↔ 화면이 쓰는 모양
  //  - 원생: students + student_terms(처음 값) → 수강생대장 원생 목록
  //  - 날짜별 변경: 수업 정보 → 'academy.lessonChanges'(출석부와 같이 씀), 수강료·현금영수증 → 수강생대장 hist
  //  - 휴원·퇴원·복귀 → 'academy.statusChanges'
  //  - 변경 기록 → activity_log
  // 화면이 localStorage에 쓰면 여기서 받아 Supabase에도 저장한다.
  // =====================================================================
  var LONG = { '월': '월요일', '화': '화요일', '수': '수요일', '목': '목요일', '금': '금요일', '토': '토요일', 'R': '변동' };
  var SHORT = { '월요일': '월', '화요일': '화', '수요일': '수', '목요일': '목', '금요일': '금', '토요일': '토', '변동': 'R' };
  var origSet = Storage.prototype.setItem;
  function rawSet(k, v) { origSet.call(localStorage, k, v); }
  function ymdToShort(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? m[1].slice(2) + '.' + m[2] + '.' + m[3] : ''; }
  function anyToYmd(v) { var m = /^(\d{2,4})[.\-](\d{1,2})[.\-](\d{1,2})$/.exec(String(v || '').trim()); if (!m) return null; var y = m[1].length === 2 ? '20' + m[1] : m[1]; return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2); }
  function msOf(t) { var n = Date.parse(t); return isNaN(n) ? 0 : n; }
  // 수업 정보(출석부 모양: days ['월'], times {'월':'15:30'}) → 수강생대장 모양
  function lessonToPatch(v) {
    v = v || {};
    var days = (v.days || []).map(function (d) { return LONG[d]; }).filter(Boolean);
    var times = {};
    Object.keys(v.times || {}).forEach(function (d) { var m = /^(\d{1,2}):(\d{2})$/.exec(v.times[d]); if (m && LONG[d]) times[LONG[d]] = ((+m[1] % 12) || 12) + ':' + m[2]; });
    var p = { day: days.length ? days.map(function (x) { return x === '변동' ? (days.length > 1 ? 'R' : '변동') : (days.length > 1 ? x[0] : x); }).join('·') : '변동', days: days.length ? days : ['변동'], extra: { times: times } };
    if (v.stick !== undefined) p.extra.stickBox = !!v.stick;
    if (v.teacher) p.teacher = v.teacher;
    if (v.part) p.part = v.part;
    return p;
  }
  function mergeRec(a, p) {
    var o = Object.assign({}, a, p);
    if (a.extra || p.extra) o.extra = Object.assign({}, a.extra, p.extra);
    if (a.flags || p.flags) o.flags = Object.assign({}, a.flags, p.flags);
    return o;
  }

  A.load = function () {
    return Promise.all([
      sb.from('students').select('*').order('reg_no'),
      // 저장한 순서(id)로: 원생마다 처음 것이 등록 때 정보, 그 뒤가 변경 (적용 날짜가 등록일보다 앞선 변경도 변경으로 읽음)
      sb.from('student_terms').select('*').order('id'),
      sb.from('status_changes').select('*').order('id'),
      sb.from('activity_log').select('*').order('at')
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      var studs = rs[0].data, terms = rs[1].data, stats = rs[2].data, logs = rs[3].data;
      var byId = {}, byName = {}, list = [], hist = {}, shared = [], log = {};
      studs.forEach(function (s) { byId[s.id] = s; byName[s.name] = s; });
      var firsts = {};
      terms.forEach(function (t) {
        var s = byId[t.student_id]; if (!s) return;
        var k = t.student_id + '|' + t.section;
        if (!firsts[k]) { firsts[k] = t; return; }
        var prev = firsts[k + '|last'] || firsts[k];
        firsts[k + '|last'] = t;
        if (t.section === 'lesson') {
          var v = Object.assign({}, t.value); var pv = v._prev; delete v._prev;
          shared.push(Object.assign({ id: 'T' + t.id, at: msOf(t.created_at), name: s.name, from: t.from_date }, v, { prev: pv || prev.value }));
        } else {
          (hist[s.reg_no] = hist[s.reg_no] || []).push({ hid: 'T' + t.id, sec: t.section, from: t.from_date, prev: prev.value, patch: t.value });
        }
      });
      studs.forEach(function (s) {
        var r = { id: s.reg_no, dbId: s.id, name: s.name, guardian: s.guardian || '', phone: s.phone || '', gphone: s.gphone || '', age: s.age_group || '', join: ymdToShort(s.join_date), leave: '', memo: '', note: s.memo || '', rest: '', status: 'act', restReason: '', leaveReason: '', backDate: '', flags: {}, extra: { birth: s.birth || '', addr: s.addr || '', gender: s.gender || '' } };
        var l = firsts[s.id + '|lesson'], fe = firsts[s.id + '|fee'], ca = firsts[s.id + '|cash'];
        if (l) r = mergeRec(r, lessonToPatch(l.value));
        if (fe) r = mergeRec(r, fe.value);
        if (ca) r = mergeRec(r, ca.value);
        var cnt = (r.extra || {}).count || 4;
        r.flags = Object.assign({}, r.flags, cnt >= 12 ? { t12: 1 } : cnt > 4 ? { t8: 1 } : {});
        if (!r.days) { r.days = ['변동']; r.day = '변동'; }
        list.push(r);
      });
      var status = stats.map(function (e) { var s = byId[e.student_id]; return s ? { id: 'S' + e.id, at: msOf(e.created_at), name: s.name, kind: e.kind, date: e.date, reason: e.reason || '', ticket: e.ticket || '' } : null; }).filter(Boolean);
      logs.forEach(function (g) { var s = byId[g.student_id]; if (!s || !g.detail) return; (log[s.reg_no] = log[s.reg_no] || []).push(Object.assign({ at: msOf(g.at) }, g.detail)); });
      A.data = { students: list, byId: byId, byName: byName, hist: hist, log: log };
      known.shared = {}; shared.forEach(function (e) { known.shared[e.id] = e; });
      known.status = {}; status.forEach(function (e) { known.status[e.id] = e; });
      rawSet('academy.lessonChanges', JSON.stringify(shared));
      rawSet('academy.statusChanges', JSON.stringify(status));
      // 학원 공통 설정 (메뉴 탭 등). 표(app_settings)가 아직 없으면 이 브라우저 설정을 그대로 쓴다
      return Promise.all([
        sb.from('app_settings').select('key,value'),
        sb.from('employees').select('*').order('seq'),
        sb.from('subjects').select('*').order('sort'),
        sb.from('attendance_cells').select('student_id,ym,cells'),
        sb.from('payments').select('*').order('id'),
        sb.from('ticket_plans').select('student_id,plan_date'),
        sb.from('cell_log').select('local_id,at,who,tab,ym,rid,name,k,a,b').order('at', { ascending: false }).limit(20000),
        sb.from('trials').select('id,data'),
        sb.from('log_notes').select('kind,ym,k1,k2,body')
      ]).then(function (qs) {
        // 출석부 변경 기록 (009 SQL). 표가 없으면 이 브라우저에만 남김
        if (!qs[6].error) {
          A.clogReady = true;
          var cl = (qs[6].data || []).slice().reverse().map(function (r) { return { id: r.local_id, at: Date.parse(r.at), who: r.who, tab: r.tab, ym: r.ym, rid: r.rid, name: r.name, k: r.k, a: r.a || '', b: r.b || '' }; });
          rawSet('academy.cellLog', JSON.stringify(cl)); known.clog = {}; cl.forEach(function (e) { known.clog[e.id] = 1; });
        }
        // 출석부 저장 (008 SQL). 출결 칸은 'academy.attCells' = { '2026-11': { 'D원생번호': 칸 내용 } }
        A.attTried = true;
        if (!qs[3].error) {
          A.attReady = true;
          var ac = {}; (qs[3].data || []).forEach(function (r) { if (byId[r.student_id]) (ac[r.ym] = ac[r.ym] || {})['D' + r.student_id] = r.cells; });
          rawSet('academy.attCells', JSON.stringify(ac)); known.att = attIdx(ac);
        }
        if (!qs[4].error && qs[4].data && (!qs[4].data.length || 'local_id' in qs[4].data[0])) {
          A.payReady = true;
          var pl = qs[4].data.map(function (r) { var s = byId[r.student_id]; if (!s) return null; return Object.assign({}, r.extra || {}, { id: r.local_id || ('P' + r.id), name: s.name, date: r.date, count: r.count, dur: r.dur, unit: r.unit, total: r.total, cls: r.cls }, r.kind === 'unpaid' ? { kind: 'unpaid' } : {}); }).filter(Boolean);
          rawSet('academy.payments', JSON.stringify(pl)); known.pay = idxList(pl);
        }
        // 체험레슨 (010 SQL): 출석부 칸('X'+id)·수납(kind 'trial')을 trials 표 한 줄에 같이 둠
        A.trialTried = true;
        if (qs[7] && !qs[7].error) {
          A.trialReady = true;
          var trL = [], acT = {}, plT = [];
          try { acT = JSON.parse(localStorage.getItem('academy.attCells') || '{}') || {}; plT = JSON.parse(localStorage.getItem('academy.payments') || '[]') || []; } catch (x) {}
          Object.keys(acT).forEach(function (ym) { Object.keys(acT[ym] || {}).forEach(function (k) { if (/^X/.test(k)) delete acT[ym][k]; }); });
          plT = plT.filter(function (p) { return !(p && p.kind === 'trial'); });
          (qs[7].data || []).forEach(function (r) { var d = r.data || {}; if (!d.info) return; trL.push(d.info);
            Object.keys(d.cells || {}).forEach(function (ym) { (acT[ym] = acT[ym] || {})['X' + d.info.id] = d.cells[ym]; });
            (d.pays || []).forEach(function (p) { plT.push(p); }); });
          rawSet('academy.trials', JSON.stringify(trL)); rawSet('academy.attCells', JSON.stringify(acT)); rawSet('academy.payments', JSON.stringify(plT));
          known.trial = trialData();
        }
        // 수업일지·업무일지 (011 SQL). 이 브라우저에만 있던 글은 처음 한 번 서버에 올림(서버에 같은 칸이 있으면 서버 글을 씀)
        A.logTried = true;
        if (qs[8] && !qs[8].error) {
          A.logReady = true;
          var srv = {}; (qs[8].data || []).forEach(function (r) { srv[[r.kind, r.ym, r.k1 || '', r.k2 || ''].join('|')] = r.body || ''; });
          var mine = logFlat(), first = !localStorage.getItem('academy.logsUp'), add = [];
          if (first) Object.keys(mine).forEach(function (k) { if (!(k in srv) && mine[k]) { srv[k] = mine[k]; add.push(k); } });
          // 출석부 MEMO를 모두가 같이 쓰게 옮김: 예전 app_settings 'attMemo'(원장님 것)와 이 브라우저에만 있던 강사 메모 중 서버에 없는 것을 한 번 올림
          if (!localStorage.getItem('academy.memoUp')) {
            var old = {}; ((qs[0] && qs[0].data) || []).forEach(function (r) { if (r.key === 'attMemo' && r.value) old = r.value; });
            Object.keys(mine).forEach(function (k) { if (/^attmemo\|/.test(k)) old[k.split('|')[2]] = old[k.split('|')[2]] || mine[k]; });
            Object.keys(old).forEach(function (t) { var k = ['attmemo', '-', t, ''].join('|'); if (!(k in srv) && typeof old[t] === 'string' && old[t]) { srv[k] = old[t]; add.push(k); } });
            rawSet('academy.memoUp', '1');
          }
          logWrite(srv); known.logs = srv;
          if (add.length) logPush(add.map(function (k) { return [k, srv[k]]; }));
          if (first) rawSet('academy.logsUp', '1');
        }
        if (!qs[5].error) {
          var tp = {}; (qs[5].data || []).forEach(function (r) { var s = byId[r.student_id]; if (s) tp[s.name] = r.plan_date; });
          rawSet('academy.ticketPlans', JSON.stringify(tp)); known.tkp = tp;
        }
        var q = qs[0];
        if (!q.error) (q.data || []).forEach(function (r) { if (r.key === 'menu') rawSet('academy.menu', JSON.stringify(r.value)); if (r.key === 'staffOrder') rawSet('academy.staffOrder', JSON.stringify(r.value)); if (r.key === 'monthClose') rawSet('academy.monthClose', JSON.stringify(r.value || {})); if (r.key === 'writeOffs') rawSet('academy.writeOffs', JSON.stringify(r.value || [])); if (r.key === 'payNotice') rawSet('academy.payNotice', JSON.stringify(r.value || {})); if (r.key === 'lessonTypes' && Array.isArray(r.value) && r.value.length) rawSet('academy.lessonTypes', JSON.stringify(r.value)); if (r.key === 'ledger' && r.value) rawSet('academy.ledger', JSON.stringify(r.value)); if (r.key === 'ledgerItems' && Array.isArray(r.value)) rawSet('academy.ledgerItems', JSON.stringify(r.value)); }); if (!q.error && !(q.data || []).some(function (r) { return r.key === 'monthClose'; })) rawSet('academy.monthClose', '{}');;
        // 직원명부·수강과목 (표가 아직 없으면 건너뜀)
        if (!qs[1].error) { var em = qs[1].data.map(empFromRow); rawSet('academy.employees', JSON.stringify(em)); known.emp = idxList(em); }
        if (!qs[2].error) {
          var sj = qs[2].data.map(function (r) { return { id: 'J' + r.id, name: r.name, bg: r.bg, fg: r.fg, sort: r.sort }; });
          if (sj.length) rawSet('academy.subjects', JSON.stringify(sj)); else localStorage.removeItem('academy.subjects');
          known.subj = idxList(sj);
        }
        // 탭을 옮기거나 새 창으로 열 때 로그인·불러오기 화면이 번쩍이지 않도록 이 브라우저에 저장 (로그아웃·로그인 만료면 지움)
        try { rawSet('academy.cache', JSON.stringify({ staff: A.staff, data: A.data })); } catch (e) {}
        document.dispatchEvent(new CustomEvent('academy:data'));
        flushLedger();
      });
    });
  };

  function sidOfName(name) { var s = A.data && A.data.byName[name]; return s ? s.id : null; }
  function sidOfReg(reg) { var r = A.data && A.data.students.find(function (x) { return x.id === reg; }); return r ? r.dbId : null; }
  function report(r, what) { if (r && r.error) { console.warn(what, r.error); toast('저장하지 못했습니다: ' + what); } return r; }
  function toast(msg) {
    var t = document.getElementById('acToast');
    if (!t) { t = el('<div id="acToast" style="position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:1001;padding:10px 16px;border-radius:12px;background:#B4332B;color:#fff;font-size:13px;font-weight:600;box-shadow:0 8px 20px rgba(0,0,0,.18)"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 4000);
  }
  A.toast = toast;
  // 수입·지출: 바뀐 달·항목만 '대기'에 모아 두고, 서버의 최신 장부를 받아 그 부분만 합쳐 저장 (다른 컴퓨터에서 고친 달을 덮어쓰지 않음)
  // 저장에 실패하면 대기를 남겨 두고 빨간 띠 + 30초마다·인터넷 다시 연결되면 다시 시도, 다시 열어도 대기를 먼저 올림
  function ledP() { try { return JSON.parse(localStorage.getItem('academy.ledgerPending') || 'null') || { ledger: {}, items: {}, order: null }; } catch (e) { return { ledger: {}, items: {}, order: null }; } }
  function ledgerWrite(k, oldStr, newStr) {
    var P = ledP(), o, n; try { o = JSON.parse(oldStr || 'null'); n = JSON.parse(newStr || 'null'); } catch (e) { return; }
    if (k === 'academy.ledger') { o = o || {}; n = n || {}; Object.keys(Object.assign({}, o, n)).forEach(function (ym) { if (JSON.stringify(o[ym]) !== JSON.stringify(n[ym])) P.ledger[ym] = n[ym] === undefined ? null : n[ym]; }); }
    else { var om = {}; (o || []).forEach(function (x) { if (x) om[x.id] = JSON.stringify(x); }); (n || []).forEach(function (x) { if (x && om[x.id] !== JSON.stringify(x)) P.items[x.id] = x; }); P.order = (n || []).map(function (x) { return x && x.id; }); }
    rawSet('academy.ledgerPending', JSON.stringify(P)); flushLedger();
  }
  var ledBusy = false, ledAgain = false, ledTimer = null;
  function ledBar(on) {
    var b = document.getElementById('acLedBar');
    if (!on) { if (b) b.remove(); return; }
    if (!b) { b = el('<div id="acLedBar" style="position:fixed;left:0;right:0;top:0;z-index:1002;padding:8px 16px;background:#B4332B;color:#fff;font-size:13px;font-weight:600;text-align:center">수입·지출이 아직 서버에 저장되지 않았습니다 · 인터넷 연결을 확인해 주세요 (자동으로 다시 시도 중, 이 창을 닫지 마세요)</div>'); document.body.appendChild(b); }
  }
  function flushLedger() {
    if (!A.staff || A.staff.role !== 'owner') return;
    var P = ledP(); if (!Object.keys(P.ledger).length && !Object.keys(P.items).length && !P.order) { ledBar(false); return; }
    if (ledBusy) { ledAgain = true; return; } ledBusy = true;
    var fail = function () { ledBusy = false; ledBar(true); clearTimeout(ledTimer); ledTimer = setTimeout(flushLedger, 30000); if (ledAgain) { ledAgain = false; flushLedger(); } };
    sb.from('app_settings').select('key,value').in('key', ['ledger', 'ledgerItems']).then(function (q) {
      if (q.error) return fail();
      var L = {}, I = []; (q.data || []).forEach(function (r) { if (r.key === 'ledger' && r.value) L = r.value; if (r.key === 'ledgerItems' && Array.isArray(r.value)) I = r.value; });
      Object.keys(P.ledger).forEach(function (ym) { if (P.ledger[ym] === null) delete L[ym]; else L[ym] = P.ledger[ym]; });
      Object.keys(P.items).forEach(function (id) { var i = I.findIndex(function (x) { return x && x.id === id; }); if (i >= 0) I[i] = P.items[id]; else I.push(P.items[id]); });
      if (P.order) { var pos = {}; P.order.forEach(function (id, i) { pos[id] = i; }); I = I.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { var pa = a.x && a.x.id in pos ? pos[a.x.id] : 1e6 + a.i, pb = b.x && b.x.id in pos ? pos[b.x.id] : 1e6 + b.i; return pa - pb; }).map(function (o) { return o.x; }); }
      var now = new Date().toISOString();
      Promise.all([sb.from('app_settings').upsert({ key: 'ledger', value: L, updated_by: A.staff.id, updated_at: now }), sb.from('app_settings').upsert({ key: 'ledgerItems', value: I, updated_by: A.staff.id, updated_at: now })]).then(function (rs) {
        if (rs[0].error || rs[1].error) return fail();
        // 기다리는 동안 새로 바뀐 것은 대기에 그대로 둠 (올린 것만 지움)
        var P2 = ledP(); Object.keys(P.ledger).forEach(function (ym) { if (JSON.stringify(P2.ledger[ym]) === JSON.stringify(P.ledger[ym])) delete P2.ledger[ym]; });
        Object.keys(P.items).forEach(function (id) { if (JSON.stringify(P2.items[id]) === JSON.stringify(P.items[id])) delete P2.items[id]; });
        if (JSON.stringify(P2.order) === JSON.stringify(P.order)) P2.order = null;
        var left = Object.keys(P2.ledger).length || Object.keys(P2.items).length || P2.order;
        if (left) rawSet('academy.ledgerPending', JSON.stringify(P2)); else localStorage.removeItem('academy.ledgerPending');
        if (!left) { rawSet('academy.ledger', JSON.stringify(L)); rawSet('academy.ledgerItems', JSON.stringify(I)); document.dispatchEvent(new CustomEvent('academy:data')); }
        ledBusy = false; ledBar(false); clearTimeout(ledTimer);
        if (ledAgain || left) { ledAgain = false; flushLedger(); }
      }, fail);
    }, fail);
  }
  A.flushLedger = flushLedger;
  window.addEventListener('online', function () { flushLedger(); });
  window.addEventListener('beforeunload', function (e) { var P = ledP(); if (Object.keys(P.ledger).length || Object.keys(P.items).length || P.order) { e.preventDefault(); e.returnValue = ''; } });
  var known = { shared: {}, status: {} }, idMap = {};
  function dbIdOf(localId) { if (/^T\d+$/.test(localId) || /^S\d+$/.test(localId)) return Promise.resolve(+localId.slice(1)); return idMap[localId] || Promise.resolve(null); }

  // 화면이 localStorage에 쓰는 기록을 받아 Supabase에 저장
  // 변경 기록(출석부 '변경 기록' 칸)에 수업·상태 변경도 한 줄씩 남긴다. k = 'EV', b = 설명
  function evTeacher(name) { var r = A.data && (A.data.students || []).find(function (x) { return x.name === name; }); return (r && r.teacher) || ''; }
  function addEv(name, text, date) {
    var L = []; try { L = JSON.parse(localStorage.getItem('academy.cellLog') || '[]') || []; } catch (e) {}
    var now = Date.now(), d = /^\d{4}-\d{2}/.test(date || '') ? date : new Date().toISOString().slice(0, 10);
    L.push({ id: 'E' + now + '-' + Math.random().toString(36).slice(2, 6), at: now, who: (A.staff && A.staff.name) || '', tab: evTeacher(name), ym: d.slice(0, 7), rid: '', name: name, k: 'EV', a: '', b: text });
    localStorage.setItem('academy.cellLog', JSON.stringify(L.slice(-20000)));
  }
  A.addEv = addEv;
  function md(d) { var m = /^\d{4}-(\d{2})-(\d{2})/.exec(d || ''); return m ? (+m[1]) + '/' + (+m[2]) : (d || ''); }
  function h12(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? ((+m[1] % 12) || 12) + ':' + m[2] : ''; }
  function dayTxt(days, times) { return (days || []).map(function (g) { var h = h12((times || {})[g]); return g + (h ? ' ' + h : ''); }).join(', '); }
  function evDiff(k, oldV, newV) {
    var a = [], b = []; try { a = JSON.parse(oldV || '[]') || []; } catch (e) {} try { b = JSON.parse(newV || '[]') || []; } catch (e) {}
    var byId = {}; a.forEach(function (e) { if (e && e.id) byId[e.id] = e; });
    var KN = { rest: '휴원', out: '퇴원', back: '복귀' };
    b.forEach(function (e) {
      if (!e || !e.id) return; var o = byId[e.id]; delete byId[e.id];
      if (k === 'academy.lessonChanges') {
        if (o && JSON.stringify(o) === JSON.stringify(e)) return;
        var pv = e.prev || {}, txt = [];
        if (e.days) txt.push('수업 ' + (pv.days ? dayTxt(pv.days, pv.times) + ' → ' : '') + dayTxt(e.days, e.times));
        if (pv.stick !== undefined && e.stick !== undefined && !!pv.stick !== !!e.stick) txt.push('드럼스틱 보관 ' + (e.stick ? '함' : '안 함'));
        addEv(e.name, (o ? '수업 변경 고침' : '수업 변경') + ' (' + md(e.from) + '부터) ' + (txt.join(' · ') || ''), e.from);
      } else {
        var lb = e.kind === 'back' && e.ticket ? (KN.back) : (KN[e.kind] || e.kind);
        if (!o) addEv(e.name, lb + ' 처리 (' + md(e.date) + ')' + (e.reason ? ' · 사유: ' + e.reason : ''), e.date);
        else if (o.date !== e.date) addEv(e.name, lb + ' 날짜 고침 ' + md(o.date) + ' → ' + md(e.date), e.date);
      }
    });
    Object.keys(byId).forEach(function (id) { var o = byId[id]; addEv(o.name, (k === 'academy.lessonChanges' ? '수업 변경 취소 (' + md(o.from) + '부터)' : (KN[o.kind] || o.kind) + ' 기록 지움 (' + md(o.date) + ')'), o.from || o.date); });
  }
  Storage.prototype.setItem = function (k, v) {
    var evOld = (this === window.localStorage && A.data && (k === 'academy.lessonChanges' || k === 'academy.statusChanges')) ? this.getItem(k) : null;
    var ledOld = (this === window.localStorage && (k === 'academy.ledger' || k === 'academy.ledgerItems')) ? this.getItem(k) : null;
    origSet.call(this, k, v);
    if (this === window.localStorage && /^academy\./.test(k)) A.lastWrite = Date.now();
    if (evOld !== null) { try { evDiff(k, evOld, v); } catch (e) {} }
    if (this !== window.localStorage || !A.data) return;
    try {
      if (k === 'academy.lessonChanges') syncList(JSON.parse(v || '[]'), 'shared', saveLesson, 'student_terms');
      else if (k === 'academy.statusChanges') syncList(JSON.parse(v || '[]'), 'status', saveStatus, 'status_changes');
      else if (k === 'academy.employees') syncRows(JSON.parse(v || '[]'), 'emp', 'employees', 'E', empToRow, k);
      else if (k === 'academy.subjects') syncRows(JSON.parse(v || '[]'), 'subj', 'subjects', 'J', function (e, i) { return { name: e.name, bg: e.bg || null, fg: e.fg || null, sort: i + 1 }; }, k);
      else if (k === 'academy.menu') {
        if (!A.staff || A.staff.role !== 'owner') { toast('메뉴 탭은 원장님만 바꿀 수 있습니다'); return; }
        sb.from('app_settings').upsert({ key: 'menu', value: JSON.parse(v || 'null'), updated_by: A.staff.id, updated_at: new Date().toISOString() }).then(function (r) { report(r, '메뉴 탭 설정'); });
      }
      else if (k === 'academy.attCells') syncAtt(JSON.parse(v || '{}'));
      else if (k === 'academy.cellLog') syncClog(JSON.parse(v || '[]'));
      else if (k === 'academy.payments') syncPays(JSON.parse(v || '[]'));
      if (k === 'academy.trials' || k === 'academy.attCells' || k === 'academy.payments') syncTrials();
      else if (k === 'academy.ticketPlans') syncPlans(JSON.parse(v || '{}'));
      else if (k === 'academy.classLog' || k === 'academy.workLog' || k === 'academy.workMemo' || k === 'academy.attMemo') syncLogs();
      else if (k === 'academy.ledger' || k === 'academy.ledgerItems') {
        if (!A.staff || A.staff.role !== 'owner') { toast('수입·지출은 원장님만 바꿀 수 있습니다'); return; }
        ledgerWrite(k, ledOld, v);
      }
      else if (k === 'academy.lessonTypes') {
        if (!A.staff || A.staff.role !== 'owner') { toast('레슨 유형은 원장님만 바꿀 수 있습니다'); return; }
        sb.from('app_settings').upsert({ key: 'lessonTypes', value: JSON.parse(v || '[]'), updated_by: A.staff.id, updated_at: new Date().toISOString() }).then(function (r) { report(r, '레슨 유형'); });
      }
      else if (k === 'academy.payNotice') {
        // 수납 안내 발송 기록 (원장님만)
        if (A.staff && A.staff.role === 'owner') sb.from('app_settings').upsert({ key: 'payNotice', value: JSON.parse(v || '{}'), updated_by: A.staff.id, updated_at: new Date().toISOString() }).then(function (r) { report(r, '수납 안내 발송 기록'); });
      }
      else if (k === 'academy.writeOffs') {
        if (!A.staff || A.staff.role !== 'owner') { toast('미납 정리는 원장님만 할 수 있습니다'); return; }
        sb.from('app_settings').upsert({ key: 'writeOffs', value: JSON.parse(v || '[]'), updated_by: A.staff.id, updated_at: new Date().toISOString() }).then(function (r) { report(r, '미납 정리'); });
      }
      else if (k === 'academy.monthClose') {
        if (!A.staff || A.staff.role !== 'owner') { toast('출석부 마감은 원장님만 할 수 있습니다'); return; }
        sb.from('app_settings').upsert({ key: 'monthClose', value: JSON.parse(v || '{}'), updated_by: A.staff.id, updated_at: new Date().toISOString() }).then(function (r) { report(r, '출석부 마감'); });
      }
      else if (k === 'academy.staffOrder') {
        if (!A.staff || A.staff.role !== 'owner') { toast('직원 순서는 원장님만 바꿀 수 있습니다'); return; }
        sb.from('app_settings').upsert({ key: 'staffOrder', value: JSON.parse(v || 'null'), updated_by: A.staff.id, updated_at: new Date().toISOString() }).then(function (r) { report(r, '직원 순서'); });
      }
    } catch (e) { console.warn(e); }
  };
  function syncList(list, kind, saveFn, table) {
    var prev = known[kind], now = {};
    list.forEach(function (e) { now[e.id] = e; if (!prev[e.id]) saveFn(e); });
    Object.keys(prev).forEach(function (id) { if (!now[id]) dbIdOf(id).then(function (n) { if (n) sb.from(table).delete().eq('id', n).then(function (r) { report(r, '삭제'); }); }); });
    known[kind] = now;
  }
  // ---------- 출석부 저장 (008 SQL) ----------
  function attIdx(ac) { var o = {}; Object.keys(ac || {}).forEach(function (ym) { Object.keys(ac[ym] || {}).forEach(function (k) { if (/^D\d+$/.test(k)) o[ym + '|' + k] = JSON.stringify(ac[ym][k]); }); }); return o; }
  function syncAtt(ac) {
    if (!A.attReady) { if (A.attTried) toast('출석부를 저장하려면 Supabase에서 008 SQL을 먼저 실행해 주세요'); return; }
    var prev = known.att || {}, now = attIdx(ac), up = [], patches = [];
    Object.keys(now).forEach(function (k) {
      if (prev[k] === now[k]) return;
      var p = k.split('|'), cells = JSON.parse(now[k]), old = prev[k] ? JSON.parse(prev[k]) : {}, set = {}, del = [];
      Object.keys(cells).forEach(function (c) { if (JSON.stringify(cells[c]) !== JSON.stringify(old[c])) set[c] = cells[c]; });
      Object.keys(old).forEach(function (c) { if (!(c in cells)) del.push(c); });
      patches.push({ p_student: +p[1].slice(1), p_ym: p[0], p_set: set, p_del: del, full: cells });
    });
    Object.keys(prev).forEach(function (k) { if (!(k in now)) { var p = k.split('|'); patches.push({ p_student: +p[1].slice(1), p_ym: p[0], p_set: {}, p_del: Object.keys(JSON.parse(prev[k])), full: {} }); } });
    // 바뀐 칸만 서버에서 합침(012 SQL, att_patch) → 다른 사람이 같은 원생·달의 다른 칸을 동시에 고쳐도 안 덮음
    function oldWay(x) {
      if (!Object.keys(x.full).length) return sb.from('attendance_cells').delete().eq('student_id', x.p_student).eq('ym', x.p_ym).then(function (r) { report(r, '출석부 저장'); });
      sb.from('attendance_cells').upsert({ student_id: x.p_student, ym: x.p_ym, cells: x.full, updated_by: A.staff.id, updated_at: new Date().toISOString() }, { onConflict: 'student_id,ym' }).then(function (r) { report(r, '출석부 저장'); });
    }
    patches.forEach(function (x) {
      if (A.attPatch === false) return oldWay(x);
      sb.rpc('att_patch', { p_student: x.p_student, p_ym: x.p_ym, p_set: x.p_set, p_del: x.p_del }).then(function (r) {
        if (r && r.error && (r.error.code === 'PGRST202' || /att_patch/.test(r.error.message || ''))) { A.attPatch = false; console.warn('012 SQL 없음 → 예전 방식', r.error); toast('Supabase에서 012 SQL을 실행하면 동시 입력이 더 안전해집니다'); return oldWay(x); }
        report(r, '출석부 저장');
      });
    });
    known.att = now;
  }
  function trialData() {
    var L = [], ac = {}, pl = [], out = {};
    try { L = JSON.parse(localStorage.getItem('academy.trials') || '[]') || []; ac = JSON.parse(localStorage.getItem('academy.attCells') || '{}') || {}; pl = JSON.parse(localStorage.getItem('academy.payments') || '[]') || []; } catch (e) {}
    L.forEach(function (t) { if (!t || !t.id) return; var cells = {};
      Object.keys(ac).forEach(function (ym) { var c = (ac[ym] || {})['X' + t.id]; if (c && Object.keys(c).length) cells[ym] = c; });
      out[String(t.id)] = JSON.stringify({ info: t, cells: cells, pays: pl.filter(function (p) { return p && p.trial === t.id; }) }); });
    return out;
  }
  // 수업일지·업무일지 ↔ log_notes: 'kind|ym|k1|k2' → 글
  function logFlat() {
    var o = {}, rd = function (k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
    var C = rd('academy.classLog'), W = rd('academy.workLog'), M = rd('academy.workMemo');
    Object.keys(C).forEach(function (ym) { Object.keys(C[ym] || {}).forEach(function (k1) { var d = ((C[ym] || {})[k1] || {}).d || {}; Object.keys(d).forEach(function (k2) { if (d[k2]) o[['class', ym, k1, k2].join('|')] = String(d[k2]); }); }); });
    Object.keys(W).forEach(function (ym) { var v = W[ym];
      if (Array.isArray(v)) { var t = {}; v.forEach(function (x) { if (x && x.d && x.text) t[x.d] = (t[x.d] ? t[x.d] + '\n' : '') + x.text; }); v = t; }
      Object.keys(v || {}).forEach(function (k2) { if (v[k2]) o[['work', ym, '', k2].join('|')] = String(v[k2]); }); });
    Object.keys(M).forEach(function (ym) { if (typeof M[ym] === 'string' && M[ym]) o[['workmemo', ym, '', ''].join('|')] = M[ym]; });
    // 출석부 MEMO (강사마다 하나, 달과 상관없음): kind 'attmemo', ym '-', k1 = 강사 이름
    var T = rd('academy.attMemo'); Object.keys(T).forEach(function (t) { if (typeof T[t] === 'string' && T[t]) o[['attmemo', '-', t, ''].join('|')] = T[t]; });
    return o;
  }
  function logWrite(flat) {
    var C = {}, W = {}, M = {}, T = {};
    Object.keys(flat).forEach(function (k) { var p = k.split('|'), v = flat[k]; if (!v) return;
      if (p[0] === 'class') { var a = (C[p[1]] = C[p[1]] || {}), b = (a[p[2]] = a[p[2]] || { d: {} }); b.d[p[3]] = v; }
      else if (p[0] === 'work') (W[p[1]] = W[p[1]] || {})[p[3]] = v;
      else if (p[0] === 'workmemo') M[p[1]] = v;
      else if (p[0] === 'attmemo') T[p[2]] = v; });
    rawSet('academy.attMemo', JSON.stringify(T));
    rawSet('academy.classLog', JSON.stringify(C)); rawSet('academy.workLog', JSON.stringify(W)); rawSet('academy.workMemo', JSON.stringify(M));
  }
  function logPush(pairs) {
    var up = [], now = new Date().toISOString();
    pairs.forEach(function (x) { var p = x[0].split('|');
      if (x[1]) up.push({ kind: p[0], ym: p[1], k1: p[2], k2: p[3], body: x[1], updated_by: A.staff.id, updated_at: now });
      else sb.from('log_notes').delete().eq('kind', p[0]).eq('ym', p[1]).eq('k1', p[2]).eq('k2', p[3]).then(function (r) { report(r, '일지 저장'); }); });
    if (up.length) sb.from('log_notes').upsert(up, { onConflict: 'kind,ym,k1,k2' }).then(function (r) { report(r, '일지 저장'); });
  }
  function syncLogs() {
    if (!A.logReady) { if (A.logTried) toast('수업일지·업무일지를 서버에 저장하려면 Supabase에서 011 SQL을 먼저 실행해 주세요'); return; }
    var now = logFlat(), prev = known.logs || {}, ch = [];
    Object.keys(now).forEach(function (k) { if (prev[k] !== now[k]) ch.push([k, now[k]]); });
    Object.keys(prev).forEach(function (k) { if (!(k in now)) ch.push([k, '']); });
    known.logs = now; if (ch.length) logPush(ch);
  }
  function syncTrials() {
    var now = trialData(), prev = known.trial || {};
    if (!A.trialReady) { if (A.trialTried && Object.keys(now).length) toast('체험레슨을 저장하려면 Supabase에서 010 SQL을 먼저 실행해 주세요'); return; }
    var up = [];
    Object.keys(now).forEach(function (id) { if (prev[id] !== now[id]) up.push({ id: id, data: JSON.parse(now[id]), updated_by: A.staff.id, updated_at: new Date().toISOString() }); });
    Object.keys(prev).forEach(function (id) { if (!(id in now)) sb.from('trials').delete().eq('id', id).then(function (r) { report(r, '체험레슨 삭제'); }); });
    if (up.length) sb.from('trials').upsert(up).then(function (r) { report(r, '체험레슨 저장'); });
    known.trial = now;
  }
  function syncPays(list) {
    if (!A.payReady) { if (A.attTried) toast('수납을 저장하려면 Supabase에서 008 SQL을 먼저 실행해 주세요'); return; }
    var prev = known.pay || {}, now = {}, up = [];
    (list || []).forEach(function (e) {
      if (!e || !e.id) return;
      if (e.kind === 'trial') return;
      var sid = sidOfName(e.name); if (!sid) return;
      var js = JSON.stringify(e); now[e.id] = js; if (prev[e.id] === js) return;
      up.push({ local_id: e.id, student_id: sid, date: e.date, kind: e.kind === 'unpaid' ? 'unpaid' : 'normal', count: +e.count || 0, dur: +e.dur || null, unit: +e.unit || null, total: +e.total || 0, cls: e.cls === 'pro' ? 'pro' : 'hobby', extra: e, created_by: A.staff.id, updated_at: new Date().toISOString() });
    });
    Object.keys(prev).forEach(function (id) { if (!(id in now)) sb.from('payments').delete().eq('local_id', id).then(function (r) { report(r, '수납 취소'); }); });
    if (up.length) sb.from('payments').upsert(up, { onConflict: 'local_id' }).then(function (r) { report(r, '수납 저장'); });
    known.pay = now;
  }
  function syncClog(list) {
    if (!A.clogReady) return;
    var seen = known.clog = known.clog || {}, up = [];
    (list || []).forEach(function (e) { if (!e || !e.id || seen[e.id]) return; seen[e.id] = 1; up.push({ local_id: e.id, at: new Date(e.at).toISOString(), who: e.who, tab: e.tab, ym: e.ym, rid: String(e.rid), name: e.name, k: e.k, a: e.a, b: e.b }); });
    if (up.length) sb.from('cell_log').insert(up).then(function (r) { if (r && r.error) { console.warn('변경 기록', r.error); toast('변경 기록 저장 안 됨: ' + (r.error.message || r.error.code || '')); } });
  }
  function syncPlans(all) {
    var prev = known.tkp || {}, now = {};
    Object.keys(all || {}).forEach(function (nm) {
      var sid = sidOfName(nm); if (!sid) return; now[nm] = all[nm];
      if (prev[nm] !== all[nm]) sb.from('ticket_plans').upsert({ student_id: sid, plan_date: all[nm], updated_by: A.staff.id, updated_at: new Date().toISOString() }, { onConflict: 'student_id' }).then(function (r) { report(r, '레슨시작일 예정'); });
    });
    Object.keys(prev).forEach(function (nm) { if (!(nm in now)) { var sid = sidOfName(nm); if (sid) sb.from('ticket_plans').delete().eq('student_id', sid).then(function (r) { report(r, '레슨시작일 예정'); }); } });
    known.tkp = now;
  }
  // 직원명부·수강과목: 새 줄은 insert(번호를 받아 id를 바꿔 둠), 바뀐 줄은 update, 빠진 줄은 delete
  function idxList(list) { var o = {}; (list || []).forEach(function (e) { o[e.id] = JSON.stringify(e); }); return o; }
  // 관리자 권한(admin)은 화면에서 바꾸지 않고 Supabase에서 직접 켠다. 불러온 값을 그대로 다시 보내 지워지지 않게 함 (006 SQL 전에는 칸이 없어 보내지 않음)
  var hasAdminCol = false;
  var hasColorCol = false;  // 강사 이름 색(color)은 007 SQL을 실행해야 생긴다
  function empFromRow(r) { if (r && 'admin' in r) hasAdminCol = true; if (r && 'color' in r) hasColorCol = true; return { id: 'E' + r.id, seq: r.seq, role: r.role, titles: r.titles && r.titles.length ? r.titles : [r.role], name: r.name, phone: r.phone || '', addr: r.addr || '', duty: r.duty || '', email: r.email || '', subjects: r.subjects || [], tab: r.tab !== false, hire: r.hire_date || '', leave: r.leave_date || '', leaveReason: r.leave_reason || '', memo: r.memo || '', admin: !!r.admin, color: r.color || '', linked: !!r.user_id }; }
  function empToRow(e) { var o = { seq: e.seq, role: e.role, titles: e.titles || [e.role], name: e.name, phone: e.phone || null, addr: e.addr || null, duty: e.duty || null, email: e.email || null, subjects: e.subjects || [], tab: e.tab !== false, hire_date: e.hire || null, leave_date: e.leave || null, leave_reason: e.leaveReason || null, memo: e.memo || null }; if (hasAdminCol) o.admin = !!e.admin; if (hasColorCol) o.color = e.color || null; else if (e.color) toast('강사 이름 색을 저장하려면 Supabase에서 007 SQL을 먼저 실행해 주세요'); return o; }
  var pending = {};
  function syncRows(list, kind, table, P, toRow, key) {
    if (!A.staff || A.staff.role !== 'owner') { toast('원장님만 바꿀 수 있습니다'); return; }
    var prev = known[kind] || {}, now = {}, re = new RegExp('^' + P + '\\d+$');
    list.forEach(function (e, i) {
      now[e.id] = JSON.stringify(e);
      if (!re.test(e.id)) {
        if (pending[e.id]) return; pending[e.id] = 1;
        sb.from(table).insert(toRow(e, i)).select('id').single().then(function (r) {
          delete pending[e.id]; report(r, '저장'); if (!r.data) return;
          var nid = P + r.data.id, cur = [];
          try { cur = JSON.parse(localStorage.getItem(key) || '[]'); } catch (x) {}
          cur.forEach(function (x) { if (x.id === e.id) x.id = nid; });
          rawSet(key, JSON.stringify(cur)); known[kind] = idxList(cur);
          if (A.onIds) A.onIds(e.id, nid);
        });
      } else if (prev[e.id] !== now[e.id]) {
        sb.from(table).update(toRow(e, i)).eq('id', +e.id.slice(P.length)).then(function (r) { report(r, '저장'); });
      }
    });
    Object.keys(prev).forEach(function (id) { if (!now[id] && re.test(id)) sb.from(table).delete().eq('id', +id.slice(P.length)).then(function (r) { report(r, '삭제'); }); });
    known[kind] = now;
  }
  // 직원 ↔ 로그인 계정 연결 (계정은 Supabase 대시보드에서 먼저 만듦)
  A.linkAccount = function (empId, mail) {
    var n = +String(empId).replace(/^E/, '');
    if (!n) return Promise.resolve('no_employee');
    return sb.rpc('link_employee_account', { emp: n, mail: mail }).then(function (r) { if (r.error) { report(r, '계정 연결'); return 'error'; } return r.data; });
  };
  function saveLesson(e) {
    var sid = sidOfName(e.name); if (!sid) return;
    var v = {}; ['days', 'times', 'stick', 'teacher', 'part'].forEach(function (k) { if (e[k] !== undefined) v[k] = e[k]; });
    if (e.prev) v._prev = e.prev;
    idMap[e.id] = sb.from('student_terms').insert({ student_id: sid, section: 'lesson', from_date: e.from, value: v, created_by: A.staff.id }).select('id').single()
      .then(function (r) { report(r, '수업 정보 변경'); return r.data ? r.data.id : null; });
  }
  function saveStatus(e) {
    var sid = sidOfName(e.name); if (!sid) return;
    // 저장이 끝나기 전에 다른 페이지로 가면 기록이 끊기므로, 끝날 때까지 이동을 기다리게 한다 (A.busy)
    A.busy++;
    var done = function () { A.busy = Math.max(0, A.busy - 1); };
    var p1 = idMap[e.id] = sb.from('status_changes').insert({ student_id: sid, kind: e.kind, date: e.date, reason: e.reason || null, ticket: e.ticket || null, created_by: A.staff.id }).select('id').single()
      .then(function (r) { report(r, '휴원·퇴원 처리'); return r.data ? r.data.id : null; });
    var p2 = sb.from('students').update({ status: e.kind === 'back' ? 'act' : e.kind }).eq('id', sid).then(function (r) { report(r, '원생 상태'); if (A.data && A.data.byId && A.data.byId[sid]) A.data.byId[sid].status = e.kind === 'back' ? 'act' : e.kind; });
    Promise.all([p1, p2]).then(function () { try { rawSet('academy.cache', JSON.stringify({ staff: A.staff, data: A.data })); } catch (x) {} done(); }, done);
  }

  // ---------- 수강생대장에서 부르는 저장 ----------
  function studentRow(rec) {
    var ex = rec.extra || {};
    return { reg_no: rec.id, name: rec.name, guardian: rec.guardian || null, phone: rec.phone || null, gphone: rec.gphone || null, birth: anyToYmd(ex.birth), gender: ex.gender || null, age_group: rec.age || null, addr: ex.addr || null, memo: rec.note || null, join_date: anyToYmd(rec.join) };
  }
  function termsOf(rec) {
    var ex = rec.extra || {}, fl = rec.flags || {};
    var times = {};
    Object.keys(ex.times || {}).forEach(function (d) { var m = /^(\d{1,2}):(\d{2})$/.exec(ex.times[d]); if (m && SHORT[d]) { var h = +m[1]; times[SHORT[d]] = ('0' + (h < 12 ? h + 12 : h)).slice(-2) + ':' + m[2]; } });
    return {
      lesson: { days: (rec.days || []).map(function (d) { return SHORT[d]; }).filter(Boolean), times: times, stick: !!ex.stickBox, teacher: rec.teacher || '', part: rec.part || '' },
      fee: { flags: { pro: fl.pro ? 1 : 0 }, extra: { count: ex.count, dur: ex.dur, unit: ex.unit, pay: ex.pay, total: ex.total } },
      cash: { flags: { cash: fl.cash ? 1 : 0 }, extra: { cashType: ex.cashType || 'person', cashNo: ex.cashNo || '' } }
    };
  }
  // 새 원생: 화면 목록에 바로 넣고 Supabase에 저장
  A.busy = 0;
  // 저장이 끝나기 전에 다른 페이지로 넘어가면 새 페이지가 덜 저장된 데이터를 불러온다 → 저장이 끝난 뒤 넘어간다
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || !A.busy || !/\.html(#.*)?$/.test(a.getAttribute('href') || '')) return;
    e.preventDefault(); toast('저장하는 중이에요. 끝나면 넘어갑니다');
    var go = a.href, t = setInterval(function () { if (!A.busy) { clearInterval(t); location.href = go; } }, 150);
  }, true);
  // 다른 탭(창)에서 데이터를 새로 불러오면 이 탭도 바로 바꾼다 (원생 등록·삭제 등)
  window.addEventListener('storage', function (e) {
    if (e.key !== 'academy.cache' || !e.newValue || !A.data) return;
    try { var c = JSON.parse(e.newValue); if (c && c.data) { A.data = c.data; document.dispatchEvent(new CustomEvent('academy:data')); rerender(); } } catch (x) {}
  });
  A.addStudent = function (rec) {
    try { addEv(rec.name, '신규 등록 (' + md(anyToYmd(rec.join) || '') + ') · ' + (rec.teacher || '') + ' ' + dayTxt(rec.days || [], (rec.extra || {}).times), anyToYmd(rec.join)); } catch (e) {}
    var raw = Object.assign({}, rec, { dbId: null });
    A.data.students.push(raw);
    A.busy++;
    var end = function (v) { A.busy = Math.max(0, A.busy - 1); return v; };
    return sb.from('students').insert(studentRow(rec)).select('*').single().then(function (r) {
      report(r, '원생 등록'); if (!r.data) return null;
      raw.dbId = r.data.id; A.data.byId[r.data.id] = r.data; A.data.byName[r.data.name] = r.data;
      var from = anyToYmd(rec.join) || new Date().toISOString().slice(0, 10), T = termsOf(rec);
      return sb.from('student_terms').insert(['lesson', 'fee', 'cash'].map(function (k) { return { student_id: r.data.id, section: k, from_date: from, value: T[k], created_by: A.staff.id }; }))
        .then(function (q) { report(q, '원생 등록(수업·수강료)'); return Promise.resolve(A.load()).then(function () { return r.data.id; }, function () { return r.data.id; }); });
    }).then(end, function (e) { end(); throw e; });
  };
  // 원생 정보 수정: 기본 정보는 바로, 수강료·현금영수증 날짜별 변경은 student_terms에 (수업 정보는 lessonChanges로 따로 저장됨)
  A.saveEdit = function (reg, basic, newHist, dropHids) {
    var sid = sidOfReg(reg); if (!sid) return;
    var raw = A.data.students.find(function (x) { return x.id === reg; });
    try { var SN = { lesson: '수업 정보', fee: '수강료·반', cash: '현금영수증' }; addEv((basic && basic.name) || (raw && raw.name) || '', '원생 정보 수정' + ((newHist || []).length ? ' · ' + newHist.map(function (h) { return (SN[h.sec] || h.sec) + ' 변경 (' + md(h.from) + '부터)'; }).join(', ') : '') + ((dropHids || []).length ? ' · 예정 변경 취소' : ''), (newHist && newHist[0] && newHist[0].from) || ''); } catch (e) {}
    if (raw) { var keep = Object.assign({}, raw.extra); Object.assign(raw, mergeRec(raw, basic)); raw.extra = Object.assign(keep, (basic || {}).extra); }
    var row = studentRow(Object.assign({}, raw || {}, basic, { id: reg, extra: Object.assign({}, (raw || {}).extra, (basic || {}).extra) }));
    delete row.reg_no;
    sb.from('students').update(row).eq('id', sid).then(function (r) { report(r, '원생 정보 수정'); if (r && !r.error && A.data.byId[sid]) { var nm0 = A.data.byId[sid].name; if (nm0 !== row.name) { delete A.data.byName[nm0]; A.data.byId[sid].name = row.name; A.data.byName[row.name] = A.data.byId[sid]; } } });
    (dropHids || []).forEach(function (h) { A.deleteTerm(h); });
    // 날짜별 변경(반·수강료 등)은 저장되는 대로 이 브라우저의 데이터·캐시에도 넣어 출석부가 새로고침 없이 바로 쓰게 한다
    var HS = A.data.hist = A.data.hist || {}, L = HS[reg] = (HS[reg] || []).filter(function (h) { return (dropHids || []).indexOf(h.hid) < 0; });
    A.busy++;
    var ps = (newHist || []).map(function (h) {
      return (idMap[h.hid] = sb.from('student_terms').insert({ student_id: sid, section: h.sec, from_date: h.from, value: h.patch, created_by: A.staff.id }).select('id').single()
        .then(function (r) { report(r, '날짜별 변경'); if (r.data) L.push({ hid: 'T' + r.data.id, sec: h.sec, from: h.from, prev: h.prev, patch: h.patch }); return r.data ? r.data.id : null; }));
    });
    Promise.all(ps).then(function () {
      try { rawSet('academy.cache', JSON.stringify({ staff: A.staff, data: A.data })); } catch (e) {}
      A.busy = Math.max(0, A.busy - 1); rerender();
    }, function () { A.busy = Math.max(0, A.busy - 1); });
  };
  // 휴원·퇴원 날짜 고치기
  A.updateStatusDate = function (localId, date) { dbIdOf(localId).then(function (n) { if (n) sb.from('status_changes').update({ date: date }).eq('id', n).then(function (r) { report(r, '휴원·퇴원 날짜 고치기'); }); }); };
  A.deleteTerm = function (hid) { dbIdOf(hid).then(function (n) { if (n) sb.from('student_terms').delete().eq('id', n).then(function (r) { report(r, '예정 취소'); }); }); };
  // 원생 삭제: 수업 정보·휴원/퇴원·출결·수납·수강권 계획은 표 연결(on delete cascade)로 같이 지워진다. 변경 기록도 지운 뒤 전체를 다시 불러온다
  A.deleteStudent = function (reg) {
    var sid = sidOfReg(reg); if (!sid) return Promise.resolve(false);
    try { var rr = A.data.students.find(function (x) { return x.id === reg; }); if (rr) addEv(rr.name, '원생 삭제'); } catch (e) {}
    return sb.from('activity_log').delete().eq('student_id', sid)
      .then(function () { return sb.from('students').delete().eq('id', sid); })
      .then(function (r) { if (report(r, '원생 삭제').error) return false; return Promise.resolve(A.load()).then(function () { return true; }); });
  };
  A.logEvent = function (reg, item) {
    var sid = sidOfReg(reg); if (!sid) return;
    sb.from('activity_log').insert({ staff_id: A.staff.id, kind: item.kind || 'edit', student_id: sid, detail: item }).then(function (r) { report(r, '변경 기록'); });
  };
  // 샘플 원생을 한 번에 넣기 (시험용). list = 수강생대장 enrich 된 원생들
  A.seed = function (list) {
    var rows = list.map(function (s) { var r = studentRow(Object.assign({}, s, { extra: Object.assign({}, s.extra, { birth: s.birth, addr: s.addr, gender: s.gender }) })); return r; });
    return sb.from('students').insert(rows).select('id,reg_no').then(function (r) {
      if (report(r, '샘플 원생').error) throw r.error;
      var idOf = {}; r.data.forEach(function (x) { idOf[x.reg_no] = x.id; });
      var terms = [], stats = [];
      list.forEach(function (s) {
        var sid = idOf[s.id]; var from = anyToYmd(s.join) || '2020-01-01';
        var times = {}; var segs = (s.timeTxt || '').split(' · ').filter(Boolean), days = s.days || [];
        segs.forEach(function (seg, i) { var m = /(\d{1,2}):(\d{2})/.exec(seg); if (!m) return; var d = days[i]; if (days.length > 1) { var lt = seg.trim().split(' ')[0]; d = days.find(function (x) { return (x === '변동' ? 'R' : x[0]) === lt; }) || d; } if (d) times[d] = m[1] + ':' + m[2]; });
        var T = termsOf(Object.assign({}, s, { extra: Object.assign({}, s.extra, { times: times, stickBox: s.stick, count: s.count, dur: s.dur, unit: s.unit, pay: s.pay, total: s.total }), flags: Object.assign({}, s.flags, { pro: s.cls === 'pro' ? 1 : 0, cash: s.cashOn ? 1 : 0 }) }));
        ['lesson', 'fee', 'cash'].forEach(function (k) { terms.push({ student_id: sid, section: k, from_date: from, value: T[k], created_by: A.staff.id }); });
        if (s.backDate) stats.push({ student_id: sid, kind: 'back', date: anyToYmd(s.backDate), created_by: A.staff.id });
        if (s.status === 'rest') stats.push({ student_id: sid, kind: 'rest', date: anyToYmd(s.restDate) || from, reason: s.restReason || null, ticket: s.restTicket || null, created_by: A.staff.id });
        if (s.status === 'out') stats.push({ student_id: sid, kind: 'out', date: anyToYmd(s.leave) || from, reason: s.leaveReason || null, created_by: A.staff.id });
      });
      return sb.from('student_terms').insert(terms).then(function (q) {
        if (report(q, '샘플 수업 정보').error) throw q.error;
        return stats.length ? sb.from('status_changes').insert(stats).then(function (w) { report(w, '샘플 휴원·퇴원'); }) : null;
      }).then(function () {
        var upd = list.filter(function (s) { return s.status !== 'act'; });
        return Promise.all(upd.map(function (s) { return sb.from('students').update({ status: s.status }).eq('id', idOf[s.id]); }));
      }).then(function () { return A.load(); });
    });
  };

  // 페이지를 옮길 때: 로그인되어 있고 이 창에 저장해 둔 데이터가 있으면 바로 보여 주고, 뒤에서 확인·새로 불러오기
  var TOKEN_KEY = 'sb-' + URL.replace(/^https:\/\//, '').split('.')[0] + '-auth-token';
  (function restore() {
    var c = null;
    try { if (localStorage.getItem(TOKEN_KEY)) c = JSON.parse(localStorage.getItem('academy.cache') || 'null'); } catch (e) {}
    if (!c || !c.data || !c.staff) return;
    A.data = c.data; A.staff = c.staff; A.ready = true; A.fromCache = true;
    var idx = function (k) { var o = {}; try { (JSON.parse(localStorage.getItem(k) || '[]') || []).forEach(function (e) { o[e.id] = e; }); } catch (e) {} return o; };
    known.shared = idx('academy.lessonChanges'); known.status = idx('academy.statusChanges');
    var idx2 = function (k) { try { return idxList(JSON.parse(localStorage.getItem(k) || '[]') || []); } catch (e) { return {}; } };
    known.emp = idx2('academy.employees'); known.subj = idx2('academy.subjects');
  })();
  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    if (A.fromCache) { showUser(A.staff); check(true); return; }
    showLogin(); loading(true);   // 확인이 끝날 때까지 화면을 가린다 (로그인 칸은 로그인이 필요할 때만)
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // ── 다른 컴퓨터·휴대폰에서 넣은 내용을 저절로 다시 불러오기 ──
  // 화면을 보고 있을 때 90초마다, 다른 앱·탭에 갔다가 돌아오면 바로(20초 지났으면). 글자를 치는 중·창(팝업)이 열려 있을 때·방금 저장한 직후(8초)·저장 중에는 미룬다.
  // 수납 안내·수강생대장은 숨은 출석부(아래 calc 창)가 불러오고 계산해 주므로 스스로는 안 불러온다 (내용은 storage 이벤트로 받음).
  var CALC_HOST = window === window.top && /(notice|notice-list|students)\.html$/.test(location.pathname);
  var lastLoad = Date.now(), loadingNow = false;
  function busyNow() {
    if (!A.ready || !A.staff || loadingNow || A.busy) return true;
    if (A.lastWrite && Date.now() - A.lastWrite < 8000) return true;
    if (window === window.top) {
      var a = document.activeElement;
      if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || (a.tagName === 'INPUT' && a.type !== 'checkbox' && a.type !== 'button'))) return true;
      if (document.querySelector('[role="dialog"]')) return true;
    }
    return false;
  }
  function refresh() {
    if (CALC_HOST || document.hidden || busyNow()) return;
    loadingNow = true; lastLoad = Date.now();
    Promise.resolve(A.load()).then(function () { loadingNow = false; rerender(); }, function () { loadingNow = false; });
  }
  setInterval(function () { if (Date.now() - lastLoad >= 90000) refresh(); }, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastLoad >= 20000) refresh(); });
  document.addEventListener('academy:data', function () { lastLoad = Date.now(); });

  // ── 실시간 반영 (012 SQL로 attendance_cells 알림 켬): 다른 사람이 출결·수납 칸을 저장하면 1~2초 안에 이 화면에도 ──
  // 칸은 바로 바꿔 넣고, 수납 기록 등 나머지는 3초 뒤 한 번 다시 불러옴(refresh, 바쁘면 미룸). 글자 입력 중·창이 열려 있으면 다시 그리기만 미룸.
  var rtChan = null, rtDraw = false, rtLoadT = 0;
  function rtApply(row, gone) {
    if (!row || row.student_id == null || !row.ym || !A.data || !A.data.byId[row.student_id]) return;
    var key = row.ym + '|D' + row.student_id, val = gone ? null : (row.cells || {});
    var now = val && Object.keys(val).length ? JSON.stringify(val) : undefined;
    known.att = known.att || {};
    if (known.att[key] === now) return;   // 내가 저장한 것이 되돌아온 알림
    var ac = {}; try { ac = JSON.parse(localStorage.getItem('academy.attCells') || '{}') || {}; } catch (x) {}
    if (now) (ac[row.ym] = ac[row.ym] || {})['D' + row.student_id] = val; else if (ac[row.ym]) delete ac[row.ym]['D' + row.student_id];
    rawSet('academy.attCells', JSON.stringify(ac));
    if (now) known.att[key] = now; else delete known.att[key];
    rtDraw = true; rtTick();
    clearTimeout(rtLoadT); rtLoadT = setTimeout(function () { lastLoad = 0; refresh(); }, 3000);
  }
  function rtTick() {
    if (!rtDraw) return;
    var a = document.activeElement, typing = a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || (a.tagName === 'INPUT' && a.type !== 'checkbox' && a.type !== 'button'));
    if (A.busy || (window === window.top && (typing || document.querySelector('[role="dialog"]')))) return setTimeout(rtTick, 1000);
    rtDraw = false; rerender();
  }
  function rtStart() {
    if (rtChan || CALC_HOST || !A.staff || !sb.channel) return;
    rtChan = sb.channel('att-cells').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_cells' }, function (m) {
      if (m.eventType === 'DELETE') rtApply(m.old, true); else rtApply(m.new, false);
    }).subscribe(function (st) {
      if (st === 'SUBSCRIBED' && A.rtWas) { lastLoad = 0; refresh(); }   // 끊겼다 다시 이어지면 놓친 것 채우기
      if (st === 'SUBSCRIBED') A.rtWas = true;
    });
  }

  // ── 접속 표시 (Supabase Presence): 누가 지금 사이트를 보고 있는지. 'on' = 보고 있음(5분 안에 움직임), 'idle' = 자리 비움 ──
  // A.presence = { 이름: { state, page, dev, since } }, A.seen = { 이름: 마지막 접속 ms } (013 SQL staff_seen, 없으면 빈 채로)
  var pChan = null, pState = 'on', pSince = Date.now(), pAct = Date.now(), IDLE = 5 * 60000;
  A.presence = {}; A.seen = {};
  function pPage() { var m = location.pathname.match(/(\w[\w-]*)\.html$/); return m ? m[1] : 'attendance'; }
  function pDev() { return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? '휴대폰' : '컴퓨터'; }
  function pTrack() { if (pChan) pChan.track({ id: A.staff.id, name: A.staff.name, page: pPage(), dev: pDev(), state: pState, since: pSince }); }
  function pCheck() {
    var st = !document.hidden && Date.now() - pAct < IDLE ? 'on' : 'idle';
    if (st !== pState) { pState = st; pSince = st === 'idle' && !document.hidden ? pAct : Date.now(); pTrack(); }
  }
  function pSeen() {
    if (!A.staff) return;
    sb.from('staff_seen').upsert({ staff_id: A.staff.id, name: A.staff.name, at: new Date().toISOString() }).then(function () {});
  }
  function pLoadSeen() {
    sb.from('staff_seen').select('name,at').then(function (r) {
      if (r.error) return; A.seen = {}; (r.data || []).forEach(function (x) { A.seen[x.name] = Date.parse(x.at); });
      rtDraw = true; rtTick();
    });
  }
  function pStart() {
    if (pChan || window !== window.top || !A.staff || !sb.channel) return;
    pChan = sb.channel('online', { config: { presence: { key: A.staff.id } } });
    pChan.on('presence', { event: 'sync' }, function () {
      var all = pChan.presenceState(), o = {}, rank = { on: 2, idle: 1 }, was = A.presence;
      Object.keys(all).forEach(function (k) { (all[k] || []).forEach(function (m) {
        var c = o[m.name];
        if (!c || rank[m.state] > rank[c.state] || (m.state === c.state && m.state === 'idle' && m.since > c.since)) o[m.name] = { state: m.state, page: m.page, dev: m.dev, since: m.since };
      }); });
      A.presence = o;
      if (Object.keys(was).some(function (n) { return !o[n]; })) setTimeout(pLoadSeen, 1500);   // 나간 사람 마지막 접속 시간
      rtDraw = true; rtTick();
    }).subscribe(function (st) { if (st === 'SUBSCRIBED') { pTrack(); pSeen(); pLoadSeen(); } });
    ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { pAct = Date.now(); if (pState !== 'on') pCheck(); }, { passive: true, capture: true }); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pAct = Date.now(); pCheck(); });
    setInterval(pCheck, 20000);
    setInterval(function () { if (pState === 'on') pSeen(); }, 60000);
    window.addEventListener('pagehide', pSeen);
  }
  document.addEventListener('academy:login', pStart);
  document.addEventListener('academy:data', pStart);
  if (A.fromCache) setTimeout(pStart, 1500);
  document.addEventListener('academy:login', rtStart);
  document.addEventListener('academy:data', rtStart);
  if (A.fromCache) setTimeout(rtStart, 1500);

  // ── 출석부를 열지 않아도 수강권 계산(수업완료·미납·차액 → 'academy.tickets')이 되도록 ──
  // 수납 안내·수강생대장은 보이지 않는 출석부(attendance.html?calc=1)를 하나 띄워 둔다. 출석부와 똑같은 계산을 그대로 쓰고,
  // 그 창이 90초마다 서버에서 다시 불러와 다시 계산하면 결과가 이 창에도 바로 들어온다.
  function startCalc() {
    if (!CALC_HOST || document.getElementById('academy-calc') || !A.staff) return;
    var f = document.createElement('iframe');
    f.id = 'academy-calc'; f.src = 'attendance.html?calc=1'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.className = 'noexp noprint';
    f.style.cssText = 'position: fixed; left: -10000px; top: 0; width: 1400px; height: 900px; border: 0; visibility: hidden; pointer-events: none';
    document.body.appendChild(f);
  }
  document.addEventListener('academy:login', startCalc);
  if (A.fromCache) setTimeout(startCalc, 1500);
})();
