import { escapeHtml } from '../../utils/html.js';
import { getDisposalHistory, saveDisposalRecord, deleteDisposalRecord, clearDisposalHistory } from '../../services/disposal-history.js';
import { MATERIALS, TYPES, supportsState, needsWashQuestion, normalizePart, judgeDisposal, RULE_SOURCE, RULE_VERSION } from '../../domain/disposal/rules.js';
import { suggestItemInfo, searchItemNames, lookupItem, normalizeItemName } from '../../domain/disposal/item-suggestions.js';
import { validateAiGuess, aiOpinionNeedsReview } from '../../domain/disposal/ai-classification.js';
import { requestAiGuess, reportAiGuess } from '../../services/ai-classify.js';
import { aiToggleMarkup, bindAiToggle, readAiEnabled } from '../../components/ai-toggle.js';
import { RECYCLE_MARKS, markById } from '../../domain/disposal/recycle-marks.js';
import { encodeAiState } from '../../domain/disposal/ai-state.js';
import { getCurrentMember } from '../../services/auth.js';
import { getCatalogMessage, initializeItemCatalog } from '../../services/item-catalog.js';
import { resultToolsMarkup, bindResultTools } from '../../components/result-tools.js';
import { memberTools } from '../../services/member-tools.js';
import { regionLabel, REGIONAL_SOURCES, regionalSourceLabel, resultRegionLabel } from '../../domain/disposal/regions.js';
import { METRO_GUIDES } from '../../domain/disposal/metro-guides.js';
import { cityGuide } from '../../domain/disposal/city-guides.js';
import { DAEJEON_GUIDES } from '../../domain/disposal/daejeon-guides.js';
import { queueInput, takeQueuedInput } from '../../services/input-draft.js';
import { cleanSingleMaterialInput } from '../../domain/disposal/input-shortcuts.js';
import { itemPresetInput } from '../../domain/disposal/input-presets.js';
import { CATALOG_DETAIL_SOURCES } from '../../domain/disposal/catalog-sources.js';
import { stateAnswers, selectedState } from '../../domain/disposal/input-state.js';
import { regionalComparisonMarkup } from '../../components/regional-comparison.js';
import { judgementRegionMarkup, bindJudgementRegion } from '../../components/judgement-region.js';
import { ITEM_CATEGORY_GROUPS, categoryLabel, categoryAllowsMaterial } from '../../domain/disposal/item-categories.js';
import { resultForDisplay, inputForDisplay, resultStepsForDisplay, conditionDetails } from '../../domain/disposal/result-display.js';
import { detectItemCategory, isBatteryPackaging } from '../../domain/disposal/category-keywords.js';
import { bindItemAutocomplete } from '../../components/item-autocomplete.js';
import { prepareCategoryInput } from '../../domain/disposal/input-category.js';
import { readJudgementRegion, rememberJudgementRegion } from '../../services/judgement-region.js';
import { largeWasteHelp } from '../../domain/disposal/large-waste.js';
import { collectionPointMarkup } from '../../components/collection-help.js';
import { stepListMarkup } from '../../components/step-list.js';
import { inputModeSelectMarkup, photoShortcutMarkup, bindInputModeSelect } from '../../components/input-modes.js';
import { verifiedNameGuide } from '../../domain/disposal/verified-name-guide.js';
import { handlingConditionQuestion } from '../../domain/disposal/special-guides.js';
import { checklistMarkup } from '../../components/disposal-checklist.js';

let draft = {};
let componentCount = 1;
let autoFillEnabled = true;
let draftOwner;
const yesNo = [['yes', '네'], ['no', '아니요'], ['unknown', '모르겠어요']];
function question(name, title, options = yesNo, { required = true } = {}) {
  return `<fieldset class="item-question"><legend>${title}</legend><div class="choice-row">${options.map(([value, label]) => `<label class="choice"><input type="radio" name="${name}" value="${value}"${required ? ' required' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>`;
}
// 분리배출 표시(마크) 버튼 묶음. 종류 질문과 재질 선택 두 곳에서 같은 버튼을 씁니다.
function markPicker(titleId, title) {
  return `<details class="mark-picker"><summary class="mark-picker-title" id="${titleId}">${title}</summary><div class="mark-picker-grid" role="group" aria-labelledby="${titleId}">${RECYCLE_MARKS.map(mark => `<button type="button" class="recycle-mark" data-mark="${mark.id}" aria-pressed="false"><strong>${mark.label}</strong><small>${mark.hint}</small></button>`).join('')}</div></details>`;
}
function categoryFields() {
  const groups = ITEM_CATEGORY_GROUPS.map(([group, entries]) => {
    const options = entries.map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('');
    return group ? `<optgroup label="${escapeHtml(group)}">${options}</optgroup>` : options;
  }).join('');
  return `<details id="item-category-section" class="item-category-section" hidden><summary id="item-category-summary">물건 종류 확인</summary><div class="field"><label for="item-category">어떤 종류의 물건인가요?</label><select id="item-category" name="category" aria-describedby="category-guidance"><option value="">물건 종류를 선택해 주세요</option>${groups}</select></div><div class="category-suggestion" id="category-suggestion" hidden><p id="category-suggestion-text"></p><button class="history-action" id="apply-category-suggestion" type="button" aria-describedby="category-suggestion-text">제안 적용</button></div>${markPicker('category-mark-title', '포장재의 분리배출 표시로 고르기')}<p id="category-guidance" class="input-hint" role="status"></p></details>`;
}
function partFields(prefix, label) {
  return `<div class="part-fields" data-prefix="${prefix}">
    ${!prefix ? '<details id="material-editor" class="material-editor" open><summary><span id="material-detected">재질·종류 선택</span><span class="material-edit-label">수정</span></summary><div class="material-controls">' : '<details class="material-editor component-material-editor" open><summary><span class="component-material-summary">재질·종류 선택</span><span class="material-edit-label">수정</span></summary><div class="material-controls">'}
    ${prefix ? `<div class="field component-label-field"><label for="${prefix}label">부속품 이름 (선택)</label><input id="${prefix}label" name="${prefix}label" type="text" maxlength="40" data-optional placeholder="예: 라벨, 뚜껑, 포장 필름"></div>` : ''}
    <div class="field"><label for="${prefix}material">${label}</label><select id="${prefix}material" name="${prefix}material" required><option value="">재질을 선택해 주세요</option>${MATERIALS.map(material => `<option>${material}</option>`).join('')}</select></div>
    <div class="field" data-condition="type" hidden><label for="${prefix}type">세부 종류</label><select id="${prefix}type" name="${prefix}type" required></select></div>
    ${!prefix ? markPicker('mark-picker-title', '포장재의 분리배출 표시로 고르기') : ''}
    ${!prefix ? '<label class="auto-fill-choice"><input type="checkbox" id="auto-fill-item"><span>이름에 맞춰 재질 자동 입력</span></label><p id="auto-fill-status" class="input-hint" role="status"></p><details id="preset-info" class="preset-info" hidden><summary id="preset-title">자동 입력 기준 · 수정 가능</summary><p id="preset-note" class="input-hint"></p></details>' : ''}</div></details>
    ${!prefix ? '<div class="quick-condition" id="quick-condition" hidden><button class="button secondary" type="button" id="clean-shortcut">깨끗하고 다른 재질도 없어요 → 결과 보기</button><p class="input-hint">내용물·오염·라벨·빨대 등 다른 재질이 모두 없을 때만 선택해 주세요.</p></div>' : ''}
    <div data-condition="state" hidden>
      <div class="current-state">${question(`${prefix}currentState`, prefix ? '이 부속품의 상태는 어떤가요?' : '본체 상태는 어떤가요?', [['clean', '깨끗해요'], ['dirty', '오염 있음 · 세척 전'], ['washed-dirty', '씻어도 오염이 남아요'], ['unknown', '모르겠어요']])}</div>
      <div class="state-storage" hidden>${question(`${prefix}contaminated`, '현재 오염 여부')}${question(`${prefix}washed`, '세척 여부', [['yes', '세척했어요'], ['no', '아직 안 했어요']])}</div>
      <div data-condition="vinyl-residue" hidden>${question(`${prefix}vinylResidue`, '비닐 속 내용물을 비운 뒤 무엇이 남았나요?', [['liquid-only', '내용물·고형물 없이 기름·물 자국만 있어요'], ['solids', '음식물·소스·부스러기 등 고형물이 남아요'], ['unknown', '모르겠어요']])}</div>
      <div data-condition="removable" hidden>${question(`${prefix}removable`, '남은 오염을 제거할 수 있나요?')}</div>
    </div><div data-condition="food" hidden>${question(`${prefix}foodSeparated`, '포장재·이쑤시개·단단한 뼈 등 음식물이 아닌 것을 모두 제거했나요?')}</div></div>`;
}


export function itemInputPage() {
  return `<section class="container item-page">
    <header class="item-heading"><h1>분리배출 방법 찾기</h1></header>
    <p id="catalog-status" class="input-hint" role="status" aria-live="polite"></p>
    <button type="button" id="retry-catalog" class="history-action" hidden>품목 정보 다시 불러오기</button>
    <div class="item-grid"><form id="item-form" class="item-card" novalidate>
      <div class="item-basic-fields"><div class="field"><label for="item-name">물건 이름</label><div class="item-name-control"><input id="item-name" name="itemName" type="text" maxlength="80" required placeholder="예: 우유팩, 생수병, 과자 봉지" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="item-name-options" aria-expanded="false" aria-describedby="item-name-status"><div id="item-name-options" class="item-name-options" role="listbox" aria-label="추천 물품" hidden></div></div><p class="input-hint" id="item-name-status" role="status" aria-live="polite"></p>
        <div class="ai-mode-controls">${aiToggleMarkup('ai-enabled')}${inputModeSelectMarkup('name')}${photoShortcutMarkup()}</div>
        <div id="ai-guess-box" class="ai-panel" hidden role="status" aria-live="polite"><p class="ai-panel-title" id="ai-guess-text"></p><p class="ai-panel-reason" id="ai-guess-status"></p><button type="button" class="button secondary" id="ai-guess-button" hidden>다시 묻기</button></div></div>
        <div class="example-items input-examples" aria-label="자주 찾는 물건">${['우유팩', '투명생수병', '과자봉지', '종이상자'].map(name => `<button class="history-action" type="button" data-item-example="${name}">${name}</button>`).join('')}</div></div>
        ${judgementRegionMarkup(getCurrentMember()?.region)}
        ${categoryFields()}
        <div id="handling-condition" hidden></div>
        <section id="item-conditions" aria-labelledby="conditions-title" hidden><h2 id="conditions-title">상태 확인</h2>${partFields('', '주요 재질')}
      </section>
      <section id="combination-section" aria-labelledby="item-state" hidden><h3 id="item-state">다른 재질 확인</h3>
        <details id="composition-editor" class="material-editor" open><summary><span id="composition-detected">결합 상태 선택</span><span class="material-edit-label">수정</span></summary><div class="composition-controls">
        ${question('combined', '라벨·뚜껑·테이프 등 다른 재질과 결합되어 있나요?')}
        <p class="input-hint" id="combination-hint">종이팩 코팅층은 그대로, 빨대·뚜껑만 확인해 주세요.</p>
        <div id="separable-question" hidden>${question('separable', '결합된 재질을 분리할 수 있나요?')}</div>
        </div></details>
        <div id="components-section" hidden><details id="components-details" class="material-editor components-details" open><summary><span id="components-detected">부속품</span></summary><button class="history-action" type="button" id="copy-component-state" hidden>부속품에도 본체 상태 적용</button><details class="component-help"><summary>부속품 입력 도움말</summary><p class="input-hint">같은 재질과 상태는 묶어 최대 5개까지 입력할 수 있어요. 복합재질 부속품은 ‘기타’를 선택하고, 페트병 뚜껑은 본체 처리 안내를 따라 주세요.</p></details><div id="component-fields"></div><button class="button secondary" type="button" id="add-component">부속품 추가</button></details></div>
      </section>
      <div class="form-actions"><button type="submit" class="button primary">분리배출 방법 보기 <span aria-hidden="true">→</span></button><button type="button" class="button secondary" id="reset-item">새로 입력</button></div>
      <button type="button" class="history-action describe-instead" data-describe-instead hidden>물건 설명으로 이어서 찾기</button>
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
export function largeWasteMarkup(result) {
  const help = largeWasteHelp(result);
  if (!help) return '';
  return `<section class="large-waste-help" aria-labelledby="large-waste-title"><h3 id="large-waste-title">🪑 ${help.maybe ? '봉투에 안 들어가면 ' : ''}대형폐기물 신고하기${help.place ? ` · ${escapeHtml(help.place)}` : ''}</h3>
    <div class="large-waste-links">${help.reportUrl ? `<a class="button primary" href="${escapeHtml(help.reportUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.office)} 대형폐기물 ${help.directReport ? '배출 신청' : '안내'} ↗</a>` : ''}${help.feeUrl ? `<a class="button secondary" href="${escapeHtml(help.feeUrl)}" target="_blank" rel="noopener noreferrer">유성구 품목·수수료표 ↗</a>` : help.homepage ? `<a class="button secondary" href="${escapeHtml(help.homepage)}" target="_blank" rel="noopener noreferrer">${escapeHtml(help.office)}청 누리집 ↗</a>` : ''}${help.directReport ? '' : `<a class="button secondary" href="${escapeHtml(help.searchUrl)}" target="_blank" rel="noopener noreferrer">신고 페이지 찾기 ↗</a>`}</div>
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
  const checkedAt = result.regional?.checkedAt || result.checkedAt;
  if (!primary && !checkedAt) return '';
  return `<p class="result-source-line">📌 ${checkedAt ? `${escapeHtml(checkedAt)} 확인한 기준` : '참고한 기준'}${primary ? ` · <a href="${escapeHtml(primary)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceLabel(primary))} ↗</a>` : ''}</p>`;
}
const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
export function resultMarkup(input, result, createdAt, { editRegion = false } = {}) {
  const updated = result.ruleVersion !== RULE_VERSION;
  input = inputForDisplay(input, result);
  result = resultForDisplay(input, result);
  const source = result.sourceUrl === 'https://geumcheon.go.kr/portal/contents.do?key=818' ? result.sourceUrl : RULE_SOURCE;
  const sources = [...new Set(Array.isArray(result.sourceUrls) ? result.sourceUrls : [source])]
    .filter(url => [RULE_SOURCE, ...Object.values(REGIONAL_SOURCES), ...Object.keys(CATALOG_DETAIL_SOURCES)].includes(url));
  const { parts, steps } = resultStepsForDisplay(result);
  const badge = input.material === '음식물류' && result.status === 'recycle' ? '음식물류' : { recycle: '재활용', general: '일반 배출', check: '추가 확인 필요', mixed: '재질별 배출' }[result.status];
  const handlingAnswer = handlingConditionQuestion(lookupItem(input.itemName)?.handling || input.category)?.options.find(([key]) => key === input.handlingCondition)?.[1];
  const details = part => conditionDetails(part).map(([title, value]) =>
    `<div><dt>${title}</dt><dd>${escapeHtml(value)}</dd></div>`
  ).join('');
  return `<p class="eyebrow">${createdAt ? '저장된 결과' : '분리배출 결과'}</p><h2 id="summary-title">${escapeHtml(input.itemName)}</h2>
    ${createdAt ? `<p class="input-hint">${escapeHtml(new Date(createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · 기록 저장일</p>` : ''}
    ${updated ? '<p class="input-hint">현재 기준으로 다시 확인한 안내예요.</p>' : ''}
    ${result.aiAssisted ? '<p class="ai-badge">🤖 AI 추정 결과예요. 실제 제품의 분리배출 표시를 꼭 확인해 주세요.</p>' : ''}
    ${result.keywordCategory ? `<p class="keyword-note">🔎 이름의 ‘${escapeHtml(result.keywordCategory.keyword)}’(으)로 <strong>${escapeHtml(categoryLabel(result.keywordCategory.category))}</strong>(으)로 알아봤어요. <button type="button" class="history-action" id="category-other">다른 물건이에요</button></p>` : ''}
    <div class="result-verdict ${result.status === 'check' ? 'needs-check' : ''}">${badge !== result.method ? `<span class="result-badge">${badge}</span>` : ''}<h3>${escapeHtml(result.method)}</h3></div>
    <div class="result-region"><p class="input-hint">${escapeHtml(resultRegionLabel(result))}</p>${editRegion ? '<button type="button" class="history-action" data-edit-region>지역 변경</button>' : ''}</div>
    ${steps.length || parts.some(part => part.steps.length) ? checklistMarkup() : ''}
    ${steps.length ? `<h3>${parts.length ? '먼저 할 일' : result.status === 'check' ? '배출 전에 확인하세요' : '이렇게 배출하세요'}</h3>${stepListMarkup(steps, 'action-steps', { checklist: true })}` : ''}
    ${parts.length ? `<h3>본체와 부속품 배출 방법</h3><div class="result-parts">${parts.map(part => `<article><h4>${escapeHtml(part.label)} · ${escapeHtml(part.material)}</h4><p class="part-method">${escapeHtml(part.method)}</p>${part.steps.length ? stepListMarkup(part.steps, 'part-steps', { checklist: true }) : ''}</article>`).join('')}</div>` : ''}
    ${largeWasteMarkup(result)}
    ${collectionPointMarkup({ ...result, itemName: input.itemName })}
    ${localGuideMarkup(result, input.itemName)}
    ${regionalComparisonMarkup(input, result)}
    <div class="result-next-actions"><button type="button" class="button primary" data-new-item>다른 물건 찾기</button><button type="button" class="button secondary" id="edit-item">조건 수정</button></div>
    <details class="result-evidence"><summary>판단 근거·지역 기준</summary>${sourceLineMarkup(result, sources)}${list(result.reasons)}${result.regional?.notes.length ? list(result.regional.notes) : ''}<p class="input-hint">${escapeHtml(result.notice)}</p><p class="input-hint">${sources.map(url => outLink(url, sourceLabel(url))).join(' · ')}</p></details>
    <details class="input-details"><summary>입력한 조건</summary><dl><div><dt>물건</dt><dd>${escapeHtml(input.itemName)}</dd></div>${input.category ? `<div><dt>${result.keywordCategory ? '이름으로 알아본 종류' : '직접 선택한 종류'}</dt><dd>${escapeHtml(categoryLabel(input.category))}</dd></div>` : ''}${handlingAnswer ? `<div><dt>물건 상태</dt><dd>${handlingAnswer}</dd></div>` : ''}${details(input)}</dl>${(input.components || []).map((part, index) => `<h4>${escapeHtml(part.label || `부속품 ${index + 1}`)}</h4><dl>${details(part)}</dl>`).join('')}</details>
    <p class="input-hint" data-record-save-status role="status"></p>
    ${resultToolsMarkup(input)}`;
}

export function bindItemInput() {
  const owner = getCurrentMember()?.id || 'guest';
  if (draftOwner !== owner) { draft = {}; componentCount = 1; draftOwner = owner; }
  const queued = takeQueuedInput();
  if (queued) {
    const { fromAssistance, ...next } = queued;
    draft = fromAssistance && normalizeItemName(next.itemName) === normalizeItemName(draft.itemName) ? { ...draft, ...next } : next;
  }
  const form = document.getElementById('item-form');
  const judgementRegion = bindJudgementRegion(form, readJudgementRegion(getCurrentMember()), {
    onChange: region => rememberJudgementRegion(region, getCurrentMember()),
  });
  const summary = document.getElementById('item-summary');
  const nameInput = form.elements.namedItem('itemName');
  const describeInstead = form.querySelector('[data-describe-instead]');
  const handoff = path => queueInput({ description: nameInput.value.trim(), sourceName: nameInput.value.trim(), newSearch: !nameInput.value.trim() }, path);
  describeInstead.addEventListener('click', () => {
    handoff('/describe');
    location.hash = '/describe';
  });
  const disposeModeSelect = bindInputModeSelect(form, path => {
    if (path !== '/item-input') handoff(path);
  });
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
  const aiBox = document.getElementById('ai-guess-box');
  const aiText = document.getElementById('ai-guess-text');
  const aiButton = document.getElementById('ai-guess-button');
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
      if (draft.itemName && draft.itemName === nameInput.value.trim() && !draft.material && !draft.category && summary.hidden && autoFillEnabled && suggestItemInfo(draft.itemName)) { applySuggestion(); draft = collect(); }
    } finally { catalogLoading = false; if (form.isConnected) retryCatalog.disabled = false; }
  }
  retryCatalog.addEventListener('click', refreshCatalog);
  const autocomplete = bindItemAutocomplete({ input: nameInput, options: nameOptions, status: nameStatus, search: searchItemNames,
    onSelect: () => changed({ target: nameInput }), onCompositionEnd: () => changed({ target: nameInput }) });
  const closeSuggestions = autocomplete.close;
  let history = [];
  let shownInput, shownResult;
  let shownRecordId = null;
  let pendingDeletion = null;
  let deleting = false;
  const deleteConfirm = document.getElementById('history-delete-confirm');
  const historyStatus = document.getElementById('history-status');
  let pendingWrites = 0;
  let recentVersion = 0, favoriteVersion = 0;
  const value = name => form.elements.namedItem(name)?.value || '';
  function partValue(prefix) {
    return Object.fromEntries(['material', 'type', 'contaminated', 'washed', 'removable', 'vinylResidue', 'foodSeparated', ...(prefix ? ['label'] : [])].map(key => [key, value(`${prefix}${key}`)]));
  }
  function toggle(node, show) {
    node.hidden = !show;
    node.querySelectorAll('input, select').forEach(control => {
      control.disabled = !show;
      control.required = show && !control.hasAttribute('data-optional');
      if (!show) { if (control.type === 'radio') control.checked = false; else control.value = ''; }
    });
  }
  function componentSummaryText() {
    const names = Array.from({ length: componentCount }, (_, index) => {
      const material = value(`part${index}-material`);
      const type = TYPES[material]?.find(([id]) => id === value(`part${index}-type`))?.[1];
      return type ? `${material}(${type.split('·')[0].trim()})` : material;
    }).filter(Boolean);
    return names.length ? `부속품 ${names.join(', ')}` : '부속품 재질을 골라 주세요';
  }
  function linkComponentStates() {
    const answer = value('currentState');
    if (!['clean', 'dirty', 'washed-dirty'].includes(answer)) return;
    for (let index = 0; index < componentCount; index++) {
      const prefix = `part${index}-`;
      const radios = [...form.querySelectorAll(`[name="${prefix}currentState"]`)];
      const pick = radios.find(radio => radio.value === answer && !radio.disabled) || (answer === 'washed-dirty' ? radios.find(radio => radio.value === 'dirty' && !radio.disabled) : null);
      if (!pick) continue;
      pick.checked = true;
      writeValues(stateAnswers(pick.value, needsWashQuestion(partValue(prefix))), prefix);
      // 오염이 있을 때 이어지는 "남은 오염을 제거할 수 있나요?"도 본체 답을 같이 씁니다.
      const removable = value('removable');
      const follow = removable && form.querySelector(`[name="${prefix}removable"][value="${removable}"]`);
      if (follow) follow.checked = true;
    }
    updateConditional();
    draft = collect();
  }
  const copyComponentState = document.getElementById('copy-component-state');
  copyComponentState.addEventListener('click', linkComponentStates);
  function syncPart(node, active = true) {
    const prefix = node.dataset.prefix;
    const materialSelect = form.elements.namedItem(`${prefix}material`);
    materialSelect.disabled = !active; materialSelect.required = active;
    const material = materialSelect.value;
    const partLabel = node.querySelector('[data-optional]');
    if (partLabel) {
      partLabel.disabled = !active;
      const index = Number(prefix.match(/^part(\d+)-/)?.[1] || 0);
      node.closest('.component-card').querySelector('h3').textContent = partLabel.value.trim() ? `부속품 ${index+1} · ${partLabel.value.trim().slice(0,40)}` : `부속품 ${index+1}`;
    }
    const options = TYPES[material] || [];
    const select = form.elements.namedItem(`${prefix}type`);
    if (select.dataset.material !== material) {
      select.innerHTML = '<option value="">세부 종류를 선택해 주세요</option>' + options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
      select.dataset.material = material;
    }
    toggle(node.querySelector('[data-condition="type"]'), active && options.length > 0);
    const componentSummary = node.querySelector('.component-material-summary');
    if (componentSummary) componentSummary.textContent = [material, options.find(([type])=>type===select.value)?.[1]].filter(Boolean).join(' · ') || '재질·종류 선택';
    toggle(node.querySelector('[data-condition="food"]'), active && material === '음식물류' && select.value === 'soft');
    const supported = active && supportsState(partValue(prefix));
    toggle(node.querySelector('[data-condition="state"]'), supported);
    const partName = prefix ? partLabel?.value.trim() || `부속품 ${Number(prefix.slice(4, -1)) + 1}` : '본체';
    node.querySelector('.current-state legend').textContent = `${partName} 상태는 어떤가요?`;
    const washable = needsWashQuestion(partValue(prefix));
    const stateRadios = [...node.querySelectorAll(`[name="${prefix}currentState"]`)];
    const current = selectedState(partValue(prefix), washable);
    stateRadios.forEach(control => {
      const available = supported && (control.value !== 'washed-dirty' || washable);
      control.disabled = !available; control.required = available;
      control.closest('label').hidden = !available;
      control.checked = available && control.value === current;
      if (control.value === 'dirty') control.nextElementSibling.textContent = washable ? '오염 있음 · 세척 전' : '오염이 있어요';
    });
    const dirty = supported && value(`${prefix}contaminated`) === 'yes';
    const vinyl = !prefix && dirty && material === '비닐' && select.value === 'packaging';
    const seoulVinyl = vinyl && judgementRegion.get()?.province === '서울특별시' && value('combined') !== 'yes';
    toggle(node.querySelector('[data-condition="vinyl-residue"]'), vinyl);
    toggle(node.querySelector('[data-condition="removable"]'), dirty && (!seoulVinyl || value('vinylResidue') === 'solids'));
    node.querySelectorAll('.state-storage input').forEach(control => { control.required = false; });
    node.querySelector('[data-condition="removable"] legend').textContent = material === '종이' && value(`${prefix}type`) === 'paper'
      ? `${partName}의 오염된 부분을 떼어내고 깨끗한 종이만 남길 수 있나요?` : `${partName}에 남은 오염을 헹구거나 닦아 제거할 수 있나요?`;
    if (!active) materialSelect.value = '';
  }
  function updateConditional() {
    const hasName = Boolean(nameInput.value.trim());
    const known = lookupItem(nameInput.value);
    const unregistered = hasName && !known?.material;
    const dedicated = Boolean(known?.handling && known.material === '기타');
    const category = form.elements.namedItem('category');
    const handling = known?.handling || category.value;
    if (handlingCondition.dataset.handling !== handling) {
      handlingCondition.dataset.handling = handling;
      const prompt = handlingConditionQuestion(handling);
      handlingCondition.hidden = !prompt;
      handlingCondition.innerHTML = prompt ? question('handlingCondition', `${prompt.title} <span class="input-hint">(선택)</span>`, prompt.options, { required: false }) : '';
    }
    document.getElementById('item-category-section').hidden = !unregistered;
    category.required = unregistered; category.disabled = !unregistered;
    const materialSelect = form.elements.namedItem('material');
    for (const option of materialSelect.options) {
      option.disabled = Boolean(option.value) && unregistered && !categoryAllowsMaterial(category.value, option.value);
      option.hidden = option.disabled;
    }
    if (unregistered && !categoryAllowsMaterial(category.value, materialSelect.value)) {
      materialSelect.value = category.value === 'food' ? '음식물류' : '';
    }
    // 자동 인식했거나 직접 고른 별도 수거 종류면 재질을 묻지 않고, 그 밖에는 재질·상태만 묻습니다.
    const needsMaterial = !dedicated && (!unregistered || ['packaging', 'food'].includes(category.value));
    const detected = keywordCategory();
    const categorySection = document.getElementById('item-category-section');
    if (!category.value && unregistered) categorySection.open = true;
    document.getElementById('item-category-summary').textContent = category.value && !['packaging', 'food'].includes(category.value)
      ? `물건 종류: ${categoryLabel(category.value)}${categoryOrigin === 'keyword' ? ' (이름으로 자동 인식)' : ''} · 바꾸기` : category.value ? `물건 종류: ${categoryLabel(category.value)} · 바꾸기` : '물건 종류 확인';
    document.getElementById('category-guidance').textContent = detected && category.value === detected.category ? `이름의 ‘${detected.keyword}’(으)로 자동으로 골랐어요. 다른 물건이면 종류를 바꿔 주세요.` : category.value && !needsMaterial ? '재질 선택 없이 종류별 수거 안내를 확인할 수 있어요.' : category.value ? '재질·세부 종류와 현재 상태를 확인해 주세요.' : '';
    document.getElementById('item-conditions').hidden = !hasName || !needsMaterial;
    updateAiBox(hasName);
    syncPart(form.querySelector('.part-fields'), hasName && needsMaterial);
    const supported = supportsState(partValue(''));
    // 부모에서 자식 순서로 갱신해 숨겨진 필수 질문을 비활성화합니다.
    document.getElementById('combination-section').hidden = !supported;
    toggle(document.getElementById('composition-editor'), supported);
    const combined = supported && value('combined') === 'yes';
    toggle(document.getElementById('separable-question'), combined);
    const components = combined && value('separable') === 'yes';
    describeInstead.hidden = !hasName || dedicated;
    if (unregistered && !category.value) document.getElementById('category-guidance').textContent = '종류를 아는 경우 위에서 골라 주세요. 포장재는 재질 표시를 고를 수 있고, 둘 다 모르면 물건 설명이나 사진으로 이어서 찾을 수 있어요.';
    if (isBatteryPackaging(nameInput.value) && category.value === 'packaging') {
      categorySection.open = true;
      document.getElementById('category-guidance').textContent = '전지를 빼고 남은 포장만 판별해요. 종이·플라스틱 등 실제 재질 표시를 확인해 주세요.';
    }
    copyComponentState.hidden = !components || !['clean', 'dirty', 'washed-dirty'].includes(value('currentState'));
    document.getElementById('composition-detected').textContent = value('combined') === 'no' ? '다른 재질 없음' : combined
      ? `다른 재질 있음 · ${value('separable') === 'yes' ? '분리 가능' : value('separable') === 'no' ? '분리 어려움' : '분리 가능 여부 확인'}` : '다른 재질이 붙어 있나요?';
    document.getElementById('components-section').hidden = !components;
    document.querySelectorAll('#component-fields .part-fields').forEach(node => {
      if (components) syncPart(node);
      else node.querySelectorAll('input, select').forEach(control => { control.disabled = true; });
    });
    document.getElementById('components-detected').textContent = componentSummaryText();
    const typeLabel = TYPES[value('material')]?.find(([type]) => type === value('type'))?.[1];
    form.querySelectorAll('[data-mark]').forEach(button => { const mark = markById(button.dataset.mark); button.setAttribute('aria-pressed', String(mark.material === value('material') && mark.type === value('type'))); });
    document.getElementById('material-detected').textContent = [value('material'), typeLabel].filter(Boolean).join(' · ') || '재질·종류를 선택해 주세요';
    document.getElementById('quick-condition').hidden = !hasName || !cleanSingleMaterialInput(collect())
      || ['yes', 'unknown'].includes(value('contaminated')) || ['yes', 'unknown'].includes(value('combined'));
    document.getElementById('combination-hint').hidden = !(value('material') === '종이' && value('type') === 'carton');
    document.getElementById('reset-item').hidden = !hasName;
  }
  function keywordCategory() { return !keywordCategoryEnabled || lookupItem(nameInput.value)?.material ? null : detectItemCategory(nameInput.value); }
  const routeLabels = { recyclable: '재활용 대상', general: '종량제봉투 배출', large: '대형폐기물', hazardous: '별도 수거·안전 처리', unknown: '판단 어려움' };
  const confidenceLabels = { high: '확신 높음', medium: '확신 보통', low: '확신 낮음' };
  const aiLine = guess => {
    const typeLabel = TYPES[guess.material]?.find(([type]) => type === guess.type)?.[1];
    return `${[guess.material, typeLabel].filter(Boolean).join(' · ')} · ${routeLabels[guess.route]}`;
  };
  // AI 의견은 이름별 참고 정보입니다. 사용자가 선택한 종류와 검토된 품목 경로를 우선합니다.
  // state가 있으면(결과 화면의 등록 품목) 입력한 상태까지 반영한 AI 의견을 따로 받습니다.
  const aiKey = (name, state = '') => `${normalizeItemName(name)}|${state}`;
  function askAi(name, state = '') {
    const key = aiKey(name, state);
    if (!aiEnabled || !normalizeItemName(name) || verifiedNameGuide(name)) return Promise.resolve();
    const existing = opinions.get(key);
    if (existing && existing.status !== 'error') {
      if (!state && existing.status === 'done' && existing.guess && !lookupItem(name) && nameInput.value.trim() === name) applyAiGuess(existing.guess);
      return existing.promise;
    }
    const known = Boolean(lookupItem(name));
    const entry = { status: 'loading', state };
    entry.promise = requestAiGuess(name, undefined, { opinion: known, state })
      .then(guess => {
        entry.status = 'done'; entry.guess = guess;
        if (!state && aiEnabled && !known && guess && form.isConnected && nameInput.value.trim() === name) applyAiGuess(guess);
      })
      .catch(error => { entry.status = 'error'; entry.error = error.message; })
      .finally(() => { if (form.isConnected) refreshAi(); });
    opinions.set(key, entry);
    refreshAi();
    return entry.promise;
  }
  // AI 의견이 사용자의 종류·재질 답변을 대신 선택하지 않습니다.
  function applyAiGuess(guess) {
    aiGuess = guess;
    draft = collect();
  }
  // AI가 꺼져 있을 때는 저장된 제안만 확인합니다.
  async function askShared(name) {
    if (verifiedNameGuide(name)) return;
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
  function suggestedCategory(guess) {
    if (!guess || (!aiEnabled && !guess.shared)) return '';
    if (guess.route === 'large') return 'large';
    if (guess.route === 'recyclable' && guess.type && categoryAllowsMaterial('packaging', guess.material) && guess.material !== '기타') return 'packaging';
    return '';
  }
  applyCategorySuggestion.addEventListener('click', () => {
    const guess = opinions.get(aiKey(nameInput.value))?.guess;
    const choice = suggestedCategory(guess);
    if (!choice || categorySuggestion.hidden || deleting) return;
    const category = form.elements.namedItem('category');
    category.value = choice;
    changed({ target: category });
    if (choice === 'packaging') {
      writeValues({ material: guess.material });
      updateConditional();
      writeValues({ type: guess.type });
      updateConditional();
    }
    document.getElementById('item-category-section').open = false;
    draft = collect();
    const firstState = form.querySelector('.current-state input:not(:disabled)');
    (firstState || form.querySelector('[type="submit"]')).focus();
  });
  function refreshAi() { updateAiBox(Boolean(nameInput.value.trim())); renderOpinion(); }
  function updateAiBox(hasName) {
    const name = nameInput.value.trim();
    const entry = opinions.get(aiKey(name));
    const verified = verifiedNameGuide(name);
    const category = form.elements.namedItem('category');
    const suggestion = !verified && !category.disabled && !category.value && suggestedCategory(entry?.guess);
    categorySuggestion.hidden = !suggestion;
    if (suggestion) {
      categorySuggestionText.textContent = `${entry.guess.shared ? '저장된 AI 제안' : 'AI 제안'} · ${suggestion === 'large' ? '가구·큰 생활용품' : aiLine(entry.guess)}`;
    }
    if (verified || suggestion) { aiBox.hidden = true; return; }
    // AI가 꺼져 있어도 공용 저장소에 있던 답은 보여 줍니다.
    aiBox.hidden = !hasName || Boolean(lookupItem(name)) || (!aiEnabled && !entry?.guess?.shared);
    if (aiBox.hidden) return;
    aiButton.hidden = entry?.status !== 'error';
    aiBox.classList.toggle('is-loading', !entry || entry.status === 'loading');
    if (!entry || entry.status === 'loading') { aiText.textContent = '🤖 AI에게 물어보고 있어요…'; aiStatus.textContent = ''; }
    else if (entry.status === 'error') { aiText.textContent = '🤖 AI 의견을 받지 못했어요'; aiStatus.textContent = entry.error; }
    else if (!entry.guess) { aiText.textContent = '🤖 AI가 분류하지 못했어요'; aiStatus.textContent = '물건 종류를 직접 골라 안내받을 수 있어요.'; }
    else {
      aiText.textContent = `${entry.guess.shared ? '💾 저장된 답' : '🤖 AI 의견'}: ${aiLine(entry.guess)} (${confidenceLabels[entry.guess.confidence]})`;
      if (entry.guess.shared && !aiEnabled) aiText.textContent += ' · 다른 사용자가 AI에게 물어본 결과예요';
      aiStatus.textContent = [entry.guess.reason, lookupItem(name) ? '등록된 기준 결과가 우선이에요.' : entry.guess.route === 'recyclable' ? '현재 상태를 골라 주세요.' : ''].filter(Boolean).join(' ');
    }
  }
  // 등록 품목은 상태도 보내고 미등록 품목의 의견은 이름만으로 생성합니다.
  function shownAiState() { return shownInput && lookupItem(shownInput.itemName) ? encodeAiState(shownInput) : ''; }
  function renderOpinion() {
    const panel = summary.querySelector('#ai-opinion');
    if (!panel || !shownInput) return;
    const name = shownInput.itemName;
    if (verifiedNameGuide(name)) { panel.closest('details').remove(); return; }
    const known = Boolean(lookupItem(name));
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
    if (name) askAi(name);
  });
  summary.addEventListener('click', event => {
    if (event.target.closest('[data-ai-retry]') && shownInput) askAi(shownInput.itemName, shownAiState());
    if (event.target.closest('[data-ai-report]') && shownInput) reportWrongAi(shownInput.itemName);
  });
  const aiSwitch = bindAiToggle(aiToggle, enabled => {
    aiEnabled = enabled;
    if (aiEnabled) { const name = nameInput.value.trim(); if (name && !lookupItem(name)) askAi(name); if (!summary.hidden && shownInput) { attachOpinionPanel(); askAi(shownInput.itemName, shownAiState()); } }
    else {
      clearTimeout(prefetchTimer); aiGuess = null;
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
    if (verifiedNameGuide(shownInput?.itemName)) return;
    if (summary.querySelector('#ai-opinion')) return;
    summary.querySelector('.result-evidence')?.insertAdjacentHTML('beforebegin', '<details class="result-evidence"><summary>AI 의견 보기</summary><section id="ai-opinion" class="ai-panel ai-opinion" aria-live="polite"></section></details>');
  }
  function collect() {
    const input = { itemName: nameInput.value.trim(), ...normalizePart(partValue('')), region: judgementRegion.get() };
    if (!lookupItem(input.itemName)?.material && value('category')) { input.category = value('category'); input.categoryOrigin = categoryOrigin || 'manual'; }
    if (!keywordCategoryEnabled) input.keywordCategory = false;
    if (value('handlingCondition')) input.handlingCondition = value('handlingCondition');
    if (supportsState(input)) {
      input.combined = value('combined');
      if (input.combined === 'yes') {
        input.separable = value('separable');
        if (input.separable === 'yes') input.components = Array.from({ length: componentCount }, (_, index) => normalizePart(partValue(`part${index}-`)));
      }
    }
    if (aiMatches(input.itemName)) input.aiGuess = structuredClone(aiGuess);
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
  function firstInvalidField() {
    return [...form.elements].find(control => control.willValidate && !control.validity.valid);
  }
  function focusNextCondition() {
    const target = firstInvalidField() || handlingCondition.querySelector('input') || form.querySelector('[type="submit"]');
    reveal(target);
    target.focus();
  }
  function validateConditions() {
    clearFieldError();
    const missingName = !nameInput.value.trim();
    const invalid = missingName ? nameInput : firstInvalidField();
    if (!invalid) return true;
    reveal(invalid);
    const group = invalid.closest('fieldset, .field') || invalid.parentElement;
    fieldError.textContent = missingName ? '물건 이름을 입력해 주세요.' : invalid.type === 'radio' ? '이 질문에 답해 주세요.' : '이 항목을 선택해 주세요.';
    group.append(fieldError);
    invalid.setAttribute('aria-invalid', 'true');
    invalid.setAttribute('aria-describedby', [invalid.getAttribute('aria-describedby'), fieldError.id].filter(Boolean).join(' '));
    invalidField = invalid;
    invalid.focus({ preventScroll: true });
    group.scrollIntoView({ block: 'center' });
    return false;
  }
  function showInput() {
    summary.hidden = true;
    form.hidden = false;
  }
  function restore(input) {
    clearFieldError();
    const editCategory = input.editCategory;
    keywordCategoryEnabled = input.keywordCategory !== false;
    input = prepareCategoryInput(input);
    categoryOrigin = input.categoryOrigin || '';
    document.getElementById('item-category-section').open = editCategory || !input.category;
    const region = Object.hasOwn(input, 'region') ? input.region : judgementRegion.get();
    closeSuggestions(); nameStatus.textContent = '';
    document.getElementById('preset-info').hidden = true;
    form.reset();
    form.querySelectorAll('.mark-picker[open]').forEach(picker => { picker.open = false; });
    componentCount = Math.max(1, input.components?.length || 0); drawComponents();
    judgementRegion.set(region);
    aiGuess = validateAiGuess(input.aiGuess, input.itemName);
    autoFill.checked = autoFillEnabled; aiSwitch.sync(aiEnabled);
    autoFillStatus.textContent = autoFillEnabled ? '자동 입력이 켜져 있어요. 물건 이름을 바꾸면 재질 정보를 다시 채워요.' : '체크하면 우유팩·생수병 등 알려진 물품의 재질 정보를 채워요.';
    // 재질→세부 종류→상태 순서로 선택지를 생성한 후 저장된 답변을 복원합니다.
    for (let pass = 0; pass < 3; pass++) {
      writeValues(input);
      (input.components || []).forEach((part, index) => writeValues(part, `part${index}-`));
      updateConditional();
    }
    form.querySelectorAll('.component-material-editor').forEach(editor => { const node=editor.closest('.part-fields'); editor.open=!value(`${node.dataset.prefix}material`) || Boolean(TYPES[value(`${node.dataset.prefix}material`)]?.length && !value(`${node.dataset.prefix}type`)); });
    if (autoFillEnabled && !input.material && !document.getElementById('item-conditions').hidden && suggestItemInfo(input.itemName)) applySuggestion();
    else materialEditor.open = !value('material') || Boolean(TYPES[value('material')]?.length && !value('type'));
    draft = collect();
    currentNameKey = normalizeItemName(nameInput.value);
    document.getElementById('composition-editor').open = !['no'].includes(value('combined')) && !(value('combined') === 'yes' && ['yes','no','unknown'].includes(value('separable')));
  }
  function showResult(input, result, createdAt, recordId = null) {
    closeSuggestions();
    disposeResultTools();
    shownInput = input; shownResult = resultForDisplay(input, result);
    const editingInput = inputForDisplay(input, result);
    shownRecordId = recordId;
    summary.innerHTML = resultMarkup(input, result, createdAt, { editRegion: true });
    if (!createdAt && (aiEnabled || shownResult.aiGuess || opinions.get(aiKey(input.itemName))?.guess?.shared)) { attachOpinionPanel(); renderOpinion(); if (!shownResult.aiGuess) askAi(input.itemName, shownAiState()); }
    summary.hidden = false; form.hidden = true;
    summary.focus({ preventScroll: true }); summary.scrollIntoView({ behavior: 'auto', block: 'start' });
    document.getElementById('category-other')?.addEventListener('click', () => {
      showInput(); restore({ ...editingInput, category: '', categoryOrigin: '', keywordCategory: false }); saveStatus.textContent = '';
      document.getElementById('item-category-section').open = true;
      form.elements.namedItem('category').focus();
    });
    document.getElementById('edit-item').addEventListener('click', () => {
      showInput(); restore(editingInput); saveStatus.textContent = '';
      const partIndex = shownResult.parts.findIndex(part => part.pendingCondition);
      const pending = shownResult.pendingCondition || shownResult.parts[partIndex]?.pendingCondition;
      const prefix = shownResult.pendingCondition || partIndex < 1 ? '' : `part${partIndex - 1}-`;
      const part = form.querySelector(`.part-fields[data-prefix="${prefix}"]`);
      const pendingField = ['combined', 'separable'].includes(pending) ? form.querySelector(`input[name="${pending}"]:not(:disabled)`)
        : pending === 'material' ? form.elements.namedItem(`${prefix}material`)
          : ['state', 'type', 'removable', 'vinyl-residue'].includes(pending) && part?.querySelector(`[data-condition="${pending}"] :is(input:not([type="hidden"]),select):not(:disabled)`);
      const target = pendingField || form.querySelector('.current-state input:checked:not(:disabled), #handling-condition input:checked') || form.querySelector('#handling-condition input') || form.elements.namedItem('category');
      if (target && !target.disabled) { reveal(target); target.focus(); }
      else { nameInput.focus(); closeSuggestions(); }
    });
    summary.querySelector('[data-edit-region]').addEventListener('click', () => {
      showInput(); restore(editingInput); saveStatus.textContent = '';
      judgementRegion.focus();
    });
    disposeResultTools = bindResultTools(summary, input, result, { onNewItem: resetInput });
  }
  function resetInput() {
    if (deleting) return;
    showInput(); restore({}); saveStatus.textContent = '';
    savedTools.open = false;
    nameInput.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start' });
  }
  document.getElementById('reset-item').addEventListener('click', resetInput);
  let favorites = [];
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
    document.getElementById('item-category-section').open = true;
    form.elements.namedItem('category').focus();
  } else if (queued?.itemName) focusNextCondition();
  savedTools.addEventListener('toggle', () => { if (savedTools.open) { renderRecent(); renderFavorites(); } });
  form.querySelectorAll('[data-item-example]').forEach(button => button.addEventListener('click', () => {
    if (deleting) return;
    nameInput.value = button.dataset.itemExample; changed({ target: nameInput }); closeSuggestions();
    focusNextCondition();
  }));
  document.getElementById('clean-shortcut').addEventListener('click', () => {
    if (deleting) return;
    const next = cleanSingleMaterialInput(collect()); if (!next) return;
    restore(next); form.requestSubmit();
  });
  function applySuggestion() {
    const suggestion = suggestItemInfo(nameInput.value);
    const preset = itemPresetInput(nameInput.value);
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
    document.getElementById('composition-editor').open = !preset.combined || (preset.combined === 'yes' && !preset.separable);
    autoFillStatus.textContent = suggestion
      ? '이름에 맞는 정보를 채웠어요. 실제 제품과 다르면 수정해 주세요.'
      : nameInput.value.trim() ? '자동 입력할 수 있는 이름이 아니에요. 실제 재질과 세부 종류를 직접 선택해 주세요.' : '물건 이름을 입력하면 알려진 품목의 재질 정보를 채워요.';
  }
  // 이름 칸을 벗어날 때 생기는 change는 입력 때 이미 처리한 값이면 건너뜁니다.
  // (다시 처리하면 AI·저장된 답으로 골라 둔 종류와 답한 상태가 지워져 판별 버튼이 막혔습니다.)
  let handledName = null;
  function changed(event) {
    if (event.isComposing) return;
    if (event.target.name === 'judgementDistrict' && event.target.type === 'text' && event.type === 'input') return;
    const textField = event.target.type === 'text' && event.target.name !== 'judgementDistrict';
    if ((event.type === 'change' && textField) || (event.type === 'input' && !textField)) return;
    clearFieldError();
    const changedName = event.target === nameInput && currentNameKey !== normalizeItemName(nameInput.value);
    if (event.target === nameInput && !changedName) { draft.itemName = nameInput.value.trim(); return; }
    // 사전에 없는 이름이면 이름 속 낱말로 물건 종류를 자동으로 골라 둡니다. 사용자가 바꿀 수 있습니다.
    if (changedName) {
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
    if (event.target.name === 'category') {
      categoryOrigin = 'manual'; keywordCategoryEnabled = false;
      form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
      componentCount = 1; drawComponents();
      form.elements.namedItem('material').value = event.target.value === 'food' ? '음식물류' : '';
      form.elements.namedItem('type').value = '';
      materialEditor.open = true;
    }
    if (event.target.name?.endsWith('currentState')) {
      const prefix = event.target.closest('.part-fields').dataset.prefix;
      writeValues(stateAnswers(event.target.value, needsWashQuestion(partValue(prefix))), prefix);
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
    if (event.target === nameInput) scheduleAiPrefetch();
    draft = collect(); showInput();
  }
  // AI가 켜져 있으면 이름을 0.7초 동안 그대로 둘 때 자동으로 AI 의견을 물어봅니다.
  let prefetchTimer = 0;
  function scheduleAiPrefetch() {
    clearTimeout(prefetchTimer);
    const name = nameInput.value.trim();
    if (!name || lookupItem(name) || verifiedNameGuide(name) || (!aiEnabled && keywordCategory())) return;
    // 저장된 답 조회는 가벼워서 0.3초, AI는 0.7초 기다린 뒤 묻습니다.
    prefetchTimer = setTimeout(() => {
      if (form.isConnected && nameInput.value.trim() === name) { if (aiEnabled) askAi(name); else askShared(name); }
    }, aiEnabled ? 700 : 300);
  }
  // 분리배출 표시 버튼: 재질·세부 종류를 채우고 상태 질문으로 이어집니다.
  form.addEventListener('click', event => {
    const mark = markById(event.target.closest('[data-mark]')?.dataset.mark);
    if (!mark || deleting) return;
    // 분리배출 표시가 있는 미등록 물건은 '포장재·용기'로 보고 재질을 채웁니다.
    const category = form.elements.namedItem('category');
    if (!document.getElementById('item-category-section').hidden && category.value !== 'packaging') { category.value = 'packaging'; changed({ target: category }); }
    clearFieldError();
    event.target.closest('.mark-picker').open = false;
    document.getElementById('item-category-section').open = false;
    form.querySelectorAll('input[type="radio"]').forEach(control => { control.checked = false; });
    for (let pass = 0; pass < 3; pass++) { writeValues({ material: mark.material, type: mark.type }); updateConditional(); }
    draft = collect(); showInput();
    materialEditor.open = false;
    const firstState = form.querySelector('.current-state input:not(:disabled)');
    (firstState || form.querySelector('[type="submit"]')).focus();
  });
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  document.getElementById('add-component').addEventListener('click', () => {
    const parts = collect().components;
    if (!parts || componentCount >= 5) return;
    replaceComponents([...parts, {}]);
    document.getElementById('components-details').open = true;
    form.elements.namedItem(`part${componentCount - 1}-material`).focus();
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
      if (request.all || shownRecordId === request.record?.id) { showInput(); shownRecordId = null; }
      pendingDeletion = null; deleteConfirm.hidden = true;
      if (await renderRecent()) historyStatus.textContent = request.all ? '최근 분리배출 목록을 모두 삭제했어요.' : '선택한 기록을 삭제했어요.';
      document.getElementById('clear-history')?.focus();
    } catch (error) { if (form.isConnected) historyStatus.textContent = error.message; }
    finally { deleting = false; buttons.forEach(button => { button.disabled = false; }); }
  });
  async function persistResult(input, result) {
    const recordStatus = summary.querySelector('[data-record-save-status]');
    const current = () => form.isConnected && !summary.hidden && shownInput === input;
    pendingWrites++;
    recordStatus.textContent = '결과를 기록에 저장하는 중이에요…';
    try {
      const record = await saveDisposalRecord(input, result);
      if (current()) {
        shownRecordId = record.id;
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
    if (!judgementRegion.validate()) return;
    updateConditional();
    if (!validateConditions()) return;
    pendingDeletion = null;
    deleteConfirm.hidden = true;
    try {
      saveStatus.textContent = '';
      draft = collect();
      const input = structuredClone(draft);
      const result = judgeDisposal(input);
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
  if (nameInput.value.trim()) scheduleAiPrefetch();
  return () => { disposeModeSelect(); aiSwitch.dispose(); recentVersion++; favoriteVersion++; clearTimeout(prefetchTimer); autocomplete.dispose(); disposeResultTools(); window.removeEventListener('favorites-changed', renderFavorites); window.removeEventListener('storage', storageChanged); window.removeEventListener('focus', windowFocused); };
}
