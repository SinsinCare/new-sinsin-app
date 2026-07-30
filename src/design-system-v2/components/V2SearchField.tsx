// Design System v2 — Search Field
// Spec: project/design-system-v2/design-system-base/components/Search-Field.md (Figma set 252:2158)
//
// Figma의 단일 축 `Typing States`(Placeholder/Focused/Typing/Typed)는 RN 런타임으로 매핑:
//  - Placeholder / Focused / Typing / Typed → focus + value 유무로 자동 표현(prop 아님)
//  - 4개 상태 모두 필드 bg `fill/normal` · 테두리 없음으로 동일 → 포커스용 스타일 분기 불필요.
//    (RN이 placeholder↔값을 자동 전환하고, Clear 버튼은 값 유무로만 노출)
//
// RN TextInput을 감싼 controlled 검색 입력. keyboardType·returnKeyType·autoFocus 등은 {...rest}로 전달.
// 검색(돋보기)·Clear(×) 글리프는 세트에 시스템 글리프로 추가돼 V2Icon으로 사용(search/close) — 세트와 통일.
// 시맨틱 색은 useV2Theme(다크 자동). 타이포는 <TextInput>에 토큰 그대로(fontWeight 미사용).

import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native"
import { iconSize, radius, spacing, touchTarget, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import { useTranslation } from "react-i18next"

// value·onChangeText·placeholder는 controlled 계약으로 명시(재정의)하므로 TextInputProps에서 제외하고,
// style/editable은 자체 관리(style·disabled로 노출)하므로 함께 제외. 나머지는 그대로 스프레드.
export type V2SearchFieldProps = Omit<
  TextInputProps,
  "style" | "editable" | "value" | "onChangeText" | "placeholder"
> & {
  /** 현재 검색어 (controlled) */
  value: string
  /** 입력 변경 콜백 (controlled) */
  onChangeText: (text: string) => void
  /** 안내문(빈 값일 때). 실제 문구는 사용처에서 주입 */
  placeholder?: string
  /** Clear(x) 탭 시 알림. 미지정이어도 내부에서 값은 비운다(onChangeText("")) */
  onClear?: () => void
  /** 스펙엔 없음 → Text Field의 Disabled 규칙(내용 흐리게)을 준용해 파생 */
  disabled?: boolean
  /** 루트(알약 컨테이너) 스타일 (V2Button/V2TextField의 prop style 규약과 동일) */
  style?: ViewStyle
  /** 입력(TextInput) 스타일 override */
  inputStyle?: TextStyle
}

// 스펙 실측 치수 (named 토큰에 바인딩 없는 raw 값 → 리터럴 + 주석).
const MIN_HEIGHT = 44 // 알약 min-height (touchTarget.min과 동일 값이나 여기선 필드 높이 의미)

export function V2SearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  disabled = false,
  style,
  inputStyle,
  placeholderTextColor,
  selectionColor,
  ...rest
}: V2SearchFieldProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  // 값이 있을 때만 Clear 노출(Typing/Typed). 빈 값(Placeholder/Focused)엔 감춤.
  const hasValue = value.length > 0

  const handleClear = () => {
    // 스펙: "누르면 onClear/값 비움" → 항상 값을 비우고(onChangeText 갱신) 소비자에게도 알림.
    onChangeText("")
    onClear?.()
  }

  // 검색 입력은 항상 단일행 → lineHeight를 스타일에서 제외한다.
  //  iOS는 TextInput의 lineHeight가 글리프를 라인박스 하단으로 밀어 placeholder·값이
  //  아래로 치우친다(V2TextField와 동일 이슈). 세로 정렬은 컨테이너 center에 맡긴다.
  const { lineHeight: _searchLineHeight, ...searchInputTypography } =
    typography.label.mediumWeak

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.fill.normal },
        disabled && styles.disabled, // 스펙엔 없음 → 내용 흐리게로 비활성 표현(보정)
        style,
      ]}
    >
      {/* Leading: 검색 아이콘 (세트 시스템 글리프) */}
      <V2Icon name="search" size="md" color={colors.label.neutral} />

      <TextInput
        accessibilityRole="search"
        accessibilityState={{ disabled }}
        editable={!disabled}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        // placeholder=label/alternative, 캐럿=Primary/primary (소비자 override 가능).
        placeholderTextColor={placeholderTextColor ?? colors.label.alternative}
        selectionColor={selectionColor ?? colors.primary.primary}
        style={[
          styles.input,
          searchInputTypography, // 17 / Medium(500) — lineHeight 제외(iOS 세로정렬)
          { color: colors.label.normal }, // 값 색 label/normal (스펙 오타 nomal→normal 정정)
          inputStyle,
        ]}
        {...rest}
      />

      {/* Trailing: Clear(x-circle) — 값 있을 때만. 탭 타깃 44는 hitSlop으로 확보. */}
      {hasValue && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.clear")}
          hitSlop={(touchTarget.min - iconSize.sm) / 2}
          onPress={handleClear}
        >
          <V2Icon name="close" size="sm" color={colors.label.neutral} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // 알약 컨테이너: 테두리 없음, radius.lg(=12), 좌우 10 / 상하 8, gap 8, 세로 중앙.
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_HEIGHT,
    borderRadius: radius.lg, // 12
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[8],
    gap: spacing[8],
  },
  input: {
    flex: 1,
    // RN 기본 패딩 제거(컨테이너가 패딩을 소유). 텍스트 행 정렬은 컨테이너 center.
    padding: 0,
  },
  // Disabled: 스펙 미정의 → Text Field 규칙 준용해 내용 흐리게(bg fill/normal은 유지).
  disabled: {
    opacity: 0.4,
  },
})
