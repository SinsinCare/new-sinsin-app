/**
 * 홈탭 `AI 식단 상담` 섹션이 그리는 **추천 질문**을 만든다.
 *
 * 전부 결정적이다 — 모델도, 난수도, 시각도 쓰지 않는다. 같은 식당·같은 프로필이면
 * 언제나 같은 질문이 같은 순서로 나온다. 그래야 `tests/restaurantConsultQuestions.test.ts`
 * 가 문장 자체를 잠글 수 있고, 사용자가 화면을 다시 열었을 때 질문이 안 바뀐다.
 *
 * ## 행 수는 4 고정이 아니다 (되돌리지 말 것)
 *
 * 시안은 네 줄이지만 그건 **목업 식당이 메뉴 3건짜리 한식집이고 프로필이 있는** 경우다.
 * 메뉴가 0건이거나, 프로필이 없어 등급을 말할 수 없거나, 한식이 아니면 만들 수 있는
 * 질문이 2~3개다. 빈칸을 채우려고 없는 질문을 지어내면 **앱이 없는 판정을 말하게 된다**
 * (회 전문점에서 `국물은 얼마나…`, 프로필 없이 `어느 쪽이 부담…`). 만들어진 것만 준다.
 *
 * ## 등급은 여기서만 쓴다
 *
 * `safetyLevel`(안전/주의/제한)은 **어느 두 메뉴를 짝지을지 고르는 데만** 쓰고
 * 문장에도 프롬프트에도 싣지 않는다. 이유는 `types.ts` 머리말에 적었다 — 「안전」이라는
 * 낱말 하나가 모델의 답변 전체를 폐기시킨다.
 */

import type {
  CuisineType,
  MenuItemDto,
  SafetyDriver,
  SafetyLevel,
} from "../types"
import type { ConsultQuestion, ConsultTranslate } from "./types"

/**
 * 최빈값 동률일 때의 우선순위. `SafetyDriver` 선언 순서 그대로다
 * (`types/index.ts` — `sodium | potassium | phosphorus | protein`).
 * 순서를 바꾸면 같은 식당에서 다른 질문이 뜬다.
 */
const DRIVER_PRIORITY: readonly SafetyDriver[] = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
]

/** 비교 정렬 축. `UNKNOWN`(0)은 **판정이 없다는 뜻**이라 짝짓기에서 아예 뺀다. */
const LEVEL_RANK: Record<SafetyLevel, number> = {
  RESTRICTED: 3,
  CAUTION: 2,
  SAFE: 1,
  UNKNOWN: 0,
}

/**
 * 이 집 메뉴들의 판정을 가장 자주 주도한 영양소. 하나도 없으면 `null`.
 *
 * ⚠️ `driverCounts` 는 **카드 DTO 에만** 있고 상세 응답에는 없다. 상세에서는
 * `menus[].safetyDriver` 를 직접 세는 수밖에 없다.
 */
export function dominantSafetyDriver(
  menus: MenuItemDto[],
): SafetyDriver | null {
  const counts = new Map<SafetyDriver, number>()
  for (const menu of menus) {
    if (!menu.safetyDriver) continue
    counts.set(menu.safetyDriver, (counts.get(menu.safetyDriver) ?? 0) + 1)
  }
  let winner: SafetyDriver | null = null
  let best = 0
  for (const driver of DRIVER_PRIORITY) {
    const count = counts.get(driver) ?? 0
    if (count > best) {
      best = count
      winner = driver
    }
  }
  return winner
}

/**
 * 한국어 접속 조사. 받침이 있으면 `과`, 없으면 `와`.
 *
 * 시안 3번 문항이 `순대국밥과 한상차림 중…` 이다. `{{first}}과` 로 굳혀 두면
 * `김치찌개과`, `파스타과` 가 나온다 — 메뉴 이름은 모음으로 끝나는 쪽이 오히려 흔하다.
 * 한글이 아닌 글자로 끝나면(영문·숫자) 판정할 근거가 없으므로 `과` 로 둔다.
 * 영어 로케일 문장은 이 값을 아예 쓰지 않는다.
 */
export function koreanPairConjunction(name: string): "과" | "와" {
  const code = name.trim().slice(-1).charCodeAt(0)
  if (!Number.isFinite(code) || code < 0xac00 || code > 0xd7a3) return "과"
  // 유니코드 한글 음절 = ((초성 × 21) + 중성) × 28 + 종성. 나머지 0 이면 받침 없음.
  return (code - 0xac00) % 28 === 0 ? "와" : "과"
}

/** 비교 질문에 쓸 (최악, 최선) 짝. 조건이 하나라도 안 맞으면 `null`. */
function comparePair(
  menus: MenuItemDto[],
  profileMissing: boolean,
): [MenuItemDto, MenuItemDto] | null {
  /*
    프로필이 없으면 `safetyLevel` 이 전부 `UNKNOWN` 이고, 이 저장소는 그 상태에서
    등급을 말하지 않는 규칙을 이미 못 박아 두었다(`MenuRow` · `HomeTab`).
    등급 없이 "어느 쪽이 부담" 을 물으면 근거 없는 짝짓기가 된다.
  */
  if (profileMissing) return null

  const judged = menus.filter(
    (menu) => LEVEL_RANK[menu.safetyLevel] > 0 && menu.name.trim() !== "",
  )
  if (judged.length < 2) return null

  const ratio = (menu: MenuItemDto) => menu.safetyRatio ?? 0
  let worst = judged[0]
  let best = judged[0]
  for (const menu of judged.slice(1)) {
    const rank = LEVEL_RANK[menu.safetyLevel]
    if (
      rank > LEVEL_RANK[worst.safetyLevel] ||
      (rank === LEVEL_RANK[worst.safetyLevel] && ratio(menu) > ratio(worst))
    ) {
      worst = menu
    }
    if (
      rank < LEVEL_RANK[best.safetyLevel] ||
      (rank === LEVEL_RANK[best.safetyLevel] && ratio(menu) < ratio(best))
    ) {
      best = menu
    }
  }

  if (worst.menuId === best.menuId) return null
  // 등급이 전부 같으면 비교가 무의미하다 — 시안도 제한 × 안전을 짝지었다.
  if (worst.safetyLevel === best.safetyLevel) return null
  return [worst, best]
}

export function buildConsultQuestions(input: {
  menus: MenuItemDto[]
  cuisineType: CuisineType
  profileMissing: boolean
  t: ConsultTranslate
}): ConsultQuestion[] {
  const { menus, cuisineType, profileMissing, t } = input
  const questions: ConsultQuestion[] = []

  // 1. 지배 영양소 — 시안 1번(`국물…`)의 대체. 메뉴를 지목하지 않는다.
  const driver = dominantSafetyDriver(menus)
  if (driver) {
    questions.push({
      kind: "driver",
      text: t("restaurant.consult.q.driver", {
        driver: t(`restaurant.safety.driver.${driver}`),
      }),
      menuNames: [],
    })
  }

  /*
    2. 메뉴가 한 건이라도 있을 때만.

    프로필과는 무관하지만 **메뉴와는 무관하지 않다.** 메뉴 0건이면 같은 화면의 메뉴 섹션이
    아예 안 그려지는데(`HomeTab` 은 `previewMenus.length > 0` 일 때만 그린다) AI 섹션만
    "추천하는 메뉴는 무엇인가요?" 를 묻는 모양이 된다 — 우리가 모르는 것을 아는 척 묻는 것이고,
    모델도 일반론밖에 답할 수 없다. 저장소 원칙("모르면 '모른다'로 두고 건드리지 말 것")대로
    질문 자체를 만들지 않는다. 그 결과 비한식·메뉴 0건 식당은 질문이 0개가 되고,
    `AiConsultSection` 이 섹션을 통째로 접는다 — 의도한 동작이다.
  */
  if (menus.length > 0) {
    questions.push({
      kind: "recommend",
      text: t("restaurant.consult.q.recommend"),
      menuNames: [],
    })
  }

  // 3. 최악 등급 × 최선 등급. **이 질문만** 메뉴를 지목한다.
  const pair = comparePair(menus, profileMissing)
  if (pair) {
    const [worst, best] = pair
    questions.push({
      kind: "compare",
      text: t("restaurant.consult.q.compare", {
        first: worst.name.trim(),
        second: best.name.trim(),
        conj: koreanPairConjunction(worst.name),
      }),
      menuNames: [worst.name.trim(), best.name.trim()],
    })
  }

  // 4. `반찬` 은 한식 전제다. 파스타집에서 반찬을 묻지 않는다.
  if (cuisineType === "KOREAN") {
    questions.push({
      kind: "avoid",
      text: t("restaurant.consult.q.avoid"),
      menuNames: [],
    })
  }

  // 번역이 비면 빈 알약이 그려진다. 없는 질문은 그리지 않는 편이 낫다.
  return questions
    .map((question) => ({ ...question, text: question.text.trim() }))
    .filter((question) => question.text !== "")
}
