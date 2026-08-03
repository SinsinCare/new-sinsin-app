/**
 * 커뮤니티 실패 알림. `presentError` 위에 **한 가지 예외**만 얹는다.
 *
 * ## "이미 했어요" 는 실패가 아니다
 *
 * 서버가 `COMMUNITY_ERROR_003`(이미 신고한 글) · `011`(이미 신고한 댓글) ·
 * `005`(이미 참여한 투표) 를 줄 때, 사용자가 하려던 일은 **이미 끝나 있다.** 두 번
 * 눌렀을 뿐이다. 신고 버튼은 목록·상세·스토리에 흩어져 있고 접수 여부가 화면에
 * 남지 않아서, 같은 글을 두 번 신고하는 것은 실수가 아니라 정상 동선이다.
 *
 * 그런데 `presentError` 는 모든 실패를 붉은 오류 토스트로 담는다. 그러면 "접수된
 * 신고를 확인하고 있어요" 라는 **안심시키는 문장**이 경고색으로 뜬다. 사용자는 자기가
 * 뭘 잘못했는지 찾게 되고, 실제로 다시 신고를 시도한다 — 토스 원칙 6("~할 수 있어요"로
 * 말하라)이 정확히 막으려는 상황이다.
 *
 * 그래서 여기서 바꾸는 것은 **색과 그릇 하나뿐**이다. 문구는 그대로 카탈로그
 * (`locales/*​/errors.json`)의 것을 쓴다 — 문구를 여기서 다시 적으면 카탈로그와
 * 어긋나는 두 번째 사본이 생긴다.
 */

import { presentError, resolveError } from "@/src/lib/errorMessage"
import type { PresentErrorOptions } from "@/src/lib/errorMessage"
import { showInfoToast } from "@/src/lib/toast"

/**
 * 오류가 아니라 **안내**로 담을 코드.
 *
 * 기준은 하나다 — 사용자가 원하던 상태가 **이미 이루어져 있는가.** 없는 글·지워진
 * 댓글(`001`·`008`)은 여기 들어오지 않는다. 그건 원하던 일이 일어나지 않은 것이고,
 * 새로고침이라는 할 일이 남아 있다.
 */
const REASSURING_CODES = new Set([
  "COMMUNITY_ERROR_003",
  "COMMUNITY_ERROR_005",
  "COMMUNITY_ERROR_011",
])

export function presentCommunityError(
  error: unknown,
  options: PresentErrorOptions = {},
): void {
  const resolved = resolveError(error)
  if (resolved.code && REASSURING_CODES.has(resolved.code)) {
    showInfoToast(resolved.title, resolved.body)
    return
  }
  presentError(error, options)
}
