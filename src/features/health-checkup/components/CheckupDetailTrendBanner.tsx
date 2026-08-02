/**
 * 추세 인사이트 배너 — "최근 검사 결과 대비 신장 수치(eGFR)가 감소되는 추세에요".
 *
 * 이 화면들에서 **유일하게 떠 있는 표면**이다. 시안을 보면 다른 덩어리는 전부 면(회색)이나
 * 얇은 선으로 구획되는데 이 배너만 그림자를 달고 있다. 그림자를 하나 더 쓰는 순간 "떠 있음"
 * 이 강조가 아니라 기본값이 되므로, 다른 카드에는 `elevated` 를 쓰지 않는다.
 *
 * 좌우로 꽉 차게(모서리 없이) 두는 것도 시안 그대로다 — 그림자 선이 화면 폭을 가로질러
 * 헤더와 목록을 갈라 주는 게 이 배너의 역할이다. 그래서 `V2Card` 의 기본 radius 를 0 으로 덮는다.
 */

import { StyleSheet } from "react-native"

import { GUTTER, V2Card, spacing } from "@/src/design-system-v2"
import type { ProseSegment } from "@/src/types/healthAnalysis"

import { HighlightedProse } from "./HighlightedProse"

export function CheckupDetailTrendBanner({
  segments,
}: {
  segments: ProseSegment[]
}) {
  return (
    <V2Card variant="elevated" padded={false} style={styles.card}>
      <HighlightedProse segments={segments} tone="title" />
    </V2Card>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    paddingHorizontal: GUTTER,
    paddingVertical: spacing[20],
  },
})
