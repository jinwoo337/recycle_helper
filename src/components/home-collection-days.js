import { escapeHtml } from '../utils/html.js';
import { isYuseong, YUSEONG_WASTE_GUIDE, DAEJEON_GUIDES } from '../domain/disposal/daejeon-guides.js';
import { yuseongNeighborhoods, yuseongRecyclingDays } from '../domain/disposal/yuseong-recycling-days.js';
import { readYuseongNeighborhood, rememberYuseongNeighborhood } from '../services/yuseong-neighborhood.js';
import { metroDistrict } from '../domain/disposal/metro-guides.js';
import { cityGuide } from '../domain/disposal/city-guides.js';
import { DISTRICT_HOMEPAGES } from '../domain/disposal/district-homepages.js';
import { regionLabel } from '../domain/disposal/regions.js';

const options = (values, selected) => values.map(value => `<option${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');

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
  return `<p><strong>대전광역시 유성구</strong></p>
    <p>일반쓰레기·음식물쓰레기 <strong>일~목요일 저녁 6시~자정</strong><br><small>가급적 저녁 8시 이전 배출</small></p>
    <div class="disposal-schedule-selects"><label>법정동 <select data-home-neighborhood><option value="">동 선택</option>${options(yuseongNeighborhoods, choice.neighborhood)}</select></label>
    <label ${areas.length ? '' : 'hidden'}>행정동 <select data-home-area><option value="">행정동 선택</option>${options(areas, choice.area)}</select></label></div>
    <p data-home-recycling-days role="status">${days ? `재활용품 ${escapeHtml(days)}요일 저녁 배출` : areas.length ? '재활용품 요일을 확인하려면 행정동을 선택해 주세요.' : '재활용품 배출 요일은 법정동을 선택해 주세요.'}</p>
    <p class="input-hint">공휴일은 구청 공지를 확인해 주세요. 자체 수거 공동주택은 단지 일정을 따라 주세요.</p>
    <a class="history-action" href="${YUSEONG_WASTE_GUIDE}" target="_blank" rel="noopener noreferrer">유성구청 배출 일정표 ↗</a>`;
}

export function bindHomeCollectionDays(root, getRegion, member, openRegion) {
  let choice = readYuseongNeighborhood(member);
  function render() { root.innerHTML = homeCollectionDaysMarkup(getRegion(), member, choice); }
  root.addEventListener('click', event => { if (event.target.closest('[data-schedule-choose]')) openRegion(); });
  root.addEventListener('change', event => {
    if (!event.target.matches('[data-home-neighborhood], [data-home-area]')) return;
    const neighborhood = root.querySelector('[data-home-neighborhood]').value;
    const area = event.target.matches('[data-home-area]') ? event.target.value : '';
    choice = { neighborhood, area };
    rememberYuseongNeighborhood(member, choice);
    render();
    root.querySelector(event.target.matches('[data-home-area]') ? '[data-home-area]' : '[data-home-neighborhood]')?.focus();
  });
  render();
  return render;
}
