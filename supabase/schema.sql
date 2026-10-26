-- Supabase SQL Editor에서 실행합니다. 기존 사용자나 판별 기록을 삭제하지 않습니다.
begin;

create table if not exists public.disposal_items (
  id text primary key,
  aliases text[] not null check (cardinality(aliases) > 0),
  material text not null,
  item_type text not null default '',
  note text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.disposal_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  item_name text not null check (char_length(btrim(item_name)) between 1 and 80),
  input jsonb not null check (jsonb_typeof(input) = 'object' and input ? 'itemName' and input->>'itemName' = item_name),
  result jsonb not null check (jsonb_typeof(result) = 'object'
    and result ?& array['status','method','steps','reasons','parts','ruleVersion','notice']
    and result->>'status' in ('recycle','general','mixed','check')
    and jsonb_typeof(result->'steps') = 'array' and jsonb_typeof(result->'reasons') = 'array'
    and jsonb_typeof(result->'parts') = 'array'),
  created_at timestamptz not null default now(),
  rule_version text generated always as (result->>'ruleVersion') stored,
  category text generated always as (
    case when result->>'status' = 'check' then 'check'
      when result->>'status' = 'general' then 'general'
      when result->>'status' = 'mixed' then 'mixed'
      when input->>'material' = '페트병' then case when input->>'type' = 'clear-drink' then 'pet' else 'plastic' end
      when input->>'material' = '종이' then case when input->>'type' = 'carton' then 'carton' else 'paper' end
      when input->>'material' = '플라스틱' then 'plastic'
      when input->>'material' = '유리' then 'glass'
      when input->>'material' = '금속·캔' then 'can'
      when input->>'material' = '비닐' then 'vinyl'
      when input->>'material' = '스티로폼' then 'foam'
      else 'check' end
  ) stored,
  primary key (user_id, id),
  check (octet_length(input::text) <= 65536 and octet_length(result::text) <= 65536)
);
create index if not exists disposal_records_owner_time on public.disposal_records(user_id, created_at desc, id desc);

create table if not exists public.disposal_legacy_names (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_name text not null check (char_length(btrim(item_name)) between 1 and 80),
  primary key (user_id, item_name)
);
-- 삭제한 이전 기록이 다음 로그인·다른 탭의 재시도로 되살아나지 않도록 남기는 이전 이력입니다.
create table if not exists public.disposal_import_receipts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  import_key text not null check (char_length(import_key) between 1 and 160),
  imported_at timestamptz not null default now(),
  primary key (user_id, import_key)
);

alter table public.disposal_items enable row level security;
alter table public.disposal_records enable row level security;
alter table public.disposal_legacy_names enable row level security;
alter table public.disposal_import_receipts enable row level security;

revoke all on public.disposal_items, public.disposal_records, public.disposal_legacy_names, public.disposal_import_receipts from anon, authenticated;
grant select on public.disposal_items to anon, authenticated;
grant select, insert, delete on public.disposal_records, public.disposal_legacy_names to authenticated;
grant select, insert on public.disposal_import_receipts to authenticated;
grant all on public.disposal_items, public.disposal_records, public.disposal_legacy_names, public.disposal_import_receipts to service_role;

drop policy if exists catalog_public_read on public.disposal_items;
create policy catalog_public_read on public.disposal_items for select to anon, authenticated using (active);
drop policy if exists records_read_own on public.disposal_records;
create policy records_read_own on public.disposal_records for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists records_insert_own on public.disposal_records;
create policy records_insert_own on public.disposal_records for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists records_delete_own on public.disposal_records;
create policy records_delete_own on public.disposal_records for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists legacy_read_own on public.disposal_legacy_names;
create policy legacy_read_own on public.disposal_legacy_names for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists legacy_insert_own on public.disposal_legacy_names;
create policy legacy_insert_own on public.disposal_legacy_names for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists legacy_delete_own on public.disposal_legacy_names;
create policy legacy_delete_own on public.disposal_legacy_names for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists imports_read_own on public.disposal_import_receipts;
create policy imports_read_own on public.disposal_import_receipts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists imports_insert_own on public.disposal_import_receipts;
create policy imports_insert_own on public.disposal_import_receipts for insert to authenticated with check (user_id = (select auth.uid()));

create or replace function public.import_disposal_history(p_owner uuid, p_records jsonb, p_names jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare r jsonb; n text;
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise insufficient_privilege; end if;
  for r in select value from jsonb_array_elements(p_records) loop
    insert into public.disposal_import_receipts(user_id, import_key) values (p_owner, 'record:' || (r->>'id')) on conflict do nothing;
    if found then
      insert into public.disposal_records(user_id,id,item_name,input,result,created_at)
        values (p_owner,(r->>'id')::uuid,r->>'item_name',r->'input',r->'result',(r->>'created_at')::timestamptz) on conflict do nothing;
    end if;
  end loop;
  for n in select value from jsonb_array_elements_text(p_names) loop
    insert into public.disposal_import_receipts(user_id, import_key) values (p_owner, 'name:' || n) on conflict do nothing;
    if found then
      insert into public.disposal_legacy_names(user_id,item_name) values (p_owner,n) on conflict do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.delete_disposal_history(p_owner uuid, p_id uuid default null, p_legacy_name text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare removed_name text;
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise insufficient_privilege; end if;
  if p_id is not null then
    delete from public.disposal_records where user_id = p_owner and id = p_id returning item_name into removed_name;
    delete from public.disposal_legacy_names where user_id = p_owner and item_name = removed_name;
  elsif p_legacy_name is not null then
    delete from public.disposal_legacy_names where user_id = p_owner and item_name = p_legacy_name;
  end if;
end;
$$;

create or replace function public.clear_disposal_history(p_owner uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise insufficient_privilege; end if;
  delete from public.disposal_records where user_id = p_owner;
  delete from public.disposal_legacy_names where user_id = p_owner;
end;
$$;

create or replace function public.get_disposal_statistics(p_owner uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise insufficient_privilege; end if;
  return jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(category, amount) from (
      select category, count(*) as amount from public.disposal_records where user_id = p_owner group by category
    ) grouped), '{}'::jsonb),
    'legacy_count', (select count(*) from public.disposal_legacy_names l where l.user_id = p_owner
      and not exists (select 1 from public.disposal_records r where r.user_id = p_owner and r.item_name = l.item_name))
  );
end;
$$;

revoke all on function public.import_disposal_history(uuid,jsonb,jsonb), public.delete_disposal_history(uuid,uuid,text), public.clear_disposal_history(uuid), public.get_disposal_statistics(uuid) from public, anon;
grant execute on function public.import_disposal_history(uuid,jsonb,jsonb), public.delete_disposal_history(uuid,uuid,text), public.clear_disposal_history(uuid), public.get_disposal_statistics(uuid) to authenticated;

commit;
