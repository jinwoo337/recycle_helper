# Google 로그인 활성화

## 구현한 기능

- 기존 이메일·비밀번호 로그인과 가입을 유지하고 로그인·회원가입 화면에 `Google로 계속하기` 버튼을 추가했습니다.
- Supabase 공개 인증 설정에서 Google 활성화 여부를 먼저 확인합니다. 비활성 상태에서는 기존 이메일 로그인을 사용할 수 있는 안내를 표시합니다.
- Google OAuth는 Supabase SDK의 PKCE 흐름을 사용합니다. 복귀 주소는 같은 사이트 루트이며, 기존 세션 복원 코드가 인증 코드 교환을 처리합니다. 복귀 URL에서 인증 코드와 오류 값을 지웁니다.
- 인증 취소·실패 안내를 구분합니다. 첫 Google 로그인으로 지역이 없는 경우 마이페이지를 열어 닉네임·지역을 설정하도록 안내합니다. Google의 프로필 이름을 기본 닉네임으로 사용합니다.
- 회원 기록은 기존과 같이 Supabase 사용자 ID와 RLS로 보호합니다. 이메일 문자열을 기준으로 클라이언트가 기록을 병합하지 않습니다.

## 관리자 설정 (필수)

2026-10-26 확인 시 공개 설정은 `external.email: true`, `external.google: false`였습니다. 아래 설정이 완료되기 전에는 실제 Google 인증이 작동하지 않습니다. 프로젝트 공개 키만으로 Google OAuth Client ID/Secret을 만들거나 공급자를 활성화할 수 없습니다.

### 1. Google OAuth 클라이언트 생성

[Google Auth Platform](https://console.cloud.google.com/auth/overview)에서 사용할 프로젝트를 선택하고 앱을 구성합니다.

- Branding: 앱 이름·지원 이메일·개발자 연락처를 설정합니다.
- Audience: 일반 사용자 대상이면 External을 사용합니다. Testing 상태에서는 실제 검증할 Google 계정을 테스트 사용자로 추가합니다. 전체 사용자를 대상으로 공개하기 전에는 Google의 게시·검증 요구 사항을 확인합니다.
- Data Access: `openid`, `userinfo.email`, `userinfo.profile`에 해당하는 기본 로그인 범위를 사용합니다. 메일함·드라이브 접근 권한은 필요하지 않습니다.
- Clients: OAuth client의 애플리케이션 유형을 **Web application**으로 선택합니다.

Authorized JavaScript origins:

```text
https://recyclehelper.vercel.app
```

Authorized redirect URIs:

```text
https://phutcroispzgqqtrpgjn.supabase.co/auth/v1/callback
```

Client ID와 Client Secret을 발급받습니다. Secret은 Supabase 관리자 설정에 직접 입력하고, 채팅·Git·프런트엔드·Vercel 공개 환경변수에 넣지 않습니다.

### 2. Supabase Google 공급자 설정

[프로젝트 대시보드](https://supabase.com/dashboard/project/phutcroispzgqqtrpgjn) → Authentication → Sign In / Providers에서 Google을 열고 활성화한 뒤 Client ID·Client Secret을 입력하고 저장합니다. Email 공급자와 현재 이메일 확인 설정은 그대로 유지합니다.

### 3. Supabase 복귀 URL 설정

Authentication → URL Configuration:

```text
Site URL: https://recyclehelper.vercel.app
Redirect URLs: https://recyclehelper.vercel.app/
```

로컬 검증도 할 경우 실제 사용할 로컬 주소를 별도로 등록합니다. Google 측 redirect URI는 위 Supabase callback 주소이고, Supabase 측 Redirect URL은 웹사이트 주소라는 차이에 유의합니다.

## 실제 검증

1. 로그아웃 상태에서 로그인 화면 → Google로 계속하기를 누릅니다.
2. Google 계정을 선택하고 로그인 동의를 마칩니다.
3. 사이트 복귀 후 로그인 상태와 주소에서 인증 코드가 사라졌는지 확인합니다.
4. 지역이 없는 회원이면 마이페이지에서 닉네임·지역을 저장합니다.
5. 판별·회원 기록 저장·새로고침·로그아웃 후 재로그인 유지 여부를 확인합니다.
6. Google 인증 도중 취소해도 재시도할 수 있는지 확인합니다.

Supabase는 조건에 맞는 동일 이메일의 인증 수단을 자동 연결할 수 있습니다. 다른 이메일의 기존 계정은 별도 계정이며 기록을 임의로 합치지 않습니다. 자동 연결을 통한 기존 계정 보존 여부는 관리자 설정 후 실제 계정으로 추가 검증해야 합니다.

## 검증 결과

- 자동 테스트 64개 통과: 기존 인증·DB/RLS·판별 테스트 포함, Google OAuth 요청/같은 사이트 복귀/미설정 공급자 차단/예상 밖 리다이렉트 거절/오류·콜백 안내/프로필 기본 이름/공개 설정 조회 실패를 추가 검증했습니다.
- 실제 브라우저에서 로그인·가입 화면의 버튼, 공급자 미활성 안내, 기존 이메일 빈 입력 검증을 확인했습니다. 모바일 390×844에서 로그인 화면의 가로 넘침이 없음을 DOM 치수와 화면 이미지로 확인했습니다.
- 실제 Google 계정 선택·동의·Supabase 세션 발급·기존 이메일 계정 자동 연결은 Google 공급자 미설정 때문에 미검증입니다.
- 이번 기능을 위한 SQL 변경은 없습니다. 기존 즐겨찾기·제보·음식물 카탈로그의 추가 SQL은 이 설정과 별개입니다.

## 공식 문서

- [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [인증 복귀 주소](https://supabase.com/docs/guides/auth/redirect-urls)
- [인증 수단 자동 연결](https://supabase.com/docs/guides/auth/auth-identity-linking)
