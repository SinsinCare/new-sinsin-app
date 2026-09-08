/** Render real calendar branches with native primitives substituted for HTML.
 * This verifies status copy and date callbacks; geometry is checked in Simulator. */
import React from "react"
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (element: React.ReactElement) => string
}
import { MonthCalendarSheet } from "../src/features/home/components/statistics/MonthCalendarSheet"

const mockPressables: Record<string, any>[] = []
const mockQuery = {
  data: undefined as Set<string> | undefined,
  isPending: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
}
const mockMonthQuery = jest.fn((..._args: any[]) => mockQuery)
jest.mock("../src/features/home/hooks/useMonthDiaryExistence", () => ({
  useMonthDiaryExistence: (...args: any[]) => mockMonthQuery(...args),
}))
jest.mock("react-native", () => ({
  StyleSheet: { create: (value: unknown) => value, hairlineWidth: 1 },
  View: ({ children }: any) => React.createElement("div", {}, children),
  ScrollView: ({ children }: any) => React.createElement("div", {}, children),
  Pressable: (props: any) => {
    mockPressables.push(props)
    return React.createElement(
      "button",
      { disabled: props.disabled },
      typeof props.children === "function"
        ? props.children({ pressed: false })
        : props.children,
    )
  },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
}))
jest.mock("../src/shared/components/AppText", () => ({
  Text: ({ children }: any) => React.createElement("span", {}, children),
}))
jest.mock("../src/design-system-v2", () => ({
  V2BottomSheet: ({ children }: any) =>
    React.createElement("section", {}, children),
}))
jest.mock("@expo/vector-icons/Ionicons", () => () => null)
jest.mock("react-native-reanimated", () => {
  const animation = { reduceMotion: () => undefined }
  return {
    __esModule: true,
    default: {
      View: ({ children }: any) => React.createElement("div", {}, children),
    },
    FadeIn: { duration: () => animation },
    ReduceMotion: { System: "system" },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34 }),
}))
jest.mock("../src/hooks/useSurface", () => ({
  useSurface: () => ({
    ...jest.requireActual("../src/theme/surface").getSurfacePalette(false),
    isDark: false,
  }),
}))
jest.mock("../src/lib/haptics", () => ({ hapticSelection: jest.fn() }))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "ko" }, t: (key: string) => key }),
}))

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 5, 14))
  mockPressables.length = 0
  Object.assign(mockQuery, {
    data: undefined,
    isPending: false,
    isError: false,
    isFetching: false,
  })
  jest.clearAllMocks()
})
afterEach(() => jest.useRealTimers())

function render(visible = true) {
  const onSelectDate = jest.fn()
  const onClose = jest.fn()
  const html = renderToStaticMarkup(
    React.createElement(MonthCalendarSheet, {
      visible,
      selectedDate: new Date(2026, 8, 5),
      onSelectDate,
      onClose,
      disableFuture: true,
    }),
  )
  return { html, onSelectDate, onClose }
}

it("keeps dates usable on lookup failure and provides a retry", () => {
  mockQuery.isError = true
  const view = render()
  expect(view.html).toContain("stats.calendar.loadError")
  expect(view.html).not.toContain("stats.calendar.loading")
  mockPressables
    .find((p) => p.accessibilityLabel?.startsWith("2026년 9월 4일"))!
    .onPress()
  expect(view.onSelectDate).toHaveBeenCalledWith(new Date(2026, 8, 4))
  expect(view.onClose).toHaveBeenCalledTimes(1)
  mockPressables
    .find((p) => p.children?.props?.children === "action.retry")!
    .onPress()
  expect(mockQuery.refetch).toHaveBeenCalledTimes(1)
})

it("shows loading rather than claiming there are no records", () => {
  mockQuery.isPending = true
  expect(render().html).toContain("stats.calendar.loading")
  expect(
    mockPressables.filter((p) =>
      p.accessibilityLabel?.includes("hasMealRecord"),
    ),
  ).toHaveLength(0)
})

it("distinguishes a known empty month from pending, with no record marks", () => {
  mockQuery.data = new Set()
  const { html } = render()
  expect(html).toContain("stats.calendar.mealLegend")
  expect(html).not.toContain("stats.calendar.loading")
  expect(
    mockPressables.filter((p) =>
      p.accessibilityLabel?.includes("hasMealRecord"),
    ),
  ).toHaveLength(0)
})

it("marks only actual record dates, preserves selected state and disables future dates", () => {
  mockQuery.data = new Set(["2026-09-05"])
  render()
  const selected = mockPressables.find((p) =>
    p.accessibilityLabel?.startsWith("2026년 9월 5일"),
  )!
  expect(selected.accessibilityState).toEqual({
    selected: true,
    disabled: false,
  })
  expect(selected.accessibilityLabel).toContain("stats.calendar.hasMealRecord")
  expect(
    mockPressables.find((p) =>
      p.accessibilityLabel?.startsWith("2026년 9월 6일"),
    )?.disabled,
  ).toBe(true)
})

it("Today remains available even when today's date was already selected", () => {
  const view = render()
  mockPressables
    .find((p) => p.accessibilityLabel === "stats.calendar.goToday")!
    .onPress()
  expect(view.onSelectDate).toHaveBeenCalledTimes(1)
  expect(view.onClose).toHaveBeenCalledTimes(1)
})

it("does not request record markers while the calendar is closed", () => {
  render(false)
  expect(mockMonthQuery).toHaveBeenCalledWith(2026, 8, false)
})
