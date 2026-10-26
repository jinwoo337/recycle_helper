import { memberTools } from '../services/member-tools.js';
import { getCurrentMember } from '../services/auth.js';
import { lookupItem, normalizeItemName } from '../domain/disposal/item-suggestions.js';
import { resultToText } from '../domain/disposal/result-text.js';

export function resultToolsMarkup(input) {
  return `<div class="result-actions"><button type="button" class="button secondary" data-copy-result>결과 복사</button><button type="button" class="button secondary" data-favorite aria-pressed="false" disabled>즐겨찾기 확인 중…</button><button type="button" class="button secondary" data-new-item>다른 물품 검색</button></div>
    <p class="input-hint" data-result-tools-status role="status" aria-live="polite"></p>
    <textarea class="copy-fallback" data-copy-fallback aria-label="복사할 판별 결과" readonly hidden></textarea>
    <details class="feedback-panel"><summary>결과 오류 또는 미등록 품목 제보</summary>
    <p class="input-hint">제보는 관리자 검토 대기로 저장되며, 검증 없이 판별 데이터에 반영되지 않아요. 개인정보는 적지 말아 주세요.</p>
    ${getCurrentMember() ? `<form data-feedback-form><div class="field"><label>제보 종류<select name="kind"><option value="correction">판별 결과 오류</option><option value="missing_item" ${!lookupItem(input.itemName) ? 'selected' : ''}>미등록 품목 / 배출 방법 제안</option></select></label></div><div class="field"><label>제보 내용<textarea name="message" rows="4" minlength="10" maxlength="2000" required placeholder="실제 물품과 지역 안내 등 확인할 내용을 10자 이상 적어 주세요."></textarea></label></div><button class="button secondary" type="submit">검토 요청 보내기</button><p data-feedback-status class="input-hint" role="status" aria-live="polite"></p></form>`
      : '<p class="input-hint"><a href="#/login">로그인</a>한 뒤 제보를 보낼 수 있어요.</p>'}</details>`;
}

export function bindResultTools(root, input, result, { onNewItem } = {}) {
  const status = root.querySelector('[data-result-tools-status]');
  const favorite = root.querySelector('[data-favorite]');
  let selected = false, disposed = false, loaded = false;
  const alive = () => !disposed && root.isConnected && root.contains(favorite);
  async function refreshFavorite() {
    try {
      const entries = await memberTools.listFavorites();
      if (!alive()) return;
      selected = entries.some(entry => entry.key === normalizeItemName(input.itemName));
      loaded = true;
      favorite.setAttribute('aria-pressed', String(selected));
      favorite.textContent = selected ? '즐겨찾기 해제' : '즐겨찾기 저장';
      favorite.disabled = false;
    } catch (error) { loaded = false; if (alive()) { favorite.textContent = '즐겨찾기 다시 확인'; favorite.disabled = false; status.textContent = error.message; } }
  }
  favorite.addEventListener('click', async () => {
    favorite.disabled = true;
    if (!loaded) { await refreshFavorite(); return; }
    try { await memberTools.setFavorite(input, !selected); if (alive()) { status.textContent = selected ? '즐겨찾기를 해제했어요.' : '즐겨찾기에 저장했어요.'; await refreshFavorite(); } }
    catch (error) { if (alive()) status.textContent = error.message; }
    finally { if (alive()) favorite.disabled = false; }
  });
  root.querySelector('[data-copy-result]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(resultToText(input, result)); if (alive()) status.textContent = '판별 결과를 복사했어요.'; }
    catch {
      if (!alive()) return;
      const field = root.querySelector('[data-copy-fallback]'); field.hidden = false; field.value = resultToText(input, result); field.focus(); field.select();
      status.textContent = '자동 복사를 사용할 수 없어요. 선택된 내용을 직접 복사해 주세요.';
    }
  });
  root.querySelector('[data-new-item]').addEventListener('click', () => onNewItem?.());
  root.querySelector('[data-feedback-form]')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); if (button.disabled || !form.reportValidity()) return;
    const feedbackStatus = form.querySelector('[data-feedback-status]'); button.disabled = true;
    feedbackStatus.textContent = '제보를 보내고 있어요…';
    try {
      await memberTools.submitFeedback({ kind: form.elements.kind.value, input, result, message: form.elements.message.value });
      if (alive()) { form.reset(); feedbackStatus.textContent = '검토 요청을 보냈어요. 공식 데이터에는 아직 반영되지 않았어요.'; }
    } catch (error) { if (alive()) feedbackStatus.textContent = error.message; }
    finally { if (alive()) button.disabled = false; }
  });
  window.addEventListener('favorites-changed', refreshFavorite);
  refreshFavorite();
  return () => { disposed = true; window.removeEventListener('favorites-changed', refreshFavorite); };
}
