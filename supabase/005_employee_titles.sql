-- 추가 (v0.44.0): 직원명부 직명 여러 개 (원장 / 강사 / 행정 체크)
-- SQL Editor 에 붙여 넣고 Run. (004 를 실행한 뒤)
alter table employees add column if not exists titles text[] not null default '{}';
