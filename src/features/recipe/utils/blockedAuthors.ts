/**
 * 차단 판정 — **순수 계산부**. react·react-query·`blockService` 를 import 하지 않는다.
 *
 * 원래 `hooks/useBlockedUsers.ts` 안에 있었는데, 그 파일은 `blockService` → axios →
 * expo(`appConfig`·`tokenService`)를 끌고 온다. 그래서 순수 모델 파일
 * (`components/detail/recipeDetailModel.ts` — "RN·Tamagui 를 import 하지 않는다" 가 전제)이
 * 판정을 부르려면 그 전부를 mock 해야 했다. 판정만 떼어 두면 양쪽이 **같은 한 벌**을
 * 부르면서도 순수한 파일은 순수하게 남는다.
 *
 * 훅은 이 모듈을 그대로 다시 내보낸다 — 기존 import 경로는 하나도 바뀌지 않는다.
 */

import type { BlockedUser } from "@/src/services/blockService"

/**
 * 차단 판정의 두 축. 서버의 같은 이름 구조(`community/repository.ts` 의
 * `BlockedAuthors`)와 **같은 모양**이라, 앱과 서버가 같은 글에 대해 같은 답을 낸다.
 *
 *  - `ids`             — 사람으로 건 차단. 개명·닉네임 양도에 면역이다.
 *  - `unresolvedNames` — 서버가 아직 사람으로 풀지 못한 행(`blockedUserId == null`).
 *                        서버가 그 행을 이름으로 거르므로 앱도 이름으로 거른다.
 */
export interface BlockedAuthors {
  readonly ids: ReadonlySet<number>
  readonly unresolvedNames: ReadonlySet<string>
}

/** 아무도 접지 않는 필터. 목록을 아직·끝내 못 받은 동안의 정직한 상태다. */
export const NO_BLOCKS: BlockedAuthors = {
  ids: new Set<number>(),
  unresolvedNames: new Set<string>(),
}

export function toBlockedAuthors(rows: readonly BlockedUser[]): BlockedAuthors {
  const ids = new Set<number>()
  const unresolvedNames = new Set<string>()
  for (const row of rows) {
    // `== null` 은 `null`(서버가 못 푼 행)과 `undefined`(필드를 안 내보내는 옛 서버)를
    // 한꺼번에 잡는다. 둘 다 "id 를 모른다" 이고, 모르면 옛 규칙(이름)으로 돌아간다.
    if (row.blockedUserId == null) unresolvedNames.add(row.blockedNickName)
    else ids.add(row.blockedUserId)
  }
  return { ids, unresolvedNames }
}

/**
 * 이 글쓴이를 접는가. **판정은 여기 한 벌이다**(화면마다 다시 적지 말 것 —
 * `contentOwnership` 의 소유자 판정과 같은 이유).
 *
 * ─── `authorId` 가 없으면 "차단 아님" 이다 ─────────────────────────────────
 * 탈퇴한 글쓴이는 `authorId === null` 이고(서버 익명화), 옛 응답은 필드 자체가 없어
 * `undefined` 다. 그때 id 축은 **아무것도 모른다** — 모르는 것을 "차단일지도 모르니
 * 숨긴다" 로 읽으면 남의 글까지 조용히 사라진다. 서버가 SQL 에서 같은 함정을 밟았고
 * (`NOT IN` 에 NULL 이 섞이면 한 행도 안 남는다), 여기서도 같은 규칙을 쓴다:
 * **모르면 안 접는다.**
 *
 * 이름 축은 그래서 `unresolvedNames` 로만 남는다. 풀린 차단은 이름을 아예 보지
 * 않으므로, 상대가 개명한 뒤 그 닉네임을 가져간 제3자가 **이 기기에서만** 가려지던
 * 잔재가 사라진다 — 서버는 이미 그러지 않는다.
 */
export function isAuthorBlocked(
  blocked: BlockedAuthors,
  author: { readonly authorId?: number | null; readonly authorName: string },
): boolean {
  if (author.authorId != null && blocked.ids.has(author.authorId)) return true
  return blocked.unresolvedNames.has(author.authorName)
}
