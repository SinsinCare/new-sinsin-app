/**
 * 조리 순서의 **접힌 칸**. 누르면 `StepSheet` 가 열린다. 시안의 "조리 순서가
 * 입력되었습니다" 대신 단계 수(`조리 순서 4단계`)와 첫 단계 한 줄을 보여 준다 —
 * 접힌 칸이 내용을 말해야 무엇을 올리는지 알 수 있다.
 *
 * 면은 키트 텍스트 면과 같다(`FIELD.radius` · `s.surfaceSunken`).
 */

import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

interface StepSummaryFieldProps {
  label: string
  required?: boolean
  /** 비었을 때 칸에 적히는 안내. */
  placeholder: string
  /** `조리 순서 4단계`. 없으면 `null`. */
  summary: string | null
  /** 첫 단계 한 줄. */
  detail?: string | null
  onPress: () => void
  accessibilityLabel: string
}

export function StepSummaryField({
  label,
  required = false,
  placeholder,
  summary,
  detail,
  onPress,
  accessibilityLabel,
}: StepSummaryFieldProps) {
  const s = useSurface()
  const filled = summary !== null && summary.length > 0
  return (
    <View style={styles.group}>
      <V2Text style={styles.label} color={s.textStrong}>
        {label}
        {required ? <V2Text color={s.brand}> *</V2Text> : null}
      </V2Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          filled
            ? [accessibilityLabel, summary, detail]
                .filter((part) => part != null && part !== "")
                .join(", ")
            : `${accessibilityLabel}, ${placeholder}`
        }
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
            borderColor: s.surfaceSunken,
          },
        ]}
      >
        <View style={styles.body}>
          {filled ? (
            <>
              <V2Text
                numberOfLines={1}
                style={styles.value}
                color={s.textStrong}
              >
                {summary}
              </V2Text>
              {detail ? (
                <V2Text
                  numberOfLines={1}
                  style={styles.hint}
                  color={recordFieldLabel(s)}
                >
                  {detail}
                </V2Text>
              ) : null}
            </>
          ) : (
            <V2Text
              numberOfLines={1}
              style={styles.value}
              color={recordFieldLabel(s)}
            >
              {placeholder}
            </V2Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={s.text} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: FORM.labelGap },
  label: FORM.label,
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    minHeight: FIELD.height - S[6],
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
  },
  body: { flex: 1, gap: S[1] },
  value: FORM.body,
  hint: FORM.hint,
})
