/**
 * 앱 바깥으로 나가는 **딥링크 URL** 을 만드는 곳. 손으로 스킴 문자열을 쓰지 말고 여기를 쓴다.
 *
 * ## 실측된 결함
 *
 * 식당 상세의 공유 버튼이 링크를 이렇게 만들고 있었다:
 *
 * ```ts
 * `sinsin://restaurant/${restaurantId}`   // 슬래시 2개
 * ```
 *
 * 그런데 expo-router 가 등록하는 접두사는 `Linking.createURL("/")` 가 만드는 값이고,
 * 커스텀 스킴에서 그것은 **슬래시 3개**인 `sinsin:///` 다. 빈 host 가 들어가기 때문이다.
 * 슬래시 2개로 쓰면 URL 파서가 `restaurant` 를 **경로가 아니라 host 로** 읽는다:
 *
 * ```
 * sinsin://restaurant/317   →  host="restaurant"  path="/317"
 * sinsin:///restaurant/317  →  host=""            path="/restaurant/317"
 * ```
 *
 * 그래서 라우터에 도착하는 경로가 `/restaurant/317` 이 아니라 `/317` 이 된다. 실제로
 * `sinsin://restaurant/164` 는 **레시피 상세(단호박죽)** 를 열었고 `sinsin://restaurant/317`
 * 은 지도 탭에 떨어졌다 — 164 는 존재하는 레시피 id 이고 317 은 아니라서 갈린 것이다.
 * 즉 "가끔 되고 가끔 안 되는" 것이 아니라 **id 값에 따라 엉뚱한 화면이 결정적으로 열렸다.**
 *
 * ## 왜 상수로 안 두고 함수로 두나
 *
 * 올바른 접두사는 빌드 형태마다 다르다 — 개발 클라이언트/Expo Go 는 `exp+sinsin://...` 나
 * `exp://host/--/...` 를, 스토어 빌드는 `sinsin:///...` 를 쓴다. 슬래시 개수를 손으로 고쳐
 * 박으면 개발에서 되던 것이 배포에서 깨지거나 그 반대가 된다. `Linking.createURL` 은
 * 지금 실행 중인 형태에 맞는 접두사를 붙여 주므로, **문자열을 짓는 책임을 우리가 갖지 않는 것**
 * 자체가 고침이다.
 *
 * 하드코딩 재발은 `tests/deepLinkFormat.test.ts` 가 소스를 훑어서 막는다.
 */

import * as Linking from "expo-linking"

/**
 * expo-router 의 라우트 경로를 `createURL` 이 기대하는 형태로 맞춘다.
 *
 * `createURL` 은 앞의 슬래시가 없어도 붙여 주지만, 있고 없고에 따라 개발 클라이언트에서
 * `--` 구분자 뒤가 미묘하게 달라진 적이 있어 **부르는 쪽 표기와 무관하게** 한 형태로 고정한다.
 * 네이티브 모듈 없이 검증할 수 있도록 따로 빼 두었다.
 */
export function normalizeDeepLinkPath(path: string): string {
  const trimmed = path.trim()
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

/**
 * 앱 안의 라우트를 가리키는 공유 가능한 URL 을 만든다.
 *
 * @param path expo-router 경로. `/restaurant/317` 처럼 **파일 트리 기준 URL** 을 그대로 준다.
 */
export function buildDeepLink(path: string): string {
  return Linking.createURL(normalizeDeepLinkPath(path))
}

/** 식당 상세 딥링크. 공유 메시지가 유일한 사용처지만, 경로를 한 군데서만 짓게 하려고 둔다. */
export function restaurantDeepLink(restaurantId: number | string): string {
  return buildDeepLink(`/restaurant/${restaurantId}`)
}
