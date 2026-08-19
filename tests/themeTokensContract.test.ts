/**
 * `tokens` 가 tamagui `createTokens` 없이도 **똑같이 동작하는지** 고정한다.
 *
 * ## 왜 이 테스트가 87파일을 지키는가
 *
 * `src/theme/tokens.ts` 는 이 레포에서 가장 많이 참조되는 파일이다(87파일 · 435곳).
 * 그리고 그 참조의 **429곳이 `tokens.color.xxx.val`** 형태다 — `createTokens` 가
 * 씌워 주는 `{ val }` 래퍼에 기대고 있다.
 *
 * tamagui 를 걷어내려면 그 래퍼를 직접 만들어야 하는데, 여기서 조금이라도 어긋나면
 * **87파일이 한꺼번에 조용히 깨진다.** `undefined` 가 색으로 넘어가면 RN 은 대개
 * 아무 것도 그리지 않거나 검정으로 떨어지고, 타입은 통과한다(`any` 로 새기 쉽다).
 *
 * 그래서 이 파일은 겉모습이 아니라 **접근 계약**을 검사한다:
 *   - `.val` 이 원래 리터럴과 정확히 같은가
 *   - 모든 색 키가 빠짐없이 있는가
 *   - space/size/radius 가 숫자를 그대로 돌려주는가
 */
import { tokens } from "@/src/theme/tokens"

describe("tokens — createTokens 없이도 같은 계약", () => {
  it("색은 `.val` 로 문자열을 돌려준다", () => {
    expect(tokens.color.primary.val).toBe("#FE7139")
    expect(tokens.color.black.val).toBe("#0D0D0D")
    expect(tokens.color.pureWhite.val).toBe("#FFFFFF")
  })

  it("모든 색 토큰이 `.val` 을 가지고 있고 빈 값이 없다", () => {
    const broken: string[] = []
    for (const [key, entry] of Object.entries(tokens.color)) {
      const v = (entry as { val?: unknown })?.val
      if (typeof v !== "string" || v.length === 0) broken.push(key)
    }
    expect(broken).toEqual([])
  })

  it("space·size·radius 는 숫자를 돌려준다", () => {
    for (const scale of ["space", "size", "radius"] as const) {
      const table = tokens[scale] as Record<string, { val?: unknown }>
      const broken = Object.entries(table)
        .filter(([, e]) => typeof e?.val !== "number")
        .map(([k]) => k)
      expect({ scale, broken }).toEqual({ scale, broken: [] })
    }
  })

  it("실제로 쓰이는 키들이 살아 있다 — 이행 중 사라지면 화면이 깨진다", () => {
    /*
      실측으로 참조 횟수가 많은 것들. 이름을 바꾸거나 지우면 여기서 먼저 걸린다.
    */
    const used = [
      "primary",
      "primaryAccent",
      "grey1",
      "grey3",
      "grey5",
      "grey6",
      "grey7",
      "grey8",
      "sub1",
      "sub4",
      "sub6",
      "sub7",
      "sub8",
      "sub9",
      "textDark",
      "textDarkSub",
      "textLight",
      "appBgDark",
      "cardBgDark",
      "error",
      "restrictionText",
      "primary7",
      "primary8",
    ]
    const missing = used.filter(
      (k) => typeof (tokens.color as Record<string, { val?: unknown }>)[k]?.val !== "string",
    )
    expect(missing).toEqual([])
  })

  it("space 스케일 값이 매핑표(scripts/tamaguiTokenMap)와 어긋나지 않는다", () => {
    // 이행 도구가 `$4 → 16` 으로 옮긴 근거. 정본이 바뀌면 도구도 바뀌어야 한다.
    expect(tokens.space[4].val).toBe(16)
    expect(tokens.space[3].val).toBe(12)
    expect(tokens.radius[4].val).toBe(8)
  })
})
