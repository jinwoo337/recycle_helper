import test from 'node:test';
import assert from 'node:assert/strict';
import { stateAnswers, selectedState } from '../src/domain/disposal/input-state.js';
import { normalizePart } from '../src/domain/disposal/rules.js';

test('현재 상태 선택은 기존 오염·세척 기록으로 변환하고 다시 복원한다', () => {
  for (const answer of ['clean','dirty','washed-dirty','unknown']) {
    const part = normalizePart({material:'플라스틱',type:'container',...stateAnswers(answer),removable:'yes'});
    assert.equal(selectedState(part),answer);
    if (answer === 'clean' || answer === 'unknown') {
      assert.equal(part.washed,undefined);
      assert.equal(part.removable,undefined);
    }
  }
  assert.equal(selectedState({contaminated:'yes'}),'');
});

test('일반 종이는 세척을 묻거나 세척했다고 저장하지 않는다', () => {
  assert.deepEqual(stateAnswers('dirty',false),{contaminated:'yes'});
  assert.deepEqual(stateAnswers('washed-dirty',false),{});
  assert.equal(selectedState({contaminated:'yes'},false),'dirty');
});
