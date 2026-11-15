import { escapeHtml } from '../utils/html.js';

const icons = {
  empty: '<path d="m5 10 6-6 6 6-5 5H5zM16 11l2 2m0 2v5m-2-2 2 2 2-2M4 16h7"/>',
  wash: '<path d="M12 3c-2 4-6 7-6 11a6 6 0 0 0 12 0c0-4-4-7-6-11Z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
  separate: '<path d="M10 8h4v8h-4zM7 12H2m2-2-2 2 2 2m13-2h5m-2-2 2 2-2 2"/>',
  dry: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/>',
  press: '<path d="M4 12h16M12 2v6m-3-3 3 3 3-3m-3 17v-6m-3 3 3-3 3 3"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 12 12M8 16 20 4"/>',
  wrap: '<path d="m3 9 9-5 9 5v8l-9 5-9-5zM3 9l9 5 9-5m-9 5v8M7.5 6.5l9 5v3"/>',
  report: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  collect: '<path d="M4 8h16M6 8l1 13h10l1-13M9 8V5h6v3m-5 4v5m4-5v5"/>',
  warning: '<path d="m12 3 10 18H2zM12 9v5m0 3v.2"/>',
  check: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
};

// Match the first action in the instruction. A prohibition gets a warning instead of an action symbol.
const actions = [
  ['empty', /비우|비워|쏟아/],
  ['wash', /헹[구궈]|씻[어으]|닦[아으]|세척해|(?:오염|이물질|고형물)(?:을|물)? 제거/],
  ['separate', /분리(?:해|하|한 뒤)|떼[고어]|뜯어|테이프.{0,20}제거|부속품.{0,15}제거/],
  ['dry', /말[려리]|건조해/],
  ['press', /압착|납작|눌러|접어|펴고/],
  ['cut', /잘라|자르[고면]/],
  ['wrap', /감싸|포장해|묶어/],
  ['report', /(?:신고|신청|예약|접수)(?:하세요|해|하[고면]|한 뒤)|신고필증/],
  ['collect', /모아|담아|넣[어으]|내놓|가져가|(?:배출|수거)(?:해|하세요)/],
  ['check', /확인해|문의해|살펴/],
];

export function disposalStepIcon(step) {
  const instruction = step.split(/[.!?]\s/u, 1)[0];
  if (/지\s*마세요|지\s*말고|금지|주의해/u.test(instruction)) return 'warning';
  let icon = 'check', first = Infinity;
  for (const [kind, pattern] of actions) {
    const position = instruction.search(pattern);
    if (position >= 0 && position < first) { icon = kind; first = position; }
  }
  return icon;
}

export function stepIconMarkup(kind) {
  return `<span class="step-icon" data-step-icon="${kind}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false">${icons[kind]}</svg></span>`;
}

export function stepListMarkup(steps, className = 'action-steps', { checklist = false, emphasizeFirst = false } = {}) {
  const items = steps.map((step, index) => {
    const text = `<span class="step-text">${escapeHtml(step)}</span>`;
    const content = checklist ? `<label class="step-check"><input type="checkbox" data-disposal-step hidden disabled>${text}</label>` : text;
    const emphasis = emphasizeFirst && index === 0 ? ' class="result-first-step"' : '';
    return `<li${emphasis}><span class="step-marker" aria-hidden="true">${stepIconMarkup(disposalStepIcon(step))}<span class="step-number">${index + 1}</span></span>${content}</li>`;
  });
  return `<ol class="${className} numbered-steps" role="list">${items.join('')}</ol>`;
}
