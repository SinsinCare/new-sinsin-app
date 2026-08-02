/**
 * 진입 URL 검사(`app/+native-intent.tsx` 가 쓴다).
 *
 * 이 검사가 지키는 두 가지 반대 방향의 실패:
 *  1. **못 살린 딥링크** — 멀쩡한 링크를 홈으로 삼켜 버리면 푸시·공유 링크가 죽는다.
 *  2. **못 막은 막다른 길** — 없는 경로를 통과시키면 `Unmatched` 화면에 갇힌다.
 *
 * 특히 로그인 SDK 콜백(`kakao…://oauth`, `com.googleusercontent…:/oauth2redirect`)을
 * 건드리면 **로그인이 깨진다.** 그것들은 우리 스킴이 아니므로 무조건 통과여야 한다.
 */
import {
  isKnownRoutePath,
  isRoutableEntryUrl,
} from "../src/shared/navigation/entryIntent"

describe("known route paths", () => {
  it("accepts the app's own URLs", () => {
    expect(isKnownRoutePath("/")).toBe(true)
    expect(isKnownRoutePath("/home")).toBe(true)
    expect(isKnownRoutePath("/recipe/12")).toBe(true)
    expect(isKnownRoutePath("/restaurant/317/photos")).toBe(true)
    // `(settings)` 는 URL 에서 사라진다 — 유니버설 링크가 실제로 쓰는 모양이다.
    expect(isKnownRoutePath("/password-edit")).toBe(true)
    expect(isKnownRoutePath("/announcement-detail")).toBe(true)
    // `(write)` 도 마찬가지.
    expect(isKnownRoutePath("/free/new")).toBe(true)
  })

  it("accepts the tab URLs (그룹이 지워진 모양)", () => {
    // `(tabs)/restaurant` 의 URL 은 `/restaurant` 다 — 식당 **상세**(`/restaurant/317`)
    // 와 한 글자 차이라 둘 다 통과해야 한다.
    expect(isKnownRoutePath("/restaurant")).toBe(true)
    expect(isKnownRoutePath("/restaurant/317")).toBe(true)
  })

  it("rejects paths no screen answers", () => {
    expect(isKnownRoutePath("/recipe/12/nope")).toBe(false)
    expect(isKnownRoutePath("/totally-made-up")).toBe(false)
    expect(isKnownRoutePath("/restaurant/317/nope")).toBe(false)
  })

  it("does not let a dynamic segment swallow a deeper path", () => {
    // `/recipe/[id]` 는 한 칸짜리다. 두 칸이 오면 맞지 않아야 한다.
    expect(isKnownRoutePath("/recipe/12/steps/3")).toBe(false)
  })
})

describe("entry url triage", () => {
  it("routes our own deep links", () => {
    expect(isRoutableEntryUrl("sinsin://recipe/12")).toBe(true)
    expect(isRoutableEntryUrl("sinsin:///recipe/12")).toBe(true)
    expect(isRoutableEntryUrl("https://sinsincare.kr/password-edit")).toBe(true)
    expect(isRoutableEntryUrl("sinsin://recipe/12?from=push")).toBe(true)
  })

  it("routes the dev client's wrapped path", () => {
    expect(isRoutableEntryUrl("exp://192.168.0.2:8081/--/recipe/12")).toBe(true)
    expect(isRoutableEntryUrl("exp://192.168.0.2:8081/--/nope/nope")).toBe(
      false,
    )
  })

  it("ignores our URLs that point at nothing", () => {
    // 없는 화면에서 시작하면 `+not-found` 에 갇힌다. 리로드마다 되살아나므로
    // 한 번의 잘못된 URL 이 앱을 묶어 둔다.
    expect(isRoutableEntryUrl("sinsin://totally-made-up")).toBe(false)
    expect(isRoutableEntryUrl("https://sinsincare.kr/old-marketing-page")).toBe(
      false,
    )
  })

  it("treats a bare app launch as the entry route", () => {
    expect(isRoutableEntryUrl("sinsin://")).toBe(true)
    expect(isRoutableEntryUrl("")).toBe(true)
    // `/--/` 없는 dev URL 은 메트로 주소일 뿐 경로가 아니다. 이걸 경로로 읽으면
    // dev 에서 앱을 켤 때마다 진입이 삼켜진 것처럼 보인다.
    expect(isRoutableEntryUrl("exp://192.168.0.2:8081")).toBe(true)
    expect(isRoutableEntryUrl("exp://192.168.0.2:8081/")).toBe(true)
  })

  it("never routes another app's URL", () => {
    /* 소셜 로그인 콜백은 SDK 가 네이티브에서 처리한다. 라우터가 이것을 경로로 읽으면
       콜백이 돌아온 순간 `+not-found` 로 튄다. 게다가 이 URL 은 네이티브 싱글턴에
       남아서, **다음 리로드의 시작 지점**이 된다(`entryIntent.ts` 머리말). */
    expect(isRoutableEntryUrl("kakao1234567890://oauth")).toBe(false)
    expect(
      isRoutableEntryUrl("com.googleusercontent.apps.879:/oauth2redirect"),
    ).toBe(false)
    expect(isRoutableEntryUrl("https://accounts.google.com/o/oauth2/x")).toBe(
      false,
    )
    // 우리 도메인처럼 보이는 남의 도메인.
    expect(
      isRoutableEntryUrl("https://sinsincare.kr.evil.example/recipe"),
    ).toBe(false)
  })
})
