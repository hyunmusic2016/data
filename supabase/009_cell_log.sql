-- 추가 (v0.67.0): 출석부 변경 기록 (칸 하나가 바뀔 때마다 한 줄)
-- SQL Editor 에 붙여 넣고 Run. (008 을 실행한 뒤)
create table if not exists cell_log (
  id        bigserial primary key,
  local_id  text unique,                 -- 화면 기록 번호
  at        timestamptz not null,        -- 바꾼 때
  who       text,                        -- 바꾼 사람
  tab       text,                        -- 그때 보고 있던 강사 탭
  ym        text not null,               -- 출석부 달 '2026-11'
  rid       text,                        -- 출석부 줄
  name      text,                        -- 원생 이름
  k         text,                        -- 칸 (날짜, p날짜=수납 …)
  a         text,                        -- 바꾸기 전
  b         text,                        -- 바꾼 뒤
  staff_id  uuid default auth.uid()
);
create index if not exists cell_log_ym on cell_log (ym, at);
alter table cell_log enable row level security;
grant select, insert on cell_log to authenticated;
revoke all on cell_log from anon;
grant usage, select on all sequences in schema public to authenticated;
drop policy if exists cell_log_read on cell_log;
create policy cell_log_read on cell_log for select to authenticated using (is_staff());
drop policy if exists cell_log_add on cell_log;
create policy cell_log_add on cell_log for insert to authenticated with check (is_staff());
