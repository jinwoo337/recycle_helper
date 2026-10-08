import { escapeHtml } from '../../utils/html.js';
import { getAllDisposalHistory, deleteDisposalRecord } from '../../services/disposal-history.js';
import { getDisposalStatistics, searchDisposalHistory } from '../../domain/disposal/statistics.js';
import { resultMarkup } from '../item-input/item-input.js';

export function historyPage() {
  return `<section class="container history-page">
    <a class="back-link" href="#/">← 메인으로</a>
    <header class="history-heading"><div><p class="eyebrow">MY RECYCLING</p><h1>나의 기록과 통계</h1><p>살펴본 물건과 배출 방법을 한눈에 확인해요.</p></div><a href="#/item-input" class="button primary">새 물품 판별하기 ↗</a></header>
    <section class="item-card statistics-card" aria-labelledby="statistics-title"><div class="history-section-title"><div><p class="eyebrow">작은 실천이 쌓이는 중</p><h2 id="statistics-title">분리배출 유형별 통계</h2></div><div class="total-stat"><span>총 판별한 물품</span><strong id="statistics-total">0<span>개</span></strong></div></div>
      <p class="input-hint">검색과 관계없이 저장된 전체 판별 기록을 집계해요. 같은 물품을 다시 판별하면 각각 1개로 계산하며, 실제 배출 완료를 뜻하지 않아요.</p>
      <div id="statistics-chart" class="statistics-chart"></div><p class="input-hint">각 기록은 1개 유형에만 포함해요. 모두 재활용인 복합 물품은 본체 유형으로, 재활용·일반 배출이 섞이면 ‘재질별 배출’로 집계해요. 일반 배출·추가 확인 결과는 해당 유형으로 집계해요.</p><p id="legacy-statistics-note" class="input-hint"></p>
    </section>
    <section class="item-card history-card" aria-labelledby="history-title"><div class="history-section-title"><div><p class="eyebrow">MY HISTORY</p><h2 id="history-title">전체 분리배출 기록</h2></div><span id="history-count" class="history-count"></span></div>
      <div class="field history-search"><label for="history-search">물품 이름으로 검색</label><input id="history-search" type="search" placeholder="예: 우유팩, 생수병" maxlength="80"></div>
      <p id="history-page-status" class="input-hint" role="status" aria-live="polite"></p>
      <div id="history-records"></div><div id="history-pagination" class="history-pagination"></div>
      <div id="history-page-confirm" class="history-delete-confirm" hidden><p id="history-page-delete-message"></p><div class="choice-row"><button type="button" class="history-action" id="history-page-delete">삭제하기</button><button type="button" class="history-action" id="history-page-cancel">취소</button></div></div>
    </section>
    <section id="history-detail" class="item-card item-summary" hidden tabindex="-1" aria-labelledby="summary-title"></section>
  </section>`;
}

export function bindHistory() {
  const root = document.querySelector('.history-page');
  const search = document.getElementById('history-search');
  const detail = document.getElementById('history-detail');
  const status = document.getElementById('history-page-status');
  const confirmation = document.getElementById('history-page-confirm');
  const pageSize = 10;
  let records = [], page = 1, selectedId = null, pending = null, deleting = false, loadVersion = 0;

  function drawStatistics() {
    const stats = getDisposalStatistics(records);
    document.getElementById('statistics-total').innerHTML = `${stats.total}<span>개</span>`;
    document.getElementById('statistics-chart').innerHTML = stats.categories.map(category => `<div class="chart-row"><span class="chart-label">${category.label}</span><div class="chart-track" aria-hidden="true"><span style="width:${category.ratio}%;background:${category.color}"></span></div><span class="chart-value">${category.count}개 <small>(${category.ratio.toFixed(1)}%)</small></span></div>`).join('');
    document.getElementById('legacy-statistics-note').textContent = stats.legacyCount ? `이전 이름 기록 ${stats.legacyCount}개는 판별 결과가 없어 통계에서 제외했어요.` : '';
  }
  function drawRecords() {
    const filtered = searchDisposalHistory(records, search.value);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pageCount);
    document.getElementById('history-count').textContent = `${filtered.length}개${search.value.trim() ? ' 검색됨' : ' 기록'}`;
    document.getElementById('history-records').innerHTML = filtered.length ? `<ol class="history-record-list">${filtered.slice((page - 1) * pageSize, page * pageSize).map(record => `<li><button type="button" class="history-record-open" data-open-record="${escapeHtml(record.id)}"><strong>${escapeHtml(record.itemName)}</strong><span>${record.legacy ? '이전 이름 기록 · 판별 조건과 결과 없음' : escapeHtml(record.result.method)}</span><small>${record.legacy ? '조건을 새로 입력해 판별해 주세요.' : escapeHtml(new Date(record.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))}</small></button><button type="button" class="history-action" data-remove-record="${escapeHtml(record.id)}" aria-label="${escapeHtml(record.itemName)} 기록 삭제">삭제</button></li>`).join('')}</ol>` : `<div class="history-empty"><strong>${records.length ? '검색한 물품이 없어요.' : '아직 저장한 기록이 없어요.'}</strong><p>${records.length ? '다른 이름으로 검색해 보세요.' : '물품을 판별하면 기록과 통계가 함께 쌓여요.'}</p><a href="#/item-input" class="back-link">분리배출 알아보기 →</a></div>`;
    document.getElementById('history-pagination').innerHTML = pageCount > 1 ? `<button type="button" class="history-action" data-page="previous" ${page === 1 ? 'disabled' : ''}>이전</button><span>${page} / ${pageCount} 페이지</span><button type="button" class="history-action" data-page="next" ${page === pageCount ? 'disabled' : ''}>다음</button>` : '';
  }
  function showDetail(record, focus = true) {
    selectedId = record.id;
    detail.innerHTML = record.legacy ? `<p class="eyebrow">이전 이름 기록</p><h2 id="summary-title">${escapeHtml(record.itemName)}</h2><p class="demo-notice">이 기록에는 물품 이름만 저장되어 있어요. 당시 조건과 판별 결과는 없어요.</p><a class="button secondary" href="#/item-input">새로 판별하기</a>` : resultMarkup(record.input, record.result, record.createdAt);
    if (!record.legacy) {
      detail.querySelector('.input-details').open = true;
      const edit = detail.querySelector('#edit-item');
      edit.outerHTML = '<a class="button secondary" href="#/item-input">새 물품 판별하기</a>';
    }
    detail.hidden = false;
    if (focus) { detail.focus(); detail.scrollIntoView({ behavior: 'auto', block: 'start' }); }
  }
  async function refresh() {
    const version = ++loadVersion;
    const loaded = await getAllDisposalHistory();
    if (!root.isConnected || version !== loadVersion) return;
    records = loaded; drawStatistics(); drawRecords();
    const selected = records.find(record => record.id === selectedId);
    if (selected) showDetail(selected, false); else { selectedId = null; detail.hidden = true; }
  }
  search.addEventListener('input', () => { page = 1; drawRecords(); });
  document.getElementById('history-records').addEventListener('click', event => {
    const open = event.target.closest('[data-open-record]');
    if (open) { const record = records.find(record => record.id === open.dataset.openRecord); if (record) showDetail(record); }
    const remove = event.target.closest('[data-remove-record]');
    if (!remove || deleting) return;
    pending = records.find(record => record.id === remove.dataset.removeRecord); if (!pending) return;
    document.getElementById('history-page-delete-message').textContent = `‘${pending.itemName}’ 기록을 삭제할까요? 삭제 후에는 복구할 수 없어요.`;
    confirmation.hidden = false; document.getElementById('history-page-cancel').focus();
  });
  document.getElementById('history-pagination').addEventListener('click', event => {
    const button = event.target.closest('[data-page]'); if (!button) return;
    page += button.dataset.page === 'next' ? 1 : -1; drawRecords(); search.focus();
  });
  document.getElementById('history-page-cancel').addEventListener('click', () => { pending = null; confirmation.hidden = true; search.focus(); });
  document.getElementById('history-page-delete').addEventListener('click', async () => {
    if (!pending || deleting) return;
    deleting = true; confirmation.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      await deleteDisposalRecord(pending);
      if (!root.isConnected) return;
      pending = null; confirmation.hidden = true; await refresh(); status.textContent = '기록을 삭제하고 통계를 업데이트했어요.'; search.focus();
    } catch (error) { if (root.isConnected) status.textContent = error.message; }
    finally { deleting = false; confirmation.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
  });
  const storageChanged = event => { if (event.key === null || event.key?.startsWith('recycle-helper.')) refresh(); };
  window.addEventListener('disposal-history-changed', refresh);
  window.addEventListener('storage', storageChanged);
  refresh();
  return () => { loadVersion++; window.removeEventListener('disposal-history-changed', refresh); window.removeEventListener('storage', storageChanged); };
}
