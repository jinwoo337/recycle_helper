import { escapeHtml } from '../utils/html.js';
import { isYuseong, YUSEONG_WASTE_GUIDE, DAEJEON_GUIDES } from '../domain/disposal/daejeon-guides.js';
import { yuseongRecyclingDays } from '../domain/disposal/yuseong-recycling-days.js';
import { readYuseongNeighborhood } from '../services/yuseong-neighborhood.js';
import { metroDistrict } from '../domain/disposal/metro-guides.js';
import { cityGuide } from '../domain/disposal/city-guides.js';
import { DISTRICT_HOMEPAGES } from '../domain/disposal/district-homepages.js';
import { regionLabel } from '../domain/disposal/regions.js';

export function homeCollectionDaysMarkup(region, member, choice = readYuseongNeighborhood(member)) {
  if (!region) return '<p>홈 상단에서 지역을 선택하면 배출 요일을 확인할 수 있어요.</p><button type="button" class="history-action" data-schedule-choose>지역 선택하기</button>';
  if (!isYuseong(region)) {
    const metro = metroDistrict(region);
    const city = cityGuide(region);
    const guide = (region.province === '대전광역시' && DAEJEON_GUIDES[region.district]?.recycle) || metro?.recycle || city?.recycle;
    const url = guide || metro?.home || city?.home || DISTRICT_HOMEPAGES[region.province]?.[region.district] || 'https://www.laiis.go.kr/lips/mlo/lcl/representationList.do';
    return `<p><strong>${escapeHtml(regionLabel(region))}</strong>의 배출 요일은 관할 지자체에서 확인해 주세요.</p><a class="history-action" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${guide ? '지역 배출 안내' : '지자체 누리집'} 열기 ↗</a>`;
  }
  const { days, areas } = yuseongRecyclingDays(choice.neighborhood, choice.area);
  return `<p><strong>유성구${choice.neighborhood ? ` ${escapeHtml(choice.neighborhood)}${choice.area ? ` (${escapeHtml(choice.area)})` : ''}` : ''}</strong> · 일반·음식물 일~목 저녁 6시~자정</p>
    <p data-home-recycling-days>${days ? `재활용품 ${escapeHtml(days)}요일 저녁` : areas.length ? '행정동을 선택하면 재활용품 요일을 볼 수 있어요.' : '법정동을 선택하면 재활용품 요일을 볼 수 있어요.'}</p>
    <div class="home-schedule-links"><a class="history-action" href="#/profile">동 설정</a><a class="history-action" href="${YUSEONG_WASTE_GUIDE}" target="_blank" rel="noopener noreferrer">유성구청 일정표 ↗</a></div>
    <p class="input-hint">공휴일과 자체 수거 공동주택은 별도 일정을 확인해 주세요.</p>`;
}

export function bindHomeCollectionDays(root, getRegion, member, openRegion) {
  function render() { root.innerHTML = homeCollectionDaysMarkup(getRegion(), member); }
  root.addEventListener('click', event => { if (event.target.closest('[data-schedule-choose]')) openRegion(); });
  render();
  return render;
}
