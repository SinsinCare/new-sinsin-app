// Design System v2 — Bottom CTA
// Spec: project/design-system-v2/design-system-base/components/Bottom-CTA.md (Figma node 89:7358)
//
// 화면 하단에 고정되는 주 액션 바. Button Area(Button.md Size=XL)를 그대로 조립한다.
//  - layout=single      : 풀폭 단일 Fill 버튼
//  - layout=horizontal  : 가로 2분할 (좌=Weak/neutral, 우=Fill/brand), 둘 다 flex:1
//  - layout=vertical    : 세로 2단 (위=Fill/brand, 아래=Weak/neutral)
//
// 보정:
//  - Top Gradient(**raster** 페이드, node 89:8567)는 기본값에서 생략. 상단 패딩으로
//    콘텐츠와 시각 분리만 확보. 남아 있는 근거는 이 한 줄이 전부다 — 스펙 원문
//    (project/design-system-v2/…)은 이 저장소에 없고, 이 파일의 이력도 최초 도입과
//    키보드 정렬 수정 두 커밋뿐이다. 읽어낼 수 있는 것: 그 자리가 **래스터 한 장**이라
//    (배경색이 픽셀에 구워져 있어) 옮겨올 토큰 값이 없었고, 그래서 색을 지어내는 대신
//    패딩으로 대체했다. `fade` 는 그 값을 지어내지 않고 **테마 배경색 자신**으로
//    그린다(아래) — 다크에서도 자동으로 맞는 유일한 방법이다.
//  - Safe-area: Figma 프레임엔 홈 인디케이터 레이어가 없음 → RN에선 하단 inset을 확보(spacing[20] 최소).
//
// ─────────────────────────────────────────────────────────────────────────────
// ■ `fade` — 바 위 36pt 페이드 (기본 false)
//
// 스크롤이 바 밑으로 이어지는 화면(신고·글쓰기·스토리 작성)에서는 상단 패딩만으로는
// 본문이 바에 **잘려 보인다**. 시안은 그 자리에 `paddingTop 0 + 36pt 페이드`를 쓴다.
// 켜면 상단 패딩이 0 이 되고 바 **위쪽 바깥**에 36pt 그라디언트가 떠서, 지나가는 본문이
// 바에 닿기 전에 배경색으로 사라진다.
//
// 두 가지가 이 구현의 핵심이고 둘 다 앱에 실측 선례가 있다(`WriteSubmitBar` 머리말):
//  1. 끝점이 `"transparent"` 가 **아니다.** RN 의 transparent 는 투명한 *검정*이라
//     흰 면으로 사라지는 그라디언트의 중간이 회색으로 뜬다(안드로이드에서 특히).
//     같은 배경색의 알파 0 → 알파 1 로 가야 색이 흔들리지 않고, 다크도 자동으로 맞는다.
//  2. 페이드는 **레이아웃을 차지하지 않는다.** 흐름에 넣으면 본문이 36 밀리고 그 자리는
//     그냥 빈 띠가 된다. 절대 배치(`top: -36`)의 기준을 흔들리지 않게 하려고 페이드를
//     켤 때만 패딩 없는 껍데기 `View` 를 하나 두른다 — 패딩 있는 바에 직접 얹으면
//     `left/top` 이 패딩 박스 기준이라 좌우 20 만큼 어긋난다.

import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { spacing } from "../tokens"
import { useV2Theme } from "../hooks/useV2Theme"
import { useKeyboardVisibility } from "@/src/hooks/useKeyboardVisibility"
import { V2Button, type V2ButtonProps } from "./V2Button"

export type V2BottomCTALayout = "single" | "horizontal" | "vertical"

/** primary 버튼에 넘길 수 있는 V2Button prop 일부 (label·onPress·size는 컴포넌트가 관리) */
export type V2BottomCTAPrimaryProps = Partial<
  Pick<
    V2ButtonProps,
    "color" | "variant" | "loading" | "disabled" | "leftIcon" | "rightIcon"
  >
>

export type V2BottomCTAProps = {
  /** 주 액션 라벨 (Fill/brand) */
  primaryLabel: string
  onPrimary: () => void
  /** 보조 액션 라벨 (Weak/neutral) — 있으면 2버튼 레이아웃 */
  secondaryLabel?: string
  onSecondary?: () => void
  /** 버튼 배치. 미지정 시 secondaryLabel 유무로 자동 결정(single / horizontal) */
  layout?: V2BottomCTALayout
  /** primary 버튼 prop 오버라이드 (color/variant/loading 등) */
  primaryProps?: V2BottomCTAPrimaryProps
  /**
   * 바 위 36pt 페이드 + 상단 패딩 0. 기본 false(상단 패딩 16, 페이드 없음).
   * 본문이 바 밑으로 스크롤해 지나가는 화면에서만 켠다. 자세한 것은 파일 머리말 §fade.
   */
  fade?: boolean
  /** 바깥 컨테이너 스타일 확장 (예: position:absolute 고정 배치) */
  style?: StyleProp<ViewStyle>
}

/** 시안 실측 — 바 위로 배경색이 사라지는 구간. `EdgeFade`(§2.19)와 같은 값 */
const FADE_HEIGHT = 36

/**
 * `#rrggbb` / `#rrggbbaa` → 같은 색의 **알파 0**.
 * 그라디언트 시작점이 `"transparent"`(투명한 검정)면 안 되는 이유는 머리말 §fade-1.
 */
function transparentOf(color: string): string {
  const rgb = color.length === 9 ? color.slice(0, 7) : color
  return `${rgb}00`
}

export function V2BottomCTA({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  layout,
  primaryProps,
  fade = false,
  style,
}: V2BottomCTAProps) {
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardVisibility()

  // 열린 키보드 위에서는 홈 인디케이터 inset을 다시 더하지 않는다.
  const paddingBottom = isKeyboardVisible
    ? spacing[12]
    : Math.max(insets.bottom, spacing[20])

  // layout 미지정 시 secondary 유무로 결정
  const resolvedLayout: V2BottomCTALayout =
    layout ?? (secondaryLabel ? "horizontal" : "single")
  const isTwoButtons = resolvedLayout !== "single" && !!secondaryLabel

  // Fill/brand 주 액션 (size=XL 고정). primaryProps로 color/variant/loading 등 오버라이드 가능.
  const primaryButton = (
    <V2Button
      size="xl"
      color="brand"
      variant="fill"
      fullWidth
      {...primaryProps}
      onPress={onPrimary}
      style={
        isTwoButtons && resolvedLayout === "horizontal"
          ? styles.flex
          : undefined
      }
    >
      {primaryLabel}
    </V2Button>
  )

  // Weak/neutral 보조 액션 (Bottom-CTA.md의 'Weak · Grey')
  const secondaryButton = isTwoButtons ? (
    <V2Button
      size="xl"
      color="neutral"
      variant="weak"
      fullWidth
      onPress={onSecondary}
      style={resolvedLayout === "horizontal" ? styles.flex : undefined}
    >
      {secondaryLabel}
    </V2Button>
  ) : null

  const buttons =
    resolvedLayout === "horizontal" && isTwoButtons ? (
      // 가로 2분할: 좌=Weak, 우=Fill. 둘 다 flex:1(균등).
      <View style={styles.row}>
        {secondaryButton}
        {primaryButton}
      </View>
    ) : resolvedLayout === "vertical" && isTwoButtons ? (
      // 세로 2단: 위=Fill, 아래=Weak.
      <View style={styles.column}>
        {primaryButton}
        {secondaryButton}
      </View>
    ) : (
      // 단일 풀폭 Fill
      primaryButton
    )

  const bar = (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.default, paddingBottom },
        // 페이드가 상단 여백을 대신한다 — 둘을 겹치면 바가 16 두꺼워진다.
        fade && styles.containerFaded,
        fade ? undefined : style,
      ]}
    >
      {buttons}
    </View>
  )

  if (!fade) return bar

  /*
    페이드를 켤 때만 껍데기를 두른다(머리말 §fade-2). `style` 은 언제나 **가장 바깥**
    노드에 붙는다 — 소비처가 `position:absolute` 로 화면 바닥에 고정하는 자리라,
    안쪽 바에 붙이면 껍데기만 흐름에 남고 바가 혼자 떠 버린다.
  */
  return (
    <View style={style}>
      <LinearGradient
        pointerEvents="none"
        colors={[
          transparentOf(colors.background.default),
          colors.background.default,
        ]}
        style={styles.fade}
      />
      {bar}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // Button Area 좌우 패딩 20 / 상단 패딩(그라디언트 생략 보정용 시각 여백)
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
  },
  // fade=true: 시안대로 상단 패딩 0 (그 자리를 36pt 페이드가 대신한다)
  containerFaded: { paddingTop: 0 },
  // 바 **바깥** 위쪽 36pt. 레이아웃을 차지하지 않는다.
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -FADE_HEIGHT,
    height: FADE_HEIGHT,
  },
  // 2 Buttons(가로): gap 8, 균등 분할
  row: {
    flexDirection: "row",
    gap: spacing[8],
  },
  // 2 Buttons (Vertical): gap 8
  column: {
    flexDirection: "column",
    gap: spacing[8],
  },
  flex: { flex: 1 },
})
