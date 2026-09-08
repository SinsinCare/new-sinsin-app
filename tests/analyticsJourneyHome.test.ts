/**
 * J2(홈 · 식사기록 · 건강기록 · 통계) 여정 계측의 계약을 고정한다.
 *
 * J1 과 같은 넷을 지킨다.
 *
 *  1. **속성 키가 살아서 도착하는가.** 새니타이저가 두 벌(클라 `events.ts`, 서버
 *     `record.ts`)이고 목록이 다르며, 걸린 키는 예외도 로그도 없이 사라진다.
 *  2. **한 사건이 한 이름으로 한 번 나가는가.**
 *  3. **고빈도 자리에 1회 가드가 실제로 걸려 있는가.** 이 여정에는 폴링(분석 진행)과
 *     키 입력(건강 시트)이 있다 — 가드가 없으면 이벤트 하나가 세션 전체를 지배하고,
 *     그러면 '사람 수' 여야 할 숫자가 '키를 누른 횟수' 가 된다.
 *  4. **초안에서 뺀 이름이 되살아나지 않는가.** 공용 통로(L2)가 이미 덮는 것을 여정
 *     이름으로 다시 지으면 같은 사건이 여정 수만큼 흩어진다.
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
 * 서버는 다른 저장소라 import 할 수 없고, 클라 정규식만 통과했다고 안심하면
 * `search`·`password`·`secret` 처럼 서버에만 있는 단어에 걸려 조용히 사라진다.
 */
const SERVER_FORBIDDEN_PROP_KEY =
  /(email|phone|password|token|secret|address|birth|name|query|search|text|title|content|message|url)/i

/**
 * J2 에서 새로 나가거나 속성이 바뀐 이벤트의 **실제 페이로드**.
 *
 * 키만 나열하지 않고 한 벌씩 만드는 이유는 값 종류(문자열·수·불리언)까지 통과해야
 * 이벤트가 온전히 도착하기 때문이다. `satisfies` 로 묶어 두면 타입이 바뀌었는데 표본이
 * 안 바뀌는 일이 컴파일에서 걸린다.
 */
const J2_SAMPLES = {
  home_date_selected: { is_today: false, days_back: "8_30" },
  food_record_sheet_viewed: {
    slot: "dinner",
    entry: "timeline_cta",
    recorded: false,
  },
  food_photo_permission_granted: { source: "camera" },
  food_photo_picker_cancelled: { source: "gallery", replacing: true },
  food_analysis_progressed: { method: "photo", status: "RESOLVING" },
  food_analysis_failed: {
    method: "photo",
    fail_kind: "FOOD_CAMERA_005",
    wait_bucket: "slow",
  },
  food_analysis_dismissed: {
    method: "text",
    status: "NONE",
    wait_bucket: "very_slow",
  },
  food_analysis_confirm_viewed: { question_count: 3 },
  food_analysis_confirm_submitted: { question_count: 3 },
  food_analysis_confirm_deferred: { question_count: 3, picked_count: 1 },
  food_record_save_failed: { source: "fresh", fail_kind: "not_ready" },
  food_record_leave_prompted: { source: "recovered", edited: true },
  food_record_result_abandoned: { source: "fresh", edited: false },
  food_record_consult_started: { source: "saved" },
  food_record_consult_failed: { fail_kind: "offline" },
  food_record_deleted: { source: "saved" },
  food_record_delete_failed: { fail_kind: "http_5xx" },
  food_record_edit_started: { source: "recovered" },
  food_record_edit_cancelled: { source: "saved", changed: true },
  food_text_record_viewed: { slot: "snack" },
  food_text_record_discarded: { filled: true },
  health_entry_input_started: { metric: "blood_glucose", input_kind: "keypad" },
  health_entry_context_adjusted: {
    metric: "blood_glucose",
    timing: "AFTER_MEAL",
    auto: false,
  },
  health_entry_save_started: { metric: "water", item_count: 3 },
  health_entry_save_succeeded: { metric: "weight", existing: true },
  health_entry_save_failed: { metric: "edema", fail_kind: "timeout" },
  stats_report_requested: { period: "week", entry: "shift" },
  stats_report_viewed: { period: "month", reliability: "LOW" },
  stats_report_failed: { period: "day", fail_kind: "STATS_ERROR_404" },
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

describe("J2 — 새 속성 키가 두 새니타이저를 모두 통과한다", () => {
  const entries = Object.entries(J2_SAMPLES) as [
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
      전부 J2 초안·리뷰에서 실제로 후보였던 이름이다. 골랐다면 조용히 사라졌을 것이고,
      사라진 것은 대시보드에서 "그 축이 없다" 가 아니라 "그런 일이 없었다" 로 보인다.
    */
    const tempting = {
      meal_slot: "dinner", // → `slot` (meal 이 걸린다)
      food_count: 3, // → `item_count`
      image_uri: "file://…", // → 아예 싣지 않는다
      error_code: "FOOD_CAMERA_005", // → `fail_kind`
      record_date: "2026-08-19", // → `days_back`/`is_today`
      glucose_value: 118, // → 싣지 않는다(건강정보이고 `value` 가 걸린다)
      meal_title: "김치찌개", // → 싣지 않는다
      question_text: "국물을 드셨나요", // → `question_count`
    }
    // 클라 정규식이 통째로 떨군다 — 하나도 안 남는다.
    expect(sanitizeAnalyticsProperties(tempting)).toEqual({})
  })

  it("실제로 고른 키들은 두 정규식 어디에도 안 걸린다", () => {
    const chosen = [
      "slot",
      "entry",
      "recorded",
      "method",
      "source",
      "replacing",
      "status",
      "wait_bucket",
      "fail_kind",
      "question_count",
      "picked_count",
      "edited",
      "changed",
      "filled",
      "metric",
      "input_kind",
      "timing",
      "auto",
      "existing",
      "item_count",
      "days_back",
      "is_today",
      "period",
      "reliability",
    ]
    for (const key of chosen) {
      expect(sanitizeAnalyticsProperties({ [key]: "x" })).toEqual({
        [key]: "x",
      })
      expect(SERVER_FORBIDDEN_PROP_KEY.test(key)).toBe(false)
    }
  })

  it("picked_count 는 실제로 통과한다 (설계 J2-0 정정 1의 확인)", () => {
    /*
      설계 J2-0 은 이 키가 `/answer/i` 에 걸려 떨어진다고 적었다. 실제로는 안 걸린다 —
      `picked_count` 안에 `answer` 가 없다. 정정이 지목한 위험(제안 키를 정규식에
      대조하지 않는 것) 자체는 옳으므로, 결론 대신 **대조**를 여기 남긴다.
    */
    expect(sanitizeAnalyticsProperties({ picked_count: 2 })).toEqual({
      picked_count: 2,
    })
    // 초안이 정말로 골랐다면 사라졌을 이름은 이쪽이다.
    expect(sanitizeAnalyticsProperties({ answered_count: 2 })).toEqual({})
  })
})

/**
 * 이벤트 → 그 이름이 나가도 되는 파일 **전부**.
 *
 * 목록이 늘면 새 표면이 생겼다는 뜻이고, 그때 `source`·`metric` 같은 축을 함께
 * 늘렸는지 여기서 다시 보게 된다.
 */
const J2_EMITTERS: Record<string, string[]> = {
  home_date_selected: ["app/(tabs)/home.tsx"],
  food_record_sheet_viewed: [
    "src/features/home/components/record/RecordView.tsx",
  ],
  // 2026-09-04 부터 사진은 앱 안의 푸드 카메라 페이지가 찍는다 — 권한·취소도 거기서 난다.
  food_photo_permission_granted: [
    "src/features/home/views/FoodCameraScreen.tsx",
  ],
  food_photo_picker_cancelled: ["src/features/home/views/FoodCameraScreen.tsx"],
  food_analysis_progressed: ["src/features/home/hooks/useFoodAnalysis.ts"],
  food_analysis_dismissed: ["src/features/home/hooks/useFoodAnalysis.ts"],
  food_analysis_confirm_viewed: [
    "src/features/home/components/FoodAnalysisConfirmation.tsx",
  ],
  food_analysis_confirm_submitted: [
    "src/features/home/components/FoodAnalysisConfirmation.tsx",
  ],
  food_analysis_confirm_deferred: [
    "src/features/home/components/FoodAnalysisConfirmation.tsx",
  ],
  food_record_leave_prompted: [
    "src/features/home/components/FoodAnalysisResult.tsx",
  ],
  food_record_result_abandoned: [
    "src/features/home/components/FoodAnalysisResult.tsx",
  ],
  food_record_consult_started: [
    "src/features/home/components/FoodAnalysisResult.tsx",
  ],
  food_record_consult_failed: [
    "src/features/food-analysis/hooks/useMealPersistenceActions.ts",
  ],
  food_record_deleted: ["src/features/home/components/FoodAnalysisResult.tsx"],
  food_record_delete_failed: [
    "src/features/food-analysis/hooks/useMealPersistenceActions.ts",
  ],
  food_record_edit_started: ["src/features/home/components/FoodResultEdit.tsx"],
  food_record_edit_cancelled: [
    "src/features/home/components/FoodResultEdit.tsx",
  ],
  food_text_record_viewed: ["src/features/home/hooks/useTextRecord.ts"],
  food_text_record_discarded: ["src/features/home/hooks/useTextRecord.ts"],
  health_entry_input_started: [
    "src/features/home/hooks/useHealthEntryInput.ts",
  ],
  health_entry_context_adjusted: [
    "src/features/home/hooks/useGlucoseRecordForm.ts",
  ],
  health_entry_save_started: [
    "src/features/home/components/record/RecordView.tsx",
    // 물은 잔을 담아 한 번에 보내므로 담은 잔 수를 화면 자신만 안다(2026-09-05 페이지화).
    "src/features/home/components/record/pages/WaterRecordPage.tsx",
  ],
  health_entry_save_succeeded: [
    "src/features/home/hooks/useBloodMetricsRecord.ts",
    "src/features/home/hooks/useExtraWater.ts",
    "src/features/home/hooks/useWeightEdemaRecord.ts",
  ],
  health_entry_save_failed: [
    "src/features/home/hooks/useBloodMetricsRecord.ts",
    "src/features/home/hooks/useExtraWater.ts",
    "src/features/home/hooks/useWeightEdemaRecord.ts",
  ],
  stats_report_requested: [
    "src/features/stats-report/components/StatsReportScreen.tsx",
  ],
  stats_report_viewed: [
    "src/features/stats-report/components/StatsReportScreen.tsx",
  ],
  stats_report_failed: [
    "src/features/stats-report/components/StatsReportScreen.tsx",
  ],
}

describe("J2 — 한 사건이 한 이름으로 한 번 나간다", () => {
  it.each(Object.entries(J2_EMITTERS))(
    "%s 은 정해진 파일에서만 나간다",
    (event, owners) => {
      expect(emittersOf(event)).toEqual([...owners].sort())
    },
  )

  it("성공·완료 축은 파일당 정확히 한 자리에서만 나간다", () => {
    /*
      성공을 두 곳에서 쏘면 완주율이 100% 를 넘고, 그 순간 퍼널 전체가 못 읽는
      그래프가 된다. 실패 계열은 갈래마다 자리가 달라 여러 자리가 정상이므로 여기 없다.
    */
    expect(
      emitCountIn(
        "src/features/home/components/FoodAnalysisResult.tsx",
        "food_record_deleted",
      ),
    ).toBe(1)
    expect(
      emitCountIn(
        "src/features/home/components/FoodAnalysisResult.tsx",
        "food_record_result_abandoned",
      ),
    ).toBe(1)
    expect(
      emitCountIn(
        "src/features/stats-report/components/StatsReportScreen.tsx",
        "stats_report_viewed",
      ),
    ).toBe(1)
    expect(
      emitCountIn(
        "src/features/home/components/record/RecordView.tsx",
        "food_record_sheet_viewed",
      ),
    ).toBe(1)
  })

  it("건강 다섯 지표는 시트 다섯이 각각 부르되 이름은 하나다", () => {
    /*
      `metric` 이 없던 시절에는 다섯 시트가 한 숫자였다. 이제 축이 생겼으므로,
      각 훅이 자기 지표를 **고정 문자열로** 싣는지 본다 — 변수로 넘기면 새 시트가
      늘 때 조용히 남의 지표로 세어진다.
    */
    const blood = read("src/features/home/hooks/useBloodMetricsRecord.ts")
    expect(blood).toContain('metric: "blood_pressure"')
    expect(blood).toContain('metric: "blood_glucose"')
    const body = read("src/features/home/hooks/useWeightEdemaRecord.ts")
    expect(body).toContain('metric: "weight"')
    expect(body).toContain('metric: "edema"')
    expect(read("src/features/home/hooks/useExtraWater.ts")).toContain(
      'metric: "water"',
    )
  })
})

describe("J2 — 고빈도 자리에 1회 가드가 걸려 있다", () => {
  it("분석 진행은 폴링마다가 아니라 analysisId+상태당 1회다", () => {
    /*
      폴링은 0.5~1.5초마다 돈다. 가드가 없으면 분석 한 건이 수십 행이 되고, 그 수는
      대시보드에서 "분석이 엄청 오래 걸린다" 로 읽힌다.

      "직전 상태와 다른가" 로는 모자라다 — 확인 질문에 답하고 다시 폴링에 들어가면
      같은 분석이 PERCEIVING 을 두 번 지난다. 그래서 키가 `analysisId:status` 다.
    */
    const source = read("src/features/home/hooks/useFoodAnalysis.ts")
    expect(source).toMatch(
      /const key = `\$\{job\.analysisId\}:\$\{job\.status\}`\s*if \(!progressedRef\.current\.has\(key\)\) \{\s*progressedRef\.current\.add\(key\)\s*trackAnalyticsEvent\(\s*"food_analysis_progressed"/su,
    )
    // 새 분석마다 가드가 풀린다 — 안 풀면 두 번째 분석이 통째로 안 세어진다.
    expect(source).toContain("progressedRef.current = new Set()")
    expect(
      emitCountIn(
        "src/features/home/hooks/useFoodAnalysis.ts",
        "food_analysis_progressed",
      ),
    ).toBe(1)
  })

  it("QUEUED 는 쏘지 않는다 (started 와 같은 틱이다)", () => {
    const source = read("src/features/home/hooks/useFoodAnalysis.ts")
    expect(source).toMatch(
      /if \(job\.status === "PERCEIVING" \|\| job\.status === "RESOLVING"\) \{/u,
    )
    expect(source).not.toMatch(/status: "QUEUED"/u)
  })

  it("건강 입력 시작은 훅 한 곳에서만 나가고 시트 열림당 1회다", () => {
    /*
      키패드는 한 자릿수마다, 스테퍼는 누를 때마다, 잔 버튼은 잔마다 콜백이 온다.
      가드가 시트마다 흩어지면 하나만 빠져도 그 지표가 통계를 지배한다 — 그래서
      가드와 발화를 훅 하나에 모으고, 시트는 `markInput()` 만 부른다.
    */
    const hook = read("src/features/home/hooks/useHealthEntryInput.ts")
    expect(hook).toMatch(
      /if \(firedRef\.current\) return\s*firedRef\.current = true\s*(\/\/[^\n]*\n\s*)*trackAnalyticsEvent\(\s*"health_entry_input_started"/su,
    )
    // 닫히면 풀린다 — 같은 사람이 물을 두 번 기록하면 두 번 세는 것이 맞다.
    expect(hook).toMatch(/if \(!visible\) firedRef\.current = false/u)
  })

  it("건강기록 표면 다섯이 전부 그 훅을 쓴다", () => {
    /*
      물·혈압·체중은 2026-09-05 부터 **페이지**다. 페이지는 열려 있을 때만 마운트되므로
      두 번째 인자가 `visible` 이 아니라 `true` 다 — 시트는 닫혀도 살아 있어 그 깃발이 필요했다.
    */
    for (const [file, metric] of [
      ["useGlucoseRecordForm.ts", "blood_glucose"],
      ["useEdemaRecordForm.ts", "edema"],
    ]) {
      expect(read(`src/features/home/hooks/${file}`)).toContain(
        `useHealthEntryInput("${metric}", true)`,
      )
    }
    const pages = [
      ["WaterRecordPage.tsx", "water"],
      ["BloodPressureRecordPage.tsx", "blood_pressure"],
      ["WeightRecordPage.tsx", "weight"],
    ] as const
    for (const [file, metric] of pages) {
      const source = read(`src/features/home/components/record/pages/${file}`)
      expect(source).toContain(`useHealthEntryInput("${metric}", true)`)
    }
  })

  it("글 기록 진입은 닫힘→열림 전이에서만 나간다", () => {
    /*
      이 모달은 홈이 살아 있는 내내 마운트돼 있다. 마운트나 렌더 본문에서 쏘면
      '입력창까지 온 사람' 이 그냥 '홈 방문 수' 가 된다.
    */
    const source = read("src/features/home/hooks/useTextRecord.ts")
    expect(source).toMatch(
      /if \(openedRef\.current\) return\s*openedRef\.current = true\s*trackAnalyticsEvent\(\s*"food_text_record_viewed"/su,
    )
  })

  it("확인 질문 진입은 분석 하나당 1회다", () => {
    // 답을 고를 때마다 리렌더되는 화면이다 — 가드가 없으면 선택지 수만큼 행이 된다.
    const source = read(
      "src/features/home/components/FoodAnalysisConfirmation.tsx",
    )
    expect(source).toMatch(
      /if \(viewedAnalysisRef\.current === job\.analysisId\) return\s*viewedAnalysisRef\.current = job\.analysisId\s*trackAnalyticsEvent\(\s*"food_analysis_confirm_viewed"/su,
    )
  })

  it("통계 요구는 캐시를 타는 queryFn 이 아니라 화면 전이 이펙트에서 나간다", () => {
    /*
      설계 J2-0. staleTime 이 5분이라 ‹ › 로 오간 기간은 대부분 캐시 히트이고,
      그러면 queryFn 이 아예 안 돌아 분모가 조용히 반토막 난다 —
      그 상태의 완주율은 100% 를 넘는다.
    */
    const hook = read("src/features/stats-report/hooks/useStatsReport.ts")
    expect(hook).not.toContain("trackAnalyticsEvent")

    const screen = read(
      "src/features/stats-report/components/StatsReportScreen.tsx",
    )
    expect(screen).toMatch(
      /useEffect\(\(\) => \{\s*const previous = requestedRef\.current[\s\S]*?trackAnalyticsEvent\(\s*"stats_report_requested"/u,
    )
    // 같은 기간을 다시 그려도 요구는 한 번이다.
    expect(screen).toContain(
      "if (previous?.period === period && previous.dateKey === dateKey) return",
    )
  })
})

describe("J2 — 발화가 실제 핸들러에 걸려 있다", () => {
  const recordView = read("src/features/home/components/record/RecordView.tsx")

  it("시트 진입은 CTA 한 문에서만 나가고, 취소 뒤 재개에서는 안 나간다", () => {
    /*
      앨범·카메라·글에서 취소하면 코드가 시트를 다시 열어 준다. 거기서도 쏘면 한 사람의
      한 번의 시도가 진입 두 행이 되어 1→2 가 이탈처럼 부풀고 2→3 이 함께 꺼진다.

      홈 시안(2026-09-04)에서 식사 타일과 끼니 타임라인이 빠져 문은 CTA 하나다.
      값은 `timeline_cta` 를 그대로 둔다 — 대시보드가 그 이름으로 세고 있다.
    */
    expect(recordView).toContain('openMealSheetFrom("timeline_cta")')
    expect(recordView).not.toContain('openMealSheetFrom("tile")')
    expect(recordView).not.toContain('openMealSheetFrom("timeline_empty"')
    // 재개 경로는 계측 없는 openMealSheet 를 쓴다.
    expect(recordView).toMatch(
      /const openMealSheet = \(mealType: MealType \| null = null\) => \{\s*setMealSheetPreselect\(mealType\)\s*setOpenSheet\("meal"\)\s*\}/u,
    )
  })

  it("권한 거부와 피커 취소는 배타적이다", () => {
    /*
      권한이 막히면 피커가 빈손으로 돌아온다 — 갈라 두지 않으면 거부한 사람이
      denied 와 cancelled 두 이름에 동시에 세어져 두 비율이 같이 부풀어 오른다.
    */
    // 카메라 페이지의 X — 권한이 있을 때만 취소로 센다(앨범은 2026-09-04 시안에서 빠졌다).
    const camera = read("src/features/home/views/FoodCameraScreen.tsx")
    expect(camera).toMatch(
      /if \(permission\?\.granted\) \{\s*trackAnalyticsEvent\("food_photo_picker_cancelled", \{\s*source: "camera"/su,
    )
    expect(camera).not.toMatch(/source: "gallery"/u)
  })

  it("결과 화면 셋은 각각 자기 source 를 못 박는다", () => {
    // 리포트는 페이지다(2026-09-04) — 세 여정이 `openMealReportPage({ source })` 로 연다.
    const sources = [
      ...recordView.matchAll(/openMealReportPage\(\{\s*source: "(\w+)"/gu),
    ].map((match) => match[1])
    // fresh 는 두 자리다 — 사진·글 분석과 레시피 불러오기(2026-09-04). 둘 다 "방금 만든 결과" 라
    // 같은 여정이고, 계측 축(`source`)도 같다. 축이 셋을 넘지 않는 것을 본다.
    expect([...new Set(sources)].sort()).toEqual([
      "fresh",
      "recovered",
      "saved",
    ])
  })

  it("저장 없이 나가기는 확인창을 띄운 수와 그래도 나간 수를 둘 다 센다", () => {
    /*
      하나만 세면 문구를 고쳐도 좋아졌는지 알 수 없다. 그리고 `_abandoned` 는
      **confirmed 안**에 있어야 한다 — 밖에 두면 되돌아온 사람도 이탈로 세어진다.
    */
    const source = read("src/features/home/components/FoodAnalysisResult.tsx")
    const prompted = source.indexOf(
      'trackAnalyticsEvent("food_record_leave_prompted"',
    )
    const confirmCall = source.indexOf("const confirmed = await showConfirm({")
    expect(prompted).toBeGreaterThan(-1)
    expect(confirmCall).toBeGreaterThan(prompted)
    expect(source).toMatch(
      /if \(confirmed\) \{\s*(\/\/[^\n]*\n\s*)*trackAnalyticsEvent\(\s*"food_record_result_abandoned"/su,
    )
  })

  it("삭제는 **지워진 뒤**에만 센다", () => {
    // 확인 시트를 연 것은 의도이지 삭제가 아니다.
    const source = read("src/features/home/components/FoodAnalysisResult.tsx")
    expect(source).toMatch(
      /const deleted = await deleteSavedMeal\(diaryId\)\s*if \(!deleted\) return\s*(\/\*[\s\S]*?\*\/\s*)?trackAnalyticsEvent\(\s*"food_record_deleted"/su,
    )
  })

  it("상담 시작은 결과 화면이, 실패는 컨트롤러가 센다", () => {
    /*
      `startConsultation` 은 boolean 만 돌려주므로 오류가 호출부까지 안 온다.
      실패를 결과 화면에서 세려면 갈래 판정을 다시 지어야 하는데, 그건 정본이 하나여야
      한다는 규칙을 깬다. 그래서 `_failed` 는 오류를 들고 있는 쪽에 둔다.
    */
    expect(read("src/features/home/components/FoodAnalysisResult.tsx")).toMatch(
      /trackAnalyticsEvent\("food_record_consult_started", \{ source \}\)\s*const started = await startConsultation/u,
    )
    expect(
      read("src/features/food-analysis/hooks/useMealPersistenceActions.ts"),
    ).toContain("fail_kind: toAnalyticsFailKind(error)")
  })

  it("요청조차 못 간 저장 실패는 not_ready 로 갈린다", () => {
    /*
      `foodAnalysisResultId <= 0` 은 토스트를 직접 띄우므로 `presentError` 를 안
      지나가고, 따라서 `app_error_presented` 에도 한 행이 없다. 서버 실패와 한 이름으로
      두면 고칠 곳(서버냐 앱이냐)이 안 정해진다.
    */
    for (const file of [
      "src/features/home/hooks/useFoodAnalysis.ts",
      "src/features/home/components/record/RecordView.tsx",
    ]) {
      expect(read(file)).toContain('fail_kind: "not_ready"')
    }
  })

  it("수정 취소는 이름만 고친 경우를 성공으로 남긴다", () => {
    /*
      이름 변경은 그 자리에서 서버에 반영된다 — 되돌릴 것이 없으므로 취소가 아니다.
      두 이름이 같은 탭에서 나가면 수정 완주율이 1을 넘는다.
    */
    const source = read("src/features/home/components/FoodResultEdit.tsx")
    expect(source).toMatch(
      /if \(titleChanged\) \{[\s\S]*?trackAnalyticsEvent\("food_record_edit_succeeded"[\s\S]*?onClose\(\)\s*return\s*\}/u,
    )
    // 취소의 `changed` 는 제출과 **같은 판정**을 쓴다.
    expect(source).toContain("const changes = describeChanges()")
    expect(source).toContain("} = describeChanges()")
  })

  it("건강 저장의 existing 은 화면이 판정해 넘긴다", () => {
    /*
      훅이 그날의 상태를 다시 조회하면 시트가 열려 있는 동안의 refetch 와 어긋나
      같은 저장이 어떤 때는 새 기록, 어떤 때는 수정으로 세어진다. 혈당만은 그 **칸**
      (끼니×시점)을 봐야 한다 — 하루에 여러 번 재는 지표라 "그날 기록이 있다" 로 보면
      두 번째 측정이 전부 수정이 된다.
    */
    expect(recordView).toContain("bloodPressure !== null,")
    expect(recordView).toContain("todayWeightKg !== null")
    expect(recordView).toContain("todayEdema !== null")
    expect(recordView).toMatch(
      /findGlucoseCell\(bloodGlucose, \{\s*slot: body\.slot \?\? "",\s*timing: body\.timing,\s*\}\) !== null/su,
    )
  })
})

describe("J2 — 공용 통로가 덮는 이름은 되살아나지 않는다", () => {
  /**
   * 설계 초안(J2-2)에 있었지만 만들지 않기로 한 이름들. 무엇이 대신 덮는지는 이 PR 의
   * `dropped` 목록에 있다.
   *
   * 이 검사가 있는 이유: 다음 사람이 "이 자리에 이벤트가 없네" 하고 다시 짓는 것이
   * 가장 흔한 회귀다. 그러면 같은 사건이 여정 수만큼 다른 이름으로 흩어진다.
   */
  const RETIRED = [
    // 시트 열림/닫힘 → sheet_opened / sheet_dismissed (surface 다섯이 metric 과 1:1)
    "health_entry_sheet_viewed",
    "health_entry_sheet_dismissed",
    // 삭제 확인 시트가 열린 순간 → sheet_opened{surface:'home_meal_delete'}
    "food_record_delete_prompted",
    // presentError 를 지나가는 실패 → app_error_presented
    "food_record_open_failed",
    "food_record_skip_failed",
    // 화면 진입만 세는 이름 → screen_viewed(화면 축 70개)
    "home_statistics_opened",
    "food_record_camera_opened",
    // 대기 → wait_perceived
    "stats_report_wait",
    "food_analysis_wait",
  ]

  it.each(RETIRED)("%s 은 어디서도 나가지 않는다", (event) => {
    expect(emittersOf(event)).toEqual([])
  })

  it("건강 시트 다섯은 공용 시트 통로에 자기 자리를 갖고 있다", () => {
    /*
      `health_entry_sheet_viewed` 를 안 만든 근거다 — 다섯 시트가 이미 서로 다른
      surface 로 `sheet_opened`/`sheet_dismissed` 를 낸다. 여기가 무너지면 그 이름을
      다시 지어야 하므로, 근거를 단정으로 고정한다.
    */
    const expected: Record<string, string> = {
      // 물의 담기 시트는 페이지 안에 산다. 혈압·체중은 페이지 자체라 `screen_viewed` 로 잡힌다.
      "pages/WaterRecordPage.tsx": "home_water_record",
    }
    for (const [file, surface] of Object.entries(expected)) {
      expect(read(`src/features/home/components/record/${file}`)).toContain(
        `surface="${surface}"`,
      )
    }
    // 식사 시트와 삭제 확인 시트도 마찬가지다.
    expect(
      read("src/features/home/components/record/sheets/MealSheet.tsx"),
    ).toContain('surface="home_meal_record"')
    expect(
      read("src/features/home/components/MealDeleteConfirmSheet.tsx"),
    ).toContain('surface="home_meal_delete"')
  })

  it("건강기록 값은 어떤 이벤트에도 안 실린다", () => {
    /*
      혈당·혈압·체중 수치와 자유 입력 글은 건강정보다. 시트 파일들이 쏘는 속성에
      값이 섞이지 않았는지 형태로 확인한다 — 새니타이저가 `value` 는 떨구지만
      `reading`·`level` 같은 이름은 통과시킨다.
    */
    const suspicious =
      /trackAnalyticsEvent\([^)]*?(systolic|diastolic|weightKg|edemaLevel|liveValue|liveWeight|liveTotal|\btext\b)/su
    for (const file of [
      "src/features/home/components/record/pages/WaterRecordPage.tsx",
      "src/features/home/components/record/pages/BloodPressureRecordPage.tsx",
      "src/features/home/components/record/pages/WeightRecordPage.tsx",
      "src/features/home/hooks/useGlucoseRecordForm.ts",
      "src/features/home/hooks/useTextRecord.ts",
    ]) {
      expect(read(file)).not.toMatch(suspicious)
    }
  })
})
