/**
 * 가로지르는 공용 계측 여덟(설계 §5)의 계약을 고정한다.
 *
 * 여기서 지키는 것은 세 가지다.
 *
 *  1. **속성 키가 살아서 도착하는가.** 새니타이저가 두 벌이고(클라 `events.ts`,
 *     서버 `record.ts`) 목록이 다르며, 걸린 키는 **예외도 로그도 없이 사라진다.**
 *     그래서 "타입에는 있는데 이벤트에는 없는" 조합이 배포 뒤에야 발견된다.
 *  2. **버킷 경계.** 원값(ms)을 못 싣는 대신 버킷이 유일한 시간 축이라, 경계가
 *     흔들리면 과거 데이터와 비교가 안 된다.
 *  3. **통로가 하나인가.** L2 의 존재 이유가 "같은 사건을 여정마다 다른 이름으로
 *     흩지 않는다" 이므로, 이름이 두 곳에서 나가기 시작하면 그 자체가 회귀다.
 */
import fs from "fs"
import path from "path"

import {
  sanitizeAnalyticsProperties,
  toDurationBucket,
  toErrorPresentedProperties,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "@/src/features/analytics/events"

/**
 * 서버 `sinsin-be-bun/src/domains/analytics/record.ts:16` 의 금지 키 정규식 **사본**.
 *
 * 사본인 이유: 서버는 다른 저장소라 import 할 수 없고, 클라 정규식만 통과했다고
 * 안심하면 `search`·`password`·`secret` 처럼 **서버에만 있는 단어**에 걸려 조용히
 * 사라진다(초안에서 `is_search` 가 실제로 여기 걸렸다). 서버 목록이 바뀌면 이 줄을
 * 같이 고친다 — 그때까지는 이 사본이 합집합을 지키는 유일한 장치다.
 */
const SERVER_FORBIDDEN_PROP_KEY =
  /(email|phone|password|token|secret|address|birth|name|query|search|text|title|content|message|url)/i

/**
 * 이번에 늘어난 이벤트의 **실제 페이로드**. 키만 나열하지 않고 한 벌씩 만드는 이유는,
 * 값 종류(문자열·수·불리언)까지 통과해야 이벤트가 온전히 도착하기 때문이다.
 *
 * `satisfies` 로 묶어 두면 타입이 바뀌었는데 표본이 안 바뀌는 일이 컴파일에서 걸린다.
 */
const CROSS_CUTTING_SAMPLES = {
  app_error_presented: {
    kind: "server",
    code: "COMMON_ERROR_005",
    surface: "toast",
    retryable: true,
    silent: false,
  },
  app_error_action_pressed: { action: "retry", kind: "server" },
  nav_back: { from_screen: "recipe_detail", used_fallback: true },
  compose_exit_prompted: { surface: "free_write", has_draft: true },
  compose_exit_confirmed: { surface: "recipe_edit", has_draft: true },
  empty_state_viewed: { surface: "recipe_archive" },
  error_state_viewed: { surface: "restaurant_detail", retryable: false },
  wait_perceived: { surface: "checkup_list", wait_bucket: "ok" },
  sheet_opened: { surface: "restaurant_filter" },
  sheet_dismissed: { surface: "restaurant_filter", dwell_bucket: "instant" },
  // `first_fail` 의 **값**이 "password" 다. 두 새니타이저 모두 키만 보므로 통과하고,
  // 이건 사용자가 적은 것이 아니라 화면에 놓인 칸의 이름이다.
  form_validation_failed: {
    form: "email_login",
    first_fail: "password",
    fail_count: 2,
  },
} satisfies Partial<{
  [K in AnalyticsEventName]: AnalyticsEventProperties[K]
}>

/** 이벤트 → 그 이름이 나가도 되는 **유일한** 파일. */
const SINGLE_FUNNEL: Record<string, string> = {
  app_error_presented: "src/lib/errorMessage/present.ts",
  app_error_action_pressed: "src/lib/errorMessage/actions.ts",
  nav_back: "src/shared/navigation/useGoBack.ts",
  compose_exit_prompted: "src/shared/components/ConfirmExitModal.tsx",
  compose_exit_confirmed: "src/shared/components/ConfirmExitModal.tsx",
  empty_state_viewed: "src/design-system-v2/components/V2EmptyState.tsx",
  error_state_viewed: "src/design-system-v2/components/V2ErrorState.tsx",
  wait_perceived: "src/design-system-v2/hooks/useLoadingVisible.ts",
  sheet_opened: "src/design-system-v2/components/V2BottomSheet.tsx",
  sheet_dismissed: "src/design-system-v2/components/V2BottomSheet.tsx",
  form_validation_failed: "src/shared/utils/formValidationState.ts",
}

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

describe("공용 계측 — 속성 키가 두 새니타이저를 모두 통과한다", () => {
  const entries = Object.entries(CROSS_CUTTING_SAMPLES) as [
    string,
    Record<string, unknown>,
  ][]

  it.each(entries)("%s 의 속성이 하나도 안 떨어진다", (_event, properties) => {
    // 클라: 통과한 것만 돌려준다. 입력과 같아야 아무것도 안 떨어진 것이다.
    expect(sanitizeAnalyticsProperties(properties)).toEqual(properties)
    // 서버: 같은 키를 한 번 더 검사한다(무인증 쓰기 경로라 클라를 믿지 않는다).
    const blockedByServer = Object.keys(properties).filter((key) =>
      SERVER_FORBIDDEN_PROP_KEY.test(key),
    )
    expect(blockedByServer).toEqual([])
  })

  it("근접한 위험 이름들은 실제로 막힌다 (검사가 헛돌지 않는다는 증거)", () => {
    // 안전한 이름과 한 칸 차이인 후보들. 골랐다면 전부 조용히 사라졌을 것이다.
    const tempting = {
      error_kind: "server", // → `kind`
      error_code: "COMMON_ERROR_005", // → `code`
      draft_title: "무제", // → 아예 싣지 않는다
      is_search: true, // → `entry: "search" | "feed"`
      wait_ms: 1200, // → `wait_bucket`
    }

    // 클라 정규식은 `is_search` 와 `wait_ms` 를 통과시킨다 —
    expect(sanitizeAnalyticsProperties(tempting)).toEqual({
      is_search: true,
      wait_ms: 1200,
    })
    // — 그래서 클라만 보면 안 된다. `is_search` 는 서버에서 떨어진다(합집합의 이유).
    expect(SERVER_FORBIDDEN_PROP_KEY.test("is_search")).toBe(true)
    // `wait_ms` 는 두 정규식을 다 통과하지만 원값이라 P4 가 금지한다 — 타입에 없다.
    expect(SERVER_FORBIDDEN_PROP_KEY.test("wait_ms")).toBe(false)
  })
})

describe("소요시간 버킷", () => {
  it("경계는 300ms · 1s · 3s · 10s 다", () => {
    expect(toDurationBucket(0)).toBe("instant")
    expect(toDurationBucket(299)).toBe("instant")
    expect(toDurationBucket(300)).toBe("fast")
    expect(toDurationBucket(999)).toBe("fast")
    expect(toDurationBucket(1_000)).toBe("ok")
    expect(toDurationBucket(2_999)).toBe("ok")
    expect(toDurationBucket(3_000)).toBe("slow")
    expect(toDurationBucket(9_999)).toBe("slow")
    expect(toDurationBucket(10_000)).toBe("very_slow")
  })

  it("시계가 뒤로 간 경우에도 값이 나온다", () => {
    // 기기 시계 보정으로 음수가 될 수 있다. 이벤트가 사라지는 것보다는 낫다.
    expect(toDurationBucket(-50)).toBe("instant")
  })
})

describe("app_error_presented 는 present.ts 의 판정을 그대로 옮긴다", () => {
  it("kind·surface·retryable·silent 를 다시 짓지 않는다", () => {
    expect(
      toErrorPresentedProperties({
        kind: "notFound",
        code: "HC_ERROR_004",
        surface: "dialog",
        retryable: false,
        silent: false,
      }),
    ).toEqual({
      kind: "notFound",
      code: "HC_ERROR_004",
      surface: "dialog",
      retryable: false,
      silent: false,
    })
  })

  it("코드가 없으면 키를 비우지 않고 'none' 을 싣는다", () => {
    // null 을 그대로 실으면 새니타이저가 **키째로** 떨궈, 브레이크다운에서
    // "코드 없는 실패" 라는 행 자체가 사라진다.
    const properties = toErrorPresentedProperties({
      kind: "offline",
      code: null,
      surface: "toast",
      retryable: true,
      silent: false,
    })
    expect(properties.code).toBe("none")
    expect(sanitizeAnalyticsProperties(properties)).toEqual(properties)
  })

  it("조용한 실패도 이벤트가 된다", () => {
    expect(
      toErrorPresentedProperties({
        kind: "canceled",
        code: null,
        surface: "toast",
        retryable: false,
        silent: true,
      }).silent,
    ).toBe(true)
  })
})

/** 발화 지점. prettier 가 인자를 줄바꿈하므로 공백을 건너뛰고 찾는다. */
function emitPattern(event: string): RegExp {
  return new RegExp(String.raw`trackAnalyticsEvent\(\s*"${event}"`, "u")
}

describe("통로는 하나다", () => {
  it.each(Object.entries(SINGLE_FUNNEL))(
    "%s 은 %s 에서만 나간다",
    (event, owner) => {
      const pattern = emitPattern(event)
      const emitters = SOURCES.filter((file) =>
        pattern.test(fs.readFileSync(file, "utf8")),
      ).map((file) => path.relative(ROOT, file))
      expect(emitters).toEqual([owner])
    },
  )

  /*
    통로가 하나여도 **그 통로에 연결된 화면**이 전부는 아니다. `compose_exit_*` 는
    `ConfirmExitModal` 을 쓰는 화면만 세는데, 같은 "두고 나갈까요" 를 `showConfirm` 으로
    직접 띄우는 화면(식당 후기 작성)과 확인 자체가 없는 화면(스토리 작성)이 있다.
    그래서 이 수는 작성 이탈의 분모가 아니다 — 그 사실을 주석에만 적어 두면 다음 작성
    화면이 늘어날 때 조용히 어긋나므로, 지금 세는 셋을 여기 고정한다.

    `recipe_edit` 는 **어디서도 나가지 않는다**: 그 surface 를 주던 유일한 곳이 v1
    `RecipeEditor` 였는데, 어디서도 import 되지 않는 죽은 파일이라 지웠다(2026-09-09).
    `(write)/recipe/edit/[id]` 라우트는 v2 작성 폼을 재사용하고 `ConfirmExitModal` 을
    자기 surface 로 세우지 않는다. 화면명 표에는 그 라우트가 있으므로 surface 값
    자체는 남아 있되, **세는 수에는 없다** — 그 라우트가 언젠가 이 모달을 세우면
    아래 목록이 넷이 되고, 그때 이 주석을 "살아 있는 넷" 으로 고쳐 읽으면 된다.
  */
  it("compose_exit_* 가 세는 작성 화면은 셋이다", () => {
    const surfaces = SOURCES.flatMap((file) => {
      const source = fs.readFileSync(file, "utf8")
      return [...source.matchAll(/<ConfirmExitModal\s+surface="([a-z_]+)"/gu)]
    }).map((match) => match[1])

    expect(surfaces.sort()).toEqual(["free_edit", "free_write", "recipe_write"])
  })

  it("recipe_edit 를 주던 v1 에디터는 지워졌고 되살아나지 않았다", () => {
    /*
      v1 `RecipeEditor` 는 죽은 파일이었다(import 0). 파일이 되살아나면 위 목록이
      조용히 넷이 되고 대시보드에 없는 화면의 `compose_exit_*` 가 다시 세어진다 —
      그래서 파일 자체가 없는 것과 아무도 들여오지 않는 것을 둘 다 못 박는다.
    */
    expect(
      fs.existsSync(
        path.join(ROOT, "src/features/recipe/components/RecipeEditor.tsx"),
      ),
    ).toBe(false)
    const importers = SOURCES.filter((file) =>
      /from\s+["'][^"']*RecipeEditor["']/u.test(fs.readFileSync(file, "utf8")),
    )
    expect(importers).toEqual([])
  })

  it("presentError 는 조용한 실패로 빠져나가기 **전에** 이벤트를 쏜다", () => {
    // 순서가 뒤집히면 취소·무음 실패가 통째로 사라진다. 그 손실은 대시보드에서
    // "실패가 줄었다" 로 보이기 때문에 눈으로는 못 잡는다.
    const source = fs.readFileSync(
      path.join(ROOT, "src/lib/errorMessage/present.ts"),
      "utf8",
    )
    const emitted = source.search(emitPattern("app_error_presented"))
    const silentReturn = source.indexOf("if (resolved.silent) return resolved")
    expect(emitted).toBeGreaterThan(-1)
    expect(silentReturn).toBeGreaterThan(emitted)
  })
})
