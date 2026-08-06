/**
 * "이 글·댓글이 내 것인가" 에 답하는 **유일한 곳**.
 *
 * ## 왜 한 곳이어야 하는가
 *
 * 이 판정은 수정·삭제를 보일지를 정한다. 예전에는 화면마다 각자
 * `authorName === 내 닉네임` 으로 **추측**했다 — 글 상세·목록·보관함·수정 화면까지
 * 다섯 곳이 같은 질문에 따로 답했고, 그중 하나(`PostListItem`)는 `authorName === "나"`
 * 라는 리터럴 비교였다. 닉네임은 **신원이 아니라 표시용**이라 동명이인이면 남의 글에
 * 수정·삭제가 떴다(QA 2026-08-06). 고쳐도 다음 화면에서 되살아나는 종류의 결함이다.
 *
 * 앱은 이 질문에 스스로 답할 **수단이 없다**: `authStore` 의 `uid` 는 이메일 로그인일
 * 때만 사용자 id 이고 소셜 로그인에서는 이메일·토큰이 들어간다(`authService`), 프로필
 * 응답(`/user/profile`)에는 id 가 아예 없다. 누가 썼는지와 누가 묻는지를 **둘 다 아는
 * 쪽은 서버뿐**이다. 그래서 서버가 `isMine` 을 내려주고 앱은 그것만 읽는다 —
 * 레시피 리뷰(`mine`)·스토리(`isMine`)가 이미 같은 규칙이었고, 커뮤니티만 예외였다.
 *
 * ## 새 화면을 만들 때
 *
 * 소유자 판정이 필요하면 **이 함수를 부른다.** 닉네임을 비교하지 말 것.
 */

/** 탈퇴한 글쓴이의 표시 이름. 이름이 신원 노릇을 하는 마지막 자리다. */
export const WITHDRAWN_AUTHOR_NAME = "탈퇴한 사용자"

/** 소유자 판정에 필요한 최소한의 모양. 글이든 댓글이든 이만큼만 있으면 된다. */
export interface OwnableContent {
  readonly isMine?: boolean | null
  readonly authorId?: number | null
  readonly authorName: string
}

/**
 * 서버가 `isMine` 을 내려주지 않던 시절과의 다리.
 *
 * **없애는 조건**: 프로덕션·테스트 서버 양쪽이 `isMine` 을 내보내고, 그보다 오래된
 * 서버를 보는 앱이 남아 있지 않게 되면 이 인자와 아래 분기를 지운다. 그때 이 함수는
 * `content.isMine === true` 한 줄이 된다.
 *
 * 남겨 둔 이유는 배포 순서 때문이다 — 서버가 먼저 올라가지 않은 채 앱만 나가면
 * `isMine` 이 전부 undefined 가 되어 **자기 글의 수정·삭제가 통째로 사라진다.**
 * 옛 동작(닉네임 대조)은 틀릴 때가 있지만, 없어지는 것보다는 낫다.
 */
export function isMyContent(
  content: OwnableContent,
  myNickName: string | null | undefined,
): boolean {
  // 탈퇴한 글쓴이의 글은 누구의 것도 아니다. 이름이 겹쳐도 여기서 걸린다.
  if (
    content.authorId === null ||
    content.authorName === WITHDRAWN_AUTHOR_NAME
  ) {
    return false
  }

  // 서버가 답을 줬으면 그게 정답이다. 앱이 다시 계산하지 않는다.
  if (typeof content.isMine === "boolean") return content.isMine

  // ── 아래는 옛 서버 전용 임시 경로다(위 주석의 "없애는 조건" 참고). ──
  if (myNickName == null || myNickName.length === 0) return false
  return content.authorName === myNickName
}

/**
 * **남의 것이라고 단정할 수 있는가.** `!isMyContent(...)` 와 다르다.
 *
 * `isMyContent` 는 모르면 `false`("내 것이라 할 수 없다")를 준다 — 수정·삭제를
 * 숨기는 쪽으로 기우는 게 맞기 때문이다. 그런데 **화면을 닫는** 판단에 그 값을 쓰면
 * 반대로 위험하다: 프로필이 아직 안 온 순간에 자기 글 수정 화면에서 튕겨 난다.
 *
 * 그래서 "모른다" 와 "남의 것이다" 를 나눈다. 닫기·차단처럼 **되돌리기 어려운 동작**은
 * 이 함수를 쓰고, 모르는 동안에는 아무것도 하지 않는다.
 */
export function isConfidentlyNotMine(
  content: OwnableContent,
  myNickName: string | null | undefined,
): boolean {
  if (
    content.authorId === null ||
    content.authorName === WITHDRAWN_AUTHOR_NAME
  ) {
    return true
  }
  if (typeof content.isMine === "boolean") return !content.isMine
  // 옛 서버: 내 닉네임을 알기 전에는 판단하지 않는다.
  if (myNickName == null || myNickName.length === 0) return false
  return content.authorName !== myNickName
}
