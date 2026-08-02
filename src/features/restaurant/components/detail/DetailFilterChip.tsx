/**
 * 상세 화면(후기 탭·사진 탭)의 **개수 붙은** 필터 칩. `전체 999+` / `메뉴판 240` 모양이다.
 *
 * ## 색은 목업 픽셀 실측값이다 (-11 / -15)
 *
 * 3배 확대해 뽑은 값:
 *
 * | 상태 | 면 | 라벨 | 개수 |
 * |---|---|---|---|
 * | 선택 | `#FFF9F6` = `primary.primaryWeak` + 주황 테두리 | `#282835` = `label.normal` | `#717072` = `label.neutral` |
 * | 미선택 | `#F9FAFB` = `fill.normal`, 테두리 없음 | `#6F6F73` = `label.neutral` | `#B1B2B5` = `label.assistive` |
 *
 * **선택 상태에서 주황으로 바뀌는 것은 테두리뿐이다.** 라벨·개수까지 주황으로 뒤집으면
 * 두 줄(메뉴·특징)에 걸친 `전체 999+` 두 칩이 기본 상태에서부터 주황이 되어, 실제로
 * 필터를 건 상태와 아무것도 안 건 기본 상태가 같은 색으로 보인다.
 *
 * ## `V2Chip` 도 `SelectableChip` 도 아닌 이유
 *
 * `V2Chip` 은 선택 시 면을 브랜드색으로 채운다 — 이 칩은 그게 아니다.
 * `SelectableChip` 의 outline 변형이 색은 같지만 그쪽의
 * `count` 는 **숫자**이고 라벨과 같은 색으로 그린다. 이 화면이 필요한 것은 둘 다 다르다:
 *
 * 1. `999+` 상한. 목업이 `전체 999+`·`순대국밥 999+` 로 표기하고, 그 규칙은
 *    `formatPhotoCount()` 한 곳에만 있다. 숫자 prop 으로는 `1413` 이 그대로 찍힌다.
 * 2. 개수를 **라벨보다 옅은 톤**으로. 같은 색·같은 굵기로 붙이면 `메뉴판240` 처럼
 *    한 낱말로 읽힌다.
 *
 * 그래서 서식이 끝난 **문자열**을 받는 칩을 상세 화면 안에만 둔다. `SelectableChip` 에
 * `count` 를 문자열로 받는 축을 더하는 편이 나아 보일 수 있지만, 그 컴포넌트는 지도
 * 시트·필터 시트가 이미 숫자로 쓰고 있어 축을 늘리면 두 화면의 표기 규칙이 한 곳에
 * 섞인다. 테두리 두께(1.5)와 hitSlop 규칙은 그쪽과 **같은 값**으로 맞췄다 — 같은
 * 화면에서 두 칩이 나란히 놓여도 크기가 어긋나지 않게.
 */

import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native"

import {
  controlHeight,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

/**
 * 목업의 테두리 두께. `borderWidth` 토큰 사다리(1/2)에 없는 값이라 상수로 둔다.
 * 선택/미선택에 **같은 값**을 쓴다 — 1 → 1.5 로 바꾸면 고를 때마다 칩 폭이 흔들린다.
 * `SelectableChip` 도 같은 상수를 쓴다.
 */
const BORDER = 1.5

export interface DetailFilterChipProps {
  label: string
  /** `999+` 처럼 **이미 서식이 끝난** 문자열. 없으면 개수를 그리지 않는다. */
  count?: string | null
  selected: boolean
  onPress: () => void
  style?: ViewStyle
}

export function DetailFilterChip({
  label,
  count = null,
  selected,
  onPress,
  style,
}: DetailFilterChipProps) {
  const { colors } = useV2Theme()

  /* 위 표 그대로. 선택 시 주황이 되는 것은 **테두리뿐**이고, 글자는 한 단계 진해진다.
     미선택 테두리를 `transparent` 로 두는 이유: `borderWidth` 는 유지해야 선택할 때마다
     칩 폭이 흔들리지 않는다. */
  const backgroundColor = selected
    ? colors.primary.primaryWeak
    : colors.fill.normal
  const borderColor = selected ? colors.primary.primary : "transparent"
  const labelColor = selected ? colors.label.normal : colors.label.neutral
  const countColor = selected ? colors.label.neutral : colors.label.assistive

  /* 32px 칩은 최소 터치 44 에 못 미친다. 박스를 키우지 않고 **세로만** hitSlop 으로
     늘린다 — 가로로 늘리면 gap 6 인 이웃 칩과 히트 영역이 겹쳐 어느 쪽이 잡히는지
     예측할 수 없다. */
  const verticalHitSlop = Math.max(0, (touchTarget.min - controlHeight.sm) / 2)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: false }}
      hitSlop={{ top: verticalHitSlop, bottom: verticalHitSlop }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { borderColor, backgroundColor },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[typography.label.xSmall, { color: labelColor }]}>
        {label}
      </Text>
      {count !== null && (
        <Text style={[typography.subtext.medium, { color: countColor }]}>
          {count}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: controlHeight.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
    borderWidth: BORDER,
  },
  pressed: { opacity: 0.85 },
})
