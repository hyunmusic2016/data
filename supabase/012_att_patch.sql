-- 추가 (v0.94.0): 출석부 칸을 바뀐 칸만 합쳐 저장 (여러 사람이 동시에 입력해도 서로 덮지 않음)
-- SQL Editor 에 붙여 넣고 Run. (008 을 실행한 뒤)

-- p_set = 바꾼 칸 {칸이름: 값}, p_del = 지운 칸 이름들. 합친 뒤 빈 줄이면 줄을 지운다.
create or replace function att_patch(p_student bigint, p_ym text, p_set jsonb, p_del text[])
returns void language plpgsql security invoker set search_path = public as $$
declare c jsonb;
begin
  insert into attendance_cells as a (student_id, ym, cells, updated_by, updated_at)
  values (p_student, p_ym, coalesce(p_set, '{}'::jsonb) - coalesce(p_del, '{}'::text[]), auth.uid(), now())
  on conflict (student_id, ym) do update
    set cells = (a.cells || coalesce(p_set, '{}'::jsonb)) - coalesce(p_del, '{}'::text[]),
        updated_by = auth.uid(), updated_at = now()
  returning cells into c;
  if c = '{}'::jsonb then delete from attendance_cells where student_id = p_student and ym = p_ym; end if;
end $$;
grant execute on function att_patch(bigint, text, jsonb, text[]) to authenticated;
revoke execute on function att_patch(bigint, text, jsonb, text[]) from anon, public;

-- 다음 단계(실시간 반영)용: 출석부 칸이 바뀌면 알림을 보냄
do $$ begin
  alter publication supabase_realtime add table attendance_cells;
exception when duplicate_object then null; end $$;
