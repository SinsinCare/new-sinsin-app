import {
  STAGE_OPTIONS,
  hydrateStage,
  labelForStage,
  toServerStage,
} from "@/src/features/settings/utils/ckdStage"

describe("CKD 단계 편집 화면 왕복", () => {
  it("3B 는 열었다 저장해도 3B 로 남는다", () => {
    // 원래 버그: parseInt 로 STAGE_3B -> 3 -> 저장 맵에 3B 가 없어 STAGE_3A 로 굳었다.
    // 3B 환자의 칼륨 2500->3000, 인 900->1000 으로 제한이 조용히 완화됐다.
    const hydrated = hydrateStage("STAGE_3B")
    expect(hydrated).toBe("STAGE_3B")
    expect(toServerStage(hydrated, false)).toBe("STAGE_3B")
  })

  it("3A 와 3B 를 별도 선택지로 노출한다", () => {
    const keys = STAGE_OPTIONS.map((o) => o.key)
    expect(keys).toContain("STAGE_3A")
    expect(keys).toContain("STAGE_3B")
  })

  it.each(STAGE_OPTIONS.map((o) => o.key))("%s 왕복이 무손실이다", (key) => {
    expect(toServerStage(hydrateStage(key), false)).toBe(key)
  })

  it("인식 못 하는 값은 임의 단계에 붙이지 않는다", () => {
    // 가까운 단계로 추측하면 그게 곧 잘못된 제한이 된다.
    expect(hydrateStage("3")).toBeNull()
    expect(hydrateStage("garbage")).toBeNull()
    expect(hydrateStage("")).toBeNull()
    expect(hydrateStage(null)).toBeNull()
    expect(hydrateStage(undefined)).toBeNull()
  })

  it("DIALYSIS 는 단계 선택이 아니라 토글이 결정한다", () => {
    expect(hydrateStage("DIALYSIS")).toBeNull()
    expect(toServerStage("STAGE_5", true)).toBe("DIALYSIS")
    expect(toServerStage(null, true)).toBe("DIALYSIS")
  })

  it("모든 선택지에 라벨이 있다", () => {
    for (const option of STAGE_OPTIONS) {
      expect(labelForStage(option.key)).toBe(option.label)
    }
    expect(labelForStage(null)).toBe("")
  })
})
