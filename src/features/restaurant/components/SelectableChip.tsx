/**
 * 목업의 **아웃라인 선택** 칩. `V2Chip` 으로는 만들 수 없어서 여기서 한 번만 만든다.
 *
 * `V2Chip` 은 `selected` 일 때 면을 `primary.primary` 로 채우고 글자를 흰색으로 바꾼다.
 * 목업(-2 / -5 / -8 / -23 / -24)의 카테고리·필터·트레이 칩은 그게 아니다. `style` prop 은
 * 루트에만 닿으므로 글자색을 바꿀 수 없다 — 글자색이 컴포넌트 내부에서 `selected` 로
 * 결정되기 때문이다.
 *
 * `V2Chip` 에 축을 더하지 않은 이유: 채워지는 선택(`fill`)은 필터 시트의 시도 칩(-22)이
 * 실제로 쓰고 있어 지울 수 없고, DS 컴포넌트에 새 축을 여는 결정은 이 화면 하나가
 * 내릴 범위를 넘는다. 대신 DS 규칙은 그대로 지킨다 — 모듈 레벨 `SIZE` 룩업 +
 * `resolveColors()`, `fontWeight` 금지(무게는 fontFamily 에만 있다), pill 은 `radius.full`,
 * 작은 컨트롤은 hitSlop 으로 44 확보, `style` 은 마지막에 적용.
 *
 * ## 선택 상태의 면은 **흰색이 아니다** (목업 픽셀 실측)
 *
 * 처음 구현은 "선택 = 흰 면 + 주황 테두리·글자" 였는데, 목업을 4배로 확대해 픽셀을 뽑아
 * 보니 선택된 칩의 면은 전부 `#FFF9F6`(회색 컨테이너 위에서는 `#FCF6F3`)이다. 흰 면 위
 * 반투명 주황이라는 뜻이고, 그 값이 정확히 `primary.primaryWeak`(`#fff4f099`)와 같다.
 * 즉 목업은 처음부터 토큰을 쓰고 있었고 코드만 흰색으로 굳어 있었다.
 *
 * 미선택 면도 문맥마다 다르다. 아래 표의 면 값은 전부 실측값이다.
 *
 * | variant | 쓰는 곳 | 미선택 면 | 선택 글자 |
 * |---|---|---|---|
 * | `fill` | 필터 시트 시도 칩 (-22/-24) | `#F9FAFB` = `fill.normal` | 흰색(면이 주황) |
 * | `outline` | 필터 시트 영양·음식 칩, 트레이 칩 (-23/-24) | `#F9FAFB` = `fill.normal` | 주황 |
 * | `outline` + `onSurface` | 회색 컨테이너 안 세부 지역 칩 (-24) | `#FFFFFF` | 주황 |
 * | `quiet` | 시트/리스트 상단 필터칩 행 (-5/-8/-21) | `#F9FAFB` = `fill.normal` | **gray-900** |
 *
 * `quiet` 만 선택 글자가 어두운 이유는 그 행이 지도·목록 **본문 위에 상시 노출**되기
 * 때문이다. 네 칩이 동시에 주황 글자가 되면 시트 머리가 주황 덩어리로 읽혀 그 아래
 * 카드의 주황 요소(별점·저장 표시)와 구분되지 않는다. 필터 시트는 모달이라 그 문제가 없다.
 *
 * ## 테두리는 **어느 상태에도 없다** (2026-07-31)
 *
 * 목업은 선택을 1.5pt 브랜드 테두리로 말했고 `quiet` 의 미선택은 회색 테두리로 떠 있었다.
 * 그런데 같은 역할의 컨트롤이 레시피 탭에서는 이미 **면으로만** 말한다(필터 진입점은
 * 연회색 면 → 걸리면 주황 틴트 면, 카테고리 레일은 면 + 굵기). 한 앱에서 같은 뜻을 두
 * 문법으로 말하고 있었던 셈이라 면 쪽으로 통일했다. 자세한 것은 `styles.base` 주석.
 */

import { Pressable, StyleSheet, View, type ViewStyle } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useTranslation } from "react-i18next"
import {
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2Icon,
  type SemanticColors,
  type V2IconName,
} from "@/src/design-system-v2"

export type SelectableChipSize = "s" | "m"

/**
 * `fill` — 선택 시 **불투명** 주황 면 + 흰 글자(목업 -22 의 시도 칩. 유일하게 면을 채운다).
 * `outline` — 선택 시 주황 틴트 면 + 주황 글자(필터 시트 칩, 트레이 칩).
 * `quiet` — 선택 시 주황 틴트 면 + **gray-900 글자**(시트/리스트 상단 필터칩 행).
 *
 * 세 값의 차이와 근거는 파일 헤더의 표에 있다. 이름의 `outline` 은 역사적 이름이고
 * 테두리를 그리지 않는다(헤더 §테두리).
 */
export type SelectableChipVariant = "fill" | "outline" | "quiet"

export interface SelectableChipProps {
  label: string
  selected?: boolean
  onPress?: () => void
  variant?: SelectableChipVariant
  size?: SelectableChipSize
  /**
   * 회색 면(`fill.background`) 위에 놓이는 칩인가. 목업 -22 의 세부 지역 칩은
   * 회색 컨테이너 안에 있어 미선택 상태에 테두리가 없다 — 흰 면 자체가 경계다.
   */
  onSurface?: boolean
  leadingIcon?: V2IconName
  /** 라벨 오른쪽 글리프. 정렬 칩의 `⌄` 가 이걸 쓴다(`▾` 텍스트 글리프를 쓰지 않는다). */
  trailingIcon?: V2IconName
  /**
   * 라벨 뒤에 붙는 개수. 목업에는 없고 이쪽이 더한 것이다 — 활성 테두리만으로는
   * "몇 개가 걸렸는지" 를 알 수 없어서 시트를 열어 봐야 했다.
   */
  count?: number
  /** 있으면 우측 ✕. 트레이 칩(-23)이 쓴다. 칩 본체 onPress 로 전파되지 않는다. */
  onRemove?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  style?: ViewStyle
}

/** size → 치수 + 타이포 + 아이콘. V2Chip 의 s/m 치수를 그대로 맞춘다. */
const SIZE = {
  s: {
    height: 32,
    paddingHorizontal: spacing[12],
    text: typography.label.xSmall,
    icon: iconSize.xs,
  },
  m: {
    height: 38,
    paddingHorizontal: spacing[16],
    text: typography.label.small,
    icon: iconSize.sm,
  },
} as const

interface ChipPalette {
  bg: string
  fg: string
}

function resolveColors(
  variant: SelectableChipVariant,
  selected: boolean,
  onSurface: boolean,
  colors: SemanticColors,
): ChipPalette {
  if (selected) {
    if (variant === "fill") {
      return {
        bg: colors.primary.primary,
        fg: colors.static.white,
      }
    }
    return {
      // 반투명 주황. 흰 면 위에서 `#FFF9F6`, 회색 컨테이너 위에서 `#FCF6F3` 가 되어
      // 목업의 두 실측값을 한 토큰으로 맞춘다. **테두리는 없다**(아래 §보더리스).
      bg: colors.primary.primaryWeak,
      fg: variant === "quiet" ? colors.label.normal : colors.primary.primary,
    }
  }
  if (variant === "quiet") {
    // 흰 시트 머리 위에 상시 노출되는 행. 종전에는 흰 면 + 회색 테두리였는데, 그러면
    // 같은 자리의 레시피 필터 진입점(연회색 면, 테두리 없음)과 문법이 달라진다.
    // 면으로 세운다 — 흰 시트 위에서 옅은 회색 면이 곧 경계다.
    return {
      // `fill.control` — 아래 outline 갈래와 같은 이유다(그쪽 주석).
      bg: colors.fill.control,
      fg: colors.label.neutral,
    }
  }
  // 회색 컨테이너 안에서는 흰 면 자체가 경계다(위 `onSurface` 주석). 그 밖에서는
  // 흰 시트 위이므로 반대로 옅은 회색 면으로 칩을 세운다 — 테두리를 얹지 않는다.
  return {
    /*
      면은 `fill.control` 이다 — `fill.normal` 이 아니다(2026-08-21).
      위 §보더리스가 "옅은 회색 면이 곧 경계다" 로 정해 둔 그 면인데, `fill.normal` 은
      스켈레톤·배지 같은 장식면과 겸하던 칸이라 흰 시트 위에서 ΔL* 3.79 로 경계 노릇을
      못 했다. `V2Chip` 미선택 면과 **같은 칸**으로 간다 — 같은 뜻의 컨트롤이 탭마다
      다른 면을 갖는 것도 결함이다. 근거는 `tokens/colors.ts` 의 `fill.control` 머리말.
      회색 컨테이너 안(`onSurface`)은 흰 면이 경계이므로 그대로다.
    */
    bg: onSurface ? colors.background.default : colors.fill.control,
    fg: colors.label.neutral,
  }
}

export function SelectableChip({
  label,
  selected = false,
  onPress,
  variant = "outline",
  size = "m",
  onSurface = false,
  leadingIcon,
  trailingIcon,
  count,
  onRemove,
  disabled = false,
  accessibilityLabel,
  style,
}: SelectableChipProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const s = SIZE[size]
  const palette = resolveColors(variant, selected, onSurface, colors)

  /* 32px 칩은 최소 터치 44 에 못 미친다. 박스를 키우지 않고 hitSlop 으로 늘린다 —
     **세로만** 늘린다. 가로로 늘리면 gap 8 인 이웃 칩과 히트 영역이 겹쳐, 두 칩 사이를
     누를 때 어느 쪽이 잡히는지 예측할 수 없게 된다. */
  const verticalHitSlop = Math.max(0, (touchTarget.min - s.height) / 2)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={{ top: verticalHitSlop, bottom: verticalHitSlop }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: palette.bg,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadingIcon ? (
        <V2Icon name={leadingIcon} size={s.icon} color={palette.fg} />
      ) : null}

      <Text style={[s.text, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>

      {/*
        개수는 **배지**다. 라벨 뒤에 맨 숫자로 붙이면 `음식 종류 1` 이 상호명처럼 한 낱말로
        읽힌다(사용자 지적). 레시피 목록의 필터 버튼이 이미 같은 문법을 쓴다 —
        브랜드 면 + 흰 숫자.
      */}
      {typeof count === "number" && count > 0 ? (
        <View
          style={[
            styles.countBadge,
            { backgroundColor: colors.primary.primary },
          ]}
        >
          <Text
            style={[typography.caption.xSmall, { color: colors.static.white }]}
            numberOfLines={1}
          >
            {String(count)}
          </Text>
        </View>
      ) : null}

      {trailingIcon ? (
        <V2Icon name={trailingIcon} size={s.icon} color={palette.fg} />
      ) : null}

      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.remove")}
          disabled={disabled}
          hitSlop={Math.max(0, (touchTarget.min - s.icon) / 2)}
          onPress={onRemove}
        >
          <V2Icon name="close" size={s.icon} color={palette.fg} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

/** 칩을 wrap 배치하는 공통 컨테이너. 목업의 5열 wrap 은 폭이 아니라 gap 이 만든다. */
export function ChipWrap({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.wrap, style]}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    borderRadius: radius.full, // pill
    /*
      §보더리스 — 테두리를 그리지 않는다(2026-07-31).

      종전에는 선택 상태를 1.5pt 브랜드 테두리로 말했다(목업 -2/-5/-23/-24 실측). 그런데
      앱의 나머지(레시피 목록·보관함·상세)는 **면과 여백으로만** 구획하는 규칙이라, 같은
      역할의 칩이 탭마다 다른 문법을 갖고 있었다. 선택은 이제 면이 말한다 — `fill` 은
      불투명 주황, 나머지는 주황 틴트 면이고 테두리는 두 상태 모두 없다.

      `borderWidth` 자체를 남겨 둔 이유는 없다. 값을 0 으로 두면 다음 사람이 "왜 0인가" 를
      묻게 되므로 속성을 지웠고, 폭이 상태에 따라 흔들리지 않는다는 성질은 그대로다.
    */
  },
  /** 라벨 뒤 개수 배지. 레시피 필터 버튼(18×18 원)과 같은 치수다. */
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  // 눌림 피드백은 색이 아니라 opacity — DS 전체가 같은 규칙이다.
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
})
