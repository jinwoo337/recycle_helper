import { memberTools } from '../services/member-tools.js';
import { getCurrentMember } from '../services/auth.js';
import { lookupItem, normalizeItemName } from '../domain/disposal/item-suggestions.js';
import { resultToText } from '../domain/disposal/result-text.js';
import { bindRegionalComparison } from './regional-comparison.js';
import { inputForDisplay } from '../domain/disposal/result-display.js';

export function resultToolsMarkup(input) {
  return `<div class="result-actions"><button type="button" class="button secondary" data-share-result hidden>📤 공유하기</button><button type="button" class="button secondary" data-copy-result>결과 복사</button><button type="button" class="button secondary" data-favorite aria-pressed="false">즐겨찾기</button><button type="button" class="button secondary" data-new-item>다른 물품 검색</button></div>
    <p class="input-hint" data-result-tools-status role="status" aria-live="polite"></p>
    <textarea class="copy-fallback" data-copy-fallback aria-label="복사할 판별 결과" readonly hidden></textarea>
    <details class="feedback-panel"><summary>결과 오류 또는 미등록 품목 제보</summary>
    <p class="input-hint">제보는 관리자 검토 대기로 저장되며, 검증 없이 판별 데이터에 반영되지 않아요. 개인정보는 적지 말아 주세요.</p>
    ${getCurrentMember() ? `<form data-feedback-form><div class="field"><label>제보 종류<select name="kind"><option value="correction">판별 결과 오류</option><option value="missing_item" ${!lookupItem(input.itemName) ? 'selected' : ''}>미등록 품목 / 배출 방법 제안</option></select></label></div><div class="field"><label>제보 내용<textarea name="message" rows="4" minlength="10" maxlength="2000" required placeholder="실제 물품과 지역 안내 등 확인할 내용을 10자 이상 적어 주세요."></textarea></label></div><button class="button secondary" type="submit">검토 요청 보내기</button><p data-feedback-status class="input-hint" role="status" aria-live="polite"></p></form>`
      : '<p class="input-hint"><a href="#/login">로그인</a>한 뒤 제보를 보낼 수 있어요.</p>'}</details>`;
}

export function bindResultTools(root, input, result, { onNewItem, tools = memberTools } = {}) {
  const disposeComparison = bindRegionalComparison(root, inputForDisplay(input, result));
  const status = root.querySelector('[data-result-tools-status]');
  const favorite = root.querySelector('[data-favorite]');
  let selected = false, disposed = false, loaded = false, busy = false, refreshVersion = 0;
  const alive = () => !disposed && root.isConnected && root.contains(favorite);
  async function refreshFavorite({ reportError = false } = {}) {
    const version = ++refreshVersion;
    try {
      const entries = await tools.listFavorites();
      if (!alive() || version !== refreshVersion) return;
      selected = entries.some(entry => entry.key === normalizeItemName(input.itemName));
      loaded = true;
      favorite.setAttribute('aria-pressed', String(selected));
      favorite.textContent = selected ? '즐겨찾기 해제' : '즐겨찾기 저장';
      favorite.disabled = busy;
    } catch (error) { if (alive() && version === refreshVersion) { loaded = false; favorite.textContent = '즐겨찾기'; favorite.disabled = busy; if (reportError) status.textContent = error.message; } }
  }
  favorite.addEventListener('click', async () => {
    if (busy || !alive()) return;
    busy = true; favorite.disabled = true;
    try {
      if (!loaded) { await refreshFavorite({ reportError: true }); if (!loaded || !alive()) return; }
      const target = !selected;
      await tools.setFavorite(input, target);
      if (alive()) { status.textContent = target ? '즐겨찾기에 저장했어요.' : '즐겨찾기를 해제했어요.'; await refreshFavorite(); }
    }
    catch (error) { if (alive()) status.textContent = error.message; }
    finally { busy = false; if (alive()) favorite.disabled = false; }
  });
  root.querySelector('[data-copy-result]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(resultToText(input, result)); if (alive()) status.textContent = '판별 결과를 복사했어요.'; }
    catch {
      if (!alive()) return;
      const field = root.querySelector('[data-copy-fallback]'); field.hidden = false; field.value = resultToText(input, result); field.focus(); field.select();
      status.textContent = '자동 복사를 사용할 수 없어요. 선택된 내용을 직접 복사해 주세요.';
    }
  });
  // 휴대폰 등 공유 기능이 있는 브라우저에서는 카카오톡·문자로 바로 보낼 수 있게 공유 버튼을 보여 줍니다.
  const share = root.querySelector('[data-share-result]');
  if (typeof navigator.share === 'function') {
    share.hidden = false;
    share.addEventListener('click', async () => {
      try { await navigator.share({ title: `${input.itemName} 분리배출 방법`, text: resultToText(input, result), url: location.origin + location.pathname }); if (alive()) status.textContent = '공유했어요.'; }
      catch (error) { if (alive() && error?.name !== 'AbortError') status.textContent = '공유하지 못했어요. 결과 복사를 이용해 주세요.'; }
    });
  }
  root.querySelector('[data-new-item]').addEventListener('click', () => onNewItem?.());
  const feedbackForm = root.querySelector('[data-feedback-form]');
  feedbackForm?.elements.message.addEventListener('input', () => feedbackForm.elements.message.setCustomValidity(''));
  feedbackForm?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); if (button.disabled || !form.reportValidity()) return;
    const message = form.elements.message.value.trim();
    if (message.length < 10) { form.elements.message.setCustomValidity('앞뒤 공백을 제외하고 10자 이상 적어 주세요.'); form.elements.message.reportValidity(); return; }
    const feedbackStatus = form.querySelector('[data-feedback-status]'); button.disabled = true;
    const controls = [form.elements.kind, form.elements.message];
    const kind = form.elements.kind.value;
    controls.forEach(control => { control.disabled = true; });
    feedbackStatus.textContent = '제보를 보내고 있어요…';
    try {
      await tools.submitFeedback({ kind, input, result, message });
      if (alive()) { form.reset(); feedbackStatus.textContent = '검토 요청을 보냈어요. 공식 데이터에는 아직 반영되지 않았어요.'; }
    } catch (error) { if (alive()) feedbackStatus.textContent = error.message; }
    finally { if (alive()) { button.disabled = false; controls.forEach(control => { control.disabled = false; }); } }
  });
  window.addEventListener('favorites-changed', refreshFavorite);
  refreshFavorite();
  return () => { disposed = true; refreshVersion++; disposeComparison(); window.removeEventListener('favorites-changed', refreshFavorite); };
}
