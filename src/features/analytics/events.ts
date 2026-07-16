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
  | "community_write"
  | "community_post"
  | "other"

export type AnalyticsSignupStep =
  | "terms"
  | "email_verification"
  | "password"
  | "profile"
  | "nickname"
  | "complete"

export type AnalyticsSignupMethod = "email" | "social"

export type AnalyticsMealSlot = "breakfast" | "lunch" | "dinner" | "snack"

export type AnalyticsFoodRecordSource = "fresh" | "recovered" | "saved"

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
  food_analysis_failed: { method: "photo" | "text" }
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
  if (group === "post") return "community_post"
  if (group === "(write)") return "community_write"
  if (group === "restaurant") return "restaurant"

  if (group === "(auth)") {
    return route === "login" || route === "email-login" ? "login" : "signup"
  }

  if (group === "(tabs)") {
    if (route === "home") return "home"
    if (route === "consult") return "consult"
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
    case "profile-setup":
      return "profile"
    case "nickname-setup":
      return "nickname"
    case "signup-complete":
      return "complete"
    default:
      return null
  }
}
