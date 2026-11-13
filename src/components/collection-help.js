import { escapeHtml } from '../utils/html.js';
import { collectionPointHelp } from '../domain/disposal/collection-points.js';
import { MEDICINE_SOURCES } from '../domain/disposal/medicine-guide.js';

// 결과 화면(이름 찾기·설명·사진 모두)에 붙는 "가까운 수거처 찾기" 영역입니다.
export function collectionPointMarkup(result, { official = true } = {}) {
  const help = collectionPointHelp(result);
  if (!help) return '';
  const link = (url, text, extra = '') => `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${extra}>${text}</a>`;
  const officialMedicine = result.handling === 'medicine' && result.regional?.coverage === 'verified'
    && result.regional.sources.find(url => Object.values(MEDICINE_SOURCES).includes(url));
  const heading = help.inquiryOnly ? '배출 방법 문의할 곳' : `${escapeHtml(help.name)} 수거처 확인`;
  return `<section class="collection-help" aria-labelledby="collection-title"><h3 id="collection-title">${heading}</h3>
    <p class="input-hint">${escapeHtml(help.note)}</p>
    ${!help.inquiryOnly ? '<p><a class="history-action" href="https://www.wasteguide.or.kr/front/region/location.do" target="_blank" rel="noopener noreferrer">공식 분리배출 장소 지도 ↗</a></p>' : ''}
    ${official && officialMedicine ? `<div class="collection-links">${link(officialMedicine, '공식 폐의약품 수거처·접수 안내 ↗')}</div>` : ''}
    ${help.pickup ? `<div class="collection-links">${link(help.pickup.url, `${escapeHtml(help.pickup.label)} ↗`)}</div>` : ''}
    <div class="collection-links" role="group" aria-label="내 위치 주변 검색">${help.targets.map(target => link(target.mapUrl, `내 주변 ${escapeHtml(target.label)} ↗`, ` data-collection-target="${escapeHtml(target.search)}"`)).join('')}</div>
    <p class="input-hint">Google 지도에 위치 사용을 허용하면 현재 위치 주변을 찾아요. ${help.place ? '위치를 사용할 수 없으면 아래에서 판별 지역으로 찾을 수 있어요.' : '위치를 사용할 수 없으면 지도 검색에 동네 이름을 함께 입력해 주세요.'} ${escapeHtml(help.hours)}</p>
    ${help.place ? `<details class="collection-region-search"><summary>판별 지역(${escapeHtml(help.place)})에서 찾기</summary><div class="collection-links">${help.targets.map(target => link(target.regionMapUrl, `${escapeHtml(target.label)} ↗`)).join('')}</div></details>` : ''}
    </section>`;
}
