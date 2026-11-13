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
    '#acLogin button{height:50px;border:none;border-radius:14px;background:#00A6AB;color:#fff;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;margin-top:6px}' +
    '#acLogin button[disabled]{opacity:.6;cursor:default}' +
    '#acLogin .err{min-height:18px;font-size:13px;font-weight:600;color:#B4332B}' +
    '#acUser{position:fixed;top:10px;right:24px;z-index:900;display:flex;align-items:center;gap:8px;font-size:12px;color:#3A4450}' +
    '#acUser b{font-weight:800}#acUser button{height:26px;padding:0 10px;border-radius:8px;border:1px solid #D9DEE3;background:#fff;font-family:inherit;font-size:12px;font-weight:600;color:#5E6873;cursor:pointer}' +
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
    if (!m) { m = el('<div id="acLoading" style="font-size:15px;font-weight:700;color:#5E6873">불러오는 중…</div>'); document.getElementById('acLogin').appendChild(m); }
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
    document.getElementById('acUserName').innerHTML = '<b>' + st.name + '</b> ' + (st.title || '');
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
      sb.from('student_terms').select('*').order('from_date').order('id'),
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
        sb.from('subjects').select('*').order('sort')
      ]).then(function (qs) {
        var q = qs[0];
        if (!q.error) (q.data || []).forEach(function (r) { if (r.key === 'menu') rawSet('academy.menu', JSON.stringify(r.value)); });
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
      });
    });
  };

  function sidOfName(name) { var s = A.data && A.data.byName[name]; return s ? s.id : null; }
  function sidOfReg(reg) { var r = A.data && A.data.students.find(function (x) { return x.id === reg; }); return r ? r.dbId : null; }
  function report(r, what) { if (r && r.error) { console.warn(what, r.error); toast('저장하지 못했습니다: ' + what); } return r; }
  function toast(msg) {
    var t = document.getElementById('acToast');
    if (!t) { t = el('<div id="acToast" style="position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:1001;padding:10px 16px;border-radius:12px;background:#B4332B;color:#fff;font-size:13px;font-weight:700;box-shadow:0 8px 20px rgba(0,0,0,.18)"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 4000);
  }
  A.toast = toast;
  var known = { shared: {}, status: {} }, idMap = {};
  function dbIdOf(localId) { if (/^T\d+$/.test(localId) || /^S\d+$/.test(localId)) return Promise.resolve(+localId.slice(1)); return idMap[localId] || Promise.resolve(null); }

  // 화면이 localStorage에 쓰는 기록을 받아 Supabase에 저장
  Storage.prototype.setItem = function (k, v) {
    origSet.call(this, k, v);
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
    } catch (e) { console.warn(e); }
  };
  function syncList(list, kind, saveFn, table) {
    var prev = known[kind], now = {};
    list.forEach(function (e) { now[e.id] = e; if (!prev[e.id]) saveFn(e); });
    Object.keys(prev).forEach(function (id) { if (!now[id]) dbIdOf(id).then(function (n) { if (n) sb.from(table).delete().eq('id', n).then(function (r) { report(r, '삭제'); }); }); });
    known[kind] = now;
  }
  // 직원명부·수강과목: 새 줄은 insert(번호를 받아 id를 바꿔 둠), 바뀐 줄은 update, 빠진 줄은 delete
  function idxList(list) { var o = {}; (list || []).forEach(function (e) { o[e.id] = JSON.stringify(e); }); return o; }
  function empFromRow(r) { return { id: 'E' + r.id, seq: r.seq, role: r.role, name: r.name, phone: r.phone || '', addr: r.addr || '', duty: r.duty || '', email: r.email || '', subjects: r.subjects || [], tab: r.tab !== false, hire: r.hire_date || '', leave: r.leave_date || '', leaveReason: r.leave_reason || '', memo: r.memo || '', linked: !!r.user_id }; }
  function empToRow(e) { return { seq: e.seq, role: e.role, name: e.name, phone: e.phone || null, addr: e.addr || null, duty: e.duty || null, email: e.email || null, subjects: e.subjects || [], tab: e.tab !== false, hire_date: e.hire || null, leave_date: e.leave || null, leave_reason: e.leaveReason || null, memo: e.memo || null }; }
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
    idMap[e.id] = sb.from('status_changes').insert({ student_id: sid, kind: e.kind, date: e.date, reason: e.reason || null, ticket: e.ticket || null, created_by: A.staff.id }).select('id').single()
      .then(function (r) { report(r, '휴원·퇴원 처리'); return r.data ? r.data.id : null; });
    sb.from('students').update({ status: e.kind === 'back' ? 'act' : e.kind }).eq('id', sid).then(function (r) { report(r, '원생 상태'); });
  }

  // ---------- 수강생대장에서 부르는 저장 ----------
  function studentRow(rec) {
    var ex = rec.extra || {};
    return { reg_no: rec.id, name: rec.name, guardian: rec.guardian || null, phone: rec.phone || null, gphone: rec.gphone || null, birth: anyToYmd(ex.birth), gender: ex.gender || null, age_group: rec.age || null, addr: ex.addr || null, memo: rec.note || null, join_date: anyToYmd(rec.join) };
  }
  function termsOf(rec) {
    var ex = rec.extra || {}, fl = rec.flags || {};
    var times = {};
    Object.keys(ex.times || {}).forEach(function (d) { var m = /^(\d{1,2}):(\d{2})$/.exec(ex.times[d]); if (m && SHORT[d]) { var h = +m[1]; times[SHORT[d]] = ('0' + (h < 9 ? h + 12 : h)).slice(-2) + ':' + m[2]; } });
    return {
      lesson: { days: (rec.days || []).map(function (d) { return SHORT[d]; }).filter(Boolean), times: times, stick: !!ex.stickBox, teacher: rec.teacher || '', part: rec.part || '' },
      fee: { flags: { pro: fl.pro ? 1 : 0 }, extra: { count: ex.count, dur: ex.dur, unit: ex.unit, pay: ex.pay, total: ex.total } },
      cash: { flags: { cash: fl.cash ? 1 : 0 }, extra: { cashType: ex.cashType || 'person', cashNo: ex.cashNo || '' } }
    };
  }
  // 새 원생: 화면 목록에 바로 넣고 Supabase에 저장
  A.addStudent = function (rec) {
    var raw = Object.assign({}, rec, { dbId: null });
    A.data.students.push(raw);
    return sb.from('students').insert(studentRow(rec)).select('*').single().then(function (r) {
      report(r, '원생 등록'); if (!r.data) return null;
      raw.dbId = r.data.id; A.data.byId[r.data.id] = r.data; A.data.byName[r.data.name] = r.data;
      var from = anyToYmd(rec.join) || new Date().toISOString().slice(0, 10), T = termsOf(rec);
      return sb.from('student_terms').insert(['lesson', 'fee', 'cash'].map(function (k) { return { student_id: r.data.id, section: k, from_date: from, value: T[k], created_by: A.staff.id }; }))
        .then(function (q) { report(q, '원생 등록(수업·수강료)'); return r.data.id; });
    });
  };
  // 원생 정보 수정: 기본 정보는 바로, 수강료·현금영수증 날짜별 변경은 student_terms에 (수업 정보는 lessonChanges로 따로 저장됨)
  A.saveEdit = function (reg, basic, newHist, dropHids) {
    var sid = sidOfReg(reg); if (!sid) return;
    var raw = A.data.students.find(function (x) { return x.id === reg; });
    if (raw) { var keep = Object.assign({}, raw.extra); Object.assign(raw, mergeRec(raw, basic)); raw.extra = Object.assign(keep, (basic || {}).extra); }
    var row = studentRow(Object.assign({}, raw || {}, basic, { id: reg, extra: Object.assign({}, (raw || {}).extra, (basic || {}).extra) }));
    delete row.reg_no;
    sb.from('students').update(row).eq('id', sid).then(function (r) { report(r, '원생 정보 수정'); if (r && !r.error && A.data.byId[sid]) { var nm0 = A.data.byId[sid].name; if (nm0 !== row.name) { delete A.data.byName[nm0]; A.data.byId[sid].name = row.name; A.data.byName[row.name] = A.data.byId[sid]; } } });
    (dropHids || []).forEach(function (h) { A.deleteTerm(h); });
    (newHist || []).forEach(function (h) {
      idMap[h.hid] = sb.from('student_terms').insert({ student_id: sid, section: h.sec, from_date: h.from, value: h.patch, created_by: A.staff.id }).select('id').single()
        .then(function (r) { report(r, '날짜별 변경'); return r.data ? r.data.id : null; });
    });
  };
  A.deleteTerm = function (hid) { dbIdOf(hid).then(function (n) { if (n) sb.from('student_terms').delete().eq('id', n).then(function (r) { report(r, '예정 취소'); }); }); };
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
})();
