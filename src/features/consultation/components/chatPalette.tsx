import { StyleSheet } from "react-native"
import { V2Box } from "@/src/design-system-v2"

/**
 * 사용자 턴의 잉크 반전 면 팔레트 — 전역 AI 상담 필과 같은 결.
 * 텍스트 버블(ChatMessageBubble)과 사용자 턴 카드(FoodConsultCard·ExamConsultCard)가
 * 같은 면을 쓰므로 여기서만 정의한다. 카드끼리 서로 import 하면 순환이 된다.
 */
export const USER_BUBBLE_BG = { light: "#1D1E20", dark: "#F4F4F6" } as const

export const USER_BUBBLE_TEXT = { light: "#FFFFFF", dark: "#17181C" } as const

export type ChatScheme = keyof typeof USER_BUBBLE_BG

/**
 * 잉크 면 위의 보조 톤. 면색이 라이트/다크에서 반전되므로 흑백 알파로만 위계를
 * 만든다 — 색을 더하면 사용자 턴의 정체성이 흐려진다.
 *
 * 식사 카드와 검진 카드가 **같은 값**을 써야 한다. 같은 화면에서 두 카드의 톤이
 * 다르면 두 개의 디자인 언어가 보인다. 예전에는 두 파일이 같은 표를 따로 들고 있었다.
 */
export const USER_CARD_TONE: Record<
  ChatScheme,
  { muted: string; soft: string; hairline: string }
> = {
  light: {
    muted: "rgba(255,255,255,0.58)",
    soft: "rgba(255,255,255,0.78)",
    hairline: "rgba(255,255,255,0.12)",
  },
  dark: {
    muted: "rgba(23,24,28,0.52)",
    soft: "rgba(23,24,28,0.72)",
    hairline: "rgba(23,24,28,0.09)",
  },
}

/** 사용자 턴 카드 안의 구분선. 두 카드가 같은 두께·같은 톤을 쓴다. */
export function Hairline({ color }: { color: string }) {
  return (
    <V2Box
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: color }}
    />
  )
}
