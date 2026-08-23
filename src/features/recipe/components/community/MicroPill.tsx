/**
 * **21px 마이크로 배지** — 카테고리 배지 · 태그 칩 · 댓글 `작성자` · 스토리 `저염식`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.2 (WBS 1.1).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 `V2Chip` 이 아니라 `V2Badge` 인가
 *
 * `V2Chip` 은 최소 높이가 `controlHeight.sm`(32)이다. 이건 **컨트롤 높이**지 태그 높이가
 * 아니다(§5.21-8 이 같은 오독을 시안에서 잡아냈다). 마이크로 배지는 비상호작용 정보
 * 요소라 `V2Badge` 계보가 맞다.
 *
 * ■ 왜 높이를 명시하나 — 21 vs 23 (D10)
 *
 * §4-G2 는 `V2Badge size="xs" shape="pill"` 로 21 이 나온다고 적었지만 실제로는 **23** 이다.
 * `caption.xSmall` 의 lineHeight 가 15 라 4 + 15 + 4 = 23 이고, 21 을 내리려면 세로 여백이
 * 3(스페이싱 사다리에 없다)이거나 라인박스가 13(토큰 밖 타이포)이어야 한다.
 * `V2Badge` 는 스펙 문구대로 두고(다른 소비처가 있다) **여기서 높이를 명시**한다 —
 * 디자인이 지정한 건 여백이 아니라 **높이 21** 이고, `postRowHeight()` 공식이 그 21 을
 * 항으로 써서 실측 6종(176/147/118/106/179/138)을 재현한다. 23 이면 행마다 최대 4px 어긋난다.
 *
 * 감싸는 `View` 를 하나 더 두는 대신 **`V2Badge` 의 공개 `style` 프롭**으로 높이를 준다.
 * `V2Badge` 는 `style` 을 스타일 배열의 **맨 뒤**에 놓으므로 `paddingVertical` 이 정확히
 * 덮이고, 배지의 API 는 한 글자도 안 바뀐다. 래퍼였다면 바깥 상자만 21 이고 **눈에 보이는
 * 알약은 여전히 23** 이라 위아래로 1px 씩 삐져나온다 — 이 방법은 칠해지는 면 자체가 21 이다.
 * 라벨(라인박스 15)은 `V2Badge` 의 `alignItems/justifyContent: center` 가 (21−15)/2 = 3 으로
 * 세로 중앙에 놓는다.
 *
 * ■ 왜 `alignSelf` 를 다시 말하나 — D10 의 "세로 중앙정렬"
 *
 * `V2Badge` 의 바탕 스타일은 `alignSelf: "flex-start"` 다. 그건 **세로 방향 컨테이너**에서
 * 폭이 부모만큼 늘어나지 않게 하려는 것이지만, 배지가 실제로 놓이는 자리는 전부 **가로
 * 방향 줄**이다 — 거기서 `alignSelf` 는 폭이 아니라 **세로 위치**를 정한다. 그대로 두면
 * 21 짜리 알약이 줄 **위쪽에 붙는다**:
 *   - `PostRow` 헤더행(랭크 원이 있으면 24) → 카테고리 배지가 1.5px 위로 뜬다.
 *     `popular.md` §2.5 는 "Category badge … **Vertically centred on the rank circle**" 이다.
 *   - `CommentRow` 이름줄(16) → 배지가 아래로 5 삐져나온다. §2.8 은 "이름 + 배지 + ⋯ 이
 *     **같은 중심선**" 이라고 적었다.
 * `center` 는 `flex-start` 와 마찬가지로 **늘리지 않는다**(늘리는 건 `stretch` 뿐이다) —
 * 폭 hug 는 그대로고 세로만 줄 중앙으로 온다. D10 이 못 박은 "명시 높이 21 + 세로
 * 중앙정렬" 의 뒤쪽 절반이 이 한 줄이다.
 */
import { StyleSheet } from "react-native"

import {
  V2Badge,
  type V2BadgeColor,
  type V2BadgeVariant,
} from "@/src/design-system-v2/components/V2Badge"

import { ROW } from "./communityLayout"

/** §2.2 의 4면. 이름은 스펙 표의 `face` 열 그대로다. */
export type MicroPillFace = "ink" | "neutral" | "brandWeak" | "onMedia"

/**
 * face → `V2Badge` 의 (color, variant).
 *
 * `neutral`(태그 칩)이 `V2Badge` 의 `neutral/weak` 가 **아닌** `ink/weak` 인 것이 요점이다.
 * `neutral/weak` 칸은 앱의 다른 화면 3곳(주차 유·무료 · 검색 제안 종류 · 연결 해지)이
 * 이미 `label.disable` 면으로 쓰고 있어서, 시안이 요구한 `fill.normal` 면은 §4-G2 가
 * `ink/weak` 라는 새 칸으로 열어 뒀다(`V2Badge.tsx` 의 `ink` 주석이 근거).
 */
const FACE: Record<
  MicroPillFace,
  { color: V2BadgeColor; variant: V2BadgeVariant }
> = {
  /** 카테고리 배지 `질문·상담` — 잉크 면 + 뒤집힌 글자 */
  ink: { color: "ink", variant: "fill" },
  /** 태그 칩 · 작성자 카드 배지 · 이전/다음 칩 — `fill.normal` 면 + `label.neutral` */
  neutral: { color: "ink", variant: "weak" },
  /** 댓글 `작성자` 배지 — `primary.primaryWeak` 면 + 브랜드 글자 */
  brandWeak: { color: "brand", variant: "weak" },
  /** 스토리 `저염식` — 사진 위라 두 모드가 같은 흰 면 + 브랜드 글자 */
  onMedia: { color: "onMedia", variant: "fill" },
}

export type MicroPillProps = {
  /** 배지 라벨. 10 SemiBold(`caption.xSmall`)로 그려진다. */
  label: string
  /** 기본 `neutral`(태그 칩) — 목록에서 가장 많이 쓰는 면. */
  face?: MicroPillFace
}

/**
 * 높이 21 · `radius.full` · padH 8 · 라벨 10 SemiBold 인 알약 하나.
 *
 * **누르는 동작은 갖지 않는다.** 태그 칩은 누르면 태그 검색으로 가지만(§2.1 `onPressTag`),
 * 그 히트영역·접근성 라벨은 행이 소유한다 — 배지가 자기를 누를 수 있는지 없는지는
 * 쓰는 자리마다 다르고, 여기서 분기를 열면 같은 알약이 네 가지 상호작용을 갖게 된다.
 */
export function MicroPill({ label, face = "neutral" }: MicroPillProps) {
  const { color, variant } = FACE[face]

  return (
    <V2Badge
      size="xs"
      shape="pill"
      color={color}
      variant={variant}
      style={styles.pill}
    >
      {label}
    </V2Badge>
  )
}

const styles = StyleSheet.create({
  pill: {
    // D10. `paddingVertical: 0` 을 같이 주는 이유: 높이만 주면 내용 상자가 21−4−4 = 13 이 되어
    // 라인박스 15 가 음수 여유 위에 놓인다. 결과 좌표는 같지만 "왜 3 인가"를 읽을 수 없게 된다.
    height: ROW.microPill,
    paddingVertical: 0,
    // 가로 줄에서 세로 중앙 — 머리말 §alignSelf. `flex-start`(배지 바탕값)면 위로 붙는다.
    alignSelf: "center",
  },
})
