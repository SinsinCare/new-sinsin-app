import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native"

import { useSurface } from "@/src/hooks/useSurface"
import { splitMentionSegments } from "../utils/commentMentions"

interface MentionTextProps {
  content: string
  mentions: string[]
  style?: StyleProp<TextStyle>
  muted?: boolean
}

/** 댓글 본문 — 서버가 확인해준 '@닉네임'만 브랜드 색으로 띄운다. */
export function MentionText({
  content,
  mentions,
  style,
  muted = false,
}: MentionTextProps) {
  const surface = useSurface()
  const segments = splitMentionSegments(content, mentions)

  return (
    <Text
      style={[style, { color: muted ? surface.textWeak : surface.text }]}
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
}

const styles = StyleSheet.create({
  mention: {
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
