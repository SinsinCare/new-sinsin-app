/**
 * **차단 필터의 축이 닉네임에서 사람 id 로 옮겨졌는가** (서버 alembic 088 의 앱 쪽 후속).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 무엇이 문제였나
 *
 * 서버는 차단을 `user_block.blocked_user_id` 로 걸고 커뮤니티 목록을 그 id 로 거른다.
 * 앱에는 그 서버 필터가 도착하기 전 **한 박자**를 메우는 클라이언트 필터가 따로 있는데,
 * 그쪽만 아직 `blockedNickNames.includes(post.authorName)` 였다. 닉네임은 신원이 아니라
 * **표시용 라벨**이고 `PATCH /user/profile` 로 쿨다운 없이 바뀐다. 그래서:
 *
 *  - 차단당한 사람이 개명하면 저장된 라벨이 낡는다 → **차단 회피**.
 *  - 비어 버린 그 닉네임을 제3자가 가져가면 → **아무 잘못 없는 제3자의 글이
 *    차단한 사람의 기기에서만 사라진다**(차단의 승계). 탈퇴가 닉네임을 비우므로
 *    흔한 경로다.
 *
 * 서버는 이미 그러지 않는다. 이 검사는 앱이 같은 판정을 하는지를 못 박는다.
 *
 * ■ 어떻게 재는가
 *
 * 판정 자체(`isAuthorBlocked`)는 순수 함수라 그대로 부른다. **옛 규칙을 이 파일 안에
 * 그대로 적어 두고**(`legacyVisible`) 새 규칙과 나란히 재는 것이 핵심이다 —
 * "무엇이 바뀌었고 무엇이 바뀌면 안 되는지" 를 한 표에서 보여 준다. 탈퇴 글쓴이는
 * **바뀌면 안 되는 쪽**이라 두 규칙의 답이 같아야 하고, 제3자 승계는 **바뀌어야 하는
 * 쪽**이라 달라야 한다.
 *
 * 훅(`useBlockedUsers`)은 `react-dom/server` 로 한 번 렌더해 붙잡는다
 * (`communityStoryBlockReach.test.ts` 와 같은 처방 — 이 저장소에는 RN 렌더러가 없다).
 * 화면 파일은 그릴 방법이 없으므로 **주석을 걷어낸 소스**의 배선을 본다.
 */
/* eslint-disable import/first */
jest.mock("../src/services/blockService", () => ({
  blockService: {
    getBlockedUsers: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
  },
}))
jest.mock("../src/features/recipe/services/communityPostService", () => ({
  communityPostService: { getPosts: jest.fn(), getComments: jest.fn() },
}))
jest.mock("../src/features/recipe/services/communityStoryService", () => ({
  communityStoryService: { getStories: jest.fn() },
}))

import fs from "fs"
import path from "path"
import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { blockService, type BlockedUser } from "@/src/services/blockService"
import {
  BLOCKED_KEY,
  isAuthorBlocked,
  toBlockedAuthors,
  useBlockedUsers,
  type BlockedAuthors,
} from "@/src/features/recipe/hooks/useBlockedUsers"
import {
  WITHDRAWN_AUTHOR_NAME,
  isWithdrawnAuthor,
} from "@/src/features/recipe/utils/contentOwnership"

// @types/react-dom 이 없어 타입 선언만 require 로 우회한다. 런타임은 정식 빌드 그대로다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string
}

const getBlockedUsers = blockService.getBlockedUsers as jest.Mock

/* ─────────────────────── 표본 ─────────────────────── */

/** 내가 차단한 사람. 서버가 차단 시점에 id 를 풀어 두었다. */
const BLOCKED_ID = 42
const BLOCKED_NAME_AT_BLOCK_TIME = "차단대상"

/** 차단 목록 한 줄 만들기. */
function row(over: Partial<BlockedUser> = {}): BlockedUser {
  return {
    id: 1,
    blockedNickName: BLOCKED_NAME_AT_BLOCK_TIME,
    blockedUserId: BLOCKED_ID,
    createdAt: "2026-08-20T00:00:00",
    ...over,
  }
}

/** 글 한 줄 만들기(글·스토리 공통으로 필요한 두 칸만). */
function post(authorId: number | null | undefined, authorName: string) {
  return { authorId, authorName }
}

/**
 * **옛 규칙 그대로.** 화면들이 쓰던 식(`isWithdrawnAuthor(p) || !names.includes(...)`)을
 * 글자 그대로 옮겨 둔다 — 새 규칙과 나란히 놓고 무엇이 바뀌었는지 보기 위해서다.
 */
function legacyVisible(
  names: readonly string[],
  p: { authorId?: number | null; authorName: string },
): boolean {
  return isWithdrawnAuthor(p) || !names.includes(p.authorName)
}

/** 지금 규칙 그대로(화면 네 곳이 쓰는 식). */
function currentVisible(
  blocked: BlockedAuthors,
  p: { authorId?: number | null; authorName: string },
): boolean {
  return isWithdrawnAuthor(p) || !isAuthorBlocked(blocked, p)
}

/* ─────────────────────── 축 나누기 ─────────────────────── */

describe("차단 목록을 두 축으로 나눈다", () => {
  it("id 가 풀린 행은 id 축으로, 못 푼 행은 이름 축으로 간다", () => {
    const blocked = toBlockedAuthors([
      row(),
      row({ id: 2, blockedNickName: "구서버행", blockedUserId: null }),
    ])
    expect([...blocked.ids]).toEqual([BLOCKED_ID])
    expect([...blocked.unresolvedNames]).toEqual(["구서버행"])
  })

  it("필드가 아예 없는 응답(옛 서버)도 `못 풀었다` 로 읽는다 — 이름 축으로 간다", () => {
    // 이 앱이 서버보다 먼저 나가는 배포 순서에서 실제로 오는 모양이다.
    const legacyRow = { id: 3, blockedNickName: "옛서버행", createdAt: "" }
    const blocked = toBlockedAuthors([legacyRow])
    expect([...blocked.ids]).toEqual([])
    expect([...blocked.unresolvedNames]).toEqual(["옛서버행"])
  })

  it("빈 목록은 아무도 접지 않는다 — `모른다` 를 `숨긴다` 로 바꾸지 않는다", () => {
    const blocked = toBlockedAuthors([])
    expect(
      isAuthorBlocked(blocked, post(BLOCKED_ID, BLOCKED_NAME_AT_BLOCK_TIME)),
    ).toBe(false)
  })
})

/* ─────────────────────── 축이 옮겨졌는가 ─────────────────────── */

describe("판정은 사람 id 로 한다", () => {
  const blocked = toBlockedAuthors([row()])

  it("차단한 사람의 글은 접는다 (이름이 그대로일 때)", () => {
    expect(
      currentVisible(blocked, post(BLOCKED_ID, BLOCKED_NAME_AT_BLOCK_TIME)),
    ).toBe(false)
  })

  it("차단한 사람이 **개명해도** 접는다 — 옛 규칙은 놓치던 자리(차단 회피)", () => {
    const renamed = post(BLOCKED_ID, "새이름으로바꿈")
    expect(currentVisible(blocked, renamed)).toBe(false)
    // 옛 규칙은 라벨이 낡아 그대로 보여 줬다.
    expect(legacyVisible([BLOCKED_NAME_AT_BLOCK_TIME], renamed)).toBe(true)
  })

  it("**비어 버린 닉네임을 가져간 제3자는 접지 않는다** — 이 결함을 지우려고 옮겼다", () => {
    // 차단당한 42번이 개명해 '차단대상' 이 비었고, 아무 상관 없는 99번이 그 이름을 썼다.
    const thirdParty = post(99, BLOCKED_NAME_AT_BLOCK_TIME)
    expect(currentVisible(blocked, thirdParty)).toBe(true)
    // 옛 규칙은 이 사람의 글을 **차단한 사람의 기기에서만** 숨겼다. 서버는 안 그런다.
    expect(legacyVisible([BLOCKED_NAME_AT_BLOCK_TIME], thirdParty)).toBe(false)
  })

  it("id 가 다르면 이름이 같아도 서로 영향이 없다 (동명이인)", () => {
    expect(currentVisible(blocked, post(7, BLOCKED_NAME_AT_BLOCK_TIME))).toBe(
      true,
    )
  })
})

describe("풀리지 않은 행은 예전처럼 이름으로 거른다 (버리지 않는다)", () => {
  const blocked = toBlockedAuthors([
    row({ blockedNickName: "구서버가쓴행", blockedUserId: null }),
  ])

  it("이름이 같으면 접는다 — 088 이전에 가려지던 것이 갑자기 보이면 안 된다", () => {
    expect(currentVisible(blocked, post(123, "구서버가쓴행"))).toBe(false)
  })

  it("그 행의 한계(승계)는 그대로 진다 — 서버와 같은 동작이다", () => {
    // 서버도 이 행만은 이름으로 거른다. 앱만 다르게 굴면 두 필터가 갈라진다.
    expect(currentVisible(blocked, post(999, "구서버가쓴행"))).toBe(false)
  })
})

/* ─────────────────────── SQL 이 밟았던 함정 ─────────────────────── */

describe("`authorId` 를 모르면 **차단 아님** 이다 (숨김 아님)", () => {
  const blocked = toBlockedAuthors([row()])

  it("`authorId === null` 은 id 축에서 아무것도 아니다", () => {
    // `NOT IN` 에 NULL 이 섞이면 한 행도 안 남는 그 함정. 모르는 것을 숨기면
    // 남의 글이 조용히 사라진다.
    expect(isAuthorBlocked(blocked, post(null, "누군가"))).toBe(false)
  })

  it("`authorId === undefined`(옛 응답)도 마찬가지다", () => {
    expect(isAuthorBlocked(blocked, post(undefined, "누군가"))).toBe(false)
  })

  it("id 를 몰라도 **이름 축의 차단은 살아 있다** — 조건을 통째로 끄지 않았다", () => {
    const byName = toBlockedAuthors([row({ blockedUserId: null })])
    expect(
      isAuthorBlocked(byName, post(null, BLOCKED_NAME_AT_BLOCK_TIME)),
    ).toBe(true)
  })
})

/* ─────────────────────── 탈퇴 글쓴이: 바뀌면 안 되는 쪽 ─────────────────────── */

describe("탈퇴한 글쓴이의 면제는 **전과 똑같다**", () => {
  /** 탈퇴 익명화: 서버가 `author_id = NULL`, `author_name = '탈퇴한 사용자'` 로 만든다. */
  const withdrawn = post(null, WITHDRAWN_AUTHOR_NAME)
  /** 이름만 탈퇴 표기인 경우(id 는 살아 있다) — `isWithdrawnAuthor` 는 이것도 면제한다. */
  const withdrawnByNameOnly = post(BLOCKED_ID, WITHDRAWN_AUTHOR_NAME)

  const matrix: readonly (readonly [string, BlockedUser[], string[]])[] = [
    ["아무도 차단 안 함", [], []],
    ["그 사람을 id 로 차단함", [row()], [BLOCKED_NAME_AT_BLOCK_TIME]],
    [
      "'탈퇴한 사용자' 라는 이름 자체를 차단함(풀리지 않는 행)",
      [row({ blockedNickName: WITHDRAWN_AUTHOR_NAME, blockedUserId: null })],
      [WITHDRAWN_AUTHOR_NAME],
    ],
  ]

  it.each(matrix.map((m) => [m[0], m[1], m[2]] as const))(
    "%s — 옛 규칙과 새 규칙의 답이 같다",
    (_label, rows, names) => {
      const blocked = toBlockedAuthors(rows)
      for (const p of [withdrawn, withdrawnByNameOnly]) {
        expect(currentVisible(blocked, p)).toBe(legacyVisible(names, p))
        // 그리고 그 답은 언제나 "보인다" 다 — 신원이 잘려 나갔으니 가릴 대상도 없다.
        expect(currentVisible(blocked, p)).toBe(true)
      }
    },
  )

  it("면제가 없었다면 이름 축이 탈퇴 글을 **통째로** 접었을 것이다 (면제가 하는 일)", () => {
    // '탈퇴한 사용자' 는 서버가 사용자로 못 푸는 이름이라 항상 `unresolvedNames` 에 앉는다.
    // 그 순간 탈퇴한 글쓴이 전원이 한 사람 취급된다 — `isWithdrawnAuthor` 가 그걸 막는다.
    const blocked = toBlockedAuthors([
      row({ blockedNickName: WITHDRAWN_AUTHOR_NAME, blockedUserId: null }),
    ])
    expect(isAuthorBlocked(blocked, withdrawn)).toBe(true)
    expect(currentVisible(blocked, withdrawn)).toBe(true)
  })
})

/* ─────────────────────── 훅 배선 ─────────────────────── */

function render(client: QueryClient, Probe: () => null) {
  renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(Probe),
    ),
  )
}

describe("훅이 두 축을 만들어 내보낸다", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getBlockedUsers.mockResolvedValue([])
  })

  it("캐시에 든 목록에서 `blockedAuthors` 를 만든다", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(BLOCKED_KEY, [
      row(),
      row({ id: 2, blockedNickName: "이름행", blockedUserId: null }),
    ])

    let hook: ReturnType<typeof useBlockedUsers> | null = null
    render(client, () => {
      hook = useBlockedUsers()
      return null
    })
    if (hook === null) throw new Error("훅이 렌더되지 않았다")
    const value = hook as ReturnType<typeof useBlockedUsers>

    expect([...value.blockedAuthors.ids]).toEqual([BLOCKED_ID])
    expect([...value.blockedAuthors.unresolvedNames]).toEqual(["이름행"])
    /*
      이름 목록(`blockedNickNames`)은 **없앴다.** 마지막 사용처였던 레시피 리뷰가
      서버의 `authorId` 를 받아 신원 축으로 옮겼기 때문이다. 남겨 두면 "풀린 차단까지
      이름으로 비교하는" 옛 규칙이 다시 새어 나갈 통로가 된다.
    */
    expect("blockedNickNames" in value).toBe(false)
  })

  it("목록을 못 받은 동안에는 아무도 접지 않는다", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let hook: ReturnType<typeof useBlockedUsers> | null = null
    render(client, () => {
      hook = useBlockedUsers()
      return null
    })
    const value = hook as unknown as ReturnType<typeof useBlockedUsers>
    expect(value.blockedAuthors.ids.size).toBe(0)
    expect(value.blockedAuthors.unresolvedNames.size).toBe(0)
  })
})

/* ─────────────────────── 화면 배선 ─────────────────────── */

const ROOT = path.resolve(__dirname, "..")

/** 주석은 걷어낸다 — 문서에 적힌 옛 식이 검사를 통과시키면 안 된다. */
function sourceOf(relative: string): string {
  return fs
    .readFileSync(path.join(ROOT, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")
}

/*
  ─── 목록이 **넷이 아니라 일곱**이다 (2026-08-21) ───────────────────────────
  이 표에 없으면 검사도 없다. 실제로 세 곳이 빠져 있었고, 셋 다 판정이 달랐다:

   - `app/community-library.tsx`(내 활동 보관함) — 탈퇴 면제 없이 `!isAuthorBlocked(...)`,
   - `app/post/[id].tsx`(이어 읽을 글) — 같은 식,
   - `src/.../StoryRail.tsx`(스토리 레일) — 차단 필터 자체가 없었다.

  같은 사람의 같은 글이 피드에서는 보이고 보관함에서는 사라졌다. 그 차이는 `탈퇴한
  사용자` 라는 **라벨**이 `unresolvedNames` 축에 앉는 순간 드러나는데, 지금 프로덕션
  파이썬 서버는 차단 목록에 id 칸이 아예 없어서 **모든 행**이 그 축이다.
*/
const SCREENS = [
  ["피드", "src/features/recipe/components/FreePostTab.tsx"],
  ["검색", "src/features/recipe/views/CommunitySearchScreen.tsx"],
  ["인기", "src/features/recipe/views/CommunityPopularScreen.tsx"],
  ["스토리 뷰어", "app/stories.tsx"],
  ["스토리 레일", "src/features/recipe/components/StoryRail.tsx"],
  ["내 활동 보관함", "app/community-library.tsx"],
  ["이어 읽을 글", "app/post/[id].tsx"],
] as const

/**
 * **면제가 필터 식 안에 있는가.** 두 이름이 파일 어딘가에 있기만 하면 통과하던
 * 검사였는데, 그건 아무것도 못 잡는다 — `app/post/[id].tsx` 는 다른 자리에서
 * `isWithdrawnAuthor(post)` 를 쓰고 있어서 **면제가 빠진 채로도 통과했다.**
 * 그래서 한 식 안에서 같은 인자에 둘 다 걸리는지를 본다.
 */
const EXEMPTION =
  /isWithdrawnAuthor\((\w+)\)\s*\|\|\s*!isAuthorBlocked\(blockedAuthors,\s*\1\)/u

describe("차단 필터를 쓰는 화면은 일곱 다 같은 판정을 부른다", () => {
  it.each(SCREENS.map((s) => [s[0], s[1]] as const))(
    "%s — 한 식 안에서 `탈퇴 면제 || !isAuthorBlocked` 다",
    (_label, relative) => {
      const source = sourceOf(relative)
      expect(source).toMatch(EXEMPTION)
      // 라벨 비교가 한 곳이라도 남으면 그 화면에서만 승계 결함이 되살아난다.
      expect(source).not.toMatch(/blockedNickNames\.includes/u)
    },
  )

  it.each(SCREENS.map((s) => [s[0], s[1]] as const))(
    "%s — 탈퇴 판정을 **다시 적지 않는다**(정본은 `contentOwnership` 하나다)",
    (_label, relative) => {
      const source = sourceOf(relative)
      /*
        `app/post/[id].tsx` 에 정본과 글자까지 같은 사본이 하나 살아 있었다.
        소유자·탈퇴 판정은 한 곳에만 산다는 규칙의 정확히 그 위반이고, 두 벌이면
        한쪽만 고치는 사고가 난다(그 파일 머리말의 QA 2026-08-06).
      */
      expect(source).not.toMatch(/function\s+isWithdrawnAuthor\s*\(/u)
      expect(source).not.toMatch(/const\s+isWithdrawnAuthor\s*=/u)
      // 라벨·id 비교를 직접 적는 것도 같은 위반이다.
      expect(source).not.toMatch(
        /authorId\s*===\s*null\s*\|\|[^\n]*WITHDRAWN_AUTHOR_NAME/u,
      )
    },
  )
})

/* ─────────────────────── 레시피 리뷰 ───────────────────────
 *
 * 마지막까지 닉네임 축으로 남아 있던 화면이다. 옮길 축이 없었기 때문인데(서버 리뷰
 * 응답에 글쓴이 id 가 아예 없었다), 서버가 `authorId` 를 싣게 되면서 옮겼다.
 *
 * 리뷰는 위 넷과 배선이 다르다 — `isWithdrawnAuthor` 대신 `mine` 예외를 쓴다. 커뮤니티는
 * 탈퇴 글쓴이가 `"탈퇴한 사용자"` 라는 **라벨**을 받아서 누군가 그 라벨을 차단하면
 * 탈퇴자 전체가 접히는 반면, 리뷰는 그런 공용 라벨이 없다. 대신 리뷰에는 "내 리뷰" 가
 * 있고 그건 절대 접히면 안 된다. 그래서 화면 목록에 끼우지 않고 따로 본다.
 */
describe("레시피 리뷰도 같은 판정을 부른다", () => {
  it("상세 화면이 `blockedAuthors` 를 넘긴다 — 이름 목록은 더 이상 없다", () => {
    const source = sourceOf("app/recipe/[id]/index.tsx")
    expect(source).toContain("visibleReviews(")
    expect(source).toContain("blockedAuthors")
    // 훅에서 이름 목록을 다시 꺼내면 옛 축이 되살아난다.
    expect(source).not.toMatch(/blockedNickNames/u)
  })

  it("`visibleReviews` 가 판정을 직접 적지 않고 `isAuthorBlocked` 를 부른다", () => {
    const source = sourceOf(
      "src/features/recipe/components/detail/recipeDetailModel.ts",
    )
    // 같은 파일의 태그 정리(`displayTags`)도 `toLowerCase` 를 쓴다 — 그건 정당하다.
    // 그래서 파일 전체가 아니라 **이 함수 본문만** 본다.
    const body = source.slice(source.indexOf("export function visibleReviews"))
    expect(body).toContain("isAuthorBlocked(blockedAuthors,")
    // 라벨을 소문자로 접어 비교하던 옛 식이 남아 있으면 안 된다.
    expect(body).not.toMatch(/toLowerCase\(\)/u)
    expect(body).not.toMatch(/blockedNickNames/u)
  })

  it("훅이 이름 목록을 더는 내보내지 않는다", () => {
    const source = sourceOf("src/features/recipe/hooks/useBlockedUsers.ts")
    expect(source).not.toMatch(/^\s*blockedNickNames,\s*$/mu)
  })
})
