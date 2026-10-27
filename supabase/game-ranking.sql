-- 60초 분리배출 게임: Supabase SQL Editor에서 전체 실행합니다.
-- 기존 회원·품목·기록·통계·RLS는 변경하지 않습니다.
begin;
create table if not exists public.disposal_game_questions (
 id text primary key, bin text not null check(bin in ('pet','plastic','paper','carton','glass','metal','vinyl','foam','general'))
);
insert into public.disposal_game_questions(id,bin) values
('water','pet'),
('colored-pet','plastic'),
('plastic','plastic'),
('shampoo','plastic'),
('box','paper'),
('print','paper'),
('milk','carton'),
('glass','glass'),
('can','metal'),
('tin','metal'),
('snack','vinyl'),
('bag','vinyl'),
('foam','foam'),
('receipt','general'),
('tissue','general'),
('dirty-film','general')
on conflict(id) do update set bin=excluded.bin;

create table if not exists public.disposal_game_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 started_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default (clock_timestamp()+interval '60 seconds'),
 questions jsonb not null,
 answers jsonb not null default '[]'::jsonb
);
create index if not exists disposal_game_sessions_owner_time on public.disposal_game_sessions(user_id,started_at desc);
create table if not exists public.disposal_game_scores (
 session_id uuid primary key references public.disposal_game_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null check(char_length(btrim(display_name)) between 2 and 20),
 correct integer not null check(correct between 0 and 240),
 answered integer not null check(answered between correct and 240),
 created_at timestamptz not null default clock_timestamp()
);
create index if not exists disposal_game_scores_owner on public.disposal_game_scores(user_id);
alter table public.disposal_game_questions enable row level security;
alter table public.disposal_game_sessions enable row level security;
alter table public.disposal_game_scores enable row level security;
revoke all on public.disposal_game_questions,public.disposal_game_sessions,public.disposal_game_scores from public,anon,authenticated;

-- 내부 함수: 원시 사용자 ID와 이메일은 응답하지 않습니다.
create or replace function public.disposal_game_payload(p_session public.disposal_game_sessions)
returns jsonb language sql volatile set search_path='' as $$
 select jsonb_build_object('id',p_session.id,'remaining_ms',greatest(0,extract(epoch from (p_session.expires_at-clock_timestamp()))*1000),
 'answered',jsonb_array_length(p_session.answers),
 'correct',(select count(*) from jsonb_array_elements(p_session.answers) a where (a->>'correct')::boolean),
 'question',p_session.questions->jsonb_array_length(p_session.answers),
 'answers',p_session.answers,
 'finished',clock_timestamp()>=p_session.expires_at or jsonb_array_length(p_session.answers)>=jsonb_array_length(p_session.questions));
$$;
revoke all on function public.disposal_game_payload(public.disposal_game_sessions) from public,anon,authenticated;

create or replace function public.start_disposal_game()
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.disposal_game_sessions; qs jsonb:='[]'::jsonb; uid uuid:=auth.uid(); q record; bins jsonb; previous_id text:='';
begin
 if uid is null then raise exception '로그인이 필요해요.'; end if;
 -- 동일 계정의 동시 시작을 직렬화합니다.
 perform 1 from auth.users where id=uid for update;
 if exists(select 1 from public.disposal_game_sessions where user_id=uid and started_at>clock_timestamp()-interval '3 seconds') then
  raise exception '잠시 후 다시 시작해 주세요.';
 end if;
 -- 정답은 세션 발급 응답에 포함하지 않고 다음 문제만 전달합니다.
 for i in 1..240 loop
  select id,bin into q from public.disposal_game_questions where id<>previous_id order by random() limit 1;
  select jsonb_agg(b.bin order by random()) into bins from (
   select q.bin as bin union all
   (select v.bin from unnest(array['pet','plastic','paper','carton','glass','metal','vinyl','foam','general']) v(bin)
    where v.bin<>q.bin order by random() limit 3)
  ) b;
  qs:=qs||jsonb_build_array(jsonb_build_object('id',q.id,'options',bins));
  previous_id:=q.id;
 end loop;
 if qs is null then raise exception '게임 문제를 준비하지 못했어요.'; end if;
 insert into public.disposal_game_sessions(user_id,questions) values(uid,qs) returning * into s;
 return public.disposal_game_payload(s);
end $$;

create or replace function public.get_disposal_game(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.disposal_game_sessions;
begin
 select * into s from public.disposal_game_sessions where id=p_session_id and user_id=auth.uid();
 if not found then raise exception '현재 계정의 게임을 찾지 못했어요.'; end if;
 return public.disposal_game_payload(s);
end $$;

create or replace function public.answer_disposal_game(p_session_id uuid,p_index integer,p_bin text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.disposal_game_sessions; q jsonb; expected text; n integer;
begin
 select * into s from public.disposal_game_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not found then raise exception '현재 계정의 게임을 찾지 못했어요.'; end if;
 n:=jsonb_array_length(s.answers);
 -- 이미 처리한 동일 요청은 다시 채점하지 않습니다. 네트워크 재시도를 지원합니다.
 if p_index=n-1 and s.answers->p_index->>'bin'=p_bin then return public.disposal_game_payload(s); end if;
 if p_index is null or p_index<>n then raise exception '문제 순서를 확인해 주세요.'; end if;
 if clock_timestamp()>=s.expires_at or n>=jsonb_array_length(s.questions) then return public.disposal_game_payload(s); end if;
 q:=s.questions->n;
 if p_bin is null or not (q->'options' ? p_bin) then raise exception '표시된 배출함 중에서 선택해 주세요.'; end if;
 select bin into expected from public.disposal_game_questions where id=q->>'id';
 update public.disposal_game_sessions set answers=answers||jsonb_build_array(jsonb_build_object(
  'questionId',q->>'id','bin',p_bin,'correct',p_bin=expected,'correctBin',expected)) where id=s.id returning * into s;
 return public.disposal_game_payload(s);
end $$;

create or replace function public.publish_disposal_game(p_session_id uuid,p_display_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.disposal_game_sessions; c integer; n integer;
begin
 select * into s from public.disposal_game_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not found then raise exception '현재 계정의 게임을 찾지 못했어요.'; end if;
 if p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 20 or p_display_name~'[[:cntrl:]]' then
  raise exception '공개 이름은 2~20자로 입력해 주세요.';
 end if;
 n:=jsonb_array_length(s.answers);
 if clock_timestamp()<s.expires_at and n<jsonb_array_length(s.questions) then raise exception '게임이 끝난 뒤 등록해 주세요.'; end if;
 if n=0 then raise exception '한 문제 이상 푼 기록만 등록할 수 있어요.'; end if;
 select count(*) into c from jsonb_array_elements(s.answers) a where (a->>'correct')::boolean;
 insert into public.disposal_game_scores(session_id,user_id,display_name,correct,answered)
 values(s.id,s.user_id,btrim(p_display_name),c,n) on conflict(session_id) do nothing;
 return jsonb_build_object('correct',c,'answered',n,'published',true);
end $$;

create or replace function public.disposal_game_leaderboard()
returns table(rank bigint,display_name text,correct integer,answered integer,created_at timestamptz,is_me boolean)
language sql stable security definer set search_path='' as $$
 with best as (
  select distinct on (s.user_id) s.* from public.disposal_game_scores s
  order by s.user_id,s.correct desc,(s.answered-s.correct),s.created_at,s.session_id
 ), ranked as (
  select row_number() over(order by b.correct desc,(b.answered-b.correct),b.created_at,b.session_id) as place,b.* from best b
 )
 select r.place,r.display_name,r.correct,r.answered,r.created_at,coalesce(r.user_id=auth.uid(),false)
 from ranked r order by r.place limit 20;
$$;
revoke all on function public.start_disposal_game(),public.get_disposal_game(uuid),public.answer_disposal_game(uuid,integer,text),public.publish_disposal_game(uuid,text),public.disposal_game_leaderboard() from public,anon,authenticated;
grant execute on function public.start_disposal_game(),public.get_disposal_game(uuid),public.answer_disposal_game(uuid,integer,text),public.publish_disposal_game(uuid,text) to authenticated;
grant execute on function public.disposal_game_leaderboard() to anon,authenticated;
notify pgrst,'reload schema';
commit;
