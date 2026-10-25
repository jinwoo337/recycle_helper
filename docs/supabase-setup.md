# 4회차 Supabase 연결과 검증

## 현재 구현

- 프로젝트: `https://phutcroispzgqqtrpgjn.supabase.co`
- 공개 연결 설정: `src/services/supabase.js`
- 인증 서비스: `src/services/auth.js`
- 이메일·비밀번호 가입과 로그인, 닉네임 메타데이터 저장, 현재 브라우저 로그아웃.
- SDK의 세션 보관·자동 갱신, 시작 시 세션 복원, 다른 탭의 인증 상태 변경 반영.
- PKCE 인증 복귀를 해시 라우터보다 먼저 처리하고 URL에서 인증 코드·오류를 정리.
- 이메일 미인증·잘못된 로그인·요청 제한·메일 발송 설정 오류 안내, 중복 제출 방지.

브라우저에 비밀번호나 자체 비밀번호 검증값을 새로 저장하지 않습니다. 로그인 유지를 위한 세션 토큰은 Supabase SDK가 localStorage에 저장합니다. Publishable key는 공개 설정이며 관리자 권한이 있는 Secret/service_role 키로 바꾸면 안 됩니다.

## 대시보드에서 설정할 항목

1. Authentication의 Email 공급자와 신규 가입을 활성화합니다.
2. 이메일 인증을 활성화합니다. 연결 확인 당시 서버 공개 설정은 `external.email: true`, `disable_signup: false`, `mailer_autoconfirm: false`였습니다.
3. Authentication → URL Configuration:
   - Site URL: `https://recyclehelper.vercel.app`
   - Redirect URLs: `https://recyclehelper.vercel.app/`
   - 로컬 개발도 사용할 경우 Redirect URLs에 `http://127.0.0.1:5173/`을 추가합니다.
4. 기본 인증 메일 서비스는 테스트용 발송 대상과 횟수 제한이 있습니다. 일반 사용자 이메일 테스트에는 Custom SMTP를 설정합니다. 발신 도메인 인증과 메일 공급자의 요구 사항도 확인합니다.
5. 비밀번호 정책은 화면의 최소 8자와 일치시키거나, 서버 정책을 더 강화했다면 화면 안내도 함께 수정합니다.

공개 키만으로 URL·SMTP 등 관리자 설정을 변경하거나 확인할 수 없으므로 위 항목은 대시보드에서 확인해야 합니다.

## 직접 확인할 순서

1. 최신 인증 코드를 배포한 뒤 `https://recyclehelper.vercel.app/#/signup`에 접속합니다. 로컬에서는 `npm start` 후 `http://127.0.0.1:5173/#/signup`을 사용합니다.
2. 수신 가능한 본인 이메일, 닉네임, 8자 이상 비밀번호로 가입합니다.
3. 가입 화면의 인증 메일 안내를 확인하고 수신함·스팸함을 확인합니다. 중복 이메일에 대한 응답은 계정 유무 노출 방지를 위해 일반 안내로 표시될 수 있습니다.
4. 인증 전 로그인 시 이메일 인증 안내가 나오는지 확인합니다.
5. 가입한 브라우저에서 메일의 인증 링크를 엽니다. 주소가 `127.0.0.1` 대신 `localhost`이면 브라우저 저장소가 달라지므로 처음 사용한 주소를 유지하세요.
6. 인증 후 닉네임·로그아웃 버튼이 나타나는지 확인합니다. 다른 기기에서 인증했다면 가입한 화면에서 이메일·비밀번호로 로그인합니다.
7. 새로고침해도 로그인 상태가 유지되는지 확인합니다.
8. 다른 탭에서 같은 사이트를 연 뒤 한 탭에서 로그아웃하고 두 탭에 반영되는지 확인합니다.
9. 잘못된 비밀번호, 가입 입력 오류, 네트워크 단절 시 안내와 버튼 재활성화를 확인합니다.
10. Supabase Authentication → Users에서 실제 사용자가 등록되고 이메일 인증 시각이 표시되는지 확인합니다.

이메일·비밀번호를 채팅이나 저장소에 남길 필요는 없습니다.

## 검증 범위와 남은 작업

`npm test`는 인증 API 대역으로 세션 복원, 입력 전달, 이메일 인증 대기, 즉시 세션 발급, 오류, 로그아웃 실패, 다른 탭 인증 이벤트를 검증합니다. 기존 분리배출·기록·통계 검사도 포함합니다. 실제 메일 수신·인증과 성공 로그인은 위 수동 절차로 추가 확인해야 합니다.

분리배출 기록의 DB 이전, profiles 테이블, 비밀번호 재설정, 인증 메일 재발송은 이번 구현 범위에 포함하지 않습니다. 데이터 테이블을 연결할 때는 RLS로 `auth.uid()`에 해당하는 본인 데이터만 접근하도록 정책을 설정하세요.

## 공식 문서

- [이메일·비밀번호 인증](https://supabase.com/docs/guides/auth/passwords)
- [인증 복귀 URL](https://supabase.com/docs/guides/auth/redirect-urls)
- [PKCE 흐름](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [공개 키와 비밀 키](https://supabase.com/docs/guides/getting-started/api-keys)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
