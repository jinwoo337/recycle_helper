import { getCurrentMember } from '../services/auth.js';
import { memberTools } from '../services/member-tools.js';

const prefix = '[AI 안내 오류] ';
const maxLength = 2000 - prefix.length;

export function aiFeedbackMarkup() {
  return `<details class="feedback-panel"><summary>틀렸어요</summary>
    ${getCurrentMember() ? `<form data-ai-feedback-form>
      <div class="field"><label>어떤 부분이 틀렸나요?<textarea name="message" rows="3" required maxlength="${maxLength}" placeholder="예: 이 지역에서는 종량제봉투에 버려요."></textarea></label></div>
      <p class="input-hint">품목명, 지역, 당시 안내를 함께 보내요.</p>
      <button class="button secondary" type="submit">제보 보내기</button>
      <p class="input-hint" role="status"></p>
    </form>` : '<p class="input-hint"><a href="#/login">로그인</a>하면 잘못된 내용을 제보할 수 있어요.</p>'}
  </details>`;
}

export function bindAiFeedback(root, context, tools = memberTools) {
  const form = root.querySelector('[data-ai-feedback-form]');
  if (!form) return;
  const field = form.elements.message;
  const button = form.querySelector('button');
  const status = form.querySelector('[role="status"]');
  let submitting = false, sent = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || sent) return;
    const note = field.value.trim();
    if (!note || note.length > maxLength) {
      status.textContent = `잘못된 부분을 ${maxLength.toLocaleString('ko-KR')}자 이내로 적어 주세요.`;
      field.focus();
      return;
    }
    submitting = true;
    button.disabled = field.readOnly = true;
    status.textContent = '제보를 보내고 있어요…';
    try {
      await tools.submitFeedback({ ...context(), kind: 'correction', message: prefix + note });
      sent = true;
      if (form.isConnected) { form.reset(); status.textContent = '제보를 보냈어요. 관리자 검토 후 마이페이지에서 상태를 확인할 수 있어요.'; }
    } catch (error) {
      if (form.isConnected) status.textContent = error.message;
    } finally {
      submitting = false;
      if (form.isConnected && !sent) button.disabled = field.readOnly = false;
    }
  });
}
