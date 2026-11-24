-- 추가 (v0.87.0): 수업일지·업무일지 저장
-- SQL Editor 에 붙여 넣고 Run. (schema.sql ~ 010 을 실행한 뒤)

-- 글 한 칸마다 한 줄 (다른 사람이 다른 칸을 동시에 고쳐도 서로 덮어쓰지 않음)
--   kind 'class'    = 수업일지: k1 = 원생 줄 키, k2 = 날짜(일)
--   kind 'work'     = 업무일지 날짜 칸: k2 = 날짜(일)
--   kind 'workmemo' = 업무일지 MEMO (달마다 하나)
create table if not exists log_notes (
  kind        text not null,
  ym          text not null,
  k1          text not null default '',
  k2          text not null default '',
  body        text not null default '',
  updated_by  uuid references staff(id),
  updated_at  timestamptz not null default now(),
  primary key (kind, ym, k1, k2)
);
alter table log_notes enable row level security;
grant select, insert, update, delete on log_notes to authenticated;
revoke all on log_notes from anon;
drop policy if exists log_notes_staff on log_notes;
create policy log_notes_staff on log_notes for all to authenticated using (is_staff()) with check (is_staff());
