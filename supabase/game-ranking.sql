-- 60초 분리배출 게임: Supabase SQL Editor에서 전체 실행합니다.
-- 기존 회원·품목·기록·통계·RLS는 변경하지 않습니다.
begin;
create table if not exists public.disposal_game_questions (
 id text primary key, bin text not null check(bin in ('pet','plastic','paper','carton','glass','metal','vinyl','foam','general'))
);
alter table public.disposal_game_questions add column if not exists item_key text;
alter table public.disposal_game_questions add column if not exists active boolean not null default true;
update public.disposal_game_questions set item_key=id where item_key is null;
insert into public.disposal_game_questions(id,bin,item_key,active) values
('water','pet','투명생수병',true),
('colored-pet','plastic','유색음료페트병',true),
('plastic','plastic','두부용기',true),
('shampoo','plastic','샴푸통',true),
('box','paper','종이상자',true),
('print','paper','프린트물',true),
('milk','carton','우유팩',true),
('glass','glass','유리잼병',true),
('can','metal','음료캔',true),
('tin','metal','참치캔',true),
('snack','vinyl','과자봉지',true),
('bag','vinyl','비닐봉투',true),
('foam','foam','스티로폼상자',true),
('receipt','general','감열영수증',true),
('tissue','general','사용한휴지',true),
('dirty-film','general','과자봉지',true),
('catalog-식용유페트병','plastic','식용유페트병',true),
('catalog-세제페트병','plastic','세제페트병',true),
('catalog-두유팩','carton','두유팩',true),
('catalog-주스팩','carton','주스팩',true),
('catalog-멸균우유팩','carton','멸균우유팩',true),
('catalog-사이다캔','metal','사이다캔',true),
('catalog-커피캔','metal','커피캔',true),
('catalog-에너지음료캔','metal','에너지음료캔',true),
('catalog-옥수수통조림캔','metal','옥수수통조림캔',true),
('catalog-햄통조림캔','metal','햄통조림캔',true),
('catalog-고등어통조림캔','metal','고등어통조림캔',true),
('catalog-분유캔','metal','분유캔',true),
('catalog-유리소스병','glass','유리소스병',true),
('catalog-유리음료병','glass','유리음료병',true),
('catalog-유리커피병','glass','유리커피병',true),
('catalog-플라스틱요거트용기','plastic','플라스틱요거트용기',true),
('catalog-플라스틱푸딩컵','plastic','플라스틱푸딩컵',true),
('catalog-플라스틱아이스크림통','plastic','플라스틱아이스크림통',true),
('catalog-플라스틱딸기용기','plastic','플라스틱딸기용기',true),
('catalog-플라스틱방울토마토용기','plastic','플라스틱방울토마토용기',true),
('catalog-플라스틱계란판','plastic','플라스틱계란판',true),
('catalog-플라스틱샐러드용기','plastic','플라스틱샐러드용기',true),
('catalog-플라스틱즉석밥용기','plastic','플라스틱즉석밥용기',true),
('catalog-플라스틱국물용기','plastic','플라스틱국물용기',true),
('catalog-플라스틱배달뚜껑','plastic','플라스틱배달뚜껑',true),
('catalog-플라스틱테이크아웃컵','plastic','플라스틱테이크아웃컵',true),
('catalog-라면봉지','vinyl','라면봉지',true),
('catalog-빵봉지','vinyl','빵봉지',true),
('catalog-비닐쌀포대','vinyl','비닐쌀포대',true),
('catalog-냉동식품비닐봉지','vinyl','냉동식품비닐봉지',true),
('catalog-김비닐포장지','vinyl','김비닐포장지',true),
('catalog-비닐택배봉투','vinyl','비닐택배봉투',true),
('catalog-뽁뽁이','vinyl','뽁뽁이',true),
('catalog-비닐에어쿠션','vinyl','비닐에어쿠션',true),
('catalog-비닐리필세제봉투','vinyl','비닐리필세제봉투',true),
('catalog-지퍼백','vinyl','지퍼백',true),
('catalog-비닐위생봉투','vinyl','비닐위생봉투',true),
('catalog-비닐우산포장','vinyl','비닐우산포장',true),
('catalog-비닐화장지포장','vinyl','비닐화장지포장',true),
('catalog-종이과자상자','paper','종이과자상자',true),
('catalog-종이시리얼상자','paper','종이시리얼상자',true),
('catalog-종이티슈상자','paper','종이티슈상자',true),
('catalog-종이우유팩묶음상자','paper','종이우유팩묶음상자',true),
('catalog-종이계란판','paper','종이계란판',true),
('catalog-종이봉투','paper','종이봉투',true),
('catalog-교과서','paper','교과서',true),
('catalog-종이잡지','paper','종이잡지',true),
('catalog-종이카탈로그','paper','종이카탈로그',true),
('catalog-종이달력','paper','종이달력',true),
('catalog-스프링노트','paper','스프링노트',true),
('catalog-종이컵홀더','paper','종이컵홀더',true),
('catalog-화장지심','paper','화장지심',true),
('catalog-종이완충재','paper','종이완충재',true),
('catalog-감열택배송장','general','감열택배송장',true),
('catalog-인화사진','general','인화사진',true),
('catalog-베이킹종이호일','general','베이킹종이호일',true),
('catalog-사용한키친타월','general','사용한키친타월',true),
('catalog-소주팩','carton','소주팩',true),
('catalog-크림종이팩','carton','크림종이팩',true),
('catalog-액상커피종이팩','carton','액상커피종이팩',true),
('catalog-비닐코팅없는포장지','paper','비닐코팅없는포장지',true),
('catalog-종이명함','paper','종이명함',true),
('catalog-종이메모지','paper','종이메모지',true),
('catalog-비닐코팅광고지','general','비닐코팅광고지',true),
('catalog-알루미늄박보냉종이상자','general','알루미늄박보냉종이상자',true),
('catalog-금속박종이포장지','general','금속박종이포장지',true),
('catalog-유리꿀병','glass','유리꿀병',true),
('catalog-유리올리브병','glass','유리올리브병',true),
('catalog-유리식용유병','glass','유리식용유병',true),
('catalog-유리우유병','glass','유리우유병',true),
('catalog-양주유리병','glass','양주유리병',true),
('catalog-과일통조림캔','metal','과일통조림캔',true),
('catalog-토마토통조림캔','metal','토마토통조림캔',true),
('catalog-반려동물사료캔','metal','반려동물사료캔',true),
('catalog-버터쿠키금속통','metal','버터쿠키금속통',true),
('catalog-흰색스티로폼생선상자','foam','흰색스티로폼생선상자',true),
('catalog-TV스티로폼완충재','foam','tv스티로폼완충재',true),
('catalog-플라스틱바디워시통','plastic','플라스틱바디워시통',true),
('catalog-플라스틱세탁세제통','plastic','플라스틱세탁세제통',true),
('catalog-플라스틱섬유유연제통','plastic','플라스틱섬유유연제통',true),
('catalog-플라스틱로션통','plastic','플라스틱로션통',true),
('catalog-플라스틱알약병','plastic','플라스틱알약병',true),
('catalog-플라스틱아이스크림뚜껑','plastic','플라스틱아이스크림뚜껑',true),
('catalog-비닐팽이버섯봉지','vinyl','비닐팽이버섯봉지',true),
('catalog-비닐커피원두봉투','vinyl','비닐커피원두봉투',true),
('catalog-비닐과일봉지','vinyl','비닐과일봉지',true),
('catalog-비닐떡포장지','vinyl','비닐떡포장지',true),
('catalog-비닐치즈포장지','vinyl','비닐치즈포장지',true),
('catalog-비닐물티슈겉포장','vinyl','비닐물티슈겉포장',true),
('catalog-플라스틱물티슈캡','plastic','플라스틱물티슈캡',true),
('catalog-플라스틱식품보관통','plastic','플라스틱식품보관통',true),
('catalog-필름포장플라스틱반찬용기','plastic','필름포장플라스틱반찬용기',true),
('catalog-필름포장플라스틱도시락용기','plastic','필름포장플라스틱도시락용기',true),
('catalog-필름포장플라스틱젤리컵','plastic','필름포장플라스틱젤리컵',true),
('catalog-필름포장플라스틱과일트레이','plastic','필름포장플라스틱과일트레이',true),
('catalog-랩포장플라스틱정육트레이','plastic','랩포장플라스틱정육트레이',true),
('catalog-랩포장플라스틱생선트레이','plastic','랩포장플라스틱생선트레이',true),
('catalog-랩포장플라스틱버섯트레이','plastic','랩포장플라스틱버섯트레이',true),
('catalog-랩포장플라스틱채소트레이','plastic','랩포장플라스틱채소트레이',true),
('catalog-랩포장스티로폼정육트레이','foam','랩포장스티로폼정육트레이',true),
('catalog-랩포장스티로폼생선트레이','foam','랩포장스티로폼생선트레이',true),
('catalog-랩포장스티로폼과일트레이','foam','랩포장스티로폼과일트레이',true),
('catalog-비닐창종이빵봉투','paper','비닐창종이빵봉투',true),
('catalog-연필','general','연필',true),
('catalog-색연필','general','색연필',true),
('catalog-형광펜','general','형광펜',true),
('catalog-네임펜','general','네임펜',true),
('catalog-유성매직','general','유성매직',true),
('catalog-보드마카','general','보드마카',true),
('catalog-지우개','general','지우개',true),
('catalog-크레파스','general','크레파스',true),
('catalog-분필','general','분필',true),
('catalog-파스텔','general','파스텔',true),
('catalog-붓','general','붓',true),
('catalog-만년필','general','만년필',true)
on conflict(id) do update set bin=excluded.bin,item_key=excluded.item_key,active=true;

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
 select jsonb_build_object('pool_version','2026-10-27.unique-v2','id',p_session.id,'remaining_ms',greatest(0,extract(epoch from (p_session.expires_at-clock_timestamp()))*1000),
 'answered',jsonb_array_length(p_session.answers),
 'correct',(select count(*) from jsonb_array_elements(p_session.answers) a where (a->>'correct')::boolean),
 'question',p_session.questions->jsonb_array_length(p_session.answers),
 'answers',p_session.answers,
 'finished',clock_timestamp()>=p_session.expires_at or jsonb_array_length(p_session.answers)>=jsonb_array_length(p_session.questions));
$$;
revoke all on function public.disposal_game_payload(public.disposal_game_sessions) from public,anon,authenticated;

create or replace function public.start_disposal_game_v2()
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.disposal_game_sessions; qs jsonb:='[]'::jsonb; uid uuid:=auth.uid(); q record; bins jsonb;
begin
 if uid is null then raise exception '로그인이 필요해요.'; end if;
 -- 동일 계정의 동시 시작을 직렬화합니다.
 perform 1 from auth.users where id=uid for update;
 if exists(select 1 from public.disposal_game_sessions where user_id=uid and started_at>clock_timestamp()-interval '3 seconds') then
  raise exception '잠시 후 다시 시작해 주세요.';
 end if;
 -- 정답은 세션 발급 응답에 포함하지 않고 다음 문제만 전달합니다.
 for q in
  select picked.* from (
   select distinct on (item_key) id,bin,item_key from public.disposal_game_questions
   where active order by item_key,random()
  ) picked order by random() limit 240
 loop
  select jsonb_agg(b.bin order by random()) into bins from (
   select q.bin as bin union all
   (select v.bin from unnest(array['pet','plastic','paper','carton','glass','metal','vinyl','foam','general']) v(bin)
    where v.bin<>q.bin order by random() limit 3)
  ) b;
  qs:=qs||jsonb_build_array(jsonb_build_object('id',q.id,'options',bins));
 end loop;
 if jsonb_array_length(qs)<4 then raise exception '게임 문제를 준비하지 못했어요.'; end if;
 insert into public.disposal_game_sessions(user_id,questions) values(uid,qs) returning * into s;
 return public.disposal_game_payload(s);
end $$;

-- 이전 화면은 확장된 문제 ID를 표시할 수 없어 새로고침을 안내합니다.
create or replace function public.start_disposal_game()
returns jsonb language plpgsql security definer set search_path='' as $$
begin raise exception '게임 문제가 업데이트됐어요. 페이지를 새로고침한 뒤 시작해 주세요.'; end $$;

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
revoke all on function public.start_disposal_game(),public.start_disposal_game_v2(),public.get_disposal_game(uuid),public.answer_disposal_game(uuid,integer,text),public.publish_disposal_game(uuid,text),public.disposal_game_leaderboard() from public,anon,authenticated;
grant execute on function public.start_disposal_game(),public.start_disposal_game_v2(),public.get_disposal_game(uuid),public.answer_disposal_game(uuid,integer,text),public.publish_disposal_game(uuid,text) to authenticated;
grant execute on function public.disposal_game_leaderboard() to anon,authenticated;
notify pgrst,'reload schema';
commit;
