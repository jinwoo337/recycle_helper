import { escapeHtml } from '../utils/html.js';

// 버리는 방법 문장에 맞는 그림(아이콘)을 붙여 글만 읽지 않아도 무엇을 할지 알 수 있게 합니다.
// 위에서부터 먼저 맞는 규칙을 씁니다.
const STEP_ICONS = [
  [/마세요|안 돼요|않아요/, '🚫', '하지 말 것'],
  [/개인정보|데이터/, '🔒', '개인정보 정리'],
  [/대형폐기물|필증|신고/, '📝', '신고·접수'],
  [/헹구|헹궈|헹군|씻/, '🚿', '헹구기'],
  [/비우|비운|비워|쏟/, '📤', '비우기'],
  [/감싸|밀봉|절연/, '🧻', '감싸기'],
  [/라벨|상표|스티커|테이프|철핀|스프링/, '🏷️', '떼어내기'],
  [/뚜껑|분리|떼|빼고|꺼내/, '✂️', '분리하기'],
  [/압착|찌그러|펴서|펼쳐|접어/, '🗜️', '부피 줄이기'],
  [/말리|말려|젖지/, '☀️', '말리기'],
  [/묶|모아|모으/, '📦', '모으기'],
  [/종량제|일반 쓰레기/, '🗑️', '종량제봉투'],
  [/수거함|회수|수거처|약국|보건소|주민센터/, '♻️', '수거함·회수처'],
  [/음식물/, '🍂', '음식물'],
  [/확인/, '🔍', '확인하기'],
];

export function stepIcon(text) {
  const value = String(text || '');
  const found = STEP_ICONS.find(([pattern]) => pattern.test(value));
  return found ? { icon: found[1], label: found[2] } : { icon: '✅', label: '하기' };
}

export function stepListMarkup(steps, className = 'action-steps') {
  return `<ol class="${className} icon-steps">${steps.map(step => { const { icon, label } = stepIcon(step); return `<li><span class="step-icon" role="img" aria-label="${label}">${icon}</span><span class="step-text">${escapeHtml(step)}</span></li>`; }).join('')}</ol>`;
}
