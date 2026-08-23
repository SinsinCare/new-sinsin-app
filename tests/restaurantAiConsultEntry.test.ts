/**
 * 식당 상세 → `AI 식단 상담` 의 **진입점** 계약.
 *
 * 이 파일이 지키는 것은 시트 안이 아니라 시트로 들어가는 문이다 —
 * 홈 탭의 섹션(`AiConsultSection`), 그것이 앉은 자리(`HomeTab`), 그리고 시트를 소유하는
 * 자리(`RestaurantDetailScreen`).
 *
 * ## 왜 소스를 읽는가
 *
 * `jest.config.ts` 는 `testEnvironment: "node"` 이고 이 저장소에는
 * `@testing-library/react-native` 도 `react-test-renderer` 도 없다. 게다가 `testMatch` 가
 * `.test.ts` 만 잡아서 **`.tsx` 는 아예 수집되지 않는다.** 그래서 컴포넌트가 실제로 어떻게
 * 그려지는지는 여기서 못 본다. 볼 수 있는 것은 "무엇을 어디에 배선했는가" 까지고,
 * 그건 `restaurantDetailReset.test.ts`·`restaurantDetailDensity.test.ts` 등 30여 개가
 * 이미 쓰는 방식이다. 픽셀 대조는 사람 몫이다.
 *
 * 소스는 **주석을 걷어내고**(`codeOnly`) 본다. 이 저장소의 주석은 하지 말아야 할 것을
 * 코드 모양 그대로 인용하므로(이 기능만 해도 "`paddingRight: spacing[12]` 를 주면"),
 * 원문에 대고 금지어를 세면 잘 고쳐 놓은 파일이 자기 주석에 걸린다.
 *
 * ## 여기서 못 잡는 것 (정직하게)
 *
 * - 섹션이 실제로 40pt 알약으로 그려지는지, `AI` 만 브랜드색인지.
 * - 시트가 몇 pt 로 뜨는지 — 그건 `restaurantAiConsultSurface.test.ts` 도 못 잡는다.
 * - 질문을 눌렀을 때 서버에 무엇이 갔는지. 프롬프트 자체는
 *   `restaurantConsultMessage.test.ts` 가 순수 함수로 잠근다.
 */

import fs from "fs"
import path from "path"

import i18n from "../src/i18n"
import { codeOnly } from "./helpers/codeOnly"
import { hasCommonKeyInBothLocales } from "./helpers/i18nResourceKeys"
import { iconSize } from "../src/design-system-v2/tokens/size"
import { radius } from "../src/design-system-v2/tokens/radius"
import { spacing } from "../src/design-system-v2/tokens/spacing"
import { typography } from "../src/design-system-v2/tokens/typography"
import { buildConsultQuestions } from "../src/features/restaurant/consult/suggestedQuestions"
import type { CuisineType, MenuItemDto } from "../src/features/restaurant/types"

const FEATURE = path.join(__dirname, "..", "src", "features", "restaurant")
const read = (...parts: string[]) =>
  fs.readFileSync(path.join(FEATURE, ...parts), "utf8")

const SECTION_RAW = read("components", "detail", "AiConsultSection.tsx")
const HOME_RAW = read("components", "detail", "HomeTab.tsx")
const SCREEN_RAW = read("views", "RestaurantDetailScreen.tsx")

const SECTION = codeOnly(SECTION_RAW)
const HOME = codeOnly(HOME_RAW)
const SCREEN = codeOnly(SCREEN_RAW)

const t = (key: string, options?: Record<string, unknown>): string =>
  (i18n.t as unknown as (k: string, o?: Record<string, unknown>) => string)(
    key,
    options,
  )

function menu(over: Partial<MenuItemDto> & { name: string }): MenuItemDto {
  return {
    menuId: 1,
    description: null,
    price: 12000,
    imageUrl: null,
    isSignature: false,
    calories: 480,
    protein: 22,
    sodium: 1720,
    potassium: 640,
    phosphorus: 230,
    safetyLevel: "CAUTION",
    safetyDriver: "sodium",
    safetyRatio: 0.8,
    confidence: "ESTIMATED",
    legacyRiskLevel: null,
    legacyRiskNutrients: [],
    ...over,
  }
}

describe("AI 식단 상담 섹션은 사진과 후기 **사이**에 있다", () => {
  /*
    자리가 계약인 이유: 이 섹션이 하단 바의 `진단하기` 와 갈리는 유일한 사실 중 하나가
    **읽는 순간**이다. `진단하기` 는 스크롤과 무관하게 늘 떠 있는 판정 CTA 고, 이 섹션은
    스크롤로 지나가며 만나는 질문 목록이다. 맨 위로 올리면 둘이 같은 것을 요구하는
    것처럼 읽히고, 후기 뒤로 내리면 대부분의 사용자가 보지 못한다.
  */
  const photoAt = HOME.indexOf("restaurant.detail.photoSection")
  const consultAt = HOME.indexOf("<AiConsultSection")
  const reviewAt = HOME.indexOf("restaurant.detail.reviewSection")

  it("세 자리가 모두 배선돼 있다", () => {
    expect(photoAt).toBeGreaterThan(-1)
    expect(consultAt).toBeGreaterThan(-1)
    expect(reviewAt).toBeGreaterThan(-1)
  })

  it("사진 블록 뒤, 후기 블록 앞이다", () => {
    expect(consultAt).toBeGreaterThan(photoAt)
    expect(consultAt).toBeLessThan(reviewAt)
  })

  it("앞에 전폭 띠가 붙는다 — 형제 섹션과 같은 끊는 방식", () => {
    // 섹션 바로 앞의 조건부 블록 안에 `V2Divider variant="thick"` 이 있어야 한다.
    const guardAt = HOME.indexOf("consultQuestions.length > 0")
    expect(guardAt).toBeGreaterThan(-1)
    expect(guardAt).toBeLessThan(consultAt)
    const between = HOME.slice(guardAt, consultAt)
    expect(between).toContain('<V2Divider variant="thick" />')
  })

  it("질문이 0개면 띠도 섹션도 그리지 않는다", () => {
    /*
      띠를 조건 밖에 두면 질문이 없는 식당에서 띠 둘이 붙어 빈 회색 덩어리가 남는다.
      그래서 개수는 **홈 탭이** 먼저 세고, 섹션 자체도 한 번 더 방어한다.
    */
    expect(HOME).toMatch(/consultQuestions\.length > 0 && \(/)
    expect(SECTION).toContain("if (questions.length === 0) return null")
  })
})

describe("이 섹션에는 채움 버튼이 없다", () => {
  /*
    이 화면의 채움(브랜드 면) 버튼은 하단 바의 `진단하기` 하나뿐이다. 여기에 오렌지 CTA 를
    넣는 순간 한 화면에 채움이 둘이 되고, 사용자는 둘 중 무엇이 이 화면의 결론인지 모른다.
    시안도 정확히 그 규칙을 지킨다 — 행은 회색 면, 브랜드색은 번호에만, CTA 는 테두리다.
  */
  it("`V2Button` 을 쓰지 않는다", () => {
    expect(SECTION).not.toContain("V2Button")
  })

  it("채움 variant / 브랜드 color 를 지정하지 않는다", () => {
    expect(SECTION).not.toMatch(/variant=["']fill["']/)
    expect(SECTION).not.toMatch(/color=["']brand["']/)
  })

  it("면(`backgroundColor`)에 브랜드색을 칠하지 않는다", () => {
    const fills = [...SECTION.matchAll(/backgroundColor:\s*([^,\n}]+)/g)].map(
      (match) => match[1].trim(),
    )
    expect(fills.length).toBeGreaterThan(0)
    for (const fill of fills) {
      expect(fill).toBe("colors.fill.alternative")
    }
  })

  it("CTA 는 형제 섹션과 같은 `OutlinePill` 이다", () => {
    expect(SECTION).toContain("<OutlinePill")
    expect(SECTION).toContain("showChevron")
  })
})

describe("`진단하기` 경로는 손대지 않았다", () => {
  /*
    두 진입을 실제로 가르는 유일한 사실이 **진단만 메뉴 8건 전량의 숫자를 대화에
    싣는다**는 것이다. 이 상한이 사라지거나 상담 시트가 같은 컨텍스트를 실으면
    `진단하기` 는 그날로 중복이 된다.
  */
  it("`DIAGNOSE_MENU_LIMIT` 이 8 그대로다", () => {
    expect(SCREEN).toMatch(/const DIAGNOSE_MENU_LIMIT = 8\b/)
  })

  it("`buildDiagnoseParams` 가 그대로 있고 진단만 그것을 쓴다", () => {
    expect(SCREEN).toMatch(/function buildDiagnoseParams\(/)
    expect(SCREEN).toContain(
      "params: buildDiagnoseParams(restaurantId, name, menus.menus)",
    )
    // 진단은 여전히 화면을 떠난다(시트가 아니다).
    expect(SCREEN).toMatch(/pathname:\s*["']\/consult["']/)
  })

  it("상담 시트 진입은 `buildDiagnoseParams` 도 라우터도 쓰지 않는다", () => {
    const start = SCREEN.indexOf("const handleAskAi = useCallback(")
    expect(start).toBeGreaterThan(-1)
    const body = SCREEN.slice(
      start,
      SCREEN.indexOf("const handleToggleBookmark"),
    )
    expect(body).not.toContain("buildDiagnoseParams")
    expect(body).not.toContain("router.push")
    expect(body).not.toContain("foodConsultContext")
  })

  it("`total`(합계 영양소)을 어디서도 만들지 않는다", () => {
    // 몇 인분을 먹는지 모르므로 합계는 없는 사실이다. 진단 경로가 먼저 내린 결정이다.
    for (const source of [SECTION, HOME]) {
      expect(source).not.toMatch(/\btotal\s*:/)
    }
  })
})

describe("시트 호스트는 껍데기가 아니라 `RestaurantDetailBody` 안에 있다", () => {
  /*
    껍데기 `RestaurantDetailScreen` 은 인스턴스 키만 붙이고 상태를 갖지 않는다 — 거기에
    `useState` 를 두면 식당 id 가 바뀌어도 상태가 살아남아 다른 가게의 상담이 열린다.
    그리고 호스트는 **대화를 소유**하므로(`useChat`) 시트가 닫혀도 마운트돼 있어야 한다.
  */
  const bodyAt = SCREEN.indexOf("function RestaurantDetailBody(")
  const hostAt = SCREEN.indexOf("<RestaurantConsultSheetHost")

  it("본문 컴포넌트 안에서 마운트된다", () => {
    expect(bodyAt).toBeGreaterThan(-1)
    expect(hostAt).toBeGreaterThan(bodyAt)
  })

  it("상태 둘이 본문 안에 있다", () => {
    const shell = SCREEN.slice(
      SCREEN.indexOf("export function RestaurantDetailScreen("),
      bodyAt,
    )
    expect(shell).not.toContain("useState")
    expect(SCREEN).toContain("const [consultOpen, setConsultOpen] = useState")
    expect(SCREEN).toMatch(/const \[consultRequest, setConsultRequest\]/)
  })

  it("`visible` 로 감싸지 않는다 — 감싸면 닫을 때마다 대화가 사라진다", () => {
    const mount = SCREEN.slice(hostAt, hostAt + 400)
    expect(mount).toContain("visible={consultOpen}")
    /*
      `consultOpen` 은 **오직 `visible` prop 으로만** 쓰인다. 조건부 렌더로 쓰는 순간
      (`{consultOpen && <RestaurantConsultSheetHost …>}`) 시트를 닫을 때마다 호스트가
      언마운트되고 `useChat` 의 정리가 대화를 통째로 버린다 — "물어보고 닫았다가 다시
      열었더니 아무것도 없다". `&&` 가 어디에 붙든 걸리게 파일 전체에 건다.
    */
    expect(SCREEN).not.toMatch(/consultOpen\s*&&/)
  })

  it("매번 새 `requestId` 를 만든다 — 같은 질문을 두 번 눌러도 두 번 간다", () => {
    expect(SCREEN).toMatch(
      /requestId:\s*`restaurant-\$\{restaurantId\}-\$\{question\.kind\}-\$\{Date\.now\(\)\}`/,
    )
  })

  it("`질문하기` 는 요청 없이(빈 상태로) 연다", () => {
    const start = SCREEN.indexOf("const handleAskAi = useCallback(")
    const body = SCREEN.slice(
      start,
      SCREEN.indexOf("const handleToggleBookmark"),
    )
    expect(body).toContain(": null,")
    expect(body).toContain("setConsultOpen(true)")
  })
})

describe("섹션은 v2 토큰 위에만 앉는다", () => {
  it("리터럴 hex 색이 없다", () => {
    expect(SECTION).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(SECTION).not.toMatch(/\brgba?\(/)
  })

  it("색은 전부 `useV2Theme()` 에서 온다", () => {
    expect(SECTION).toContain("useV2Theme()")
    expect(SECTION).toContain("colors.fill.alternative")
    expect(SECTION).toContain("colors.primary.primary")
    expect(SECTION).toContain("colors.label.normal")
    expect(SECTION).toContain("colors.label.neutral")
    expect(SECTION).toContain("colors.label.assistive")
  })

  it("`fontWeight` 를 직접 주지 않는다 — 주면 OS 기본 서체가 나온다", () => {
    expect(SECTION).not.toContain("fontWeight")
    expect(SECTION).not.toContain("fontSize")
  })

  it("타이포는 실측이 가리킨 네 토큰이다", () => {
    // 실측 근거는 컴포넌트 머리말의 표에 있다. 값 자체가 아니라 **토큰 이름**을 잠근다.
    expect(SECTION).toContain("typography.title.xSmall") // 제목 17 Bold
    expect(SECTION).toContain("typography.subtext.small") // 부제 12 Regular
    expect(SECTION).toContain("typography.label.smallStrong") // 번호 15 Bold
    expect(SECTION).toContain("typography.label.xSmallWeak") // 질문 13 Medium
    expect(typography.title.xSmall.fontSize).toBe(17)
    expect(typography.subtext.small.fontSize).toBe(12)
    expect(typography.label.smallStrong.fontSize).toBe(15)
    expect(typography.label.xSmallWeak.fontSize).toBe(13)
  })

  it("행은 알약이고 간격은 6, 셰브론은 sm 이다", () => {
    expect(SECTION).toContain("borderRadius: radius.full")
    expect(SECTION).toContain("gap: spacing[6]")
    expect(SECTION).toContain("size={iconSize.sm}")
    expect(radius.full).toBeGreaterThan(1000)
    expect(spacing[6]).toBe(6)
    expect(iconSize.sm).toBe(20)
  })

  it("셰브론 상자가 아니라 **잉크**를 면 오른쪽에 맞춘다", () => {
    /*
      `icon-chevron-right.svg` 는 24 상자 안에서 잉크가 좌우 8/24 씩 안쪽이다.
      `iconSize.sm`(20)이면 6.67. 시안의 잉크 오른쪽 끝은 면에서 12.67 안쪽이므로
      상자 오른쪽은 6.0 이어야 한다. 12 를 주면 오른쪽만 6 더 허전해진다.
    */
    expect(SECTION).toContain("paddingRight: spacing[6]")
    expect(SECTION).toContain("paddingLeft: spacing[12]")
    const inkInset = (8 / 24) * iconSize.sm
    expect(spacing[6] + inkInset).toBeCloseTo(12.67, 1)
  })

  it("격자는 `layout.ts` 에서 가져온다 — 숫자를 새로 만들지 않는다", () => {
    expect(SECTION).toMatch(
      /import \{ GUTTER, SECTION_GAP, SECTION_TITLE_GAP \} from "\.\.\/\.\.\/layout"/,
    )
    expect(SECTION).toContain("paddingHorizontal: GUTTER")
    expect(SECTION).toContain("paddingVertical: SECTION_GAP")
    expect(SECTION).toContain("marginBottom: SECTION_TITLE_GAP")
  })

  it("질문은 한 줄로 자른다", () => {
    expect(SECTION).toContain("numberOfLines={1}")
  })
})

describe("계측", () => {
  it("질문 탭은 갈래와 자리를 함께 센다", () => {
    expect(SECTION).toContain(
      'trackAnalyticsEvent("restaurant_ai_consult_question_tap"',
    )
    const call = SECTION.slice(
      SECTION.indexOf(
        'trackAnalyticsEvent("restaurant_ai_consult_question_tap"',
      ),
    ).slice(0, 300)
    expect(call).toContain("restaurant_id: restaurantId")
    expect(call).toContain("kind: question.kind")
    expect(call).toContain("index,")
  })

  it("질문 **문장**은 싣지 않는다", () => {
    const call = SECTION.slice(
      SECTION.indexOf(
        'trackAnalyticsEvent("restaurant_ai_consult_question_tap"',
      ),
    ).slice(0, 300)
    expect(call).not.toContain("question.text")
  })

  it("지도의 AI 검색 이벤트를 재사용하지 않는다", () => {
    expect(SECTION).not.toContain("restaurant_ai_search")
    // 진단 이벤트와도 섞지 않는다 — 두 진입의 수를 따로 세야 한다.
    expect(SECTION).not.toContain("restaurant_diagnose_tap")
  })
})

describe("문구는 ko/en 양쪽에 있다", () => {
  const keys = [
    "restaurant.consult.sectionTitle",
    "restaurant.consult.sectionTitleAccent",
    "restaurant.consult.sectionSubtitle",
    "restaurant.consult.askCta",
    "restaurant.consult.questionAccessibility",
  ]
  it.each(keys)("%s", (key) => {
    expect(hasCommonKeyInBothLocales(key)).toBe(true)
  })

  it("제목 안에서 강조 조각을 찾을 수 있다 — 못 찾으면 한 톤으로 눕는다", () => {
    /*
      조각을 이어 붙이지 않고 **한 문장 안에서 자리를 찾는** 이유는 사이의 공백을
      코드가 지어내지 않기 위해서다. 그래서 강조 문자열이 제목 안에 실제로 있어야
      두 톤이 나온다. ko/en 둘 다 확인한다.
    */
    for (const locale of ["ko", "en"] as const) {
      void i18n.changeLanguage(locale)
      const title = t("restaurant.consult.sectionTitle")
      const accent = t("restaurant.consult.sectionTitleAccent")
      expect(accent).not.toBe("")
      expect(title.indexOf(accent)).toBeGreaterThanOrEqual(0)
    }
    void i18n.changeLanguage("ko")
  })
})

describe("행 수는 4 고정이 아니다 (섹션이 받는 실제 입력)", () => {
  const build = (
    menus: MenuItemDto[],
    cuisineType: CuisineType,
    profileMissing: boolean,
  ) => buildConsultQuestions({ menus, cuisineType, profileMissing, t })

  it("메뉴 3건 한식 + 프로필 있음 = 시안의 네 줄", () => {
    const menus = [
      menu({ menuId: 1, name: "순대국밥", safetyLevel: "RESTRICTED" }),
      menu({ menuId: 2, name: "신신백숙", safetyLevel: "CAUTION" }),
      menu({ menuId: 3, name: "한상차림", safetyLevel: "SAFE" }),
    ]
    expect(build(menus, "KOREAN", false)).toHaveLength(4)
  })

  it("프로필이 없으면 비교 질문이 빠진다", () => {
    const menus = [
      menu({ menuId: 1, name: "순대국밥" }),
      menu({ menuId: 2, name: "한상차림" }),
    ]
    const kinds = build(menus, "KOREAN", true).map((q) => q.kind)
    expect(kinds).not.toContain("compare")
  })

  /*
    2026-08-21: `recommend` 가 `menus.length > 0` 조건을 얻으면서 이 조합이 **0개**가 됐다.
    그래서 `length === 0` 분기는 "번역이 빈 경우의 방어" 가 아니라 **정상 경로**다 —
    메뉴를 모르는 식당에서는 AI 섹션이 통째로 접힌다. 같은 화면의 메뉴 섹션도 그때 안 그려진다.
  */
  it("메뉴 0건 · 비한식이면 질문이 하나도 없다 — 섹션이 접힌다", () => {
    expect(build([], "WESTERN", false)).toEqual([])
  })

  it("메뉴 0건이라도 한식이면 반찬 질문 하나는 남는다", () => {
    const questions = build([], "KOREAN", false)
    expect(questions.map((q) => q.kind)).toEqual(["avoid"])
    expect(questions[0].text).not.toBe("")
  })

  it("어떤 갈래도 두 번 나오지 않는다 — `key={question.kind}` 의 전제", () => {
    const menus = [
      menu({ menuId: 1, name: "순대국밥", safetyLevel: "RESTRICTED" }),
      menu({ menuId: 2, name: "한상차림", safetyLevel: "SAFE" }),
    ]
    for (const cuisine of ["KOREAN", "WESTERN"] as CuisineType[]) {
      for (const missing of [true, false]) {
        const kinds = build(menus, cuisine, missing).map((q) => q.kind)
        expect(new Set(kinds).size).toBe(kinds.length)
      }
    }
    expect(SECTION).toContain("key={question.kind}")
  })
})
