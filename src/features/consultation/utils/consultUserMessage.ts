/**
 * 사용자 말풍선이 **어느 카드로 그려지는가** — 세 파서의 우선순위 정본.
 *
 * `/consult` 에는 서로 다른 세 표면이 만든 유저 메시지가 섞여 들어온다:
 * 식이리포트 "물어보기"(`foodConsultMessage`), 건강검진 "질문하기"(`examConsultMessage`),
 * 식당 상세 `AI 식단 상담` 시트(`restaurantConsultMessage`). 서버에는 **텍스트만** 남으므로
 * 상담 기록에서 대화를 다시 열면 세 원문이 전부 같은 버블로 되돌아온다 —
 * 즉 우선순위를 정하는 자리는 화면이 아니라 **여기 한 곳**이다.
 *
 * ## 이 모듈이 생긴 이유 (실제로 난 사고)
 *
 * 식당 시트가 보낸 메시지가 `/consult` 에서 **`FoodConsultCard`** 로 그려졌다.
 * 「식사 기록 · 한식」 눈썹을 달고 메뉴 영양소가 표로 떴다 — **앱이 사용자가 그 식당에서
 * 그 메뉴들을 먹었다고 주장한 것이다.** 원인은 라벨 문자열이 아니라 **줄 구조**다.
 * 두 빌더가 같은 문법을 쓴다:
 *
 *  - 값이 있는 첫 `[…]` 줄 → 식사 파서는 그것을 무조건 **제목**으로 삼는다(`[식당] 장호덕손만두`).
 *  - 값이 없는 `[…]` 줄 → 그 아래를 **음식별 상세**로 읽기 시작한다(`[메뉴]`).
 *  - `- 이름: 열량 480kcal, 단백질 22g, …` → 두 빌더 모두 `t("mealReport.nutrients.*")` 라벨과
 *    같은 단위를 쓰므로 영양소 쌍까지 그대로 파싱된다.
 *
 * 근거: 메뉴를 하나도 싣지 않은 식당 메시지는 식사 파서가 `null` 을 준다(제목은 잡히지만
 * `totals`·`foods` 가 둘 다 비어 마지막 관문에 걸린다). 걸리게 만드는 것은 `- ` 줄이다.
 *
 * ## 왜 「식당 먼저」가 답이 아니었나
 *
 * 처음 처방은 "`UserBubble` 에서 식당 파서를 식사 파서보다 먼저 시도" 였다. 당시
 * `parseRestaurantConsultMessage` 는 라벨을 안 보고 "`[` 로 시작하는 줄이 하나라도 있는가" 만
 * 봐서 **식사·검진 메시지도 전부 통과시켰고**, 그대로 앞에 세웠으면 `/consult` 의 식사 카드와
 * 검진 카드가 둘 다 평문으로 무너졌을 것이다. 그래서 순서가 아니라 **증거의 세기**로 세운다.
 *
 * 2026-08-21 에 식당 파서가 좁아졌다 — 이제 빌더의 모양(질문 · **빈 줄 하나** · 머리줄과
 * `- ` 항목뿐)을 요구한다. 식사·검진 빌더는 질문 **바로 다음 줄**부터 섹션을 쓰므로
 * 출고 원문끼리는 더 이상 겹치지 않는다. 그렇다고 아래 순서를 지울 수는 없다:
 * 저장·재조회·손편집으로 빈 줄 하나가 끼면 겹침이 그대로 돌아오고, 위험한 방향은 여전히
 * 반대쪽(식사 파서가 식당 원문을 문다)이다. 증거로 세운 순서는 그 두 경우를 다 견딘다.
 *
 * ## 순서와 근거
 *
 * 1. **검진** — 가장 좁다. 지표 줄이 `- 이름 값 단위 (상태, 참고범위 …)` 라 괄호가 필수이고,
 *    날짜·요약 섹션은 번역기로 만든 키와 정확히 맞아야 한다. 식당·식사 원문은 여기 안 걸린다(실측).
 * 2. **식사 — 단, `totals` 가 잡혔을 때만.** `totals` 는 *섹션 값*이 영양소 나열로 파싱될 때만
 *    생기는데(`[영양소] 열량 600kcal, …`), 식당 빌더는 영양소를 **`- ` 줄에만** 싣고 섹션 값으로는
 *    절대 내보내지 않는다(그 빌더가 영양소 정규식을 일부러 안 가져간 이유이기도 하다).
 *    그래서 `totals` 는 **식사 전용 증거**다. 반대로 출고되는 식사 메시지에는 이 섹션이 항상 있다:
 *    컨텍스트의 `total` 은 `FoodCameraNutritionTotal` 이고 열량·단백질·탄수화물·지방이
 *    **필수 number** 라 총 영양소 줄이 비는 경로가 없다.
 * 3. **식당** — 구조 판별만 하는 넓은 그물이므로 위 둘을 걸러낸 **뒤에** 놓는다. 맞으면 카드가
 *    아니라 **질문 한 줄짜리 평문 버블**이다(시트의 `ConsultUserBubble` 과 같은 계약).
 * 4. **식사(증거 약함)** — 3 이 `null` 일 때만 남는다. 식당 파서는 질문 머리가 있어야 하므로,
 *    프롬프트가 잘려 `[` 줄로 시작하는 과거 원문이 여기로 온다. 카드로 그리는 편이 낫다.
 *
 * 2 와 3 사이가 이 기능에서 **유일하게 애매한 구간**이다. 총 영양소가 없는 식사 원문은
 * 식당 원문과 구조가 완전히 같아서 어떤 파서로도 못 가른다. 그때 이 함수는 **평문 버블**을
 * 고른다 — 카드를 그리면 "무엇을 먹었다" 는 사실을 주장하게 되고, 모를 때 주장하는 것보다
 * 안 그리는 쪽이 언제나 안전하다.
 *
 * ## 왜 후보를 **전부** 받게 만들었나
 *
 * 이 결함은 새 표면(식당 시트)이 생겼는데 `/consult` 쪽 체인에 아무도 그 파서를 안 끼워서
 * 났다. 인자를 세 개 다 요구하면 **하나를 빠뜨린 채로는 호출 자체가 안 된다** — 같은 함정을
 * 다음 표면이 다시 밟을 수 없게 타입으로 막는 것이 이 모양의 목적이다.
 * 지연 호출(thunk)인 이유는 순서대로 필요한 것만 파싱하기 위해서다.
 */

import type { ExamConsultCardData } from "./examConsultMessage"
import type { FoodConsultCardData } from "./foodConsultMessage"

/** `null` 은 "카드 아님" — 버블이 원문을 그대로 그린다. */
export type ConsultUserCard =
  | { kind: "restaurant"; question: string }
  | { kind: "food"; data: FoodConsultCardData }
  | { kind: "exam"; data: ExamConsultCardData }
  | null

export interface ConsultUserCardCandidates {
  restaurant: () => { question: string } | null
  food: () => FoodConsultCardData | null
  exam: () => ExamConsultCardData | null
}

export function resolveConsultUserCard(
  candidates: ConsultUserCardCandidates,
): ConsultUserCard {
  const exam = candidates.exam()
  if (exam) return { kind: "exam", data: exam }

  // `totals` 는 섹션 값이 영양소 나열일 때만 생긴다 — 식당 빌더가 만들 수 없는 모양이다.
  const food = candidates.food()
  if (food && food.totals.length > 0) return { kind: "food", data: food }

  const restaurant = candidates.restaurant()
  if (restaurant) return { kind: "restaurant", question: restaurant.question }

  return food ? { kind: "food", data: food } : null
}
