/**
 * **`비슷한 단계의 이웃` — 피드의 추천 작성자 2행.**
 * 판정: `docs/design/community-redesign/01-DECISIONS.md` **D24**(형태만 갱신, 상태 규칙은 그대로),
 * 레이아웃 상수: `communityLayout.ts` §2.0 · 행 어휘: `00-MASTER.md` §2.11 · §2.14.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 시안(가로 작성자 카드 레일)이 아니라 **세로 2행**이다
 *
 * 시안의 카드는 아바타 · 닉네임 · 배지 칩 · 팔로우 버튼이다. 즉 **팔로우라는 결정을
 * 요구하면서 그 결정에 필요한 증거를 하나도 안 준다** — 이 사람이 *무엇을 쓰는지*가 없다.
 * 환자 커뮤니티에서 잘못한 팔로우는 사람들이 의지하는 피드에 소음을 넣는 일이라,
 * 되돌리는 비용이 "팔로우 취소" 한 번보다 크다.
 *
 * 그래서 행마다 **그 사람의 최근 글 제목 한 줄**을 넣는다. 카드 폭(137)에는 못 들어가고
 * 전폭 행에는 들어간다 — 형태가 세로로 바뀐 이유의 절반이 이것이다.
 * 나머지 절반은 `TrendingPostsSection` 머리말의 제스처 이유와 같다(세로 피드 안 가로 스크롤).
 *
 * 시안의 가로 카드(`AuthorCard`/`AuthorRail`, §2.12)는 상세·프로필 레일 몫으로 남겨
 * 두었었는데, 그 두 화면이 결국 다른 형태로 만들어져 어디서도 import 되지 않는 채
 * 남았고 지웠다(2026-09-09). 이 섹션이 피드 삽입분의 유일한 형태다.
 *
 * ■ 헤더에 이유를 적는다
 *
 * 설명 없는 추천은 신뢰를 못 얻는다. `{단계} · {태그}` 를 한 줄로 말해 **왜 이 사람들이
 * 떴는지**를 밝힌다. 둘 중 하나만 알아도 그 하나로 말하고, 둘 다 모르면 줄을 그리지 않는다 —
 * 모르면서 아는 척하는 문장을 만들지 않는다(집안 규칙: 예측 가능한 UX > 폴백).
 *
 * ■ 팔로우해도 행은 **그 자리에 남는다**
 *
 * 낙관적 토글은 버튼 카피만 `팔로잉` 으로 바꾼다(§5.7 의 fill→weak). 이 컴포넌트는 받은
 * 순서를 그대로 그리고 `following` 으로 **거르지도 재정렬하지도 않는다** — 손가락 밑에서
 * 목록이 재배치되면 방금 무엇을 눌렀는지 사용자가 잃는다. 그 규칙은 컴포넌트가 지켜야 한다
 * (화면이 지키게 두면 화면마다 다시 정해진다).
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"

import { V2Avatar } from "@/src/design-system-v2/components/V2Avatar"
import {
  V2Skeleton,
  V2SkeletonGroup,
} from "@/src/design-system-v2/components/V2Skeleton"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useLoadingVisible } from "@/src/design-system-v2/hooks/useLoadingVisible"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { controlHeight } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"
import type { AnalyticsSurface } from "@/src/features/analytics"

import { CHIP_GAP, COMMUNITY_GUTTER, ROW } from "./communityLayout"
import { FollowButton } from "./FollowButton"
import { MicroPill } from "./MicroPill"
import { SectionBand } from "./SectionBand"
import { SectionErrorLine, type SectionFailure } from "./SectionErrorLine"

/**
 * 그리는 행의 수. **2** — 추천은 결정을 요구하는 블록이라 길수록 나빠진다. 두 사람이면
 * 비교가 되고 세 사람부터는 고르는 일이 된다(피드는 고르러 온 자리가 아니다).
 */
export const NEIGHBOR_SUGGESTION_COUNT = 2

/**
 * 배지 상한 **2**. §2.12·§2.14 가 둘 다 "0~2개" 다. 세 개째는 닉네임을 밀어낸다.
 * (`PostRow`·`NeighborRow`·`AuthorCard` 가 각자 자기 상한을 갖는 관례를 따른다.)
 */
export const NEIGHBOR_SUGGESTION_BADGE_MAX = 2

/**
 * 아바타 한 변. 승인된 형태는 **36** 이지만 `V2Avatar` 의 사다리는
 * `24 | 28 | 40 | 48 | 56 | 60` 이라 36 이 없다. 사다리 밖 값은 스냅한다(§5.20 의 관례) —
 * 위 칸 **40** 이 36 에서 가장 가깝고(28 은 8 이 벌어진다), §2.10 이 이미 쓰는 값이다.
 * DS 에 36 이 생기면 여기만 바꾸면 된다.
 */
export const NEIGHBOR_SUGGESTION_AVATAR = 40

/**
 * 행 높이 — 실측이 아니라 **파생값**이다(이 섹션은 시안에 없다).
 *
 * ```
 * 12 + max(아바타 40, 이름줄 21 + 2 + 제목줄 18 = 41) + 12 = 65
 * ```
 * 이름줄이 21 인 것은 그 줄에 `MicroPill`(높이 21, D10)이 서기 때문이고, 이름↔제목 2 는
 * §2.14 가 `NeighborRow` 에서 쓴 간격이다. 스켈레톤이 같은 상수를 읽으므로 리듬이 갈라지지
 * 않는다 — 숫자를 두 곳에 적으면 다음 리팩터에서 한쪽만 남는다.
 */
export const NEIGHBOR_SUGGESTION_ROW_HEIGHT =
  spacing[12] +
  Math.max(
    NEIGHBOR_SUGGESTION_AVATAR,
    ROW.microPill + spacing[2] + typography.subtext.medium.lineHeight,
  ) +
  spacing[12]

/**
 * 이 섹션의 **대기**가 세어지는 자리(`wait_perceived`). `community_feed` 가 **아닌** 이유는
 * `TrendingPostsSection.TRENDING_SURFACE` 머리말과 같다 — 화면은 `screen_name` 이 말하고
 * `surface` 는 따로 로드되고 따로 실패하는 판을 말한다. 이 판이 못 받은 것은 이웃 추천이다.
 */
export const NEIGHBOR_SUGGESTION_SURFACE: AnalyticsSurface =
  "community_neighbors"

/** 행 하나가 실제로 그리는 것. */
export type NeighborSuggestion = {
  id: string
  name: string
  /** 프로필 사진(서명 URL). 없으면 `V2Avatar` 가 사람 글리프로 그린다. */
  avatarUri?: string | null
  /** 단계·주제 배지 0~2개. `t()` 로 만든 카피를 받는다. */
  badges?: string[]
  /** **이 섹션의 존재 이유** — 이 사람의 최근 글 제목 한 줄(§머리말). */
  latestPostTitle: string
  /** 이미 팔로우 중인가(§5.7 — `팔로잉`=weak). */
  following: boolean
  /** 낙관적 토글이 서버를 기다리는 동안. 그 사이 누르지 못한다(§2.11). */
  followPending?: boolean
}

export type NeighborSuggestionSectionProps = {
  /** 받은 순서대로 그린다. `NEIGHBOR_SUGGESTION_COUNT` 를 넘으면 잘린다. */
  authors: NeighborSuggestion[]
  /**
   * 왜 이 사람들이 떴는가 — 헤더 부제가 되는 재료. 예: `{ stage: "CKD 3단계",
   * topic: "식단 인증" }`. 둘 다 없으면 부제를 그리지 않는다.
   */
  reason?: { stage?: string | null; topic?: string | null }
  isLoading?: boolean
  failure?: SectionFailure | null
  onRetry: () => void
  /** 행 탭 → 작성자 프로필(S9). */
  onPressAuthor: (author: NeighborSuggestion) => void
  /** 팔로우 토글. 낙관적 갱신은 부르는 쪽의 몫이고, 이 컴포넌트는 행을 안 옮긴다. */
  onToggleFollow: (author: NeighborSuggestion) => void
  style?: StyleProp<ViewStyle>
}

export function NeighborSuggestionSection({
  authors,
  reason,
  isLoading = false,
  failure,
  onRetry,
  onPressAuthor,
  onToggleFollow,
  style,
}: NeighborSuggestionSectionProps) {
  const { colors } = useV2Theme()
  // 섹션 카피는 `common`. 네임스페이스를 명시하는 이유는 `TrendingPostsSection` 과 같다.
  const { t } = useTranslation("common")

  /* 스켈레톤 가시성·대기 계측은 DS 의 몫 — `TrendingPostsSection` 머리말과 같은 이유. */
  const showSkeleton = useLoadingVisible(isLoading, {
    surface: NEIGHBOR_SUGGESTION_SURFACE,
  })

  const visible = authors.slice(0, NEIGHBOR_SUGGESTION_COUNT)

  /*
    가운뎃점은 목록 구분자다 — 조각이 하나면 붙지 않는다. 문장 자체는 i18n 키가 갖고
    (`{{reason}} …`), 조각을 잇는 일만 여기서 한다. 키를 세 벌(단계만·주제만·둘 다)
    만들면 같은 문장을 세 곳에서 고치게 된다.
  */
  const reasonText = [reason?.stage, reason?.topic]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ")

  /* 빈 상태는 섹션째로 접는다(D23 과 같은 판정) — 밴드·헤더까지 이 컴포넌트의 것이다. */
  if (visible.length === 0 && !showSkeleton && !failure) return null

  return (
    <View style={style}>
      <SectionBand />

      {/*
        **머리와 본문은 한 면 위에 있다 — 규칙 (A)** (2026-08-22).
        `TrendingPostsSection` 의 같은 자리 주석과 같은 이유다: 위아래 밴드로 잘려 나온
        전폭 한 덩어리라 머리가 그 안에 앉는다. 여기는 특히 티가 났다 — 머리(회색 바닥)
        바로 아래에 작성자 행(흰 면)이 붙어서, 제목이 자기가 가리키는 목록과 **다른
        평면**에 앉아 있었다(사용자 지적). 규칙 전문은 `SectionHeader` 머리말.
        다크는 이 값이 곧 화면 바닥이라 한 픽셀도 안 바뀐다.
      */}
      <View style={{ backgroundColor: colors.background.default }}>
        {/*
          두 줄짜리 헤더라 `SectionHeader`(§2.7, 높이 47 고정 · 한 줄)를 쓸 수 없다.
          위 16 / 아래 8 은 그 컴포넌트가 실측에서 확정한 세로 리듬 그대로다.
        */}
        <View style={styles.header}>
          <V2Text
            token="title.xSmall"
            color={colors.label.normal}
            numberOfLines={1}
          >
            {t("community.neighbors.title")}
          </V2Text>

          {reasonText ? (
            <V2Text
              token="subtext.medium"
              color={colors.label.neutral}
              numberOfLines={1}
              style={styles.subtitle}
            >
              {t("community.neighbors.reason", { reason: reasonText })}
            </V2Text>
          ) : null}
        </View>

        {visible.length > 0 ? (
          visible.map((author) => {
            const badges =
              author.badges?.slice(0, NEIGHBOR_SUGGESTION_BADGE_MAX) ?? []

            return (
              <Pressable
                key={author.id}
                onPress={() => onPressAuthor(author)}
                accessibilityRole="button"
                accessibilityLabel={t("community.author.openProfile", {
                  name: author.name,
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
                <V2Avatar
                  size={NEIGHBOR_SUGGESTION_AVATAR}
                  uri={author.avatarUri}
                />

                <View style={styles.column}>
                  <View style={styles.nameRow}>
                    <V2Text
                      token="label.small"
                      color={colors.label.normal}
                      numberOfLines={1}
                      style={styles.name}
                    >
                      {author.name}
                    </V2Text>
                    {badges.map((badge) => (
                      <MicroPill key={badge} label={badge} face="neutral" />
                    ))}
                  </View>

                  {/*
                  라벨이 없으면 이 줄이 자기소개인지 상태메시지인지 글 제목인지 모른다.
                  앱이 이미 쓰는 중간점 메타 언어(`식단 · 1일 전`)에 맞춰 앞에 붙인다.

                  라벨을 **한 단 더 흐리게** 두던 자리다. 라이트에는 그 단이 없다 —
                  `label.neutral` 아래는 2.8:1(alternative)·1.7:1(assistive)이라
                  "한 단 흐린 라벨"이 아니라 "안 보이는 라벨"이 된다(`colors.ts` §label 사다리).
                  라벨과 제목의 위계는 색이 아니라 **어순과 중간점**이 말한다.
                */}
                  <V2Text
                    token="subtext.medium"
                    color={colors.label.neutral}
                    numberOfLines={1}
                    style={styles.latestPost}
                  >
                    <V2Text token="subtext.medium" color={colors.label.neutral}>
                      {t("community.neighbors.latestPostLabel")}
                    </V2Text>
                    {` · ${author.latestPostTitle}`}
                  </V2Text>
                </View>

                <FollowButton
                  following={author.following}
                  onPress={() => onToggleFollow(author)}
                  pending={author.followPending}
                />
              </Pressable>
            )
          })
        ) : showSkeleton ? (
          /* 링 스피너 금지 · 스켈레톤 우선(전역 §0.2). 행과 **같은 스타일 객체**를 쓴다. */
          <V2SkeletonGroup>
            {Array.from({ length: NEIGHBOR_SUGGESTION_COUNT }, (_unused, i) => (
              <View key={i} style={styles.row}>
                <V2Skeleton
                  width={NEIGHBOR_SUGGESTION_AVATAR}
                  height={NEIGHBOR_SUGGESTION_AVATAR}
                  radius="full"
                />
                <View style={styles.column}>
                  <View style={styles.nameRow}>
                    <V2Skeleton
                      width="46%"
                      height={typography.label.small.lineHeight}
                      radius="xs"
                    />
                  </View>
                  <V2Skeleton
                    width="78%"
                    height={typography.subtext.medium.lineHeight}
                    radius="xs"
                    style={styles.latestPost}
                  />
                </View>
                <V2Skeleton
                  width={FOLLOW_SLOT_WIDTH}
                  height={controlHeight.sm}
                  radius="sm"
                />
              </View>
            ))}
          </V2SkeletonGroup>
        ) : failure ? (
          <SectionErrorLine failure={failure} onRetry={onRetry} />
        ) : null}
      </View>

      {/*
        아래쪽 밴드. 이 섹션도 피드 한가운데에 끼어들므로 **양쪽을 같은 방법으로 끊는다**
        (`TrendingPostsSection` 의 같은 자리 주석). 접힐 때 두 밴드가 함께 사라지도록
        둘 다 이 컴포넌트가 들고 있다.
      */}
      <SectionBand />
    </View>
  )
}

/**
 * 팔로우 버튼 자리의 폭 — §2.11 이 실측한 목록 행 버튼 **52×32**.
 * `FollowButton` 자신은 폭을 안 박지만(카피가 정한다) 스켈레톤은 도착할 폭을 잡아야
 * 버튼이 오는 순간 제목이 안 흔들린다.
 */
const FOLLOW_SLOT_WIDTH = 52

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: COMMUNITY_GUTTER,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  /** 제목↔부제 2 — §2.14 가 이름↔메타에 쓴 간격과 같다. */
  subtitle: { marginTop: spacing[2] },
  /*
    세로로 쌓인다 — 목록 컨테이너가 따로 없고 행이 부모의 흐름에 그대로 얹힌다.
    가로 스크롤러는 이 섹션이 버린 형태다(머리말).
  */
  row: {
    height: NEIGHBOR_SUGGESTION_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: COMMUNITY_GUTTER,
    // 아바타↔텍스트열↔버튼 모두 12 — §2.14 의 시작선 간격과 같은 값이다.
    gap: spacing[12],
  },
  /** 긴 닉네임·긴 제목이 버튼을 밀지 않게. */
  column: { flex: 1 },
  /** 배지(21)가 서는 줄이라 높이를 21 로 잡는다 — 파생 높이의 항이다(위 상수 머리말). */
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    height: ROW.microPill,
  },
  name: { flexShrink: 1 },
  latestPost: { marginTop: spacing[2] },
})
