/**
 * 레시피 목록 줄의 **격자와 내용 규칙**을 못 박는다.
 *
 * 여기 있는 것은 전부 실제 화면에서 지적받은 결함이고, 전부 "다음 리팩터에서 조용히
 * 되살아날 수 있는" 종류다 — 되살아나도 타입은 통과하고 화면만 나빠진다.
 *
 *   1. 줄 높이가 데이터에 따라 달랐다(`저장 N` 이 있는 카드만 한 줄 더 길었다).
 *   2. 왼쪽 시작선이 셋이었다(화면 20 · 썸네일 34 · 글자 142).
 *   3. 영양 줄이 **모든 카드에서** 강조돼 이름보다 크게 보였다.
 *   4. 사진 자리가 사진 크기라, 사진이 없는 175건에서 "깨진 사진" 으로 읽혔다.
 *
 * 렌더 없이 검증할 수 있게 판정과 격자를 전부 순수 모듈에 두었다(이 저장소의 관용구).
 */
import { GUTTER, ITEM_GAP } from "@/src/design-system-v2/tokens/layout"
import {
  recipeListBottomInset,
  RECIPE_ROW_ART,
  RECIPE_ROW_HEIGHT,
  RECIPE_ROW_PAD_V,
  RECIPE_ROW_TEXT_INDENT,
  RECIPE_ROW_THUMB,
  RECIPE_ROW_THUMB_GAP,
} from "@/src/features/recipe/components/list/recipeRowLayout"
import {
  HEADLINE_OVER_BUDGET_PERCENT,
  joinMetaParts,
  resolveCardMetaTokens,
  resolveHeadlineEmphasis,
  resolvePhotoWellGeometry,
} from "@/src/features/recipe/components/list/recipeCardFormat"
import type {
  NutrientHeadline,
  RecipeCard,
} from "@/src/features/recipe/types/recipeListV2"

/**
 * 실제 응답에서 온 카드. `GET /api/v1/recipes?limit=5` (개발 백엔드, 2026-07-31) 의
 * 두 번째 항목 그대로다 — **꾸며낸 payload 가 아니다.** 이 행이 지적 3번의 주인공이다
 * (`saveCount: 1` 이라 이 카드만 `저장 1` 줄이 하나 더 있었다).
 */
const 곤드레밥: RecipeCard = {
  id: 22,
  name: "곤드레밥",
  summary: null,
  category: "한식",
  difficulty: "쉬움",
  timeMin: 50,
  servings: 1,
  thumbnailUrl: null,
  tags: ["#한식"],
  nutrition: {
    kcal: 356,
    proteinG: 7,
    sodiumMg: 364,
    potassiumMg: 370,
    phosphorusMg: 86,
    provenance: "reference_estimate",
    unmatchedIngredients: [],
  },
  headline: { key: "sodium", amount: 364, unit: "mg", percentOfRemaining: 18 },
  rating: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
  saveCount: 1,
  saved: false,
  authored: false,
}

/** 같은 응답의 첫 항목. `saveCount: 0` — 예전에는 이 카드만 한 줄 짧았다. */
const 잡채덮밥: RecipeCard = {
  ...곤드레밥,
  id: 21,
  name: "잡채덮밥 (저염)",
  timeMin: 35,
  headline: {
    key: "phosphorus",
    amount: 218,
    unit: "mg",
    percentOfRemaining: 24,
  },
  saveCount: 0,
}

describe("목록 줄의 격자", () => {
  it("줄 높이는 썸네일 + 위아래 여백으로 고정이다", () => {
    expect(RECIPE_ROW_HEIGHT).toBe(RECIPE_ROW_THUMB + RECIPE_ROW_PAD_V * 2)
    // 예전 값(카드 패딩 14×2 + 썸네일 96 = 124, 줄 사이 12 → pitch 136)보다 낮아야
    // "썸네일 옆 큰 공백" 이 사라진다. 이 수를 다시 올리려면 이유가 있어야 한다.
    expect(RECIPE_ROW_HEIGHT).toBeLessThan(124)
  })

  it("글자 시작선은 화면 여백 + 썸네일 + 간격 하나뿐이다", () => {
    expect(RECIPE_ROW_TEXT_INDENT).toBe(
      GUTTER + RECIPE_ROW_THUMB + RECIPE_ROW_THUMB_GAP,
    )
  })

  it("화면 안의 시작선은 둘이다 — 셋째가 생기면 문단이 흔들린다", () => {
    const startEdges = new Set([GUTTER, RECIPE_ROW_TEXT_INDENT])
    expect(startEdges.size).toBe(2)
  })

  it("식당 격자와 같은 좌우 여백을 쓴다", () => {
    // 두 기능이 같은 화면 격자를 봐야 한다. 값이 갈리면 탭을 옮길 때 왼쪽 선이 흔들린다.
    expect(GUTTER).toBe(16)
  })

  it("바닥 여백은 AI 필이 덮는 구간보다 항목 간격만큼 더 크다", () => {
    // 필이 덮는 높이는 화면 바닥 기준이라 안전영역·탭바를 포함한다.
    expect(recipeListBottomInset(34) - ITEM_GAP).toBe(34 + 52 + 64)
  })
})

describe("사진 자리 — 사진이 없다는 사실에 맞춘 크기", () => {
  it("목록 줄의 그림은 타일의 절반이다", () => {
    expect(RECIPE_ROW_ART * 2).toBe(RECIPE_ROW_THUMB)
  })

  it("그림이 자리를 꽉 채우지 않는다 — 채우면 선이 굵어져 깨진 사진처럼 보인다", () => {
    const carousel = resolvePhotoWellGeometry("carousel")
    expect(carousel.artSize).toBeLessThan(152 * carousel.aspectRatio)
    expect(RECIPE_ROW_ART).toBeLessThan(RECIPE_ROW_THUMB)
  })

  it("캐러셀 자리는 더 이상 정사각이 아니다 — 152 정사각이 빈 사진으로 읽혔다", () => {
    expect(resolvePhotoWellGeometry("carousel").aspectRatio).toBeCloseTo(4 / 3)
  })

  it("모양은 `variant` 만 보고 정해진다 — 사진 유무가 레이아웃을 바꾸지 않는다", () => {
    // 같은 인자면 같은 결과여야 `thumbnailUrl` 이 채워지는 날 줄 높이가 안 흔들린다.
    expect(resolvePhotoWellGeometry("row")).toEqual(
      resolvePhotoWellGeometry("row"),
    )
  })
})

describe("메타 한 줄 — 데이터가 줄 수를 바꾸지 못한다", () => {
  it("저장수가 있든 없든 조각이 한 줄로 합쳐진다", () => {
    const withSaves = resolveCardMetaTokens(곤드레밥)
    const withoutSaves = resolveCardMetaTokens(잡채덮밥)
    expect(withSaves.saveCount).toBe(1)
    expect(withoutSaves.saveCount).toBeNull()

    // 두 카드가 그리는 것은 **둘 다 한 줄**이다. 예전에는 여기서 줄 수가 갈렸다.
    const a = joinMetaParts([withSaves.category, "50분", "1인분", "저장 1"])
    const b = joinMetaParts([withoutSaves.category, "35분", "1인분", null])
    expect(a.split("\n")).toHaveLength(1)
    expect(b.split("\n")).toHaveLength(1)
    expect(a).toBe("한식 · 50분 · 1인분 · 저장 1")
    expect(b).toBe("한식 · 35분 · 1인분")
  })

  it("저장 0 은 조각이 되지 않는다 — `저장 0` 은 정보가 아니라 소음이다", () => {
    expect(resolveCardMetaTokens(잡채덮밥).saveCount).toBeNull()
  })

  it("리뷰 0건이면 별점 조각이 없다 — 0.0 을 만들지 않는다", () => {
    expect(resolveCardMetaTokens(곤드레밥).rating).toBeNull()
  })

  it("카테고리를 맨 앞에 말한다 — 사진이 없으니 낱말이 대신한다", () => {
    expect(resolveCardMetaTokens(곤드레밥).category).toBe("한식")
  })

  it("빈 조각은 가운뎃점을 남기지 않는다", () => {
    expect(joinMetaParts([null, "35분", "", null, "1인분"])).toBe(
      "35분 · 1인분",
    )
    expect(joinMetaParts([null, null])).toBe("")
  })
})

describe("영양 줄의 무게 — 강조는 산수일 때만", () => {
  function headline(percent: number | null): NutrientHeadline {
    return {
      key: "sodium",
      amount: 364,
      unit: "mg",
      percentOfRemaining: percent,
    }
  }

  it("보통 카드는 강조하지 않는다 — 모든 카드가 소리치면 강조가 아니다", () => {
    // 실제 데이터의 실측 분포는 7~51% 였다. 그 구간이 전부 강조였던 것이 지적 4번이다.
    expect(resolveHeadlineEmphasis(headline(7))).toBe("supporting")
    expect(resolveHeadlineEmphasis(headline(24))).toBe("supporting")
    expect(resolveHeadlineEmphasis(headline(51))).toBe("supporting")
    expect(resolveHeadlineEmphasis(headline(99))).toBe("supporting")
  })

  it("1인분이 오늘 남은 양을 넘을 때만 강조한다", () => {
    expect(
      resolveHeadlineEmphasis(headline(HEADLINE_OVER_BUDGET_PERCENT)),
    ).toBe("overBudget")
    expect(resolveHeadlineEmphasis(headline(140))).toBe("overBudget")
  })

  it("중간 구간에 '주의' 를 만들지 않는다 — 서버가 계산하지 않는 판정이다", () => {
    // 문턱이 하나뿐이어야 한다. 70·80 같은 값에 다른 상태가 생기면 그건 우리가 지어낸
    // 임상 판단이고, 임상 규칙이 금지하는 것이다.
    const kinds = new Set(
      [0, 10, 30, 50, 70, 80, 90, 99].map((p) =>
        resolveHeadlineEmphasis(headline(p)),
      ),
    )
    expect(kinds).toEqual(new Set(["supporting"]))
  })

  it("남은 양을 모르면 강조하지 않는다", () => {
    // `percentOfRemaining: null` 은 "계산 불가"(체중 기록 없음 등)다. 모르는 것을
    // 넘지 않는다고도, 넘는다고도 말하지 않는다 — 둘 다 없는 주장이다.
    expect(resolveHeadlineEmphasis(headline(null))).toBe("supporting")
    expect(resolveHeadlineEmphasis(null)).toBe("supporting")
  })
})
