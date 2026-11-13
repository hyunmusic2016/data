-- 추가 (v0.51.0): 출석부 저장 (출결·보강·수납 표시 = 원생·달마다 한 줄, 수납 기록, 레슨시작일 예정)
-- SQL Editor 에 붙여 넣고 Run. (schema.sql ~ 007 을 실행한 뒤)

-- 출석부 칸 (원생 · 달마다 한 줄). cells = 그 달 날짜 칸 내용 (출석·결석·보강·연기·수납 표시, 보강 시간 등)
create table if not exists attendance_cells (
  student_id  bigint not null references students(id) on delete cascade,
  ym          text not null,                          -- 예: '2026-11'
  cells       jsonb not null default '{}',
  updated_by  uuid references staff(id),
  updated_at  timestamptz not null default now(),
  primary key (student_id, ym)
);
alter table attendance_cells enable row level security;
grant select, insert, update, delete on attendance_cells to authenticated;
revoke all on attendance_cells from anon;
drop policy if exists attendance_cells_staff on attendance_cells;
create policy attendance_cells_staff on attendance_cells for all to authenticated using (is_staff()) with check (is_staff());

-- 수납 기록: 화면의 수납 번호(local_id)로 맞추고, 화면 기록 전체(extra)도 같이 둔다
alter table payments add column if not exists local_id text unique;
alter table payments add column if not exists extra jsonb;

-- 표 권한 (schema.sql 에서 이미 줬으면 그대로)
grant select, insert, update, delete on payments, ticket_plans to authenticated;
grant usage, select on all sequences in schema public to authenticated;
