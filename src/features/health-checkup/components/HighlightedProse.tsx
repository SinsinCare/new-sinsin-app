import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * AI 요약 문장 — 문장 **안의 구절**에만 형광펜을 칠한다.
 *
 * 시안에서 뽑은 하이라이트 색 `#d5ecf4` 는 `accentForeground.blueWeak`(#19a4d229) 를
 * `fill.background`(#f9fafb) 위에 얹은 값과 소수점까지 맞는다. 그래서 하드코딩하지 않고
 * 토큰을 그대로 얹는다 — 다크모드에서도 같은 알파가 배경 위에 얹히면 된다.
 *
 * 구현 주의: 하이라이트는 **인라인**이어야 한다. 줄바꿈을 넘어가도 칠해진 구간이 이어져야
 * 하므로 `<View>` 로 감싸면 안 되고(그러면 블록이 되어 줄이 끊긴다), 중첩 `<Text>` 에
 * `backgroundColor` 를 준다. RN 의 중첩 Text 는 이 용도로 정확히 동작한다.
 *
 * 서버가 문자 오프셋 대신 조각 배열을 주는 이유는 `src/types/healthAnalysis.ts` 참고.
 */

import { StyleSheet } from "react-native"

import { typography, useV2Theme } from "@/src/design-system-v2"
import type { ProseSegment } from "@/src/types/healthAnalysis"

export function HighlightedProse({
  segments,
  tone = "body",
}: {
  segments: ProseSegment[]
  /** body = 요약 카드 본문, title = 추세 배너처럼 굵게 읽히는 곳 */
  tone?: "body" | "title"
}) {
  const { colors } = useV2Theme()
  // body 스케일은 xSmall / mediumWeak / mediumStrong / large 뿐이다 ("medium" 은 없다).
  const base =
    tone === "title" ? typography.body.mediumStrong : typography.body.mediumWeak

  return (
    <Text style={[base, { color: colors.label.normal }]}>
      {segments.map((segment, index) => (
        <Text
          key={`${index}-${segment.text}`}
          style={
            segment.emphasis
              ? { backgroundColor: colors.accentForeground.blueWeak }
              : undefined
          }
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  )
}

/**
 * 요약 문장을 담는 면. 시안의 `fill.background` 카드.
 * 하이라이트가 배경 위에 얹히므로 이 면의 색이 하이라이트 합성 결과를 결정한다.
 */
export const proseSurfaceStyle = StyleSheet.create({
  surface: {
    padding: 16,
    borderRadius: 12,
  },
})
