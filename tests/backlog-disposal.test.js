import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAssistance } from '../src/domain/disposal/ai-assistance.js';
import { applyItemObservations, mergeItemObservations, observationsFromDescription } from '../src/domain/disposal/item-observations.js';
import { assistanceResultMarkup } from '../src/pages/assistance/assistance.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { itemPresetInput } from '../src/domain/disposal/input-presets.js';
import { lookupItem, searchItemNames } from '../src/domain/disposal/item-suggestions.js';
import { applyRegionalRules } from '../src/domain/disposal/regions.js';
import { rankCollectionPoints, verifiedCollectionPoints } from '../src/domain/disposal/verified-collection-points.js';
import { resultMarkup } from '../src/pages/item-input/item-input.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { batchGroups, batchToText } from '../src/domain/disposal/disposal-batch.js';
import { addDisposalBatchItems, addMealToBatch, readDisposalBatch, removeBatchItem, updateBatchItem } from '../src/services/disposal-batch.js';

const seoul = { province: '서울특별시', district: '강남구' };
const response = {
  itemName: '삼각 소스통', identification: '소스 포장 용기', evidence: 'object', confidence: 'high',
  markings: [], method: '종량제에 바로 버리세요', steps: ['종량제에 바로 버리세요'], questions: [], cautions: [], category: 'packaging',
};

test('설명의 명시적 조건은 사진 추정보다 우선하고, 선택하지 않은 상태나 분리 가능 여부는 입력하지 않는다', () => {
  const observations = mergeItemObservations([
    { part: 'body', field: 'material', value: '유리', type: 'bottle' },
    { part: 'label', field: 'state', value: 'clean' },
    { part: 'body', field: 'separable', value: 'yes' },
  ], '본체는 PP, 라벨은 비닐, 안에 음식물이 남았어요.');
  const markup = assistanceResultMarkup(response, seoul, { mode: 'photo', observations });
  assert.match(markup, /AI가 제안한 종류:<\/strong> 포장재·용기/);
  assert.match(markup, /사진·설명에서 AI가 추정 · 확인 필요/);
  assert.doesNotMatch(markup, /종량제에 바로 버리세요/);
  const input = applyItemObservations({ itemName: response.itemName, category: 'packaging', region: seoul }, observations.filter(entry => entry.source === 'description'));
  assert.equal(input.material, '플라스틱');
  assert.equal(input.observedState, 'dirty', '세부 종류가 결정되면 적용할 상태를 보존');
  assert.equal(input.combined, 'yes');
  assert.equal(input.separable, undefined);
  assert.deepEqual(input.components, [{ label: '라벨', material: '비닐', type: 'packaging' }]);
  assert.equal(judgeDisposal(input).status, 'check');
  assert.deepEqual(observationsFromDescription('오염이 없지는 않아요. 음식물이 없어요.'), []);
});

test('Gemini의 관찰 항목은 정해진 코드만 받으며 마크만 찍힌 사진에는 종류나 상태를 넘기지 않는다', () => {
  const raw = { ...response, observations: [
    { part: 'body', field: 'material', value: '플라스틱', type: 'bottle' },
    { part: 'label', field: 'separable', value: 'yes' },
    { part: 'lid', field: 'state', value: 'clean' },
    { part: 'lid', field: 'state', value: 'dirty' },
    { part: 'unknown', field: 'state', value: 'clean' },
  ] };
  const parsed = validateAssistance(raw);
  assert.deepEqual(parsed.observations, [{ part: 'body', field: 'material', value: '플라스틱' }]);
  assert.deepEqual(validateAssistance(parsed), parsed);
  const markings = validateAssistance({ ...raw, evidence: 'markings' });
  assert.equal(markings.category, undefined);
  assert.deepEqual(markings.observations, []);
  assert.deepEqual(markings.steps, []);
  const { method, steps, cautions, ...identificationOnly } = raw;
  assert.deepEqual(validateAssistance(identificationOnly), parsed, '식별 전용 응답은 생성된 배출 단계 없이도 유효');
});

test('직접 적은 오염과 결합 상태는 유지하고 부정·불확실한 표현은 채우지 않는다', () => {
  const input = itemPresetInput('우유팩');
  const clean = '우유팩이에요. 씻었는데 깨끗해요. 다른 재질이 붙어 있지 않아요.';
  const confirmed = applyItemObservations(input, observationsFromDescription(clean));
  assert.equal(confirmed.contaminated, 'no');
  assert.equal(confirmed.combined, 'no');
  const uncertain = '라벨이 붙어 있지 않아요. 내용물이 남아 있지 않아요. 오염이 없어요라고 쓰기 어려워요.';
  assert.deepEqual(observationsFromDescription(uncertain), []);
  assert.deepEqual(observationsFromDescription('PET 표시가 없어요. PP 또는 PS인 것 같아요.'), []);
  assert.deepEqual(observationsFromDescription('본체에 PET 표시가 있어요.'), [{ part: 'body', field: 'material', value: '페트병' }]);
});

test('전지 설명과 사진의 상태가 다르면 손상 여부를 직접 확인하도록 하고, 추정으로 수거함을 확정하지 않는다', () => {
  const battery = { ...response, itemName: 'AA 건전지' };
  const observations = mergeItemObservations([{ part: 'body', field: 'handlingCondition', value: 'damaged' }], 'AA 건전지에 손상이 없어요.');
  assert.equal(observations[0].conflicts, true);
  const markup = assistanceResultMarkup(battery, seoul, { mode: 'photo', observations });
  assert.match(markup, /입력한 설명과 AI 제안이 달라요/);
  assert.match(markup, /data-assist-handling="damaged" aria-pressed="false"/);
  assert.doesNotMatch(markup, /data-assist-save|아산시 폐전지 배출 안내/);
});

test('같은 지역과 확인 조건이면 미등록 포장재의 이름·설명·사진 경로가 같은 판정을 낸다', () => {
  const base = { itemName: '삼각 소스통', category: 'packaging', categoryOrigin: 'manual', keywordCategory: false, region: seoul };
  const confirmed = { ...base, material: '플라스틱', type: 'container', combined: 'no', contaminated: 'yes', washed: 'no', removable: 'yes' };
  const signals = [
    { part: 'body', field: 'material', value: '플라스틱', type: 'container' },
    { part: 'body', field: 'state', value: 'dirty' },
    { part: 'body', field: 'combined', value: 'no' },
  ];
  for (const description of ['', '본체는 PP, 안에 음식물이 남았어요.']) {
    const handoff = applyItemObservations({ ...base, type: 'container', material: '플라스틱' }, mergeItemObservations(signals, description));
    assert.deepEqual(judgeDisposal({ ...handoff, removable: 'yes' }), judgeDisposal(confirmed));
  }
});

test('한 문장에서 부속품과 본체를 함께 설명해도 재질과 상태를 각각 보존한다', () => {
  const observations = observationsFromDescription('뚜껑은 PP이고 본체는 깨끗해요.');
  assert.deepEqual(observations, [
    { part: 'lid', field: 'material', value: '플라스틱' },
    { part: 'body', field: 'state', value: 'clean' },
  ]);
});

test('짧은 포장 검색은 해당 부위의 후보부터 보여 주고 확인 전까지 방법을 정하지 않는다', () => {
  for (const [name, first] of [['컵라면 뚜껑', '금속박종이포장지'], ['컵밥 껍데기', '플라스틱즉석밥용기'],
    ['즉석밥 뚜껑', '비닐포장필름'], ['생수병 비닐', '비닐포장필름']]) {
    assert.equal(searchItemNames(name)[0], first);
    assert.equal(lookupItem(name), null);
    assert.equal(judgeDisposal({ itemName: name }).status, 'check');
  }
  assert.ok(searchItemNames('생수뱅').includes('생수병'));
  assert.equal(lookupItem('생수뱅'), null);
  assert.equal(searchItemNames('패트병 라벨')[0], '비닐포장필름');
  assert.equal(lookupItem('투명생수패트병'), null);
});

test('장난감은 작동 방식과 크기를 확인한 뒤 플라스틱 완구와 다른 배출 경로를 구분한다', () => {
  const unknown = judgeDisposal({ itemName: '플라스틱 장난감' });
  assert.equal(unknown.status, 'check');
  assert.deepEqual(unknown.itemCandidates, ['비전동플라스틱장난감', '전동장난감', '봉제인형', '대형장난감']);
  const cleanToy = { ...itemPresetInput('비전동 플라스틱 장난감'), combined: 'no', contaminated: 'no' };
  assert.equal(judgeDisposal(cleanToy).status, 'recycle');
  assert.equal(judgeDisposal({ ...cleanToy, combined: 'yes', separable: 'no' }).status, 'check');
  assert.equal(judgeDisposal({ ...cleanToy, itemName: '전동장난감' }).handling, 'electronic');
  assert.equal(judgeDisposal({ ...cleanToy, itemName: '봉제인형' }).handling, 'stuffed-toy');
  assert.equal(judgeDisposal({ ...cleanToy, itemName: '대형장난감' }).handling, 'large');
});

test('같은 설명의 무색페트, PP, 비닐 표기는 해당 부위에만 적용된다', () => {
  const evidence = observationsFromDescription('본체 무색페트 뚜껑 PP 라벨 비닐');
  assert.deepEqual(evidence, [
    { part: 'body', field: 'material', value: '페트병', type: 'clear-drink' },
    { part: 'lid', field: 'material', value: '플라스틱' },
    { part: 'label', field: 'material', value: '비닐', type: 'packaging' },
  ]);
  const input = { contaminated: 'no', combined: 'yes', separable: 'yes',
    components: [{ label: '라벨', material: '비닐', type: 'packaging', contaminated: 'yes' }] };
  const applied = applyItemObservations(input, evidence);
  assert.deepEqual(applied.components[0], input.components[0]);
  assert.equal(applied.components[1].label, '뚜껑');
  assert.equal(applied.components[1].type, '');
});

test('두 뚜껑의 이름이 확인됐으면 재질과 상태를 각각 적용한다', () => {
  const input = { itemName: '용기', combined: 'yes', separable: 'yes', components: [
    { label: '안쪽 마개', material: '플라스틱', type: 'container', contaminated: 'no' },
    { label: '바깥 뚜껑', material: '모르겠어요' },
  ] };
  const observations = mergeItemObservations([{ part: 'lid', field: 'state', value: 'dirty' }],
    '안쪽 마개는 PP이고 바깥 뚜껑에는 비닐류 표시가 있어요. 깨끗해요.');
  const applied = applyItemObservations(input, observations);
  assert.deepEqual(applied.components[0], input.components[0]);
  assert.deepEqual(applied.components[1], { label: '바깥 뚜껑', material: '비닐', type: 'packaging', contaminated: 'no' });
  const separation = observationsFromDescription('뚜껑은 분리할 수 있어요. 라벨은 분리할 수 없어요.');
  assert.deepEqual(separation, [{ part: 'body', field: 'separable', value: 'unknown' }]);
  assert.equal(applyItemObservations(input, separation).separable, 'unknown');
});

test('시행일 전에 종료 안내를 적용하지 않고 주소가 일치한 수거함만 거리순으로 정렬한다', () => {
  const input = { itemName: '젤아이스팩', region: { province: '서울특별시', district: '서초구' } };
  const base = judgeDisposal({ itemName: input.itemName });
  assert.equal(applyRegionalRules(input, base, '2026-10-29').regional.coverage, 'unverified');
  assert.equal(applyRegionalRules(input, base, '2026-10-30').status, 'general');
  assert.equal(verifiedCollectionPoints(judgeDisposal(input)), null);
  const gwangju = { province: '경기도', district: '광주시' };
  const gwangjuInput = { ...input, region: gwangju };
  assert.equal(judgeDisposal(gwangjuInput).pendingCondition, 'handling');
  assert.equal(verifiedCollectionPoints(judgeDisposal(gwangjuInput)), null);
  const damaged = judgeDisposal({ ...gwangjuInput, handlingCondition: 'unusable' });
  assert.equal(damaged.status, 'general');
  assert.equal(verifiedCollectionPoints(damaged), null);
  const { points } = verifiedCollectionPoints(judgeDisposal({ ...gwangjuInput, handlingCondition: 'reusable' }));
  assert.equal(points.length, 13);
  assert.ok(points.every(point => !/신현동|송정동|광남1동/.test(point.name)));
  const ranked = rankCollectionPoints(points, { latitude: 37.410872, longitude: 127.257281 });
  assert.equal(ranked[0].name, '경안동 행정복지센터');
  assert.equal(ranked[0].distanceKm, 0);
  assert.ok(ranked[1].distanceKm <= ranked[2].distanceKm);
  const medicine = { itemName: '알약', region: { province: '경기도', district: '구리시' } };
  const localMedicine = judgeDisposal(medicine);
  assert.equal(verifiedCollectionPoints(localMedicine).points.length, 3);
  assert.match(resultMarkup(medicine, localMedicine), /구리시 폐의약품 공공 수거함[\s\S]*031-550-8987/);
  const seongnam = { ...medicine, region: { province: '경기도', district: '성남시' } };
  const seongnamMedicine = judgeDisposal(seongnam);
  assert.equal(verifiedCollectionPoints(seongnamMedicine).points.length, 4);
  assert.match(seongnamMedicine.steps.join(' '), /속포장지를 그대로/);
  assert.match(judgeDisposal({ ...seongnam, itemName: '물약' }).steps.join(' '), /마개를 잠그고/);
});

test('분리한 비닐 라벨에 지역별 오염 기준을 적용하고 미확인 조건의 위치를 유지한다', () => {
  const input = { ...itemPresetInput('투명생수병'), contaminated: 'no', region: seoul,
    components: [{ label: '비닐 라벨', material: '비닐', type: 'packaging', contaminated: 'yes',
      washed: 'no', vinylResidue: 'liquid-only', removable: 'no' }] };
  assert.equal(judgeDisposal(input).status, 'recycle');
  const local = judgeDisposal({ ...input, region: { ...seoul, district: '도봉구' } });
  assert.equal(local.status, 'mixed');
  assert.match(local.parts[1].reasons[0], /도봉구/);
  const missing = judgeDisposal({ ...input, components: [{ ...input.components[0], vinylResidue: 'unknown' }] });
  assert.equal(missing.status, 'check');
  assert.equal(missing.parts[1].pendingCondition, 'vinyl-residue');
  assert.match(resultMarkup(input, missing), /비닐 라벨 · 비닐에 남은 오염 확인하기/);
});

test('비닐에 기름 자국만 남았다는 명시적 설명을 같은 지역 판별에 전달한다', () => {
  const input = { ...itemPresetInput('과자봉지'), region: seoul };
  const observations = observationsFromDescription('과자봉지예요. 기름 자국만 남았어요. 다른 재질이 없어요.');
  const confirmed = applyItemObservations(input, observations);
  assert.equal(confirmed.vinylResidue, 'liquid-only');
  assert.equal(judgeDisposal(confirmed).status, 'recycle');
  const withSolids = applyItemObservations(input, observationsFromDescription('부스러기가 남았어요. 다른 재질이 없어요.'));
  assert.equal(judgeDisposal(withSolids).pendingCondition, 'removable');
  const unsure = observationsFromDescription('기름 자국만 남았는지 모르겠어요.');
  assert.deepEqual(unsure, []);
});

test('포장 랩의 사진 표시를 기존 부속품에 반영하고 붙은 재질에 관한 모순은 다시 묻는다', () => {
  const input = itemPresetInput('랩포장스티로폼정육트레이');
  const film = { part: 'film', field: 'material', value: '비닐', type: 'packaging' };
  assert.equal(applyItemObservations(input, [film]).components.length, 1);
  const conflict = applyItemObservations(input, [film, { part: 'body', field: 'combined', value: 'no' }]);
  assert.equal(conflict.combined, 'unknown');
  assert.equal(conflict.separable, undefined);
  assert.equal(judgeDisposal({ ...conflict, contaminated: 'no' }).pendingCondition, 'combined');
});

test('검증 지역 링크는 다음 행동과 복사에 남고, 손상 전지에는 주택 유형별 수거함 안내를 표시하지 않는다', () => {
  const input = { itemName: '건전지', handlingCondition: 'undamaged', region: { province: '충청남도', district: '아산시' } };
  const good = judgeDisposal(input);
  const html = resultMarkup(input, good);
  assert.ok(html.indexOf('어디에 버리나요?') < html.indexOf('지금 할 일'));
  assert.ok(html.indexOf('아산시 폐전지 배출 안내') < html.indexOf('판단 근거·지역 기준'));
  assert.match(html, /어떤 주택에 거주하나요/);
  assert.match(resultToText(input, good), /www\.asan\.go\.kr\/main\/cms\/\?no=588/);
  const damaged = { ...input, handlingCondition: 'damaged' };
  const damagedHtml = resultMarkup(damaged, judgeDisposal(damaged));
  assert.match(damagedHtml, /손상 전지 · 수거처에 먼저 문의/);
  assert.doesNotMatch(damagedHtml, /어떤 주택에 거주하나요/);
  assert.doesNotMatch(resultMarkup({ ...input, region: seoul }, judgeDisposal({ ...input, region: seoul })), /asan\.go\.kr/);
});

test('아산·김포 대형폐기물은 각각 공식 신청·안내로 가고 다른 지역에 섞이지 않는다', () => {
  for (const [region, link] of [
    [{ province: '충청남도', district: '아산시' }, 'https://smartclean.asan.go.kr/online/bulky/request'],
    [{ province: '경기도', district: '김포시' }, 'https://m.gimpo.go.kr/portal/contents.do?key=1437'],
  ]) {
    const input = { itemName: '책상', region };
    const result = judgeDisposal(input);
    assert.ok(resultMarkup(input, result).includes(link));
    assert.ok(resultToText(input, result).includes(link));
    const elsewhere = { ...input, region: seoul };
    assert.ok(!resultMarkup(elsewhere, judgeDisposal(elsewhere)).includes(link));
  }
});

test('함께 버릴 물건은 지역·재질과 결과를 독립적으로 보존하고 미판별 물건도 복사한다', () => {
  const chopsticks = { ...itemPresetInput('나무젓가락'), region: seoul };
  assert.equal(addMealToBatch(chopsticks, judgeDisposal(chopsticks)), true);
  const batch = readDisposalBatch();
  assert.equal(batch.items.length, 4);
  const lid = batch.items.find(entry => entry.input.itemName === '배달 용기 뚜껑');
  const input = { ...lid.input, material: '플라스틱', type: 'container', contaminated: 'no', combined: 'no' };
  const result = judgeDisposal(input);
  assert.equal(updateBatchItem(lid.id, { ...input, region: null }, result), false);
  assert.equal(updateBatchItem(lid.id, input, result), true);
  const { items } = readDisposalBatch();
  assert.deepEqual(batchGroups(items).map(group => group.entries.length), [1, 1, 0, 2]);
  const text = batchToText(items);
  assert.match(text, /배달 용기 뚜껑[\s\S]*주요 재질 · 플라스틱/);
  assert.match(text, /배달 용기 포장 필름 · 확인 필요/);
  assert.match(text, /서울특별시 강남구/);
  const container = items.find(entry => entry.input.itemName === '배달 용기');
  const grouped = {
    ...itemPresetInput('배달 용기'), region: seoul, combined: 'yes', separable: 'yes', contaminated: 'no',
    components: [{ label: '포장 필름', material: '비닐', type: 'packaging', contaminated: 'unknown' }],
  };
  assert.equal(updateBatchItem(container.id, grouped, judgeDisposal(grouped)), true);
  const remaining = readDisposalBatch().items;
  assert.equal(remaining.length, 3, '부속품 카드에 들어간 미판별 항목은 중복해서 묻지 않음');
  assert.match(batchToText(remaining), /포장 필름 \(비닐\) · 추가 확인 필요/);
});

test('여러 이름을 목록에 함께 넣고 사용자가 확인한 후보만 같은 항목에 기록한다', () => {
  for (const { id } of readDisposalBatch().items) removeBatchItem(id);
  assert.equal(addDisposalBatchItems(['우유팩', '우유 팩', '영수증', '감열영수증'], seoul), true);
  const initial = readDisposalBatch();
  assert.equal(initial.items.length, 3);
  const receipt = initial.items.find(({ input }) => input.itemName === '영수증');
  const confirmed = { ...itemPresetInput('감열영수증'), region: seoul };
  const result = judgeDisposal(confirmed);
  assert.equal(updateBatchItem(receipt.id, confirmed, result), false, '다른 이름을 자동으로 적용하지 않음');
  assert.equal(updateBatchItem(receipt.id, { ...confirmed, itemName: '신문지' }, result, { resolveName: true }), false);
  assert.equal(updateBatchItem(receipt.id, confirmed, result, { resolveName: true }), true);
  assert.equal(addDisposalBatchItems(['건전지'], null), false);
  assert.equal(addDisposalBatchItems(Array.from({ length: 11 }, (_, index) => `물건 ${index}`), seoul), false);
  const final = readDisposalBatch();
  assert.deepEqual(final.items.map(({ id }) => id), initial.items.slice(0, 2).map(({ id }) => id));
  assert.equal(final.items.find(({ id }) => id === receipt.id).result.status, 'general');
  assert.deepEqual(final.items[0], initial.items[0]);
});
