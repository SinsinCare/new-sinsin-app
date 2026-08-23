/**
 * 식당 `AI 식단 상담` — 추천 질문 템플릿.
 *
 * 여기서 잠그는 것은 두 가지다.
 *
 * 1. **없는 질문을 지어내지 않는가.** 메뉴가 0건이거나 프로필이 없어 등급을 말할 수
 *    없거나 한식이 아니면 만들 수 있는 질문이 줄어든다. 시안의 네 줄을 채우려고
 *    빈칸을 메우면 앱이 없는 판정을 말한다.
 * 2. **질문 문장이 서버의 임상 검열에 걸리지 않는가.** 이건 문안 취향이 아니라
 *    기능 정지 문제다 — 「안전」·「괜찮」 같은 낱말이 프롬프트에 실리면 모델이 그대로
 *    되받고, 그 답변이 `unsupported_reassurance` 에 걸려 **통째로 폐기된다.**
 *    사용자는 답 대신 "AI 응답을 마치지 못했어요" 만 본다. 그래서 정본 정규식을
 *    복사해 두고, 옆에 서버 저장소가 있으면 정본과 갈리지 않았는지까지 확인한다.
 *
 * ⚠️ 실측해 두는 사실 하나: 시안 1번 문항(`국물은 얼마나 먹어도 괜찮을까요?`)은
 * 그 정규식에 **걸리지 않는다**(패턴이 요구하는 종결형은 `괜찮아요`/`괜찮습니다`다).
 * 위험한 것은 질문이 아니라 **질문이 부르는 답변**이다 — 「괜찮을까요?」에는
 * 「네, 괜찮아요」가 돌아오고 그 답변이 폐기된다. 아래 "가드가 실제로 문다" 가
 * 그 차이를 그대로 못 박는다.
 */

import * as fs from "fs"
import * as path from "path"

import i18n from "../src/i18n"
import {
  buildConsultQuestions,
  dominantSafetyDriver,
  koreanPairConjunction,
} from "../src/features/restaurant/consult/suggestedQuestions"
import {
  buildRestaurantConsultMessage,
  pickConsultMenuFacts,
} from "../src/features/restaurant/consult/restaurantConsultMessage"
import type { CuisineType, MenuItemDto } from "../src/features/restaurant/types"

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

/** 시안 목업 식당 — 메뉴 3건, 배지가 전부 다르다(D1_1). */
const MOCKUP_MENUS: MenuItemDto[] = [
  menu({
    menuId: 1,
    name: "순대국밥",
    safetyLevel: "RESTRICTED",
    safetyDriver: "sodium",
    safetyRatio: 1.4,
  }),
  menu({
    menuId: 2,
    name: "신신백숙",
    safetyLevel: "CAUTION",
    safetyDriver: "protein",
    safetyRatio: 0.9,
  }),
  menu({
    menuId: 3,
    name: "한상차림",
    safetyLevel: "SAFE",
    safetyDriver: "sodium",
    safetyRatio: 0.4,
  }),
]

function ask(over?: {
  menus?: MenuItemDto[]
  cuisineType?: CuisineType
  profileMissing?: boolean
}) {
  return buildConsultQuestions({
    menus: over?.menus ?? MOCKUP_MENUS,
    cuisineType: over?.cuisineType ?? "KOREAN",
    profileMissing: over?.profileMissing ?? false,
    t,
  })
}

describe("추천 질문 — 만들어진 것만 준다", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("시안 조건(한식 · 프로필 있음 · 배지 3종)에서 네 줄이 나온다", () => {
    expect(ask().map((question) => question.kind)).toEqual([
      "driver",
      "recommend",
      "compare",
      "avoid",
    ])
  })

  it("비교는 **최악 × 최선**이다 — 가운데(주의)를 건너뛴다", () => {
    const compare = ask().find((question) => question.kind === "compare")
    expect(compare?.menuNames).toEqual(["순대국밥", "한상차림"])
    expect(compare?.text).toBe(
      "순대국밥과 한상차림 중 어느 쪽이 신장에 부담이 될까요?",
    )
    expect(compare?.text).not.toContain("신신백숙")
  })

  it("`profileMissing` 이면 비교 질문이 **없다** — 등급 없이 짝지으면 없는 판정이다", () => {
    const kinds = ask({ profileMissing: true }).map((question) => question.kind)
    expect(kinds).not.toContain("compare")
    expect(kinds).toEqual(["driver", "recommend", "avoid"])
  })

  it("등급이 전부 같으면 비교 질문이 없다", () => {
    const flat = MOCKUP_MENUS.map((item) =>
      menu({ ...item, safetyLevel: "CAUTION" }),
    )
    expect(ask({ menus: flat }).map((q) => q.kind)).not.toContain("compare")
  })

  it("`UNKNOWN` 은 판정이 아니다 — 짝짓기에서 빠진다", () => {
    const partial = [
      menu({ menuId: 1, name: "A", safetyLevel: "RESTRICTED" }),
      menu({ menuId: 2, name: "B", safetyLevel: "UNKNOWN" }),
    ]
    expect(ask({ menus: partial }).map((q) => q.kind)).not.toContain("compare")
  })

  it("한식이 아니면 `반찬` 질문이 없다", () => {
    for (const cuisine of ["WESTERN", "JAPANESE", "CHINESE", "ETC"] as const) {
      expect(ask({ cuisineType: cuisine }).map((q) => q.kind)).not.toContain(
        "avoid",
      )
    }
  })

  /*
    메뉴 0건이면 `recommend` 도 빠진다 — 2026-08-21 에 계약이 좁아졌다.

    앞 판본은 `recommend` 를 "식당·프로필과 무관한 상수" 로 보고 늘 실었다. 프로필과 무관한
    것은 맞지만 **메뉴와는 무관하지 않다**: 메뉴 0건이면 같은 화면의 메뉴 섹션이 아예 안
    그려지는데(`HomeTab` 은 `previewMenus.length > 0` 일 때만) AI 섹션만 "추천하는 메뉴는
    무엇인가요?" 를 묻게 된다. 우리가 모르는 것을 아는 척 묻는 것이고 모델도 일반론밖에
    답할 수 없다.

    그래서 0건 + 비한식이면 질문이 **0개**가 되고 `AiConsultSection` 이 섹션을 접는다.
    0개를 "번역이 빈 경우의 방어" 로만 읽지 말 것 — 정상 경로다.
  */
  it("메뉴 0건이면 한 줄 이하이고, 빈 문자열이 없다", () => {
    const questions = ask({ menus: [] })
    expect(questions.length).toBeLessThanOrEqual(1)
    expect(questions.map((q) => q.kind)).toEqual(["avoid"])
    for (const question of questions) {
      expect(question.text.trim()).not.toBe("")
      expect(question.text).not.toContain("restaurant.consult")
    }
  })

  it("메뉴를 지목하는 것은 비교 질문뿐이다", () => {
    for (const question of ask()) {
      expect(question.menuNames).toHaveLength(
        question.kind === "compare" ? 2 : 0,
      )
    }
  })

  it("DTO 이름에 공백이 붙어 있어도 비교 질문이 숫자를 싣는다", () => {
    /*
      질문을 만드는 쪽은 문장에 넣는 것과 같은 **trim 된** 이름을 `menuNames` 에 담는다.
      그 이름으로 다시 DTO 를 찾는 쪽(`pickConsultMenuFacts`)이 원본과 `===` 로 맞추면
      공백 한 칸에 아무것도 못 찾고, 비교 질문이 `[메뉴]` 블록 **없이** 나간다 —
      모델은 두 메뉴를 이름만 보고 비교하게 되는데 화면에는 아무 표시도 없다.
    */
    const padded = MOCKUP_MENUS.map((item) =>
      menu({ ...item, name: ` ${item.name} ` }),
    )
    const compare = ask({ menus: padded }).find((q) => q.kind === "compare")

    expect(compare?.menuNames).toEqual(["순대국밥", "한상차림"])

    const text = buildRestaurantConsultMessage({
      question: compare?.text ?? "",
      restaurantName: "장호덕손만두",
      cuisineLabel: t("restaurant.cuisine.KOREAN"),
      menus: pickConsultMenuFacts(padded, compare?.menuNames ?? []),
      t,
    })

    expect(text).toContain("- 순대국밥: ")
    expect(text).toContain("- 한상차림: ")
    expect(text).not.toContain("-  순대국밥")
  })
})

describe("지배 영양소 질문", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("최빈값을 고른다", () => {
    expect(dominantSafetyDriver(MOCKUP_MENUS)).toBe("sodium")
    expect(ask().find((question) => question.kind === "driver")?.text).toBe(
      "나트륨이 가장 많은 메뉴는 어떤 건가요?",
    )
  })

  it("동률이면 선언 순서로 — 같은 식당에서 질문이 흔들리지 않는다", () => {
    const tied = [
      menu({ menuId: 1, name: "A", safetyDriver: "protein" }),
      menu({ menuId: 2, name: "B", safetyDriver: "potassium" }),
    ]
    expect(dominantSafetyDriver(tied)).toBe("potassium")
  })

  it("`safetyDriver` 가 하나도 없으면 질문 자체가 없다", () => {
    const none = MOCKUP_MENUS.map((item) =>
      menu({ ...item, safetyDriver: null }),
    )
    expect(dominantSafetyDriver(none)).toBeNull()
    expect(ask({ menus: none }).map((q) => q.kind)).not.toContain("driver")
  })

  it("`restaurant.safety.driver.*` 어휘만 쓴다 — 사전 매칭이 없다", () => {
    for (const driver of [
      "sodium",
      "potassium",
      "phosphorus",
      "protein",
    ] as const) {
      const questions = ask({
        menus: [menu({ name: "A", safetyDriver: driver })],
      })
      const text = questions.find((q) => q.kind === "driver")?.text ?? ""
      expect(text).toContain(t(`restaurant.safety.driver.${driver}`))
    }
    /*
      시안 1번(`국물은 얼마나…`)을 이름·설명 키워드 매칭으로 되살리면 회 전문점에서
      국물을 묻고 영어 로케일에서 통째로 무너진다. 그 낱말이 다시 들어오면 여기서 빨개진다.
    */
    const text = ask()
      .map((question) => question.text)
      .join(" ")
    for (const word of ["국물", "찌개", "전골", "탕"]) {
      expect(text).not.toContain(word)
    }
  })
})

describe("한국어 접속 조사", () => {
  it("받침이 있으면 `과`, 없으면 `와`", () => {
    expect(koreanPairConjunction("순대국밥")).toBe("과")
    expect(koreanPairConjunction("한상차림")).toBe("과")
    expect(koreanPairConjunction("김치찌개")).toBe("와")
    expect(koreanPairConjunction("파스타")).toBe("와")
  })

  it("한글이 아닌 끝글자·빈 문자열에서도 던지지 않는다", () => {
    expect(koreanPairConjunction("Pasta")).toBe("과")
    expect(koreanPairConjunction("세트 2")).toBe("과")
    expect(koreanPairConjunction("")).toBe("과")
  })
})

/* ─────────────────── 임상 검열 회귀 가드 (되돌리면 기능이 죽는다) ─────────────────── */

/**
 * `sinsin-be-bun/src/safety/highRiskClaims.ts` 의 `unsupported_reassurance` 정본을
 * **문자 단위로 복사**한 것이다. 서버 저장소가 옆에 없어도 이 가드가 돌아야 하므로
 * 복사본을 두고, 옆에 있으면 아래 드리프트 테스트가 정본과 대조한다.
 */
const UNSUPPORTED_REASSURANCE_KO =
  "안심하세요|안전(?:한|해요|합니다)|걱정하지 마세요|" +
  "(?:먹어도|드셔도|섭취해도)?.{0,8}괜찮(?:아요|습니다)|" +
  "문제없(?:어요|습니다)|적합(?:해요|합니다)|무리 없(?:는|어요|습니다)"

const UNSUPPORTED_REASSURANCE_EN =
  "\\b(?:completely\\s+)?safe\\b|\\byou(?:'re|\\s+are)\\s+all\\s+set\\b|" +
  "\\bnothing\\s+to\\s+worry\\s+about\\b|\\bno\\s+need\\s+to\\s+worry\\b|" +
  "\\bperfect(?:ly)?\\s+(?:fine|healthy)\\b|" +
  "\\bdon'?t\\s+worry\\b|\\bno\\s+worries\\b|\\bno\\s+problems?\\b|" +
  "\\byou(?:'re|\\s+are)\\s+(?:fine|okay|ok|good|in\\s+the\\s+clear)\\b|" +
  "\\b(?:that|this|it)(?:'s|\\s+is)\\s+(?:fine|okay|ok|no\\s+problem)\\b|" +
  "\\b(?:it'?s\\s+)?(?:okay|ok|fine|safe)\\s+to\\s+" +
  "(?:eat|have|drink|take)\\b|" +
  "\\bin\\s+a\\s+good\\s+place\\b"

const SERVER_HIGH_RISK_CLAIMS = path.resolve(
  __dirname,
  "../../sinsin-be-bun/src/safety/highRiskClaims.ts",
)

/** 정본 파일에서 한 패턴의 `source` 를 이어 붙여 되돌린다. 없으면 `null`. */
function patternSourceFromServer(id: string): string | null {
  if (!fs.existsSync(SERVER_HIGH_RISK_CLAIMS)) return null
  const file = fs.readFileSync(SERVER_HIGH_RISK_CLAIMS, "utf8")
  const start = file.indexOf(`id: "${id}"`)
  if (start < 0) return null
  const body = /source:\s*([\s\S]*?),\n\s*\},/.exec(file.slice(start))
  if (!body) return null
  return Array.from(body[1].matchAll(/"((?:[^"\\]|\\.)*)"/g))
    .map((match) => match[1])
    .join("")
    .replace(/\\(.)/g, (_, ch: string) => (ch === "n" ? "\n" : ch))
}

/** 모든 갈래의 질문 문장 + 그 질문이 실제로 실려 나가는 원문. */
function everyOutboundString(): string[] {
  const scenarios = [
    ask(),
    ask({ profileMissing: true }),
    ask({ cuisineType: "WESTERN" }),
    ask({ menus: [] }),
    ask({ menus: [menu({ name: "회정식", safetyDriver: "potassium" })] }),
  ]
  return scenarios.flat().flatMap((question) => [
    question.text,
    buildRestaurantConsultMessage({
      question: question.text,
      restaurantName: "장호덕손만두",
      cuisineLabel: t("restaurant.cuisine.KOREAN"),
      menus: [],
      t,
    }),
  ])
}

describe("질문 문안은 서버 임상 검열에 걸리지 않는다", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("어떤 질문에도 `안전`/`안심`/`괜찮` 이 들어가지 않는다", () => {
    for (const text of everyOutboundString()) {
      for (const word of ["안전", "안심", "괜찮"]) {
        expect(text).not.toContain(word)
      }
    }
  })

  it("정본 `unsupported_reassurance` 정규식에 한 문장도 걸리지 않는다 (ko·en)", async () => {
    const ko = new RegExp(UNSUPPORTED_REASSURANCE_KO)
    const en = new RegExp(UNSUPPORTED_REASSURANCE_EN, "i")

    for (const language of ["ko", "en"] as const) {
      await i18n.changeLanguage(language)
      for (const text of everyOutboundString()) {
        expect(ko.test(text)).toBe(false)
        expect(en.test(text)).toBe(false)
      }
    }
  })

  it("가드가 실제로 문다 — 질문이 부르는 **답변**이 폐기되는 모양", () => {
    const ko = new RegExp(UNSUPPORTED_REASSURANCE_KO)
    const en = new RegExp(UNSUPPORTED_REASSURANCE_EN, "i")

    /*
      실측 주의: 시안 1번 원문 `국물은 얼마나 먹어도 괜찮을까요?` 는 이 패턴에
      **걸리지 않는다**(패턴이 요구하는 것은 `괜찮아요`/`괜찮습니다` 종결형이다).
      즉 위험한 것은 질문 문장 자체가 아니라 **그 질문이 부르는 답변**이다 —
      「괜찮을까요?」에는 「네, 괜찮아요」가 돌아오고 그 답변이 통째로 폐기된다.
      그래서 이 저장소의 규칙은 "질문에 그 낱말을 넣지 않는다" 이고, 아래가 그
      낱말이 실제로 무엇을 죽이는지 보여 준다.
    */
    expect(ko.test("국물은 얼마나 먹어도 괜찮을까요?")).toBe(false)
    expect(ko.test("네, 조금이면 괜찮아요")).toBe(true)
    expect(ko.test("이 메뉴는 안전해요")).toBe(true)
    expect(ko.test("신장 환자에게 적합합니다")).toBe(true)
    expect(en.test("This menu is completely safe")).toBe(true)
    expect(en.test("Don't worry about the sodium")).toBe(true)
  })

  it("복사본이 서버 정본과 갈리지 않았다 (옆에 저장소가 있을 때)", () => {
    const ko = patternSourceFromServer("unsupported_reassurance")
    const en = patternSourceFromServer("unsupported_reassurance_en")

    // 이 저장소만 클론한 환경(CI)에서는 대조할 정본이 없다 — 그때는 복사본이
    // 비어 있지 않다는 것만 확인하고 넘어간다. 위 세 테스트는 그래도 돈다.
    if (ko === null || en === null) {
      expect(UNSUPPORTED_REASSURANCE_KO.length).toBeGreaterThan(0)
      expect(UNSUPPORTED_REASSURANCE_EN.length).toBeGreaterThan(0)
      return
    }

    expect(ko).toBe(UNSUPPORTED_REASSURANCE_KO)
    expect(en).toBe(UNSUPPORTED_REASSURANCE_EN)
  })
})
