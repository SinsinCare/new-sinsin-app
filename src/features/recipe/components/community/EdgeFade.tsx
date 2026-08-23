/**
 * **36pt 엣지 페이드** — 본문이 바 밑으로 사라지는 자리.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.19 · §4-G18 (WBS 1.15).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 로컬인가
 *
 * v2 에 그라디언트 토큰이 없고, §4-G18 의 판정은 "토큰을 늘리지 말고 로컬 컴포넌트로 두되
 * **두 번째 사용처가 생기면 승격**" 이다. `V2BottomCTA` 는 `fade` 프롭(§4-G8)으로 이미 이
 * 페이드를 자기 안에 갖고 있으므로, 여기 남는 소비처는 **`V2BottomCTA` 가 아닌 바** 들이다
 * (액션시트의 옵션 목록 상단 페이드 §2.17, 자체 CTA 를 그리는 화면).
 *
 * ■ 함정 1 — 끝점은 `"transparent"` 가 **아니다**
 *
 * RN 의 `"transparent"` 는 투명한 **검정**이라, 흰 면으로 사라지는 그라디언트에 쓰면
 * 중간 구간이 회색으로 뜬다(안드로이드에서 특히 눈에 띈다). 같은 색의 **알파 0 → 알파 1**
 * 로 가야 색상이 안 흔들리고 다크 모드도 자동으로 맞는다.
 * (선례: `src/features/recipe/components/write/WriteSubmitBar.tsx` · `V2BottomCTA` 머리말)
 *
 * ■ 함정 2 — 페이드는 **패딩 없는 껍데기** 안에 있어야 한다
 *
 * Yoga 는 절대 배치 자식을 부모의 **패딩 안쪽** 기준으로 놓는다. 패딩 있는 바에 이걸 직접
 * 얹으면 `left: 0` 이 실제로는 좌측 패딩만큼 들어가고, 여백을 고칠 때마다 페이드가 조용히
 * 어긋난다. 그래서 소비처는 이렇게 쓴다:
 *
 * ```tsx
 * <View>                     // 패딩 없는 껍데기 — 이게 기준점이다
 *   <EdgeFade />             // 흐름 밖(top: -36). 레이아웃을 차지하지 않는다
 *   <View style={바_패딩}>…</View>
 * </View>
 * ```
 */
import { StyleSheet } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"

/** 시안 실측 — 본문이 사라지는 구간(§2.19 · §2.17 상단 페이드도 같은 값). */
export const EDGE_FADE_HEIGHT = 36

/**
 * 가로 페이드의 **폭**. 세로 36 과 같은 값이 아니다.
 *
 * 세로 페이드는 카드 한 장(≥86)이 사라지는 구간이라 36 이 필요하지만, 가로에서 사라지는
 * 것은 32 높이의 칩이다. 36 이면 폭 52~75 인 칩(`전체` 52 · `CKD 정보` 75)이 **거의 통째로**
 * 흐린 채 서 있게 되어 "읽을 수 없는 칩" 이 하나 더 생긴다. 24 는 칩 하나의 절반보다
 * 작아서 글자가 잘리는 순간만 덮는다.
 */
export const EDGE_FADE_WIDTH = 24

/**
 * 가로 페이드가 **도달하는 최대 불투명도**. 세로 페이드와 달리 1 이 아니다.
 *
 * ■ 왜 (2026-08-21, 실기기 피드백: "뱃지들이 좌우스크롤이 가능한지 애매해보임")
 *
 * 세로 페이드의 일은 **지우는 것**이다(본문이 바 밑으로 사라진다). 가로 페이드의 일은
 * 다르다 — 잘린 칩이 정렬 필에 부딪혀 보이지 않게 **누그러뜨리는 것**이고, 그 잘린 칩
 * 자체는 "오른쪽에 더 있다" 의 **유일한 신호**다. 1 까지 가면 그 신호를 페이드가 지운다.
 *
 * 실측(기본 6종 + `전체`, 13 SemiBold, padH 12, gap 6, 좌 인셋 20):
 * ```
 *   전체 52 · 식단 52 · 수치 변화 80 · 증상 고민 80 · 약물 52 · 외식 후기 80 · 일상 공감 80
 *   → 칩 오른쪽 끝: 72 · 130 · 216 · 302 · 360 · 446 · 532
 *   스크롤 영역 폭 = 화면폭 − (필 76 + 좌 8 + 우 20 = 104)
 *     375pt(SE·mini): 271 → `증상 고민`(222–302)이 걸린다. 페이드 247–271.
 *     390pt(14·15)  : 286 → 같은 칩. 페이드 262–286.
 *     430pt(Pro Max): 326 → `약물`(308–360)이 걸리는데 **18pt 만 안쪽**이다.
 *                     불투명 24pt 페이드는 그 18pt 를 **통째로** 덮는다.
 * ```
 * 즉 큰 화면에서는 걸린 칩이 아예 안 보였다. 폭을 줄여도 경계가 어디에 떨어지느냐에
 * 따라 같은 일이 다시 난다 — 없어져야 할 것은 **불투명도**다. 0.6 이면 어느 화면에서든
 * 잘린 칩의 실루엣과 잘린 모서리가 남고, 필과는 여전히 다른 평면으로 읽힌다.
 *
 * (왼쪽 페이드는 두지 않는다. 페이드가 있어야 하는 이유는 **고정 요소와의 충돌**인데
 *  왼쪽에는 고정 요소가 없고, 화면 가장자리에서 잘리는 것은 그 자체로 "스크롤했다" 이다.)
 */
export const EDGE_FADE_PEEK_ALPHA = 0.6

/**
 * `#rrggbb` / `#rrggbbaa` → **같은 색의 주어진 알파**. 0~1 밖은 잘라 넣는다.
 * 값이 hex 가 아니면(플랫폼 색 등) 깨진 문자열을 만드는 대신 원값을 돌려준다.
 */
function atAlpha(color: string, alpha: number): string {
  const hex = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0")
  if (/^#[0-9a-f]{8}$/iu.test(color)) return `${color.slice(0, 7)}${hex}`
  if (/^#[0-9a-f]{6}$/iu.test(color)) return `${color}${hex}`
  return color
}

/**
 * `#rrggbb` / `#rrggbbaa` → **같은 색의 알파 0**.
 *
 * §2.19 의 두 그라디언트(`EdgeFade` · `PhotoScrim`)가 공유한다 — 둘 다 "투명한 검정"
 * 함정을 같은 방법으로 피한다(머리말 §함정 1). 값이 hex 가 아니면(플랫폼 색 등)
 * 깨진 문자열을 만드는 대신 원값을 돌려준다.
 *
 * @internal §2.19 안에서만 쓴다.
 */
export function transparentOf(color: string): string {
  return atAlpha(color, 0)
}

/**
 * 페이드가 어디에 붙는가.
 *  - `aboveBar`(기본) — **바 위쪽 바깥**. 위가 투명하고 아래가 면 색이라 지나가는 본문이
 *    바에 닿기 전에 사라진다.
 *  - `top` — **스크롤 영역의 맨 위**. 방향이 뒤집힌다(위가 면 색). 액션시트의 옵션 목록이
 *    CTA 밑으로 스크롤됨을 표현하는 자리(§2.17).
 *  - `leftOfBar` — **축이 가로로 눕는다.** 가로 레일 오른쪽에 고정 요소(피드 필터 바의
 *    정렬 필)가 서 있을 때, 그 앞에서 칩이 **누그러지는** 구간이다. 왼쪽이 투명하고
 *    오른쪽이 면 색이되 **끝까지 가지 않는다** — 걸린 칩이 남아야 레일이 스크롤되는
 *    것으로 읽힌다(§`EDGE_FADE_PEEK_ALPHA`).
 */
export type EdgeFadePlacement = "aboveBar" | "top" | "leftOfBar"

export type EdgeFadeProps = {
  placement?: EdgeFadePlacement
  /**
   * 사라지는 **면의 색**. 기본은 화면 배경(`background.default`).
   * 시트·카드 위라면 그 면의 색을 넘긴다 — 색이 다르면 페이드가 띠로 보인다.
   */
  color?: string
}

/**
 * 그라디언트의 축. `LinearGradient` 의 기본은 **세로**(위→아래)라 가로일 때만 준다 —
 * 안 주면 `leftOfBar` 가 조용히 세로 페이드가 되어 아무것도 안 가린다.
 */
const HORIZONTAL_AXIS = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } }

export function EdgeFade({ placement = "aboveBar", color }: EdgeFadeProps) {
  const { colors } = useV2Theme()
  const surface = color ?? colors.background.default
  const clear = transparentOf(surface)
  const horizontal = placement === "leftOfBar"
  /*
    가로만 **끝까지 안 간다** — 걸린 칩을 지우면 레일이 "여기서 끝난다" 로 읽힌다
    (머리말 §EDGE_FADE_PEEK_ALPHA 의 실측). 세로 둘은 지우는 것이 일이라 그대로 1 이다.
  */
  const solid = horizontal ? atAlpha(surface, EDGE_FADE_PEEK_ALPHA) : surface

  return (
    <LinearGradient
      pointerEvents="none"
      colors={placement === "top" ? [surface, clear] : [clear, solid]}
      {...(horizontal ? HORIZONTAL_AXIS : null)}
      style={
        horizontal
          ? styles.leftOfBar
          : [styles.fade, placement === "top" ? styles.top : styles.aboveBar]
      }
    />
  )
}

const styles = StyleSheet.create({
  /** 흐름 밖 — 넣으면 본문이 36 밀리고 그 자리는 아무것도 없는 빈 띠가 된다. */
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: EDGE_FADE_HEIGHT,
  },
  aboveBar: { top: -EDGE_FADE_HEIGHT },
  top: { top: 0 },
  /**
   * 가로판. 높이를 박지 않고 `top`/`bottom` 으로 **부모 높이를 그대로 받는다** — 바의
   * 높이는 밀도(64 / 52)마다 다르고, 여기서 다시 정하면 두 곳이 같은 값을 들게 된다.
   */
  leftOfBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: EDGE_FADE_WIDTH,
  },
})
