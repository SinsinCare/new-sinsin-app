// Design System v2 — Select Field
// Spec: docs/design/community-redesign/compose.md §2.4 (카테고리 필드) · 00-MASTER §4-G17
//
// **고르는 칸**이다. 생김새는 `V2TextField` 의 box 와 같고, 안이 `TextInput` 이 아니라
// `Text` 이며 우측에 `chevronDown` 이 붙는다. 누르면 시트가 열리고, 고른 값이 이 칸에
// 표시된다(값 커밋은 시트의 CTA 가 한다 — 시안 F2).
//
// ## 왜 `V2TextField` 로 흉내 내지 않는가
//
// `editable={false}` 인 `TextInput` 으로도 비슷하게 그릴 수는 있다. 하지만 그 칸은
//  - 스크린리더에 **입력**으로 읽히고(실제로는 버튼이다),
//  - 안드로이드에서 롱프레스 시 붙여넣기 메뉴가 뜨며,
//  - `placeholder` 와 값의 색 규칙을 소비처가 다시 쓰게 된다.
// 그래서 별도 컴포넌트로 두되, **상자는 한 곳에서 계산한다**(`v2FieldChrome`).
// radius·테두리·패딩·최소높이를 여기서 다시 적으면 언젠가 한쪽만 바뀌고, 그때 글쓰기
// 화면에는 높이가 다른 두 칸이 세로로 나란히 선다.

import { type ReactNode } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import { spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import {
  v2FieldChrome,
  v2InputTypography,
  type V2TextFieldTone,
} from "./V2TextField"

export type V2SelectFieldProps = {
  /** 고른 값. 비어 있으면 `placeholder` 를 `label.alternative` 로 보여 준다. */
  value?: string | null
  /** 값이 없을 때의 안내문. 실제 문구는 사용처에서 주입(t()). */
  placeholder?: string
  /** 칸을 눌렀을 때 — 보통 선택 시트를 연다. */
  onPress: () => void
  /** 필드 상단 라벨. `V2TextField` 와 같은 계약(문자열 또는 두 톤짜리 노드). */
  label?: string | ReactNode
  /** 필수 필드 표시(오류 색 별표). `V2TextField` 와 같다. */
  required?: boolean
  /** 필드 하단 안내 문구 (에러가 문자열이면 그 문자열로 대체) */
  helperText?: string
  /** 에러 상태. 문자열이면 helperText 대신 그 메시지를 붉게 표기 */
  error?: boolean | string
  disabled?: boolean
  /** 면 처리. 기본 `outlined`(흰 면 + 1px 테두리). */
  tone?: V2TextFieldTone
  /** 루트 컨테이너 스타일 */
  style?: ViewStyle
  /** 스크린리더용 이름. 없으면 라벨이 문자열일 때 그것을 쓴다. */
  accessibilityLabel?: string
}

export function V2SelectField({
  value,
  placeholder,
  onPress,
  label,
  required = false,
  helperText,
  error = false,
  disabled = false,
  tone = "outlined",
  style,
  accessibilityLabel,
}: V2SelectFieldProps) {
  const { colors } = useV2Theme()

  const isError = !!error
  const message =
    typeof error === "string" && error.length > 0 ? error : helperText

  // 고른 값이 있으면 label.normal, 없으면 placeholder 색(label.alternative).
  //  — `V2TextField` 가 placeholderTextColor 로 하는 일을 여기선 직접 고른다.
  const hasValue = value != null && value.length > 0
  const displayText = hasValue ? value : placeholder

  /*
    누르는 칸이므로 focus 상태가 없다 — 포커스 틴트·포커스 테두리도 없다.
    (칸을 누르면 곧바로 시트가 뜨므로 "포커스된 채 머무는" 순간 자체가 없다.)
  */
  const { field, labelColor, messageColor } = v2FieldChrome({
    colors,
    tone,
    focused: false,
    disabled,
    error: isError,
  })

  return (
    <View style={[styles.root, style]}>
      {label != null && (
        <Text style={[typography.subtext.mediumStrong, { color: labelColor }]}>
          {label}
          {required && (
            <Text style={{ color: colors.status.negative }}> *</Text>
          )}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={
          accessibilityLabel ?? (typeof label === "string" ? label : undefined)
        }
        accessibilityValue={hasValue ? { text: value } : undefined}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.field,
          field,
          // 눌림 피드백은 코드베이스 관례대로 opacity (V2ListRow 와 같은 값).
          pressed && styles.pressed,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            // 값 타이포는 `V2TextField` 의 입력과 **같은 함수**에서 나온다 — 두 칸이
            //  세로로 나란히 설 때 글자 크기·서체가 어긋나지 않게.
            v2InputTypography(),
            {
              color: hasValue ? colors.label.normal : colors.label.alternative,
            },
            disabled && styles.disabledText,
          ]}
        >
          {displayText}
        </Text>

        {/* 트레일링 캐럿 — 20 박스(시안 실측 9.1×5.3 글리프), label.assistive. */}
        <V2Icon name="chevronDown" size="sm" color={colors.label.assistive} />
      </Pressable>

      {message != null && message.length > 0 && (
        <Text style={[typography.subtext.medium, { color: messageColor }]}>
          {message}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // 라벨·필드·헬퍼 세로 스택 — `V2TextField` 와 같은 gap 6.
  root: {
    gap: spacing[6],
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    // 값 ↔ 캐럿 사이. 캐럿의 우측 인셋은 상자의 paddingHorizontal(16)이 준다.
    gap: spacing[8],
  },
  value: {
    flex: 1,
  },
  pressed: { opacity: 0.6 },
  // Disabled: 값 텍스트만 흐리게(`V2TextField` 와 같은 규칙). 면은 fill.normal.
  disabledText: { opacity: 0.3 },
})
