/**
 * **`지금 이야기 중` — 피드의 순위 3행.**
 * 판정: `docs/design/community-redesign/01-DECISIONS.md` **D23**(형태만 갱신, 상태 규칙은 그대로),
 * 랭크 언어: `00-MASTER.md` §2.1 · 레이아웃 상수: `communityLayout.ts` §2.0.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 시안(가로 카드 레일)이 아니라 **세로 랭킹 3행**이다
 *
 * D23 은 "가로 카드는 유지하고 순위를 넣는다" 였다. 그 뒤 레이아웃/UX 재디자인이 승인되면서
 * **형태가 뒤집혔다** — 상태에 대한 D23 의 판정(로딩=스켈레톤 · 오류=한 줄 · 빈=접기)은
 * 그대로 살아 있고, 형태만 아래로 갈아탄다. 이유 둘:
 *
 *  1. **순위는 서수(ordinal)라 세로로 훑는 정보다.** 가로 레일은 3위를 스와이프 한 번 뒤로
 *     보내고, 나란히 놓지 않으니 1·2·3 을 **비교할 수 없다**. 순위를 넣고도 순위를 못 읽는다.
 *  2. **세로 피드 안의 가로 스크롤러는 제스처 충돌**을 만든다. 이 저장소에는 그 통증의
 *     기록이 남아 있다(`docs/` 의 시트 제스처 중재 · 식당 시트 손가락 수정).
 *
 * 그래서 이 파일에는 `ScrollView` 도 `horizontal` 도 없다. 되돌리려는 다음 사람이
 * 읽을 것: 위 두 줄이 이유고, 테스트가 그 두 줄을 지킨다.
 *
 * ■ 카피가 `실시간 인기글` 이 아니라 `지금 이야기 중` 인 이유
 *
 * "인기글" 은 리더보드를 약속하는데 실제로 보여 주는 것은 세 줄이다. 약속을 줄여 실제와
 * 맞춘다. `인기글` 이라는 이름은 **목적지 화면**(S3)이 계속 가진다 — 헤더의 `전체` 를
 * 누르면 거기로 간다.
 *
 * ■ 메타는 **댓글 수 하나뿐**이다
 *
 * "지금 이야기 중" 이 뜻하는 것이 곧 댓글이다. 조회수는 이 섹션 자신이 부풀리고(여기 걸린
 * 글이 더 눌린다), 좋아요는 늦게 따라온다. 한 줄에 숫자가 셋이면 **하나로 하는 결정에
 * 주의가 셋으로 쪼개진다.** 그래서 `MetaRow`(§2.3)를 쓰지 않는다 — 그건 조회·좋아요·댓글을
 * 함께 그리는 컴포넌트이고, 좋아요를 끄는 스위치가 없다(있어도 만들지 않는다:
 * 목록 행의 지표 한 줄과 이 섹션의 한 숫자는 다른 결정을 돕는다).
 *
 * ■ 랭크 표기는 §2.1 의 **랭크 원 그대로**다
 *
 * 24×24 `radius.full` · bg `primary.primaryWeak` · 숫자 `label.xSmall`(13 SemiBold)
 * `primary.primary` · `minWidth 24`(2자리 대비). 검색 화면(§3.2)의 맨 숫자 방식을 쓰지
 * 않는 이유는 D23 이 적어 둔 그대로다 — 인기글 화면과 **한 언어로 묶인다.**
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"

import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import {
  V2Skeleton,
  V2SkeletonGroup,
} from "@/src/design-system-v2/components/V2Skeleton"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useLoadingVisible } from "@/src/design-system-v2/hooks/useLoadingVisible"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { iconSize, touchTarget } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"
import type { AnalyticsSurface } from "@/src/features/analytics"

import { formatCount } from "../../utils/displayNumber"
import { COMMUNITY_GUTTER, POST_ROW_RANK_SIZE } from "./communityLayout"
import { SectionBand } from "./SectionBand"
import { SectionHeader } from "./SectionHeader"
import { SectionErrorLine, type SectionFailure } from "./SectionErrorLine"

/**
 * 그리는 행의 수. **3** — 세 줄이 "지금 무슨 이야기가 도는지" 를 말하기에 충분하고,
 * 바로 아래 `게시글` 목록과 길이로 경쟁하지 않는 상한이다.
 */
export const TRENDING_POST_COUNT = 3

/**
 * 한 행의 높이. **44** = `touchTarget.min`.
 *
 * 두 근거가 같은 값을 가리킨다: §3.2 가 실측한 랭킹 행이 44 이고, 행 전체가 눌리는
 * 자리의 최소 터치 타겟이 44 다. 리터럴 44 대신 토큰을 쓰는 이유는 두 번째 근거가
 * 사다리에 있기 때문이다 — 접근성 최소치가 바뀌면 이 행이 따라가야 한다.
 */
export const TRENDING_ROW_HEIGHT = touchTarget.min

/**
 * 이 섹션의 **대기**가 세어지는 자리(`wait_perceived`) — `useLoadingVisible` 에 넘긴다.
 *
 * (오류 한 줄은 세어지지 않는다. 이유는 `SectionErrorLine.tsx` 머리말 — `error_state_viewed`
 * 의 통로는 `V2ErrorState` 하나뿐이고 그 형태는 D23 이 거절한 전면 판이다.)
 *
 * **`community_feed` 가 아니다.** 화면(피드)은 모든 track 행에 실리는 `screen_name` 이
 * 이미 말한다(`events.ts` 머리말 §`app_error_presented`). `surface` 가 말해야 하는 것은
 * **어느 판이 따로 로드되고 따로 실패했는가** 이고(같은 표의 `community_post` vs
 * `community_post_comments` 판정), 이 판이 못 받은 것은 인기글이다. 피드 목록과 한 칸에
 * 섞으면 "피드가 안 열렸다" 와 "인기 3행만 못 받았다" 가 구분되지 않는다.
 *
 * 관례대로라면 `community_feed_trending` 같은 접미어 값이 맞지만 **유니온에 없는 값을
 * 지어내지 않는다**(D12-정정이 9개로 고정했고 `analyticsCommunitySurfaces.test.ts` 가
 * 그 표를 지킨다). 새 값이 필요하다는 판단은 그 표를 여는 작업의 몫이다.
 */
export const TRENDING_SURFACE: AnalyticsSurface = "community_popular"

/** 행 하나가 실제로 그리는 것. 제목 한 줄과 댓글 수, 그리고 목록 키. */
export type TrendingPost = {
  id: string
  title: string
  commentCount: number
}

export type TrendingPostsSectionProps = {
  /** 위에서부터 1위. `TRENDING_POST_COUNT` 를 넘으면 잘린다. */
  posts: TrendingPost[]
  /** 첫 로드 중인가. 이미 받아 둔 글이 있으면 스켈레톤 대신 그 글을 계속 그린다. */
  isLoading?: boolean
  /** `resolveError(error)` 의 결과. 없으면 오류가 아니다. */
  failure?: SectionFailure | null
  onRetry: () => void
  /** 행 탭 → 게시글 상세. 순위(1부터)를 같이 넘긴다 — 부르는 쪽이 여정을 셀 수 있게. */
  onPressPost: (post: TrendingPost, rank: number) => void
  /** 헤더의 `전체` → 인기글 화면(`/(tabs)/community-popular`). */
  onPressAll: () => void
  style?: StyleProp<ViewStyle>
}

export function TrendingPostsSection({
  posts,
  isLoading = false,
  failure,
  onRetry,
  onPressPost,
  onPressAll,
  style,
}: TrendingPostsSectionProps) {
  const { colors } = useV2Theme()
  // 섹션 카피는 `common`. **네임스페이스를 명시**한다 — `fallbackNS` 를 안 켰고,
  // 한 파일이 두 네임스페이스를 쓰면 키 존재 검사가 그 사실을 알아야 한다
  // (`tests/i18nKeyExistence.test.ts` 는 파일 단위로 네임스페이스를 모은다).
  const { t } = useTranslation("common")
  // 순위 접근성 문구(`인기글 N위 …`)는 `recipe` 네임스페이스에 산다.
  const { t: tPost, i18n } = useTranslation("recipe")

  /*
    **스켈레톤을 그릴지는 DS 가 정한다** — 캐시가 살아 있으면 50ms 만에 오고, 그 사이
    스켈레톤을 그렸다 지우면 화면이 한 번 깜빡인다(전역 로딩 규칙). 그 문턱을 화면마다
    다시 정하지 않는다. 동시에 이것이 이 섹션의 **대기를 세는 유일한 통로**다 — D15:
    "가시성을 `useLoadingVisible(..., { surface })` 에서 받아야만 `wait_perceived` 를 낸다".
  */
  const showSkeleton = useLoadingVisible(isLoading, {
    surface: TRENDING_SURFACE,
  })

  const visible = posts.slice(0, TRENDING_POST_COUNT)

  /*
    **빈 상태는 접는다** (D23). 오류와 빈 상태는 다른 사실이다 — 오류는 말하고, 빈 상태는
    접는다. 이야기 중인 글이 없는 피드는 그냥 `게시글` 부터 시작하면 되고, 빈 밴드는 소음이다.
    밴드(§2.7)까지 이 컴포넌트가 들고 있는 이유가 그것이다: 접을 때 구분선만 남으면
    접은 것이 아니다.
  */
  if (visible.length === 0 && !showSkeleton && !failure) return null

  return (
    <View style={style}>
      <SectionBand />

      {/*
        **머리와 본문은 한 면 위에 있다 — 규칙 (A)** (2026-08-22).
        이 블록은 위아래 밴드로 잘려 나온 **전폭 한 덩어리**라, 머리가 그 덩어리 안에
        앉아야 자기가 무엇의 이름표인지 말한다. 예전엔 머리만 배경이 없어 화면 바닥
        (라이트 #eaeaec)에 앉고 행들만 흰 면이었다 — 라이트에서 바닥이 7.25 내려간 뒤
        그 어긋남이 눈에 보였다(사용자 지적: "헤드랑 본문섹션들이 어색하게 색이 다르다").
        면을 여기서 한 번 칠하면 **행·스켈레톤·오류 한 줄이 전부 같은 면**을 받는다 —
        행에만 칠하던 예전 방식은 로딩 중(스켈레톤은 배경이 없다)에 면이 한 번 바뀌었다.
        규칙 전문(어느 섹션이 (A)이고 어느 것이 (B)인지)은 `SectionHeader` 머리말.
        다크는 `background.default` 가 곧 화면 바닥이라 **한 픽셀도 안 바뀐다.**
      */}
      <View style={{ backgroundColor: colors.background.default }}>
        {/*
          머리는 `SectionHeader`(§2.7) 하나로 통일했다. 예전엔 이 자리에 같은 높이·같은
          산술의 헤더를 손으로 다시 그렸는데, 이유는 그 컴포넌트에 **후행 라벨 슬롯이
          없어서**였다 — 사본을 두는 대신 슬롯을 팠다(`SectionHeader.actionLabel`).
        */}
        <SectionHeader
          title={t("community.trending.title")}
          actionLabel={t("community.trending.all")}
          accessibilityLabel={t("community.trending.allAccessibility")}
          onPress={onPressAll}
        />

        {visible.length > 0 ? (
          visible.map((post, index) => {
            const rank = index + 1
            return (
              <Pressable
                key={post.id}
                onPress={() => onPressPost(post, rank)}
                accessibilityRole="button"
                /* 순위를 읽어 준다(D23 접근성). 현행 키를 그대로 유지한다. */
                accessibilityLabel={tPost("post.popularAccessibility", {
                  rank,
                  title: post.title,
                })}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? colors.fill.normal
                      : colors.background.default,
                  },
                ]}
              >
                <View
                  style={[
                    styles.rank,
                    { backgroundColor: colors.primary.primaryWeak },
                  ]}
                >
                  <V2Text token="label.xSmall" color={colors.primary.primary}>
                    {rank}
                  </V2Text>
                </View>

                <V2Text
                  token="subtext.largeStrong"
                  color={colors.label.normal}
                  numberOfLines={1}
                  textBreakStrategy="balanced"
                  style={styles.title}
                >
                  {post.title}
                </V2Text>

                <View style={styles.comment}>
                  <V2Icon
                    name="chatOutline"
                    size="xs"
                    color={colors.label.neutral}
                  />
                  <V2Text token="subtext.medium" color={colors.label.neutral}>
                    {formatCount(post.commentCount, i18n.language)}
                  </V2Text>
                </View>
              </Pressable>
            )
          })
        ) : showSkeleton ? (
          /*
          링 스피너 금지 · 스켈레톤 우선(전역 §0.2). 행과 **같은 스타일 객체**를 쓴다 —
          여기서 치수를 다시 적으면 다음 리팩터에서 스켈레톤만 옛 리듬으로 남는다
          (`PostRowSkeleton` 머리말과 같은 판단).
        */
          <V2SkeletonGroup>
            {Array.from({ length: TRENDING_POST_COUNT }, (_unused, index) => (
              <View key={index} style={styles.row}>
                <V2Skeleton
                  width={POST_ROW_RANK_SIZE}
                  height={POST_ROW_RANK_SIZE}
                  radius="full"
                />
                <View style={styles.title}>
                  <V2Skeleton
                    width={SKELETON_TITLE_WIDTHS[index] ?? "72%"}
                    height={typography.subtext.largeStrong.lineHeight}
                    radius="xs"
                  />
                </View>
                <V2Skeleton
                  width={COMMENT_SLOT_WIDTH}
                  height={typography.subtext.medium.lineHeight}
                  radius="xs"
                />
              </View>
            ))}
          </V2SkeletonGroup>
        ) : failure ? (
          <SectionErrorLine failure={failure} onRetry={onRetry} />
        ) : null}
      </View>

      {/*
        **밴드는 양쪽에 선다.** 이 섹션은 이제 피드 **한가운데**(세 번째 글 다음)에
        끼어들므로, 위만 끊으면 마지막 순위 행이 다음 글로 10px 만에 흘러든다 —
        경계가 한쪽만 있으면 그건 경계가 아니라 여백이다. 접힐 때 두 밴드가 함께
        사라지도록 둘 다 이 컴포넌트가 들고 있다(위 밴드와 같은 이유).
      */}
      <SectionBand />
    </View>
  )
}

/**
 * 댓글 지표 자리의 폭 — 아이콘 16(`iconSize.xs`) + 간격 2 + 두 자리 수(13 Regular ≈ 14).
 * 스켈레톤이 도착할 콘텐츠와 같은 폭을 잡아야 숫자가 오는 순간 제목이 안 흔들린다.
 */
const COMMENT_SLOT_WIDTH = iconSize.xs + spacing[2] + 14

/** 제목 자리표시의 길이를 셋 다 다르게 — 같은 길이 세 줄은 목록이 아니라 표로 읽힌다. */
const SKELETON_TITLE_WIDTHS = ["86%", "72%", "64%"] as const

const styles = StyleSheet.create({
  /*
    세로로 쌓인다. `flexDirection` 을 주지 않는 것(=column)이 이 섹션의 핵심 결정이라
    행 하나만 `row` 다 — 목록 자체는 부모의 흐름에 그대로 얹힌다.
  */
  row: {
    height: TRENDING_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: COMMUNITY_GUTTER,
    // 랭크열↔텍스트열↔지표 모두 12 — §2.1 의 텍스트열 간격과 같은 값이다.
    gap: spacing[12],
  },
  rank: {
    width: POST_ROW_RANK_SIZE,
    height: POST_ROW_RANK_SIZE,
    // 2자리(10위 이상)에서 원이 찌그러지지 않게 — §2.1 `minWidth 24`.
    minWidth: POST_ROW_RANK_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 남는 폭을 전부 갖는다 → 긴 제목이 댓글 수를 밀어내지 않고 말줄임된다. */
  title: { flex: 1 },
  /** 아이콘↔숫자 2 — `MetaRow`(§2.3 · §4-G21)와 같은 간격. */
  comment: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
})
