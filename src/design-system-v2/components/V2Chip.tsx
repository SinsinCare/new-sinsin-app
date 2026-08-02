// Design System v2 — Chip
// 인터랙티브 필터/토글 칩(pill). Badge(비인터랙티브 태그)와 별개.
//
// 상태 모델:
//  - selected  → 선택/미선택 색 전환(prop, 선언적)
//  - Pressed   → 런타임 상호작용(Pressable의 pressed) — prop 아님
//  - disabled  → boolean prop
//
// 패턴: size→치수/타이포 룩업 + (tone, selected)→{bg,fg} 토큰 룩업.
//  시맨틱 색은 useV2Theme(다크 자동).
//
// ─────────────────────────────────────────────────────────────────────────────
// ■ `tone` — 선택을 **무슨 색으로** 말하는가
//
// 종전에는 축이 없었다. 선택된 칩은 언제나 불투명 주황이었고, 그래서 "브랜드색은 화면에
// 하나" 규칙을 지켜야 하는 화면들은 이 컴포넌트를 쓸 수 없어 각자 칩을 새로 만들었다
// (`features/restaurant/SelectableChip`·`DetailFilterChip`, 그리고 레시피 정렬 줄은
// 아예 칩을 포기하고 맨 글자였다). 같은 뜻의 컨트롤이 네 곳에서 네 모양이 된 상태다.
//
// 축을 하나 연다:
//   `brand`   — 선택 = 불투명 주황 면 + 흰 글자. 화면에서 이 칩 줄 자체가 주인공일 때.
//   `neutral` — 선택 = 잉크 면 + 흰 글자. **무채색**이라 브랜드색을 이미 쓰고 있는
//               화면(레시피 목록의 필터 배지 등) 위에 얹어도 강조가 둘로 갈라지지 않는다.
//               지도 탭의 카테고리 레일이 같은 이유로 이미 잉크 면을 쓴다.
//
// 두 톤 모두 **테두리가 없다** — 앱 전체가 보더리스이고, 흰 바닥 위에서는 옅은 회색 면이
// 곧 경계다. 선택 여부는 면 + 글자 굵기 두 가지로 동시에 말한다(색맹 대비).

import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native"
import {
  controlHeight,
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
} from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { V2Icon } from "./V2Icon"
import type { V2IconName } from "../icons"
import { useTranslation } from "react-i18next"

export type V2ChipSize = "s" | "m"

/** 선택 상태의 면 색. 자세한 것은 파일 머리말 §tone. */
export type V2ChipTone = "brand" | "neutral"

export type V2ChipProps = {
  /** 칩 라벨 */
  label: string
  /** 선택 상태(색 전환). 기본 false */
  selected?: boolean
  onPress?: () => void
  size?: V2ChipSize
  /** 선택 면의 색. 기본 `brand`(주황). 무채색이 필요하면 `neutral`. */
  tone?: V2ChipTone
  /** 라벨 좌측 아이콘 */
  leadingIcon?: V2IconName
  /** 있으면 우측 × 표시 — 눌러 제거(칩 onPress와 분리) */
  onRemove?: () => void
  disabled?: boolean
  /** 스크린리더용 라벨. 없으면 보이는 `label` 이 읽힌다. */
  accessibilityLabel?: string
  style?: ViewStyle
}

/**
 * size → 치수 + 타이포 (chip 스펙).
 *
 * `text`/`textWeak` 는 **같은 크기·같은 줄높이**의 다른 굵기다 — 굵기를 fontSize 로
 * 흉내내면 고를 때마다 칩 폭이 흔들린다. 굵기는 face 로만 말한다(`typography.ts` 머리말:
 * Pretendard 가 굵기별 파일로 로드돼 있어 `fontWeight` 를 겹치면 iOS 에서 가짜 볼드가 난다).
 */
const SIZE = {
  s: {
    height: controlHeight.sm, // 32
    paddingHorizontal: spacing[12],
    text: typography.label.xSmall, // 13 semibold
    textWeak: typography.label.xSmallWeak, // 13 medium
  },
  m: {
    height: controlHeight.md, // 38
    paddingHorizontal: spacing[16],
    text: typography.label.small, // 15 semibold
    textWeak: typography.label.smallWeak, // 15 medium
  },
} as const

export function V2Chip({
  label,
  selected = false,
  onPress,
  size = "m",
  tone = "brand",
  leadingIcon,
  onRemove,
  disabled = false,
  accessibilityLabel,
  style,
}: V2ChipProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const s = SIZE[size]

  /*
    (tone, selected) → 배경·전경(텍스트·아이콘·×) 색. 미선택은 두 톤이 같다 —
    안 고른 칩끼리 화면마다 달라 보일 이유가 없다.

    `neutral` 의 글자는 **`static.white` 가 아니라 `background.default`** 다. 두 토큰은
    라이트에서 둘 다 흰색이라 같아 보이지만 다크에서 갈라진다 — 다크의 `label.normal` 은
    거의 흰색(#f9fafb)이라, 거기에 `static.white` 를 얹으면 **흰 알약에 흰 글자**가 된다.
    `background.default` 를 쓰면 두 모드 모두 "면과 글자가 서로 뒤집힌" 알약이 된다.
    `brand` 는 두 모드 다 주황 면이므로 흰 글자가 맞다.
  */
  const selectedFace =
    tone === "neutral"
      ? { bg: colors.label.normal, fg: colors.background.default }
      : { bg: colors.primary.primary, fg: colors.static.white }
  const bg = selected ? selectedFace.bg : colors.fill.normal
  const fg = selected ? selectedFace.fg : colors.label.neutral

  /*
    32/38 칩은 최소 터치 44 에 못 미친다. 박스를 키우지 않고 **세로만** hitSlop 으로
    늘린다 — 가로로 늘리면 gap 8 인 이웃 칩과 히트 영역이 겹쳐 어느 쪽이 잡히는지
    예측할 수 없다. `SelectableChip`·`DetailFilterChip` 과 같은 규칙이다.
  */
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
          backgroundColor: bg,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadingIcon && (
        <V2Icon name={leadingIcon} size={iconSize.sm} color={fg} />
      )}
      <Text
        style={[selected ? s.text : s.textWeak, { color: fg }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {onRemove && (
        // × 는 칩 본체와 별개 터치 타겟 — onPress로 전파되지 않음
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("accessibility.remove")}
          disabled={disabled}
          hitSlop={spacing[6]}
          onPress={onRemove}
        >
          <V2Icon name="close" size={iconSize.sm} color={fg} />
        </Pressable>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    borderRadius: radius.full, // pill
  },
  // Pressed: 눌림 피드백(정확한 pressed 토큰 미추출 → opacity 기반, Button과 동일 접근).
  pressed: { opacity: 0.85 },
  // Disabled: 흐리게.
  disabled: { opacity: 0.4 },
})
