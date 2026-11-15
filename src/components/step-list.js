import { escapeHtml } from '../utils/html.js';

export function stepListMarkup(steps, className = 'action-steps', { checklist = false, emphasizeFirst = false } = {}) {
  const items = steps.map((step, index) => {
    const text = `<span class="step-text">${escapeHtml(step)}</span>`;
    const content = checklist ? `<label class="step-check"><input type="checkbox" data-disposal-step hidden disabled>${text}</label>` : text;
    const emphasis = emphasizeFirst && index === 0 ? ' class="result-first-step"' : '';
    return `<li${emphasis}><span class="step-number" aria-hidden="true">${index + 1}</span>${content}</li>`;
  });
  return `<ol class="${className} numbered-steps">${items.join('')}</ol>`;
}
