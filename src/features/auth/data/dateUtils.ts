import i18n, { getAppLanguage } from "@/src/i18n"

export interface BirthDateInputState {
  isValid: boolean
  message: string
  parts: {
    year: string
    month: string
    day: string
  } | null
}

export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (getAppLanguage() === "en") {
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
}

export function getBirthDateInputState(
  value: string,
  referenceDate = new Date(),
): BirthDateInputState {
  const formatted = formatBirthDateInput(value)
  if (formatted.length < 10) {
    return {
      isValid: false,
      message: "",
      parts: null,
    }
  }

  const [year, month, day] =
    getAppLanguage() === "en"
      ? (() => {
          const [monthPart, dayPart, yearPart] = formatted.split("/")
          return [yearPart, monthPart, dayPart]
        })()
      : formatted.split(".")
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  const date = new Date(yearNumber, monthNumber - 1, dayNumber)
  const validDate =
    date.getFullYear() === yearNumber &&
    date.getMonth() === monthNumber - 1 &&
    date.getDate() === dayNumber

  if (!validDate || yearNumber < 1900) {
    return {
      isValid: false,
      message: i18n.t("validation.birthInvalid", { ns: "auth" }),
      parts: null,
    }
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  if (date > today) {
    return {
      isValid: false,
      message: i18n.t("validation.birthFuture", { ns: "auth" }),
      parts: null,
    }
  }

  return {
    isValid: true,
    message: "",
    parts: { year, month, day },
  }
}
