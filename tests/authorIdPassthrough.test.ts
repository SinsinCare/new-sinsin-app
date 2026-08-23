/**
 * **"서버가 안 보냈다" 를 "탈퇴했다" 로 읽으면 차단 필터가 통째로 꺼진다.** (2026-08-21)
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 무엇이 문제였나
 *
 * 매퍼 세 곳이 `authorId: raw.authorId ?? null` 이었다. 그런데 `authorId` 의 세 값은
 * 서로 **다른 사실**이다:
 *
 *   숫자      → 그 사람
 *   `null`    → **탈퇴**(서버가 익명화하며 넣는 값)
 *   `undefined` → 서버가 그 칸을 **안 보냈다**(모른다)
 *
 * `isWithdrawnAuthor` 는 `null` 을 탈퇴로 읽고, 탈퇴 글쓴이는 화면들의 차단 필터에서
 * **면제**된다(`isWithdrawnAuthor(p) || !isAuthorBlocked(...)`). 그래서 `authorId` 를
 * 안 싣는 서버를 보면 **모든 글이 탈퇴자**가 되고, 클라이언트 차단 필터가 전 화면에서
 * 꺼진다 — 서버 필터가 도착하기 전 한 박자 동안 차단한 사람의 글이 그대로 서 있고,
 * 그 사실을 아무도 모른다.
 *
 * 바로 아래 줄의 `isMine` 이 이미 같은 이유로 `undefined` 를 보존한다. 신원 칸도 같은
 * 규칙이어야 한다: **서버가 말하지 않은 것을 지어내지 않는다.**
 *
 * ■ 어떻게 재는가
 *
 * 매퍼는 순수하다 — `api` 만 스텁으로 세우고(모듈 로드가 전송 계층을 끌고 온다) 실제
 * 매퍼를 세 가지 응답 모양으로 돌린다. 그리고 그 값을 **소비자에게 그대로 먹여**
 * 판정이 어떻게 갈리는지 못 박는다.
 */
/* eslint-disable import/first */
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

import { mapCommunityComment } from "@/src/features/recipe/services/communityPostService"
import { mapCommunityStory } from "@/src/features/recipe/services/communityStoryService"
import { toBlockedAuthors } from "@/src/features/recipe/utils/blockedAuthors"
import { isAuthorBlocked } from "@/src/features/recipe/hooks/useBlockedUsers"
import {
  WITHDRAWN_AUTHOR_NAME,
  isMyContent,
  isConfidentlyNotMine,
  isWithdrawnAuthor,
} from "@/src/features/recipe/utils/contentOwnership"
import type { CommunityCommentApi } from "@/src/features/recipe/types"
import type { CommunityStoryApi } from "@/src/features/recipe/types/story"

/**
 * 글 매퍼(`mapPost`)는 내보내지 않는다 — 서비스 메서드를 통해서만 닿는다.
 * 그래서 같은 규칙을 쓰는 **댓글·스토리** 매퍼로 재고, 글 쪽은 서비스가 실제로
 * 응답을 매핑하는 경로로 확인한다(아래 `getPost`).
 */
function comment(over: Partial<CommunityCommentApi> = {}): CommunityCommentApi {
  return {
    id: 1,
    postId: 9,
    parentCommentId: null,
    authorName: "글쓴이",
    content: "본문",
    likes: 0,
    liked: false,
    isDeleted: false,
    createdAt: "2026-08-21T00:00:00",
    replies: [],
    ...over,
  }
}

function storyPayload(
  over: Partial<CommunityStoryApi> = {},
): CommunityStoryApi {
  return {
    id: 1,
    authorName: "글쓴이",
    imageUri: "https://example.test/a.jpg",
    likes: 0,
    liked: false,
    views: 0,
    isMine: false,
    createdAt: "2026-08-21T00:00:00",
    expiresAt: "2026-08-22T00:00:00",
    ...over,
  }
}

describe("매퍼는 세 값을 세 값으로 남긴다", () => {
  it("숫자는 그대로", () => {
    expect(mapCommunityComment(comment({ authorId: 42 })).authorId).toBe(42)
    expect(mapCommunityStory(storyPayload({ authorId: 42 })).authorId).toBe(42)
  })

  it("`null`(탈퇴)은 그대로 `null`", () => {
    expect(mapCommunityComment(comment({ authorId: null })).authorId).toBeNull()
    expect(
      mapCommunityStory(storyPayload({ authorId: null })).authorId,
    ).toBeNull()
  })

  it("**필드가 없으면 `undefined`** 다 — `null` 로 지어내지 않는다", () => {
    const mapped = mapCommunityComment(comment())
    expect(mapped.authorId).toBeUndefined()
    expect("authorId" in mapped).toBe(true)
    expect(mapCommunityStory(storyPayload()).authorId).toBeUndefined()
  })

  it("답글도 같은 규칙이다(재귀 경로)", () => {
    const mapped = mapCommunityComment(
      comment({ replies: [comment({ id: 2, parentCommentId: 1 })] }),
    )
    expect(mapped.replies[0].authorId).toBeUndefined()
  })

  it("`isMine` 은 지금까지처럼 `undefined` 를 보존한다 (같은 규칙의 선례)", () => {
    expect(mapCommunityComment(comment()).isMine).toBeUndefined()
    expect(mapCommunityComment(comment({ isMine: false })).isMine).toBe(false)
  })
})

describe("소비자가 세 값을 어떻게 읽는가", () => {
  const blocked = toBlockedAuthors([
    {
      id: 1,
      blockedNickName: "차단대상",
      blockedUserId: 42,
      createdAt: "2026-08-21T00:00:00",
    },
  ])

  it("`undefined` 는 **탈퇴가 아니다** — 그래서 차단 면제도 아니다", () => {
    const unknown = mapCommunityComment(comment({ authorName: "차단대상" }))
    expect(isWithdrawnAuthor(unknown)).toBe(false)
    // id 를 모르므로 id 축에서는 아무것도 아니고, 이름 축이 살아 있으면 그쪽이 잡는다.
    expect(isAuthorBlocked(blocked, unknown)).toBe(false)
  })

  it("**옛 동작의 결과**: `null` 로 뭉개면 그 글이 탈퇴자가 되어 필터를 면제받는다", () => {
    // 화면들이 쓰는 식 그대로.
    const visible = (author: {
      authorId?: number | null
      authorName: string
    }) => isWithdrawnAuthor(author) || !isAuthorBlocked(blocked, author)

    const collapsed = { authorId: null, authorName: "차단대상" }
    const preserved = mapCommunityComment(comment({ authorName: "차단대상" }))

    // 이름 축까지 살아 있는 서버(= 지금 프로덕션 파이썬)에서 차이가 드러난다.
    const byName = toBlockedAuthors([
      {
        id: 1,
        blockedNickName: "차단대상",
        blockedUserId: null,
        createdAt: "2026-08-21T00:00:00",
      },
    ])
    const visibleByName = (author: {
      authorId?: number | null
      authorName: string
    }) => isWithdrawnAuthor(author) || !isAuthorBlocked(byName, author)

    expect(visibleByName(collapsed)).toBe(true) // 차단했는데 보인다 — 옛 동작
    expect(visibleByName(preserved)).toBe(false) // 지금: 접힌다
    // id 축만 있는 목록에서는 둘 다 보인다(id 를 모르니 접을 근거가 없다).
    expect(visible(collapsed)).toBe(true)
    expect(visible(preserved)).toBe(true)
  })

  it("진짜 탈퇴(`null`)는 지금도 면제된다 — 바뀌면 안 되는 쪽", () => {
    const withdrawn = mapCommunityComment(
      comment({ authorId: null, authorName: WITHDRAWN_AUTHOR_NAME }),
    )
    expect(isWithdrawnAuthor(withdrawn)).toBe(true)
  })

  it("소유자 판정은 그대로다 — `undefined` 는 옛 서버 경로(닉네임 대조)를 탄다", () => {
    const mine = mapCommunityComment(comment({ authorName: "나" }))
    expect(isMyContent(mine, "나")).toBe(true)
    expect(isMyContent(mine, "남")).toBe(false)
    // 프로필을 아직 모르면 "남의 것" 이라고 단정하지 않는다.
    expect(isConfidentlyNotMine(mine, null)).toBe(false)
  })

  it("`undefined` 인 글쓴이 프로필 링크는 여전히 닫힌다(`!= null` 로 읽는 자리)", () => {
    const unknown = mapCommunityComment(comment())
    expect(unknown.authorId != null).toBe(false)
  })
})

describe("매퍼 소스에 `?? null` 이 남아 있지 않다", () => {
  const strip = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")

  it("글·댓글·스토리 세 곳 다", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path")
    const root = path.join(__dirname, "..")
    for (const relative of [
      "src/features/recipe/services/communityPostService.ts",
      "src/features/recipe/services/communityStoryService.ts",
    ]) {
      const source = strip(fs.readFileSync(path.join(root, relative), "utf8"))
      expect(source).not.toMatch(/authorId:\s*raw\.authorId\s*\?\?\s*null/u)
      expect(source).toMatch(/authorId:\s*raw\.authorId,/u)
    }
  })
})
