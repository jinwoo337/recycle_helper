import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { BULKY_WASTE_FEE_SOURCE, bulkyWasteLocality, filterBulkyWasteFees, groupBulkyWasteFees, loadBulkyWasteFees } from '../../domain/disposal/bulky-waste.js';
import { regionLabel } from '../../domain/disposal/regions.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { escapeHtml } from '../../utils/html.js';

const pageSize = 15;
const won = new Intl.NumberFormat('ko-KR');

function externalLink(url, label, className = 'history-action') {
  return `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${label} (새 탭)`)}">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`;
}

export function bulkyWastePage(member) {
  const region = readJudgementRegion(member);
  return `<section class="container bulky-waste-page">
    <header class="guide-heading">
      <h1>대형폐기물 신고</h1>
      <p>배출 지역을 선택하고 품목마다 크기·규격별 수수료를 확인하세요.</p>
    </header>
    <section class="bulky-waste-card" aria-labelledby="bulky-region-title">
      <div class="bulky-waste-region">
        <div><h2 id="bulky-region-title">배출 지역</h2><p data-bulky-region-label role="status">${escapeHtml(regionLabel(region))}</p></div>
        <button type="button" class="history-action" data-bulky-region-toggle aria-controls="bulky-region-form" aria-expanded="${!region}" ${region ? '' : 'hidden'}>지역 변경</button>
      </div>
      <form id="bulky-region-form" novalidate ${region ? 'hidden' : ''}>
        ${judgementRegionMarkup(region, { onResult: true })}
        <div class="choice-row">
          <button type="submit" class="button primary">이 지역으로 조회</button>
          <button type="button" class="button secondary" data-bulky-region-cancel ${region ? '' : 'hidden'}>취소</button>
        </div>
      </form>
      <div class="bulky-waste-action" data-bulky-action hidden></div>
    </section>
    <section class="bulky-waste-card" aria-labelledby="bulky-fee-title">
      <h2 id="bulky-fee-title">품목별 수수료</h2>
      <div class="field" data-bulky-search-field hidden>
        <label for="bulky-item">품목명 또는 크기·규격 검색</label>
        <input id="bulky-item" type="search" maxlength="80" placeholder="예시 소파 3인용" autocomplete="off" aria-controls="bulky-fee-table">
      </div>
      <p class="bulky-waste-status" data-bulky-status role="status">${region ? '수수료를 불러오는 중이에요.' : '시·군·구를 선택하면 수수료를 확인할 수 있어요.'}</p>
      <table id="bulky-fee-table" class="bulky-waste-table" aria-labelledby="bulky-fee-title" hidden>
        <thead><tr><th scope="col">크기·규격</th><th scope="col">수수료</th></tr></thead>
      </table>
      <button type="button" class="button secondary bulky-waste-more" data-bulky-more aria-controls="bulky-fee-table" hidden>더 보기</button>
      <div class="bulky-waste-source" data-bulky-source hidden></div>
    </section>
  </section>`;
}

export function bindBulkyWaste(member) {
  const root = document.querySelector('.bulky-waste-page');
  const form = root.querySelector('#bulky-region-form');
  const toggle = root.querySelector('[data-bulky-region-toggle]');
  const cancel = root.querySelector('[data-bulky-region-cancel]');
  const regionLabelNode = root.querySelector('[data-bulky-region-label]');
  const action = root.querySelector('[data-bulky-action]');
  const search = root.querySelector('#bulky-item');
  const searchField = root.querySelector('[data-bulky-search-field]');
  const table = root.querySelector('#bulky-fee-table');
  const tableHeader = table.tHead;
  const status = root.querySelector('[data-bulky-status]');
  const source = root.querySelector('[data-bulky-source]');
  const more = root.querySelector('[data-bulky-more]');
  const province = form.elements.namedItem('judgementProvince');
  // This screen always needs a locality, but uses the same fields as the other region pickers.
  province.options[0].textContent = '시·도 선택';
  province.required = true;

  let region = readJudgementRegion(member);
  const editor = bindJudgementRegion(form, region);
  let request = 0;
  let rows = [];
  let shown = pageSize;

  function draw(focusIndex) {
    const items = groupBulkyWasteFees(filterBulkyWasteFees(rows, search.value));
    const visible = items.slice(0, shown);
    table.replaceChildren(tableHeader);
    table.insertAdjacentHTML('beforeend', visible.map(([name, variants]) => `<tbody>
      <tr class="bulky-waste-item"><th scope="rowgroup" colspan="2">${escapeHtml(name)}</th></tr>
      ${variants.map(([size, fee]) => `<tr><th scope="row">${escapeHtml(size || '규격 확인 필요')}</th><td>${fee === null ? '공식 확인' : fee === 0 ? '무료' : `${won.format(fee)}원`}</td></tr>`).join('')}
    </tbody>`).join(''));
    status.textContent = items.length ? `${won.format(items.length)}개 품목 · ${won.format(visible.length)}개 표시` : '검색 결과가 없어요. 다른 품목명이나 규격을 입력해 주세요.';
    table.hidden = items.length === 0;
    more.hidden = items.length <= shown;
    const firstNewItem = table.tBodies[focusIndex]?.rows[0];
    if (firstNewItem) {
      firstNewItem.tabIndex = -1;
      firstNewItem.focus();
    }
  }

  async function showRegion() {
    const version = ++request;
    const locality = bulkyWasteLocality(region);
    if (!locality) return;
    regionLabelNode.textContent = locality.label;
    action.hidden = false;
    action.innerHTML = externalLink(locality.action.url, locality.action.label, 'button primary');
    if (!locality.hasReportGuide) {
      action.insertAdjacentHTML('beforeend', '<p class="input-hint">지자체 누리집에서 ‘대형폐기물’을 검색해 신고 방법을 확인해 주세요.</p>');
    }
    rows = [];
    table.replaceChildren(tableHeader);
    searchField.hidden = table.hidden = more.hidden = true;
    const officialFeeLink = locality.feePage ? externalLink(locality.feePage, '지자체 공식 수수료표') : '';
    source.hidden = !locality.feePage;
    source.innerHTML = officialFeeLink;
    status.textContent = '수수료를 불러오는 중이에요.';
    try {
      const fees = await loadBulkyWasteFees(locality.key);
      if (version !== request) return;
      if (!fees?.rows.length) {
        status.textContent = locality.feePage ? '이 지역의 수수료는 아래 지자체 수수료표에서 확인해 주세요.'
          : '공공데이터에 등록된 수수료가 없어요. 지자체에서 품목별 금액을 확인해 주세요.';
        return;
      }
      rows = fees.rows;
      shown = pageSize;
      searchField.hidden = false;
      source.hidden = false;
      const feeSource = fees.source ? externalLink(fees.source, '지자체 공식 수수료표')
        : externalLink(BULKY_WASTE_FEE_SOURCE, '공공데이터포털 수수료 원본') + officialFeeLink;
      source.innerHTML = `<p>${escapeHtml(locality.key)} · ${fees.source ? '공식표 수정일' : '자료 기준일'} ${escapeHtml(fees.dates.join(' ~ '))}<br>최종 수수료는 신고할 때 확인해 주세요.</p>${feeSource}`;
      draw();
    } catch {
      if (version === request) status.textContent = '수수료를 불러오지 못했어요. 새로고침하거나 지자체에서 확인해 주세요.';
    }
  }

  function setEditor(open) {
    form.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      editor.set(region);
      editor.focus();
    } else {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', () => setEditor(form.hidden));
  cancel.addEventListener('click', () => setEditor(false));
  form.addEventListener('keydown', event => {
    if (event.key === 'Escape' && region) { event.preventDefault(); setEditor(false); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!province.reportValidity() || !editor.validate()) return;
    region = editor.get();
    rememberJudgementRegion(region, member);
    toggle.hidden = cancel.hidden = false;
    setEditor(false);
    showRegion();
  });
  search.addEventListener('input', () => { shown = pageSize; draw(); });
  more.addEventListener('click', () => { const previous = shown; shown += pageSize; draw(previous); });
  showRegion();
  return () => { request += 1; };
}
