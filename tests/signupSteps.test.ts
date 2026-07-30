import {
  EMPTY_SIGNUP_DRAFT,
  SIGNUP_STEP_COPY,
  SIGNUP_STEP_IDS,
  buildSignupDraftFromProfile,
  buildSignupProfilePayload,
  getSignupStepProgress,
  shouldVerifyNicknameAvailability,
  validateSignupStep,
  type SignupDraft,
} from "../src/features/auth/data/signupSteps"

const REFERENCE_DATE = new Date("2026-07-26T00:00:00Z")

const COMPLETE_DRAFT: SignupDraft = {
  nickname: "신신이",
  birthDate: "2002.12.14",
  gender: "MALE",
  name: "홍길동",
  phoneNumber: "010-1234-5678",
  acquisitionSource: "YOUTUBE",
  acquisitionSourceOther: "",
}

describe("signup step plan", () => {
  it("asks one question per step and never repeats one", () => {
    expect(new Set(SIGNUP_STEP_IDS).size).toBe(SIGNUP_STEP_IDS.length)
    expect(SIGNUP_STEP_IDS[0]).toBe("nickname")
    expect(SIGNUP_STEP_IDS[SIGNUP_STEP_IDS.length - 1]).toBe("acquisition")
  })

  it("gives every step a two-line question and a field label", () => {
    SIGNUP_STEP_IDS.forEach((step) => {
      const copy = SIGNUP_STEP_COPY[step]
      expect(copy.title).toContain("\n")
      expect(copy.label.length).toBeGreaterThan(0)
    })
  })

  it("fills the progress bar from the first step to the last", () => {
    expect(getSignupStepProgress(0, 6)).toBeCloseTo(1 / 6)
    expect(getSignupStepProgress(5, 6)).toBe(1)
    // 범위를 벗어난 인덱스가 진행바를 비우거나 넘치게 하지 않는다.
    expect(getSignupStepProgress(-3, 6)).toBeCloseTo(1 / 6)
    expect(getSignupStepProgress(99, 6)).toBe(1)
  })
})

describe("signup step validation", () => {
  it("stays silent on an untouched field", () => {
    expect(validateSignupStep("nickname", EMPTY_SIGNUP_DRAFT)).toEqual({
      canProceed: false,
      message: "",
    })
    expect(validateSignupStep("phone", EMPTY_SIGNUP_DRAFT)).toEqual({
      canProceed: false,
      message: "",
    })
  })

  it("explains why a typed value is rejected", () => {
    expect(
      validateSignupStep("nickname", { ...COMPLETE_DRAFT, nickname: "신" }),
    ).toMatchObject({
      canProceed: false,
      message: "닉네임은 2자 이상이어야 해요.",
    })
    expect(
      validateSignupStep("nickname", {
        ...COMPLETE_DRAFT,
        nickname: "신신이!",
      }),
    ).toMatchObject({
      canProceed: false,
      message: "한글, 영문, 숫자만 쓸 수 있어요.",
    })
    expect(
      validateSignupStep("phone", {
        ...COMPLETE_DRAFT,
        phoneNumber: "011-123",
      }),
    ).toMatchObject({ canProceed: false })
  })

  it("rejects impossible and future birth dates", () => {
    expect(
      validateSignupStep(
        "birth",
        { ...COMPLETE_DRAFT, birthDate: "2001.02.29" },
        REFERENCE_DATE,
      ),
    ).toMatchObject({
      canProceed: false,
      message: "생년월일을 다시 확인해 주세요.",
    })
    expect(
      validateSignupStep(
        "birth",
        { ...COMPLETE_DRAFT, birthDate: "2026.07.27" },
        REFERENCE_DATE,
      ),
    ).toMatchObject({
      canProceed: false,
      message: "오늘 또는 이전 날짜를 입력해 주세요.",
    })
  })

  it("requires the free-text reason only for OTHER", () => {
    const other: SignupDraft = {
      ...COMPLETE_DRAFT,
      acquisitionSource: "OTHER",
      acquisitionSourceOther: "   ",
    }
    expect(validateSignupStep("acquisition", other).canProceed).toBe(false)
    expect(
      validateSignupStep("acquisition", {
        ...other,
        acquisitionSourceOther: "자연스럽게 들어옴",
      }).canProceed,
    ).toBe(true)
    expect(validateSignupStep("acquisition", COMPLETE_DRAFT).canProceed).toBe(
      true,
    )
  })
})

describe("signup payload", () => {
  it("splits the single birth field and strips phone hyphens", () => {
    expect(buildSignupProfilePayload(COMPLETE_DRAFT, REFERENCE_DATE)).toEqual({
      nickName: "신신이",
      name: "홍길동",
      birthYear: 2002,
      birthMonth: 12,
      birthDay: 14,
      gender: "MALE",
      phoneNumber: "01012345678",
      acquisitionSource: "YOUTUBE",
      acquisitionSourceOther: null,
    })
  })

  it("keeps the free-text reason only for OTHER", () => {
    expect(
      buildSignupProfilePayload(
        {
          ...COMPLETE_DRAFT,
          acquisitionSource: "OTHER",
          acquisitionSourceOther: "  자연스럽게 들어옴  ",
        },
        REFERENCE_DATE,
      ),
    ).toMatchObject({
      acquisitionSource: "OTHER",
      acquisitionSourceOther: "자연스럽게 들어옴",
    })
  })

  it("refuses to build a payload when any earlier step is incomplete", () => {
    expect(
      buildSignupProfilePayload(
        { ...COMPLETE_DRAFT, gender: "" },
        REFERENCE_DATE,
      ),
    ).toBeNull()
    expect(
      buildSignupProfilePayload(
        { ...COMPLETE_DRAFT, phoneNumber: "010-1234" },
        REFERENCE_DATE,
      ),
    ).toBeNull()
  })
})

describe("backfill prefill", () => {
  it("rebuilds the single birth field from the stored parts", () => {
    expect(
      buildSignupDraftFromProfile({
        nickName: "신신이",
        name: "홍길동",
        birthYear: 2002,
        birthMonth: 3,
        birthDay: 4,
        gender: "FEMALE",
        acquisitionSource: "HOSPITAL",
      }),
    ).toMatchObject({
      nickname: "신신이",
      birthDate: "2002.03.04",
      gender: "FEMALE",
      acquisitionSource: "HOSPITAL",
      // 서버는 휴대폰을 마스킹해서만 내려준다. 비워 두고 다시 받는다.
      phoneNumber: "",
    })
  })

  it("leaves the birth field empty when the stored date is a zero placeholder", () => {
    expect(
      buildSignupDraftFromProfile({ birthYear: 0, birthMonth: 0, birthDay: 0 })
        .birthDate,
    ).toBe("")
  })

  it("checks nickname availability only when the user changed it", () => {
    expect(shouldVerifyNicknameAvailability("신신이", "신신이")).toBe(false)
    expect(shouldVerifyNicknameAvailability(" 신신이 ", "신신이")).toBe(false)
    expect(shouldVerifyNicknameAvailability("콩팥지킴이", "신신이")).toBe(true)
    expect(shouldVerifyNicknameAvailability("신신이", "")).toBe(true)
  })
})
