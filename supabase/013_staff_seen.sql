-- 추가 (v0.96.0): 직원 마지막 접속 시간 (출석부 강사 접속 표시의 '마지막 접속 3시간 전')
-- SQL Editor 에 붙여 넣고 Run.
create table if not exists staff_seen (
  staff_id  uuid primary key references staff(id) on delete cascade,
  name      text,
  at        timestamptz not null default now()
);
alter table staff_seen enable row level security;
grant select, insert, update on staff_seen to authenticated;
revoke all on staff_seen from anon;
drop policy if exists staff_seen_read on staff_seen;
create policy staff_seen_read on staff_seen for select to authenticated using (is_staff());
drop policy if exists staff_seen_ins on staff_seen;
create policy staff_seen_ins on staff_seen for insert to authenticated with check (staff_id = auth.uid() and is_staff());
drop policy if exists staff_seen_upd on staff_seen;
create policy staff_seen_upd on staff_seen for update to authenticated using (staff_id = auth.uid()) with check (staff_id = auth.uid());
