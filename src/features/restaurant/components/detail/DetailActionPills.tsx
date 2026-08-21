/**
 * 상세의 **하단 고정 액션 바**: `[🔖] [↗] [📞]  …  길찾기 [진단하기]`.
 *
 * ```
 * ┌────────────────────────────────────────────┐ ← 위 두 모서리만 24 라운드 + 머리카락 선
 * │  🔖   ↗   📞          길찾기  [ 진단하기 ]  │ ← 콘텐츠 행 44 (터치 타깃)
 * └────────────────────────────────────────────┘ ← + 홈 인디케이터 안전영역
 * ```
 *
 * ## 라벨 pill 행에서 이 모양으로 돌아온 이유
 *
 * 앞 판본은 `[✨ 진단하기] [📍 길찾기] [☎ 전화] [↗ 공유] [🔖 저장]` 라벨 pill 을 히어로
 * 아래에 두고, 스크롤로 그 행을 지나치면 같은 행을 하단에 고정했다. 근거는 "무엇을 할 수
 * 있는 곳인지가 제목 옆에서 읽혀야 한다" 였고 그 명제 자체는 여전히 옳다. 바뀐 것은
 * **시안이 제목 아래 그 자리를 사진 캐러셀에 줬다는 사실**이다 — 시안 히어로는
 * `상호명 → 평점 → 한 줄 소개 → 사진` 이고 pill 행이 없다(C1_1). 액션은 하단 바 한 곳에만
 * 상주하며, 그 바는 스크롤 위치와 무관하게 **항상 보인다**(C1_2·C2_2~C6_2 여섯 장 전부 동일).
 *
 * "액션은 한 벌" 이라는 규칙은 그대로다. 자리가 둘에서 하나로 줄었을 뿐이라 오히려 더 강해졌다 —
 * 나타났다 사라지는 바를 눈으로 좇을 일이 없어졌다.
 *
 * ## 치수는 시안 실측값이고 전부 토큰 위에 떨어진다
 *
 * 3배 렌더 PNG 를 픽셀 단위로 재서(`C1_2.png`) 얻은 값들이다. 눈대중이 아니다.
 *
 * | 항목 | 실측(pt) | 토큰 |
 * |---|---|---|
 * | 바 위 모서리 반경 | 24.0 | `radius["3xl"]` |
 * | 바 위 테두리 색 | `rgb(244,244,245)` | `line.alternative`(`#70737c14` over white) |
 * | 위 여백 | 7.7 | `spacing[8]` |
 * | 콘텐츠 행 높이 | 44.0 | `touchTarget.min` |
 * | 아래 여백 | 34.0 (= 홈 인디케이터 안전영역) | `insets.bottom` |
 * | `진단하기` 상자 | 65.0 × 32.0, 반경 8 | `controlHeight.sm` · `radius.sm` |
 * | `진단하기` 좌우 안여백 | 10.0 | `spacing[10]` |
 * | 아이콘 글리프 | 24 | `iconSize.md` |
 * | 아이콘 **가로 피치** | 40.0 (중심 36.0 → 76.0 → 116.7) | `iconSize.md` + `spacing[16]` |
 * | 아이콘·글자 색 | `#2a2a37` / `#ffffff` | `label.normal` / `static.white` |
 *
 * ## 보조 아이콘은 24 상자 + `hitSlop` 이지 44 상자가 아니다
 *
 * 앞 판본은 44×44 투명 상자를 간격 0 으로 맞붙였다. 터치 타깃은 맞았지만 **가로 피치가
 * 44 가 되어** 시안의 40 리듬이 무너졌다(글리프 중심을 재면 시안은 40.0 간격이다).
 * 게다가 그건 이 저장소가 명시적으로 금지한 방식이다 — `size.ts` 의 `touchTarget` 주석이
 * "시각 높이와 별개, hit-slop 으로 확보 권장" 이라 적어 두었고, 같은 화면의
 * `RestaurantDetailScreen` 헤더 버튼이 정확히 그 방식(`width: iconSize.md` + `hitSlop`)이다.
 * 그래서 상자는 24 로 되돌리고 간격 `spacing[16]` 을 줘서 피치 40 을 만든 뒤,
 * 모자란 20 을 `hitSlop` 이 채운다.
 *
 * **이웃끼리 hit 영역이 4pt 겹친다** — 피치 40 에 44 짜리 타깃 넷을 안 겹치게 놓는 방법은
 * 애초에 없다. 겹침 구간은 뒤에 그려진(오른쪽) 버튼이 가져가므로 실제 경계는 두 글리프
 * 중심의 중점에서 2pt 왼쪽이다. 44 상자를 맞붙였을 때 경계가 정확히 그 중점이던 것과
 * 사실상 같고, 대신 시안 리듬이 돌아온다. (오른쪽 두 컨트롤 `길찾기`·`진단하기` 도 같은
 * 산수다: 간격 8 에 좌우 `hitSlop` 6 이라 역시 4pt 겹친다.)
 *
 * 라벨 크기도 실측이다. Pretendard 의 한글 advance 는 **0.8643em** 이고(폰트 `hmtx` 직접
 * 판독), `진단하기` 네 글자의 잉크 폭이 43.0pt 였다 → `43 / (0.8643 × 3.877) ≈ 12.8` 이라
 * **13** 이다. 같은 방법으로 잰 탭 라벨이 15(= `V2Tab size="s"`) 로 떨어지는 것이 이 계산의
 * 검산이다. 그래서 `typography.label.xSmall`(13 SemiBold, lineHeight 16)이고,
 * `16 + 8×2 = 32` 라 상자 높이도 저절로 맞는다.
 *
 * **다만 좌우 여백은 시안의 20 이 아니라 `GUTTER`(16)다.** 시안은 이 화면에서 20 을 쓰지만
 * 앱의 화면 좌우 정본은 16 이고(`layout.ts`), 바 하나 때문에 세 번째 시작선을 만들지 않는다.
 *
 * ## 채움은 하나뿐이다 — 글자를 가진 것은 둘이다
 *
 * `진단하기` 만 채움(브랜드 오렌지)이다. 우리가 이 화면에서 유일하게 남들이 못 하는 일이
 * 개인 기준 대조이므로, 그것 하나만 눈에 띄어야 한다. **아이콘도 그것만 없다** — 시안의
 * CTA 는 글자뿐이다. 그 리듬을 깨지 않으려고 `sparkleMono` 를 여기서 쓰지 않는다(그
 * 아이콘 자체는 브랜드 면 위 대비를 위해 남아 있고, 다시 넣는다면 반드시 두 톤 `sparkle`
 * 이 아니라 단색 쪽이다).
 *
 * 글자를 가진 것이 하나 더 있다: `길찾기`. **글리프를 줄 수 없어서 글자로 준다.**
 *
 *   - 시안의 바는 아이콘 셋(`🔖 ↗ 📞`) + CTA 다. `길찾기` 는 시안에 없고 우리가 더한
 *     넷째인데, 앞 판본은 그것을 `mapPin` 으로 그렸다. 그런데 **같은 화면의 주소 행이
 *     이미 `mapPin` 이다**(`DetailInfoRows`). 한 화면에서 같은 글리프가 "여기가 주소" 와
 *     "여기를 눌러 길을 찾아라" 를 동시에 뜻하면 둘 다 안 읽힌다. 라벨을 지우기 전에는
 *     `길찾기` 라는 보이는 글자가 그 모호함을 막고 있었다.
 *   - 구분되는 글리프는 레지스트리에 없다. 내비게이션 화살표 계열이 `iconRegistry` 에
 *     한 종도 없고(`crosshair` 는 지도의 '내 위치', `chevronRight` 는 이동 표시다),
 *     이 화면 하나 때문에 브랜드 글리프를 새로 그리는 것은 여기서 내릴 결정이 아니다 —
 *     같은 판단을 `OutlinePill` 머리말이 DS outline 변형에 대해 이미 한 번 했다.
 *   - 그래서 넷째만 **글리프 없이 글자로** 그린다. 결과적으로 시안의 아이콘 셋은 손대지
 *     않은 채 1:1 로 남고, 우리가 더한 것은 더한 것처럼 보인다. 채움은 여전히 하나다 —
 *     `길찾기` 는 면도 테두리도 없는 글자이고 잉크는 아이콘과 같은 `label.normal` 이다.
 *
 * ## 순서는 여기서 정하지 않는다
 *
 * 배열을 세 갈래로 가르되(글리프 보조 / 글자 보조 / 주요) **각 갈래 안에서 배열 순서를
 * 그대로 쓴다**. 왼쪽 무리는 글리프 보조, 오른쪽 무리는 나머지이고, 화면이 넘기는 순서가
 * `저장 · 공유 · 전화 · 길찾기 · 진단하기` 이므로 화면에 그려지는 왼→오 순서도 그대로다.
 * `reverse`·`sort` 를 쓰지 않고 `flexDirection` 도 `row` 뿐인 이유가 이것이다 — 순서
 * 계약은 화면 쪽 배열에서 검사되고, 그 검사가 뜻을 가지려면 여기가 순서를 바꾸지 않아야 한다.
 *
 * ## 저장 상태는 아이콘 **면**으로 말한다
 *
 * 라벨이 없으므로 `저장` → `저장됨` 이라는 글자 채널이 사라졌다. 대신 북마크 글리프가
 * 비어 있던 것에서 **채워지고**(`bookmark` → `bookmarkFilled`) 색이 브랜드로 바뀐다.
 * 형태와 색 두 갈래라 색을 구분하지 못해도 전달된다. 스크린리더는 `accessibilityLabel`
 * (`저장`/`저장됨`)과 `accessibilityState.selected` 로 같은 사실을 받는다.
 *
 * ## 이 컴포넌트는 상태를 갖지 않는다
 *
 * 액션 배열을 그대로 그리기만 한다. 자리가 하나뿐이라 예전처럼 두 인스턴스가 갈라질
 * 걱정은 없지만, 그렇다고 여기서 북마크 상태를 들면 화면과 서버가 어긋난다.
 */

import type { ComponentProps } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"

import {
  borderWidth,
  controlHeight,
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2Icon,
  type V2IconName,
} from "@/src/design-system-v2"

import { GUTTER } from "../../layout"

export interface DetailAction {
  /** React key 이자 분석용 이름. */
  key: string
  /**
   * 주요 액션에서는 **화면에 보이는 글자**, 보조 액션에서는 스크린리더에만 읽히는 이름이다.
   * 그래서 보조 라벨도 i18n 을 반드시 통과해야 한다 — 안 보인다고 하드코딩하면 그 사용자만
   * 영어 화면에서 한국어를 듣는다.
   */
  label: string
  /**
   * 글리프. **없으면 그 액션은 글자로 그려진다.**
   *
   * 주요 액션(`진단하기`)에 없는 이유는 시안의 CTA 가 글자뿐이어서이고, 보조 액션
   * `길찾기` 에 없는 이유는 줄 수 있는 글리프가 없어서다(머리말 "글자를 가진 것은 둘이다").
   * 어느 쪽이든 **조용히 사라지지 않는다** — 글리프가 없는 액션은 라벨이 보이는 글자가 된다.
   */
  icon?: V2IconName
  /** 채움은 화면당 하나여야 한다(머리말 참고). */
  emphasis: "primary" | "secondary"
  /** 켜짐 상태를 갖는 액션(저장)만 쓴다. */
  selected?: boolean
  onPress: () => void
}

export interface DetailActionBarProps {
  actions: DetailAction[]
  /** 홈 인디케이터 안전영역. 없는 기기(구형 안드로이드)에서는 호출부가 하한을 준다. */
  paddingBottom: number
  onLayout?: ComponentProps<typeof View>["onLayout"]
  style?: StyleProp<ViewStyle>
}

/** 글리프를 실제로 가진 보조 액션. 이 좁힘이 `UtilityButton` 의 조용한 `null` 을 없앤다. */
type GlyphAction = DetailAction & { icon: V2IconName }

/**
 * 왼쪽 무리에 서는가. **글리프가 없으면 무조건 글자 쪽**이라 어느 액션도 빠지지 않는다 —
 * 앞 판본은 `icon` 이 없는 보조 액션을 `UtilityButton` 안에서 `null` 로 조용히 지웠다.
 */
function isGlyphAction(action: DetailAction): action is GlyphAction {
  return action.emphasis === "secondary" && action.icon !== undefined
}

/**
 * 하단 고정 바. **항상 보인다** — 나타났다 사라지지 않는다(머리말).
 *
 * 배열을 두 무리로 가른다: 글리프를 가진 보조 액션(왼쪽)과 나머지(오른쪽). 어느 쪽도
 * 순서를 다시 정하지 않는다 — `filter` 는 배열 순서를 보존하므로 화면이 넘긴 순서가 곧
 * 그려지는 순서다(머리말 "순서는 여기서 정하지 않는다"). 무엇이 몇 번째인지는
 * 화면(`RestaurantDetailScreen`)이 안다.
 */
export function DetailActionBar({
  actions,
  paddingBottom,
  onLayout,
  style,
}: DetailActionBarProps) {
  const { colors } = useV2Theme()
  const glyphs = actions.filter(isGlyphAction)
  // 글리프가 없는 것은 전부 글자로 간다 — 주요 액션(채움)이든 `길찾기`(맨글자)든.
  const worded = actions.filter((action) => !isGlyphAction(action))

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          paddingBottom,
          backgroundColor: colors.background.default,
          borderTopColor: colors.line.alternative,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.utilities}>
          {glyphs.map((action) => (
            <UtilityButton key={action.key} action={action} />
          ))}
        </View>
        <View style={styles.worded}>
          {worded.map((action) =>
            action.emphasis === "primary" ? (
              <PrimaryButton key={action.key} action={action} />
            ) : (
              <TextButton key={action.key} action={action} />
            ),
          )}
        </View>
      </View>
    </View>
  )
}

/**
 * 라벨 없는 아이콘 버튼. **상자는 글리프 크기(24)이고 터치 타깃 44 는 `hitSlop` 이 만든다**
 * — 보이는 선과 만지는 넓이를 분리해야 시안의 40 피치와 44 타깃을 둘 다 지킬 수 있다
 * (머리말 "보조 아이콘은 24 상자 + hitSlop 이지 44 상자가 아니다").
 *
 * `selected` 는 **면과 색 두 갈래**로 말한다: 글리프가 채워지고(`bookmark` →
 * `bookmarkFilled`) 색이 브랜드로 바뀐다. 라벨이 보이지 않으므로 `저장` → `저장됨` 글자
 * 채널이 없고, 이 두 갈래가 그 자리를 대신한다 — 한쪽만 남기면 색맹 사용자나 흑백
 * 스크린숏에서 저장 상태가 화면에서 사라진다.
 */
function UtilityButton({ action }: { action: GlyphAction }) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: false, selected: action.selected }}
      accessibilityLabel={action.label}
      hitSlop={(touchTarget.min - iconSize.md) / 2}
      style={({ pressed }) => [styles.utility, pressed && styles.pressed]}
    >
      <V2Icon
        name={action.icon}
        size={iconSize.md}
        color={action.selected ? colors.primary.primary : colors.label.normal}
      />
    </Pressable>
  )
}

/**
 * 면도 테두리도 없는 글자 버튼(`길찾기`). 상자 치수는 CTA 와 같아서 오른쪽 두 컨트롤이
 * 같은 리듬으로 서고, 다른 것은 **채움뿐**이다 — 잉크는 왼쪽 아이콘들과 같은
 * `label.normal` 이라 이 바에서 색을 가진 것은 여전히 `진단하기` 하나다(머리말).
 */
function TextButton({ action }: { action: DetailAction }) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      accessibilityLabel={action.label}
      hitSlop={(touchTarget.min - controlHeight.sm) / 2}
      style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
    >
      <Text
        numberOfLines={1}
        style={[typography.label.xSmall, { color: colors.label.normal }]}
      >
        {action.label}
      </Text>
    </Pressable>
  )
}

/**
 * 브랜드 면 위의 글자 버튼. 높이가 32 라 터치 타깃 44 에 6 이 모자라고, 그 6 은
 * **상자를 키우지 않고** `hitSlop` 이 채운다(보이는 선과 만지는 넓이를 분리한다).
 */
function PrimaryButton({ action }: { action: DetailAction }) {
  const { colors } = useV2Theme()

  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      accessibilityLabel={action.label}
      hitSlop={(touchTarget.min - controlHeight.sm) / 2}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: colors.primary.primary },
        pressed && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[typography.label.xSmall, { color: colors.static.white }]}
      >
        {action.label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  /**
   * 위 두 모서리만 둥글다(시안 실측 24). 아래는 화면 끝이라 둥글릴 것이 없다.
   * 테두리도 위쪽 한 변뿐이다 — 좌우에 선을 그으면 라운드가 화면 밖으로 이어지는 것처럼
   * 보이지 않고 카드가 떠 있는 것처럼 보인다.
   */
  bar: {
    paddingTop: spacing[8],
    paddingHorizontal: GUTTER,
    borderTopWidth: borderWidth.thin,
    borderTopLeftRadius: radius["3xl"],
    borderTopRightRadius: radius["3xl"],
  },
  /**
   * 콘텐츠 행 높이를 터치 타깃(44)으로 **고정**한다. 시안의 바 높이가 여기서 나온다:
   * `8(위) + 44 + 34(안전영역) = 86` 이고, 실측한 시안 바가 정확히 86.7 이다.
   *
   * `gap` 은 `space-between` 과 함께 쓰였을 때 **최소 간격**으로 동작한다. 라벨이
   * 커져(글꼴 확대) 남는 폭이 없어져도 아이콘 무리와 CTA 가 서로 붙지 않는다.
   */
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[16],
    height: touchTarget.min,
  },
  /**
   * 보조 아이콘 무리. **간격이 곧 시안의 피치를 만든다**: 상자 24 + 간격 16 = 40 이고,
   * 시안에서 잰 글리프 중심 간격이 40.0 이다(36.0 → 76.0 → 116.7).
   *
   * `row` 여야 한다. `row-reverse` 로 뒤집으면 화면 쪽 배열이 정한 `저장 · 공유 · 전화`
   * 순서가 이 파일에서 조용히 무효가 된다(머리말 "순서는 여기서 정하지 않는다").
   */
  utilities: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
  },
  /** 글리프 크기 그대로의 상자. 44 는 `UtilityButton` 의 `hitSlop` 이 만든다. */
  utility: {
    width: iconSize.md,
    height: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * 글자를 가진 것들(`길찾기` → `진단하기`). 여기도 배열 순서 그대로라 `row` 다.
   * 간격 8 은 두 컨트롤의 좌우 안여백(각 10)과 합쳐 낱말 사이 28 을 만든다.
   */
  worded: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flexShrink: 1,
  },
  /** CTA 와 같은 상자, 채움만 없다. */
  textButton: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    height: controlHeight.sm,
    paddingHorizontal: spacing[10],
  },
  /**
   * `flexShrink` 가 이 바의 넘침 안전판이다. 예전 판본은 가로 `ScrollView` 가 그 일을 했는데,
   * 좌우 정렬(아이콘 왼쪽 · CTA 오른쪽)을 하려면 스크롤이 아니라 flex 여야 한다.
   *
   * 폭 계산(375pt 기준): 좌우 여백 32 + 아이콘 셋 104(24×3 + 16×2) + 무리 사이 최소 16
   * = 152 가 고정이고, 오른쪽 무리는 한국어 `길찾기`(≈54) + 8 + `진단하기`(65) = 127,
   * 영어 `Directions`(≈88) + 8 + `Check limits`(≈101) = 197 이라 합이 279 · 349 다.
   * 시스템 글꼴을 키우면 오른쪽 무리가 먼저 자라는데, 그때 넘치는 대신 라벨이 줄어들라고
   * 두 글자 버튼 모두 `flexShrink: 1` + `numberOfLines={1}` 로 짝지어 둔다.
   */
  primary: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    height: controlHeight.sm,
    paddingHorizontal: spacing[10],
    borderRadius: radius.sm,
  },
  // 버튼·칩과 같은 눌림 값.
  pressed: { opacity: 0.85 },
})
