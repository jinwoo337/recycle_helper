import { lookupItem, normalizeItemName } from './item-suggestions.js';

// 오염이 없다는 답만으로 파손·기능 상태까지 양호하다고 판단하지 않습니다.
export function reuseAdvice(input = {}, result = {}) {
  const name = normalizeItemName(input.itemName || '');
  const item = lookupItem(input.itemName || '');
  const handling = result.handling || item?.handling || input.category;
  if (!name || /깨진|깨짐|파손|부푼|누액|곰팡이|일회용|배달|농약|세제|락스|약품/.test(name)
      || ['dirty', 'washed-dirty'].includes(input.currentState) || input.contaminated === 'yes'
      || input.type === 'broken' || ['damaged', 'unusable'].includes(input.handlingCondition)) return null;
  const category = input.category || handling;
  const allowed = ['clothing', 'bedding', 'large', 'ceramic', 'packaging'];
  if ((handling && !allowed.includes(handling)) || (input.category && !allowed.includes(input.category))) return null;
  let tips;
  if (category === 'clothing' || /^(옷|의류|바지|셔츠|가방|수건)$/.test(name)) tips = [
    '작은 구멍이나 떨어진 단추를 수선해 계속 사용해 보세요.',
    '깨끗하게 세탁하고 말린 뒤 필요한 사람에게 나눔해 보세요. 받는 사람이 사용할 수 있는 상태인지 먼저 확인해 주세요.',
  ];
  else if (category === 'large' || /책상|의자|선반|서랍장/.test(name)) tips = [
    '흔들림이나 구조 손상이 없으면 배치를 바꾸거나 수납 가구로 계속 사용해 보세요.',
    '사용 가능한 상태와 크기를 설명해 이웃에게 나눔해 보세요.',
  ];
  else if (/책|도서/.test(name)) tips = ['필요한 사람에게 나누거나 중고로 판매해 보세요.', '기증하려면 받는 곳에 책의 종류와 상태, 접수 여부를 먼저 확인해 주세요.'];
  else if (/상자|박스/.test(name)) tips = ['먼지와 이물질을 제거하고 충분히 말린 뒤 서랍 속 소품 정리함으로 사용해 보세요.', '튼튼한 상자는 택배 포장이나 물건 이동에 다시 사용해 보세요.'];
  else if (/유리병|잼병/.test(name)) tips = ['깨짐이나 금이 없는지 확인하고 씻어 말린 뒤 단추·집게 같은 작은 물건을 보관해 보세요.', '유리병을 작은 꽃병으로 사용해 보세요.'];
  else if (category === 'ceramic' || /머그|화분/.test(name)) tips = ['금이나 깨진 부분이 없는지 확인한 뒤 연필·작은 도구를 담는 정리 용기로 사용해 보세요.'];
  else if (category === 'bedding') tips = ['세탁·건조 후 원래 용도로 계속 사용해 보세요.', '나눔이나 기증 전에는 받는 곳에서 해당 침구를 받는지 먼저 확인해 주세요.'];
  else return null;
  return { confirmed: input.handlingCondition === 'reusable', tips };
}
