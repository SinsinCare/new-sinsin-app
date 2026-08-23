import Ionicons from "@expo/vector-icons/Ionicons"
import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import BreakfastGraphic from "@/assets/images/meal-breakfast.svg"
import DinnerGraphic from "@/assets/images/meal-dinner.svg"
import LunchGraphic from "@/assets/images/meal-lunch.svg"
import SnackGraphic from "@/assets/images/meal-snack.svg"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { TYPE } from "@/src/theme/surface"

import { MEAL_OPTIONS } from "../../data/mealConstants"
import type { MealType } from "../../types"
import type { MealSlotStatus } from "./sheets/MealSheet"

/**
 * 식이 기록 타임라인 — 홈 최상단, 오늘 기록 위.
 *
 * 이 앱의 핵심 행동은 식사 기록이라 네 끼니를 항상 보이는 자리에 둔다.
 * 카드가 곧 상태다: 사진이 차 있으면 "기록됨 + 리포트 입구", 비어 있으면
 * "기록 입구". 별도 설명 없이 눌러 볼 이유가 생긴다.
 *
 * 색 규칙은 리포트와 같다 — 구조는 그레이스케일, 브랜드는 체크 도장과
 * CTA 딱 두 곳. 사진이 이미 색을 갖고 있으므로 UI 가 색을 보태지 않는다.
 */

/**
 * 디자인이 넘겨준 끼니 일러스트. 매핑은 그림 내용 기준 —
 * 아침=밥그릇에 김, 점심=주먹밥, 저녁=피자, 간식=컵케이크(컨셉 시안 순서).
 * TileIcon 과 같은 이유로 이모지가 아니라 자산을 쓴다.
 */
const MEAL_GRAPHIC: Record<
  MealType,
  React.ComponentType<{ width?: number; height?: number }>
> = {
  BREAKFAST: BreakfastGraphic,
  LUNCH: LunchGraphic,
  DINNER: DinnerGraphic,
  SNACKS: SnackGraphic,
}

interface MealTimelineProps {
  slots: Partial<Record<MealType, MealSlotStatus>>
  /** 기록된 끼니 탭 → 리포트 */
  onPressRecorded: (mealType: MealType) => void
  /** 빈/건너뛴 끼니 탭 → 그 끼니가 선택된 기록 시트 */
  onPressEmpty: (mealType: MealType) => void
  /** 하단 CTA → 기록 시트(끼니는 시간으로 추론) */
  onPressRecord: () => void
}

export function MealTimeline({
  slots,
  onPressRecorded,
  onPressEmpty,
  onPressRecord,
}: MealTimelineProps) {
  const { t } = useTranslation("common")
  const s = useSurface()
  const recordedCount = MEAL_OPTIONS.filter(
    (option) => slots[option.type]?.recorded && !slots[option.type]?.skipped,
  ).length

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: s.textStrong }]}>
          {t("home.timeline.title")}
        </Text>
        <Text style={[styles.headHint, { color: s.textMuted }]}>
          {recordedCount > 0
            ? t("home.timeline.count", { count: recordedCount })
            : t("home.todayRecord.hint")}
        </Text>
      </View>

      {recordedCount === 0 && (
        <Text
          style={[styles.emptyCaption, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("home.timeline.empty")}
        </Text>
      )}

      <View style={styles.row}>
        {MEAL_OPTIONS.map((option) => {
          const slot = slots[option.type]
          const skipped = slot?.skipped ?? false
          const recorded = (slot?.recorded ?? false) && !skipped

          return (
            <View key={option.type} style={styles.cell}>
              <MealCard
                mealType={option.type}
                label={t(`meal.${option.type}`)}
                slot={slot}
                recorded={recorded}
                skipped={skipped}
                onPress={() =>
                  recorded
                    ? onPressRecorded(option.type)
                    : onPressEmpty(option.type)
                }
                s={s}
              />
            </View>
          )
        })}
      </View>

      <SurfacePressable
        onPress={onPressRecord}
        baseColor={s.brand}
        pressedColor={s.brand}
        style={styles.cta}
        accessibilityLabel={t("home.timeline.add")}
      >
        <Ionicons name="camera" size={17} color={s.onBrand} />
        <Text style={[styles.ctaLabel, { color: s.onBrand }]}>
          {t("home.timeline.add")}
        </Text>
      </SurfacePressable>
    </View>
  )
}

function MealCard({
  mealType,
  label,
  slot,
  recorded,
  skipped,
  onPress,
  s,
}: {
  mealType: MealType
  label: string
  slot: MealSlotStatus | undefined
  recorded: boolean
  skipped: boolean
  onPress: () => void
  s: ReturnType<typeof useSurface>
}) {
  const { t } = useTranslation("common")
  const imageUri = slot?.imageUri ?? undefined
  const time = slot?.time

  const a11y = recorded
    ? t("home.timeline.openRecorded", { meal: label, time: time ?? "" })
    : skipped
      ? t("home.timeline.recordSkipped", { meal: label })
      : t("home.timeline.recordMeal", { meal: label })

  // SurfacePressable 은 면 색을 보간한다 — "transparent" 를 넘기면 워클릿이
  // 죽어 카드가 통째로 사라진다(실제로 겪었다). 래퍼 자신이 카드 면이 된다.

  /*
    세 분기가 전부 SurfacePressable 이라 React 는 인스턴스를 재사용한다. 예전에는
    그 재사용이 안드로이드 릴리즈에서 "기록된 끼니가 민짜 회색 상자"로 보이던
    QA(2026-08-06)의 원인이었다 — 데이터 도착으로 빈 카드 → 사진 카드로 자식이
    통째로 바뀌면 새 자식이 그려지지 않았다. 지금은 SurfacePressable 자신이
    자식 구성 변화를 감지해 리마운트한다(childrenShapeKey 머리말). 여기서
    분기별 key 를 다시 달 필요는 없다.
  */
  // ── 기록됨 + 사진: 사진이 카드 전체를 채우고 글자는 하단 그라데이션 위 ──
  if (recorded && imageUri) {
    return (
      <SurfacePressable
        onPress={onPress}
        baseColor={s.surfacePressed}
        pressedColor={s.surfacePressed}
        style={styles.card}
        accessibilityLabel={a11y}
      >
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        {/* 얇은 전면 스크림 + 진한 하단 그라데이션 — 밝은 사진(흰 그릇·우유)
            위에서도 글자와 체크가 항상 읽힌다. 그라데이션만으로는 사진 상단의
            체크 도장이 묻힌다. */}
        <View style={styles.photoScrim} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.78)"]}
          style={styles.cardShade}
        />
        <CheckBadge color={s.brand} />
        <View style={styles.cardFoot}>
          <Text style={styles.photoLabel} numberOfLines={1}>
            {label}
          </Text>
          {!!time && <Text style={styles.photoTime}>{time}</Text>}
        </View>
      </SurfacePressable>
    )
  }

  // ── 기록됨 + 사진 없음(글 기록): 기록 틴트 면 ──
  if (recorded) {
    return (
      <SurfacePressable
        onPress={onPress}
        baseColor={s.recordedTint}
        pressedColor={s.surfacePressed}
        style={styles.card}
        accessibilityLabel={a11y}
      >
        <CheckBadge color={s.brand} />
        <View style={styles.cardFoot}>
          <Text style={[styles.textLabel, { color: s.textStrong }]}>
            {label}
          </Text>
          {!!time && (
            <Text style={[styles.textTime, { color: s.textMuted }]}>
              {time}
            </Text>
          )}
        </View>
      </SurfacePressable>
    )
  }

  // ── 건너뜀 / 아직 기록 전 ──
  return (
    <SurfacePressable
      onPress={onPress}
      baseColor={s.card}
      pressedColor={s.surfacePressed}
      style={[styles.card, styles.emptyCard, { borderColor: s.hairline }]}
      accessibilityLabel={a11y}
    >
      {/* 코너 + 를 칩에 담는다 — 맨살 아이콘은 미완성처럼 읽힌다(컨셉 대비 피드백) */}
      <View style={[styles.plusChip, { backgroundColor: s.surface }]}>
        <Ionicons
          name={skipped ? "refresh" : "add"}
          size={12}
          color={s.textMuted}
        />
      </View>
      <View style={styles.emptyCenter}>
        <Graphic mealType={mealType} />
        <Text style={[styles.emptyLabel, { color: s.text }]} numberOfLines={1}>
          {label}
        </Text>
        {skipped && (
          <Text style={[styles.skippedTag, { color: s.textWeak }]}>
            {t("home.timeline.skipped")}
          </Text>
        )}
      </View>
    </SurfacePressable>
  )
}

function Graphic({ mealType }: { mealType: MealType }) {
  const Component = MEAL_GRAPHIC[mealType]
  return <Component width={34} height={34} />
}

function CheckBadge({ color }: { color: string }) {
  return (
    <View style={[styles.check, { backgroundColor: color }]}>
      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },

  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  // 오늘 기록 헤더와 같은 실측 값 — 두 섹션이 한 화면에서 같은 위계를 쓴다.
  title: {
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  headHint: { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  emptyCaption: { ...TYPE.cardSub, marginTop: -6 },

  row: { flexDirection: "row", gap: 10 },
  cell: { flex: 1 },
  card: {
    width: "100%",
    height: 118,
    borderRadius: 20,
    overflow: "hidden",
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },

  photoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  cardShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
  },
  cardFoot: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 9,
    gap: 1,
  },
  photoLabel: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#FFFFFF",
  },
  photoTime: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    fontVariant: ["tabular-nums"],
  },
  textLabel: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  textTime: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },

  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    // 사진 위에서 도장이 배경과 분리되도록 — 컨셉 이미지의 디테일.
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  plusChip: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCenter: { alignItems: "center", gap: 7 },
  emptyLabel: { fontSize: 13, lineHeight: 17, fontWeight: "600" },
  skippedTag: { fontSize: 10.5, lineHeight: 13 },

  cta: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 2,
  },
  ctaLabel: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
})
