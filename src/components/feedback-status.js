import { memberTools } from '../services/member-tools.js';
import { escapeHtml } from '../utils/html.js';
import { regionLabel } from '../domain/disposal/regions.js';

const statusLabels = { pending: '접수됨', reviewed: '검토됨', applied: '안내에 반영됨', rejected: '반영하지 않음' };

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
  async function load() {
    if (retry.disabled) return;
    status.textContent = '제보 상태를 불러오고 있어요…'; retry.disabled = true;
    try {
      const reports = await memberTools.listFeedback();
      if (!root.isConnected) return;
      list.innerHTML = reports.map(report => `<li><strong>${escapeHtml(report.item_name)}</strong> <span>${escapeHtml(Object.hasOwn(statusLabels, report.status) ? statusLabels[report.status] : '상태 확인 필요')}</span>
        <p class="input-hint">${escapeHtml(regionLabel(report.input?.region))} · ${report.kind === 'missing_item' ? '품목 등록 요청' : '안내 정정 제보'} · ${escapeHtml(new Date(report.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }))}</p>
        ${report.result?.method ? `<p class="input-hint">제보 당시 안내: ${escapeHtml(report.result.method)}</p>` : ''}</li>`).join('');
      status.textContent = reports.length ? `제보 ${reports.length}건` : '아직 보낸 제보가 없어요.';
    } catch (error) { if (root.isConnected) status.textContent = error.message; }
    finally { if (root.isConnected) retry.disabled = false; }
  }
  root.addEventListener('toggle', () => { if (root.open) load(); });
  retry.addEventListener('click', load);
}
