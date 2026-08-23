/**
 * 커뮤니티 실패 알림. **`presentError` 위에 아무것도 얹지 않는다.**
 *
 * ## 예전에 여기 있던 예외
 *
 * 서버가 `COMMUNITY_ERROR_003`(이미 신고한 글) · `011`(이미 신고한 댓글) ·
 * `005`(이미 참여한 투표) 를 줄 때, 사용자가 하려던 일은 **이미 끝나 있다.** 두 번
 * 눌렀을 뿐이다. 그래서 이 파일은 그 셋을 `presentError` **앞에서** 가로채
 * `showInfoToast` 로 보냈다. 색은 맞았지만 대가가 둘 있었다.
 *
 *  1. **계측이 사라졌다.** `app_error_presented` 를 쏘는 지점은
 *     `src/lib/errorMessage/present.ts` 하나뿐이다(`tests/analyticsCrossCutting.test.ts`
 *     의 "통로는 하나다"). 통로를 건너뛴 세 코드는 오류 브레이크다운에 한 행도 남지
 *     않았고, "이미 신고했어요" 가 하루 몇 번 뜨는지 — 즉 신고 버튼이 접수 여부를
 *     안 보여 주는 값이 얼마인지 — 셀 방법이 없었다. 여기서 `trackAnalyticsEvent` 를
 *     한 번 더 부르는 것은 답이 아니다. 그러면 발화 지점이 둘이 되어 위 계약이 깨진다.
 *  2. **호출부의 `refresh` 를 떨궜다.** `005` 의 문구는 "결과는 바로 아래에서 볼 수
 *     있어요" 인데, 조기 반환이 `options.refresh` 를 버려서 그 아래에는 투표 전
 *     라디오 버튼이 그대로 남아 있었다. 문구가 화면과 어긋났다.
 *
 * ## 지금
 *
 * 판정은 **카탈로그**로 옮겼다(`catalog.ts` 의 `INFO_CODES` → `surface: "info"`) 그리고
 * `present.ts` 가 그 판정을 `showInfoToast` 로 보내면서 호출부의 `refresh` 를 그 자리에서
 * 돌린다. 통로 하나로 색·문구·새로고침·계측이 전부 따라온다.
 *
 * 그래서 이 함수에 남은 일은 없다. 이름은 남긴다 — 커뮤니티 화면 여덟 곳이 이 문을
 * 쓰고 있고, 다음 사람이 "커뮤니티 실패는 어디로 가는가" 를 물을 때 읽을 자리가
 * 여기이기 때문이다. **새 예외를 여기 얹지 말 것.** 오류의 판정은 오류 시스템에 있다.
 */

import { presentError } from "@/src/lib/errorMessage"
import type { PresentErrorOptions } from "@/src/lib/errorMessage"

export function presentCommunityError(
  error: unknown,
  options: PresentErrorOptions = {},
): void {
  presentError(error, options)
}
