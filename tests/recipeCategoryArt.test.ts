/**
 * 카테고리 일러스트 매핑 + 카테고리 캐러셀.
 *
 * ## 여기서 막는 사고
 *
 *  1. **빈칸·깨진 그림.** 서버는 `category` 를 로케일에 맞춰 번역해서 보낸다
 *     (`한식` / `Korean` / `Salads`). 표기 하나를 빠뜨리면 영어 앱에서 카드의 사진
 *     자리가 통째로 빈칸이 된다. 못 찾는 값이 **null 로 떨어져 중립 도형이 나오는 것**은
 *     결함이 아니라 설계다(`밥`·`Other` 에 억지로 한식 그림을 붙이면 "한식으로
 *     분류됐다" 는, 데이터에 없는 주장이 된다).
 *  2. **눌러도 0건인 죽은 칩.** 시안에는 일곱 번째로 `기타` 가 있었는데 그 카테고리는
 *     DB 에 0건이다. 캐러셀 목록은 **DB 를 실제로 세서** 맞춰야 한다 — 아래
 *     `CATEGORY_CENSUS` 가 그 실측이고, 카탈로그가 바뀌면 이 표를 같이 고쳐야 한다.
 *  3. **매핑이 두 곳에 적히는 것.** 카드의 그림과 캐러셀의 그림이 조용히 달라지고,
 *     호출부가 `한식 → korean` 표를 다시 적으면 필터가 0건을 준다(아카이브 훅 주석에
 *     이미 기록된 결함이다).
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import {
  buildRecipeCategoryCarouselItems,
  RECIPE_CATEGORY_ART_KEYS,
  RECIPE_CATEGORY_KEYS_WITH_ROWS,
  RECIPE_CATEGORY_MATCH,
  recipeCategoryOptionKeyForQueryValue,
  resolveRecipeCategoryArtKey,
} from "../src/features/recipe/components/list/recipeCategoryArtModel"
import {
  EMPTY_RECIPE_FILTERS,
  RECIPE_FILTER_GROUP_VIEWS,
  toggleRecipeFilter,
  toRecipeListQueryFilters,
} from "../src/features/recipe/components/list/recipeListFilterModel"

/**
 * 개발 DB 실측(2026-07-30):
 *   psql -c "select category, count(*) from recipe group by 1 order by 2 desc"
 * → 한식 67 · 양식 36 · 일식 23 · 중식 23 · 디저트 14 · 샐러드 12  (합 175 = 카탈로그 전체)
 *
 * `음료`·`기타` 는 **행이 하나도 없다.** 필터 모델에는 옵션이 있지만 캐러셀에 그리면
 * 눌러도 0건인 버튼이 된다.
 */
const CATEGORY_CENSUS: Readonly<Record<string, number>> = {
  한식: 67,
  양식: 36,
  일식: 23,
  중식: 23,
  디저트: 14,
  샐러드: 12,
}
const CATALOG_TOTAL = 175

describe("resolveRecipeCategoryArtKey — 어떤 표기로 와도 그림을 찾는다", () => {
  it("DB 원본(한국어)을 매칭한다", () => {
    for (const [value, key] of [
      ["한식", "korean"],
      ["중식", "chinese"],
      ["일식", "japanese"],
      ["양식", "western"],
      ["샐러드", "salad"],
      ["디저트", "dessert"],
      ["음료", "beverage"],
    ] as const) {
      expect(resolveRecipeCategoryArtKey(value)).toBe(key)
    }
  })

  it("서버 영문 표기(CATEGORY_EN)를 매칭한다 — 영어 앱에서 빈칸이 되지 않는다", () => {
    for (const [value, key] of [
      ["Korean", "korean"],
      ["Chinese", "chinese"],
      ["Japanese", "japanese"],
      ["Western", "western"],
      ["Salad", "salad"],
      ["Dessert", "dessert"],
      ["Beverage", "beverage"],
    ] as const) {
      expect(resolveRecipeCategoryArtKey(value)).toBe(key)
    }
  })

  it("앱 i18n 영문 라벨(복수형)도 매칭한다 — 서버는 단수, 앱 라벨은 복수다", () => {
    // 서버 `Salad`/`Dessert`/`Beverage` vs 앱 `Salads`/`Desserts`/`Drinks`.
    // 한쪽만 넣어 두면 어느 경로에서 온 값이냐에 따라 그림이 사라진다.
    expect(resolveRecipeCategoryArtKey("Salads")).toBe("salad")
    expect(resolveRecipeCategoryArtKey("Desserts")).toBe("dessert")
    expect(resolveRecipeCategoryArtKey("Drinks")).toBe("beverage")
  })

  it("화면 옵션 키를 그대로 넘겨도 깨지지 않는다", () => {
    for (const key of RECIPE_CATEGORY_ART_KEYS) {
      expect(resolveRecipeCategoryArtKey(key)).toBe(key)
    }
  })

  it("대소문자·앞뒤 공백에 흔들리지 않는다", () => {
    expect(resolveRecipeCategoryArtKey("  KOREAN  ")).toBe("korean")
    expect(resolveRecipeCategoryArtKey(" 한식 ")).toBe("korean")
    expect(resolveRecipeCategoryArtKey("kOrEaN")).toBe("korean")
  })

  it("모르는 값·빈 값·null 은 null 이다 → 화면이 중립 도형을 그린다(빈칸이 아니다)", () => {
    // `CATEGORY_EN` 에 실제로 있는 값들이다. 억지로 그림을 붙이지 않는 것이 설계다.
    for (const value of [
      "",
      "   ",
      "기타",
      "Other",
      "밥",
      "면",
      "반찬",
      "국",
      "간식",
      "직접 작성",
      null,
      undefined,
    ]) {
      expect(resolveRecipeCategoryArtKey(value)).toBeNull()
    }
  })
})

describe("매핑 표의 무결성", () => {
  it("키가 중복되지 않고 선언된 키 목록과 정확히 같다", () => {
    const keys = RECIPE_CATEGORY_MATCH.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect([...keys].sort()).toEqual([...RECIPE_CATEGORY_ART_KEYS].sort())
  })

  it("match 표기가 겹치지 않는다 — 한 표기가 두 그림을 가리키면 순서가 결과를 정한다", () => {
    const all = RECIPE_CATEGORY_MATCH.flatMap((entry) => entry.match)
    expect(new Set(all).size).toBe(all.length)
  })

  it("match 표기가 전부 소문자다 — 비교를 소문자로 하므로 대문자는 죽은 항목이 된다", () => {
    for (const token of RECIPE_CATEGORY_MATCH.flatMap((e) => e.match)) {
      expect(token).toBe(token.toLowerCase())
      expect(token.trim()).toBe(token)
    }
  })

  it("일러스트 키가 필터 모델의 카테고리 옵션 키에서 온다 — 새 키를 지어내지 않았다", () => {
    const optionKeys = new Set(
      RECIPE_FILTER_GROUP_VIEWS.find((g) => g.key === "category")?.options.map(
        (o) => o.key,
      ),
    )
    for (const key of RECIPE_CATEGORY_ART_KEYS) {
      expect([...optionKeys]).toContain(key)
    }
  })
})

describe("캐러셀 항목 — DB 에 행이 있는 6개", () => {
  const items = buildRecipeCategoryCarouselItems()

  it("6개이고 기타·음료가 없다", () => {
    expect(items.map((item) => item.key)).toEqual([
      "korean",
      "chinese",
      "japanese",
      "western",
      "salad",
      "dessert",
    ])
    expect(items.map((item) => item.key)).not.toContain("beverage")
  })

  it("순서가 필터 모델 선언 순서와 같다 — 같은 화면의 필터 시트와 어긋나지 않는다", () => {
    // 같은 여섯 칩이 캐러셀과 `RecipeFilterSheet` 두 곳에 나온다. 순서가 다르면
    // 사용자가 같은 목록을 두 번 읽어야 한다(건수 순을 버린 이유).
    const declared = (
      RECIPE_FILTER_GROUP_VIEWS.find((g) => g.key === "category")?.options ?? []
    )
      .filter((option) =>
        (RECIPE_CATEGORY_KEYS_WITH_ROWS as readonly string[]).includes(
          option.key,
        ),
      )
      .map((option) => option.key)
    expect(items.map((item) => item.key)).toEqual(declared)
  })

  it("그리는 카테고리가 DB 실측과 정확히 일치한다 — 죽은 버튼도, 빠진 카테고리도 없다", () => {
    const drawn = items.map((item) => item.queryValue).sort()
    const inDb = Object.keys(CATEGORY_CENSUS).sort()
    expect(drawn).toEqual(inDb)
    // 실측이 카탈로그 전체를 덮는지 — 합이 175 가 아니면 census 가 오래된 것이다.
    expect(Object.values(CATEGORY_CENSUS).reduce((sum, n) => sum + n, 0)).toBe(
      CATALOG_TOTAL,
    )
    // 0건 카테고리는 census 에 아예 없다(있으면 위 비교가 실패한다).
    expect(CATEGORY_CENSUS["음료"]).toBeUndefined()
    expect(CATEGORY_CENSUS["기타"]).toBeUndefined()
  })

  it("라벨 키가 필터 모델의 라벨 키 그대로다 — 라벨을 두 벌 두지 않았다", () => {
    const byKey = new Map(
      (
        RECIPE_FILTER_GROUP_VIEWS.find((g) => g.key === "category")?.options ??
        []
      ).map((option) => [option.key, option]),
    )
    for (const item of items) {
      expect(item.labelKey).toBe(byKey.get(item.key)?.labelKey)
      expect(item.queryValue).toBe(byKey.get(item.key)?.queryValue)
    }
  })

  it("모든 항목에 그림이 있다 — 하나라도 빠지면 두 표가 어긋났다는 신호다", () => {
    for (const item of items) {
      expect(resolveRecipeCategoryArtKey(item.queryValue)).toBe(item.key)
    }
  })
})

describe("캐러셀이 넘기는 값은 서버로 나가는 표기다", () => {
  it("queryValue → 옵션 키 왕복이 손실 없다", () => {
    for (const item of buildRecipeCategoryCarouselItems()) {
      expect(recipeCategoryOptionKeyForQueryValue(item.queryValue)).toBe(
        item.key,
      )
    }
  })

  it("화면 키·영문 표기·모르는 값은 null 이다 — 조용히 다른 카테고리로 떨어지지 않는다", () => {
    // 여기서 `korean` 이 `korean` 으로 통과해 버리면, 화면 키를 그대로 넘긴 호출부가
    // 통과하는 척하다가 서버에 `korean` 을 보내 0건을 받는다.
    expect(recipeCategoryOptionKeyForQueryValue("korean")).toBeNull()
    expect(recipeCategoryOptionKeyForQueryValue("Korean")).toBeNull()
    expect(recipeCategoryOptionKeyForQueryValue("기타")).toBeNull()
    expect(recipeCategoryOptionKeyForQueryValue("")).toBeNull()
  })

  it("캐러셀에서 누른 것이 기존 필터 모델의 카테고리를 토글한다 (새 상태를 만들지 않았다)", () => {
    const item = buildRecipeCategoryCarouselItems()[0]
    const optionKey = recipeCategoryOptionKeyForQueryValue(item.queryValue)
    expect(optionKey).not.toBeNull()

    // 화면(`app/(tabs)/recipe.tsx::handleToggleCategory`)이 하는 것과 같은 순서.
    const on = toggleRecipeFilter(
      EMPTY_RECIPE_FILTERS,
      "category",
      optionKey as string,
    )
    expect(on.category).toEqual([optionKey])
    // 서버로 나가는 값이 캐러셀이 넘긴 표기와 같아야 한다 — 다르면 필터가 0건을 준다.
    expect(toRecipeListQueryFilters(on).categories).toEqual([item.queryValue])
    // 영양 그룹은 건드리지 않는다(같은 객체 한 벌이라는 것이 요점이다).
    expect(on.nutrition).toEqual([])

    const off = toggleRecipeFilter(on, "category", optionKey as string)
    expect(off.category).toEqual([])
  })
})

describe("매핑이 한 곳에만 있다", () => {
  /**
   * v2 목록 화면(`components/list` + `app/(tabs)/recipe.tsx`)에서 `한식 → korean` 류의
   * 매핑을 다시 적은 곳이 없어야 한다. 허용되는 두 파일:
   *  - `recipeListFilterModel.ts` — 서버 표기(`queryValue`)의 정본
   *  - `recipeCategoryArtModel.ts` — 도착 표기(`match`)의 정본
   *
   * 주석은 뺀다(머리말이 근거로 `한식` 을 인용한다).
   */
  const ALLOWED = new Set([
    "recipeListFilterModel.ts",
    "recipeCategoryArtModel.ts",
  ])

  function sourceFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) out.push(...sourceFiles(full))
      else if (/\.tsx?$/u.test(entry.name)) out.push(full)
    }
    return out
  }

  it("v2 목록 화면에 두 번째 카테고리 매핑 표가 없다", () => {
    const files = [
      ...sourceFiles(
        path.join(
          __dirname,
          "..",
          "src",
          "features",
          "recipe",
          "components",
          "list",
        ),
      ),
      path.join(__dirname, "..", "app", "(tabs)", "recipe.tsx"),
    ]
    const offenders: string[] = []
    for (const file of files) {
      if (ALLOWED.has(path.basename(file))) continue
      const lines = fs.readFileSync(file, "utf8").split("\n")
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (trimmed.startsWith("*") || trimmed.startsWith("//")) return
        if (trimmed.startsWith("/*")) return
        if (/한식|중식|일식|양식|샐러드|디저트|음료/u.test(line)) {
          offenders.push(`${path.basename(file)}:${index + 1} ${trimmed}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })

  it("검사가 헛돌지 않는다 — 허용 파일에서는 실제로 매핑을 찾는다", () => {
    // 정규식이 깨지면 위 검사가 항상 통과한다.
    const model = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "src",
        "features",
        "recipe",
        "components",
        "list",
        "recipeCategoryArtModel.ts",
      ),
      "utf8",
    )
    expect(model).toContain('match: ["한식", "korean"]')
  })
})

/**
 * 실측을 다시 돌릴 수 있게 남긴 검사. 기본은 건너뛴다(CI 에 DB 가 없다).
 *   SINSIN_RECIPE_DB_URL=postgresql://… npx jest recipeCategoryArt
 */
describe("DB 대조 (opt-in)", () => {
  const url = process.env.SINSIN_RECIPE_DB_URL
  const maybe = url ? it : it.skip

  maybe("DB 의 카테고리 분포가 CATEGORY_CENSUS 와 같다", () => {
    const out = execFileSync(
      "psql",
      [
        url as string,
        "-At",
        "-F",
        "|",
        "-c",
        "select category, count(*) from recipe group by 1 order by 1",
      ],
      { encoding: "utf8" },
    )
    const live: Record<string, number> = {}
    for (const line of out.trim().split("\n")) {
      if (line === "") continue
      const [category, count] = line.split("|")
      live[category] = Number(count)
    }
    expect(live).toEqual(CATEGORY_CENSUS)
  })
})
