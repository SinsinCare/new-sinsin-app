import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated"
import { useTranslation } from "react-i18next"

import BreakfastGraphic from "@/assets/images/meal-breakfast.svg"
import DinnerGraphic from "@/assets/images/meal-dinner.svg"
import LunchGraphic from "@/assets/images/meal-lunch.svg"
import SnackGraphic from "@/assets/images/meal-snack.svg"

import { Text } from "@/src/shared/components/AppText"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { useHomeInk } from "./homeInk"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { LAYOUT } from "@/src/theme/surface"

import type { MealType } from "../../types"
import { RecordRowPressable } from "./RecordRowPressable"
import { visibleMealEntries } from "./mealRecordListVisible"

/**
 * 오늘의 식단기록 — 그날 기록한 끼니를 **시간순 목록**으로 보인다(시안 2026-09-04).
 *
 * 예전의 네 칸 타임라인(아침·점심·저녁·간식 고정 슬롯)은 빈 칸이 늘 보였다.
 * 시안은 기록된 것만 줄 세우고, 없으면 섹션 자체를 내린다 — 그래서 이 컴포넌트는
 * `entries` 가 비면 아무것도 그리지 않는다. 끼니를 고르는 일은 CTA 가 여는 식사
 * 시트가 맡는다.
 *
 * 한 줄 = 사진(52, r11) · 제목(분석 제목, 없으면 끼니 이름) · "08:30 · 234 kcal" · ›.
 * 세 줄까지 보이고, 넘치면 "더 보기" 로 펼친다(하루 최대 네 끼라 드물다). 그 규칙은
 * `mealRecordListVisible.ts` 에 있다.
 */

export interface MealRecordEntry {
  /** 목록 키 — 같은 끼니에 여러 건이 있을 수 있어(시간 기준 기록) 끼니로는 못 가른다. */
  diaryId: number
  mealType: MealType
  /** "08:30" — 서버 createdAt 을 기기 시간으로 */
  time: string | null
  imageUri: string | null
  /** 분석 제목("요거트와 그래놀라"). 결과를 아직 못 받았으면 null → 끼니 이름으로 대신한다. */
  title: string | null
  calories: number | null
}

/** 사진 없는(글) 기록의 자리 그림 — 끼니 일러스트는 타임라인 시절 자산 그대로. */
const MEAL_GRAPHIC: Record<
  MealType,
  React.ComponentType<{ width?: number; height?: number }>
> = {
  BREAKFAST: BreakfastGraphic,
  LUNCH: LunchGraphic,
  DINNER: DinnerGraphic,
  SNACKS: SnackGraphic,
}

interface MealRecordListProps {
  title: string
  entries: MealRecordEntry[]
  /** 줄 탭 → 그 기록의 리포트 */
  onPressEntry: (diaryId: number) => void
}

export function MealRecordList({
  title,
  entries,
  onPressEntry,
}: MealRecordListProps) {
  const { t } = useTranslation("common")
  const s = useSurface()
  const ink = useHomeInk()
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) return null

  // 규칙은 `mealRecordListVisible.ts` 가 정하고 테스트가 지킨다.
  const { visible, canToggle: overflow } = visibleMealEntries(entries, expanded)

  return (
    <View style={styles.section}>
      <Text
        style={[styles.title, { color: ink.strong }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>

      {/* 펼치고 접을 때 아래 섹션이 부드럽게 따라 내려간다(LinearTransition). */}
      <Animated.View
        layout={LinearTransition.duration(260).reduceMotion(
          ReduceMotion.System,
        )}
      >
        {visible.map((entry, index) => {
          const label = entry.title ?? t(`meal.${entry.mealType}`)
          const meta = [
            entry.time,
            entry.calories !== null
              ? t("home.mealList.kcal", {
                  count: Math.round(entry.calories),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
          return (
            <Animated.View
              key={entry.diaryId}
              // 처음엔 위에서부터 차례로, 더 보기로 늘어난 줄은 그 자리에서 떠오른다.
              entering={FadeInDown.delay(index * 50)
                .duration(240)
                .reduceMotion(ReduceMotion.System)}
              exiting={FadeOutUp.duration(160).reduceMotion(
                ReduceMotion.System,
              )}
              layout={LinearTransition.duration(260).reduceMotion(
                ReduceMotion.System,
              )}
            >
              <RecordRowPressable
                tone="card"
                baseColor={s.canvas}
                accessibilityLabel={t("home.mealList.open", { title: label })}
                onPress={() => onPressEntry(entry.diaryId)}
                style={styles.row}
              >
                <Thumbnail entry={entry} wellColor={s.surface} />
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, { color: ink.strong }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  {meta ? (
                    <Text
                      style={[styles.rowMeta, { color: ink.muted }]}
                      numberOfLines={1}
                    >
                      {meta}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={ink.placeholder}
                />
              </RecordRowPressable>
            </Animated.View>
          )
        })}
      </Animated.View>

      {overflow ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            hapticSelection()
            setExpanded((v) => !v)
          }}
          style={({ pressed }) => [
            styles.more,
            { borderTopColor: ink.hairline, opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.moreLabel, { color: ink.muted }]}>
            {expanded ? t("home.mealList.less") : t("home.mealList.more")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * 사진이 있으면 사진, 없거나 **못 불러오면** 끼니 그림. 서명 URL 이 만료됐거나 버킷이
 * 닿지 않는 환경(로컬 서버)에서 빈 네모가 남는 것보다, 무엇의 기록인지 그림이 말하는
 * 편이 낫다 — 사진이 안 온 것은 사진 쪽 문제지 기록이 없는 것이 아니다.
 */
function Thumbnail({
  entry,
  wellColor,
}: {
  entry: MealRecordEntry
  wellColor: string
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null)
  if (entry.imageUri && failedUri !== entry.imageUri) {
    const uri = entry.imageUri
    return (
      <View style={styles.thumb}>
        <Image
          source={remoteImageSource(uri)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFailedUri(uri)}
        />
        {/* 시안: 사진 위 #2A2A37 5% — 흰 그릇 사진의 가장자리가 바닥과 붙지 않게. */}
        <View style={styles.thumbScrim} />
      </View>
    )
  }
  const Graphic = MEAL_GRAPHIC[entry.mealType]
  return (
    <View
      style={[styles.thumb, styles.thumbWell, { backgroundColor: wellColor }]}
    >
      <Graphic width={28} height={28} />
    </View>
  )
}

/**
 * 식단 기록 CTA — 히어로 바로 아래의 주 행동(시안: h56 · r14 · 18/700).
 * 이 화면에서 브랜드색 면은 이것 하나뿐이다.
 */
export function RecordMealCta({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation("common")
  const s = useSurface()
  return (
    <SurfacePressable
      onPress={onPress}
      baseColor={s.brand}
      pressedColor={s.brand}
      style={styles.cta}
      accessibilityLabel={t("home.mealList.record")}
    >
      <Text style={[styles.ctaLabel, { color: s.onBrand }]}>
        {t("home.mealList.record")}
      </Text>
    </SurfacePressable>
  )
}

const THUMB = 52
const SECTION_X = 24

const styles = StyleSheet.create({
  // 시안: 제목 줄(18/25)이 CTA 아래 15, 그 바로 아래 첫 줄. 옆 여백은 24(타일의 20 과 다르다).
  section: { paddingTop: 16, paddingHorizontal: SECTION_X },
  title: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    fontWeight: "700",
  },
  // 시안: 줄 간격 84 = 사진 52 + 위아래 16.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(42,42,55,0.05)",
  },
  thumbWell: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
  },
  rowMeta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  // 시안: 위 선 있는 55 높이 줄, 글자 18/500.
  more: {
    height: 56,
    marginHorizontal: -SECTION_X,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  moreLabel: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    fontWeight: "500",
  },

  // 시안: y373 = 히어로 아래 16, 335×56, r16, 글자 17/700.
  cta: {
    marginTop: 16,
    marginHorizontal: LAYOUT.screenX,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
  },
})
