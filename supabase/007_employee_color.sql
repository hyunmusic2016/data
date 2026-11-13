-- 추가 (v0.48.0): 직원명부 '강사 이름 색' (비어 있으면 자동 = 원장 금색 / 강사 첫 번째 교습과목 색)
-- 값 예: '#D7EFDD|#2F6B43' (바탕색|글자색). SQL Editor 에 붙여 넣고 Run. (006 을 실행한 뒤)
alter table employees add column if not exists color text;
