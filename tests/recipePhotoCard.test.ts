/**
 * 사진 자리가 있는 카드(`RecipePhotoCard`)가 **무엇을 그릴지** 정하는 판정.
 *
 * ## 여기서 막는 사고 — 전부 시안 카드에 실제로 있던 것이다
 *
 *  1. **사진이 들어오는 날 UI 를 다시 만들게 되는 것.** 지금 카탈로그 175건은
 *     `thumbnail_url` 이 전부 NULL 이다. 사진 자리를 "일러스트 전용" 으로 만들면
 *     사진이 채워질 때 카드를 새로 만들어야 한다. **한 판정이 두 경우를 다 정하고
 *     모양은 사진 유무와 무관해야** 그 약속이 지켜진다.
 *  2. **`★4.0 (27)`** — 시안은 모든 카드에 별점을 그렸는데 그건 데이터 없이 그려진
 *     값이었다. 리뷰 0건이면 별점 영역이 없어야 한다.
 *  3. **`#CKD3` `#저염식`** — 검수 전 카탈로그에 임상 딱지를 붙이는 것 자체가 계약 §1
 *     이 금지한 임상 주장이다. 서버가 걸러 주지만 **거기에 의존하지 않는다.**
 *  4. **죽은 북마크** — 누를 곳이 없는데 빈 북마크를 그리면 "눌러서 저장하는 곳" 으로
 *     보이면서 아무 일도 하지 않는다. 없는 것보다 나쁘다.
 */
import fs from "node:fs"
import path from "node:path"

import {
  isClinicalTag,
  resolveCardBookmark,
  resolveCardHeadline,
  resolveCardPhotoSlot,
  resolveCardRating,
  resolveCardTags,
  resolvePhotoWellGeometry,
} from "../src/features/recipe/components/list/recipeCardFormat"
import { resolveRecipeCategoryArtKey } from "../src/features/recipe/components/list/recipeCategoryArtModel"
import type {
  RatingSummary,
  RecipeCard,
} from "../src/features/recipe/types/recipeListV2"

function rating(count: number, average: number | null): RatingSummary {
  return { average, count, distribution: [0, 0, 0, 0, count] }
}

function card(overrides: Partial<RecipeCard> = {}): RecipeCard {
  return {
    id: 1,
    name: "잡채덮밥",
    summary: null,
    category: "한식",
    difficulty: null,
    timeMin: 35,
    servings: 1,
    thumbnailUrl: null,
    tags: [],
    nutrition: {
      kcal: 420,
      proteinG: 12,
      sodiumMg: 610,
      potassiumMg: 340,
      phosphorusMg: 218,
      provenance: "reference_estimate",
      unmatchedIngredients: [],
    },
    headline: {
      key: "phosphorus",
      amount: 218,
      unit: "mg",
      percentOfRemaining: 24,
    },
    rating: rating(0, null),
    saveCount: 0,
    saved: false,
    authored: false,
    ...overrides,
  }
}

describe("사진 자리 — 한 판정이 사진과 일러스트를 모두 정한다", () => {
  it("thumbnailUrl 이 있으면 사진이다", () => {
    const slot = resolveCardPhotoSlot(
      card({ thumbnailUrl: "https://cdn.example.com/a.jpg" }),
    )
    expect(slot).toEqual({
      kind: "photo",
      uri: "https://cdn.example.com/a.jpg",
    })
  })

  it("thumbnailUrl 이 없으면 카테고리 일러스트다 — 카테고리를 그대로 넘긴다", () => {
    const slot = resolveCardPhotoSlot(card({ thumbnailUrl: null }))
    expect(slot).toEqual({ kind: "art", category: "한식" })
    // 넘긴 값이 실제로 그림을 찾는 값이어야 한다(로케일 변환은 매핑이 흡수한다).
    if (slot.kind !== "art") throw new Error("unreachable")
    expect(resolveRecipeCategoryArtKey(slot.category)).toBe("korean")
  })

  it("빈 문자열·공백만 있는 thumbnailUrl 은 **없는 것**이다", () => {
    // `!= null` 만 보면 빈 uri 로 Image 를 그려 사진도 일러스트도 없는 회색 사각형이
    // 남는다(깨진 사진처럼 보인다). 서버가 빈 문자열을 보낼 수 있는지는 앱이 정할 수 없다.
    for (const value of ["", "   ", "\n"]) {
      expect(resolveCardPhotoSlot(card({ thumbnailUrl: value })).kind).toBe(
        "art",
      )
    }
  })

  it("두 경우가 **같은 판정 함수**에서 나온다 — 사진 URL 이 들어오는 날 분기를 새로 만들지 않는다", () => {
    // 같은 카드에서 thumbnailUrl 만 바꿨을 때 결과의 종류가 바뀌는 것 외에 다른 입력이
    // 필요 없다는 것이 요점이다(카테고리·별점·태그가 사진 여부를 바꾸지 않는다).
    const base = card({ thumbnailUrl: null })
    expect(resolveCardPhotoSlot(base).kind).toBe("art")
    expect(
      resolveCardPhotoSlot({ ...base, thumbnailUrl: "https://x/y.png" }).kind,
    ).toBe("photo")
  })

  it("사진 자리의 모양이 사진 유무에 **영향받지 않는다** (레이아웃이 흔들리지 않는다)", () => {
    // `resolvePhotoWellGeometry` 의 인자가 variant 하나뿐인 것이 이 성질의 근거다.
    // 카드마다 높이가 달라지면 사진이 도착하는 순간 사용자가 읽던 줄을 잃는다.
    //
    // 예전에는 여기서 `aspectRatio` 가 **1 인지** 봤다. 그건 이 성질이 아니라 그때의
    // 값을 적어 둔 것이었고, 실제로 캐러셀 자리를 4:3 으로 낮출 때(152 정사각이 "빈
    // 사진" 으로 읽혔다) 성질은 그대로인데 테스트만 깨졌다. 지켜야 할 것은 **인자가
    // variant 뿐이고 결과가 결정적**이라는 사실이다.
    for (const variant of ["carousel", "row"] as const) {
      const geometry = resolvePhotoWellGeometry(variant)
      expect(geometry.aspectRatio).toBeGreaterThan(0)
      expect(geometry.radius).toBeGreaterThan(0)
      expect(geometry.artSize).toBeGreaterThan(0)
      // 같은 variant 는 언제나 같은 모양이다.
      expect(resolvePhotoWellGeometry(variant)).toEqual(geometry)
    }
  })

  it("좁은 캐러셀 카드의 그림이 더 크다 — 그림이 자리채움임을 스스로 말해야 한다", () => {
    expect(resolvePhotoWellGeometry("carousel").artSize).toBeGreaterThan(
      resolvePhotoWellGeometry("row").artSize,
    )
  })
})

describe("사진 자리가 컴포넌트에 **한 곳**이다 (소스 확인)", () => {
  /**
   * 판정을 순수 함수로 뽑아도, 컴포넌트가 사진용 상자와 일러스트용 상자를 **따로** 두면
   * 사진이 들어오는 날 두 상자의 비율·라디우스·북마크 위치가 갈라진다. 그러면 "UI 를
   * 다시 만들지 않는다" 는 계약 §3 의 약속이 깨진다. 렌더 테스트가 불가능한 파일이라
   * 소스로 못 박는다.
   */
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "src",
      "features",
      "recipe",
      "components",
      "list",
      "RecipePhotoCard.tsx",
    ),
    "utf8",
  )

  it("사진 상자(`PhotoWell`)가 하나이고 두 변형이 그것을 공유한다", () => {
    expect(source.match(/function PhotoWell\(/gu)).toHaveLength(1)
    // `carousel`·`row` 가 같은 `photo` 노드를 쓴다 — 상자를 각자 만들지 않는다.
    expect(source.match(/<PhotoWell\b/gu)).toHaveLength(1)
    expect(source.match(/\{photo\}/gu)?.length).toBeGreaterThanOrEqual(2)
  })

  it("`Image` 와 `RecipeCategoryArt` 가 그 상자 안에 한 번씩만 나온다", () => {
    expect(source.match(/<Image\b/gu)).toHaveLength(1)
    expect(source.match(/<RecipeCategoryArt\b/gu)).toHaveLength(1)
    const wellAt = source.indexOf("function PhotoWell(")
    expect(source.indexOf("<Image")).toBeGreaterThan(wellAt)
    expect(source.indexOf("<RecipeCategoryArt")).toBeGreaterThan(wellAt)
  })

  it("모양·사진 유무 판단을 JSX 안에서 다시 하지 않는다", () => {
    expect(source).toContain("resolvePhotoWellGeometry(variant)")
    expect(source).toContain("resolveCardPhotoSlot(card)")
    expect(source).toContain("resolveCardBookmark({")
    // 예전 코드: `card.thumbnailUrl != null ? <Image …` / `variant === "carousel" ? 14 : 12`
    expect(source).not.toMatch(/card\.thumbnailUrl\s*!=\s*null/u)
    expect(source).not.toMatch(/variant === "carousel" \? \d+ : \d+/u)
  })
})

describe("별점 — 리뷰 0건이면 그리지 않는다", () => {
  it("count 가 0 이면 null (0.0 을 만들지 않는다)", () => {
    expect(resolveCardRating(rating(0, null))).toBeNull()
    // 서버가 개수 0 인데 평균을 실어 보내도 그리지 않는다.
    expect(resolveCardRating(rating(0, 4))).toBeNull()
  })

  it("평균이 null 인데 개수만 있으면 그리지 않는다 — 무엇의 개수인지 알 수 없다", () => {
    expect(resolveCardRating(rating(27, null))).toBeNull()
  })

  it("음수 개수도 그리지 않는다", () => {
    expect(resolveCardRating(rating(-1, 4.2))).toBeNull()
  })

  it("리뷰가 있으면 소수 첫째 자리까지 그린다", () => {
    expect(resolveCardRating(rating(27, 4))).toEqual({
      average: "4.0",
      count: 27,
    })
    expect(resolveCardRating(rating(3, 4.25))).toEqual({
      average: "4.3",
      count: 3,
    })
  })
})

describe("임상 태그가 카드 표시 태그에 새어 들지 않는다", () => {
  it("시안 카드에 있던 태그가 하나도 남지 않는다", () => {
    const result = resolveCardTags(["CKD3", "저염식", "간단"])
    expect(result.shown).toEqual(["간단"])
    // 임상 태그는 `+N` 에도 세지 않는다 — `+1` 은 "자리가 없어 못 보여줬다" 는 뜻이라
    // 사용자가 카드를 눌러 찾게 만드는데, 임상 태그는 어디서도 보여주지 않는다.
    expect(result.overflow).toBe(0)
  })

  it("한국어·영어 임상 토큰을 둘 다 막는다 (서버가 로케일 번역을 해서 보낸다)", () => {
    for (const tag of [
      "저염",
      "저단백",
      "저칼륨",
      "저인",
      "고열량",
      "CKD3",
      "투석식",
      "당뇨 식단",
      "신장에 좋은",
      "Low sodium",
      "LOW PROTEIN",
      "kidney friendly",
      "renal diet",
      "Dialysis",
    ]) {
      expect(isClinicalTag(tag)).toBe(true)
      expect(resolveCardTags([tag, "매콤"]).shown).toEqual(["매콤"])
    }
  })

  it("임상 태그가 아닌 것은 통과한다 — 필터가 아니라 표시만 막는 것이다", () => {
    for (const tag of ["간단", "매콤", "한그릇", "10분", "Quick"]) {
      expect(isClinicalTag(tag)).toBe(false)
    }
  })

  it("모든 태그가 임상 태그면 태그 줄 자체가 비어 있다", () => {
    const result = resolveCardTags(["저염", "CKD3", "투석"])
    expect(result.shown).toEqual([])
    expect(result.overflow).toBe(0)
  })

  it("최대 2개 + 글자 예산 — 잘린 태그(`#저염ㅅ`)를 만들지 않는다", () => {
    // 개수만 제한하면 긴 태그 두 개가 카드 폭을 넘겨 시안과 똑같이 잘린다.
    const result = resolveCardTags([
      "아주아주긴태그이름입니다",
      "짧음",
      "또하나",
    ])
    expect(result.shown.length).toBeLessThanOrEqual(2)
    expect(result.shown.join("").length).toBeLessThanOrEqual(14)
    expect(result.overflow).toBeGreaterThan(0)
  })
})

describe("provenance 없이 수치를 그리지 않는다", () => {
  it("nutrition 이 null 이면 headline 이 와도 버린다", () => {
    expect(resolveCardHeadline(card({ nutrition: null }))).toBeNull()
  })

  it("headline 이 없으면 null (nutrition 만 있어도 카드 줄을 만들지 않는다)", () => {
    expect(resolveCardHeadline(card({ headline: null }))).toBeNull()
  })

  it("둘 다 있으면 그대로 그린다", () => {
    expect(resolveCardHeadline(card())?.amount).toBe(218)
  })
})

describe("북마크 — 죽은 컨트롤을 만들지 않는다", () => {
  it("핸들러가 없고 저장돼 있지도 않으면 아무것도 그리지 않는다", () => {
    expect(resolveCardBookmark({ saved: false, canToggle: false })).toBeNull()
  })

  it("핸들러가 없고 저장돼 있으면 **정보 표시**다 (버튼이 아니다)", () => {
    expect(resolveCardBookmark({ saved: true, canToggle: false })).toEqual({
      mode: "indicator",
      saved: true,
    })
  })

  it("핸들러가 있으면 두 상태 모두 버튼이다", () => {
    expect(resolveCardBookmark({ saved: false, canToggle: true })).toEqual({
      mode: "button",
      saved: false,
    })
    expect(resolveCardBookmark({ saved: true, canToggle: true })).toEqual({
      mode: "button",
      saved: true,
    })
  })

  it("모드가 button 이 아닌 것은 언제나 saved 다 — 빈 정보 표시는 존재하지 않는다", () => {
    for (const saved of [true, false]) {
      for (const canToggle of [true, false]) {
        const display = resolveCardBookmark({ saved, canToggle })
        if (display?.mode === "indicator") expect(display.saved).toBe(true)
      }
    }
  })
})
