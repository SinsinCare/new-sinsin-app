/**
 * **상단 탭 스트립(51) + 우상단 프로필** — 피드(S1) · 인기글 기간탭(S3) · 프로필 3탭(S9).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.15 (WBS 1.13).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ `V2Tab` 을 다시 만들지 않는다 — 폭만 정해 주면 인디케이터가 실측과 맞는다
 *
 * Phase 0-A 가 확인한 사실이다(§4 "갭이 아닌 것"): `alignment="fixed"` 는 컨테이너 폭을
 * 균등 분할하고 인디케이터는 셀에서 좌우 8 씩 들어간다. 그래서 **컨테이너 폭만** 정하면
 * 실측 인디케이터가 그대로 나온다.
 *
 * ```
 * rail  폭 233 (= 77.7 × 3) → 셀 77.67 → 인디케이터 61.67 ≈ **62** ✔ (피드·프로필 3탭)
 * fill  폭 375 − 20×2 = 335 → 셀 111.67 → 인디케이터 95.67 ≈ **96** ✔ (인기글 기간탭)
 * ```
 *
 * 두 배치의 차이는 **폭을 어디서 얻느냐**뿐이다: `rail` 은 좌측 20 에서 시작하는 233 짜리
 * 고정 폭, `fill` 은 좌우 20 패딩을 뺀 남은 폭. 그래서 프롭 하나로 갈린다.
 *
 * ■ 하단선은 스트립이 그린다 (`V2Tab` 의 것은 끈다)
 *
 * §2.15 의 하단선은 **full-bleed** 인데 `rail` 의 `V2Tab` 은 233 밖에 안 된다. `V2Tab` 의
 * 하단선을 그대로 두면 선이 탭 밑에서만 그려지고 프로필 아이콘 밑은 비어 보인다.
 * 둘 다 그리면 같은 자리에 같은 색이 두 겹 쌓여(`line.normal` 은 알파 22%) 탭 아래만
 * 눈에 띄게 진해진다. 그래서 **스트립이 그리고 `V2Tab` 은 끈다** — `V2Tab` 은 `style` 을
 * 스타일 배열 맨 뒤에 놓으므로 `borderBottomWidth: 0` 이 정확히 덮인다(공개 API 다).
 *
 * ■ 스트립의 총 높이는 51 이 아니라 **52** 다 (D13 과 같은 산술)
 *
 * §2.15 는 "높이 51" 과 "하단선 1px" 을 같은 칸에서 주장하는데 Yoga 는 테두리를 상자
 * 높이에 포함하므로 둘 다 참일 수 없다(`V2Option` 의 55 가 실제로 57 인 것과 같은 이유).
 * `ROW.tabStrip`(51)은 **탭 아이템의 높이**고 여기에 선 1 이 더해진다. 화면에서 51 을
 * 기대하지 말 것 — 높이를 51 로 박으면 아이템이 1px 눌린다.
 *
 * ■ 우상단 프로필 원은 **손으로 그리지 않는다**
 *
 * §2.15 의 실측(24 원 · `fill.pressed` 면 · 채운 사람 글리프 · `label.assistive`)은
 * `V2Avatar`(§4-G12 · WBS 0.12)의 24 사이즈와 **같은 그림**이다. 여기서 원과 글리프를
 * 다시 그리면 두 정본이 생기고, 특히 글리프 비율(아이콘을 아바타 px 그대로 그린다는
 * `V2Avatar` 머리말 §글리프)을 놓치기 쉽다. 히트영역과 자리(우 인셋 20)만 여기 남는다.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Avatar,
  type V2AvatarSize,
} from "@/src/design-system-v2/components/V2Avatar"
import { V2Tab, type V2TabItem } from "@/src/design-system-v2/components/V2Tab"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { borderWidth, touchTarget } from "@/src/design-system-v2/tokens/size"

import { COMMUNITY_GUTTER } from "./communityLayout"

/**
 * 3탭 레일의 폭. §2.15 실측 — 아이템 77.7 × 3 = **233**.
 * `communityLayout.ts` 에 두지 않은 이유: 행 높이가 아니라 **이 컴포넌트의 배치 하나**에만
 * 쓰이는 값이다(같은 폭을 쓰는 프로필 3탭도 이 컴포넌트를 통과한다).
 */
export const TAB_RAIL_WIDTH = 233

/** 우상단 프로필 원의 지름(§2.15). `V2Avatar` 의 여섯 지름 중 가장 작은 것이다. */
const PROFILE_SIZE: V2AvatarSize = 24

/**
 * 탭 레일이 폭을 얻는 방법.
 *  - `rail`(기본) — 좌 20 에서 시작하는 고정 폭 233. 인디케이터 62.
 *  - `fill` — 좌우 20 을 뺀 남은 폭 전부. 인디케이터 96(3탭 · 375 폭 기준).
 */
export type CommunityTopTabsLayout = "rail" | "fill"

export type CommunityTopTabsProps = {
  items: V2TabItem[] | string[]
  value: string
  onChange: (value: string) => void
  layout?: CommunityTopTabsLayout
  /**
   * 우상단 프로필 아이콘. 안 주면 **안 그린다**(인기글 기간탭에는 없다).
   * 이 진입점은 §6 보존 목록(헤더의 내 활동/북마크)의 대체 경로이기도 하다(D5).
   */
  onProfilePress?: () => void
  style?: StyleProp<ViewStyle>
}

export function CommunityTopTabs({
  items,
  value,
  onChange,
  layout = "rail",
  onProfilePress,
  style,
}: CommunityTopTabsProps) {
  const { colors } = useV2Theme()
  const { t } = useTranslation()

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: colors.background.default,
          borderBottomColor: colors.line.normal,
        },
        style,
      ]}
    >
      <V2Tab
        items={items}
        value={value}
        onChange={onChange}
        alignment="fixed"
        size="l"
        style={layout === "rail" ? styles.rail : styles.fill}
      />

      {onProfilePress ? (
        <Pressable
          onPress={onProfilePress}
          hitSlop={(touchTarget.min - PROFILE_SIZE) / 2}
          accessibilityRole="button"
          accessibilityLabel={t("community.myActivity")}
          style={styles.profile}
        >
          <V2Avatar size={PROFILE_SIZE} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  /** full-bleed 하단선은 여기 있다(머리말 §하단선). */
  strip: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: borderWidth.thin,
  },
  /*
    `borderBottomWidth: 0` 은 `V2Tab` 자신의 선을 끄는 것이다 — 지우면 탭 아래만
    선이 두 겹이 된다. 두 배치 모두에 있어야 한다.
  */
  rail: {
    width: TAB_RAIL_WIDTH,
    marginLeft: COMMUNITY_GUTTER,
    borderBottomWidth: 0,
  },
  fill: {
    flex: 1,
    paddingHorizontal: COMMUNITY_GUTTER,
    borderBottomWidth: 0,
  },
  /** 우측 인셋 20. `marginLeft:"auto"` 라 레일 폭이 바뀌어도 오른쪽에 붙어 있다. */
  profile: {
    marginLeft: "auto",
    marginRight: COMMUNITY_GUTTER,
  },
})
