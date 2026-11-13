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

  function hideLogin() { var b = document.getElementById('acLogin'); if (b) b.style.display = 'none'; }

  function showUser(st) {
    var u = document.getElementById('acUser');
    if (!u) {
      u = el('<div id="acUser"><span id="acUserName"></span><button type="button" id="acOut">로그아웃</button></div>');
      document.body.appendChild(u);
      document.getElementById('acOut').addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });
    }
    document.getElementById('acUserName').innerHTML = '<b>' + st.name + '</b> ' + (st.title || '');
  }

  function check() {
    return sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) { showLogin(); return null; }
      return sb.from('staff').select('*').eq('id', s.user.id).maybeSingle().then(function (q) {
        if (!q.data || !q.data.active) { sb.auth.signOut(); showLogin('직원 명단에 등록되지 않은 계정입니다. 원장님께 등록을 요청하세요.'); return null; }
        A.staff = q.data; A.ready = true;
        hideLogin(); showUser(q.data);
        document.dispatchEvent(new CustomEvent('academy:login', { detail: q.data }));
        return q.data;
      });
    });
  }
  A.check = check;

  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    showLogin();            // 확인이 끝날 때까지 화면을 가린다
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
