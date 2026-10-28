// AI 안내 켜기/끄기 스위치. 홈과 입력 화면이 같은 설정을 쓰고, 켜짐·꺼짐을 글자·색·아이콘으로 함께 보여 줍니다.
// 설정은 이 브라우저에만 저장합니다. 기본은 꺼짐이며 저장소를 쓸 수 없으면 꺼진 상태로 둡니다.
import { escapeHtml } from '../utils/html.js';

export const AI_ENABLED_KEY = 'recycle-helper.ai-enabled';
const CHANGED = 'ai-preference-changed';

export function readAiEnabled() {
  try { return localStorage.getItem(AI_ENABLED_KEY) === 'on'; } catch { return false; }
}

export function writeAiEnabled(enabled) {
  try { localStorage.setItem(AI_ENABLED_KEY, enabled ? 'on' : 'off'); } catch { /* 저장소 차단 */ }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: { enabled } }));
}

const HELP = {
  on: '등록되지 않은 물건은 AI 의견도 함께 보여 줘요. 확인된 기준이 항상 우선이에요.',
  off: '확인된 기준과 이름으로 알아본 종류로만 안내해요. 켜면 AI 의견도 함께 볼 수 있어요.',
};

export function aiToggleMarkup(id, { compact = false } = {}) {
  const safe = escapeHtml(id);
  return `<label class="ai-toggle${compact ? ' is-compact' : ''}" data-ai-toggle>
    <input type="checkbox" id="${safe}" role="switch" aria-describedby="${safe}-help">
    <span class="ai-toggle-track" aria-hidden="true"><span class="ai-toggle-label on">ON</span><span class="ai-toggle-label off">OFF</span></span>
    <span class="ai-toggle-text"><strong>🤖 AI 안내 <span class="ai-toggle-state" data-ai-state>꺼짐</span></strong><small id="${safe}-help" data-ai-help>${HELP.off}</small></span>
  </label>`;
}

// 스위치를 연결합니다. onChange는 사용자가 직접 바꿨을 때만 부릅니다. sync()로 화면을 다시 맞출 수 있습니다.
export function bindAiToggle(input, onChange = () => {}) {
  const label = input.closest('[data-ai-toggle]');
  const sync = (enabled = readAiEnabled()) => {
    input.checked = enabled;
    label.classList.toggle('is-on', enabled);
    label.querySelector('[data-ai-state]').textContent = enabled ? '켜짐' : '꺼짐';
    label.querySelector('[data-ai-help]').textContent = enabled ? HELP.on : HELP.off;
  };
  const changed = () => { writeAiEnabled(input.checked); sync(input.checked); onChange(input.checked); };
  const external = () => sync();
  const storage = event => { if (event.key === AI_ENABLED_KEY || event.key === null) sync(); };
  input.addEventListener('change', changed);
  window.addEventListener(CHANGED, external);
  window.addEventListener('storage', storage);
  sync();
  return { sync, dispose: () => { input.removeEventListener('change', changed); window.removeEventListener(CHANGED, external); window.removeEventListener('storage', storage); } };
}
