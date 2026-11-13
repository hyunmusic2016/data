-- =====================================================================
-- 추가 (v0.40.0): 학원 공통 설정 (메뉴 탭 순서·이름·숨기기·추가 등)
-- SQL Editor 에 이 파일 내용을 붙여 넣고 Run. (schema.sql 을 이미 실행한 경우 이것만 실행)
-- 직원은 모두 읽고, 바꾸기는 원장님만.
-- =====================================================================
create table if not exists app_settings (
  key         text primary key,
  value       jsonb,
  updated_by  uuid references staff(id),
  updated_at  timestamptz not null default now()
);
alter table app_settings enable row level security;
grant select, insert, update, delete on app_settings to authenticated;
revoke all on app_settings from anon;
drop policy if exists app_settings_read on app_settings;
create policy app_settings_read on app_settings for select to authenticated using (is_staff());
drop policy if exists app_settings_write on app_settings;
create policy app_settings_write on app_settings for all to authenticated using (is_owner()) with check (is_owner());
