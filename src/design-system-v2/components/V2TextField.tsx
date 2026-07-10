// Design System v2 — Text Field
// Spec: project/design-system-v2/design-system-base/components/Text-Field.md (Figma node 31:30)
//  - Box (node 31:1405): 테두리 박스형 · Line (node 31:1090): 밑줄형
//
// Figma의 States(Default/Focused/Typing/Typed/Disabled)를 RN 런타임으로 매핑:
//  - variant(box/line) · label/helper/error/disabled → props (선언적)
//  - Focused              → onFocus/onBlur 내부 state (prop 아님)
//  - Filled/Typed         → `value` 유무로 RN이 placeholder↔값 자동 전환
//  - Error / Disabled     → prop
//
// RN TextInput을 감싼 controlled 입력. value·onChangeText·keyboardType·
// secureTextEntry(password)·multiline(textArea) 등은 {...rest}로 그대로 전달.
// 시맨틱 색은 useV2Theme(다크 자동). 타이포는 <Text>/<TextInput>에 토큰 그대로(fontWeight 미사용).

import { useState } from "react"
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native"
import { borderWidth, radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"

// 이름은 Figma 축과 1:1(소문자화). Box=테두리, Line=밑줄.
export type V2TextFieldVariant = "box" | "line"

// TextInput의 `style`/`editable`은 자체 관리(inputStyle·disabled로 노출)하므로 제외하고 나머지는 스프레드.
export type V2TextFieldProps = Omit<TextInputProps, "style" | "editable"> & {
  variant?: V2TextFieldVariant
  /** 필드 상단 라벨 */
  label?: string
  /** 필드 하단 안내 문구 (에러가 문자열이면 그 문자열로 대체) */
  helperText?: string
  /** 에러 상태. 문자열이면 helperText 대신 그 메시지를 붉게 표기 */
  error?: boolean | string
  disabled?: boolean
  /** 루트 컨테이너 스타일 (V2Button의 prop style 규약과 동일) */
  style?: ViewStyle
  /** 입력(TextInput) 스타일 override */
  inputStyle?: TextStyle
}

// 스펙 실측 치수 (controlHeight 사다리에 없는 필드 전용 값 → 리터럴 + 주석).
const BOX_MIN_HEIGHT = 54 // Box 단일행
const BOX_MIN_HEIGHT_MULTILINE = 80 // Box Text Area(멀티행)
const LINE_MIN_HEIGHT = 30 // Line 단일행

export function V2TextField({
  variant = "box",
  label,
  helperText,
  error = false,
  disabled = false,
  style,
  inputStyle,
  multiline,
  onFocus,
  onBlur,
  placeholderTextColor,
  selectionColor,
  ...rest
}: V2TextFieldProps) {
  const { colors } = useV2Theme()
  // Focused = 런타임 상태(스펙의 Focused/Typing에 대응). 값 유무는 RN이 placeholder로 자동 처리.
  const [focused, setFocused] = useState(false)

  const isError = !!error
  const isBox = variant === "box"
  // error가 문자열이면 그 메시지를, 아니면 helperText를 하단에 표기.
  const message =
    typeof error === "string" && error.length > 0 ? error : helperText

  // 라벨 색: Error=negative → Box Focused=primary(스펙: Box는 포커스 시 라벨 오렌지) → 기본 label.normal.
  //  Line은 포커스에도 라벨색 유지(밑줄만 강조) → isBox 조건으로 분기.
  const labelColor = isError
    ? colors.status.negative
    : isBox && focused && !disabled
      ? colors.primary.primary
      : colors.label.normal

  // 헬퍼/에러 문구 색: Error=negative, 기본 label.alternative.
  const messageColor = isError
    ? colors.status.negative
    : colors.label.alternative

  // 입력 텍스트(값) 색은 label.normal, placeholder는 label.alternative(placeholderTextColor).
  const valueColor = colors.label.normal

  // 단일행 TextInput 스타일에는 lineHeight를 넣지 않는다.
  //  iOS는 TextInput의 lineHeight(>fontSize)가 글리프를 라인박스 하단으로 밀어
  //  placeholder·입력값이 모두 아래로 치우쳐 세로 중앙 정렬이 깨진다.
  //  (Android는 textAlignVertical 보정으로 lineHeight가 있어도 중앙 유지 → 정상.)
  //  멀티행(Text Area)에서는 줄간격이 필요하므로 lineHeight를 유지한다.
  const { lineHeight: bodyLineHeight, ...bodyInputTypography } =
    typography.body.mediumWeak

  // 핸들러 파라미터 타입은 RN 버전 간 차이(FocusEvent vs NativeSyntheticEvent)를 피하려 TextInputProps에서 파생.
  const focusHandler: NonNullable<TextInputProps["onFocus"]> = (e) => {
    setFocused(true)
    onFocus?.(e)
  }
  const blurHandler: NonNullable<TextInputProps["onBlur"]> = (e) => {
    setFocused(false)
    onBlur?.(e)
  }

  // 필드(입력부) 컨테이너의 variant별 동적 스타일.
  let fieldStyle: ViewStyle
  if (isBox) {
    // Box bg: Disabled=fill.normal → Focused=primary.primaryWeak(오렌지 틴트) → 기본 background.default.
    const bg = disabled
      ? colors.fill.normal
      : focused
        ? colors.primary.primaryWeak
        : colors.background.default
    // 보정: 원 스펙은 Box가 Focused/Error에도 border를 line.normal로 고정(접근성 갭).
    //  v2에선 Error 시 status.negative 테두리를 추가해 시각적으로 구분한다.
    const borderColor = isError ? colors.status.negative : colors.line.normal
    fieldStyle = {
      minHeight: multiline ? BOX_MIN_HEIGHT_MULTILINE : BOX_MIN_HEIGHT,
      borderRadius: radius.xl, // 14 (스펙 radius/semantic/xxs)
      borderWidth: borderWidth.thin, // 1px
      borderColor,
      backgroundColor: bg,
      // 보정: 스펙의 좌측 패딩(radius/semantic/xs=16)을 radius 토큰 대신 spacing[16]으로.
      paddingHorizontal: spacing[16],
      paddingVertical: spacing[10],
    }
  } else {
    // Line 밑줄색: Error=negative → Focused=primary → 기본 line.normal (라벨은 그대로).
    const underline = isError
      ? colors.status.negative
      : focused
        ? colors.primary.primary
        : colors.line.normal
    fieldStyle = {
      minHeight: LINE_MIN_HEIGHT,
      borderBottomWidth: borderWidth.thick, // 2px 밑줄
      borderBottomColor: underline,
      // Figma 확인: Line은 라벨·입력·헬퍼가 모두 같은 좌측 x에 정렬됨(입력만 들여쓰지 않음).
      //  스펙의 24(radius/semantic/l 오용값)를 필드에만 주면 라벨과 어긋나므로 좌우 패딩 0으로 정렬.
      //  화면 외곽 여백은 V2Screen 패딩이 담당. 세로는 밑줄 아래 여백(spacing[4])만.
      paddingHorizontal: 0,
      paddingBottom: spacing[4],
    }
  }

  return (
    <View style={[styles.root, style]}>
      {label != null && (
        <Text style={[typography.subtext.mediumStrong, { color: labelColor }]}>
          {label}
        </Text>
      )}

      <View style={[styles.field, fieldStyle]}>
        <TextInput
          accessibilityState={{ disabled }}
          editable={!disabled}
          multiline={multiline}
          // 캐럿/선택 색은 브랜드 컬러(스펙: Focused 캐럿 = Primary/primary). 소비자 override 가능.
          selectionColor={selectionColor ?? colors.primary.primary}
          placeholderTextColor={
            placeholderTextColor ?? colors.label.alternative
          }
          style={[
            styles.input,
            bodyInputTypography, // 17/400 (단일행은 lineHeight 제외 — iOS 세로정렬)
            { color: valueColor },
            multiline && { lineHeight: bodyLineHeight }, // Text Area만 줄간격 적용
            multiline && styles.inputMultiline,
            disabled && styles.inputDisabled, // 값 opacity 30% (스펙)
            inputStyle,
          ]}
          {...rest}
          onFocus={focusHandler}
          onBlur={blurHandler}
        />
      </View>

      {message != null && message.length > 0 && (
        <Text style={[typography.subtext.medium, { color: messageColor }]}>
          {message}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // 라벨·필드·헬퍼 세로 스택(좌측 정렬), 요소 간 gap 6 (스펙 공통 레이아웃).
  root: {
    gap: spacing[6],
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    // RN 기본 패딩 제거(필드 컨테이너가 패딩을 소유).
    padding: 0,
  },
  // 멀티행(Text Area): 위에서부터 채우고 컨테이너 세로 여백 확보.
  inputMultiline: {
    textAlignVertical: "top",
    paddingVertical: spacing[8],
  },
  // Disabled: 값 텍스트만 흐리게(스펙 opacity 30%). bg는 fill.normal로 별도 처리.
  inputDisabled: {
    opacity: 0.3,
  },
})
