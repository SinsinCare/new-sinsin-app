import { StarScore } from "../src/features/restaurant/components/detail/StarRating"
jest.mock("react-native", () => ({
  View: "View",
  StyleSheet: { create: (x: unknown) => x },
}))
jest.mock("@/src/design-system-v2/primitives/NativeText", () => ({
  Text: "Text",
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values: unknown) => JSON.stringify({ key, values }),
  }),
}))
jest.mock("@/src/design-system-v2", () => ({
  iconSize: { xs: 12, lg: 24 },
  spacing: { 4: 4 },
  typography: {
    label: { small: {}, xSmall: {} },
    title: { large: {} },
    subtext: { medium: {} },
  },
  useV2Theme: () => ({
    colors: {
      status: { cautionary: "#f90" },
      label: { normal: "#222", neutral: "#666" },
    },
  }),
  V2Icon: "Icon",
}))
it.each([undefined, null])(
  "does not invent a zero review count when omitted (%s)",
  (reviewCount) => {
    const element = StarScore({ rating: 4.8, reviewCount })!
    expect(JSON.parse(element.props.accessibilityLabel)).toEqual({
      key: "restaurant.detail.ratingOnlyAccessibility",
      values: { rating: "4.8" },
    })
  },
)
it.each([0, 461])(
  "preserves an explicitly supplied count (%s)",
  (reviewCount) => {
    const element = StarScore({ rating: 4.8, reviewCount })!
    expect(JSON.parse(element.props.accessibilityLabel)).toEqual({
      key: "restaurant.detail.ratingAccessibility",
      values: { rating: "4.8", count: reviewCount },
    })
  },
)
it("does not announce a rating that is unavailable", () => {
  expect(StarScore({ rating: null, reviewCount: 0 })).toBeNull()
})
