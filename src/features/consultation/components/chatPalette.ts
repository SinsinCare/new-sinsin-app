/**
 * 사용자 턴의 잉크 반전 면 팔레트 — 전역 AI 상담 필과 같은 결.
 * 텍스트 버블(ChatMessageBubble)과 식사 카드(FoodConsultCard)가 같은 면을
 * 쓰므로 여기서만 정의한다. 두 파일이 서로 import 하면 순환이 된다.
 */
export const USER_BUBBLE_BG = { light: "#1D1E20", dark: "#F4F4F6" } as const

export const USER_BUBBLE_TEXT = { light: "#FFFFFF", dark: "#17181C" } as const

export type ChatScheme = keyof typeof USER_BUBBLE_BG
