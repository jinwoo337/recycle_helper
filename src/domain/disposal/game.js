import { judgeDisposal } from './rules.js';
import { catalogGameQuestions } from './game-catalog.js';

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
  ...catalogGameQuestions,
];

export const GAME_POOL_VERSION = '2026-10-27.unique-v2';
export const gameItemKey = question => question.name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const shortGameName = name => name.replace(/^(필름포장|랩포장|종이띠|비닐라벨)/,'')
  .replace(/^(플라스틱|흰색스티로폼|유리|종이|비닐)(?=.)/,'')
  .replace('페트병','병').replace('종이팩','팩');
const shortNameGroups=new Map();
for(const q of GAME_QUESTIONS){
  const name=shortGameName(q.name);
  if(!shortNameGroups.has(name))shortNameGroups.set(name,new Set());
  shortNameGroups.get(name).add(gameItemKey(q));
}

// 표시용 힌트만 줄입니다. 실제 판별 입력과 서버의 정답은 변경하지 않습니다.
export function gamePrompt(question) {
  const shortened=shortGameName(question.name);
  // 종이·플라스틱 계란판처럼 축약하면 같은 이름이 되는 경우에는 구분을 유지합니다.
  const name=shortNameGroups.get(shortened)?.size>1?question.name:shortened;
  let condition=question.condition;
  const part=question.input;
  if(part.contaminated==='no' && part.combined==='no') {
    if(part.material==='플라스틱' && part.type==='container') condition='합성수지로 만든 용기나 뚜껑이에요. 내용물과 오염은 없고, 포장 필름·라벨 등 다른 재질은 분리했어요.';
    if(part.material==='종이' && part.type==='paper') condition='펄프로 만든 일반 용지나 포장이에요. 코팅·오염이 없고, 테이프·스프링·다른 재질은 모두 떼었어요. 물에 젖지 않았어요.';
    if(part.material==='비닐' && part.type==='packaging') condition='얇고 쉽게 접히는 필름형 포장재예요. 내용물·기름·이물질이 없고, 붙어 있던 종이 띠나 단단한 마개는 분리했어요.';
    if(part.material==='금속·캔' && part.type==='food-can') condition='철·알루미늄 계열의 식품·음료용 캔이에요. 내용물과 기름을 제거했고 다른 재질은 분리했어요.';
    if(part.material==='스티로폼' && part.type==='packaging') condition='일반 포장용 발포수지 상자나 완충재예요. 코팅·오염이 없고 랩·테이프·라벨은 제거했어요.';
  }
  if(part.material==='종이' && part.type==='carton') condition='음료·식품을 담던 종이 기반의 상자형 포장이에요. 헹궈 말리고 빨대·마개는 분리했지만, 안쪽 코팅층은 그대로예요. 이 지역에는 별도 수거함이 있어요.';
  if(part.material==='종이' && part.type==='coated') condition='겉면에 코팅이나 금속박이 붙어 있고, 종이와 손으로 분리되지 않아요. 음식물이나 다른 오염은 없어요.';
  if(part.material==='종이' && part.type==='excluded') {
    if(/감열|영수증/.test(question.name)) condition='일반 인쇄용지가 아니라 열에 반응하는 감열지예요. 음식물이나 기름은 묻지 않았어요.';
    else if(/인화|사진/.test(question.name)) condition='사진을 인화한 전용 용지예요. 찢어지거나 음식물에 오염되지는 않았어요.';
    else if(/호일/.test(question.name)) condition='오븐 조리에 사용하는 종이호일이에요. 기름이나 음식물은 남아 있지 않아요.';
  }
  return {name:name || question.name,condition};
}

export function gameStreak(answers) {
  let count=0;
  for(let index=answers.length-1;index>=0 && answers[index].correct;index--)count++;
  return count;
}

export function validateRankedGameState(state) {
  if(state?.pool_version!==GAME_POOL_VERSION) throw new Error('게임 문제 업데이트가 필요해요. 페이지를 새로고침하고 서버의 문제 업데이트 SQL 적용 여부를 확인해 주세요.');
  const known=new Map(GAME_QUESTIONS.map(q=>[q.id,q]));
  if(typeof state.id!=='string' || !Number.isFinite(state.remaining_ms) || state.remaining_ms<0 || state.remaining_ms>60_000
    || typeof state.finished!=='boolean' || !Array.isArray(state.answers) || state.answers.length>GAME_MAX_QUESTIONS
    || state.answered!==state.answers.length) throw new Error('게임 응답을 확인하지 못했어요.');
  const used=new Set();
  for(const answer of state.answers){
    const q=known.get(answer.questionId);
    if(!q || !Object.hasOwn(GAME_BINS,answer.bin) || answer.correctBin!==q.bin || answer.correct!==(answer.bin===q.bin)
      || used.has(gameItemKey(q))) throw new Error('문제 순서나 채점 결과를 확인하지 못했어요.');
    used.add(gameItemKey(q));
  }
  if(state.correct!==state.answers.filter(a=>a.correct).length)throw new Error('게임 점수를 확인하지 못했어요.');
  if(!state.finished){
    const q=known.get(state.question?.id),options=state.question?.options;
    if(!q || used.has(gameItemKey(q)) || !Array.isArray(options) || options.length!==4 || new Set(options).size!==4
      || !options.includes(q.bin) || options.some(bin=>!Object.hasOwn(GAME_BINS,bin)))throw new Error('게임 선택지를 확인하지 못했어요.');
  }
  return state;
}

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
  const groups=new Map();
  for(const q of GAME_QUESTIONS){
    const key=gameItemKey(q);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(q);
  }
  // 같은 물건의 깨끗한 상태·오염 상태 중 하나만 뽑고, 다시 넣지 않습니다.
  const questions=shuffle([...groups.values()],random).slice(0,GAME_MAX_QUESTIONS)
    .map(variants=>variants[Math.floor(random()*variants.length)]);
  return { questions, index:0, answers:[], deadline:now+GAME_DURATION_MS };
}

export function gameOptions(question, random = Math.random) {
  const alternatives={pet:['plastic','glass','general'],plastic:['pet','vinyl','general'],paper:['carton','vinyl','general'],
    carton:['paper','plastic','general'],glass:['plastic','metal','general'],metal:['plastic','glass','general'],
    vinyl:['plastic','paper','general'],foam:['plastic','vinyl','general']};
  const general=question.input.material==='비닐'?['vinyl','plastic','paper']
    :question.input.material==='종이'?['paper','carton','plastic']:['plastic','metal','paper'];
  return shuffle([question.bin,...(alternatives[question.bin] || general)],random);
}

export function answerGame(game, bin, now = performance.now()) {
  const current=game.questions[game.index];
  if (!current || now>=game.deadline || game.answers.length !== game.index || !Object.hasOwn(GAME_BINS,bin)
    || (game.options && !game.options.includes(bin))) return null;
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
