/**
 * **요청 본문 계약.** 기존 계약 테스트가 못 잡은 축이다.
 *
 * `tests/restaurantApiContract.test.ts` 와 `tests/restaurantContractDrift.test.ts` 는
 * 둘 다 **응답**만 본다 — 픽스처는 전부 서버가 보낸 JSON 이고, 매니페스트는 전부
 * `FieldManifest<SomeDto>` 즉 응답 DTO 다. 앱이 **보내는** 본문의 키를 서버 스키마와
 * 맞춰 보는 검사는 한 줄도 없었다. 그래서 이 결함이 초록불 아래에서 살아남았다:
 *
 *     앱: { imageUrls: [...] }        서버: body.imageObjectPaths 를 읽음
 *
 * 요청은 200 이었다. 서버의 TypeBox 는 non-strict 라 모르는 키를 **막지 않고**, 스키마에
 * 없는 키는 `normalizeReviewInput` 이 읽지도 않는다. 후기는 저장되고, `storedPaths` 는
 * 빈 배열이고, 서버는 "사진이 없었다"는 뜻의 `photosIndexed: 0` 을 돌려줬다. 앱의 방어
 * 코드는 `-1` 만 실패로 봤으므로 **한 번도 켜지지 않았다.** 사용자는 사진을 고르고,
 * 성공 토스트를 보고, 사진은 어디에도 없었다. 타입도, tsc 도, 기존 계약 테스트도
 * 아무것도 말하지 않았다.
 *
 * ## 이 파일이 세우는 성질 다섯
 *
 * 1. 앱이 만드는 본문의 키 집합 ⊆ 서버 `createReviewBody` 가 받는 키 집합.
 *    **서버 파일을 직접 읽어서** 대조한다 — 손으로 베낀 표는 서버가 이름을 바꾼 날
 *    같이 낡는다.
 * 2. `photosIndexed` 는 **보낸 장수와 함께** 읽어야 성공·실패가 갈린다.
 *    `-1` 만 보는 판정은 이 결함에서 증명됐듯 아무것도 막지 못한다.
 * 3. 그렇다고 `-1` 과 `0` 을 한 통에 접으면 이번엔 **반대 방향의 거짓말**이 된다.
 *    `-1` 은 사진이 후기에 저장된 뒤 사진 탭 색인만 실패한 상태이므로 "사진은 저장되지
 *    않았어요" 가 틀린 말이고, 그 말을 믿은 사용자는 멀쩡한 후기를 지운다.
 * 4. **판정이 토스트 표면까지 이어진다.** 표만 맞고 배선이 어긋난 상태를 아무것도
 *    막지 않았다 — `showSuccessToast` 와 `showErrorToast` 를 맞바꿔도 전부 초록이었고,
 *    전량 성공이 빨간 토스트로, 사진 전멸이 초록 토스트로 나갔다. 그래서 토스트 모듈을
 *    목으로 바꿔 진리표 다섯 줄에서 **어느 표면이 떴는지**를 실행으로 확인한다.
 * 5. **그 호출이 도달 가능하다.** 소스에 문자열이 있다는 것과 실제로 불린다는 것은 다른
 *    성질이다. 판정 블록 앞에 이른 return 한 줄(`if (photosIndexed >= 0) { … return }`)을
 *    끼우면 출시됐던 결함이 그대로 돌아오는데, 존재만 보는 단언은 하나도 안 움직였다.
 *    구간을 잘라 흐름을 끊는 문장이 없다는 것까지 본다.
 *
 * ## 왜 서버 저장소가 없으면 건너뛰지 않는가
 *
 * `restaurantApiContract.test.ts` 머리말이 적은 대로 **건너뛰어지는 검사는 없는 검사다.**
 * 이 사고가 정확히 그런 사각지대에서 살아남았으므로, 서버 체크아웃이 없으면 조용히
 * 통과시키는 대신 무엇이 없는지 말하며 실패한다.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import {
  REVIEW_PHOTO_NOTICE,
  reviewPhotoNotice,
  reviewPhotoOutcome,
  reviewSubmitBody,
  showReviewPhotoNotice,
  type ReviewPhotoOutcome,
} from "../src/features/restaurant/utils/reviewDraft"
import {
  showCautionToast,
  showErrorToast,
  showSuccessToast,
} from "../src/lib/toast"
import type { ReviewSubmitPayload } from "../src/features/restaurant/types"
import ko from "../src/i18n/locales/ko/common.json"
import en from "../src/i18n/locales/en/common.json"

/*
  토스트 모듈을 목으로 바꾼다(ts-jest 가 import 위로 끌어올린다). 확인해야 하는 것은
  "**어느 표면이** 떴는가" 이고 실제 `react-native-toast-message` 를 띄울 필요는 없다.
  목으로 두면 성공↔오류를 맞바꾼 배선이 **실행 결과**로 드러난다 — 소스에 문자열 다섯 개가
  남아 있는지 보는 검사로는 그 스왑이 끝내 보이지 않았다.
*/
jest.mock("../src/lib/toast", () => ({
  showSuccessToast: jest.fn(),
  showCautionToast: jest.fn(),
  showErrorToast: jest.fn(),
}))

/** 톤 이름 → 그 톤이 부르기로 되어 있는 표면. 목이므로 호출을 셀 수 있다. */
const SURFACE_SPY: Record<"success" | "caution" | "error", jest.Mock> = {
  success: showSuccessToast as unknown as jest.Mock,
  caution: showCautionToast as unknown as jest.Mock,
  error: showErrorToast as unknown as jest.Mock,
}

const APP_ROOT = join(__dirname, "..")
/** 두 저장소는 형제다(`sinsin_dev/sinsin-rn`, `sinsin_dev/sinsin-be-bun`). */
const SERVER_SCHEMA = join(
  APP_ROOT,
  "../sinsin-be-bun/src/domains/restaurant/schemas.ts",
)

const readApp = (relative: string): string =>
  readFileSync(join(APP_ROOT, relative), "utf8")

/* ──────────────────── 서버 스키마 파서 ──────────────────── */

type FieldMode = "required" | "optional"

/**
 * `export const <name> = t.Object({ ... })` 의 **최상위** 필드만 뽑는다.
 *
 * 주석을 먼저 걷어 내는 이유: 이 스키마의 주석에는 괄호·중괄호가 섞인 한국어 문장이
 * 있어서 그대로 세면 깊이가 어긋난다. 중첩 객체(`t.String({ maxLength: … })`)는
 * `{}` 로 접어 두고 최상위 쉼표로만 자른다.
 */
function objectSchemaFields(
  source: string,
  name: string,
): Map<string, FieldMode> {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "")
  const anchor = stripped.indexOf(`export const ${name} = t.Object(`)
  if (anchor < 0) {
    throw new Error(
      `서버 스키마에서 \`${name}\` 을 찾지 못했다. 이름이 바뀌었으면 이 테스트를 먼저 고칠 것 — ${SERVER_SCHEMA}`,
    )
  }
  const open = stripped.indexOf("{", anchor)

  let depth = 0
  let flat = ""
  let closed = false
  for (let i = open; i < stripped.length; i += 1) {
    const ch = stripped[i]
    if (ch === "{") {
      depth += 1
      if (depth > 1) continue
      continue
    }
    if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        closed = true
        break
      }
      continue
    }
    if (depth === 1) flat += ch
  }
  if (!closed) throw new Error(`\`${name}\` 의 객체 리터럴이 닫히지 않았다.`)

  // 최상위 쉼표로 자른다. `t.Union([…, …])` 안의 쉼표는 필드 구분자가 아니다.
  const parts: string[] = []
  let buffer = ""
  let nesting = 0
  for (const ch of flat) {
    if ("([{".includes(ch)) nesting += 1
    else if (")]}".includes(ch)) nesting -= 1
    if (ch === "," && nesting === 0) {
      parts.push(buffer)
      buffer = ""
      continue
    }
    buffer += ch
  }
  parts.push(buffer)

  const fields = new Map<string, FieldMode>()
  for (const part of parts) {
    const matched = /^\s*([A-Za-z_$][\w$]*)\s*:([\s\S]*)$/.exec(part)
    if (!matched) continue
    fields.set(
      matched[1],
      matched[2].includes("t.Optional(") ? "optional" : "required",
    )
  }
  return fields
}

function serverSchemaSource(): string {
  if (!existsSync(SERVER_SCHEMA)) {
    throw new Error(
      [
        `서버 스키마 파일이 없다: ${SERVER_SCHEMA}`,
        "요청 본문의 필드 이름은 **서버가 정본**이라 대조 없이 통과시킬 수 없다",
        "(건너뛰어지는 검사는 없는 검사다 — 이 결함이 그 사각지대에서 살아남았다).",
        "`sinsin-be-bun` 을 `sinsin-rn` 과 같은 부모 디렉터리에 두고 다시 실행할 것.",
      ].join("\n"),
    )
  }
  return readFileSync(SERVER_SCHEMA, "utf8")
}

const SERVER_FIELDS = objectSchemaFields(
  serverSchemaSource(),
  "createReviewBody",
)

/**
 * 본문의 키를 서버 스키마와 대조한다. 실패 메시지는 **고칠 수 있게** 쓴다 —
 * `Expected: true / Received: false` 로는 아무도 못 고친다.
 */
function expectBodyKeysMatchServer(
  body: Record<string, unknown>,
  label: string,
): void {
  const unknown = Object.keys(body)
    .filter((key) => !SERVER_FIELDS.has(key))
    .sort()
  expect(
    `${label} — 서버가 읽지 않는 키(조용히 버려진다): ${unknown.join(", ") || "(없음)"}`,
  ).toBe(`${label} — 서버가 읽지 않는 키(조용히 버려진다): (없음)`)

  const missing = [...SERVER_FIELDS.entries()]
    .filter(([key, mode]) => mode === "required" && !(key in body))
    .map(([key]) => key)
    .sort()
  expect(
    `${label} — 서버가 요구하는데 앱이 안 보내는 키: ${missing.join(", ") || "(없음)"}`,
  ).toBe(`${label} — 서버가 요구하는데 앱이 안 보내는 키: (없음)`)
}

/** 화면이 실제로 만드는 모양(사진 3장 · 메뉴명 없음)과 모든 칸을 채운 모양. */
const SCREEN_PAYLOAD: ReviewSubmitPayload = {
  rating: 5,
  content: "싱겁게 주문할 수 있었어요",
  keywords: ["TASTE"],
  imageObjectPaths: ["uploads/general/a.jpg", "uploads/general/b.jpg"],
}
const FULL_PAYLOAD: ReviewSubmitPayload = {
  ...SCREEN_PAYLOAD,
  menuName: "비빔밥",
}

/* ──────────────────── 1. 요청 본문 계약 ──────────────────── */

describe("POST /restaurants/:id/reviews 요청 본문", () => {
  /*
    필드 **목록 전체**를 `toEqual` 로 고정하지 않는다. 서버가 `photoCategory` 같은
    **선택** 필드를 하나 붙이기만 해도 앱에는 아무 문제가 없는데 이 줄이 빨개진다 —
    그런 거짓 경보가 몇 번 나면 다음 사람은 이 파일을 "또 그거네" 로 읽고 진짜 드리프트도
    같이 넘긴다. 여기서 지킬 성질은 둘뿐이다: 사진 키가 있고 선택이라는 것,
    그리고 **필수** 집합이 늘지 않았다는 것(늘면 앱은 그날로 400 을 받는다).
  */
  it("서버 `createReviewBody` 에서 사진 키와 필수 집합을 읽어 온다", () => {
    expect(`imageObjectPaths: ${SERVER_FIELDS.get("imageObjectPaths")}`).toBe(
      "imageObjectPaths: optional",
    )
    expect(
      [...SERVER_FIELDS.entries()]
        .filter(([, mode]) => mode === "required")
        .map(([key]) => key)
        .sort(),
    ).toEqual(["content", "rating"])
  })

  it("앱이 만드는 본문에 서버가 읽지 않는 키가 없다", () => {
    expectBodyKeysMatchServer(
      reviewSubmitBody(FULL_PAYLOAD),
      "모든 칸을 채운 본문",
    )
    expectBodyKeysMatchServer(
      reviewSubmitBody(SCREEN_PAYLOAD),
      "화면이 만드는 본문",
    )
    expectBodyKeysMatchServer(
      reviewSubmitBody({ rating: 3, content: "짧게", keywords: [] }),
      "선택 필드 없는 본문",
    )
  })

  it("사진 경로는 `imageObjectPaths` 로 나간다 (`imageUrls` 로 되돌리면 여기서 잡힌다)", () => {
    const body = reviewSubmitBody(SCREEN_PAYLOAD)
    expect(body.imageObjectPaths).toEqual(SCREEN_PAYLOAD.imageObjectPaths)
    expect("imageUrls" in body).toBe(false)
  })

  it("안 고른 선택 필드는 키째로 빠진다 — `undefined` 를 담지 않는다", () => {
    const body = reviewSubmitBody(SCREEN_PAYLOAD)
    expect("menuName" in body).toBe(false)
    // 명시적으로 준 `null` 은 남는다(서버가 nullable 로 받는다).
    expect(
      "menuName" in reviewSubmitBody({ ...SCREEN_PAYLOAD, menuName: null }),
    ).toBe(true)
  })
})

/* ──────────────────── 2. 조립 지점이 하나인가 ──────────────────── */

/**
 * 위 검사는 `reviewSubmitBody` 만 본다. 화면·서비스가 그 함수를 **안 거치면** 아무 의미가
 * 없으므로 세 지점의 소스를 직접 확인한다. jest 는 `testEnvironment: "node"` 라 RN 화면을
 * 렌더할 수 없다 — 소스 검사가 여기서 쓸 수 있는 유일한 수단이다.
 */
/**
 * 두 앵커 사이만 자른다. **끝 앵커를 생략하면 안 된다** — `slice(indexOf(a))` 는 파일
 * 끝까지 자르므로 "이 함수 안에 있다" 가 아니라 "파일 어딘가에 있다" 를 검사하게 되고,
 * 그러면 검사 이름이 하는 말과 검사가 하는 일이 달라진다.
 */
function sliceBetween(source: string, from: string, to: string): string {
  const start = source.indexOf(from)
  if (start < 0) {
    throw new Error(
      `앵커 \`${from}\` 이 소스에 없다 — 이름이 바뀌었으면 여기부터 고칠 것`,
    )
  }
  const end = source.indexOf(to, start + from.length)
  if (end < 0) {
    throw new Error(
      `끝 앵커 \`${to}\` 가 \`${from}\` 뒤에 없다 — 경계 없이 자르면 파일 끝까지 잘린다`,
    )
  }
  return source.slice(start, end)
}

const submitSlice = (): string =>
  sliceBetween(
    readApp("src/features/restaurant/views/ReviewWriteScreen.tsx"),
    "const submit = useCallback",
    "const counterCurrent",
  )

/**
 * 주석은 실행되지 않는다. 도달가능성·잔여코드 검사 전에 걷어 낸다 — 안 그러면 "이런
 * 코드를 넣지 말 것" 이라고 **설명하는 주석**이 그 검사를 스스로 빨갛게 만든다.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
}

describe("본문 조립 지점", () => {
  it("서비스는 `payload` 를 그대로 던지지 않고 `reviewSubmitBody` 로 조립한다", () => {
    const service = readApp("src/services/data/restaurantService.ts")
    // 다음 메서드(`fetchReviews`)까지로 경계를 준다 — 안 주면 파일 전체가 잘려서
    // `reviewSubmitBody(payload)` 가 **다른 메서드**에 있어도 통과한다.
    const createReview = sliceBetween(
      service,
      "async createReview(",
      "async fetchReviews(",
    )
    expect(createReview).toContain("reviewSubmitBody(payload)")
  })

  it("화면은 `imageObjectPaths` 로 넘긴다", () => {
    const submit = submitSlice()
    expect(submit).toContain("imageObjectPaths: objectPaths")
    expect(submit).not.toContain("imageUrls")
  })

  /*
    머리말은 한때 `ReviewSubmitPayload.imageUrls` 가 맞는 이름이라고 **거짓 주장**을 했고,
    읽은 사람마다 그 문장을 믿고 지나갔다. 옛 이름이 본문에 남는 것은 괜찮다(무엇이
    틀렸는지 설명하려면 필요하다) — 정본 이름을 같이 말하지 않는 것이 위험하다.
  */
  it("머리말이 정본 필드명을 말한다", () => {
    const screen = readApp(
      "src/features/restaurant/views/ReviewWriteScreen.tsx",
    )
    const header = screen.slice(0, screen.indexOf("\nimport "))
    expect(header).toContain("imageObjectPaths")
  })

  it("`ReviewSubmitPayload` 가 사진 경로를 `imageObjectPaths` 로 선언한다", () => {
    const types = readApp("src/features/restaurant/types/index.ts")
    const start = types.indexOf("export interface ReviewSubmitPayload {")
    expect(start).toBeGreaterThan(-1)
    const block = types.slice(start, types.indexOf("}", start))
    expect(block).toContain("imageObjectPaths?: string[]")
    expect(block).not.toContain("imageUrls")
  })
})

/* ──────────────────── 3. photosIndexed 판정 ──────────────────── */

/**
 * 진리표. `photosIndexed` 는 **혼자서는 성공·실패를 못 가린다** —
 * `0` 은 0장 보냈으면 정상이고 3장 보냈으면 전멸이다.
 *
 * 옛 판정(`indexed === -1` 이면 실패, 아니면 성공)이 왜 아무것도 못 막았는지는
 * `[3, 0]` 줄이 말한다: 앱이 필드 이름을 틀리게 보내던 동안 서버가 준 것은 `-1` 이
 * 아니라 `0` 이었고, 보낸 장수를 안 보는 판정은 그것을 정상으로 읽었다.
 *
 * `describe` 밖에 두는 이유: 아래 3-1 블록이 같은 표로 `reviewPhotoNotice` 를 대조한다.
 */
const TABLE: readonly [number, number, ReviewPhotoOutcome][] = [
  [0, 0, "NONE"], // 사진 없는 후기 — 정상
  [3, 3, "ALL"], // 전량 색인 — 정상
  [3, 0, "FAILED"], // **이 결함의 실제 응답이었다** — 어디에도 없다
  [3, -1, "INDEX_PENDING"], // 후기엔 저장됐고 사진 탭 색인만 실패했다
  // 일부만. **도달 가능하다** — 서버가 `storedImageValue` 가 null 을 준 경로를
  // `.filter` 로 조용히 버리므로, 3장 중 1장이 버려지면 그대로 이 줄이 된다
  // (`reviewDraft.ts::reviewPhotoOutcome` 주석의 도달 조건).
  [3, 1, "PARTIAL"],
]

describe("photosIndexed 판정", () => {
  it.each(TABLE)("보낸 %i장 · 받은 %i → %s", (sent, indexed, expected) => {
    expect(reviewPhotoOutcome({ sent, indexed })).toBe(expected)
  })

  /*
    `-1` 과 `0` 은 **다른 사실**이다. 서버에서 `-1` 은 사진이
    `restaurant_review.image_urls` 에 이미 저장된 뒤 `restaurant_photo` 색인만 실패한
    상태고(`engagementService.ts::createReview`), `0` 은 아무 데도 안 들어간 상태다.
    둘을 한 통에 접어 "사진은 저장되지 않았어요" 를 띄우면 앞엣것에 대해서는 거짓말이고,
    사용자는 멀쩡히 저장된 사진을 다시 올리려고 방금 쓴 후기를 지운다.
  */
  it("`-1`(색인만 실패)과 `0`(어디에도 없음)을 한 통에 접지 않는다", () => {
    expect(reviewPhotoOutcome({ sent: 3, indexed: -1 })).not.toBe(
      reviewPhotoOutcome({ sent: 3, indexed: 0 }),
    )
    expect(REVIEW_PHOTO_NOTICE.INDEX_PENDING.key).not.toBe(
      REVIEW_PHOTO_NOTICE.FAILED.key,
    )
    // 사용자가 할 일이 없는 사실 통보를 빨간 오류로 띄우지 않는다.
    expect(REVIEW_PHOTO_NOTICE.INDEX_PENDING.tone).toBe("caution")
  })

  it("모르는 값을 성공으로 접지 않는다", () => {
    expect(reviewPhotoOutcome({ sent: 2, indexed: Number.NaN })).toBe("FAILED")
  })

  it("사진을 안 보냈으면 서버가 무엇을 주든 정상이다", () => {
    expect(reviewPhotoOutcome({ sent: 0, indexed: -1 })).toBe("NONE")
    expect(reviewPhotoOutcome({ sent: 0, indexed: 3 })).toBe("NONE")
  })

  /*
    두 인자가 다 `number` 였을 때는 순서가 뒤바뀌어도 tsc 가 조용했다. `(sent=3,
    indexed=0)` 이 `(0, 3)` 으로 뒤집히면 `NONE` → 성공 토스트가 되어 **원래 결함이
    그대로 재발한다.** 객체 인자로 바꾼 것이 그 방어이고, 이 검사는 위치 인자로
    되돌리면 빨개진다 — `@ts-expect-error` 가 쓸모없어지면 ts-jest 가 TS2578 로 죽는다.
  */
  it("위치 인자로는 부를 수 없다 (인자 순서가 타입에 걸린다)", () => {
    // @ts-expect-error 위치 인자 `(sent, indexed)` 로 되돌리면 이 줄이 통과해 버려 실패한다
    expect(() => reviewPhotoOutcome(3, 0)).toBeDefined()
  })

  it("결과마다 토스트 톤과 문구가 정해져 있다", () => {
    expect(REVIEW_PHOTO_NOTICE.NONE).toEqual(REVIEW_PHOTO_NOTICE.ALL)
    expect(REVIEW_PHOTO_NOTICE.ALL.tone).toBe("success")
    // 빨강은 "사진이 어디에도 없다" 하나뿐이다. 부분 저장·색인 지연을 빨간 오류로
    // 띄우면 사용자가 멀쩡한 후기를 잘못된 것으로 읽고 지운다.
    expect(
      Object.entries(REVIEW_PHOTO_NOTICE)
        .filter(([, notice]) => notice.tone === "error")
        .map(([outcome]) => outcome),
    ).toEqual(["FAILED"])
    expect(REVIEW_PHOTO_NOTICE.PARTIAL.tone).toBe("caution")
    // 일부 성공을 "저장되지 않았어요" 로 뭉개면 사용자가 후기를 지우고 처음부터 다시 쓴다.
    expect(REVIEW_PHOTO_NOTICE.PARTIAL.key).not.toBe(
      REVIEW_PHOTO_NOTICE.FAILED.key,
    )
  })
})

/* ──────────────────── 3-1. 판정 → 토스트 표면 배선 ──────────────────── */

/**
 * 표가 맞는 것과 **그 표대로 토스트가 뜨는 것**은 다른 성질이다. 표면 셋을 화면이 손으로
 * 고르던 동안 `showSuccessToast` 와 `showErrorToast` 를 **맞바꿔도** 스위트는 전부
 * 초록이었다 — 소스에 다섯 문자열이 그대로 남아 `toContain` 단언이 하나도 안 움직였다.
 * 전량 성공이 빨간 토스트로, 사진 전멸이 초록 토스트로 나가는데 아무도 말하지 않았다.
 *
 * 그래서 배선을 `reviewDraft.ts::showReviewPhotoNotice` 한 곳으로 접고, 토스트 모듈을
 * 목으로 바꿔 진리표 다섯 줄 전부에서 **어느 표면이 몇 번 떴는지**를 실행으로 확인한다.
 */
describe("판정 → 토스트 표면 배선", () => {
  beforeEach(() => {
    for (const spy of Object.values(SURFACE_SPY)) spy.mockClear()
  })

  /** 번역 대신 키·보간값을 이어 붙인다 — 문구가 표면까지 그대로 실려 가는지 함께 본다. */
  const echo = (
    key: string,
    params: { readonly indexed: number; readonly total: number },
  ): string => `${key}#${params.indexed}/${params.total}`

  it.each(TABLE)(
    "보낸 %i장 · 받은 %i → %s 의 표면 하나만 뜬다",
    (sent, indexed, outcome) => {
      showReviewPhotoNotice({ sent, indexed }, echo)
      const expected = REVIEW_PHOTO_NOTICE[outcome]
      const fired = (
        Object.keys(SURFACE_SPY) as (keyof typeof SURFACE_SPY)[]
      ).filter((tone) => SURFACE_SPY[tone].mock.calls.length > 0)
      expect(
        `${sent}/${indexed} → ${fired.join(", ") || "(아무것도 안 떴다)"}`,
      ).toBe(`${sent}/${indexed} → ${expected.tone}`)
      expect(SURFACE_SPY[expected.tone].mock.calls[0]?.[0]).toBe(
        echo(expected.key, reviewPhotoNotice({ sent, indexed }).params),
      )
    },
  )

  /*
    아래 둘이 **U8 의 스왑을 정면으로 막는다.** 이름을 따로 붙여 두는 이유는 실패 목록에
    "무엇이 사용자에게 잘못 나갔는가" 가 그대로 보이게 하기 위해서다.
  */
  it("사진 전멸(보낸 3장 · 받은 0)은 초록으로 나가지 않는다", () => {
    showReviewPhotoNotice({ sent: 3, indexed: 0 }, echo)
    expect(SURFACE_SPY.success).not.toHaveBeenCalled()
    expect(SURFACE_SPY.error).toHaveBeenCalledTimes(1)
  })

  it("전량 성공(보낸 3장 · 받은 3)은 빨강으로 나가지 않는다", () => {
    showReviewPhotoNotice({ sent: 3, indexed: 3 }, echo)
    expect(SURFACE_SPY.error).not.toHaveBeenCalled()
    expect(SURFACE_SPY.success).toHaveBeenCalledTimes(1)
  })

  it("`reviewPhotoNotice` 는 진리표와 문구표를 그대로 합친다", () => {
    for (const [sent, indexed, outcome] of TABLE) {
      const notice = reviewPhotoNotice({ sent, indexed })
      expect(`${sent}/${indexed} → ${notice.key} · ${notice.tone}`).toBe(
        `${sent}/${indexed} → ${REVIEW_PHOTO_NOTICE[outcome].key} · ${REVIEW_PHOTO_NOTICE[outcome].tone}`,
      )
    }
  })

  /*
    두 하한이 다 필요하다. 유일한 보간 단언이 `sent: 3` 하나뿐이던 동안
    `Math.max(counts.sent, 0)` 을 `counts.sent` 로 지워도 초록이었다 — 그러면 "0장 중
    -2장" 같은 말이 문구에 그대로 실린다. `indexed` 쪽 하한은 `-1`(색인 실패 신호)이
    "-1장 저장됐어요" 로 새는 것을 막는다.
  */
  it("보간값은 음수를 그대로 내보내지 않는다", () => {
    expect(reviewPhotoNotice({ sent: 3, indexed: -1 }).params).toEqual({
      indexed: 0,
      total: 3,
    })
    expect(reviewPhotoNotice({ sent: -2, indexed: -1 }).params).toEqual({
      indexed: 0,
      total: 0,
    })
  })
})

/* ──────────────────── 3-2. 화면이 그 한 줄을 실제로 지나는가 ──────────────────── */

/**
 * jest 는 `testEnvironment: "node"` 라 RN 화면을 렌더할 수 없다. 그래서 화면 쪽에서 쓸 수
 * 있는 수단은 소스뿐인데, **존재만 보는 소스 검사는 도달가능성을 못 본다** — 이 결함이 두
 * 번 살아남은 이유가 그것이다. `showReviewPhotoNotice(` 라는 문자열이 파일에 있어도 그
 * 앞에 `return` 한 줄이 있으면 영원히 안 불린다.
 *
 * 그래서 셋을 본다: (1) 인자 이름까지 맞춰 부른다, (2) 제출 성공과 후처리 **사이**에 그
 * 호출이 있고 흐름을 끊는 문장이 없다, (3) 화면에 판정도 표면 선택도 남아 있지 않다.
 */
describe("화면이 판정을 실제로 쓰는가", () => {
  it("사진 안내는 `showReviewPhotoNotice` 한 호출에서만 나온다", () => {
    const submit = submitSlice()
    expect(submit).toContain("showReviewPhotoNotice(")
    // 인자 이름까지 고정한다 — 뒤바뀌면 여기서 잡힌다.
    expect(submit).toContain("sent: objectPaths.length")
    expect(submit).toContain("indexed: photosIndexed")
    expect(submit).toContain("(key, params) => t(dynamicKey(key), params)")
  })

  /*
    **이 검사가 BLOCKER 를 닫는다.** 안내 블록 앞에 이 한 줄을 끼우면 출시됐던 결함이
    그대로 돌아온다 — sent=3·indexed=0(이 사고의 실제 응답)에서 성공 토스트가 뜨고
    사진은 사라진다:

        if (photosIndexed >= 0) { …성공 토스트…; onSubmitted?.(review); 이른 반환 }

    소스 문자열은 전부 남으므로 존재 단언은 하나도 안 움직인다. 그래서 **구간**을 본다:
    제출 성공(`await submitReview(`)과 후처리(`onSubmitted?.(review)`) 사이에 안내 호출이
    있어야 하고, 그 사이에 흐름을 끊는 문장이 있으면 안 된다. 이른 반환을 넣으면 구간이
    그 지점에서 끝나 안내 호출이 구간 밖으로 밀려나거나, 밀려나지 않으면 차단 문장이 잡힌다.
  */
  it("제출 성공 경로가 사진 안내를 건너뛸 수 없다", () => {
    const between = stripComments(
      sliceBetween(
        submitSlice(),
        "await submitReview(",
        "onSubmitted?.(review)",
      ),
    )
    expect(
      `제출~후처리 구간의 안내 호출: ${
        between.includes("showReviewPhotoNotice(") ? "있음" : "없음(건너뛴다)"
      }`,
    ).toBe("제출~후처리 구간의 안내 호출: 있음")

    const breaks = between.match(/\b(?:return|throw)\b/g) ?? []
    expect(
      `제출~후처리 사이의 흐름 차단 문장: ${breaks.join(", ") || "(없음)"}`,
    ).toBe("제출~후처리 사이의 흐름 차단 문장: (없음)")
  })

  /*
    부정 목록을 손으로 늘리는 방식(`Math.max` · `photosIndexed ===` · `photosIndexed <`)은
    `>=` · `>` · `!==` 를 빠뜨렸고, 결함은 정확히 그 빠뜨린 연산자로 복원됐다. 연산자를
    세지 말고 **화면에는 판정도 표면 선택도 없다**를 통째로 고정한다.
  */
  it("화면에는 판정도 표면 선택도 남아 있지 않다", () => {
    const submit = stripComments(submitSlice())
    const leftovers = [
      ...(submit.match(/photosIndexed\s*(?:===|!==|>=|<=|>|<)/g) ?? []),
      ...(submit.match(/Math\.max/g) ?? []),
      ...(submit.match(/show(?:Success|Caution|Error)Toast/g) ?? []),
      ...(submit.match(/notice\.tone/g) ?? []),
    ]
    expect(
      `화면에 남은 판정·표면 코드: ${leftovers.join(", ") || "(없음)"}`,
    ).toBe("화면에 남은 판정·표면 코드: (없음)")
  })

  it("화면은 토스트 표면을 아예 들여오지 않는다", () => {
    const screen = stripComments(
      readApp("src/features/restaurant/views/ReviewWriteScreen.tsx"),
    )
    expect(
      `화면의 토스트 import: ${screen.includes("lib/toast") ? "있음" : "없음"}`,
    ).toBe("화면의 토스트 import: 없음")
  })
})

/* ──────────────────── 4. 문구 ──────────────────── */

describe("사진 결과 문구", () => {
  const form = { ko: ko.restaurant.review.form, en: en.restaurant.review.form }

  it("ko·en 양쪽에 결과 문구가 다 있다", () => {
    for (const locale of ["ko", "en"] as const) {
      const table = form[locale] as Record<string, string | undefined>
      for (const outcome of Object.keys(
        REVIEW_PHOTO_NOTICE,
      ) as ReviewPhotoOutcome[]) {
        const leaf = REVIEW_PHOTO_NOTICE[outcome].key.replace(
          "restaurant.review.form.",
          "",
        )
        expect(`${locale}.${leaf}: ${table[leaf] ?? "(없음)"}`).not.toContain(
          "(없음)",
        )
      }
    }
  })

  /*
    **시간 약속 금지.** 문구는 한때 "사진은 잠시 뒤 사진 탭에 보여요" 였는데, `-1` 인
    사진은 사진 탭에 **영원히** 안 뜬다 — 서버에 재시도·아웃박스·크론이 하나도 없다
    (`reviewDraft.ts::ReviewPhotoOutcome` 머리말의 실측: `insert into restaurant_photo`
    한 곳 · 호출부 한 곳 · catch 에 큐 없음 · 사진 목록은 `restaurant_photo` 만 읽음).
    사용자는 사진 탭을 열어 보고, 없고, 또 열어 보고, 없다. 거짓말을 다른 거짓말로
    바꾼 것이라 같은 말이 다시 들어오는 것을 막는다 — 아는 사실만 말할 것.
  */
  it("사진 결과 문구는 시간을 약속하지 않는다", () => {
    const TIME_PROMISES = [
      /잠시\s*(?:뒤|후)/,
      /조금\s*(?:뒤|후)/,
      /이따/,
      /나중에/,
      /곧/,
      /반영\s*(?:돼|될|됩)/,
      /shortly/i,
      /\bsoon\b/i,
      /\blater\b/i,
      /in a (?:few|moment|minute)/i,
      /\bwill (?:appear|show|be)\b/i,
    ]
    for (const locale of ["ko", "en"] as const) {
      const table = form[locale] as Record<string, string | undefined>
      for (const outcome of Object.keys(
        REVIEW_PHOTO_NOTICE,
      ) as ReviewPhotoOutcome[]) {
        const leaf = REVIEW_PHOTO_NOTICE[outcome].key.replace(
          "restaurant.review.form.",
          "",
        )
        const text = table[leaf] ?? ""
        const promises = TIME_PROMISES.filter((rule) => rule.test(text)).map(
          (rule) => rule.source,
        )
        expect(
          `${locale}.${leaf} 의 시간 약속: ${promises.join(", ") || "(없음)"}`,
        ).toBe(`${locale}.${leaf} 의 시간 약속: (없음)`)
      }
    }
  })

  it("부분 성공 문구는 몇 장이 남았는지 말한다", () => {
    for (const locale of ["ko", "en"] as const) {
      const text = form[locale].donePhotosPartial
      expect(text).toContain("{{indexed}}")
      expect(text).toContain("{{total}}")
    }
  })
})

/* ──────────────────── 5. 대조 장치 자체 ──────────────────── */

/**
 * **이 블록이 없으면 위의 전부를 믿을 수 없다.** 지난 실패가 "테스트는 초록인데 사진은
 * 사라져 있었다" 였으므로, 대조 장치가 실제로 **실패할 수 있다**는 것을 사고 그대로
 * 재현해서 증명한다.
 */
describe("대조 장치가 실제로 드리프트를 잡는가", () => {
  it("옛 이름(`imageUrls`)으로 되돌리면 실패한다", () => {
    const { imageObjectPaths, ...rest } = reviewSubmitBody(SCREEN_PAYLOAD)
    expect(() =>
      expectBodyKeysMatchServer(
        { ...rest, imageUrls: imageObjectPaths },
        "되돌린 본문",
      ),
    ).toThrow(/imageUrls/)
  })

  it("서버가 요구하는 키를 빼면 실패한다", () => {
    const { rating: _dropped, ...withoutRating } =
      reviewSubmitBody(SCREEN_PAYLOAD)
    expect(() =>
      expectBodyKeysMatchServer(withoutRating, "rating 없는 본문"),
    ).toThrow(/rating/)
  })

  it("서버 스키마를 실제로 파싱했다 (빈 표로 통과할 수 없다)", () => {
    expect(SERVER_FIELDS.size).toBeGreaterThan(0)
    expect(SERVER_FIELDS.get("imageObjectPaths")).toBe("optional")
    expect(SERVER_FIELDS.get("rating")).toBe("required")
  })
})
