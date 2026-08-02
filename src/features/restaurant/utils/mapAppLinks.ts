/**
 * **길찾기** — 외부 지도 앱으로 보내는 링크를 만드는 순수 모듈.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 왜 없으면 안 되는 기능인가
 *
 * 이 화면은 "이 식당에 가도 되는가" 를 판단하는 곳이다. 판단이 끝난 사용자가 다음에
 * 하는 일은 하나뿐이다 — **간다.** 국내 지도·맛집 서비스(네이버 지도 · 카카오맵 ·
 * 다이닝코드 · 캐치테이블)가 예외 없이 `길찾기` 를 상세의 첫 액션 줄에 두는 이유다.
 * 우리 상세에는 `진단하기 · 전화 · 공유 · 저장` 만 있었고, 주소는 **글자로만** 있었다.
 * 그래서 사용자는 상호명을 복사해 지도 앱에 다시 검색해야 했다.
 *
 * 우리가 경로를 계산하지는 않는다(그건 지도 회사의 일이다). 대신 **좌표와 이름을 들고
 * 지도 앱을 연다** — 국내 앱들이 서로에게 하는 것과 같은 방식이다.
 *
 * ■ 왜 앱을 고르게 하는가
 *
 * 한 앱으로 밀어 넣지 않는다. 국내 사용자는 카카오맵·네이버지도 중 **쓰던 것**이 있고,
 * 안 쓰는 앱으로 튀면 로그인·설치 화면을 만난다. 그래서 화면은 목록을 주고, 이 모듈은
 * 각 선택지의 (a) 앱 스킴과 (b) 앱이 없을 때의 웹 주소를 함께 돌려준다.
 *
 * ■ `canOpenURL` 을 믿지 않는다 (iOS 실측 함정)
 *
 * iOS 는 `Info.plist` 의 `LSApplicationQueriesSchemes` 에 적힌 스킴만 조회를 허용하고,
 * 적히지 않은 스킴은 앱이 깔려 있어도 `canOpenURL` 이 **false** 다. 이 저장소의
 * `app.json` 에는 그 목록이 없다(실측). 그러니 "앱이 없다" 로 단정하면 안 된다.
 *
 * 그래서 호출부의 규칙은 이렇다: **앱 스킴을 먼저 열어 보고, 실패(reject)하면 웹으로
 * 내려간다.** 웹 주소는 두 서비스 모두 앱이 깔려 있으면 앱으로 넘겨주고 없으면 웹
 * 지도를 여는 링크라, 어느 쪽이든 사용자는 길찾기를 본다. 이 모듈은 그 두 값을 만들고
 * 순서를 정할 뿐이고, `Linking` 은 건드리지 않는다(그래서 node 환경 jest 가 검증한다).
 *
 * ■ 좌표가 없으면 아무것도 만들지 않는다
 *
 * `lat`/`lng` 가 null 인 행이 실제로 있다. 좌표 없이 이름만으로 링크를 만들면 동명이인
 * 가게로 안내하게 된다 — 없는 것보다 나쁘다. 그때는 화면이 `길찾기` 자체를 그리지 않는다
 * (이 기능 전체의 규칙: 눌러도 아무 일 없는 버튼을 남기지 않는다).
 */

export type MapAppKey = "kakao" | "naver" | "apple" | "google"

export interface MapAppTarget {
  /** 목적지 좌표. 둘 중 하나라도 없으면 링크를 만들지 않는다. */
  lat: number | null
  lng: number | null
  /** 지도 앱에 표시될 목적지 이름. */
  name: string
}

export interface MapAppLink {
  key: MapAppKey
  /** 앱 스킴. 먼저 시도한다. */
  appUrl: string
  /** 앱이 없을 때. 두 국내 서비스는 이 주소가 앱으로도 넘어간다. */
  webUrl: string
}

/** 지도 앱이 우리 앱으로 돌아올 때 쓰는 이름. 네이버 스킴이 요구한다. */
const APP_NAME = "com.mediology.sinsin-care"

/**
 * 좌표가 실제 지도 위의 점인가.
 *
 * `0,0` 을 막는 이유: 서버의 좌표 없는 행이 `0` 으로 내려온 적이 있고, 그 값은 기니만
 * 바다 위의 실제 좌표라 링크가 **정상적으로 열린다**. 사용자는 대서양 한가운데로
 * 안내받는다. 위도 범위(±90)·경도 범위(±180)도 함께 본다.
 */
function isUsableCoordinate(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/**
 * 길찾기 선택지. 순서는 **국내 점유율 순**(카카오맵 → 네이버지도) 다음에 OS 기본이다.
 * 좌표가 없으면 빈 배열이고, 그때 화면은 길찾기 버튼을 그리지 않는다.
 *
 * `ios` 를 받는 이유: 애플 지도는 iOS 에만 있고 구글 지도는 안드로이드의 기본이다.
 * 둘 다 나열하면 "설치되지 않은 앱" 이 목록에 섞인다.
 */
export function mapAppLinks(
  target: MapAppTarget,
  platform: "ios" | "android",
): MapAppLink[] {
  const { lat, lng } = target
  if (!isUsableCoordinate(lat, lng)) return []

  const name = target.name.trim()
  const label = encodeURIComponent(name.length > 0 ? name : "목적지")

  const links: MapAppLink[] = [
    {
      key: "kakao",
      // 카카오맵: 도착지 좌표만 주면 출발지는 현재 위치가 된다.
      appUrl: `kakaomap://route?ep=${lat},${lng}&by=CAR`,
      webUrl: `https://map.kakao.com/link/to/${label},${lat},${lng}`,
    },
    {
      key: "naver",
      appUrl: `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${label}&appname=${APP_NAME}`,
      webUrl: `https://map.naver.com/p/directions/-/${lng},${lat},${label}/-/transit`,
    },
  ]

  if (platform === "ios") {
    links.push({
      key: "apple",
      // 애플 지도는 스킴과 웹 주소가 같다(iOS 가 `maps.apple.com` 을 앱으로 넘긴다).
      appUrl: `maps://?daddr=${lat},${lng}&q=${label}`,
      webUrl: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
    })
  } else {
    links.push({
      key: "google",
      appUrl: `google.navigation:q=${lat},${lng}`,
      webUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    })
  }

  return links
}

/** 길찾기를 줄 수 있는 상태인가. 화면이 버튼을 그릴지 정할 때 쓴다. */
export function canRouteTo(target: MapAppTarget): boolean {
  return isUsableCoordinate(target.lat, target.lng)
}
