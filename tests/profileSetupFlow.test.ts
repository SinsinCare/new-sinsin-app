import {
  buildProfileCompletePayload,
  buildSignupPayload,
  getNextProfileSetupStep,
  getPreviousProfileSetupStep,
  getProfileSetupStepError,
  isNicknameAvailabilityVerified,
  normalizeProfileSetupDraft,
  PROFILE_SETUP_STEPS,
  PROFILE_SETUP_STEP_TITLES,
  requiresNicknameAvailability,
} from "../src/features/auth/data/profileSetupFlow"
import type { ProfileSetupDraft } from "../src/features/auth/types"

const completeDraft: ProfileSetupDraft = {
  name: "홍길동",
  birthDate: "1990.01.01",
  gender: "OTHER",
  phoneNumber: "010-1234-5678",
  acquisitionSource: "APP_STORE",
  acquisitionSourceOther: "",
  nickname: "길동이",
}

describe("required profile setup flow", () => {
  it("keeps the approved in-memory step order and only backs within completed steps", () => {
    expect(PROFILE_SETUP_STEPS).toEqual([
      "name",
      "nickname",
      "birthDate",
      "gender",
      "phoneNumber",
      "acquisition",
    ])
    expect(getPreviousProfileSetupStep("name")).toBeNull()
    expect(getPreviousProfileSetupStep("nickname")).toBe("name")
    expect(getNextProfileSetupStep("nickname")).toBe("birthDate")
    expect(getNextProfileSetupStep("acquisition")).toBeNull()
    expect(requiresNicknameAvailability("nickname")).toBe(true)
    expect(requiresNicknameAvailability("acquisition")).toBe(false)
    expect(PROFILE_SETUP_STEP_TITLES.nickname).toBe(
      "신신당부에서 사용할\n닉네임을 입력해주세요",
    )
  })

  it("requires a fresh nickname availability result before the final payload can submit", () => {
    expect(isNicknameAvailabilityVerified("길동이", completeDraft)).toBe(true)
    expect(
      isNicknameAvailabilityVerified("길동이", {
        ...completeDraft,
        nickname: "새닉네임",
      }),
    ).toBe(false)
  })

  it("fails closed when a partial draft has no usable nickname", () => {
    expect(
      isNicknameAvailabilityVerified("길동이", {
        ...completeDraft,
        nickname: undefined,
      } as unknown as ProfileSetupDraft),
    ).toBe(false)
    expect(
      isNicknameAvailabilityVerified("길동이", {
        ...completeDraft,
        nickname: 123,
      } as unknown as ProfileSetupDraft),
    ).toBe(false)
  })

  it("normalizes runtime partial drafts before validation and submission", () => {
    const normalized = normalizeProfileSetupDraft({
      name: undefined,
      birthDate: 123,
      gender: null,
      phoneNumber: {},
      acquisitionSource: false,
      acquisitionSourceOther: [],
      nickname: undefined,
    })

    expect(normalized).toEqual({
      name: "",
      birthDate: "",
      gender: "",
      phoneNumber: "",
      acquisitionSource: "",
      acquisitionSourceOther: "",
      nickname: "",
    })
    expect(() => getProfileSetupStepError("name", normalized)).not.toThrow()
    expect(() =>
      isNicknameAvailabilityVerified("길동이", normalized),
    ).not.toThrow()
    expect(isNicknameAvailabilityVerified("길동이", normalized)).toBe(false)
    expect(() => buildProfileCompletePayload(normalized)).toThrow(
      "이름을 입력해주세요.",
    )
  })

  it("keeps an unchanged ACTIVE backfill nickname verified without a public recheck", () => {
    const activeBackfillDraft = { ...completeDraft, nickname: "기존닉네임" }

    expect(
      isNicknameAvailabilityVerified("기존닉네임", activeBackfillDraft),
    ).toBe(true)
    expect(
      isNicknameAvailabilityVerified("기존닉네임", {
        ...activeBackfillDraft,
        nickname: "변경닉네임",
      }),
    ).toBe(false)
  })

  it("validates the active step without requiring later draft values", () => {
    expect(
      getProfileSetupStepError("name", { ...completeDraft, name: " " }),
    ).toBe("이름을 입력해주세요.")
    expect(
      getProfileSetupStepError("birthDate", {
        ...completeDraft,
        birthDate: "1990.02.30",
      }),
    ).toBe("잘못된 생년월일입니다.")
    expect(
      getProfileSetupStepError("acquisition", {
        ...completeDraft,
        acquisitionSource: "OTHER",
        acquisitionSourceOther: "",
      }),
    ).toBe("알게 된 경로를 입력해주세요.")
    expect(
      getProfileSetupStepError("nickname", {
        ...completeDraft,
        nickname: "a!",
      }),
    ).toBe("닉네임은 한글, 영문, 숫자 2~14자로 입력해주세요.")
  })

  it("builds the final profile-completion payload with nickname after all steps are valid", () => {
    expect(buildProfileCompletePayload(completeDraft)).toEqual({
      name: "홍길동",
      nickName: "길동이",
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      gender: "OTHER",
      phoneNumber: "01012345678",
      acquisitionSource: "APP_STORE",
      acquisitionSourceOther: null,
    })
  })

  it("keeps the email signup payload contract while adding the same final nickname", () => {
    expect(
      buildSignupPayload(
        {
          ...completeDraft,
          acquisitionSource: "OTHER",
          acquisitionSourceOther: "보호자 소개",
        },
        {
          signupToken: "signup-token",
          termsOfServiceAgree: true,
          privacyPolicyAgree: true,
          marketingAgree: false,
          password: "safe-password",
          recommender: "",
        },
      ),
    ).toMatchObject({
      signupToken: "signup-token",
      nickName: "길동이",
      acquisitionSource: "OTHER",
      acquisitionSourceOther: "보호자 소개",
      phoneNumber: "01012345678",
    })
  })
})
