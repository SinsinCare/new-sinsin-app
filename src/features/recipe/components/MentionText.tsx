import { memo } from "react"
import { StyleSheet, type StyleProp, type TextStyle } from "react-native"
import { Text } from "@/src/shared/components/AppText"

import { useSurface } from "@/src/hooks/useSurface"
import { splitMentionSegments } from "../utils/commentMentions"

interface MentionTextProps {
  content: string
  mentions: string[]
  style?: StyleProp<TextStyle>
  muted?: boolean
}

/**
 * 댓글 본문 — 서버가 확인해준 '@닉네임'만 브랜드 색으로 띄운다.
 *
 * `memo` 인 이유: 댓글마다 하나씩 서고 본문을 매번 멘션 조각으로 다시 쪼갠다.
 * 프롭이 전부 원시값·캐시된 배열(`comment.mentions`)·모듈 상수 스타일이라, 부모가
 * 다시 그려져도 이 댓글의 내용이 그대로면 쪼개기도 그리기도 건너뛴다.
 */
export const MentionText = memo(function MentionText({
  content,
  mentions,
  style,
  muted = false,
}: MentionTextProps) {
  const surface = useSurface()
  const segments = splitMentionSegments(content, mentions)

  return (
    <Text
      style={[style, { color: muted ? surface.text : surface.textStrong }]}
      lineBreakStrategyIOS="hangul-word"
    >
      {segments.map((segment, index) =>
        segment.isMention ? (
          <Text
            key={`${segment.text}-${index}`}
            style={[styles.mention, { color: surface.brand }]}
          >
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  )
})

const styles = StyleSheet.create({
  mention: {
    fontFamily: "Pretendard-SemiBold",
  },
})
