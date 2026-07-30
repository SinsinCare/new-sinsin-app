import type { AcquisitionSource } from "@/src/types"
import i18n, { getAppLanguage } from "@/src/i18n"
import type { AcquisitionSourceInput } from "./acquisitionSources"
import { getBirthDateInputState } from "./dateUtils"
import {
  getPhoneNumberErrorMessage,
  isValidKoreanMobile,
  onlyPhoneDigits,
} from "./phoneNumber"

/**
 * 회원가입 스텝 정의. 화면 한 장에 질문 하나만 둔다.
 *
 * 순서는 목업(닉네임 → 생년월일 → 성별 → 알게된 경로)을 유지하고, 목업에 없지만
 * 서버가 필수로 받는 이름·휴대폰을 성별 뒤에 넣었다. 실명과 연락처는 가장 민감해서
 * 맨 앞에 두면 거기서 이탈한다. 마지막은 원래대로 가장 가벼운 유입경로다.
 *
 * 이 모듈은 순수 함수만 둔다 — RN 을 끌고 오지 않아야 테스트가 가볍다.
 */
export type SignupStepId =
  | "nickname"
  | "birth"
  | "gender"
  | "name"
  | "phone"
  | "acquisition"

export const SIGNUP_STEP_IDS = [
  "nickname",
  "birth",
  "gender",
  "name",
  "phone",
  "acquisition",
] as const satisfies readonly SignupStepId[]

export const NICKNAME_MIN_LENGTH = 2
/** 목업 표기(2~12자) 기준. 서버는 14자까지 받지만 더 좁게 잡아도 계약을 안 깬다. */
export const NICKNAME_MAX_LENGTH = 12
export const NAME_MAX_LENGTH = 100
export const ACQUISITION_OTHER_MAX_LENGTH = 200

const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]+$/

export interface SignupDraft {
  nickname: string
  /** "YYYY.MM.DD" 한 칸 입력. 목업이 세 칸 피커 대신 한 줄을 쓴다. */
  birthDate: string
  gender: "MALE" | "FEMALE" | "OTHER" | ""
  name: string
  /** 화면 표기용 하이픈 포함 문자열. 서버 전송 직전에 숫자만 남긴다. */
  phoneNumber: string
  acquisitionSource: AcquisitionSourceInput
  acquisitionSourceOther: string
}

export const EMPTY_SIGNUP_DRAFT: SignupDraft = {
  nickname: "",
  birthDate: "",
  gender: "",
  name: "",
  phoneNumber: "",
  acquisitionSource: "",
  acquisitionSourceOther: "",
}

export interface SignupStepCopy {
  /** 두 줄로 끊어 쓰는 질문. 줄바꿈 위치까지 목업을 따른다. */
  title: string
  /** 질문 아래 한 줄. "왜 묻는지"만 답한다. */
  subtitle?: string
  /** 입력 위에 붙는 필드 라벨(시트 13/18). 포커스 시 프라이머리로 물든다. */
  label: string
  placeholder?: string
  /** 입력 아래 회색 한 줄. 규칙처럼 미리 알아야 손해가 없는 것만. */
  hint?: string
}

export function getSignupStepCopy(): Record<SignupStepId, SignupStepCopy> {
  return {
    nickname: {
      title: i18n.t("profile.nickname.title", { ns: "auth" }),
      label: i18n.t("profile.nickname.label", { ns: "auth" }),
      placeholder: i18n.t("profile.nickname.placeholder", {
        ns: "auth",
        min: NICKNAME_MIN_LENGTH,
        max: NICKNAME_MAX_LENGTH,
      }),
    },
    birth: {
      title: i18n.t("profile.birth.title", { ns: "auth" }),
      subtitle: i18n.t("profile.birth.subtitle", { ns: "auth" }),
      label: i18n.t("profile.birth.label", { ns: "auth" }),
      placeholder: i18n.t("profile.birth.placeholder", { ns: "auth" }),
    },
    gender: {
      title: i18n.t("profile.gender.title", { ns: "auth" }),
      subtitle: i18n.t("profile.gender.subtitle", { ns: "auth" }),
      label: i18n.t("profile.gender.label", { ns: "auth" }),
    },
    name: {
      title: i18n.t("profile.name.title", { ns: "auth" }),
      subtitle: i18n.t("profile.name.subtitle", { ns: "auth" }),
      label: i18n.t("profile.name.label", { ns: "auth" }),
      placeholder: i18n.t("profile.name.placeholder", { ns: "auth" }),
    },
    phone: {
      title: i18n.t("profile.phone.title", { ns: "auth" }),
      subtitle: i18n.t("profile.phone.subtitle", { ns: "auth" }),
      label: i18n.t("profile.phone.label", { ns: "auth" }),
      placeholder: i18n.t("profile.phone.placeholder", { ns: "auth" }),
      hint: i18n.t("profile.phone.hint", { ns: "auth" }),
    },
    acquisition: {
      title: i18n.t("profile.acquisition.title", { ns: "auth" }),
      subtitle: i18n.t("profile.acquisition.subtitle", { ns: "auth" }),
      label: i18n.t("profile.acquisition.label", { ns: "auth" }),
      placeholder: i18n.t("profile.acquisition.placeholder", { ns: "auth" }),
    },
  }
}

/** 기본 언어의 정적 스냅샷. 신규 화면은 언어 변경에 반응하는 getter를 사용한다. */
export const SIGNUP_STEP_COPY = getSignupStepCopy()

export interface SignupStepValidity {
  canProceed: boolean
  /** 입력이 있는데 틀렸을 때만 채운다. 빈 칸에 미리 빨간 글씨를 띄우지 않는다. */
  message: string
}

const PENDING: SignupStepValidity = { canProceed: false, message: "" }
const OK: SignupStepValidity = { canProceed: true, message: "" }

function invalid(message: string): SignupStepValidity {
  return { canProceed: false, message }
}

export function validateSignupStep(
  step: SignupStepId,
  draft: SignupDraft,
  referenceDate = new Date(),
): SignupStepValidity {
  switch (step) {
    case "nickname": {
      const nickname = draft.nickname.trim()
      if (!nickname) return PENDING
      if (nickname.length < NICKNAME_MIN_LENGTH) {
        return invalid(
          i18n.t("profile.nickname.tooShort", {
            ns: "auth",
            min: NICKNAME_MIN_LENGTH,
          }),
        )
      }
      if (nickname.length > NICKNAME_MAX_LENGTH) {
        return invalid(
          i18n.t("profile.nickname.tooLong", {
            ns: "auth",
            max: NICKNAME_MAX_LENGTH,
          }),
        )
      }
      if (!NICKNAME_PATTERN.test(nickname)) {
        return invalid(i18n.t("profile.nickname.invalidChars", { ns: "auth" }))
      }
      return OK
    }
    case "birth": {
      if (!draft.birthDate) return PENDING
      const state = getBirthDateInputState(draft.birthDate, referenceDate)
      return state.isValid ? OK : { canProceed: false, message: state.message }
    }
    case "gender":
      return draft.gender ? OK : PENDING
    case "name": {
      const name = draft.name.trim()
      if (!name) return PENDING
      if (name.length > NAME_MAX_LENGTH) {
        return invalid(
          i18n.t("profile.name.tooLong", {
            ns: "auth",
            max: NAME_MAX_LENGTH,
          }),
        )
      }
      return OK
    }
    case "phone": {
      const digits = onlyPhoneDigits(draft.phoneNumber)
      if (!digits) return PENDING
      return isValidKoreanMobile(draft.phoneNumber)
        ? OK
        : invalid(getPhoneNumberErrorMessage())
    }
    case "acquisition": {
      if (!draft.acquisitionSource) return PENDING
      if (draft.acquisitionSource !== "OTHER") return OK
      const other = draft.acquisitionSourceOther.trim()
      if (!other) return PENDING
      if (other.length > ACQUISITION_OTHER_MAX_LENGTH) {
        return invalid(
          i18n.t("profile.acquisition.otherTooLong", {
            ns: "auth",
            max: ACQUISITION_OTHER_MAX_LENGTH,
          }),
        )
      }
      return OK
    }
  }
}

/** 진행바 채움값(0~1). 첫 스텝에서도 한 칸은 차 있어야 진행 중으로 읽힌다. */
export function getSignupStepProgress(
  index: number,
  total: number = SIGNUP_STEP_IDS.length,
): number {
  if (total <= 0) return 0
  const clamped = Math.min(Math.max(index, 0), total - 1)
  return (clamped + 1) / total
}

export interface SignupProfilePayload {
  nickName: string
  name: string
  birthYear: number
  birthMonth: number
  birthDay: number
  gender: "MALE" | "FEMALE" | "OTHER"
  phoneNumber: string
  acquisitionSource: AcquisitionSource
  acquisitionSourceOther: string | null
}

/**
 * 전 스텝이 유효할 때만 전송 payload 를 만든다. 하나라도 어긋나면 null —
 * 호출부가 "마지막 스텝만 보고" 서버로 쏘는 일을 막는다.
 */
export function buildSignupProfilePayload(
  draft: SignupDraft,
  referenceDate = new Date(),
): SignupProfilePayload | null {
  const allValid = SIGNUP_STEP_IDS.every(
    (step) => validateSignupStep(step, draft, referenceDate).canProceed,
  )
  if (!allValid) return null

  const birth = getBirthDateInputState(draft.birthDate, referenceDate)
  if (!birth.parts) return null
  if (!draft.gender || !draft.acquisitionSource) return null

  return {
    nickName: draft.nickname.trim(),
    name: draft.name.trim(),
    birthYear: Number(birth.parts.year),
    birthMonth: Number(birth.parts.month),
    birthDay: Number(birth.parts.day),
    gender: draft.gender,
    phoneNumber: onlyPhoneDigits(draft.phoneNumber),
    acquisitionSource: draft.acquisitionSource,
    acquisitionSourceOther:
      draft.acquisitionSource === "OTHER"
        ? draft.acquisitionSourceOther.trim()
        : null,
  }
}

export interface SignupProfileSource {
  nickName?: string | null
  name?: string | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  gender?: "MALE" | "FEMALE" | "OTHER" | null
  acquisitionSource?: AcquisitionSource | null
  acquisitionSourceOther?: string | null
}

function padDatePart(value: number | null | undefined, length: number) {
  if (!value || value <= 0) return ""
  return String(value).padStart(length, "0")
}

/**
 * 이미 가입한 계정이 추가정보를 채우러 들어온 경우(backfill)의 프리필.
 * 휴대폰은 서버가 마스킹만 내려주므로 채우지 않고 다시 받는다.
 */
export function buildSignupDraftFromProfile(
  profile: SignupProfileSource,
): SignupDraft {
  const year = padDatePart(profile.birthYear, 4)
  const month = padDatePart(profile.birthMonth, 2)
  const day = padDatePart(profile.birthDay, 2)

  return {
    ...EMPTY_SIGNUP_DRAFT,
    nickname: profile.nickName ?? "",
    name: profile.name ?? "",
    birthDate:
      year && month && day
        ? getAppLanguage() === "en"
          ? `${month}/${day}/${year}`
          : `${year}.${month}.${day}`
        : "",
    gender: profile.gender ?? "",
    acquisitionSource: profile.acquisitionSource ?? "",
    acquisitionSourceOther: profile.acquisitionSourceOther ?? "",
  }
}

/**
 * 닉네임 중복확인은 공개 API(`/auth/signup/nickname/verify`)를 쓰는데 이 API 는
 * 본인 제외를 못 한다. backfill 로 들어온 사람이 자기 닉네임을 그대로 두면
 * "이미 사용 중"이 뜬다. 값이 바뀌었을 때만 물어본다.
 */
export function shouldVerifyNicknameAvailability(
  nickname: string,
  initialNickname: string,
): boolean {
  const next = nickname.trim()
  if (!next) return false
  return next !== initialNickname.trim()
}
