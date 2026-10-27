import { judgeDisposal } from './rules.js';

export const GAME_BINS = {
  pet: { label: '투명 페트병', icon: '🧴' },
  plastic: { label: '플라스틱', icon: '🥡' },
  paper: { label: '종이', icon: '📦' },
  carton: { label: '종이팩', icon: '🧃' },
  glass: { label: '유리병', icon: '🍶' },
  metal: { label: '금속캔', icon: '🥫' },
  vinyl: { label: '비닐', icon: '🛍️' },
  foam: { label: '스티로폼', icon: '⬜' },
  general: { label: '종량제봉투', icon: '🗑️' },
};

const clean = (material, type) => ({ material, type, contaminated: 'no', combined: 'no' });
// 모든 문제는 상태를 명시합니다. 브랜드·지역에 따라 달라지는 모호한 제품은 제외합니다.
const question = (id, name, icon, condition, bin, input) => ({ id, name, icon, condition, bin, input: { itemName:name, ...input } });
export const GAME_QUESTIONS = [
  question('water', '투명생수병', '🧴', '무색 투명한 음료용 PET예요. 내용물을 비우고 비닐 라벨을 떼었어요.', 'pet', clean('페트병','clear-drink')),
  question('colored-pet', '유색음료페트병', '🧴', '초록색 PET 음료병이에요. 내용물을 비우고 라벨을 떼었어요.', 'plastic', clean('페트병','other-pet')),
  question('plastic', '두부용기', '🥡', '플라스틱 용기예요. 덮개 필름을 떼고 음식물 없이 깨끗하게 비웠어요.', 'plastic', clean('플라스틱','container')),
  question('shampoo', '샴푸통', '🧴', '플라스틱 용기 본체만 남았어요. 펌프와 라벨을 떼고 내용물을 씻어냈어요.', 'plastic', clean('플라스틱','container')),
  question('box', '종이상자', '📦', '코팅 없는 깨끗하고 마른 종이상자예요. 테이프와 송장을 떼었어요.', 'paper', clean('종이','paper')),
  question('print', '프린트물', '📄', '코팅되지 않은 일반 인쇄용지예요. 비닐이나 금속 부속품은 없어요.', 'paper', clean('종이','paper')),
  question('milk', '우유팩', '🧃', '종이팩이에요. 빨대를 떼고 헹궈 말렸어요. 종이팩 전용 수거함이 있어요.', 'carton', clean('종이','carton')),
  question('glass', '유리잼병', '🍯', '깨지지 않은 일반 식품 유리병이에요. 뚜껑을 떼고 깨끗하게 비웠어요.', 'glass', clean('유리','bottle')),
  question('can', '음료캔', '🥫', '내용물이 없는 깨끗한 금속 음료캔이에요. 다른 재질 부속품은 없어요.', 'metal', clean('금속·캔','food-can')),
  question('tin', '참치캔', '🥫', '음식물과 기름을 제거한 금속 식품캔이에요. 다른 재질은 분리했어요.', 'metal', clean('금속·캔','food-can')),
  question('snack', '과자봉지', '🍪', '비닐 포장재예요. 부스러기와 이물질이 남아 있지 않아요.', 'vinyl', clean('비닐','packaging')),
  question('bag', '비닐봉투', '🛍️', '일반 비닐 포장 봉투예요. 내용물이 없고 깨끗하게 말랐어요.', 'vinyl', clean('비닐','packaging')),
  question('foam', '스티로폼상자', '⬜', '일반 포장용 스티로폼이에요. 테이프와 상표를 떼었고 오염이 없어요.', 'foam', clean('스티로폼','packaging')),
  question('receipt', '감열영수증', '🧾', '매장에서 받은 감열지 영수증이에요. 일반 인쇄용지가 아니에요.', 'general', { material:'종이', type:'excluded' }),
  question('tissue', '사용한휴지', '🧻', '사용한 휴지예요. 일반 종이류로 모으지 않아요.', 'general', { material:'종이', type:'excluded' }),
  question('dirty-film', '과자봉지', '🍪', '비닐 포장재지만 씻어도 기름과 이물질을 제거할 수 없어요. 내용물은 비웠어요.', 'general', { material:'비닐', type:'packaging', contaminated:'yes', washed:'yes', removable:'no', combined:'no' }),
];

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i=result.length-1; i>0; i--) {
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export const GAME_DURATION_MS = 60_000;
export const GAME_MAX_QUESTIONS = 240;
export function createGame(random = Math.random, now = performance.now()) {
  const questions=[];
  while (questions.length<GAME_MAX_QUESTIONS) {
    const batch=shuffle(GAME_QUESTIONS,random);
    if (questions.at(-1)?.id===batch[0].id) [batch[0],batch[1]]=[batch[1],batch[0]];
    questions.push(...batch);
  }
  return { questions:questions.slice(0,GAME_MAX_QUESTIONS), index:0, answers:[], deadline:now+GAME_DURATION_MS };
}

export function gameOptions(question, random = Math.random) {
  const nearby = ({ pet:'plastic', plastic:'pet', paper:'carton', carton:'paper' })[question.bin];
  const required = [question.bin, ...(nearby ? [nearby] : [])];
  const others = shuffle(Object.keys(GAME_BINS).filter(id=>!required.includes(id)),random);
  return shuffle([...required,...others.slice(0,4-required.length)],random);
}

export function answerGame(game, bin, now = performance.now()) {
  const current=game.questions[game.index];
  if (!current || now>=game.deadline || game.answers.length !== game.index || !Object.hasOwn(GAME_BINS,bin)) return null;
  const answer={ questionId:current.id, bin, correct:bin===current.bin };
  game.answers.push(answer);
  return answer;
}

export function remainingSeconds(deadline, now = performance.now()) {
  return Math.max(0,Math.ceil((deadline-now)/1000));
}

export function gameExplanation(question) {
  const result=judgeDisposal(question.input);
  return { reasons:result.reasons, steps:result.steps };
}
