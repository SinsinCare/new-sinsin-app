/**
 * 소스 계약 — **주석은 계약을 만족시키지 못한다.**
 *
 * 여기 있는 단언은 대부분 문자열/정규식이라, 주석을 그대로 훑으면 "왜 이렇게 했는지"
 * 적어 둔 문장이 계약을 대신 만족시킨다. 실제로 `isTailStalled` 도 `canAutoBackfill`
 * 도 두 화면의 **주석에** 그대로 있어서, 꼬리의 분기를 지우고 설명만 남겨도 초록이었다.
 * 그래서 읽을 때 주석을 걷어낸다(`read`). 원문이 필요하면 `readRaw`.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")
const readRaw = (path: string) => readFileSync(join(ROOT, path), "utf-8")

/**
 * 줄 주석과 블록 주석을 지운다. 문자열·템플릿 리터럴 안의 `//` 는 건드리지 않는다
 * (URL 이 통째로 사라지면 그것대로 거짓 실패다).
 */
export function stripComments(source: string): string {
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

describe("소스 계약의 오라클", () => {
  it("주석에만 있는 이름은 계약을 만족시키지 못한다", () => {
    const gutted = [
      "// 여기서 isTailStalled 로 '더 보기' 를 세웠었다",
      "/* canAutoBackfill 예산을 다 쓰면 … */",
      "const x = 1",
    ].join("\n")
    // 옛 오라클(원문 그대로 훑기)은 이 사본을 통과시켰다 — 분기를 지우고 설명만 남겨도.
    expect(gutted).toContain("isTailStalled")
    expect(gutted).toContain("canAutoBackfill")
    expect(stripComments(gutted)).not.toContain("isTailStalled")
    expect(stripComments(gutted)).not.toContain("canAutoBackfill")
  })

  it("문자열 안의 `//` 와 `/*` 는 주석이 아니다", () => {
    expect(stripComments('const u = "https://a.b/c" // 주석')).toBe(
      'const u = "https://a.b/c" \n',
    )
    expect(stripComments("const s = `/* 안 지운다 */`")).toBe(
      "const s = `/* 안 지운다 */`",
    )
  })
})

describe("community redesign contract", () => {
  it("keeps recipe as its own main tab and never adds a story tab", () => {
    const tabs = read("app/(tabs)/_layout.tsx")
    expect(tabs).toContain('{ route: "community"')
    expect(tabs).toContain('{ route: "recipe"')
    expect(tabs).not.toMatch(/route:\s*["']stor(?:y|ies)["']/u)
  })

  it("keeps stories inside the community feed rail", () => {
    const feed = read("src/features/recipe/components/FreePostTab.tsx")
    expect(feed).toContain("<StoryRail />")
    /*
      **가로 `PopularPostCard` 레일은 은퇴했다**(WBS 2.1). 이 줄은 예전에
      `toContain("<PopularPostCard")` 였는데, D25 가 그 형태를 버리라고 판정한 뒤로는
      **되돌리지 말아야 할 것을 지키라고 요구하던** 자리가 됐다 — 승인된 형태는 세로
      랭킹 3행(`TrendingPostsSection`)이다. 목적지 화면은 그대로다.
    */
    expect(feed).toContain("<TrendingPostsSection")
    expect(feed).not.toContain("<PopularPostCard")
    expect(feed).toContain('router.push("/(tabs)/community-popular"')
    /*
      그리고 그 섹션은 **머리가 아니라 목록 셀 안**에서 그려진다(2026-08-21) —
      `ListHeaderComponent` 에 있으면 한 화면에 읽을 수 있는 글이 0개다.
      배선 자체는 `communityFeedSectionWiring.test.ts` 가 엘리먼트 트리로 지킨다.
    */
    expect(feed).toContain("const TRENDING_INSERT_AFTER = 3")
    expect(feed).toContain("index === TRENDING_INSERT_AFTER - 1")
  })

  it("does not split author profile into a story or recipe tab", () => {
    const profile = read(
      "src/features/recipe/views/CommunityAuthorProfileScreen.tsx",
    )
    expect(profile).not.toContain("useCommunityStories")
    expect(profile).not.toMatch(/const\s+TABS\s*=.*stories/u)
    expect(profile).toContain("community.author.otherPosts")
  })

  it("implements popular period filters without losing current community categories", () => {
    const popular = read("src/features/recipe/views/CommunityPopularScreen.tsx")
    expect(popular).toContain('["realtime", "week", "month"]')
    expect(popular).toContain("FREE_POST_CATEGORIES")
    expect(popular).toContain(
      "maintainVisibleContentPosition={{ disabled: true }}",
    )
    expect(popular).toContain("categoryRailScroll: { flexGrow: 0 }")
  })

  it("uses the form-style writer while preserving production safeguards", () => {
    const editor = read("src/features/recipe/components/FreePostEditor.tsx")
    expect(editor).toContain('t("freePost.formTitle")')
    expect(editor).toContain('t("freePost.photoVideo")')
    expect(editor).toContain("maxLength={700}")
    expect(editor).toContain("<VoteSheet")
    expect(editor).toContain("<ContentResponsibilityCheck")
    expect(editor).toContain("const MAX_IMAGES = 5")
    expect(editor).toContain("imageObjectPaths")
  })

  it("keeps small community metadata readable in dark mode", () => {
    const feed = read("src/features/recipe/components/FreePostTab.tsx")
    const popularCard = read(
      "src/features/recipe/components/PopularPostCard.tsx",
    )
    const popularScreen = read(
      "src/features/recipe/views/CommunityPopularScreen.tsx",
    )
    const postCard = read("src/features/recipe/components/PostListItem.tsx")
    const storyRail = read("src/features/recipe/components/StoryRail.tsx")
    const detail = read("app/post/[id].tsx")
    const authorProfile = read(
      "src/features/recipe/views/CommunityAuthorProfileScreen.tsx",
    )
    const connections = read(
      "src/features/recipe/views/CommunityConnectionsScreen.tsx",
    )
    const report = read("src/features/recipe/views/CommunityReportScreen.tsx")
    const voteSheet = read("src/features/recipe/components/VoteSheet.tsx")

    /*
      `styles.sectionHeaderTitle` · `styles.sectionMoreText` 를 보던 두 줄은 지웠다 —
      그 두 스타일은 인기글 레일의 헤더 것이고, 레일이 은퇴하면서 같이 사라졌다.
      섹션 제목·`전체` 의 다크 모드는 이제 `TrendingPostsSection` 이 `useV2Theme()` 에서
      받는다(리터럴이 아니라 시맨틱 토큰이라 이 파일이 지킬 것이 없다).

      2026-08-21: `:\s*\{ color: surface.text \}` 를 보던 정규식도 지웠다. 그것이 잡고
      있던 유일한 자리는 **정렬 줄의 미선택 라벨**(`• 최신순 조회순 인기순`)이었는데,
      그 줄이 `SortDropdown` 필로 바뀌면서 색을 v2 토큰에서 받는다. 남은 `surface.*` 는
      검색 입구와 빈 상태뿐이라 **그 둘을 이름으로** 못 박는다 — 정규식이 어느 자리를
      지키는지 모르면 자리가 사라져도 아무도 모른다(이번이 그 사례다).
    */
    expect(feed).toContain("styles.emptySub, { color: surface.text }")
    expect(feed).toContain("styles.emptyTitle, { color: surface.textStrong }")
    /*
      화면이 손으로 그리던 칩·정렬은 **하드코딩 hex 6개**를 들고 있었다(`#1D1E20`
      `#F4F4F6` `#FFFFFF` …). 필터 바가 `CategoryChipRail`/`V2Chip` 으로 넘어가면서
      전부 사라졌다 — 되돌아오면 다크 모드가 다시 이 파일 밖에서 갈라진다.
    */
    expect(feed).not.toMatch(/#[0-9A-Fa-f]{6}/u)
    expect(popularCard).toContain("styles.category, { color: surface.text }")
    expect(popularCard).toContain("styles.countText, { color: surface.text }")
    expect(popularCard).not.toContain("surface.textWeak")
    expect(popularCard).not.toContain("surface.textMuted")
    expect(popularScreen.match(/surface\.textMuted/gu)).toHaveLength(1)
    expect(popularScreen).not.toContain("surface.textWeak")
    expect(postCard).not.toContain("surface.textWeak")
    expect(postCard).not.toContain("surface.textMuted")
    /*
      `styles.subtitle, { color: surface.text }` 를 보던 줄은 지웠다 — 2026-08-21 에
      스토리 머리가 `SectionHeader`(제목 + 후행 어포던스) 한 벌로 통일되면서 부제가
      사라졌고, 그 온보딩 한 줄은 **비었을 때만** 뜻이 있으므로 조용한 빈 상태로
      내려갔다. 그 자리의 다크 모드는 이제 `V2EmptyState`·`SectionHeader` 가
      `useV2Theme()` 에서 받는다(리터럴이 아니라 시맨틱 토큰이라 이 파일이 지킬 것이 없다).
    */
    expect(storyRail).not.toContain("styles.subtitle")
    expect(detail).not.toContain("surface.textWeak")
    expect(detail).not.toContain("surface.textMuted")
    expect(authorProfile).not.toContain("surface.textWeak")
    expect(authorProfile).not.toContain("surface.textMuted")
    expect(connections).not.toContain("surface.textWeak")
    expect(connections).not.toContain("surface.textMuted")
    expect(report).not.toContain("surface.textWeak")
    expect(report).not.toContain("surface.textMuted")
    expect(voteSheet).not.toContain("surface.textWeak")
    expect(voteSheet).not.toContain("surface.textMuted")
    /*
      플레이스홀더만은 `surface.text` 가 **아니다.** 그 값은 이 칸에 입력된 글자의 색
      바로 아래 단이라, 빈 칸이 "이미 적혀 있는 값" 으로 읽혔다(값은 두 줄 아래에서
      `surface.textStrong` 으로 그려진다). 위계는 넷이면 충분하다는 규칙에 따라
      placeholder 단이 따로 있고(`theme/surface.ts`), 이 자리가 그 단의 자리다.
      위의 `textWeak`·`textMuted` 금지는 **본문 메타 글자** 이야기다 — 같은 값이어도
      이름이 다르면 다음 사람이 읽는 뜻이 다르다.
    */
    expect(voteSheet).toContain("placeholderTextColor={surface.placeholder}")
  })

  it("keeps story actions legible over bright photos", () => {
    const viewer = read("app/stories.tsx")
    expect(viewer).toMatch(
      /actionItem:\s*\{[\s\S]*?backgroundColor:\s*"rgba\(11,11,13,0\.62\)"/u,
    )
    expect(viewer).toMatch(/actionItem:\s*\{[\s\S]*?minWidth:\s*48/u)
  })

  it("keeps the post body rendered when a revalidation fails", () => {
    const detail = read("app/post/[id].tsx")
    /*
      재조회 실패는 `data` 를 지우지 않는다 — 본문이 있으면 오류 화면이 이기면 안 된다.
      **예외는 하나뿐이다**: 서버가 "이 글은 없다" 고 말했을 때(`isPostGone` —
      `COMMUNITY_ERROR_001`·404). 상세 쿼리는 계보에서 `initialData` 를 받아 목록에서
      들어오면 `post` 가 **항상** 있으므로, 그 갈래가 없으면 지워진 글 위에서 하트·수정·
      공유가 계속 먹힌다. 그 판정은 `usePostDetail` 이 하고(전송 실패는 거짓이다)
      화면은 그 값만 읽는다 — 여기에 코드 문자열을 다시 적으면 판정이 두 벌이 된다.
    */
    expect(detail).toContain("if (isError && (!post || isPostGone))")
    expect(detail).not.toMatch(/if\s*\(isError\)\s*\{/u)
    expect(detail).not.toMatch(/COMMUNITY_ERROR_001/u)
  })

  it("settles concurrent same-post toggles on the newest server truth", () => {
    const detail = read("src/features/recipe/hooks/usePostDetail.ts")
    const feed = read("src/features/recipe/hooks/useCommunityPosts.ts")
    // 같은 글의 **요청**은 상세에서 직렬화한다(피드는 행이 mutation 하나를 공유해 못 한다).
    expect(detail).toContain("scope: { id: `post-like-${postId}` }")
    expect(detail).toContain("scope: { id: `post-bookmark-${postId}` }")
    /*
      **정적 스코프로 돌아가지 않는다.** 피드 훅은 모든 행이 mutation 하나를 공유하고
      `scope` 는 변수가 아니라 옵션이라 글 id 를 넣을 수 없다 — 즉 정적 스코프는
      서로 **다른 글**의 토글까지 한 줄로 세운다(A 가 느리면 B 가 그만큼 늦게 나간다).
    */
    expect(feed).not.toMatch(/scope:\s*\{\s*id:\s*"community-post/u)
    /*
      대신 **순번 판정**(`communityToggleOrder`)이 불변식을 지킨다:
        (1) 서버 절대값은 **가장 나중에 시작한** 토글만 쓴다(옛 응답이 새 응답을
            덮지 않는다 — 델타 역패치는 실패 경로의 순서만 없앤다),
        (2) 실패 되돌리기는 **자기 델타가 아직 캐시에 있을 때만** 한다(확정값이
            지나간 뒤 한 번 더 빼면 서버가 모르는 값이 된다).
      동작 증명(응답 역전·성공+실패 조합·다른 글 동시성)은
      `communityFeedCache.test.ts` 의 "겹치는 토글" 표에 있다.
    */
    const registry = "src/features/recipe/hooks/communityToggleOrder.ts"
    expect(read(registry)).toContain("export function beginToggle")
    /*
      토글마다 **넷이 한 벌**이다. 개수는 훅마다 다르다 — 피드는 좋아요·북마크 둘,
      상세는 거기에 **댓글 좋아요**가 더해져 셋이다(그 하나만 옛 스냅숏 되씌우기로
      남아 있었고, 하트마다 댓글 목록을 통째로 다시 받는 것이 그 결함을 덮고 있었다).
      그래서 상수가 아니라 "같은 수" 를 못 박는다 — 하나만 빠지면 그 토글이 레인 밖이다.
    */
    for (const source of [detail, feed]) {
      const lanes = source.match(/beginToggle\(/gu)?.length ?? 0
      expect(lanes).toBeGreaterThanOrEqual(2)
      expect(source.match(/ownsConfirmation\(turn\)/gu)).toHaveLength(lanes)
      expect(source.match(/ownsRevert\(turn\)/gu)).toHaveLength(lanes)
      expect(source.match(/endToggle\(turn\)/gu)).toHaveLength(lanes)
      // 자격이 없으면 절대값을 **아예 쓰지 않는다**(무조건 덮던 옛 배선 금지).
      expect(source).toContain("if (confirmed && ownsConfirmation(turn))")
      // 등록부는 **한 벌**이다 — 훅이 자기 지도를 들면 두 화면이 서로를 못 본다.
      expect(source).toContain('from "./communityToggleOrder"')
      expect(source).not.toMatch(/new Map</u)
    }
    /*
      되돌리기는 **떠 둔 값 되씌우기가 아니라 같은 델타 함수**다 — 스코프는 요청만
      줄 세우고 onMutate 는 즉시 돌기 때문에, 되씌우기는 연타에서 첫 탭의 낙관값을
      복원해 하트를 눌린 채로 남긴다(`communityFeedCache.test.ts` 의 반례).
    */
    expect(detail).not.toContain("capturePostDetailFields")
    expect(feed).not.toContain("capturePostFields")
    expect(detail.match(/toggledLike/gu)).toHaveLength(3)
    expect(feed.match(/toggledLike/gu)).toHaveLength(3)
  })

  it("tells the truth at the tail of both community lists", () => {
    const feed = read("src/features/recipe/components/FreePostTab.tsx")
    const search = read("src/features/recipe/views/CommunitySearchScreen.tsx")
    for (const source of [feed, search]) {
      // 다음 페이지 실패는 꼬리에 말한다(전면 오류는 멀쩡한 목록을 지운다).
      expect(source).toContain("isFetchNextPageError")
      expect(source).toContain("<NextPageErrorRow")
      /*
        자동 backfill 은 예산 안에서만 돈다(사람 없이 커서 끝까지 넘기지 않는다).
        예산을 다 쓰면 "더 보기" 를 세운다 — 자동 페이징도 "없어요" 도 아닌 선택지.
      */
      expect(source).toContain("canAutoBackfill")
      /*
        검색 화면은 이펙트 의존성을 값 단위로 펴느라 이름을 바꿔 구조분해한다
        (`noteAutoBackfill: noteSearchAutoBackfill`) — 예산을 **부른다**는 사실만 본다.
      */
      expect(source).toMatch(/note(?:Search)?AutoBackfill\(\)/u)
      expect(source).toContain("<LoadMoreRow")
      /*
        꼬리 문구는 **훅이 기억한 오류**로 고른다. 옵저버의 `error` 는 낙관 패치
        (하트 한 번)에 null 이 되어, 500 이라고 말하던 줄이 일반 문구로 주저앉는다 —
        실패 **사실**만 훅으로 옮기고 **문구**는 못 믿는 출처에서 읽던 자리다.
      */
      expect(source).toMatch(
        /resolveError\(\s*(?:search\.)?nextPageError \?\? (?:search\.)?error,?\s*\)/u,
      )
      /*
        취소로 **아무 것도 못 받고** 끝난 다음 장도 말한다. 실패가 아니라 실패 행을
        세울 수 없고, 로더도 없고, `onEndReached` 는 새 스크롤 없이는 다시 안 쏜다 —
        그대로 두면 목록이 조용히 잘린 채 끝난다(`useInfiniteTail` 머리말 3).
      */
      expect(source).toContain("isTailStalled")
    }
    /*
      ─── 이 검사가 **결함을 못 박고 있었다** (2026-08-21에 고침) ───────────────
      여기는 두 줄로 "검색 화면은 판정을 인라인으로 적는다" 를 요구하고 있었다:
        expect(search).toContain("search.isError && search.posts.length === 0")
        expect(search).toMatch(/!search.hasNextPage && !search.isFetchingNextPage/)
      머리말은 "검색 화면은 처음부터 원본으로 쟀고 그래서 이 결함이 없었다" 고 적었지만,
      **없던 것은 전면 오류의 결함 하나뿐**이었다. 빈 자리와 꼬리를 JSX 안에 손으로 두 벌
      적었다는 사실은 그대로였고, 그래서 조합 넷에서 "검색 결과가 없어요" 와 꼬리의
      "다시"(다음 페이지)가 **같이 섰다** — 그 화면에는 그 둘 말고 아무것도 없다.
      (닿는 경로와 전 조합 계수는 `tests/communityFeedSilentStates.test.ts`.)

      즉 이 두 줄은 "지금 이렇게 생겼다" 를 굳혔을 뿐 어떤 사실도 지키지 않았고,
      고치려면 **검사부터** 바뀌어야 했다. 지금은 두 화면 모두에게 같은 것을 요구한다:
      판정은 `communityFeedSurfaces` 한 곳에서 하고, 화면은 고른 면을 그리기만 한다.
    */
    expect(feed).not.toMatch(/isError && \(visiblePosts\.length === 0/u)
    /*
      두 화면 다 그 함수에 **원본과 보이는 목록을 각각** 넘겨야 한다 — 둘을 바꿔 넣으면
      함수가 아무리 옳아도 화면은 틀린다(어떤 상태에서 무엇이 서는지는
      `communityFeedSurfaces.test.ts` 의 표와 전수 조사가 센다).
    */
    for (const source of [feed, search]) {
      expect(source).toContain("communityFeedSurfaces({")
      expect(source).toMatch(/emptySurface === "error"/u)
      expect(source).toMatch(/tailSurface === "error"/u)
    }
    expect(feed).toContain("postCount: posts.length")
    expect(feed).toContain("visibleCount: visiblePosts.length")
    expect(search).toContain("postCount: search.posts.length")
    expect(search).toContain("visibleCount: visibleResults.length")
    // 손으로 적은 옛 조건이 남으면 그 화면만 다시 갈라진다.
    expect(search).not.toMatch(
      /search\.isError\s*&&\s*search\.posts\.length === 0/u,
    )
    expect(search).not.toMatch(
      /!search\.hasNextPage\s*&&\s*!search\.isFetchingNextPage/u,
    )
    /*
      꼬리의 재시도 문구는 **다음 페이지**를 말해야 한다. 검색의 `errorRetry`
      ("다시 검색하기")는 전면 오류에서만 맞는 말이라 꼬리에 쓰면 어긋난다.
    */
    expect(feed).toContain('retryLabel={t("feed.loadMoreRetry")}')
    expect(search).toContain('retryLabel={t("community.search.loadMoreRetry")}')
    expect(search).not.toContain(
      'retryLabel={t("community.search.errorRetry")}\n                onRetry',
    )
  })

  it("keeps the author's other posts honest when their one request fails", () => {
    const detail = read("app/post/[id].tsx")
    /*
      콜드 스타트(푸시·공유 링크)에서 켜지는 그 **한 번의** 피드 요청이 실패하면
      후보가 0개다. 예전에는 섹션이 통째로 사라졌고(그런 섹션이 있었다는 흔적도 없다),
      재시도 2회 뒤 포기하고 복귀 재조회도 없고 상세의 새로고침 스코프에는 피드가
      빠져 있어서 화면이 살아 있는 내내 그대로였다. 머리글과 재시도를 세운다.
      (재시도가 실제로 복구한다는 증명은 `communityFeedCache.test.ts`.)
    */
    expect(detail).toMatch(
      /const relatedFailed = isRelatedError && posts\.length === 0/u,
    )
    expect(detail).toMatch(/relatedPosts\.length > 0 \|\| relatedFailed/u)
    expect(detail).toContain("<NextPageErrorRow")
    expect(detail).toContain("onRetry={() => void refetchRelated()}")
  })

  it("persists the tail reset when the filter combination changes", () => {
    const tail = read("src/features/recipe/hooks/useInfiniteTail.ts")
    /*
      키가 바뀐 렌더에서 **읽기만** 갈아치우면 저장된 것은 옛 조합 그대로라, 조합을
      다녀와 키가 다시 같아지는 순간 옛 실패와 다 쓴 예산이 되살아난다 — 새로 시도한
      적도 없는데 `handleEndReached` 가 막혀 스크롤로도 재시도할 수 없다.
      (되살아나지 않는다는 증명은 `communityInfiniteTail.test.ts`.)
    */
    expect(tail).toMatch(
      /if \(state\.key !== key\) \{[\s\S]*?setState\(fresh\(key\)\)/u,
    )
    /*
      갱신은 **지금 키**를 ref 로 확인하고 쓴다. 옛 키의 초기값 위에 rebase 하면
      (`fresh(옛 키)`) 늦게 도착한 옛 조합의 결과가 지금 조합의 꼬리를 통째로 지운다.
    */
    expect(tail).toContain("keyRef.current === key && prev.key === key")
    /*
      요청은 **세대 번호**를 들고 나간다 — 당김 새로고침(`cancelRefetch: true`)이 접은
      다음 장은 실패도 아니고 장수도 그대로라, 세대를 안 보면 `resetTail` 이 방금 지운
      자리에 "더 보기" 가 다시 선다.
    */
    expect(tail).toContain("if (superseded()) return")
  })

  it("numbers the popular list from the rendered index, not the server rank", () => {
    const popular = read("src/features/recipe/views/CommunityPopularScreen.tsx")
    expect(popular).toContain("rankText")
    // 목록을 거르는 주체가 클라이언트면 번호도 클라이언트가 소유한다(레일과 같은 규칙).
    expect(popular).not.toContain("item.rank ?? 0")
    expect(popular).toContain("{index + 1}")
  })

  it("keeps the feed out of the post-detail refresh scope", () => {
    const scopes = read("src/features/recipe/refresh/scopes.ts")
    /*
      선언 본문만 본다 — 파일 전체를 훑으면 뒤따르는 보관함 스코프의 `POSTS_KEY` 나
      "왜 뺐는지" 를 적은 주석이 걸려서 테스트가 거짓 실패한다.
    */
    const postScope = scopes.match(
      /export const COMMUNITY_POST_REFRESH[^\]]*\]/u,
    )?.[0]
    expect(postScope).toBeDefined()
    expect(postScope).not.toContain("POSTS_KEY")
    /*
      상세는 **캐시가 있을 때만** 피드 쿼리를 관찰하지 않는다(옵저버 하나가 전 페이지
      재조회를 부른다). 캐시가 아예 없는 콜드 스타트(푸시·공유 링크)에서는 관찰해야
      "작성자의 다른 글" 섹션이 산다 — 그때 나가는 요청은 첫 장 하나뿐이다.
    */
    expect(read("app/post/[id].tsx")).toContain(
      'useCommunityPosts({ observe: "cold-only" })',
    )
    // 글쓰기·수정 정산도 계보 규칙(낡음 표시만)을 쓴다.
    const feedHook = read("src/features/recipe/hooks/useCommunityPosts.ts")
    expect(feedHook).not.toMatch(
      /invalidateQueries\(\{ queryKey: POSTS_KEY \}\)/u,
    )
    /*
      댓글 정산도 같은 규칙이다 — 계보를 통째로 재조회하면 들고 있는 페이지 수만큼
      요청이 나간다(댓글 하나에 GET 10개). 상세 훅이 `POSTS_KEY` 를 아예 들여오지
      않는 것으로 못 박는다(주석 안의 문자열에 걸리지 않게 import 절만 본다).
    */
    const detailHook = read("src/features/recipe/hooks/usePostDetail.ts")
    const detailImports = detailHook.match(
      /import \{[^}]*\} from "\.\/communityFeedCache"/u,
    )?.[0]
    expect(detailImports).toBeDefined()
    expect(detailImports).not.toContain("POSTS_KEY")
    expect(detailHook).toContain("invalidateFeedCaches(queryClient)")
  })

  it("is honest about loading and failure in the activity library", () => {
    const lib = read("app/community-library.tsx")
    expect(lib).toContain("V2ErrorState")
    expect(lib).toContain("resolveError")
    expect(lib).toMatch(/isLoading\s*&&\s*posts\.length === 0/u)
    expect(lib).toMatch(/isError\s*&&\s*posts\.length === 0/u)
  })

  it("connects detail to public author profile and the dedicated report form", () => {
    const detail = read("app/post/[id].tsx")
    const card = read("src/features/recipe/components/PostListItem.tsx")
    expect(detail).toContain("/community/author/${post.authorId}")
    expect(detail).toContain("/community/report?postId=${post.id}")
    expect(card).toContain("/community/report?postId=${postId}")
    expect(read("app/community/report.tsx")).toContain("CommunityReportScreen")
  })
})
