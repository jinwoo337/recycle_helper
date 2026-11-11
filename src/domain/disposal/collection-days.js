// 우리 동네 수거 요일: 사용자가 고른 요일로 "오늘 버리는 날" 안내와 휴대폰 캘린더 알림(.ics)을 만듭니다.
// 동마다 요일이 달라 자동으로 알 수 없으므로, 구청 안내를 보고 한 번만 골라 두게 합니다.
export const COLLECTION_KINDS = [
  ['recycle', '♻️ 재활용품'],
  ['general', '🗑️ 종량제봉투(일반 쓰레기)'],
  ['food', '🍂 음식물'],
];
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const KIND_IDS = COLLECTION_KINDS.map(([id]) => id);

export function normalizeCollectionDays(value) {
  const days = {};
  for (const kind of KIND_IDS) {
    const list = Array.isArray(value?.days?.[kind]) ? value.days[kind] : [];
    days[kind] = [...new Set(list.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
  }
  const hour = Number.isInteger(Number(value?.hour)) && Number(value.hour) >= 0 && Number(value.hour) <= 23 ? Number(value.hour) : 19;
  return { version: 1, days, hour };
}

export const hasCollectionDays = settings => KIND_IDS.some(kind => settings.days[kind].length);

// 주어진 날짜(기본: 오늘)에 버리는 종류 이름 목록.
export function kindsOn(settings, date = new Date()) {
  const day = date.getDay();
  return COLLECTION_KINDS.filter(([kind]) => settings.days[kind].includes(day)).map(([, label]) => label);
}

export function collectionSummary(settings, now = new Date()) {
  if (!hasCollectionDays(settings)) return null;
  const today = kindsOn(settings, now);
  const tomorrow = kindsOn(settings, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (today.length) return { when: 'today', text: `오늘(${WEEKDAYS[now.getDay()]})은 ${today.join(', ')} 버리는 날이에요.` };
  if (tomorrow.length) return { when: 'tomorrow', text: `내일(${WEEKDAYS[(now.getDay() + 1) % 7]})은 ${tomorrow.join(', ')} 버리는 날이에요.` };
  return { when: 'none', text: '오늘과 내일은 정해 둔 수거 요일이 아니에요.' };
}

const pad = value => String(value).padStart(2, '0');
const stamp = date => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
const plainLabel = label => label.replace(/^\S+\s/, '');

// 요일마다 매주 반복되고 정한 시각에 알림이 울리는 캘린더 파일(iCalendar)을 만듭니다.
export function buildCollectionIcs(settings, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//recycle-helper//collection-days//KO', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:분리배출 수거 요일',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Seoul', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0900', 'TZOFFSETTO:+0900', 'TZNAME:KST', 'END:STANDARD', 'END:VTIMEZONE'];
  for (const day of [0, 1, 2, 3, 4, 5, 6]) {
    const kinds = COLLECTION_KINDS.filter(([kind]) => settings.days[kind].includes(day)).map(([, label]) => plainLabel(label));
    if (!kinds.length) continue;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((day - now.getDay() + 7) % 7));
    const date = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
    lines.push('BEGIN:VEVENT', `UID:collection-${ICS_DAYS[day]}-${date}@recyclehelper`, `DTSTAMP:${stamp(now)}`,
      `DTSTART;TZID=Asia/Seoul:${date}T${pad(settings.hour)}0000`, `DTEND;TZID=Asia/Seoul:${date}T${pad(settings.hour)}3000`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAYS[day]}`, `SUMMARY:분리배출 - ${kinds.join(', ')} 버리는 날`,
      'DESCRIPTION:배출 시간과 장소는 구청·관리사무소 안내를 따라 주세요. https://recyclehelper.vercel.app/',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${kinds.join(', ')} 버리는 날이에요`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
