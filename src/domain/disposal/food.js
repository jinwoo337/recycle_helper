// 서울시·금천구 공개 안내에서 확인한 제한된 음식물류 범위입니다.
export const FOOD_SOURCE = 'https://geumcheon.go.kr/portal/contents.do?key=818';
export function judgeFood(part) {
  if (part.type === 'excluded') return { status: 'general', method: '음식물 수거 제외 · 지역 일반폐기물 기준 확인',
    reasons: ['단단한 뼈·껍데기·씨앗 등은 음식물 자원화에 적합하지 않은 품목이에요.'],
    steps: ['먹을 수 있는 음식물과 따로 분리해 주세요.', '날카로운 뼈·껍데기는 다치지 않게 감싸 주세요.', '지역의 종량제봉투 등 일반폐기물 배출 기준을 확인해 주세요.'] };
  if (part.type !== 'soft' || part.foodSeparated !== 'yes') return { status: 'check', method: '음식물 종류와 이물질 분리 상태 확인 필요',
    reasons: [part.type !== 'soft' ? '단단한 껍데기·뼈·씨앗 등의 포함 여부를 확인해야 해요.' : '비닐·이쑤시개·뼈 등 음식물이 아닌 물질의 제거 여부가 확인되지 않았어요.'],
    steps: ['음식물 종류를 확인하고 포장·뼈·껍데기 등 수거 제외 물질을 따로 분리해 주세요.', '분리하기 어렵거나 품목이 불확실하면 거주지 수거 안내를 확인해 주세요.'] };
  return { status: 'recycle', method: '음식물류로 분리배출 · 지역 수거 방식 확인',
    reasons: ['확인된 부드러운 음식물이며 수거 제외 물질을 제거했다고 입력했어요.'],
    steps: ['비닐·이쑤시개·단단한 뼈·껍데기가 섞이지 않았는지 다시 확인해 주세요.', '국물과 물기를 최대한 제거해 주세요.', '거주지의 음식물 전용 봉투·전용 용기·RFID 수거 방식에 맞춰 배출해 주세요.'] };
}
