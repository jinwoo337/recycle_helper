-- 기존 기록·회원·품목을 지우지 않는 편의 기능 추가 마이그레이션입니다.
begin;
create table if not exists public.disposal_favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 80),
  input jsonb not null check (jsonb_typeof(input) = 'object' and input ? 'itemName'
    and char_length(input->>'itemName') between 1 and 80 and octet_length(input::text) <= 65536),
  created_at timestamptz not null default now(),
  primary key(user_id,item_key)
);
create table if not exists public.disposal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('correction','missing_item')),
  item_name text not null check (char_length(btrim(item_name)) between 1 and 80),
  input jsonb not null check (jsonb_typeof(input) = 'object' and input ? 'itemName' and input->>'itemName' = item_name and octet_length(input::text) <= 65536),
  result jsonb check (result is null or (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 65536)),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','reviewed','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists disposal_feedback_owner_time on public.disposal_feedback(user_id,created_at desc);
alter table public.disposal_favorites enable row level security;
alter table public.disposal_feedback enable row level security;
revoke all on public.disposal_favorites, public.disposal_feedback from anon, authenticated;
grant select, insert, update, delete on public.disposal_favorites to authenticated;
grant select, insert on public.disposal_feedback to authenticated;
grant all on public.disposal_favorites, public.disposal_feedback to service_role;
drop policy if exists favorites_own on public.disposal_favorites;
create policy favorites_own on public.disposal_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists feedback_read_own on public.disposal_feedback;
create policy feedback_read_own on public.disposal_feedback for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists feedback_pending_own on public.disposal_feedback;
create policy feedback_pending_own on public.disposal_feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

-- 저장된 category 컬럼이나 과거 결과를 다시 쓰지 않고 음식물류 통계를 확장합니다.
create or replace function public.get_disposal_statistics(p_owner uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise insufficient_privilege; end if;
  return jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(kind, amount) from (
      select case when input->>'material' = '음식물류' and result->>'status' = 'recycle' then 'food' else category end as kind,
        count(*) as amount from public.disposal_records where user_id = p_owner group by 1
    ) grouped), '{}'::jsonb),
    'legacy_count', (select count(*) from public.disposal_legacy_names l where l.user_id = p_owner
      and not exists (select 1 from public.disposal_records r where r.user_id = p_owner and r.item_name = l.item_name))
  );
end;
$$;
revoke all on function public.get_disposal_statistics(uuid) from public, anon;
grant execute on function public.get_disposal_statistics(uuid) to authenticated;
insert into public.disposal_items(id,aliases,material,item_type,note) values
('catalog-022', ARRAY['밥','남은밥','국수','면'], '음식물류', 'soft', '포장재·뼈 등 이물질을 제거하고 지역 음식물 수거 방식을 확인해 주세요.'),
('catalog-023', ARRAY['사과껍질','바나나껍질','수박껍질'], '음식물류', 'soft', '단단한 씨앗과 포장재를 분리하고 지역 안내를 확인해 주세요.'),
('catalog-024', ARRAY['달걀껍데기','달걀껍질','계란껍질','계란껍데기','조개껍데기','닭뼈','생선뼈','복숭아씨'], '음식물류', 'excluded', '실제 재질 표시를 확인해 주세요. 오염과 결합 상태는 직접 선택해 주세요.'),
('catalog-025', ARRAY['음식물','과일껍질','채소찌꺼기'], '음식물류', '', '단단한 껍데기·뼈·씨앗 포함 여부를 확인한 뒤 종류를 선택해 주세요.')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
commit;
