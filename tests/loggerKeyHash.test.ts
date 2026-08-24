/*
  안드로이드 키 해시는 로그에 **보여야 하는** 값이다.

  카카오 로그인 실패 로그의 `androidKeyHash` 는 "어느 해시가 콘솔에 빠졌는지"를 QA 가
  그대로 읽으라고 심은 값인데(96fb4d5), `SENSITIVE_KEY` 의 `keyhash` 가 그걸
  `[REDACTED]` 로 지워 의도를 죽이고 있었다 — 2026-08-24 `Misconfigured` 진단에서 실측.
  키 해시는 서명 인증서 공개키의 지문이라 APK 를 받으면 누구나 계산할 수 있는 값이고,
  비밀이 아니다. 이 스위트는 그 회귀를 막는다: 해시는 통과, 진짜 비밀은 여전히 차단.
*/
import { logger } from "../src/lib/logger"

describe("logger 는 androidKeyHash 를 지우지 않는다", () => {
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined)

  afterEach(() => consoleError.mockClear())
  afterAll(() => consoleError.mockRestore())

  it("실패 로그의 키 해시가 그대로 남는다", () => {
    logger.error("[Kakao SignIn] login 실패", {
      code: "Misconfigured",
      androidKeyHash: "Xo8WBi6jzSxKDVR4drqm84yr9iU=",
    })

    const output = consoleError.mock.calls
      .map((args) => args.join(" "))
      .join(" ")
    expect(output).toContain("Xo8WBi6jzSxKDVR4drqm84yr9iU=")
    expect(output).not.toContain("[REDACTED]")
  })

  it("키 해시를 살리느라 진짜 비밀까지 열리지는 않았다", () => {
    logger.error("[Kakao SignIn] login 실패", {
      androidKeyHash: "Xo8WBi6jzSxKDVR4drqm84yr9iU=",
      accessToken: "real-secret-token",
      nativeAppKey: "709c22f6c6227095a316851f1f902189",
    })

    const output = consoleError.mock.calls
      .map((args) => args.join(" "))
      .join(" ")
    expect(output).toContain("Xo8WBi6jzSxKDVR4drqm84yr9iU=")
    expect(output).not.toContain("real-secret-token")
    expect(output).not.toContain("709c22f6c6227095a316851f1f902189")
  })
})
