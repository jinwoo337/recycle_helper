import test from 'node:test';
import assert from 'node:assert/strict';
import { RECYCLE_MARKS, confirmedPhotoMark, markById, photoMarkMaterial, photoMarkNeedsShape, photoMarkPart, photoMarkPartLabel } from '../src/domain/disposal/recycle-marks.js';
import { assistanceResultMarkup } from '../src/pages/assistance/assistance.js';
import { MATERIALS, TYPES, judgeDisposal } from '../src/domain/disposal/rules.js';

test('분리배출 표시 버튼은 실제 재질·세부 종류로 이어진다', () => {
  assert.equal(new Set(RECYCLE_MARKS.map(mark => mark.id)).size, RECYCLE_MARKS.length);
  for (const mark of RECYCLE_MARKS) {
    assert.ok(MATERIALS.includes(mark.material), mark.id);
    assert.ok(mark.type ? TYPES[mark.material].some(([type]) => type === mark.type) : mark.material === '기타', mark.id);
  }
  assert.equal(markById('carton').type, 'carton'); assert.equal(markById('없음'), null);
});

test('사진에서 PP 표시만 읽은 경우 부위를 확인하고 배출 방법은 확정하지 않는다', () => {
  assert.equal(photoMarkMaterial('라벨: pp'), '플라스틱');
  assert.equal(photoMarkMaterial('PP 표시'), '플라스틱');
  assert.equal(photoMarkMaterial('PP 표시 추정'), '');
  assert.equal(photoMarkPart('포장 필름： PP'), 'film');
  assert.equal(photoMarkPart('PP'), '');
  assert.equal(photoMarkMaterial('PP일 수도 있음'), '');
  assert.equal(photoMarkMaterial('OTHER'), '');
  const answer = { itemName: '확인할 물건', evidence: 'markings', confidence: 'low', markings: ['PP'],
    questions: [], identification: '표시만 보여요.' };
  const markup = assistanceResultMarkup(answer, null, { mode: 'photo' });
  assert.match(markup, /표시가 있는 곳/);
  assert.match(markup, /data-assist-mark-confirm/);
  assert.doesNotMatch(markup, /플라스틱류로 분리배출/);
});

test('OTHER 표시는 일반 단일 플라스틱으로 확정하지 않는다', () => {
  const { material, type } = markById('other');
  const result = judgeDisposal({ itemName: '미등록 코팅 용기', category: 'packaging', material, type });
  assert.equal(result.status, 'check');
  assert.equal(result.pendingCondition, 'material');
});

test('사진에서 확인한 무색페트·팩 표시는 본체 종류에만 적용하고 PET 코드만으로는 종류를 정하지 않는다', () => {
  assert.deepEqual(confirmedPhotoMark('본체: 무색페트', 'body'), { material: '페트병', type: 'clear-drink' });
  assert.deepEqual(confirmedPhotoMark('멸균팩', 'body'), { material: '종이', type: 'carton' });
  assert.deepEqual(confirmedPhotoMark('본체: 종이팩 표시', 'body'), { material: '종이', type: 'carton' });
  assert.deepEqual(confirmedPhotoMark('PET', 'body'), { material: '페트병', type: '' });
  assert.deepEqual(confirmedPhotoMark('무색페트', 'lid'), { material: '페트병', type: '' });
  assert.deepEqual(confirmedPhotoMark('PP', 'film'), { material: '비닐', type: 'packaging' });
  assert.deepEqual(confirmedPhotoMark('PET', 'body', 'film'), { material: '비닐', type: 'packaging' });
  assert.deepEqual(confirmedPhotoMark('안쪽 라벨: 비닐류 (PET)', 'label'), { material: '비닐', type: 'packaging' });
  assert.deepEqual(confirmedPhotoMark('비닐류 OTHER', 'label'), { material: '기타', type: '' });
  assert.equal(photoMarkNeedsShape('PET'), true);
  assert.equal(photoMarkNeedsShape('무색페트'), false);
  assert.equal(photoMarkPart('안쪽 라벨: 비닐류 (PET)'), 'label');
  assert.equal(photoMarkPartLabel('안쪽 라벨: 비닐류 (PET)'), '안쪽 라벨');
});

test('표시로 고른 미등록 물건도 상태를 답하면 재질 기준으로 안내한다', () => {
  const mark = markById('clear-pet');
  const result = judgeDisposal({ itemName: '줄무늬생수병X', category: 'packaging', material: mark.material, type: mark.type, contaminated: 'no', combined: 'no' });
  assert.equal(result.status, 'recycle');
});
