export {
  identifyAnalyticsUser,
  // 정책 게이트가 직접 부른다 — 게이트는 `RootLayoutNav` **밖**이라 그 안의
  // `useAnalyticsLifecycle` 이 도는 것을 기다릴 수 없다(설계 §9-①). 두 번 불려도
  // 안전하다(`analyticsClient` 의 `lifecycleInitialized`).
  initAnalyticsLifecycle,
  resetAnalyticsIdentity,
  trackAnalyticsEvent,
} from "./analyticsClient"
export {
  getAnalyticsScreenName,
  sanitizeAnalyticsProperties,
  toDurationBucket,
  toErrorPresentedProperties,
  type AnalyticsCodeSource,
  type AnalyticsDurationBucket,
  type AnalyticsEntryGate,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsFoodRecordSource,
  type AnalyticsFormName,
  type AnalyticsHealthInputKind,
  type AnalyticsHealthMetric,
  type AnalyticsMealSheetEntry,
  type AnalyticsMealSlot,
  type AnalyticsPolicySource,
  type AnalyticsStatsPeriod,
  type AnalyticsSignupMode,
  type AnalyticsRestaurantEntrySource,
  type AnalyticsRestaurantFilterAxis,
  type AnalyticsScreenName,
  type AnalyticsSurface,
} from "./events"
export { useAnalyticsLifecycle } from "./useAnalyticsLifecycle"
