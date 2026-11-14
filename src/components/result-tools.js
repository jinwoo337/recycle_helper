import { memberTools } from '../services/member-tools.js';
import { getCurrentMember } from '../services/auth.js';
import { lookupItem, normalizeItemName } from '../domain/disposal/item-suggestions.js';
import { resultToText } from '../domain/disposal/result-text.js';
import { resultRegionLabel } from '../domain/disposal/regions.js';
import { inputForDisplay, resultForDisplay } from '../domain/disposal/result-display.js';
import { bindDisposalChecklist } from './disposal-checklist.js';
import { bindVerifiedCollection } from './collection-help.js';
import { bindResultCopy, copyResultButton, copyResultFallback } from './result-copy.js';
import { escapeHtml } from '../utils/html.js';
import { addDisposalBatchItem, addMealToBatch } from '../services/disposal-batch.js';

const feedbackIssues = {
  destination: '수거처·배출 장소',
  method: '재질·배출 방법',
  preparation: '준비 단계·주의사항',
  local: '지역 기준·공식 링크',
};

export function missingItemMarkup() {
  return `<details class="feedback-panel" data-missing-item><summary>이 이름으로 품목 등록 요청</summary>
    <p class="feedback-context"><strong data-missing-item-context></strong><span>입력한 이름, 선택 지역, 당시 안내를 함께 보내요.</span></p>
    ${getCurrentMember() ? '<label for="missing-item-note">설명 추가 (선택)</label><textarea id="missing-item-note" rows="2" maxlength="500" placeholder="예: 제품 표시나 용도를 알려 주세요."></textarea><button class="button secondary" type="button" data-send-missing-item>등록 요청 보내기</button><p class="input-hint" data-missing-item-status role="status"></p><a class="history-action" href="#/profile">마이페이지에서 상태 보기</a>'
      : '<p class="input-hint"><a href="#/login">로그인</a>한 뒤 돌아오면 이 이름으로 요청할 수 있어요.</p>'}</details>`;
}

export function resultToolsMarkup(input, result) {
  const context = [input.itemName, resultRegionLabel(result), result.method].map(escapeHtml).join(' · ');
  return `<div class="result-actions"><button type="button" class="history-action" data-add-to-batch>함께 버릴 목록에 담기</button><button type="button" class="history-action" data-share-result hidden>공유하기</button>${copyResultButton}<button type="button" class="history-action" data-favorite aria-pressed="false">즐겨찾기</button></div>
    <p class="input-hint" data-result-tools-status role="status" aria-live="polite"></p>
    ${copyResultFallback}
    <details class="feedback-panel"><summary>결과 오류 또는 미등록 품목 제보</summary>
    ${getCurrentMember() ? `<p class="feedback-context"><strong>함께 보내는 안내</strong><span>${context}</span></p>
    <form data-feedback-form>
      <div class="field"><label>제보 종류<select name="kind"><option value="correction">판별 결과 오류</option><option value="missing_item" ${!lookupItem(input.itemName)?.material ? 'selected' : ''}>미등록 품목 / 배출 방법 제안</option></select></label></div>
      <div class="field"><label>문제가 있는 부분<select name="issue"><option value="">선택 안 함</option>${Object.entries(feedbackIssues).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label></div>
      <div class="field"><label>제보 내용<textarea name="message" rows="3" maxlength="2000" required placeholder="예: 공식 신청 링크가 열리지 않아요."></textarea></label></div>
      <p class="input-hint">관리자에게 검토를 요청해요. 개인정보는 적지 말아 주세요.</p>
      <button class="button secondary" type="submit">검토 요청 보내기</button><p data-feedback-status class="input-hint" role="status" aria-live="polite"></p><a class="history-action" href="#/profile">마이페이지에서 상태 보기</a>
    </form>`
      : '<p class="input-hint"><a href="#/login">로그인</a>한 뒤 제보를 보낼 수 있어요.</p>'}</details>`;
}

export function bindResultTools(root, input, result, { onNewItem, onRelatedItem, tools = memberTools } = {}) {
  const disposeChecklist = bindDisposalChecklist(root);
  if (root.querySelector('[data-verified-collection]')) bindVerifiedCollection(root, resultForDisplay(input, result));
  const disposeCopy = bindResultCopy(root, () => resultToText(input, result));
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
  root.querySelector('.related-disposal')?.addEventListener('click', event => {
    const related = event.target.closest('[data-related-item]');
    if (related && alive()) onRelatedItem?.(related.dataset.relatedItem);
  });
  root.querySelector('[data-add-meal-batch]')?.addEventListener('click', () => {
    if (!alive()) return;
    const display = resultForDisplay(input, result);
    if (addMealToBatch({ ...inputForDisplay(input, result), region: display.region }, display)) location.hash = '/batch';
    else root.querySelector('[data-meal-batch-status]').textContent = '목록이 가득 찼거나 다른 지역의 물건이 있어요. 목록을 먼저 확인해 주세요.';
  });
  root.querySelector('[data-add-to-batch]')?.addEventListener('click', () => {
    if (!alive()) return;
    const display = resultForDisplay(input, result);
    if (addDisposalBatchItem({ ...inputForDisplay(input, result), region: display.region }, display)) location.hash = '/batch';
    else status.textContent = '목록이 가득 찼거나 다른 지역의 물건이 있어요. 목록에서 먼저 정리해 주세요.';
  });
  const feedbackForm = root.querySelector('[data-feedback-form]');
  feedbackForm?.elements.message.addEventListener('input', () => feedbackForm.elements.message.setCustomValidity(''));
  feedbackForm?.elements.issue?.addEventListener('change', () => feedbackForm.elements.message.setCustomValidity(''));
  feedbackForm?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); if (button.disabled || !form.reportValidity()) return;
    const note = form.elements.message.value.trim();
    const issueId = form.elements.issue?.value;
    const issue = Object.hasOwn(feedbackIssues, issueId) ? feedbackIssues[issueId] : '';
    const message = issue ? `[${issue}] ${note}` : note;
    if (!note || message.length < 10 || message.length > 2000) {
      const validation = message.length > 2000 ? '선택한 부분과 제보 내용을 합쳐 2,000자 이내로 적어 주세요.'
        : issue ? '안내와 다른 점을 짧게 적어 주세요.'
          : '앞뒤 공백을 제외하고 10자 이상 적거나 문제가 있는 부분을 골라 주세요.';
      form.elements.message.setCustomValidity(validation);
      form.elements.message.reportValidity();
      return;
    }
    const feedbackStatus = form.querySelector('[data-feedback-status]'); button.disabled = true;
    const controls = [form.elements.kind, form.elements.issue, form.elements.message].filter(Boolean);
    const kind = form.elements.kind.value;
    controls.forEach(control => { control.disabled = true; });
    feedbackStatus.textContent = '제보를 보내고 있어요…';
    try {
      await tools.submitFeedback({
        kind, message, input: inputForDisplay(input, result), result: resultForDisplay(input, result),
      });
      if (alive()) { form.reset(); feedbackStatus.textContent = '검토 요청을 보냈어요. 공식 데이터에는 아직 반영되지 않았어요.'; }
    } catch (error) { if (alive()) feedbackStatus.textContent = error.message; }
    finally { if (alive()) { button.disabled = false; controls.forEach(control => { control.disabled = false; }); } }
  });
  window.addEventListener('favorites-changed', refreshFavorite);
  refreshFavorite();
  return () => { disposeCopy(); disposeChecklist(); disposed = true; refreshVersion++; window.removeEventListener('favorites-changed', refreshFavorite); };
}
