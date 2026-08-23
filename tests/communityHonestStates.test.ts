/**
 * **빈 화면은 "없다" 는 뜻이다.** 그래서 못 불러온 것을 빈 화면으로 그리면 거짓말이 된다.
 *
 * 이 파일이 고정하는 것은 커뮤니티의 곁가지 화면들이 실패·비었음·로딩을 **서로 다른
 * 문장**으로 말한다는 사실이다. 감사에서 나온 것만 여섯 자리였다:
 *
 *  - 팔로워/팔로잉 목록: `const { data = [] }` 하나뿐이라 오프라인이 "0명" 으로 보였다.
 *  - 그 목록의 행마다 작성자 프로필 쿼리가 하나씩 붙어 200 요청이 나갔다.
 *  - 스토리 레일·뷰어: 모든 실패가 "아직 스토리가 없어요" 였다.
 *  - 작성자 프로필: 오프라인·500·429·진짜 404 가 전부 "작성자를 찾을 수 없어요" 였고
 *    재시도 버튼은 언제나 그려졌다(진짜 404 에서는 눌러도 안 되는 버튼).
 *  - 그 화면의 "게시글 N" 은 전역 피드 캐시를 거른 목록이 받쳐 줄 수 없는 숫자였다.
 *  - 차단 목록 조회는 실패를 삼키고 `[]` 를 줘서 차단 필터가 **열린 채로** 고장났다.
 *
 * ─── 왜 소스 계약인가 ──────────────────────────────────────────────────────
 * 이 저장소의 jest 는 `react-native` 를 스텁으로 갈아 끼운 node 환경이라 화면을
 * 그려 볼 수 없다(렌더러가 devDependencies 에 없다). 그래서 화면 쪽은
 * `communityDesignContract.test.ts` 와 같은 방식 — 소스에서 **주석을 걷어낸 뒤**
 * 배선을 본다. 주석을 안 걷으면 "왜 이렇게 했는지" 적어 둔 문장이 계약을 대신
 * 만족시킨다(이 저장소에서 실제로 그렇게 통과한 테스트가 있었다).
 * 순수 로직인 차단 서비스는 아래에서 **진짜로 돌린다.**
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

import { api } from "@/src/services/core/apiClient"
import { blockService } from "@/src/services/blockService"

const ROOT = join(__dirname, "..")
const readRaw = (path: string) => readFileSync(join(ROOT, path), "utf-8")

/**
 * 줄 주석·블록 주석을 지운다. 문자열·템플릿 안의 `//` 는 남긴다(URL 이 통째로
 * 사라지면 그것대로 거짓 실패다). `communityDesignContract.test.ts` 에도 같은
 * 도구가 있지만, 테스트 파일을 import 하면 그쪽 스위트가 여기서 한 번 더 돈다.
 */
function stripComments(source: string): string {
  let out = ""
  let quote: string | null = null
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]
    if (quote) {
      out += char
      if (char === "\\") {
        out += next ?? ""
        i += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      out += char
      continue
    }
    if (char === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1
      out += "\n"
      continue
    }
    if (char === "/" && next === "*") {
      i += 2
      while (
        i < source.length &&
        !(source[i] === "*" && source[i + 1] === "/")
      ) {
        i += 1
      }
      i += 1
      continue
    }
    out += char
  }
  return out
}

const read = (path: string) => stripComments(readRaw(path))

const CONNECTIONS = "src/features/recipe/views/CommunityConnectionsScreen.tsx"
const AUTHOR_PROFILE =
  "src/features/recipe/views/CommunityAuthorProfileScreen.tsx"
const STORY_RAIL = "src/features/recipe/components/StoryRail.tsx"
const STORY_VIEWER = "app/stories.tsx"
const STORIES_HOOK = "src/features/recipe/hooks/useCommunityStories.ts"
const BLOCK_HOOK = "src/features/recipe/hooks/useBlockedUsers.ts"
const BLOCK_SERVICE = "src/services/blockService.ts"

describe("팔로워/팔로잉 목록", () => {
  it("로딩·오류·비었음을 각각 다른 것으로 그린다", () => {
    const source = read(CONNECTIONS)

    // 실패를 아예 안 꺼내 쓰던 자리 — 세 갈래가 모두 살아 있어야 한다.
    expect(source).toContain("isLoading")
    expect(source).toContain("isError")
    expect(source).toContain("refetch")
    expect(source).toContain("resolveError(error)")
    // 빈 자리에 무엇을 그릴지 정하지 않으면 헤더 아래는 흰 판이다.
    expect(source).toContain("ListEmptyComponent={listEmpty}")
    expect(source).toContain("V2SkeletonGroup")
  })

  it("재시도는 다시 해서 될 때만 그린다", () => {
    const source = read(CONNECTIONS)
    expect(source).toContain("failure.retryable ? () => void refetch()")
    // 조건 없이 그리는 옛 모양으로 돌아가지 않는다.
    expect(source).not.toContain("onRetry={() => void refetch()}")
  })

  it("깨진 딥링크는 빈 목록이 아니라 못 찾았다고 말한다", () => {
    const source = read(CONNECTIONS)
    expect(source).toContain("Number.isInteger(authorId) && authorId > 0")
    expect(source).toContain("hasValidAuthorId ?")
    expect(source).toContain("community.author.notFound")
  })

  it("행이 자기 몫의 작성자 프로필 요청을 내지 않는다", () => {
    const source = read(CONNECTIONS)
    // 목록 훅은 쓰되, 행 안에서 프로필 쿼리를 부르지 않는다(200행 = 200요청).
    expect(source).toContain("useCommunityFollowList(")
    expect(source).not.toMatch(/useCommunityAuthor\s*\(/u)
    // 목록 응답에 없는 칸을 그리려던 흔적도 남기지 않는다.
    expect(source).not.toContain("profile.followerCount")
    expect(source).not.toContain("profile.postCount")
    expect(source).not.toContain("setFollowing")
  })
})

describe("작성자 프로필", () => {
  it("실패마다 다른 문장을 쓰고 재시도를 가린다", () => {
    const source = read(AUTHOR_PROFILE)
    expect(source).toContain("resolveError(error)")
    expect(source).toContain("failure.retryable ? () => void refetch()")
    expect(source).not.toContain("onRetry={() => void refetch()}")
    /*
      "이 작성자를 찾지 못했어요" 는 이제 **주소가 깨진 한 자리**에서만 쓴다.
      두 번 이상 나오면 다시 모든 실패의 대표 문장이 된 것이다.
    */
    expect(source.match(/community\.author\.notFound/gu)).toHaveLength(1)
  })

  it("피드 캐시를 관찰하지 않는다(마운트마다 전 페이지 재조회 금지)", () => {
    const source = read(AUTHOR_PROFILE)
    expect(source).toContain('useCommunityPosts({ observe: "cold-only" })')
    expect(source).not.toContain("useCommunityPosts()")
  })

  it("목록이 받쳐 주지 못하는 숫자를 말하지 않는다", () => {
    const source = read(AUTHOR_PROFILE)
    // 서버 총합(게시글 수)은 이 화면의 목록이 증명할 수 없다 — 뺐다.
    expect(source).not.toContain("profile.postCount")
    // "아직 작성한 게시글이 없어요" 는 **안 받아 온 것**을 안 썼다고 말하는 문장이다.
    expect(source).not.toContain("community.author.emptyPosts")
    // 섹션 자체는 잡힌 글이 있을 때만 그린다.
    expect(source).toContain("authorPosts.length > 0")
    expect(source).toContain("community.author.otherPosts")
    // 팔로워·팔로잉은 전용 목록이 받쳐 주므로 남는다.
    expect(source).toContain("profile.followerCount")
    expect(source).toContain("profile.followingCount")
  })

  it("차단은 서버 확인을 기다린 뒤에 화면을 떠난다", () => {
    const source = read(AUTHOR_PROFILE)
    expect(source).toContain("await blockUserAsync(")
    // 쏘고 바로 떠나는 옛 모양(fire-and-forget)으로 돌아가지 않는다.
    expect(source).not.toMatch(/\bblockUser\(/u)
    const awaited = source.indexOf("await blockUserAsync(")
    const back = source.indexOf("router.back()", awaited)
    expect(awaited).toBeGreaterThan(-1)
    expect(back).toBeGreaterThan(awaited)
    // 실패하면 떠나지 않는다.
    expect(source).toMatch(/catch\s*\{\s*return\s*\}/u)
  })
})

describe("스토리", () => {
  it("훅이 실패를 내보낸다", () => {
    const source = read(STORIES_HOOK)
    expect(source).toMatch(/isError,\s*\n\s*error,/u)
    expect(source).toMatch(/return\s*\{[\s\S]*isError,[\s\S]*error,[\s\S]*\}/u)
  })

  it("레일은 실패를 '아직 스토리가 없어요' 로 말하지 않는다", () => {
    const source = read(STORY_RAIL)
    expect(source).toContain("resolveError(error)")
    expect(source).toContain("isError && stories.length === 0")
    expect(source).toContain("failure.title")
    expect(source).toContain("failure.retryable")
    /*
      빈 줄은 **진짜 비었을 때만** 남는다 — 실패 갈래보다 뒤에 온다.
      2026-08-21: 그 자리를 지키던 것이 큰 CTA 카드(`story.createFirstAccessibility`)
      에서 조용한 한 줄(`story.emptyLine`)로 바뀌었다. 지키는 사실은 그대로다 —
      **못 받은 것과 없는 것은 다른 말을 한다.**
    */
    expect(source).toContain("story.emptyLine")
    const errorBranch = source.indexOf("isError && stories.length === 0")
    const emptyLine = source.indexOf('description={t("story.emptyLine")}')
    expect(emptyLine).toBeGreaterThan(-1)
    expect(errorBranch).toBeLessThan(emptyLine)
  })

  it("빈 줄은 **손으로 만들지 않는다** — 계측이 붙는 통로로만(D15)", () => {
    /* 손으로 그리면 화면은 멀쩡한데 `empty_state_viewed` 가 아무것도 안 나간다. */
    const source = read(STORY_RAIL)
    expect(source).toContain("<V2EmptyState")
    expect(source).toContain('surface="community_story"')
    /* CTA 가 돌아와도 톤은 조용한 쪽이다 — 아무것도 없는 자리가 화면의 주인공이
       되면 안 된다는 판단은 그대로다. */
    expect(source).toContain('tone="quiet"')
    /*
      되돌아오지 않는 것: **큰 아이콘 원**과 옛 문구 키. 자리를 통째로 채우던
      카드형 빈 상태의 잔재다.
    */
    expect(source).toContain("story.emptyLine")
    expect(source).not.toContain("story.createFirstAccessibility")
    expect(source).not.toContain('name="camera"')
  })

  it("빈 자리의 CTA 는 머리의 `올리기` 와 **같은 곳으로** 간다", () => {
    /*
      2026-08-21: 이 자리에 `onAction` 이 **없어야 한다**고 단언하던 줄이 있었다.
      근거는 "머리의 `올리기` 와 같은 곳으로 가는 두 번째 버튼" 이라는 것이었다.
      사용자 판정으로 뒤집혔다 — 빈 자리는 레일과 같은 높이(152)를 지키기로 했고,
      그러면 그 상자는 어차피 거기 있다. 문장 한 줄만 떠 있는 상자보다 무엇을 할 수
      있는지 말하는 상자가 낫다.

      중복 진입점 걱정이 사라진 것은 아니라 **서는 조건이 다르다**는 것으로 푼다:
      머리의 어포던스는 스토리가 있을 때도 서고, 이 버튼은 없을 때만 선다.
      그래서 여기서 지키는 사실은 "버튼이 있다" 가 아니라 **둘이 갈라지지 않는다** 다 —
      한쪽만 다른 곳으로 가면 같은 이름의 두 길이 서로 다른 데로 간다.
    */
    const source = read(STORY_RAIL)
    expect(source).toContain('actionLabel={t("story.emptyAction")}')
    expect(source).toContain("onAction")

    // 두 진입점의 목적지가 같은 문자열인지 센다. 갈라지면 개수가 1이 된다.
    const targets = source.match(/"\/story\/new" as Href/g) ?? []
    expect(targets).toHaveLength(2)
  })

  it("뷰어도 같은 문장을 쓴다", () => {
    const source = read(STORY_VIEWER)
    expect(source).toContain("resolveError(error)")
    expect(source).toContain("isError && stories.length === 0")
    expect(source).toContain("failure.retryable")
    const errorBranch = source.indexOf("isError && stories.length === 0")
    const emptyBranch = source.indexOf("community.stories.emptyTitle")
    expect(errorBranch).toBeGreaterThan(-1)
    expect(errorBranch).toBeLessThan(emptyBranch)
  })
})

describe("차단 목록", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("조회 실패를 삼키지 않는다", async () => {
    const failure = new Error("서버가 500 을 줬다")
    ;(api.get as jest.Mock).mockRejectedValue(failure)

    // 삼키면 차단 필터가 **열린 채로** 고장난다 — 그 사실이 아무 데도 안 남는다.
    await expect(blockService.getBlockedUsers()).rejects.toBe(failure)
  })

  it("성공하면 서버 목록을 그대로 준다", async () => {
    const blocked = [
      { id: 1, blockedNickName: "차단한사람", createdAt: "2026-08-20" },
    ]
    ;(api.get as jest.Mock).mockResolvedValue({ data: { result: blocked } })

    await expect(blockService.getBlockedUsers()).resolves.toEqual(blocked)
  })

  it("본문이 비어 있으면 빈 목록이다(실패와 구분된다)", async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: {} })

    await expect(blockService.getBlockedUsers()).resolves.toEqual([])
  })

  it("소스에 삼키는 갈래가 남아 있지 않다", () => {
    expect(read(BLOCK_SERVICE)).not.toMatch(/catch\s*\{\s*return\s*\[\]/u)
  })

  it("훅이 '모른다' 를 화면에 내보내고 실패를 말한다", () => {
    const source = read(BLOCK_HOOK)
    // 모르는 상태를 화면이 말할 수 있어야 한다.
    expect(source).toContain("isBlockedListError")
    expect(source).toContain("refetchBlockedList")
    // 차단·해제 실패는 둘 다 말한다(차단은 안전 동작이다).
    expect(source.match(/presentCommunityError\(/gu)).toHaveLength(2)
    // 확인까지 기다려야 하는 동선을 위한 통로.
    expect(source).toContain("blockUserAsync")
  })
})
