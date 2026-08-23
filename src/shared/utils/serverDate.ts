/**
 * 서버 시각 문자열 → `Date`. **오프셋 표기가 없으면 UTC 로 읽는다.**
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 왜 필요한가 (실측)
 *
 * 서버는 타임존 표기가 **없는** UTC 를 준다(`2026-08-20T10:59:07.030000`).
 * ES 명세는 오프셋 없는 date-time 을 **로컬**로 읽으므로, KST 에서 `new Date(raw)` 는
 * 정확히 9시간 이르게 읽힌다 — 한 시간 전에 쓴 후기가 `10시간 전`, 00:30 에 쓴 것이
 * 전날 날짜로 나온다. (`YYYY-MM-DD` 같은 날짜만 있는 문자열은 명세가 UTC 로 읽으므로
 * 이 함수의 대상이 아니다 — 그런 값은 손대지 말 것.)
 *
 * ■ 이미 `Z`/`+09:00` 이 붙어 온 값은 건드리지 않는다
 *
 * 거기에 `Z` 를 한 번 더 붙이면 **반대 방향으로 9시간** 어긋난다. 그래서 판정은
 * "오프셋 표기가 없을 때만" 이고, 그 조건을 정규식 하나로 못 박아 둔다.
 *
 * ■ 여기 있는 이유 (레시피 서비스에서 부르지 않고)
 *
 * 이 함수는 원래 `src/features/recipe/services/communityPostService.ts` 에 있었다. 그런데
 * 그 모듈은 로드 순간 `@/src/services/core/apiClient`(axios + `EXPO_PUBLIC_BACKEND_URL`)를
 * 끌고 온다. `src/types/chat.ts` 는 오늘 **임포트가 하나도 없는** 순수 모듈이고
 * 식당·설정 화면도 전송 계층과 무관하므로, 거기서 커뮤니티 서비스를 들여오면
 * (1) 기능 간 의존이 거꾸로 서고 (2) 그 타입/유틸을 쓰는 테스트 스위트가 전부
 * `jest.mock("…/apiClient")` 없이는 로드 단계에서 죽는다.
 *
 * 그래서 **정본은 여기**(순수, 의존 0)다. 커뮤니티 서비스 쪽 사본은 지웠고, 그 자리는
 * 이 파일을 다시 내보내기만 한다(`export { parseServerDate }`) — 기존 임포트
 * (`ReviewSection` · `communityStoryService`)를 살려 두기 위한 다리다. **함수는 한 벌,
 * 참조도 한 개**이므로 두 벌이 갈라질 방법 자체가 없다. 그 사실과 이 파서의 동작을
 * `tests/serverDateParity.test.ts` 가 못 박는다.
 */

/** 오프셋(`Z`·`+09:00`·`-0500`) 표기가 끝에 붙어 있는가. */
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/iu

/** `2026-08-20T10:59` 처럼 **시각까지** 있는 ISO date-time 인가. */
const HAS_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u

export function parseServerDate(value: string | number | Date): Date {
  if (value instanceof Date) return value
  if (
    typeof value === "string" &&
    HAS_TIME.test(value) &&
    !HAS_OFFSET.test(value)
  ) {
    return new Date(`${value}Z`)
  }
  return new Date(value)
}
