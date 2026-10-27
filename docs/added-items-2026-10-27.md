# 추가·보완한 물품 정보 목록

정리일: 2026-10-27. 사용자 요청에 따라 품목 추가 작업을 일시 중지한 시점의 목록입니다.

## 작업 현황

- 로컬 작성 목록: **400개 품목 유형 / 792개 검색 명칭**
- 이 중 대표 결합 구성이 포함된 유형: **62개**
- **1–200번: 앞선 배포에 포함된 항목**
- **201–400번: 로컬에 작성했으며 아직 배포하지 않은 항목**
- 기존 품목의 유사 명칭 및 자동 입력 보완을 포함합니다. 400개가 모두 서로 다른 신규 제품이라는 의미는 아닙니다.
- 이번 정리에서는 코드를 추가 수정하거나 배포하지 않았습니다. 작성 중이던 변경 사항은 그대로 보존했습니다.

## 함께 보완한 내용

- 물품명에 따른 재질·세부 종류 자동 입력 및 유사 명칭 검색을 확장했습니다.
- 생수병의 비닐 라벨, 용기의 포장 필름, 펌프 등 대표적인 결합 구성과 분리 가능 여부를 입력하도록 보완했습니다.
- 자동 입력한 정보는 실제 제품에 맞게 수정할 수 있습니다. 오염·세척 등 현재 상태는 사용자가 직접 확인합니다.
- 컵라면 용기·배달 용기처럼 재질이 여러 가지인 이름은 재질 선택을 지원하도록 보완했습니다.
- 건전지·전자제품 등 별도 수거 품목과 정보가 불명확한 품목은 일반 재활용으로 단정하지 않도록 안내를 보완했습니다.
- 문구류·음식물 부산물 및 지역에 따라 기준이 달라지는 사례의 안내와 출처 처리를 보완했습니다.

위 내용에는 아직 배포하지 않은 로컬 변경이 포함됩니다. 제품 구성은 수정 가능한 대표 예시이며, 모든 브랜드의 실제 제품을 확인한 것은 아닙니다. 코드 테스트 통과와 분리배출 안내의 실물·지역별 정확성은 별개입니다.

## 검증 및 미진행 사항

- 중지 직전에 실행 중이던 자동 테스트 결과: **78개 통과, 실패 0개**.
- 400개 전체에 대한 실물 확인 및 모든 브라우저 화면 검증을 완료했다는 의미는 아닙니다.
- 선택 사항인 품목 추가 SQL은 파일로 작성했으며, 운영 Supabase에서 실행하지 않았습니다.
- 사진 인식·AI 모드는 가능성만 안내했으며 구현하지 않았습니다.

## 전체 목록

표의 ‘기본 정보’에서 세부 종류는 코드 내부 식별자로 표시됩니다. ‘자동 입력 범위’의 구성은 실제 제품에 맞게 수정해야 하며, 출처 링크는 배출 기준 확인용입니다.

### 1–40. 음료·식품 용기 — 배포 포함

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 1 | 생수병 | 생수페트병 | 페트병 | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 2 | 투명생수병 | 투명생수페트병、무색생수페트병 | 페트병 / clear-drink | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 3 | 무라벨생수병 | 무라벨투명생수병、라벨없는생수병 | 페트병 / clear-drink | 단일 구성 예시 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 4 | 비닐라벨생수병 | 라벨있는투명생수병 | 페트병 / clear-drink | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 5 | 투명탄산음료페트병 | 투명콜라페트병 | 페트병 / clear-drink | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 6 | 투명이온음료페트병 | 투명스포츠음료페트병 | 페트병 / clear-drink | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 7 | 무라벨투명음료페트병 | — | 페트병 / clear-drink | 단일 구성 예시 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 8 | 유색음료페트병 | 갈색페트병、녹색페트병 | 페트병 / other-pet | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 9 | 식용유페트병 | 간장페트병、식초페트병 | 페트병 / other-pet | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 10 | 세제페트병 | 섬유유연제페트병 | 페트병 / other-pet | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 11 | 우유팩 | 일반우유팩 | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 12 | 두유팩 | 멸균두유팩 | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 13 | 주스팩 | 쥬스팩 | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 14 | 멸균우유팩 | 멸균팩 | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 15 | 빨대붙은두유팩 | 빨대붙은우유팩 | 종이 / carton | 결합·분리 가능 / 플라스틱 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 16 | 플라스틱마개종이팩 | 뚜껑있는우유팩 | 종이 / carton | 결합·분리 가능 / 플라스틱 덮개·마개 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 17 | 사이다캔 | 탄산음료캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 18 | 커피캔 | 캔커피 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 19 | 에너지음료캔 | 이온음료캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 20 | 옥수수통조림캔 | 콩통조림캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 21 | 햄통조림캔 | 스팸캔 | 금속·캔 / food-can | 결합·분리 가능 / 플라스틱 덮개·마개 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 22 | 고등어통조림캔 | 꽁치통조림캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 23 | 분유캔 | — | 금속·캔 / food-can | 결합·분리 가능 / 플라스틱 덮개·마개 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 24 | 유리잼병 | 잼유리병 | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 25 | 유리소스병 | 유리양념병 | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 26 | 유리음료병 | 유리주스병 | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 27 | 유리커피병 | — | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 28 | 플라스틱요거트용기 | 플라스틱요구르트용기、요거트용기、요구르트용기 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 29 | 플라스틱푸딩컵 | 플라스틱젤리컵 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 30 | 플라스틱아이스크림통 | 아이스크림통 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 31 | 플라스틱딸기용기 | 플라스틱과일트레이 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 32 | 플라스틱방울토마토용기 | 플라스틱포도용기 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 33 | 플라스틱계란판 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 34 | 플라스틱샐러드용기 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 35 | 플라스틱두부용기 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 36 | 플라스틱즉석밥용기 | 플라스틱햇반용기 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 37 | 플라스틱국물용기 | 플라스틱탕용기 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 38 | 플라스틱배달뚜껑 | 플라스틱용기뚜껑 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 39 | 플라스틱테이크아웃컵 | 플라스틱아이스커피컵 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 40 | 플라스틱컵과종이홀더 | — | 플라스틱 / container | 결합·분리 가능 / 종이 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 41–70. 비닐 포장·종이·문구 — 배포 포함

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 41 | 라면봉지 | 봉지라면포장지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 42 | 빵봉지 | 식빵봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 43 | 과자비닐포장 | 사탕비닐포장지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 44 | 비닐쌀포대 | 비닐쌀봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 45 | 냉동식품비닐봉지 | 냉동만두비닐봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 46 | 김비닐포장지 | 김과자봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 47 | 비닐택배봉투 | 택배비닐봉투 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 48 | 뽁뽁이 | 에어캡、비닐완충재 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 49 | 비닐에어쿠션 | 공기주입비닐완충재 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 50 | 비닐리필세제봉투 | 비닐샴푸리필봉투 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 51 | 지퍼백 | 비닐지퍼백 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 52 | 비닐위생봉투 | 위생비닐봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 53 | 비닐우산포장 | 우산비닐봉투 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 54 | 비닐화장지포장 | 휴지비닐포장 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 55 | 종이택배상자 | 테이프붙은택배상자 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 56 | 종이과자상자 | — | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 57 | 종이시리얼상자 | — | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 58 | 종이티슈상자 | — | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 59 | 종이우유팩묶음상자 | 종이음료묶음상자 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 60 | 종이계란판 | 펄프계란판 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 61 | 종이봉투 | 크라프트종이봉투 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 62 | 복사지 | A4용지、에이포용지 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 63 | 교과서 | 문제집、참고서 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 64 | 종이잡지 | 잡지 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 65 | 종이카탈로그 | 종이팸플릿、종이브로슈어 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 66 | 종이달력 | — | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 67 | 스프링노트 | 철제스프링노트 | 종이 / paper | 결합·분리 가능 / 금속·캔 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 68 | 종이컵홀더 | 커피종이홀더 | 종이 / paper | 단일 구성 예시 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 69 | 화장지심 | 휴지심、종이심 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 70 | 종이완충재 | 종이벌집완충재 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 71–100. 수거 제외 품목·전지·조명·소형 전자제품 — 배포 포함

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 71 | 감열택배송장 | 감열배송송장 | 종이 / excluded | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 72 | 인화사진 | 인화지 | 종이 / excluded | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 73 | 베이킹종이호일 | 유산지 | 종이 / excluded | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 74 | 사용한키친타월 | 사용한종이냅킨 | 종이 / excluded | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 75 | 깨진소주병 | 깨진맥주병 | 유리 / broken | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 76 | 유리컵 | 유리잔 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 77 | 내열유리컵 | 유리냄비뚜껑 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 78 | 유리접시 | 유리그릇 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 79 | 플라스틱빨대 | 일회용플라스틱빨대 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 80 | 플라스틱숟가락 | 플라스틱포크、플라스틱나이프 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 81 | 플라스틱볼펜 | 볼펜、유성볼펜、젤펜、중성펜 | 플라스틱 / other | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 82 | 일회용면도기 | 플라스틱면도기 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 83 | 건전지 | 폐건전지、일회용건전지、알카라인건전지、알칼라인건전지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 84 | AA건전지 | AAA건전지、9V건전지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 85 | 버튼전지 | 코인전지、수은전지、동전건전지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 86 | 충전건전지 | 충전지、니켈수소충전지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 87 | 보조배터리 | 휴대용보조배터리 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 88 | 휴대폰배터리 | 리튬이온배터리 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 89 | 부푼배터리 | 손상된배터리、누액건전지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 90 | 형광등 | 직관형광등、전구형형광등 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 91 | 깨진형광등 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 92 | LED전구 | LED조명 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 93 | 백열전구 | 할로겐전구 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 94 | 휴대폰 | 스마트폰、폐휴대폰 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 95 | 충전기 | 휴대폰충전기、노트북충전기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 96 | 블루투스이어폰 | 무선이어폰、전자담배 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 97 | 멀티탭 | 전기멀티탭 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 98 | 헤어드라이어 | 헤어드라이기、전기드라이기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 99 | 전기주전자 | 전기포트 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 100 | 전기다리미 | 다리미 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 101–140. 생활 포장·생활 용기 — 배포 포함

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 101 | 소주팩 | 종이소주팩 | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 102 | 크림종이팩 | 생크림종이팩 | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 103 | 액상커피종이팩 | — | 종이 / carton | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 104 | 비닐코팅없는포장지 | 종이포장지 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 105 | 종이명함 | 코팅없는명함 | 종이 / paper | 단일 구성 예시 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 106 | 종이메모지 | 메모용지 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 107 | 비닐코팅광고지 | 방수포스터 | 종이 / coated | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 108 | 알루미늄박보냉종이상자 | 분리불가보냉종이상자 | 종이 / coated | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 109 | 은행감열영수증 | 카드감열영수증、마트감열영수증 | 종이 / excluded | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 110 | 금속박종이포장지 | 분리불가은박종이 | 종이 / coated | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 111 | 유리꿀병 | — | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 112 | 유리올리브병 | 유리피클병 | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 113 | 유리식용유병 | 유리식초병 | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 114 | 유리우유병 | — | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 115 | 양주유리병 | 와인유리병 | 유리 / bottle | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 116 | 참치캔 | 참치통조림캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 117 | 과일통조림캔 | 복숭아통조림캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 118 | 토마토통조림캔 | — | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 119 | 반려동물사료캔 | 고양이사료캔、강아지사료캔 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 120 | 버터쿠키금속통 | 금속과자통 | 금속·캔 / food-can | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 121 | 흰색스티로폼택배상자 | 흰색스티로폼식품상자 | 스티로폼 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 122 | 흰색스티로폼생선상자 | 흰색스티로폼과일상자 | 스티로폼 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 123 | TV스티로폼완충재 | 냉장고스티로폼완충재 | 스티로폼 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 124 | 건축용스티로폼 | 단열스티로폼 | 스티로폼 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 125 | 코팅스티로폼 | 분리불가접착스티로폼 | 스티로폼 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 126 | 플라스틱샴푸통 | 플라스틱린스통 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 127 | 플라스틱바디워시통 | 플라스틱손세정제통 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 128 | 플라스틱세탁세제통 | 플라스틱주방세제통 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 129 | 플라스틱섬유유연제통 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 130 | 플라스틱로션통 | 플라스틱크림통 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 131 | 플라스틱알약병 | 플라스틱영양제병 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 132 | 플라스틱아이스크림뚜껑 | 플라스틱컵뚜껑 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 133 | 비닐팽이버섯봉지 | 비닐채소봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 134 | 비닐커피원두봉투 | 비닐커피포장봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 135 | 비닐과일봉지 | 비닐얼음봉지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 136 | 비닐떡포장지 | 비닐어묵포장지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 137 | 비닐치즈포장지 | 비닐햄포장지 | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 138 | 비닐물티슈겉포장 | — | 비닐 / packaging | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 139 | 플라스틱물티슈캡 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 140 | 플라스틱식품보관통 | 플라스틱김치통 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 141–190. 소형·대형 가전 — 배포 포함

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 141 | 청소기 | 진공청소기、유선청소기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 142 | 무선청소기 | 충전식청소기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 143 | 로봇청소기 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 144 | 가습기 | 초음파가습기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 145 | 전기밥솥 | 전기압력밥솥 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 146 | 토스터 | 토스트기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 147 | 믹서기 | 블렌더、전기믹서 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 148 | 전기커피머신 | 커피머신 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 149 | 전기커피분쇄기 | 커피그라인더 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 150 | 전기착즙기 | 녹즙기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 151 | 제빵기 | 전기제빵기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 152 | 선풍기 | 전기선풍기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 153 | 서큘레이터 | 공기순환기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 154 | 전기면도기 | 충전식면도기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 155 | 전동칫솔 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 156 | 고데기 | 전기헤어아이론 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 157 | 전기손난로 | 충전식손난로 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 158 | 전자체중계 | 디지털체중계 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 159 | 전자계산기 | 계산기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 160 | 디지털카메라 | 전자카메라 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 161 | 노트북 | 랩톱 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 162 | 태블릿 | 태블릿PC、태블릿피씨 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 163 | 컴퓨터키보드 | 유선키보드、무선키보드 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 164 | 컴퓨터마우스 | 유선마우스、무선마우스 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 165 | 공유기 | 와이파이공유기、인터넷모뎀 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 166 | 리모컨 | TV리모컨 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 167 | 휴대용스피커 | 블루투스스피커 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 168 | 유선헤드폰 | 무선헤드폰、전자헤드셋 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 169 | 프린터 | 가정용프린터 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 170 | 스캐너 | 문서스캐너 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 171 | 냉장고 | 가정용냉장고 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 172 | 김치냉장고 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 173 | 냉동고 | 가정용냉동고 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 174 | 세탁기 | 드럼세탁기、통돌이세탁기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 175 | 의류건조기 | 빨래건조기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 176 | 에어컨 | 벽걸이에어컨、스탠드에어컨 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 177 | 공기청정기 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 178 | 제습기 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 179 | 전자레인지 | 마이크로웨이브오븐 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 180 | 전기오븐 | 전기레인지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 181 | 식기세척기 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 182 | 식기건조기 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 183 | 전기정수기 | 전기냉온수기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 184 | TV | 텔레비전、티비 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 185 | 컴퓨터본체 | 데스크톱컴퓨터、데스크탑컴퓨터 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 186 | 컴퓨터모니터 | PC모니터 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 187 | 오디오세트 | 가정용오디오 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 188 | 전기자전거 | 전동자전거 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 189 | 전동킥보드 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 190 | 러닝머신 | 런닝머신、전동러닝머신 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 191–200. 의류·잡화·폐식용유·고철 — 배포 포함

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 191 | 헌옷 | 폐의류、옷 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 192 | 티셔츠 | 셔츠、면티 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 193 | 바지 | 청바지、면바지 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 194 | 외투 | 재킷、자켓、코트、패딩 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 195 | 운동화 | 신발 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 196 | 가방 | 백팩、책가방 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 197 | 이불 | 솜이불、침구 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 198 | 베개 | 방석、쿠션 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 199 | 폐식용유 | 남은튀김기름、사용한식용유 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 200 | 고철 | 금속못、철사、고철조각 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 201–240. 라벨·필름·뚜껑 등 대표 결합 구성 — 로컬 작성·미배포

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 201 | 두부용기 | 필름뚜껑두부용기 | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 202 | 즉석밥용기 | 햇반용기、즉석밥플라스틱용기 | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 203 | 필름포장플라스틱반찬용기 | 필름뚜껑플라스틱반찬용기 | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 204 | 필름포장플라스틱도시락용기 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 205 | 필름포장플라스틱샐러드용기 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 206 | 필름포장플라스틱젤리컵 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 207 | 필름포장플라스틱푸딩컵 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 208 | 필름포장플라스틱과일트레이 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 비닐 포장 필름 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 209 | 랩포장플라스틱정육트레이 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 210 | 랩포장플라스틱생선트레이 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 211 | 랩포장플라스틱버섯트레이 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 212 | 랩포장플라스틱채소트레이 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 213 | 랩포장스티로폼정육트레이 | — | 스티로폼 / packaging | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 214 | 랩포장스티로폼생선트레이 | — | 스티로폼 / packaging | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 215 | 랩포장스티로폼과일트레이 | — | 스티로폼 / packaging | 결합·분리 가능 / 비닐 랩 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 216 | 종이띠플라스틱도시락용기 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 217 | 종이띠플라스틱샐러드용기 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 218 | 종이띠플라스틱반찬용기 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 219 | 종이띠플라스틱과일용기 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 220 | 비닐창종이빵봉투 | 창있는종이빵봉투 | 종이 / paper | 결합·분리 가능 / 비닐 창 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 221 | 비닐창종이과자상자 | 창있는종이과자상자 | 종이 / paper | 결합·분리 가능 / 비닐 창 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 222 | 플라스틱창종이상자 | 플라스틱창종이포장상자 | 종이 / paper | 결합·분리 가능 / 플라스틱 창·내부 트레이 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 223 | 플라스틱손잡이종이상자 | — | 종이 / paper | 결합·분리 가능 / 플라스틱 손잡이 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 224 | 비닐입구종이티슈상자 | — | 종이 / paper | 결합·분리 가능 / 입구 비닐 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 225 | 종이컵과플라스틱뚜껑 | 뚜껑있는종이커피컵 | 종이 / cup | 결합·분리 가능 / 플라스틱 컵 뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 226 | 종이컵과종이홀더 | 홀더있는종이커피컵 | 종이 / cup | 결합·분리 가능 / 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 227 | 종이컵뚜껑홀더세트 | — | 종이 / cup | 결합·분리 가능 / 플라스틱 컵 뚜껑 + 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 228 | 플라스틱컵과종이홀더와빨대 | — | 플라스틱 / container | 결합·분리 가능 / 떼어내는 종이 띠·홀더 + 플라스틱 빨대 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 229 | 비닐라벨플라스틱요거트병 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 230 | 비닐라벨플라스틱세제통 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 231 | 비닐라벨플라스틱샴푸통 | — | 플라스틱 / container | 결합·분리 가능 / 비닐 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 232 | 펌프형플라스틱샴푸통 | 펌프샴푸통 | 플라스틱 / container | 결합·분리 가능 / 스프링이 든 복합재질 펌프 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 233 | 펌프형플라스틱바디워시통 | 펌프바디워시통 | 플라스틱 / container | 결합·분리 가능 / 스프링이 든 복합재질 펌프 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 234 | 펌프형플라스틱손세정제통 | 펌프손세정제통 | 플라스틱 / container | 결합·분리 가능 / 스프링이 든 복합재질 펌프 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 235 | 펌프형플라스틱로션통 | 펌프로션통 | 플라스틱 / container | 결합·분리 가능 / 스프링이 든 복합재질 펌프 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 236 | 펌프형플라스틱주방세제통 | 펌프주방세제통 | 플라스틱 / container | 결합·분리 가능 / 스프링이 든 복합재질 펌프 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 237 | 플라스틱요거트용기와은박뚜껑 | — | 플라스틱 / container | 결합·분리 가능 / 알루미늄 포일 뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 238 | 플라스틱푸딩용기와은박뚜껑 | — | 플라스틱 / container | 결합·분리 가능 / 알루미늄 포일 뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 239 | 플라스틱젤리용기와은박뚜껑 | — | 플라스틱 / container | 결합·분리 가능 / 알루미늄 포일 뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 240 | 플라스틱치즈용기와은박뚜껑 | — | 플라스틱 / container | 결합·분리 가능 / 알루미늄 포일 뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 241–300. 구분하기 어려운 제품·생활용품 — 로컬 작성·미배포

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 241 | CD | 씨디、콤팩트디스크 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 242 | DVD | 디브이디、블루레이디스크 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 243 | 플라스틱파일철 | 플라스틱바인더 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 244 | 플라스틱낚싯대 | — | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 245 | 플라스틱문구가위 | 복합재질문구가위 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 246 | 복합재질옷걸이 | 금속플라스틱옷걸이 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 247 | 비닐식탁보 | PVC식탁보 | 비닐 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 248 | 비닐돗자리 | PVC돗자리 | 비닐 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 249 | PVC장판 | 비닐바닥재 | 비닐 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 250 | 비닐현수막 | PVC현수막 | 비닐 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 251 | 비닐천막 | PVC천막 | 비닐 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 252 | 봉제인형 | 솜인형 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 253 | 골프가방 | 골프백 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 254 | 캐리어 | 여행용트렁크、바퀴달린가방 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 255 | 인라인스케이트 | 롤러스케이트 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 256 | 유모차 | 휴대용유모차 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 257 | 보행기 | 아기보행기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 258 | 도자기그릇 | 사기그릇 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 259 | 도자기화분 | 사기화분 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 260 | 도자기접시 | 사기접시 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 261 | 도자기컵 | 머그컵、사기컵 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 262 | 깨진도자기 | 깨진사기그릇 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 263 | 도자기밥그릇 | 사기밥공기 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 264 | 도자기대접 | 도자기국그릇 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 265 | 유리어항 | 유리수조 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 266 | 강화유리 | 강화유리판 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 267 | 내열유리냄비 | 유리조리냄비 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 268 | 내열유리밀폐용기 | 오븐용유리용기 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 269 | 유리도마 | 강화유리도마 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 270 | 유리선반 | 유리상판 | 유리 / special | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 271 | 스테인리스숟가락 | 금속숟가락 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 272 | 스테인리스젓가락 | 금속젓가락 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 273 | 스테인리스포크 | 금속포크 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 274 | 금속국자 | 스테인리스국자 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 275 | 스테인리스쟁반 | 금속쟁반 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 276 | 스테인리스채반 | 금속채반 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 277 | 스테인리스냄비 | 스텐냄비 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 278 | 알루미늄냄비 | 양은냄비 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 279 | 금속단일재질냄비뚜껑 | 스테인리스냄비뚜껑 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 280 | 금속볼 | 스테인리스믹싱볼 | 금속·캔 / other | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 281 | 프라이팬 | 후라이팬、코팅프라이팬 | 금속·캔 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 282 | 스테인리스텀블러 | 금속텀블러 | 금속·캔 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 283 | 복합재질텀블러 | 여러재질텀블러 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 284 | 부탄가스용기 | 휴대용부탄가스통 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 285 | 살충제용기 | 살충제스프레이통 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 286 | 헤어스프레이캔 | 헤어스프레이금속통 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 287 | 락카스프레이 | 래커스프레이 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 288 | 금속페인트통 | 금속페인트캔 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 289 | 금속접착제통 | 금속광택제통 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 290 | 금속윤활유통 | 윤활스프레이캔 | 금속·캔 / hazard | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 291 | 종이표지책 | 비닐없는종이책 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 292 | 비닐표지분리종이책 | — | 종이 / paper | 결합·분리 가능 / 분리 가능한 비닐 표지 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 293 | 종이상자와비닐포장 | — | 종이 / paper | 결합·분리 가능 / 비닐 포장 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 294 | 종이봉투와비닐창 | — | 종이 / paper | 결합·분리 가능 / 봉투 비닐 창 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 295 | 종이상자와플라스틱트레이 | — | 종이 / paper | 결합·분리 가능 / 내부 플라스틱 트레이 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 296 | 비닐봉지와플라스틱캡 | — | 비닐 / packaging | 결합·분리 가능 / 플라스틱 캡 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 297 | 비닐봉지와종이띠 | — | 비닐 / packaging | 결합·분리 가능 / 떼어내는 종이 띠·홀더 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 298 | 유리병과금속뚜껑 | — | 유리 / bottle | 결합·분리 가능 / 금속 병뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 299 | 유리병과플라스틱뚜껑 | — | 유리 / bottle | 결합·분리 가능 / 플라스틱 병뚜껑 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 300 | 종이라벨식품유리병 | — | 유리 / bottle | 결합·분리 가능 / 떼어내는 종이 라벨 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

### 301–350. 음식물·식재료 부산물 — 로컬 작성·미배포

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 301 | 귤껍질 | 밀감껍질 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 302 | 멜론껍질 | 메론껍질 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 303 | 망고껍질 | — | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 304 | 묵은쌀 | 남은쌀 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 305 | 남은살코기 | 남은고기살 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 306 | 고기비계 | 남은비계 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 307 | 생선내장 | — | 음식물류 | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 308 | 호두껍데기 | 호두껍질 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 309 | 밤껍질 | 밤껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 310 | 땅콩껍질 | 땅콩껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 311 | 도토리껍질 | 도토리껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 312 | 코코넛껍질 | 코코넛껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 313 | 파인애플껍질 | — | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 314 | 살구씨 | 살구씨앗 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 315 | 감씨 | 감씨앗 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 316 | 아보카도씨 | 아보카도씨앗 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 317 | 매실씨 | 매실씨앗 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 318 | 소뼈 | 소갈비뼈 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 319 | 돼지뼈 | 돼지갈비뼈 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 320 | 오리뼈 | 오리고기뼈 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 321 | 전복껍데기 | 전복껍질 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 322 | 소라껍데기 | 소라껍질 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 323 | 굴껍데기 | 굴껍질 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 324 | 꼬막껍데기 | 꼬막껍질 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 325 | 멍게껍질 | 멍게껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 326 | 게껍데기 | 게껍질、꽃게껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 327 | 가재껍질 | 가재껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 328 | 오리알껍데기 | 오리알껍질 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 329 | 메추리알껍질 | 메추리알껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 330 | 타조알껍질 | 타조알껍데기 | 음식물류 / excluded | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 331 | 왕겨 | 쌀왕겨 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 332 | 대파뿌리 | — | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 333 | 쪽파뿌리 | — | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 334 | 미나리뿌리 | — | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 335 | 고추씨 | 고추씨앗 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 336 | 고추대 | 고춧대 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 337 | 마른마늘대 | 건조마늘대 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 338 | 옥수수대 | 옥수수줄기 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 339 | 옥수수겉껍질 | 옥수수포엽 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 340 | 양파겉껍질 | 마른양파껍질 | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 341 | 생강껍질 | — | 음식물류 / fibrous | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 342 | 커피찌꺼기 | 커피박、원두찌꺼기 | 음식물류 / residue | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 343 | 차찌꺼기 | 녹차찌꺼기、우린찻잎 | 음식물류 / residue | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 344 | 한약찌꺼기 | 달인약재찌꺼기 | 음식물류 / residue | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 345 | 남은된장 | 버리는된장 | 음식물류 / residue | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 346 | 남은고추장 | 버리는고추장 | 음식물류 / residue | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 347 | 남은미역 | 버리는미역 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 348 | 남은다시마 | 버리는다시마 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 349 | 씨뺀매실과육 | 매실청과육 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |
| 350 | 남은생선살 | 익힌생선살 | 음식물류 / soft | 재질·종류 · [출처: 금천구 음식물 안내 (지역 차이 확인)](https://geumcheon.go.kr/portal/contents.do?key=818) |

### 351–400. 학생 생활에서 자주 검색할 물품 — 로컬 작성·미배포

| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |
| --- | --- | --- | --- | --- |
| 351 | 연필 | 몽당연필 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 352 | 색연필 | 나무색연필 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 353 | 샤프 | 샤프펜슬 | 기타 | 품목별 처리·지역 확인 · [출처: 노원구 · 생활폐기물 배출 안내](https://www.nowon.kr/www/minwon/minwon4/minwon4_03/minwon4_03_02.jsp) |
| 354 | 형광펜 | 하이라이터펜 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 355 | 네임펜 | 이름쓰는펜 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 356 | 유성매직 | 매직펜、마커펜 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 357 | 보드마카 | 화이트보드마커 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 358 | 지우개 | 고무지우개 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 지우개](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=325) |
| 359 | 크레파스 | 크레용 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 360 | 분필 | 칠판분필 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 분필](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=312) |
| 361 | 파스텔 | 그림용파스텔 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 362 | 붓 | 그림붓、수채화붓 | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 363 | 만년필 | — | 기타 | 소량 필기구 종량제 안내 · [출처: 품목사전 · 연필·필기구](https://wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=316) |
| 364 | 수정테이프 | 화이트테이프 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 365 | 필통 | 펜케이스 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 366 | 플라스틱자 | 학용자 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 367 | 책받침 | 플라스틱책받침 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 368 | 클리어파일 | 투명파일、L자파일 | 플라스틱 / other | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 369 | 프린트물 | 출력물、수업프린트 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 370 | 시험지 | 모의고사시험지 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 371 | 강의자료 | 수업유인물、강의프린트 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 372 | 서류봉투 | 갈색서류봉투 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 373 | 라면박스 | 라면종이상자 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 374 | 신발박스 | 신발종이상자 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 375 | 삼각김밥포장지 | 삼각김밥비닐 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 376 | 김밥포장지 | 김밥비닐포장 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 377 | 라면스프봉지 | 분말스프봉지 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 378 | 라면건더기봉지 | 건더기스프봉지 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 379 | 믹스커피봉지 | 스틱커피봉지 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 380 | 아이스크림봉지 | 아이스바포장지 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 381 | 즉석카레봉지 | 카레레토르트봉지 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 382 | 즉석짜장봉지 | 짜장레토르트봉지 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 383 | 음료파우치 | 주스파우치、과즙파우치 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 384 | 삼각커피우유팩 | 삼각커피우유포장 | 비닐 / packaging | 재질·종류 · [출처: 품목사전 · 비닐 식품 포장](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=622) |
| 385 | 컵라면용기 | 컵라면컵、라면컵 | 종이 / food-container | 재질·종류 · [출처: 품목사전 · 종이 컵라면](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=406) |
| 386 | 종이컵라면용기 | 종이라면컵 | 종이 / food-container | 재질·종류 · [출처: 품목사전 · 종이 컵라면](https://www.wasteguide.or.kr/front/dischargeMethod/dictionaryView.do?niIdx=406) |
| 387 | 컵밥용기 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 388 | 편의점도시락용기 | 도시락용기 | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 389 | 배달용기 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 390 | 샐러드용기 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 391 | 반찬통 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 392 | 샴푸통 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 393 | 바디워시통 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 394 | 세제통 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 395 | 로션통 | — | 플라스틱 / container | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 396 | 마우스패드 | — | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 397 | 휴대폰케이스 | 폰케이스 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 398 | USB케이블 | 충전케이블、충전선 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 399 | 유선이어폰 | 줄이어폰 | 기타 | 품목별 처리·지역 확인 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |
| 400 | 공책 | 수학공책、줄노트、노트내지 | 종이 / paper | 재질·종류 · [출처: 공개 분리배출 지침](https://wasteguide.or.kr/front/bbsList.do?bbsId=BBS_0003) |

## 관련 파일

- 전체 품목 데이터: `src/domain/disposal/expanded-catalog.js`
- 생성된 상세 목록: `docs/catalog-expansion.md`
- 선택 실행용 SQL: `supabase/catalog-expansion.sql`
- 목록·SQL 생성기: `scripts/build-catalog-expansion.js`
