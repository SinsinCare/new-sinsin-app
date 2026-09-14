/**
 * `app/(write)/` 두 라우트의 계약. 넷 다 **딥링크나 시간이 만드는** 상태라
 * 손으로 재현하기 어렵고, 넷 다 화면에는 아무 오류도 나지 않는다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 1. 자유글 수정 — 영원한 스켈레톤 (`free/[id].tsx`)
 *
 * 종전 한 줄: `if (isLoading || !post || isForeignPost) return <ArticleSkeleton/>`.
 * `sinsin:///free/999999` 로 들어오면 조회는 **실패로 끝나므로** `isLoading` 은
 * false, `post` 는 null — 헤더도 뒤로가기도 없는 회색 뼈대만 남고 그 화면에서
 * 나갈 방법이 없다. 상세(`src/features/recipe/views/PostDetailScreen.tsx`)가 이미 쓰는 세 갈래로 나눈다.
 *
 * ■ 2. 자유글 수정 — 지워진 글의 유령 편집기
 *
 * 저장 순간 서버가 `COMMUNITY_ERROR_001`("이 글은 사라졌어요")을 주면 토스트는
 * 맞지만, 함께 넘긴 `refresh: refetch` 도 같은 404 를 받고 react-query 는 **직전
 * `data` 를 그대로 들고 있다.** 그래서 `post` 가 계속 truthy 라 편집기가 남고,
 * 사용자는 `저장` 을 몇 번이고 누를 수 있었다.
 *
 * ■ 3. 자유글 수정 — 작성 화면과 갈라진 경계 규칙
 *
 * 작성은 본문 700자 + 카운터인데 수정에는 상한도 카운터도 없었다. 서버는
 * 20,000 까지 받으므로, 그 사이 구간은 **작성으로는 만들 수 없는데 수정으로는
 * 조용히 만들어지는** 글이다.
 *
 * ■ 4. 스토리 작성기 — 마운트 시각에 얼어붙은 "오늘"
 *
 * `useMemo(() => new Date(), [])`. 작성기를 열어 둔 채 자정을 넘기면 어제 먹은
 * 사진에 계속 `오늘` 이 붙는다. 스토리는 하루만 사는 글이라 날짜가 곧 의미다.
 *
 * ■ 왜 소스를 훑나
 *
 * 이 저장소에는 렌더러가 없고(`tests/helpers/hookHarness.ts` 머리말), 그 하네스도
 * `useEffect` 를 쓰는 훅은 일부러 돌리지 않는다. 넷 다 "무엇을 그리는가/언제 다시
 * 재는가" 라 타입 검사도 린트도 볼 수 없다 — `navigationBackGuard.test.ts` 와 같은
 * 처방이다. 주석은 결함의 코드 모양을 그대로 인용하므로 `codeOnly` 로 걷어낸다.
 */
import fs from "node:fs"
import path from "node:path"

import { codeOnly } from "./helpers/codeOnly"
import { hasCommonKeyInBothLocales } from "./helpers/i18nResourceKeys"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return codeOnly(fs.readFileSync(path.join(ROOT, relative), "utf8"))
}

const EDIT = read("src/features/recipe/views/FreePostEditScreen.tsx")
const CREATE = read("src/features/recipe/components/FreePostEditor.tsx")
const STORY = read("app/(write)/story/new.tsx")

describe("자유글 수정 — 화면 상태 세 갈래", () => {
  it("로딩·없음·실패를 한 줄로 뭉치지 않는다", () => {
    expect(EDIT).not.toMatch(/if \(isLoading \|\| !post \|\| isForeignPost\)/u)
  })

  it("조회 실패는 실패로 그린다", () => {
    expect(EDIT).toMatch(/isError && !post/u)
    expect(EDIT).toMatch(/resolveError\(failure\)/u)
    expect(EDIT).toMatch(/<ErrorMessage/u)
  })

  it("다시 시도는 retryable 일 때만 준다 (없는 글은 몇 번을 눌러도 없다)", () => {
    expect(EDIT).toMatch(
      /onRetry=\{resolved\.retryable \? \(\) => void refetch\(\) : undefined\}/u,
    )
  })

  it("글이 없으면 없다고 말한다", () => {
    expect(EDIT).toMatch(/if \(!post\) \{/u)
    expect(EDIT).toMatch(/community\.postDetail\.notFound/u)
    /*
      이 화면은 `recipe` 네임스페이스를 들고 있어 그 문구만 `common` 에서 꺼내 쓴다
      (`{ ns: "common" }`). 이 라우트는 `i18nKeyExistence.test.ts` 의 스캔 범위 밖이라
      키가 없어져도 아무도 안 잡는다 — 화면에 키 문자열이 그대로 찍힌다.
    */
    expect(hasCommonKeyInBothLocales("community.postDetail.notFound")).toBe(
      true,
    )
  })

  it("어느 갈래에도 나갈 문이 있다", () => {
    // 상태 화면은 전부 이 그릇을 쓰고, 그릇이 뒤로가기를 단다.
    expect(EDIT).toMatch(/function EditorStateScreen\(/u)
    expect(EDIT).toMatch(/router\.back\(\)[\s\S]{0,400}action\.back/u)
    expect((EDIT.match(/<EditorStateScreen>/gu) ?? []).length).toBe(2)
  })

  it("로딩은 여전히 스켈레톤이다 (링 스피너 금지)", () => {
    expect(EDIT).toMatch(
      /if \(isLoading\) return <ArticleSkeleton variant="editor" \/>/u,
    )
  })
})

describe("자유글 수정 — 지워진 글", () => {
  it("서버 코드로 판정한다", () => {
    expect(EDIT).toMatch(/const POST_GONE_CODE = "COMMUNITY_ERROR_001"/u)
    expect(EDIT).toMatch(/resolveError\(saveError\)\.code === POST_GONE_CODE/u)
  })

  it("편집기를 떠난다 — 유령 글에 저장을 누를 수 없다", () => {
    expect(EDIT).toMatch(/if \(isGone\) setGoneError\(saveError\)/u)
    // 실패 갈래는 `post` 가 살아 있어도 이긴다.
    expect(EDIT).toMatch(
      /const failure = goneError \?\? \(isError && !post \? error : null\)/u,
    )
  })

  it("지워진 글에는 새로고침 버튼을 주지 않는다 (다시 받아도 404다)", () => {
    expect(EDIT).toMatch(
      /\.\.\.\(isGone \? \{\} : \{ refresh: \(\) => void refetch\(\) \}\)/u,
    )
  })
})

describe("자유글 수정 — 작성 화면과 같은 경계", () => {
  /** 작성 화면의 본문 입력에 붙은 `maxLength`. 두 벌이 갈라지면 여기가 먼저 깨진다. */
  function createBodyLimit(): number {
    const body = CREATE.slice(CREATE.indexOf("value={body}"))
    const match = /maxLength=\{(\d+)\}/u.exec(body)
    if (!match) throw new Error("작성 화면 본문의 maxLength 를 찾지 못했다")
    return Number(match[1])
  }

  it("본문 상한이 작성 화면과 같다", () => {
    const match = /const MAX_BODY_LENGTH = (\d+)/u.exec(EDIT)
    expect(match).not.toBeNull()
    expect(Number(match?.[1])).toBe(createBodyLimit())
  })

  it("상한을 본문 입력에 실제로 건다", () => {
    const body = EDIT.slice(EDIT.indexOf("value={body}"))
    expect(body).toMatch(/maxLength=\{MAX_BODY_LENGTH\}/u)
  })

  it("카운터가 있다 (다 채우기 전에 상한을 말한다)", () => {
    expect(EDIT).toMatch(/\{body\.length\}\/\{MAX_BODY_LENGTH\}/u)
  })
})

describe("스토리 작성기 — 오늘", () => {
  it("마운트 시각에 얼려 두지 않는다", () => {
    expect(STORY).not.toMatch(/useMemo\(\(\) => new Date\(\), \[\]\)/u)
  })

  it("앱이 다시 앞으로 나오면 다시 잰다", () => {
    expect(STORY).toMatch(/AppState\.addEventListener\("change"/u)
    expect(STORY).toMatch(/status === "active"/u)
  })

  it("앱을 켜 둔 채 자정을 넘겨도 다시 잰다", () => {
    expect(STORY).toMatch(/const nextMidnight = new Date\(day\)/u)
    expect(STORY).toMatch(
      /nextMidnight\.setDate\(nextMidnight\.getDate\(\) \+ 1\)/u,
    )
    expect(STORY).toMatch(/setTimeout\(\s*sync,/u)
    // 타이머는 `day` 가 바뀔 때마다 다시 걸려야 한다(하루치만 잡으므로).
    expect(STORY).toMatch(/\}, \[day\]\)/u)
  })

  it("같은 날이면 상태를 바꾸지 않는다 (재조회 폭풍 방지)", () => {
    expect(STORY).toMatch(
      /setDay\(\(prev\) => \(prev\.getTime\(\) === now\.getTime\(\) \? prev : now\)\)/u,
    )
  })

  it("어제는 오늘에서 나온다 — 둘이 따로 움직이면 하루가 겹치거나 빈다", () => {
    expect(STORY).toMatch(
      /const yesterday = useMemo\(\(\) => \{[\s\S]{0,200}new Date\(today\)[\s\S]{0,200}\}, \[today\]\)/u,
    )
  })
})
