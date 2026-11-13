import { addDisposalBatchItems, duplicateBatchPartIds, readDisposalBatch, removeBatchItem } from '../../services/disposal-batch.js';
import { disposalItemList, disposalQueryName, lookupItem } from '../../domain/disposal/item-suggestions.js';
import { queueInput, startInputSearch } from '../../services/input-draft.js';
import { batchGroups, batchToText } from '../../domain/disposal/disposal-batch.js';
import { regionLabel, resultRegionLabel } from '../../domain/disposal/regions.js';
import { resultToText } from '../../domain/disposal/result-text.js';
import { inputForDisplay, resultForDisplay, resultPendingQuestion } from '../../domain/disposal/result-display.js';
import { bindResultCopy, copyResultFallback } from '../../components/result-copy.js';
import { escapeHtml } from '../../utils/html.js';
import { readJudgementRegion } from '../../services/judgement-region.js';
import { getCurrentMember } from '../../services/auth.js';

export function batchPage() {
  const { items, region } = readDisposalBatch();
  const count = items.filter(item => item.result).length;
  const duplicates = duplicateBatchPartIds(items);
  return `<section class="container batch-page" id="disposal-batch"><header class="item-heading"><h1 tabindex="-1">함께 버릴 물건</h1><p class="input-hint">${escapeHtml(regionLabel(region))}${items.length ? ` · ${count}/${items.length}개 판별함` : ''}</p></header>
    <form class="batch-add" data-batch-add><label for="batch-name">목록에 물건 추가</label><div><input id="batch-name" name="itemName" maxlength="80" required placeholder="예: 우유팩, 과자 봉지"><button class="button secondary" type="submit">추가</button></div><p class="input-hint" data-batch-add-status role="status"></p></form>
    ${items.length ? `<p>각 물건의 재질과 오염을 따로 확인해 주세요. 확인이 끝난 물건부터 배출할 수 있어요.</p>${batchGroups(items).map(group => group.entries.length ? `<section class="item-card batch-group"><h2>${group.label} <small>${group.entries.length}개</small></h2><ul>${group.entries.map(({ id, input, result, displayed }) => `<li>
      <div><strong>${escapeHtml(input.itemName)}</strong><p>${escapeHtml(displayed?.method || '확인 필요 · 아직 판별하지 않았어요')}</p>${displayed ? `<small>${escapeHtml(resultRegionLabel(displayed))}</small>` : ''}
      ${duplicates.has(id) ? '<p class="input-hint">배달 용기의 부속품에도 있어요. 같은 물건이면 이 항목을 빼 주세요.</p>' : ''}</div>
      <div class="batch-actions"><button type="button" class="history-action" data-batch-item="${id}" aria-label="${escapeHtml(input.itemName)} ${result ? '조건 다시 확인' : '판별하기'}">${result ? '조건 다시 확인' : '판별하기'}</button><button type="button" class="history-action" data-batch-remove="${id}" aria-label="${escapeHtml(input.itemName)} 목록에서 빼기">빼기</button></div>
      ${result ? `<details><summary>단계·조건·출처 보기</summary><p class="batch-entry-detail">${escapeHtml(resultToText(input, result))}</p></details>` : ''}
    </li>`).join('')}</ul></section>` : '').join('')}
    <div class="form-actions"><button type="button" class="button primary" data-copy-result>목록 한 번에 복사</button><a class="button secondary" href="#/item-input">물건 찾기로 돌아가기</a></div>
    <p class="input-hint">이 브라우저에서 다시 열어도 목록과 확인 상태가 유지돼요.</p><p class="input-hint" data-result-tools-status role="status"></p>${copyResultFallback}`
    : '<div class="item-card"><p>모아 둔 물건이 없어요. 이름을 적어 추가하거나 배출 결과에서 담아 주세요.</p><a class="button primary" href="#/item-input">물건 찾기</a></div>'}</section>`;
}

export function bindBatch() {
  let root = document.getElementById('disposal-batch');
  let disposeCopy = () => {};
  function refresh(focus) {
    disposeCopy();
    root.outerHTML = batchPage();
    root = document.getElementById('disposal-batch');
    bind();
    root.querySelector(focus)?.focus();
  }
  function bind() {
    disposeCopy = bindResultCopy(root, () => batchToText(readDisposalBatch().items), { message: '함께 버릴 물건 목록을 복사했어요.' });
    root.querySelector('[data-batch-add]').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget, input = form.elements.namedItem('itemName'), itemName = input.value.trim();
      const { items, region } = readDisposalBatch();
      const parts = disposalItemList(itemName);
      const names = parts.length ? parts : [lookupItem(itemName)?.material ? itemName : disposalQueryName(itemName) || itemName];
      if (!itemName || !names[0] || !addDisposalBatchItems(names, items.length ? region : readJudgementRegion(getCurrentMember()))) {
        form.querySelector('[data-batch-add-status]').textContent = !itemName ? '물건 이름을 입력해 주세요.' : '목록이 가득 찼어요.';
        return;
      }
      refresh('#batch-name');
      root.querySelector('[data-batch-add-status]').textContent = `${names.map(name => `‘${name}’`).join(', ')} · 목록에서 확인할 수 있어요.`;
    });
    root.addEventListener('click', event => {
      const itemButton = event.target.closest('[data-batch-item]');
      if (itemButton) {
        const entry = readDisposalBatch().items.find(item => item.id === Number(itemButton.dataset.batchItem));
        if (entry) {
          startInputSearch();
          const input = entry.result ? inputForDisplay(entry.input, entry.result) : entry.input;
          const displayed = entry.result ? resultForDisplay(entry.input, entry.result) : null;
          queueInput({ ...input, batchItemId: entry.id, reviewSaved: Boolean(entry.result), quickLookup: !entry.result,
            ...(displayed ? { editPendingQuestion: resultPendingQuestion(input, displayed) } : {}) });
          location.hash = '/item-input';
        }
      }
      const remove = event.target.closest('[data-batch-remove]');
      if (remove) {
        removeBatchItem(Number(remove.dataset.batchRemove));
        refresh('h1');
      }
    });
  }
  bind();
  return () => disposeCopy();
}
