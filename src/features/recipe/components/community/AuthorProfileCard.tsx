/**
 * **작성자 프로필 블록 146** — 프로필 화면(S9) 헤더 **와** 상세 화면(S4) 안의 작성자 카드.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.13
 * · 실측 `feed-home.md` §2-A · `detail-drag.md` §4.3.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 두 자리가 같은 블록이다
 *
 * 프로필 화면 헤더와 상세 화면 안의 작성자 카드가 **둘 다 146** 이고 내분도 같다.
 * 다른 것은 하나뿐 — 상세 안에 놓일 때만 하단 1px `line.alternative` 가 붙는다(§2.13).
 * 그래서 컴포넌트가 하나고 `divider` 프롭 하나로 갈린다.
 *
 * ■ 아바타는 20 으로 옮기고 **텍스트 시작선 104 는 그대로** 둔다
 *
 * 시안은 이 카드에서만 아바타를 x=24 에 뒀다(다른 모든 블록은 20). §2.13 이 "시작선이
 * 셋이 된다" 며 20 으로 정규화했는데, **이름·스탯의 x 104 는 그대로 유지**한다.
 * 스탯 3열의 실측 x(104 / 187 / 282)가 전부 그 시작선에 매달려 있어서, 텍스트열을 같이
 * 4px 당기면 세 열이 통째로 어긋난다. 그래서 아바타 우변(20+56=76)과 텍스트 사이가
 * **28** 이다(시안의 24 가 아니라).
 *
 * ■ 세로 리듬 — 버튼은 **아래에서** 잰다
 *
 * ```
 * top +16   아바타 56           이름 19  (`label.smallStrong` 15/19)
 *                               +2
 *                               숫자 19  (`label.smallStrong`)
 *                               라벨 18  (`subtext.medium` 13/18, 사이 간격 0)
 * top +96   FollowButton 38     ← 아래에서 12 + 38
 * top +146
 * ```
 * 실측 베이스라인(이름 C+31.3 · 숫자 C+53.1 · 라벨 C+71.1)이 이 배치에서 각각
 * 31.95 / 52.95 / 70.6 으로 나온다 — 셋 다 1px 안이다. 숫자↔라벨 간격이 **0** 인 것이
 * 요점이다: 두 실측 베이스라인 차 18 은 15/19 상자 뒤에 13/18 상자가 **붙어 있을 때**
 * 나오는 값이고, 간격을 2 만 줘도 라벨이 밀린다.
 *
 * 버튼은 `marginTop: "auto"` 로 **아래에서** 잡는다. 블록 높이가 146 으로 고정이라
 * (패딩 16/12) 그 한 줄이 실측 top +96 을 정확히 만든다. 위에서부터 더해 96 을 맞추려면
 * 텍스트열 높이(58)에 의존하는 22 같은 값이 필요한데, 그건 스페이싱 사다리에도 없고
 * 닉네임 폰트가 바뀌면 조용히 어긋난다.
 *
 * ■ 3열은 고정 x 가 아니라 `space-between` 이다 (§2.13)
 *
 * 실측 x 104 / 187 / 282 는 폭 **210** 컨테이너의 `space-between` 이 만든 자리다
 * (열 내용 합 84.6, 끝 314.3 = 104 + 210). 좌표를 박으면 숫자가 4자리가 되거나
 * en 카피(`Reviews`/`Followers`)로 바뀌는 순간 열이 겹친다.
 *
 * ■ 하단 1px 은 146 **안쪽**이다
 *
 * 실측 카드 7911–8057(146)이 하단 선을 포함한다. Yoga 는 테두리를 상자 높이에 넣으므로
 * (D13·D17 과 같은 산술) 아래 패딩에서 그만큼 뺀다 — 그래야 선이 있든 없든 146 이고
 * 버튼도 같은 자리(+96)에 남는다.
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
import { COMMUNITY_GUTTER } from "./communityLayout"
import { FollowButton } from "./FollowButton"

/** 블록 높이(§2.13 실측). 두 자리(S9 헤더 · S4 카드)가 같은 값이다. */
export const AUTHOR_PROFILE_CARD_HEIGHT = 146

/** 스탯 3열이 사는 폭(§2.13 — 이 폭의 `space-between` 이 실측 x 를 만든다). */
export const AUTHOR_PROFILE_STATS_WIDTH = 210

type StatProps = {
  value: number
  label: string
  language: string
  onPress?: () => void
}

/** 숫자(15 Bold) 위 · 라벨(13 Regular) 아래. 두 상자는 **붙어 있다** — 머리말 §세로 리듬. */
function Stat({ value, label, language, onPress }: StatProps) {
  const { colors } = useV2Theme()

  const content = (
    <>
      <V2Text token="label.smallStrong" color={colors.label.normal}>
        {formatCount(value, language)}
      </V2Text>
      <V2Text token="subtext.medium" color={colors.label.neutral}>
        {label}
      </V2Text>
    </>
  )

  if (!onPress) return <View>{content}</View>

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatCount(value, language)}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  )
}

export type AuthorProfileCardProps = {
  name: string
  /** 프로필 사진(서명 URL). 없으면 `V2Avatar` 가 사람 글리프로 그린다. */
  avatarUri?: string | null
  /** 세 열의 수. 카피는 기존 i18n(`community.author.*`)에서 온다. */
  stats: { reviews: number; followers: number; following: number }
  /** 이미 팔로우 중인가(§5.7 — `팔로잉`=weak). */
  following: boolean
  onToggleFollow: () => void
  /** 낙관적 토글이 서버를 기다리는 동안. */
  followPending?: boolean
  /** 팔로워 열 탭 → S10. 안 주면 그 열은 안 눌린다. */
  onPressFollowers?: () => void
  /** 팔로잉 열 탭 → S10. */
  onPressFollowing?: () => void
  /** 상세 화면(S4) 안에 놓일 때만 하단 1px — §2.13. */
  divider?: boolean
  style?: StyleProp<ViewStyle>
}

export function AuthorProfileCard({
  name,
  avatarUri,
  stats,
  following,
  onToggleFollow,
  followPending,
  onPressFollowers,
  onPressFollowing,
  divider = false,
  style,
}: AuthorProfileCardProps) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation()
  const language = i18n.language

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.default,
          // 선이 있든 없든 총 높이는 146 이다 — 머리말 §하단 1px.
          paddingBottom: spacing[12] - (divider ? borderWidth.thin : 0),
          borderBottomWidth: divider ? borderWidth.thin : 0,
          borderBottomColor: colors.line.alternative,
        },
        style,
      ]}
    >
      <View style={styles.head}>
        <V2Avatar size={56} uri={avatarUri} />

        <View>
          <V2Text
            token="label.smallStrong"
            color={colors.label.normal}
            numberOfLines={1}
          >
            {name}
          </V2Text>

          <View style={styles.stats}>
            <Stat
              value={stats.reviews}
              label={t("community.author.reviews")}
              language={language}
            />
            <Stat
              value={stats.followers}
              label={t("community.author.followers")}
              language={language}
              onPress={onPressFollowers}
            />
            <Stat
              value={stats.following}
              label={t("community.author.following")}
              language={language}
              onPress={onPressFollowing}
            />
          </View>
        </View>
      </View>

      <FollowButton
        size="block"
        following={following}
        onPress={onToggleFollow}
        pending={followPending}
        style={styles.follow}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    height: AUTHOR_PROFILE_CARD_HEIGHT,
    paddingTop: spacing[16],
    paddingHorizontal: COMMUNITY_GUTTER,
  },
  /** 아바타 우변(76)에서 텍스트 시작선 104 까지 28 — 머리말 §아바타. */
  head: {
    flexDirection: "row",
    gap: spacing[28],
  },
  stats: {
    width: AUTHOR_PROFILE_STATS_WIDTH,
    marginTop: spacing[2],
    flexDirection: "row",
    justifyContent: "space-between",
  },
  /** 아래에서 잰다 — 머리말 §세로 리듬. */
  follow: { marginTop: "auto" },
  pressed: { opacity: 0.85 },
})
