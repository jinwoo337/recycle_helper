# 미등록 물품 AI 안내 (Gemini) 설정

카탈로그에 없는 물건 이름을 입력하면 입력 화면에 **"🤖 AI에게 물어보기"** 버튼이 나타납니다. 누르면 Gemini가 물건을 정해진 재질·경로 중 하나로 분류하고, 실제 배출 방법은 기존 규칙(`rules.js`)이 정합니다.

## 동작 원칙

- AI는 `재질`, `세부 종류`, `경로(recyclable / general / large / hazardous / unknown)`, `확신도`, `한 문장 근거`만 답합니다. 목록 밖의 값이면 버립니다.
- **recyclable**: AI가 고른 재질·종류를 입력란에 채우고, 오염·결합 여부는 사용자가 직접 답합니다. 판별은 기존 규칙 그대로입니다. 사용자가 재질을 바꾸면 "추가 확인 필요"로 안내합니다.
- **general / large**: 정해진 안내 문구(종량제봉투 / 대형폐기물 신고)를 보여 줍니다. 확신도가 high일 때만 "일반 배출"로 분류하고, 그 외에는 "추가 확인 필요"로 저장합니다.
- **hazardous**: 확신도와 관계없이 별도 수거·안전 처리 안내를 보여 줍니다.
- 확신도가 **low**이거나 **unknown**이면 배출 방법을 정하지 않습니다.
- 등록된 품목과 이름에 위험 단서(배터리·스프레이 등)가 있는 품목은 AI 결과를 사용하지 않습니다.
- 결과에는 "🤖 AI 추정 결과" 안내와 AI 근거 문장이 표시됩니다. 회원 정보는 AI로 보내지 않고 물건 이름만 보냅니다.

## 관련 파일

| 파일 | 역할 |
| --- | --- |
| `api/classify.js` | Vercel 서버리스 함수. `GET /api/classify?name=물건이름` → Gemini 호출, 응답 검증, 호출 제한, CDN 캐시 |
| `src/domain/disposal/ai-classification.js` | AI 응답 검증, Gemini 응답 스키마와 지시문 |
| `src/services/ai-classify.js` | 브라우저에서 `/api/classify` 호출 |
| `src/domain/disposal/rules.js` | `input.aiGuess`가 있는 미등록 품목 판별 (`aiOnlyOutcome`, `finishAi`) |
| `src/pages/item-input/item-input.js` | "AI에게 물어보기" 버튼과 결과 배지 |
| `src/styles/ai.css` | AI 안내 상자·배지 스타일 |
| `tests/ai-classification.test.js` | 검증·판별·서버 함수·브라우저 서비스 테스트 (Gemini는 가짜 응답) |

## 설정 순서

1. **Gemini API 키 발급**: [Google AI Studio](https://aistudio.google.com/app/apikey)에서 키를 만듭니다. Gemini API 약관상 만 18세 이상만 사용할 수 있으므로 보호자나 지도 교사 계정으로 발급하세요.
2. **Vercel 환경변수 등록**: Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - `GEMINI_API_KEY` = 발급한 키 (필수)
   - `GEMINI_MODEL` = 사용할 모델 이름 (선택, 기본값 `gemini-3.8-flash`. AI Studio에서 현재 제공되는 모델 이름을 확인하세요. `gemini-2.5-flash` 같은 2.x 모델은 새로 만든 키에서 404로 거절될 수 있습니다)
   - `GEMINI_FALLBACK_MODEL` = 예비 모델 이름 (선택). 비워 두면 키로 쓸 수 있는 모델 목록에서 가벼운 flash 모델(flash-lite 우선)을 자동으로 골라 1시간 기억합니다. 기본 모델이 붐비거나(503) 없을 때(404) 사용합니다.
   - `GEMINI_THINKING_LEVEL` = 생각 단계 (선택, 기본 `low`로 빠르게 답함. `off`면 생각 설정을 보내지 않음). 모델이 거절하면 자동으로 생각 설정 없이 다시 부릅니다.
   - `AI_RATE_LIMIT_PER_MINUTE` (선택, 기본 10) / `AI_DAILY_LIMIT` (선택, 기본 500)
3. **다시 배포**: 환경변수는 새 배포부터 적용됩니다. Deployments에서 Redeploy 하거나 새로 push합니다.
4. **확인**: 배포 사이트에서 `실리콘 주걱`처럼 카탈로그에 없는 이름을 입력하고 "AI에게 물어보기"를 누릅니다.

키를 코드, `.env` 커밋, 채팅에 붙여 넣지 마세요. 키가 노출되면 AI Studio에서 즉시 삭제하고 새로 만드세요.

## 로컬에서 시험하기

```sh
# PowerShell
$env:GEMINI_API_KEY="발급한 키"; npm start
```

`scripts/serve.js`가 `/api/classify`를 Vercel 함수와 같은 방식으로 실행합니다. 키가 없으면 "AI 안내가 아직 설정되지 않았어요"가 표시되고, VS Code Live Server처럼 `/api`가 없는 서버에서는 "배포된 사이트에서 사용할 수 있어요"가 표시됩니다.

## 비용과 한계

- 같은 이름은 Vercel CDN 캐시(7일)와 함수 메모리 캐시로 다시 호출하지 않습니다.
- Gemini가 붐비면(503) 기본 모델 → 0.6초 뒤 기본 모델 → 예비 모델 → 기본 모델 순으로 25초 안에서 시도합니다. 그래도 실패하면 "AI 사용자가 많아 잠시 응답하지 못했어요"가 표시됩니다.
- 미등록 이름(2글자 이상)을 0.7초 동안 그대로 두면 브라우저가 미리 AI에 물어봐 둡니다. "AI에게 물어보기"를 누르면 같은 요청을 이어 받아 대개 바로 결과가 나옵니다. 같은 이름의 요청은 하나로 합칩니다.
- 호출 제한은 함수 인스턴스 메모리 기준이라 완벽하지 않습니다. 사용자가 많아지면 Supabase 테이블이나 Vercel KV 기반 제한·캐시로 바꾸는 것을 권장합니다.
- 무료 사용량과 데이터 활용 조건은 Google 정책에 따라 바뀔 수 있으니 AI Studio에서 확인하세요.
- AI 추정은 자동 테스트로 "형식과 안전장치"만 검증했습니다. 실제 Gemini 응답의 정확도는 검증하지 않았습니다.
