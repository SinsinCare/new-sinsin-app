/**
 * 후기 신고의 **와이어 계약**. 이 파일이 막는 사고는 하나다:
 * *앱이 화면의 어휘를 그대로 보내서 신고가 400 으로 죽는 것.*
 *
 * 실제로 다섯 사유 중 넷이 그렇게 죽어 있었다(`SPAM` 만 우연히 겹쳤다). 화면에는
 * 아무 흔적도 남지 않는다 — 사용자는 "신고 버튼이 안 먹는 앱"을 쓰고 있었을 뿐이다.
 *
 * ## 정규식을 베껴 오지 않는다
 *
 * 허용 값은 **서버 파일에서 읽는다**(`sinsin-be-bun/src/domains/restaurant/schemas.ts`).
 * 복사본을 여기 적어 두면 서버가 어휘를 바꾼 날 이 테스트는 초록인 채로 남고, 그 초록이
 * 정확히 이번 결함이 숨어 있던 자리다. 서버 저장소가 옆에 없으면 **건너뛰지 않고
 * 실패한다** — 안 도는 계약 테스트는 없는 계약 테스트고, 그 사실은 조용하면 안 된다.
 */

import fs from "node:fs"
import path from "node:path"

import {
  TEST_LOCALES,
  commonValue,
  hasCommonKeyInBothLocales,
} from "./helpers/i18nResourceKeys"
import koCommon from "../src/i18n/locales/ko/common.json"
import {
  REVIEW_REPORT_DETAIL_MAX,
  REVIEW_REPORT_FREE_TEXT_CODE,
  REVIEW_REPORT_REASONS,
  REVIEW_REPORT_SERVER_REASONS,
  buildReviewReportPayload,
  type ReviewReportReasonCode,
} from "../src/features/restaurant/utils/reviewReportReasons"

/* ───────────────────────── 서버 정본 읽기 ───────────────────────── */

const SERVER_DOMAIN = path.resolve(
  __dirname,
  "../../sinsin-be-bun/src/domains/restaurant",
)

function readServerFile(name: string): string {
  const full = path.join(SERVER_DOMAIN, name)
  if (!fs.existsSync(full)) {
    throw new Error(
      `신고 계약의 정본을 찾지 못했다: ${full}\n` +
        "이 테스트는 서버 소스를 직접 읽어 대조한다. 앱 저장소 옆에 " +
        "sinsin-be-bun 을 두고 다시 돌릴 것(복사본을 만들지 말 것).",
    )
  }
  return fs.readFileSync(full, "utf8")
}

const SERVER_SCHEMA = path.join(SERVER_DOMAIN, "schemas.ts")
const serverSource = readServerFile("schemas.ts")

/** 신고 **응답**을 조립하는 곳. 스키마에는 없는 성공 필드가 여기서 정해진다. */
const serverEngagementSource = readServerFile("engagementService.ts")

function extract(pattern: RegExp, what: string): string {
  const found = serverSource.match(pattern)?.[1]
  if (!found) {
    throw new Error(
      `${what} 를 서버 스키마에서 못 뽑았다(${SERVER_SCHEMA}). ` +
        "서버가 선언 모양을 바꿨다면 여기 정규식도 같이 옮겨야 한다.",
    )
  }
  return found
}

/** 서버가 `reason` 에 거는 정규식 원문. */
const SERVER_REASON_PATTERN = extract(
  /REVIEW_REPORT_REASON_PATTERN\s*=\s*"([^"]+)"/,
  "REVIEW_REPORT_REASON_PATTERN",
)

const SERVER_DETAIL_MAX = Number(
  extract(
    /MAX_REVIEW_REPORT_DETAIL_LENGTH\s*=\s*(\d+)/,
    "MAX_REVIEW_REPORT_DETAIL_LENGTH",
  ),
)

/**
 * `POST /reviews/:id/report` **본문 스키마 선언 원문**.
 *
 * 위 두 상수를 파일 어디서든 뽑아 놓고 "이 엔드포인트에 걸려 있는 그것이 맞는가" 를
 * 여기에 대조한다. 스키마 안으로 범위를 좁혀야 다른 본문의 같은 이름 필드가 초록을
 * 내주는 일이 없다.
 */
const SERVER_REPORT_BODY = extract(
  /export const reportReviewBody = t\.Object\(\{([\s\S]*?)\n\}\);/,
  "reportReviewBody",
)

const acceptsReason = (value: string) =>
  new RegExp(SERVER_REASON_PATTERN).test(value)

/**
 * 소스 가드가 읽는 파일 목록. **신고가 서버로 나가는 경로 전부**여야 한다.
 *
 * 시트만 읽던 동안 `useRestaurantReviews.reportReview` 는 같은 엔드포인트로 매핑도
 * `[CODE]` 앞머리도 없이 넘기고 있었고, 그 사실에 빨개지는 테스트가 하나도 없었다.
 *
 * 그래서 이 표는 **손으로 적되 소스와 대조한다**(아래 `DISCOVERED_REPORT_SOURCES`).
 * 이번 결함의 모양 자체가 "두 경로 중 하나가 목록에 없어 아무도 안 빨개졌다" 인데
 * 처방이 목록에 한 줄 더 적는 것이면, 세 번째 경로가 생기는 날 같은 사각지대가
 * 그대로 재발한다. 줄을 더하는 일은 여전히 사람이 하지만, **안 더하면 빨개진다.**
 */
const REPORT_SOURCES = {
  sheet: "../src/features/restaurant/components/ReviewReportSheet.tsx",
  hook: "../src/features/restaurant/hooks/useRestaurantReviews.ts",
} as const

const sourceOf = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, relative), "utf8")

const SHEET_SOURCE = sourceOf(REPORT_SOURCES.sheet)

/* ───────────────────────── 소스 읽기 도구 ───────────────────────── */

/**
 * 주석을 걷어낸다. 소스 가드는 **도는 코드**만 봐야 한다 — 설명 속 예시
 * (`buildReviewReportPayload(args.reason, "")` 같은)를 호출로 세면 산문을 고쳤을 뿐인데
 * 빨개지고, 반대로 진짜 호출이 주석 뒤에 숨을 수도 있다.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

/** 괄호 균형을 세며 인자 하나하나를 원문 그대로 가른다. */
function splitTopLevelArgs(text: string): string[] {
  const args: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === "(" || ch === "[" || ch === "{") depth += 1
    else if (ch === ")" || ch === "]" || ch === "}") depth -= 1
    else if (ch === "," && depth === 0) {
      args.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  const tail = text.slice(start).trim()
  if (tail.length > 0) args.push(tail)
  return args
}

/** 그 파일 안 `buildReviewReportPayload(...)` 호출들의 인자 목록. */
function builderCallArgs(source: string): string[][] {
  const clean = stripComments(source)
  const CALL = "buildReviewReportPayload("
  const calls: string[][] = []
  for (
    let at = clean.indexOf(CALL);
    at !== -1;
    at = clean.indexOf(CALL, at + 1)
  ) {
    let depth = 1
    let end = at + CALL.length
    while (end < clean.length && depth > 0) {
      if (clean[end] === "(") depth += 1
      else if (clean[end] === ")") depth -= 1
      end += 1
    }
    calls.push(splitTopLevelArgs(clean.slice(at + CALL.length, end - 1)))
  }
  return calls
}

/**
 * `restaurantService.reportReview(` 를 부르는 파일을 **소스에서 찾는다.**
 *
 * 위 표와 어긋나면 둘 중 하나다: 새 신고 경로를 만들고 표에 안 적었거나, 표에 적힌
 * 경로가 사라졌거나. 어느 쪽이든 소스 가드가 헛돌고 있다는 뜻이라 빨개져야 한다.
 */
const SRC_ROOT = path.resolve(__dirname, "../src")

function tsFilesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return tsFilesUnder(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

const DISCOVERED_REPORT_SOURCES = tsFilesUnder(SRC_ROOT)
  .filter((file) =>
    /restaurantService\.reportReview\s*\(/.test(
      stripComments(fs.readFileSync(file, "utf8")),
    ),
  )
  .map((file) => path.relative(__dirname, file))
  .sort()

/**
 * 사유별 **최소 유효 호출**의 본문. 자유입력은 본문이 곧 사유라 비면 빌더가 던진다.
 */
const bodyFor = (code: ReviewReportReasonCode) =>
  code === REVIEW_REPORT_FREE_TEXT_CODE ? "직접 쓴 사유" : ""

/**
 * 시트가 사용자 입력에 거는 상한. **소스에서 읽는다** — 여기 복사본을 두면 시트가
 * 상한을 올린 날 이 테스트만 옛 숫자로 초록을 낸다.
 */
const SHEET_DETAIL_MAX = Number(
  SHEET_SOURCE.match(/const DETAIL_MAX = (\d+)/)?.[1],
)

describe("review report — 서버가 실제로 받는 값인가", () => {
  it("뽑아 온 정규식이 이 엔드포인트에 걸려 있는 그것이다", () => {
    // 다른 상수를 읽고 초록을 내는 일이 없도록, 본문 스키마가 그 상수를 쓰는지 본다.
    expect(SERVER_REPORT_BODY).toMatch(
      /reason:\s*t\.String\(\{\s*pattern:\s*REVIEW_REPORT_REASON_PATTERN/,
    )
  })

  it("뽑아 온 상한도 이 엔드포인트의 detail 에 걸려 있는 그것이다", () => {
    /*
      배선 확인이 `reason` 에만 있고 여기엔 없던 자리다. 서버가 `detail` 의 maxLength 만
      다른 상수로 갈아끼우면 앱은 엉뚱한 값을 서버 상한으로 알고도 초록을 낸다 —
      그 어긋남은 사용자 본문이 길어진 날 400 으로만 드러난다.
    */
    expect(SERVER_REPORT_BODY).toMatch(
      /detail:[\s\S]*maxLength:\s*MAX_REVIEW_REPORT_DETAIL_LENGTH/,
    )
  })

  it.each(REVIEW_REPORT_REASONS.map((reason) => reason.code))(
    "%s 를 고르면 서버가 받는 값이 나간다",
    (code) => {
      const { reason } = buildReviewReportPayload(code, bodyFor(code))
      expect(acceptsReason(reason)).toBe(true)
    },
  )

  it("앱이 아는 서버 값 목록이 서버 정규식과 정확히 같다", () => {
    const fromServer = SERVER_REASON_PATTERN.replace(/^\^\(|\)\$$/g, "").split(
      "|",
    )
    expect([...REVIEW_REPORT_SERVER_REASONS].sort()).toEqual(fromServer.sort())
  })

  it("화면 코드와 서버 값은 한 글자도 겹치지 않는다", () => {
    // 겹치는 이름이 하나라도 있으면 "어느 쪽 어휘를 들고 있는지" 가 눈으로 구분되지
    // 않는다 — 예전에 UI 값이 그대로 새어 나간 경로가 그것이었다.
    for (const { code } of REVIEW_REPORT_REASONS) {
      expect(acceptsReason(code)).toBe(false)
    }
  })

  it("예전 어휘(IRRELEVANT 등)는 되살리면 400 이다", () => {
    for (const legacy of ["IRRELEVANT", "ABUSE", "PRIVACY", "ETC"]) {
      expect(acceptsReason(legacy)).toBe(false)
    }
  })

  it.each(Object.entries(REPORT_SOURCES))(
    "%s 는 사유를 손으로 담지 않는다 — 변환은 빌더 한 곳뿐이다",
    (_name, relative) => {
      const source = sourceOf(relative)
      expect(source).toContain("buildReviewReportPayload(")
      // 화면 어휘를 그대로 `reason` 에 얹는 모양(`reason: reason` / `reason: args.reason`).
      expect(source).not.toMatch(/reason:\s*(args\.)?reason\b/)
      // 그리고 인자 타입을 `string` 으로 열어 두면 다음 화면이 아무 값이나 밀어 넣는다.
      expect(source).not.toMatch(/reason:\s*string\b/)
    },
  )

  it("소스 가드가 읽는 목록이 실제 신고 경로 전부다", () => {
    /*
      위 `it.each` 는 **적힌 파일만** 본다. 적히지 않은 경로는 그 반복문이 아예 돌지
      않으므로 어떤 단언도 지나가지 않는다 — 이번 결함이 조용했던 이유가 정확히
      그것이다. 그래서 목록 자체를 소스와 대조한다.
    */
    expect(DISCOVERED_REPORT_SOURCES).toEqual(
      [...Object.values(REPORT_SOURCES)].sort(),
    )
  })

  it("와이어 타입의 reason 은 서버 어휘 유니온이다 — string 이 아니다", () => {
    /*
      소스 가드는 목록에 든 파일까지만 지킨다. 새 화면이 목록에 들기 전에 화면 어휘를
      그대로 보내는 것을 막는 마지막 그물은 타입이다 — `string` 이면 `reason: "ETC"` 가
      타입검사를 통과하고 런타임에 400 으로만 드러난다.
    */
    const types = stripComments(
      sourceOf("../src/features/restaurant/types/index.ts"),
    )
    const body = types.match(
      /interface ReviewReportPayload \{([\s\S]*?)\n\}/,
    )?.[1]
    expect(body).toBeTruthy()
    expect(body).toMatch(/reason:\s*ReviewReportServerReason\b/)
    expect(body).not.toMatch(/reason:\s*string\b/)
  })
})

describe("review report — 본문은 새지도 버려지지도 않는다", () => {
  /*
    빌더 게이팅은 **유출 방향**(남의 사유에 본문이 실리는 것)만 막는다. 반대편 —
    호출부가 본문을 아예 안 넘겨 사용자가 `기타` 에 쓴 글이 통째로 사라지는 **폐기
    방향** — 은 그 게이팅으로는 보이지 않는다. 빌더가 던지는 것과, 호출부가 본문을
    실제로 넘기는 것을 **둘 다** 못 박아야 두 방향이 막힌다.
  */
  it.each(Object.entries(REPORT_SOURCES))(
    "%s 는 본문 자리에 상수를 박지 않는다 — 사용자가 쓴 것을 넘긴다",
    (_name, relative) => {
      const calls = builderCallArgs(sourceOf(relative))
      expect(calls.length).toBeGreaterThan(0)
      for (const args of calls) {
        // 인자가 하나면 예전 기본값(`freeText = ""`)이 부활한 것과 같은 결과다.
        expect(args).toHaveLength(2)
        expect(args[1]).not.toMatch(/^(?:""|''|``|null|undefined)$/)
      }
    },
  )

  it("시트는 입력칸에 타이핑한 그 state 를 뮤테이션까지 싣는다", () => {
    /*
      상수만 안 박으면 되는 게 아니라, 넘기는 값이 **사용자가 실제로 친 그것**이어야
      한다. 이름은 소스에서 읽는다 — 여기 적어 두면 시트가 state 이름을 바꾼 날
      이 테스트만 옛 이름으로 초록을 낸다.
    */
    const clean = stripComments(SHEET_SOURCE)
    const bodyState = clean.match(
      /<V2SheetTextInput[\s\S]*?value=\{(\w+)\}/,
    )?.[1]
    expect(bodyState).toBeTruthy()

    const payload = clean.match(/mutateAsync\(\{([^}]*)\}\)/)?.[1]
    expect(payload).toBeTruthy()
    /*
      **값 자리**에 있는지 본다. 이름이 어디 한 번 나오는지만 세면
      `{ …, detail: "" }` 도 통과하는데, 그건 본문을 빌더 대신 한 걸음 앞에서 버리는
      것일 뿐 사용자에게는 같은 결과다(쓴 글이 사라진다).
    */
    expect(splitTopLevelArgs(payload as string)).toContainEqual(
      expect.stringMatching(
        new RegExp(`^(?:${bodyState}|\\w+:\\s*${bodyState}\\b.*)$`),
      ),
    )
  })

  it.each([
    ["빈 문자열", ""],
    ["공백·줄바꿈만", "   \n\t "],
  ])("자유입력에 %s 를 주면 접지 않고 던진다", (_name, input) => {
    /*
      접으면 `{reason:"OTHER", detail:"[ETC]"}` — 사유가 '기타'인데 기타 내용이 없는,
      콘솔이 읽어도 아무것도 모르는 행이다. 시트는 `canSubmit` 으로 막지만 훅에는
      그 검사가 없고, 시트 쪽 게이팅이 사라져도 여기서 걸려야 한다.
    */
    expect(() =>
      buildReviewReportPayload(REVIEW_REPORT_FREE_TEXT_CODE, input),
    ).toThrow(REVIEW_REPORT_FREE_TEXT_CODE)
  })

  it("다른 사유는 본문이 없어도 정상이다 — 고른 라벨이 곧 사유이므로", () => {
    for (const { code } of REVIEW_REPORT_REASONS) {
      if (code === REVIEW_REPORT_FREE_TEXT_CODE) continue
      expect(buildReviewReportPayload(code, "").detail).toBe(`[${code}]`)
    }
  })
})

describe("review report — 화면 사유 → 서버 값 매핑 표", () => {
  it("어느 사유를 어느 통에 넣었는지가 쌍으로 고정돼 있다", () => {
    /*
      `acceptsReason(reason)` 만 보는 단언은 "서버 5값 중 하나이기만 하면" 통과라
      `ABUSE → SPAM` 으로 갈아끼워도 전부 초록이었다. 이 고침의 본체는 값의 유효성이
      아니라 **어느 사유를 어느 통에 넣었는가**이므로 쌍 전체를 못 박는다.
      바꾸려면 여기와 `reviewReportReasons.ts` 머리말의 근거 표를 함께 고칠 것.
    */
    expect(
      REVIEW_REPORT_REASONS.map(({ code, serverReason }) => [
        code,
        serverReason,
      ]),
    ).toEqual([
      ["ORDER_IRRELEVANT", "INAPPROPRIATE_CONTENT"],
      ["PLACE_IRRELEVANT", "INAPPROPRIATE_CONTENT"],
      ["ABUSE", "HARASSMENT"],
      ["ADVERTISING", "SPAM"],
      ["PRIVACY", "INAPPROPRIATE_CONTENT"],
      ["COPIED_REVIEW", "INAPPROPRIATE_CONTENT"],
      ["ETC", "OTHER"],
    ])
  })

  it("FALSE_INFORMATION 은 일부러 비워 둔 통이다", () => {
    // 못 써서 안 쓰는 게 아니다 — 서버 어휘에는 멀쩡히 있다.
    expect(acceptsReason("FALSE_INFORMATION")).toBe(true)
    /*
      시안의 일곱 사유 중 "허위 정보" 에 해당하는 것이 없다. 통을 고르게 채우려고
      주제 이탈을 여기 붙이면 운영 콘솔의 "허위 정보" 집계가 실제로는 주제 이탈이
      되어, 없는 지표보다 **틀린 지표**가 된다.
    */
    expect(REVIEW_REPORT_REASONS.map((r) => r.serverReason)).not.toContain(
      "FALSE_INFORMATION",
    )
  })

  it("모르는 코드는 조용히 OTHER 로 둔갑하지 않고 던진다", () => {
    /*
      `?? "OTHER"` 로 접으면 `reason=OTHER` + 첫 줄엔 표에 없는 `[UNKNOWN]` 이라는
      앞뒤 안 맞는 행이 조용히 쌓인다. 화면에는 아무 흔적도 남지 않는다 —
      "모르면 모른다로 둔다" 가 이 저장소의 규칙이다.
    */
    expect(() =>
      buildReviewReportPayload("UNKNOWN" as ReviewReportReasonCode, ""),
    ).toThrow(/UNKNOWN/)
  })
})

describe("review report — detail 앞머리(접힌 사유 복구)", () => {
  it("서버 상한을 앱이 같은 값으로 알고 있다", () => {
    expect(REVIEW_REPORT_DETAIL_MAX).toBe(SERVER_DETAIL_MAX)
  })

  it("네 사유가 한 서버 값으로 접히므로 코드가 detail 에 남는다", () => {
    const folded = REVIEW_REPORT_REASONS.filter(
      (reason) => reason.serverReason === "INAPPROPRIATE_CONTENT",
    )
    expect(folded.length).toBeGreaterThan(1)

    const details = folded.map(
      (reason) => buildReviewReportPayload(reason.code, "").detail,
    )
    // 서버 행만 보면 똑같은 신고들이다. detail 첫 줄이 유일한 구분자다.
    expect(new Set(details).size).toBe(folded.length)
    for (const reason of folded) {
      expect(buildReviewReportPayload(reason.code, "").detail).toBe(
        `[${reason.code}]`,
      )
    }
  })

  it("직접 입력은 둘째 줄부터 원문 그대로 실린다", () => {
    const { reason, detail } = buildReviewReportPayload(
      REVIEW_REPORT_FREE_TEXT_CODE,
      "  사진이 다른 가게 것이에요  ",
    )
    expect(reason).toBe("OTHER")
    expect(detail.split("\n")[0]).toBe("[ETC]")
    expect(detail.slice(detail.indexOf("\n") + 1)).toBe(
      "사진이 다른 가게 것이에요",
    )
  })

  it("사용자가 대괄호로 시작해도 첫 줄은 우리 것이다", () => {
    const { detail } = buildReviewReportPayload(
      REVIEW_REPORT_FREE_TEXT_CODE,
      "[SPAM]\n이렇게 적어 봤어요",
    )
    // 파서는 첫 줄만 코드로 읽는다 — 사용자의 `[SPAM]` 은 둘째 줄이라 섞이지 않는다.
    expect(detail.split("\n")[0]).toBe("[ETC]")
    expect(detail.split("\n").slice(1)).toEqual([
      "[SPAM]",
      "이렇게 적어 봤어요",
    ])
  })

  it("자유입력 사유가 아니면 넘어온 본문을 싣지 않는다", () => {
    /*
      시트에서 `기타` 에 글을 쓴 뒤 다른 사유로 바꾸면 입력칸은 사라지지만 문장은
      state 에 남는다. 그대로 넘기면 사용자가 **버렸다고 믿는 문장**이 다른 사유의
      둘째 줄로 접수되고 다시 볼 방법도 없다 — `[CODE]` 규약이 노리던 "어느 사유로
      무엇을" 이 정확히 어긋난다.
    */
    const stray = "버렸다고 믿은 문장"
    for (const { code } of REVIEW_REPORT_REASONS) {
      const { detail } = buildReviewReportPayload(code, stray)
      if (code === REVIEW_REPORT_FREE_TEXT_CODE) {
        expect(detail).toBe(`[${code}]\n${stray}`)
        continue
      }
      expect(detail).toBe(`[${code}]`)
      expect(detail).not.toContain(stray)
    }
  })

  it("상한을 넘으면 코드가 아니라 본문을 자른다", () => {
    const { detail } = buildReviewReportPayload(
      REVIEW_REPORT_FREE_TEXT_CODE,
      "가".repeat(SERVER_DETAIL_MAX * 2),
    )
    expect(detail.length).toBeLessThanOrEqual(SERVER_DETAIL_MAX)
    expect(detail.startsWith("[ETC]\n")).toBe(true)
  })

  it.each([
    // 예산이 짝수라 순수 이모지는 자르는 자리가 **쌍 경계**에 떨어진다 —
    // 보호 코드가 있든 없든 참이라, 예전 테스트는 분기를 한 번도 안 밟았다.
    ["짝수 입력(쌍 경계에서 잘린다)", "🥲".repeat(SERVER_DETAIL_MAX)],
    // 한 글자 밀면 자르는 자리가 **쌍 한가운데**로 온다. 여기가 진짜 분기다.
    ["홀수 입력(쌍 한가운데서 잘린다)", `가${"🥲".repeat(SERVER_DETAIL_MAX)}`],
  ])("자를 때 이모지를 반으로 가르지 않는다 — %s", (_name, input) => {
    const { detail } = buildReviewReportPayload(
      REVIEW_REPORT_FREE_TEXT_CODE,
      input,
    )
    expect(detail.length).toBeLessThanOrEqual(SERVER_DETAIL_MAX)
    // 상위 서러게이트만 남으면 서버 행에 깨진 글자가 저장된다.
    expect(/[\uD800-\uDBFF]$/.test(detail)).toBe(false)
    // 그리고 잘린 끝은 **온전한 이모지**여야 한다(반쪽이면 이 단언이 먼저 죽는다).
    expect(detail.endsWith("🥲")).toBe(true)
  })

  it("시트 상한은 시안이 정한 값 그대로다", () => {
    /*
      바로 아래 "넘칠 수 없다" 단언은 상한을 400 으로 올려도 통과한다(`400 + 6 ≤ 500`).
      그런데 이 숫자는 계산 결과가 아니라 **시안이 고른 값**이고, 카운터 문구가 그대로
      사용자에게 보인다 — 바꾸는 것은 제품 결정이지 리팩터링이 아니다. 여기서 못 박아
      두면 그 결정이 이 줄을 함께 고치는 형태로 남는다. (숫자를 아는 곳은 시트의
      `DETAIL_MAX` 와 이 줄뿐이다. 산문에는 적지 않는다 — 산문은 빨개지지 않는다.)
    */
    expect(SHEET_DETAIL_MAX).toBe(300)
  })

  it("시트 상한으로는 자르기에 닿지 않는다 — 방어는 방어로 남긴다", () => {
    /*
      위 두 상한 테스트가 지키는 코드는 **오늘 앱에서 안 돈다**: 시트 상한 + 앞머리가
      서버 상한 안에 들어가므로 항상 `text.length <= max` 첫 줄에서 빠져나간다. 상한을
      예산까지 올려 도달시키는 대신(시안에 없는 숫자로 카운터를 늘리고 그 끝에서 조용히
      자르는 경험이 된다) 방어로 남기고, **넘칠 수 없다**는 사실을 여기서 못 박는다.
      상한을 예산 위로 올리는 변경은 이 단언에서 먼저 걸린다.
    */
    expect(Number.isInteger(SHEET_DETAIL_MAX)).toBe(true)
    const head = `[${REVIEW_REPORT_FREE_TEXT_CODE}]`
    expect(SHEET_DETAIL_MAX + head.length + 1).toBeLessThanOrEqual(
      SERVER_DETAIL_MAX,
    )
    // 상한을 꽉 채워 써도 한 글자도 안 잘린다.
    const body = "가".repeat(SHEET_DETAIL_MAX)
    expect(
      buildReviewReportPayload(REVIEW_REPORT_FREE_TEXT_CODE, body).detail,
    ).toBe(`${head}\n${body}`)
  })
})

describe("review report — 시트에서 나가는 길", () => {
  it("라벨 붙은 닫기 컨트롤이 있다", () => {
    /*
      CTA 를 children 으로 옮기면서 푸터의 `secondaryLabel={t("action.close")}` 이
      함께 사라졌다. `disableForOwn`(내가 쓴 후기)이면 사유 일곱 줄과 CTA 가 전부
      disabled 라, 닫기가 없으면 **화면 안에 누를 수 있는 것이 하나도 없다** —
      나가는 길이 스크림 탭과 드래그 핸들뿐이고 둘 다 이름이 없어 스크린리더에는
      존재하지 않는다.
    */
    expect(SHEET_SOURCE).toMatch(/^\s*showClose\s*$/m)
  })
})

describe("review report — 두 번째 신고는 오류가 아니다", () => {
  it("서버가 그 사실을 성공 응답에 싣는다", () => {
    /*
      같은 후기를 두 번 신고해도 400 이 아니다. 유니크 제약은 `on conflict do update` 로
      흡수되고, 서버는 같은 행을 돌려주며 `alreadyReported` 로 **사실만** 알려 준다
      (`engagementService.createReviewReport`). 그러니 이 경우를 catch 절의 사례로
      적으면 안 되고, 성공 경로가 읽어야 한다.
    */
    expect(serverEngagementSource).toMatch(/alreadyReported:\s*!row\.inserted/)
  })

  it("시트가 그 값을 읽어 다른 문구를 띄운다", () => {
    // 버리면 이미 접수된 신고를 방금 접수된 것처럼 말하게 된다.
    const clean = stripComments(SHEET_SOURCE)
    expect(clean).toContain("alreadyReported")
    expect(clean).toContain("restaurant.review.reportAlready")
    expect(clean).toContain("restaurant.review.reportDone")
  })

  it("catch 주석이 이 엔드포인트에서 안 나는 사례를 들지 않는다", () => {
    /*
      옛 주석은 "같은 후기를 두 번 신고했을 때(서버의 유니크 제약)" 를 폴백 금지의
      근거로 들었는데, 그 경우는 애초에 catch 로 오지 않는다. 틀린 근거가 붙은 규칙은
      다음 사람이 규칙째로 지운다.
    */
    const catchBlock = SHEET_SOURCE.slice(SHEET_SOURCE.indexOf("} catch ("))
    expect(catchBlock).not.toMatch(/유니크 제약/)
    expect(catchBlock).not.toMatch(/두 번 신고/)
  })

  it("두 문구가 서로 다르다 — 같으면 분기가 있으나 마나다", () => {
    for (const locale of TEST_LOCALES) {
      const done = commonValue("restaurant.review.reportDone", locale)
      const already = commonValue("restaurant.review.reportAlready", locale)
      expect(done).toBeTruthy()
      expect(already).toBeTruthy()
      expect(already).not.toBe(done)
    }
  })
})

describe("review report — 시안의 일곱 줄", () => {
  it("시안 순서 그대로다(기타는 마지막)", () => {
    expect(REVIEW_REPORT_REASONS.map((reason) => reason.code)).toEqual([
      "ORDER_IRRELEVANT",
      "PLACE_IRRELEVANT",
      "ABUSE",
      "ADVERTISING",
      "PRIVACY",
      "COPIED_REVIEW",
      "ETC",
    ])
    expect(REVIEW_REPORT_REASONS.at(-1)?.code).toBe(
      REVIEW_REPORT_FREE_TEXT_CODE,
    )
  })

  it.each(REVIEW_REPORT_REASONS.map((reason) => reason.labelKey))(
    "%s 는 ko/en 양쪽에 문구가 있다",
    (labelKey) => {
      expect(hasCommonKeyInBothLocales(labelKey)).toBe(true)
    },
  )

  it.each([
    "restaurant.review.reportReasonTitle",
    "restaurant.review.reportReasonSubtitle",
    "restaurant.review.reportSubmit",
    "restaurant.review.reportDetailPlaceholder",
    "restaurant.review.reportDone",
    "restaurant.review.reportAlready",
  ])("시트 머리말·CTA·토스트(%s)도 양쪽에 있다", (key) => {
    expect(hasCommonKeyInBothLocales(key)).toBe(true)
  })

  it("일곱 줄이 서로 다른 문구다", () => {
    const labels = Object.values(koCommon.restaurant.review.reportReasons)
    expect(labels).toHaveLength(REVIEW_REPORT_REASONS.length)
    expect(new Set(labels).size).toBe(REVIEW_REPORT_REASONS.length)
  })
})
