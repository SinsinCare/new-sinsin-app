/**
 * 오늘의 아침·점심·저녁 추천 섹션 하나 — 시안(`Home_Recipes_Typing.png`)의 문안 구조 그대로.
 *
 *   오늘의 **아침** 추천메뉴          ← 시간대 낱말 하나만 브랜드색
 *   매일 바뀌는 메뉴를 확인해보세요     ← 부제목(캡션, 한 단계 물러선 회색)
 *   [가로 스크롤 카드 …]              ← RecipePhotoCard variant="carousel"
 *
 * 시안에서 고친 것: 시안 카드에는 `★4.0 (27)` 과 `#CKD3 #저염식` 이 데이터 없이 그려져
 * 있었다. 이 파일은 카드를 **직접 그리지 않는다** — `RecipePhotoCard` 한 곳이 별점 0건·
 * `provenance` 없음·임상 태그를 판정한다. 홈이 카드를 자체 조립하면 계약 §1 의 네 규칙이
 * 한꺼번에 새므로(서버 보고 §4 와 같은 이야기다) 여기서 카드 내부를 다시 만들지 않는다.
 *
 * **빈 섹션은 감추지 않는다.** 계약 §2 가 빈 섹션도 보내는 이유가 "사용자가 섹션이 왜
 * 사라졌는지 짐작할 수 없다" 이므로, 앱이 그 섹션을 지우면 서버가 보낸 이유가 무의미해진다.
 */
import { memo } from "react"
import { ScrollView } from "react-native"
import {
  V2Box,
  V2HStack,
  V2Text,
  V2VStack,
  CARD_RADIUS,
  GUTTER,
  RAIL_INSET,
  SECTION_TITLE_GAP,
} from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"

import type { RecipeHomeSection } from "../../types/recipeHome"
import type { RecipeCard } from "../../types/recipeListV2"
/**
 * 제목 쪼개기·i18n 키 조립은 **순수 모듈**에 있다(`recipeHomePresentation.ts`).
 * 이 파일은 `react-native`·`tamagui` 를 들여와 jest(node)에서 파싱되지 않으므로, 판단을
 * 여기 두면 검증할 수 없다 — 이 저장소의 관용구를 따른다.
 */
import {
  mealSectionCopyKeys,
  RECIPE_HOME_EMPTY_COPY_KEY,
  resolveMealSectionBadgeKey,
  resolveMealSectionBody,
  splitTitleHighlight,
} from "./recipeHomePresentation"
import type { MealSectionDay } from "./recipeHomePresentation"
/**
 * 사진 카드는 **다른 갈래의 파일**이다(목록 줄과 섹션 카드가 같은 컴포넌트여야 한다).
 * 배럴(`./index.ts`)도 내 소유가 아니라 파일 경로로 직접 들여온다.
 */
import {
  RECIPE_PHOTO_CARD_GAP,
  RECIPE_PHOTO_CARD_WIDTH,
  RecipePhotoCard,
} from "./RecipePhotoCard"
import { RecipeCarouselSkeleton } from "./RecipeSkeletons"

interface RecipeMealSectionProps {
  section: RecipeHomeSection
  /**
   * 이 섹션이 말하는 날. **기본값을 두지 않는다** — 안 넘기면 "오늘" 로 굳는데, 내일
   * 아침 카드를 "오늘의 아침 레시피" 아래 그리던 것이 바로 이번에 고친 결함이다.
   * 판단은 `resolveMealSectionDay`(순수)가 하고 화면이 그 값을 내려 준다.
   */
  day: MealSectionDay
  onPressItem: (card: RecipeCard) => void
  /** 첫 조회 중. 제목은 그리고 카드 자리만 비운다 — 섹션이 나중에 튀어나오지 않게. */
  isLoading?: boolean
}

/**
 * 카드 자리의 높이 — 첫 조회 중 스피너와 빈 섹션이 **카드가 올 자리만큼** 차지한다.
 * 0 으로 두면 카드가 도착하는 순간 아래 목록이 통째로 밀려 사용자가 읽던 줄을 잃는다.
 *
 * 사진 자리가 정사각(152)에서 **4:3**(114)으로 낮아지면서 같이 줄였다 — 사진 자리를
 * 줄여 놓고 이 값만 두면 첫 조회 중에만 섹션이 40pt 더 높았다가 카드가 오면서 줄어든다
 * (화면이 한 번 튄다). 폭 상수는 카드가 정하고 여기서는 비율만 곱한다.
 *
 *   사진 114 + 간격 8 + 이름 두 줄 38 + 영양 18 + 메타 18 + 줄 간격 4 = 200
 */
const CARD_SLOT_HEIGHT = Math.round((RECIPE_PHOTO_CARD_WIDTH * 3) / 4) + 86

export const RecipeMealSection = memo(function RecipeMealSection({
  section,
  day,
  onPressItem,
  isLoading = false,
}: RecipeMealSectionProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  /*
    본문에 무엇이 오는지 **JSX 안에서 판단하지 않는다.** 판정 타입에 `"hidden"` 이 없는
    것이 "섹션은 사라지지 않는다"(계약 §2)의 근거이고, 그것을 jest 로 못 박을 수 있다.
  */
  const body = resolveMealSectionBody({
    isLoading,
    itemCount: section.items.length,
  })
  const copy = mealSectionCopyKeys(section.slot, day)
  const title = t(copy.title)
  const subtitle = t(copy.subtitle)
  const parts = splitTitleHighlight(title, t(copy.highlight))
  /**
   * 끝난 끼니의 배지. 이 섹션이 **왜 뒤로 밀렸는지**를 그 자리에서 말한다 — 순서만
   * 바뀌고 표시가 없으면 "왜 아침이 맨 아래로 갔지" 가 남는다. 색은 그레이스케일이다:
   * 브랜드색은 "지금 고를 것" 한 곳에만 쓰고, 끝난 것은 물러서야 한다.
   *
   * 배지가 말하는 것은 **오늘**의 사실이라 날을 같이 넘긴다 — 내일을 말하는 섹션에
   * 오늘의 `기록함` 이 붙으면 제목과 배지가 서로 다른 날을 말한다.
   */
  const badgeKey = resolveMealSectionBadgeKey({ state: section.state, day })

  return (
    <V2VStack gap={SECTION_TITLE_GAP}>
      <V2VStack paddingHorizontal={GUTTER} gap={2}>
        <V2HStack gap={6} align="center">
          <V2Text
            color={badgeKey === null ? surface.textStrong : surface.textMuted}
            numberOfLines={1}
            style={{
              fontSize: TYPE.sectionTitle.fontSize,
              lineHeight: TYPE.sectionTitle.lineHeight,
              letterSpacing: TYPE.sectionTitle.letterSpacing,
              fontWeight: "700",
              flexShrink: 1,
            }}
          >
            {parts.before}
            {parts.match !== "" && (
              <V2Text
                color={
                  // 끝난 끼니는 브랜드색을 잃는다 — 강조는 지금 고를 끼니의 것이다.
                  badgeKey === null
                    ? tokens.color.primary.val
                    : surface.textMuted
                }
              >
                {parts.match}
              </V2Text>
            )}
            {parts.after}
          </V2Text>
          {badgeKey !== null && (
            <V2Box
              paddingHorizontal={8}
              paddingVertical={2}
              style={{
                borderRadius: 999,
                backgroundColor: surface.surfaceSunken,
              }}
            >
              <V2Text
                color={surface.textMuted}
                numberOfLines={1}
                style={{
                  fontSize: TYPE.caption.fontSize,
                  lineHeight: TYPE.caption.lineHeight,
                  letterSpacing: TYPE.caption.letterSpacing,
                }}
              >
                {t(badgeKey)}
              </V2Text>
            </V2Box>
          )}
        </V2HStack>
        <V2Text
          color={surface.textMuted}
          numberOfLines={1}
          style={{
            fontSize: TYPE.cardSub.fontSize,
            lineHeight: TYPE.cardSub.lineHeight,
            letterSpacing: TYPE.cardSub.letterSpacing,
          }}
        >
          {subtitle}
        </V2Text>
      </V2VStack>

      {body === "loading" ? (
        /*
          카드 자리에 카드 모양을 깐다. 링 하나로는 몇 장이 올지 알 수 없어 도착 순간
          가로 스크롤이 통째로 생겨나지만, 카드 실루엣이 미리 있으면 채워지기만 한다.
          (빈 섹션에 회색 덩어리를 깔지 않는 것과는 다른 이야기다 — 저기는 "없다" 이고
          여기는 "오는 중" 이다.)
        */
        <V2Box style={{ height: CARD_SLOT_HEIGHT }}>
          <RecipeCarouselSkeleton />
        </V2Box>
      ) : body === "empty" ? (
        /*
          빈 섹션. **왜 비었는지 말한다**(지시 1). 카드 자리에 회색 덩어리를 깔지 않는
          이유는 목록 카드와 같다 — 없는 것을 있는 것처럼 만들지 않는다.
        */
        <V2Box paddingHorizontal={GUTTER}>
          <V2Box
            paddingVertical={22}
            paddingHorizontal={16}
            style={{
              borderRadius: CARD_RADIUS,
              backgroundColor: surface.surface,
            }}
          >
            <V2Text
              color={surface.textMuted}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              style={{
                fontSize: TYPE.caption.fontSize,
                lineHeight: TYPE.caption.lineHeight,
                letterSpacing: TYPE.caption.letterSpacing,
                textAlign: "center",
              }}
            >
              {t(RECIPE_HOME_EMPTY_COPY_KEY)}
            </V2Text>
          </V2Box>
        </V2Box>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: RAIL_INSET,
            gap: RECIPE_PHOTO_CARD_GAP,
          }}
        >
          {section.items.map((card) => (
            /*
              key 에 슬롯을 섞지 않는다 — 겹치는 레시피(예: 한 그릇 + 반찬)는 두 섹션에
              **같은 카드**로 나오는 것이 맞고, 섹션마다 컴포넌트가 따로이므로 id 만으로
              충돌하지 않는다.
            */
            <RecipePhotoCard
              key={card.id}
              card={card}
              variant="carousel"
              onPress={onPressItem}
            />
          ))}
        </ScrollView>
      )}
    </V2VStack>
  )
})
