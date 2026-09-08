import {
  portionLabel,
  readPortionReference,
} from "../src/features/nutrition/utils/portionReference"

import {
  personalPortion,
  type PersonalPortionInput,
} from "../src/features/nutrition/utils/portionReference"

describe("portion reference transport", () => {
  test("preserves a fractional portion and an explicit below-quarter result", () => {
    const source = { fraction: 0.5, driver: "sodium", mealFraction: 0.35 }
    expect(readPortionReference(source)).toEqual(source)
    expect(portionLabel(source.fraction)).toBe("1/2")
    expect(
      readPortionReference({ ...source, fraction: null })?.fraction,
    ).toBeNull()
  })
  test.each([
    undefined,
    {},
    { fraction: 0, driver: "sodium", mealFraction: 0.35 },
    { fraction: 1, driver: "calories", mealFraction: 0.35 },
    { fraction: 1, driver: "sodium", mealFraction: NaN },
    { fraction: 2, driver: "sodium", mealFraction: 0.35 },
  ])("does not turn malformed or absent data into a portion: %j", (raw) => {
    expect(readPortionReference(raw)).toBeNull()
  })
})
const personal: PersonalPortionInput = {
  targets: { sodium: 2000, potassium: 2000, phosphorus: 1000, protein: 60 },
  perServing: { sodium: 1000, potassium: 200, phosphorus: 100, protein: 10 },
  intake: {
    date: "2026-09-08",
    status: "recorded",
    values: { sodium: 1000, potassium: 0, phosphorus: 0, protein: 0 },
  },
}
test("personal portion reflects recorded intake, remaining meals and the share reserved for other dishes", () => {
  expect(personalPortion(personal, true, 2, 1, "2026-09-08")?.fraction).toBe(
    0.5,
  )
  expect(personalPortion(personal, true, 2, 0.5, "2026-09-08")?.fraction).toBe(
    0.25,
  )
  expect(personalPortion(personal, true, 1, 1, "2026-09-08")?.fraction).toBe(1)
  expect(
    personalPortion(
      { ...personal, targets: { ...personal.targets, sodium: 1500 } },
      true,
      2,
      1,
      "2026-09-08",
    )?.fraction,
  ).toBe(0.25)
})
test("unconfirmed, incomplete and stale intake cannot produce a personal portion", () => {
  expect(personalPortion(personal, false, 2, 1, "2026-09-08")).toBeNull()
  expect(personalPortion(personal, true, 2, 1, "2026-09-09")).toBeNull()
  expect(
    personalPortion(
      {
        ...personal,
        intake: { ...personal.intake, status: "incomplete", values: null },
      },
      true,
      2,
      1,
      "2026-09-08",
    ),
  ).toBeNull()
  expect(personalPortion(personal, true, 0, 1, "2026-09-08")).toBeNull()
})
test("no records require explicit no-intake confirmation and exhausted targets are not a full serving", () => {
  const empty: PersonalPortionInput = {
    ...personal,
    intake: { ...personal.intake, status: "none", values: null },
  }
  expect(personalPortion(empty, false, 2, 1, "2026-09-08")).toBeNull()
  expect(personalPortion(empty, true, 2, 1, "2026-09-08")?.fraction).toBe(1)
  expect(
    personalPortion(
      {
        ...personal,
        intake: {
          ...personal.intake,
          values: { ...personal.intake.values!, sodium: 2200 },
        },
      },
      true,
      2,
      1,
      "2026-09-08",
    )?.fraction,
  ).toBeNull()
})

test("malformed runtime snapshots cannot silently become a known zero intake", () => {
  const invalid = {
    ...personal,
    intake: { date: "2026-09-08", status: "recorded", values: null },
  } as unknown as PersonalPortionInput
  expect(personalPortion(invalid, true, 2, 1, "2026-09-08")).toBeNull()
  const negative = { ...personal, targets: { ...personal.targets, sodium: -1 } }
  expect(personalPortion(negative, true, 2, 1, "2026-09-08")).toBeNull()
})
