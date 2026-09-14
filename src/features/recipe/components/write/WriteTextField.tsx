/**
 * 라벨 + 텍스트 입력 한 칸 — 홈 건강기록 키트의 **텍스트 면**이다(2026-09-12 통일).
 *
 * 면은 `KidneyProfileEditScreen` 의 `otherField` 와 같다: `FIELD.radius` 16 ·
 * `s.surfaceSunken` 바탕 · 포커스에 `s.brand` 테두리 · 오류에 `s.danger`. 치수·타이포는
 * `recordPageSpec` 한 벌에서만 온다 — 예전의 `bordered`/`sunken` 두 변형과 `LAYOUT.field`
 * 는 걷어냈다(같은 페이지에 면이 두 벌이면 어느 칸이 입력인지 두 번 배워야 한다).
 *
 * 글자 수 상한은 **입력에서** 막고(`maxLength`) 남은 수를 보여 준다 — 넘겨 보내면
 * 서버가 400 을 주는데 그때는 어느 칸이 문제였는지 알 수 없다.
 * 카운터는 한 줄 칸에서는 상한 근처(90%)에서만, 여러 줄 칸에서는 늘 그린다 —
 * 문단을 쓰는 칸에서는 남은 양이 곧 계획이다. 여러 줄 칸의 카운터는 우물 안 오른쪽
 * 아래에 서고, 겹침을 막으려고 입력의 `paddingBottom` 으로 그 높이를 비운다.
 */

import { useState } from "react"
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { useSurface } from "@/src/hooks/useSurface"
import { recordFieldLabel } from "@/src/features/home/components/record/pages/recordInk"
import {
  FIELD,
  FORM,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

interface WriteTextFieldBaseProps {
  label: string
  /** 필수 표시. */
  required?: boolean
  /** 라벨 옆 보조 표기(`선택`). */
  labelSuffix?: string | null
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  maxLength: number
  /** `null` 이면 카운터를 그리지 않는다. */
  counterText?: string | null
  multiline?: boolean
  keyboardType?: "default" | "number-pad"
  /** 값 뒤에 붙는 단위. */
  suffix?: string | null
  /** 오류 상태 — 테두리가 `s.danger` 가 된다. 문구는 호출부가 `RecordFieldHint` 로 붙인다. */
  invalid?: boolean
}
type WriteTextFieldClearProps =
  | { clearable?: false; clearAccessibilityLabel?: never }
  | { clearable: true; clearAccessibilityLabel: string }
export type WriteTextFieldProps = WriteTextFieldBaseProps &
  WriteTextFieldClearProps

export function WriteTextField({
  label,
  required = false,
  labelSuffix,
  value,
  onChangeText,
  placeholder,
  maxLength,
  counterText,
  multiline = false,
  keyboardType = "default",
  suffix,
  invalid = false,
  clearable = false,
  clearAccessibilityLabel,
}: WriteTextFieldProps) {
  const s = useSurface()
  const [focused, setFocused] = useState(false)
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const nearLimit = value.length >= maxLength * 0.9
  const showCounter = counterText != null && (multiline || nearLimit)
  const counterReserve = FORM.hint.lineHeight * fontScale
  const showClear = clearable && value.length > 0 && !multiline
  const counterColor = nearLimit ? s.textStrong : recordFieldLabel(s)

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <V2Text style={styles.label} color={s.textStrong}>
          {label}
          {required ? <V2Text color={s.brand}> *</V2Text> : null}
        </V2Text>
        {labelSuffix ? (
          <V2Text style={styles.hint} color={s.text}>
            {labelSuffix}
          </V2Text>
        ) : null}
      </View>
      <View
        style={[
          styles.field,
          multiline ? styles.fieldMultiline : styles.fieldSingle,
          {
            backgroundColor: focused ? s.canvas : s.surfaceSunken,
            borderColor: invalid
              ? s.danger
              : focused
                ? s.brand
                : s.surfaceSunken,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={recordFieldLabel(s)}
          selectionColor={s.brand}
          maxLength={maxLength}
          multiline={multiline}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          textAlignVertical={multiline ? "top" : "center"}
          style={[
            styles.input,
            multiline ? styles.inputMultiline : styles.inputSingle,
            { color: s.textStrong },
            multiline && showCounter ? { paddingBottom: counterReserve } : null,
          ]}
        />
        {suffix ? (
          <V2Text style={styles.suffix} color={recordFieldLabel(s)}>
            {suffix}
          </V2Text>
        ) : null}
        {showClear ? (
          <Pressable
            onPress={() => onChangeText("")}
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            hitSlop={{ top: S[3], bottom: S[3], left: S[1], right: S[3] }}
          >
            <Ionicons name="close-circle" size={20} color={s.textWeak} />
          </Pressable>
        ) : null}
        {showCounter && multiline ? (
          <V2Text
            pointerEvents="none"
            style={[styles.counter, styles.counterInWell]}
            color={counterColor}
          >
            {counterText}
          </V2Text>
        ) : null}
      </View>
      {showCounter && !multiline ? (
        <V2Text style={styles.counter} color={counterColor}>
          {counterText}
        </V2Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: FORM.labelGap },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: S[2] },
  label: FORM.label,
  hint: FORM.hint,
  field: {
    flexDirection: "row",
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
    gap: S[2],
  },
  fieldSingle: { minHeight: FIELD.height - S[6], alignItems: "center" },
  fieldMultiline: { minHeight: FIELD.heroHeight, alignItems: "stretch" },
  input: {
    ...FORM.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    padding: 0,
  },
  /** 한 줄 칸은 행간을 떼야 두 OS 에서 높이가 같다(`singleLineInputText` 와 같은 처방). */
  inputSingle: { lineHeight: undefined, includeFontPadding: false },
  inputMultiline: {},
  suffix: FORM.body,
  counter: { ...FORM.hint, textAlign: "right" },
  counterInWell: {
    position: "absolute",
    right: FIELD.paddingX,
    bottom: S[3],
  },
})
