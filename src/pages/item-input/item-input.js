import { escapeHtml } from '../../utils/html.js';
import { getDisposalHistory, saveDisposalRecord, deleteDisposalRecord, clearDisposalHistory } from '../../services/disposal-history.js';
import { MATERIALS, TYPES, supportsState, needsWashQuestion, normalizePart, judgeDisposal, RULE_SOURCE, RULE_VERSION } from '../../domain/disposal/rules.js';
import { disposalItemList, disposalQueryName, suggestItemInfo, searchItemNames, lookupItem, normalizeItemName, relatedItemCandidates, itemCandidateHint, itemCandidateTitle, itemTypeClarification } from '../../domain/disposal/item-suggestions.js';
import { cleanAiName, validateAiGuess, aiOpinionNeedsReview, suggestedItemCategory } from '../../domain/disposal/ai-classification.js';
import { requestAiGuess, reportAiGuess } from '../../services/ai-classify.js';
import { aiToggleMarkup, bindAiToggle, readAiEnabled } from '../../components/ai-toggle.js';
import { RECYCLE_MARKS, RECYCLE_MARK_SOURCE, markById } from '../../domain/disposal/recycle-marks.js';
import { encodeAiState } from '../../domain/disposal/ai-state.js';
import { getCurrentMember } from '../../services/auth.js';
import { getCatalogMessage, initializeItemCatalog } from '../../services/item-catalog.js';
import { resultToolsMarkup, bindResultTools, missingItemMarkup } from '../../components/result-tools.js';
import { memberTools } from '../../services/member-tools.js';
import { regionLabel, REGIONAL_SOURCES, regionalSourceDetail, regionalSourceLabel, resultRegionLabel, usesSeoulVinylQuestions } from '../../domain/disposal/regions.js';
import { METRO_GUIDES } from '../../domain/disposal/metro-guides.js';
import { cityGuide } from '../../domain/disposal/city-guides.js';
import { DAEJEON_GUIDES } from '../../domain/disposal/daejeon-guides.js';
import { inputSearchVersion, queueInput, startInputSearch, takeQueuedInput, UNNAMED_ITEM as unnamedItem } from '../../services/input-draft.js';
import { cleanLabelledBottleInput, cleanSingleMaterialInput } from '../../domain/disposal/input-shortcuts.js';
import { itemPresetInput } from '../../domain/disposal/input-presets.js';
import { CATALOG_DETAIL_SOURCES } from '../../domain/disposal/catalog-sources.js';
import { linkedComponentState, stateAnswers, selectedState } from '../../domain/disposal/input-state.js';
import { regionalComparisonMarkup } from '../../components/regional-comparison.js';
import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { categoryLabel, categoryAllowsMaterial } from '../../domain/disposal/item-categories.js';
import { disposalReasons, resultForDisplay, inputForDisplay, resultStepsForDisplay, conditionDetails, resultPendingQuestions } from '../../domain/disposal/result-display.js';
import { disposalScheduleMarkup } from '../../components/disposal-schedule.js';
import { detectItemCategory, isBatteryPackaging } from '../../domain/disposal/category-keywords.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';
import { prepareCategoryInput } from '../../domain/disposal/input-category.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { largeWasteHelp } from '../../domain/disposal/large-waste.js';
import { collectionPointMarkup } from '../../components/collection-help.js';
import { collectionActionMarkup } from '../../components/collection-action.js';
import { collectionAction } from '../../domain/disposal/collection-action.js';
import { disposalReasonMarkup } from '../../components/disposal-reason.js';
import { stepListMarkup } from '../../components/step-list.js';
import { inputModesMarkup, bindInputModes } from '../../components/input-modes.js';
import { verifiedNameGuide } from '../../domain/disposal/verified-name-guide.js';
import { handlingConditionQuestion } from '../../domain/disposal/special-guides.js';
import { checklistMarkup } from '../../components/disposal-checklist.js';
import { isAmbiguousSpoonName, relatedDisposalMarkup } from '../../components/related-disposal.js';
import { applyItemObservations } from '../../domain/disposal/item-observations.js';
import { addDisposalBatchItems, canResolveBatchName, readDisposalBatch, updateBatchItem } from '../../services/disposal-batch.js';
import { confirmedItemType, forgetConfirmedItemType, rememberConfirmedItemType } from '../../services/confirmed-item-types.js';

let draft = {};
let componentCount = 1;
let autoFillEnabled = true;
let draftOwner;
let draftVersion;
let lastVisibleResult;
let appliedEvidence = '';
let draftBatchId;
let draftBatchResolution = false;
const yesNo = [['yes', '네'], ['no', '아니요'], ['unknown', '모르겠어요']];
const attachments = {
  none: ['no', ''], detachable: ['yes', 'yes'], fixed: ['yes', 'no'], unknown: ['unknown', ''],
};
const packagingShapes = {
  container: { label: '음식이 담겼던 용기', hint: '본체가 플라스틱·종이·유리 중 무엇인지 살펴보세요.', materials: ['플라스틱', '종이', '유리', '금속·캔'] },
  film: { label: '봉지·포장 필름', hint: '얇은 포장이라도 종이, 비닐, 여러 재질을 붙인 포장은 달라요.', materials: ['비닐', '종이', '기타'] },
  bottle: { label: '병·컵', hint: '병이나 컵의 재질을 골라 주세요. 투명하다고 모두 페트병은 아니에요.', materials: ['페트병', '유리', '플라스틱', '종이'] },
};
const typeCaption = {
  '음식물류': {
    soft: '남은 음식·부드러운 껍질',
    excluded: '단단한 뼈·껍데기·씨앗',
    fibrous: '질긴 뿌리·대·겉껍질',
    residue: '커피·차 찌꺼기 또는 장류',
  },
  '페트병': { 'clear-drink': '투명한 생수·음료병', 'other-pet': '유색이거나 다른 용도의 페트병' },
  '유리': { bottle: '온전한 음료·식품 유리병', special: '내열유리·거울·판유리 등' },
};
const otherCategories = [
  ['medicine', '남은 약'], ['battery', '건전지·분리한 전지'], ['rechargeable', '충전지·보조배터리'],
  ['damaged-battery', '부풀거나 새는 전지'], ['pressure-can', '가스·스프레이 용기'], ['chemical-can', '도료·화학제품 용기'],
  ['electronic', '소형 가전'], ['large-electronic', '대형 가전'], ['large', '가구·큰 물건'],
  ['clothing', '옷·신발·가방'], ['bedding', '이불·베개'], ['ceramic', '도자기·사기 식기'],
  ['fluorescent', '온전한 형광등'], ['broken-lamp', '깨진 조명'], ['led', 'LED 조명'], ['bulb', '백열·할로겐 전구'],
];
function question(name, title, options = yesNo, { required = true } = {}) {
  return `<fieldset class="item-question"><legend>${title}</legend><div class="choice-row">${options.map(([value, label]) => `<label class="choice"><input type="radio" name="${name}" value="${value}"${required ? ' required' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>`;
}
// 분리배출 표시(마크) 버튼 묶음. 종류 질문과 재질 선택 두 곳에서 같은 버튼을 씁니다.
function markPicker(titleId, title) {
  return `<details class="mark-picker"><summary class="mark-picker-title" id="${titleId}">${title}</summary><p class="input-hint">버릴 부분에 적힌 표시를 골라 주세요. 뚜껑과 라벨의 표시는 본체와 다를 수 있어요.</p><div class="mark-picker-grid" role="group" aria-labelledby="${titleId}">${RECYCLE_MARKS.map(mark => `<button type="button" class="recycle-mark" data-mark="${mark.id}"><strong>${mark.label}</strong><small>${mark.hint}</small></button>`).join('')}</div><div class="mark-picker-actions"><button type="button" class="history-action" data-no-mark>${titleId === 'category-mark-title' ? '표시가 없거나 잘 모르겠어요' : '재질 표시를 모르겠어요'}</button><a class="history-action" href="${RECYCLE_MARK_SOURCE}" target="_blank" rel="noopener noreferrer">공식 표시 그림 보기 ↗</a></div></details>`;
}
function categoryFields() {
  return `<details id="item-category-section" class="item-category-section" hidden>
    <summary id="item-category-summary">물건 종류 확인</summary>
    <input type="hidden" name="category" value="">
    <p id="category-guidance" class="input-hint"></p>
    <div id="spoon-material-choices" class="manual-category-options" role="group" aria-label="숟가락 재질" hidden>
      <button class="button secondary" type="button" data-item-variant="플라스틱 숟가락">플라스틱 숟가락</button>
      <button class="button secondary" type="button" data-item-variant="나무 숟가락">나무 숟가락</button>
      <button class="button secondary" type="button" data-category-choice="material-only">다른 재질이에요</button>
    </div>
    <div id="name-variants" class="manual-category-options" role="group" aria-label="찾으시던 물건인가요?" hidden></div>
    <button class="history-action" type="button" id="clarification-unknown" data-category-choice="unknown" hidden>종류를 모르겠어요</button>
    <button class="history-action" type="button" id="add-searched-items" hidden>모두 함께 버릴 목록에 담기</button>
    <p class="input-hint" id="add-searched-items-status" role="status"></p>
    <div class="category-suggestion" id="category-suggestion" hidden>
      <p id="category-suggestion-text" role="status"></p>
      <div class="choice-row"><button class="button primary" id="apply-category-suggestion" type="button" aria-describedby="category-suggestion-text">제안 내용이 맞아요</button>
      <button class="history-action" id="apply-category-only" type="button" aria-describedby="category-suggestion-text" hidden>종류만 맞아요 · 재질 직접 선택</button></div>
    </div>
    <div class="category-suggestion" id="confirmed-category" hidden>
      <p id="confirmed-category-text"></p>
      <div class="choice-row"><button class="button secondary" id="apply-confirmed-category" type="button" aria-describedby="confirmed-category-text">같은 종류로 계속</button>
      <button class="history-action" id="forget-confirmed-category" type="button">다른 종류예요</button></div>
    </div>
    <div id="manual-category" class="manual-category">
      <div class="manual-category-options shape-choices" role="group" aria-label="물건 모양과 용도">
        ${Object.entries(packagingShapes).map(([id, shape]) => `<button class="history-action" type="button" data-packaging-shape="${id}">${shape.label}</button>`).join('')}
      </div>
      <div class="manual-category-options" role="group" aria-label="물건 종류">
        <button class="history-action" type="button" data-category-choice="packaging">포장재·용기</button>
        <button class="history-action" type="button" data-category-choice="food">음식물</button>
        <button class="history-action" type="button" data-category-choice="material-only">재질만 알아요</button>
        <button class="history-action" type="button" data-category-choice="unknown">종류를 모르겠어요</button>
      </div>
      ${markPicker('category-mark-title', '포장에 적힌 분리배출 표시로 찾기')}
      <details class="special-category"><summary>다른 물건 종류 보기</summary>
        <div class="manual-category-options">
          ${otherCategories.map(([choice, label]) => `<button class="history-action" type="button" data-category-choice="${choice}">${label}</button>`).join('')}
        </div>
      </details>
    </div>
    <div id="ai-guess-box" class="ai-panel" hidden>
      <p id="ai-guess-text" class="ai-panel-title" role="status"></p>
      <p id="ai-guess-status" class="ai-panel-reason" hidden></p>
      <button type="button" class="button secondary" id="ai-guess-button" aria-describedby="ai-guess-purpose ai-guess-status">AI로 종류 찾기</button>
      <button type="button" class="button secondary" id="ai-guess-cancel" hidden>분석 취소</button>
      <p id="ai-guess-purpose" class="input-hint">이름을 Gemini에 보내 종류를 찾습니다.</p>
    </div>
    <div class="manual-category-options">
      <button class="history-action" type="button" data-describe-instead>설명으로 찾기</button>
      <button class="history-action" type="button" data-photo-instead>사진으로 찾기</button>
    </div>
    ${missingItemMarkup()}
  </details>`;
}
function partFields(prefix, label) {
  return `<div class="part-fields" data-prefix="${prefix}">
    ${!prefix ? '<details id="material-editor" class="material-editor" open><summary><span id="material-detected">재질·종류 선택</span><span class="material-edit-label">수정</span></summary><div class="material-controls">' : '<details class="material-editor component-material-editor" open><summary><span class="component-material-summary">재질·종류 선택</span><span class="material-edit-label">수정</span></summary><div class="material-controls">'}
    ${prefix ? `<div class="field component-label-field"><label for="${prefix}label">부속품 이름 (선택)</label><input id="${prefix}label" name="${prefix}label" type="text" maxlength="40" data-optional placeholder="예: 라벨, 뚜껑, 포장 필름"></div>` : ''}
    <div class="part-material-quick" role="group" aria-label="${label} 선택" hidden>
      <p class="item-choice-title">${label} 선택</p>
      ${MATERIALS.map(material => `<button type="button" class="history-action" data-material-choice="${material}" aria-pressed="false">${material}</button>`).join('')}</div>
    <div class="field part-material-select"><label for="${prefix}material">${label}</label><select id="${prefix}material" name="${prefix}material" required><option value="">재질을 선택해 주세요</option>${MATERIALS.map(material => `<option>${material}</option>`).join('')}</select></div>
    <div class="field" data-condition="type" hidden><label for="${prefix}type">어떤 종류인가요?</label><select id="${prefix}type" name="${prefix}type" required></select></div>
    <div class="part-type-quick" role="group" aria-label="세부 종류 선택" hidden></div>
    ${!prefix ? markPicker('mark-picker-title', '포장재의 분리배출 표시로 고르기') : ''}
    ${!prefix ? '<label class="auto-fill-choice"><input type="checkbox" id="auto-fill-item"><span>이름에 맞춰 재질 자동 입력</span></label><p id="auto-fill-status" class="input-hint" role="status"></p><details id="preset-info" class="preset-info" hidden><summary id="preset-title">자동 입력 기준 · 수정 가능</summary><p id="preset-note" class="input-hint"></p></details>' : ''}</div></details>
    ${!prefix ? '<div class="quick-condition" id="quick-condition" hidden><p class="input-hint" id="clean-shortcut-hint">내용물·오염이 없고 라벨·뚜껑 등 다른 재질도 없을 때</p><button class="button primary" type="button" id="clean-shortcut" aria-describedby="clean-shortcut-hint">깨끗하고 다른 재질이 없어요 →</button><button class="button secondary" type="button" id="clean-without-label" hidden>깨끗하고 라벨이 없어요 →</button></div>' : ''}
    <details class="condition-editor" data-condition="state" open hidden>
      <summary><span data-state-summary>상태 직접 선택</span></summary>
      <div class="current-state">${question(`${prefix}currentState`, prefix ? '이 부속품은 깨끗한가요?' : '내용물이나 오염이 남아 있나요?', [['clean', '깨끗해요'], ['dirty', '남아 있어요 · 아직 안 씻었어요'], ['washed-dirty', '씻어도 남아요'], ['unknown', '모르겠어요']])}</div>
      <div class="state-storage" hidden>${question(`${prefix}contaminated`, '현재 오염 여부')}${question(`${prefix}washed`, '세척 여부', [['yes', '세척했어요'], ['no', '아직 안 했어요']])}</div>
      <div data-condition="vinyl-residue" hidden>${question(`${prefix}vinylResidue`, '비닐 속 내용물을 비운 뒤 무엇이 남았나요?', [['liquid-only', '내용물·고형물 없이 기름·물 자국만 있어요'], ['solids', '음식물·소스·부스러기 등 고형물이 남아요'], ['unknown', '모르겠어요']])}</div>
      <div data-condition="removable" hidden>${question(`${prefix}removable`, '남은 오염을 제거할 수 있나요?', [['yes', '제거할 수 있어요'], ['no', '제거하기 어려워요'], ['unknown', '아직 안 해봐서 모르겠어요']])}<p class="input-hint removal-hint"></p></div>
    </details><div data-condition="food" hidden>${question(`${prefix}foodSeparated`, '비닐·이쑤시개·뼈처럼 음식물이 아닌 것이 남아 있나요?', [['yes', '없어요 · 모두 분리했어요'], ['no', '남아 있어요'], ['unknown', '모르겠어요']])}</div></div>`;
}


export function itemInputPage() {
  return `<section class="container item-page">
    <header class="item-heading"><h1>분리배출 방법 찾기</h1></header>
    ${readDisposalBatch().items.length ? '<p><a class="history-action" href="#/batch">함께 버릴 물건 목록 보기 →</a></p>' : ''}
    <div class="item-grid"><form id="item-form" class="item-card" novalidate>
      <div class="item-basic-fields"><div class="field"><label for="item-name">물건 이름</label><div class="item-name-control"><div class="item-name-search"><input id="item-name" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자 봉지" autocomplete="off" enterkeyhint="search" role="combobox" aria-autocomplete="list" aria-controls="item-name-options" aria-expanded="false" aria-describedby="item-name-status"><button id="confirm-item-name" class="button primary" type="button" hidden>찾기</button></div><div id="item-name-options" class="item-name-options" role="listbox" aria-label="추천 물품" hidden></div></div><p class="input-hint" id="item-name-status" role="status" aria-live="polite"></p>
        </div>
        <button type="button" class="history-action" id="skip-item-name">이름 없이 종류 고르기</button>
        ${categoryFields()}
        <div class="example-items input-examples" aria-label="자주 찾는 물건">${['우유팩', '투명생수병', '과자봉지', '종이상자'].map(name => `<button class="history-action" type="button" data-item-example="${name}">${name}</button>`).join('')}</div></div>
        <div id="handling-condition" hidden></div>
         <section id="item-conditions" aria-labelledby="conditions-title" hidden><h2 id="conditions-title">버리려는 물건의 상태</h2>${partFields('', '주요 재질')}
      </section>
      <section id="combination-section" aria-labelledby="item-state" hidden><h3 id="item-state">다른 재질 확인</h3>
        <details id="composition-editor" class="material-editor" open><summary><span id="composition-detected">결합 상태 선택</span><span class="material-edit-label">수정</span></summary><div class="composition-controls">
         ${question('attachment', '라벨·뚜껑·테이프 등 다른 재질이 붙어 있나요?', [['none', '없어요'], ['detachable', '있고 떼어낼 수 있어요'], ['fixed', '있지만 떼기 어려워요'], ['unknown', '잘 모르겠어요']])}
        <p class="input-hint" id="combination-hint" hidden></p>
         <div id="composition-storage" hidden>${question('combined', '다른 재질')}${question('separable', '분리 여부')}</div>
        </div></details>
        <div id="components-section" hidden><details id="components-details" class="material-editor components-details" open><summary><span id="components-detected">부속품</span></summary><button class="history-action" type="button" id="copy-component-state" hidden>같은 상태의 부속품에 본체 상태 적용</button><p class="input-hint component-copy-status" id="component-copy-status" role="status"></p><details class="component-help"><summary>부속품 입력 도움말</summary><p class="input-hint">같은 재질과 상태는 묶어 최대 5개까지 입력할 수 있어요. 복합재질 부속품은 ‘기타’를 선택하고, 페트병 뚜껑은 본체 처리 안내를 따라 주세요.</p></details><div id="component-fields"></div><button class="button secondary" type="button" id="add-component">부속품 추가</button></details></div>
      </section>
       <div class="form-actions"><button type="submit" class="button primary" id="show-disposal">분리배출 방법 보기 <span aria-hidden="true">→</span></button></div>
       ${judgementRegionMarkup(getCurrentMember()?.region)}
       <details class="search-options"><summary>다른 검색 방법 · AI 설정</summary>${inputModesMarkup('name')}<div class="ai-mode-controls">${aiToggleMarkup('ai-enabled')}</div></details>
       <button type="button" class="history-action" id="reset-item">새로 입력</button>
       <p id="catalog-status" class="input-hint" role="status" aria-live="polite"></p>
       <button type="button" id="retry-catalog" class="history-action" hidden>품목 정보 다시 불러오기</button>
      <p id="item-save-status" class="item-save-status" role="status" aria-live="polite"></p>
    </form>
    <section id="item-summary" class="item-card item-summary" hidden tabindex="-1" aria-labelledby="summary-title"></section>
    <details class="saved-tools" id="saved-tools"><summary>내 기록·즐겨찾기</summary><div class="item-sidebar"><aside class="recent-items" aria-labelledby="recent-items-title"><p class="eyebrow">MY RECENT ITEMS</p><h2 id="recent-items-title">최근 분리배출 목록</h2><p class="recent-explanation">최근 8개 판별 기록이에요. 물품을 누르면 당시 입력과 결과를 다시 볼 수 있어요.</p><div id="recent-items-content"></div><div id="history-delete-confirm" class="history-delete-confirm" hidden><p id="history-delete-message"></p><div class="choice-row"><button type="button" id="confirm-history-delete" class="history-action">삭제하기</button><button type="button" id="cancel-history-delete" class="history-action">취소</button></div></div><p id="history-status" class="input-hint" role="status" aria-live="polite"></p></aside>
    <aside class="recent-items"><h2>자주 찾는 물품</h2><p class="input-hint">저장한 조건을 불러온 뒤 현재 상태를 다시 확인해 주세요.</p><div id="favorite-items"></div><p id="favorite-status" class="input-hint" role="status"></p><button class="history-action" type="button" id="retry-favorites">즐겨찾기 새로고침</button></aside>
    <aside class="item-help"><details><summary>입력 가이드와 저장 안내</summary><p>포장의 재질 표시와 용도를 확인해 보세요. 답변에 따라 필요한 질문만 표시돼요.</p><h3>세척보다 현재 상태가 중요해요</h3><p>씻었어도 오염이 남으면 추가 처리가 필요해요. 깨끗한 물건은 세척 여부를 묻지 않아요. 일반 종이는 물로 씻지 마세요.</p><p class="help-note">로그인하면 입력 조건과 판별 결과를 계정에 저장해 다른 기기에서도 확인할 수 있어요. 비회원 기록은 이 브라우저에만 저장돼요.</p></details></aside></div></details>

    </div></section>`;
}

// 아직 지역 기준을 확인하지 못한 지역(서울·대전 외 전국)은 전국 공통 기준으로 안내하고, 그 지역 공식 안내로 바로 연결합니다.
// 지역 기준이 확인되지 않은 결과는 전국 공통 기준으로 안내했다고 알리고, 그 지역 공식 안내로 연결합니다.
// 서울·대전은 지역 자료가 있지만 품목마다 다르므로(예: 약은 구 자료에 없음) "이 물건은" 자료가 없다고 구분해 말합니다.
const SUPPORTED_PROVINCES = ['서울특별시', '대전광역시'];
// 받침이 있으면 '은', 없으면 '는'(예: 연천군은, 경기도 김포시는).
const topicParticle = word => { const code = String(word).charCodeAt(String(word).length - 1) - 0xac00; return code >= 0 && code <= 11171 && code % 28 ? '은' : '는'; };
const outLink = (url, text) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)} ↗</a>`;
// 광역시 구·군청의 공식 안내(재활용·음식물·대형폐기물) 바로가기입니다. 세부 페이지를 못 찾은 곳은 누리집으로 연결합니다.
// 큰 도시(수원·고양 등)는 시청 안내로 연결합니다.
export function districtLinksMarkup(region) {
  const district = region && METRO_GUIDES[region.province]?.districts[region.district];
  const city = district ? null : cityGuide(region);
  const guide = district || city;
  if (!guide) return '';
  const name = city ? city.name : region.district;
  const links = [['recycle', '재활용'], ['food', '음식물'], ['large', '대형폐기물']].filter(([key]) => guide[key]).map(([key, text]) => outLink(guide[key], text));
  return `${escapeHtml(name)} 공식 안내: ${links.length ? links.join(' · ') : outLink(guide.home, `${name.slice(-1)}청 누리집`)}`;
}
export function localGuideMarkup(result, itemName = '') {
  const region = result.region;
  if (!region) return '';
  const metro = METRO_GUIDES[region.province];
  const withParts = (result.parts?.length || 0) > 1;
  // 광역시: 시 공통 문장을 붙였어도 수거 요일·장소는 구청마다 달라서 구청 공식 안내 링크를 늘 보여 줍니다.
  if (metro && metro.districts[region.district]) {
    const links = districtLinksMarkup(region);
    if (result.regional?.coverage === 'verified') return `<p class="local-guide-line">🏛️ ${links}</p>`;
    const local = metro.city?.label || region.district;
    const text = !metro.city ? `${escapeHtml(region.district)}의 품목별 기준은 아직 정리하지 못해 <strong>전국 공통 기준</strong>으로 안내했어요.`
      : withParts ? `부속품이 함께 있는 물건이라 ${escapeHtml(local)} 기준 대신 재질별 <strong>전국 공통 기준</strong>으로 안내했어요.`
      : `${escapeHtml(local)} 자료에는 이 물건의 배출 방법이 따로 나와 있지 않아 <strong>전국 공통 기준</strong>으로 안내했어요.`;
    return `<p class="local-guide-line">🗺️ ${text} ${links}</p>`;
  }
  const city = cityGuide(region);
  if (result.regional?.coverage === 'verified') return city ? `<p class="local-guide-line">🏛️ ${districtLinksMarkup(region)}</p>` : '';
  // 큰 도시: 품목별 문장은 아직 없어서 전국 공통 기준이라고 밝히고, 시청 공식 안내로 바로 연결합니다.
  if (city && !SUPPORTED_PROVINCES.includes(region.province)) {
    return `<p class="local-guide-line">🗺️ ${escapeHtml(city.name)}의 품목별 기준은 아직 정리하지 못해 <strong>전국 공통 기준</strong>으로 안내했어요. ${districtLinksMarkup(region)}</p>`;
  }
  const place = [region.province, region.district].filter(Boolean).join(' ');
  // 서울은 시 전체 자료라서 구 이름 대신 "서울시 자료"라고 씁니다. 대전은 구별 자료가 있습니다.
  const local = region.province === '서울특별시' ? '서울시' : region.district || region.province;
  const supported = SUPPORTED_PROVINCES.includes(region.province);
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(`${place} ${supported && itemName ? `${itemName} 버리는 방법` : '분리배출 방법 배출 요일'}`)}`;
  // 지역 기준은 재질 하나짜리 물건에만 붙이므로, 라벨·뚜껑 같은 부속품이 함께 있으면 그 이유를 말합니다.
  const text = supported
    ? withParts
      ? `부속품이 함께 있는 물건이라 ${escapeHtml(local)} 기준 대신 재질별 <strong>전국 공통 기준</strong>으로 안내했어요.`
      : `${escapeHtml(local)} 자료에는 이 물건의 배출 방법이 따로 나와 있지 않아 <strong>전국 공통 기준</strong>으로 안내했어요.`
    : `${escapeHtml(place)}${topicParticle(place)} 아직 지역 자료를 모으지 못해 <strong>전국 공통 기준</strong>으로 안내했어요.`;
  return `<p class="local-guide-line">🗺️ ${text} <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(region.district || region.province)} 공식 안내 찾기 ↗</a></p>`;
}
export function largeWasteMarkup(result, { topActionUrl } = {}) {
  const help = largeWasteHelp(result);
  if (!help) return '';
  return `<section class="large-waste-help" aria-labelledby="large-waste-title"><h3 id="large-waste-title">🪑 ${help.maybe ? '봉투에 안 들어가면 ' : ''}대형폐기물 신고하기${help.place ? ` · ${escapeHtml(help.place)}` : ''}</h3>
    <div class="large-waste-links">${help.reportUrl && help.reportUrl !== topActionUrl ? `<a class="button primary" href="${escapeHtml(help.reportUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.office)} 대형폐기물 ${help.directReport ? '배출 신청' : '안내'} ↗</a>` : ''}${help.feeUrl ? `<a class="button secondary" href="${escapeHtml(help.feeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.feeLabel)} ↗</a>` : help.homepage && help.homepage !== topActionUrl ? `<a class="button secondary" href="${escapeHtml(help.homepage)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.office)}청 누리집 ↗</a>` : ''}${help.directReport ? '' : `<a class="button secondary" href="${escapeHtml(help.searchUrl)}" target="_blank" rel="noopener noreferrer">신고 페이지 찾기 ↗</a>`}</div>
    <details class="result-evidence"><summary>신고 순서·수수료</summary><ol>${help.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p class="input-hint">${escapeHtml(help.feeNote)}</p></details>
    ${help.place ? '' : '<p class="input-hint">판별 지역을 고르면 우리 구 신고 페이지로 바로 안내해요.</p>'}</section>`;
}
const sourceLabel = url => url === RULE_SOURCE ? '분리배출 지침' : CATALOG_DETAIL_SOURCES[url] || regionalSourceLabel(url);
// 결과를 펼치지 않아도 어떤 기준(공식 출처·확인일)으로 판단했는지 한 줄로 보여 줍니다.
// 고른 지역의 자료 → 전국 자료(품목 사전·지침) 순으로 대표 출처를 고르고, 다른 지역(예: 대전인데 서울시) 자료는 대표로 쓰지 않습니다.
const seoulUrl = url => /(^|\.)seoul\.go\.kr\//.test(new URL(url).hostname + '/');
const daejeonDistrictOf = url => Object.entries(DAEJEON_GUIDES).find(([, guide]) => guide.recycle === url || guide.food === url)?.[0];
export function sourceLineMarkup(result, sources) {
  const region = result.region;
  const regionScore = url => {
    if (result.regional?.sources?.includes(url)) return 4;
    if (seoulUrl(url)) return region?.province === '서울특별시' ? 3 : -1;
    const district = daejeonDistrictOf(url);
    if (district) return region?.province === '대전광역시' && region.district === district ? 3 : -1;
    const metroProvince = Object.entries(METRO_GUIDES).find(([, guide]) => guide.city && [guide.city.recycle, guide.city.food].includes(url))?.[0];
    if (metroProvince) return region?.province === metroProvince ? 3 : -1;
    if (Object.values(REGIONAL_SOURCES).includes(url)) return -1;
    return url === RULE_SOURCE ? 1 : 2;
  };
  const primary = [...sources].sort((a, b) => regionScore(b) - regionScore(a)).find(url => regionScore(url) >= 0);
  const checkedAt = result.regional?.coverage === 'verified' ? result.regional.checkedAt : result.checkedAt;
  if (!primary && !checkedAt) return '';
  const details = regionalSourceDetail(primary);
  return `<p class="result-source-line">📌 ${checkedAt ? `${escapeHtml(checkedAt)} 확인한 기준` : '참고한 기준'}${primary ? ` · <a href="${escapeHtml(primary)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceLabel(primary))} ↗</a>` : ''}${details ? `<br>${escapeHtml(details)}` : ''}</p>`;
}
const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
const candidateContent = name => `${escapeHtml(itemCandidateTitle(name))}${itemCandidateHint(name) ? `<small>${escapeHtml(itemCandidateHint(name))}</small>` : ''}`;
export function resultMarkup(input, result, createdAt, { editRegion = false, inlineRegion = false } = {}) {
  const updated = result.ruleVersion !== RULE_VERSION;
  input = inputForDisplay(input, result);
  result = resultForDisplay(input, result);
  const source = result.sourceUrl === 'https://geumcheon.go.kr/portal/contents.do?key=818' ? result.sourceUrl : RULE_SOURCE;
  const sources = [...new Set(Array.isArray(result.sourceUrls) ? result.sourceUrls : [source])]
    .filter(url => [RULE_SOURCE, ...Object.values(REGIONAL_SOURCES), ...Object.keys(CATALOG_DETAIL_SOURCES)].includes(url));
  const { parts, steps } = resultStepsForDisplay(result);
  const visibleReasons = new Set(disposalReasons(result));
  const pendingQuestions = resultPendingQuestions(input, result);
  const pendingQuestion = pendingQuestions[0];
  const resultCandidates = Array.isArray(result.itemCandidates) ? result.itemCandidates.filter(name => typeof name === 'string').slice(0, 6) : [];
  const canSplit = input.combined === 'yes' && input.separable === 'yes' && parts.length > 1;
  const partial = canSplit && parts.some(part => part.status === 'check') && parts.some(part => part.status !== 'check');
  const collection = collectionAction(input, result);
  const canCheckMark = !itemTypeClarification(input.itemName) && (['unknown', 'material-only'].includes(input.category)
    || (input.category === 'packaging' && pendingQuestion?.condition === 'material'));
  const badge = input.material === '음식물류' && result.status === 'recycle' ? '음식물류'
    : result.status === 'general' && /특수규격봉투|특수종량제|불연성/.test(result.method) ? '특수 배출'
      : { recycle: '재활용', general: '일반 배출', check: '추가 확인 필요', mixed: '재질별 배출' }[result.status];
  const handlingAnswer = handlingConditionQuestion(lookupItem(input.itemName)?.handling || input.category, result.region)?.options.find(([key]) => key === input.handlingCondition)?.[1];
  const regionToggle = inlineRegion ? ' aria-controls="result-region-form" aria-expanded="false"' : '';
  const details = part => conditionDetails(part).map(([title, value]) =>
    `<div><dt>${title}</dt><dd>${escapeHtml(value)}</dd></div>`
  ).join('');
  const routeList = (title, selectedParts) => `<ul class="result-route-list" aria-label="${title}">${selectedParts.map(part => {
    const index = parts.indexOf(part);
    const prefix = index ? `part${index - 1}-` : '';
    const questionIndex = pendingQuestions.findIndex(question => question.prefix === prefix);
    return `<li><strong>${escapeHtml(part.label)}</strong><div>${escapeHtml(part.method)}
      ${canSplit && part.status === 'check' && questionIndex > 0 ? `<button type="button" class="history-action" data-edit-pending="${questionIndex}">${escapeHtml(pendingQuestions[questionIndex].label)}</button>` : ''}</div></li>`;
  }).join('')}</ul>`;
  return `<p class="eyebrow">${createdAt ? '저장된 결과' : '분리배출 결과'}</p><h2 id="summary-title">${escapeHtml(input.itemName)}</h2>
    ${createdAt ? `<p class="input-hint">${escapeHtml(new Date(createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · 기록 저장일</p>` : ''}
    ${updated ? '<p class="input-hint">현재 기준으로 다시 확인한 안내예요.</p>' : ''}
    <div class="result-verdict ${result.status === 'check' ? 'needs-check' : ''}"><p class="eyebrow">어디에 버리나요?</p>${badge !== result.method ? `<span class="result-badge">${badge}</span>` : ''}<h3>${escapeHtml(result.method)}</h3>
      <div class="result-region"><p class="input-hint">${escapeHtml(resultRegionLabel(result))}</p>${editRegion ? `<button type="button" class="history-action" data-edit-region${regionToggle}>지역 변경</button>` : ''}</div></div>
    ${inlineRegion ? `<form id="result-region-form" class="result-region-form" aria-label="판별 지역 변경" novalidate hidden>${judgementRegionMarkup(result.region, { onResult: true })}
      <div class="choice-row"><button type="submit" class="button primary">이 지역 기준 보기</button><button type="button" class="button secondary" data-cancel-region>취소</button></div></form>` : ''}
    ${result.aiAssisted ? '<p class="ai-badge">🤖 AI 추정 결과예요. 실제 제품의 분리배출 표시를 꼭 확인해 주세요.</p>' : ''}
    ${result.keywordCategory ? `<p class="keyword-note">🔎 이름의 ‘${escapeHtml(result.keywordCategory.keyword)}’(으)로 <strong>${escapeHtml(categoryLabel(result.keywordCategory.category))}</strong>(으)로 알아봤어요. <button type="button" class="history-action" id="category-other">다른 물건이에요</button></p>` : ''}
    ${partial ? `<div class="result-partial-note">
      <h3 class="result-action-title">배출 방법을 확인한 부분</h3>${routeList('배출 방법을 확인한 부분', parts.filter(part => part.status !== 'check'))}
      <h3 class="result-action-title">추가로 확인할 부분</h3>${routeList('추가로 확인할 부분', parts.filter(part => part.status === 'check'))}
      <p class="input-hint">쉽게 분리한 뒤, 배출 방법이 확인된 부분부터 버릴 수 있어요.</p></div>`
      : parts.length ? routeList('재질별 배출 장소', parts) : ''}
    ${resultCandidates.length ? `<p class="input-hint">${disposalItemList(input.itemName).length ? '물건마다 배출 방법이 달라요. 먼저 확인할 물건을 골라 주세요.' : '찾으시던 물건인가요? 실제로 맞는 이름만 골라 주세요.'}</p><div class="manual-category-options item-related-candidates" role="group" aria-label="확인할 물건">${resultCandidates.map(name =>
      `<button type="button" class="history-action" data-result-candidate="${escapeHtml(name)}">${candidateContent(name)}</button>`).join('')}</div>` : ''}
    ${steps.length || parts.length || pendingQuestion || collection ? '<h3 class="result-action-title">지금 할 일</h3>' : ''}
    ${pendingQuestion ? `<div class="result-check-action"><button type="button" class="button ${canCheckMark ? 'secondary' : 'primary'}" id="edit-item">${escapeHtml(pendingQuestion.label)}</button></div>` : ''}
    ${pendingQuestions.length > 1 && !canSplit ? `<div class="result-more-questions" role="group" aria-label="다른 확인 항목">${pendingQuestions.slice(1).map(({ label }, index) =>
      `<button type="button" class="history-action" data-edit-pending="${index + 1}">${escapeHtml(label)}</button>`).join('')}</div>` : ''}
    ${canCheckMark ? '<button type="button" class="button primary result-mark-action" data-check-mark>바닥·겉포장에 적힌 표시 확인하기</button>' : ''}
    ${collectionActionMarkup(input, result, collection)}
    ${editRegion && !result.region && collection ? `<p class="input-hint">지역별 접수 안내가 필요하면 <button type="button" class="history-action" data-edit-region${regionToggle}>배출할 지역 선택</button>에서 골라 주세요.</p>` : ''}
    <div id="disposal-instructions">
    ${steps.length ? stepListMarkup(steps, 'action-steps', { checklist: true, emphasizeFirst: true }) : ''}
    ${parts.length ? `<h3>본체와 부속품 배출 방법</h3><div class="result-parts">${parts.map(part => `<article><h4>${escapeHtml(part.label)} · ${escapeHtml(part.material)}</h4><p class="part-method">${escapeHtml(part.method)}</p>${part.steps.length ? stepListMarkup(part.steps, 'part-steps', { checklist: true }) : ''}</article>`).join('')}</div>` : ''}
    </div>
    ${disposalScheduleMarkup(result)}
    ${disposalReasonMarkup(result)}
    ${steps.length || parts.some(part => part.steps.length) ? checklistMarkup({ target: 'disposal-instructions' }) : ''}
    ${largeWasteMarkup(result, { topActionUrl: collection?.url })}
    ${collectionPointMarkup({ ...result, itemName: input.itemName }, { official: false })}
    ${relatedDisposalMarkup(input.itemName)}
    ${regionalComparisonMarkup(input, result)}
    <div class="result-next-actions"><button type="button" class="button ${pendingQuestion ? 'secondary' : 'primary'}" data-new-item>다른 물건 찾기</button>${pendingQuestion ? '' : `<button type="button" class="button secondary" id="edit-item">${createdAt ? '오늘 상태 다시 판별' : '조건 수정'}</button>`}</div>
    <details class="result-evidence"><summary>판단 근거·지역 기준</summary>${sourceLineMarkup(result, sources)}${list(result.reasons.filter(reason => !visibleReasons.has(reason)))}${result.regional?.notes.length ? list(result.regional.notes) : ''}<p class="input-hint">${escapeHtml(result.notice)}</p><p class="input-hint">${sources.map(url => outLink(url, sourceLabel(url))).join(' · ')}</p>${localGuideMarkup(result, input.itemName)}</details>
    <details class="input-details"><summary>입력한 조건</summary><dl><div><dt>물건</dt><dd>${escapeHtml(input.itemName)}</dd></div>${input.category ? `<div><dt>${result.keywordCategory ? '이름으로 알아본 종류' : '직접 선택한 종류'}</dt><dd>${escapeHtml(categoryLabel(input.category))}</dd></div>` : ''}${handlingAnswer ? `<div><dt>물건 상태</dt><dd>${handlingAnswer}</dd></div>` : ''}${details(input)}</dl>${(input.components || []).map((part, index) => `<h4>${escapeHtml(part.label || `부속품 ${index + 1}`)}</h4><dl>${details(part)}</dl>`).join('')}</details>
    <p class="input-hint" data-record-save-status role="status"></p>
    ${resultToolsMarkup(input, result)}`;
}

export function bindItemInput() {
  const owner = getCurrentMember()?.id || 'guest';
  if (draftOwner !== owner || draftVersion !== inputSearchVersion()) {
    draft = {}; componentCount = 1; appliedEvidence = ''; draftBatchId = undefined; draftOwner = owner; draftVersion = inputSearchVersion();
    lastVisibleResult = undefined; draftBatchResolution = false;
  }
  const queued = takeQueuedInput();
  if (queued) {
    lastVisibleResult = undefined;
    const { fromAssistance, observations, batchItemId, fromConfirmedMark, ...next } = queued;
    for (const key of ['reviewSaved', 'requestIdentification', 'showMarkPicker', 'showMissingItem', 'quickLookup', 'manualLookup', 'savedLookup', 'editRegion', 'editPendingQuestion']) delete next[key];
    const same = fromAssistance && normalizeItemName(next.itemName) === normalizeItemName(draft.itemName);
    const confirmedSame = !fromConfirmedMark && same && draft.categoryOrigin === 'manual' && !['unknown', 'material-only'].includes(draft.category);
    if (confirmedSame) {
      delete next.category; delete next.categoryOrigin; delete next.keywordCategory;
    }
    draft = same ? { ...draft, ...next } : fromAssistance ? { ...itemPresetInput(next.itemName), ...next } : next;
    if (queued.manualLookup && !confirmedSame && !lookupItem(next.itemName)?.material) {
      draft = { itemName: next.itemName || unnamedItem, ...(Object.hasOwn(next, 'region') ? { region: next.region } : {}), keywordCategory: false };
    }
    if (!same) { appliedEvidence = ''; draftBatchId = batchItemId; draftBatchResolution = false; }
    const evidence = observations?.length ? JSON.stringify(observations) : '';
    if (evidence && evidence !== appliedEvidence) {
      appliedEvidence = evidence;
      const category = prepareCategoryInput(draft).category;
      if (lookupItem(draft.itemName)?.material || ['packaging', 'food', 'material-only'].includes(category)) draft = applyItemObservations(draft, observations);
      else draft.pendingObservations = observations;
    }
  }
  const form = document.getElementById('item-form');
  const judgementRegion = bindJudgementRegion(form, readJudgementRegion(getCurrentMember()), {
    onChange: region => {
      rememberJudgementRegion(region, getCurrentMember());
      updateConditional();
    },
  });
  const summary = document.getElementById('item-summary');
  const nameInput = form.elements.namedItem('itemName');
  const confirmName = document.getElementById('confirm-item-name');
  let committedName = '';
  const skipName = document.getElementById('skip-item-name');
  const describeInstead = form.querySelector('[data-describe-instead]');
  const handoff = path => {
    const name = nameInput.value.trim();
    const componentLabels = (draft.components || []).map(part => part.label).filter(Boolean);
    queueInput({ description: name, sourceName: name, newSearch: !name, region: judgementRegion.get(), componentLabels }, path);
  };
  describeInstead.addEventListener('click', () => {
    handoff('/describe');
    location.hash = '/describe';
  });
  form.querySelector('[data-photo-instead]').addEventListener('click', () => {
    handoff('/photo');
    location.hash = '/photo';
  });
  const disposeModes = bindInputModes(form, handoff);
  const saveStatus = document.getElementById('item-save-status');
  const fieldError = document.createElement('p');
  fieldError.className = 'field-error';
  fieldError.id = 'item-condition-error';
  fieldError.setAttribute('role', 'alert');
  let invalidField = null;
  const autoFill = document.getElementById('auto-fill-item');
  const autoFillStatus = document.getElementById('auto-fill-status');
  const nameOptions = document.getElementById('item-name-options');
  const nameStatus = document.getElementById('item-name-status');
  const materialEditor = document.getElementById('material-editor');
  const mainStateEditor = form.querySelector('.part-fields [data-condition="state"]');
  const quickCondition = document.getElementById('quick-condition');
  const cleanShortcut = document.getElementById('clean-shortcut');
  const cleanShortcutHint = document.getElementById('clean-shortcut-hint');
  const cleanWithoutLabel = document.getElementById('clean-without-label');
  const compositionEditor = document.getElementById('composition-editor');
  const combinationSection = document.getElementById('combination-section');
  const handlingCondition = document.getElementById('handling-condition');
  const savedTools = document.getElementById('saved-tools');
  let disposeResultTools = () => {};
  let aiGuess = null;
  let aiEnabled = readAiEnabled();
  let categoryOrigin = '', keywordCategoryEnabled = true;
  let currentNameKey = '';
  const categorySuggestion = document.getElementById('category-suggestion');
  const categorySuggestionText = document.getElementById('category-suggestion-text');
  const applyCategorySuggestion = document.getElementById('apply-category-suggestion');
  const applyCategoryOnly = document.getElementById('apply-category-only');
  const confirmedCategory = document.getElementById('confirmed-category');
  const confirmedCategoryText = document.getElementById('confirmed-category-text');
  const applyConfirmedCategory = document.getElementById('apply-confirmed-category');
  const categorySection = document.getElementById('item-category-section');
  const categorySummary = document.getElementById('item-category-summary');
  const category = form.elements.namedItem('category');
  const needsNameChoice = name => Boolean(itemTypeClarification(name) || disposalItemList(name).length);
  function retainBatchForCandidate(candidate) {
    const entry = draftBatchId && readDisposalBatch().items.find(({ id }) => id === draftBatchId);
    if (entry && normalizeItemName(entry.input.itemName) === normalizeItemName(candidate)) {
      draftBatchResolution = false;
    } else if (entry && canResolveBatchName(entry.input.itemName, candidate)) {
      draftBatchResolution = true;
    } else {
      draftBatchId = undefined; draftBatchResolution = false;
    }
  }
  let packagingShape = '';
  const manualCategory = document.getElementById('manual-category');
  const spoonMaterialChoices = document.getElementById('spoon-material-choices');
  const nameVariants = document.getElementById('name-variants');
  const addSearchedItems = document.getElementById('add-searched-items');
  const addSearchedItemsStatus = document.getElementById('add-searched-items-status');
  const clarificationUnknown = document.getElementById('clarification-unknown');
  const showDisposal = document.getElementById('show-disposal');
  const aiBox = document.getElementById('ai-guess-box');
  const aiText = document.getElementById('ai-guess-text');
  const aiButton = document.getElementById('ai-guess-button');
  const aiCancel = document.getElementById('ai-guess-cancel');
  const missing = form.querySelector('[data-missing-item]');
  const missingName = missing.querySelector('[data-missing-item-context]');
  const missingStatus = missing.querySelector('[data-missing-item-status]');
  const missingNote = missing.querySelector('#missing-item-note');
  const sendMissing = missing.querySelector('[data-send-missing-item]');
  const sentMissing = new Set();
  const aiStatus = document.getElementById('ai-guess-status');
  const aiMatches = name => Boolean(aiEnabled && aiGuess && name && normalizeItemName(aiGuess.itemName) === normalizeItemName(name));
  const aiToggle = document.getElementById('ai-enabled');
  // 이름별 AI 의견 상태: { status: 'loading' | 'done' | 'error', guess, error, promise }
  const opinions = new Map();
  // 이 화면에서 "틀렸어요"를 누른 이름(정규화). 신고 상태: 'sending' | 'done' | 오류 문구
  const reports = new Map();
  const catalogStatus = document.getElementById('catalog-status');
  const retryCatalog = document.getElementById('retry-catalog');
  let catalogLoading = false;
  async function refreshCatalog() {
    if (catalogLoading) return;
    catalogLoading = true; retryCatalog.disabled = true; retryCatalog.hidden = true;
    catalogStatus.textContent = '추가 품목 정보를 확인하고 있어요. 기본 안내는 바로 사용할 수 있어요.';
    try {
      await initializeItemCatalog();
      if (!form.isConnected) return;
      catalogStatus.textContent = getCatalogMessage();
      retryCatalog.hidden = !getCatalogMessage();
      if (draft.itemName && draft.itemName === nameInput.value.trim() && !draft.material && !draft.category && summary.hidden
          && autoFillEnabled && !queued?.showMarkPicker && suggestItemInfo(draft.itemName)) {
        const categoryHadFocus = categorySection.contains(document.activeElement);
        applySuggestion();
        draft = collect();
        if (categoryHadFocus) {
          if (queued?.quickLookup) advanceLookup();
          else focusNextCondition();
        }
      }
    } finally { catalogLoading = false; if (form.isConnected) retryCatalog.disabled = false; }
  }
  retryCatalog.addEventListener('click', refreshCatalog);
  const autocomplete = bindItemAutocomplete({ input: nameInput, options: nameOptions, status: nameStatus, search: searchItemNames,
    onSelect: () => { changed({ target: nameInput, selectCandidate: true }); advanceLookup(); }, onCompositionEnd: () => changed({ target: nameInput }) });
  const closeSuggestions = autocomplete.close;
  let history = [];
  let shownInput, shownResult, shownSnapshot;
  let pendingDeletion = null;
  let deleting = false;
  const deleteConfirm = document.getElementById('history-delete-confirm');
  const historyStatus = document.getElementById('history-status');
  let pendingWrites = 0;
  let recentVersion = 0, favoriteVersion = 0;
  let pendingObservations = [];
  let observedStates = new Map();
  let unopenedParts = [];
  let pendingCombination = '';
  let pendingSeparation = '';
  let compositionIsPreset = false;
  let selectedHandlingCondition = '';
  const value = name => form.elements.namedItem(name)?.value || '';
  function partValue(prefix) {
    return Object.fromEntries(['material', 'type', 'contaminated', 'washed', 'removable', 'vinylResidue', 'foodSeparated', ...(prefix ? ['label'] : [])].map(key => [key, value(`${prefix}${key}`)]));
  }
  function collectPart(prefix) {
    const part = normalizePart(partValue(prefix));
    const observed = observedStates.get(prefix);
    return observed ? { ...part, observedState: observed } : part;
  }
  // Material and type controls can be rendered on different passes; only apply
  // a confirmed state once the corresponding question exists.
  function applyObservedState(prefix) {
    const part = partValue(prefix);
    const state = observedStates.get(prefix);
    if (state && supportsState(part)) {
      writeValues(stateAnswers(state === 'washed-dirty' && !needsWashQuestion(part) ? 'dirty' : state, needsWashQuestion(part)), prefix);
      observedStates.delete(prefix);
    }
  }
  function toggle(node, show, { preserve = false } = {}) {
    node.hidden = !show;
    node.querySelectorAll('input, select').forEach(control => {
      control.disabled = !show;
      control.required = show && !control.hasAttribute('data-optional');
      if (!show && !preserve) { if (control.type === 'radio') control.checked = false; else control.value = ''; }
    });
  }
  function componentSummaryText() {
    const names = Array.from({ length: componentCount }, (_, index) => {
      const material = value(`part${index}-material`);
      const type = TYPES[material]?.find(([id]) => id === value(`part${index}-type`))?.[1];
      return type ? `${material}(${type.split('·')[0].trim()})` : material;
    }).filter(Boolean);
    if (!names.length) return '부속품 재질을 골라 주세요';
    return componentCount === 1 ? `부속품 · ${names[0]}` : `부속품 ${componentCount}개 · 확인하거나 추가하기`;
  }
  function linkComponentStates() {
    clearFieldError();
    const body = partValue('');
    let applied = 0;
    for (let index = 0; index < componentCount; index++) {
      const prefix = `part${index}-`;
      const part = partValue(prefix);
      if (part.contaminated || observedStates.has(prefix)) continue;
      const answers = linkedComponentState(body, part);
      if (!answers) continue;
      writeValues(answers, prefix);
      applied++;
    }
    updateConditional();
    draft = collect();
    componentCopyStatus.textContent = applied
      ? `부속품 ${applied}개의 상태에 반영했어요. 남은 질문은 각 부속품에서 확인해 주세요.`
      : '상태를 적용하려면 부속품의 재질과 종류를 먼저 선택해 주세요.';
    if (applied) focusNextCondition();
  }
  const copyComponentState = document.getElementById('copy-component-state');
  const componentCopyStatus = document.getElementById('component-copy-status');
  copyComponentState.addEventListener('click', linkComponentStates);
  function syncPart(node, active = true, materialOnly = false) {
    const prefix = node.dataset.prefix;
    const materialSelect = form.elements.namedItem(`${prefix}material`);
    materialSelect.disabled = !active; materialSelect.required = active;
    const material = materialSelect.value;
    const quick = node.querySelector('.part-material-quick');
    const shape = !prefix && category.value === 'packaging' ? packagingShapes[packagingShape] : null;
    quick.querySelector('.item-choice-title').textContent = shape ? shape.hint : prefix ? '부속품 재질 선택' : '주요 재질 선택';
    const choosingMaterial = !material || ['기타', '모르겠어요'].includes(material);
    quick.hidden = !active || !(prefix || ['packaging', 'material-only'].includes(category.value));
    quick.classList.toggle('is-chosen', !choosingMaterial);
    const materialButtons = [...quick.querySelectorAll('[data-material-choice]')];
    const ranked = shape ? [...shape.materials, ...MATERIALS.filter(entry => !shape.materials.includes(entry))] : MATERIALS;
    if (quick.dataset.shape !== (shape ? packagingShape : '')) {
      for (const entry of ranked) quick.append(materialButtons.find(button => button.dataset.materialChoice === entry));
      quick.dataset.shape = shape ? packagingShape : '';
    }
    materialButtons.forEach(button => {
      button.hidden = !prefix && !categoryAllowsMaterial(category.value, button.dataset.materialChoice);
      button.setAttribute('aria-pressed', String(button.dataset.materialChoice === material));
    });
    const partLabel = node.querySelector('[data-optional]');
    if (partLabel) {
      partLabel.disabled = !active;
      const index = Number(prefix.match(/^part(\d+)-/)?.[1] || 0);
      node.closest('.component-card').querySelector('h3').textContent = partLabel.value.trim() ? `부속품 ${index+1} · ${partLabel.value.trim().slice(0,40)}` : `부속품 ${index+1}`;
    }
    const options = TYPES[material] || [];
    const select = form.elements.namedItem(`${prefix}type`);
    const typeQuick = node.querySelector('.part-type-quick');
    const showTypes = active && !materialOnly && options.length > 0;
    if (select.dataset.material !== material) {
      select.innerHTML = '<option value="">세부 종류를 선택해 주세요</option>' + options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
      select.dataset.material = material;
    }
    if (typeQuick.dataset.material !== material) {
      typeQuick.innerHTML = '<p class="item-choice-title">어떤 종류인가요?</p>'
        + options.map(([value, label]) => `<button type="button" class="history-action" data-type-choice="${value}" aria-pressed="false">${typeCaption[material]?.[value] || label}</button>`).join('');
      typeQuick.dataset.material = material;
    }
    typeQuick.hidden = !showTypes;
    typeQuick.querySelectorAll('button').forEach(button => {
      button.hidden = !prefix && category.value === 'packaging' && material === '플라스틱' && ['utensil', 'toy'].includes(button.dataset.typeChoice);
      button.setAttribute('aria-pressed', String(button.dataset.typeChoice === select.value));
    });
    toggle(node.querySelector('[data-condition="type"]'), showTypes);
    const componentSummary = node.querySelector('.component-material-summary');
    if (componentSummary) componentSummary.textContent = [material, options.find(([type])=>type===select.value)?.[1]].filter(Boolean).join(' · ') || '재질·종류 선택';
    toggle(node.querySelector('[data-condition="food"]'), active && material === '음식물류' && select.value === 'soft');
    const supported = active && supportsState(partValue(prefix));
    toggle(node.querySelector('[data-condition="state"]'), supported);
    const partName = prefix ? partLabel?.value.trim() || `부속품 ${Number(prefix.slice(4, -1)) + 1}` : '본체';
    node.querySelector('.current-state legend').textContent = prefix ? `${partName}에 내용물이나 오염이 남아 있나요?` : '내용물이나 오염이 남아 있나요?';
    const washable = needsWashQuestion(partValue(prefix));
    const stateRadios = [...node.querySelectorAll(`[name="${prefix}currentState"]`)];
    const current = selectedState(partValue(prefix), washable);
    stateRadios.forEach(control => {
      const available = supported && (control.value !== 'washed-dirty' || washable);
      control.disabled = !available; control.required = available;
      control.closest('label').hidden = !available;
      control.checked = available && control.value === current;
      if (control.value === 'dirty') control.nextElementSibling.textContent = washable ? '남아 있어요 · 아직 안 씻었어요' : '오염이 있어요';
    });
    const dirty = supported && value(`${prefix}contaminated`) === 'yes';
    const useSeoulVinylQuestions = dirty && material === '비닐' && select.value === 'packaging'
      && usesSeoulVinylQuestions(judgementRegion.get());
    const seoulVinyl = useSeoulVinylQuestions && (Boolean(prefix) || value('combined') === 'no');
    toggle(node.querySelector('[data-condition="vinyl-residue"]'), seoulVinyl, { preserve: true });
    const checkAttachmentFirst = useSeoulVinylQuestions && !prefix && !['yes', 'no'].includes(value('combined'));
    toggle(node.querySelector('[data-condition="removable"]'), dirty && !checkAttachmentFirst && (!seoulVinyl || value('vinylResidue') === 'solids'), { preserve: true });
    node.querySelectorAll('.state-storage input').forEach(control => { control.required = false; });
    const paper = material === '종이' && select.value === 'paper';
    node.querySelector('[data-condition="removable"] legend').textContent = paper
      ? `${partName}에서 깨끗한 종이만 따로 남길 수 있나요?` : `${partName}의 내용물을 비운 뒤 오염을 닦아낼 수 있나요?`;
    node.querySelector('.removal-hint').textContent = paper
      ? '물에 씻지 말고, 기름이나 음식물이 묻은 부분만 떼어낼 수 있는지 보세요.'
      : '남은 내용물을 먼저 따로 비우고, 음식물이나 기름기가 헹구거나 닦아서 없어지는지 확인해 보세요.';
    const summary = { clean: '깨끗해요', dirty: '오염이 남아 있어요', 'washed-dirty': '씻어도 오염이 남아요', unknown: '상태를 모르겠어요' };
    node.querySelector('[data-state-summary]').textContent = current ? `상태: ${summary[current]} · 바꾸기`
      : prefix ? '부속품 상태 고르기' : '상태 직접 선택';
    if (!active) materialSelect.value = '';
  }
  function updateConditional() {
    const hasName = Boolean(nameInput.value.trim());
    const known = lookupItem(nameInput.value);
    const unregistered = hasName && !known?.material;
    form.classList.toggle('has-unregistered-name', unregistered);
    missing.hidden = !unregistered || nameInput.value === unnamedItem;
    if (unregistered) missingName.textContent = `‘${nameInput.value.trim()}’`;
    const dedicated = Boolean(known?.handling && known.material === '기타');
    const handling = known?.handling || category.value || '';
    const prompt = handlingConditionQuestion(handling, judgementRegion.get());
    const promptKey = prompt?.title || '';
    if (handlingCondition.dataset.handling !== promptKey) {
      handlingCondition.dataset.handling = promptKey;
      handlingCondition.hidden = !prompt;
      handlingCondition.innerHTML = prompt ? question('handlingCondition', prompt.title, prompt.options.some(([option]) => option === 'unknown') ? prompt.options : [...prompt.options, ['unknown', '모르겠어요']]) : '';
      if (prompt) writeValues({ handlingCondition: selectedHandlingCondition });
    }
    categorySection.hidden = !unregistered;
    const choosingSpoon = unregistered && !category.value && isAmbiguousSpoonName(nameInput.value);
    spoonMaterialChoices.hidden = !choosingSpoon;
    const itemList = unregistered ? disposalItemList(nameInput.value) : [];
    const clarification = unregistered && itemTypeClarification(nameInput.value);
    if (clarification || itemList.length) missing.hidden = true;
    const alternatives = itemList.length ? itemList : unregistered && (clarification || !category.value) && !choosingSpoon && !isBatteryPackaging(nameInput.value)
      ? relatedItemCandidates(nameInput.value) : [];
    manualCategory.hidden = itemList.length > 1 || Boolean(clarification);
    clarificationUnknown.hidden = !clarification;
    addSearchedItems.hidden = itemList.length < 2;
    if (addSearchedItems.hidden) addSearchedItemsStatus.textContent = '';
    nameVariants.hidden = !alternatives.length;
    const variantKey = alternatives.join('|');
    if (nameVariants.dataset.options !== variantKey) {
      nameVariants.dataset.options = variantKey;
      nameVariants.innerHTML = alternatives.map(name => `<button class="history-action" type="button" data-item-variant="${escapeHtml(name)}">${candidateContent(name)}</button>`).join('');
    }
    category.disabled = !unregistered;
    const materialSelect = form.elements.namedItem('material');
    for (const option of materialSelect.options) {
      option.disabled = Boolean(option.value) && unregistered && !categoryAllowsMaterial(category.value, option.value);
      option.hidden = option.disabled;
    }
    if (unregistered && !categoryAllowsMaterial(category.value, materialSelect.value)) {
      materialSelect.value = category.value === 'food' ? '음식물류' : '';
    }
    // 자동 인식했거나 직접 고른 별도 수거 종류면 재질을 묻지 않고, 그 밖에는 재질·상태만 묻습니다.
    const materialOnly = category.value === 'material-only';
    const needsMaterial = !dedicated && !clarification && !itemList.length && (!unregistered || materialOnly || ['packaging', 'food'].includes(category.value));
    const detected = keywordCategory();
    if (unregistered && (!category.value || clarification || itemList.length)) categorySection.open = true;
    categorySummary.textContent = category.value
      ? `${categoryOrigin === 'keyword' ? '이름으로 추정' : '물건 종류'}: ${categoryLabel(category.value)} · 바꾸기`
      : '어떤 물건인가요?';
    const categoryGuidance = document.getElementById('category-guidance');
    categoryGuidance.textContent = detected && category.value === detected.category
      ? `이름의 ‘${detected.keyword}’(으)로 자동으로 골랐어요. 다른 물건이면 종류를 바꿔 주세요.`
      : materialOnly ? '제품에 표시된 재질을 고르면 어떤 정보를 더 확인할지 알려 드려요.'
        : category.value && needsMaterial ? '재질과 물건 상태를 확인해 주세요.' : '';
    document.getElementById('item-conditions').hidden = !hasName || !needsMaterial;
    updateAiBox(hasName);
    syncPart(form.querySelector('.part-fields'), hasName && needsMaterial, materialOnly);
    const supported = supportsState(partValue(''));
    // 부모에서 자식 순서로 갱신해 숨겨진 필수 질문을 비활성화합니다.
    toggle(compositionEditor, supported);
    const attachment = value('combined') === 'no' ? 'none' : value('combined') === 'unknown' ? 'unknown'
      : value('combined') === 'yes' ? ({ yes: 'detachable', no: 'fixed', unknown: 'unknown' })[value('separable')] : '';
    writeValues({ attachment: attachment || '' });
    document.querySelectorAll('#composition-storage input').forEach(control => { control.required = false; });
    const combined = supported && value('combined') === 'yes';
    const components = combined && value('separable') === 'yes';
    if (clarification) {
      categoryGuidance.textContent = `${clarification.question} ${clarification.hint}`;
    } else if (unregistered && !category.value) {
      if (choosingSpoon) categoryGuidance.textContent = '숟가락은 재질에 따라 배출 방법이 달라요. 실제 재질을 골라 주세요.';
      else if (itemList.length > 1) categoryGuidance.textContent = '여러 물건을 입력했어요. 먼저 확인할 물건을 골라 주세요.';
      else if (alternatives.length) categoryGuidance.textContent = '찾으시던 물건인가요? 실제로 같으면 고르고, 없으면 아래에서 종류나 표시를 확인해 주세요.';
      else if (verifiedNameGuide(nameInput.value)) categoryGuidance.textContent = '다른 물건이라면 이름을 고치거나 실제 용도와 재질을 확인해 주세요.';
      else categoryGuidance.textContent = nameInput.value === unnamedItem
        ? '알고 있는 종류나 포장에 적힌 표시를 골라 주세요.'
        : '등록되지 않은 이름이에요. 알고 있는 종류나 포장에 적힌 표시를 골라 주세요.';
    }
    if (isBatteryPackaging(nameInput.value) && category.value === 'packaging') {
      categorySection.open = true;
      categoryGuidance.textContent = '전지를 빼고 남은 포장만 판별해요. 종이·플라스틱 등 실제 재질 표시를 확인해 주세요.';
    }
    document.getElementById('composition-detected').textContent = value('combined') === 'no' ? '붙은 다른 재질 없음' : value('combined') === 'unknown' ? '붙은 재질 여부 미확인' : combined
      ? `다른 재질 있음 · ${value('separable') === 'yes' ? '분리 가능' : value('separable') === 'no' ? '분리 어려움' : '분리 가능 여부 확인'}` : '다른 재질이 붙어 있나요?';
    document.getElementById('components-section').hidden = !components;
    document.querySelectorAll('#component-fields .part-fields').forEach(node => {
      if (components) syncPart(node);
      else node.querySelectorAll('input, select').forEach(control => { control.disabled = true; });
    });
    copyComponentState.hidden = !components || !['clean', 'dirty', 'washed-dirty'].includes(value('currentState'))
      || !Array.from({ length: componentCount }, (_, index) => `part${index}-`).some(prefix => {
        const part = partValue(prefix);
        return supportsState(part) && !part.contaminated && !observedStates.has(prefix);
      });
    document.getElementById('components-detected').textContent = componentSummaryText();
    const typeLabel = TYPES[value('material')]?.find(([type]) => type === value('type'))?.[1];
    document.getElementById('material-detected').textContent = [value('material'), typeLabel].filter(Boolean).join(' · ') || '재질·종류를 선택해 주세요';
    const input = collect();
    const labelled = hasName && cleanLabelledBottleInput(input);
    const clearDrinkBottle = input.material === '페트병' && input.type === 'clear-drink';
    const shortcut = labelled || (hasName && !input.observedState && !input.pendingObservations
      && !value('currentState') && !['yes', 'unknown'].includes(value('combined')) && cleanSingleMaterialInput(input));
    quickCondition.hidden = !shortcut;
    cleanWithoutLabel.hidden = !labelled;
    cleanShortcut.textContent = labelled ? '깨끗해요 · 비닐 라벨만 떼면 돼요 →' : '깨끗하고 다른 재질이 없어요 →';
    cleanShortcutHint.textContent = labelled ? '병과 라벨이 깨끗하고, 뚜껑·비닐 라벨 외에 붙은 것이 없을 때'
      : clearDrinkBottle ? '내용물과 오염이 없고, 병뚜껑 말고 붙어 있는 것이 없을 때 골라 주세요.'
        : '내용물·오염이 없고 라벨·뚜껑 등 다른 재질도 없을 때';
    const statePending = supported && (!value('currentState') || (!value('attachment')
      && [...mainStateEditor.querySelectorAll('input')].some(control => control.willValidate && !control.validity.valid)));
    combinationSection.hidden = !supported || statePending;
    // An unknown body state can be reviewed without inventing an attachment answer.
    const askAttachment = value('contaminated') !== 'unknown';
    form.querySelectorAll('input[name="attachment"]').forEach(control => { control.required = supported && askAttachment; });
    if (!supported) compositionEditor.open = true;
    const waitingForTypeOrMaterial = needsMaterial && (!value('material') || Boolean(TYPES[value('material')]?.length && !materialOnly && !value('type')));
    showDisposal.hidden = !hasName || (unregistered && !category.value) || waitingForTypeOrMaterial || Boolean(shortcut);
    form.classList.toggle('has-item-name', hasName);
    skipName.hidden = hasName;
    confirmName.hidden = !hasName || committedName === normalizeItemName(nameInput.value);
    const combinationHint = document.getElementById('combination-hint');
    combinationHint.textContent = value('material') === '종이' && value('type') === 'carton' ? '팩 안쪽 코팅층은 떼지 않아요. 붙어 있는 빨대·뚜껑을 확인해 주세요.'
      : value('material') === '페트병' && value('type') === 'clear-drink' ? '페트병 뚜껑은 본체 안내를 따라 주세요. 라벨이나 다른 재질이 붙어 있는지 확인해 주세요.' : '';
    combinationHint.hidden = !combinationHint.textContent;
    document.getElementById('reset-item').hidden = !hasName;
  }
  function keywordCategory() {
    const name = nameInput.value;
    return !keywordCategoryEnabled || needsNameChoice(name) || lookupItem(name)?.material ? null : detectItemCategory(name);
  }
  const routeLabels = { recyclable: '재활용 대상', general: '종량제봉투 배출', large: '대형폐기물', hazardous: '별도 수거·안전 처리', unknown: '판단 어려움' };
  const confidenceLabels = { high: '확신 높음', medium: '확신 보통', low: '확신 낮음' };
  const aiLine = guess => {
    const typeLabel = TYPES[guess.material]?.find(([type]) => type === guess.type)?.[1];
    return `${[guess.material, typeLabel].filter(Boolean).join(' · ')} · ${routeLabels[guess.route]}`;
  };
  // AI 의견은 이름별 참고 정보입니다. 사용자가 선택한 종류와 검토된 품목 경로를 우선합니다.
  // state가 있으면(결과 화면의 등록 품목) 입력한 상태까지 반영한 AI 의견을 따로 받습니다.
  const aiKey = (name, state = '') => `${normalizeItemName(name)}|${state}`;
  function askAi(name, state = '', { manual = false } = {}) {
    const key = aiKey(name, state);
    if ((!aiEnabled && !manual) || !cleanAiName(name) || needsNameChoice(name) || verifiedNameGuide(name)) return Promise.resolve();
    const existing = opinions.get(key);
    if (existing?.status === 'loading' || (existing?.status === 'done' && (!manual || suggestedItemCategory(existing.guess)))) return existing.promise;
    const known = Boolean(lookupItem(name)?.material);
    const entry = { status: 'loading', state, manual, controller: new AbortController() };
    entry.promise = requestAiGuess(name, undefined, { opinion: known, identify: !known, state, signal: entry.controller.signal })
      .then(guess => { entry.status = 'done'; entry.guess = guess; })
      .catch(error => { entry.status = 'error'; entry.error = error.message; })
      .finally(() => { if (form.isConnected && opinions.get(key) === entry) refreshAi(); });
    opinions.set(key, entry);
    refreshAi();
    return entry.promise;
  }
  // AI가 꺼져 있을 때는 저장된 제안만 확인합니다.
  async function askShared(name) {
    if (needsNameChoice(name) || verifiedNameGuide(name)) return;
    const key = aiKey(name);
    const existing = opinions.get(key);
    if (existing?.status === 'done' && existing.guess?.shared) { refreshAi(); return; }
    let guess = null;
    try { guess = await requestAiGuess(name, undefined, { shared: true }); } catch { return; }
    if (!guess || !form.isConnected || nameInput.value.trim() !== name) return;
    const current = opinions.get(key);
    if (!current || current.status === 'error' || (current.status === 'done' && !current.guess)) {
      opinions.set(key, { status: 'done', guess, promise: Promise.resolve(guess) });
    }
    refreshAi();
  }
  function chooseCategory(choice, guess, shape = '') {
    if (category.disabled || deleting) return;
    packagingShape = shape;
    if (category.value !== choice) {
      category.value = choice;
      changed({ target: category });
    }
    updateConditional();
    if (guess && ['packaging', 'food'].includes(choice)) {
      const confirmed = collect();
      if (!confirmed.material || (confirmed.material === guess.material && !confirmed.type)) {
        restore({ ...confirmed, material: guess.material, type: guess.type });
      }
    }
    categorySection.open = false;
    draft = collect();
    advanceLookup({ confirmedCategory: true });
  }
  applyCategorySuggestion.addEventListener('click', () => {
    const guess = opinions.get(aiKey(nameInput.value))?.guess;
    const choice = suggestedItemCategory(guess);
    if (choice && !categorySuggestion.hidden) chooseCategory(choice, guess);
  });
  applyCategoryOnly.addEventListener('click', () => {
    const choice = suggestedItemCategory(opinions.get(aiKey(nameInput.value))?.guess);
    if (choice && !categorySuggestion.hidden) chooseCategory(choice);
  });
  applyConfirmedCategory.addEventListener('click', () => {
    const choice = confirmedItemType(nameInput.value, owner);
    if (choice && !confirmedCategory.hidden) chooseCategory(choice);
  });
  document.getElementById('forget-confirmed-category').addEventListener('click', () => {
    forgetConfirmedItemType(nameInput.value, owner);
    refreshAi();
    focusCategory();
  });
  categorySection.addEventListener('click', event => {
    const shape = event.target.closest('[data-packaging-shape]')?.dataset.packagingShape;
    if (shape && Object.hasOwn(packagingShapes, shape)) { chooseCategory('packaging', null, shape); return; }
    const choice = event.target.closest('[data-category-choice]')?.dataset.categoryChoice;
    if (choice) chooseCategory(choice);
    const variant = event.target.closest('[data-item-variant]')?.dataset.itemVariant;
    if (variant && !deleting) {
      nameInput.value = variant;
      changed({ target: nameInput, selectCandidate: true });
      closeSuggestions();
      advanceLookup();
    }
  });
  addSearchedItems.addEventListener('click', () => {
    if (!judgementRegion.validate()) return;
    const names = disposalItemList(nameInput.value);
    if (addDisposalBatchItems(names, judgementRegion.get())) location.hash = '/batch';
    else addSearchedItemsStatus.textContent = '목록이 가득 찼거나 다른 지역의 물건이 있어요. 하나씩 골라 확인할 수도 있어요.';
  });
  function refreshAi() { updateAiBox(Boolean(nameInput.value.trim())); renderOpinion(); }
  function updateAiBox(hasName) {
    const name = nameInput.value.trim();
    const entry = opinions.get(aiKey(name));
    const verified = verifiedNameGuide(name);
    const canSuggest = aiEnabled || entry?.manual || entry?.guess?.shared;
    const choosingSpoon = !spoonMaterialChoices.hidden;
    const manualFirst = needsNameChoice(name);
    const prior = name !== unnamedItem && !manualFirst && !verified && !choosingSpoon && !category.disabled && !category.value && confirmedItemType(name, owner);
    confirmedCategory.hidden = !prior;
    if (prior) confirmedCategoryText.textContent = `이 브라우저에서 전에 확인한 종류 · ${categoryLabel(prior)}`;
    const suggestion = !prior && !manualFirst && !verified && !choosingSpoon && !category.disabled && !category.value && canSuggest && suggestedItemCategory(entry?.guess);
    categorySuggestion.hidden = !suggestion;
    applyCategoryOnly.hidden = !['packaging', 'food'].includes(suggestion);
    if (suggestion) {
      const guess = entry.guess;
      const typeLabel = TYPES[guess.material]?.find(([type]) => type === guess.type)?.[1];
      const details = ['packaging', 'food'].includes(suggestion) ? [guess.material, typeLabel] : [];
      categorySuggestionText.textContent = ['AI 제안', categoryLabel(suggestion), ...details].filter(Boolean).join(' · ');
      if ([aiButton, aiCancel].includes(document.activeElement)) applyCategorySuggestion.focus();
    }
    aiBox.hidden = !hasName || name === unnamedItem || Boolean(manualFirst || prior || verified || choosingSpoon || suggestion || category.value || category.disabled);
    aiCancel.hidden = aiBox.hidden || !canSuggest || entry?.status !== 'loading';
    if (aiBox.hidden) return;
    if (!cleanAiName(name)) {
      aiBox.classList.remove('is-loading');
      aiButton.hidden = true;
      aiText.textContent = '';
      aiStatus.textContent = '물건 이름을 40자 이내로 줄이거나 용도·표시를 설명해 주세요.';
      aiStatus.hidden = false;
      return;
    }
    const status = canSuggest ? entry?.status : '';
    aiBox.classList.toggle('is-loading', status === 'loading');
    aiButton.setAttribute('aria-disabled', String(status === 'loading'));
    aiButton.setAttribute('aria-busy', String(status === 'loading'));
    aiButton.textContent = status === 'error' ? 'AI 다시 시도' : 'AI로 종류 찾기';
    const focused = document.activeElement === aiButton || document.activeElement === aiCancel;
    aiButton.hidden = status === 'done' && !entry?.guess?.shared;
    aiText.textContent = status === 'loading' ? '물건 종류를 알아보고 있어요…'
      : status === 'error' ? `‘${name}’ 분석에 실패했어요` : status === 'cancelled' ? '분석을 취소했어요.'
        : status === 'done' ? '이름만으로 종류를 확인하기 어려워요' : '';
    aiStatus.textContent = status === 'loading' || status === 'cancelled' ? '' : status === 'error' ? entry.error
      : status === 'done' ? '제품의 용도나 표시를 설명하거나 사진을 추가해 보세요.' : '';
    aiStatus.hidden = !aiStatus.textContent;
    if (focused && aiButton.hidden && !describeInstead.hidden) describeInstead.focus();
    else if (document.activeElement === aiCancel && aiCancel.hidden) aiButton.focus();
  }
  // 등록 품목은 상태도 보내고 미등록 품목의 의견은 이름만으로 생성합니다.
  function shownAiState() { return shownInput && lookupItem(shownInput.itemName) ? encodeAiState(shownInput) : ''; }
  function renderOpinion() {
    const panel = summary.querySelector('#ai-opinion');
    if (!panel || !shownInput) return;
    const name = shownInput.itemName;
    if (verifiedNameGuide(name)) { panel.closest('details').remove(); return; }
    const known = Boolean(lookupItem(name)?.material);
    const entry = shownResult?.aiGuess ? { status: 'done', guess: shownResult.aiGuess } : opinions.get(aiKey(name, shownAiState()));
    const report = reports.get(normalizeItemName(name));
    let body;
    if (report === 'done') body = `<p class="ai-panel-title">알려 주셔서 고마워요 🙏</p><p class="ai-note">이 AI 답은 숨겨서 다른 사용자에게 더 이상 보이지 않아요.${shownResult?.aiAssisted ? ' 아래 <strong>조건 수정</strong>에서 물건 종류와 재질을 직접 골라 다시 확인해 주세요.' : ''}</p>`;
    else if (!entry || entry.status === 'loading') body = '<p class="ai-panel-title">AI에게 물어보고 있어요…</p>';
    else if (entry.status === 'error') body = `<p class="ai-panel-title">AI 의견을 받지 못했어요</p><p class="ai-panel-reason">${escapeHtml(entry.error)}</p><button type="button" class="button secondary" data-ai-retry>다시 묻기</button>`;
    else if (!entry.guess) body = '<p class="ai-panel-title">AI가 이 물건을 분류하지 못했어요</p>';
    else {
      const guess = entry.guess;
      const status = shownResult?.status;
      const differs = aiOpinionNeedsReview(shownResult, guess);
      const detail = `<p class="ai-panel-title">${escapeHtml(aiLine(guess))} <span class="ai-confidence">${confidenceLabels[guess.confidence]}</span></p>
        ${guess.reason ? `<p class="ai-panel-reason">${escapeHtml(guess.reason)}</p>` : ''}
        ${guess.shared ? '<p class="ai-note">다른 사용자가 이미 물어본 결과라 바로 보여 드려요.</p>' : ''}`;
      if (differs && !shownResult?.aiAssisted) {
        body = `<p class="ai-resolve">${status === 'check' ? '아직 배출 방법을 확정할 수 없어요.' : `위의 <strong>‘${escapeHtml(shownResult.method)}’</strong> 기준 안내를 따라 주세요.`}</p>
          <p class="ai-note">${status === 'check' ? '상태·수거 조건이 확인되지 않아 AI의 확정적인 의견은 표시하지 않았어요. 필요한 조건을 먼저 확인해 주세요.' : 'AI 의견이 확인된 기준과 달라 표시하지 않았어요.'}</p>`;
      } else {
        body = `${detail}
          ${known ? '<p class="ai-note">등록된 기준 결과를 참고해 주세요.</p>' : ''}`;
      }
    }
    panel.classList.toggle('is-loading', !entry || entry.status === 'loading');
    panel.innerHTML = `<h3>🤖 AI 의견${known ? ' <small>(참고)</small>' : ''}</h3>${body}`;
  }
  aiButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name && aiButton.getAttribute('aria-disabled') !== 'true') askAi(name, '', { manual: true });
  });
  aiCancel.addEventListener('click', () => {
    const key = aiKey(nameInput.value), entry = opinions.get(key);
    if (entry?.status !== 'loading') return;
    opinions.set(key, { status: 'cancelled', manual: true });
    entry.controller.abort();
    refreshAi();
    aiButton.focus();
  });
  sendMissing?.addEventListener('click', async () => {
    const itemName = nameInput.value.trim();
    if (!itemName || missing.hidden || sendMissing.disabled || !judgementRegion.validate()) return;
    const conditions = collect();
    const input = conditions.category && conditions.category !== 'unknown' && !conditions.pendingObservations && !conditions.observedState
      ? confirmedDisposalInput(conditions) : { itemName, region: judgementRegion.get(), category: 'unknown', categoryOrigin: 'manual', keywordCategory: false };
    const key = JSON.stringify([normalizeItemName(itemName), input.region]);
    if (sentMissing.has(key)) { missingStatus.textContent = '이 이름과 지역으로 이미 등록을 요청했어요.'; return; }
    const note = missingNote.value.trim();
    const version = draftVersion;
    const same = () => form.isConnected && draftVersion === version;
    sendMissing.disabled = true; missingNote.disabled = true;
    missingStatus.textContent = '등록 요청을 보내고 있어요…';
    try {
      await memberTools.submitFeedback({ kind: 'missing_item', input, result: judgeDisposal(input), message: note ? `미등록 품목 등록 요청: ${note}` : '미등록 품목 등록을 요청해요.' });
      sentMissing.add(key);
      if (same()) { missingNote.value = ''; missingStatus.textContent = '등록 요청을 보냈어요. 마이페이지에서 상태를 확인할 수 있어요.'; }
    } catch (error) { if (same()) missingStatus.textContent = error.message; }
    finally { if (form.isConnected) { sendMissing.disabled = false; missingNote.disabled = false; } }
  });
  summary.addEventListener('click', event => {
    if (event.target.closest('[data-ai-retry]') && shownInput) askAi(shownInput.itemName, shownAiState());
    if (event.target.closest('[data-ai-report]') && shownInput) reportWrongAi(shownInput.itemName);
  });
  const aiSwitch = bindAiToggle(aiToggle, enabled => {
    aiEnabled = enabled;
    if (aiEnabled) {
      const name = nameInput.value.trim();
      if (name && !category.value && spoonMaterialChoices.hidden && !lookupItem(name)?.material && summary.hidden) askAi(name);
      if (!summary.hidden && shownInput && attachOpinionPanel()) askAi(shownInput.itemName, shownAiState());
    }
    else {
      clearTimeout(prefetchTimer); aiGuess = null;
      for (const [key, entry] of opinions) {
        if (entry.status === 'loading' && !entry.manual) { opinions.delete(key); entry.controller.abort(); }
      }
      if (!shownResult?.aiGuess) summary.querySelector('#ai-opinion')?.closest('details').remove();
    }
    refreshAi();
  });
  async function reportWrongAi(name) {
    const key = normalizeItemName(name);
    if (!key || reports.get(key) === 'sending' || reports.get(key) === 'done') return;
    reports.set(key, 'sending'); renderOpinion();
    try {
      await reportAiGuess(name);
      reports.set(key, 'done');
      for (const opinionKey of [...opinions.keys()]) if (opinionKey.startsWith(`${key}|`)) opinions.delete(opinionKey);
      opinions.set(aiKey(name), { status: 'done', guess: null, promise: Promise.resolve(null) });
      if (aiGuess && normalizeItemName(aiGuess.itemName) === key) aiGuess = null;
    } catch (error) { reports.set(key, error.message); }
    if (form.isConnected) refreshAi();
  }
  function attachOpinionPanel() {
    if (needsNameChoice(shownInput?.itemName) || verifiedNameGuide(shownInput?.itemName) || (shownInput?.category && !shownResult?.aiAssisted)) return false;
    if (!summary.querySelector('#ai-opinion')) {
      summary.querySelector('.result-evidence')?.insertAdjacentHTML('beforebegin', '<details class="result-evidence"><summary>AI 의견 보기</summary><section id="ai-opinion" class="ai-panel ai-opinion" aria-live="polite"></section></details>');
    }
    return true;
  }
  function collect() {
    const input = { itemName: nameInput.value.trim(), ...collectPart(''), region: judgementRegion.get() };
    if (pendingObservations.length) input.pendingObservations = pendingObservations;
    if (!lookupItem(input.itemName)?.material && value('category')) { input.category = value('category'); input.categoryOrigin = categoryOrigin || 'manual'; }
    if (!keywordCategoryEnabled) input.keywordCategory = false;
    if (value('handlingCondition') || selectedHandlingCondition) input.handlingCondition = value('handlingCondition') || selectedHandlingCondition;
    if (supportsState(input) || (['packaging', ''].includes(value('category')) && (unopenedParts.length || pendingCombination))) {
      input.combined = value('combined') || pendingCombination || (unopenedParts.length ? 'yes' : '');
      if (input.combined === 'yes') {
        input.separable = value('separable') || pendingSeparation;
        const parts = input.separable === 'yes' && !unopenedParts.length
          ? Array.from({ length: componentCount }, (_, index) => collectPart(`part${index}-`)) : unopenedParts;
        if (input.separable === 'yes' || parts.some(part => part.label || part.material || part.observedState)) input.components = parts;
      }
    }
    if (aiMatches(input.itemName)) input.aiGuess = structuredClone(aiGuess);
    return input;
  }
  function confirmedDisposalInput(collected) {
    const { pendingObservations: _pending, observedState: _state, ...input } = structuredClone(collected);
    if (!supportsState(input)) { delete input.combined; delete input.separable; }
    if (input.separable !== 'yes') delete input.components;
    else input.components = (input.components || []).map(normalizePart);
    return input;
  }
  function writeValues(part, prefix = '') {
    Object.entries(part).forEach(([key, answer]) => {
      const field = form.elements.namedItem(`${prefix}${key}`);
      if (!field) return;
      if (field instanceof RadioNodeList) {
        for (const radio of field) radio.checked = radio.value === answer;
      } else if (field.type === 'radio') field.checked = field.value === answer;
      else field.value = answer;
    });
  }
  function drawComponents() {
    document.getElementById('component-fields').innerHTML = Array.from({ length: componentCount }, (_, index) => `<article class="component-card"><h3>부속품 ${index + 1}</h3>${partFields(`part${index}-`, '부속품 재질')}${componentCount > 1 ? `<button class="remove-component" type="button" data-remove="${index}">부속품 ${index + 1} 제거</button>` : ''}</article>`).join('');
    document.getElementById('add-component').disabled = componentCount >= 5;
  }
  function replaceComponents(parts) {
    clearFieldError();
    componentCopyStatus.textContent = '';
    componentCount = parts.length;
    drawComponents();
    parts.forEach((part, index) => writeValues({ material: part.material || '', label: part.label || '' }, `part${index}-`));
    updateConditional();
    parts.forEach((part, index) => writeValues(part, `part${index}-`));
    updateConditional();
    form.querySelectorAll('.component-material-editor').forEach(editor => {
      const prefix = editor.closest('.part-fields').dataset.prefix;
      editor.open = !value(`${prefix}material`) || Boolean(TYPES[value(`${prefix}material`)]?.length && !value(`${prefix}type`));
    });
    draft = collect();
  }
  function clearFieldError() {
    if (!invalidField) return;
    const descriptions = invalidField.getAttribute('aria-describedby')?.split(' ').filter(id => id && id !== fieldError.id) || [];
    if (descriptions.length) invalidField.setAttribute('aria-describedby', descriptions.join(' '));
    else invalidField.removeAttribute('aria-describedby');
    invalidField.removeAttribute('aria-invalid');
    fieldError.remove();
    invalidField = null;
  }
  function reveal(control) {
    for (let parent = control.parentElement; parent && parent !== form; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
  }
  function visibleControl(control) {
    const selector = control.name?.endsWith('material') ? '.part-material-quick' : control.name?.endsWith('type') ? '.part-type-quick' : '';
    const choices = selector ? control.closest('.part-fields')?.querySelector(`${selector}:not([hidden])`) : null;
    return choices?.querySelector('button[aria-pressed="true"]:not([hidden])')
      || choices?.querySelector('button:not([hidden])') || control;
  }
  function firstInvalidField() {
    return [...form.elements].find(control => control.willValidate && !control.validity.valid);
  }
  function firstActionFor(control) {
    const part = control.closest('.component-card');
    const useSameState = part && control.name.endsWith('currentState') && !copyComponentState.hidden;
    return useSameState ? copyComponentState : control;
  }
  function focusCategory() {
    categorySection.open = true;
    const target = (!spoonMaterialChoices.hidden && spoonMaterialChoices.querySelector('button'))
      || (!confirmedCategory.hidden && applyConfirmedCategory)
      || (!nameVariants.hidden && nameVariants.querySelector('button'))
      || (!categorySuggestion.hidden && applyCategorySuggestion)
      || (!clarificationUnknown.hidden && clarificationUnknown)
      || (!manualCategory.hidden && manualCategory.querySelector('button')) || categorySummary;
    target.focus();
  }
  function openMarkPicker() {
    const parent = category.disabled ? materialEditor : categorySection;
    if (parent.hidden || parent.closest('[hidden]')) return;
    if (!category.disabled && manualCategory.hidden) { focusCategory(); return; }
    parent.open = true;
    const picker = category.disabled ? materialEditor.querySelector('.mark-picker') : manualCategory.querySelector('.mark-picker');
    picker.open = true;
    picker.querySelector('button').focus();
  }
  function focusQuestion(control) {
    const group = control.closest('fieldset');
    const preferred = group?.querySelector('input:checked:not(:disabled)') || control;
    reveal(preferred);
    visibleControl(preferred).focus();
  }
  function focusNextCondition() {
    if (!category.disabled && !category.value) { focusCategory(); return; }
    if (!quickCondition.hidden && !mainStateEditor.open) { cleanShortcut.focus(); return; }
    const target = firstActionFor(firstInvalidField() || showDisposal);
    focusQuestion(target);
  }
  function advanceLookup({ confirmedCategory = false } = {}) {
    if (deleting || form.hidden) return;
    const typedName = nameInput.value.trim();
    const name = disposalQueryName(typedName);
    if (!confirmedCategory && !draftBatchId && name && !lookupItem(typedName)?.material && normalizeItemName(name) !== normalizeItemName(typedName)) {
      nameInput.value = name;
      changed({ target: nameInput });
    }
    committedName = normalizeItemName(nameInput.value);
    confirmName.hidden = true;
    closeSuggestions();
    const inferred = categoryOrigin === 'keyword' && category.value && !['packaging', 'food'].includes(category.value);
    if ((confirmedCategory || inferred || lookupItem(nameInput.value)?.material) && !firstInvalidField()) { form.requestSubmit(); return; }
    focusNextCondition();
  }
  function focusResultQuestion(question) {
    if (question?.condition === 'category' && !category.disabled) { focusCategory(); return; }
    let target;
    if (question) {
      const { condition, prefix } = question;
      if (condition === 'handling') target = handlingCondition.querySelector('input');
      else if (['combined', 'separable'].includes(condition)) target = form.querySelector('input[name="attachment"]:not(:disabled)');
      else if (condition === 'label') target = form.elements.namedItem(`${prefix}label`);
      else if (condition === 'material') target = form.elements.namedItem(`${prefix}material`);
      else if (condition === 'type') target = form.elements.namedItem(`${prefix}type`);
      else if (condition === 'components') target = form.elements.namedItem('part0-material');
      else {
        const part = form.querySelector(`.part-fields[data-prefix="${prefix}"]`);
        target = part?.querySelector(`[data-condition="${condition}"] :is(input:not([type="hidden"]),select):not(:disabled)`);
      }
    }
    target ||= form.querySelector('.current-state input:checked:not(:disabled), #handling-condition input:checked') || handlingCondition.querySelector('input');
    if (target && !target.disabled) focusQuestion(target);
    else if (question?.prefix) {
      const material = form.elements.namedItem(`${question.prefix}material`);
      if (material && !material.disabled) focusQuestion(material);
      else focusNextCondition();
    }
    else if (!category.disabled) focusCategory();
    else { nameInput.focus(); closeSuggestions(); }
  }
  function validateConditions() {
    clearFieldError();
    const missingName = !nameInput.value.trim();
    const field = missingName ? nameInput : firstInvalidField();
    if (!field) return true;
    const invalid = visibleControl(field);
    reveal(invalid);
    if (invalid.closest('[data-condition="state"]')) showDisposal.hidden = false;
    const group = invalid.closest('fieldset, .field, .part-material-quick, .part-type-quick') || invalid.parentElement;
    fieldError.textContent = missingName ? '물건 이름을 입력해 주세요.' : invalid.type === 'radio' ? '이 질문에 답해 주세요.' : '이 항목을 선택해 주세요.';
    group.append(fieldError);
    invalid.setAttribute('aria-invalid', 'true');
    invalid.setAttribute('aria-describedby', [invalid.getAttribute('aria-describedby'), fieldError.id].filter(Boolean).join(' '));
    invalidField = invalid;
    invalid.focus({ preventScroll: true });
    group.scrollIntoView({ block: 'center' });
    return false;
  }
  function chooseAnswerFromPointer(radio) {
    if (!form.isConnected || form.hidden || deleting || !radio.isConnected || !radio.checked || radio.disabled || radio.closest('[hidden]')) return;
    const next = firstInvalidField();
    if (!next && value('separable') === 'yes') showDisposal.focus();
    else if (!next) form.requestSubmit();
    else if (!next.closest('fieldset')?.contains(radio)) focusNextCondition();
  }
  function showInput() {
    summary.hidden = true;
    form.hidden = false;
  }
  function restore(input) {
    clearFieldError();
    componentCopyStatus.textContent = '';
    const editCategory = input.editCategory;
    keywordCategoryEnabled = input.keywordCategory !== false;
    input = prepareCategoryInput(input);
    selectedHandlingCondition = input.handlingCondition || '';
    committedName = normalizeItemName(input.itemName);
    const preset = itemPresetInput(input.itemName);
    const presetParts = preset.components || [];
    const sameParts = (input.components || []).length === presetParts.length
      && (input.components || []).every((part, index) => !part.contaminated && part.material === presetParts[index].material
        && part.type === presetParts[index].type && part.label === presetParts[index].label);
    compositionIsPreset = !input.contaminated && Boolean(preset.combined) && input.combined === preset.combined
      && (input.combined === 'no' || (input.separable === preset.separable && sameParts));
    pendingObservations = input.pendingObservations || [];
    observedStates = new Map([['', input.observedState], ...(input.components || []).map((part, index) => [`part${index}-`, part.observedState])].filter(([, value]) => value));
    unopenedParts = input.separable === 'yes' && supportsState(input) ? [] : input.components || [];
    pendingCombination = supportsState(input) ? '' : input.combined || '';
    pendingSeparation = pendingCombination || unopenedParts.length ? input.separable || '' : '';
    categoryOrigin = input.categoryOrigin || '';
    categorySection.open = editCategory || !input.category;
    const region = Object.hasOwn(input, 'region') ? input.region : judgementRegion.get();
    closeSuggestions(); nameStatus.textContent = '';
    document.getElementById('preset-info').hidden = true;
    form.reset();
    category.value = input.category || '';
    manualCategory.querySelector('.special-category').open = false;
    form.querySelectorAll('.mark-picker[open]').forEach(picker => { picker.open = false; });
    componentCount = Math.max(1, input.components?.length || 0); drawComponents();
    judgementRegion.set(region);
    aiGuess = validateAiGuess(input.aiGuess, input.itemName);
    autoFill.checked = autoFillEnabled; aiSwitch.sync(aiEnabled);
    autoFillStatus.textContent = autoFillEnabled ? '자동 입력이 켜져 있어요. 물건 이름을 바꾸면 재질 정보를 다시 채워요.' : '체크하면 우유팩·생수병 등 알려진 물품의 재질 정보를 채워요.';
    // 재질→세부 종류→상태 순서로 선택지를 생성한 후 저장된 답변을 복원합니다.
    for (let pass = 0; pass < 3; pass++) {
      writeValues(input);
      applyObservedState('');
      (input.components || []).forEach((part, index) => writeValues(part, `part${index}-`));
      (input.components || []).forEach((_, index) => {
        if (value('separable') === 'yes') applyObservedState(`part${index}-`);
      });
      updateConditional();
    }
    form.querySelectorAll('.component-material-editor').forEach(editor => {
      const node = editor.closest('.part-fields');
      editor.open = !value(`${node.dataset.prefix}material`) || Boolean(TYPES[value(`${node.dataset.prefix}material`)]?.length && !value(`${node.dataset.prefix}type`));
    });
    if (autoFillEnabled && !input.material && !document.getElementById('item-conditions').hidden && suggestItemInfo(input.itemName)) applySuggestion();
    else materialEditor.open = !value('material') || Boolean(TYPES[value('material')]?.length && !value('type'));
    draft = collect();
    currentNameKey = normalizeItemName(nameInput.value);
    compositionEditor.open = !value('attachment') || (compositionIsPreset && value('combined') === 'yes');
    mainStateEditor.open = true;
    updateConditional();
  }
  function showResult(input, result, createdAt, recordId = null, existingSnapshot) {
    closeSuggestions();
    disposeResultTools();
    shownInput = input; shownResult = resultForDisplay(input, result);
    shownSnapshot = existingSnapshot || { input, result, createdAt, recordId };
    const editingInput = inputForDisplay(input, result);
    summary.innerHTML = resultMarkup(input, result, createdAt, { editRegion: true, inlineRegion: true });
    if (draftBatchId) summary.querySelector('.result-next-actions').insertAdjacentHTML('afterbegin', '<a href="#/batch" class="button secondary">함께 버릴 물건 목록으로</a>');
    if (!existingSnapshot && !createdAt && input.itemName !== unnamedItem
        && (aiEnabled || shownResult.aiGuess || opinions.get(aiKey(input.itemName))?.guess?.shared) && attachOpinionPanel()) {
      renderOpinion();
      if (!shownResult.aiGuess) askAi(input.itemName, shownAiState());
    }
    summary.hidden = false; form.hidden = true;
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ behavior: 'auto', block: 'start' });
    document.getElementById('category-other')?.addEventListener('click', () => {
      showInput(); restore({ ...editingInput, category: '', categoryOrigin: '', keywordCategory: false }); saveStatus.textContent = '';
      focusCategory();
    });
    const questions = resultPendingQuestions(editingInput, shownResult);
    function editQuestion(question) {
      showInput(); restore(editingInput); saveStatus.textContent = '';
      focusResultQuestion(question);
    }
    document.getElementById('edit-item').addEventListener('click', () => editQuestion(questions[0]));
    summary.querySelectorAll('[data-edit-pending]').forEach(button => button.addEventListener('click', () =>
      editQuestion(questions[Number(button.dataset.editPending)])));
    summary.querySelectorAll('[data-result-candidate]').forEach(button => button.addEventListener('click', () =>
      openRelatedItem(button.dataset.resultCandidate, true)));
    summary.querySelector('[data-check-mark]')?.addEventListener('click', () => {
      showInput(); restore(editingInput); saveStatus.textContent = '';
      openMarkPicker();
    });
    const regionForm = summary.querySelector('#result-region-form');
    const regionButtons = [...summary.querySelectorAll('[data-edit-region]')];
    const resultRegion = bindJudgementRegion(regionForm, shownResult.region);
    let regionOpener;
    function closeRegionEditor() {
      regionForm.hidden = true;
      regionButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
      regionOpener?.focus();
    }
    regionButtons.forEach(button => button.addEventListener('click', () => {
      if (!regionForm.hidden && regionOpener === button) { closeRegionEditor(); return; }
      regionOpener = button;
      if (regionForm.hidden) resultRegion.set(shownResult.region);
      regionForm.hidden = false;
      regionButtons.forEach(control => control.setAttribute('aria-expanded', 'true'));
      resultRegion.focus();
    }));
    regionForm.querySelector('[data-cancel-region]').addEventListener('click', closeRegionEditor);
    regionForm.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRegionEditor(); }
    });
    regionForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!resultRegion.validate()) return;
      const region = resultRegion.get();
      const current = shownResult.region;
      if (region?.province === current?.province && region?.district === current?.district) { closeRegionEditor(); return; }
      const next = { ...editingInput, region };
      const verdict = judgeDisposal(next);
      rememberJudgementRegion(region, getCurrentMember());
      judgementRegion.set(region);
      showResult(next, verdict);
      if (draftBatchId) summary.querySelector('[data-result-tools-status]').textContent = '함께 버릴 목록에는 목록에서 선택한 지역의 결과가 유지돼요.';
      void persistResult(next, verdict);
    });
    disposeResultTools = bindResultTools(summary, input, result, {
      onNewItem: resetInput,
      onRelatedItem: openRelatedItem,
    });
    function openRelatedItem(itemName, confirmCandidate = false) {
      draftVersion = startInputSearch();
      if (confirmCandidate) retainBatchForCandidate(itemName);
      else { draftBatchId = undefined; draftBatchResolution = false; }
      showInput();
      restore({ itemName, region: shownResult.region });
      saveStatus.textContent = '';
      advanceLookup();
    }
  }
  function resetInput() {
    if (deleting) return;
    draftVersion = startInputSearch();
    appliedEvidence = '';
    draftBatchId = undefined; draftBatchResolution = false;
    showInput(); restore({}); saveStatus.textContent = '';
    savedTools.open = false;
    nameInput.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start' });
  }
  confirmName.addEventListener('click', () => advanceLookup());
  document.getElementById('reset-item').addEventListener('click', resetInput);
  let favorites = [];
  function beginSavedReview() {
    draftVersion = startInputSearch();
    draftBatchId = undefined; draftBatchResolution = false;
    appliedEvidence = '';
  }
  async function renderFavorites() {
    if (!savedTools.open) return;
    const version = ++favoriteVersion;
    const favoriteStatus = document.getElementById('favorite-status');
    favoriteStatus.textContent = '즐겨찾기를 불러오고 있어요…';
    try {
      const loaded = await memberTools.listFavorites();
      if (!form.isConnected || version !== favoriteVersion) return;
      favorites = loaded;
      document.getElementById('favorite-items').innerHTML = favorites.length ? `<ul class="favorite-list">${favorites.map((entry, index) => `<li><button class="history-action" type="button" data-favorite-index="${index}">${escapeHtml(entry.input.itemName)}</button></li>`).join('')}</ul>` : '<p class="input-hint">판별 결과에서 즐겨찾기를 저장해 보세요.</p>';
      favoriteStatus.textContent = getCurrentMember() ? '현재 계정의 즐겨찾기예요.' : '비회원 즐겨찾기는 이 브라우저에 저장돼요.';
    } catch (error) { if (form.isConnected && version === favoriteVersion) favoriteStatus.textContent = error.message; }
  }
  document.getElementById('favorite-items').addEventListener('click', event => {
    const button = event.target.closest('[data-favorite-index]'); if (!button || deleting) return;
    const entry = favorites[Number(button.dataset.favoriteIndex)]; if (!entry) return;
    beginSavedReview();
    showInput(); restore(entry.input); saveStatus.textContent = '즐겨찾기 조건을 불러왔어요. 현재 상태를 확인한 뒤 판별해 주세요.'; nameInput.focus(); closeSuggestions();
  });
  document.getElementById('retry-favorites').addEventListener('click', renderFavorites);
  async function renderRecent() {
    if (!savedTools.open) return false;
    const version = ++recentVersion;
    const wasOpen = document.querySelector('.recent-disclosure')?.open || false;
    historyStatus.textContent = '최근 기록을 불러오고 있어요…';
    let records;
    try { records = await getDisposalHistory(); }
    catch (error) {
      if (form.isConnected && version === recentVersion) {
        historyStatus.textContent = error.message;
        document.getElementById('recent-items-content').innerHTML = '<button type="button" class="history-action" id="retry-history">최근 기록 다시 불러오기</button>';
      }
      return false;
    }
    if (!form.isConnected || version !== recentVersion) return false;
    history = records;
    historyStatus.textContent = getCurrentMember() ? '현재 계정의 기록은 다른 기기에서도 확인할 수 있어요.' : '비회원 기록은 이 브라우저에 저장돼요.';
    if (!document.getElementById('all-history-link')) {
      document.getElementById('recent-items-content').insertAdjacentHTML('afterend', '<a id="all-history-link" class="all-history-link" href="#/history">전체 기록 및 통계 보기 →</a>');
    }
    document.getElementById('recent-items-content').innerHTML = history.length ? `<div class="history-toolbar"><button type="button" class="history-action" id="clear-history">전체 삭제</button></div><ol class="recent-list">${history.map((record, index) => `<li><button type="button" data-history="${index}"><strong>${escapeHtml(record.itemName)}</strong><small>${record.legacy ? '이전 이름 기록 · 다시 판별하기' : escapeHtml(resultForDisplay(record.input, record.result).method)}</small>${record.legacy ? '' : `<small>${escapeHtml(new Date(record.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))}</small>`}</button><button type="button" class="recent-delete" data-delete-history="${index}" aria-label="${index + 1}번째 ${escapeHtml(record.itemName)} 기록 삭제">삭제</button></li>`).join('')}</ol>` : '<p class="recent-empty">아직 저장한 물건이 없어요.</p>';
    if (history.length) {
      const content = document.getElementById('recent-items-content');
      content.innerHTML = `<details class="recent-disclosure" ${wasOpen ? 'open' : ''}><summary>최근 ${history.length}개 기록 보기</summary>${content.innerHTML}</details>`;
    }
    return true;
  }
  restore(draft);
  refreshCatalog();
  if (queued?.editCategory) {
    focusCategory();
  } else if (queued?.editPendingQuestion) focusResultQuestion(queued.editPendingQuestion);
  else if (queued?.itemName && !queued.quickLookup && !queued.manualLookup) focusNextCondition();
  if (queued?.reviewSaved) saveStatus.textContent = '저장한 조건을 불러왔어요. 지금 물건의 상태가 달라졌다면 수정해 주세요.';
  if (queued?.showMarkPicker) openMarkPicker();
  if (queued?.showMissingItem && !missing.hidden) {
    categorySection.open = true; missing.open = true; missing.querySelector('summary').focus();
  }
  savedTools.addEventListener('toggle', () => { if (savedTools.open) { renderRecent(); renderFavorites(); } });
  form.querySelectorAll('[data-item-example]').forEach(button => button.addEventListener('click', () => {
    if (deleting) return;
    nameInput.value = button.dataset.itemExample; changed({ target: nameInput }); closeSuggestions();
    advanceLookup();
  }));
  skipName.addEventListener('click', () => {
    if (deleting) return;
    draftVersion = startInputSearch();
    restore({ itemName: unnamedItem, keywordCategory: false });
    focusCategory();
  });
  function submitCleanShortcut(withoutLabel = false) {
    if (deleting || quickCondition.hidden || !judgementRegion.validate()) return;
    const input = collect();
    const labelled = cleanLabelledBottleInput(input);
    const next = withoutLabel ? labelled && cleanSingleMaterialInput(input) : labelled || cleanSingleMaterialInput(input);
    if (!next) return;
    restore(next); form.requestSubmit();
  }
  cleanShortcut.addEventListener('click', () => submitCleanShortcut());
  cleanWithoutLabel.addEventListener('click', () => submitCleanShortcut(true));
  function applySuggestion() {
    const suggestion = suggestItemInfo(nameInput.value);
    const preset = itemPresetInput(nameInput.value);
    compositionIsPreset = Boolean(preset.combined);
    // 이름을 바꾸면 이전 물품의 상태와 부속품 답변을 새 물품에 사용하지 않습니다.
    form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
    componentCount = Math.max(1, preset.components?.length || 0); drawComponents();
    document.getElementById('components-details').open = true;
    form.elements.namedItem('material').value = preset.material;
    form.elements.namedItem('type').value = '';
    for (let pass = 0; pass < 3; pass++) {
      writeValues(preset);
      (preset.components || []).forEach((part,index) => writeValues(part, `part${index}-`));
      updateConditional();
    }
    form.querySelectorAll('.component-material-editor').forEach(editor => { editor.open = !editor.querySelector('[name$="type"]').value; });
    const info = document.getElementById('preset-info');
    info.hidden = !suggestion;
    info.open = Boolean(suggestion?.handling);
    document.getElementById('preset-title').textContent = suggestion?.handling ? '품목 정보 자동 입력 · 재질 선택 불필요' : preset.components?.length ? '대표 구성 자동 입력 · 실제 제품을 확인해 주세요' : '자동 입력 기준 · 수정 가능';
    document.getElementById('preset-note').textContent = suggestion?.note || '';
    materialEditor.open = !suggestion?.type && !suggestion?.handling;
    compositionEditor.open = preset.combined !== 'no';
    mainStateEditor.open = true;
    autoFillStatus.textContent = suggestion
      ? '이름에 맞는 정보를 채웠어요. 실제 제품과 다르면 수정해 주세요.'
      : nameInput.value.trim() ? '등록된 재질 정보가 없어요.' : '물건 이름을 입력하면 알려진 품목의 재질 정보를 채워요.';
  }
  // 이름 칸을 벗어날 때 생기는 change는 입력 때 이미 처리한 값이면 건너뜁니다.
  // (다시 처리하면 AI·저장된 답으로 골라 둔 종류와 답한 상태가 지워져 판별 버튼이 막혔습니다.)
  function changed(event) {
    if (event.isComposing) return;
    if (event.target.name === 'judgementDistrict' && event.target.type === 'text' && event.type === 'input') return;
    const textField = event.target.type === 'text' && event.target.name !== 'judgementDistrict';
    if ((event.type === 'change' && textField) || (event.type === 'input' && !textField)) return;
    clearFieldError();
    componentCopyStatus.textContent = '';
    const changedName = event.target === nameInput && currentNameKey !== normalizeItemName(nameInput.value);
    if (event.target === nameInput && !changedName) { draft.itemName = nameInput.value.trim(); return; }
    // 사전에 없는 이름이면 이름 속 낱말로 물건 종류를 자동으로 골라 둡니다. 사용자가 바꿀 수 있습니다.
    if (changedName) {
      addSearchedItemsStatus.textContent = '';
      packagingShape = '';
      draftVersion = startInputSearch();
      appliedEvidence = ''; pendingObservations = []; observedStates.clear(); unopenedParts = []; pendingCombination = ''; pendingSeparation = '';
      if (event.selectCandidate) retainBatchForCandidate(nameInput.value);
      else { draftBatchId = undefined; draftBatchResolution = false; }
      compositionIsPreset = false;
      selectedHandlingCondition = '';
      missing.open = false;
      if (missingStatus) missingStatus.textContent = '';
      if (missingNote) missingNote.value = '';
      for (const [key, entry] of opinions) {
        if (entry.status === 'loading') { opinions.delete(key); entry.controller.abort(); }
      }
      currentNameKey = normalizeItemName(nameInput.value);
      keywordCategoryEnabled = true;
      const detected = keywordCategory();
      form.elements.namedItem('category').value = detected?.category || '';
      categoryOrigin = detected ? 'keyword' : '';
      document.getElementById('item-category-section').open = !detected;
    }
    if (event.target.matches?.('select[name$="type"]')) {
      const prefix = event.target.closest('.part-fields').dataset.prefix;
      writeValues({ contaminated: '', washed: '', removable: '', vinylResidue: '', foodSeparated: '' }, prefix);
    }
    if (event.target.name === 'attachment') {
      const [combined, separable] = attachments[event.target.value];
      writeValues({ combined, separable });
      compositionIsPreset = false;
      pendingCombination = ''; pendingSeparation = '';
      if (combined === 'no') {
        unopenedParts = [];
        for (const key of observedStates.keys()) if (key) observedStates.delete(key);
        if (componentCount !== 1) { componentCount = 1; drawComponents(); }
        else form.querySelectorAll('#component-fields input, #component-fields select').forEach(control => {
          if (control.type === 'radio') control.checked = false;
          else control.value = '';
        });
      }
    }
    if (event.target.name === 'category') {
      categoryOrigin = 'manual'; keywordCategoryEnabled = false;
      selectedHandlingCondition = '';
      observedStates.clear(); unopenedParts = []; pendingCombination = ''; pendingSeparation = '';
      compositionIsPreset = false;
      form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
      componentCount = 1; drawComponents();
      form.elements.namedItem('material').value = event.target.value === 'food' ? '음식물류' : '';
      form.elements.namedItem('type').value = '';
      materialEditor.open = true;
    }
    if (event.target.name === 'handlingCondition') selectedHandlingCondition = event.target.value;
    if (event.target.name?.endsWith('currentState')) {
      const prefix = event.target.closest('.part-fields').dataset.prefix;
      if (!prefix && compositionIsPreset && !value('contaminated') && event.target.value !== 'unknown') {
        unopenedParts = collect().components || [];
        pendingCombination = ''; pendingSeparation = '';
        writeValues({ combined: '', separable: '' });
        compositionEditor.open = true;
        compositionIsPreset = false;
      }
      observedStates.delete(prefix);
      writeValues({ washed: '', removable: '', vinylResidue: '', ...stateAnswers(event.target.value, needsWashQuestion(partValue(prefix))) }, prefix);
    }
    nameInput.setCustomValidity(''); saveStatus.textContent = '';
    if (event.target === nameInput && !aiMatches(nameInput.value.trim())) aiGuess = null;
    // 브라우저가 체크 상태를 복원해도 실제 화면의 선택과 일치시킵니다.
    autoFillEnabled = autoFill.checked;
    if (event.target === autoFill) {
      if (!autoFillEnabled) { autoFillStatus.textContent = '자동 입력을 껐어요. 재질 정보를 직접 선택하거나 수정할 수 있어요.'; document.getElementById('preset-info').hidden = true; }
    }
    if (autoFillEnabled && (event.target === autoFill || event.target === nameInput)) applySuggestion();
    else {
      if (event.target === nameInput || ['material','type'].includes(event.target.name)) document.getElementById('preset-info').hidden = true;
      if (event.target === nameInput) {
        form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
        componentCount = 1;
        drawComponents();
        form.elements.namedItem('material').value = ''; form.elements.namedItem('type').value = '';
      }
      updateConditional();
    }
    if (event.target.name === 'category' && pendingObservations.length) {
      const observations = category.value === 'packaging' ? pendingObservations.filter(observation => observation.field !== 'handlingCondition')
        : category.value === 'material-only' ? pendingObservations.filter(observation => observation.part === 'body' && observation.field === 'material')
          : pendingObservations.filter(observation => observation.field === 'handlingCondition'
            && handlingConditionQuestion(category.value)?.options.some(([answer]) => answer === observation.value));
      pendingObservations = [];
      if (observations.length) restore(applyItemObservations(collect(), observations));
    } else if (event.target.name === 'attachment' && value('separable') === 'yes' && unopenedParts.length) {
      restore({ ...collect(), components: unopenedParts });
      focusNextCondition();
    } else if (event.target.matches?.('select[name$="type"]')) {
      applyObservedState('');
      if (value('separable') === 'yes') for (let index = 0; index < componentCount; index++) applyObservedState(`part${index}-`);
      updateConditional();
      if (event.target.name === 'type' && supportsState(partValue('')) && (pendingCombination || unopenedParts.length)) {
        restore({ ...collect(), combined: pendingCombination || 'yes', separable: pendingSeparation, components: unopenedParts });
      }
    }
    if (event.target === nameInput) scheduleAiPrefetch();
    draft = collect(); showInput();
  }
  // AI가 켜져 있으면 이름을 0.7초 동안 그대로 둘 때 자동으로 AI 의견을 물어봅니다.
  let prefetchTimer = 0;
  function scheduleAiPrefetch() {
    clearTimeout(prefetchTimer);
    const name = nameInput.value.trim();
    if (name === unnamedItem || !cleanAiName(name) || category.value || needsNameChoice(name) || isAmbiguousSpoonName(name) || lookupItem(name)?.material || verifiedNameGuide(name) || confirmedItemType(name, owner)) return;
    // 저장된 답 조회는 가벼워서 0.3초, AI는 0.7초 기다린 뒤 묻습니다.
    prefetchTimer = setTimeout(() => {
      if (form.isConnected && !category.value && nameInput.value.trim() === name) {
        if (aiEnabled) askAi(name);
        else askShared(name);
      }
    }, aiEnabled ? 700 : 300);
  }
  // 분리배출 표시 버튼: 재질·세부 종류를 채우고 상태 질문으로 이어집니다.
  form.addEventListener('click', event => {
    const noMark = event.target.closest('[data-no-mark]');
    if (noMark && !deleting) {
      const picker = noMark.closest('.mark-picker');
      picker.open = false;
      if (categorySection.contains(picker)) focusCategory();
      else if (category.value === 'packaging') {
        const button = materialEditor.querySelector('[data-material-choice="모르겠어요"]');
        button.focus();
      } else {
        const material = form.elements.namedItem('material');
        material.focus();
      }
      return;
    }
    const typeChoice = event.target.closest('[data-type-choice]');
    if (typeChoice && !deleting) {
      const part = typeChoice.closest('.part-fields');
      const type = form.elements.namedItem(`${part.dataset.prefix}type`);
      if (type.value !== typeChoice.dataset.typeChoice) {
        type.value = typeChoice.dataset.typeChoice;
        type.dispatchEvent(new Event('change', { bubbles: true }));
      }
      part.querySelector('.material-editor').open = false;
      if (!firstInvalidField() && !part.dataset.prefix) form.requestSubmit();
      else focusNextCondition();
      return;
    }
    const materialChoice = event.target.closest('[data-material-choice]');
    if (materialChoice && !deleting) {
      const part = materialChoice.closest('.part-fields');
      const material = form.elements.namedItem(`${part.dataset.prefix}material`);
      const next = materialChoice.dataset.materialChoice;
      if (next && next !== material.value) {
        material.value = next;
        material.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const type = form.elements.namedItem(`${part.dataset.prefix}type`);
      if (type.disabled) {
        part.querySelector('.material-editor').open = false;
        if (!firstInvalidField() && !part.dataset.prefix) form.requestSubmit();
        else focusNextCondition();
      } else {
        const target = visibleControl(type);
        reveal(target);
        target.focus();
      }
      return;
    }
    const mark = markById(event.target.closest('[data-mark]')?.dataset.mark);
    if (!mark || deleting) return;
    const picker = event.target.closest('.mark-picker');
    // 분리배출 표시가 있는 미등록 물건은 '포장재·용기'로 보고 재질을 채웁니다.
    if (!category.disabled && (category.value !== 'packaging' || categoryOrigin !== 'manual')) {
      category.value = 'packaging';
      changed({ target: category });
    }
    clearFieldError();
    picker.open = false;
    document.getElementById('item-category-section').open = false;
    const sameMaterial = value('material') === mark.material;
    if (!sameMaterial && value('material')) {
      writeValues({ contaminated: '', washed: '', removable: '', vinylResidue: '', foodSeparated: '' });
      observedStates.delete('');
    }
    if (value('material') !== mark.material || value('type') !== mark.type) {
      writeValues({ material: mark.material });
      updateConditional();
      writeValues({ type: mark.type });
      applyObservedState('');
      updateConditional();
    }
    draft = collect(); showInput();
    materialEditor.open = false;
    advanceLookup({ confirmedCategory: true });
  });
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  // Safari can report click.detail = 0 when a tapped label activates its radio.
  // Keep keyboard arrows and screen-reader answer changes separate from submit.
  let pointedRadio = null;
  form.addEventListener('pointerdown', event => {
    const label = event.target.closest('label');
    const control = label?.control || event.target;
    pointedRadio = control.matches('input[type="radio"]') ? control : null;
  });
  form.addEventListener('pointercancel', () => { pointedRadio = null; });
  form.addEventListener('click', event => {
    const radio = event.target.closest('input[type="radio"]');
    if (!radio || (!event.detail && pointedRadio !== radio) || radio.disabled
        || !/^(handlingCondition|attachment|(?:part\d+-)?(?:currentState|removable|vinylResidue|foodSeparated))$/.test(radio.name)) return;
    pointedRadio = null;
    setTimeout(() => chooseAnswerFromPointer(radio), 0);
  });
  form.addEventListener('keydown', event => {
    pointedRadio = null;
    if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    if (event.target === nameInput && nameInput.value.trim()) {
      event.preventDefault();
      advanceLookup();
    } else if (event.target.matches('input[type="radio"]')) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.getElementById('add-component').addEventListener('click', () => {
    const parts = collect().components;
    if (!parts || componentCount >= 5) return;
    replaceComponents([...parts, {}]);
    document.getElementById('components-details').open = true;
    focusQuestion(form.elements.namedItem(`part${componentCount - 1}-material`));
  });
  document.getElementById('component-fields').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button || componentCount < 2) return;
    const parts = collect().components;
    if (!parts) return;
    parts.splice(Number(button.dataset.remove), 1);
    replaceComponents(parts);
    document.getElementById('add-component').focus();
  });
  document.getElementById('recent-items-content').addEventListener('click', event => {
    if (event.target.closest('#retry-history')) { renderRecent(); return; }
    if (deleting) return;
    const deleteButton = event.target.closest('[data-delete-history], #clear-history');
    if (deleteButton) {
      if (pendingWrites) { historyStatus.textContent = '기록 저장이 끝나면 삭제할 수 있어요.'; return; }
      pendingDeletion = deleteButton.id === 'clear-history' ? { all: true } : { record: history[Number(deleteButton.dataset.deleteHistory)] };
      document.getElementById('history-delete-message').textContent = pendingDeletion.all
        ? '현재 계정의 전체 판별 기록과 이전 이름 기록을 모두 삭제할까요? 최근 목록에 보이지 않는 기록도 삭제되며, 삭제 후에는 복구할 수 없어요.'
        : `‘${pendingDeletion.record.itemName}’ 기록을 삭제할까요? 삭제 후에는 복구할 수 없어요.`;
      historyStatus.textContent = ''; deleteConfirm.hidden = false;
      document.getElementById('cancel-history-delete').focus();
      return;
    }
    const button = event.target.closest('[data-history]'); if (!button) return;
    const record = history[Number(button.dataset.history)];
    beginSavedReview();
    if (record.legacy) { showInput(); restore({ itemName: record.itemName }); saveStatus.textContent = '이전 기록은 이름만 저장되어 있어요. 조건을 입력해 새로 판별해 주세요.'; nameInput.focus(); closeSuggestions(); }
    else showResult(record.input, record.result, record.createdAt, record.id);
  });
  document.getElementById('cancel-history-delete').addEventListener('click', () => {
    pendingDeletion = null; deleteConfirm.hidden = true;
    document.getElementById('clear-history')?.focus();
  });
  document.getElementById('confirm-history-delete').addEventListener('click', async () => {
    if (!pendingDeletion || deleting || pendingWrites) return;
    const request = pendingDeletion; deleting = true;
    const buttons = [...deleteConfirm.querySelectorAll('button')];
    buttons.forEach(button => { button.disabled = true; });
    try {
      if (request.all) await clearDisposalHistory(); else await deleteDisposalRecord(request.record);
      if (!form.isConnected) return;
      if (request.all || (request.record && shownSnapshot?.recordId === request.record.id)) { showInput(); shownSnapshot = undefined; }
      pendingDeletion = null; deleteConfirm.hidden = true;
      if (await renderRecent()) historyStatus.textContent = request.all ? '최근 분리배출 목록을 모두 삭제했어요.' : '선택한 기록을 삭제했어요.';
      document.getElementById('clear-history')?.focus();
    } catch (error) { if (form.isConnected) historyStatus.textContent = error.message; }
    finally { deleting = false; buttons.forEach(button => { button.disabled = false; }); }
  });
  async function persistResult(input, result) {
    const recordStatus = summary.querySelector('[data-record-save-status]');
    const current = () => form.isConnected && !summary.hidden && shownInput === input;
    const snapshot = shownSnapshot;
    pendingWrites++;
    recordStatus.textContent = '결과를 기록에 저장하는 중이에요…';
    try {
      const record = await saveDisposalRecord(input, result);
      if (snapshot?.input === input) snapshot.recordId = record.id;
      if (current()) {
        recordStatus.textContent = getCurrentMember() ? '계정에 기록을 저장했어요.' : '이 브라우저에 기록을 저장했어요.';
      }
      if (form.isConnected && savedTools.open) renderRecent();
    } catch (error) {
      if (current()) recordStatus.textContent = error.message;
    }
    finally { pendingWrites--; }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (deleting || form.hidden) return;
    closeSuggestions();
    if (!nameInput.value.trim()) { validateConditions(); return; }
    committedName = normalizeItemName(nameInput.value);
    confirmName.hidden = true;
    if (!category.disabled && !category.value) { focusCategory(); return; }
    if (!judgementRegion.validate()) return;
    updateConditional();
    if (!validateConditions()) return;
    pendingDeletion = null;
    deleteConfirm.hidden = true;
    try {
      saveStatus.textContent = '';
      draft = collect();
      const input = confirmedDisposalInput(draft);
      const result = judgeDisposal(input);
      if (result.status !== 'check' && input.itemName !== unnamedItem) rememberConfirmedItemType(input, owner);
      if (draftBatchId && !updateBatchItem(draftBatchId, input, result, { resolveName: draftBatchResolution })) draftBatchId = undefined;
      draftBatchResolution = false;
      showResult(input, result);
      void persistResult(input, result);
    } catch (error) { saveStatus.textContent = error.message; }
  });
  const storageChanged = event => { if (savedTools.open && (event.key === null || event.key?.startsWith('recycle-helper.'))) { renderRecent(); renderFavorites(); } };
  const windowFocused = () => { if (savedTools.open) renderRecent(); };
  window.addEventListener('storage', storageChanged);
  window.addEventListener('focus', windowFocused);
  window.addEventListener('favorites-changed', renderFavorites);
  // 홈 검색·기록에서 이름을 가져온 경우에도 저장된 답(또는 AI 의견)을 바로 찾아봅니다.
  if (queued?.savedLookup) {
    const { input, result, createdAt, id } = queued.savedLookup;
    showResult(input, result, createdAt, id);
    if (queued.editRegion) summary.querySelector('[data-edit-region]').click();
  } else if (queued?.quickLookup || (queued?.manualLookup && !queued.showMarkPicker)) advanceLookup();
  else if (!queued && lastVisibleResult) {
    const { input, result, createdAt, recordId } = lastVisibleResult;
    showResult(input, result, createdAt, recordId, lastVisibleResult);
  }
  if (queued?.requestIdentification && !category.disabled && !category.value && spoonMaterialChoices.hidden && confirmedCategory.hidden) askAi(nameInput.value.trim(), '', { manual: true });
  else if (!form.hidden && nameInput.value.trim() && !queued?.showMissingItem && !queued?.manualLookup) scheduleAiPrefetch();
  return () => {
    lastVisibleResult = !summary.hidden ? shownSnapshot : undefined;
    disposeModes(); aiSwitch.dispose(); recentVersion++; favoriteVersion++; clearTimeout(prefetchTimer);
    opinions.forEach(entry => entry.controller?.abort());
    autocomplete.dispose(); disposeResultTools();
    window.removeEventListener('favorites-changed', renderFavorites);
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener('focus', windowFocused);
  };
}
