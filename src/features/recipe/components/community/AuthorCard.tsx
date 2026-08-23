/**
 * **작성자 카드 137×165** — `이런 작성자도 만나보세요` 레일의 한 장.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.12
 * · 실측 `author-profile.md` §2.7 · `detail-drag.md` §5.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 그림자는 `elevation[2]` 하나로 끝난다
 *
 * 두 구역이 같은 값을 쟀다: `dy 1 / blur 3 / rgba(0,27,55,0.10)`, 테두리 없음.
 * `elevation[2]` 가 **그 색과 그 오프셋 그대로**다(`tokens/elevation.ts`). 손으로 적으면
 * 리터럴 hex 가 들어오고(eslint 경고) 다크에서 같이 안 움직인다.
 *
 * ■ 세로 리듬 — 배지 줄은 **비어도 자리를 지킨다**
 *
 * ```
 * +12  아바타 48            (카드 상단 패딩 12)
 * +4   이름 19             (`label.small` 15/19 — 잉크 실측 C+67.1)
 * +4   배지 줄 21          (`MicroPill` 0~2개 · gap 6 · 가운데)
 * +8   `FollowButton` 32   (C+116 — 실측)
 *      ↓ 남는 17 은 카드 아래 여백
 * ```
 * 합 148 이고 카드가 165 라 아래 17 이 남는다 — 실측(버튼 하단 148, 카드 165)과 같다.
 *
 * 배지가 **없는 카드에서도** 버튼이 C+119(3px 차, 시안 오차)에 그대로 있다는 것이
 * `author-profile.md` §2.7 의 3번 카드다. 즉 배지 줄은 개수와 무관한 **고정 슬롯**이다.
 * `MicroPill` 을 조건부로 그리되 줄 자체의 높이(21)는 항상 잡는 이유가 그거다 —
 * 슬롯을 접으면 배지 없는 카드만 버튼이 21 올라와 레일이 들쭉날쭉해진다.
 *
 * ■ 이름은 `+4` 인가 `+7` 인가
 *
 * §2.12 는 "아바타 아래 **7**" 이라고 적었지만 그건 **잉크** 기준이다(실측 이름 잉크 C+67.1).
 * 라인박스는 잉크보다 위에서 시작한다 — 같은 폰트의 검산이 `CommentRow` 에 있다:
 * `paddingTop 16` 인 이름줄의 13px 잉크가 18.7 이었으니 잉크는 상자 top + 반여백 + 0.092em.
 * 15/19 면 3.4 → 이름 상자 top ≈ 67.1 − 3.4 = **63.7**, 아바타 하단(60)에서 **4**.
 * 그 4 를 쓰면 배지 줄이 60+4+19+4 = **87** 로 실측(C+87)과 정확히 맞는다.
 * 7 을 그대로 쓰면 배지 줄이 90 이 되어 3px 씩 밀린다.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { V2Avatar } from "@/src/design-system-v2/components/V2Avatar"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { elevation } from "@/src/design-system-v2/tokens/elevation"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { CHIP_GAP, ROW } from "./communityLayout"
import { FollowButton } from "./FollowButton"
import { MicroPill } from "./MicroPill"

/** 카드 바깥 치수(§2.12 실측). 레일 높이 181 이 이 165 에서 나온다. */
export const AUTHOR_CARD = { width: 137, height: 165 } as const

/** 배지는 최대 두 개(§2.12 "0~2개"). 세 개째는 137 폭에 안 들어간다. */
export const AUTHOR_CARD_BADGE_MAX = 2

export type AuthorCardProps = {
  name: string
  /** 프로필 사진(서명 URL). 없으면 `V2Avatar` 가 사람 글리프로 그린다. */
  avatarUri?: string | null
  /** 태그 배지 0~2개. `t()` 로 만든 카피. 세 개 이상 넘어와도 앞의 둘만 그린다. */
  badges?: string[]
  /** 이미 팔로우 중인가(§5.7 — `팔로잉`=weak). */
  following: boolean
  onToggleFollow: () => void
  /** 낙관적 토글이 서버를 기다리는 동안. */
  followPending?: boolean
  /** 카드 탭 → 작성자 프로필(S9). */
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export function AuthorCard({
  name,
  avatarUri,
  badges,
  following,
  onToggleFollow,
  followPending,
  onPress,
  style,
}: AuthorCardProps) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.card,
        elevation[2],
        { backgroundColor: colors.background.default },
        pressed && styles.pressed,
        style,
      ]}
    >
      <V2Avatar size={48} uri={avatarUri} />

      <V2Text
        token="label.small"
        color={colors.label.normal}
        numberOfLines={1}
        style={styles.name}
      >
        {name}
      </V2Text>

      {/* 비어도 21 을 지키는 고정 슬롯 — 머리말 §세로 리듬. */}
      <View style={styles.badges}>
        {badges?.slice(0, AUTHOR_CARD_BADGE_MAX).map((badge) => (
          <MicroPill key={badge} label={badge} face="neutral" />
        ))}
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
  card: {
    width: AUTHOR_CARD.width,
    height: AUTHOR_CARD.height,
    alignItems: "center",
    paddingTop: spacing[12],
    // 긴 닉네임이 카드 모서리에 붙지 않게. 실측 배지 두 개(55+6+51=112)는 그대로 들어간다.
    paddingHorizontal: spacing[8],
    borderRadius: radius.sm,
    // 테두리 없음(§2.12) — 그림자만으로 뜬다.
  },
  name: { marginTop: spacing[4] },
  badges: {
    height: ROW.microPill,
    marginTop: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: CHIP_GAP,
  },
  follow: { marginTop: spacing[8] },
  pressed: { opacity: 0.85 },
})
