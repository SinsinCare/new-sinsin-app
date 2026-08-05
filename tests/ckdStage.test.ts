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

  it("숫자만 저장된 레거시 행도 같은 단계로 읽는다", () => {
    // 컬럼에 enum 이 없어서 구버전이 남긴 숫자 행이 실제로 있다(백엔드 STAGE_ALIASES).
    // 못 읽으면 편집 화면이 "없음" 을 고른 것처럼 되고, 저장이 곧 병기 삭제가 된다.
    expect(hydrateStage("5")).toBe("STAGE_5")
    expect(hydrateStage("1")).toBe("STAGE_1")
    expect(hydrateStage("3a")).toBe("STAGE_3A")
    // 3 은 3A/3B 를 구분할 수 없다 — 백엔드와 같게 엄격한 3B 로 붙인다.
    expect(hydrateStage("3")).toBe("STAGE_3B")
    expect(hydrateStage("stage5")).toBe("STAGE_5")
  })

  it("모르는 표기는 `없음`(null)이 아니라 `모름`(undefined)이다", () => {
    // 둘을 같게 다루면 불러오지 못한 화면의 저장이 CKD 를 지운다(QA 2026-08-05).
    // `undefined` 는 호출부가 그 필드를 아예 보내지 않는다는 신호다.
    expect(hydrateStage("garbage")).toBeUndefined()
    expect(toServerStage(hydrateStage("garbage"), false)).toBeUndefined()
    // 서버가 값 없음을 명시한 경우만 "없음" 이다.
    expect(hydrateStage("")).toBeNull()
    expect(hydrateStage(null)).toBeNull()
    expect(hydrateStage(undefined)).toBeNull()
  })

  it("DIALYSIS 는 단계 선택이 아니라 토글이 결정한다", () => {
    // 단계 축에서는 읽지 않는다(화면이 토글로 가로챈다) — 그래서 "모름" 이다.
    expect(hydrateStage("DIALYSIS")).toBeUndefined()
    expect(toServerStage("STAGE_5", true)).toBe("DIALYSIS")
    expect(toServerStage(null, true)).toBe("DIALYSIS")
    expect(toServerStage(undefined, true)).toBe("DIALYSIS")
  })

  it("모든 선택지에 라벨이 있다", () => {
    for (const option of STAGE_OPTIONS) {
      expect(labelForStage(option.key)).toBe(option.label)
    }
    expect(labelForStage(null)).toBe("")
  })
})
