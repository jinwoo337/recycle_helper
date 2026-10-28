import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareCategoryInput, resolveInputCategory } from '../src/domain/disposal/input-category.js';
import { judgeDisposal } from '../src/domain/disposal/rules.js';
import { resultToText } from '../src/domain/disposal/result-text.js';
import { createOperationGate } from '../src/utils/operation-gate.js';
import { validRecord } from '../src/services/disposal-history.js';

test('홈·가이드의 이름만 전달한 초안도 직접 입력과 같은 종류와 결과를 사용한다', () => {
  for (const itemName of ['먹다남은감기약', '다쓴건전지', '고장난마우스', '부푼보조배터리']) {
    const queued = { itemName };
    const before = structuredClone(queued);
    const prepared = prepareCategoryInput(queued);
    assert.equal(prepared.categoryOrigin, 'keyword');
    assert.ok(prepared.category);
    assert.equal(judgeDisposal(prepared).handling, judgeDisposal(queued).handling);
    assert.deepEqual(queued, before);
  }
});

test('자동 인식 거절과 직접 고른 종류는 재입력·기록 복원에서도 보존된다', () => {
  const rejected = { itemName: '먹다남은감기약', category: '', keywordCategory: false, editCategory: true };
  const prepared = prepareCategoryInput(rejected);
  assert.equal(prepared.category, undefined);
  assert.equal(prepared.keywordCategory, false);
  assert.equal(prepared.editCategory, undefined);
  assert.equal(judgeDisposal(prepared).keywordCategory, undefined);
  const manual = prepareCategoryInput({ ...rejected, category: 'medicine', categoryOrigin: 'manual' });
  assert.equal(resolveInputCategory(manual).origin, 'manual');
  assert.equal(judgeDisposal(manual).keywordCategory, undefined);
  assert.match(judgeDisposal(manual).reasons.join(' '), /직접 선택/);
  assert.deepEqual(prepareCategoryInput(manual), manual);
});

test('이전 자동 선택은 현재 인식으로 갱신하고 직접 고른 종류는 보존한다', () => {
  const old={itemName:'부푼 AA 건전지',category:'battery',categoryOrigin:'keyword'};
  assert.equal(prepareCategoryInput(old).category,'damaged-battery');
  assert.equal(judgeDisposal(old).handling,'damaged-battery');
  const manual={...old,categoryOrigin:'manual'};
  assert.equal(prepareCategoryInput(manual).category,'battery');
  assert.equal(prepareCategoryInput({itemName:'포장만남은품목',category:'battery',categoryOrigin:'keyword'}).category,undefined);
});

test('사전 품목과 미등록 이름의 재질만 보고 포장재 종류를 만들어내지 않는다', () => {
  assert.equal(prepareCategoryInput({itemName:'우유팩',category:'food'}).category, undefined);
  const unknown = prepareCategoryInput({itemName:'아무용도새제품',material:'플라스틱',type:'container',contaminated:'no',combined:'no'});
  assert.equal(unknown.category, undefined);
  assert.equal(judgeDisposal(unknown).status, 'check');
  assert.equal(judgeDisposal({...unknown,category:'packaging',categoryOrigin:'manual'}).status, 'recycle');
});

test('포장재의 재질을 모를 때는 임의 선택 없이 확인 안내로 진행할 수 있다', () => {
  for (const material of ['기타','모르겠어요']) {
    const result = judgeDisposal({itemName:'상표새포장재',category:'packaging',material});
    assert.equal(result.status,'check');
    assert.match(result.method,/재질·분리배출 표시/);
    assert.equal(result.aiAssisted,undefined);
  }
});

test('종류의 선택 경로는 기록의 형식을 지키고 원본을 변경하지 않는다', () => {
  const input = prepareCategoryInput({itemName:'남은감기약'});
  const result = judgeDisposal(input);
  const record = {schemaVersion:2,id:'test',itemName:input.itemName,input,result,createdAt:'2026-10-28T00:00:00Z'};
  assert.equal(validRecord(record), true);
  assert.equal(validRecord({...record,input:{...input,categoryOrigin:'untrusted'}}), false);
  assert.equal(validRecord({...record,input:{...input,keywordCategory:'false'}}), false);
  assert.match(resultToText(input, result), /이름으로 알아본 종류/);
  const manual = {...input,categoryOrigin:'manual'};
  assert.match(resultToText(manual, judgeDisposal(manual)), /직접 선택한 종류/);
});

test('중복 저장을 막고 취소된 이전 응답이 다음 작업을 종료하지 못한다', () => {
  const gate = createOperationGate();
  const first = gate.begin();
  assert.ok(first.active()); assert.equal(gate.begin(), null);
  gate.cancel(); assert.equal(first.active(), false);
  const second = gate.begin(); first.finish();
  assert.ok(second.active()); assert.equal(gate.begin(), null);
  second.finish(); assert.equal(second.active(), false);
  assert.ok(gate.begin()); gate.dispose(); assert.equal(gate.begin(), null);
});
