-- =====================================================================
-- 추가 (v0.42.0): 수강과목 · 직원명부
-- SQL Editor 에 이 파일 내용을 붙여 넣고 Run. (schema.sql · 002 를 실행한 뒤)
-- 직원은 모두 읽고, 바꾸기는 원장님만.
-- =====================================================================

-- 수강과목 (설정 > 수강과목)
create table if not exists subjects (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  bg          text,                 -- 파스텔 바탕색
  fg          text,                 -- 글자색
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 직원명부 (설정 > 직원명부). 연번 순서는 바뀌지 않는다. 해임해도 지우지 않고 해임연월일만 넣는다.
create table if not exists employees (
  id            bigint generated always as identity primary key,
  seq           integer not null,                       -- 연번
  role          text not null check (role in ('원장', '강사')),  -- 직명
  name          text not null,                          -- 성명
  phone         text,
  addr          text,
  email         text,                                   -- 로그인 이메일
  subjects      text[] not null default '{}',           -- 담당 수강과목 (여러 개)
  tab           boolean not null default true,          -- 출석부 강사 탭
  hire_date     date,                                   -- 채용연월일
  leave_date    date,                                   -- 해임연월일
  leave_reason  text,
  memo          text,
  user_id       uuid unique references auth.users(id) on delete set null,  -- 연결된 로그인 계정
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists employees_touch on employees;
create trigger employees_touch before update on employees for each row execute function touch_updated_at();

alter table subjects  enable row level security;
alter table employees enable row level security;
grant select, insert, update, delete on subjects, employees to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on subjects, employees from anon;
drop policy if exists subjects_read on subjects;
create policy subjects_read on subjects for select to authenticated using (is_staff());
drop policy if exists subjects_write on subjects;
create policy subjects_write on subjects for all to authenticated using (is_owner()) with check (is_owner());
drop policy if exists employees_read on employees;
create policy employees_read on employees for select to authenticated using (is_staff());
drop policy if exists employees_write on employees;
create policy employees_write on employees for all to authenticated using (is_owner()) with check (is_owner());

-- 로그인 계정 연결: 대시보드에서 만든 계정(이메일)을 직원과 이어 주고, 로그인 허용 명단(staff)도 맞춘다. 원장님만.
create or replace function link_employee_account(emp bigint, mail text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; e employees;
begin
  if not is_owner() then raise exception '원장님만 할 수 있습니다'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(mail));
  if uid is null then return 'no_user'; end if;
  select * into e from employees where id = emp;
  if e.id is null then return 'no_employee'; end if;
  update employees set user_id = null where user_id = uid and id <> emp;
  update employees set user_id = uid, email = trim(mail) where id = emp;
  insert into staff (id, name, title, role, part, active)
    values (uid, e.name, case when e.role = '원장' then '원장님' else '강사님' end,
            case when e.role = '원장' then 'owner' else 'teacher' end, e.subjects[1],
            e.leave_date is null or e.leave_date > current_date)
  on conflict (id) do update set name = excluded.name, title = excluded.title, role = excluded.role, part = excluded.part, active = excluded.active;
  return 'ok';
end $$;
grant execute on function link_employee_account(bigint, text) to authenticated;

-- 직원 정보를 바꾸면 로그인 허용 명단(staff)도 같이 맞춘다 (해임하면 로그인 막힘)
create or replace function sync_staff_from_employee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    update staff set name = new.name,
      title = case when new.role = '원장' then '원장님' else '강사님' end,
      role = case when new.role = '원장' then 'owner' else 'teacher' end,
      part = new.subjects[1],
      active = (new.leave_date is null or new.leave_date > current_date)
    where id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists employees_sync_staff on employees;
create trigger employees_sync_staff after insert or update on employees for each row execute function sync_staff_from_employee();
