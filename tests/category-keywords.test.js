import test from 'node:test';
import assert from 'node:assert/strict';
import { detectItemCategory } from '../src/domain/disposal/category-keywords.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';

const expected = {
  남은감기약: 'medicine', '먹다 남은 약': 'medicine', 유통기한지난해열제: 'medicine', 안약: 'medicine', 상처연고: 'medicine', 두통약: 'medicine', 아이감기시럽: 'medicine', 약: 'medicine',
  다쓴건전지: 'battery', AA건전지: 'battery', 'AAA': 'battery', 리모컨배터리: 'battery', 코인전지: 'battery', CR2032: 'battery',
  휴대폰보조배터리: 'rechargeable', 노트북배터리: 'rechargeable', 충전지: 'rechargeable', 리튬이온배터리: 'rechargeable',
  부푼배터리: 'damaged-battery', 부푼보조배터리: 'damaged-battery', 누액건전지: 'damaged-battery',
  고장난마우스: 'electronic', 무선이어폰: 'electronic', 핸드폰충전기: 'electronic', 헤어드라이어: 'electronic', 안쓰는스마트폰: 'electronic', 블루투스스피커: 'electronic', 전기면도기: 'electronic',
  고장난냉장고: 'large-electronic', 낡은세탁기: 'large-electronic', 'LG TV': 'large-electronic', 전자레인지: 'large-electronic',
  형광등: 'fluorescent', 삼파장전구: 'fluorescent', 깨진형광등: 'broken-lamp', LED등: 'led', 엘이디전구: 'led', 백열전구: 'bulb', 할로겐램프: 'bulb',
  다쓴부탄가스: 'pressure-can', 헤어스프레이: 'pressure-can', 살충제: 'pressure-can', 락카: 'pressure-can',
  남은페인트: 'chemical-can', 엔진오일: 'chemical-can',
  낡은소파: 'large', 부러진의자: 'large', 매트리스: 'large', 자전거: 'large', 신발장: 'large',
  솜이불: 'bedding', 낡은베개: 'bedding', 방석: 'bedding',
  깨진머그컵: 'ceramic', 뚝배기: 'ceramic', 사기그릇: 'ceramic',
  안입는옷: 'clothing', 헌옷: 'clothing', 티셔츠: 'clothing', 운동화: 'clothing', 낡은신발: 'clothing', 책가방: 'clothing', 패딩: 'clothing', 잠옷: 'clothing',
};
const notRecognized = ['약과', '계약서', '예약권', '약수통', '치약', '구두약', '모기약', '영양제', '비타민', '배터리케이스', '휴대폰케이스', '노트북박스', '이어폰케이스', '옷걸이', '신발깔창', '고무장갑', '쿠션팩트', '전구색스티커', '커피캡슐', '팬케이크시럽', '우유팩', '생수병', '과자봉지', '', '   '];

test('이름 속 낱말로 물건 종류를 알아본다', () => {
  for (const [name, category] of Object.entries(expected)) assert.equal(detectItemCategory(name)?.category, category, name);
});

test('비슷하지만 다른 물건은 종류를 자동으로 고르지 않는다', () => {
  for (const name of notRecognized) assert.equal(detectItemCategory(name), null, name);
});

test('손상 표현과 전지 이름 사이에 다른 말이 있어도 손상 전지 안내를 우선한다', () => {
  for (const name of ['부푼 AA 건전지','리튬이온배터리 누액','부풀어 오른 휴대폰 배터리','찌그러진 충전용 건전지','보조배터리에서 액이 새요']) {
    assert.equal(detectItemCategory(name)?.category,'damaged-battery',name);
    assert.equal(judgeDisposal({itemName:name}).handling,'damaged-battery',name);
  }
  for (const name of ['부푼배터리 포장 상자','파손된 건전지 케이스']) assert.equal(detectItemCategory(name),null,name);
});

test('판별: 자동 인식한 종류의 전용 안내를 쓰고 AI보다 우선하며, 직접 고른 종류가 가장 우선이다', () => {
  const medicine = judgeDisposal({ itemName: '남은감기약' });
  assert.equal(medicine.handling, 'medicine'); assert.deepEqual(medicine.keywordCategory, { category: 'medicine', keyword: '감기약' });
  assert.ok(medicine.reasons.some(reason => reason.includes("이름의 '감기약'")));
  const aiGuess = { itemName: '고장난마우스', material: '기타', type: '', route: 'general', confidence: 'high', reason: '', source: 'gemini' };
  const mouse = judgeDisposal({ itemName: '고장난마우스', aiGuess });
  assert.equal(mouse.handling, 'electronic'); assert.equal(mouse.aiAssisted, undefined, '낱말 인식이 AI보다 우선');
  const chosen = judgeDisposal({ itemName: '고장난마우스', category: 'unknown' });
  assert.equal(chosen.keywordCategory, undefined); assert.equal(chosen.method, '물건 종류·수거처 확인 필요');
  const sofa = judgeDisposal({ itemName: '낡은소파' });
  assert.equal(sofa.handling, 'large'); assert.equal(sofa.keywordCategory.keyword, '소파');
  assert.equal(judgeDisposal({ itemName: '약과' }).keywordCategory, undefined);
  assert.equal(judgeDisposal({ itemName: '남은감기약', keywordCategory: false }).keywordCategory, undefined, '다른 물건이에요를 고르면 자동 인식 안 함');
});
