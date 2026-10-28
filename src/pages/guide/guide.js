import { queueInput } from '../../services/input-draft.js';
import { escapeHtml } from '../../utils/html.js';
import { RULE_SOURCE } from '../../domain/disposal/rules.js';
import { SEOUL_SOURCES } from '../../domain/disposal/seoul-guides.js';
import { GUIDE_SECTIONS } from '../../utils/routes.js';

const categories = [
  { id: 'pet', icon: '🧴', title: '투명 페트병', examples: '무색 생수병·음료병', steps: ['내용물을 비우고 이물질을 헹궈요.', '라벨을 떼고 병을 압착해요.', '뚜껑을 닫고 투명 페트병끼리 모아요.'], note: '유색 병·세제 병·식용유 병은 일반 플라스틱과 구분을 확인해요.', item: '투명생수병' },
  { id: 'plastic', icon: '🥡', title: '플라스틱', examples: '용기·트레이·플라스틱 컵', steps: ['남은 내용물과 음식물을 비워요.', '헹구거나 닦아 이물질을 제거해요.', '다른 재질의 뚜껑·부속품을 분리해요.'], note: '칫솔·복합제품은 일반 포장 용기와 처리법이 달라요.', item: '플라스틱용기' },
  { id: 'paper', icon: '📦', title: '종이·상자', examples: '택배 상자·신문·책', steps: ['테이프·운송장·스프링을 제거해요.', '상자를 펴고 종이끼리 모아요.', '비나 물에 젖지 않게 배출해요.'], note: '일반 종이는 물로 씻지 않아요. 영수증·코팅 종이는 따로 확인해요.', item: '종이상자' },
  { id: 'carton', icon: '🥛', title: '종이팩', examples: '우유팩·두유팩·주스팩', steps: ['내용물을 비우고 물로 헹궈요.', '빨대·플라스틱 마개를 분리해요.', '말려서 일반 종이와 따로 모아요.'], note: '전용 수거함이 없으면 지역 안내를 확인해요. 팩의 내부 코팅은 떼지 않아요.', item: '우유팩' },
  { id: 'glass', icon: '🍶', title: '유리병', examples: '깨지지 않은 음료·식품 병', steps: ['내용물을 비우고 이물질을 제거해요.', '다른 재질의 뚜껑을 분리해요.', '병이 깨지지 않게 모아 배출해요.'], note: '깨진 유리·내열유리·거울·도자기는 유리병 수거함에 넣지 않아요.', item: '유리병' },
  { id: 'can', icon: '🥫', title: '금속·캔', examples: '음료캔·통조림캔', steps: ['남은 내용물을 비워요.', '이물질과 다른 재질 부속품을 제거해요.', '날카로운 가장자리에 주의해 모아요.'], note: '부탄가스·스프레이·페인트 용기는 전용 안전 안내를 확인해요.', item: '음료캔' },
  { id: 'vinyl', icon: '🛍️', title: '비닐', examples: '과자봉지·비닐 포장재', steps: ['내용물과 부스러기를 비워요.', '소스 등 고형물을 제거해요.', '비닐끼리 봉투에 모아 흩날리지 않게 해요.'], note: '서울은 기름·물 자국이 남은 비닐도 수거 안내가 있어요. 지역별 결과를 확인해요.', item: '과자봉지' },
  { id: 'foam', icon: '🧊', title: '스티로폼', examples: '포장 상자·완충재', steps: ['내용물을 비우고 오염을 제거해요.', '테이프·운송장·상표를 떼어요.', '물기를 말리고 따로 모아요.'], note: '유색·건축용·코팅 제품과 과일 포장망은 추가 확인이 필요해요.', item: '스티로폼상자' },
];

// 자주 헷갈리는 물건 Q&A. 답은 등록 품목의 판별 기준과 같고, 버튼을 누르면 그 물건의 결과로 이어집니다.
const faq = [
  ['영수증은 종이로 버리면 되나요?', '아니요. 감열 영수증은 종이 재활용이 어려워 종량제봉투로 버려요.', '감열영수증'],
  ['깨진 유리는 유리병 수거함에 넣나요?', '아니요. 다치지 않게 신문지 등에 싸서, 지역 기준(종량제봉투·특수규격마대 등)에 맞춰 버려요.', '깨진유리'],
  ['칫솔은 플라스틱 아닌가요?', '여러 재질이 섞인 작은 제품이라 플라스틱 용기처럼 재활용하기 어려워요. 지역 안내를 확인해 주세요.', '칫솔'],
  ['치킨 뼈는 음식물 쓰레기인가요?', '아니요. 단단한 뼈는 음식물 수거 대상이 아니에요. 지역 일반 쓰레기 기준(보통 종량제봉투)으로 버려요.', '닭뼈'],
  ['달걀 껍데기는요?', '달걀 껍데기도 음식물 수거 대상이 아니에요. 지역 일반 쓰레기 기준(보통 종량제봉투)으로 버려요.', '달걀껍데기'],
  ['양파 겉껍질은 음식물인가요?', '말라서 질긴 겉껍질은 음식물 수거에서 빼요. 지역 기준(보통 종량제봉투)으로 버려요.', '마른양파껍질'],
];
function faqSection() {
  return `<section class="guide-faq" aria-labelledby="guide-faq-title"><h2 id="guide-faq-title">자주 헷갈리는 물건</h2>${faq.map(([question, answer, item]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p><button type="button" class="history-action" data-guide-item="${escapeHtml(item)}">‘${escapeHtml(item)}’ 자세히 보기 →</button></details>`).join('')}</section>`;
}

export function guidePage() {
  return `<section class="container disposal-guide-page"><a class="back-link" href="#/">← 홈으로</a>
    <header class="guide-heading"><p class="eyebrow">하나씩, 제대로</p><h1>분리배출, 이렇게 해요</h1><p>버리기 전 준비부터 재질별 배출까지.<br>내 물건에 맞는 방법을 쉽게 살펴보세요.</p><a href="#/item-input" class="button primary">내 물건 배출 방법 찾기 →</a></header>
    <section class="guide-basics" aria-labelledby="guide-basics-title"><h2 id="guide-basics-title">먼저 기억할 네 가지</h2><ol class="guide-steps">${[['01', '비우기', '남은 내용물을 비워요.'], ['02', '이물질 제거', '용기는 헹구고, 종이는 젖지 않게 해요.'], ['03', '다른 재질 분리', '라벨·테이프·부속품을 확인해요.'], ['04', '품목별로 모으기', '종류별 수거함·봉투로 배출해요.']].map(([number, title, text]) => `<li><span>${number}</span><strong>${title}</strong><p>${text}</p></li>`).join('')}</ol></section>
    <section aria-labelledby="guide-materials-title"><div class="guide-section-heading"><h2 id="guide-materials-title">무엇을 버리시나요?</h2><p>재질을 누르면 해당 안내로 이동해요.</p></div><nav class="guide-category-nav" aria-label="재질별 안내">${categories.map(card => `<a href="#/guide?material=${card.id}" data-guide-anchor="guide-${card.id}">${card.title}</a>`).join('')}</nav>
      <div class="guide-material-grid">${categories.map(card => `<article id="guide-${card.id}" class="guide-material-card" tabindex="-1"><div class="guide-card-heading"><span aria-hidden="true">${card.icon}</span><div><h3>${card.title}</h3><p>${card.examples}</p></div></div><ol>${card.steps.map(step => `<li>${step}</li>`).join('')}</ol><p class="guide-card-note">${card.note}</p><button type="button" class="guide-item-link" data-guide-item="${escapeHtml(card.item)}">이 물건 상태에 맞춰 확인하기 →</button></article>`).join('')}</div></section>
    <section class="guide-special" aria-labelledby="guide-special-title"><h2 id="guide-special-title">재질보다 수거 방법을 먼저 확인해요</h2><div><article><h3>💊 남은 약</h3><p>일반 쓰레기·하수구에 버리지 말고 폐의약품 수거처를 확인해요.</p><button type="button" class="guide-item-link" data-guide-item="약">폐의약품 안내 →</button></article><article><h3>🔋 건전지·전자제품</h3><p>일반 재활용품에 섞지 않고 전용 수거 경로를 이용해요.</p><button type="button" class="guide-item-link" data-guide-item="건전지">건전지 안내 →</button></article><article><h3>🍎 음식물</h3><p>포장·뼈·딱딱한 껍데기를 구분하고 물기를 줄여요.</p><button type="button" class="guide-item-link" data-guide-item="사과껍질">음식물 안내 →</button></article></div></section>
    ${faqSection()}
    <aside class="guide-region-note"><strong>서울 25개 구 · 대전 5개 구를 안내해요</strong><p>검색 화면에서 내 지역을 선택해 주세요. 결과에 ‘다른 지역은 어떨까?’가 보이면 지역별로 달라지는 방법을 비교할 수 있어요.</p><p class="input-hint">서울은 시 공통 안내와 확인된 구별 자료를 사용해요. 실제 수거 요일·시간·장소는 구청이나 관리사무소 안내를 확인해 주세요.</p></aside>
    <details class="guide-sources"><summary>안내의 근거와 확인일</summary><p class="input-hint">확인일 2026-10-27 · 기본 준비 방법이며, 실제 물품·오염·수거 여건에 따른 결과는 물품 검색에서 확인해 주세요.</p><a href="${RULE_SOURCE}" target="_blank" rel="noopener noreferrer">분리배출 지침 ↗</a> · <a href="${SEOUL_SOURCES.recycle}" target="_blank" rel="noopener noreferrer">서울시 분리배출 안내 ↗</a> · <a href="${SEOUL_SOURCES.vinyl}" target="_blank" rel="noopener noreferrer">서울시 폐비닐 안내 ↗</a></details></section>`;
}
export function bindGuide() {
  document.querySelectorAll('[data-guide-item]').forEach(button => button.addEventListener('click', () => {
    queueInput({ itemName: button.dataset.guideItem }); location.hash = '/item-input';
  }));
  document.querySelectorAll('[data-guide-anchor]').forEach(link => link.addEventListener('click', () => {
    if (link.hash === location.hash) focusGuideSection(link.dataset.guideAnchor.replace('guide-', ''));
  }));
}
export function focusGuideSection(section) {
  if (!GUIDE_SECTIONS.includes(section)) return;
  const card = document.getElementById(`guide-${section}`);
  card?.focus({ preventScroll: true }); card?.scrollIntoView({ block: 'start', behavior: 'auto' });
}
