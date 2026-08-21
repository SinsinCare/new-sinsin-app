/**
 * 인분 조절. 재료 바로 아래에 둔다 — 이 값이 영양 미리보기의 분모다(계약 §3.5:
 * `nutrition` 은 servings 로 나눈 1인분 기준).
 *
 * 상한·하한에서 버튼을 **끄고 색을 뺀다**. 눌리는 것처럼 보이는데 아무 일도 없으면
 * 사용자는 앱이 멈춘 줄 안다.
 */

import { StyleSheet, View, Pressable } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"

interface ServingsStepperProps {
  label: string
  /** 이미 `{{value}}인분` 으로 만들어진 문구. */
  valueText: string
  note: string
  value: number
  onChange: (value: number) => void
  decreaseLabel: string
  increaseLabel: string
}

export function ServingsStepper({
  label,
  valueText,
  note,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
}: ServingsStepperProps) {
  const s = useSurface()
  const canDecrease = value > RECIPE_WRITE_LIMITS.servingsMin
  const canIncrease = value < RECIPE_WRITE_LIMITS.servingsMax

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: s.textStrong }]}>{label}</Text>
        <View style={[styles.control, { backgroundColor: s.surface }]}>
          <Pressable
            onPress={() => onChange(value - 1)}
            disabled={!canDecrease}
            accessibilityRole="button"
            accessibilityLabel={decreaseLabel}
            accessibilityState={{ disabled: !canDecrease }}
            hitSlop={8}
            style={styles.button}
          >
            <Ionicons
              name="remove"
              size={18}
              color={canDecrease ? s.textStrong : s.textWeak}
            />
          </Pressable>
          <Text style={[styles.value, { color: s.textStrong }]}>
            {valueText}
          </Text>
          <Pressable
            onPress={() => onChange(value + 1)}
            disabled={!canIncrease}
            accessibilityRole="button"
            accessibilityLabel={increaseLabel}
            accessibilityState={{ disabled: !canIncrease }}
            hitSlop={8}
            style={styles.button}
          >
            <Ionicons
              name="add"
              size={18}
              color={canIncrease ? s.textStrong : s.textWeak}
            />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.note, { color: s.textMuted }]}>{note}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // 다른 쓰기 폼 라벨과 같은 급(`WriteTextField`·`WriteChipRail`).
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  control: {
    flexDirection: "row",
    alignItems: "center",
    height: LAYOUT.control.height,
    borderRadius: LAYOUT.control.radius,
    paddingHorizontal: 6,
    gap: 4,
  },
  button: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    ...TYPE.value,
    fontWeight: "600",
    minWidth: 56,
    textAlign: "center",
  },
  note: { ...TYPE.cardSub },
})
