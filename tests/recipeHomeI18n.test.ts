/**
 * 홈 섹션 문안(`recipe:home.*`).
 *
 * 검사 방식을 두 곳에서 그대로 가져왔다:
 *  - `tests/recipeArchive.test.ts` 의 **영문 안전 낱말 검사**(계약 §1.1: 검수 전 카탈로그에
 *    "safe"/"kidney-friendly"/"approved" 를 붙이면 그 자체가 임상 주장이다). 그 검사는
 *    en 네임스페이스 **전체**를 훑으므로 새 키도 이미 덮인다 — 여기서는 **한국어 쪽**과
 *    "적합성 주장" 낱말을 더한다(그쪽 검사에 한국어가 없다).
 *  - `tests/recipeWrite.test.ts` 의 **"없는 기능을 문구로 약속하지 않는다"**. 시안 부제목은
 *    "매일 바뀌는 메뉴를 확인해보세요" 였는데 그런 동작이 없다 — 175건 카탈로그는 그대로
 *    있고 바뀌는 것은 순서이며, 순서가 바뀌는 계기는 '매일' 이 아니라 '기록할 때마다' 다.
 *
 * 언어는 ko·en 두 개다(`src/i18n/locales`). 새 언어가 생기면 `LOCALES` 에 더한다 —
 * 그러면 아래 모든 검사가 그 언어까지 자동으로 본다.
 */
/* eslint-disable import/first -- i18n 인스턴스가 모듈 로드 시 초기화된다. */
jest.mock("../src/services/core/apiClient", () => ({ api: {} }))

import enRecipe from "../src/i18n/locales/en/recipe.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import i18n from "../src/i18n"

import {
  mealSectionCopyKeys,
  mealSlotStateBadgeKey,
  RECIPE_HOME_EMPTY_COPY_KEY,
  RECIPE_HOME_LIST_TITLE_KEY,
  resolveSlotReasonCopy,
  splitTitleHighlight,
} from "../src/features/recipe/components/list/recipeHomePresentation"
import {
  MEAL_SLOTS,
  MEAL_SLOT_STATES,
  SLOT_REASONS,
} from "../src/features/recipe/types/recipeHome"

const LOCALES = { ko: koRecipe, en: enRecipe } as const
type LocaleKey = keyof typeof LOCALES

/** 점 표기 키를 리소스 객체에서 꺼낸다. 없으면 undefined — 그게 곧 결함이다. */
function lookup(resource: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, leaf) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[leaf]
          : undefined,
      resource,
    )
}

/**
 * 섹션이 실제로 읽는 키 전부 + 화면이 읽는 두 키.
 *
 * `string[]` 로 넓히지 않는다 — i18n 타입이 키를 유니온으로 검사하므로, 넓히면 아래
 * `i18n.t(key)` 가 컴파일되지 않고 캐스트로 통과시키면 **없는 키를 넣어도 조용히
 * 지나간다**(그러면 이 파일의 목적이 사라진다).
 */
const ALL_KEYS = [
  ...MEAL_SLOTS.flatMap((slot) => {
    const keys = mealSectionCopyKeys(slot)
    return [keys.title, keys.subtitle, keys.highlight] as const
  }),
  RECIPE_HOME_EMPTY_COPY_KEY,
  RECIPE_HOME_LIST_TITLE_KEY,
  /*
    끼니 결정 문안. 배지는 끝난 두 상태에만 있고(`OPEN` 은 null — 아직 안 먹은 끼니에는
    아무것도 안 붙는다), 이유 문장은 시계 그대로가 아닌 세 경우에만 있다.
  */
  ...MEAL_SLOT_STATES.map((state) => mealSlotStateBadgeKey(state)).filter(
    (key): key is Exclude<typeof key, null> => key !== null,
  ),
  ...SLOT_REASONS.map((reason) =>
    resolveSlotReasonCopy({
      slot: "LUNCH",
      reason,
      clockSlot: "BREAKFAST",
      isNextDay: false,
      clockSource: "DEFAULT",
    }),
  )
    .filter((copy): copy is Exclude<typeof copy, null> => copy !== null)
    .map((copy) => copy.key),
]

afterAll(async () => {
  // 다른 스위트가 같은 인스턴스를 쓴다 — 언어를 돌려놓는다.
  await i18n.changeLanguage("ko")
})

describe("키가 모든 언어에 있다", () => {
  it("검사할 키를 실제로 모았다", () => {
    // 키 조립이 깨지면 아래 검사가 조용히 통과한다.
    expect(ALL_KEYS).toHaveLength(16)
    expect(new Set(ALL_KEYS).size).toBe(ALL_KEYS.length)
  })

  for (const locale of Object.keys(LOCALES) as LocaleKey[]) {
    it(`${locale} — 16개 키가 다 있고 빈 문자열이 아니다`, () => {
      for (const key of ALL_KEYS) {
        const value = lookup(LOCALES[locale], key)
        expect(typeof value).toBe("string")
        expect((value as string).trim().length).toBeGreaterThan(0)
      }
    })
  }

  it("두 언어의 home 잎 키가 정확히 같다 (한쪽만 늘어나지 않는다)", () => {
    const leaves = (value: unknown, prefix = ""): string[] =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value).flatMap(([key, child]) =>
            leaves(child, prefix ? `${prefix}.${key}` : key),
          )
        : [prefix]
    expect(leaves(koRecipe.home).sort()).toEqual(leaves(enRecipe.home).sort())
  })

  it("i18n 인스턴스로도 읽힌다 (네임스페이스 등록 확인)", async () => {
    for (const locale of Object.keys(LOCALES) as LocaleKey[]) {
      await i18n.changeLanguage(locale)
      for (const key of ALL_KEYS) {
        const translated = i18n.t(key, { ns: "recipe" })
        // 키가 없으면 i18next 는 키 문자열을 그대로 돌려준다 — 화면에 `home.…` 이 찍힌다.
        expect(translated).not.toBe(key)
      }
    }
  })
})

describe("강조어는 제목 안의 부분 문자열이다", () => {
  for (const locale of Object.keys(LOCALES) as LocaleKey[]) {
    it(`${locale} — 세 슬롯 모두 제목에서 강조어를 찾아 쪼갤 수 있다`, () => {
      for (const slot of MEAL_SLOTS) {
        const keys = mealSectionCopyKeys(slot)
        const title = lookup(LOCALES[locale], keys.title) as string
        const highlight = lookup(LOCALES[locale], keys.highlight) as string
        // 못 찾으면 강조가 사라진다(제목은 남지만 시안의 주황 낱말이 없어진다).
        expect(title).toContain(highlight)
        const parts = splitTitleHighlight(title, highlight)
        expect(parts.match).toBe(highlight)
        expect(parts.before + parts.match + parts.after).toBe(title)
      }
    })
  }

  it("강조어를 제목과 따로 그리면 한국어에서 낱말이 두 번 나온다 (그래서 부분 문자열이어야 한다)", () => {
    // 예: highlight "아침" 을 배지로 앞에 붙이면 "아침 오늘의 아침 레시피" 가 된다.
    const title = koRecipe.home.section.breakfast.title
    const highlight = koRecipe.home.section.breakfast.highlight
    expect(`${highlight} ${title}`.split(highlight).length - 1).toBe(2)
  })
})

describe("안전·적합성을 주장하지 않는다 (계약 §1)", () => {
  const BANNED_EN =
    /\b(safe|safely|safety|kidney-friendly|kidney friendly|approved|suitable for you|good for your kidneys|recommended for you|we recommend)\b/i
  /**
   * 한국어 쪽. `recipeArchive.test.ts` 의 검사에는 한국어가 없다 — 같은 주장을 한국어로
   * 쓰면 그 검사를 통과한다. 홈 문안은 새로 쓴 것이라 여기서 막는다.
   */
  const BANNED_KO =
    /(안전|안심|적합|승인|괜찮아요|먹어도 (돼|되)|신장에 좋|콩팥에 좋|건강에 좋)/u

  function walk(value: unknown, path: string, out: string[], re: RegExp) {
    if (typeof value === "string") {
      if (re.test(value)) out.push(`${path} → ${value}`)
      return
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        walk(child, path ? `${path}.${key}` : key, out, re)
      }
    }
  }

  it("영문 home 문안에 안전·적합 낱말이 없다", () => {
    const offenders: string[] = []
    walk(enRecipe.home, "home", offenders, BANNED_EN)
    expect(offenders).toEqual([])
  })

  it("한국어 home 문안에 안전·적합 낱말이 없다", () => {
    const offenders: string[] = []
    walk(koRecipe.home, "home", offenders, BANNED_KO)
    expect(offenders).toEqual([])
  })

  it("검사가 헛돌지 않는다 — 금지 낱말이 든 문장을 실제로 잡는다", () => {
    expect(BANNED_KO.test("신장에 좋은 레시피예요")).toBe(true)
    expect(BANNED_EN.test("Kidney-friendly picks")).toBe(true)
    expect(BANNED_KO.test("빵·달걀·죽처럼 아침에 먹는 요리예요")).toBe(false)
  })

  it("`추천` / `recommend` 를 쓰지 않는다 — 그 판단을 한 주체가 없다", () => {
    /*
      시안 제목은 "오늘의 아침 **추천메뉴**" 였다. 홈 섹션은 남은 참고량 순으로 정렬만 한
      카탈로그 절단면이고(서버는 참고량으로 후보를 거르지 않는다) 앱이 이 끼니에 이 요리를
      권한 것이 아니다. 계약 §1 의 금지 낱말에 "추천 식단" 이 든 것도 같은 이유다.

      정말로 추천 로직이 생기면(예: 남은 참고량으로 후보를 거르는 서버 필터) 이 검사를
      지우기 전에 **누가 무엇을 근거로 권하는지** 먼저 확정해야 한다.
    */
    const offenders: string[] = []
    walk(koRecipe.home, "home", offenders, /추천/u)
    walk(enRecipe.home, "home", offenders, /recommend/iu)
    expect(offenders).toEqual([])
  })
})

describe("없는 기능을 문구로 약속하지 않는다", () => {
  it("'매일 바뀐다' 고 말하지 않는다 — 그런 동작이 없다", () => {
    /*
      시안 부제목: "매일 바뀌는 메뉴를 확인해보세요". 사실이 아니다.
       (a) 목록이 날마다 교체되는 동작은 없다 — 175건 카탈로그는 그대로 있고 순서만 바뀐다.
       (b) 순서가 바뀌는 계기는 '매일' 이 아니라 **'기록할 때마다'** 다(남은 참고량이 변한다).
      날짜 기반 교체가 실제로 생기면 이 검사를 지우고 문구를 되돌려라.
    */
    const koText = JSON.stringify(koRecipe.home)
    const enText = JSON.stringify(enRecipe.home)
    expect(koText).not.toMatch(/매일|날마다|하루에 한 번/u)
    expect(enText).not.toMatch(/\b(every ?day|daily|changes each day)\b/iu)
  })

  it("'오늘' 은 쓴다 — currentSlot 과 참고량이 둘 다 서버 시계의 오늘에서 나온다", () => {
    // 사실인 낱말은 지우지 않는다. 이 검사는 위 검사를 과하게 넓히지 못하게 잡아 둔다.
    expect(koRecipe.home.section.breakfast.title).toContain("오늘")
    expect(enRecipe.home.section.breakfast.title).toMatch(/today/iu)
  })

  it("빈 섹션 문구가 이유와 다음 행동을 둘 다 말한다", () => {
    // "지금은 없어요" 만 쓰면 사용자는 다음에 무엇을 할지 모른다. 문구가 가리키는
    // `home.listTitle`(전체 레시피)이 실제로 그 아래에 있다는 것은 recipeHome.test.ts 가 본다.
    expect(koRecipe.home.section.empty).toMatch(/없어요|없습니다/u)
    expect(koRecipe.home.section.empty).toContain(koRecipe.home.listTitle)
    expect(enRecipe.home.section.empty).toMatch(/\bno recipes\b/iu)
    expect(enRecipe.home.section.empty.toLowerCase()).toContain(
      enRecipe.home.listTitle.toLowerCase(),
    )
  })
})

describe("세 섹션이 서로 다른 것을 말한다", () => {
  it("부제목 셋이 서로 다르다 — 제목만 다른 같은 목록이 아니다", () => {
    // 계약 §2 가 점심·저녁을 요리 성격으로 가른 이유가 "제목만 다른 같은 목록" 방지다.
    // 화면 문구가 그 차이를 말하지 않으면 사용자는 두 섹션이 왜 다른지 알 수 없다.
    for (const resource of [koRecipe, enRecipe]) {
      const subtitles = MEAL_SLOTS.map(
        (slot) =>
          lookup(resource, mealSectionCopyKeys(slot).subtitle) as string,
      )
      expect(new Set(subtitles).size).toBe(3)
    }
  })

  it("부제목이 그 섹션에 모인 요리를 말한다 (071 백필 규칙과 같은 이야기)", () => {
    // MORNING / ONE_BOWL / SOUPY·SIDEY 정규식이 실제로 무엇을 모았는지가 근거다.
    expect(koRecipe.home.section.breakfast.subtitle).toMatch(/빵|달걀|죽/u)
    expect(koRecipe.home.section.lunch.subtitle).toMatch(/덮밥|면|한 그릇/u)
    expect(koRecipe.home.section.dinner.subtitle).toMatch(/국|찌개|반찬/u)
  })

  it("제목 셋과 강조어 셋이 서로 다르다", () => {
    for (const resource of [koRecipe, enRecipe]) {
      for (const leaf of ["title", "highlight"] as const) {
        const values = MEAL_SLOTS.map(
          (slot) => lookup(resource, mealSectionCopyKeys(slot)[leaf]) as string,
        )
        expect(new Set(values).size).toBe(3)
      }
    }
  })
})
