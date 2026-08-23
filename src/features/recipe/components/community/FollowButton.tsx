/**
 * **팔로우 / 팔로잉 토글** — 목록 행(52×32) · 작성자 카드(54×32) · 프로필 블록(335×38).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.11 · §5.7
 * · 실측 `author-profile.md` §2.7·§3.3 · `feed-home.md` §2-A·§2-B · `detail-drag.md` §4.3.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 상태 → 면 매핑은 §5.7 이 못 박았다 (시안이 자기모순이라)
 *
 * 시안 4개 프레임이 서로 어긋난다 — solid 인데 `팔로잉`, tint 인데 `팔로우`/`팔로잉` 둘 다.
 *   `팔로우`(아직 안 함) = **fill**  `primary.primary` / `static.white`
 *   `팔로잉`(이미 함)   = **weak**  `primary.primaryWeak` / `primary.primary`
 * 관례와도, 기존 i18n(`community.author.follow`=팔로우 · `unfollow`=팔로잉)과도 맞는 방향이다.
 * 굳이 적어 두는 이유: 다음 사람이 시안을 다시 열면 **뒤집힌 프레임을 먼저 볼 확률이 높다.**
 *
 * ■ 폭을 박지 않는다
 *
 * 실측 52(행) / 54(카드) / 335(프로필)는 전부 **카피와 부모 폭의 결과**다.
 * `V2Button size="s"` 의 padH 10 에 13 SemiBold `팔로우`(잉크 33.0) / `팔로잉`(32.1)을 넣으면
 * 53 / 52 가 나온다 — 실측과 1px 안이고, 52 와 54 의 차이도 그 사이에 있다.
 * 335 는 좌우 여백 20 을 뺀 화면 폭이라 `fullWidth` 가 그대로 만든다.
 * 상수로 박으면 en 카피(`Follow`/`Following`)에서 글자가 잘린다(`MorePill` 과 같은 판단).
 *
 * ■ `pending` 은 `loading` 이 아니라 `disabled` 다
 *
 * §2.11: "낙관적 업데이트 + `isFollowingPending` 동안 disable". `V2Button` 의 `loading` 은
 * 라벨 자리를 점 로더로 바꾸는데, 그러면 **버튼 폭이 카피 폭에서 로더 폭으로 흔들려**
 * 52 짜리 버튼이 행 안에서 들썩인다. 눌림만 막으면 되는 자리다.
 */
import { type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Button } from "@/src/design-system-v2/components/V2Button"

/**
 * 버튼이 놓이는 자리.
 *  - `row`(기본) — 목록 행·작성자 카드. 32 높이 · `radius.sm`(8) · 13 SemiBold.
 *  - `block` — 프로필 블록. 38 높이 · `radius.md`(10) · 15 SemiBold · 전폭.
 */
export type FollowButtonSize = "row" | "block"

export type FollowButtonProps = {
  /** **이미 팔로우 중인가.** true 면 `팔로잉`(weak), false 면 `팔로우`(fill) — §5.7. */
  following: boolean
  onPress: () => void
  /** 낙관적 토글이 서버 응답을 기다리는 동안. 그 사이 누르지 못한다(§2.11). */
  pending?: boolean
  size?: FollowButtonSize
  style?: ViewStyle
}

export function FollowButton({
  following,
  onPress,
  pending = false,
  size = "row",
  style,
}: FollowButtonProps) {
  const { t } = useTranslation()

  const label = following
    ? t("community.author.unfollow")
    : t("community.author.follow")

  return (
    <V2Button
      size={size === "row" ? "s" : "m"}
      color="brand"
      variant={following ? "weak" : "fill"}
      fullWidth={size === "block"}
      disabled={pending}
      onPress={onPress}
      /*
        토글이라 상태를 읽어 줘야 한다 — 카피(`팔로우`/`팔로잉`)만으로는 스크린리더가
        "지금 상태" 인지 "누르면 될 상태" 인지 구분하지 못한다.
        `disabled` 를 같이 넘기는 이유: `V2Button` 은 `{...rest}` 를 자기 것보다 **뒤에**
        펼치므로 여기서 준 `accessibilityState` 가 통째로 이긴다.
      */
      accessibilityState={{ selected: following, disabled: pending }}
      style={style}
    >
      {label}
    </V2Button>
  )
}
