/**
 * **확인창을 그릴 수 없는 갈래에서 초안 가드가 서 있는가** — 나갈 문이 사라지는 함정.
 *
 * ## 실측된 결함 (`app/(write)/free/[id].tsx`)
 *
 * 이 화면의 `usePreventRemove(hasChanges, …)` 콜백이 하는 일은 딱 하나,
 * `setConfirmExitVisible(true)` 다. 그런데 `<ConfirmExitModal>` 은 파일 맨 아래 —
 * **이른 반환 네 개보다 밑**에 있다. 그래서 실패 갈래(`failure != null`)나 남의 글
 * 갈래(`isForeignPost`)를 그리는 동안에는 가드가 이탈을 **취소만 하고 아무것도 띄우지
 * 않는다.** 재현은 이렇다:
 *
 * 1. 내 글의 제목을 고친다 → `hasChanges === true`.
 * 2. 그 사이 글이 지워진다. 저장 → `COMMUNITY_ERROR_001` → `setGoneError`.
 *    refetch 는 **일부러 부르지 않으므로** react-query 의 `post` 는 캐시에 그대로
 *    남고 `hasChanges` 도 계속 true 다.
 * 3. 화면은 실패 갈래(`EditorStateScreen`)로 바뀐다. 나갈 길은 그 안의 뒤로가기 하나.
 * 4. 누른다 → 가드가 잡는다 → 확인창은 렌더 트리에 없다 → **아무 일도 안 일어난다.**
 * 5. 안드로이드 하드웨어 백도 같은 길이고, iOS 엣지 스와이프는 `(write)/_layout.tsx`
 *    가 이미 꺼 두었다. **앱을 강제 종료하는 것 말고 나갈 방법이 없다.**
 *
 * 여기에 `useGoBack` 의 빗장까지 겹쳐 첫 탭 이후로는 뒤로가기 자체가 죽어 있었다 —
 * 그 반쪽은 `tests/goBackLatchRelease.test.ts` 가 본다.
 *
 * ## 무엇을 고정하나
 *
 * 처방은 **확인창을 옮기는 것이 아니라 물어볼 수 없을 때 가드를 내리는 것**이다
 * (이른 반환들은 각자 옳은 화면을 그리고 있고, 그 안에 확인창을 끼워 넣으면 실패
 * 화면 위에 "쓰던 걸 두고 나갈까요" 가 뜬다). 그래서 이 테스트는 소스에서
 * `hasChanges` 식을 **꺼내 실제로 계산한다** — "그 코드가 있다" 가 아니라
 * "그 상태에서 false 다" 를 본다.
 *
 * 그리고 이른 반환 **목록을 세어 둔다.** 다섯 번째 갈래가 생기면 이 테스트가 먼저
 * 깨져서, 새 갈래도 `hasChanges` 에 넣을지 한 번은 정하게 된다.
 *
 * ## 왜 렌더가 아니라 소스인가
 *
 * 이 스위트에는 렌더러가 없고(`tests/helpers/hookHarness.ts` 머리말) `expo-router`
 * 화면을 띄울 방법도 없다. 그렇다고 같은 식을 테스트에 다시 쓰면 사본을 검사하는
 * 꼴이라 원본이 바뀌어도 초록으로 남는다 — 그래서 **원본의 식을 그대로 실행한다.**
 */
import fs from "node:fs"
import path from "node:path"

import { codeOnly } from "./helpers/codeOnly"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return codeOnly(fs.readFileSync(path.join(ROOT, relative), "utf8"))
}

const EDIT_FILE = "app/(write)/free/[id].tsx"
const EDIT = read(EDIT_FILE)

/* ── 소스에서 식을 꺼낸다 ────────────────────────────────────────────────── */

/**
 * 컴포넌트 본문의 문장 하나를 통째로 꺼낸다.
 *
 * prettier 가 컴포넌트 본문을 2칸, 이어지는 줄을 4칸 이상으로 들여쓴다는 사실에
 * 기댄다 — 문장은 `  const x =` 로 시작해서 4칸 이상 들여쓴 줄이 끝나는 데서 끝난다.
 */
function statement(source: string, header: string): string {
  const lines = source.split("\n")
  const start = lines.findIndex((line) => line.trimEnd() === `  ${header}`)
  if (start < 0) throw new Error(`문장을 찾지 못했다: ${header}`)
  const body = [lines[start]]
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!/^ {4,}\S/u.test(lines[i])) break
    body.push(lines[i])
  }
  return body.join("\n")
}

/** 계산에 필요한 바깥 값들 — 이 이름들은 테스트가 넣어 준다(= 화면의 상태). */
const INPUTS = [
  "post",
  "images",
  "tags",
  "title",
  "body",
  "selectedCategory",
  "initialized",
  "goneError",
  "isForeignPost",
] as const

/** 이 이름이 컴포넌트 본문의 (여러 줄짜리) `const` 문장으로 선언돼 있는가. */
function isLocalStatement(source: string, name: string): boolean {
  return source
    .split("\n")
    .some((line) => line.trimEnd() === `  const ${name} =`)
}

/**
 * `hasChanges` 와 **그것이 기대는 지역 상수들**을 원본 그대로 들고 온다.
 *
 * 이름을 박아 두지 않고 식에서 참조를 따라간다 — 지금은 `imagesChanged`·
 * `tagsChanged`·`canAskBeforeLeaving` 이지만, 인라인으로 접어도 이름을 바꿔도
 * 이 테스트는 그대로 돈다. 못 찾으면 `new Function` 이 ReferenceError 로 죽는다
 * (아래 첫 테스트가 그것을 잡는다) — 조용히 빈 식을 계산해서 통과하지 않는다.
 */
function collect(source: string, name: string, seen: Set<string>): string[] {
  if (seen.has(name)) return []
  seen.add(name)
  const text = statement(source, `const ${name} =`)
  const referenced = [
    ...new Set([...text.matchAll(/\b([A-Za-z_$][\w$]*)\b/gu)].map((m) => m[1])),
  ].filter(
    (ref) =>
      ref !== name &&
      !INPUTS.includes(ref as (typeof INPUTS)[number]) &&
      isLocalStatement(source, ref),
  )
  return [...referenced.flatMap((ref) => collect(source, ref, seen)), text]
}

function buildHasChanges() {
  const parts = collect(EDIT, "hasChanges", new Set())

  const fn = new Function(
    ...INPUTS,
    `${parts.join("\n")}\nreturn hasChanges`,
  ) as unknown as (...values: unknown[]) => boolean

  return (state: EditorState) => fn(...INPUTS.map((key) => state[key]))
}

interface EditorState {
  post: {
    title: string
    description: string
    category: string
    imageObjectPaths: string[]
    tags: string[]
  } | null
  images: { objectPath?: string }[]
  tags: string[]
  title: string
  body: string
  selectedCategory: string
  initialized: boolean
  goneError: unknown
  isForeignPost: boolean
  [key: string]: unknown
}

const POST = {
  title: "원래 제목",
  description: "원래 본문",
  category: "daily",
  imageObjectPaths: ["community/a.jpg"],
  tags: ["신장"],
}

/** 제목만 고친 상태 — 편집기가 정상으로 떠 있고 두고 나갈 것이 있다. */
function editing(overrides: Partial<EditorState> = {}): EditorState {
  return {
    post: POST,
    images: [{ objectPath: "community/a.jpg" }],
    tags: [...POST.tags],
    title: "고친 제목",
    body: POST.description,
    selectedCategory: POST.category,
    initialized: true,
    goneError: null,
    isForeignPost: false,
    ...overrides,
  }
}

const hasChanges = buildHasChanges()

/* ── 이른 반환 목록 ──────────────────────────────────────────────────────── */

/**
 * 컴포넌트 본문(2칸 들여쓰기)의 조건부 이른 반환.
 *
 * 같은 파일의 헬퍼 컴포넌트(`KeyboardDismissButton` 의 `if (!isKeyboardVisible)`)도
 * 2칸이라, 화면 컴포넌트가 시작하는 곳부터 본다.
 */
function earlyReturnConditions(
  source: string,
  from: number,
  before: number,
): string[] {
  return [
    ...source
      .slice(from, before)
      .matchAll(/^ {2}if \((.+?)\)\s*(?:\{|return)/gmu),
  ].map((match) => match[1])
}

const SCREEN_AT = EDIT.indexOf("export default function")
const MODAL_AT = EDIT.indexOf("<ConfirmExitModal")

/**
 * 확인창보다 앞에 서는 이른 반환들과, 그 갈래를 그리게 하는 상태.
 *
 * 여기 적힌 조건이 하나라도 `hasChanges` 를 내리지 못하면 그 갈래에서 화면이 갇힌다.
 */
const BLOCKED = [
  {
    condition: "failure != null",
    why: "저장 중 글이 지워졌다 (COMMUNITY_ERROR_001)",
    state: editing({ goneError: { code: "COMMUNITY_ERROR_001" } }),
  },
  {
    condition: "isLoading",
    why: "아직 글이 오지 않았다",
    state: editing({ post: null, initialized: false }),
  },
  {
    condition: "!post",
    why: "없는 글의 딥링크",
    state: editing({ post: null }),
  },
  {
    condition: "isForeignPost",
    why: "캐시 패치로 isMine 이 사라져 남의 글로 판정됐다",
    state: editing({ isForeignPost: true }),
  },
] as const

describe("자유글 수정 — 확인창을 못 그리는 갈래에서는 가드를 내린다", () => {
  it("검사가 실제로 식을 들고 왔다", () => {
    // 식을 못 꺼낸 채 전부 false 를 돌려주며 통과하는 것을 막는다.
    expect(hasChanges(editing())).toBe(true)
    expect(hasChanges(editing({ title: POST.title }))).toBe(false)
  })

  it("편집기가 떠 있으면 바뀐 칸마다 가드가 선다", () => {
    expect(hasChanges(editing({ body: "고친 본문", title: POST.title }))).toBe(
      true,
    )
    expect(
      hasChanges(editing({ selectedCategory: "diet", title: POST.title })),
    ).toBe(true)
    expect(hasChanges(editing({ images: [], title: POST.title }))).toBe(true)
    expect(hasChanges(editing({ tags: [], title: POST.title }))).toBe(true)
  })

  it.each(BLOCKED)(
    "`$condition` 갈래에서는 가드가 내려간다 — $why",
    ({ state }) => {
      expect(hasChanges(state)).toBe(false)
    },
  )

  it("이른 반환 목록이 그대로다 — 갈래가 늘면 여기서 먼저 깨진다", () => {
    expect(SCREEN_AT).toBeGreaterThan(0)
    expect(MODAL_AT).toBeGreaterThan(SCREEN_AT)
    expect(earlyReturnConditions(EDIT, SCREEN_AT, MODAL_AT)).toEqual(
      BLOCKED.map((entry) => entry.condition),
    )
  })

  it("확인창은 여전히 그 이른 반환들보다 **뒤**에 있다 (함정의 모양)", () => {
    // 고친 것은 확인창의 위치가 아니라 가드의 조건이다. 확인창이 앞으로 올라와도
    // 이 테스트는 깨지는데, 그때는 위의 목록 검사도 함께 다시 봐야 한다.
    const guardAt = EDIT.indexOf("usePreventRemove(")
    const firstEarlyReturn = EDIT.search(/^ {2}if \(failure != null\)/mu)
    expect(guardAt).toBeLessThan(firstEarlyReturn)
    expect(firstEarlyReturn).toBeLessThan(MODAL_AT)
  })

  it("가드 콜백이 하는 일은 확인창을 여는 것뿐이다 — 그래서 위 결합이 성립한다", () => {
    const callback = EDIT.slice(
      EDIT.indexOf("usePreventRemove("),
      EDIT.indexOf("<ConfirmExitModal"),
    )
    const body = callback.slice(0, callback.indexOf("\n  })"))
    expect(body).toContain("setConfirmExitVisible(true)")
    // 확인창 말고 다른 탈출구(직접 pop)는 없다 — 있다면 갇히지 않았을 것이다.
    expect(body).not.toContain("router.back()")
  })
})

describe("나머지 작성 화면 셋 — 같은 함정이 없다", () => {
  const RENDERED_CONFIRM = [
    "src/features/recipe/components/FreePostEditor.tsx",
    "src/features/recipe/views/RecipeWriteScreen.tsx",
  ]

  it.each(RENDERED_CONFIRM)("%s 는 가드와 확인창 사이가 비어 있다", (file) => {
    const source = read(file)
    const guardAt = source.indexOf("usePreventRemove(")
    const modalAt = source.indexOf("<ConfirmExitModal")
    expect(guardAt).toBeGreaterThan(0)
    expect(modalAt).toBeGreaterThan(guardAt)

    const between = source.slice(guardAt, modalAt)
    // 컴포넌트 본문(2칸)의 조건부 반환이 하나라도 있으면 그 갈래에서 확인창이 사라진다.
    expect([
      ...between.matchAll(/^ {2}if \((.+?)\)\s*(?:\{|return)/gmu),
    ]).toEqual([])
  })

  it("story/new 의 확인창은 렌더 트리에 없다 — 이른 반환에 걸릴 수 없다", () => {
    const story = read("app/(write)/story/new.tsx")
    expect(story).not.toContain("<ConfirmExitModal")
    // 가드가 ✕ 와 **같은** 함수를 부르고, 그 함수가 다이얼로그를 명령형으로 띄운다.
    expect(story).toMatch(
      /usePreventRemove\(hasDraft[\s\S]{0,200}handleClose\(\)/u,
    )
    expect(story).toMatch(
      /const handleClose = async \(\)[\s\S]{0,400}showConfirm\(\{/u,
    )
  })
})
