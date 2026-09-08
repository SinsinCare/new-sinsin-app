import { StyleSheet, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text } from "@/src/shared/components/AppText"
import { useTranslation } from "react-i18next"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { LAYOUT, TYPE, type SurfacePalette } from "@/src/theme/surface"
import type { PeriodType } from "../types/report"
type Surface = SurfacePalette & { isDark: boolean }
/* ─── 세그먼트(일/주/월) ──────────────────────────────────────── */

const PERIODS: PeriodType[] = ["day", "week", "month"]

/**
 * 트랙은 surfaceSunken, 선택 아이템만 흰 면 + textStrong.
 * 브랜드색은 선택 아이템의 2px 밑줄 인디케이터에만 쓴다 —
 * 세그먼트가 CTA 처럼 보이면 안 되기 때문이다.
 */
export function PeriodSegment({
  period,
  onChange,
  s,
}: {
  period: PeriodType
  onChange: (period: PeriodType) => void
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <View style={[styles.segmentTrack, { backgroundColor: s.surfaceSunken }]}>
      {PERIODS.map((item) => {
        const selected = item === period
        const label = t(`stats.period.${item}`)
        return (
          <View key={item} style={styles.segmentSlot}>
            <SurfacePressable
              onPress={() => onChange(item)}
              // "transparent" 금지 — 워클릿 색 보간이 죽는다. 트랙색을 그대로 깐다.
              baseColor={selected ? s.card : s.surfaceSunken}
              pressedColor={selected ? s.card : s.surfacePressed}
              style={styles.segmentItem}
              accessibilityLabel={t("stats.periodReport", { period: label })}
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: selected ? s.textStrong : s.textMuted },
                ]}
              >
                {label}
              </Text>
              {selected && (
                <View
                  style={[
                    styles.segmentIndicator,
                    { backgroundColor: s.brand },
                  ]}
                />
              )}
            </SurfacePressable>
          </View>
        )
      })}
    </View>
  )
}

/* ─── 기간 ‹ › 내비 ──────────────────────────────────────────── */

/** MonthCalendarSheet 의 NavButton 문법 — 32 원형 surface 면 */
export function NavButton({
  icon,
  label,
  onPress,
  disabled,
  s,
}: {
  icon: "chevron-back" | "chevron-forward"
  label: string
  onPress: () => void
  disabled?: boolean
  s: Surface
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled } : undefined}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.navButton,
            { backgroundColor: pressed ? s.surfaceSunken : s.canvas },
          ]}
        >
          <Ionicons
            name={icon}
            size={16}
            color={disabled ? s.placeholder : s.text}
          />
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  segmentTrack: {
    flexDirection: "row",
    borderRadius: LAYOUT.segment.radius,
    padding: 3,
    gap: 3,
  },
  segmentSlot: { flex: 1 },
  segmentItem: {
    minHeight: 44,
    paddingVertical: 8,
    borderRadius: LAYOUT.segment.itemRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: { ...TYPE.value, fontWeight: "700" },
  segmentIndicator: {
    position: "absolute",
    bottom: 5,
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
})
