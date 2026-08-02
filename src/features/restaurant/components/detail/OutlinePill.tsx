/**
 * 섹션 끝에 가운데로 놓이는 `사진 전체보기 ›` / `후기 더보기 ›` / `사진 더보기` pill.
 * 목업 -12 / -18 / -15.
 *
 * ## `V2Button` 으로 만들 수 없다
 *
 * `V2Button` 의 variant 는 `fill | weak` 두 개뿐이고, `neutral/weak` 는 면을
 * `fill.normal`(옅은 회색)로 **채운다**. 목업의 이 pill 은 반대로 흰 면 + 머리카락
 * 두께 회색 테두리다 — `Home_restaurant-18.png` 의 `사진 전체보기 ›` 를 4배로 확대해
 * 픽셀을 뽑으면 안쪽이 `#FFFFFF`, 테두리가 `#E9E9EB`, 페이지 배경도 `#FFFFFF` 다.
 * 회색으로 채우면 흰 본문 위에서 pill 이 "비활성" 으로 읽힌다.
 *
 * DS 에 outline 변형을 새로 여는 것은 이 화면 하나가 내릴 결정이 아니므로(같은 판단을
 * `SelectableChip` 헤더에서도 했다) 상세 화면 안에 이 한 조각만 둔다. DS 에 outline
 * 버튼이 생기면 이 파일을 지우고 갈아탄다.
 *
 * ## 세 호출부가 같은 것을 쓴다
 *
 * 홈 탭(사진·후기), 후기 탭, 사진 탭이 각자 pill 을 조립하면 네 곳의 지름·테두리·
 * 여백이 갈린다. 로딩 표시까지 여기 담아 `사진 더보기` 의 다음 페이지 대기가
 * 다른 pill 과 같은 모양으로 보이게 한다.
 */

import { Pressable, StyleSheet, Text } from "react-native"
import type { ViewStyle } from "react-native"

import {
  V2DotLoader,
  V2Icon,
  borderWidth,
  controlHeight,
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

export interface OutlinePillProps {
  label: string
  onPress: () => void
  /** 목업의 `›`. 다음 화면으로 가는 pill 에만 붙는다(`사진 더보기` 는 제자리 확장이라 없다). */
  showChevron?: boolean
  /** 다음 페이지 대기. 누르는 것을 막고 점 로더를 라벨 자리에 둔다. */
  loading?: boolean
  style?: ViewStyle
}

export function OutlinePill({
  label,
  onPress,
  showChevron = false,
  loading = false,
  style,
}: OutlinePillProps) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      accessibilityLabel={label}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.background.default,
          borderColor: colors.line.normal,
        },
        pressed && !loading && styles.pressed,
        loading && styles.loading,
        style,
      ]}
    >
      {loading ? (
        // 로더를 라벨과 함께 두지 않고 대체한다 — 함께 두면 pill 폭이 늘어 가운데가 밀린다.
        <V2DotLoader size="s" color={colors.label.neutral} />
      ) : (
        <>
          <Text
            style={[typography.label.small, { color: colors.label.normal }]}
          >
            {label}
          </Text>
          {showChevron && (
            <V2Icon
              name="chevronRight"
              size={iconSize.xs}
              color={colors.label.neutral}
            />
          )}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    minHeight: controlHeight.md,
    paddingHorizontal: spacing[20],
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  // 버튼·칩과 같은 눌림 값.
  pressed: { opacity: 0.85 },
  loading: { opacity: 0.4 },
})
