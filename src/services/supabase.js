import { fetchWithTimeout } from '../utils/network.js';
// 브라우저에 배포하는 공개 설정입니다. Secret / service_role 키는 사용하지 않습니다.
export const SUPABASE_URL = 'https://phutcroispzgqqtrpgjn.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Nsgi1mZDLLb5lJofeJe4Ww_C6e8SnW8';

let pending;
// 공개 인증 설정만 조회합니다. Google Client Secret은 브라우저에 두지 않습니다.
export async function isGoogleLoginEnabled() {
  try {
    const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } });
    if (!response.ok) throw new Error('설정 조회 실패');
    const settings = await response.json();
    return settings.external?.google === true;
  } catch { throw new Error('Google 로그인 설정을 확인하지 못했어요. 네트워크 상태를 확인하고 잠시 후 다시 시도해 주세요.'); }
}

export function getSupabase() {
  if (!pending) {
    pending = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { fetch: fetchWithTimeout },
      })).catch(() => {
        pending = undefined;
        throw new Error('인증 서비스에 연결하지 못했어요. 네트워크 연결을 확인하고 새로고침해 주세요.');
      });
  }
  return pending;
}
