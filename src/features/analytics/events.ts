export type AnalyticsScreenName =
  | "login"
  | "signup"
  | "onboarding"
  | "home"
  | "consult"
  | "recipe"
  | "restaurant"
  | "profile"
  | "notifications"
  | "health"
  | "community"
  | "community_write"
  | "community_post"
  | "other"

export type AnalyticsSignupStep =
  | "terms"
  | "email_verification"
  | "password"
  // 필수정보 스텝. 라우트가 하나라 화면 전환으로는 구분되지 않고,
  // 스텝 화면이 직접 auth_signup_step_viewed 를 쏜다.
  | "nickname"
  | "birth"
  | "gender"
  | "name"
  | "phone"
  | "acquisition"
  | "complete"

export type AnalyticsSignupMethod = "email" | "social"

export type AnalyticsMealSlot = "breakfast" | "lunch" | "dinner" | "snack"

export type AnalyticsFoodRecordSource = "fresh" | "recovered" | "saved"

/** 식당 필터의 축. 필터 시트의 섹션과 1:1 이다. */
export type AnalyticsRestaurantFilterAxis = "region" | "nutrition" | "cuisine"

/**
 * 상세 화면에 들어온 경로. `map` 은 지도 카드/마커, `list` 는 리스트 전용 모드,
 * `bookmark` 는 저장한 곳, `deep_link` 는 `sinsin://restaurant/:id` 로 들어온 경우다.
 * 어느 문이 실제로 쓰이는지 모르면 지도와 리스트 중 무엇을 다듬어야 할지 알 수 없다.
 */
export type AnalyticsRestaurantEntrySource =
  | "map"
  | "list"
  | "bookmark"
  | "search"
  | "deep_link"

export type AnalyticsEventProperties = {
  app_launch_started: Record<string, never>
  screen_viewed: { screen: AnalyticsScreenName }
  auth_session_restore_started: Record<string, never>
  auth_session_restore_failed: Record<string, never>
  auth_email_login_started: Record<string, never>
  auth_email_login_succeeded: Record<string, never>
  auth_email_login_failed: Record<string, never>
  auth_social_login_started: { provider: "google" | "apple" | "kakao" }
  auth_social_login_succeeded: { provider: "google" | "apple" | "kakao" }
  auth_social_login_failed: { provider: "google" | "apple" | "kakao" }
  auth_login_viewed: Record<string, never>
  auth_signup_started: { method: AnalyticsSignupMethod }
  auth_signup_step_viewed: { step: AnalyticsSignupStep }
  auth_signup_email_verified: Record<string, never>
  auth_signup_completed: { method: AnalyticsSignupMethod }
  auth_signup_failed: {
    method: AnalyticsSignupMethod
    stage: "consent" | "account" | "profile"
  }
  auth_withdrawal_cancelled: Record<string, never>
  onboarding_started: Record<string, never>
  onboarding_steps_loaded: { step_count: number }
  onboarding_steps_load_failed: Record<string, never>
  onboarding_step_viewed: { step_index: number; step_count: number }
  onboarding_step_completed: { step_index: number; step_count: number }
  onboarding_submitted: Record<string, never>
  onboarding_submit_failed: Record<string, never>
  onboarding_completion_viewed: Record<string, never>
  onboarding_completion_cta_pressed: Record<string, never>
  home_record_viewed: Record<string, never>
  home_statistics_viewed: Record<string, never>
  food_record_started: { slot: AnalyticsMealSlot }
  food_record_method_selected: {
    method: "camera" | "gallery" | "text" | "recipe" | "skip"
    slot: AnalyticsMealSlot
  }
  food_photo_permission_denied: { source: "camera" | "gallery" }
  food_analysis_started: { method: "photo" | "text" }
  food_analysis_succeeded: { method: "photo" | "text" }
  food_analysis_failed: {
    method: "photo" | "text"
    reason?: "confirmation_unavailable"
  }
  food_analysis_dismissed: { method: "photo" | "text" }
  food_record_result_viewed: { source: AnalyticsFoodRecordSource }
  food_record_saved: { source: "fresh" | "recovered" }
  food_record_save_failed: { source: "fresh" | "recovered" }
  food_record_skipped: { slot: AnalyticsMealSlot }
  food_record_edit_started: Record<string, never>
  food_record_edit_succeeded: {
    items_changed: boolean
    consumption_changed: boolean
    slot_changed: boolean
    label_changed: boolean
  }
  food_record_edit_failed: {
    items_changed: boolean
    consumption_changed: boolean
    slot_changed: boolean
    label_changed: boolean
  }
  health_entry_save_succeeded: Record<string, never>
  health_entry_save_failed: Record<string, never>

  /*
   * 식당 지도 (BUILD_CONTRACT §4).
   *
   * 속성 이름은 `sanitizeAnalyticsProperties` 의 금지 목록을 피해서 골랐다. 그 정규식은
   * `query`·`name`·`address`·`value`·`title` 같은 키를 **조용히 떨군다** — 타입에는
   * 남아 있는데 이벤트에는 안 실리는 조합이 되므로, 처음부터 통과하는 이름만 쓴다.
   *
   * 특히 검색어(`q`)와 AI 자연어 질의는 **일부러 싣지 않는다.** 신장 환자의 검색어는
   * "칼륨 낮은 국물" 처럼 건강 상태를 드러내고, 그 문자열은 분석 도구에 남을 이유가 없다.
   * 대신 결과의 모양(개수·폴백 여부)만 본다.
   */

  restaurant_map_open: Record<string, never>
  /**
   * `현재 지도에서 찾기` 결과. `bbox_diagonal_km` 은 면적이 아니라 **대각 거리**다 —
   * 서버가 그 값으로 상한을 판정하므로(200km) 같은 단위로 보는 것이 맞다.
   */
  restaurant_map_viewport_search: {
    bbox_diagonal_km: number
    zoom: number
    mode: "MARKER" | "CLUSTER"
    result_count: number
    truncated: boolean
    /** 사용자가 pill 을 누른 것이 아니라 코드가 태운 검색인가(최초 진입·지도 넓히기·지역 이동). */
    automatic: boolean
  }
  restaurant_marker_tap: { restaurant_id: number }
  restaurant_cluster_tap: { marker_count: number }
  /** 필터 시트의 `확인`. `options` 는 enum 값을 쉼표로 이은 것(자유 입력이 아니다). */
  restaurant_filter_apply: {
    axis: AnalyticsRestaurantFilterAxis
    selected_count: number
    options: string
  }
  restaurant_sort_change: { sort: string }
  /** `fallback: true` 는 AI 없이 키워드 매칭으로 답한 경우다(§F.23). */
  restaurant_ai_search: {
    fallback: boolean
    filter_count: number
    unmatched_count: number
  }
  restaurant_detail_open: {
    restaurant_id: number
    source: AnalyticsRestaurantEntrySource
  }
  restaurant_diagnose_tap: { restaurant_id: number; menu_count: number }
  restaurant_bookmark_toggle: {
    restaurant_id: number
    bookmarked: boolean
    source: AnalyticsRestaurantEntrySource
  }
  restaurant_review_submit: {
    restaurant_id: number
    rating: number
    photo_count: number
    keyword_count: number
  }
  /** 권한 요청의 **결과**. 요청을 띄운 사실만으로는 거부율을 알 수 없다. */
  restaurant_location_permission: {
    result: "granted" | "denied" | "undetermined"
  }
  /** 지도 SDK 로드 실패 → 리스트 모드로 내려간 횟수. 키 만료를 조용히 넘기지 않는다. */
  restaurant_map_degraded: Record<string, never>
}

export type AnalyticsEventName = keyof AnalyticsEventProperties
export type AnalyticsPrimitive = string | number | boolean

const PROHIBITED_PROPERTY_KEY =
  /(email|name|phone|birth|address|health|diagnosis|disease|ckd|food|meal|text|message|query|image|uri|url|token|title|date|error|content|answer|description|value)/i

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, AnalyticsPrimitive> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        !PROHIBITED_PROPERTY_KEY.test(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"),
    ),
  ) as Record<string, AnalyticsPrimitive>
}

export function getAnalyticsScreenName(
  segments: readonly string[],
): AnalyticsScreenName {
  const [group, route] = segments

  if (group === "onboarding") return "onboarding"
  // 상담은 탭에서 전역 모달 라우트로 이동했다 — 그룹 없이 루트에 선다.
  if (group === "consult") return "consult"
  if (group === "post") return "community_post"
  if (group === "(write)") return "community_write"
  if (group === "restaurant") return "restaurant"

  if (group === "(auth)") {
    return route === "login" || route === "email-login" ? "login" : "signup"
  }

  if (group === "(tabs)") {
    if (route === "home") return "home"
    if (route === "community") return "community"
    if (route === "recipe") return "recipe"
    if (route === "restaurant") return "restaurant"
    if (route === "all") return "profile"
  }

  if (group === "(settings)") {
    if (route?.includes("notification")) return "notifications"
    if (route?.startsWith("health")) return "health"
    return "profile"
  }

  return "other"
}

export function getAnalyticsSignupStep(
  segments: readonly string[],
): AnalyticsSignupStep | null {
  const [group, route] = segments
  if (group !== "(auth)") return null

  switch (route) {
    case "terms-agreement":
      return "terms"
    case "signup-email":
      return "email_verification"
    case "signup-password":
      return "password"
    // profile-setup 은 라우트 하나에 여섯 질문이 들어 있다. 라우트 진입으로
    // 한 번 찍으면 어느 질문에서 이탈했는지 못 본다 — 화면이 스텝별로 직접 찍는다.
    case "signup-complete":
      return "complete"
    default:
      return null
  }
}
