import { escapeHtml } from '../utils/html.js';

// 버리는 방법 문장에 맞는 그림(아이콘)을 붙여 글만 읽지 않아도 무엇을 할지 알 수 있게 합니다.
// 위에서부터 먼저 맞는 규칙을 씁니다.
const STEP_ICONS = [
  [/마세요|안 돼요|않아요/, '🚫', '하지 말 것'],
  [/개인정보|데이터/, '🔒', '개인정보 정리'],
  // "대형폐기물 기준을 확인"처럼 확인만 하는 문장은 🔍로 두고, 실제 신고·필증 단계에만 붙입니다.
  // "~인지 확인", "~기준을 확인"처럼 알아보기만 하는 문장은 문장 속 다른 낱말(종량제·대형폐기물 등)보다 🔍를 먼저 씁니다.
  [/[는인]지 (다시 )?확인|(기준|조건)(을|과|·[^ ]+) ?(다시 )?확인/, '🔍', '확인하기'],
  [/신고|필증/, '📝', '신고·접수'],
  [/헹구|헹궈|헹군|씻/, '🚿', '헹구기'],
  [/비우|비운|비워|쏟/, '📤', '비우기'],
  [/감싸|밀봉|절연/, '🧻', '감싸기'],
  [/라벨|상표|스티커|테이프|철핀|스프링/, '🏷️', '떼어내기'],
  // "분리배출 표시", "분리되지 않는" 같은 말은 분리하는 동작이 아니라서 빼고 "분리해" 같은 동작만 봅니다.
  [/뚜껑|분리해|분리하고|분리하여|떼어|떼고|떼서|빼고|빼서|꺼내/, '✂️', '분리하기'],
  [/압착|찌그러|펴서|펼쳐|접어/, '🗜️', '부피 줄이기'],
  [/말리|말려|젖지/, '☀️', '말리기'],
  [/묶(?!음)|모아|모으/, '📦', '모으기'],
  [/종량제|일반 쓰레기/, '🗑️', '종량제봉투'],
  [/수거함|회수|수거처|약국|보건소|주민센터/, '♻️', '수거함·회수처'],
  [/음식물 ?(전용|쓰레기|수거 ?용기)|음식물류로/, '🍂', '음식물'],
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
