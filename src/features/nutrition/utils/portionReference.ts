export interface PortionReference {
  fraction: number | null
  driver: "sodium" | "potassium" | "phosphorus" | "protein"
  mealFraction: number
  personal?: PersonalPortionInput
}

export function readPortionReference(raw: unknown): PortionReference | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>
  if (
    !["sodium", "potassium", "phosphorus", "protein"].includes(
      String(value.driver),
    ) ||
    !(
      value.fraction === null ||
      [1, 3 / 4, 2 / 3, 1 / 2, 1 / 3, 1 / 4].includes(value.fraction as number)
    ) ||
    typeof value.mealFraction !== "number" ||
    !Number.isFinite(value.mealFraction) ||
    value.mealFraction <= 0 ||
    value.mealFraction > 1
  )
    return null
  return {
    ...value,
    personal: readPersonalPortion(value.personal) ?? undefined,
  } as unknown as PortionReference
}

export function portionLabel(fraction: number): string {
  return (
    new Map([
      [1, "1"],
      [3 / 4, "3/4"],
      [2 / 3, "2/3"],
      [1 / 2, "1/2"],
      [1 / 3, "1/3"],
      [1 / 4, "1/4"],
    ]).get(fraction) ?? ""
  )
}

export const portionNutrients = [
  "sodium",
  "potassium",
  "phosphorus",
  "protein",
] as const
export type PortionNutrients = Record<(typeof portionNutrients)[number], number>
export interface PersonalPortionInput {
  targets: PortionNutrients
  perServing: PortionNutrients
  intake: {
    date: string
    status: "none" | "recorded" | "incomplete"
    values: PortionNutrients | null
  }
}
function validNutrients(
  raw: unknown,
  positive = false,
): raw is PortionNutrients {
  if (!raw || typeof raw !== "object") return false
  const value = raw as Record<string, unknown>
  return portionNutrients.every(
    (key) =>
      typeof value[key] === "number" &&
      Number.isFinite(value[key]) &&
      (positive ? value[key] > 0 : value[key] >= 0),
  )
}
function readPersonalPortion(raw: unknown): PersonalPortionInput | null {
  if (!raw || typeof raw !== "object") return null
  const v = raw as PersonalPortionInput
  if (
    !validNutrients(v.targets, true) ||
    !validNutrients(v.perServing) ||
    !v.intake ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.intake.date)
  )
    return null
  if (!["none", "recorded", "incomplete"].includes(v.intake.status)) return null
  if (
    v.intake.status === "recorded"
      ? !validNutrients(v.intake.values)
      : v.intake.values !== null
  )
    return null
  return v
}
export function personalPortion(
  input: PersonalPortionInput,
  confirmed: boolean,
  meals: number,
  share: number,
  today: string,
) {
  if (
    !readPersonalPortion(input) ||
    !confirmed ||
    input.intake.date !== today ||
    input.intake.status === "incomplete" ||
    ![1, 2, 3].includes(meals) ||
    ![1, 0.5].includes(share)
  )
    return null
  let available = Infinity
  let driver: (typeof portionNutrients)[number] = "sodium"
  for (const key of portionNutrients) {
    const amount = input.perServing[key]
    const consumed = input.intake.values?.[key] ?? 0 // Only after explicit no-intake confirmation.
    const budget = (Math.max(0, input.targets[key] - consumed) / meals) * share
    if (amount > 0 && budget / amount < available) {
      available = budget / amount
      driver = key
    }
  }
  if (!Number.isFinite(available)) return null
  return {
    fraction:
      [1, 0.75, 2 / 3, 0.5, 1 / 3, 0.25].find((p) => p <= available) ?? null,
    driver,
  }
}

export interface PersonalPortionSelection {
  input: PersonalPortionInput
  meals: number
  share: number
}

/**
 * 오늘의 KST 날짜("YYYY-MM-DD"). `personalPortion` 의 `today` 인자다 — 섭취 기록의
 * `intake.date` 는 서버가 KST 로 자른 하루라, 기기 시간대가 아니라 같은 KST 로 비교해야
 * 자정 전후에 "오늘 기록" 이 어제로 밀리지 않는다. 화면과 상담 문맥이 같은 값을 쓴다.
 */
export function kstDateString(now = Date.now()): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10)
}
