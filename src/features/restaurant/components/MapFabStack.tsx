/**
 * 지도 우하단 FAB 스택. 목업 §2.6 — 저장한 곳만 보기(토글) + 내 위치.
 *
 * ## 북마크 FAB 는 필터다, 즐겨찾기 버튼이 아니다
 *
 * 프로토타입의 이 버튼은 `onPress` 자체가 없어 아무 일도 하지 않았다. 실제 의미는
 * "저장한 곳만 보기" **필터 토글**이다(`FilterState.bookmarkedOnly`). 그래서 켜지면
 * 아이콘이 채워지고 브랜드색이 되며, 스크린리더에도 토글로 알린다.
 *
 * ## 내 위치는 진입 시 권한을 묻지 않는다 (BUILD_CONTRACT §3.5)
 *
 * 이 버튼을 눌렀을 때만 `request()` 가 불린다. iOS 는 한 번 거부하면 다시 못 묻기 때문에
 * 진입 즉시 팝업을 띄우는 것은 그 한 번을 낭비하는 일이다. 요청 중에는 점 로더로 바꿔
 * 사용자가 두 번 누르지 않게 한다.
 *
 * ## 44 를 키우지 않고 확보한다
 *
 * 원의 시각 크기는 목업이 정한 44 다. 아이콘은 24 라 남는 10px 이 패딩으로 들어가므로
 * 터치 타겟은 이미 44 다 — hitSlop 을 더하면 두 FAB 의 터치 영역이 겹쳐 위 버튼을
 * 누르려다 아래 버튼이 눌린다. 그래서 여기서는 hitSlop 을 쓰지 않는다.
 */

import { Pressable, StyleSheet, View } from "react-native"
import type { ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2DotLoader,
  V2Icon,
  iconSize,
  radius,
  spacing,
  touchTarget,
  useV2Theme,
  type V2IconName,
} from "@/src/design-system-v2"

import { FLOATING_SHADOW, mapOverlayChrome } from "./mapFloating"

const SIZE = touchTarget.min // 44

export interface MapFabStackProps {
  bookmarkedOnly: boolean
  onToggleBookmarkedOnly: () => void
  onPressMyLocation: () => void
  /** 위치 권한/좌표 요청 중. 내 위치 FAB 가 점 로더로 바뀐다. */
  locating?: boolean
  style?: ViewStyle
}

export function MapFabStack({
  bookmarkedOnly,
  onToggleBookmarkedOnly,
  onPressMyLocation,
  locating = false,
  style,
}: MapFabStackProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  return (
    <View style={[styles.stack, style]}>
      <Fab
        // 켜짐/꺼짐을 색만으로 구분하지 않는다 — 채운 아이콘과 빈 아이콘으로도 갈린다.
        name={bookmarkedOnly ? "bookmarkFilled" : "bookmark"}
        color={bookmarkedOnly ? colors.primary.primary : colors.label.normal}
        label={
          bookmarkedOnly
            ? t("restaurant.map.bookmarkedOnlyOff")
            : t("restaurant.map.bookmarkedOnly")
        }
        selected={bookmarkedOnly}
        onPress={onToggleBookmarkedOnly}
      />
      <Fab
        name="crosshair"
        color={colors.label.normal}
        label={t("restaurant.map.myLocation")}
        busy={locating}
        onPress={onPressMyLocation}
      />
    </View>
  )
}

function Fab({
  name,
  color,
  label,
  selected,
  busy = false,
  onPress,
}: {
  name: V2IconName
  color: string
  label: string
  /** `undefined` = 토글이 아니다. */
  selected?: boolean
  busy?: boolean
  onPress: () => void
}) {
  const { colors, mode } = useV2Theme()
  const chrome = mapOverlayChrome({ mode, ...colors })
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={
        selected === undefined ? { busy } : { selected, busy }
      }
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        FLOATING_SHADOW,
        chrome,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <V2DotLoader size="s" color={colors.primary.primary} />
      ) : (
        <V2Icon name={name} size={iconSize.md} color={color} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  stack: { gap: spacing[8], alignItems: "flex-end" },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
})
