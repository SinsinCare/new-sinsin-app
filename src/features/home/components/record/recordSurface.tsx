import type { ReactNode } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, MOTION, TYPE } from "@/src/theme/surface"

const EASE = Easing.bezier(0.22, 1, 0.36, 1)
const SPRING = { ...MOTION.spring, reduceMotion: ReduceMotion.System }

/**
 * 기록 홈의 표면 조각들. 구현 시트의 홈 토큰을 그대로 옮겼다 —
 * 섹션 패딩 24/20 · 카드 r16 p18 · 카드 간 12 · 섹션 타이틀 18/700 ·
 * 카드 타이틀 15/600 + 보조 12.5 · 칩 h36 r10 · 수치 28/700 + 단위 14.
 *
 * 섹션끼리는 8px 회색 밴드로 끊는다. 카드마다 그림자를 주지 않는다 —
 * 흰 카드와 회색 바닥의 톤 차이면 층이 충분히 읽힌다.
 */

export function RecordSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  const surface = useSurface()

  return (
    <View style={[styles.section, { backgroundColor: surface.canvas }]}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadText}>
          <Text
            style={[styles.sectionTitle, { color: surface.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.sectionSub, { color: surface.textWeak }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  )
}

/** 섹션 사이 8px 밴드. 구분선 대신 면으로 끊는다. */
export function SectionBand() {
  const surface = useSurface()
  return <View style={[styles.band, { backgroundColor: surface.surface }]} />
}

/** 섹션 헤더 우측의 보조 동작(되돌리기 등). */
export function SectionAction({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  const surface = useSurface()
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button">
      {({ pressed }) => (
        <Text
          style={[
            styles.sectionAction,
            { color: surface.textWeak, opacity: pressed ? 0.5 : 1 },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

/** 기록 카드 한 장. */
export function RecordSurfaceCard({
  children,
  style,
}: {
  children: ReactNode
  style?: object
}) {
  const surface = useSurface()
  return (
    <View style={[styles.card, { backgroundColor: surface.card }, style]}>
      {children}
    </View>
  )
}

/** 카드 제목 + 보조 한 줄. 값이 없을 때 "이전 기록이 없어요"를 보조에 쓴다. */
export function RecordCardHead({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  const surface = useSurface()
  return (
    <View style={styles.cardHead}>
      <Text
        style={[styles.cardTitle, { color: surface.textStrong }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>
      {hint ? (
        <Text
          style={[styles.cardHint, { color: surface.textWeak }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * 기록 수치. 값이 없으면 회색 플레이스홀더로 두고, 값이 들어오면 본문 색으로 승격한다
 * (시트 규칙). 크기로 이 카드에서 무엇이 주인공인지 말한다.
 */
export function RecordValue({
  value,
  unit,
  filled,
}: {
  value: string
  unit?: string
  filled: boolean
}) {
  const surface = useSurface()
  return (
    <View style={styles.valueRow}>
      <Text
        style={[
          styles.value,
          { color: filled ? surface.textStrong : surface.placeholder },
        ]}
      >
        {value}
      </Text>
      {unit ? (
        <Text style={[styles.unit, { color: surface.textWeak }]}>{unit}</Text>
      ) : null}
    </View>
  )
}

/**
 * 빠른 추가 칩(h36 r10). 그림자 없이 면 톤으로만 뜬다.
 * 누르면 살짝 눌렸다 스프링으로 돌아온다 — 연타(물 +100 …)에 리듬이 생긴다.
 */
export function RecordChip({
  label,
  onPress,
  accessibilityLabel,
  selected,
}: {
  label: string
  onPress: () => void
  accessibilityLabel?: string
  selected?: boolean
}) {
  const surface = useSurface()
  const press = useSharedValue(0)

  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      press.value,
      [0, 1],
      [
        selected ? surface.surfaceBrand : surface.surface,
        surface.surfacePressed,
      ],
    ),
    transform: [{ scale: 1 - press.value * 0.04 }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      onPressIn={() => {
        press.value = withTiming(1, {
          duration: 80,
          easing: EASE,
          reduceMotion: ReduceMotion.System,
        })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
    >
      <Animated.View style={[styles.chip, chipStyle]}>
        <Text
          style={[
            styles.chipLabel,
            {
              color: selected ? surface.brand : surface.text,
              fontWeight: selected ? "600" : "500",
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

/** 카드 아래 주 액션(h52 r16). */
export function RecordCta({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  const surface = useSurface()
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.cta,
            { backgroundColor: surface.brand, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Text style={[styles.ctaLabel, { color: surface.onBrand }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: LAYOUT.section.paddingVertical,
    paddingHorizontal: LAYOUT.section.paddingHorizontal,
    gap: LAYOUT.card.gap,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeadText: { flex: 1, gap: 4 },
  sectionTitle: { ...TYPE.sectionTitle, fontWeight: "700" },
  sectionSub: TYPE.cardSub,
  sectionAction: { ...TYPE.caption, fontWeight: "500" },
  band: { height: LAYOUT.section.gap },
  card: {
    borderRadius: LAYOUT.card.radius,
    padding: LAYOUT.card.padding,
    gap: 12,
  },
  cardHead: { gap: 2 },
  cardTitle: { ...TYPE.cardTitle, fontWeight: "600" },
  cardHint: TYPE.cardSub,
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: { ...TYPE.numeric, fontWeight: "700" },
  unit: { ...TYPE.unit, fontWeight: "500" },
  chip: {
    height: LAYOUT.chip.height,
    borderRadius: LAYOUT.chip.radius,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: TYPE.caption,
  cta: {
    height: LAYOUT.ctaCompact.height,
    borderRadius: LAYOUT.ctaCompact.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { ...TYPE.cta, fontWeight: "700" },
})
