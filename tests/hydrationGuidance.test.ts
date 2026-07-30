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
})
