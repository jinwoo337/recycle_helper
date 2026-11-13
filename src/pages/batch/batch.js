import { readDisposalBatch, removeBatchItem } from '../../services/disposal-batch.js';
import { queueInput, startInputSearch } from '../../services/input-draft.js';
import { batchGroups, batchToText } from '../../domain/disposal/disposal-batch.js';
import { regionLabel, resultRegionLabel } from '../../domain/disposal/regions.js';
import { resultToText } from '../../domain/disposal/result-text.js';
import { inputForDisplay, resultForDisplay, resultPendingQuestion } from '../../domain/disposal/result-display.js';
import { bindResultCopy, copyResultFallback } from '../../components/result-copy.js';
import { escapeHtml } from '../../utils/html.js';

export function batchPage() {
  const { items, region } = readDisposalBatch();
  const count = items.filter(item => item.result).length;
  return `<section class="container batch-page" id="disposal-batch"><header class="item-heading"><h1 tabindex="-1">함께 버릴 물건</h1><p class="input-hint">${escapeHtml(regionLabel(region))}${items.length ? ` · ${count}/${items.length}개 판별함` : ''}</p></header>
    ${items.length ? `<p>각 물건의 재질과 오염을 따로 확인해 주세요. 확인이 끝난 물건부터 배출할 수 있어요.</p>${batchGroups(items).map(group => group.entries.length ? `<section class="item-card batch-group"><h2>${group.label} <small>${group.entries.length}개</small></h2><ul>${group.entries.map(({ id, input, result, displayed }) => `<li>
      <div><strong>${escapeHtml(input.itemName)}</strong><p>${escapeHtml(displayed?.method || '확인 필요 · 아직 판별하지 않았어요')}</p>${displayed ? `<small>${escapeHtml(resultRegionLabel(displayed))}</small>` : ''}</div>
      <div class="batch-actions"><button type="button" class="history-action" data-batch-item="${id}" aria-label="${escapeHtml(input.itemName)} ${result ? '조건 다시 확인' : '판별하기'}">${result ? '조건 다시 확인' : '판별하기'}</button><button type="button" class="history-action" data-batch-remove="${id}" aria-label="${escapeHtml(input.itemName)} 목록에서 빼기">빼기</button></div>
      ${result ? `<details><summary>단계·조건·출처 보기</summary><p class="batch-entry-detail">${escapeHtml(resultToText(input, result))}</p></details>` : ''}
    </li>`).join('')}</ul></section>` : '').join('')}
    <div class="form-actions"><button type="button" class="button primary" data-copy-result>목록 한 번에 복사</button><a class="button secondary" href="#/item-input">물건 찾기로 돌아가기</a></div>
    <p class="input-hint">이 목록은 현재 탭에서 유지돼요. 나중에 보려면 전체 목록을 복사해 주세요.</p><p class="input-hint" data-result-tools-status role="status"></p>${copyResultFallback}`
    : '<div class="item-card"><p>모아 둔 물건이 없어요. 나무젓가락이나 배달 용기를 판별하고 결과에서 함께 버릴 물건을 담을 수 있어요.</p><a class="button primary" href="#/item-input">물건 찾기</a></div>'}</section>`;
}

export function bindBatch() {
  let root = document.getElementById('disposal-batch');
  let disposeCopy = () => {};
  function bind() {
    disposeCopy = bindResultCopy(root, () => batchToText(readDisposalBatch().items), { message: '함께 버릴 물건 목록을 복사했어요.' });
    root.addEventListener('click', event => {
      const itemButton = event.target.closest('[data-batch-item]');
      if (itemButton) {
        const entry = readDisposalBatch().items.find(item => item.id === Number(itemButton.dataset.batchItem));
        if (entry) {
          startInputSearch();
          const input = entry.result ? inputForDisplay(entry.input, entry.result) : entry.input;
          const displayed = entry.result ? resultForDisplay(entry.input, entry.result) : null;
          queueInput({ ...input, batchItemId: entry.id, reviewSaved: Boolean(entry.result),
            ...(displayed ? { editPendingQuestion: resultPendingQuestion(input, displayed) } : {}) });
          location.hash = '/item-input';
        }
      }
      const remove = event.target.closest('[data-batch-remove]');
      if (remove) {
        removeBatchItem(Number(remove.dataset.batchRemove));
        disposeCopy();
        root.outerHTML = batchPage();
        root = document.getElementById('disposal-batch');
        bind();
        root.querySelector('h1').focus();
      }
    });
  }
  bind();
  return () => disposeCopy();
}
