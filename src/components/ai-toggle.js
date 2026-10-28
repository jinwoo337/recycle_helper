// 홈과 입력 화면이 같은 설정을 쓰고 ON/OFF와 색으로 상태를 표시합니다.
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

export function aiToggleMarkup(id, { compact = false } = {}) {
  const safe = escapeHtml(id);
  return `<label class="ai-toggle is-switch-only${compact ? ' is-compact' : ''}" data-ai-toggle title="AI 사용 켜기/끄기">
    <input type="checkbox" id="${safe}" role="switch" aria-label="이름 검색 AI 사용">
    <span class="ai-toggle-track" aria-hidden="true"><span class="ai-toggle-label on">ON</span><span class="ai-toggle-label off">OFF</span></span>
  </label>`;
}

// 스위치를 연결합니다. onChange는 사용자가 직접 바꿨을 때만 부릅니다. sync()로 화면을 다시 맞출 수 있습니다.
export function bindAiToggle(input, onChange = () => {}) {
  const label = input.closest('[data-ai-toggle]');
  const sync = (enabled = readAiEnabled()) => {
    input.checked = enabled;
    label.classList.toggle('is-on', enabled);
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
