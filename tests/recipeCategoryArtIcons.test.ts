/**
 * `RecipeCategoryArt.tsx` 의 **그림 표**가 모든 카테고리를 덮는가.
 *
 * 문자열 매핑(`한식`/`Korean`/`Salads` → 키)은 `recipeCategoryArtModel.ts` 에 있고
 * `tests/recipeCategoryArt.test.ts` 가 본다. 여기서 보는 것은 그 다음 한 칸이다 —
 * **키 → SVG 컴포넌트**. 그 표만 컴포넌트 파일에 남겨 뒀기 때문에(모델은 렌더 의존이
 * 없어야 한다) 두 표가 어긋나면 카드의 사진 자리가 통째로 빈칸이 된다.
 *
 * `ICON_BY_KEY` 는 `satisfies Record<RecipeCategoryArtKey, …>` 라 **tsc 가 이미 완전성을
 * 강제한다.** 이 테스트가 더 하는 일은 두 가지다:
 *  1. 조인 결과(`RECIPE_CATEGORY_ART`)가 실제로 모든 키에 대해 값을 갖는지 — `satisfies`
 *     는 표를 검사하지만 조인 코드가 `find` 로 뒤져 놓치는 것까지는 못 본다.
 *  2. **`.svg` 를 들여오는 모듈이 jest 에서 로드되는지.** 이 저장소에서 그것이 한 번
 *     깨져 있었다(`tsconfig.test.json` 의 include 에 `src/types/svg.d.ts` 가 없어 TS2307).
 *     이 파일이 그 설정의 회귀 검사다 — 죽으면 `jest.config.ts` 의 `.svg` 매핑이나
 *     tsconfig include 를 누가 지운 것이다.
 *
 * 렌더는 하지 않는다(tamagui·reanimated 를 끌고 오는 컴포넌트는 이 저장소의 jest 가
 * 파싱하지 못한다). `react-native` 와 벡터 아이콘만 목으로 세워 **모듈 로드**만 시킨다.
 */
/* eslint-disable import/first -- RN 의존을 모듈 로드 전에 막아야 한다. */
jest.mock("react-native", () => ({ View: "View" }))
// pngIcon 래퍼(입체 카테고리 아이콘)가 끌고 오는 expo-image 는 ESM 원본이라 같은 이유로 목이 필요하다.
jest.mock("expo-image", () => ({ Image: "Image" }))
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons")
jest.mock("../src/hooks/useSurface", () => ({
  useSurface: () => ({ surface: "#F5F5F5", textWeak: "#999999" }),
}))

import fs from "node:fs"
import path from "node:path"

import {
  RECIPE_CATEGORY_ART,
  resolveRecipeCategoryArt,
} from "../src/features/recipe/components/list/RecipeCategoryArt"
import {
  RECIPE_CATEGORY_ART_KEYS,
  RECIPE_CATEGORY_MATCH,
} from "../src/features/recipe/components/list/recipeCategoryArtModel"

/** SVG 는 트랜스포머가 파일명 문자열로, PNG 는 pngIcon 이 assetFile 정적으로 — 둘을 한 이름으로 편다. */
function assetFileOf(icon: unknown): string {
  if (typeof icon === "string") return icon
  const assetFile = (icon as { assetFile?: unknown }).assetFile
  if (typeof assetFile === "string") return assetFile
  throw new Error(
    "아이콘에서 자산 파일명을 읽을 수 없다 — pngIcon 을 거치지 않은 래스터인가?",
  )
}

describe("키 → 그림 표", () => {
  it("모든 카테고리 키에 그림이 있다 (빈칸이 되는 카테고리가 없다)", () => {
    expect(RECIPE_CATEGORY_ART).toHaveLength(RECIPE_CATEGORY_ART_KEYS.length)
    for (const key of RECIPE_CATEGORY_ART_KEYS) {
      const entry = RECIPE_CATEGORY_ART.find((item) => item.key === key)
      expect(entry).toBeDefined()
      expect(entry?.Icon).toBeTruthy()
    }
  })

  it("표기 목록을 모델에서 그대로 물려받는다 (두 곳에 적혀 있지 않다)", () => {
    expect(RECIPE_CATEGORY_ART.map((entry) => entry.key)).toEqual(
      RECIPE_CATEGORY_MATCH.map((entry) => entry.key),
    )
    for (const entry of RECIPE_CATEGORY_ART) {
      const model = RECIPE_CATEGORY_MATCH.find((item) => item.key === entry.key)
      expect(entry.match).toBe(model?.match)
    }
  })

  it("같은 그림이 두 카테고리에 붙어 있지 않다", () => {
    // 붙어 있으면 서로 다른 카테고리가 같은 그림으로 보인다(구별이 그림의 일이다).
    const icons = RECIPE_CATEGORY_ART.map((entry) => entry.Icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it("카테고리마다 **맞는** 자산이 붙어 있다", () => {
    /*
      트랜스포머(`tests/helpers/svgTransformer.js`)가 SVG 를 파일 이름으로 바꿔 주므로
      어떤 자산이 붙었는지 실제로 볼 수 있다. 이것이 필요한 이유: `western` 은 파일명이
      `american.svg` 라 자산 이름과 키가 어긋나는 유일한 항목이고, 그 줄을 옮기다
      `dessert` 에 `drink.svg` 를 붙이는 식의 실수는 타입이 못 잡는다(둘 다 같은 타입이다).
    */
    const expected: Record<string, string> = {
      // 한·중·일 3종은 디자인 전달 입체 PNG(2026-08-02) — pngIcon 래퍼가 파일명을 정적으로 새긴다.
      korean: "cuisine-korean.png",
      chinese: "cuisine-chinese.png",
      japanese: "cuisine-japanese.png",
      western: "american.svg",
      salad: "salad.svg",
      dessert: "dessert.svg",
      beverage: "drink.svg",
    }
    for (const entry of RECIPE_CATEGORY_ART) {
      expect(assetFileOf(entry.Icon)).toBe(expected[entry.key])
    }
  })

  it("붙어 있는 자산 파일이 저장소에 실제로 있다", () => {
    for (const entry of RECIPE_CATEGORY_ART) {
      const file = path.join(
        __dirname,
        "..",
        "assets",
        "images",
        assetFileOf(entry.Icon),
      )
      expect(fs.existsSync(file)).toBe(true)
    }
  })

  it("resolveRecipeCategoryArt 가 그림까지 붙여 돌려준다", () => {
    const entry = resolveRecipeCategoryArt("Salads")
    expect(entry?.key).toBe("salad")
    expect(entry?.Icon).toBeTruthy()
  })

  it("못 찾으면 null — 화면이 중립 도형을 그린다", () => {
    expect(resolveRecipeCategoryArt("기타")).toBeNull()
    expect(resolveRecipeCategoryArt(null)).toBeNull()
  })
})
