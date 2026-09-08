/**
 * **팔로워/팔로잉 행 81** — 연결 목록(S10).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.14
 * · 실측 `feed-home.md` §2-B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ `NeighborRow`(101)와 무엇이 다른가
 *
 * 같은 계보지만 세 가지가 다르고, 그래서 프롭 하나로 합치지 않았다:
 *   - 아바타 **48**(60 아님) · 시작선 80(= 20 + 48 + 12)
 *   - 태그 줄이 **없다** → 텍스트는 언제나 두 줄
 *   - 팔로우 버튼은 **세로 중앙**이고(디렉터리 행은 위에서 16), **팔로잉 목록에만** 있다.
 *     팔로워 목록에는 버튼이 아예 없다(§2.14) — 남이 나를 따르는 목록에서 내가 누를
 *     것은 그 사람의 프로필이지 팔로우 토글이 아니다.
 * 두 행을 한 컴포넌트에 넣으면 "어느 프롭 조합이 어느 화면인가" 를 읽어야 하고, 그
 * 조합은 넷이 된다. 행은 목록의 리듬 그 자체라 갈라 두는 편이 안전하다.
 *
 * ■ 81 은 하단 하드라인을 **포함한** 높이다
 *
 * 실측 행 top 94 / 175 / 256 … 이 정확히 81 피치이고 각 행 바닥에 1px 이 있다.
 * `height: 81` + 하단 1px → 안쪽 80, 그 중앙이 아바타 48 을 **T+16** 에 놓는다(실측 그대로).
 *
 * ■ 두 줄은 안쪽 80 의 세로 중앙
 *
 * `19(이름) + 2 + 18(메타) = 39` → `(80−39)/2 = 20.5`. 실측 잉크(이름 T+24.6 · 메타 T+45.2)를
 * 라인박스로 되돌리면 21.2 / 41.5 라 각각 1px 안이다. 이름↔메타 **2** 는
 * `NeighborRow` 와 같은 값이고 같은 근거다(두 잉크 top 차 20.6 − 라인박스 19).
 *
 * ■ 구분선은 full-bleed
 *
 * 현행 구현의 `marginLeft: 80` 인셋을 버린다(§2.14). 좌우 여백은 이 상자의 **패딩**이라
 * `borderBottom` 은 패딩 바깥, 즉 행 폭 전체에 그려진다.
 *
 * ■ 메타 카피는 `NeighborRow` 와 같은 키를 쓴다
 *
 * 두 지표 사이 간격만 실측이 다르다(디렉터리 15 / 연결 14). 둘 다 사다리 밖이라
 * **16** 으로 같이 스냅했다(§5.20) — 같은 구성물이 화면마다 1px 다를 이유가 없다.
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
import { COMMUNITY_GUTTER, ROW } from "./communityLayout"
import { FollowButton } from "./FollowButton"

export type ConnectionRowProps = {
  name: string
  /** 프로필 사진(서명 URL). 없으면 `V2Avatar` 가 사람 글리프로 그린다. */
  avatarUri?: string | null
  followerCount: number
  postCount: number
  /**
   * 팔로우 토글. **안 주면 버튼을 안 그린다** — 팔로워 목록이 그 경우다(§2.14).
   */
  follow?: {
    /** 이미 팔로우 중인가(§5.7 — `팔로잉`=weak). */
    following: boolean
    onToggle: () => void
    pending?: boolean
  }
  /** 행 탭 → 작성자 프로필(S9). */
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function ConnectionRow({
  name,
  avatarUri,
  followerCount,
  postCount,
  follow,
  onPress,
  style,
}: ConnectionRowProps) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation()
  const language = i18n.language

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
      <V2Avatar size={48} uri={avatarUri} />

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
      </View>

      {follow ? (
        <FollowButton
          following={follow.following}
          onPress={follow.onToggle}
          pending={follow.pending}
        />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    // 81 은 하단 1px 을 **포함한다** — 머리말 §81.
    height: ROW.connectionRow,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: COMMUNITY_GUTTER,
    borderBottomWidth: borderWidth.thin,
  },
  /** 아바타 우변에서 12 → 시작선 80. `flex:1` 이라 긴 닉네임이 버튼을 밀지 않는다. */
  column: {
    flex: 1,
    marginLeft: spacing[12],
  },
  meta: {
    marginTop: spacing[2],
    flexDirection: "row",
    gap: spacing[16],
  },
  pressed: { opacity: 0.85 },
})
