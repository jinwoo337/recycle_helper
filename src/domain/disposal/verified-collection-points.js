import { REGIONAL_SOURCES } from './regions.js';

// Both the collection list and the city directory must list the same address.
// The directory coordinates mark the host facility, not the position inside it.
const gwangjuCenters = [
  ['초월읍', '초월읍 경충대로 1241', 37.385245, 127.287943],
  ['곤지암읍', '곤지암읍 광여로 59', 37.350957, 127.352356],
  ['도척면', '도척면 노곡로 20', 37.304671, 127.331271],
  ['퇴촌면', '퇴촌면 탑골길 6', 37.466664, 127.307024],
  ['남종면', '남종면 분원길 9', 37.494330, 127.301944],
  ['남한산성면', '남한산성면 남한산성로 2', 37.463382, 127.244281],
  ['오포1동', '오포로859번길 29', 37.366159, 127.228585],
  ['오포2동', '양벌로215번길 7', 37.377633, 127.254615],
  ['능평동', '창뜰아랫길 6', 37.349565, 127.167458],
  ['경안동', '중앙로 125', 37.410872, 127.257281],
  ['쌍령동', '경충대로1461번길 26', 37.399831, 127.270217],
  ['탄벌동', '탄벌길 6', 37.419681, 127.246108],
  ['광남2동', '태봉로 45', 37.389036, 127.229800],
];

const gwangjuIcePacks = {
  title: '경기 광주시 젤 아이스팩 전용 수거함',
  accepts: '깨끗하고 터지지 않은 젤 아이스팩',
  hours: '센터 내 순환자원 교환창구는 평일 09:00–18:00예요. 수거함 이용 시간과 건물 내 위치는 방문할 센터에 확인해 주세요.',
  source: REGIONAL_SOURCES.gyeonggiGwangjuIcePack,
  directory: 'https://www.gjcity.go.kr/portal/contents.do?mId=0801050300',
  checkedAt: '2026-11-14',
  points: gwangjuCenters.map(([name, address, latitude, longitude]) => ({
    name: `${name} 행정복지센터`, address: `경기도 광주시 ${address}`, latitude, longitude,
  })),
};

export function verifiedCollectionPoints(result) {
  return result?.regional?.comparisonKey === 'ice-pack:gyeonggi-gwangju-reuse' ? gwangjuIcePacks : null;
}

export function rankCollectionPoints(points, { latitude, longitude }) {
  const rad = Math.PI / 180;
  const origin = latitude * rad;
  return points.map(point => {
    const north = Math.sin((point.latitude - latitude) * rad / 2);
    const east = Math.sin((point.longitude - longitude) * rad / 2);
    const arc = north ** 2 + Math.cos(origin) * Math.cos(point.latitude * rad) * east ** 2;
    return { ...point, distanceKm: 12742 * Math.asin(Math.min(1, Math.sqrt(arc))) };
  }).sort((left, right) => left.distanceKm - right.distanceKm);
}
