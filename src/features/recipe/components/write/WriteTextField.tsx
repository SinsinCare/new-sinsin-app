/**
 * 라벨 + 입력 한 칸. 글자 수 상한을 **입력에서** 막고(`maxLength`) 남은 수를 보여준다.
 *
 * 왜 상한을 앱이 막는가: 계약 §3.6 의 상한을 넘겨 보내면 서버가 400 을 준다. 그때
 * 사용자가 보는 것은 "등록 실패" 뿐이고, 어느 칸의 몇 번째 글자가 문제였는지는
 * 알 수 없다. 애초에 넘겨 적을 수 없게 하는 편이 정직하다.
 *
 * 카운터는 **상한에 가까워질 때만** 진해진다. 항상 진하면 200자 중 3자를 쓴 사람에게도
 * 경고처럼 보인다.
 */

import { StyleSheet, Text, TextInput, View } from "react-native"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE, singleLineInputText } from "@/src/theme/surface"

interface WriteTextFieldProps {
  label: string
  /** 필수 입력 — 라벨 뒤에 브랜드색 * 를 붙인다(QA 2026-08-02 필수 강조). */
  required?: boolean
  /** "선택" 처럼 라벨 옆에 붙는 표시. */
  labelSuffix?: string | null
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  maxLength: number
  /** `{{length}}/{{max}}` 로 이미 만들어진 문구. 없으면 카운터를 안 그린다. */
  counterText?: string | null
  multiline?: boolean
  minHeight?: number
  keyboardType?: "default" | "number-pad"
  /** 오른쪽에 붙는 단위(분 등). */
  suffix?: string | null
}

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
  minHeight,
  keyboardType = "default",
  suffix,
}: WriteTextFieldProps) {
  const s = useSurface()
  const nearLimit = value.length >= maxLength * 0.9

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: s.textStrong }]}>
          {label}
          {required ? <Text style={{ color: s.brand }}> *</Text> : null}
        </Text>
        {labelSuffix ? (
          <Text style={[styles.labelSuffix, { color: s.textWeak }]}>
            {labelSuffix}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.field,
          {
            backgroundColor: s.surface,
            minHeight: minHeight ?? LAYOUT.field.height,
            alignItems: multiline ? "flex-start" : "center",
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={s.placeholder}
          maxLength={maxLength}
          multiline={multiline}
          keyboardType={keyboardType}
          accessibilityLabel={label}
          style={[
            styles.input,
            {
              color: s.textStrong,
              textAlignVertical: multiline ? "top" : "center",
              // 여러 줄에서는 lineHeight 가 줄 간격이라는 제 역할을 한다.
              ...(multiline ? { lineHeight: TYPE.value.lineHeight } : null),
            },
          ]}
        />
        {suffix ? (
          <Text style={[styles.suffix, { color: s.textMuted }]}>{suffix}</Text>
        ) : null}
      </View>
      {counterText ? (
        <Text
          style={[
            styles.counter,
            { color: nearLimit ? s.textMuted : s.textWeak },
          ]}
        >
          {counterText}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  label: { ...TYPE.label, fontWeight: "600" },
  labelSuffix: { ...TYPE.caption, fontSize: 12 },
  field: {
    flexDirection: "row",
    borderRadius: LAYOUT.field.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    // 기본은 한 줄 규격(lineHeight 없음). 여러 줄일 때만 아래에서 줄 간격을 되돌려 준다 —
    // 한 줄 입력에 lineHeight 가 있으면 iOS 가 글자를 세로로 튕긴다.
    ...singleLineInputText(TYPE.value),
    padding: 0,
  },
  suffix: { ...TYPE.value },
  counter: { ...TYPE.caption, fontSize: 12, textAlign: "right" },
})
