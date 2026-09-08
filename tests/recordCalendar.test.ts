import {
  calendarDateKey,
  calendarMonth,
  calendarWeeks,
  diaryDateKeys,
  isFutureCalendarDate,
} from "../src/features/home/components/calendar/calendarModel"
import { getWeekDays } from "../src/features/home/utils/getWeekDays"
import { getWeekRange } from "../src/features/home/utils/getWeekRange"

describe("record calendar civil dates", () => {
  it.each([
    [2021, 1, 28, 0], // Four-week February, starts Monday.
    [2026, 8, 30, 1], // Five-week September.
    [2026, 7, 31, 5], // Six-week August.
    [2024, 1, 29, 3], // Leap day.
  ])(
    "keeps six rows with each real day exactly once: %s/%s",
    (year, month, count, firstColumn) => {
      const weeks = calendarWeeks(new Date(year, month, 15))
      expect(weeks).toHaveLength(6)
      expect(weeks.every((week) => week.length === 7)).toBe(true)
      const days = weeks.flat().filter((date): date is Date => date !== null)
      expect(days.map((date) => date.getDate())).toEqual(
        Array.from({ length: count }, (_, index) => index + 1),
      )
      expect(weeks[0][firstColumn]?.getDate()).toBe(1)
      expect(days.every((date) => date.getMonth() === month)).toBe(true)
    },
  )

  it("moves from month-end without skipping February and crosses years", () => {
    expect(calendarDateKey(calendarMonth(new Date(2026, 0, 31), 1))).toBe(
      "2026-02-01",
    )
    expect(calendarDateKey(calendarMonth(new Date(2026, 0, 31), -1))).toBe(
      "2025-12-01",
    )
    expect(calendarDateKey(calendarMonth(new Date(2025, 11, 31), 1))).toBe(
      "2026-01-01",
    )
  })

  it("allows the whole current civil date but rejects tomorrow", () => {
    const today = new Date(2026, 8, 5, 0, 1)
    expect(isFutureCalendarDate(new Date(2026, 8, 5, 23, 59), today)).toBe(
      false,
    )
    expect(isFutureCalendarDate(new Date(2026, 8, 6, 0, 0), today)).toBe(true)
    expect(isFutureCalendarDate(new Date(2026, 7, 31), today)).toBe(false)
  })

  it("associates records by full date across month/year boundaries", () => {
    const records = [
      ...diaryDateKeys([
        { date: "2025-12-31", exists: true },
        { date: "2026-01-01", exists: true },
        { date: "2026-01-02", exists: false },
        { date: "2025-12-01", exists: true },
      ]),
    ]
    const week = getWeekDays(new Date(2026, 0, 1), records)
    expect(
      week
        .filter((day) => day.hasRecord)
        .map((day) => calendarDateKey(day.date)),
    ).toEqual(["2025-12-31", "2026-01-01"])
    expect(getWeekRange(new Date(2026, 0, 1))).toEqual({
      startDate: "2025-12-29",
      endDate: "2026-01-04",
    })
  })

  it("keeps server date-only record keys independent of timezone parsing", () => {
    const keys = diaryDateKeys([
      { date: "2026-09-01", exists: true },
      { date: "2026-09-01", exists: true },
      { date: "2026-09-02", exists: false },
    ])
    expect([...keys]).toEqual(["2026-09-01"])
    expect(
      getWeekDays(new Date(2026, 8, 1), [...keys])
        .find((day) => day.hasRecord)
        ?.date.getDate(),
    ).toBe(1)
  })

  it("a Sunday belongs to the same Monday-first week as the month grid", () => {
    const sunday = new Date(2026, 8, 6)
    expect(getWeekDays(sunday).map((day) => day.date.getDay())).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ])
    expect(getWeekRange(sunday)).toEqual({
      startDate: "2026-08-31",
      endDate: "2026-09-06",
    })
  })
})
