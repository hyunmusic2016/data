-- 추가 (v0.80.0): 체험레슨 (출석부 '체험레슨' 묶음)
-- SQL Editor 에 붙여 넣고 Run. (schema.sql ~ 009 를 실행한 뒤)

-- 체험레슨 한 건마다 한 줄. data = { info: 이름·연락처·날짜·시간·강사·과목·요금, cells: { '2026-11': 출석부 칸 }, pays: [수납 기록] }
create table if not exists trials (
  id          text primary key,
  data        jsonb not null default '{}',
  updated_by  uuid references staff(id),
  updated_at  timestamptz not null default now()
);
alter table trials enable row level security;
grant select, insert, update, delete on trials to authenticated;
revoke all on trials from anon;
drop policy if exists trials_staff on trials;
create policy trials_staff on trials for all to authenticated using (is_staff()) with check (is_staff());
