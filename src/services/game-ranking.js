import { getCurrentMember } from './auth.js';
import { getSupabase } from './supabase.js';
import { databaseError } from './database.js';

export function createGameRanking({ getClient=getSupabase, getMember=getCurrentMember }={}) {
  async function rpc(name,args={},memberRequired=true) {
    const owner=getMember()?.id || null;
    if(memberRequired && !owner) throw new Error('랭킹 도전은 로그인 후 이용해 주세요. 비회원은 혼자 연습할 수 있어요.');
    const check=()=>{if((getMember()?.id || null)!==owner) throw new Error('계정이 변경됐어요. 현재 계정으로 게임을 다시 시작해 주세요.');};
    const client=await getClient(); check();
    const {data,error}=await client.rpc(name,args); check();
    if(error) {
      if(['PGRST202','PGRST205','42883','42P01'].includes(error.code)) throw new Error('공동 랭킹을 준비 중이에요. 관리자가 게임 DB 설정 SQL을 실행해야 해요. 혼자 연습은 바로 가능해요.');
      if(error.code==='P0001') throw new Error(error.message);
      throw databaseError(error,'게임 정보를 처리');
    }
    return data;
  }
  return {
    start:()=>rpc('start_disposal_game_v2'),
    answer:(id,index,bin)=>rpc('answer_disposal_game',{p_session_id:id,p_index:index,p_bin:bin}),
    state:id=>rpc('get_disposal_game',{p_session_id:id}),
    submit:(id,name)=>rpc('publish_disposal_game',{p_session_id:id,p_display_name:name.trim()}),
    list:()=>rpc('disposal_game_leaderboard',{},false),
  };
}
export const gameRanking=createGameRanking();
