/**
 * 진입 가드 — **"지금 이 화면에 있어도 되는가"를 판정하는 순수 함수 하나.**
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 왜 함수로 뽑았나
 *
 * 종전에는 `app/_layout.tsx` 의 `useEffect` 안에 `if / else if` 다섯 갈래가
 * 늘어서 있었고, 각 갈래가 `inAuthGroup`·`inOnboarding`·`inPublicLegalDocument`
 * 처럼 여섯 개의 불리언을 서로 다른 조합으로 물고 있었다. 문제는 세 가지였다:
 *
 * 1. **읽어서 확인할 수 없다.** "약관은 로그인 전에도 열리는가" 를 알려면 다섯 갈래에
 *    흩어진 `!inPublicLegalDocument` 를 모두 찾아야 한다. 하나를 빠뜨리면 그 조건만
 *    조용히 다르게 동작한다.
 * 2. **검사할 수 없다.** effect 안에 있으니 상태 조합을 넣어 결과를 볼 방법이 없었다.
 *    실제 앱을 그 상태로 만들어야만 확인된다 — 소셜 가입 도중 + 추가정보 필요 같은
 *    조합은 손으로 재현하기 어렵다.
 * 3. **이미 있는 곳으로 또 보낸다.** 갈래가 참이면 무조건 `router.replace` 를 불렀다.
 *    목적지가 지금 화면과 같아도 스택을 갈아 끼우므로, 화면이 한 번 더 마운트되고
 *    그 사이의 입력·스크롤이 날아간다.
 *
 * 그래서 판정을 순수 함수로 옮기고, effect 는 **결과를 실행만** 한다.
 * `tests/navigationGuard.test.ts` 가 상태 조합의 진리표를 검사한다.
 *
 * ■ 로그인 없이도 열리는 화면 (`isPublic`)
 *
 * 둘뿐이고 이유가 서로 다르다. 한 줄에 모아 두면 "이 화면이 왜 열려 있는지" 를
 * 다섯 갈래를 뒤지지 않고 확인할 수 있다.
 */
import type { Href } from "expo-router"

import { resolveEntryRoute, type EntryGate } from "./entryRoute"

/** 로그인 상태여도 앱을 쓸 수 없는 계정. 보이면 세션을 끊는다. */
const BLOCKED_ACCOUNT_STATES = new Set(["SUSPENDED", "WITHDRAWAL_PENDING"])

export interface GuardInput {
  /** 세션 복구가 끝났는가. 끝나기 전에는 아무 판정도 하지 않는다. */
  isLoading: boolean
  isAuthenticated: boolean
  accountState: string | null
  requiresAdditionalInfo: boolean
  entryGate: EntryGate
  /** 가입 도중이면 인증 그룹에 머무른다(스텝 사이에서 튕기지 않게). */
  isSignupInProgress: boolean
  /** 온보딩 도중이면 온보딩 밖으로 끌어내지 않는다. */
  isOnboardingInProgress: boolean
  /** `useSegments()` 결과. 그룹(`(auth)`)이 포함된 원형. */
  segments: readonly string[]
  /** `__DEV__`. 쇼케이스 화면의 접근 규칙만 여기에 걸린다. */
  isDev: boolean
}

export type GuardDecision =
  | { type: "stay" }
  | { type: "redirect"; href: Href }
  /** 차단된 계정 — 리다이렉트가 아니라 세션을 끊는 것이 맞다. */
  | { type: "signOut" }

const STAY: GuardDecision = { type: "stay" }

function at(segments: readonly string[], index: number): string | undefined {
  return segments[index]
}

/** 현재 위치를 목적지와 같은 모양(`/(auth)/login`)으로. */
function currentHref(segments: readonly string[]): string {
  return `/${segments.join("/")}`
}

function redirect(segments: readonly string[], href: Href): GuardDecision {
  // 이미 거기 있으면 보내지 않는다 — 같은 곳으로의 replace 는 화면을 다시 마운트한다.
  if (typeof href === "string" && href === currentHref(segments)) return STAY
  return { type: "redirect", href }
}

export function resolveGuard(input: GuardInput): GuardDecision {
  const { segments } = input

  // 세션 복구 전에는 판정할 근거가 없다. 여기서 움직이면 로그인 상태를 알기도 전에
  // 로그인 화면으로 보내게 된다.
  if (input.isLoading) return STAY

  /* v2 컴포넌트 쇼케이스: dev 전용 검증 화면.
      - dev: 인증 리다이렉트에서 제외 → 로그인 없이 바로 확인.
      - prod: 딥링크로 진입해도(로그인 유저 포함) 정규 화면으로 돌려보내 접근 차단.
        (라우트 코드는 번들에 남지만 더미 데이터 컴포넌트 갤러리라 무해 + 런타임 접근은 막힌다.) */
  if (at(segments, 0) === "v2-showcase") {
    if (input.isDev) return STAY
    return redirect(
      segments,
      input.isAuthenticated ? "/(tabs)/home" : "/(auth)/login",
    )
  }

  if (
    input.isAuthenticated &&
    input.accountState !== null &&
    BLOCKED_ACCOUNT_STATES.has(input.accountState)
  ) {
    return { type: "signOut" }
  }

  const inAuthGroup = at(segments, 0) === "(auth)"
  const inOnboarding = at(segments, 0) === "onboarding"
  const inProfileSetup = inAuthGroup && at(segments, 1) === "profile-setup"
  const inSocialLinkEmail =
    inAuthGroup && at(segments, 1) === "social-link-email"

  /* 로그인 없이도 열려야 하는 화면.
      - `legal-document`: 로그인 화면의 약관 링크가 여기로 온다. 동의하기 전에 읽어야 한다.
      - `withdrawal-complete`: 탈퇴 직후라 이미 로그아웃 상태다. 이 화면이 스스로
        로그인으로 보낸다 — 가드가 먼저 낚아채면 "탈퇴됐다" 를 못 보고 넘어간다. */
  const isPublic =
    segments[segments.length - 1] === "legal-document" ||
    (at(segments, 0) === "(settings)" &&
      at(segments, 1) === "withdrawal-complete")

  /*
    관문 판정은 `entryGate` **또는** `accountState` 다 — 둘 중 하나만 봐서는 안 된다.

    서버의 계정 상태 가드(`get_active_user`)는 `accountState` 로만 판정해서,
    PENDING_ONBOARDING 계정은 스토리 작성 같은 쓰기 요청에 403 을 준다. 그런데 앱은
    `entryGate` 만 보고 있었다. 두 값이 어긋난 계정(가입 도중 끊겼거나 서버가 상태만
    되돌린 경우)은 **앱 안을 돌아다닐 수는 있는데 무엇을 눌러도 403** 인 상태에
    갇혔고, 온보딩으로 돌아갈 길이 화면 어디에도 없었다(2026-08-02 QA "스토리 동작 안 함").

    accountState 를 함께 보면 그 계정은 다음 화면 전환에서 자동으로 온보딩·프로필로
    끌려가 스스로 복구된다. 별도의 "온보딩 다시하기" 버튼을 만드는 것보다 이쪽이
    옳다 — 사용자가 자기 계정 상태를 이해하고 메뉴를 찾아 들어갈 이유가 없다.
  */
  const needsProfile =
    input.entryGate === "PROFILE" || input.accountState === "PENDING_PROFILE"
  const needsAdditionalInfo =
    input.entryGate === "PROFILE" &&
    input.accountState === "ACTIVE" &&
    input.requiresAdditionalInfo
  const needsOnboarding =
    input.entryGate === "ONBOARDING" ||
    input.accountState === "PENDING_ONBOARDING"
  const mustFinishProfile = needsProfile || needsAdditionalInfo

  if (!input.isAuthenticated) {
    if (inAuthGroup || isPublic) return STAY
    return redirect(segments, "/(auth)/login")
  }

  if (inAuthGroup) {
    // 가입 진행 중이면 인증 그룹에 유지한다(스텝 사이에서 튕기지 않게).
    if (input.isSignupInProgress) return STAY
    // 소셜 계정에 이메일을 잇는 중 — 로그인은 됐지만 이 화면을 끝내야 한다.
    if (inSocialLinkEmail) return STAY
    // 프로필을 채워야 하는 사람이 프로필 화면에 있다. 그대로 둔다.
    if (mustFinishProfile && inProfileSetup) return STAY
    // 목적지 판정은 `app/index.tsx` 와 같은 규칙을 써야 서로 어긋나지 않는다.
    return redirect(
      segments,
      resolveEntryRoute({
        isAuthenticated: input.isAuthenticated,
        accountState: input.accountState,
        requiresAdditionalInfo: input.requiresAdditionalInfo,
        entryGate: input.entryGate,
      }),
    )
  }

  if (isPublic) return STAY
  if (inOnboarding) return STAY
  /*
    온보딩 진행 중 STAY 는 **온보딩 화면과 탭**으로만 한정한다.

    이 조항의 존재 이유는 완주 착지 한 순간뿐이다 — 마지막 단계가 홈으로
    replace 하는 시점에 게이트는 아직 ONBOARDING 이라, 무제한이면 홈에 도착하지
    못하고 되돌려진다. 그런데 종전에는 **어디든** STAY 라서, 온보딩 도중 푸시
    탭 등으로 전역 모달(/consult 같은)이 열리면 그대로 머물게 했고, iOS 는
    presented 모달을 카드 위에 남겨 두므로 **온보딩이 기능 화면 뒤에 깔려
    안 보이는** z-순서 문제가 됐다(2026-08-03 "AI상담이 온보딩보다 앞에").
  */
  if (input.isOnboardingInProgress && at(segments, 0) === "(tabs)") return STAY

  // 필수 추가정보를 끝내기 전에는 프로필 입력으로 고정.
  if (mustFinishProfile) return redirect(segments, "/(auth)/profile-setup")
  // 온보딩 미완료 유저가 다른 화면에 있으면 온보딩으로.
  if (needsOnboarding) return redirect(segments, "/onboarding")

  return STAY
}
