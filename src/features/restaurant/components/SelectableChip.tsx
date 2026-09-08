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

/** fill: 브랜드 강조, outline: 필터 시트, quiet: 결과 위의 가벼운 테두리 컨트롤. */
export type SelectableChipVariant =
  | "fill"
  | "outline"
  | "quiet"
  | "text"
  | "filter"

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
  if (variant === "filter") {
    return {
      bg: colors.fill.normal,
      fg: selected ? colors.label.normal : colors.label.neutral,
    }
  }
  if (selected) {
    if (variant === "fill") {
      return {
        bg: colors.primary.primary,
        fg: colors.static.white,
      }
    }
    return {
      bg: colors.label.normal,
      fg: colors.background.default,
    }
  }
  if (variant === "quiet" || variant === "text") {
    return {
      bg: "transparent",
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: Math.max(touchTarget.min, s.height),
          paddingVertical: spacing[8],
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor:
            variant === "quiet" || variant === "text" || variant === "filter"
              ? "transparent"
              : palette.bg,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {(variant === "quiet" ||
        variant === "filter" ||
        (variant === "text" && selected)) && (
        <View
          pointerEvents="none"
          style={[
            styles.quietSurface,
            {
              backgroundColor: palette.bg,
              borderColor:
                variant === "filter"
                  ? selected
                    ? colors.label.neutral
                    : "transparent"
                  : selected
                    ? palette.bg
                    : colors.line.neutral,
            },
          ]}
        />
      )}
      {leadingIcon ? (
        <V2Icon name={leadingIcon} size={s.icon} color={palette.fg} />
      ) : null}

      <Text
        style={[
          variant === "filter" && !selected
            ? typography.label.xSmallWeak
            : s.text,
          { color: palette.fg },
        ]}
        numberOfLines={1}
      >
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
            {
              backgroundColor: selected
                ? colors.background.default
                : colors.label.normal,
            },
          ]}
        >
          <Text
            style={[
              typography.caption.small,
              {
                color: selected
                  ? colors.label.normal
                  : colors.background.default,
              },
            ]}
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
  },
  quietSurface: {
    ...StyleSheet.absoluteFillObject,
    top: spacing[6],
    bottom: spacing[6],
    borderWidth: 1,
    borderRadius: radius.full,
  },
  /** 라벨 뒤 개수 배지. 레시피 필터 버튼(18×18 원)과 같은 치수다. */
  countBadge: {
    minWidth: 18,
    minHeight: 20,
    paddingVertical: spacing[2],
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
