/**
 * 사진 자리에 놓는 카테고리 일러스트 + **카테고리 ↔ 아이콘 매핑의 유일한 정본**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 사진이 아니라 일러스트인가 (계약 §3)
 *
 * 데이터 사실: 큐레이션 175건은 `image_url`·`thumbnail_url`·`detail_image_url` 이
 * **전부 NULL** 이고, 원본 JSON 에 이미지 필드가 **애초에 없다**. 임포터가 빠뜨린 게
 * 아니라 원본에 사진이 없다 — 그래서 "임포터를 고치면 채워진다" 가 아니다.
 *
 * `restaurant_menu` 는 일반 스톡 사진 10장을 2,013행에 돌려 쓰는 선례가 있지만
 * **따르지 않는다.** 식당 목록의 사진은 *가게 성격*을 말하는 데 그치지만, 레시피
 * 카드의 사진은 **그 요리 자체**를 말한다. 잡채덮밥 카드에 한정식 상차림 사진을
 * 붙이면, 바로 아래 줄의 `인 218mg` 이 **사진에 보이는 그 양**의 수치로 읽힌다.
 * 신장 환자에게 1인분의 크기에 대한 틀린 기준을 주는 것이고, 이 앱이 존재하는
 * 이유(수치를 정확히 알려 주는 것)를 카드가 스스로 무너뜨린다.
 *
 * 그래서 이 자리에는 **요리의 종류만** 말하는 그림을 둔다. 그림은 양·재료·플레이팅에
 * 대해 아무것도 주장하지 않으므로 틀린 기준을 만들 수 없다.
 *
 * 사진 자리·비율·레이아웃은 시안대로다. `thumbnailUrl` 이 들어오는 날
 * `RecipePhotoCard` 의 **같은 컴포넌트가 그대로 사진을 그린다** — UI 를 다시 만들지
 * 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 배경은 **중립 회색 하나**다 (카테고리별 파스텔 틴트가 아니다)
 *
 * 카테고리마다 다른 색 배경을 깔면 한 화면에 유채색 면이 6개 생긴다. 계약 §1 은
 * "카드의 강조색은 `tokens.color.primary` 하나" 이고, `surface.ts` 는 "유채색 면은
 * 선택·기록 완료 표시에만" 이라고 못 박았다. `surfaceBrand`(주황 틴트)를 모든 카드에
 * 깔면 그것이 뜻하던 "선택됨" 이 아무 뜻도 아니게 된다.
 *
 * 카테고리를 한눈에 구별시키는 일은 **그림이 이미 하고 있다.** 배경까지 색을 나눌
 * 이유가 없다. 그래서 배경은 `surface.surface` — 카드 면보다 한 단계 들어간
 * "사진이 놓일 우묵한 자리" 로만 읽히는 회색이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 매핑을 여기 한 곳에 두는 이유
 *
 * `RecipeCategoryCarousel` 이 같은 표를 쓴다. 두 곳에 적으면 아이콘을 하나 바꿀 때
 * 캐러셀의 그림과 카드의 그림이 조용히 달라진다.
 *
 * **문자열 표(`key` ↔ 도착할 수 있는 표기)의 정본은 `recipeCategoryArtModel.ts` 다** —
 * 이 파일은 `react-native`·`*.svg` 를 들여와 jest(node)에서 파싱되지 않으므로, 판정을
 * 여기 두면 검증할 수 없다(이 저장소의 관용구: 순수 판정은 렌더 의존 없는 모듈에).
 * 이 파일에 남은 것은 **`key → SVG 컴포넌트` 한 표**뿐이고, 그 표는
 * `Record<RecipeCategoryArtKey, …>` 로 **완전성을 타입이 강제한다** — 모델에 키를 하나
 * 더하면 아이콘을 안 붙인 채로는 컴파일되지 않는다(그래서 "그림 없는 카테고리" 가
 * 조용히 생기지 않는다).
 */
import type { ComponentType } from "react"
import { memo } from "react"
import { View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import type { SvgProps } from "react-native-svg"

import AmericanIcon from "@/assets/images/american.svg"
import { pngIcon } from "@/src/shared/components/pngIcon"
import DessertIcon from "@/assets/images/dessert.svg"
import DrinkIcon from "@/assets/images/drink.svg"
import SaladIcon from "@/assets/images/salad.svg"

import { useSurface } from "@/src/hooks/useSurface"

import {
  RECIPE_CATEGORY_MATCH,
  resolveRecipeCategoryArtKey,
  type RecipeCategoryArtKey,
} from "./recipeCategoryArtModel"

const KoreanIcon = pngIcon(
  require("@/assets/images/cuisine-korean.png"),
  "cuisine-korean.png",
)
const ChineseIcon = pngIcon(
  require("@/assets/images/cuisine-chinese.png"),
  "cuisine-chinese.png",
)
const JapaneseIcon = pngIcon(
  require("@/assets/images/cuisine-japanese.png"),
  "cuisine-japanese.png",
)

export interface RecipeCategoryArtEntry {
  /**
   * `recipeListFilterModel` 의 카테고리 옵션 `key` 와 **같은 값**이다.
   * 캐러셀이 이 키로 필터 모델과 조인하므로 여기서 새 키를 지어내면 안 된다.
   */
  key: RecipeCategoryArtKey
  Icon: ComponentType<SvgProps>
  /** 이 카테고리로 도착할 수 있는 모든 표기. 정본은 `recipeCategoryArtModel.ts` 다. */
  match: readonly string[]
}

/**
 * 키 → 그림. **이 파일이 정하는 유일한 것**이다.
 *
 * `satisfies Record<RecipeCategoryArtKey, …>` 가 완전성을 강제한다 — 모델의 키를 하나
 * 더하면 여기 줄을 더하지 않는 한 컴파일되지 않는다. 런타임 검사로는 "그림 없는
 * 카테고리" 를 배포한 뒤에야 알게 된다.
 */
const ICON_BY_KEY = {
  korean: KoreanIcon,
  chinese: ChineseIcon,
  japanese: JapaneseIcon,
  // `american.svg` 가 양식 아이콘이다(파일명은 자산 쪽 이름, 필터 모델의 키는 `western`).
  western: AmericanIcon,
  salad: SaladIcon,
  dessert: DessertIcon,
  beverage: DrinkIcon,
} as const satisfies Record<
  RecipeCategoryArtKey,
  ComponentType<Pick<SvgProps, "width" | "height" | "opacity">>
>

/**
 * 표기 표(모델) ⨯ 그림 표(위)의 조인. 순서도 모델이 정한다 — 여기서 다시 적지 않는다.
 */
export const RECIPE_CATEGORY_ART: readonly RecipeCategoryArtEntry[] =
  RECIPE_CATEGORY_MATCH.map((entry) => ({
    key: entry.key,
    match: entry.match,
    Icon: ICON_BY_KEY[entry.key],
  }))

/**
 * 카테고리 문자열 → 일러스트. **못 찾으면 `null`** 이고, 그때 화면은 중립 도형을 그린다.
 * 판정 자체는 `resolveRecipeCategoryArtKey`(모델)가 한다 — 여기서 다시 비교하지 않는다.
 */
export function resolveRecipeCategoryArt(
  category: string | null | undefined,
): RecipeCategoryArtEntry | null {
  const key = resolveRecipeCategoryArtKey(category)
  if (key == null) return null
  return RECIPE_CATEGORY_ART.find((entry) => entry.key === key) ?? null
}

interface RecipeCategoryArtProps {
  /** 서버가 보낸 `card.category` 를 **그대로** 넘긴다(로케일 변환은 이 파일이 흡수한다). */
  category: string | null | undefined
  /**
   * 그림의 한 변(pt). 사진 자리의 크기가 아니라 **그 안에 놓일 그림**의 크기다.
   *
   * 그림을 사진 자리에 꽉 채우지 않는 이유: 38×30 짜리 픅토그램을 카드 폭까지 키우면
   * 선이 굵어져 "사진 대신 놓인 표시" 가 아니라 "깨진 사진" 처럼 보인다. 우묵한 회색
   * 자리 가운데 놓인 적당한 크기의 그림이 자리채움임을 스스로 말한다.
   */
  artSize?: number
}

/**
 * 부모(사진 자리)를 꽉 채우고 그림을 가운데 놓는다. 라디우스·비율은 **부모가** 정한다 —
 * 사진이 들어오는 날 같은 부모가 `Image` 를 담아야 하므로 모양을 이 파일이 정하면 안 된다.
 *
 * 접근성: 이 그림은 카드가 이미 갖고 있는 이름/라벨을 시각적으로 반복하는 장식이다.
 * 스크린리더에 별도 노드로 읽히면 카드 하나가 두 번 불린다 — 그래서 숨긴다.
 */
export const RecipeCategoryArt = memo(function RecipeCategoryArt({
  category,
  artSize = 56,
}: RecipeCategoryArtProps) {
  const surface = useSurface()
  const entry = resolveRecipeCategoryArt(category)

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: surface.surface,
      }}
    >
      {entry != null ? (
        // 두 변을 다 주지만 왜곡되지 않는다 — react-native-svg 의 preserveAspectRatio
        // 기본값이 `xMidYMid meet` 이라 viewBox 비율을 지키며 가운데 맞춰 들어간다.
        <entry.Icon width={artSize} height={artSize} />
      ) : (
        // 중립 도형. 빈칸도 깨진 이미지도 내지 않는다. 유채색을 쓰지 않아 "모르는
        // 카테고리" 가 특정 카테고리처럼 보이지 않는다.
        <Ionicons
          name="restaurant-outline"
          size={Math.round(artSize * 0.62)}
          color={surface.textWeak}
        />
      )}
    </View>
  )
})
