-- AI가 한 번 답한 미등록 물품을 모든 사용자가 함께 쓰는 공용 저장소입니다. 여러 번 실행해도 안전합니다.
-- 읽기: 누구나(숨김 제외). 쓰기: 서버 함수(service_role)만. 브라우저에서는 쓸 수 없습니다.
-- 같은 물건의 다른 이름(별칭)도 각각 한 줄로 저장하고 canonical_key로 원래 이름을 가리킵니다.
begin;

create table if not exists public.ai_item_guesses (
  name_key text primary key check (char_length(name_key) between 1 and 40),
  canonical_key text not null check (char_length(canonical_key) between 1 and 40),
  display_name text not null check (char_length(display_name) between 1 and 40),
  material text not null check (char_length(material) between 1 and 20),
  item_type text not null default '' check (char_length(item_type) <= 30),
  route text not null check (route in ('recyclable', 'general', 'large', 'hazardous', 'unknown')),
  confidence text not null check (confidence in ('high', 'medium')),
  reason text not null default '' check (char_length(reason) <= 160),
  model text not null default '' check (char_length(model) <= 60),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ai_item_guesses enable row level security;
revoke all on table public.ai_item_guesses from anon, authenticated;
grant select on table public.ai_item_guesses to anon, authenticated;
grant select, insert, update, delete on table public.ai_item_guesses to service_role;

drop policy if exists "공개 AI 추정 읽기" on public.ai_item_guesses;
create policy "공개 AI 추정 읽기" on public.ai_item_guesses for select to anon, authenticated using (not hidden);

notify pgrst, 'reload schema';
commit;
