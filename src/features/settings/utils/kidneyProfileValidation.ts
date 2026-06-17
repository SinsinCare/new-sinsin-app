export type KidneyProfileFieldKey =
  | "height"
  | "weight"
  | "otherCause"
  | "diagnosisDate"

export type KidneyProfileValidationErrors = Partial<
  Record<KidneyProfileFieldKey, string>
>

export type DiagnosisMonth = {
  year: number
  month: number
} | null

export const KIDNEY_PROFILE_LIMITS = {
  heightMax: 300,
  weightMax: 300,
  otherCauseMaxLength: 500,
} as const

const KIDNEY_PROFILE_MESSAGES: Record<KidneyProfileFieldKey, string> = {
  height: "키는 0보다 크고 300cm 이하로 입력해주세요",
  weight: "체중은 0보다 크고 300kg 이하로 입력해주세요",
  otherCause: "기타 원인은 500자 이내로 입력해주세요",
  diagnosisDate: "진단 시기는 오늘 이후일 수 없습니다",
}

type ValidateKidneyProfileInputParams = {
  heightVal: string
  weightVal: string
  otherCause: string
  selectedCauses: string[]
  diagnosisDate: DiagnosisMonth
  now?: Date
}

function parseRequiredNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { status: "missing" as const }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return { status: "invalid" as const }

  return { status: "valid" as const, value: parsed }
}

export function validateKidneyProfileInput({
  heightVal,
  weightVal,
  otherCause,
  selectedCauses,
  diagnosisDate,
  now = new Date(),
}: ValidateKidneyProfileInputParams): KidneyProfileValidationErrors {
  const errors: KidneyProfileValidationErrors = {}

  const height = parseRequiredNumber(heightVal)
  if (height.status === "missing") {
    errors.height = "키를 입력해주세요"
  } else if (height.status === "invalid") {
    errors.height = "키를 숫자로 입력해주세요"
  } else if (
    height.value <= 0 ||
    height.value > KIDNEY_PROFILE_LIMITS.heightMax
  ) {
    errors.height = KIDNEY_PROFILE_MESSAGES.height
  }

  const weight = parseRequiredNumber(weightVal)
  if (weight.status === "missing") {
    errors.weight = "체중을 입력해주세요"
  } else if (weight.status === "invalid") {
    errors.weight = "체중을 숫자로 입력해주세요"
  } else if (
    weight.value <= 0 ||
    weight.value > KIDNEY_PROFILE_LIMITS.weightMax
  ) {
    errors.weight = KIDNEY_PROFILE_MESSAGES.weight
  }

  const trimmedOtherCause = otherCause.trim()
  const hasOtherCause = selectedCauses.includes("OTHER")
  if (trimmedOtherCause.length > KIDNEY_PROFILE_LIMITS.otherCauseMaxLength) {
    errors.otherCause = KIDNEY_PROFILE_MESSAGES.otherCause
  } else if (hasOtherCause && !trimmedOtherCause) {
    errors.otherCause = "기타 원인을 입력해주세요"
  } else if (!hasOtherCause && trimmedOtherCause) {
    errors.otherCause = "기타 원인을 입력하려면 '기타'를 선택해주세요"
  }

  if (diagnosisDate) {
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const isFuture =
      diagnosisDate.year > currentYear ||
      (diagnosisDate.year === currentYear && diagnosisDate.month > currentMonth)

    if (isFuture) {
      errors.diagnosisDate = KIDNEY_PROFILE_MESSAGES.diagnosisDate
    }
  }

  return errors
}

const SERVER_FIELD_MAP: Record<string, KidneyProfileFieldKey> = {
  heightCm: "height",
  "body.heightCm": "height",
  weightKg: "weight",
  "body.weightKg": "weight",
  diagnosisCauseOther: "otherCause",
  "body.diagnosisCauseOther": "otherCause",
  diagnosisDate: "diagnosisDate",
  "body.diagnosisDate": "diagnosisDate",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function mapKidneyProfileServerFieldErrors(
  fieldErrors: unknown,
): KidneyProfileValidationErrors {
  if (!Array.isArray(fieldErrors)) return {}

  const errors: KidneyProfileValidationErrors = {}

  for (const fieldError of fieldErrors) {
    if (!isRecord(fieldError) || typeof fieldError.field !== "string") {
      continue
    }

    const key = SERVER_FIELD_MAP[fieldError.field]
    if (key && !errors[key]) {
      errors[key] = KIDNEY_PROFILE_MESSAGES[key]
    }
  }

  return errors
}
