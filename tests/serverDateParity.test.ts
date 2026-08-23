/**
 * **서버 시각 파서는 이제 한 벌이다.** 이 파일은 그 사실과 그 한 벌의 동작을 못 박는다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 이 파일은 원래 "두 벌이 갈라지지 않는가" 를 재던 자리였다
 *
 * `parseServerDate` 가 `src/shared/utils/serverDate.ts`(정본)와
 * `src/features/recipe/services/communityPostService.ts`(사본) 두 곳에 있었고, 여기서는
 * 12가지 입력에 대해 두 벌의 답이 같은지만 봤다. 그 검사는 **합쳐질 때까지의 임시물**
 * 이었다 — 사본이 사라지면 `canonical(x) === recipeCopy(x)` 는 같은 함수를 두 번 부르는
 * 동어반복이 되어 아무것도 못 막는다.
 *
 * 합쳤으므로(사본 → `export { parseServerDate }` 재수출), 검사를 두 가지로 갈아 끼웠다.
 * 커버리지는 줄지 않는다 — 오히려 **입력마다 기대값을 직접 적으므로** 늘어난다.
 * 예전 파리티는 "둘 다 똑같이 틀려도" 통과했다.
 *
 *  1. **구조** — 커뮤니티 쪽 이름이 정본과 **같은 함수 참조**인가(`toBe`). 누군가 사본을
 *     다시 만들면(붙여넣기·되돌리기) 그 순간 여기서 걸린다. 값 비교로는 못 잡는 회귀다.
 *  2. **동작** — 예전 파리티가 쓰던 **그 입력들 그대로**, 이번에는 정본의 답을 하나씩
 *     못 박는다. 오프셋 없는 값만 UTC 로 읽고 나머지는 손대지 않는다는 계약이다.
 *
 * ■ 이 검사가 없으면
 *
 * 한쪽만 고치는 순간 "커뮤니티 피드는 맞는데 후기만 아홉 시간 어긋난다" 가 **다시**
 * 생긴다. 그게 정확히 이 파서가 생겨난 이유다.
 */
/* eslint-disable import/first */
process.env.TZ = "Asia/Seoul"

/* 커뮤니티 서비스는 로드만 해도 전송 계층을 끌고 온다 — 여기서 필요한 것은 이름 하나뿐
   이라 비워 둔다(`tests/communityPostService.test.ts`·`tests/timeAgoFormat.test.ts` 와
   같은 처방). */
jest.mock("../src/services/core/apiClient", () => ({ api: {} }))

import { parseServerDate as canonical } from "../src/shared/utils/serverDate"
import { parseServerDate as viaCommunity } from "../src/features/recipe/services/communityPostService"

/**
 * 실제로 오가는 모양 + 경계값. 기대값은 **UTC ISO** 로 적는다(로컬 TZ 와 무관하게 읽히게).
 * `null` 은 "읽을 수 없다"(Invalid Date) 를 뜻한다.
 */
const CASES: readonly (readonly [
  label: string,
  input: string | number | Date,
  expectedIso: string | null,
])[] = [
  // 서버 기본형 — 오프셋 표기가 없다. 여기가 이 파서의 존재 이유다.
  [
    "서버 기본형(마이크로초 6자리)",
    "2026-08-20T10:59:07.030000",
    "2026-08-20T10:59:07.030Z",
  ],
  ["초까지만", "2026-08-19T15:30:00", "2026-08-19T15:30:00.000Z"],
  ["분까지만", "2026-08-19T23:00", "2026-08-19T23:00:00.000Z"],
  // 이미 오프셋이 붙은 값 — 한 번 더 붙이면 **반대 방향으로** 9시간 어긋난다.
  ["이미 Z", "2026-08-20T10:59:07.030Z", "2026-08-20T10:59:07.030Z"],
  [
    "이미 오프셋(콜론 있음)",
    "2026-08-20T19:59:07.030+09:00",
    "2026-08-20T10:59:07.030Z",
  ],
  [
    "이미 오프셋(콜론 없음)",
    "2026-08-20T19:59:07.030+0900",
    "2026-08-20T10:59:07.030Z",
  ],
  // 날짜만 있는 문자열은 명세가 이미 UTC 로 읽는다 — 손대면 안 된다.
  ["날짜만", "2026-08-20", "2026-08-20T00:00:00.000Z"],
  ["못 읽는 값", "어제", null],
  ["에포크 0", 0, "1970-01-01T00:00:00.000Z"],
  [
    "에포크 밀리초",
    1_755_000_000_000,
    new Date(1_755_000_000_000).toISOString(),
  ],
]

describe("parseServerDate 는 한 벌이다 (구조)", () => {
  it("커뮤니티 서비스의 이름은 정본과 **같은 함수**다 — 사본이 다시 생기면 여기서 걸린다", () => {
    expect(viaCommunity).toBe(canonical)
  })
})

describe("parseServerDate 의 동작 (정본)", () => {
  it.each(CASES.map((entry) => [entry[0], entry[1], entry[2]] as const))(
    "%s",
    (_label, input, expectedIso) => {
      const parsed = canonical(input)
      if (expectedIso === null) {
        expect(Number.isNaN(parsed.getTime())).toBe(true)
        return
      }
      expect(parsed.toISOString()).toBe(expectedIso)
    },
  )

  it("`Date` 는 그대로 돌려준다 (새 객체를 만들지 않는다)", () => {
    const date = new Date("2026-08-20T10:59:07.030Z")
    expect(canonical(date)).toBe(date)
  })

  it("오프셋 없는 값과 맨 `new Date` 의 차이가 정확히 로컬 오프셋(KST = 9시간)이다", () => {
    expect(
      canonical("2026-08-20T10:59:07.030000").getTime() -
        new Date("2026-08-20T10:59:07.030000").getTime(),
    ).toBe(9 * 3_600_000)
  })
})
