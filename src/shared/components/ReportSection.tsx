import type { ReactNode } from "react"
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"

import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"

/**
 * 리포트의 간격 체계. 두 값의 **차이**가 위계를 만든다 —
 * 8 은 "같은 이야기의 다음 항목", 24 는 "다른 이야기의 시작"이다.
 * 둘이 비슷해지면(예전엔 섹션도 8) 어디서 화제가 바뀌는지 화면이 말하지 못한다.
 */
export const REPORT_GAP = {
  /** 한 섹션 안, 카드와 카드 사이 */
  card: 8,
  /** 섹션과 섹션 사이 */
  section: 24,
} as const

/** 카드의 면 사양. 패딩·라디우스·테두리는 여기서만 정한다. */
export const REPORT_CARD = {
  borderRadius: LAYOUT.card.radius,
  // 컨셉 시트 토큰: 패딩 세로 16 · 가로 18.
  paddingVertical: 16,
  paddingHorizontal: 18,
  borderWidth: StyleSheet.hairlineWidth,
} as const

/**
 * 리포트 섹션의 공용 문법 — 통계(일·주·월)와 식사 리포트가 같이 쓴다.
 *
 * 규칙은 하나다: **한 항목 = 한 카드**. 카드 하나 안에 헤어라인으로 항목을
 * 5~6개 쌓으면 어디까지가 한 덩어리인지 경계가 사라지고, 읽는 사람이 매번
 * 스스로 잘라 읽어야 한다. 여기서는 면과 간격(8)이 경계를 대신 말한다.
 *
 * 헤어라인은 "한 항목 안에서 값과 부속을 가르는" 용도로만 남긴다.
 */

/** 섹션 제목 줄. 카드 밖에 서서 아래 카드 묶음의 이름표가 된다. */
export function SectionHeader({
  title,
  caption,
}: {
  title: string
  caption?: string | null
}) {
  const s = useSurface()
  return (
    <View style={styles.header}>
      <Text
        style={[styles.title, { color: s.textStrong }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>
      {!!caption && (
        <Text
          style={[styles.caption, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {caption}
        </Text>
      )}
    </View>
  )
}

/** 항목 하나를 담는 흰 카드. 패딩·라디우스·헤어라인 테두리를 여기서만 정한다. */
export function ItemCard({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const s = useSurface()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** 제목 + 카드 묶음. 카드 사이 간격 8 은 컨셉 시트 값이다. */
export function SectionStack({
  title,
  caption,
  children,
}: {
  title?: string
  caption?: string | null
  children: ReactNode
}) {
  return (
    <View style={styles.stack}>
      {!!title && <SectionHeader title={title} caption={caption} />}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: REPORT_GAP.card },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  title: {
    ...TYPE.cardTitle,
    fontSize: 16,
    fontWeight: "700",
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "600",
  },
  card: { ...REPORT_CARD, gap: 4 },
})
