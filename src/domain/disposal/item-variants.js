// 이름만으로 재질이 고정되지 않는 일상 용기. 실제 재질로 수정한 값도 판별에 사용합니다.
// 특정 재질이 이름에 명시된 품목에는 적용하지 않습니다.
const plastic = ['container','other','unknown'];
const paper = ['food-container','cup','coated','unknown'];
const foodContainer = {'플라스틱':plastic,'종이':paper,'스티로폼':['other','unknown']};
const bathroomContainer = {'플라스틱':plastic,'페트병':['other-pet','unknown'],'유리':['special','broken','unknown']};
export const ITEM_VARIANTS = {
  '컵라면용기':foodContainer,'라면컵':foodContainer,'컵라면컵':foodContainer,
  '컵밥용기':foodContainer,'편의점도시락용기':foodContainer,'도시락용기':foodContainer,
  '배달용기':foodContainer,'샐러드용기':foodContainer,'반찬통':{...foodContainer,'유리':['bottle','special','broken','unknown']},
  '요거트용기':{'플라스틱':plastic,'유리':['bottle','special','broken','unknown']},
  '요구르트용기':{'플라스틱':plastic,'유리':['bottle','special','broken','unknown']},
  '아이스크림통':foodContainer,
  '샴푸통':bathroomContainer,'바디워시통':bathroomContainer,'세제통':bathroomContainer,'로션통':bathroomContainer,
};
