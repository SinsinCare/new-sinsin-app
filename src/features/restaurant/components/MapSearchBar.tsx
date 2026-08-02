/**
 * 지도 위에 뜨는 검색바. 목업 §2.2.
 *
 * ## 입력창이 아니다
 *
 * `TextInput` 처럼 보이지만 **버튼**이다. 탭하면 검색 화면(최근 검색어 + 자동완성)으로
 * 넘어간다. 여기에 살아 있는 입력을 두면 (1) 키보드가 지도의 절반을 덮고 (2) 키스트로크마다
 * 상태가 바뀌어 지도 화면 전체가 리렌더된다 — 프로토타입에서 검색 state 가 지도 위에 있어
 * 타이핑 한 글자마다 WebView 가 리로드된 것이 정확히 그 결함이었다.
 *
 * 그래서 `V2SearchField` 를 쓰지 않는다. 그건 진짜 `TextInput` 이고, `editable={false}` 로
 * 흉내내면 스크린리더가 "입력란" 이라고 읽어 사용자가 키보드를 기다린다.
 *
 * ## 확정된 검색어는 자리표시자 대신 값처럼 보인다
 *
 * `query` 가 있으면 진한 글자로 그린다(목업 -8 의 리스트 모드 헤더와 같은 규칙).
 * 그때 오른쪽에 지우기 버튼이 생긴다 — 검색어를 되돌릴 길이 없으면 사용자는 뒤로 가기를
 * 눌러 화면을 떠난다.
 */

import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import { FLOATING_SHADOW } from "./mapFloating"

/** 목업 h48. `controlHeight.lg` 와 같은 값이다. */
const HEIGHT = 48

export interface MapSearchBarProps {
  /** 확정된 검색어. 비어 있으면 자리표시자를 그린다. */
  query?: string
  /** 탭 → 검색 화면. */
  onPress: () => void
  /** 검색어 지우기. `query` 가 있을 때만 버튼이 생긴다. */
  onClear?: () => void
  style?: ViewStyle
}

export function MapSearchBar({
  query = "",
  onPress,
  onClear,
  style,
}: MapSearchBarProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const hasQuery = query.trim().length > 0

  return (
    <View
      style={[
        styles.root,
        FLOATING_SHADOW,
        { backgroundColor: colors.background.default },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("restaurant.searchAccessibility")}
        accessibilityHint={t("restaurant.map.searchPlaceholder")}
        onPress={onPress}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <V2Icon name="search" size="md" color={colors.label.alternative} />
        <Text
          style={[
            typography.label.mediumWeak,
            styles.text,
            {
              color: hasQuery ? colors.label.normal : colors.label.alternative,
            },
          ]}
          numberOfLines={1}
        >
          {hasQuery ? query : t("restaurant.map.searchPlaceholder")}
        </Text>
      </Pressable>
      {hasQuery && onClear && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.clear")}
          hitSlop={(touchTarget.min - iconSize.sm) / 2}
          onPress={onClear}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <V2Icon name="close" size="sm" color={colors.label.neutral} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    height: HEIGHT,
    // 목업 12~14. 사다리의 lg(12)를 쓴다 — 검색 필드의 DS 기본값과 같다.
    borderRadius: radius.lg,
    paddingHorizontal: spacing[16],
  },
  // 필드 전체가 터치 타겟이다. 지우기 버튼만 그 위에서 따로 잡는다.
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    height: "100%",
  },
  text: { flexShrink: 1 },
  clear: { paddingLeft: spacing[8] },
  pressed: { opacity: 0.6 },
})
