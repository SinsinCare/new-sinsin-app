import type { ProfileCompleteRequest, SignupRequest } from "@/src/types"
import type { ProfileSetupDraft } from "../types"
import { getBirthDateInputState } from "./dateUtils"
import {
  buildRequiredPhoneNumberPayload,
  getRequiredPhoneNumberError,
} from "./phoneNumber"

export const PROFILE_SETUP_STEPS = [
  "name",
  "nickname",
  "birthDate",
  "gender",
  "phoneNumber",
  "acquisition",
] as const

export type ProfileSetupStep = (typeof PROFILE_SETUP_STEPS)[number]

export const PROFILE_SETUP_STEP_TITLES: Record<ProfileSetupStep, string> = {
  name: "이름을\n입력해주세요",
  nickname: "신신당부에서 사용할\n닉네임을 입력해주세요",
  birthDate: "생년월일을\n입력해주세요",
  gender: "성별을\n선택해주세요",
  phoneNumber: "전화번호를\n입력해주세요",
  acquisition: "알게된 경로를\n선택해주세요",
}

const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,14}$/

function getDraftString(value: unknown) {
  return typeof value === "string" ? value : ""
}

/**
 * React Hook Form may expose a partial draft while fields are mounting.
 * Normalize at the feature boundary so validation and submission only receive strings.
 */
export function normalizeProfileSetupDraft(draft: unknown): ProfileSetupDraft {
  const values =
    draft && typeof draft === "object" ? (draft as Record<string, unknown>) : {}

  return {
    name: getDraftString(values.name),
    birthDate: getDraftString(values.birthDate),
    gender: getDraftString(values.gender) as ProfileSetupDraft["gender"],
    phoneNumber: getDraftString(values.phoneNumber),
    acquisitionSource: getDraftString(
      values.acquisitionSource,
    ) as ProfileSetupDraft["acquisitionSource"],
    acquisitionSourceOther: getDraftString(values.acquisitionSourceOther),
    nickname: getDraftString(values.nickname),
  }
}

export function getProfileSetupStepError(
  step: ProfileSetupStep,
  draft: ProfileSetupDraft,
): string | null {
  switch (step) {
    case "name":
      return draft.name.trim() ? null : "이름을 입력해주세요."
    case "birthDate": {
      const state = getBirthDateInputState(draft.birthDate)
      return state.isValid ? null : state.message || "생년월일을 입력해주세요."
    }
    case "gender":
      return draft.gender ? null : "성별을 선택해주세요."
    case "phoneNumber":
      return getRequiredPhoneNumberError(draft.phoneNumber)
    case "acquisition":
      if (!draft.acquisitionSource) return "알게된 경로를 선택해주세요."
      if (
        draft.acquisitionSource === "OTHER" &&
        !draft.acquisitionSourceOther.trim()
      ) {
        return "알게 된 경로를 입력해주세요."
      }
      return null
    case "nickname":
      if (!draft.nickname.trim()) return "닉네임을 입력해주세요."
      return NICKNAME_PATTERN.test(draft.nickname)
        ? null
        : "닉네임은 한글, 영문, 숫자 2~14자로 입력해주세요."
  }
}

export function getPreviousProfileSetupStep(step: ProfileSetupStep) {
  const index = PROFILE_SETUP_STEPS.indexOf(step)
  return index > 0 ? PROFILE_SETUP_STEPS[index - 1] : null
}

export function getNextProfileSetupStep(step: ProfileSetupStep) {
  const index = PROFILE_SETUP_STEPS.indexOf(step)
  return index < PROFILE_SETUP_STEPS.length - 1
    ? PROFILE_SETUP_STEPS[index + 1]
    : null
}

/** Nickname availability is intentionally checked before later profile inputs. */
export function requiresNicknameAvailability(step: ProfileSetupStep) {
  return step === "nickname"
}

export function isNicknameAvailabilityVerified(
  verifiedNickname: string | null,
  draft: ProfileSetupDraft,
) {
  if (typeof draft.nickname !== "string") return false
  return verifiedNickname === draft.nickname.trim()
}

function getValidBirthDateParts(draft: ProfileSetupDraft) {
  const state = getBirthDateInputState(draft.birthDate)
  if (!state.isValid || !state.parts) {
    throw new Error("생년월일을 확인해주세요.")
  }
  return state.parts
}

function assertCompleteDraft(draft: ProfileSetupDraft) {
  for (const step of PROFILE_SETUP_STEPS) {
    const error = getProfileSetupStepError(step, draft)
    if (error) throw new Error(error)
  }
}

export function buildProfileCompletePayload(
  draft: ProfileSetupDraft,
): ProfileCompleteRequest {
  assertCompleteDraft(draft)
  const birthDate = getValidBirthDateParts(draft)
  if (!draft.gender || !draft.acquisitionSource) {
    throw new Error("필수정보를 확인해주세요.")
  }

  return {
    name: draft.name.trim(),
    nickName: draft.nickname.trim(),
    birthYear: Number(birthDate.year),
    birthMonth: Number(birthDate.month),
    birthDay: Number(birthDate.day),
    gender: draft.gender,
    ...buildRequiredPhoneNumberPayload(draft.phoneNumber),
    acquisitionSource: draft.acquisitionSource,
    acquisitionSourceOther:
      draft.acquisitionSource === "OTHER"
        ? draft.acquisitionSourceOther.trim()
        : null,
  }
}

type SignupPrerequisites = Pick<
  SignupRequest,
  | "signupToken"
  | "termsOfServiceAgree"
  | "privacyPolicyAgree"
  | "marketingAgree"
  | "password"
  | "recommender"
>

export function buildSignupPayload(
  draft: ProfileSetupDraft,
  prerequisites: SignupPrerequisites,
): SignupRequest {
  return {
    ...prerequisites,
    ...buildProfileCompletePayload(draft),
  }
}
