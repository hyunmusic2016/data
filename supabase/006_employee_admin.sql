-- 추가 (v0.47.0): 직원명부 '관리자 권한' (직명은 강사 그대로, 권한만 원장님과 같게)
-- SQL Editor 에 붙여 넣고 Run. (005 를 실행한 뒤)
alter table employees add column if not exists admin boolean not null default false;

-- 로그인 계정 연결: 직명 원장 또는 관리자 권한이면 owner
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
            case when e.role = '원장' or e.admin then 'owner' else 'teacher' end, e.subjects[1],
            e.leave_date is null or e.leave_date > current_date)
  on conflict (id) do update set name = excluded.name, title = excluded.title, role = excluded.role, part = excluded.part, active = excluded.active;
  return 'ok';
end $$;
grant execute on function link_employee_account(bigint, text) to authenticated;

-- 직원 정보를 바꾸면 로그인 허용 명단(staff)도 같이 맞춘다 (관리자 권한 포함, 해임하면 로그인 막힘)
create or replace function sync_staff_from_employee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    update staff set name = new.name,
      title = case when new.role = '원장' then '원장님' else '강사님' end,
      role = case when new.role = '원장' or new.admin then 'owner' else 'teacher' end,
      part = new.subjects[1],
      active = (new.leave_date is null or new.leave_date > current_date)
    where id = new.user_id;
  end if;
  return new;
end $$;
