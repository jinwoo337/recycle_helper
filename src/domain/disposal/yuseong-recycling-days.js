// 유성구 생활쓰레기 배출 안내의 배출요일 열. 같은 행정동·법정동의 중복은 한 번만 기록합니다.
const rows = [
  ['진잠동', '교촌동 대정동 원내동', '일·수'],
  ['진잠동', '용계동', '화·금'],
  ['진잠동', '방동 성북동 세동 송정동', '금'],
  ['학하동', '학하동 계산동 덕명동 복용동', '화·금'],
  ['원신흥동', '봉명동', '월·목'],
  ['원신흥동', '원신흥동', '일·수'],
  ['상대동', '상대동', '월·목'],
  ['상대동', '복용동', '화·금'],
  ['온천1동', '구암동 봉명동', '월·목'],
  ['온천2동', '장대동', '일·수'],
  ['온천2동', '궁동 죽동', '월·목'],
  ['온천2동', '구성동 어은동', '화·금'],
  ['노은1동', '노은동 지족동', '일·수'],
  ['노은1동', '갑동 죽동', '월·목'],
  ['노은2동', '지족동', '일·수'],
  ['노은2동', '반석동 하기동', '화·금'],
  ['노은2동', '죽동', '월·목'],
  ['노은2동', '수남동 안산동 외삼동', '금'],
  ['노은3동', '반석동', '화·금'],
  ['노은3동', '지족동', '일·수'],
  ['신성동', '가정동 도룡동 신성동', '일·수'],
  ['신성동', '자운동 하기동 화암동 방현동 신봉동 추목동 덕진동 장동', '수'],
  ['전민동', '문지동 원촌동 전민동', '월·목'],
  ['구즉동', '봉산동 송강동', '화·금'],
  ['구즉동', '대동 구룡동 금고동 금탄동 둔곡동 신동', '금'],
  ['관평동', '관평동 용산동 탑립동', '화·금'],
];
const schedules = new Map();
for (const [area, neighborhoods, days] of rows) {
  for (const neighborhood of neighborhoods.split(' ')) {
    if (!schedules.has(neighborhood)) schedules.set(neighborhood, []);
    schedules.get(neighborhood).push({ area, days });
  }
}

export const yuseongNeighborhoods = [...schedules.keys()].sort((a, b) => a.localeCompare(b, 'ko'));

export function yuseongRecyclingDays(neighborhood, area) {
  const candidates = schedules.get(neighborhood) || [];
  const days = new Set(candidates.map(row => row.days));
  if (days.size === 1) return { days: candidates[0].days, areas: [] };
  const matched = candidates.find(row => row.area === area);
  return { days: matched?.days || '', areas: candidates.map(row => row.area) };
}

export function disposalScheduleRows(schedule, neighborhoodChoice = {}) {
  if (!schedule) return [];
  const { neighborhood, area } = neighborhoodChoice;
  const { days, areas } = yuseongRecyclingDays(neighborhood, area);
  return schedule.rows.map(row => row.recycling && days ? {
    ...row,
    days,
    when: `${neighborhood}${areas.length ? ` (${area})` : ''} ${days}요일 저녁 · 자체 수거 공동주택은 단지 일정`,
  } : row);
}

const seoulClock = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' });
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export function nextRegularDisposal(row, now = new Date()) {
  if (!row.days) return '';
  const date = Object.fromEntries(seoulClock.formatToParts(now).map(({ type, value }) => [type, Number(value)]));
  const today = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const available = row.days.split('·');
  const wait = Array.from({ length: 7 }, (_, offset) => offset).find(offset => available.includes(weekdays[(today.getUTCDay() + offset) % 7]));
  if (wait === undefined) return '';
  if (wait === 0 && row.startHour && date.hour >= row.startHour) return '정규 일정상 지금 배출 시간이에요.';
  const next = new Date(today.getTime() + wait * 86_400_000);
  const label = wait === 0 ? '오늘' : wait === 1 ? '내일' : `${next.getUTCMonth() + 1}월 ${next.getUTCDate()}일(${weekdays[next.getUTCDay()]})`;
  return `정규 일정상 ${label} ${row.startHour ? `저녁 ${row.startHour - 12}시부터` : '저녁에'} 배출할 수 있어요.`;
}
