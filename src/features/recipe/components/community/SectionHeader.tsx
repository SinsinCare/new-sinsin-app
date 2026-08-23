/**
 * **섹션 헤더 47** — `게시글` · `{작성자}의 다른글` · `추천 게시글` · `이런 작성자도 만나보세요`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.7 · `detail-drag.md` §4.4 (WBS 1.4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 47 의 내분은 12/12 가 아니라 **16 / 8** 이다
 *
 * 마스터 §2.7 은 "높이 47(padV 12)" 이라고 적었지만, 두 원본 측정이 독립적으로 그걸 부정한다:
 *   - `feed-home.md`: `섹션 제목 블록 47 … (pad-top 16 / pad-bottom 8)`, 잉크 top = 블록 +20.4
 *   - `detail-drag.md` §4.4: 제목 baseline = 행 **+31.6**
 * padV 12 면 baseline 이 ~27.6 이라 **두 측정 모두에서 4px 위**에 뜬다. 총합 47 만 같다.
 * §0.1-2("레이아웃은 디자인이 이긴다") + D10 선례("측정값이 정본이다") → **16/8** 을 따른다.
 *
 * 구현은 `height: 47` + `alignItems:"center"` + 제목 `marginTop: 8` 이다. 이유:
 *   - chevron 은 **24** 라 라인박스 23 보다 크다. 패딩으로 16/8 을 주면 행이 48 이 된다.
 *   - `alignItems:"center"` 는 **마진 상자**를 중앙에 놓는다 → 제목 (23+8) 이 8 에서 시작해
 *     글자 상자는 16 (= 실측), chevron 은 (47−24)/2 = 11.5 로 **행 중앙**(= 실측)에 온다.
 *   두 측정을 동시에 만족시키는 유일한 조합이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ **머리는 자기 본문과 같은 면에 앉는다** — 커뮤니티 섹션의 면 규칙 (2026-08-22)
 *
 * 섹션 머리는 자기 **아래를 가리키는 이름표**다. 이름표와 이름 붙는 대상이 다른 평면에
 * 있으면 그 관계가 끊긴다. 라이트 바닥이 `#f4f4f5` → `#eaeaec` 로 내려가기 전에는
 * 모든 면이 ΔL* 3 안에 뭉쳐 있어 이 어긋남이 **안 보였을 뿐** 원래 있던 것이다
 * (2026-08-22 사용자 지적: "섹션 내에서도 헤드랑 본문섹션들이 어색하게 색이 다르다").
 *
 * 형태는 둘뿐이고, **섹션마다 하나를 골라 그것만 쓴다**:
 *
 *   (A) **카드가 머리를 품는다** — 머리와 본문이 **같은 흰 면**(`background.default`) 안.
 *       본문이 **전폭 블록**(좌우 끝까지 가는 면)일 때. 그 면 자체가 카드이므로 머리가
 *       그 밖에 있으면 카드에 이름표가 안 붙은 꼴이 된다.
 *   (B) **바닥 위 이름표 + 그 아래 카드** — 머리는 화면 바닥 위에 그대로, 본문은 바닥
 *       위에 뜬 **낱개 카드**(좌우 인셋 + 라운드). 이때 머리가 앉은 면과 본문이 앉은
 *       면은 **둘 다 화면 바닥**이라 어긋나지 않는다 — 카드는 그 바닥 위의 물건이다.
 *       앱의 선례: 마이페이지의 `건강 관리` · `소식·지원` 라벨 + 흰 그룹 카드
 *       (`features/settings/views/MyPageScreen.tsx`).
 *
 * **판정 기준은 본문의 모양 하나다** — 전폭 면이면 (A), 인셋 카드면 (B).
 *
 * | 섹션 | 본문의 모양 | 판정 |
 * |---|---|---|
 * | 스토리(`StoryRail`) | 바닥 위 인셋 타일 | **(B)** |
 * | 요즘 이야기 중(`TrendingPostsSection`) | 전폭 3행 | **(A)** |
 * | 요즘 글 쓰는 이웃(`NeighborSuggestionSection`) | 전폭 2행 | **(A)** |
 * | 자유글 피드(`PostListItem`) | 인셋 카드 (머리는 없다 — 고정층의 필터 바가 그 자리다) | **(B)** |
 *
 * 이 규칙이 말하는 것은 **면뿐**이다. (B) 의 이름표 타이포가 두 선례에서 다른 것
 * (마이페이지 13.5 SemiBold `textMuted` vs 스토리 17 Bold + 후행 어포던스)은 별개의
 * 문제이고, 여기서 정하지 않는다.
 *
 * ⚠ **"전부 흰색으로 칠하면 끝" 이 아니다.** 바닥↔카드 ΔL* **7.25** 는 라이트가 방금
 * 얻은 것이다(`lightContrastAudit` §6). 전폭 흰 블록을 늘리면 그 간격을 지우게 된다 —
 * 목적은 평면을 **줄이는** 것이지 **없애는** 것이 아니다.
 * ⚠ 면이 안 맞는다고 테두리·그림자를 새로 달지 마라. 이 앱은 보더리스이고, 면의 문제는
 * 면으로 푼다. 단언은 `tests/lightContrastAudit.test.ts` **§8** 이 들고 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ **층의 정본 — 라이트는 면을 넷만 쓴다** (2026-08-22)
 *
 * 위 (A)/(B) 는 "머리가 어느 면에 앉나" 를 정한다. 그보다 앞선 질문 — **면이 대체 몇
 * 개인가** — 은 여기서 정한다. 전수로 세어 보니 라이트에서 실제로 칠해지는 불투명 면이
 * **열 개**였고, 그중 넷(#f9fafb 98.2 · #f8f8f8 97.6 · #f7f7f7 97.2 · #f4f4f5 96.2)이
 * 명도 1.0 안에 겹쳐 있었다. 다크는 일곱 개인데, **네 토큰(카드 · 띠 · `fill.normal` ·
 * `fill.control`)이 한 값(#313135)으로 접힌다.** "다크는 자연스러운데 라이트만 어색하다"
 * 의 출처가 취향이 아니라 이 숫자다:
 *
 *   |        | 면 개수 | 층 사이 간격 중앙값 | 가장 좁은 간격 |
 *   |--------|--------|--------------------|---------------|
 *   | 라이트 |   10   | ΔL* **1.3**        | 0.35          |
 *   | 다크   |    7   | ΔL* **3.4**        | 0.59          |
 *
 * 층이 적어서이기도 하고 간격이 넓어서이기도 한데, **먼저 온 것은 층의 수**다 — 다크가
 * 네 토큰을 한 값으로 접었기 때문에 남은 층 사이가 넓어질 자리가 생긴 것이다.
 *
 * ■ **사다리는 코드에 있다** (2026-08-22 · `design-system-v2/tokens/layers.ts`)
 *
 * 아래 표는 한동안 **문서에만** 있었다. 그래서 새 화면이 회색이 필요하면 여전히
 * 골라야 했고, 고르면 열한 번째가 됐다. 이제 그 열 개 전부에 이름이 있다 —
 * 면 여섯(`content` · `band` · `wellShallow` · `bed` · `well` · `pressed`)과
 * 표시 넷(`fill.control` · `normal` · `background` · `alternative`)이고,
 * 표시는 알파라 `on(mark, plane)` 로 면 위에 얹어 말한다.
 * `theme/surface.ts`(useSurface)와 tamagui 토큰은 그 사다리에 **이름만 붙이는
 * 어댑터**다. 값은 한 바이트도 안 바뀌었다(`tests/surfaceLadderGuard.test.ts` §L2).
 *
 * 아래 넷은 사다리가 없어진 것이 아니라, **화면이 고르는** 면이 그 넷이라는 뜻이다.
 * 나머지 여섯은 여전히 "층 안의 표시" 이고, 다만 이제 이름이 있다.
 *
 * 그래서 정본은 **넷**이고, 이 넷 밖의 회색은 층이 아니라 층 **안의 표시**다:
 *
 *   1. **바닥** `#eaeaec`(L* 92.75) — `SurfacePalette.surface`(우물) · tamagui `appBg`.
 *      카드가 얹히는 회색. 라이트에만 있다(다크는 `canvas` 가 그 자리다).
 *   2. **콘텐츠 면** `#ffffff`(100) — `background.default` · `card`. 카드 · 전폭 블록 ·
 *      고정 헤더 · 폼 페이지. 바닥과 **ΔL* 7.25**(다크 같은 경계의 84%).
 *   3. **컨트롤 면** `fill.control`(알파 11%) — 칩 · 검색 · 입력. 알파라 어느 면 위에도
 *      앉는다(흰 면 위 ΔL* 5.25). 값의 천장은 §7 이 계산으로 들고 있다.
 *   4. **눌림** `surfacePressed` — 층이라기보다 층의 **상태**지만, 실제로 칠해지므로 센다.
 *
 *   층이 **아닌** 것: `fill.normal`(장식 표식 — 스켈레톤 · 사진 자리 · 진행 트랙 · 배지),
 *   `fill.background` · `fill.alternative`(같은 종류), 그리고 `background.lower`
 *   (#f7f7f7 — **띠와 말풍선 전용**. 식당 상세 시안 실측이라 값은 못 건드리고, 쓰는
 *   자리만 줄인다).
 *
 * ■ **화면 바닥은 둘 중 하나다 — 셋째는 없다**
 *
 *   (i) 콘텐츠가 **카드로 떠 있는** 화면 → 바닥은 **우물**(#eaeaec).
 *       커뮤니티 피드 · 검색 · 인기글 · 홈 · 마이페이지 · 내 활동 · 레시피 상세.
 *  (ii) 콘텐츠가 **한 장**인 화면(전폭 블록을 머리카락 선으로 나눈다) → 바닥은
 *       **콘텐츠 면**(#ffffff). 식당 목록 · 레시피 홈 · 설정 편집 폼.
 *
 * **한 계보 안에서는 한 형태만 쓴다.** 실제로 깨져 있던 자리가 커뮤니티다 — 피드·검색은
 * (i)인데 인기글만 (ii)라 `전체 ›` 를 누르면 바닥이 회색에서 흰색으로 바뀌었다
 * (2026-08-22 사용자 지적). 인기글을 (i)로 옮겼다. `background.lower`(#f7f7f7)를 바닥으로
 * 쓰던 **레시피 상세**도 같이 (i)로 내려왔다 — 그 값은 흰 블록과 ΔL* **2.77** 뿐이라
 * 그 화면 머리말이 말하는 "흰 블록이 떠 있는 것처럼" 이 성립하지 않았다(→ **7.25**).
 *
 * ⚠ **(ii) 화면을 (i)로 옮길 때는 그 화면의 회색이 전부 흰 면을 전제로 골라졌음을 기억해라.**
 * 사진 자리·검색 필드·미선택 칩이 죄다 흰 면 위 기준이라, 바닥만 내리면 그것들이 바닥에
 * 녹는다(설정 편집 폼에서 실제로 그렇게 터졌다 — `SettingsTextField` 머리말 §우물).
 * 그래서 식당 목록·레시피 홈은 (ii)로 **남긴다**: 계보 안에서 일관되고, 옮기려면 카드
 * 모양까지 바꿔야 하는데 그건 토큰 이동이 아니라 재설계다.
 *
 * ⚠ **`useSettingsColors` 를 쓰는 설정 화면 14개는 이 표 밖에 있다.** 그 훅이 라이트
 * `bg`·`cardBg` 를 둘 다 리터럴 흰색으로 박아 두기 때문이다(면 체계와 연결돼 있지
 * 않다). 지금은 (ii)로 **일관되므로** 결함이 아니지만, 바닥만 우물로 내리면 머리는
 * 회색·카드는 흰색이 되어 커뮤니티에서 고친 그 어긋남이 14개 화면에 한꺼번에 생긴다.
 * 옮길 거면 **카드도 같이** — 훅부터 토큰으로 옮기는 것이 순서다.
 *
 * 단언은 `tests/lightContrastAudit.test.ts` **§10** — 바닥 값의 **개수**와 같은 계보의
 * **동일성**을 소스에서 다시 뽑아 센다. 그리고 `tests/surfaceLadderGuard.test.ts` 가
 * 사다리 쪽에서 같은 집합을 다시 세고(§L3), **화면이 사다리 밖 면을 직접 칠하는 것**을
 * 소스 스캔으로 막는다(§L4 — 예외는 파일 이름으로 열거돼 있다).
 *
 * ■ chevron 은 `onPress` 가 있을 때만
 *
 * 시안에서 chevron 이 붙은 섹션은 이동하는 섹션 하나뿐이다(`{작성자}의 다른글`).
 * 화살표를 그려 놓고 아무 데도 안 가는 편이 없는 것보다 나쁘다.
 *
 * ■ 후행 어포던스는 **하나의 형태**다 — 라벨(옵션) + chevron
 *
 * 피드의 두 섹션이 서로 다른 머리를 갖고 있었다: 스토리는 `제목 + 부제 + 알약 버튼`,
 * 인기 3행은 `제목 + 전체 ›`. 뒤엣것은 이 컴포넌트에 **후행 라벨 슬롯이 없어서**
 * 같은 산술(높이 47 · marginTop 8)을 통째로 베껴 쓴 사본이었다. 사본을 지우는 방법은
 * 사본을 고치는 것이 아니라 **없던 슬롯을 여기 파는 것**이다(`actionLabel`).
 * 그 뒤로 커뮤니티의 섹션 머리는 `제목` 또는 `제목 + 후행 어포던스` 둘뿐이다.
 *
 * 그 어포던스는 **한 색**이다. 라벨은 `label.neutral`, chevron 만 `label.assistive` 였는데
 * 라이트에서 chevron 이 1.7:1 이라(비텍스트 기준 3:1 밖) `올리기 ›` 의 화살표만 사라져
 * 라벨이 눌리는 것처럼 안 보였다(2026-08-21 사용자 지적). 한 덩어리로 읽혀야 하는 것을
 * 두 색으로 그릴 이유가 없다 — 근거는 `design-system-v2/tokens/colors.ts` §label 사다리.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { COMMUNITY_GUTTER, ROW } from "./communityLayout"

export type SectionHeaderProps = {
  /** 17 Bold(`title.xSmall`). */
  title: string
  /** 주면 행 전체가 눌리고 우측에 후행 어포던스가 붙는다. */
  onPress?: () => void
  /**
   * 후행 어포던스에 붙는 **말**(`전체` · `올리기`). `onPress` 와 함께여야 그려진다 —
   * 아무 데도 안 가는 라벨은 chevron 만 그려 놓는 것보다 나쁘다(머리말 §chevron).
   *
   * 이 슬롯이 없던 시절 `TrendingPostsSection` 이 같은 높이·같은 산술의 헤더를 통째로
   * 손으로 다시 그렸다. 슬롯이 없어서 생긴 사본이라, 사본을 지우는 대신 **슬롯을 판다** —
   * 그래야 다음 섹션이 같은 이유로 또 손으로 그리지 않는다.
   */
  actionLabel?: string
  /** 눌리는 행이 읽히는 문구. 없으면 `title`(예전 동작). */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

export function SectionHeader({
  title,
  onPress,
  actionLabel,
  accessibilityLabel,
  style,
}: SectionHeaderProps) {
  const { colors } = useV2Theme()

  const chevron = (
    <V2Icon name="chevronRight" size="md" color={colors.label.neutral} />
  )

  const content = (
    <>
      <V2Text
        token="title.xSmall"
        color={colors.label.normal}
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </V2Text>
      {!onPress ? null : actionLabel ? (
        <View style={styles.action}>
          <V2Text token="label.xSmallWeak" color={colors.label.neutral}>
            {actionLabel}
          </V2Text>
          {chevron}
        </View>
      ) : (
        chevron
      )}
    </>
  )

  if (!onPress) {
    return <View style={[styles.row, style]}>{content}</View>
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.row, style]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    height: ROW.sectionHeader,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: COMMUNITY_GUTTER,
    // 하단 구분선 **없음**(§2.7).
  },
  /** 실측 pad-top 16 을 24 chevron 과 공존시키는 항. 위 머리말이 산술이다. */
  title: { marginTop: spacing[8], flexShrink: 1 },
  /** 라벨↔chevron 4 — `MorePill`(§2.7)이 쓰는 간격 그대로. */
  action: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
})
