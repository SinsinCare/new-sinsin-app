import type { ChatStreamError } from "@/src/types/chat"

/**
 * 원인을 모를 때의 마지막 문장. 두 자리에서 쓴다 — 되돌릴 수 없는 스트림 실패,
 * 그리고 대화 생성 실패의 폴백(`useChat.createChatUnavailableMessage`).
 *
 * "연결이 잠시 불안정할 수 있으니" 를 걷어냈다. 이 자리에 오는 실패의 상당수는 연결과
 * 무관한데(만료된 로그인, 서버 점검) 사용자는 고칠 수 없는 자기 와이파이를 보러 갔다.
 * 원인을 아는 실패는 `resolveError` 가 먼저 가져가므로, 여기 남는 것은 **정말 모르는
 * 경우**뿐이다. 그때는 원인을 지어내는 대신 다음 한 걸음만 말한다.
 */
export const CHAT_UNAVAILABLE_MESSAGE =
  "지금은 답변을 받지 못했어요. 아래 ‘답변 다시 받기’를 눌러 주세요."
export const CHAT_UNAVAILABLE_MESSAGE_EN =
  "I couldn’t get an answer just now. Tap “Get a new answer” below."

export function streamFailureMessage(
  error: ChatStreamError,
  language: string = "ko",
): string {
  const isEnglish = language.toLowerCase().startsWith("en")
  if (isEnglish) {
    if (error.code === "MAX_TOKENS" || error.finishReason === "MAX_TOKENS") {
      return "The answer stopped before it was complete. Tap “Get a new answer” below so you don’t rely on a partial health answer."
    }
    if (error.code === "TIMEOUT") {
      return "This answer took too long to finish. Tap “Get a new answer” below."
    }
    if (error.code === "INCOMPLETE_STREAM") {
      return "The connection dropped before the answer was complete. Tap “Get a new answer” below."
    }
    if (error.retryable) {
      return "The connection got interrupted. Tap “Get a new answer” below."
    }
    return CHAT_UNAVAILABLE_MESSAGE_EN
  }

  const suffix =
    error.code === "MAX_TOKENS" || error.finishReason === "MAX_TOKENS"
      ? "답변이 길어 중간에 멈췄어요. 아래 ‘답변 다시 받기’를 눌러 새 답변을 받아 보세요."
      : error.code === "TIMEOUT"
        ? "답변을 준비하는 데 시간이 오래 걸렸어요. 아래 ‘답변 다시 받기’를 눌러 주세요."
        : error.code === "INCOMPLETE_STREAM"
          ? "답변을 받던 중 연결이 끊겼어요. 아래 ‘답변 다시 받기’를 눌러 주세요."
          : error.retryable
            ? "연결이 잠시 불안정해 답변을 받지 못했어요. 아래 ‘답변 다시 받기’를 눌러 주세요."
            : CHAT_UNAVAILABLE_MESSAGE

  // 의료 답변은 완료 전에 끊기면 부정어·조건·제한 고지가 빠질 수 있다.
  // 구형 서버가 partialContent를 보내더라도 화면에는 실패 안내만 남긴다.
  return suffix
}
