import {
  BALANCE_SLACK_PT,
  balancedTextWidth,
  shouldRevert,
  splitParagraphs,
} from "@/src/features/home/components/balanceTextWidth"

describe("balancedTextWidth — 마지막 줄에 단어 하나만 남지 않게 폭을 고른다", () => {
  it("한 줄이면 손대지 않는다", () => {
    expect(balancedTextWidth([{ width: 200 }], 320)).toBeNull()
  })

  it("첫 줄이 꽉 차고 둘째 줄이 짧으면 두 줄이 비슷해지는 폭을 준다", () => {
    // 320 + 60 = 380 → 190 + 여유
    expect(balancedTextWidth([{ width: 320 }, { width: 60 }], 320)).toBe(
      190 + BALANCE_SLACK_PT,
    )
  })

  it("이미 고르면(목표 폭이 지금 폭 이상) 손대지 않는다", () => {
    expect(balancedTextWidth([{ width: 318 }, { width: 316 }], 320)).toBeNull()
  })

  it("폭을 모르면 손대지 않는다", () => {
    expect(balancedTextWidth([{ width: 300 }, { width: 100 }], 0)).toBeNull()
  })
})

describe("shouldRevert — 좁혔더니 줄이 늘면 넘침이다", () => {
  it("줄 수가 같거나 줄면 유지한다", () => {
    expect(shouldRevert(2, 2)).toBe(false)
    expect(shouldRevert(3, 2)).toBe(false)
  })
  it("줄 수가 늘면 되돌린다", () => {
    expect(shouldRevert(2, 3)).toBe(true)
  })
})

describe("splitParagraphs — 문장 경계 줄바꿈은 문단으로 나눈다", () => {
  it("\\n 마다 문단으로 나누고 빈 조각은 버린다", () => {
    expect(splitParagraphs("첫 문장이에요.\n둘째 문장이에요.")).toEqual([
      "첫 문장이에요.",
      "둘째 문장이에요.",
    ])
    expect(splitParagraphs("한 문단\n\n")).toEqual(["한 문단"])
  })
})
