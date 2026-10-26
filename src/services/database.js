export function databaseError(error, action = '데이터를 처리') {
  if (['42P01', 'PGRST205', 'PGRST202'].includes(error?.code)) {
    return new Error('저장 서비스 설정을 확인하는 중이에요. 잠시 후 다시 시도해 주세요.');
  }
  if (error?.code === '42501' || error?.code === 'PGRST301' || error?.status === 401) {
    return new Error('데이터 접근 권한을 확인하지 못했어요. 다시 로그인한 뒤 시도해 주세요.');
  }
  return new Error(`${action}하지 못했어요. 연결을 확인하고 다시 시도해 주세요.`);
}

// Supabase의 기본 최대 반환 개수에 잘리지 않도록 모든 페이지를 읽습니다.
export async function readAllPages(query, pageSize = 200) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) throw databaseError(error, '기록을 불러오');
    if (!Array.isArray(data)) throw new Error('서버 데이터 형식을 확인하지 못했어요.');
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}
