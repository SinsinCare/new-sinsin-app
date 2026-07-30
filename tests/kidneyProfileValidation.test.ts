import {
  mapKidneyProfileServerFieldErrors,
  validateKidneyProfileInput,
} from "@/src/features/settings/utils/kidneyProfileValidation"

const validInput = {
  heightVal: "170",
  weightVal: "65",
  otherCause: "",
  selectedCauses: [] as string[],
  diagnosisDate: null,
  now: new Date(2026, 5, 17),
}

describe("kidney profile validation", () => {
  it("requires height and weight on the edit screen", () => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      heightVal: "",
      weightVal: " ",
    })

    expect(errors).toMatchObject({
      height: "키를 입력해 주세요.",
      weight: "체중을 입력해 주세요.",
    })
  })

  it("rejects non-numeric height and weight", () => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      heightVal: "abc",
      weightVal: "70kg",
    })

    expect(errors).toMatchObject({
      height: "키를 숫자로 입력해 주세요.",
      weight: "체중을 숫자로 입력해 주세요.",
    })
  })

  it.each([
    ["0", "0"],
    ["300.1", "300.1"],
  ])("rejects out-of-range measurements %s/%s", (heightVal, weightVal) => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      heightVal,
      weightVal,
    })

    expect(errors.height).toContain("300cm 이하")
    expect(errors.weight).toContain("300kg 이하")
  })

  it("accepts server boundary measurement values", () => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      heightVal: "300",
      weightVal: "300",
    })

    expect(errors.height).toBeUndefined()
    expect(errors.weight).toBeUndefined()
  })

  it("validates diagnosis cause other consistency", () => {
    expect(
      validateKidneyProfileInput({
        ...validInput,
        selectedCauses: ["OTHER"],
        otherCause: "",
      }).otherCause,
    ).toBe("기타 원인을 입력해 주세요.")

    expect(
      validateKidneyProfileInput({
        ...validInput,
        selectedCauses: [],
        otherCause: "알 수 없음",
      }).otherCause,
    ).toBe("직접 입력하려면 진단 원인에서 ‘기타’를 선택해 주세요.")
  })

  it("rejects other cause over 500 characters", () => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      selectedCauses: ["OTHER"],
      otherCause: "가".repeat(501),
    })

    expect(errors.otherCause).toBe("기타 원인을 500자 이하로 입력해 주세요.")
  })

  it("rejects future diagnosis month", () => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      diagnosisDate: { year: 2026, month: 7 },
    })

    expect(errors.diagnosisDate).toBe("이번 달 또는 이전 시기를 선택해 주세요.")
  })

  it("accepts current diagnosis month", () => {
    const errors = validateKidneyProfileInput({
      ...validInput,
      diagnosisDate: { year: 2026, month: 6 },
    })

    expect(errors.diagnosisDate).toBeUndefined()
  })

  it("maps server field errors to local inline messages", () => {
    const errors = mapKidneyProfileServerFieldErrors([
      {
        field: "body.heightCm",
        reason: "Input should be less than or equal to 300",
      },
      {
        field: "body.weightKg",
        reason: "Input should be less than or equal to 300",
      },
      {
        field: "body.diagnosisCauseOther",
        reason: "String should have at most 500 characters",
      },
      { field: "body.diagnosisDate", reason: "Value error" },
      { field: "body.unrelated", reason: "Ignored" },
    ])

    expect(errors.height).toContain("300cm 이하")
    expect(errors.weight).toContain("300kg 이하")
    expect(errors.otherCause).toBe("기타 원인을 500자 이하로 입력해 주세요.")
    expect(errors.diagnosisDate).toBe("이번 달 또는 이전 시기를 선택해 주세요.")
  })
})
