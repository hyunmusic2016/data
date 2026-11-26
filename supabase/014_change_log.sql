-- 추가 (v0.99.0): 페이지 변경 기록 (수강생대장·수납 안내·수입·지출 … '기록' 버튼)
-- SQL Editor 에 붙여 넣고 Run.
create table if not exists change_log (
  id        bigserial primary key,
  local_id  text unique,
  at        timestamptz not null default now(),
  who       text,
  page      text not null,          -- students / notice / money / …
  lines     jsonb not null default '[]'
);
create index if not exists change_log_page_at on change_log (page, at desc);
alter table change_log enable row level security;
grant select, insert on change_log to authenticated;
grant usage, select on sequence change_log_id_seq to authenticated;
revoke all on change_log from anon;
drop policy if exists change_log_read on change_log;
create policy change_log_read on change_log for select to authenticated using (is_staff());
drop policy if exists change_log_ins on change_log;
create policy change_log_ins on change_log for insert to authenticated with check (is_staff());
