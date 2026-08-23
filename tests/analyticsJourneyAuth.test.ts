/**
 * J1(진입 · 로그인 · 회원가입 · 온보딩) 여정 계측의 계약을 고정한다.
 *
 * 지키는 것은 넷이다.
 *
 *  1. **속성 키가 살아서 도착하는가.** 새니타이저가 두 벌이고(클라 `events.ts`,
 *     서버 `record.ts`) 목록이 다르며, 걸린 키는 **예외도 로그도 없이 사라진다.**
 *  2. **한 사건이 한 이름으로 한 번 나가는가.** 이 여정은 같은 실패를 여러 곳에서
 *     받는다(소셜 로그인은 `useAuth` 와 `useSocialLogin` 이 연달아 잡는다). 발화
 *     지점이 늘어나면 같은 사건이 두 행이 되고, 그건 대시보드에서 "늘었다" 로 보인다.
 *  3. **완료 축이 진짜 핸들러에 걸려 있는가.** 이 여정의 핵심 결손은 '진입은 있는데
 *     성공이 없는' 것이었다. 완료 이벤트가 화면 어딘가에 선언만 되어 있고 실제 전진
 *     경로에 없으면 결손이 그대로다.
 *  4. **초안에서 뺀 이름이 되살아나지 않는가.** 공용 통로(L2)가 이미 덮는 것을 여정
 *     이름으로 다시 지으면 같은 사건이 여정 수만큼 흩어진다 — 그게 이번 과제의 절반이다.
 *
 * 이 저장소에는 컴포넌트 렌더 테스트 도구가 없다(새 의존성 금지). 발화 계약은
 * **소스 텍스트 검사**로만 증명되며, 그건 구조적 보장이지 실행 검증이 아니다.
 */
import fs from "fs"
import path from "path"

import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "@/src/features/analytics/events"

/**
 * 서버 `sinsin-be-bun/src/domains/analytics/record.ts` 의 금지 키 정규식 **사본**.
 * (`tests/analyticsCrossCutting.test.ts` 와 같은 사본이다 — 서버는 다른 저장소라
 * import 할 수 없고, 클라 정규식만 통과했다고 안심하면 `search`·`password`·`secret`
 * 처럼 서버에만 있는 단어에 걸려 조용히 사라진다.)
 */
const SERVER_FORBIDDEN_PROP_KEY =
  /(email|phone|password|token|secret|address|birth|name|query|search|text|title|content|message|url)/i

/**
 * J1 에서 새로 나가거나 속성이 바뀐 이벤트의 **실제 페이로드**.
 *
 * 키만 나열하지 않고 한 벌씩 만드는 이유는 값 종류(문자열·수·불리언)까지 통과해야
 * 이벤트가 온전히 도착하기 때문이다. `satisfies` 로 묶어 두면 타입이 바뀌었는데 표본이
 * 안 바뀌는 일이 컴파일에서 걸린다.
 */
const J1_SAMPLES = {
  app_entry_routed: { gate: "profile" },
  auth_email_login_failed: { fail_kind: "LOGIN_ERROR_001" },
  auth_social_login_cancelled: { provider: "kakao" },
  auth_social_login_blocked: {
    provider: "google",
    fail_kind: "provider_email_required",
  },
  auth_withdrawal_prompt_viewed: { source: "email" },
  auth_terms_item_toggled: {
    item: "marketing",
    agreed: false,
    method: "email",
  },
  auth_terms_submitted: { method: "social" },
  auth_code_requested: { source: "password_reset", attempt_no: 3 },
  auth_code_verify_failed: { source: "signup", fail_kind: "mismatch" },
  auth_code_expired: { source: "social_link" },
  auth_email_link_prompt_viewed: {},
  auth_signup_password_submitted: {},
  auth_signup_step_completed: {
    step: "acquisition",
    step_index: 5,
    mode: "signup",
  },
  auth_signup_step_reverted: { step: "phone", step_index: 4, mode: "backfill" },
  auth_signup_step_blocked: {
    step: "nickname",
    fail_kind: "taken",
    mode: "completion",
  },
  auth_account_link_completed: { mode: "social_email" },
  auth_password_reset_completed: {},
  onboarding_welcome_viewed: {},
  onboarding_welcome_confirmed: {},
  onboarding_welcome_returned: {},
  onboarding_steps_load_failed: { fail_kind: "empty" },
  onboarding_step_viewed: { step_index: 2, step_count: 10, step_kind: "input" },
  onboarding_step_completed: {
    step_index: 2,
    step_count: 10,
    step_kind: "date",
  },
  onboarding_step_reverted: { step_index: 3, step_count: 10 },
} satisfies Partial<{
  [K in AnalyticsEventName]: AnalyticsEventProperties[K]
}>

const ROOT = path.join(__dirname, "..")

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectSources(full, out)
    else if (/\.tsx?$/u.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(full)
  }
  return out
}

const SOURCES = ["app", "src"].flatMap((dir) =>
  collectSources(path.join(ROOT, dir)),
)

/** 발화 지점. prettier 가 인자를 줄바꿈하므로 공백을 건너뛰고 찾는다. */
function emitPattern(event: string): RegExp {
  return new RegExp(String.raw`trackAnalyticsEvent\(\s*"${event}"`, "gu")
}

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8")
}

function emittersOf(event: string): string[] {
  return SOURCES.filter((file) =>
    emitPattern(event).test(fs.readFileSync(file, "utf8")),
  )
    .map((file) => path.relative(ROOT, file))
    .sort()
}

function emitCountIn(relative: string, event: string): number {
  return [...read(relative).matchAll(emitPattern(event))].length
}

describe("J1 — 새 속성 키가 두 새니타이저를 모두 통과한다", () => {
  const entries = Object.entries(J1_SAMPLES) as [
    string,
    Record<string, unknown>,
  ][]

  it.each(entries)("%s 의 속성이 하나도 안 떨어진다", (_event, properties) => {
    expect(sanitizeAnalyticsProperties(properties)).toEqual(properties)
    const blockedByServer = Object.keys(properties).filter((key) =>
      SERVER_FORBIDDEN_PROP_KEY.test(key),
    )
    expect(blockedByServer).toEqual([])
  })

  it("이 여정에서 쓰고 싶어지는 이름들은 실제로 막힌다", () => {
    /*
      전부 J1 초안·리뷰에서 실제로 후보였던 이름이다. 골랐다면 조용히 사라졌을 것이고,
      사라진 것은 대시보드에서 "그 축이 없다" 가 아니라 "그런 일이 없었다" 로 보인다.
    */
    const tempting = {
      email_domain: "gmail.com", // → 아예 싣지 않는다
      nickname_length: 4, // → 싣지 않는다(`name` 이 걸린다)
      birth_year: 1978, // → 싣지 않는다
      error_code: "OTP_ERROR_002", // → `fail_kind`
      step_name: "acquisition", // → `step`
      answer_kind: "only", // → `step_kind`
      provider_name: "kakao", // → `provider`
    }
    // 클라 정규식이 통째로 떨군다 — 하나도 안 남는다.
    expect(sanitizeAnalyticsProperties(tempting)).toEqual({})
  })

  it("실제로 고른 키들은 두 정규식 어디에도 안 걸린다", () => {
    const chosen = [
      "gate",
      "provider",
      "fail_kind",
      "source",
      "item",
      "agreed",
      "method",
      "attempt_no",
      "step",
      "step_index",
      "step_count",
      "step_kind",
      "mode",
    ]
    for (const key of chosen) {
      expect(sanitizeAnalyticsProperties({ [key]: "x" })).toEqual({
        [key]: "x",
      })
      expect(SERVER_FORBIDDEN_PROP_KEY.test(key)).toBe(false)
    }
  })
})

/**
 * 이벤트 → 그 이름이 나가도 되는 파일 **전부**.
 *
 * 여러 파일이 있는 것은 같은 사건이 여러 표면에서 일어나기 때문이다(인증번호는 네 화면이
 * 같은 문법으로 쓴다). 그 목록이 늘어나면 그건 새 표면이 생겼다는 뜻이고, 그때
 * `source` 값을 함께 늘렸는지 여기서 다시 보게 된다.
 */
const J1_EMITTERS: Record<string, string[]> = {
  app_entry_routed: ["app/index.tsx"],
  auth_social_login_cancelled: ["src/hooks/useAuth.ts"],
  auth_social_login_blocked: ["src/features/auth/hooks/useSocialLogin.ts"],
  auth_withdrawal_prompt_viewed: [
    "src/features/auth/hooks/useEmailLogin.ts",
    "src/features/auth/hooks/useSocialLogin.ts",
  ],
  auth_terms_item_toggled: ["src/features/auth/hooks/useTermsAgreement.ts"],
  auth_terms_submitted: ["src/features/auth/hooks/useTermsAgreement.ts"],
  auth_code_requested: [
    "src/features/auth/hooks/useSignupEmail.ts",
    "src/features/auth/views/ForgotPasswordScreen.tsx",
    "src/features/auth/views/SocialLinkEmailScreen.tsx",
  ],
  auth_code_verify_failed: [
    "src/features/auth/hooks/useSignupEmail.ts",
    "src/features/auth/views/ForgotPasswordScreen.tsx",
    "src/features/auth/views/SocialLinkEmailScreen.tsx",
  ],
  auth_code_expired: [
    "src/features/auth/views/ForgotPasswordScreen.tsx",
    "src/features/auth/views/SignupEmailScreen.tsx",
    "src/features/auth/views/SocialLinkEmailScreen.tsx",
  ],
  auth_email_link_prompt_viewed: ["src/features/auth/hooks/useSignupEmail.ts"],
  auth_signup_password_submitted: [
    "src/features/auth/hooks/useSignupPassword.ts",
  ],
  auth_signup_step_completed: ["src/features/auth/hooks/useSignupSteps.ts"],
  auth_signup_step_reverted: ["src/features/auth/hooks/useSignupSteps.ts"],
  auth_signup_step_blocked: ["src/features/auth/hooks/useSignupSteps.ts"],
  auth_account_link_completed: [
    "src/features/auth/views/EmailLoginLinkPasswordScreen.tsx",
    "src/features/auth/views/SocialLinkEmailScreen.tsx",
  ],
  auth_password_reset_completed: [
    "src/features/auth/views/ForgotPasswordScreen.tsx",
  ],
  onboarding_welcome_viewed: ["src/features/onboarding/hooks/useOnboarding.ts"],
  onboarding_welcome_confirmed: [
    "src/features/onboarding/hooks/useOnboarding.ts",
  ],
  onboarding_welcome_returned: [
    "src/features/onboarding/hooks/useOnboarding.ts",
  ],
  onboarding_step_reverted: ["src/features/onboarding/hooks/useOnboarding.ts"],
}

describe("J1 — 한 사건이 한 이름으로 한 번 나간다", () => {
  it.each(Object.entries(J1_EMITTERS))(
    "%s 은 정해진 파일에서만 나간다",
    (event, owners) => {
      expect(emittersOf(event)).toEqual([...owners].sort())
    },
  )

  it("완료·성공 축은 파일당 정확히 한 자리에서만 나간다", () => {
    /*
      성공을 두 곳에서 쏘면 완주율이 100% 를 넘고, 그 순간 퍼널 전체가 못 읽는 그래프가
      된다. 실패 계열(`auth_signup_step_blocked`)은 갈래마다 값이 달라 여러 자리가
      정상이므로 여기 없다.
    */
    expect(
      emitCountIn(
        "src/features/auth/hooks/useSignupSteps.ts",
        "auth_signup_step_completed",
      ),
    ).toBe(1)
    expect(
      emitCountIn(
        "src/features/auth/hooks/useSignupPassword.ts",
        "auth_signup_password_submitted",
      ),
    ).toBe(1)
    expect(
      emitCountIn(
        "src/features/auth/views/ForgotPasswordScreen.tsx",
        "auth_password_reset_completed",
      ),
    ).toBe(1)
    expect(
      emitCountIn(
        "src/features/onboarding/hooks/useOnboarding.ts",
        "onboarding_welcome_confirmed",
      ),
    ).toBe(1)
  })

  it("취소와 실패는 **배타적**이다 — 같은 catch 안에서 갈린다", () => {
    /*
      이 여정 최대의 오류였다: `useAuth` 의 catch 가 전부를 failed 로 세어 소셜 시트를
      닫은 사람까지 실패로 들어갔다. 두 이름을 다른 파일에서 쏘면(예: 취소는
      `useSocialLogin` 에서) 이미 나간 failed 를 되돌릴 수 없으므로, **한 분기**여야 한다.
    */
    const source = read("src/hooks/useAuth.ts")
    expect(source).toMatch(
      /if \(isUserCancelledError\(error\)\) \{\s*trackAnalyticsEvent\(\s*"auth_social_login_cancelled"/u,
    )
    // failed 는 그 else 안에 있다 = 취소가 아닌 경우에만 나간다.
    expect(source).toMatch(
      /trackAnalyticsEvent\("auth_social_login_cancelled", \{ provider \}\)\s*\} else \{\s*trackAnalyticsEvent\("auth_social_login_failed"/u,
    )
    expect(
      emitCountIn("src/hooks/useAuth.ts", "auth_social_login_failed"),
    ).toBe(1)
  })

  it("탈퇴 대기 갈래는 blocked 로 **중복해서** 세지 않는다", () => {
    /*
      설계 §J1-0 정정 3. 같은 틱에 모달을 띄우는 갈래라, 두 이름으로 세면
      '소셜 막힘' 총량과 '탈퇴 모달 노출' 총량이 서로를 중복 포함한다.
    */
    const source = read("src/features/auth/hooks/useSocialLogin.ts")
    // 분기 조건(`action.type === "withdrawal_pending"`)은 그대로 있어야 한다 —
    // 없어야 하는 것은 그 갈래를 **blocked 로 세는** 것이다.
    expect(source).toContain('action.type === "withdrawal_pending"')
    expect(source).not.toContain('fail_kind: "withdrawal_pending"')
    const blockedKinds = [...source.matchAll(/fail_kind: "([a-z_]+)"/gu)].map(
      (match) => match[1],
    )
    expect(blockedKinds.sort()).toEqual([
      "generic",
      "link_required",
      "provider_email_required",
    ])
  })
})

describe("J1 — 완료 축이 실제 핸들러에 걸려 있다", () => {
  const steps = read("src/features/auth/hooks/useSignupSteps.ts")

  it("스텝 완료는 전진이 확정된 뒤에 나간다 (중복 확인 통과 후)", () => {
    /*
      닉네임 중복 확인보다 **앞**에 두면 서버가 막은 사람도 통과한 것으로 세어진다.
      그러면 이 여정에서 유일하게 서버 왕복 뒤에 막히는 질문의 이탈이 통째로 사라진다.
    */
    const takenBlocked = steps.indexOf('fail_kind: "taken"')
    const completed = steps.indexOf(
      'trackAnalyticsEvent("auth_signup_step_completed"',
    )
    expect(takenBlocked).toBeGreaterThan(-1)
    expect(completed).toBeGreaterThan(takenBlocked)
    // 마지막 스텝은 제출을 태우기 **직전**이다 — 제출 실패로 되돌아와도 그 질문은 끝났다.
    expect(completed).toBeLessThan(
      steps.indexOf("if (isLastStep) {\n      await submit()"),
    )
  })

  it("스텝 되돌리기는 goBack 의 stepIndex > 0 가지에 있다", () => {
    expect(steps).toMatch(
      /if \(stepIndex > 0\) \{[^}]*trackAnalyticsEvent\(\s*"auth_signup_step_reverted"/su,
    )
  })

  it("첫 스텝에서 나가는 것은 새 이름을 만들지 않고 공용 nav_back 에 맡긴다", () => {
    // `exitSignup` 은 `useGoBack` 이고 그 통로가 nav_back 을 쏜다.
    expect(steps).toContain("const exitSignup = useGoBack()")
    expect(steps).not.toContain("auth_signup_abandoned")
  })

  it("세 모드 판정이 backfill 을 먼저 본다", () => {
    /*
      backfill 은 completion 의 조건도 만족한다(ACTIVE + requiresAdditionalInfo).
      순서가 뒤집히면 이미 가입한 사람의 추가정보 입력이 '소셜 마무리' 로 세어지고,
      `prop:mode=signup` 스코프 퍼널은 그대로인데 completion 코호트만 오염된다.
    */
    expect(steps).toMatch(
      /isBackfillMode\s*\?\s*"backfill"\s*:\s*isCompletionMode\s*\?\s*"completion"\s*:\s*"signup"/u,
    )
  })

  it("모드 스코프 퍼널의 여섯 스텝이 전부 mode 를 싣는다", () => {
    /*
      설계 §J1-0 정정 2: `prop:mode=signup` 은 `scoped` CTE 전체에 걸리므로 그 키를
      안 싣는 스텝은 통째로 탈락한다. 순번 퍼널은 같은 이름 6회라 **한 이벤트가**
      항상 mode 를 실으면 성립한다.
    */
    const completedCall = steps.slice(
      steps.indexOf('trackAnalyticsEvent("auth_signup_step_completed"'),
      steps.indexOf('trackAnalyticsEvent("auth_signup_step_completed"') + 200,
    )
    expect(completedCall).toContain("mode: analyticsMode")
  })

  it("비밀번호 화면의 성공 축은 다음 화면으로 넘기는 핸들러에 있다", () => {
    const source = read("src/features/auth/hooks/useSignupPassword.ts")
    const emitted = source.indexOf(
      'trackAnalyticsEvent("auth_signup_password_submitted"',
    )
    expect(emitted).toBeGreaterThan(-1)
    expect(
      source.indexOf('router.replace("/(auth)/profile-setup")'),
    ).toBeGreaterThan(emitted)
    // 비밀번호 **값**은 어떤 속성으로도 안 나간다.
    expect(source).toMatch(
      /trackAnalyticsEvent\("auth_signup_password_submitted", \{\}\)/u,
    )
  })

  it("온보딩 완료 축은 handleNext 안에 있고 유형을 함께 싣는다", () => {
    const source = read("src/features/onboarding/hooks/useOnboarding.ts")
    expect(source).toMatch(
      /const handleNext = \(\) => \{[^}]*trackAnalyticsEvent\(\s*"onboarding_step_completed",\s*\{[^}]*step_kind: currentStep\.type/su,
    )
  })
})

describe("J1 — 매초 갱신되는 상태는 전이에서만 1회 쏜다", () => {
  const timerScreens = [
    "src/features/auth/views/SignupEmailScreen.tsx",
    "src/features/auth/views/ForgotPasswordScreen.tsx",
    "src/features/auth/views/SocialLinkEmailScreen.tsx",
  ]

  it.each(timerScreens)("%s 의 만료 발화는 useEffect + ref 가드다", (file) => {
    const source = read(file)
    /*
      3분 타이머는 매초 state 를 갈아 끼운다. 렌더 본문에서 쏘면 한 번의 만료가 수십
      행이 되고, 그 수는 대시보드에서 "메일이 엄청 늦다" 로 읽힌다.
    */
    expect(source).toMatch(
      /useEffect\(\(\) => \{\s*if \(!codeExpired\) \{\s*expiredTrackedRef\.current = false\s*return\s*\}\s*if \(expiredTrackedRef\.current\) return\s*expiredTrackedRef\.current = true\s*trackAnalyticsEvent\(\s*"auth_code_expired"/su,
    )
    expect(emitCountIn(file, "auth_code_expired")).toBe(1)
  })

  it("만료 판정은 '아직 인증 전' 을 함께 본다 — 통과한 사람이 만료로 찍히면 지표가 뒤집힌다", () => {
    /*
      이메일 연결 모드의 **성공** 분기가 setTimer(0) 을 부르면서 codeSent 는 true 로 남긴다
      (useSignupEmail.ts). 이 화면은 성공 뒤에도 router.push 라 마운트된 채여서, 가드가 없으면
      그 사람이 곧바로 auth_code_expired 를 쏜다 — 화면은 이 값을 awaitingCode 블록 안에서만
      읽어 눈에 안 띄었지만 계측은 블록 밖이다.

      나머지 두 화면은 구조가 달라 같은 구멍이 없다: ForgotPassword 는 step === "otp" 로 이미
      갈라져 있고, SocialLinkEmail 은 성공 시 router.replace 로 언마운트된다.
    */
    const source = read("src/features/auth/views/SignupEmailScreen.tsx")
    expect(source).toMatch(
      /const codeExpired =\s*awaitingCode && !sendError && timer === 0 && codeSent/u,
    )
    expect(read("src/features/auth/views/ForgotPasswordScreen.tsx")).toMatch(
      /const codeExpired = step === "otp" &&/u,
    )
  })

  it("약관 토글은 setState 업데이터 **밖**에서 쏜다", () => {
    /*
      업데이터는 React 가 두 번 부를 수 있다(StrictMode·동시 렌더). 안에서 쏘면 한 번의
      탭이 두 행이 되고, 그 배가는 '마케팅 동의율' 의 분모까지 흔든다.
    */
    const source = read("src/features/auth/hooks/useTermsAgreement.ts")
    const emitted = source.indexOf(
      'trackAnalyticsEvent("auth_terms_item_toggled", {\n          item: id,',
    )
    const updater = source.indexOf(
      "setAgreed((prev) => ({ ...prev, [id]: !prev[id] }))",
    )
    expect(emitted).toBeGreaterThan(-1)
    expect(updater).toBeGreaterThan(emitted)
  })

  it("진입 분기는 판정이 바뀔 때만 쏜다 (Redirect 옆이 아니라 useEffect 안)", () => {
    const source = read("app/index.tsx")
    expect(source).toMatch(
      /useEffect\(\(\) => \{[^}]*if \(lastGateRef\.current === gate\) return/su,
    )
    // 렌더에서 반환되는 Redirect 와 같은 줄에 발화가 없다.
    expect(source).not.toMatch(/<Redirect[^>]*trackAnalyticsEvent/u)
  })

  it("온보딩 welcome 진입은 복원 중을 세지 않는다", () => {
    // `phase` 의 초기값이 'welcome' 이라 가드가 없으면 복귀자까지 전부 세어진다.
    const source = read("src/features/onboarding/hooks/useOnboarding.ts")
    expect(source).toMatch(
      /useEffect\(\(\) => \{\s*if \(isInitializing\) return\s*if \(phase !== "welcome"\)/su,
    )
  })
})

describe("J1 — 공용 통로가 덮는 이름은 되살아나지 않는다", () => {
  /**
   * 초안(J1-2)에 있었지만 만들지 않기로 한 이름들. 각각을 무엇이 대신 덮는지는
   * 설계 문서 J1-3 절과 이 PR 의 `dropped` 목록에 있다.
   *
   * 이 검사가 있는 이유: 다음 사람이 "이 자리에 이벤트가 없네" 하고 다시 짓는 것이
   * 가장 흔한 회귀다. 그러면 같은 사건이 여정 수만큼 다른 이름으로 흩어진다.
   */
  const RETIRED = [
    "auth_signup_abandoned",
    "auth_signup_code_send_failed",
    "auth_signup_code_expired",
    "auth_signup_code_requested",
    "auth_signup_code_verify_failed",
    "auth_signup_password_rejected",
    "auth_terms_abandoned",
    "auth_terms_document_opened",
    "auth_withdrawal_prompt_dismissed",
    "auth_acquisition_sheet_opened",
    "auth_acquisition_sheet_confirmed",
    "auth_acquisition_sheet_dismissed",
    "auth_email_link_prompt_resolved",
    "auth_email_link_completed",
    "auth_email_link_failed",
    "auth_social_link_code_requested",
    "auth_social_link_completed",
    "auth_social_link_failed",
    "auth_password_reset_started",
    "auth_password_reset_failed",
    "onboarding_steps_retry_pressed",
  ]

  it.each(RETIRED)("%s 은 어디서도 나가지 않는다", (event) => {
    expect(emittersOf(event)).toEqual([])
  })

  it("폼 유효성은 공용 통로 하나로만 센다", () => {
    // 비밀번호 생성·재설정·계정 연결 세 화면이 같은 함수를 쓴다.
    const forms = SOURCES.filter((file) =>
      /trackFormValidationFailed\(/u.test(fs.readFileSync(file, "utf8")),
    ).map((file) => path.relative(ROOT, file))
    expect(forms).toContain("src/features/auth/views/SignupPasswordScreen.tsx")
    expect(forms).toContain("src/features/auth/views/ForgotPasswordScreen.tsx")
    expect(forms).toContain(
      "src/features/auth/views/EmailLoginLinkPasswordScreen.tsx",
    )
  })

  it("fail_kind 값은 오류 분류를 다시 짓지 않고 정본에서 가져온다", () => {
    /*
      호출부마다 `e instanceof ApiError ? e.code : "network"` 를 다시 적으면 같은 실패가
      화면·로그·분석에서 서로 다른 말을 한다. 판정의 정본은 `resolveError` 하나다.
    */
    const users = SOURCES.filter((file) =>
      /toAnalyticsFailKind\(/u.test(fs.readFileSync(file, "utf8")),
    ).map((file) => path.relative(ROOT, file))
    expect(users.sort()).toEqual(
      [
        "src/features/auth/hooks/useSignupEmail.ts",
        "src/features/auth/views/ForgotPasswordScreen.tsx",
        "src/features/auth/views/SocialLinkEmailScreen.tsx",
        "src/features/onboarding/hooks/useOnboarding.ts",
        "src/hooks/useAuth.ts",
        // ── J2(홈·식사기록·건강기록·통계). 목록이 느는 것은 정상이고, **여기 없는
        //    새 판정이 생기는 것**이 사고다. 아래 여섯은 전부 통로 없는 실패다:
        //    토스트를 직접 띄우거나(저장 미준비), 재시도 버튼 없이 끝나거나(삭제),
        //    자기 오류 카드를 그린다(통계).
        "src/features/food-analysis/hooks/useMealPersistenceActions.ts",
        "src/features/home/components/record/RecordView.tsx",
        "src/features/home/hooks/useBloodMetricsRecord.ts",
        "src/features/home/hooks/useFoodAnalysis.ts",
        "src/features/home/hooks/useExtraWater.ts",
        "src/features/home/hooks/useWeightEdemaRecord.ts",
        "src/features/stats-report/components/StatsReportScreen.tsx",
        // 정본. 재수출(`index.ts`)은 호출이 아니라 여기 안 잡힌다.
        "src/lib/errorMessage/resolve.ts",
      ].sort(),
    )
  })
})
