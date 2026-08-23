/**
 * **댓글 0건의 조용한 빈 상태** — 상세(S4) · 답글쓰기(S5) · 스토리 댓글 시트(S12).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.18 · `01-DECISIONS.md` **D15** (WBS 1.9).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 여기에 `QuietEmptyState` 라는 **로컬 컴포넌트를 만들지 않는다** (D15)
 *
 * §2.18 과 §4-G11 은 "`V2EmptyState` 가 20 Bold 제목 + 40px 아이콘을 강제하므로 손으로
 * 만들라"고 적었다. **그 전제는 Phase 0-B 에서 사라졌다** — `tone="quiet"` 와
 * `illustration` 슬롯이 들어갔다(`V2EmptyState.tsx` 머리말 §tone · §illustration).
 *
 * 손으로 만들면 화면은 멀쩡히 나오고 **계측만 조용히 사라진다**: `empty_state_viewed` 는
 * `V2EmptyState` 안에서 마운트당 한 번 나가고, 댓글 빈 상태는 애초에 그 표면들을
 * 만든 가장 큰 이유다(D12). "그려지는데 안 세어지는" 결함은 화면을 눈으로 봐서는
 * 절대 안 보인다.
 *
 * 그래서 이 파일은 **얇은 껍데기**다 — 카피·일러스트·`surface` 세 가지만 챙기고
 * 나머지는 전부 `V2EmptyState` 가 한다.
 *
 * ■ 카피는 앱의 해요체를 지킨다 (§2.18 판정)
 *
 * 시안은 합쇼체(`아직 등록된 댓글이 없습니다.` / `첫번째 댓글의 주인공이 되어보세요!`)지만
 * 현행 i18n 은 해요체다. 한 화면에 두 어체를 섞지 않는다 → 기존 키를 그대로 쓴다.
 * 두 줄은 `\n` 으로 한 덩어리다 — `V2EmptyState` 의 `description` 이 가운데정렬 한 칸이고,
 * 시안도 두 줄 사이에 별도 간격이 없다.
 *
 * ■ 71×69 아웃라인 말풍선은 `illustration` 으로 **표현된다**
 *
 * `icon` 은 `V2Icon size="2xl"`(40) 고정이라 이 그림이 안 들어가지만, `illustration` 은
 * 크기·색을 넘기는 쪽이 소유한다. 그래서 아이콘 레지스트리에 자산을 새로 넣지 않고
 * 여기서 그린다 — 이 그림은 **소비처가 하나뿐**이고, 그 하나가 사라지면 자산도 같이
 * 사라져야 한다(§4-G18 의 `PhotoScrim`·`EdgeFade` 와 같은 판정).
 *
 * 실측(`post-detail.md` §F7 · `meal-169.md`): 몸통 **71×56 r10**, 하단 중앙 꼬리(꼭짓점
 * y 69.02), 안쪽 가로선 3개(y 15 / 28 / 41, 폭 42 / 42 / 30), 획 **4** 라운드조인,
 * 색 `#70737C @0.22` → `line.normal`.
 *
 * ⚠ **71×69 는 획의 중심선 상자다.** 획 4 는 그 바깥으로 2 씩 더 나가므로 실제로 칠해지는
 * 상자는 **75×73** 이다. viewBox 를 `-2 -2 75 73` 으로 잡아 그 2 를 안에 넣는다 —
 * `0 0 71 69` 로 잡으면 SVG 뷰포트가 테두리를 반씩 잘라 납작한 변이 생긴다.
 */
import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"
import { Path, Svg } from "react-native-svg"

import { V2EmptyState } from "@/src/design-system-v2/components/V2EmptyState"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import type { AnalyticsSurface } from "@/src/features/analytics"

/** 획의 중심선 상자(실측). 칠해지는 상자는 여기에 획 두께가 더해진다. */
const BUBBLE_WIDTH = 71
const BUBBLE_HEIGHT = 69
const BUBBLE_STROKE = 4

/**
 * 몸통(71×56 r10) + 하단 중앙 꼬리 한 붓.
 *
 * 꼬리의 **밑변 폭은 실측에 없다**(구역 스펙이 꼭짓점만 쟀다). 몸통 폭의 1/5 인 14 로
 * 잡았다 — 이 하나만 판독이 아니라 선택이다.
 */
const BUBBLE_PATH = [
  "M10 0",
  "H61",
  "A10 10 0 0 1 71 10",
  "V46",
  "A10 10 0 0 1 61 56",
  "H42.5",
  `L35.5 ${BUBBLE_HEIGHT}`,
  "L28.5 56",
  "H10",
  "A10 10 0 0 1 0 46",
  "V10",
  "A10 10 0 0 1 10 0",
  "Z",
].join(" ")

/** 안쪽 가로선 3개. 마지막 줄만 짧다(§F7 실측 42 / 42 / 30). */
const BUBBLE_RULES = "M15 15H57 M15 28H57 M15 41H45"

/**
 * 이 빈 상태가 살 수 있는 자리. **셋뿐이다** — `Extract` 로 뽑았으므로 표면 유니온에서
 * 이름이 사라지면 여기서 컴파일이 막힌다(`events.ts` 와 조용히 어긋나지 않는다).
 */
export type CommentEmptyStateSurface = Extract<
  AnalyticsSurface,
  "community_post_comments" | "community_story_comments" | "community_reply"
>

/**
 * 정렬 바(또는 시트 상단)에서 그림 위까지 **102** — §3.4 · §3.11 이 같은 값을 쟀다.
 * `V2EmptyState` 의 기본 padding 24 중 위쪽만 이 값이 덮는다.
 */
export const COMMENT_EMPTY_TOP_INSET = 102

export type CommentEmptyStateProps = {
  /** `empty_state_viewed` 의 유일한 구분축. 화면이 자기 자리를 넘긴다. */
  surface: CommentEmptyStateSurface
}

export function CommentEmptyState({ surface }: CommentEmptyStateProps) {
  const { colors } = useV2Theme()
  const { t } = useTranslation()

  return (
    <V2EmptyState
      tone="quiet"
      surface={surface}
      illustration={
        <Svg
          width={BUBBLE_WIDTH + BUBBLE_STROKE}
          height={BUBBLE_HEIGHT + BUBBLE_STROKE}
          viewBox={`${-BUBBLE_STROKE / 2} ${-BUBBLE_STROKE / 2} ${
            BUBBLE_WIDTH + BUBBLE_STROKE
          } ${BUBBLE_HEIGHT + BUBBLE_STROKE}`}
        >
          <Path
            d={BUBBLE_PATH}
            stroke={colors.line.normal}
            strokeWidth={BUBBLE_STROKE}
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={BUBBLE_RULES}
            stroke={colors.line.normal}
            strokeWidth={BUBBLE_STROKE}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      }
      description={`${t("community.postDetail.noComments")}\n${t(
        "community.postDetail.firstComment",
      )}`}
      style={styles.state}
    />
  )
}

const styles = StyleSheet.create({
  state: { paddingTop: COMMENT_EMPTY_TOP_INSET },
})
