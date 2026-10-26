# 회원 지역 설정과 지역별 분리배출 안내

## 사용 방법

- 회원가입에서 시·도와 관할 시·군·구를 입력합니다. 전국 17개 시·도를 선택할 수 있습니다. 서울·대전은 자치구 추천 목록과 소속 검증을 제공하며, 다른 지역은 시·군·구 이름을 직접 입력합니다. 다른 지역의 시·군·구 명칭은 형식만 검증하므로 전국 행정구역 전체 목록과 대조한 것은 아닙니다.
- 기존 회원은 로그인 → 마이페이지에서 닉네임과 지역을 저장합니다. 지역이 없는 기존 회원도 계속 이용할 수 있습니다.
- 새 판별에는 현재 회원 지역을 사용합니다. 즐겨찾기·과거 입력을 불러와도 새 판별 지역은 현재 회원 지역입니다.
- 기록에는 입력과 함께 판별 당시 지역, 적용 범위, 근거 링크, 확인일을 저장합니다. 지역 변경으로 과거 기록을 다시 쓰거나 삭제하지 않습니다.
- 비회원은 지역 미설정으로 기본 안내를 제공합니다. 마이페이지는 로그인 안내를 표시합니다.

## 저장과 호환성

회원의 `nickname`, `region: {province, district}`는 Supabase Auth의 `user_metadata`에 저장합니다. 가입은 `signUp(options.data)`, 변경은 `auth.updateUser({data})`, 복원은 로그인 세션의 회원 정보를 사용합니다. 지역은 안내용 환경설정이며 인증·권한 판정에는 사용하지 않습니다. 기존 기록 테이블의 JSON 스냅샷을 그대로 사용하므로 이번 지역 기능을 위한 추가 SQL은 없습니다. 사용자별 기록의 기존 RLS는 유지합니다.

이전 작업의 즐겨찾기·제보 테이블과 음식물 카탈로그가 아직 없다면 `supabase/improvements.sql` 실행은 별도로 필요합니다. 그 작업과 회원 지역 저장은 독립적입니다.

## 검증 범위

전국 대상의 지역 설정과 **지역별 세부 기준의 검증 완료 범위**는 다릅니다. 현재는 대전 5개 구를 우선 지원하며, 등록된 주요 재활용품의 처리·수거 안내와 부드러운 음식물의 배출 방식을 연결합니다. 모든 특수 품목·복합재질·행정동 일정까지 검증한 상태는 아닙니다. 미확인 품목/지역은 ‘기본 안내·지역 기준 확인 필요’로 표시하고 확인되지 않은 지역 규칙을 만들지 않습니다. 위험품·미등록품·이름과 재질 불일치를 지역 규칙으로 덮어쓰지 않습니다.

| 지역 | 공식 자료와 반영 범위 |
| --- | --- |
| 대전 동구 | [재활용 안내](https://www.donggu.go.kr/dg/kor/contents/618), [가정 배출 안내](https://donggu.go.kr/dg/kor/contents/168): 종이팩 분리, 종이·일반 용기 처리, 가정용 음식물 전용용기·납부필증 |
| 대전 중구 | [재활용 안내](https://www.djjunggu.go.kr/kr/sub06_05_09_05.do), [음식물 안내](https://www.djjunggu.go.kr/kr/sub06_05_09_06.do): 종이·종이팩·일반 용기 처리, 단독주택 용기와 공동주택 용기 구분 |
| 대전 서구 | [재활용 안내](https://seogu.go.kr/kor/sub06_11_02_01.do), [음식물 안내](https://www.seogu.go.kr/kor/sub06_11_01_02.do): 단독주택 종이·비닐, 깨진 유리 안전 포장·위험물 표시, 음식물 수거용기 |
| 대전 유성구 | [재활용 안내](https://www.yuseong.go.kr/kor/sub07_11_03_03.do), [음식물 안내](https://www.yuseong.go.kr/kor/sub07_11_03_04.do): 종이팩 별도 분리, 비닐 이물질 제거, 유색 스티로폼 추가 확인, 음식물 자동크린넷 설치지역 예외와 일반주택·공동주택 구분 |
| 대전 대덕구 | [재활용 안내](https://www.daedeok.go.kr/was/goContents.do?link=%2Fwas%2Fwas01%2FWAS010206&menuId=WAS010206), [음식물 안내](https://www.daedeok.go.kr/was/goContents.do?link=%2Fwas%2Fwas01%2FWAS010204&menuId=WAS010204): 종이팩 세척·건조, 비닐·일반 용기, 무색 페트병 별도 배출, 음식물 전용용기 |
| 경기 김포시 | [생활폐기물 안내](https://m.gimpo.go.kr/portal/contents.do?key=2723), [재활용 안내](https://gimpo.go.kr/portal/contents.do?key=1435): 깨진 유리 백색마대, 투명 페트병 수거 방식 |
| 서울 금천구 | [음식물 안내](https://geumcheon.go.kr/portal/contents.do?key=818): 등록된 부드러운 음식물과 뼈·껍데기 등 수거 제외 품목 |

자료 확인일: 2026-10-26. 배출일·시간·장소는 동별·주택 유형과 임시 공지에 따라 달라지므로 구청 원문과 관리사무소를 확인하도록 안내합니다. 음식물 가정 배출 방식을 사업장 배출 방식으로 확장하지 않습니다. 규칙은 `regions.js`, 대전 구별 자료는 `daejeon-guides.js`로 분리했습니다.

## 테스트

- 자동 테스트: 회원 지역의 가입 전달·세션 복원·변경 요청·오류·계정 전환 보호, 5개 구의 출처 선택, 위험·미등록 품목 보호, 구별 깨진 유리 차이, 기존 기록 호환성·지역 스냅샷 보존을 검증합니다.
- 브라우저: 실제 가입 화면의 시도 선택, 세종 시군구 생략, 서울 소속 불일치 오류를 확인했습니다. 가입 요청과 실제 회원 생성은 하지 않았습니다.
- 실제 마이페이지 컴포넌트에 인증 API 대역을 연결한 임시 로컬 화면에서 닉네임과 유성구→서구 변경, 저장 성공 메시지, 회원명 즉시 반영을 확인했습니다. 임시 화면은 배포에서 제외합니다.
- 모바일 390×844에서 마이페이지 가로 넘침이 없음을 확인했습니다. 실제 기기를 사용한 검증은 아닙니다.
- 실제 회원의 신규 가입·인증 메일·Supabase 회원 정보 변경 및 다른 기기 복원은 이번 작업에서 직접 실행하지 않았습니다. 코드 테스트 통과가 전국의 실제 배출 기준 정확성을 입증하는 것은 아닙니다.

## 변경 파일

`src/domain/disposal/regions.js`, `daejeon-guides.js`, `rules.js`, `result-text.js`, `src/components/region-fields.js`, `src/pages/profile/profile.js`, `src/pages/signup/signup.js`, `src/pages/item-input/item-input.js`, `src/services/auth.js`, `src/services/disposal-history.js`, `src/utils/validation.js`, `src/layouts/layout.js`, `src/app.js`, `src/styles/improvements.css`, `tests/regions.test.js`, `README.md`, 이 문서.
