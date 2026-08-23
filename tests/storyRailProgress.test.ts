/**
 * **레일이 안 거르면 뷰어가 남을 연다. 그리고 목록이 줄면 점이 꺼진다.** (2026-08-21)
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ── S4. 레일에는 시계도, 만료 필터도, 차단 필터도 없었다 ─────────────────────
 *
 * 타일은 `?storyId=` 로 뷰어를 연다. 뷰어는 자기 목록(만료·차단을 거른 `liveStories`)
 * 에서 그 id 를 못 찾으면 **맨 앞(0)** 으로 접는다(`resolveStoryIndex`). 그래서 레일이
 * 안 거르면 그 "못 찾는" 경우가 **레일을 누르는 것만으로** 만들어진다:
 *
 *   탭을 열어 둔다 → 2분 뒤 만료되는 타일이 그대로 서 있다(레일에는 `useStoryNow` 가
 *   없어 아무도 다시 판단하지 않는다) → 누른다 → 뷰어의 `liveStories` 가 그것을 뺀다
 *   → 0번 → **전혀 다른 사람의 사진이 전체화면으로 열린다.**
 *
 * 레일의 스토리가 전부 만료·차단이면 더 나쁘다 — 뷰어는 "아직 스토리가 없어요" 를
 * 말하는데 레일에는 썸네일이 그대로 서 있다. 자리 번호를 id 로 바꿔 죽인 그 결함이
 * **만료·차단이라는 다른 축**으로 되돌아온 것이다.
 *
 * ── S6. 진행 점이 아무 데도 안 붙는 순간 ────────────────────────────────────
 *
 * 뷰어는 자리 번호(`activeIndex`)로 점을 칠했다. 이 목록은 손가락 아래에서 **줄어든다**:
 * 분 눈금이 지나면 만료된 것이, 차단하면 그 사람 것이 빠진다. 앞에서 둘이 빠지면
 * 4번을 보던 사람의 번호는 그대로 4인데 목록은 2개라 아무 점도 안 켜진다.
 * `VirtualizedList` 는 한 프레임 안에 offset 을 되잡지만 그 자리는 "잘린 위치" 일 뿐
 * 손가락 아래 있던 그 스토리가 아니다. `stableStoryOrder` 의 보장은 **재배열**에 대한
 * 것이지 앞쪽 제거에 대한 것이 아니다.
 *
 * ■ 어떻게 재는가
 *
 * 자리 판정(`resolveShownIndex`)은 순수 함수라 **그대로 돌린다**. 필터는 화면 안의
 * 식이라 그릴 방법이 없으므로(이 저장소에는 RN 렌더러가 없다) **주석을 걷어낸 소스**로
 * 배선을 보고, 그 배선이 부르는 판정들은 실제로 돌려 결과를 못 박는다.
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

import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  isStoryExpired,
  resolveStoryIndex,
} from "@/src/features/recipe/hooks/useCommunityStories"
import { toBlockedAuthors } from "@/src/features/recipe/utils/blockedAuthors"
import { isAuthorBlocked } from "@/src/features/recipe/hooks/useBlockedUsers"
import {
  WITHDRAWN_AUTHOR_NAME,
  isWithdrawnAuthor,
} from "@/src/features/recipe/utils/contentOwnership"
import { resolveShownIndex } from "@/src/features/recipe/utils/storyProgress"
import type { CommunityStory } from "@/src/features/recipe/types/story"

const ROOT = join(__dirname, "..")
const RAIL = "src/features/recipe/components/StoryRail.tsx"
const VIEWER = "app/stories.tsx"

/** 주석은 걷어낸다 — 머리말이 배선을 대신 만족시키지 않게. */
function sourceOf(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")
}

const MINUTE = 60_000
const NOW = Date.UTC(2026, 7, 21, 9, 0, 0)

function story(
  id: string,
  overrides: Partial<CommunityStory> = {},
): CommunityStory {
  return {
    id,
    authorId: Number(id.charCodeAt(0)),
    authorName: `작성자${id}`,
    imageUri: `https://example.test/${id}.jpg`,
    caption: null,
    likes: 0,
    liked: false,
    views: 0,
    isMine: false,
    createdAt: new Date(NOW - 60 * MINUTE),
    expiresAt: new Date(NOW + 120 * MINUTE),
    ...overrides,
  }
}

/* ═══════════════════ S4 — 레일이 무엇을 그리는가 ═══════════════════ */

describe("S4 — 레일은 뷰어와 **같은 두 필터**를 건다", () => {
  const source = sourceOf(RAIL)

  it("분 눈금을 본다 — 열어 둔 탭에서 만료가 다시 판단된다", () => {
    expect(source).toContain("useStoryNow()")
  })

  it("만료된 스토리는 레일에서 내린다", () => {
    expect(source).toContain("!isStoryExpired(story, now)")
  })

  it("차단은 신원 축으로, 탈퇴는 면제 — 피드·뷰어와 글자 그대로 같은 식이다", () => {
    expect(source).toContain("blockedAuthors")
    expect(source).toContain("isWithdrawnAuthor(story)")
    expect(source).toContain("!isAuthorBlocked(blockedAuthors, story)")
    // 라벨 축이 한 줄이라도 남으면 이 화면에서만 승계 결함이 되살아난다.
    expect(source).not.toMatch(/blockedNickNames/u)
  })

  it("타일도, 빈 상태도 **걸러낸 목록**으로 판정한다", () => {
    expect(source).toContain("visibleStories.length === 0 ?")
    expect(source).toContain("visibleStories.map((story) =>")
    // 원본으로 그리면 눌러도 남이 열리는 썸네일이 그대로 선다.
    expect(source).not.toMatch(/\{stories\.map\(/u)
  })

  it("로딩·실패 갈래는 **원본**을 본다 — '못 받았다' 는 다른 사실이다", () => {
    expect(source).toContain("isLoading && stories.length === 0")
    expect(source).toContain("isError && stories.length === 0")
  })

  it("타일은 여전히 자리 번호가 아니라 id 를 넘긴다(그 수정은 그대로다)", () => {
    expect(source).toContain("/stories?storyId=")
    expect(source).toContain("encodeURIComponent(story.id)")
  })
})

describe("S4 — 안 거르면 실제로 남의 스토리가 열린다 (판정으로 재현)", () => {
  /** 뷰어의 `liveStories` 와 같은 식. */
  const live = (
    list: readonly CommunityStory[],
    blocked: ReturnType<typeof toBlockedAuthors>,
  ) =>
    list.filter(
      (item) =>
        !isStoryExpired(item, NOW) &&
        (isWithdrawnAuthor(item) || !isAuthorBlocked(blocked, item)),
    )

  const noBlocks = toBlockedAuthors([])

  it("만료된 타일을 누르면 뷰어는 **0번**으로 접는다 — 남의 사진이다", () => {
    const rail = [
      story("expired", { expiresAt: new Date(NOW - MINUTE) }),
      story("someone-else"),
    ]
    // 레일이 안 걸렀다면 사용자가 누르는 것은 여전히 `expired` 다.
    const viewer = live(rail, noBlocks)
    expect(viewer.map((s) => s.id)).toEqual(["someone-else"])
    expect(resolveStoryIndex(viewer, "expired")).toBe(0)
    expect(viewer[resolveStoryIndex(viewer, "expired")].id).toBe("someone-else")
  })

  it("레일이 같은 필터를 걸면 그 타일 자체가 없다 — 누를 수 없다", () => {
    const rail = [
      story("expired", { expiresAt: new Date(NOW - MINUTE) }),
      story("someone-else"),
    ]
    expect(live(rail, noBlocks).map((s) => s.id)).toEqual(["someone-else"])
  })

  it("차단 직후에도 같다 — 차단한 사람 타일은 레일에서 먼저 빠진다", () => {
    const blockedAuthors = toBlockedAuthors([
      {
        id: 1,
        blockedNickName: "작성자b",
        blockedUserId: story("b").authorId ?? null,
        createdAt: "2026-08-21T00:00:00",
      },
    ])
    const rail = [story("b"), story("c")]
    expect(live(rail, blockedAuthors).map((s) => s.id)).toEqual(["c"])
  })

  it("탈퇴 글쓴이는 면제다 — 라벨을 차단해도 레일에서 안 접힌다", () => {
    const blockedAuthors = toBlockedAuthors([
      {
        id: 1,
        blockedNickName: WITHDRAWN_AUTHOR_NAME,
        blockedUserId: null,
        createdAt: "2026-08-21T00:00:00",
      },
    ])
    const withdrawn = story("w", {
      authorId: null,
      authorName: WITHDRAWN_AUTHOR_NAME,
    })
    expect(live([withdrawn], blockedAuthors).map((s) => s.id)).toEqual(["w"])
  })
})

/* ═══════════════════ S6 — 진행 점은 무엇을 가리키나 ═══════════════════ */

describe("S6 — 보고 있는 것은 자리가 아니라 스토리다", () => {
  const list = [story("a"), story("b"), story("c"), story("d"), story("e")]

  it("보던 스토리가 그대로 있으면 그 자리다", () => {
    expect(resolveShownIndex(list, "d", 3)).toBe(3)
  })

  it("앞쪽이 빠져도 **같은 스토리**를 가리킨다 — 번호만 옮겨 간다", () => {
    // a·b 가 만료로 빠졌다. 옛 코드는 번호 3을 그대로 써서 c 를 가리켰다.
    const shrunk = [story("c"), story("d"), story("e")]
    expect(resolveShownIndex(shrunk, "d", 3)).toBe(1)
    expect(shrunk[resolveShownIndex(shrunk, "d", 3)].id).toBe("d")
  })

  it("재배열에도 흔들리지 않는다(서버가 다시 섞어도)", () => {
    const reshuffled = [story("e"), story("d"), story("a")]
    expect(resolveShownIndex(reshuffled, "d", 1)).toBe(1)
  })

  it("실측된 그 순간: 5개에서 3개가 빠지고 번호는 4 — 점 하나는 반드시 켜진다", () => {
    /*
      두 개가 만료되고 하나가 차단되어 목록이 2개로 줄었는데 번호는 4였다.
      옛 식 `index === Math.min(shownIndex, 11)` 은 어떤 점과도 안 맞았다.
    */
    const shrunk = [story("d"), story("e")]
    const legacyActive = shrunk.map((_, index) => index === Math.min(4, 11))
    expect(legacyActive).toEqual([false, false])

    const shown = resolveShownIndex(shrunk, "e", 4)
    expect(shrunk.map((_, index) => index === Math.min(shown, 11))).toEqual([
      false,
      true,
    ])
  })

  it("보던 스토리가 사라졌으면 마지막 번호를 목록 안으로 **접는다**", () => {
    // 화면(VirtualizedList)이 실제로 앉는 자리와 같다 — 점과 사진이 같은 것을 말한다.
    const shrunk = [story("a"), story("b")]
    expect(resolveShownIndex(shrunk, "gone", 4)).toBe(1)
    expect(resolveShownIndex(shrunk, null, 4)).toBe(1)
  })

  it("아직 아무 것도 안 본 상태에서는 열 때 넘어온 자리를 그린다", () => {
    expect(resolveShownIndex(list, null, 2)).toBe(2)
  })

  it("빈 목록·이상한 번호에도 목록 밖을 가리키지 않는다", () => {
    expect(resolveShownIndex([], "a", 3)).toBe(0)
    expect(resolveShownIndex(list, null, -1)).toBe(0)
    expect(resolveShownIndex(list, null, Number.NaN)).toBe(0)
    expect(resolveShownIndex(list, null, 99)).toBe(4)
  })

  it("어떤 목록·어떤 번호에도 결과는 항상 그릴 수 있는 자리다 (전 조합)", () => {
    for (let size = 0; size <= 5; size += 1) {
      const stories = list.slice(0, size)
      for (const activeId of [null, "a", "e", "gone"]) {
        for (const fallback of [-3, 0, 1, 4, 20, Number.NaN]) {
          const index = resolveShownIndex(stories, activeId, fallback)
          expect(Number.isInteger(index)).toBe(true)
          expect(index).toBeGreaterThanOrEqual(0)
          if (size > 0) expect(index).toBeLessThan(size)
        }
      }
    }
  })
})

describe("S6 — 뷰어가 그 판정을 쓴다", () => {
  const source = sourceOf(VIEWER)

  it("신원과 번호를 **한 벌로** 들고 있는다", () => {
    expect(source).toContain("setActive({ id: story.id, index: first.index })")
    expect(source).toContain("resolveShownIndex(")
    // 번호만 들고 있던 옛 상태가 남으면 목록이 줄 때 다시 꺼진다.
    expect(source).not.toMatch(/setActiveIndex\(/u)
  })

  it("점은 그 판정으로만 칠한다", () => {
    expect(source).toContain("index === Math.min(shownIndex, 11)")
    expect(source).toContain("const shownIndex = resolveShownIndex(")
  })

  it("만료·차단 필터와 순서 유지는 그대로다 (되돌리면 안 되는 쪽)", () => {
    expect(source).toContain("!isStoryExpired(story, now)")
    expect(source).toContain("!isAuthorBlocked(blockedAuthors, story)")
    expect(source).toContain("useStableStoryOrder(liveStories)")
    expect(source).toContain(
      "resolveStoryIndex(visibleStories, params.storyId)",
    )
  })
})
