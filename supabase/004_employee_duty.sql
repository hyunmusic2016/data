-- 추가 (v0.43.0): 직원명부 '담당업무' (교육청 직원명부 규격, 글로 적음)
-- SQL Editor 에 붙여 넣고 Run. (003 을 실행한 뒤)
alter table employees add column if not exists duty text;
