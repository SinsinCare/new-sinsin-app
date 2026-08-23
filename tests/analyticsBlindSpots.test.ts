/**
 * 사각지대 다섯(설계 §9)의 계약을 고정한다.
 *
 * 이 다섯은 전부 **여정 밖**이라 화면 테스트로도, 여정 테스트로도 잡히지 않는다.
 * 그래서 여기서 세 가지를 지킨다.
 *
 *  1. **속성 키가 살아서 도착하는가.** 새니타이저가 두 벌이고(클라 `events.ts`,
 *     서버 `record.ts`) 목록이 다르며, 걸린 키는 예외도 로그도 없이 사라진다.
 *  2. **통로가 하나인가.** 같은 사건이 두 파일에서 나가기 시작하면 그 자체가 회귀다.
 *  3. **발화가 `useEffect` 안에 있는가.** 렌더 본문에서 쏘면 리렌더마다 같은 노출이
 *     다시 세어진다(설계 §2 P3). 노출 이벤트는 이 실수가 눈에 안 보인다 — 숫자가
 *     "많이 봤다" 로 그럴듯하게 커질 뿐이다.
 */
import fs from "fs"
import path from "path"

import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "@/src/features/analytics/events"
// URL 판정 자체(`classifyEntryUrl`)는 `tests/entryIntent.test.ts` 가 지킨다.
import { policyEvaluationKey } from "@/src/features/mobilePolicy/hooks/useAppPolicyGate"
import { readBatchCounts } from "@/src/features/analytics/transport"

/*
  `expo-application` 은 미변환 ESM 이라 파싱 단계에서 스위트째로 죽는다(`tests/setup.ts`
  의 expo-constants·expo-secure-store 와 같은 이유). 정책 게이트가 런타임 정보를 통해
  이걸 끌고 오는데, 여기서 검사하는 것은 순수 함수 하나라 로드만 되면 된다.
  전역(setup.ts)에 넣지 않는 이유는 이 벽에 실제로 부딪히는 스위트가 아직 여기뿐이기
  때문이다 — 늘어나면 그때 옮긴다.
*/
jest.mock("expo-application", () => ({
  __esModule: true,
  nativeApplicationVersion: "0.0.0-test",
  nativeBuildVersion: "1",
}))

/**
 * 서버 `sinsin-be-bun/src/domains/analytics/record.ts:16` 의 금지 키 정규식 **사본**.
 * 사본인 이유와 유지 규칙은 `tests/analyticsCrossCutting.test.ts` 머리말과 같다 —
 * 클라 정규식에 없는 `search`·`password`·`secret` 이 여기에만 있다.
 */
const SERVER_FORBIDDEN_PROP_KEY =
  /(email|phone|password|token|secret|address|birth|name|query|search|text|title|content|message|url)/i

/** 사각지대 이벤트의 **실제 페이로드**. 키만이 아니라 값 종류까지 통과해야 도착한다. */
const BLIND_SPOT_SAMPLES = {
  // ① 정책 게이트 — RootLayoutNav 밖에서 나가는 유일한 이벤트들
  app_policy_evaluated: {
    decision: "force_update",
    source: "server",
    blocked: true,
  },
  app_policy_store_opened: {
    decision: "force_update",
    blocked: true,
    result: "failed",
  },
  app_policy_check_slow: { wait_bucket: "very_slow", source: "fallback" },
  // ② 식당 피처 플래그 오프
  restaurant_coming_soon_viewed: { source: "fallback" },
  restaurant_coming_soon_report_pressed: { source: "none" },
  // ③ 딥링크 진입
  app_entry_from_link: { verdict: "foreign_scheme" },
  app_dead_route_viewed: {},
  // ④ 홈을 덮는 인터스티셜 셋
  home_notice_viewed: {},
  home_notice_dismissed: { mode: "back", suppressed: true },
  app_update_prompt_viewed: {},
  app_update_prompt_dismissed: { mode: "later" },
  food_recovery_swept: {
    entry: "foreground",
    recovered_count: 1,
    remaining_count: 2,
    expired_count: 1,
  },
  // ⑤ 로그아웃 두 종
  auth_signed_out: { reason: "automatic" },
} satisfies Partial<{
  [K in AnalyticsEventName]: AnalyticsEventProperties[K]
}>

describe("사각지대 계측 — 속성 키가 두 새니타이저를 모두 통과한다", () => {
  const entries = Object.entries(BLIND_SPOT_SAMPLES) as [
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

  it("이 사각지대에서 특히 고르기 쉬운 이름들은 실제로 막힌다", () => {
    /*
      전부 "그걸 실었으면 편했을" 후보들이다. 딥링크의 URL 원문·공지 제목·스토어 주소는
      싣고 싶어지지만 두 새니타이저 중 어느 한쪽에라도 걸리면 **키째로** 사라지고,
      사라졌다는 사실은 대시보드 어디에도 안 나온다.
    */
    const tempting = {
      entry_url: "sinsin://recipe/12", // → verdict 하나로 충분하다
      notice_title: "점검 안내", // → 어느 공지였는지는 이 이벤트의 질문이 아니다
      policy_message: "업데이트가 필요합니다", // → decision 이 이미 말한다
      store_url: "https://apps.apple.com/app/id6758880186",
      dead_route_path: "/nope", // → 경로는 남기지 않는다(id 가 들어 있다)
    }

    // 클라 정규식에서 살아남는 것은 하나뿐이고 —
    expect(sanitizeAnalyticsProperties(tempting)).toEqual({
      dead_route_path: "/nope",
    })
    // — 그것도 서버가 아니라 **우리가** 안 싣기로 한 것이다. 두 정규식 다 통과하므로
    // 코드에 적으면 그대로 나간다. 그래서 타입에 아예 없다.
    expect(SERVER_FORBIDDEN_PROP_KEY.test("dead_route_path")).toBe(false)
  })
})

/* ────────────────────── 발화 지점 ────────────────────── */

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

/** prettier 가 인자를 줄바꿈하므로 공백을 건너뛰고 찾는다. */
function emitPattern(event: string): RegExp {
  return new RegExp(String.raw`trackAnalyticsEvent\(\s*"${event}"`, "u")
}

/** 이벤트 → 그 이름이 나가도 되는 파일들. */
const EMITTERS: Record<string, string[]> = {
  app_policy_evaluated: ["src/features/mobilePolicy/hooks/useAppPolicyGate.ts"],
  app_policy_check_slow: [
    "src/features/mobilePolicy/hooks/useAppPolicyGate.ts",
  ],
  // 차단 화면과 권장 안내는 **다른 화면**이고, 어느 쪽이었는지는 `blocked` 로 갈린다.
  app_policy_store_opened: [
    "src/features/mobilePolicy/components/BlockingPolicyScreen.tsx",
    "src/features/mobilePolicy/components/RecommendedUpdatePrompt.tsx",
  ],
  app_update_prompt_viewed: [
    "src/features/mobilePolicy/components/RecommendedUpdatePrompt.tsx",
  ],
  app_update_prompt_dismissed: [
    "src/features/mobilePolicy/components/RecommendedUpdatePrompt.tsx",
  ],
  auth_signed_out: ["src/hooks/useAuth.ts"],
  app_entry_from_link: ["app/+native-intent.tsx"],
  app_dead_route_viewed: ["app/+not-found.tsx"],
  home_notice_viewed: [
    "src/features/announcement/components/AnnouncementPopupModal.tsx",
  ],
  home_notice_dismissed: [
    "src/features/announcement/components/AnnouncementPopupModal.tsx",
  ],
  food_recovery_swept: ["src/features/home/hooks/useFoodAnalysisRecovery.ts"],
  restaurant_coming_soon_viewed: ["app/(tabs)/restaurant.tsx"],
  restaurant_coming_soon_report_pressed: ["app/(tabs)/restaurant.tsx"],
}

describe("통로는 하나다", () => {
  it.each(Object.entries(EMITTERS))(
    "%s 은 %s 에서만 나간다",
    (event, owners) => {
      const pattern = emitPattern(event)
      const emitters = SOURCES.filter((file) =>
        pattern.test(fs.readFileSync(file, "utf8")),
      ).map((file) => path.relative(ROOT, file))
      expect(emitters.sort()).toEqual([...owners].sort())
    },
  )
})

/**
 * `index` 위치가 어떤 `useEffect(` 호출의 괄호 안인가.
 *
 * 괄호를 세는 것으로 충분하다 — 이 파일들의 문자열 안에 짝이 안 맞는 괄호가 없다.
 * (있으면 이 검사가 **거짓 실패**로 시끄러워지지, 조용히 통과하지 않는다.)
 */
function isInsideUseEffect(source: string, index: number): boolean {
  const marker = /useEffect\(/gu
  let match: RegExpExecArray | null
  while ((match = marker.exec(source)) !== null) {
    const open = match.index + match[0].length - 1
    if (open > index) return false
    let depth = 0
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === "(") depth += 1
      else if (source[i] === ")") {
        depth -= 1
        if (depth === 0) {
          if (index > open && index < i) return true
          break
        }
      }
    }
  }
  return false
}

describe("노출 이벤트는 useEffect 안에서만 쏜다", () => {
  /*
    노출을 렌더 본문에서 쏘면 부모가 다시 그릴 때마다 같은 팝업이 여러 번 세어지고,
    그 오류는 "노출이 많다" 로 보여서 눈으로는 절대 안 잡힌다. 전이 가드(ref) 는
    같은 파일에서 함께 읽히므로, 여기서는 **자리**만 고정한다.
  */
  const VIEW_EVENTS: [string, string][] = [
    [
      "app_policy_evaluated",
      "src/features/mobilePolicy/hooks/useAppPolicyGate.ts",
    ],
    [
      "home_notice_viewed",
      "src/features/announcement/components/AnnouncementPopupModal.tsx",
    ],
    [
      "app_update_prompt_viewed",
      "src/features/mobilePolicy/components/RecommendedUpdatePrompt.tsx",
    ],
    ["restaurant_coming_soon_viewed", "app/(tabs)/restaurant.tsx"],
    ["app_dead_route_viewed", "app/+not-found.tsx"],
  ]

  it.each(VIEW_EVENTS)("%s (%s)", (event, file) => {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8")
    const index = source.search(emitPattern(event))
    expect(index).toBeGreaterThan(-1)
    expect(isInsideUseEffect(source, index)).toBe(true)
  })

  it("검사가 헛돌지 않는다 — 렌더 본문의 발화는 걸린다", () => {
    const fake = [
      "function Screen() {",
      "  useEffect(() => { setup() }, [])",
      '  trackAnalyticsEvent("home_notice_viewed", {})',
      "  return null",
      "}",
    ].join("\n")
    expect(
      isInsideUseEffect(fake, fake.search(emitPattern("home_notice_viewed"))),
    ).toBe(false)
  })
})

/* ────────────────────── ① 정책 게이트 ────────────────────── */

describe("정책 판정은 한 번만 센다", () => {
  it("캐시로 연 뒤의 재검증이 같은 답이면 같은 열쇠다", () => {
    // 부팅 경로는 캐시 → 재검증으로 `evaluation` 을 두 번 갈아끼운다. 답이 같으면
    // 그건 한 번의 판정이고, 두 번 세면 차단 코호트가 배로 부푼다.
    const first = policyEvaluationKey({
      decision: "allow",
      source: "cache",
      blocked: false,
    })
    const again = policyEvaluationKey({
      decision: "allow",
      source: "cache",
      blocked: false,
    })
    expect(again).toBe(first)
  })

  it("캐시가 열어 준 뒤 서버가 막으면 다른 사건이다", () => {
    const opened = policyEvaluationKey({
      decision: "allow",
      source: "cache",
      blocked: false,
    })
    const blocked = policyEvaluationKey({
      decision: "force_update",
      source: "server",
      blocked: true,
    })
    expect(blocked).not.toBe(opened)
  })

  it("같은 결정이어도 막았는지 여부가 다르면 다른 사건이다", () => {
    // `__DEV__` 빌드는 force_update 를 받고도 막지 않는다 — 개발 기기가 차단
    // 코호트에 섞이지 않으려면 `blocked` 가 열쇠에 들어 있어야 한다.
    expect(
      policyEvaluationKey({
        decision: "force_update",
        source: "server",
        blocked: false,
      }),
    ).not.toBe(
      policyEvaluationKey({
        decision: "force_update",
        source: "server",
        blocked: true,
      }),
    )
  })
})

/* ────────────────────── 전송기 (설계 §8) ────────────────────── */

describe("배치 응답의 접수 결과를 읽는다", () => {
  it("봉투의 result 안에서 꺼낸다", () => {
    expect(
      readBatchCounts({
        isSuccess: true,
        code: "SUCCESS",
        message: "성공",
        result: { accepted: 48, rejected: 2 },
        timestamp: "2026-08-18T00:00:00.000Z",
      }),
    ).toEqual({ accepted: 48, rejected: 2 })
  })

  it("껍데기 없이 온 모양도 읽는다", () => {
    expect(readBatchCounts({ accepted: 3, rejected: 0 })).toEqual({
      accepted: 3,
      rejected: 0,
    })
  })

  it("모르는 모양은 0 이 아니라 null 이다", () => {
    // 0 을 지어내면 "전부 버려졌다" 라는 **거짓 경보**가 된다.
    expect(readBatchCounts(null)).toBeNull()
    expect(readBatchCounts("SUCCESS")).toBeNull()
    expect(readBatchCounts({ result: { accepted: "48" } })).toBeNull()
    expect(readBatchCounts({ result: null })).toBeNull()
  })
})
