/**
 * 커뮤니티 카드에 **수를 내보내기 직전**의 한 걸음.
 *
 * ## 고치려는 것
 *
 * 피드의 조회·좋아요·댓글 수는 전부 `{likeCount}` 처럼 원시값이 그대로 나갔다.
 * `3291` 은 세 자리마다 끊기지 않으면 한눈에 안 읽힌다 — 숫자를 세어 보게 만드는
 * 표기는 그 자체로 정보가 아니라 일거리다.
 *
 * 더 나쁜 건 **한 줄 안에서 규칙이 갈렸다**는 것이다. 작성자 프로필 한 행에서 글 수는
 * `3291`, 팔로워·팔로잉은 `toLocaleString()` 이었다. 그리고 그 `toLocaleString()` 은
 * 인자가 없어서 **기기 로케일**을 따른다 — 앱 언어를 한국어로 두고 기기를 독일어로
 * 쓰는 사람에게는 같은 화면에서 `3.291` 과 `3291` 이 나란히 보인다. 앱이 자기 언어로
 * 말하지 않고 기기가 대신 말하게 둔 자리는 커뮤니티가 유일했다.
 *
 * ## 규칙
 *
 * **언어를 인자로 받는다.** 이 인자가 이 파일의 요점이다 — 값이 아니라 "누가 정하는가"
 * 를 고친 것이라, 기본값을 두지 않는다. 기본값을 두는 순간 호출부는 다시 안 넘기고,
 * 안 넘긴 자리가 어디인지 알 수 없게 된다.
 *
 * 자릿수를 끊는 규칙 자체는 `groupThousands`(레시피 카드가 쓰던 것) 하나를 그대로
 * 쓴다. 같은 일을 하는 두 번째 구현을 만들면 언젠가 두 화면이 다른 답을 낸다.
 * `Intl.NumberFormat` 을 쓰지 않는 이유도 거기 있다 — 그쪽은 기기·엔진의 로케일
 * 데이터에 따라 결과가 흔들려서 테스트가 기기 설정을 따라간다.
 */

import { groupThousands } from "../components/list/recipeCardFormat"

/**
 * 앱 언어별 천 단위 구분 기호.
 *
 * 지금은 둘 다 쉼표다. 그래도 표를 두는 이유는 **"두 언어가 같다" 와 "기기가 정한다"
 * 가 다른 말이기 때문**이다. 세 번째 언어가 늘면 여기 한 줄을 적으면 되고, 그때
 * 호출부는 한 곳도 고치지 않는다.
 */
const GROUP_SEPARATOR = { ko: ",", en: "," } as const

/** 앱 언어 코드 → 표 열쇠. `i18n.language` 는 `"en-US"` 처럼 지역이 붙어 올 수 있다. */
function separatorFor(language: string): string {
  return language.toLowerCase().startsWith("en")
    ? GROUP_SEPARATOR.en
    : GROUP_SEPARATOR.ko
}

/**
 * 카드에 그릴 수 하나. `3291` → `3,291`.
 *
 * @param language `useTranslation()` 이 주는 `i18n.language`. **기기 로케일이 아니다.**
 *   (같은 이유로 `formatTimeAgo(date, language)` 도 언어를 받는다 — 같은 줄에 있는
 *   두 값이 서로 다른 언어를 따르면 그것이 곧 결함이다.)
 */
export function formatCount(value: number, language: string): string {
  return groupThousands(value).split(",").join(separatorFor(language))
}
