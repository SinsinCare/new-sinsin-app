/**
 * 에러 안내 시스템의 계약을 고정한다.
 *
 * 지키려는 것은 하나다 — **"인터넷 연결을 확인하세요" 는 응답이 오지 않았을 때만
 * 나온다.** 그 문구가 400·404·409·5xx 자리에까지 퍼져 있던 것이 이 시스템을 만든
 * 이유다. 아래 `never blames the network` 테스트가 그걸 코드 전체에 대해 확인한다.
 */

import i18n from "@/src/i18n"
import { ApiError } from "@/src/services/core/apiError"
import { resolveError } from "@/src/lib/errorMessage/resolve"
import { getErrorBehavior } from "@/src/lib/errorMessage/catalog"
import enErrors from "@/src/i18n/locales/en/errors.json"
import koErrors from "@/src/i18n/locales/ko/errors.json"

/**
 * TS 백엔드(`sinsin-be-bun/src/http/codes.generated.ts`)의 에러 코드 전부.
 * 서버에 코드가 늘면 이 목록에 추가하고 `errors.json` 에 문구를 쓴다 —
 * 그 전까지는 서버 문구가 그대로 나가고, 해결 버튼은 붙지 않는다.
 */
const BACKEND_ERROR_CODES = [
  "COMMON_ERROR_001",
  "COMMON_ERROR_002",
  "COMMON_ERROR_003",
  "COMMON_ERROR_004",
  "COMMON_ERROR_005",
  "TOKEN_ERROR_001",
  "TOKEN_ERROR_002",
  "TOKEN_ERROR_003",
  "TOKEN_ERROR_004",
  "TOKEN_ERROR_005",
  "TOKEN_ERROR_006",
  "LOGIN_ERROR_001",
  "SIGNUP_ERROR_001",
  "SIGNUP_ERROR_002",
  "SIGNUP_ERROR_003",
  "SIGNUP_ERROR_004",
  "MAIL_ERROR_001",
  "MAIL_ERROR_002",
  "OTP_ERROR_001",
  "OTP_ERROR_002",
  "OTP_ERROR_003",
  "AUTH_ERROR_001",
  "AUTH_ERROR_002",
  "AUTH_ERROR_003",
  "AUTH_ERROR_004",
  "AUTH_ERROR_005",
  "AUTH_ERROR_006",
  "AUTH_ERROR_007",
  "AUTH_ERROR_008",
  "AUTH_ERROR_009",
  "AUTH_ERROR_010",
  "AUTH_ERROR_011",
  "AUTH_ERROR_012",
  "CHAT_ERROR_001",
  "CHAT_ERROR_002",
  "CHAT_ERROR_004",
  "ONBOARDING_ERROR_001",
  "ONBOARDING_ERROR_002",
  "ONBOARDING_ERROR_003",
  "WITHDRAW_ERROR_001",
  "COMMUNITY_ERROR_001",
  "COMMUNITY_ERROR_002",
  "COMMUNITY_ERROR_003",
  "COMMUNITY_ERROR_004",
  "COMMUNITY_ERROR_005",
  "COMMUNITY_ERROR_006",
  "COMMUNITY_ERROR_007",
  "COMMUNITY_ERROR_008",
  "COMMUNITY_ERROR_009",
  "COMMUNITY_ERROR_010",
  "COMMUNITY_ERROR_011",
  "COMMUNITY_ERROR_012",
  "COMMUNITY_ERROR_013",
  "COMMUNITY_ERROR_014",
  "FOOD_CAMERA_001",
  "FOOD_CAMERA_002",
  "FOOD_CAMERA_003",
  "FOOD_CAMERA_004",
  "FOOD_CAMERA_005",
  "FOOD_CAMERA_006",
  "FOOD_CAMERA_007",
  "FOOD_CAMERA_008",
  "FOOD_CAMERA_009",
  "FOOD_CAMERA_010",
  "FOOD_CAMERA_011",
  "FOOD_CAMERA_013",
  "FOOD_CAMERA_015",
  "HC_ERROR_001",
  "HC_ERROR_002",
  "HC_ERROR_003",
  "HC_ERROR_004",
  "HC_ERROR_005",
  "HC_ERROR_006",
  "HC_ERROR_007",
  "DOCTOR_ERROR_001",
  "DOCTOR_ERROR_002",
  "DOCTOR_ERROR_003",
  "BILLING_ERROR_001",
  "BILLING_ERROR_002",
  "BILLING_ERROR_003",
  "DOCTOR_ERROR_004",
] as const

/** 연결을 언급하는 표현. 이 단어가 나와도 되는 자리는 `offline` 하나뿐이다. */
const BLAMES_NETWORK = /인터넷|와이파이|Wi-?Fi|mobile data|데이터가 켜져/i

describe("error catalog", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("covers every backend error code in both languages", () => {
    const missingKo = BACKEND_ERROR_CODES.filter((code) => !koErrors.code[code])
    const missingEn = BACKEND_ERROR_CODES.filter((code) => !enErrors.code[code])

    expect(missingKo).toEqual([])
    expect(missingEn).toEqual([])
  })

  it("keeps Korean and English catalog keys in parity", () => {
    expect(Object.keys(enErrors.code).sort()).toEqual(
      Object.keys(koErrors.code).sort(),
    )
    expect(Object.keys(enErrors.action).sort()).toEqual(
      Object.keys(koErrors.action).sort(),
    )
    expect(Object.keys(enErrors.transport).sort()).toEqual(
      Object.keys(koErrors.transport).sort(),
    )
  })

  /*
    토스 원칙 3 — "스스로 해결할 수 있는 방법 알려주기". 제목이 무슨 일이 있었는지를
    말한다면 본문은 다음에 뭘 하면 되는지를 말해야 한다. 본문 없는 항목이 생기면
    그건 "실패했다" 만 남기는 문구다.
  */
  it("gives every code a next step, not just a diagnosis", () => {
    const withoutBody = BACKEND_ERROR_CODES.filter(
      (code) => !koErrors.code[code]?.body?.trim(),
    )

    expect(withoutBody).toEqual([])
  })

  it("labels every action it can attach", () => {
    const actions = BACKEND_ERROR_CODES.map(
      (code) => getErrorBehavior(code).action,
    ).filter((action): action is NonNullable<typeof action> => action !== null)

    for (const action of new Set(actions)) {
      expect(koErrors.action[action]).toBeTruthy()
      expect(enErrors.action[action]).toBeTruthy()
    }
  })

  /*
    이 테스트가 원래 결함을 직접 잡는다. 사진의 제보("이미 가입한 이메일인데
    인터넷 연결을 확인하라고 뜬다")가 바로 이 규칙 위반이었다.
  */
  it("never blames the network outside a connection failure", () => {
    for (const code of BACKEND_ERROR_CODES) {
      const entry = koErrors.code[code]
      const text = `${entry.title} ${entry.body}`
      expect({ code, text }).toEqual({
        code,
        text: expect.not.stringMatching(BLAMES_NETWORK),
      })
    }
    for (const [key, entry] of Object.entries(koErrors.transport)) {
      if (key === "offline") continue
      expect({ key, text: `${entry.title} ${entry.body}` }).toEqual({
        key,
        text: expect.not.stringMatching(BLAMES_NETWORK),
      })
    }
  })
})

describe("resolveError", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("separates a dropped connection from a slow one", () => {
    const offline = resolveError(
      new ApiError("Network Error", "ERR_NETWORK", undefined, true),
    )
    const timeout = resolveError(
      new ApiError(
        "timeout of 10000ms exceeded",
        "ECONNABORTED",
        undefined,
        true,
      ),
    )

    expect(offline.kind).toBe("offline")
    expect(offline.title).toBe("연결이 닿지 않았어요")
    expect(timeout.kind).toBe("timeout")
    expect(timeout.title).toBe("응답이 늦어지고 있어요")
    expect(timeout.body).not.toMatch(BLAMES_NETWORK)
  })

  /*
    화면 이동·검색어 변경으로 취소된 요청까지 토스트를 띄우던 것이 "인터넷 연결을
    확인하세요" 가 아무 이유 없이 뜨던 원인 중 하나였다. 사용자가 한 일의 결과가
    아니므로 아무것도 그리지 않는다.
  */
  it("stays silent when we cancelled the request ourselves", () => {
    const resolved = resolveError(
      new ApiError("canceled", "ERR_CANCELED", undefined, true),
    )

    expect(resolved.silent).toBe(true)
    expect(resolved.kind).toBe("canceled")
  })

  it("does not blame the network for a server fault", () => {
    const resolved = resolveError(new ApiError("", "HTTP_503", 503))

    expect(resolved.kind).toBe("server")
    expect(`${resolved.title} ${resolved.body}`).not.toMatch(BLAMES_NETWORK)
    expect(resolved.action).toBe("retry")
  })

  /*
    사진의 제보 그 자체. `SIGNUP_ERROR_001` 은 "다른 이메일을 입력하거나 로그인해
    주세요" 라는 두 갈래를 던져 놓고 어느 쪽도 눌러 주지 않았다. 지금은 로그인이라는
    선택지가 있으므로 다이얼로그 + 버튼으로 나간다(토스 원칙 2·5).
  */
  it("turns an already-registered email into a one-tap sign-in", () => {
    const resolved = resolveError(
      new ApiError("이미 가입된 이메일입니다.", "SIGNUP_ERROR_001", 400),
    )

    expect(resolved.title).toBe("이미 가입된 이메일이에요")
    expect(resolved.body).toContain("로그인")
    expect(resolved.action).toBe("goLogin")
    expect(resolved.surface).toBe("dialog")
  })

  it("replaces vendor jargon with something a patient can act on", () => {
    const resolved = resolveError(
      new ApiError("CODEF 요청에 실패했습니다.", "HC_ERROR_005", 502),
    )

    expect(resolved.title).not.toContain("CODEF")
    expect(resolved.title).toBe("검진 기관에서 결과를 받지 못했어요")
    expect(resolved.action).toBe("retry")
  })

  /*
    서버는 로그인 실패에도 401 을 준다(`LOGIN_ERROR_001`). 401 을 상태코드만 보고
    세션 만료로 처리하면, 비밀번호를 틀린 사람이 **로그인 화면에 서서** "다시
    로그인해 주세요" 를 읽는다. 코드가 상태코드를 이겨야 한다.
  */
  it("reads a 401 login failure as a wrong password, not an expired session", () => {
    const resolved = resolveError(
      new ApiError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        "LOGIN_ERROR_001",
        401,
      ),
    )

    expect(resolved.kind).not.toBe("sessionExpired")
    expect(resolved.title).toBe("이메일 또는 비밀번호가 맞지 않아요")
    expect(resolved.action).toBe("resetPassword")
  })

  it("still treats a 401 we have no code for as an expired session", () => {
    const resolved = resolveError(new ApiError("", "HTTP_401", 401))

    expect(resolved.kind).toBe("sessionExpired")
    expect(resolved.action).toBe("goLogin")
  })

  it("does not offer a retry for something retrying cannot fix", () => {
    const resolved = resolveError(
      new ApiError("게시글을 찾을 수 없습니다.", "COMMUNITY_ERROR_001", 404),
    )

    expect(resolved.retryable).toBe(false)
    expect(resolved.action).toBe("refresh")
  })

  it("switches the whole catalog with the app language", async () => {
    await i18n.changeLanguage("en")
    const resolved = resolveError(
      new ApiError("이미 가입된 이메일입니다.", "SIGNUP_ERROR_001", 400),
    )

    expect(resolved.title).toBe("This email already has an account")
    expect(resolved.body).toBeTruthy()
    expect(resolved.body).not.toMatch(/[가-힣]/)
  })
})
