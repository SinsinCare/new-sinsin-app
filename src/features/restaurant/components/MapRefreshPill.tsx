/**
 * `현재 지도에서 찾기` pill. 목업 §2.5.
 *
 * ## 이 버튼이 있다는 것은 자동 재조회를 하지 않는다는 뜻이다 (D7, 되돌리지 말 것)
 *
 * 지도를 움직이면 dirty 플래그만 서고 질의는 나가지 않는다. 자동 재조회는 (1) 팬 한 번에
 * 요청 수십 개를 태우고 (2) 시트 목록이 계속 갈려 스크롤 위치가 점프한다. 그래서 이
 * pill 은 편의 기능이 아니라 **제품 결정을 구현한 컨트롤**이다. 없애면 자동 재조회가
 * 유일한 선택지가 된다.
 *
 * ## 뷰포트가 너무 넓을 때는 문구가 바뀐다
 *
 * bbox 대각 200km 를 넘으면 서버가 400 을 준다. 그때 같은 `찾기` 를 눌리게 두면 사용자는
 * 눌러도 아무 일이 없는(혹은 오류가 나는) 버튼을 만난다. 그 상태에서는 "지도를 확대해
 * 주세요" 를 말하고 누를 수 없게 한다 — 실패를 겪게 하는 대신 먼저 알려 준다.
 *
 * ## 로딩 중에도 사라지지 않는다
 *
 * 누른 직후 pill 이 사라지면 사용자는 눌렸는지 모른다. 진행 중에는 자리를 지키고
 * disabled + 점 로더로 바뀐다.
 */

import { Pressable, StyleSheet, Text } from "react-native"
import type { ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2DotLoader,
  V2Icon,
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import { FLOATING_SHADOW } from "./mapFloating"

export interface MapRefreshPillProps {
  /** 지도가 마지막 검색 이후 움직였다. `false` 면 아무 것도 그리지 않는다. */
  visible: boolean
  /** 뷰포트가 서버 상한(대각 200km)을 넘었다. 문구가 바뀌고 누를 수 없다. */
  tooLarge?: boolean
  loading?: boolean
  onPress: () => void
  style?: ViewStyle
}

export function MapRefreshPill({
  visible,
  tooLarge = false,
  loading = false,
  onPress,
  style,
}: MapRefreshPillProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  if (!visible) return null

  const disabled = tooLarge || loading
  const label = tooLarge
    ? t("restaurant.map.tooLarge")
    : t("restaurant.map.searchThisArea")

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        FLOATING_SHADOW,
        { backgroundColor: colors.background.default },
        pressed && styles.pressed,
        // 상한 초과는 "지금은 못 한다" 이므로 흐리게 두고, 로딩은 진행 중이므로 흐리지 않는다.
        tooLarge && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        // 아이콘 자리에 그대로 들어가는 크기라 pill 폭이 흔들리지 않는다.
        <V2DotLoader size="s" color={colors.primary.primary} />
      ) : (
        <V2Icon
          name="refresh"
          size={iconSize.sm}
          color={tooLarge ? colors.label.alternative : colors.primary.primary}
        />
      )}
      <Text
        style={[
          typography.label.small,
          {
            color: tooLarge ? colors.label.neutral : colors.primary.primary,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    height: 40,
    paddingHorizontal: spacing[16],
    borderRadius: radius.full,
    // 화면 중앙에 뜬다. 부모가 alignItems:center 를 주지 않아도 스스로 폭을 hug 한다.
    alignSelf: "center",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
})
