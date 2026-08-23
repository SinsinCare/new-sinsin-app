// Design System v2 — Tab Bar (하단 고정 탭 바)
// Spec: project/design-system-v2/design-system-base/components/Tab-Bar.md (Figma node 61:5948)
//
// 컨트롤드 컴포넌트: `value`로 선택 탭을 외부에서 제어하고 `onChange`로 변경 통지.
// selected는 런타임 파생(value === item.value) — prop 아님. 상태 축은 selected / redDot 둘뿐(Disabled 없음).
// 세 계층(컨테이너 Tab Bar + 반복 아이템 Tab Item + 아이콘 Tab Bar Icons)을 RN 관점으로 매핑:
//   - `아이폰 X`(safe-area) 축 → useSafeAreaInsets().bottom 으로 대응(홈 인디케이터 영역 자동 반영)
//   - selected / redDot        → value 파생 + item.redDot
// 시맨틱 색은 useV2Theme(다크 자동).
//
// 아이콘 세트 (2026-08-18): Figma `Tab Bar / Tab Item` 내보내기 다섯을
//   `icons/registry.ts` 에 `tabHome/tabCommunity/tabRecipe/tabRestaurant/tabAll` 로 들였다.
//   앱이 쓰던 외곽선 글리프가 아니라 **채움** 글리프다. 색은 토큰으로 칠한다(레지스트리 주석 참고).
//   다색·이모지처럼 `color` 로 칠할 수 없는 세트로 바뀌면 아이템의 `renderIcon` 으로
//   그 자리만 갈아 끼운다 — 바 치수는 건드리지 않는다.

import type { ReactNode } from "react"
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native"
/*
 * **RN 의 `Pressable` 이 아니다.** 이 바는 화면 **위에 떠서**(라운드 모서리로 화면이
 * 비쳐야 하므로) 지도·시트 같은 팬 제스처 위에 얹힌다. RN 의 터치 응답자 체계는
 * RNGH 제스처와 다른 체계라, 손가락이 조금이라도 움직이면(실측 4pt) 밑에 있는
 * 팬이 터치를 가져가고 탭이 사라진다 — 마우스로는 이동량이 0 이라 항상 통과해서
 * 안 보인다. RNGH 의 `Pressable` 은 같은 체계 안에서 중재되므로 흔들린 탭도 산다.
 * (같은 이유로 `features/restaurant/RestaurantCard` 도 이걸 쓴다.)
 */
import { Pressable } from "react-native-gesture-handler"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { borderWidth, iconSize, radius, spacing, typography } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import type { V2IconName } from "../icons"
import { V2Icon } from "./V2Icon"

/** 탭 아이템. icon은 v2 아이콘 세트 이름(V2IconName) — 세트에 없는 앱 탭 아이콘은 소비처가 추가해 넘김 */
export type V2TabBarItem = {
  value: string
  label: string
  icon: V2IconName
  /** 아이콘 우상단 알림 뱃지(빨간 점). 선택 여부와 독립 */
  redDot?: boolean
  /**
   * 아이콘 자리를 통째로 대신 그린다(24×24 안에 맞춰 넘길 것).
   *
   * **mono 글리프가 아닌 아이콘을 위한 구멍이다** — 이모지·3D·다색 래스터는
   * `color` 로 칠할 수 없어서 `V2Icon` 경로를 탈 수 없다. 그런 세트에서는 선택 상태를
   * 색이 아니라 다른 것(불투명도·크기·채움 버전)으로 말해야 하므로 `selected` 를 넘겨 준다.
   *
   * 넘기지 않으면 기존대로 `icon` 이름으로 `V2Icon` 을 그린다.
   */
  renderIcon?: (state: { selected: boolean; size: number }) => ReactNode
}

export type V2TabBarProps = {
  /** 탭 목록. 화면 전체 폭을 개수만큼 균등 분할 */
  items: V2TabBarItem[]
  /** 현재 선택된 탭의 value (controlled) */
  value: string
  /** 탭 선택 시 호출 */
  onChange: (value: string) => void
  style?: ViewStyle
  /**
   * 바의 실제 크기가 필요한 소비처를 위해 그대로 흘려준다.
   *
   * 바 높이는 safe-area + 콘텐츠 + 패딩으로 정해져 기기마다 다르다. 바 뒤에 무언가를
   * 깔아야 하는 쪽(모서리 메움 등)이 상수를 박으면 한 기기에서만 맞는다.
   */
  onLayout?: (event: LayoutChangeEvent) => void
}

/**
 * 바 상단 모서리 반경. 스펙 `radius["3xl"]` = 24.
 *
 * 바 뒤에 무언가를 까는 쪽이 **이 값만큼은 비워 둬야** 모서리가 잘라 낼 대상이 남는다.
 */
export const TAB_BAR_CORNER_RADIUS = radius["3xl"]

/**
 * 탭바의 두 면 — **바 자신(face)** 과 **모서리 뒤 메움(backdrop)**.
 *
 * ## 라운드가 보이는 유일한 조건 (2026-08-19, 세 번 틀리고 정리)
 *
 * 라운드는 "잘린 삼각형과 바 면의 **색이 다를 때**"만 드러난다. 실패의 연쇄가
 * 전부 이 한 문장으로 설명된다:
 *
 *   ✗ 선만 진하게              → 면 대비는 여전히 1.0:1, 테두리만 굵어짐
 *   ✗ 바도 메움도 lower(#313135) → 같은 색, 1.0:1 — 안 보임
 *   ✗ 바도 메움도 default(#1f1f21) → 같은 색, 1.0:1 — 안 보임
 *   ✓ 바 lower + 메움 default   → 1.27:1 — 홈의 카드↔바닥과 같은 단차로 보임
 *
 * 즉 face 와 backdrop 은 **반드시 다른 단**이어야 하고, 그래서 이 모듈은 두 값을
 * 쌍으로 export 한다. 하나만 바꾸면 다시 1.0:1 로 돌아간다 — 그 실수는
 * `tests/tabBarRoundedContrast.test.ts` 가 막는다.
 *
 * 방향은 사용자 지적 그대로다: 「모서리 메움은 메인 바디색처럼 어둡게」.
 * 다크의 바디가 #1f1f21 이므로 메움이 그 값을 갖고, 바가 한 단 위(#313135)로 뜬다.
 * 라이트는 원래 흰 바(#ffffff) 밑에 회색 바닥(#f7f7f7)이라 같은 구조를 그대로 쓴다.
 */
export function tabBarFace(
  colors: { background: { default: string; lower: string } },
  mode: "light" | "dark",
): string {
  return mode === "dark" ? colors.background.lower : colors.background.default
}

/** 모서리 뒤 삼각형을 메우는 면 — 항상 face 보다 한 단 **아래**(바디색). */
export function tabBarBackdrop(
  colors: { background: { default: string; lower: string } },
  mode: "light" | "dark",
): string {
  return mode === "dark" ? colors.background.default : colors.background.lower
}

export function V2TabBar({
  items,
  value,
  onChange,
  style,
  onLayout,
}: V2TabBarProps) {
  const { colors, mode } = useV2Theme()
  const insets = useSafeAreaInsets()

  // safe-area(홈 인디케이터) 있으면 그 높이만큼 하단 여백 확보(iOS가 인디케이터 바를 직접 그림 → 우리는 영역만 예약).
  // 없으면 스펙 하단 패딩 11(콘텐츠 행 높이 62). one-off 값이라 토큰 없음.
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 11

  const barSurface = tabBarFace(colors, mode)

  return (
    <View
      accessibilityRole="tablist"
      onLayout={onLayout}
      style={[
        styles.container,
        {
          paddingBottom: bottomPadding,
          backgroundColor: barSurface,
          /*
            상단 보더는 **라운드 곡선을 따라** 그려진다 — RN 은 borderRadius 가 있으면
            border 를 그 곡선으로 휘게 그리므로, 이 선 하나가 직선 구간과 깎인 모서리
            구간을 끊김 없이 두른다(별도 곡선 처리 불필요).

            이 선이 곧 바와 그 뒤(backdrop·시트)의 경계다. 지웠더니 바 윤곽이
            사라졌고(실측 지적), 폭까지 지우면 바가 1px 낮아져 위 시트와의 사이로
            지도가 새어 보였다. 폭·색 모두 살아 있어야 한다.
          */
          borderTopColor: colors.line.alternative,
        },
        style,
      ]}
    >
      {items.map((item) => {
        const selected = item.value === value
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.iconWrap}>
              {item.renderIcon ? (
                item.renderIcon({ selected, size: iconSize.md })
              ) : (
                <V2Icon
                  name={item.icon}
                  size="md" // 24
                  // Figma `Tab Item` 내보내기와 **정확히 같은 두 값**이다(2026-08-18 대조):
                  //   Selected=True  `#2E2F33 @0.70` = label.neutral (0xb3/255 = 0.702)
                  //   Selected=False `#37383C @0.16` = label.disable (0x29/255 = 0.161)
                  // 내보내기가 두 벌이었지만 path 는 동일하고 fill 만 달랐다 — 상태는 색이다.
                  //
                  // 남겨 둘 것: 비선택 아이콘은 흰 면 위에서 **1.3:1** 로 라벨(2.9:1)보다
                  // 훨씬 옅다. 스펙이 그렇게 정해져 있어 그대로 따르지만, 안 고른 탭 넷이
                  // 흐리게 보이는 것이 의도인지는 디자이너 확인이 필요하다.
                  color={selected ? colors.label.neutral : colors.label.disable}
                />
              )}
              {item.redDot && (
                <View
                  style={[
                    styles.redDot,
                    { backgroundColor: colors.status.negative },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                typography.caption.small, // 11px Medium / LH 14 (전용 크기, 세만틱 토큰 대응 없음)
                {
                  color: selected
                    ? colors.label.neutral
                    : colors.label.alternative,
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  /*
    컨테이너: 상단 라운드 24 + 상단 보더 1px. 하단은 각짐.

    보더는 라운드 곡선을 따라 모서리까지 두른다(색은 렌더에서 — 위 인라인 주석).
    폭을 지우면 바가 1px 낮아져 위 시트와의 사이로 배경이 샌다(실측). 폭은 불변.

    콘텐츠 행 패딩 상 8 / 좌우 18(18은 one-off, 토큰 없음). paddingBottom은 런타임(safe-area).
  */
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: borderWidth.thin,
    borderTopLeftRadius: radius["3xl"], // 24
    borderTopRightRadius: radius["3xl"], // 24
    paddingTop: spacing[8], // 8
    paddingHorizontal: 18,
  },
  // 아이템: 개수만큼 균등 분할(flex 1) + 최소 폭 46. 세로 스택(아이콘↔라벨 gap 3).
  item: {
    flex: 1,
    minWidth: 46,
    alignItems: "center",
    gap: 3, // one-off, 토큰 없음
    paddingHorizontal: spacing[6], // 6
    paddingVertical: 1, // one-off, 토큰 없음
  },
  // Pressed: 눌림 피드백(스펙 상태 아님, 런타임 상호작용). opacity 기반.
  pressed: { opacity: 0.6 },
  // 24 아이콘 기준 relative 래퍼 — red dot 절대배치 기준점(overflow 보임 유지)
  iconWrap: { position: "relative" },
  // Red dot: 5×5 원. 아이콘 우상단(Figma 중심 기준 우 +15.5 / 상 -18 → 코너 근사).
  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 5,
    height: 5,
    borderRadius: radius.full, // 원형
  },
})
