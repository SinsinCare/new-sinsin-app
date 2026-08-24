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
//
// ## 커뮤니티 리디자인으로 늘어난 축 4개 (docs/design/community-redesign §4-G14·G15·G16)
//
// 넷 다 **기본값이 오늘의 렌더를 그대로 재현**한다(233파일이 이 시스템을 들여온다).
//
//  1. `inputComponent` — 어떤 입력 구현으로 그릴지. 기본은 RN `TextInput`.
//     시트 안에서는 `V2SheetTextInput`(gorhom `BottomSheetTextInput`)을 넘긴다.
//     **`V2SheetTextInput` 을 대체하지 않는다 — 그것을 끼우는 자리다.** 여기서 gorhom을
//     직접 import 하면 이 필드를 쓰는 모든 화면이 시트 패키지를 끌고 오고, 그 입력은
//     시트 컨텍스트 밖에서 마운트되면 던진다(V2SheetTextInput 머리말). 그래서 "시트냐
//     아니냐" 는 소비처만 알 수 있고, 이 컴포넌트는 구현을 받기만 한다.
//  2. `clearable`/`onClear` — 값이 있을 때만 나오는 **채운 원** 지우기 버튼(민 ✕ 아님).
//  3. `label` 이 `ReactNode` 도 받는다 — `(선택)` 보조 런·브랜드 별표처럼 **두 톤짜리
//     라벨**을 소비처가 조립할 수 있게. (`required` 는 기존 빨간 별표 그대로 둔다 — 색과
//     앞 공백을 바꾸면 오늘 쓰는 화면들의 렌더가 바뀐다.)
//  4. `tone="filled"` — 테두리 없는 면(`fill.alternative` + radius 16) 텍스트에어리어.

import { useState, type ComponentType, type ReactNode } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"
import {
  borderWidth,
  radius,
  spacing,
  touchTarget,
  typography,
  type SemanticColors,
} from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"

// 이름은 Figma 축과 1:1(소문자화). Box=테두리, Line=밑줄.
export type V2TextFieldVariant = "box" | "line"

/**
 * 상자의 **면 처리**. `box` 변형에만 의미가 있다.
 *  - `outlined`(기본) — 흰 면 + 1px 테두리. Figma 정본.
 *  - `filled` — 테두리 없는 옅은 면(`fill.alternative`) + radius 16. 글쓰기 본문 칸.
 */
export type V2TextFieldTone = "outlined" | "filled"

// TextInput의 `style`/`editable`은 자체 관리(inputStyle·disabled로 노출)하므로 제외하고 나머지는 스프레드.
export type V2TextFieldProps = Omit<TextInputProps, "style" | "editable"> & {
  variant?: V2TextFieldVariant
  tone?: V2TextFieldTone
  /**
   * 필드 상단 라벨. 문자열이거나, 두 톤짜리 라벨(`카테고리 (선택)`·브랜드 별표)을
   * 소비처가 조립한 노드.
   */
  label?: string | ReactNode
  /** 필수 필드 표시. 라벨 색과 별개로 오류 색상의 별표를 표시 */
  required?: boolean
  /** 필드 하단 안내 문구 (에러가 문자열이면 그 문자열로 대체) */
  helperText?: string
  /** 에러 상태. 문자열이면 helperText 대신 그 메시지를 붉게 표기 */
  error?: boolean | string
  disabled?: boolean
  /**
   * 남는 세로 공간을 전부 채우는 입력란. `multiline`과 함께 쓴다.
   *
   * 긴 글을 받는 화면(1:1 문의 본문 등)에서 고정 높이 상자를 쓰면, 상자 아래 화면 절반이
   * 빈 흰 면으로 남는데 그 면은 **누를 수도 쓸 수도 없다** — 사용자는 글을 적으려고 들어와서
   * 화면의 대부분이 죽어 있는 것을 본다. `grow`를 켜면 그 면이 곧 입력란이 된다.
   * (`minHeight`는 그대로 하한으로 남는다.)
   */
  grow?: boolean
  /**
   * 입력을 그리는 컴포넌트. 기본 RN `TextInput`.
   *
   * `V2BottomSheet` 안에서는 **반드시** `V2SheetTextInput` 을 넘긴다 — 평범한 `TextInput`
   * 이면 gorhom 이 포커스를 모르고 시트가 제자리에 남아 키패드가 CTA 를 덮는다
   * (경고 한 줄 없다 · `V2SheetTextInput` 머리말).
   */
  inputComponent?: ComponentType<TextInputProps>
  /** 값이 있을 때 우측에 지우기(채운 원 ✕) 버튼을 낸다. */
  clearable?: boolean
  /** 지우기를 눌렀을 때. 누르면 값도 비운다(`onChangeText("")`) — V2SearchField와 같은 계약. */
  onClear?: () => void
  /** 루트 컨테이너 스타일 (V2Button의 prop style 규약과 동일) */
  style?: ViewStyle
  /** 입력(TextInput) 스타일 override */
  inputStyle?: TextStyle
}

// 스펙 실측 치수 (controlHeight 사다리에 없는 필드 전용 값 → 리터럴 + 주석).
const BOX_MIN_HEIGHT = 54 // Box 단일행
const BOX_MIN_HEIGHT_MULTILINE = 80 // Box Text Area(멀티행)
const LINE_MIN_HEIGHT = 30 // Line 단일행
/** 지우기 버튼의 채운 원 지름(시안 실측 18.3). 글리프 잉크는 이 값의 11/24 ≈ 8.4. */
const CLEAR_DIAMETER = 18

/**
 * 필드 크롬(상자 스타일 + 라벨/헬퍼 색)을 한 곳에서 계산한다.
 *
 * `V2SelectField` 가 **같은 상자**를 그려야 하므로(§4-G17: "V2TextField 의 box 토큰
 * 재사용") 여기서 내보낸다. 두 파일이 각자 radius·borderWidth·패딩을 적으면 언젠가
 * 한쪽만 바뀐다 — 그때 화면에는 높이도 모서리도 다른 두 칸이 나란히 선다.
 *
 * @internal 디자인시스템 내부 공유용. 화면 코드에서 직접 쓰지 말 것.
 */
export function v2FieldChrome(args: {
  colors: SemanticColors
  variant?: V2TextFieldVariant
  tone?: V2TextFieldTone
  focused: boolean
  disabled: boolean
  error: boolean
  multiline?: boolean
  /**
   * 포커스 시 면에 주황 틴트를 줄 것인가(기본 true).
   *
   * `grow` 입력은 false 다. 오렌지 틴트는 54pt 상자 하나를 물들이는 *힌트* 로 설계된
   * 값이다. 화면 높이를 다 먹는 입력란에 같은 값을 칠하면 화면 절반이 옅은 주황 면이
   * 되어, 힌트가 아니라 **배경색**으로 읽힌다 — 그 순간 화면의 유일한 브랜드색이어야
   * 할 하단 CTA 와 강조가 갈라진다. 큰 작성면의 포커스는 캐럿과 키보드가 이미 말하고
   * 있으므로 면은 중립으로 둔다.
   */
  surfaceFocusTint?: boolean
}): { field: ViewStyle; labelColor: string; messageColor: string } {
  const {
    colors,
    variant = "box",
    tone = "outlined",
    focused,
    disabled,
    error,
    multiline = false,
    surfaceFocusTint = true,
  } = args
  const isBox = variant === "box"

  // 라벨 색: Error=negative → Box Focused=primary(스펙: Box는 포커스 시 라벨 오렌지) → 기본 label.normal.
  //  Line은 포커스에도 라벨색 유지(밑줄만 강조) → isBox 조건으로 분기.
  const labelColor = error
    ? colors.status.negative
    : isBox && focused && !disabled
      ? colors.primary.primary
      : colors.label.normal

  // 헬퍼/에러 문구 색: Error=negative, 기본 label.alternative.
  const messageColor = error ? colors.status.negative : colors.label.alternative

  if (!isBox) {
    // Line 밑줄색: Error=negative → Focused=primary → 기본 line.normal (라벨은 그대로).
    const underline = error
      ? colors.status.negative
      : focused && !disabled
        ? colors.primary.primary
        : colors.line.normal
    return {
      labelColor,
      messageColor,
      field: {
        minHeight: LINE_MIN_HEIGHT,
        borderBottomWidth: borderWidth.thick, // 2px 밑줄
        borderBottomColor: underline,
        // Figma 확인: Line은 라벨·입력·헬퍼가 모두 같은 좌측 x에 정렬됨(입력만 들여쓰지 않음).
        //  스펙의 24(radius/semantic/l 오용값)를 필드에만 주면 라벨과 어긋나므로 좌우 패딩 0으로 정렬.
        //  화면 외곽 여백은 V2Screen 패딩이 담당. 세로는 밑줄 아래 여백(spacing[4])만.
        paddingHorizontal: 0,
        paddingBottom: spacing[4],
      },
    }
  }

  if (tone === "filled") {
    /*
      면 변형: 테두리를 그리지 않는다. 그래서 **포커스 틴트도 없다** — 테두리가 없는
      면에 주황을 칠하면 상자가 아니라 화면 한 덩어리가 물든 것처럼 보인다(위 grow 주석과
      같은 이유). 초점은 캐럿과 키보드가 말한다.
    */
    return {
      labelColor,
      messageColor,
      field: {
        minHeight: multiline ? BOX_MIN_HEIGHT_MULTILINE : BOX_MIN_HEIGHT,
        borderRadius: radius["2xl"], // 16
        borderWidth: 0,
        backgroundColor: disabled
          ? colors.fill.normal
          : colors.fill.alternative,
        paddingHorizontal: spacing[16],
        paddingVertical: spacing[10],
      },
    }
  }

  // Box bg: Disabled=fill.normal → Focused=primary.primaryWeak(오렌지 틴트) → 기본 background.default.
  const backgroundColor = disabled
    ? colors.fill.normal
    : focused && surfaceFocusTint
      ? colors.primary.primaryWeak
      : colors.background.default
  // 보정: 원 스펙은 Box가 Focused/Error에도 border를 line.normal로 고정(접근성 갭).
  //  v2에선 Error 시 status.negative 테두리를 추가해 시각적으로 구분한다.
  const borderColor = error ? colors.status.negative : colors.line.normal
  return {
    labelColor,
    messageColor,
    field: {
      minHeight: multiline ? BOX_MIN_HEIGHT_MULTILINE : BOX_MIN_HEIGHT,
      borderRadius: radius.xl, // 14 (스펙 radius/semantic/xxs)
      borderWidth: borderWidth.thin, // 1px
      borderColor,
      backgroundColor,
      // 보정: 스펙의 좌측 패딩(radius/semantic/xs=16)을 radius 토큰 대신 spacing[16]으로.
      paddingHorizontal: spacing[16],
      paddingVertical: spacing[10],
    },
  }
}

/**
 * 입력(값·placeholder)의 타이포.
 *
 * **단일행에는 `lineHeight` 를 넣지 않는다.** iOS는 TextInput의 lineHeight(>fontSize)가
 * 글리프를 라인박스 하단으로 밀어 placeholder·입력값이 모두 아래로 치우쳐 세로 중앙
 * 정렬이 깨진다(Android는 textAlignVertical 보정으로 중앙 유지 → 정상). 집안 규칙
 * `singleLineInputText` 와 같은 규칙이고, 여기서는 토큰에서 직접 뗀다.
 * 멀티행(Text Area)에서는 줄간격이 필요하므로 유지한다.
 *
 * @internal 디자인시스템 내부 공유용.
 */
export function v2InputTypography(multiline?: boolean): TextStyle {
  const { lineHeight, ...withoutLineHeight } = typography.body.mediumWeak
  return multiline ? { ...withoutLineHeight, lineHeight } : withoutLineHeight
}

export function V2TextField({
  variant = "box",
  tone = "outlined",
  label,
  required = false,
  helperText,
  error = false,
  disabled = false,
  grow = false,
  inputComponent,
  clearable = false,
  onClear,
  style,
  inputStyle,
  multiline,
  value,
  onChangeText,
  onFocus,
  onBlur,
  placeholderTextColor,
  selectionColor,
  accessibilityState,
  ...rest
}: V2TextFieldProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  // Focused = 런타임 상태(스펙의 Focused/Typing에 대응). 값 유무는 RN이 placeholder로 자동 처리.
  const [focused, setFocused] = useState(false)

  const isError = !!error
  // error가 문자열이면 그 메시지를, 아니면 helperText를 하단에 표기.
  const message =
    typeof error === "string" && error.length > 0 ? error : helperText

  // 입력 텍스트(값) 색은 label.normal, placeholder는 label.alternative(placeholderTextColor).
  const valueColor = colors.label.normal

  // 핸들러 파라미터 타입은 RN 버전 간 차이(FocusEvent vs NativeSyntheticEvent)를 피하려 TextInputProps에서 파생.
  const focusHandler: NonNullable<TextInputProps["onFocus"]> = (e) => {
    setFocused(true)
    onFocus?.(e)
  }
  const blurHandler: NonNullable<TextInputProps["onBlur"]> = (e) => {
    setFocused(false)
    onBlur?.(e)
  }

  const handleClear = () => {
    // V2SearchField와 같은 계약: 값은 항상 비우고(controlled 갱신) 소비처에도 알린다.
    onChangeText?.("")
    onClear?.()
  }

  const { field, labelColor, messageColor } = v2FieldChrome({
    colors,
    variant,
    tone,
    focused,
    disabled,
    error: isError,
    multiline,
    surfaceFocusTint: !grow,
  })

  // grow: 필드가 부모의 남는 높이를 먹는다. 행 컨테이너의 교차축 정렬을 stretch 로 바꿔야
  //  안쪽 TextInput 도 같이 늘어난다(기본 center 는 입력을 한 줄 높이로 가둔다).
  const fieldStyle: ViewStyle = grow
    ? { ...field, flex: 1, alignItems: "stretch" }
    : field

  // 기본은 RN TextInput. 시트 안이면 소비처가 `V2SheetTextInput` 을 넘긴다(머리말 §1).
  const Input = inputComponent ?? TextInput

  // 빈 칸에는 지우기 버튼이 없다(시안 F2 vs F3) — 회색 비활성 버튼을 두지 않는다.
  const showClear = clearable && !disabled && (value?.length ?? 0) > 0

  return (
    <View style={[styles.root, grow && styles.grow, style]}>
      {label != null && (
        <Text style={[typography.subtext.mediumStrong, { color: labelColor }]}>
          {label}
          {required && (
            <Text style={{ color: colors.status.negative }}> *</Text>
          )}
        </Text>
      )}

      <View style={[styles.field, fieldStyle]}>
        <Input
          {...rest}
          accessibilityState={{ ...accessibilityState, disabled }}
          editable={!disabled}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
          // 캐럿/선택 색은 브랜드 컬러(스펙: Focused 캐럿 = Primary/primary). 소비자 override 가능.
          selectionColor={selectionColor ?? colors.primary.primary}
          placeholderTextColor={
            placeholderTextColor ?? colors.label.alternative
          }
          style={[
            styles.input,
            v2InputTypography(multiline), // 17/400 (단일행은 lineHeight 제외 — iOS 세로정렬)
            { color: valueColor },
            multiline && styles.inputMultiline,
            disabled && styles.inputDisabled, // 값 opacity 30% (스펙)
            inputStyle,
          ]}
          onFocus={focusHandler}
          onBlur={blurHandler}
        />

        {/*
          지우기 — 채운 원 + 흰 ✕. 시안은 민 ✕ 가 아니라 `label.assistive` 원이다.
          시각 지름은 18 이지만 탭 타깃 44 는 hitSlop 으로 채운다.
        */}
        {showClear && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("accessibility.clear")}
            hitSlop={(touchTarget.min - CLEAR_DIAMETER) / 2}
            onPress={handleClear}
            style={[styles.clear, { backgroundColor: colors.label.assistive }]}
          >
            <V2Icon
              name="close"
              size={CLEAR_DIAMETER}
              color={colors.static.white}
            />
          </Pressable>
        )}
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
  // grow: 라벨·필드 스택 자체가 부모의 남는 높이를 차지해야 필드도 늘어날 수 있다.
  grow: { flex: 1 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    // 입력과 트레일링(지우기) 사이 간격. 트레일링이 없으면 아무 일도 하지 않는다.
    gap: spacing[8],
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
  clear: {
    width: CLEAR_DIAMETER,
    height: CLEAR_DIAMETER,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
})
