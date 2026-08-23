/**
 * **"이미 했어요" 는 실패가 아니다** — 그리고 그 예외가 계측에 구멍을 내서도 안 된다.
 *
 * 세 코드(`COMMUNITY_ERROR_003` 이미 신고한 글 · `005` 이미 참여한 투표 ·
 * `011` 이미 신고한 댓글)는 붉은 오류가 아니라 안내 토스트로 담긴다. 사용자가 하려던
 * 일이 **이미 끝나 있는** 상황이라 그건 옳다.
 *
 * 한때 그 갈래는 `presentCommunityError` 가 `presentError` **앞에서** 가로챘고, 그래서
 * `presentError` 를 지나지 않았다. `app_error_presented` 를 쏘는 지점은
 * `src/lib/errorMessage/present.ts` **하나**이고(우연이 아니라
 * `tests/analyticsCrossCutting.test.ts` 의 "통로는 하나다" 가 `app/`·`src/` 전체를 훑어
 * 못 박아 둔 계약이다), 세 코드는 오류 브레이크다운에 한 행도 안 남았다. 지금은 판정이
 * `catalog.ts`(`INFO_CODES` → `surface: "info"`)로 옮겨졌고 `present.ts` 가 그 판정을
 * `showInfoToast` 로 보낸다 — 통로 하나로 색과 계측이 같이 따라온다.
 *
 * 이 파일이 고정하는 것 넷:
 *  1. 세 코드는 **안내**로 담긴다(붉은 토스트가 아니다).
 *  2. 그러면서도 `app_error_presented` 가 **정확히 한 번** 나간다 — 안내는 계측의
 *     사각지대가 아니다.
 *  3. 나머지도 평소 통로로 가고 한 번만 세어진다(조용한 실패도 센다 — 안 보였다는
 *     사실 자체가 정보다).
 *  4. 이 유틸은 그 이벤트를 **직접 쏘지 않는다.** 여기서 한 번 더 쏘면 통로가 둘이
 *     되어 위 계약이 깨진다. 판정이 사는 자리는 오류 시스템 쪽이다.
 */
/* eslint-disable import/first */
jest.mock("@/src/lib/toast", () => ({
  showInfoToast: jest.fn(),
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}))

jest.mock("@/src/lib/dialog", () => ({
  showAlert: jest.fn(() => Promise.resolve(true)),
  showConfirm: jest.fn(() => Promise.resolve(false)),
  showActionSheet: jest.fn(() => Promise.resolve(null)),
}))

jest.mock("@/src/features/analytics", () => ({
  ...jest.requireActual("@/src/features/analytics"),
  trackAnalyticsEvent: jest.fn(),
}))

import { readFileSync } from "node:fs"
import { join } from "node:path"

import "@/src/i18n"

import { trackAnalyticsEvent } from "@/src/features/analytics"
import { ApiError } from "@/src/services/core/apiError"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import { showErrorToast, showInfoToast } from "@/src/lib/toast"

const REASSURING = [
  "COMMUNITY_ERROR_003",
  "COMMUNITY_ERROR_005",
  "COMMUNITY_ERROR_011",
] as const

const errorPresentedCalls = () =>
  (trackAnalyticsEvent as jest.Mock).mock.calls.filter(
    ([name]) => name === "app_error_presented",
  )

beforeEach(() => {
  jest.clearAllMocks()
})

describe("커뮤니티 실패 알림", () => {
  it.each(REASSURING)("%s 는 붉은 오류가 아니라 안내로 담긴다", (code) => {
    presentCommunityError(new ApiError("이미 처리했습니다.", code, 409))

    expect(showInfoToast).toHaveBeenCalledTimes(1)
    expect(showErrorToast).not.toHaveBeenCalled()
  })

  it.each(REASSURING)("%s 도 통로를 지나며 정확히 한 번 세어진다", (code) => {
    presentCommunityError(new ApiError("이미 처리했습니다.", code, 409))

    const calls = errorPresentedCalls()
    expect(calls).toHaveLength(1)
    // 그릇이 `info` 라는 사실 자체가 브레이크다운의 한 축이다 — 안내와 오류를 나눠 센다.
    expect(calls[0][1]).toMatchObject({ code, surface: "info", silent: false })
  })

  it("이미 참여한 투표는 화면을 지금 상태로 맞춘다 (문구가 한 약속)", () => {
    /*
      `005` 의 문구는 "결과는 바로 아래에서 볼 수 있어요" 다. 새로고침이 돌지 않으면
      그 아래에는 여전히 투표 전 라디오 버튼이 남아, 문구가 화면과 어긋난다.
      예전 구현은 조기 반환하면서 `options.refresh` 를 통째로 떨궜다.
    */
    const refresh = jest.fn()
    presentCommunityError(
      new ApiError("이미 참여했습니다.", "COMMUNITY_ERROR_005", 409),
      { scope: "community-post-vote", refresh },
    )

    expect(refresh).toHaveBeenCalledTimes(1)
    // 누르지 않은 버튼을 눌렀다고 세지 않는다 — 안내는 버튼을 그리지 않는다.
    const pressed = (trackAnalyticsEvent as jest.Mock).mock.calls.filter(
      ([name]) => name === "app_error_action_pressed",
    )
    expect(pressed).toHaveLength(0)
  })

  it("신고 계열 안내는 새로고침을 부르지 않는다", () => {
    // `003`·`011` 에는 새로고침이라는 할 일이 없다. 호출부가 줘도 돌지 않아야 한다.
    const refresh = jest.fn()
    presentCommunityError(
      new ApiError("이미 신고했습니다.", "COMMUNITY_ERROR_003", 409),
      { refresh },
    )

    expect(refresh).not.toHaveBeenCalled()
  })

  it("안내가 아닌 코드는 평소 통로로 가고 한 번만 세어진다", () => {
    // `001`(없는 글)은 안내가 아니다 — 새로고침이라는 할 일이 남아 있다.
    presentCommunityError(
      new ApiError("없는 글입니다.", "COMMUNITY_ERROR_001", 404),
    )

    expect(showInfoToast).not.toHaveBeenCalled()
    const calls = errorPresentedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toMatchObject({
      code: "COMMUNITY_ERROR_001",
      silent: false,
    })
  })

  it("조용한 실패도 통로를 지나며 세어진다", () => {
    presentCommunityError(
      new ApiError("canceled", "ERR_CANCELED", undefined, true),
    )

    // 화면에는 아무것도 안 그리지만, 안 보였다는 사실 자체가 정보다.
    expect(showInfoToast).not.toHaveBeenCalled()
    expect(showErrorToast).not.toHaveBeenCalled()
    const calls = errorPresentedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toMatchObject({ silent: true })
  })

  it("이 유틸은 app_error_presented 를 직접 쏘지 않는다(통로는 하나다)", () => {
    /*
      안내 갈래의 계측 공백(003·005·011)을 여기서 `trackAnalyticsEvent` 로 메우면
      발화 지점이 둘이 되어 `analyticsCrossCutting.test.ts` 의 "통로는 하나다" 가
      깨진다. 실측으로 확인한 실패다. 그래서 메운 자리는 `catalog.ts`+`present.ts`
      쪽이고, 여기서는 그 길을 막아 둔다.
    */
    const source = readFileSync(
      join(__dirname, "..", "src/features/recipe/utils/communityError.ts"),
      "utf-8",
    )
    expect(source).not.toMatch(/trackAnalyticsEvent\(\s*"app_error_presented"/u)
    /*
      토스트를 **직접 들이지도 않는다.** 예전 예외 갈래가 `showInfoToast` 를 여기로
      들여와 `presentError` 앞에서 그렸고, 그 한 줄이 계측 구멍과 `refresh` 유실을
      같이 만들었다. 그릇을 고르는 일이 이 파일로 돌아오는 길을 막아 둔다.
    */
    expect(source).not.toMatch(/from\s+"@\/src\/lib\/toast"/u)
  })
})
