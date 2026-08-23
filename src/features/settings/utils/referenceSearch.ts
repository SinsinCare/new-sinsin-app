/**
 * 의학 참고 자료 검색의 매칭 규칙.
 *
 * 접기는 **로케일 독립**이어야 한다. 인자 없는 `toLocaleLowerCase()` 는 기기 로케일을
 * 쓰므로 터키어·아제르바이잔어 기기에서 `"KDIGO"` 가 `"kdıgo"`(점 없는 ı)로 접힌다.
 * 반면 사용자가 친 `"kdigo"` 는 이미 소문자라 그대로다 — 같은 글자를 쳤는데 목록이
 * 통째로 비고, 화면에는 "결과 없음" 만 남는다. 검색은 표시가 아니라 **매칭**이므로
 * 기기 로케일이 낄 자리가 없다. (같은 처방: `features/recipe/utils/communityTags.ts`.)
 */

/** 검색이 훑는 축. 화면의 `ReferenceItem` 중 이 두 개만 본다. */
export interface ReferenceSearchable {
  title: string
  meta: string
}

/** 질의가 제목이나 메타에 걸리는가. 빈 질의는 전부 통과한다(필터 없음과 같다). */
export function matchesReferenceQuery(
  item: ReferenceSearchable,
  query: string,
): boolean {
  const needle = query.toLowerCase()
  return (
    item.title.toLowerCase().includes(needle) ||
    item.meta.toLowerCase().includes(needle)
  )
}
