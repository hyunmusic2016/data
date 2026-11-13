-- =====================================================================
-- 현실용음악학원 출석부 · Supabase 데이터베이스 설계
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 전체를 붙여 넣고 Run.
-- (여러 번 실행해도 되도록 if not exists 를 썼습니다.)
--
-- 원칙
--  - 엑셀처럼 표(테이블)로 저장한다. 원생·직원·출결·수납은 5년 보관.
--  - 로그인한 직원(staff 표에 등록된 계정)만 읽고 쓸 수 있다 (RLS).
--  - 날짜가 있는 변경(수업 정보·수강료·현금영수증)은 '시작 날짜 + 값'으로 쌓아서,
--    지난 달 출석부·수입·강사 수당이 그 날짜에 맞는 값을 쓰게 한다.
--  - 활동 기록은 최근 3개월만 보관 (맨 아래 pg_cron).
-- =====================================================================

-- ---------- 직원 (로그인 계정과 1:1) ----------
create table if not exists staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,                         -- 예: 김도윤
  title       text not null default '강사님',         -- 원장님 / 강사님
  role        text not null default 'teacher' check (role in ('owner', 'teacher')),
  part        text,                                  -- 드럼·보컬·기타·베이스·피아노·우쿨렐레
  pay_type    text not null default 'per_lesson' check (pay_type in ('per_lesson', 'salary')),  -- 월급제면 회당 수당 없음
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- 원생 (수강생대장 기본 정보) ----------
create table if not exists students (
  id          bigint generated always as identity primary key,
  reg_no      integer not null unique,               -- 등록번호
  name        text not null,
  guardian    text,
  phone       text,                                  -- 숫자만
  gphone      text,                                  -- 보호자 연락처, 숫자만
  birth       date,
  gender      text check (gender in ('남', '여')),
  age_group   text check (age_group in ('학생', '성인')),
  addr        text,
  memo        text,                                  -- 원생 메모 (여러 줄)
  join_date   date,                                  -- 입원 연월일
  status      text not null default 'act' check (status in ('act', 'rest', 'out')),  -- 재원/휴원/퇴원 (지금 상태)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- 날짜별로 바뀌는 원생 정보 ----------
-- section: lesson = {teacher_id, part, days:[...], times:{요일:'HH:MM'}, stick}
--          fee    = {cls:'hobby'|'pro', count, dur, unit, total, pay}
--          cash   = {on, type:'person'|'biz', no}
-- 어떤 날짜의 값 = from_date 가 그 날짜 이하인 것 중 가장 늦은 것
create table if not exists student_terms (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references students(id) on delete cascade,
  section     text not null check (section in ('lesson', 'fee', 'cash')),
  from_date   date not null,
  value       jsonb not null,
  created_by  uuid references staff(id),
  created_at  timestamptz not null default now()
);
create index if not exists student_terms_idx on student_terms (student_id, section, from_date);

-- ---------- 휴원·퇴원·복귀 기록 ----------
create table if not exists status_changes (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references students(id) on delete cascade,
  kind        text not null check (kind in ('rest', 'out', 'back')),
  date        date not null,
  reason      text,
  ticket      text,                                  -- 그 당시 수강권 (예: 3/4회 (남은 1회))
  created_by  uuid references staff(id),
  created_at  timestamptz not null default now()
);
create index if not exists status_changes_idx on status_changes (student_id, date);

-- ---------- 출결 (원생 · 날짜마다 한 칸) ----------
-- mark: 수(출석) 결(결석) 보(보강 예정) 연(연기) M(보강 수업)
create table if not exists attendance (
  student_id     bigint not null references students(id) on delete cascade,
  date           date not null,
  mark           text not null check (mark in ('수', '결', '보', '연', 'M')),
  makeup_status  text check (makeup_status in ('수', '결')),   -- 보강 수업 칸에 넣은 출석·결석
  makeup_time    text,                                        -- 보강 시간 (기록용, 예: 9:30)
  makeup_link    date,                                        -- '보' 칸 → 보강 날짜
  updated_by     uuid references staff(id),
  updated_at     timestamptz not null default now(),
  primary key (student_id, date)
);
create index if not exists attendance_date_idx on attendance (date);

-- ---------- 수납 ----------
-- kind: normal = 일반 수납 / unpaid = 휴원·퇴원 원생의 미납금액 수납
-- sheet_month: 미납금액을 다음 달 이후에 받아 휴원한 달 출석부에서 처리한 경우, 그 출석부 달(그 달 1일)
create table if not exists payments (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references students(id) on delete cascade,
  date        date not null,                         -- 수납(결제) 날짜
  kind        text not null default 'normal' check (kind in ('normal', 'unpaid')),
  sheet_month date,
  count       integer not null,                      -- 수강 횟수 (이 수강권만)
  dur         integer,                               -- 수강 시간(분)
  unit        integer,                               -- 회당 수업료
  total       integer not null,                      -- 수강료 합계
  pay         integer,                               -- 강사 수당(회당)
  cls         text check (cls in ('hobby', 'pro')),
  teacher_id  uuid references staff(id),
  created_by  uuid references staff(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists payments_idx on payments (student_id, date);

-- ---------- 레슨시작일 예정 (직접 넣은 날짜) ----------
create table if not exists ticket_plans (
  student_id  bigint primary key references students(id) on delete cascade,
  plan_date   date not null,
  updated_by  uuid references staff(id),
  updated_at  timestamptz not null default now()
);

-- ---------- 활동 기록 (최근 3개월만) ----------
-- 문장을 통째로 저장하지 않고 시각·직원·종류·원생·바뀐 내용만 저장
create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  staff_id    uuid references staff(id),
  kind        text not null,                         -- 예: rest, out, back, pay, edit, attend
  student_id  bigint references students(id) on delete set null,
  detail      jsonb
);
create index if not exists activity_log_at_idx on activity_log (at);

-- ---------- 수정 시각 자동 갱신 ----------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists students_touch on students;
create trigger students_touch before update on students for each row execute function touch_updated_at();
drop trigger if exists payments_touch on payments;
create trigger payments_touch before update on payments for each row execute function touch_updated_at();
drop trigger if exists attendance_touch on attendance;
create trigger attendance_touch before update on attendance for each row execute function touch_updated_at();

-- =====================================================================
-- 접근 권한: 프로젝트를 만들 때 'Automatically expose new tables'를 껐으므로 직접 준다.
-- 로그인한 사용자(authenticated)에게만 주고, 로그인 안 한 방문자(anon)에게는 아무 권한도 주지 않는다.
-- (실제로 무엇을 볼 수 있는지는 아래 RLS 규칙이 한 번 더 막는다: staff 표에 등록된 직원만)
-- =====================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on staff, students, student_terms, status_changes, attendance, payments, ticket_plans, activity_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on staff, students, student_terms, status_changes, attendance, payments, ticket_plans, activity_log from anon;

-- =====================================================================
-- 보안 (RLS): staff 표에 등록된 '활성' 직원만 데이터를 읽고 쓸 수 있다.
-- 로그인하지 않은 사람(공개 사이트 방문자)은 아무것도 볼 수 없다.
-- =====================================================================
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active)
$$;
create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active and role = 'owner')
$$;

alter table staff          enable row level security;
alter table students       enable row level security;
alter table student_terms  enable row level security;
alter table status_changes enable row level security;
alter table attendance     enable row level security;
alter table payments       enable row level security;
alter table ticket_plans   enable row level security;
alter table activity_log   enable row level security;

-- 직원 목록: 직원은 모두 볼 수 있고, 추가·수정은 원장님만
drop policy if exists staff_read on staff;
create policy staff_read on staff for select to authenticated using (is_staff());
drop policy if exists staff_write on staff;
create policy staff_write on staff for all to authenticated using (is_owner()) with check (is_owner());

-- 나머지 표: 직원이면 읽기·쓰기 (강사별 제한은 나중에 정함)
do $$
declare t text;
begin
  foreach t in array array['students', 'student_terms', 'status_changes', 'attendance', 'payments', 'ticket_plans', 'activity_log'] loop
    execute format('drop policy if exists %I on %I', t || '_staff', t);
    execute format('create policy %I on %I for all to authenticated using (is_staff()) with check (is_staff())', t || '_staff', t);
  end loop;
end $$;

-- =====================================================================
-- 활동 기록 3개월 자동 삭제 (매일 한국 시간 새벽 4시 = UTC 19시)
-- 먼저 대시보드 → Database → Extensions 에서 pg_cron 을 켠 뒤 아래 줄을 따로 실행하세요.
-- select cron.schedule('activity-log-cleanup', '0 19 * * *', $$delete from activity_log where at < now() - interval '3 months'$$);
-- =====================================================================

-- =====================================================================
-- 직원 계정 연결 (계정마다 한 번)
-- 1) 대시보드 → Authentication → Users → Add user → Create new user
--    (이메일·비밀번호 입력, 'Auto Confirm User' 체크)
-- 2) 만든 사용자의 이메일로 아래를 실행 (SQL Editor 에서는 보안 규칙을 건너뛰고 들어감)
-- insert into staff (id, name, title, role, part)
--   select id, '김도윤', '원장님', 'owner', '기타' from auth.users where email = '원장님이메일@example.com';
-- insert into staff (id, name, title, role, part)
--   select id, '박서준', '강사님', 'teacher', '드럼' from auth.users where email = '강사이메일@example.com';
-- =====================================================================
