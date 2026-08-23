/**
 * 상대 시간 표기의 세 가지 실측 결함(`src/features/recipe/utils/timeAgo.ts`).
 *
 * ## 1. 리뷰만 9시간 어긋났다
 *
 * 서버는 타임존 표기가 **없는** UTC 를 준다(`2026-08-20T10:59:07.030000`). ES 명세는
 * 오프셋 없는 date-time 을 **로컬**로 읽으므로, KST 에서 `new Date(raw)` 는 정확히
 * 9시간 이르게 읽힌다 — 한 시간 전에 쓴 리뷰가 "10시간 전", 00:30 에 쓴 리뷰가
 * 전날 날짜로 나온다. 커뮤니티 경로가 전부 멀쩡했던 이유는 그쪽만
 * `parseServerDate` 를 지나기 때문이고, 레시피 리뷰 카드만 맨 `new Date` 였다.
 *
 * ## 2. 행 하나가 목록 전체를 빨간 화면으로 만들었다
 *
 * `Intl.DateTimeFormat.format(Invalid Date)` 는 `RangeError` 를 **던진다.**
 * `parseServerDate(undefined)` 는 Invalid Date 이고 `mapPost` 는 무조건
 * `formatTimeAgo` 를 부르므로, `createdAt` 없는 행 하나가 피드를 통째로 죽였다.
 *
 * ## 3. 작년 글과 지난달 글이 같은 글자였다
 *
 * 7일이 넘으면 월·일만 찍어서 `30일 전`과 `395일 전`이 둘 다 `7월 21일` 이었다.
 * 내 활동 보관함·작성자 프로필처럼 오래된 글이 함께 쌓이는 목록에서는 구분할
 * 방법이 화면에 없었다.
 *
 * ## 왜 여기서 TZ 를 고정하나
 *
 * 1번은 **로컬 오프셋이 0이 아닐 때만** 보이는 결함이다. CI 가 UTC 로 돌면 조용히
 * 통과한다 — 그러면 이 테스트는 아무것도 지키지 않는다. 그래서 KST 로 못 박는다.
 */
/* eslint-disable import/first */
// V8 은 첫 Date 연산 전에 읽은 TZ 를 쓴다. import 보다 위여야 한다.
process.env.TZ = "Asia/Seoul"

import fs from "node:fs"
import path from "node:path"

import { codeOnly } from "./helpers/codeOnly"

/* `communityPostService` 는 로드 순간 `apiClient` → `EXPO_PUBLIC_BACKEND_URL` 을
   요구한다. 여기서 쓰는 것은 순수 함수 `parseServerDate` 하나뿐이라 전송 계층은
   비워 둔다(`tests/communityPostService.test.ts` 와 같은 처방). */
jest.mock("../src/services/core/apiClient", () => ({ api: {} }))

import { parseServerDate } from "../src/features/recipe/services/communityPostService"
import { formatTimeAgo } from "../src/features/recipe/utils/timeAgo"

/** 서버가 실제로 내려주는 모양 — 밀리초 6자리, 오프셋 없음. */
const NAIVE_UTC = "2026-08-20T10:59:07.030000"

const HOUR = 3_600_000
const DAY = 24 * HOUR

describe("KST 에서 서버 시각 읽기", () => {
  it("테스트가 KST 로 돈다 (이 전제가 깨지면 아래 검사는 무의미하다)", () => {
    expect(new Date().getTimezoneOffset()).toBe(-540)
  })

  it("맨 new Date 는 오프셋 없는 문자열을 로컬로 읽어 9시간 이르게 만든다", () => {
    const wrong = new Date(NAIVE_UTC).getTime()
    const right = parseServerDate(NAIVE_UTC).getTime()
    expect(right - wrong).toBe(9 * HOUR)
  })

  it("parseServerDate 는 UTC 로 읽는다", () => {
    expect(parseServerDate(NAIVE_UTC).toISOString()).toBe(
      "2026-08-20T10:59:07.030Z",
    )
  })

  it("한 시간 전 글은 '1시간 전' 이다 (맨 new Date 였다면 '10시간 전')", () => {
    const now = Date.parse("2026-08-20T11:59:07.030Z")
    jest.useFakeTimers().setSystemTime(now)
    try {
      expect(formatTimeAgo(parseServerDate(NAIVE_UTC))).toBe("1시간 전")
      expect(formatTimeAgo(new Date(NAIVE_UTC))).toBe("10시간 전")
    } finally {
      jest.useRealTimers()
    }
  })
})

describe("못 읽는 날짜", () => {
  it("던지지 않는다 — 목록 한 줄이 화면 전체를 죽이면 안 된다", () => {
    expect(() => formatTimeAgo(new Date(NaN))).not.toThrow()
    expect(() =>
      formatTimeAgo(parseServerDate(undefined as never)),
    ).not.toThrow()
  })

  it("아무 말도 하지 않는다 (없는 사실을 지어내지 않는다)", () => {
    expect(formatTimeAgo(new Date(NaN))).toBe("")
    expect(formatTimeAgo(new Date(NaN), "en")).toBe("")
    // "방금 전" 으로 떨어지면 모르는 것을 아는 척하는 것이다.
    expect(formatTimeAgo(new Date(NaN))).not.toBe("방금 전")
  })
})

describe("7일이 넘은 글의 절대 날짜", () => {
  const NOW = Date.parse("2026-08-20T03:00:00.000Z") // KST 정오

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("올해면 연도를 붙이지 않는다", () => {
    expect(formatTimeAgo(new Date(NOW - 30 * DAY))).toBe("7월 21일")
    expect(formatTimeAgo(new Date(NOW - 30 * DAY), "en")).toBe("Jul 21")
  })

  it("해가 다르면 연도를 붙인다", () => {
    expect(formatTimeAgo(new Date(NOW - 395 * DAY))).toBe("2025년 7월 21일")
    expect(formatTimeAgo(new Date(NOW - 395 * DAY), "en")).toBe("Jul 21, 2025")
  })

  it("30일 전과 395일 전이 같은 글자가 아니다", () => {
    expect(formatTimeAgo(new Date(NOW - 30 * DAY))).not.toBe(
      formatTimeAgo(new Date(NOW - 395 * DAY)),
    )
  })

  it("7일 미만은 그대로 상대 표기다", () => {
    expect(formatTimeAgo(new Date(NOW - 3 * DAY))).toBe("3일 전")
    expect(formatTimeAgo(new Date(NOW - 2 * HOUR))).toBe("2시간 전")
    expect(formatTimeAgo(new Date(NOW))).toBe("방금 전")
  })
})

describe("레시피 리뷰 카드", () => {
  const source = codeOnly(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "src/features/recipe/components/detail/ReviewSection.tsx",
      ),
      "utf8",
    ),
  )

  /*
    소스를 훑는 이유: 이 저장소에는 렌더러가 없어 컴포넌트를 그려 볼 수 없다.
    그런데 결함은 `formatTimeAgo` 가 아니라 **거기 넘기기 전에 무엇으로 파싱했는가**
    라, 함수 단위 검사로는 절대 잡히지 않는다(`navigationBackGuard.test.ts` 와 같은 처방).
  */
  it("서버 시각을 맨 new Date 로 읽지 않는다", () => {
    expect(source).not.toMatch(/new Date\(\s*review\.createdAt\s*\)/u)
  })

  it("parseServerDate 를 쓴다", () => {
    expect(source).toMatch(/parseServerDate\(\s*review\.createdAt\s*\)/u)
    expect(source).toMatch(/import \{ parseServerDate \}/u)
  })
})
