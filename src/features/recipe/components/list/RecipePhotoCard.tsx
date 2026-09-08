/**
 * 레시피 카드 — 섹션의 가로 캐러셀(`carousel`)과 목록의 전체폭 한 줄(`row`).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 이번 재설계에서 고친 것 (실측 → 조치)
 *
 * 시뮬레이터(390×844)에서 재고 고쳤다. 숫자는 전부 실측이다.
 *
 * ┌ ① 줄 높이 136 → 96, 시작선 셋 → 둘 ────────────────────────────────────────
 * │ 예전 줄은 `SurfacePressable`(padding 14) 안에 96 썸네일 + 글자였다. 그런데
 * │ 그 카드의 면은 `surface.card` = `#FFFFFF` 이고 화면 바닥도 `#FFFFFF` 라
 * │ **화면에 보인 적이 없다.** 보이지 않는 면 때문에 매 줄 28pt(14×2)를 냈고,
 * │ 썸네일 96 에 견줘 글자는 세 줄(약 63pt)뿐이라 58pt 가 빈칸이었다.
 * │ → 면을 지우고 헤어라인으로 끊는다(벤치마크 §D-21). 썸네일 72, 위아래 12.
 * │   왼쪽 시작선은 `GUTTER`(16)와 `RECIPE_ROW_TEXT_INDENT`(100) **둘뿐**이다.
 * │   격자의 정본은 `recipeRowLayout.ts` — 여기서 숫자를 다시 고르지 않는다.
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌ ② 영양 줄이 이름보다 컸다 ─────────────────────────────────────────────────
 * │ `인 218mg · 오늘 남은 양의 24%` 가 **모든 카드에서** 브랜드 주황 + 굵은 글씨였다.
 * │ 목록을 훑으면 요리 이름보다 수치가 먼저 보였다. 강조가 모든 카드에 있으면 그것은
 * │ 강조가 아니다 — 모든 카드가 소리치면 아무 카드도 소리치지 않는다.
 * │ → 이름을 17 semibold `textStrong` 으로 올려 **이름이 지배**하게 하고, 영양 줄은
 * │   13 `text` 로 내렸다. 수치는 지우지 않는다(그게 이 제품의 값어치다) — 무게만 낮췄다.
 * │   주황은 **1인분이 오늘 남은 양을 넘을 때만**(`resolveHeadlineEmphasis`) 켠다.
 * │   그 문턱이 판정이 아니라 산수인 이유는 그 함수 머리말에 적었다.
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌ ③ `저장 N` 이 있는 카드만 한 줄 더 길었다 ─────────────────────────────────
 * │ 서버 `saveCount` 가 0 이면 그 줄이 통째로 사라져 줄 높이가 카드마다 달랐다
 * │ (실측: 곤드레밥 4줄, 나머지 3줄).
 * │ → 별점·저장수·시간·인분·**카테고리**를 가운뎃점 한 줄로 합쳤다
 * │   (`resolveCardMetaTokens` + `joinMetaParts`, 벤치마크 §A-1 의 한 줄 메타).
 * │   조각이 몇 개든 한 줄이라 데이터가 레이아웃을 바꾸지 못한다.
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 사진 자리에 사진이 아니라 일러스트가 들어가는 이유 (계약 §3)
 *
 * **먼저 사실:** 개발 DB 실측(2026-07-31)에서 `recipe` 175행 중
 * `image_url`·`thumbnail_url`·`detail_image_url` 이 채워진 행은 **0건**이고 API 응답의
 * `thumbnailUrl` 도 전부 `null` 이다. 즉 이건 렌더링 문제가 아니라 **데이터 문제**다.
 * 앱에서 고칠 수 있는 것은 "없는 사진을 어떻게 없다고 말하느냐" 까지다.
 *
 * 스톡 사진으로 채우지 않는다(`restaurant_menu` 는 사진 10장을 2,013행에 돌려 쓴다).
 * 식당 사진은 *가게 성격*을 말하는 데 그치지만 레시피 사진은 **그 요리 자체**를 말한다.
 * 잡채덮밥 카드에 한정식 상차림을 붙이면 바로 아래 줄의 `인 218mg` 이 **사진에 보이는
 * 그 양**의 수치로 읽힌다 — 신장 환자에게 1인분 크기의 틀린 기준을 주는 것이다.
 *
 * 대신 자리를 **일부러 놓은 타일처럼** 보이게 만들었다. 예전에는 96(목록)·152(캐러셀)
 * 짜리 큰 회색 사각형 가운데 작은 그림이라 "사진을 못 불러온 자리" 로 읽혔고 실제로
 * 그렇게 지적됐다. 자리를 그림 크기에 맞추면(72 / 4:3) 같은 그림이 자리표시자가 아니라
 * **카테고리 뱃지**로 읽힌다. 그림 자체는 이미 카테고리마다 다르다(한식 그릇 · 중식
 * 만두 · 일식 주먹밥 · 양식 피자 · 샐러드 · 디저트 — `RECIPE_CATEGORY_MATCH`).
 *
 * 그림이 전부 같아 보였던 진짜 이유도 데이터다: 기본 정렬(`recommended`)의 앞 50건이
 * **전부 `한식`** 이라(실측 `GET /recipes?limit=50`) 한 화면에 같은 카테고리만 왔다.
 * 그래서 카테고리를 **메타 줄의 첫 낱말로도** 말하게 했다 — 사진이 말해 줄 "무슨
 * 요리인가" 를 낱말이 대신한다.
 *
 * **한 컴포넌트가 둘 다 그린다.** `card.thumbnailUrl` 이 있으면 `Image`, 없으면
 * `RecipeCategoryArt`. 비율·라디우스·위치가 한 곳에만 있으므로 사진이 들어오는 날
 * 이 파일을 고치지 않고 레이아웃도 흔들리지 않는다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 되돌리지 않는 규칙 (계약 §1)
 *
 *  - **임상 태그를 그리지 않는다.** 시안 카드의 `#CKD3` `#저염식` 은 검수 전 카탈로그에
 *    임상 딱지를 붙이는 것이라 §1.2 가 금지한다. 서버가 걸러 주지만 `resolveCardTags` 가
 *    앱에서 한 번 더 막는다 — 서버가 한 번 빠뜨리면 그건 앱이 한 주장이 된다.
 *  - **리뷰 0건이면 별점을 안 그린다**(`resolveCardRating`). 시안의 `★4.0 (27)` 은
 *    데이터 없이 그려진 값이었다.
 *  - **`provenance` 없이 수치를 그리지 않는다**(`resolveCardHeadline`).
 *  - **강조색은 `tokens.color.primary` 하나.** `safe*`(틸)는 "안전" 의미색이라 쓰지
 *    않는다 — 검수 전 레시피에 안전 색을 칠하면 그 자체가 임상 주장이다.
 *
 * 판단은 전부 `recipeCardFormat.ts` 의 순수 함수에서 나온다. JSX 안에서 다시 판단하지
 * 않는다(그러면 테스트할 수 없고 다음 리팩터에서 조용히 되살아난다).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 스타일 층 — 구조는 design-system-v2, 색은 `useSurface()`
 *
 * 글꼴은 `typography.*` 를 편다. **`fontWeight` 를 쓰지 않는다** — Pretendard 가 굵기별
 * 4개 파일로 로드돼 있어 face 위에 `fontWeight` 를 겹치면 iOS 에서 가짜 볼드가 난다
 * (`typography.ts` 머리말). 그래서 굵기는 `fontFamily` 로만 말한다.
 *
 * 색만 `useSurface()` 를 계속 쓰는 것은 **의도**다. 이 화면의 나머지(섹션 제목·캐러셀·
 * 정렬 줄·빈 상태)가 전부 그 팔레트를 보고 있어서, 카드 하나만 v2 색으로 옮기면 같은
 * 회색이 두 벌이 되어 카드가 화면에서 떠 보인다 — 격자를 맞춰 놓고 색으로 다시
 * "따로 노는" 화면을 만드는 셈이다. 팔레트 이전은 화면 전체를 한 번에 옮길 때 한다.
 */
import { memo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useSurface } from "@/src/hooks/useSurface"
import {
  fontFamily,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import type { NutrientKey, RecipeCard } from "../../types/recipeListV2"
import type { PhotoWellGeometry } from "./recipeCardFormat"
import { RecipeCategoryArt } from "./RecipeCategoryArt"
import {
  RECIPE_ROW_ART,
  RECIPE_ROW_HEIGHT,
  RECIPE_ROW_PAD_V,
  RECIPE_ROW_THUMB,
  RECIPE_ROW_THUMB_GAP,
  RECIPE_ROW_THUMB_RADIUS,
} from "./recipeRowLayout"
import {
  formatNutrientAmount,
  joinMetaParts,
  resolveCardBookmark,
  resolveCardHeadline,
  resolveCardMetaTokens,
  resolveCardPhotoSlot,
  resolveHeadlineEmphasis,
  resolvePhotoWellGeometry,
} from "./recipeCardFormat"

/** 영양소 라벨은 상세·목록과 같은 `curated.*` 키를 본다 — 같은 말을 두 벌 두지 않는다. */
const NUTRIENT_LABEL_KEYS = {
  sodium: "curated.sodium",
  potassium: "curated.potassium",
  phosphorus: "curated.phosphorus",
  protein: "curated.protein",
} as const satisfies Record<NutrientKey, string>

/**
 * 캐러셀 카드 폭. 화면 좌우 여백이 `GUTTER`(16)이므로 390pt 기기에서 두 장 + 세 번째의
 * 일부가 보인다 — **가로로 더 있다는 사실이 스크롤 없이 보여야** 탐색이 시작된다.
 * 폭을 내보내는 이유: 섹션이 자리 높이를 계산할 때 같은 값을 봐야 한다.
 */
export const RECIPE_PHOTO_CARD_WIDTH = 152
export const RECIPE_PHOTO_CARD_GAP = spacing[12]

export interface RecipePhotoCardProps {
  card: RecipeCard
  variant: "carousel" | "row"
  onPress: (card: RecipeCard) => void
  /**
   * 저장 토글. **없어도 된다** — 없으면 빈 북마크를 그리지 않는다.
   * 누를 곳이 없는 빈 북마크는 "눌러서 저장하는 곳" 으로 보이면서 아무 일도 하지 않는
   * 죽은 컨트롤이 된다(없는 것보다 나쁘다).
   */
  onToggleSave?: (card: RecipeCard) => void
}

export const RecipePhotoCard = memo(function RecipePhotoCard({
  card,
  variant,
  onPress,
  onToggleSave,
}: RecipePhotoCardProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const { colors } = useV2Theme()

  const headline = resolveCardHeadline(card)
  const emphasis = resolveHeadlineEmphasis(headline)
  const meta = resolveCardMetaTokens(card)

  const headlineText =
    headline != null
      ? t("list.headline", {
          label: t(NUTRIENT_LABEL_KEYS[headline.key]),
          amount: formatNutrientAmount(headline.amount, headline.unit),
        })
      : null
  // 탐색 카드에는 영양소 절대량만 표시해 남은 양의 비율 문장이 잘리지 않게 한다.
  const headlineLine = headlineText
  const metaLine = joinMetaParts([
    meta.category,
    meta.timeMin != null ? t("curated.minutes", { count: meta.timeMin }) : null,
    meta.rating != null
      ? t("list.ratingValue", { average: meta.rating.average })
      : null,
  ])

  const photo = (
    <PhotoWell
      card={card}
      /*
        모양은 `variant` 만 보고 정해진다 — 사진이 있는지 여부가 들어올 수 없으므로
        `thumbnailUrl` 이 채워지는 날 레이아웃이 흔들리지 않는다(계약 §3).
        목록 줄만 그림 크기를 격자(`RECIPE_ROW_ART`)에서 가져온다.
      */
      geometry={
        variant === "row"
          ? {
              ...resolvePhotoWellGeometry("row"),
              radius: RECIPE_ROW_THUMB_RADIUS,
              artSize: RECIPE_ROW_ART,
            }
          : resolvePhotoWellGeometry("carousel")
      }
      onToggleSave={onToggleSave}
      // 누를 수 있을 때는 **동작**을, 누를 수 없을 때는 **상태**를 말한다.
      actionLabel={t(
        card.saved ? "detail.unsaveAccessibility" : "detail.saveAccessibility",
      )}
      stateLabel={t("archive.tabSaved")}
    />
  )

  /**
   * 영양 줄. 색과 굵기만 `emphasis` 로 갈린다 — **행 높이는 두 경우가 같다**
   * (13/18 고정). 넘치는 카드에서만 줄 높이가 달라지면 목록의 리듬이 그 카드에서 끊긴다.
   */
  const headlineNode =
    headlineLine == null ? null : (
      <Text
        style={[
          styles.headline,
          emphasis === "overBudget"
            ? {
                fontFamily: fontFamily.semibold,
                color: surface.danger,
              }
            : { color: surface.text },
        ]}
        numberOfLines={1}
      >
        {headline ? (
          <>
            <Text style={{ color: colors.label.neutral }}>
              {t(NUTRIENT_LABEL_KEYS[headline.key])}{" "}
            </Text>
            <Text style={{ fontFamily: fontFamily.medium }}>
              {formatNutrientAmount(headline.amount, headline.unit)}
            </Text>
          </>
        ) : (
          headlineLine
        )}
      </Text>
    )

  const metaNode =
    metaLine === "" ? null : (
      <Text
        style={[styles.meta, { color: colors.label.neutral }]}
        numberOfLines={1}
      >
        {metaLine}
      </Text>
    )

  if (variant === "carousel") {
    return (
      <SurfacePressable
        onPress={() => onPress(card)}
        accessibilityLabel={t("list.cardAccessibility", { name: card.name })}
        baseColor={surface.canvas}
        style={styles.carousel}
      >
        {photo}
        <View style={styles.carouselText}>
          <Text
            style={[styles.carouselName, { color: surface.textStrong }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {card.name}
          </Text>
          {headlineNode}
          {metaNode}
        </View>
      </SurfacePressable>
    )
  }

  // ── row ──────────────────────────────────────────────────────────────────
  return (
    <SurfacePressable
      onPress={() => onPress(card)}
      accessibilityLabel={t("list.cardAccessibility", { name: card.name })}
      /*
        면이 없는 줄이다. `baseColor` 를 화면 바닥과 같게 두면 평소에는 보이지 않고
        누르는 동안에만 회색이 깔린다 — 줄이 눌린다는 사실은 말하면서 목록에 흰 카드
        176개를 그리지는 않는다.
      */
      baseColor={surface.canvas}
      style={styles.row}
    >
      <View style={styles.rowThumb}>{photo}</View>
      <View style={styles.rowText}>
        {/*
          이름이 지배한다 — 이 줄만 17pt 이고 나머지는 13pt 다. `numberOfLines={1}` 인
          이유는 높이 고정 때문이다(두 줄이 되면 그 줄만 길어져 리듬이 깨진다).
          긴 이름은 잘리지만, 잘린 이름은 상세에서 온전히 보인다.
        */}
        <View style={styles.rowNameLine}>
          <Text
            style={[styles.rowName, { color: surface.textStrong }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {card.name}
          </Text>
          {card.authored && (
            <View
              style={[
                styles.authoredBadge,
                { backgroundColor: surface.surfaceSunken },
              ]}
            >
              <Text
                style={[styles.authoredText, { color: surface.textMuted }]}
                numberOfLines={1}
              >
                {t("list.authored")}
              </Text>
            </View>
          )}
        </View>
        {metaNode}
        {headlineNode}
      </View>
    </SurfacePressable>
  )
})

/**
 * 사진 자리. **사진이 있든 없든 같은 상자다** — 비율·라디우스·북마크 위치가 한 곳에만
 * 있으므로 `thumbnailUrl` 이 채워지는 날 레이아웃이 흔들리지 않는다.
 */
function PhotoWell({
  card,
  geometry,
  onToggleSave,
  actionLabel,
  stateLabel,
}: {
  card: RecipeCard
  /** `resolvePhotoWellGeometry(variant)` 의 결과. 사진 유무와 무관하다. */
  geometry: PhotoWellGeometry
  onToggleSave?: (card: RecipeCard) => void
  /** 누를 수 있을 때의 라벨 — 동작을 말한다. */
  actionLabel: string
  /**
   * 누를 수 없는 표시의 라벨 — 상태를 말한다.
   * `archive.tabSaved`("저장한 레시피")를 재사용한다. 전용 키가 로케일 파일에 없고,
   * 그 파일은 이 갈래의 소유가 아니라 키를 새로 넣지 않았다.
   */
  stateLabel: string
}) {
  const surface = useSurface()
  // 사진이냐 일러스트냐를 **JSX 안에서 판단하지 않는다** — 빈 문자열 uri 같은 경계를
  // 여기서 다시 다루면 테스트할 수 없고 다음 리팩터에서 조용히 되살아난다.
  const slot = resolveCardPhotoSlot(card)
  const bookmark = resolveCardBookmark({
    saved: card.saved,
    canToggle: onToggleSave != null,
  })

  return (
    <View
      style={[
        styles.well,
        {
          aspectRatio: geometry.aspectRatio,
          borderRadius: geometry.radius,
          backgroundColor: surface.surfaceSunken,
        },
      ]}
    >
      {slot.kind === "photo" ? (
        <Image
          source={{ uri: slot.uri, cacheKey: slot.cacheKey }}
          /* FlashList 가 셀을 재활용하면 새 사진이 뜰 때까지 **직전 음식 사진**이
             남는다 — recyclingKey 가 바뀌면 expo-image 가 이전 그림을 즉시 비운다. */
          recyclingKey={slot.cacheKey}
          style={styles.wellFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <RecipeCategoryArt
          category={slot.category}
          artSize={geometry.artSize}
        />
      )}

      {bookmark != null && (
        <View style={styles.bookmarkSlot}>
          {bookmark.mode === "button" && onToggleSave != null ? (
            <Pressable
              onPress={() => onToggleSave(card)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              accessibilityState={{ selected: bookmark.saved }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <BookmarkGlyph
                saved={bookmark.saved}
                onPhoto={slot.kind === "photo"}
              />
            </Pressable>
          ) : (
            // 정보로만 쓰이는 표시. 누를 수 없으므로 **버튼 역할을 주지 않는다** —
            // `accessibilityRole="button"` 을 붙이면 스크린리더가 누를 곳을 찾게 만든다.
            <View accessible accessibilityLabel={stateLabel}>
              <BookmarkGlyph saved onPhoto={slot.kind === "photo"} />
            </View>
          )}
        </View>
      )}
    </View>
  )
}

/**
 * 저장 표시. **자리 아래에 무엇이 있느냐로 칩의 재질이 갈린다.**
 *
 * 사진 위에서는 어두운 반투명 원 + 흰 글리프다. 사진의 밝기를 미리 알 수 없으므로
 * 자기 대비를 스스로 만들어야 한다(스크롤 위치나 사진에 따라 색을 바꾸지 않는다).
 *
 * **일러스트 타일 위에서는 그 검은 원이 오히려 때가 된다.** 지금 카탈로그는
 * 175/175 가 사진 없이 카테고리 픅토그램이라(계약 §3, 위 머리말) 목록을 훑으면 연한
 * 타일마다 어두운 원이 하나씩 박혀 **저장 여부와 무관하게 같은 얼룩이 세로로 늘어선다** —
 * 보관함처럼 모든 줄에 이 컨트롤이 있는 화면에서 실제로 그렇게 보였다. 그래서 그 위에서는
 * 화면 바닥색 칩(`canvas`)에 글자색 글리프를 쓴다. 타일(`surface`)보다 밝거나(라이트)
 * 어두워서(다크) 칩이 면으로 읽히고, 무게는 훨씬 가볍다.
 *
 * 저장됨/아님은 두 경우 모두 **모양**(채워짐/외곽선)으로 구분한다. 색으로만 구분하면
 * 색각 이상에서 두 상태가 같아 보이고, 브랜드 주황을 여기 쓰면 카드의 강조색이 둘이 된다.
 */
function BookmarkGlyph({
  saved,
  onPhoto,
}: {
  saved: boolean
  onPhoto: boolean
}) {
  const surface = useSurface()

  if (onPhoto) {
    return (
      <View style={[styles.bookmarkGlyph, styles.bookmarkOnPhoto]}>
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={14}
          color={surface.onBrand}
        />
      </View>
    )
  }

  return (
    <View style={[styles.bookmarkGlyph, { backgroundColor: surface.canvas }]}>
      <Ionicons
        name={saved ? "bookmark" : "bookmark-outline"}
        size={14}
        color={saved ? surface.textStrong : surface.textMuted}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // ── 목록 줄 ──────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: RECIPE_ROW_THUMB_GAP,
    paddingVertical: RECIPE_ROW_PAD_V,
    // 기본 행 높이를 유지하면서 긴 제목이나 큰 글자에는 필요한 만큼 늘어난다.
    minHeight: RECIPE_ROW_HEIGHT,
  },
  rowThumb: {
    width: RECIPE_ROW_THUMB,
    height: RECIPE_ROW_THUMB,
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: spacing[2],
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  rowName: {
    ...typography.label.small,
    flexShrink: 1,
  },

  // ── 캐러셀 카드 ──────────────────────────────────────────────────────────
  carousel: {
    width: RECIPE_PHOTO_CARD_WIDTH,
    gap: spacing[8],
  },
  carouselText: {
    gap: spacing[2],
  },
  carouselName: {
    ...typography.label.small,
  },

  // ── 공통 텍스트 ──────────────────────────────────────────────────────────
  headline: {
    ...typography.subtext.small,
  },
  meta: {
    ...typography.subtext.small,
  },
  authoredBadge: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: spacing[8],
    flexShrink: 0,
  },
  authoredText: {
    ...typography.subtext.small,
  },

  // ── 사진 자리 ────────────────────────────────────────────────────────────
  well: {
    width: "100%",
    overflow: "hidden",
  },
  wellFill: {
    width: "100%",
    height: "100%",
  },
  bookmarkSlot: {
    position: "absolute",
    top: spacing[6],
    right: spacing[6],
  },
  bookmarkGlyph: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 사진 위에서만. 밝기를 모르는 배경 위에서 대비를 스스로 만든다. */
  bookmarkOnPhoto: {
    backgroundColor: "rgba(0,0,0,0.42)",
  },
})
