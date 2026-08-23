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

const fs = require("node:fs")
const path = require("node:path")

const PRODUCTION_BACKEND =
  "https://sinsin-api-production-87899379852.asia-northeast3.run.app/api/v1"
const TEST_BACKEND =
  "https://sinsin-api-test-87899379852.asia-northeast3.run.app/api/v1"

// 스토어에 "출시"해도 되는 프로파일. 운영 백엔드를 본다.
const RELEASE_PROFILES = new Set(["production", "testflight", "playstore"])

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
  }

  return violations
}

function requestedProfile(argv) {
  const index = argv.indexOf("--profile")
  return index === -1 ? undefined : argv[index + 1]
}

function main() {
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

  console.log(
    profile
      ? `릴리스 설정 확인됨 — ${profile} → ${PRODUCTION_BACKEND}`
      : "릴리스 설정 확인됨 — 프로파일별 백엔드 짝이 모두 맞다.",
  )
}

main()
