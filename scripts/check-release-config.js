#!/usr/bin/env node

// 스토어에 나간 iOS 1.2.1(빌드 70)이 테스트 백엔드를 보고 있었다.
// 원인은 URL 오타가 아니다 — eas.json 의 운영 프로파일은 처음부터 맞았다.
// 진짜 원인은 "스토어 배포 자격증명을 쓰면서 테스트 백엔드를 보는" 프로파일이
// (ios-testflight-test / test-aab / test-playstore) 운영 릴리스와 **같은**
// 스토어 앱으로 올라간다는 점이다. 테플에 올린 테스트 빌드를 그대로 출시하면
// 운영 사용자가 테스트 DB 를 쓰게 된다.
//
// 그래서 URL 을 고치는 대신 짝을 불변식으로 못박는다.
// 프로파일을 새로 만들거나 URL 을 옮기면 여기서 먼저 깨진다.
//
// 같은 TestFlight 를 두 계보가 공유하는 데서 오는 반대 방향 사고도 있다(2026-08-26 실측):
// 운영 빌드(84)를 제출하면 그게 TestFlight 의 최신이 되고, 테스터가 애플의 업데이트
// 알림을 누르는 순간 **운영 백엔드로 갈아탄다** — 테스터 트래픽이 실사용자 DB 에 섞인다.
// 그래서 `deploy:ios` 는 운영 제출 직후 `reclaim:testflight-top`(테스트 빌드 하나)을
// 체인으로 이어 올려 꼭대기를 테스트 계보로 되돌린다. **eas submit 을 수동으로 칠 때도
// 같은 규칙을 지킬 것** — 운영 iOS 제출 뒤엔 반드시 테스트 빌드가 뒤따라야 한다.
// 구조적 정본은 번들 ID 분리(.test)지만 카카오·구글 OAuth 재등록이 필요해 별도 과제다.

const fs = require("node:fs")
const path = require("node:path")

const PRODUCTION_BACKEND =
  "https://sinsin-api-production-87899379852.asia-northeast3.run.app/api/v1"
const TEST_BACKEND =
  "https://sinsin-api-test-87899379852.asia-northeast3.run.app/api/v1"

// 스토어에 "출시"해도 되는 프로파일. 운영 백엔드를 본다.
const RELEASE_PROFILES = new Set(["production", "testflight", "playstore"])

/**
 * 결제를 실제로 출시하는가.
 *
 * `false` 인 동안에는 RevenueCat 키가 없어도 릴리스 빌드가 나간다 — 스토어 상품이
 * 아직 없어서 결제 기능이 출시 대상이 아니고, 키가 없으면 SDK 가 설정되지 않아
 * 페이월이 열리지 않는다(`src/config/revenueCatConfig.ts`).
 *
 * **App Store / Play 상품이 준비되고 결제를 켜는 날 `true` 로 바꾼다.** 그때부터
 * "키 없이 릴리스" 가 막힌다 — 결제가 조용히 꺼진 채 출시되는 것을 막는 장치다.
 */
const BILLING_SHIPS = false

// 스토어 배포 자격증명이 필요하지만(TestFlight·Play 내부 트랙) 테스트 백엔드를 본다.
// 여기 있는 빌드는 절대 공개 출시하면 안 된다.
const TEST_STORE_PROFILES = new Set([
  "ios-testflight-test",
  "test-aab",
  "test-playstore",
])

function readBuildProfiles() {
  const easPath = path.resolve(__dirname, "..", "eas.json")
  const eas = JSON.parse(fs.readFileSync(easPath, "utf8"))
  return eas.build ?? {}
}

// distribution 을 안 적으면 EAS 기본값은 store 다. 기본값이 곧 함정이라 명시적으로 편다.
function resolveDistribution(profile) {
  return profile.distribution ?? "store"
}

function collectViolations(profiles) {
  const violations = []

  for (const [name, profile] of Object.entries(profiles)) {
    const env = profile.env ?? {}
    const backendUrl = env.EXPO_PUBLIC_BACKEND_URL
    const appEnv = env.EXPO_PUBLIC_APP_ENV
    const distribution = resolveDistribution(profile)

    if (!backendUrl) continue

    if (appEnv === "production" && backendUrl !== PRODUCTION_BACKEND) {
      violations.push(
        `${name}: APP_ENV=production 인데 백엔드가 운영이 아니다 → ${backendUrl}`,
      )
    }

    if (appEnv === "test" && backendUrl !== TEST_BACKEND) {
      violations.push(
        `${name}: APP_ENV=test 인데 백엔드가 테스트 서버가 아니다 → ${backendUrl}`,
      )
    }

    // 테스트 프로파일을 운영으로 돌리는 "수정"을 막는다.
    // 테스트가 운영 데이터를 오염시키는 쪽이 스토어 사고보다 되돌리기 어렵다.
    if (TEST_STORE_PROFILES.has(name) && backendUrl === PRODUCTION_BACKEND) {
      violations.push(
        `${name}: 테스트 전용 프로파일인데 운영 백엔드를 본다. 테스트 빌드는 테스트 백엔드에 머물러야 한다.`,
      )
    }

    // 새로 생긴 "store 배포 + 테스트 백엔드" 프로파일은 의식적으로 등록하게 만든다.
    if (
      distribution === "store" &&
      backendUrl === TEST_BACKEND &&
      !TEST_STORE_PROFILES.has(name)
    ) {
      violations.push(
        `${name}: 스토어 배포인데 테스트 백엔드를 본다. 의도한 것이면 scripts/check-release-config.js 의 TEST_STORE_PROFILES 에 추가하라.`,
      )
    }
  }

  for (const name of RELEASE_PROFILES) {
    const profile = profiles[name]

    if (!profile) {
      violations.push(`${name}: 릴리스 프로파일이 eas.json 에 없다.`)
      continue
    }

    const backendUrl = profile.env?.EXPO_PUBLIC_BACKEND_URL

    if (backendUrl !== PRODUCTION_BACKEND) {
      violations.push(
        `${name}: 릴리스 프로파일인데 운영 백엔드를 보지 않는다 → ${backendUrl ?? "(없음)"}`,
      )
    }

    // APP_ENV 를 안 적으면 appConfig 는 "local" 로 떨어지고, 그 값이 그대로
    // /public/mobile-policy 의 environment 로 나간다. 운영 정책 행이 안 잡히면
    // 강제 업데이트·기능 플래그가 통째로 빗나간다. 빈 값을 기본값으로 두지 않는다.
    if (profile.env?.EXPO_PUBLIC_APP_ENV !== "production") {
      violations.push(
        `${name}: 릴리스 프로파일인데 EXPO_PUBLIC_APP_ENV 가 production 이 아니다 → ${profile.env?.EXPO_PUBLIC_APP_ENV ?? "(없음)"}`,
      )
    }

    /*
      결제 키.

      **Test Store 키로 출시하는 것은 언제나 사고다.** `test_…` 키는 결제창이 뜨고
      구매도 "성공" 하는데 돈이 오가지 않는다. 그 빌드가 스토어에 나가면 **모두가
      무료로 프리미엄을 켠다** — 화면상으로는 아무 문제가 없어서 리뷰에서도, QA 에서도
      안 잡힌다. 그래서 이 검사는 `BILLING_SHIPS` 와 무관하게 항상 돈다.

      "키가 아예 없는 것" 은 지금은 **정상**이다. 스토어 상품이 아직 없어서 결제 기능이
      출시 대상이 아니고, 이 상태에서는 SDK 가 설정되지 않아 페이월이 열리지 않는다.
      결제를 실제로 출시하는 날 아래 `BILLING_SHIPS` 를 `true` 로 바꾸면, 그때부터
      "키가 없으면 릴리스 불가" 가 된다.
    */
    for (const [key, expectedPrefix] of [
      ["EXPO_PUBLIC_RC_IOS_KEY", "appl_"],
      ["EXPO_PUBLIC_RC_ANDROID_KEY", "goog_"],
    ]) {
      const value = profile.env?.[key]
      if (!value) {
        if (BILLING_SHIPS) {
          violations.push(
            `${name}: 릴리스 프로파일인데 ${key} 가 없다. 결제가 꺼진 채 출시된다.`,
          )
        }
      } else if (value.startsWith("test_")) {
        violations.push(
          `${name}: ${key} 가 Test Store 키다. 이 빌드가 나가면 모두가 무료로 프리미엄을 켠다 (${expectedPrefix} 키여야 한다).`,
        )
      } else if (!value.startsWith(expectedPrefix)) {
        violations.push(
          `${name}: ${key} 가 ${expectedPrefix} 로 시작하지 않는다 → ${value.slice(0, 6)}…`,
        )
      }
    }
  }

  return violations
}

function requestedProfile(argv) {
  const index = argv.indexOf("--profile")
  return index === -1 ? undefined : argv[index + 1]
}

/*
  운영 버전 정책 등록 가드.

  스토어 1.2.3 제출 직후(2026-08-26) 운영 mobile-policy 가 그 버전에
  force_update(unknown_version) 를 주고 있었다 — production 환경은 미등록 버전을
  차단하는 설계인데 출시 절차에 "버전 등록" 단계가 없었다. 그대로 나갔으면 심사
  리뷰어와 업데이트 사용자 전원이 실행 즉시 막혔다. 기존 스토어 바이너리는
  environment=test(미등록 allow)를 물어서 이 함정이 한 번도 드러나지 않았던 것.

  그래서 릴리스 빌드 전에 서버에 직접 물어본다 — 이번 버전이 운영 정책에서
  allow 가 아니면 빌드를 막는다. 등록은 어드민 콘솔의 모바일 버전 정책 화면에서.
  정책 서버에 닿을 수 없을 때도 막는다(조용히 건너뛰면 함정이 되살아난다) —
  급하면 SKIP_POLICY_CHECK=1 로 명시적으로만 통과.
*/
async function checkProductionVersionRegistered() {
  const appJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "..", "app.json"), "utf8"),
  )
  const version = appJson.expo.version
  const base = PRODUCTION_BACKEND.replace(/\/api\/v1$/, "")
  const failures = []

  for (const platform of ["ios", "android"]) {
    const url =
      `${base}/public/mobile-policy?platform=${platform}&environment=production` +
      // apiContractVersion 은 src/config/runtimeInfo.ts 의 API_CONTRACT_VERSION 과 짝.
      `&appVersion=${encodeURIComponent(version)}&buildNumber=0&apiContractVersion=1`
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      const policy = await response.json()
      if (policy.decision !== "allow") {
        failures.push(
          `${platform} ${version}: 운영 정책 판정 ${policy.decision}(${policy.reason}) — ` +
            "어드민 콘솔의 모바일 버전 정책에서 이 버전을 등록해야 출시 후 앱이 열린다.",
        )
      }
    } catch (error) {
      failures.push(
        `${platform} ${version}: 운영 정책 서버에 물을 수 없다(${error?.message ?? error}) — ` +
          "등록 여부를 직접 확인했고 급하면 SKIP_POLICY_CHECK=1 로 통과.",
      )
    }
  }
  return failures
}

async function main() {
  const profiles = readBuildProfiles()
  const violations = collectViolations(profiles)

  if (violations.length > 0) {
    console.error("eas.json 릴리스 설정이 깨졌다:")
    for (const violation of violations) console.error(`  - ${violation}`)
    process.exit(1)
  }

  const profile = requestedProfile(process.argv)

  if (profile && !RELEASE_PROFILES.has(profile)) {
    console.error(
      `'${profile}' 은 릴리스 프로파일이 아니다. 스토어로 나가는 빌드는 ${[...RELEASE_PROFILES].join(" / ")} 만 쓴다.`,
    )
    console.error(
      TEST_STORE_PROFILES.has(profile)
        ? `'${profile}' 는 테스트 백엔드를 보는 빌드다. 스토어에 출시하면 운영 사용자가 테스트 DB 를 쓰게 된다.`
        : "",
    )
    process.exit(1)
  }

  if (profile && RELEASE_PROFILES.has(profile) && !process.env.SKIP_POLICY_CHECK) {
    const failures = await checkProductionVersionRegistered()
    if (failures.length > 0) {
      console.error("운영 버전 정책 가드에 걸렸다:")
      for (const failure of failures) console.error(`  - ${failure}`)
      process.exit(1)
    }
  }

  console.log(
    profile
      ? `릴리스 설정 확인됨 — ${profile} → ${PRODUCTION_BACKEND}`
      : "릴리스 설정 확인됨 — 프로파일별 백엔드 짝이 모두 맞다.",
  )
}

main()
