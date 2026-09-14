import { toRouteKey } from "@/src/shared/navigation/routeGraph"
// 오류의 갈래·해결책·그릇은 `lib/errorMessage` 가 정본이다. 여기서 다시 짓지 않는다 —
// 타입만 빌려 오므로(`import type`) 런타임 의존은 생기지 않는다.
import type {
  ErrorActionId,
  ErrorSurface,
} from "@/src/lib/errorMessage/catalog"
import type { ErrorKind, ResolvedError } from "@/src/lib/errorMessage/resolve"
// 같은 이유로 타입만 빌려 온다. 정책 판정의 정본은 `features/mobilePolicy`, 진입 URL
// 판정의 정본은 `shared/navigation/entryIntent` 다 — 유니온을 여기서 다시 적으면
// 그쪽이 값을 하나 늘렸을 때 이벤트만 조용히 옛 세계에 남는다.
import type {
  MobilePolicyDecision,
  MobilePolicySource,
} from "@/src/features/mobilePolicy/types"
import type { EntryUrlVerdict } from "@/src/shared/navigation/entryIntent"
// 온보딩 질문의 유형도 정본이 따로 있다(`types/onboarding`). 여기서 같은 유니온을
// 다시 적으면 서버가 유형을 하나 늘렸을 때 이벤트만 조용히 옛 세계에 남는다.
import type { OnboardingStepType } from "@/src/types/onboarding"

/**
 * 화면 축. **2026-08-18 부터** 이 표의 뜻이다 — 라우트 77개가 화면명 15개로 눌려 있던
 * 것을 라우트 키 1:1(접은 자리 6곳 제외)로 풀었다.
 *
 * ■ 이 날짜가 중요한 이유
 *
 * 행에 남는 것은 `screen_name` 문자열 하나뿐이고 라우트 경로는 어디에도 저장되지 않는다.
 * 그래서 **이미 쌓인 `other`·`profile`·`health`·`signup` 행은 소급 분해가 불가능하다** —
 * 영구히 혼합 버킷이며 백필할 방법이 없다. 이 날짜 앞뒤를 한 그래프에 겹쳐 읽지 말 것.
 *
 * ■ 의미가 좁아지는 토큰은 유지하지 않고 은퇴시켰다
 *
 * `profile`(27라우트)·`health`(9)·`signup`(8)·`notifications`(2)·`community_write`(5)·
 * `restaurant`(9) 는 새 문자열로 갈아탔다. 같은 이름의 숫자가 배포일에 조용히 절반으로
 * 줄어드는 것보다, 옛 이름이 0으로 수렴하고 새 이름이 올라오는 편이 **눈에 보인다.**
 * 1:1 이라 뜻이 안 변하는 6개(`home`·`community`·`recipe`·`consult`·`onboarding`·
 * `community_post`)만 문자열을 그대로 쓴다.
 */
/**
 * 페이월이 열린 자리. 기획서 §06 의 `entry_point` 표를 그대로 옮긴 것이다.
 *
 * **이 값이 이 기능의 전부다.** 어느 잠금이 실제로 결제를 만드는지는 이것 말고 알
 * 방법이 없다 — 페이월 판은 하나라 화면명으로는 구분되지 않는다.
 *
 * `server_gate` 는 서버 402 가 열었는데 capability→진입지점 매핑이 없을 때의 값이다.
 * **대시보드에 이 값이 보이면 표가 빠진 것**이고, `features/billing/types.ts` 의
 * `SERVER_GATE_ENTRY` 에 한 줄을 더해야 한다.
 */
export type AnalyticsPaywallEntry =
  | "stats_day_metric"
  | "stats_day_prev_date"
  | "stats_week_insight"
  | "stats_week_chart"
  | "stats_week_metric_switch"
  | "stats_month_metric"
  | "stats_month_weekly"
  | "stats_month_sticky"
  | "restaurant_filter_nutrition"
  | "restaurant_ai_search"
  | "restaurant_menu_all"
  | "restaurant_diagnose"
  | "restaurant_bookmark"
  | "meal_scan_limit"
  | "meal_analysis_metric"
  | "ai_chat_limit"
  | "report_export"
  | "settings_subscription"
  | "home_banner"
  | "push_weekly_ready"
  | "server_gate"

/** 구독 등급. 페이월 이벤트의 분모를 가르는 축이다. */
export type AnalyticsPlan = "free" | "premium" | "care_plus"

export type AnalyticsScreenName =
  // ── 루트 ───────────────────────────────────────────────────────────────────
  | "entry"
  | "onboarding"
  | "consult"
  | "statistics"
  | "meal_report"
  // 물·혈압·체중 기록 페이지(2026-09-05). 시트였을 때는 홈 안이라 화면 이름이 없었다.
  | "record_medication"
  // 약 등록 플로우(2026-09-08 기획 M4~M11). 검색·사진·촬영·후보·설정·관리는 각각 퍼널 스텝이다.
  | "medication_add"
  | "medication_search"
  | "medication_photo"
  | "medication_camera"
  | "medication_candidates"
  | "medication_edit"
  | "medication_manage"
  | "record_water"
  | "record_blood_pressure"
  | "record_weight"
  | "record_blood_glucose"
  | "record_edema"
  | "food_camera"
  | "community_story"
  | "community_library"
  | "dev_showcase"
  | "not_found"
  // ── 인증 ───────────────────────────────────────────────────────────────────
  | "login"
  | "login_email"
  | "password_reset"
  | "account_link"
  | "signup_terms"
  | "signup_email"
  | "signup_password"
  | "signup_profile"
  | "signup_complete"
  // ── 탭 ─────────────────────────────────────────────────────────────────────
  | "home"
  | "community"
  | "recipe"
  | "restaurant_map"
  | "my_page"
  // ── 커뮤니티 · 레시피 ──────────────────────────────────────────────────────
  | "community_post"
  | "community_popular"
  | "community_author"
  | "community_connections"
  | "community_report"
  | "community_search"
  | "recipe_detail"
  | "recipe_archive"
  // ── 식당 ───────────────────────────────────────────────────────────────────
  | "restaurant_detail"
  | "restaurant_photos"
  | "restaurant_review_write"
  | "restaurant_reviewer"
  | "restaurant_search"
  | "restaurant_list"
  | "restaurant_bookmarks"
  | "restaurant_report"
  // ── 작성 ───────────────────────────────────────────────────────────────────
  | "free_write"
  | "free_edit"
  | "story_write"
  | "recipe_write"
  | "recipe_edit"
  // ── 설정 · 마이페이지 ──────────────────────────────────────────────────────
  | "settings"
  | "profile_edit"
  | "profile_field_edit"
  | "kidney_profile"
  | "notification_settings"
  // 구독 관리. 페이월(`billing_paywall`)은 시트라 화면 축이 아니다 — 여기는 라우트다.
  | "subscription"
  | "notification_inbox"
  | "announcements"
  | "inquiry"
  // 1:1 문의 작성 폼. 목록(`inquiry`)에서 한 단계 들어가는 자리라 따로 센다(열림→전송 퍼널).
  | "inquiry_new"
  | "medical_reference"
  | "privacy_settings"
  | "app_info"
  | "legal_document"
  | "withdrawal"
  | "withdrawal_terms"
  | "withdrawal_complete"
  // ── 검진 분석 · 의사 연결 · 건강검진 ───────────────────────────────────────
  | "checkup_list"
  | "checkup_auth"
  | "checkup_detail"
  | "checkup_calendar"
  | "doctor_connections"
  | "doctor_intro"
  | "doctor_search"
  | "doctor_preview"
  | "doctor_sharing"
  | "doctor_report"
  // 표에 없는 라우트. 그룹 폴백을 두지 않으므로 **여기 떨어지면 표가 빈 것**이고,
  // `tests/analyticsScreenTable.test.ts` 가 그걸 CI 에서 막는다.
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

/**
 * `/(auth)/profile-setup` 이 **세 가지 일**을 한다(`useSignupSteps` 의 모드 판정).
 * 신규 가입(`signup`) · 소셜 로그인 뒤 프로필 마무리(`completion`) · 이미 가입한
 * 계정이 빠진 정보를 채우는 것(`backfill`).
 *
 * 세 모드가 한 라우트라 화면 축으로는 절대 안 갈린다. 그래서 여섯 질문의 진행 이벤트는
 * 전부 이 값을 싣는다 — 안 실으면 '가입 완주율' 에 이미 가입한 사람의 backfill 이
 * 섞여 들어온다.
 *
 * ■ 왜 **모든** 스텝 이벤트가 이 키를 싣는가
 *
 * 서버 퍼널의 속성 스코프(`prop:mode=signup`)는 `scoped` CTE **전체**에 걸린다.
 * 그 키를 안 싣는 스텝은 `props->>'mode'` 가 NULL 이라 통째로 탈락하고, 그러면
 * 퍼널이 그 자리에서 0 이 된다. 스코프로 읽을 퍼널은 **전 스텝이 같은 키를 실을 때만**
 * 성립한다(설계 §J1-0 정정 2).
 */
export type AnalyticsSignupMode = "signup" | "completion" | "backfill"

/**
 * 진입 분기가 사람을 떨군 관문. `resolveEntryRoute` 의 네 목적지와 1:1 이다.
 *
 * 라우트 문자열(`/(auth)/profile-setup`)을 그대로 싣지 않는 이유는 그것이 라우터의
 * 사정이기 때문이다 — 경로가 바뀌면 값이 갈라져 배포 전후를 못 잇는다.
 */
export type AnalyticsEntryGate = "login" | "profile" | "onboarding" | "home"

/**
 * 6자리 인증번호가 걸린 **표면**. 네 화면이 같은 3분 타이머·같은 재전송 문법을 쓰고,
 * 전부 "메일이 오는가" 라는 한 질문에 걸려 있다. 그래서 이름을 네 벌로 짓지 않고
 * 한 이름 + 이 값으로 센다.
 *
 * `email_link` 는 `signup-email` 화면이 **연결 모드**로 바뀐 상태다(소셜로 이미
 * 가입된 주소로 가입을 시도한 사람). 라우트가 같아 화면 축으로는 안 갈린다.
 */
export type AnalyticsCodeSource =
  | "signup"
  | "email_link"
  | "social_link"
  | "password_reset"

export type AnalyticsMealSlot = "breakfast" | "lunch" | "dinner" | "snack"

export type AnalyticsFoodRecordSource = "fresh" | "recovered" | "saved"

/**
 * 식사 시트를 연 **문**.
 *
 * 홈 시안(2026-09-04) 이후 문은 히어로 아래 CTA 하나다. 값 이름 `timeline_cta` 는
 * 그 전(타일·타임라인 빈칸·타임라인 CTA 셋)에서 이어받은 것이다 — 대시보드가 이 이름으로
 * 세고 있어 바꾸지 않는다. `tile`·`timeline_empty` 는 그날 이후 한 행도 안 나간다.
 *
 * **취소하고 되돌아온 재개는 이 값 중 아무것도 아니다.** 카메라·앨범·글에서 빠져나오면
 * 코드가 시트를 다시 열어 주는데(`openMealSheet`), 그 자리에서 이벤트를 쏘면 한 사람의
 * 한 번의 시도가 시트 진입 두 행이 되어 퍼널 1→2 가 이탈처럼 부풀고 2→3 이 함께 꺼진다.
 */
export type AnalyticsMealSheetEntry = "timeline_cta"

/**
 * 건강기록 다섯 지표. `AnalyticsSurface` 의 `home_*` 시트 다섯과 **1:1** 이다 —
 * 그래서 시트 열림/닫힘은 여기서 이름을 새로 짓지 않고 `sheet_opened`/`sheet_dismissed`
 * 가 그대로 센다(설계 §J2 `dropped`).
 */
export type AnalyticsHealthMetric =
  | "water"
  | "blood_pressure"
  | "blood_glucose"
  | "weight"
  | "edema"
  /** 약 복용(2026-09-04). 시트 없이 타일에서 바로 한 번을 기록한다. */
  | "medication"

/**
 * 값이 처음 생긴 **입력 도구**. 다섯 시트의 컨트롤이 제각각이라(키패드·스테퍼·프리셋·
 * 선택 카드) 한 자리에서 잡을 수 없고, 어느 도구가 실제로 쓰이는지가 곧 다음 시안의
 * 근거다.
 *
 * 혈당 시트의 시점·끼니 칩은 **여기 없다.** 그건 값이 아니라 맥락이고,
 * `health_entry_context_adjusted` 가 따로 센다 — 섞으면 숫자를 한 번도 안 넣은 사람이
 * '입력 시작' 에 들어와 3→4 하락이 입력 UI 문제처럼 보인다.
 */
export type AnalyticsHealthInputKind = "keypad" | "stepper" | "preset" | "card"

/** 통계 리포트의 기간 축. 서버 `PeriodType` 과 같은 세 값이다. */
export type AnalyticsStatsPeriod = "day" | "week" | "month"

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

/**
 * 가로지르는 공용 계측(L2)이 말하는 **"어디서"**.
 *
 * ■ 왜 자유 문자열이 아닌가
 *
 * 이 값은 `V2EmptyState`·`V2ErrorState`·`V2BottomSheet`·`useLoadingVisible` 처럼
 * 앱 전체가 공유하는 한 컴포넌트에서 나온다. 호출부가 자유롭게 지으면 같은 자리가
 * 배포마다 다른 이름으로 들어가고, 브레이크다운은 `group by 1 … limit N` 하나뿐이라
 * (설계 §2 P4) 오탈자 하나가 그 자리를 표에서 통째로 밀어낸다. 그래서 유니온으로
 * 잠근다 — 새 자리를 만들면 여기 한 줄을 추가해야 컴파일된다.
 *
 * ■ 단위는 "화면/기능" 이지 "경우" 가 아니다
 *
 * 한 화면 안에서 빈 상태가 셋이어도 surface 는 하나다(리뷰어 프로필의 글·후기·미제공).
 * 어떤 경우였는지가 필요해지면 그건 화면 축이 아니라 여정 이벤트(L3)의 몫이다.
 * 예외는 **독립된 판**이다 — 식당 상세의 메뉴·사진·후기 탭은 각자 로드하고 각자
 * 실패하므로 서로 다른 자리로 센다.
 *
 * ■ `app_error_presented` 의 `surface` 는 여기 없다
 *
 * 그쪽은 같은 이름의 다른 축이다(토스트냐 다이얼로그냐 = `ErrorSurface`).
 * 이름이 겹치는 것은 설계 문서 §5 표를 따른 것이고, 두 이벤트를 한 브레이크다운에
 * 섞으면 안 된다는 뜻이기도 하다.
 */
export type AnalyticsSurface =
  | "settings_preferences"
  // 1:1 문의 목록(내 문의·답변). 작성 화면(`inquiry`)과 다른 자리다 — 빈 상태·오류가 여기서 난다.
  | "settings_inquiry"
  // 신장 정보 수정의 진단 시기(연·월) 선택 시트(2026-09-12, 건강기록 키트로 재설계).
  | "settings_diagnosis_date"
  // ── 앱 진입·전역 ───────────────────────────────────────────────────────────
  | "app_entry"
  | "app_root"
  | "policy_gate"
  | "onboarding"
  | "not_found"
  | "dev_showcase"
  | "dialog_action_sheet"
  | "feature_intro"
  // 결제 페이월 시트. 열리는 자리는 20곳이 넘지만 **판은 하나**라 여기서 이름을
  // 새로 짓지 않는다 — 어디서 열렸는지는 `paywall_shown.entry` 가 센다.
  | "billing_paywall"
  // ── 홈 기록 시트 ───────────────────────────────────────────────────────────
  | "home_meal_record"
  | "home_meal_photo_confirm"
  | "home_meal_delete"
  | "home_water_record"
  | "home_weight"
  | "home_blood_pressure"
  // 기록 페이지 제목 옆 i — 권장량이 왜 사람마다 다른지 설명하는 시트(2026-09-05).
  | "home_water_info"
  | "home_weight_info"
  | "home_blood_pressure_info"
  | "home_blood_glucose"
  | "home_medication"
  | "home_edema"
  | "statistics_month_picker"
  // 리포트 본문의 대기·오류 자리. 기간을 바꿀 때마다 다시 로드하므로 화면이 아니라
  // **판** 하나로 센다(‹ › 이동과 세그먼트 전환이 같은 자리를 갈아 끼운다).
  | "statistics_report"
  // ── 커뮤니티 · 작성 ────────────────────────────────────────────────────────
  | "community_feed"
  | "community_search"
  | "community_popular"
  | "community_library"
  // 게시글 상세(S4)의 **글 본문** 자리 — 못 불러온 글·삭제된 글.
  // 화면 축의 `community_post` 와 **일부러 같은 문자열**이다: 화면 하나에 판 하나면
  // 이름을 새로 짓지 않는 것이 이 표의 관례고(28개 값이 화면명과 글자까지 같다),
  // 그래야 `screen_viewed` 와 `error_state_viewed` 를 번역표 없이 나란히 읽는다.
  | "community_post"
  // 그 화면의 **댓글 목록**. 본문과 따로 로드하고 따로 실패한다
  // (`isCommentsLoading`·`isCommentsError`·`refetchComments`) — 식당 상세의 탭 셋과
  // 같은 이유로 자리를 나눈다(머리말 §독립된 판). 한 칸에 섞으면 "글이 안 열렸다"
  // (화면이 죽음)와 "댓글만 못 받았다"(글은 읽힌다)가 구분되지 않는다.
  // 댓글 0건의 조용한 빈 상태도 여기서 센다.
  | "community_post_comments"
  // 답글 쓰기(S5). 라우트는 Phase 2 에 생긴다 — 그때 `ROUTE_SCREEN` 에
  // `community/reply` 를 같이 넣어야 이 자리의 행이 `screen_name=other` 로 안 쌓인다.
  | "community_reply"
  // 작성자 프로필(S9). 탭이 셋(후기·게시글·스토리)이지만 **한 자리**다 — 같은 모양의
  // 식당 리뷰어 프로필(`restaurant_reviewer`)과 같은 판정(머리말 §단위).
  | "community_author"
  // 팔로워/팔로잉(S10). `?mode=` 로 갈리는 두 목록이지만 한 화면·한 판이다 —
  // 어느 쪽이었는지가 필요해지면 화면 축이 아니라 여정 이벤트의 몫이다.
  | "community_connections"
  // 신신이웃 디렉터리(S11). 라우트는 Phase 2 — `community_reply` 와 같은 주의.
  | "community_neighbors"
  // 스토리 뷰어(S12) **본판**. 화면 축의 `community_story`(=`app/stories.tsx`)와 같은
  // 문자열이다. 여기서 세는 것은 스토리를 못 받은 경우고, 댓글 시트는 아래 값이다.
  | "community_story"
  // 그 뷰어의 **댓글 시트**. 시트는 따로 열리고 따로 로드된다 — 뷰어와 한 칸에 넣으면
  // `sheet_opened` 가 화면 진입과 섞여 시트를 연 비율을 잃는다.
  | "community_story_comments"
  // 신고 화면(S6)의 `기타 사유` 시트. 2026-08 까지 `community_post_category` 를
  // 재사용해 **글쓰기의 카테고리 고르기와 한 칸에 섞여 있었다**(설계 §3.6·D12).
  | "community_report_other"
  // 글쓰기의 카테고리 고르기 시트(`PostCategorySheet`). 위 `community_post*` 와 이름이
  // 이어져 보이지만 **상세 화면과 무관하다** — 작성 흐름의 자리다.
  | "community_post_category"
  // 등록 직전의 책임 확인 시트(2026-09-12, 편집기 안 체크박스에서 옮겼다).
  | "community_post_consent"
  | "free_write"
  | "free_edit"
  | "recipe_write"
  | "recipe_edit"
  // ── 레시피 ─────────────────────────────────────────────────────────────────
  | "recipe_list"
  | "recipe_detail"
  | "recipe_archive"
  | "recipe_filter"
  | "recipe_provenance"
  // ── 식당 ───────────────────────────────────────────────────────────────────
  | "restaurant_map"
  | "restaurant_list"
  | "restaurant_detail"
  | "restaurant_detail_menu"
  | "restaurant_detail_photo"
  | "restaurant_detail_review"
  | "restaurant_bookmarks"
  | "restaurant_reviewer"
  | "restaurant_review_write"
  | "restaurant_media_picker"
  | "restaurant_coming_soon"
  | "restaurant_ai_search"
  /*
    상세의 `AI 식단 상담` 시트. **`restaurant_ai_search` 와 같은 자리가 아니다** —
    그쪽은 지도에서 조건으로 가게를 찾는 시트고, 이쪽은 한 가게를 정해 놓고 그 메뉴를
    묻는 대화 표면이다. 하나로 접으면 `sheet_opened`/`sheet_dismissed` 의 체류가
    "질문 한 줄 고르고 닫음(수 초)" 와 "대화 몇 턴(수 분)" 의 평균이 되어 둘 다 못 읽는다.
  */
  | "restaurant_ai_consult"
  | "restaurant_filter"
  | "restaurant_sort"
  | "restaurant_review_sort"
  | "restaurant_review_report"
  | "restaurant_route_app"
  // ── 검진 분석 · 의사 연결 · 건강검진 ───────────────────────────────────────
  | "checkup_list"
  | "checkup_detail"
  | "checkup_detail_analysis"
  | "checkup_calendar"
  | "checkup_auth"
  | "checkup_round_picker"
  | "doctor_connections"
  | "doctor_search"
  | "doctor_sharing"
  | "doctor_report"
  | "exam_ocr_review"
  | "health_dashboard"
  | "health_results"
  | "health_result_detail"

/**
 * 소요시간의 **버킷**. 원값(ms)은 절대 싣지 않는다 — 서버 질의 계층에 백분위·히스토그램이
 * 없어서(`breakdown.ts` 는 `group by 1 order by events desc limit N` 하나뿐) ms 로
 * 브레이크다운하면 값마다 events=1 인 행이 limit 만큼 잘려 나올 뿐이다(설계 §2 P4).
 *
 * 대기(`wait_bucket`)와 시트 체류(`dwell_bucket`)가 같은 눈금을 쓴다. 둘을 다른 눈금으로
 * 두면 "3초" 가 이벤트마다 다른 칸에 떨어져 대시보드에서 서로 비교할 수 없게 된다.
 */
export type AnalyticsDurationBucket =
  | "instant"
  | "fast"
  | "ok"
  | "slow"
  | "very_slow"

export function toDurationBucket(ms: number): AnalyticsDurationBucket {
  if (ms < 300) return "instant"
  if (ms < 1_000) return "fast"
  if (ms < 3_000) return "ok"
  if (ms < 10_000) return "slow"
  return "very_slow"
}

/**
 * 유효성 실패를 세는 폼. surface 와 같은 이유로 닫아 둔다.
 *
 * `react-hook-form` 의 `handleSubmit(onValid, onInvalid)` 이 붙는 폼만 있다. 손으로
 * 스텝을 넘기는 화면(비밀번호 재설정의 이메일·인증번호 단계 등)은 막는 지점이 폼이
 * 아니라 CTA 활성 조건이라, 여기에 넣으면 없는 통로를 있는 척하게 된다.
 */
export type AnalyticsFormName =
  | "email_login"
  | "signup_password"
  | "password_reset_new"
  | "account_link_password"

/**
 * 정책 판정이 **어디서 왔는가**. `MobilePolicySource` 에 `"none"` 을 더한 것이다 —
 * 정책이 아직/아예 없는 화면(피처 플래그가 꺼진 자리)도 그 사실을 값으로 남겨야
 * "서버가 껐다" 와 "물어보지도 못했다" 가 갈린다. `null` 을 실으면 새니타이저가
 * 키째로 떨궈 그 행이 브레이크다운에서 통째로 사라진다.
 */
export type AnalyticsPolicySource = MobilePolicySource | "none"

export type AnalyticsEventProperties = {
  app_launch_started: Record<string, never>
  /**
   * 세션 복구가 끝난 뒤 진입 분기가 **어느 관문으로 보냈는지**. `/`(entry)는 리다이렉트라
   * 다음 화면과 같은 순간이고 화면명으로는 목적지를 모른다 — 이 한 행이 유일한 창이다.
   *
   * "가입은 끝났는데 매번 profile-setup 으로 되돌아가는 사람" 이 몇 명인지는 지금 셀
   * 방법이 없다. `gate:'profile'` 이 재실행마다 반복되는 사람이 그들이다.
   *
   * 판정이 바뀔 때만 쏜다(같은 관문으로 다시 그려지는 것은 사건이 아니다).
   */
  app_entry_routed: { gate: AnalyticsEntryGate }
  screen_viewed: { screen: AnalyticsScreenName }
  /**
   * 화면 구간이 끝난 순간. `screen_viewed` 만으로는 마지막 화면은 알 수 있어도 그 화면에
   * 2초 있었는지 2분 있었는지 알 수 없다.
   *
   * `dwell_seconds` 는 Mixpanel의 histogram/time breakdown용 원값이고, 자사 dashboard는
   * 카디널리티가 낮은 `dwell_bucket`을 쓴다. background에서 구간을 닫아 앱이 꺼져 있던
   * 시간을 체류로 세지 않는다. 복귀는 같은 화면의 새 screen_viewed 구간이다.
   */
  screen_exited: {
    screen: AnalyticsScreenName
    reason: "navigation" | "background"
    dwell_seconds: number
    dwell_bucket: AnalyticsDurationBucket
  }
  auth_session_restore_started: Record<string, never>
  auth_session_restore_failed: Record<string, never>
  auth_email_login_started: Record<string, never>
  auth_email_login_succeeded: Record<string, never>
  /**
   * `fail_kind` 를 여기서 **직접** 싣는 이유는 이 실패가 공용 통로를 안 지나기
   * 때문이다. 인증 화면의 실패는 `presentAuthFailure` 를 타는데, 그것은 카탈로그가
   * `surface:'dialog'` 로 판정한 것만 `presentError` 로 넘기고 **나머지는 필드 아래
   * 한 줄로 직접 그린다.** 즉 가장 흔한 실패(틀린 비밀번호 `LOGIN_ERROR_001`,
   * 가입한 적 없는 계정 `AUTH_ERROR_001`)는 `app_error_presented` 에 한 행도 안 남긴다.
   *
   * 값은 `resolveError` 가 이미 판정한 것(`toAnalyticsFailKind`)이라 분류를 다시 짓지
   * 않는다. 탈퇴 대기(`AUTH_ERROR_008`) 행은 뒤이어 `auth_withdrawal_prompt_viewed`
   * 가 따라 나오므로 두 이름의 수가 맞아야 한다.
   */
  auth_email_login_failed: { fail_kind: string }
  auth_social_login_started: { provider: "google" | "apple" | "kakao" }
  auth_social_login_succeeded: { provider: "google" | "apple" | "kakao" }
  /**
   * 소셜 로그인이 **실패로 끝난** 전체. 2026-08-19 부터 여기서 **취소가 빠졌다** —
   * 종전에는 네이티브 시트를 닫은 사람까지 이 이름으로 세어 소셜 실패율이 통째로
   * 부풀어 있었다(설계 §J1-4). 그 몫은 `auth_social_login_cancelled` 로 간다.
   *
   * **이 날짜 앞뒤를 한 그래프에 겹쳐 읽지 말 것.** 값이 줄어드는 것이 개선이 아니라
   * 정의 변경이다.
   */
  auth_social_login_failed: { provider: "google" | "apple" | "kakao" }
  /**
   * 사용자가 구글/카카오/애플 시트를 그냥 닫은 순간. 이 여정 최대의 조용한 이탈이고,
   * 코드는 아무 것도 안 하고 return 하므로 지금까지 흔적이 없었다.
   *
   * `auth_social_login_started` 의 다음 걸음은 **셋 중 하나**다 — succeeded ·
   * cancelled · failed. 셋의 합이 started 와 같아야 한다(그렇지 않으면 분류가 샌 것).
   */
  auth_social_login_cancelled: { provider: "google" | "apple" | "kakao" }
  /**
   * 실패 중에서 **막다른 길이 정해져 있는** 갈래. `auth_social_login_failed` 를
   * 나누는 것이지 더하는 것이 아니다(같은 사건에 두 이름이 나간다).
   *
   * 세 값의 다음 걸음이 완전히 다르다 — `provider_email_required` 는 7초짜리 토스트가
   * 전부라 안내가 사라지면 아무 흔적도 안 남고, `link_required` 는 다른 화면으로
   * push 되며, `generic` 은 다이얼로그다.
   *
   * **`withdrawal_pending` 은 여기 없다.** 그 갈래는 같은 틱에 탈퇴 확인 모달을 띄우고,
   * 두 이름으로 세면 '소셜 막힘' 총량과 '탈퇴 모달 노출' 총량이 서로를 중복 포함한다
   * (설계 §J1-0 정정 3). 그 갈래는 `auth_withdrawal_prompt_viewed{source:'social'}`
   * 하나로만 센다.
   */
  auth_social_login_blocked: {
    provider: "google" | "apple" | "kakao"
    fail_kind: "provider_email_required" | "link_required" | "generic"
  }
  /**
   * 탈퇴 대기 계정이 로그인을 시도해 확인 모달이 뜬 순간. `source` 가 두 진입로를
   * 가른다 — 종전에는 소셜 쪽만 흔적이 있고 이메일 로그인 쪽은 아예 없어 축이
   * 비대칭이었다.
   *
   * 여기서 나가는 길은 `auth_withdrawal_cancelled`(복귀 성공) 하나뿐이다. 그 둘의
   * 차이가 곧 **갈 곳 없이 모달을 닫은 사람**이다.
   */
  auth_withdrawal_prompt_viewed: { source: "social" | "email" }
  auth_login_viewed: Record<string, never>
  auth_signup_started: { method: AnalyticsSignupMethod }
  auth_signup_step_viewed: { step: AnalyticsSignupStep }
  /**
   * 약관 항목 하나를 켜거나 끈 순간. `all` 은 전체 동의 토글이다.
   *
   * 약관 화면의 이탈은 "아무것도 안 눌렀다" 와 "누르다 말았다" 가 다르다 — 앞의 것은
   * 위계가 안 읽히는 것이고 뒤의 것은 필수/선택 구분에서 멈춘 것이다. 마케팅 동의율도
   * 여기서만 나온다.
   *
   * `method` 를 싣는 이유는 퍼널 때문이다. 소셜 모드에서는 `auth_signup_started` 가
   * **약관 화면보다 먼저** 나가므로(소셜 로그인 응답이 consent_required 인 순간)
   * 그 이름을 스텝 2 로 두면 소셜 가입자 전원이 이탈로 계산된다(설계 §J1-0 정정 1).
   * 그래서 스텝 2 는 `auth_terms_submitted` 이고, 두 스텝이 **모두** `method` 를 실어
   * `prop:method=…` 스코프가 성립한다.
   */
  auth_terms_item_toggled: {
    item: "service" | "privacy" | "marketing" | "all"
    agreed: boolean
    method: AnalyticsSignupMethod
  }
  /**
   * 약관 화면의 '다음' 을 눌러 관문을 넘긴 순간. **누른 순간**이지 서버가 받아 준
   * 순간이 아니다 — 소셜 모드는 여기서 서버 왕복이 있고 그 실패는
   * `auth_signup_failed{stage:'consent'}` 가 따로 센다.
   *
   * 이메일 모드의 `auth_signup_started` 와 같은 순간이지만 이름을 따로 둔다. 소셜
   * 모드에는 그 자리에 쏠 이름이 없어서(started 는 이미 지나갔다) 한 이름으로는
   * 두 모드의 같은 걸음을 못 잇는다.
   */
  auth_terms_submitted: { method: AnalyticsSignupMethod }
  /**
   * 인증번호가 **실제로 나간** 순간(요청이 성공한 뒤). 요청 시점이 아니라 성공 시점에
   * 쏘는 이유는 그래야 화면 진입 → 이 이벤트의 하락이 곧 **발송 실패**이기 때문이다.
   * 별도의 `*_code_send_failed` 를 짓지 않아도 되는 것이 이 선택의 값이다.
   *
   * `attempt_no` 는 이 화면에서 몇 번째 발송인지(1부터). 재전송 횟수는 메일 도달
   * 문제의 유일한 신호다. **10 에서 클램프한다** — 상한이 없으면 재전송을 반복하는
   * 한 사람이 브레이크다운의 행 수를 지배한다.
   */
  auth_code_requested: { source: AnalyticsCodeSource; attempt_no: number }
  /**
   * 6자리를 넣었는데 통과하지 못한 순간.
   *
   * `mismatch` 는 서버가 **200 으로** "맞지 않는다" 고 답한 경우다 — 오류 봉투가
   * 아니라서 `presentError` 를 거치지 않고, 따라서 `app_error_presented` 에 한 행도
   * 안 남는다. 이 이름이 있어야만 보이는 실패다.
   *
   * 나머지 값은 `resolveError` 가 판정한 코드(`OTP_ERROR_002` 만료 · `OTP_ERROR_003`
   * 오타) 또는 범주다.
   */
  auth_code_verify_failed: { source: AnalyticsCodeSource; fail_kind: string }
  /**
   * 3분 타이머가 0 이 될 때까지 번호를 못 넣은 순간. **메일 지연의 직접 증거**이고,
   * 타이머는 매초 갱신되므로 반드시 false→true 전이에서 1회만 쏜다.
   */
  auth_code_expired: { source: AnalyticsCodeSource }
  /**
   * "이 주소는 이미 소셜로 가입돼 있다" 안내 모달이 뜬 순간(`AUTH_ERROR_009`).
   *
   * 이 실패는 `presentError` 를 안 지나간다 — 화면이 직접 받아 모달을 띄우고 인라인
   * 문구를 쓴다. 그래서 `app_error_presented` 로 대체되지 않는다.
   *
   * 여기서 '본인확인 진행' 을 고른 사람은 곧바로 `auth_code_requested{source:
   * 'email_link'}` 를 남긴다 — 별도의 `*_resolved` 이벤트를 두지 않는 이유다.
   */
  auth_email_link_prompt_viewed: Record<string, never>
  auth_signup_email_verified: Record<string, never>
  /**
   * 비밀번호 화면을 **빠져나간** 순간. 종전에는 진입(`auth_signup_step_viewed`
   * `{step:'password'}`)만 있어 '들어왔는데 못 나간 사람' 을 셀 수 없었다.
   *
   * CTA 가 규칙 미달이면 계속 disabled 라 "눌렀는데 안 됐다" 라는 사건 자체가 존재할
   * 수 없다. 그래서 이 화면의 이탈은 오직 진입−통과의 차로만 보인다
   * (형식 위반 제출은 `form_validation_failed{form:'signup_password'}` 가 따로 센다).
   */
  auth_signup_password_submitted: Record<string, never>
  /**
   * 필수정보 여섯 질문 중 하나를 **끝낸** 순간. 마지막 질문은 제출을 태우기 직전에 쏜다.
   *
   * 이 여정에서 가장 긴 구간(한 라우트 안 여섯 질문)의 유일한 성공 축이다. 화면 축은
   * `signup_profile` 하나뿐이라 어느 질문에서 멈췄는지 절대 못 가른다.
   *
   * 같은 이름을 여섯 번 배치한 **순번 퍼널**로 읽는다(퍼널 엔진은 이름만 매칭하므로
   * `step` 속성으로는 스텝을 나눌 수 없다). 뒤로 갔다 다시 완료하면 순번이 밀리는
   * 상한 추정치이고, 그 오차는 `auth_signup_step_reverted` 량으로 가늠한다.
   */
  auth_signup_step_completed: {
    step: AnalyticsSignupStep
    step_index: number
    mode: AnalyticsSignupMode
  }
  /** 되돌아가기 전 질문. 뒤로가기가 몰리는 질문 = 답을 잘못 이해한 질문이다. */
  auth_signup_step_reverted: {
    step: AnalyticsSignupStep
    step_index: number
    mode: AnalyticsSignupMode
  }
  /**
   * 넘어가려 했는데 막힌 순간.
   *
   * `taken`(닉네임 중복)은 서버 왕복 **뒤에야** 알려 주는 이 여정 유일의 실패이고,
   * 200 응답이라 오류 통로를 안 지난다. `server` 는 그 왕복이 4xx 로 돌아온 경우인데
   * 화면이 필드 아래에 직접 그리므로 역시 `app_error_presented` 가 없다.
   * `invalid_input` 은 CTA 가 비활성인 채 엔터로 제출한 경우다.
   *
   * 통신 실패는 **여기 없다** — 그건 `presentError` 를 지나가므로
   * `app_error_presented{kind:'offline'}` 가 이미 센다.
   */
  auth_signup_step_blocked: {
    step: AnalyticsSignupStep
    fail_kind: "invalid_input" | "taken" | "server"
    mode: AnalyticsSignupMode
  }
  auth_signup_completed: { method: AnalyticsSignupMethod }
  auth_signup_failed: {
    method: AnalyticsSignupMethod
    stage: "consent" | "account" | "profile"
    /*
      아래 넷은 `stage:'account'` 의 "인증 없이 이메일 분기에 도달" 갈래만 싣는다.
      로그인된 사용자가 거기 왔다면 완성 모드 판정이 어긋난 것인데(2026-08-25 실기기
      무한 루프), 그 궤적을 쫓을 유일한 흔적이 이 이벤트라 — 어느 스토어 값이
      오염됐는지가 여기 남아야 다음 진단이 기기 로그 없이 끝난다.
    */
    account_state?: string
    entry_gate?: string
    session_persistence?: string
    is_authenticated?: boolean
  }
  /**
   * 계정 연결 곁길의 완주. 방향이 둘이라 `mode` 로 가른다 — `social_email` 은 구계정
   * 소셜에 이메일을 잇는 것(`/(auth)/social-link-email`), `email_password` 는 소셜
   * 계정에 이메일 로그인을 붙이는 것(`/(auth)/email-login-link-password`).
   *
   * 화면명이 둘 다 `account_link` 로 접혀 있어(설계 §4 접은 자리) 화면 축으로는 방향이
   * 안 갈린다. 실패는 전부 `presentAuthFailure`/인라인이라 `app_error_presented` 와
   * 나란히 읽는다.
   */
  auth_account_link_completed: { mode: "social_email" | "email_password" }
  /**
   * 로그인 못 하는 사람이 **스스로 복구에 성공한** 순간. 이 여정은 화면 축에서
   * `password_reset` 으로 갈라져 있으므로 진입은 `screen:password_reset` 으로 세고,
   * 여기서는 완주만 센다.
   */
  auth_password_reset_completed: Record<string, never>
  auth_withdrawal_cancelled: Record<string, never>
  onboarding_started: Record<string, never>
  /**
   * 진단 여부를 묻는 첫 화면이 실제로 그려진 순간. `onboarding_started` 는 마운트마다
   * 나가지만, 저장된 진행이 있으면 welcome 을 **건너뛰고** 바로 질문으로 간다.
   * 그래서 started 를 welcome 통과율의 분모로 쓰면 복귀자가 섞인다.
   */
  onboarding_welcome_viewed: Record<string, never>
  /**
   * 첫 관문 통과(= 질문 목록 로딩을 태운 순간). **선택값(진단 여부)은 싣지 않는다** —
   * 건강 정보이고, `branch` 같은 중립적 키로 우회하는 것도 같은 우회다.
   */
  onboarding_welcome_confirmed: Record<string, never>
  /**
   * 첫 질문 또는 실패 화면에서 welcome 으로 되돌아간 순간. **진행이 초기화되는 유일한
   * 자리**다(`resetProgress`). 여기를 왕복하는 사람은 사실상 갇힌 사람이다.
   */
  onboarding_welcome_returned: Record<string, never>
  onboarding_steps_loaded: { step_count: number }
  /**
   * 질문 목록을 못 받은 순간. `fail_kind:'empty'` 는 **200 인데 0건**이라 오류 통로를
   * 안 지나가고, 예외 갈래도 화면이 문장을 직접 그린다(`presentError` 를 안 부른다).
   * 즉 이 이름이 없으면 가입 직후 앱을 한 번도 못 쓴 사람이 어디에도 안 남는다.
   *
   * 재시도는 별도 이름을 짓지 않는다 — 실패 뒤에 오는 두 번째 `onboarding_steps_loaded`
   * / `onboarding_steps_load_failed` 가 곧 재시도다.
   */
  onboarding_steps_load_failed: { fail_kind: string }
  /**
   * `step_kind` 는 질문의 **유형**이다. `step_index` 는 분기(예방 목적이면 두 질문이
   * 사라진다)에 따라 같은 번호가 다른 질문을 가리키므로 그것만으로는 아무것도 못 읽는다.
   *
   * 서버 질문번호(`step_no`)는 **일부러 안 싣는다** — 진단자 전용 스텝(9·10)의 존재
   * 자체가 진단 여부를 함의한다.
   */
  onboarding_step_viewed: {
    step_index: number
    step_count: number
    step_kind: OnboardingStepType
  }
  onboarding_step_completed: {
    step_index: number
    step_count: number
    step_kind: OnboardingStepType
  }
  /** 질문 사이에서 뒤로 간 순간. 순번 퍼널이 상한 추정치인 이유의 크기를 잰다. */
  onboarding_step_reverted: { step_index: number; step_count: number }
  onboarding_submitted: Record<string, never>
  onboarding_submit_failed: Record<string, never>
  onboarding_completion_viewed: Record<string, never>
  onboarding_completion_cta_pressed: Record<string, never>
  home_record_viewed: Record<string, never>
  home_statistics_viewed: Record<string, never>
  /**
   * 홈에서 다른 날짜를 골랐다. **원시 날짜는 안 싣는다** — `date` 키는 새니타이저가
   * 떨구고, 실었더라도 카디널리티가 하루에 하나씩 는다.
   *
   * 이 이름이 없으면 "홈에 왔는데 기록 안 함" 안에 **과거 조회**가 섞인다. 지난 날짜를
   * 보는 사람은 애초에 기록할 생각이 없었으므로, 그 몫을 빼야 기록 진입률이 사실이 된다.
   */
  home_date_selected: {
    is_today: boolean
    days_back: "0" | "1_7" | "8_30" | "over_30"
  }
  food_record_started: { slot: AnalyticsMealSlot }
  /**
   * 식사 기록 파이프라인의 **진짜 시작점**. 종전에는 방법을 고른 뒤에야
   * (`food_record_started`) 찍혀서 "시트만 열고 아무것도 안 고르고 닫음" 이 통째로
   * 안 보였다.
   *
   * ■ `sheet_opened{surface:'home_meal_record'}` 가 있는데 왜 또 짓는가
   *
   * 공용 통로는 **어느 시트인가**까지만 말한다. 이 여정이 물어야 하는 것은 그 다음이다 —
   * 어느 문으로 왔고(`entry`), 어느 끼니로 열렸고(`slot`), 그 끼니가 이미 기록돼 있어
   * '결과 보기' 만 보이는 상태였는가(`recorded`). 특히 `recorded:true` 는 기록 시도가
   * **일어날 수 없는** 열림이라, 분모에서 빼지 않으면 2→3 하락이 영원히 과장된다.
   *
   * 취소하고 되돌아온 재개에서는 쏘지 않는다(`AnalyticsMealSheetEntry` 머리말).
   */
  food_record_sheet_viewed: {
    slot: AnalyticsMealSlot
    entry: AnalyticsMealSheetEntry
    recorded: boolean
  }
  food_record_method_selected: {
    method: "camera" | "gallery" | "text" | "recipe" | "skip"
    slot: AnalyticsMealSlot
  }
  food_photo_permission_denied: { source: "camera" | "gallery" }
  /**
   * 권한이 **허용된** 순간. 거부(`food_photo_permission_denied`)의 분모다 — 지금까지는
   * 거부만 찍혀서 "권한 거부가 늘었다" 와 "카메라를 여는 사람이 줄었다" 가 같은 그래프였다.
   *
   * 이미 허용된 사용자에게서도 매번 나간다(`requestPermissionsAsync` 가 즉시 granted 로
   * 답한다). 그래서 `food_record_method_selected` 와 **같은 초**에 찍히고, 퍼널에서
   * 그 둘을 인접 스텝으로 두면 통과하지 못한다(설계 §J2-4 2).
   */
  food_photo_permission_granted: { source: "camera" | "gallery" }
  /**
   * 권한은 통과했는데 촬영·선택을 그만둔 순간(네이티브 피커가 빈손으로 돌아왔다).
   * 지금까지 이 이탈은 권한 거부와 **구분되지 않는 침묵**이었다 — 코드는 조용히 시트를
   * 되돌려 놓고 아무 흔적도 남기지 않는다.
   *
   * `replacing` 은 확인 시트의 '다른 사진 고르기' 에서의 취소다. 그때는 고르던 사진이
   * 그대로 남으므로 **이탈이 아니다** — 섞으면 앨범 취소율이 부풀어 오른다.
   */
  food_photo_picker_cancelled: {
    source: "camera" | "gallery"
    replacing: boolean
  }
  /*
    고른 사진의 확인 단계. 앨범은 탭 한 번으로 사진을 돌려주므로 실수 선택이 그대로
    분석으로 가던 자리다 — 여기서 되돌린 비율(replaced·cancelled ÷ viewed)이 그 실수가
    실제로 얼마나 있었는지를 말해 준다. 카메라 경로는 iOS 가 같은 확인을 이미 갖고 있어
    지금은 gallery 만 쏜다.
  */
  food_photo_confirm_viewed: { source: "gallery" | "camera" }
  food_photo_confirm_accepted: { source: "gallery" | "camera" }
  food_photo_confirm_replaced: { source: "gallery" | "camera" }
  food_photo_confirm_cancelled: { source: "gallery" | "camera" }
  food_analysis_started: { method: "photo" | "text" }
  /* ── 약 등록 퍼널(2026-09-08 기획 M4~M11). 약 이름은 싣지 않는다(RQ-61). ── */
  medication_add_method_selected: { method: "search" | "photo" | "manual" }
  /** 검색어 길이와 결과 수만. 검색어 자체는 병명을 추정할 수 있어 싣지 않는다. */
  medication_search_performed: { query_length: number; result_count: number }
  medication_search_result_selected: { rank: number }
  medication_photo_captured: {
    side: "front" | "back"
    source: "camera" | "gallery"
  }
  medication_recognition_result: {
    status: "candidates" | "no_match" | "poor_image" | "unavailable"
    confidence: "high" | "medium" | "low" | "none"
    reason: "disabled" | "quota" | "busy" | "timeout" | "provider" | null
    candidate_count: number
    duration_ms: number | null
  }
  medication_candidate_confirmed: { rank: number; score: number | null }
  medication_plan_saved: {
    source: "MANUAL" | "CATALOG" | "PHOTO"
    existing: boolean
    reminder: boolean
    slot_count: number
    duplicate_kept: boolean
  }
  medication_plan_status_changed: { status: "ACTIVE" | "PAUSED" | "ARCHIVED" }
  /**
   * 분석 잡의 상태가 **바뀐** 순간. 폴링은 0.5~1.5초마다 도는데 상태는 두 번밖에 안
   * 바뀌므로, 전이에서만 쏘면 분석 1건당 최대 2행이다(설계 §8 고빈도 상한).
   *
   * `QUEUED` 는 **쏘지 않는다** — `food_analysis_started` 와 같은 틱이라 한 사건이 두
   * 행이 되고, 퍼널에서 둘을 인접 스텝으로 쓰면 초 정밀도 엄격 부등호에 걸려 통째로
   * 빠진다(설계 §J2-4 2).
   *
   * 확인 질문에 답하고 다시 폴링에 들어가면 같은 분석이 `PERCEIVING` 을 두 번 지날 수
   * 있다. 그래서 가드는 "직전 상태와 다른가" 가 아니라 **`analysisId`+상태당 1회**다.
   */
  food_analysis_progressed: {
    method: "photo" | "text"
    status: "PERCEIVING" | "RESOLVING"
  }
  food_analysis_succeeded: { method: "photo" | "text" }
  /**
   * `fail_kind` 는 `resolveError` 가 이미 판정한 것(`toAnalyticsFailKind`)이다 — 400·500·
   * 타임아웃·오프라인이 지금은 한 숫자인데, 서버 장애와 사진 품질 문제는 처방이 정반대다.
   * 잡이 `FAILED` 로 닫힌 경우는 `FOOD_CAMERA_005`, 확인 UI 가 없는 빌드에서 접은 경우는
   * `confirmation_unavailable` 이다.
   *
   * `reason` 은 **옛 키를 살려 둔 것**이다. 기존 대시보드 질의가
   * `reason='confirmation_unavailable'` 을 보고 있어서, 전환 기간에는 두 키를 같이
   * 싣는다(설계 §J2-4 6). 새 질의는 `fail_kind` 만 본다.
   *
   * `wait_bucket` 은 분석 시작부터 실패까지. 원값(ms)은 서버에 백분위 집계가 없어
   * 쓸 수 없다(설계 §2 P4).
   */
  food_analysis_failed: {
    method: "photo" | "text"
    fail_kind: string
    wait_bucket: AnalyticsDurationBucket
    reason?: "confirmation_unavailable"
  }
  /**
   * 분석 대기 중 X 로 나간 순간. `method` 하나로는 "몇 초 기다리다 포기하는가" 를 못
   * 읽는데, 그게 로딩 문구·타임아웃 정책의 유일한 근거다.
   *
   * `status` 는 나갈 때의 마지막 잡 상태다. `NONE` 은 첫 응답조차 오기 전 — 그건
   * 느린 분석이 아니라 **느린 업로드**이므로 고칠 곳이 다르다.
   */
  food_analysis_dismissed: {
    method: "photo" | "text"
    status: "QUEUED" | "PERCEIVING" | "RESOLVING" | "NONE"
    wait_bucket: AnalyticsDurationBucket
  }
  /**
   * 사진이 불명확해 확인 질문이 뜬 순간. `question_count` 만 싣는다 —
   * **질문 문구도 선택지 원문도 음식명이라** 어떤 이벤트에도 실을 수 없다.
   *
   * 이 화면은 지금 플래그로 꺼져 있다(`appConfig.foodAnalysisConfirmationEnabled`).
   * 켤지 말지 판단할 숫자가 없다는 것이 이 세 이름의 존재 이유이므로, 플래그를 켜는
   * 실험에서 곧바로 읽을 수 있게 미리 붙여 둔다.
   */
  food_analysis_confirm_viewed: { question_count: number }
  food_analysis_confirm_submitted: { question_count: number }
  /**
   * 답하다 '건너뛰기' 로 나간 순간 — 분석은 미완으로 남는다.
   *
   * `picked_count` 는 그때까지 고른 답의 **개수**다. 질문을 몇 개까지 답하다 포기하는지가
   * 곧 "질문 수를 줄일까" 의 근거다.
   */
  food_analysis_confirm_deferred: {
    question_count: number
    picked_count: number
  }
  food_record_result_viewed: { source: AnalyticsFoodRecordSource }
  food_record_saved: { source: "fresh" | "recovered" }
  /**
   * `not_ready` 는 `foodAnalysisResultId <= 0` 이라 **요청이 나가지도 않은** 경우다.
   * 서버 실패와 같은 이름으로 두면 고칠 곳이 안 정해진다 — 하나는 서버, 하나는 앱이
   * 아직 못 받은 id 다. 이 갈래는 `presentError` 를 안 지나가므로(토스트를 직접 띄운다)
   * `app_error_presented` 에도 한 행도 안 남는다.
   */
  food_record_save_failed: {
    source: "fresh" | "recovered"
    fail_kind: string
  }
  food_record_skipped: { slot: AnalyticsMealSlot }
  /**
   * 저장 없이 결과를 나가려 해서 확인창이 뜬 순간 / 그래도 나간 순간.
   *
   * 두 이름의 차이가 **확인창 문구가 붙잡은 비율**이다. 하나만 있으면 문구를 고쳐도
   * 좋아졌는지 알 수 없다. `edited` 는 결과를 한 번이라도 손봤는지 — 손보고도 버린
   * 사람은 "결과가 틀렸다" 가 아니라 "고쳐도 안 맞았다" 이므로 처방이 다르다.
   *
   * 작성 화면의 `compose_exit_prompted` 로 대신 세지 않는다. 그쪽은
   * `ConfirmExitModal` 을 쓰는 작성 화면 **넷**으로 범위가 고정돼 있고
   * (`tests/analyticsCrossCutting.test.ts`), 여기는 `showConfirm` 을 직접 띄운다.
   */
  food_record_leave_prompted: {
    source: "fresh" | "recovered"
    edited: boolean
  }
  food_record_result_abandoned: {
    source: "fresh" | "recovered"
    edited: boolean
  }
  /**
   * 결과 화면에서 나가는 **네 번째 문** — "이 식사에 대해 물어보기"(설계 §J2-0 정정 2).
   *
   * 이건 이탈이 아니라 이 여정 최대의 전환(기록 → 상담)이다. 이 이름이 없으면
   * `food_record_result_abandoned` 에 상담으로 빠져나간 사람이 섞여, 가장 값비싼 이탈을
   * 실제보다 크게 읽는다.
   *
   * `_failed` 는 이 문의 실재하는 실패다 — 상담은 아직 저장 안 된 결과를 서버에 **먼저**
   * 만들어야 해서(`ensureMealDiary`) 여기서 400/5xx 가 난다. `_started − _failed` 가
   * 성공이다(성공 이름을 따로 두지 않는 이유는 그 다음 걸음이 `/consult` 화면이라
   * 화면 축이 이미 세기 때문이다).
   */
  food_record_consult_started: { source: AnalyticsFoodRecordSource }
  food_record_consult_failed: { fail_kind: string }
  /**
   * 저장된 끼니를 지운 순간. 저장 뒤 되돌리는 비율은 기록 품질/오분석 신호인데 지금은 0 이다.
   *
   * 삭제 **의도**(확인 시트가 열린 순간)는 새 이름을 짓지 않는다 —
   * `sheet_opened{surface:'home_meal_delete'}` 가 이미 그 자리를 센다.
   */
  food_record_deleted: { source: "saved" }
  /**
   * 삭제가 서버에서 실패한 순간. 이 경로에는 **재시도 버튼이 없어서**(같은 프라미스를
   * 다시 부르면 호출부의 뒷정리가 안 돈다) 실패하면 그대로 끝난다.
   */
  food_record_delete_failed: { fail_kind: string }
  /**
   * `source` 는 어느 결과 화면에서의 수정인가. 신규 결과를 다듬는 것과 이미 저장된
   * 기록을 교정하는 것은 다른 행동이고, 화면 축은 셋 다 `home` 이라 안 갈린다.
   */
  food_record_edit_started: { source: AnalyticsFoodRecordSource }
  /**
   * 수정 화면까지 갔다가 되돌아 나온 순간.
   *
   * `changed:true` 는 **되돌려진 변경이 있었다**는 뜻이다 — 고치다 말고 취소한 사람과
   * 열어만 보고 닫은 사람은 처방이 다르다(앞은 입력 UI, 뒤는 진입점 문구).
   *
   * 이름만 고친 취소는 여기 안 온다. 이름 변경은 그 자리에서 서버에 반영되므로
   * `food_record_edit_succeeded{label_changed:true}` 로 나간다(되돌릴 것이 없다).
   */
  food_record_edit_cancelled: {
    source: AnalyticsFoodRecordSource
    changed: boolean
  }
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
  /**
   * 글로 기록하는 입력창에 도달한 순간 / 쓰던 것을 버리고 나간 순간.
   *
   * 종전에는 `food_record_method_selected{method:'text'}` 다음 신호가 분석 시작뿐이라
   * "입력창까지 왔다가 한 글자도 안 씀" 이 안 보였다.
   *
   * `filled` 는 쓰던 글이 **있었는가** — 자유 입력 원문은 어떤 형태로도 싣지 않는다
   * (길이도 안 싣는다: 짧은 글은 그 자체로 내용을 좁힌다).
   */
  food_text_record_viewed: { slot: AnalyticsMealSlot }
  food_text_record_discarded: { filled: boolean }
  /**
   * 시트에서 **처음 값이 생긴** 순간. 시트 열림당 **1회**로 잠근다 — 키 입력마다 쏘면
   * 이 이벤트 하나가 세션의 이벤트 수를 지배한다(설계 §J2-4 4).
   *
   * `sheet_opened` 와 이것의 차가 곧 '열자마자 닫음' 이고, 이것과
   * `health_entry_save_succeeded` 의 차가 '입력하다 이탈' 이다. 둘은 처방이 정반대다 —
   * 앞은 타일 문구·기대 불일치, 뒤는 입력 UI 문제.
   *
   * **값은 절대 싣지 않는다.** 혈당·혈압·체중 수치는 건강정보이고, 여기 남는 것은
   * "무엇으로 넣기 시작했나" 뿐이다.
   */
  health_entry_input_started: {
    metric: AnalyticsHealthMetric
    input_kind: AnalyticsHealthInputKind
  }
  /**
   * 혈당 시트의 시점·끼니 칩을 사람이 **고친** 순간. 앱이 끼니 기록에서 추론한 기본값이
   * 얼마나 자주 틀리는지가 여기서만 보인다.
   *
   * `auto` 는 **지금 고른 조합이 시트가 열릴 때의 기본값과 같은가**다. 즉 `false` 가
   * 추론이 틀렸다는 뜻이고, `true` 는 칩을 만졌다가 결국 앱이 준 값으로 돌아온 것이다
   * (되돌아온 비율이 높으면 칩 자체가 오조작을 유발하고 있다는 신호다).
   *
   * `timing` 은 시점 **범주**일 뿐 수치가 아니다 — 혈당 값은 어떤 속성으로도 안 나간다.
   */
  health_entry_context_adjusted: {
    metric: "blood_glucose"
    timing: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL"
    auto: boolean
  }
  /**
   * CTA 를 누른 순간. 이것만 있고 결과 이벤트가 없는 구간이 곧 **네트워크 유실·앱 종료**다.
   *
   * `item_count` 는 물 시트에서 이번에 담은 잔 수(그 외 지표는 1). 물 시트는 잔을
   * 누를 때마다 서버에 가지 않고 CTA 가 합계로 한 번 보내므로, 잔마다 쏘지 말고
   * 여기서 접는다.
   *
   * `health_entry_save_succeeded` 와 **같은 초**에 겹칠 수 있어 퍼널 인접 스텝으로
   * 쓰면 안 된다.
   */
  health_entry_save_started: {
    metric: AnalyticsHealthMetric
    item_count: number
  }
  /**
   * 종전에는 속성이 비어 다섯 시트가 한 숫자였다. `metric` 하나만 붙어도 지표별 퍼널이
   * 서고, **전체 합계는 그대로**라 기존 대시보드가 깨지지 않는다.
   *
   * `existing` 은 그날 그 지표에 이미 기록이 있었는가 — 새 기록과 수정은 다른 행동이다.
   */
  health_entry_save_succeeded: {
    metric: AnalyticsHealthMetric
    existing: boolean
  }
  /** 400 계열은 서버 검증·경계(KST 날짜 경계·유니크 충돌) 문제, 5xx 는 장애로 대응이 갈린다. */
  health_entry_save_failed: {
    metric: AnalyticsHealthMetric
    fail_kind: string
  }
  /**
   * 통계 리포트를 **한 벌 요구한** 순간. 화면 쪽 기간 전이 이펙트에서 쏜다 —
   * React Query `queryFn` 에 두면 **캐시 히트에서 안 돌아** 분모가 조용히 깨진다
   * (staleTime 5분, ‹ › 로 오갈 때마다 대부분 히트다).
   *
   * `entry` 는 무엇이 그 요구를 만들었나 — `enter`(화면 진입) · `period`(일/주/월
   * 세그먼트) · `shift`(‹ › 한 칸 이동). 셋의 비율이 곧 "사람들이 통계를 어떻게 읽는가" 다.
   */
  stats_report_requested: {
    period: AnalyticsStatsPeriod
    entry: "enter" | "period" | "shift"
  }
  /**
   * 그 요구가 실제로 화면이 된 순간. 대기는 여기서 다시 짓지 않는다 —
   * `wait_perceived{surface:'statistics_report'}` 가 이미 센다(그 화면이
   * `useLoadingVisible` 을 타므로 공용 통로가 그대로 붙는다).
   *
   * `reliability` 는 서버가 판정한 표본 충분도다. `LOW` 가 많으면 리포트가 나빠서가
   * 아니라 **기록이 모자라서** 안 읽히는 것이고, 그건 통계가 아니라 기록 여정의 문제다.
   */
  stats_report_viewed: {
    period: AnalyticsStatsPeriod
    reliability: "LOW" | "MEDIUM" | "HIGH"
  }
  /**
   * 리포트를 못 받았다. **`error_state_viewed` 로 대신 세지 않는다** — 그 이름은
   * `V2ErrorState` 한 곳에서만 나가는 것이 계약이고(`tests/analyticsCrossCutting.test.ts`),
   * 이 화면은 그 컴포넌트가 아니라 자기 카드(`ErrorCard`)를 그린다. `presentError` 도
   * 안 지나가므로 `app_error_presented` 에도 한 행도 안 남는다 — 즉 이 이름이 없으면
   * 통계 실패가 **어디에도** 안 남는다.
   *
   * 이 화면에서 가장 흔한 실패는 서버 장애가 아니라 **기록이 없는 기간**(404)이다.
   * `fail_kind` 로 갈리지 않으면 "통계가 자꾸 실패한다" 와 "쓸 기록이 없다" 가 한 숫자다.
   */
  stats_report_failed: {
    period: AnalyticsStatsPeriod
    fail_kind: string
  }

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
  /**
   * 상세의 **추천 질문 한 줄**을 눌러 상담 시트를 연 순간.
   *
   * `kind` 는 질문 템플릿의 갈래(`driver`·`recommend`·`compare`·`avoid`)고, `index` 는
   * 그 화면에 실제로 그려진 순서(0부터)다. 둘을 같이 보는 이유는 **행 수가 4 고정이
   * 아니기 때문**이다 — 메뉴가 없거나 프로필이 비었거나 한식이 아니면 두세 줄만 뜬다.
   * 갈래만 보면 "안 눌린 질문" 과 "애초에 안 뜬 질문" 이 같은 0 으로 보인다.
   *
   * **질문 문장은 싣지 않는다.** 갈래로 이미 갈리고, 문장 키(`text` 류)는 두 새니타이저가
   * 어차피 떨군다 — 타입에는 남고 이벤트에는 안 실리는 조합을 만들지 않는다.
   */
  restaurant_ai_consult_question_tap: {
    restaurant_id: number
    kind: string
    index: number
  }
  /**
   * 상담 시트에서 한 턴이 실제로 나간 순간. `turn` 은 그 대화의 몇 번째 사용자
   * 메시지인가(1부터).
   *
   * 추천 질문 한 방으로 끝나는지 이어서 묻는지가 이 값 하나로 갈리고,
   * `sheet_opened`(surface `restaurant_ai_consult`) 수와 대조하면 **열고 아무것도 안
   * 물어본** 비율이 나온다.
   */
  restaurant_ai_consult_send: { restaurant_id: number; turn: number }
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
  /**
   * 지도 SDK 로드 실패 → 리스트 모드로 내려간 횟수. 키 만료를 조용히 넘기지 않는다.
   *
   * `reason` 은 범주형이다 — 원인 문자열(도메인·URL 포함)은 PII 새니타이저가 막고,
   * 막지 않더라도 자유 텍스트는 집계가 안 된다. `config` 는 env 미설정,
   * `sdk_load` 는 스크립트 로드 실패(도메인 미등록 401 이 대표), `sdk_timeout` 은
   * 12초 마감, `webview_crash` 는 WebView 프로세스 사망이다.
   */
  restaurant_map_degraded: {
    reason: "config" | "sdk_load" | "sdk_timeout" | "webview_crash" | "other"
  }

  /*
   * ─────────────────────────────────────────────────────────────────────────
   * 가로지르는 공용 계측 여덟 (설계 §5)
   *
   * 여정마다 `*_load_failed`·`*_retry_pressed`·`*_empty_viewed`·`*_sheet_dismissed`
   * 를 새로 짓지 않는다. 같은 사건이 여정 수만큼 다른 이름으로 흩어지면 "앱 전체에서
   * 실패가 몇 번 보였나" 를 물을 방법이 없어진다. 아래는 전부 **이미 있던 단일 통로**에
   * 한 줄씩 넣은 것이다.
   *
   * ■ 실패 이벤트는 첫 실패보다 약 3초 늦다 — 대시보드에서 오독하지 말 것
   *
   * `shouldRetryQuery` 가 offline·5xx·unknown 을 2회까지 **조용히** 재시도하고 지연이
   * 1초·2초다(`tests/queryRetryPolicy.test.ts`). 그러니 `error_state_viewed` 와
   * 그 앞의 `app_error_presented` 는 사용자가 실제로 막힌 순간이 아니라 재시도가 다
   * 소진된 순간이고, 같은 대기의 `wait_bucket` 에도 그 3초가 들어 있다. 즉 이 세
   * 이벤트의 시각을 "서버가 처음 실패한 시각" 으로 읽으면 안 된다.
   * ─────────────────────────────────────────────────────────────────────────
   */

  /**
   * 실패 하나가 사용자에게 제시된 순간. `presentError` 는 57개 호출부의 유일한 통로이고
   * 아래 값들은 **거기서 이미 계산돼 있다**(`resolve.ts`) — 여기서 분류를 다시 짓지 않는다.
   *
   * `surface` 는 그릇(토스트/다이얼로그)이지 화면이 아니다. 화면은 모든 track 행에 실리는
   * `screen_name` 이 이미 말한다.
   *
   * `silent`(요청 취소 등 사용자에게 아무것도 안 보인 실패)도 **남긴다.** 화면 이동으로
   * 취소된 요청이 폭증하는 것은 그 자체로 신호이고, 안 남기면 "실패했는데 아무도 몰랐다"
   * 를 셀 방법이 없다.
   *
   * `code` 는 서버 도메인 코드다. 없을 때 `null` 을 실으면 새니타이저가 **키째로** 떨궈
   * 브레이크다운에서 그 행이 사라지므로, 없음을 `"none"` 이라는 값으로 명시한다.
   */
  app_error_presented: {
    kind: ErrorKind
    code: string
    surface: ErrorSurface
    retryable: boolean
    silent: boolean
  }
  /**
   * 해결 버튼을 실제로 누른 순간. 버튼을 **그린** 것과 **누른** 것은 다른 사건이라
   * `app_error_presented` 로는 대체되지 않는다 — 둘의 비가 곧 그 안내의 쓸모다.
   */
  app_error_action_pressed: { action: ErrorActionId; kind: ErrorKind }
  /**
   * **앱이 그린 뒤로가기**(헤더 ‹ · 취소 CTA · `useAppRouter().back()`). `useGoBack` 이
   * 유일한 경로다 — 맨 `router.back()` 은 `tests/navigationBackGuard.test.ts` 가 막는다.
   *
   * **안드로이드 하드웨어 백과 iOS 엣지 스와이프는 여기 안 들어온다.** 그 둘은 네이티브
   * 스택이 직접 화면을 팝하고 앱 코드를 거치지 않는다(전역 `BackHandler` 도 없다 —
   * 가입 스텝·온보딩의 `BackHandler` 는 화면 안 단계 이동이라 네비게이션이 아니다).
   * 그래서 이 수는 "뒤로 간 전체" 의 **부분집합**이고, 특히 안드로이드에서 과소 계수다.
   * 화면 이탈의 분모로 쓰지 말고 `screen_viewed` 전이와 함께 읽는다.
   *
   * `used_fallback: true` 는 히스토리가 없어 라우트 그래프로 떨어진 경우다. 딥링크·푸시로
   * 들어온 진입이 얼마나 되는지가 여기서만 보인다. **되돌아가지 못한 경우(루트 화면)는
   * 아예 쏘지 않는다** — 아무 일도 일어나지 않은 것을 이동으로 세면 안 된다.
   */
  nav_back: { from_screen: AnalyticsScreenName; used_fallback: boolean }
  /**
   * "쓰던 걸 두고 나갈까요" 가 뜬 순간 / 그대로 나간 순간. 두 이름의 차이가
   * **작성 이탈을 되돌린 비율**이다.
   *
   * `has_draft` 는 지금 모든 호출부에서 참이다(초안이 있을 때만 이 모달을 띄운다).
   * 그래도 싣는 이유는 그것이 **깨지면 알아야 할 불변식**이기 때문이다 — 거짓이 찍히면
   * 어떤 작성 화면이 잃을 것 없는 사람에게 확인창을 띄우고 있다는 뜻이다.
   *
   * 세는 범위는 `ConfirmExitModal` 을 쓰는 작성 화면 **넷**(자유글 신규·수정, 레시피
   * 신규·수정)이다. 스토리 작성은 확인 자체가 없고, 식당 후기 작성은 같은 확인을
   * `showConfirm` 으로 직접 띄운다(`ReviewWriteScreen`) — 둘 다 여기 안 들어오므로
   * "작성 이탈 전체" 의 분모로 쓰면 두 여정이 통째로 빠진다.
   * `tests/analyticsCrossCutting.test.ts` 가 이 넷을 고정한다.
   */
  compose_exit_prompted: { surface: AnalyticsSurface; has_draft: boolean }
  compose_exit_confirmed: { surface: AnalyticsSurface; has_draft: boolean }
  /** `V2EmptyState` 가 실제로 그려진 순간(마운트 1회). */
  empty_state_viewed: { surface: AnalyticsSurface }
  /**
   * `V2ErrorState` 가 실제로 그려진 순간. `retryable` 은 재시도 버튼을 준 경우다 —
   * 준 자리와 안 준 자리의 이탈이 같다면 그 버튼은 일을 안 하고 있는 것이다.
   */
  error_state_viewed: { surface: AnalyticsSurface; retryable: boolean }
  /**
   * **기다림을 인지한** 대기가 끝난 순간. `useLoadingVisible` 이 로딩 UI 를 그린 대기만
   * 센다(문턱 아래의 빠른 응답은 사용자가 기다린 적이 없다).
   *
   * 화면을 떠나며 끝난 대기도 여기 들어온다 — 그것을 빼면 가장 느린 대기가 통째로
   * 사라져 `very_slow` 가 실제보다 적게 보인다.
   */
  wait_perceived: {
    surface: AnalyticsSurface
    wait_bucket: AnalyticsDurationBucket
  }
  sheet_opened: { surface: AnalyticsSurface }
  /** 시트가 닫힌 순간. `dwell_bucket` 이 `instant` 면 열자마자 닫은 것 = 잘못 눌렀다. */
  sheet_dismissed: {
    surface: AnalyticsSurface
    dwell_bucket: AnalyticsDurationBucket
  }
  /**
   * 제출을 눌렀는데 폼이 막은 순간. `first_fail` 은 **필드 이름**이고 입력값이 아니다 —
   * 어느 칸에서 막히는지는 알아야 하고 무엇을 적었는지는 알 필요가 없다.
   */
  form_validation_failed: {
    form: AnalyticsFormName
    first_fail: string
    fail_count: number
  }

  /*
   * ─────────────────────────────────────────────────────────────────────────
   * 사각지대 다섯 (설계 §9) — 여정 스펙에 안 잡히는 이탈
   *
   * 공통점은 "여정의 밖" 이다. 여정 이벤트는 전부 `RootLayoutNav` 안에서 나가는데,
   * 아래 다섯은 그 밖(정책 게이트)·그 위(인터스티셜)·그 앞(딥링크 판정)·그 끝
   * (로그아웃)·그 대신(피처 플래그 오프 화면)에서 일어난다. 그래서 지금까지는 전부
   * **아무 행도 남기지 않았고**, 남지 않은 것은 대시보드에서 "아무 일도 없었다" 와
   * 구분되지 않는다.
   * ─────────────────────────────────────────────────────────────────────────
   */

  /**
   * 정책 게이트가 판정을 내린 순간. **`RootLayoutNav` 보다 위**에서 나가는 유일한
   * 이벤트라, 강제 업데이트·점검으로 갇힌 사람도 여기서만 한 행을 남긴다.
   *
   * `blocked` 는 결정이 아니라 **그 실행에서 실제로 막았는가**다. `__DEV__` 빌드는
   * 게이트를 통째로 열어 두므로(`useAppPolicyGate` 머리말) `decision:'force_update'`
   * 인데 `blocked:false` 인 행이 존재하고, 그건 개발 기기다. 두 값을 한 이벤트에
   * 같이 싣는 이유가 이것 — 결정만 보면 개발 기기가 차단 코호트에 섞인다.
   *
   * `source` 가 `'fallback'` 이면 서버·캐시 어느 쪽도 답하지 못해 기본값으로 판정한
   * 것이다. 그 코호트는 정책이 무엇이든 **항상 같은 답**을 받으므로 따로 읽어야 한다.
   */
  app_policy_evaluated: {
    decision: MobilePolicyDecision
    source: MobilePolicySource
    blocked: boolean
  }
  /**
   * 차단 화면·권장 안내에서 스토어 버튼을 누른 순간. `result` 를 함께 싣는 이유는
   * **여는 데 실패하는 경로가 실재**하기 때문이다(storeUrl 미설정·정규화 실패·
   * `Linking.openURL` 거부). 차단 화면에서 그게 일어나면 나가는 길이 하나도 없는
   * 상태이므로, 성공만 세면 그 사람들이 통계에서 보이지 않는다.
   */
  app_policy_store_opened: {
    decision: MobilePolicyDecision
    blocked: boolean
    result: "opened" | "failed"
  }
  /**
   * 게이트가 사람을 **세워 둔 채** 오래 걸린 경우. 캐시가 없는 최초 실행만 네트워크를
   * 기다리므로(그 뒤의 재검증은 아무도 안 기다린다) 여기 걸리는 것은 신규 설치 직후다.
   * 원값(ms) 대신 버킷인 이유는 다른 대기와 같다(설계 §2 P4).
   *
   * 같은 대기의 `wait_perceived{surface:'policy_gate'}` 와 **겹친다.** 그래도 따로
   * 두는 이유는 `source` 다 — 그 대기가 결국 서버 답을 받아 끝났는지 폴백으로 끝났는지가
   * 여기서만 보이고, 폴백으로 끝난 대기는 그 사람이 **기능 플래그를 못 받았다**는
   * 뜻이라 식당 탭이 꺼진 이유와 같은 줄에서 읽힌다.
   */
  app_policy_check_slow: {
    wait_bucket: AnalyticsDurationBucket
    source: MobilePolicySource
  }

  /**
   * 로그아웃. `'automatic'` 은 `sessionPersistence:'ephemeral'` 계정이 백그라운드로
   * 들어가는 즉시 잘린 것이고 **사용자가 원한 적이 없다**. 이 둘을 안 나누면
   * 로그인 퍼널의 분모에 재로그인이 섞이고, 모든 `*_abandoned` 가 "사람의 포기" 와
   * "시스템의 절단" 을 한 칸에 담는다(설계 §11-4).
   */
  auth_signed_out: { reason: "explicit" | "automatic" }

  /**
   * 진입 URL 이 라우터에 닿기 전에 받은 판정. **URL 원문도 경로도 싣지 않는다** —
   * 딥링크 경로에는 글 id·식당 id 가 그대로 들어 있고, 그건 이 이벤트가 답해야 할
   * 질문("공유 링크가 돌아오긴 하는가")과 무관하다.
   */
  app_entry_from_link: { verdict: EntryUrlVerdict }
  /**
   * 어떤 라우트에도 맞지 않는 경로에 도달한 순간 = **버그 하나**.
   *
   * 같은 화면의 `empty_state_viewed{surface:'not_found'}` 로 대신 세지 않는 이유는
   * 질의 비용이다. `props` 에는 인덱스가 하나도 없어서(설계 §8 보존) 속성으로
   * 걸러내는 집계는 기간 내 전 이벤트를 훑는다. 이름은 인덱스가 있다 — 배포 직후
   * 죽은 링크가 튀는지 보려면 이름 하나로 세는 축이 따로 있어야 한다.
   */
  app_dead_route_viewed: Record<string, never>

  /**
   * 홈을 덮는 인터스티셜 셋(공지 팝업 · 권장 업데이트 · 식사분석 복구). 셋은 같은
   * 순간에 겹칠 수 있고, J2 의 `홈 → 식사 기록` 하락이 "기록할 마음이 없었다" 인지
   * "팝업 닫느라 나갔다" 인지를 지금은 구분할 방법이 없다.
   *
   * `mode` 는 **닫은 손잡이**다. `'back'` 만 안드로이드 하드웨어 백이고 나머지는
   * 화면 안의 버튼이라, `'back'` 비율이 높으면 그 팝업의 닫기 버튼이 안 보인다는 뜻이다.
   * `suppressed` 는 '오늘 하루 안 보기' — 다시 안 보겠다고 한 사람의 비율이다.
   */
  home_notice_viewed: Record<string, never>
  home_notice_dismissed: {
    mode: "close" | "cta" | "back"
    suppressed: boolean
  }
  app_update_prompt_viewed: Record<string, never>
  app_update_prompt_dismissed: { mode: "later" | "back" }
  /**
   * 백그라운드에 두고 나간 식사분석을 훑은 결과. **한 번의 훑기당 한 행**이고,
   * 훑을 것이 하나도 없으면 쏘지 않는다(포그라운드 복귀마다 도는 경로라 그대로 두면
   * 이 이벤트 하나가 세션당 이벤트 수를 지배한다).
   *
   * `expired_count` 는 TTL 10분을 넘겨 **결과를 보여 주지도 못하고 버린** 건수다.
   * 사용자 입장에서는 "분석하다 말았는데 아무 일도 안 일어났다" 이고, 지금까지는
   * 이 손실이 어디에도 안 남았다. `entry` 는 앱을 켜서 훑은 것인지 복귀해서 훑은
   * 것인지 — 둘의 회수율이 다르면 대기 시간이 원인이라는 뜻이다.
   */
  food_recovery_swept: {
    entry: "launch" | "foreground"
    recovered_count: number
    remaining_count: number
    expired_count: number
  }

  /**
   * 식당 탭 자리에 `준비 중` 이 대신 그려진 순간과, 거기서 제보로 나간 순간.
   *
   * `isRestaurantTabEnabled` 의 폴백이 **false** 라 정책 응답이 실패한 사람은 항상
   * 꺼진 쪽을 본다. 그래서 `source` 가 이 이벤트의 전부다 — `'server'` 면 우리가 정말
   * 끈 것이고, `'fallback'` 이면 **켜 줬는데도 못 받은** 사람이다. 이 구분이 없으면
   * 식당 지표 0 을 "기능이 안 팔린다" 로 읽게 된다(설계 §9-②).
   */
  restaurant_coming_soon_viewed: { source: AnalyticsPolicySource }
  restaurant_coming_soon_report_pressed: { source: AnalyticsPolicySource }

  /* ── 구독 결제 ──────────────────────────────────────────────────────────── */

  /**
   * 페이월이 떠오른 순간. **`entry` 가 이 이벤트의 전부다** — 어느 잠금이 결제를
   * 만드는지는 이 축으로만 물을 수 있다.
   *
   * `reason` 은 왜 막혔는지다. `quota_exhausted`(무료 횟수 소진)와
   * `subscription_required`(애초에 유료)는 사용자의 마음가짐이 전혀 다르다 —
   * 앞쪽은 이미 써 본 사람이고 뒤쪽은 아직 못 써 본 사람이다.
   *
   * 금액은 싣지 않는다. 매출의 정본은 RevenueCat 대시보드이고, 여기에 또 실으면
   * 두 숫자가 어긋나는 날 어느 쪽이 맞는지 아무도 모른다.
   */
  paywall_shown: {
    entry: AnalyticsPaywallEntry
    plan: AnalyticsPlan
    reason: "quota_exhausted" | "subscription_required" | "browse"
    capability: string
  }
  /**
   * 결제하지 않고 닫았다. `dwell_bucket` 이 있는 이유는 **0초 이탈과 20초 고민이
   * 다른 사건**이기 때문이다 — 앞쪽은 페이월이 잘못된 자리에서 뜬 것이고, 뒤쪽은
   * 문구나 가격의 문제다.
   */
  paywall_dismissed: {
    entry: AnalyticsPaywallEntry
    dwell_bucket: AnalyticsDurationBucket
  }
  purchase_started: { entry: AnalyticsPaywallEntry; packageType: string }
  purchase_completed: { entry: AnalyticsPaywallEntry; packageType: string }
  /**
   * `kind: "cancelled"` 는 **실패가 아니다.** 사용자가 결제창을 닫은 것이고, 이걸
   * 오류와 같은 통에 세면 결제 실패율이 실제의 몇 배로 보인다.
   */
  purchase_failed: {
    entry: AnalyticsPaywallEntry
    packageType: string
    kind: "cancelled" | "store" | "network" | "unknown"
  }
  restore_completed: { restored: boolean }
  /**
   * 무료 횟수를 다 쓴 순간. `paywall_shown` 과 따로 세는 이유는 **소진이 곧 페이월은
   * 아니기 때문**이다 — 잔량 뱃지를 보고 그냥 나가는 사람이 있고, 그 사람들은
   * 페이월을 본 적이 없다.
   */
  quota_exhausted: { capability: string; limit: number }
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

/**
 * `presentError` 가 이미 판정해 둔 것을 이벤트 속성 모양으로만 옮긴다. 분류를 여기서
 * 새로 짓지 않으므로 로그·화면·분석이 같은 말을 한다.
 *
 * 별도 함수인 이유는 **테스트 때문**이다 — `present.ts` 를 부르면 i18n·토스트·다이얼로그가
 * 전부 딸려 와서 속성 경계 하나를 확인하려고 화면 절반을 세워야 한다.
 */
export function toErrorPresentedProperties(
  resolved: Pick<
    ResolvedError,
    "kind" | "code" | "surface" | "retryable" | "silent"
  >,
): AnalyticsEventProperties["app_error_presented"] {
  return {
    kind: resolved.kind,
    // `null` 을 그대로 실으면 새니타이저가 키째로 떨군다 — 없음을 값으로 명시한다.
    code: resolved.code ?? "none",
    surface: resolved.surface,
    retryable: resolved.retryable,
    silent: resolved.silent,
  }
}

/**
 * 라우트 키 → 화면명. `routeGraph.ts` 의 `ROUTE_PARENT` 와 **같은 키 규칙**이다
 * (그룹·`[id]` 는 남고 꼬리 `index` 는 잘린다).
 *
 * ■ 그룹 단위 폴백을 두지 않는다
 *
 * 종전 구현은 `(auth)` 는 전부 `signup`, `(settings)` 는 전부 `profile` 로 접었다.
 * 그 폴백이 사고의 원인이었다 — 새 라우트가 조용히 **틀린 이름**으로 들어가고, 틀렸다는
 * 사실이 대시보드에서 영영 안 보인다. 표에 없으면 `other` 로 두고
 * `tests/analyticsScreenTable.test.ts` 가 app/ 트리와 대조해 CI 에서 실패시킨다.
 *
 * ■ 접은 자리 6곳 (14라우트 → 6이름)
 *
 * 퍼널 스텝으로 불릴 일이 없는 **잎사귀만** 접었다. 접힌 구분이 필요해지면 화면명이
 * 아니라 이벤트 속성으로 낸다. 탈퇴 3화면은 그 자체가 퍼널이라 절대 접지 않는다.
 */
const ROUTE_SCREEN: Record<string, AnalyticsScreenName> = {
  // ── 루트 ───────────────────────────────────────────────────────────────────
  // `/` 는 가드가 즉시 갈아타는 리다이렉트다 — 다음 화면과 같은 순간이라
  // 퍼널의 인접 스텝으로 쓰면 안 된다.
  "": "entry",
  onboarding: "onboarding",
  consult: "consult",
  statistics: "statistics",
  "meal-report": "meal_report",
  "food-camera": "food_camera",
  // 물·혈압·체중 기록(2026-09-05 시안). 시트였을 때는 홈 화면 안이라 이름이 없었다.
  "record/medication": "record_medication",
  "medication/add": "medication_add",
  "medication/search": "medication_search",
  "medication/photo": "medication_photo",
  "medication/camera": "medication_camera",
  "medication/candidates": "medication_candidates",
  "medication/edit": "medication_edit",
  "medication/manage": "medication_manage",
  "record/water": "record_water",
  "record/blood-pressure": "record_blood_pressure",
  "record/weight": "record_weight",
  "record/blood-glucose": "record_blood_glucose",
  "record/edema": "record_edema",
  stories: "community_story",
  "community-library": "community_library",
  "v2-showcase": "dev_showcase",
  "+not-found": "not_found",

  // ── 인증 ───────────────────────────────────────────────────────────────────
  "(auth)/login": "login",
  "(auth)/email-login": "login_email",
  "(auth)/forgot-password": "password_reset",
  // 소셜 계정에 이메일을 잇는 화면과 이메일 계정에 비밀번호를 잇는 화면. 방향만 다른
  // 같은 사건(계정 연결)이고 둘 다 잎사귀라 한 이름으로 접었다.
  "(auth)/social-link-email": "account_link",
  "(auth)/email-login-link-password": "account_link",
  "(auth)/terms-agreement": "signup_terms",
  "(auth)/signup-email": "signup_email",
  "(auth)/signup-password": "signup_password",
  "(auth)/profile-setup": "signup_profile",
  // 완료 → 온보딩은 replace 직후라 같은 순간이다. 인접 스텝 금지.
  "(auth)/signup-complete": "signup_complete",

  // ── 탭 ─────────────────────────────────────────────────────────────────────
  "(tabs)/home": "home",
  "(tabs)/community": "community",
  "(tabs)/recipe": "recipe",
  "(tabs)/restaurant": "restaurant_map",
  "(tabs)/all": "my_page",

  // ── 커뮤니티 · 레시피 ──────────────────────────────────────────────────────
  "post/[id]": "community_post",
  "(tabs)/community-popular": "community_popular",
  "community/author/[id]": "community_author",
  "community/connections": "community_connections",
  "community/report": "community_report",
  "community/search": "community_search",
  "recipe/[id]": "recipe_detail",
  // 저장·최근은 같은 회수 동선의 두 탭이다.
  "recipe/saved": "recipe_archive",
  "recipe/recent": "recipe_archive",

  // ── 식당 ───────────────────────────────────────────────────────────────────
  "restaurant/[id]": "restaurant_detail",
  // 사진·후기는 `presentation: "modal"` 이지만 **라우트다** — 시트·모달과 달리
  // 화면 축에 오른다. 경계는 라우트 유무 하나뿐이다.
  "restaurant/[id]/photos": "restaurant_photos",
  "restaurant/[id]/review": "restaurant_review_write",
  "restaurant/reviewer/[id]": "restaurant_reviewer",
  "restaurant/search": "restaurant_search",
  "restaurant/list": "restaurant_list",
  "restaurant/bookmarks": "restaurant_bookmarks",
  "restaurant/report": "restaurant_report",

  // ── 작성 ───────────────────────────────────────────────────────────────────
  // 신규와 수정은 전환율이 다른 별개의 여정이다(수정에는 이탈할 초안이 이미 있다).
  "(write)/free/new": "free_write",
  "(write)/free/[id]": "free_edit",
  "(write)/story/new": "story_write",
  "(write)/recipe/new": "recipe_write",
  "(write)/recipe/edit/[id]": "recipe_edit",

  // ── 설정 · 마이페이지 ──────────────────────────────────────────────────────
  "(settings)": "settings",
  "(settings)/profile-edit": "profile_edit",
  // 닉네임·이름·전화·비밀번호는 "한 값을 고치고 나온다" 는 같은 잎사귀다(4:1).
  // 어느 값이었는지는 화면명이 아니라 이벤트 속성으로 낸다.
  "(settings)/nickname-edit": "profile_field_edit",
  "(settings)/name-edit": "profile_field_edit",
  "(settings)/phone-number-edit": "profile_field_edit",
  "(settings)/password-edit": "profile_field_edit",
  "(settings)/kidney-profile-edit": "kidney_profile",
  "(settings)/notification-settings": "notification_settings",
  "(settings)/subscription": "subscription",
  "(settings)/notifications": "notification_inbox",
  // 목록과 상세는 같은 읽기 동선의 두 칸이다(2:1).
  "(settings)/announcements": "announcements",
  "(settings)/announcement-detail": "announcements",
  "(settings)/inquiry": "inquiry",
  "(settings)/inquiry-new": "inquiry_new",
  "(settings)/medical-reference": "medical_reference",
  "(settings)/privacy-settings": "privacy_settings",
  "(settings)/app-info": "app_info",
  "(settings)/legal-document": "legal_document",
  // 탈퇴 3화면은 그 자체가 퍼널이다 — 접으면 이탈 지점이 사라진다.
  "(settings)/withdrawal": "withdrawal",
  "(settings)/withdrawal-terms": "withdrawal_terms",
  "(settings)/withdrawal-complete": "withdrawal_complete",

  // ── 검진 분석 ──────────────────────────────────────────────────────────────
  "(settings)/checkup-list": "checkup_list",
  "(settings)/checkup-auth": "checkup_auth",
  "(settings)/checkup-detail": "checkup_detail",
  "(settings)/checkup-calendar": "checkup_calendar",

  // ── 의사 연결 ──────────────────────────────────────────────────────────────
  "(settings)/doctor-connections": "doctor_connections",
  "(settings)/doctor-intro": "doctor_intro",
  "(settings)/doctor-search": "doctor_search",
  "(settings)/doctor-preview": "doctor_preview",
  "(settings)/doctor-sharing": "doctor_sharing",
  "(settings)/doctor-report": "doctor_report",
}

/** 표에 등록된 모든 라우트 키. 테스트가 app/ 트리와 대조할 때 쓴다. */
export function knownAnalyticsRouteKeys(): string[] {
  return Object.keys(ROUTE_SCREEN)
}

export function getAnalyticsScreenName(
  segments: readonly string[],
): AnalyticsScreenName {
  const direct = ROUTE_SCREEN[toRouteKey(segments)]
  if (direct) return direct

  // 실기기의 `useSegments()` 는 동적 세그먼트에 **실제 id** 를 넣어 준다
  // (`post/482`). 표는 라우트 패턴(`post/[id]`)이라 그대로는 안 맞고, 정규화가
  // 없으면 상세 화면이 전부 `other` 로 떨어진다. 한 자리씩 `[id]` 로 되돌려 다시 본다 —
  // 뒤에서부터 도는 이유는 동적 세그먼트가 대개 꼬리에 있기 때문이고, 중간에 있는
  // `restaurant/[id]/photos` 도 같은 루프가 잡는다.
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i]
    if (segment === "[id]" || segment.startsWith("(")) continue
    const candidate = segments.slice()
    candidate[i] = "[id]"
    const hit = ROUTE_SCREEN[toRouteKey(candidate)]
    if (hit) return hit
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
