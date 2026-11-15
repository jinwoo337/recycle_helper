import { memberTools } from '../services/member-tools.js';
import { escapeHtml } from '../utils/html.js';
import { regionLabel } from '../domain/disposal/regions.js';
import { queueInput, startInputSearch } from '../services/input-draft.js';

const statusLabels = { pending: '접수됨', reviewed: '검토됨', applied: '안내에 반영됨', rejected: '반영하지 않음' };
const statusDescriptions = {
  pending: '아직 확인을 기다리고 있어요.',
  reviewed: '내용을 검토했어요. 안내 반영 여부는 상태가 바뀌면 확인할 수 있어요.',
  applied: '반영 뒤 검색하면 현재 안내를 확인할 수 있어요.',
  rejected: '현재 안내는 유지돼요. 새로 확인한 표시나 공식 안내가 있다면 보완 내용을 보낼 수 있어요.',
};

export function feedbackStatusMarkup() {
  return `<details class="item-card my-feedback" id="my-feedback"><summary>내 제보 상태</summary>
    <p class="input-hint">접수, 검토, 안내 반영 상태를 확인할 수 있어요.</p><p class="input-hint" role="status" data-feedback-list-status></p>
    <ul data-feedback-list></ul><button class="history-action" type="button" data-feedback-list-refresh>상태 다시 불러오기</button></details>`;
}

export function bindFeedbackStatus(root) {
  if (!root) return;
  const status = root.querySelector('[data-feedback-list-status]');
  const list = root.querySelector('[data-feedback-list]');
  const retry = root.querySelector('[data-feedback-list-refresh]');
  let reports = [];
  async function load() {
    if (retry.disabled) return;
    status.textContent = '제보 상태를 불러오고 있어요…'; retry.disabled = true;
    try {
      reports = await memberTools.listFeedback();
      if (!root.isConnected) return;
      list.innerHTML = reports.map((report, index) => `<li><strong>${escapeHtml(report.item_name)}</strong> <span>${escapeHtml(Object.hasOwn(statusLabels, report.status) ? statusLabels[report.status] : '상태 확인 필요')}</span>
        <p class="input-hint">${escapeHtml(regionLabel(report.input?.region))} · ${report.kind === 'missing_item' ? '품목 등록 요청' : '안내 정정 제보'} · ${escapeHtml(new Date(report.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }))}</p>
        ${report.result?.method ? `<p class="input-hint">제보 당시 안내: ${escapeHtml(report.result.method)}</p>` : ''}
        <p class="input-hint">${escapeHtml(Object.hasOwn(statusDescriptions, report.status) ? statusDescriptions[report.status] : '')}</p>
        ${report.status === 'applied' ? `<button class="history-action" type="button" data-view-feedback-item="${index}">현재 안내 보기</button>`
          : report.input?.itemName ? `<details><summary>표시·용도 등 보완 내용 보내기</summary><form data-feedback-followup="${index}">
          <label for="feedback-followup-${index}">새로 확인한 내용</label><textarea id="feedback-followup-${index}" name="message" rows="2" minlength="10" maxlength="1900" required></textarea>
          <button type="submit" class="history-action">보완 내용 보내기</button><p class="input-hint" role="status"></p></form></details>` : ''}
        </li>`).join('');
      status.textContent = reports.length ? `제보 ${reports.length}건` : '아직 보낸 제보가 없어요.';
    } catch (error) { if (root.isConnected) status.textContent = error.message; }
    finally { if (root.isConnected) retry.disabled = false; }
  }
  root.addEventListener('toggle', () => { if (root.open) load(); });
  retry.addEventListener('click', load);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-view-feedback-item]');
    const report = button && reports[Number(button.dataset.viewFeedbackItem)];
    if (!report) return;
    startInputSearch();
    queueInput({ itemName: report.item_name, ...(report.input && Object.hasOwn(report.input, 'region') ? { region: report.input.region } : {}),
      quickLookup: true });
    location.hash = '/item-input';
  });
  list.addEventListener('submit', async event => {
    const form = event.target.closest('[data-feedback-followup]');
    if (!form) return;
    event.preventDefault();
    const report = reports[Number(form.dataset.feedbackFollowup)];
    const note = form.elements.namedItem('message'), button = form.querySelector('button'), status = form.querySelector('[role="status"]');
    if (!report || button.disabled) return;
    const content = note.value.trim();
    if (content.length < 10) { status.textContent = '새로 확인한 내용을 10자 이상 적어 주세요.'; return; }
    button.disabled = true;
    try {
      await memberTools.submitFeedback({ kind: report.kind, input: report.input, result: report.result,
        message: `[기존 제보 ${report.id} 보완] ${content}` });
      if (form.isConnected) { form.reset(); status.textContent = '기존 제보 번호를 함께 보냈어요.'; }
    } catch (error) { if (form.isConnected) status.textContent = error.message; }
    finally { button.disabled = false; }
  });
}
