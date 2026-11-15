// 말로 물건 이름 입력하기. 브라우저가 음성 인식을 지원할 때만 🎤 버튼을 보여 줍니다(크롬·삼성 인터넷 등).
const Recognition = () => (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

export const voiceInputSupported = () => Boolean(Recognition());

export function voiceButtonMarkup(id) {
  return `<button type="button" class="voice-button" id="${id}" aria-label="말로 물건 이름 입력" title="말로 입력" hidden><span aria-hidden="true">🎤</span></button>`;
}

// button을 누르면 한국어로 듣고, 알아들은 말을 input에 넣은 뒤 onResult를 부릅니다. status에 진행 상황을 알려 줍니다.
export function bindVoiceInput(button, input, { status, onResult = () => {} } = {}) {
  const Speech = Recognition();
  if (!button || !Speech) return () => {};
  button.hidden = false;
  let recognition = null;
  const stop = () => { recognition?.abort(); recognition = null; button.classList.remove('is-listening'); button.setAttribute('aria-pressed', 'false'); };
  const click = () => {
    if (recognition) { stop(); return; }
    recognition = new Speech();
    recognition.lang = 'ko-KR'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const text = String(event.results?.[0]?.[0]?.transcript || '').replace(/[.?!。]+$/, '').trim();
      if (!text) return;
      input.value = text.slice(0, Number(input.maxLength) > 0 ? Number(input.maxLength) : 80);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (status) status.textContent = `‘${input.value}’(으)로 들었어요.`;
      onResult(input.value);
    };
    recognition.onerror = event => { if (status) status.textContent = event.error === 'not-allowed' ? '마이크 사용을 허용하면 말로 입력할 수 있어요.' : '잘 듣지 못했어요. 다시 눌러 말해 주세요.'; };
    recognition.onend = stop;
    button.classList.add('is-listening'); button.setAttribute('aria-pressed', 'true');
    if (status) status.textContent = '듣고 있어요… 물건 이름을 말해 주세요.';
    try { recognition.start(); } catch { stop(); }
  };
  button.addEventListener('click', click);
  return () => { button.removeEventListener('click', click); stop(); };
}
