/**
 * **섹션 밴드** — 섹션을 끊는 전폭 8px 회색 띠.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.7 (WBS 1.4).
 *
 * 시안은 위/아래 흰 여백을 8/8/16 으로 섞어 그렸다(§5.21-10 이 시안 오류로 판정) →
 * **위 16 / 아래 8** 로 정규화한다. 그래서 이 컴포넌트가 차지하는 총 높이는 16 + 8 + 8 = **32**.
 *
 * 띠 자체는 `V2Divider variant="thick" size={8}` 이다 — v2 의 `thick` 기본값 16 은
 * 앱의 다른 9곳이 쓰는 값이라 그대로 두고, 커뮤니티만 §4-G4 로 열린 `size` 를 쓴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 여백은 **자기 색을 갖지 않는다** (2026-08-21, 사용자 지적: "라이트는 섹션 구분이 구리다")
 *
 * 여기 있던 것은 `backgroundColor: background.default` 였다. "이 밴드는 회색 바닥이 아니라
 * 흰 면 사이에 들어간다" 는 전제였는데, **커뮤니티 피드에서 그 전제가 거짓이다** —
 * `app/(tabs)/community.tsx` 는 라이트 바닥을 `surface.surface` 로 깐다.
 * 그래서 라이트에서 이 컴포넌트는 경계 하나가 아니라 **세 개**를 만들었다
 * (당시 바닥은 #f4f4f5 였다):
 *
 *     바닥 #f4f4f5 │ 여백 #ffffff │ 띠 #f7f7f7 │ 여백 #ffffff │ 바닥 #f4f4f5
 *        ΔL*=3.8 ─┘      ΔL*=2.8 ─┘    ΔL*=2.8 ─┘      ΔL*=3.8 ─┘
 *
 * 넷 다 3.8 이하이고 방향이 번갈아 뒤집힌다 — 하나의 경계가 아니라 **줄무늬**로 읽힌다.
 * 여백에서 색을 떼면 바닥이 그대로 이어져 경계는 바깥쪽 둘(콘텐츠↔바닥)만 남는다.
 *
 * 그 뒤 라이트 바닥이 `#eaeaec` 로 내려갔다(2026-08-21 · `theme/surface.ts` 의 `well`).
 * 바깥쪽 둘이 3.8 → **7.25** 가 됐으므로 색을 뗀 이 결정은 그때보다 더 중요해졌다 —
 * 되돌리면 7.25 짜리 층 경계를 스스로 두 번 더 긋게 된다.
 *
 * **다크는 한 픽셀도 안 바뀐다.** 다크 바닥은 `surface.canvas` = `background.default`
 * (#1f1f21)라 지운 색과 값이 **같다**. 그래서 다크에서 이 경계를 실제로 그리는 것은
 * 여백이 아니라 8px 띠(`background.lower` #313135, 바닥과 ΔL*=8.6)이고, 그건 그대로다.
 * 라이트에서 같은 띠는 바닥과 ΔL*=1.0 밖에 안 났다 — 흰색 근처에서는 같은 스텝이
 * 훨씬 작은 명도차가 되기 때문이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ **띠는 "자기가 유일한 경계일 때만" 색을 갖는다** — 재판정 (2026-08-22)
 *
 * 위 수선은 여백만 손봤고 띠는 그대로 뒀다. 그 뒤 두 가지가 바뀌었다: 바닥이 `#eaeaec`
 * 로 내려갔고(§6), (A) 섹션이 **자기 면**을 갖게 됐다(§8). 그러자 라이트에서 이 컴포넌트가
 * 다시 줄무늬가 됐다 — 이번엔 여백이 아니라 **띠 자신**이:
 *
 *     바닥 #eaeaec │ 띠 #f7f7f7 │ 바닥 │ (A) 블록 #ffffff │ 바닥 │ 띠 #f7f7f7 │ 바닥
 *          ΔL*=4.5 ┘    4.5 ┘      7.25 ┘        7.25 ┘      4.5 ┘     4.5 ┘
 *
 * 경계가 **여섯**인데 필요한 것은 둘(블록↔바닥)이다. 게다가 `#f7f7f7` 은 그 화면에서
 * **다른 어디에도 없는 값**이라, 층의 정본(넷)에 없는 다섯째 회색이 된다.
 *
 * **그런데 다크에서는 정반대다.** 다크의 `background.default` 는 곧 화면 바닥(#1f1f21)이라
 * (A) 블록이 자기 면을 **못 갖는다** — 거기서 섹션의 경계를 실제로 그리는 것은 이 띠
 * 하나뿐이고(`background.lower` #313135, 바닥과 ΔL*=8.6), 그 값은 그 화면의 카드와
 * **같은 값**이라 새 회색도 아니다.
 *
 * 그래서 모드로 나누지 않는다 — **관계로 나눈다**:
 *
 *     콘텐츠 면(`background.default`)이 화면 바닥과 같은 평면이면 → 띠가 유일한 경계다 → 칠한다.
 *     다른 평면이면 → 경계는 이미 블록이 긋는다 → 띠는 **여백만 남긴다.**
 *
 * 라이트는 후자(7.25 만큼 갈린다), 다크는 전자(0 이다). 그래서 **다크는 한 픽셀도 안 바뀌고**
 * 라이트에서만 다섯째 회색이 사라진다. `isDark` 를 묻지 않는 이유는 `surface.ts` 의 `derive`
 * 와 같다 — 규칙을 하나로 두면 토큰이 바뀌는 날 결과가 따라 바뀐다.
 *
 * ■ 왜 "없애기" 도 "바닥색으로 만들기" 도 아니었나
 *
 * 둘 다 **다크의 유일한 경계를 지운다.** 높이(16+8+8=32)를 남기는 이유도 같은 쪽이다 —
 * 색을 뗀 자리에 간격까지 줄이면 라이트에서 섹션이 서로 붙는다. 여기서 줄이는 것은
 * **면의 가짓수**이지 리듬이 아니다.
 *
 * 단언: `tests/lightContrastAudit.test.ts` §4, `tests/communityPrimitives.test.ts` §1.4.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"

import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { SECTION_BAND } from "./communityLayout"

export type SectionBandProps = {
  style?: StyleProp<ViewStyle>
}

export function SectionBand({ style }: SectionBandProps) {
  const { colors, surface } = useV2Theme()
  /*
    콘텐츠 면이 화면 바닥과 **같은 평면**인가. 그때만 이 띠가 섹션의 유일한 경계다
    (머리말 §재판정). 다크는 참, 라이트는 거짓 — 값에서 나오는 결론이지 모드 분기가 아니다.
  */
  const bandIsTheOnlyEdge = colors.background.default === surface.bed

  return (
    <View style={[styles.wrap, style]}>
      {bandIsTheOnlyEdge ? (
        <V2Divider variant="thick" size={SECTION_BAND} />
      ) : (
        // 같은 높이의 **색 없는** 자리. 리듬(32)은 두 모드가 같아야 한다.
        <View style={styles.gap} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  gap: { height: SECTION_BAND },
})
