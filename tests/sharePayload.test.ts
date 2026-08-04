/**
 * 공유 payload 규칙(`shared/utils/share.ts`).
 *
 * 이 파일이 지키는 것은 하나다 — **링크를 주면 어느 플랫폼에서도 링크가 나간다.**
 *
 * RN 의 `Share.share({message, url})` 에서 안드로이드는 `url` 을 통째로 무시한다.
 * 그 사실을 화면마다 기억해야 했던 시절에는 링크가 빠진 채 이름만 공유됐다
 * (QA 2026-08-05 "오직 음식 이름만 텍스트로 공유"). 네이티브 없이 도는 순수 함수라
 * 이 회귀를 CI 가 잡는다.
 */
import { buildSharePayload } from "../src/shared/utils/sharePayload"

describe("공유 payload", () => {
  const input = { body: "잡채덮밥", link: "sinsin:///recipe/164" }

  test("iOS 는 링크를 url 로 따로 받는다 — 공유 시트가 미리보기를 그린다", () => {
    expect(buildSharePayload(input, "ios")).toEqual({
      message: "잡채덮밥",
      url: "sinsin:///recipe/164",
    })
  })

  test("안드로이드는 url 을 무시하므로 본문에 붙인다", () => {
    const payload = buildSharePayload(input, "android")
    expect(payload.url).toBeUndefined()
    expect(payload.message).toBe("잡채덮밥\nsinsin:///recipe/164")
  })

  test("어느 플랫폼이든 링크는 반드시 전달된다", () => {
    for (const os of ["ios", "android"] as const) {
      const payload = buildSharePayload(input, os)
      const sent = `${payload.message} ${payload.url ?? ""}`
      expect(sent).toContain("sinsin:///recipe/164")
    }
  })

  test("링크가 없으면 텍스트만 — 빈 줄이나 undefined 를 붙이지 않는다", () => {
    expect(buildSharePayload({ body: "오늘 기록" }, "android")).toEqual({
      message: "오늘 기록",
    })
    expect(buildSharePayload({ body: "오늘 기록" }, "ios")).toEqual({
      message: "오늘 기록",
    })
  })

  test("본문이 비면 링크만 보낸다 — 안드로이드에서 앞에 개행이 남지 않는다", () => {
    expect(buildSharePayload({ body: "  ", link: "https://x.test" }, "android")).toEqual(
      { message: "https://x.test" },
    )
  })

  test("제목은 안드로이드 공유 시트용으로 함께 실린다", () => {
    expect(buildSharePayload({ ...input, title: "레시피" }, "android").title).toBe(
      "레시피",
    )
  })
})
