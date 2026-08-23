/**
 * 시안의 가로 카테고리 아이콘 줄 — 아이콘 위, 라벨 아래, 가로 스크롤.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ "기타" 를 넣지 않는다
 *
 * 시안에는 일곱 번째로 `기타` 가 있다. 그 카테고리는 **데이터에 없다** — 큐레이션
 * 175건은 여섯 카테고리로 정확히 나뉜다(한식 67 · 양식 36 · 중식 23 · 일식 23 ·
 * 디저트 14 · 샐러드 12 = 175). `기타` 를 그리면 눌러도 0건인 죽은 버튼이 되고,
 * 사용자는 "내 조건에 맞는 게 없구나" 로 잘못 읽는다. 시안의 `음료` 도 같은 이유로
 * 빠진다(필터 모델에는 옵션이 있지만 카탈로그에 행이 0건이다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 순서 — 필터 모델의 선언 순서를 그대로 따른다 (한식 · 중식 · 일식 · 양식 · 샐러드 · 디저트)
 *
 * 건수 순(한식 67 → 양식 36 → 중식 23 → …)도 후보였다. 가로 스크롤이라 뒤쪽은 화면
 * 밖이니 큰 카탈로그를 앞에 두면 보이는 앞줄이 곧 결과 많은 쪽이 된다는 논리였다.
 * **버렸다.** 같은 여섯 칩이 이 화면에 두 번 나오기 때문이다 — 캐러셀과 필터 시트
 * (`RecipeFilterSheet`, 같은 화면의 필터 버튼에서 열린다). 두 곳의 순서가 다르면
 * 사용자는 같은 목록을 두 번 다시 읽어야 한다. 기록된 원칙이 "결과를 예측할 수 있게"
 * 이고, 순서가 화면마다 달라지는 것이 바로 그 반대다.
 *
 * 그래서 순서를 **여기서 정하지 않는다.** `RECIPE_FILTER_GROUPS` 의 카테고리 옵션
 * 순서를 필터해서 쓴다 — 표가 하나라 어긋날 수가 없다. 시안 순서·`FoodCategoryBar`
 * 순서도 마침 같은 순서다.
 *
 * ■ 항목 계산은 `recipeCategoryArtModel.ts` 에 있다 (여기서 하지 않는다)
 *
 * 위 두 문단의 판정("행이 있는 6개만", "필터 모델 선언 순서")은 순수 계산인데 이 파일은
 * `react-native`·`tamagui` 를 들여와 jest(node)에서 파싱되지 않는다. 판정을 여기 두면
 * 검증할 방법이 없어 다음 리팩터에서 조용히 되살아난다(그래서 시안의 `기타` 가 다시
 * 생길 수 있다). `buildRecipeCategoryCarouselItems` 는 모델에 있고 이 파일은 그 결과에
 * **그림만 붙인다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 서버로 나가는 값은 필터 모델의 `queryValue` 다
 *
 * `onToggle` 은 화면 키(`korean`)가 아니라 **서버 표기(`한식`)** 를 넘긴다. 매핑을 이
 * 파일에서 새로 적으면 진실이 두 개가 된다 — 아카이브 훅 주석에 이미 기록된 결함
 * ("화면 키로 캐시 키를 만들면 매핑이 바뀔 때 안 갈린다")이 그대로 재현된다.
 * 그래서 `queryValue` 는 `RECIPE_FILTER_GROUPS` 에서 읽고, 되돌리는 길
 * (`recipeCategoryOptionKeyForQueryValue`)도 같은 표에서 만들어 이 파일이 내보낸다 —
 * 호출부가 역매핑을 직접 적을 이유를 없앤다.
 *
 * ■ 아이콘은 `RecipeCategoryArt` 의 표를 **읽기만** 한다
 *
 * 매핑을 두 곳에 적으면 카드의 그림과 캐러셀의 그림이 조용히 달라진다. 정본은
 * `RecipeCategoryArt.tsx::RECIPE_CATEGORY_ART` 하나다.
 *
 * ■ 선택 표시는 색이 아니라 **글자 굵기 + 색 + 회색 면**이다
 *
 * 강조색은 화면에 하나(카드의 영양 줄)라는 규칙이라 선택된 칩에 주황을 쓰지 않는다.
 * 시안도 그렇게 했다 — 선택된 `한식` 은 아이콘 뒤에 연회색 라운드 면이 깔리고 라벨이
 * 굵은 검정이며, 나머지는 면 없이 흐린 아이콘 + 회색 라벨이다.
 */
import { memo, useMemo } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { V2Text, V2VStack } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { RAIL_INSET } from "@/src/design-system-v2"

import { RECIPE_CATEGORY_ART } from "./RecipeCategoryArt"
import { RECIPE_CATEGORY_RAIL } from "./recipeHomeStickyLayout"
import {
  buildRecipeCategoryCarouselItems,
  type RecipeCategoryArtKey,
  type RecipeCategoryCarouselItemModel,
} from "./recipeCategoryArtModel"

/**
 * 칸·상자·여백의 실측값은 **`recipeHomeStickyLayout.ts` 에 있다.**
 *
 * 2026-08-21 에 이 레일이 목록 머리에서 **고정층**으로 올라왔다(스크롤에 영향받지
 * 않는다 — 커뮤니티 탭과 같은 문법). 고정층은 스크롤하지 않으므로 여기 붙는 1pt 는
 * 목록에서 영구히 빠지는 1pt 이고, 그래서 이 레일의 높이는 화면의 예산에 들어간다.
 * 숫자를 이 파일에 다시 적으면 그 예산 산술이 조용히 거짓이 된다 — 그 모듈이 정본이다.
 */
const { slotWidth: SLOT_WIDTH, artBox: ART_BOX } = RECIPE_CATEGORY_RAIL
/**
 * 레일의 좌우 인셋. `RAIL_INSET` 을 그대로 쓰면 안 된다.
 *
 * 칸(60)이 상자(48)보다 넓고 가운데 정렬이라, 첫 칸의 상자는 인셋보다 6pt 더
 * 안쪽에서 시작한다. 그 6 때문에 카테고리 줄만 제목·검색바·섹션·목록(전부 16)에서
 * 혼자 밀려 있었다. 인셋에서 그 차이를 빼면 **상자의 왼쪽 모서리**가 16 에 앉는다.
 * 라벨은 칸 안에서 가운데 정렬이라 원래대로 둔다 — 맞춰야 하는 건 면이다.
 */
const RAIL_EDGE = RAIL_INSET - (SLOT_WIDTH - ART_BOX) / 2

/**
 * 화면이 그리는 항목 = 모델 항목(키·서버 표기·라벨) + 그림.
 *
 * 항목 목록·순서·`기타`/`음료` 제외의 근거는 전부 `recipeCategoryArtModel.ts` 에 있다 —
 * 이 파일은 그 결과를 그리기만 한다. 되돌리는 길
 * (`recipeCategoryOptionKeyForQueryValue`)도 그 모델이 내보낸다.
 */
export interface RecipeCategoryCarouselItem extends RecipeCategoryCarouselItemModel {
  Icon: (typeof RECIPE_CATEGORY_ART)[number]["Icon"]
}

function iconFor(key: RecipeCategoryArtKey) {
  return RECIPE_CATEGORY_ART.find((entry) => entry.key === key)?.Icon
}

/** 모델 항목에 그림을 붙인다. 그림이 없는 항목은 빠진다(두 표가 어긋났다는 신호다). */
function carouselViewItems(): readonly RecipeCategoryCarouselItem[] {
  const out: RecipeCategoryCarouselItem[] = []
  for (const item of buildRecipeCategoryCarouselItems()) {
    const Icon = iconFor(item.key)
    if (Icon === undefined) continue
    out.push({ ...item, Icon })
  }
  return out
}

export interface RecipeCategoryCarouselProps {
  /**
   * 지금 선택된 카테고리의 **서버 표기** 목록(`["한식", "양식"]`).
   *
   * 화면 키가 아니라 서버 표기인 이유: `onToggle` 이 내보내는 값과 같은 언어여야
   * 호출부가 두 표기를 오가며 변환하지 않는다. `RecipeFilterSelection` 을 들고 있는
   * 화면은 `toRecipeListQueryFilters(selection).categories` 를 그대로 넘기면 된다 —
   * 그 함수가 이미 키 → 서버 표기 변환의 정본이다.
   */
  selected: readonly string[]
  /**
   * 눌린 카테고리의 **서버 표기**. 같은 것을 다시 누르면 해제이므로 호출부는
   * "이것 하나만 선택" 으로 처리한다(단일 선택 — 컴포넌트 머리말 참고).
   */
  onToggle: (categoryQueryValue: string) => void
  /** 고른 카테고리를 모두 푼다. 선택된 칩을 다시 눌렀을 때 쓴다. */
  onClearAll: () => void
}

export const RecipeCategoryCarousel = memo(function RecipeCategoryCarousel({
  selected,
  onToggle,
  onClearAll,
}: RecipeCategoryCarouselProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const items = useMemo(() => carouselViewItems(), [])

  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 4,
        paddingHorizontal: RAIL_EDGE,
      }}
    >
      {/*
        "전체" 칩은 두지 않는다.

        한때 맨 앞에 세웠던 이유는 "고른 것을 되돌리는 길이 화면에 없다" 였다. 그런데
        단일 선택으로 바꾸고 나니 그 문제가 사라졌다 — 고른 칩을 **다시 누르면**
        해제이고, 그게 한 번의 탭이다. 전체 칩은 그 자리에서 "선택 없음" 을 한 번 더
        말하는 중복 표시가 되고, 줄의 성격도 흐린다(나머지는 전부 음식 그림인데 그것만
        글자다).
      */}
      {items.map(({ key, queryValue, labelKey, Icon }) => {
        const label = t(labelKey)
        const isSelected = selected.includes(queryValue)

        return (
          <Pressable
            key={key}
            // 같은 칩을 다시 누르면 해제된다(단일 선택 토글 — 지도 레일과 같은 규칙).
            onPress={() => (isSelected ? onClearAll() : onToggle(queryValue))}
            accessibilityRole="button"
            // 아이콘만 두지 않는다 — 라벨과 선택 여부를 스크린리더가 읽어야 한다.
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              width: SLOT_WIDTH,
              alignItems: "center",
            })}
          >
            <V2VStack
              align="center"
              gap={RECIPE_CATEGORY_RAIL.artLabelGap}
              paddingVertical={RECIPE_CATEGORY_RAIL.slotPadV}
            >
              <View
                style={{
                  width: ART_BOX,
                  height: ART_BOX,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  // 선택된 것만 면을 갖는다. 유채색이 아니라 회색이다(강조색은 화면에 하나).
                  backgroundColor: isSelected ? surface.surface : "transparent",
                  // 안 고른 것은 흐리다 — 시안과 같은 처리. 아이콘 색을 바꿀 수 없는
                  // 다색 픅토그램이라 투명도가 유일하게 일관된 방법이다.
                  opacity: isSelected ? 1 : 0.45,
                }}
              >
                <Icon width={34} height={34} />
              </View>
              <V2Text
                color={isSelected ? surface.textStrong : surface.textWeak}
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  lineHeight: RECIPE_CATEGORY_RAIL.labelLineHeight,
                  letterSpacing: -0.26,
                  fontWeight: isSelected ? "700" : "500",
                }}
              >
                {label}
              </V2Text>
            </V2VStack>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})
