import { REGIONAL_SOURCES } from './regions.js';
import { MEDICINE_SOURCES } from './medicine-guide.js';

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
  directoryLabel: '센터별 연락처',
  checkedAt: '2026-11-14',
  points: gwangjuCenters.map(([name, address, latitude, longitude]) => ({
    name: `${name} 행정복지센터`, address: `경기도 광주시 ${address}`, latitude, longitude,
  })),
};

const guriMedicine = {
  title: '구리시 폐의약품 공공 수거함',
  accepts: '가정에서 나온 폐의약품',
  hours: '포장 처리 방법, 접수 가능 품목과 이용 시간은 방문할 시설에 문의해 주세요.',
  source: MEDICINE_SOURCES.guri,
  directory: 'https://www.data.go.kr/data/15074686/fileData.do',
  directoryLabel: '공공데이터 원본',
  checkedAt: '2026-11-14',
  dataDate: '2026-03-13',
  points: [
    ['구리시보건소', '건원대로34번길 84', 37.604776, 127.145194, '031-550-8987'],
    ['수택건강생활지원센터', '체육관로 74', 37.591528, 127.138620, '031-550-2464'],
    ['갈매건강생활지원센터', '갈매중앙로 80 3층', 37.631447, 127.116999, '031-550-8419'],
  ].map(([name, address, latitude, longitude, phone]) => ({
    name, address: `경기도 구리시 ${address}`, latitude, longitude, phone,
  })),
};

const seongnamMedicine = {
  title: '성남시 폐의약품 수거함',
  accepts: '가정에서 나온 폐의약품',
  hours: '행정복지센터 민원실 입구 등의 수거함을 이용해 주세요. 방문 전 센터 이용 시간을 확인해 주세요.',
  source: MEDICINE_SOURCES.seongnam,
  directory: 'https://www.seongnam.go.kr/ct-pm080303',
  directoryLabel: '성남시 시설 주소',
  checkedAt: '2026-11-14',
  dataDate: '2026-08-25',
  note: '공식 설치 대상 중 시설 주소와 좌표를 대조한 곳이에요. 상대원2동·이매1동·야탑3동·금곡동은 해당 설치 사업에서 제외됐어요.',
  points: [
    ['수내1동', '내정로173번길 21', 37.375439, 127.118087],
    ['수내3동', '돌마로356번길 43', 37.366816, 127.123939],
    ['야탑1동', '장미로86번길 18', 37.412005, 127.128048],
    ['판교동', '서판교로32번길 9', 37.389838, 127.098599],
  ].map(([name, address, latitude, longitude]) => ({
    name: `${name} 행정복지센터`, address: `경기도 성남시 분당구 ${address}`, latitude, longitude,
  })),
};

const yuseongMedicine = {
  title: '유성구 폐의약품 공공 수거함',
  accepts: '가정에서 나온 폐의약품',
  hours: '시설별 운영시간과 수거함 위치는 방문 전에 확인해 주세요.',
  source: MEDICINE_SOURCES.yuseong,
  directory: 'https://lib.yuseong.go.kr/web/menu/10005/program/30002/libraryMap.do',
  directoryLabel: '유성구 도서관 위치',
  moreDirectories: [
    ['유성구청 위치', 'https://www.yuseong.go.kr/apartment/sub01_03.do'],
    ['유성구보건소 위치', 'https://www.yuseong.go.kr/health/sub01_06.do'],
  ],
  checkedAt: '2026-11-14',
  note: '구청 안내 중 주소와 시설 좌표를 대조한 곳이에요. 가까운 동 행정복지센터와 구청이 안내한 보건지소의 수거함도 이용할 수 있어요.',
  points: [
    ['유성구청 본관 1층 민원실', '대학로 211', 36.362280, 127.356258, '042-611-2114'],
    ['유성구보건소', '박산로 177', 36.353917, 127.328637, '042-611-5000'],
    ['노은도서관', '노은동로234번길 34', 36.381493, 127.320654, '042-611-6610'],
    ['유성도서관', '대덕대로 507-38', 36.378423, 127.375913, '042-611-6530'],
    ['진잠도서관', '진잠로160번길 19', 36.303157, 127.319767, '042-611-6590'],
    ['구즉도서관', '와룡로37번길 20', 36.429471, 127.380447, '042-611-6510'],
    ['원신흥도서관', '원신흥남로 59', 36.337716, 127.337486, '042-611-6970'],
  ].map(([name, address, latitude, longitude, phone]) => ({
    name, address: `대전광역시 유성구 ${address}`, latitude, longitude, phone,
  })),
};

export function verifiedCollectionPoints(result) {
  const key = result?.regional?.comparisonKey;
  if (key === 'ice-pack:gyeonggi-gwangju-reuse') return gwangjuIcePacks;
  if (key === 'medicine:guri') return guriMedicine;
  if (key === 'medicine:seongnam') return seongnamMedicine;
  if (key === 'medicine:yuseong') return yuseongMedicine;
  return null;
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
