/**
 * **정렬 트리거 + 앵커드 팝오버** — 피드/검색의 정렬 필(70×32)과 상세 댓글의 정렬 바(48).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.6
 * · 실측 `search.md` §7.2·§7.4 · `post-detail.md` §2.4·§2.7 · `detail-drag.md` §3.2
 * · 판정 `01-DECISIONS.md` **D3**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ D3 — 여기는 "선택" 이다
 *
 * 정렬은 비파괴 선택이라 `V2Menu`(앵커드 팝오버)를 쓴다. 수정·삭제·신고 같은 액션은
 * `CommunityActionSheet` 로 간다. 이 파일은 `V2MenuItem` 만 만들고 톤·아이콘·체크를
 * 얹을 길이 없다 — 그 어포던스는 `V2Menu` 자신이 갖고 있지 않다.
 *
 * ■ 앵커는 **재서** 넘긴다 — 그리고 앵커가 곧 열림 상태다
 *
 * `V2Menu` 는 **윈도 좌표계**(`measureInWindow` 가 주는 값)를 받는다. 화면이 스크롤되면
 * 트리거의 자리가 바뀌므로 상수로 둘 수 없다. 그래서 누를 때마다 다시 잰다.
 *
 * 상태를 `boolean` + `anchor` 두 개로 두지 않고 **`anchor: 앵커 | null` 하나**로 둔 이유:
 * 두 개면 "열렸는데 아직 안 쟀다" 라는 중간 상태가 생기고, 그 한 프레임 동안 카드가
 * `(0, 0)` 에 뜬다. 앵커가 곧 열림이면 그 상태가 **존재하지 않는다**.
 *
 * ■ 두 앵커가 같은 식 하나로 나온다 (§2.6 앵커 표)
 *
 * 스펙은 두 자리를 따로 적었다 — 필은 "필 하단 +8, 좌변 정렬", 댓글 정렬바는
 * "바 top+40, 좌 20". 둘은 같은 규칙이다:
 * ```
 * 필    : 필 179..211        → 211 + 8 = 219   (search.md §7.4 카드 top 219) ✔
 * 정렬바: 바 568..616, 트리거 라인박스 16 이 세로 중앙 → 584..600
 *         600 + 8 = 608 = 바 top + 40         (post-detail.md §2.7 패널 top 608) ✔
 * ```
 * 즉 **트리거 하단 + 8 · 트리거 좌변** 하나면 실측 둘이 다 나온다. `sortMenuAnchor()` 가
 * 그 식이고, 그래서 "+40" 같은 파생값을 화면이 손으로 들고 있을 필요가 없다.
 *
 * ■ 정렬 바의 48 은 **하단선을 포함한** 높이다
 *
 * `post-detail.md` §2.4: 바 568..616(48) + 하단 1px. D13·D17 과 같은 산술이라 패딩으로
 * 쌓으면 49 가 된다. 여기서는 `height: ROW.sortBar` 를 **명시**한다 — Yoga 는 border-box라
 * 테두리가 그 48 안에 들어간다. 높이를 안 박고 패딩으로 만들면 목록이 1px 밀린다.
 *
 * 그 하단선만 `line.neutral`(16%)이다 — 다른 구분선은 전부 `line.alternative`(8%).
 * `detail-drag.md` §3.2 가 "이 한 줄만 진하다" 고 따로 적어 뒀다.
 *
 * ■ 필은 칩 줄과 **같은 평면**에 앉는다 — 테두리가 없다 (2026-08-21)
 *
 * 실기기 피드백: "최신순이 보더 때문인지 왼쪽 다른 탭들과 높이가 잘라 보이고".
 * 필은 `height: ROW.chip`(32)로 칩과 **같은 높이인데도** 다르게 보였다. 원인은 면이다 —
 * 칩은 채운 면(지금은 `fill.control`)에 테두리가 없고, 필만 1px `line.neutral` 을 두르고
 * 있었다.
 * 딱딱한 경계와 부드러운 경계는 같은 32pt 여도 서로 다른 평면으로 읽힌다(다크에서 특히:
 * 어두운 바닥 위의 밝은 실선이 상자를 도드라지게 만든다).
 *
 * 그리고 이건 시스템 위반이기도 했다 — `V2Chip` 머리말: "`brand`·`neutral` 은 **테두리가
 * 없다** — 앱 전체가 보더리스이고, 흰 바닥 위에서는 옅은 회색 면이 곧 경계다."
 * 정렬 필만 예외일 근거가 없다. 그래서 **미선택 칩과 같은 면**(`fill.control`, 테두리 없음)
 * 으로 간다. `V2Chip` 이 선택 칩에서 하는 "테두리만큼 가로 패딩을 빼는" 산술도 여기서는
 * 필요가 없다(뺄 테두리가 없다) — 그래서 그 산술은 이 파일에 애초에 없다.
 *
 * ■ 필의 폭은 박지 않는다
 *
 * §2.6 은 같은 칸에서 `70×32` 와 `padL 12 / gap 6 / padR 8` 을 적었는데 13px `최신순`
 * (advance ≈ 33.7)이면 합이 **≈ 76** 이라 둘 다 참일 수 없다(`MorePill` 이 100/111 에서
 * 만난 것과 같은 부류). 폭을 상수로 박으면 `조회순`·en 카피에서 글자가 잘리므로
 * **여백 쪽을 정본으로 삼는다.**
 */
import { useRef, useState } from "react"
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
  V2Menu,
  type V2MenuAnchor,
} from "@/src/design-system-v2/components/V2Menu"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import type { CommunitySortMode } from "../../types"
import { COMMUNITY_GUTTER, ROW } from "./communityLayout"

/**
 * 정렬 모드 → i18n 키. 서버 `sort` 파라미터(`recent`/`views`/`popular`)가 그대로 키다 —
 * 화면마다 카피를 다시 고르면 같은 정렬이 화면마다 다른 말이 된다.
 * 댓글 정렬은 이 셋 중 `recent`/`popular` 둘만 쓴다(§2.6 "옵션 카피").
 *
 * `as const satisfies` 인 이유: 이 앱의 i18n 키는 **타입**이라 `t()` 가 리터럴을 요구한다.
 * `Record<CommunitySortMode, string>` 으로 적으면 값이 `string` 으로 넓어져 컴파일이 막히고,
 * `satisfies` 가 없으면 세 모드를 다 덮었는지 아무도 확인하지 않는다.
 */
export const SORT_LABEL_KEYS = {
  recent: "community.sort.recent",
  views: "community.sort.views",
  popular: "community.sort.popular",
} as const satisfies Record<CommunitySortMode, string>

/** 트리거와 카드 사이(§2.6 앵커 표). 두 실측 앵커가 이 값 하나로 나온다 — 머리말 §앵커. */
export const SORT_MENU_GAP = spacing[8]

/** 트리거를 잰 결과. `measureInWindow(x, y, width, height)` 의 부분집합이다. */
export type SortTriggerFrame = { x: number; y: number; height: number }

/**
 * 잰 트리거 → `V2Menu` 가 받는 **윈도 좌표** 앵커. 트리거 하단 +8, 좌변 정렬.
 * 순수 함수라 화면 없이도 검증된다(머리말 §앵커의 두 실측이 그 검증이다).
 */
export function sortMenuAnchor(frame: SortTriggerFrame): V2MenuAnchor {
  return { top: frame.y + frame.height + SORT_MENU_GAP, left: frame.x }
}

/**
 * 트리거의 모양.
 *  - `pill`(기본) — 피드·검색 결과의 70×32 아웃라인 필. 칩 레일 안에 산다.
 *  - `bar` — 상세 댓글의 48 전폭 정렬 바. 좌측 텍스트 트리거 + 우측 액션.
 */
export type SortDropdownVariant = "pill" | "bar"

export type SortDropdownProps = {
  /** 그릴 순서 그대로. 목록 `["recent","views","popular"]` · 댓글 `["recent","popular"]`. */
  options: CommunitySortMode[]
  value: CommunitySortMode
  onChange: (value: CommunitySortMode) => void
  variant?: SortDropdownVariant
  /**
   * `bar` 의 우측 액션(`마지막 댓글로`). 12 Regular — 좌측 트리거(13)보다 **1 작다**
   * (`detail-drag.md` §3.2 이 그 1px 차이를 따로 적어 뒀다). 안 주면 안 그린다.
   */
  trailing?: { label: string; onPress: () => void }
  style?: StyleProp<ViewStyle>
}

export function SortDropdown({
  options,
  value,
  onChange,
  variant = "pill",
  trailing,
  style,
}: SortDropdownProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  const triggerRef = useRef<View>(null)
  // 앵커가 곧 열림 상태다 — 머리말 §앵커.
  const [anchor, setAnchor] = useState<V2MenuAnchor | null>(null)

  const open = () => {
    triggerRef.current?.measureInWindow((x, y, _width, height) => {
      setAnchor(sortMenuAnchor({ x, y, height }))
    })
  }

  const trigger = (
    <Pressable
      ref={triggerRef}
      onPress={open}
      accessibilityRole="button"
      accessibilityState={{ expanded: anchor !== null }}
      accessibilityLabel={t("community.sort.title")}
      style={({ pressed }) => [
        variant === "pill" ? styles.pill : styles.textTrigger,
        // 미선택 칩과 **같은 면**이다 — 머리말 §필은 칩 줄과 같은 평면에 앉는다.
        // 미선택 칩과 **같은 면**이라야 한 줄로 읽힌다 — 그래서 칩이 옮겨 간 칸으로
        // 같이 간다(`fill.control`). 여기만 두면 같은 32pt 줄에서 필만 얕아진다.
        variant === "pill" && { backgroundColor: colors.fill.control },
        pressed && styles.pressed,
      ]}
    >
      <V2Text
        token="label.xSmallWeak"
        color={colors.label.neutral}
        numberOfLines={1}
      >
        {t(SORT_LABEL_KEYS[value])}
      </V2Text>
      <V2Icon name="chevronDown" size="xs" color={colors.label.neutral} />
    </Pressable>
  )

  const menu =
    anchor === null ? null : (
      <V2Menu
        visible
        anchor={anchor}
        items={options.map((option) => ({
          key: option,
          label: t(SORT_LABEL_KEYS[option]),
          onSelect: () => onChange(option),
        }))}
        onClose={() => setAnchor(null)}
        accessibilityLabel={t("community.sort.title")}
      />
    )

  if (variant === "pill") {
    return (
      <>
        {trigger}
        {menu}
      </>
    )
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.background.default,
          // 이 한 줄만 진하다(머리말 §정렬 바).
          borderBottomColor: colors.line.neutral,
        },
        style,
      ]}
    >
      {trigger}
      {trailing ? (
        <Pressable
          onPress={trailing.onPress}
          accessibilityRole="button"
          accessibilityLabel={trailing.label}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <V2Text token="subtext.small" color={colors.label.neutral}>
            {trailing.label}
          </V2Text>
        </Pressable>
      ) : null}
      {/*
        메뉴는 두 변형 **모두**에 있어야 한다. `V2Menu` 는 포털로 올라가므로 여기 어디에
        놓든 그려지는 자리는 같지만, 트리에서 빠지면 정렬 바에서는 눌러도 아무 일이
        안 일어난다(빠뜨렸다가 테스트가 잡았다).
      */}
      {menu}
    </View>
  )
}

const styles = StyleSheet.create({
  /** 70×32 채운 필 — 폭은 카피가 정한다(머리말 §필의 폭). */
  pill: {
    height: ROW.chip,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    // 테두리 없음 — 머리말 §필은 칩 줄과 같은 평면에 앉는다.
    paddingLeft: spacing[12],
    paddingRight: spacing[8],
    gap: spacing[6],
  },
  /** 텍스트 트리거 — 라벨 라인박스 16 과 아이콘 16 이 같은 높이라 줄 높이가 16 이다. */
  textTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  /** 48 은 하단선을 **포함한** 높이다(머리말 §정렬 바). */
  bar: {
    height: ROW.sortBar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: COMMUNITY_GUTTER,
    borderBottomWidth: borderWidth.thin,
  },
  pressed: { opacity: 0.85 },
})
