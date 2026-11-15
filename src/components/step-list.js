import { escapeHtml } from '../utils/html.js';

const icons = {
  empty: '<path d="m4 6 6-3 4 6-6 4zM10 3l1-2m-1 11 2 2m2-1 1 2m2-1 1 2M5 19h14m-12 0 1 3h8l1-3"/>',
  wash: '<path d="M3 6h9V3h4v3h2a3 3 0 0 1 3 3v1h-4V9H3zM7 11v3m4-3v3M4 18h16l-2 4H6z"/>',
  separate: '<path d="M6 5h12v15H6zM8 10h8v5H8zM14 10l-3 5h5v-5M17 5V3m-2 1 2-1 2 1M4 12H2m1-2-1 2 1 2"/>',
  dry: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/>',
  press: '<path d="M4 12h16M12 2v6m-3-3 3 3 3-3m-3 17v-6m-3 3 3-3 3 3"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 12 12M8 16 20 4"/>',
  wrap: '<path d="M4 5h16v14H4zM7 8h7m-7 3h4M4 19l7-6 4 3 5-4M4 5l4 3"/>',
  report: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  collect: '<path d="M4 8h16M6 8l1 13h10l1-13M9 8V5h6v3m-5 4v5m4-5v5"/>',
  warning: '<path d="m12 3 10 18H2zM12 9v5m0 3v.2"/>',
  check: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
};

const actions = [
  ['empty', /비우|비워|쏟아/],
  ['wash', /헹[구궈]|씻[어으]|닦[아으]|세척해|(?:오염|이물질|고형물)(?:을|물)? 제거/],
  ['separate', /분리(?:해|하|한 뒤)|떼[고어]|뜯어|(?:라벨|상표|테이프|운송장|부속품).{0,20}제거/],
  ['dry', /말[려리린]|건조해/],
  ['press', /압착|납작|눌러|접어|펴고/],
  ['cut', /잘라|자르[고면]/],
  ['wrap', /감싸|싸서|포장해|보호해/],
  ['report', /(?:신고|신청|예약|접수)(?:하세요|해|하[고면]|한 뒤)|신고필증/],
  ['collect', /모[아으]|담아|넣[어으]|내놓|가져가|묶어|(?:배출|수거)(?:해|하세요)/],
  ['check', /확인(?:해|하|하고)|문의해|살펴/],
];

export function disposalStepIcons(step) {
  const instruction = step.split(/[.!?]\s/u, 1)[0];
  if (/지\s*마세요|지\s*말고|금지/u.test(instruction)) return ['warning'];
  if (/(?:수 있는지|가능한지|가능 여부|여부를|방법은|방법을|기준을|조건을).{0,25}(?:확인|문의)/u.test(instruction)) return ['check'];
  const matches = [];
  for (const [kind, pattern] of actions) {
    const match = pattern.exec(instruction);
    if (match) matches.push({ kind, position: match.index });
  }
  matches.sort((a, b) => a.position - b.position);
  return matches.length ? matches.slice(0, 2).map(match => match.kind) : ['check'];
}

export function stepIconMarkup(kind) {
  return `<span class="step-icon" data-step-icon="${kind}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" focusable="false">${icons[kind]}</svg></span>`;
}

export function stepListMarkup(steps, className = 'action-steps', { checklist = false, emphasizeFirst = false } = {}) {
  const items = steps.map((step, index) => {
    const text = `<span class="step-text">${escapeHtml(step)}</span>`;
    const content = checklist ? `<label class="step-check"><input type="checkbox" data-disposal-step hidden disabled>${text}</label>` : text;
    const emphasis = emphasizeFirst && index === 0 ? ' class="result-first-step"' : '';
    return `<li${emphasis}><span class="step-marker" aria-hidden="true"><span class="step-icons">${disposalStepIcons(step).map(stepIconMarkup).join('')}</span><span class="step-number">${index + 1}</span></span>${content}</li>`;
  });
  return `<ol class="${className} numbered-steps" role="list">${items.join('')}</ol>`;
}
