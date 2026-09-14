/**
 * 인분 스테퍼 — 서버가 영양을 이 값으로 **나눈다**. 컨트롤은 키트 칩과 같은
 * 높이(`FORM.choiceHeight`)·모서리(`FORM.choiceRadius`)·바탕(`s.surfaceSunken`)이다.
 */

import { StyleSheet, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import {
  FORM,
  MIN,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

interface ServingsStepperProps {
  label: string
  /** 화면에 그리는 값 문구(`2명`). 숫자와 문구를 나눠 두어야 로케일이 갈린다. */
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
    <View style={styles.group}>
      <View style={styles.row}>
        <V2Text style={styles.label} color={s.textStrong}>
          {label}
        </V2Text>
        <View style={[styles.control, { backgroundColor: s.surfaceSunken }]}>
          <Pressable
            onPress={() => onChange(value - 1)}
            disabled={!canDecrease}
            accessibilityRole="button"
            accessibilityLabel={decreaseLabel}
            accessibilityState={{ disabled: !canDecrease }}
            style={styles.button}
          >
            <Ionicons
              name="remove"
              size={18}
              color={canDecrease ? s.textStrong : s.textWeak}
            />
          </Pressable>
          <V2Text style={styles.value} color={s.textStrong}>
            {valueText}
          </V2Text>
          <Pressable
            onPress={() => onChange(value + 1)}
            disabled={!canIncrease}
            accessibilityRole="button"
            accessibilityLabel={increaseLabel}
            accessibilityState={{ disabled: !canIncrease }}
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
      <V2Text style={styles.hint} color={s.text}>
        {note}
      </V2Text>
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: FORM.labelGap },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[3],
  },
  label: { ...FORM.label, flexShrink: 1 },
  hint: FORM.hint,
  control: {
    flexDirection: "row",
    alignItems: "center",
    height: FORM.choiceHeight,
    borderRadius: FORM.choiceRadius,
    paddingHorizontal: S[1],
  },
  button: {
    width: MIN.TOUCH,
    height: FORM.choiceHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { ...FORM.option, minWidth: MIN.TOUCH, textAlign: "center" },
})
