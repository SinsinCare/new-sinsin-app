/**
 * 투표 항목 규칙 중 **중복 판정**. 정본은 서버
 * `sinsin-be-bun/src/domains/community/schemas.ts` 의 `normalizePollOptions` 다.
 *
 * 여기가 서버와 갈리면 양쪽 다 조용하다.
 *  - 앱이 **느슨하면**: 완료가 눌리고 사진까지 다 올라간 뒤에 `POST /community/posts`
 *    가 "중복된 투표 항목이 있습니다" 로 400 을 낸다. 앱은 `fieldErrors` 를 읽지 않으므로
 *    "입력한 내용을 다시 확인해 주세요" 라는 뜻 없는 문구만 남는다.
 *  - 앱이 **빡세면**: 서버가 받아 줄 투표를 앱이 막는다. 눈으로는 서로 다른 두 항목에
 *    "같은 항목이 두 번 있어요" 가 뜨고 완료 버튼이 죽은 채로 있다 — 사용자가 할 수
 *    있는 일이 없다.
 *
 * 투표에는 **수정 API 가 없다.** 잘못 올라간 투표는 글쓴이도 못 고친다.
 *
 * 옮겨 온 것은 접기 규칙 하나뿐이다 — 빈 항목을 거르는 기준(서버는 "보이는 내용",
 * 여기는 `trim()` 뒤 길이)까지 같지는 않다.
 */

/**
 * 대소문자를 접었을 때 같은 항목이 두 번 있는가. 빈 항목은 세지 않는다.
 *
 * 소문자화는 **로케일 독립**이어야 한다. 인자 없는 `toLocaleLowerCase()` 는 기기
 * 로케일을 쓰므로 터키어·아제르바이잔어 기기에서 `"DIET"` 가 `"dıet"`(점 없는 ı)이
 * 되고, **그 기기에서만** 판정이 서버와 어긋난다. 서버도 `toLowerCase()` 다.
 * (같은 이유·같은 처방이 태그 축에도 있다 — `communityTags.ts`.)
 */
export function hasDuplicateVoteOptions(options: readonly string[]): boolean {
  const filled = options
    .map((option) => option.trim())
    .filter((option) => option.length > 0)
  return (
    new Set(filled.map((option) => option.toLowerCase())).size !== filled.length
  )
}
