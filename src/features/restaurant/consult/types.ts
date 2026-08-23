/**
 * 식당 상세 · `AI 식단 상담` 이 공유하는 **순수 계약**.
 *
 * 이 폴더에는 컴포넌트가 없다. 시트 UI(`components/consult/`)와 홈탭 진입점
 * (`components/detail/AiConsultSection.tsx`)이 **같은 문장·같은 포맷**을 말하도록
 * 문자열을 만드는 쪽만 여기 모은다. 렌더러가 없는 테스트 환경에서
 * (`jest.config.ts` 의 `testEnvironment: "node"`) 못 박을 수 있는 것이 정확히 이 층이다.
 *
 * ## 여기 없는 것 — 그리고 왜 없는지
 *
 * **안전 등급(`safetyLevel`) 라벨이 프롬프트로 나가지 않는다.** 「안전」이라는 낱말을
 * 실어 보내면 모델이 「이 메뉴는 안전해요」로 되받고, 그 문장이 서버의
 * `unsupported_reassurance`(`sinsin-be-bun/src/safety/highRiskClaims.ts:54`)에 걸려
 * **답변 전체가 폐기된다.** 사용자는 답 대신 "AI 응답을 마치지 못했어요" 만 본다.
 * 등급은 **어떤 질문을 보여 줄지 고르는 쪽에만** 쓰고(`suggestedQuestions.ts`),
 * 실려 나가는 것은 **메뉴 이름과 숫자뿐**이다(`ConsultMenuFact`).
 * 회귀는 `tests/restaurantConsultQuestions.test.ts` 가 그 정규식을 직접 걸어 막는다.
 *
 * **합계 영양소(`total`)가 없다.** 사용자가 이 집에서 무엇을 몇 인분 먹는지 우리는
 * 모른다 — 합계는 없는 사실이다. `진단하기` 경로도 같은 이유로 `total` 을 일부러
 * 비워 보낸다(`views/RestaurantDetailScreen.tsx` 의 `buildDiagnoseParams`).
 */

/** i18n `t`. `useTranslation()` 의 `t` 를 그대로 넘길 수 있는 최소 모양. */
export type ConsultTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string

/**
 * 추천 질문 4종.
 *
 * - `driver` — 이 집 메뉴들의 판정을 주도한 영양소를 묻는다.
 *   시안 1번 문항은 `국물은 얼마나 먹어도 괜찮을까요?` 였지만 **`국물` 은 어떤 필드에도
 *   없다**(목업 식당이 국밥집이었을 뿐이다). 그대로 옮기면 회 전문점에서 국물을 묻는다.
 *   서버가 이미 주는 `menus[].safetyDriver` 로 바꿔 말한다.
 *   덤으로 원문의 `괜찮` 이 사라진다 — 그 낱말은 「네, 괜찮아요」라는 답변을 부르고
 *   그 답변이 위 헤더의 검열 패턴에 걸린다(질문이 아니라 답변이 폐기된다).
 * - `recommend` — 상수.
 * - `compare` — 최악 등급 × 최선 등급 두 메뉴를 짝짓는다. 등급을 말할 수 없는 상태
 *   (`profileMissing`)에서는 **만들지 않는다.**
 * - `avoid` — `반찬` 은 한식 전제다. `cuisineType === "KOREAN"` 일 때만.
 */
export type ConsultQuestionKind = "driver" | "recommend" | "compare" | "avoid"

export interface ConsultQuestion {
  kind: ConsultQuestionKind
  /** 화면에 그리는 문장이자 대화에 저장되는 원문. 앞뒤 공백 없음. */
  text: string
  /**
   * 이 질문이 **실제로 지목한** 메뉴 이름. 지목하지 않았으면 빈 배열이다.
   *
   * 비교 질문만 2건이고 나머지는 0건이다. 여기에 메뉴를 더 얹으면 시트가
   * `진단하기`(메뉴 8건 전량 숫자)와 같은 답을 하게 되고 두 진입이 중복이 된다.
   */
  menuNames: string[]
}

/**
 * 프롬프트에 실려 나가는 메뉴 1건. **이름과 숫자뿐이다.**
 *
 * `MenuItemDto` 를 통째로 넘기지 않는 것이 요점이다 — 그 DTO 에는 `safetyLevel`
 * (안전/주의/제한)과 `legacyRiskLevel`/`legacyRiskNutrients` 가 붙어 있고, 셋 다
 * 프롬프트에 실으면 안 되는 값이다(위 헤더 · `types/index.ts` 의 legacy 주석).
 * 좁은 타입 하나가 그 사고를 컴파일 단계에서 막는다.
 *
 * 단위는 `MenuItemDto` 와 같다 — 열량 kcal, 단백질 g, 나머지 셋 mg.
 */
export interface ConsultMenuFact {
  name: string
  calories: number | null
  protein: number | null
  sodium: number | null
  potassium: number | null
  phosphorus: number | null
}
