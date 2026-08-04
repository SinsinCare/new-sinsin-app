import { getHydrationGuidance } from "@/src/features/home/utils/hydrationGuidance"

describe("getHydrationGuidance — 개인 기준은 가까워졌을 때만 말한다", () => {
  const limit = 1000

  it("여유 구간에서는 남은 양을 꺼내지 않는다", () => {
    const g = getHydrationGuidance({ consumed: 300, limit })
    expect(g.tone).toBe("relaxed")
    expect(g.message).not.toMatch(/남았어요/)
  })

  it("70%를 넘어서면 개인 기준과의 차이를 알린다", () => {
    const g = getHydrationGuidance({ consumed: 700, limit })
    expect(g.tone).toBe("near")
    expect(g.message).toBe("300ml 남았어요")
  })

  it("경계 직전에는 아직 여유로 읽는다", () => {
    expect(getHydrationGuidance({ consumed: 699, limit }).tone).toBe("relaxed")
  })

  it("넘으면 남은 하루를 안내한다", () => {
    const g = getHydrationGuidance({ consumed: 1200, limit })
    expect(g.tone).toBe("over")
    expect(g.message).toContain("200ml 많아요")
    // 홈 타일은 한 줄이라 의료진 안내 문장이 들어가지 않는다. 수치만 말한다.
  })

  it("딱 맞춰 마신 경우도 초과로 본다 — 더 마실 여지가 없다", () => {
    const g = getHydrationGuidance({ consumed: 1000, limit })
    expect(g.tone).toBe("over")
    expect(g.message).toContain("딱 맞아요")
  })

  it("제한값을 아직 못 받았으면 압박하지 않는다", () => {
    const g = getHydrationGuidance({ consumed: 500, limit: null })
    expect(g.tone).toBe("relaxed")
    expect(g.message).toContain("프로필에서 기준 확인")
    expect(g.message).not.toMatch(/많아요|적어요|남았어요/)
  })

  it("프로필 폴백은 개인 한도처럼 판정하지 않는다", () => {
    const g = getHydrationGuidance({
      consumed: 1200,
      limit: 1000,
      isReferenceLimit: true,
    })
    expect(g).toEqual({
      tone: "relaxed",
      message: "내 기준 미설정",
    })
  })

  /*
    IEEE 754 잔재가 문장으로 새어 나오던 회귀. `1500 - 1860.9` 는
    `-360.90000000000009` 라, 반올림 없이 넣으면 화면에 그 숫자가 그대로 보였다
    (QA 2026-08-04: "기준보다 360.9000000000001ml 많아요").
  */
  it("초과량을 부동소수점 잔재 없이 말한다", () => {
    const g = getHydrationGuidance({ consumed: 1860.9, limit: 1500 })
    expect(g.tone).toBe("over")
    expect(g.message).toBe("기준보다 361ml 많아요")
    expect(g.message).not.toMatch(/\d\.\d{3,}/)
  })

  it("남은 양도 정수로 말한다", () => {
    const g = getHydrationGuidance({ consumed: 1100.7, limit: 1500 })
    expect(g.tone).toBe("near")
    expect(g.message).toBe("399ml 남았어요")
    expect(g.message).not.toMatch(/\d\.\d{3,}/)
  })

  it("반올림이 판정을 바꾸지는 않는다 — 0.4mL 초과는 여전히 초과다", () => {
    const g = getHydrationGuidance({ consumed: 1500.4, limit: 1500 })
    expect(g.tone).toBe("over")
    // 표시는 0 이지만 "딱 맞아요"(remaining === 0) 로 넘어가지 않는다.
    expect(g.message).toBe("기준보다 0ml 많아요")
  })
})
