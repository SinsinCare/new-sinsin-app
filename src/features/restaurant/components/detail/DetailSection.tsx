import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 상세 화면의 섹션 껍데기. `메뉴` `사진` `후기` `편의시설 및 서비스` 처럼
 * 제목 + 본문이 반복되는 블록을 한 모양으로 고정한다.
 *
 * 섹션 사이는 **선이 아니라 면**으로 끊는다(`V2Divider variant="thick"` = 16px 회색 블록).
 * 목업이 그렇게 생겼고, 선을 얹으면 회색 면과 선이 겹쳐 두 번 끊긴 것처럼 보인다.
 *
 * `trailing` 은 제목 우측 슬롯이다 — 목업 -19 의 `후기 1,413 ›` 처럼 개수와
 * 화살표가 제목과 같은 줄에 온다.
 *
 * ## 제목 크기는 **탭마다 다르다** (2026-08-20 시안 실측)
 *
 * 홈 탭의 `메뉴`(C1_2)와 정보 탭의 `편의시설 및 서비스`(D7_1)는 같은 껍데기를 쓰지만
 * 크기가 다르다 — 3배 렌더에서 한글 음절 이송을 재면 `메뉴` 는 42px(=14.0pt,
 * 0.864em 기준 16.2 ≈ 17), `편의시설`·`주차` 는 39px(=13.0pt → **15**)다. 잉크 높이도
 * 46px 대 40px 로 같은 17:15 비율이고, 세로획은 6px 대 5px 라 굵기는 둘 다 Bold 다.
 *
 * 그래서 이 컴포넌트의 기본값을 내리지 않고 `titleStyle` 프롭을 열었다. 기본값을
 * 15 로 내리면 홈 탭의 세 섹션 제목이 같이 작아진다 — 고쳐야 할 곳은 정보 탭뿐이다.
 *
 * 섹션의 **여백**에는 그런 프롭이 없다. `paddingVertical` 은 `SECTION_GAP` 하나이고
 * 호출부가 `style` 로 덮어쓸 통로도 두지 않는다(예전에 `CARD_GAP` 12 로 덮어쓴 판본이
 * 있었고, 그 근거였던 카드 면은 사라졌다). 여백을 바꿔야 하면 `layout.ts` 에서 바꾼다.
 */

import { type ReactNode } from "react"
import { Pressable, StyleSheet, View, type TextStyle } from "react-native"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"

import { GUTTER, SECTION_GAP, SECTION_TITLE_GAP } from "../../layout"

export interface DetailSectionProps {
  title: string
  /** 제목 오른쪽에 붙는 개수 등. 문자열만 받는다(레이아웃이 흔들리지 않게). */
  count?: string | null
  /**
   * 제목 줄 전체를 눌러 어디론가 보낼 때만 준다. 주면 `›` 가 붙는다 —
   * 화살표만 있고 동작이 없는 줄을 만들지 않기 위해 화살표를 콜백에 묶었다.
   */
  onPress?: () => void
  /**
   * 제목 타이포 토큰. **기본은 `typography.title.xSmall`(17)** 이고 홈 탭이 그 값이다.
   * 정보 탭만 시안이 15 라서 넘긴다(머리말). 자유 스타일이 아니라 토큰을 받는 자리다 —
   * 여기로 색·여백을 넘기면 섹션이 다시 제각각이 된다.
   */
  titleStyle?: TextStyle
  children: ReactNode
}

export function DetailSection({
  title,
  count = null,
  onPress,
  titleStyle = typography.title.xSmall,
  children,
}: DetailSectionProps) {
  const { colors } = useV2Theme()

  const header = (
    <View style={styles.headerRow}>
      <Text
        style={[titleStyle, { color: colors.label.normal }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>
      {count !== null && (
        <Text style={[typography.label.small, { color: colors.label.normal }]}>
          {count}
        </Text>
      )}
      {onPress && (
        <V2Icon
          name="chevronRight"
          size={iconSize.sm}
          color={colors.label.alternative}
        />
      )}
    </View>
  )

  return (
    <View style={styles.section}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          hitSlop={spacing[8]}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: GUTTER, paddingVertical: SECTION_GAP },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginBottom: SECTION_TITLE_GAP,
  },
  // 행 전체를 누르는 제목이라 카드(0.9)보다 강한 0.6 을 쓴다 — 목록 행 규칙.
  pressed: { opacity: 0.6 },
})
