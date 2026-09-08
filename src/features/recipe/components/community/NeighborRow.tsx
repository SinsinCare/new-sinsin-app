/**
 * **신신이웃 디렉터리 행 101** — 작성자 목록(S11).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.14
 * · 실측 `author-profile.md` §3.3.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 101 은 하단 하드라인을 **포함한** 높이다
 *
 * 실측 행 top 이 7413 / 7514 / 7615 … 로 **정확히 101 피치**이고 각 행 바닥에 1px 이 있다.
 * Yoga 는 테두리를 상자 높이에 포함하므로(D13·D17 과 같은 산술) `height: 101` + 하단 1px
 * 이면 안쪽이 100 이 되고, 그 100 의 세로 중앙이 아바타 60 을 **T+20** 에 놓는다 —
 * 실측과 같다. 높이를 안 박고 패딩으로 쌓으면 행마다 1px 씩 밀린다.
 *
 * ■ 텍스트열은 세로 **중앙**이고, 태그가 없으면 두 줄이 다시 중앙에 온다
 *
 * ```
 * 태그 있음: 19(이름) + 2 + 18(메타) + 4 + 21(태그) = 64  → (100−64)/2 = 18
 * 태그 없음: 19       + 2 + 18                      = 39  → (100−39)/2 = 30.5
 * ```
 * 실측 잉크(태그 있음 이름 T+22.1 / 메타 T+42.7, 태그 없음 이름 T+34.6 / 메타 T+55.2)를
 * 라인박스로 되돌리면 18.7 / 39.0 · 31.2 / 51.5 다 — 위 두 값과 각각 1px 안이다.
 * **행 높이는 어느 쪽이든 101 로 같다**(§2.14 이 그렇게 못 박았다).
 *
 * 이름↔메타 **2** 가 두 실측을 동시에 만족시키는 유일한 값이다: 두 잉크 top 의 차이가
 * 20.6 인데 `label.small` 라인박스가 19 이므로 남는 1.6 이 간격이다(사다리에서 2).
 *
 * ■ 아바타 60 · 시작선 92 (52 짜리 1행은 드리프트)
 *
 * 실측 8행 중 **1행만** 아바타 52 + solid 버튼이고 나머지 7행이 60 + tint 다.
 * §2.14 판정대로 60/weak 로 통일한다. 텍스트 시작선 92 = 20(거터) + 60 + **12**.
 *
 * ■ 팔로우 버튼은 세로 중앙이 **아니다**
 *
 * 실측 T+16(중앙이면 34)이다. 텍스트가 세 줄까지 자라는 행이라 버튼을 중앙에 두면
 * 태그 줄과 시각적으로 겹쳐 보인다 — 위에 붙여 이름줄과 같은 무게중심에 둔다.
 *
 * ■ 메타 카피는 앱의 i18n 이 이긴다
 *
 * 시안은 `작성글 83` 인데 앱의 기존 말은 `게시글`(`community.author.posts`)이다.
 * §2.18 이 같은 부류를 이미 판정했다(시안의 합쇼체 대신 앱의 해요체). 한 앱 안에서
 * 같은 것을 두 이름으로 부르지 않는다.
 * 두 지표 사이는 실측 15(§2.14) — 사다리에 15 가 없어 **16** 으로 스냅한다(§5.20).
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
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { formatCount } from "../../utils/displayNumber"
import { CHIP_GAP, COMMUNITY_GUTTER, ROW } from "./communityLayout"
import { FollowButton } from "./FollowButton"
import { MicroPill } from "./MicroPill"

/** 태그는 최대 두 개(§2.14 "0~2개"). */
export const NEIGHBOR_ROW_TAG_MAX = 2

export type NeighborRowProps = {
  name: string
  /** 프로필 사진(서명 URL). 없으면 `V2Avatar` 가 사람 글리프로 그린다. */
  avatarUri?: string | null
  followerCount: number
  postCount: number
  /** 태그 배지 0~2개. `t()` 로 만든 카피. */
  tags?: string[]
  /** 이미 팔로우 중인가(§5.7 — `팔로잉`=weak). */
  following: boolean
  onToggleFollow: () => void
  /** 낙관적 토글이 서버를 기다리는 동안. */
  followPending?: boolean
  /** 행 탭 → 작성자 프로필(S9). */
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function NeighborRow({
  name,
  avatarUri,
  followerCount,
  postCount,
  tags,
  following,
  onToggleFollow,
  followPending,
  onPress,
  style,
}: NeighborRowProps) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation()
  const language = i18n.language

  const visibleTags = tags?.slice(0, NEIGHBOR_ROW_TAG_MAX) ?? []

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.background.default,
          borderBottomColor: colors.line.normal,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <V2Avatar size={60} uri={avatarUri} />

      <View style={styles.column}>
        <V2Text
          token="label.small"
          color={colors.label.normal}
          numberOfLines={1}
        >
          {name}
        </V2Text>

        <View style={styles.meta}>
          <V2Text token="subtext.medium" color={colors.label.neutral}>
            {t("community.author.followerCount", {
              count: followerCount,
              replace: { count: formatCount(followerCount, language) },
            })}
          </V2Text>
          <V2Text token="subtext.medium" color={colors.label.neutral}>
            {t("community.author.postCount", {
              count: postCount,
              replace: { count: formatCount(postCount, language) },
            })}
          </V2Text>
        </View>

        {visibleTags.length > 0 ? (
          <View style={styles.tags}>
            {visibleTags.map((tag) => (
              <MicroPill key={tag} label={tag} face="neutral" />
            ))}
          </View>
        ) : null}
      </View>

      <FollowButton
        following={following}
        onPress={onToggleFollow}
        pending={followPending}
        style={styles.follow}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    // 101 은 하단 1px 을 **포함한다** — 머리말 §101.
    height: ROW.directoryRow,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: COMMUNITY_GUTTER,
    borderBottomWidth: borderWidth.thin,
  },
  /** 아바타 우변에서 12 → 시작선 92. `flex:1` 이라 긴 닉네임이 버튼을 밀지 않는다. */
  column: {
    flex: 1,
    marginLeft: spacing[12],
  },
  meta: {
    marginTop: spacing[2],
    flexDirection: "row",
    gap: spacing[16],
  },
  tags: {
    marginTop: spacing[4],
    flexDirection: "row",
    gap: CHIP_GAP,
  },
  /** 세로 중앙이 아니라 위에서 16 — 머리말 §팔로우 버튼. */
  follow: {
    alignSelf: "flex-start",
    marginTop: spacing[16],
  },
  pressed: { opacity: 0.85 },
})
