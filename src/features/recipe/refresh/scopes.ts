/**
 * **화면별 새로고침 스코프.** "여기서 당기면 무엇이 다시 오는가" 의 답이 전부 이 파일에 있다.
 *
 * 커뮤니티와 레시피는 한 기능 폴더에 산다(`CLAUDE.md`: 커뮤니티 탭 코드가 `features/recipe/`).
 * 그래서 두 스코프가 한 파일에 있고, 서로의 키를 **덮지 않는다는 것이 눈으로 확인된다** —
 * 예전처럼 화면마다 `Promise.all([a.refetch(), b.refetch()])` 를 손으로 쓰면 이 확인이
 * 불가능하다.
 *
 * ─── 접두어를 쓰는 규칙 ────────────────────────────────────────────────────
 * react-query 는 키 배열을 **칸마다 정확히** 비교하고, 짧은 쪽이 접두어면 일치로 본다.
 * 그래서 `["community-posts"]` 는 `["community-posts", {tag}]` 를 잡지만
 * `["community-post"]` 는 잡지 않는다(문자열이 다르다). 복수/단수가 갈라져 있는 것은
 * 사고가 아니라 이 성질을 쓰기 위한 것이고, 그래서 **이름을 바꾸면 스코프가 조용히
 * 넓어지거나 좁아진다.** 키 상수를 각 훅에서 import 하는 이유가 그것이다 — 여기에
 * 문자열을 복사해 두면 훅이 이름을 바꾼 날 이 파일만 옛날 이름을 가리킨다.
 *
 * ─── 스코프에 넣지 않은 것 ─────────────────────────────────────────────────
 *  - `["recipe-suggest", …]` (검색 자동완성): 입력 중에만 살아 있고, 당김은 목록을
 *    새로 받는 동작이지 내가 치던 글자를 다시 묻는 동작이 아니다.
 *  - 프로필(`useMyPageProfile`): 커뮤니티 화면에 붙어 있지만 케밥 게이트용이다.
 *    피드를 당겼다고 내 프로필을 다시 받을 이유가 없다.
 *  - 최근 검색어: 서버가 아니라 로컬 저장소다.
 */

import { BLOCKED_KEY } from "../hooks/useBlockedUsers"
import { COMMUNITY_POPULAR_KEY } from "../hooks/useCommunityPopularPosts"
import { POSTS_KEY } from "../hooks/useCommunityPosts"
import { STORIES_KEY } from "../hooks/useCommunityStories"
import { POST_COMMENTS_KEY, POST_DETAIL_KEY } from "../hooks/usePostDetail"
import { recipeV2Keys } from "../hooks/useRecipeDetailV2"
import { RECIPE_LIST_QUERY_ROOT } from "../hooks/useRecipeListV2"
import { ARCHIVE_QUERY_ROOT } from "../archive/useRecipeArchiveList"
import type { RefreshScopeKeys } from "@/src/shared/refresh"

/**
 * 커뮤니티 피드 화면. 스토리 레일과 차단 목록이 같이 온다 —
 * 셋 다 이 한 화면에 그려지므로 하나만 새것이면 사용자는 무엇이 새것인지 알 수 없다.
 * (차단 목록은 다른 기기에서 차단한 사람이 피드에서 계속 보이던 실측 때문에 들어왔다.)
 */
export const COMMUNITY_FEED_REFRESH: RefreshScopeKeys = [
  // 이 스코프의 피드 키는 **로드된 페이지 수만큼 요청을 낸다** — 무한 쿼리의 refetch 는
  // 들고 있는 페이지를 순서대로 다시 받는다. 알고 있는 비용이다(당김은 1페이지로
  // 잘라 막고, 복귀는 일부러 안 자른다 — `trimFeedCacheToFirstPage` 머리말).
  POSTS_KEY,
  STORIES_KEY,
  BLOCKED_KEY,
  // 인기글 레일이 서버 인기 API(실시간)를 먹게 되면서 같이 새로 받는다 —
  // 피드만 새것이고 레일은 아까 것이면 무엇이 새로고침됐는지 알 수 없다.
  COMMUNITY_POPULAR_KEY,
]

/**
 * 글 상세. 본문·댓글이 한 몸이다 — 댓글만 새로 오면 좋아요 수가 어긋난다.
 *
 * **피드 키(`POSTS_KEY`)는 일부러 없다.** 예전에는 "상세에서 새로 받은 좋아요·북마크가
 * 뒤에 깔린 목록과 갈라지지 않게" 같이 받았는데, 그 정산은 이미 `patchPostInFeedCaches`
 * 가 피드·검색·인기 캐시에 반영한다 — 재조회할 이유가 없다. 반면 비용은 컸다:
 * 무한 쿼리는 refetch 때 **들고 있는 페이지 전부**를 순서대로 다시 받으므로, 열 페이지를
 * 스크롤한 뒤 글 하나를 열고 당기면 본문·댓글이 이미 왔는데도 열 번째 피드 페이지가
 * 올 때까지 스피너가 돌고, 그중 하나만 실패해도 "새로고침 실패" 토스트가 떴다.
 * 대신 상세의 당김은 피드에 **낡음 표시만** 남긴다(`app/post/[id].tsx` 의 `extra`).
 */
export const COMMUNITY_POST_REFRESH: RefreshScopeKeys = [
  POST_DETAIL_KEY,
  POST_COMMENTS_KEY,
]

/** 내 활동(쓴 글 / 좋아요 / 북마크). 세 탭 모두 `community-posts` 에서 갈라져 나온다. */
export const COMMUNITY_LIBRARY_REFRESH: RefreshScopeKeys = [
  POSTS_KEY,
  BLOCKED_KEY,
]

/**
 * 인기글 전용 화면. 피드 스코프를 통째로 쓰지 않는 이유: 이 화면에는 스토리·피드가
 * 없어서 그 키들은 `type: "active"` 로도 잡히지 않지만, 스코프는 "이 화면이 무엇을
 * 새로 받는가" 의 문서다 — 없는 것을 적어 두면 문서가 거짓말을 한다.
 * 차단 목록은 같이 받는다(차단 필터가 이 화면에도 걸린다).
 */
export const COMMUNITY_POPULAR_REFRESH: RefreshScopeKeys = [
  COMMUNITY_POPULAR_KEY,
  BLOCKED_KEY,
]

/**
 * 레시피 탭. `recipes-v2` 뿌리 하나가 홈 섹션(`["recipes-v2","home",locale]`)과
 * 목록(`["recipes-v2",locale,q,…]`) 을 **둘 다** 덮는다 — 예전에 손으로
 * `Promise.all([list.refetch(), refetchHome()])` 를 쓰던 자리다. 이제 이 화면에
 * `recipes-v2` 쿼리가 하나 더 붙어도 저 배열을 고칠 필요가 없다.
 */
export const RECIPE_LIST_REFRESH: RefreshScopeKeys = [RECIPE_LIST_QUERY_ROOT]

/** 레시피 상세(본문 + 리뷰). 뿌리가 `recipe-v2`(단수) 라 목록을 건드리지 않는다. */
export const RECIPE_DETAIL_REFRESH: RefreshScopeKeys = [recipeV2Keys.root]

/** 저장한 레시피 / 최근 본 레시피 보관함. */
export const RECIPE_ARCHIVE_REFRESH: RefreshScopeKeys = [ARCHIVE_QUERY_ROOT]
