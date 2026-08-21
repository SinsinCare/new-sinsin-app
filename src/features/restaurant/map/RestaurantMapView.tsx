/**
 * 지도 WebView 래퍼.
 *
 * ## 이 컴포넌트가 해결하는 세 가지
 *
 * 1. **HTML 을 마운트 시 한 번만 만든다.** `useMemo(..., [])` 다. 의존성 배열이 빈 것은
 *    실수가 아니다 — 마커나 카메라가 바뀔 때 HTML 을 다시 만들면 WebView 가 리로드되고
 *    카카오 SDK 를 다시 내려받고 카메라가 초기 위치로 튄다. 그래서 `center`/`level` prop 은
 *    **최초 1회만** 반영되며, 이후 카메라는 `ref.moveTo()` 로만 움직인다. 이 규칙을
 *    깨고 싶어지면 먼저 이 주석을 지워야 한다.
 *
 * 2. **ready 전 명령을 잃지 않는다.** 데이터가 SDK 보다 먼저 도착하는 일이 흔하다
 *    (react-query 캐시 히트 + 느린 네트워크). 그때 `setMarkers` 를 그냥 주입하면
 *    `window.__sinsinMap` 이 아직 없어 조용히 사라지고, 지도는 비어 있는데
 *    앱 상태는 "마커 200개 표시됨" 이 된다. ready 전 명령은 큐에 쌓아 두고 흘려보낸다.
 *
 * 3. **SDK 실패를 위로 알린다.** `onMapError` 를 받은 화면은 지도를 접고 리스트 모드로
 *    내려간다. 아무 처리도 안 하면 사용자는 회색 사각형 앞에서 멈춘다.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import { StyleSheet, View } from "react-native"
import { WebView, type WebViewMessageEvent } from "react-native-webview"

import { clampZoom } from "../utils/requestGuards"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { MAP_BACKGROUND, buildMapHtml } from "./mapHtml"
import { isAllowedMapNavigation, MAP_ORIGIN_WHITELIST } from "./mapNavigation"
import {
  FALLBACK_CENTER,
  MAP_ZOOM,
  mapScript,
  parseMapEvent,
  type LatLng,
  type MapBounds,
  type MapCluster,
  type MapColorScheme,
  type MapCommands,
  type MapMarker,
  type MapPadding,
  type MapStrings,
} from "./mapBridge"

export interface MapViewport {
  center: LatLng
  bounds: MapBounds
  zoom: number
}

/** 화면이 ref 로 잡는 명령 표면. `MapCommands` 그대로다. */
export type RestaurantMapHandle = MapCommands

export interface RestaurantMapViewProps {
  /** 카카오 JS 키. 없으면 지도를 아예 그리지 않고 `onMapError` 를 부른다. */
  jsKey: string | undefined
  /** 최초 중심. **이후 변경은 무시된다** — 위 주석 1번 참고. */
  initialCenter?: LatLng
  /** 최초 줌. 최초 1회만 반영된다. */
  initialLevel?: number
  /**
   * WebView 안에서 쓸 접근성 문구. HTML 은 마운트 시 고정되지만 이 값은 **바뀔 때마다**
   * 다시 주입된다(언어 전환). 넘기지 않으면 마커는 상호명만, 클러스터는 개수만 읽어 준다.
   */
  strings?: MapStrings
  onReady?: () => void
  /** 지도가 멎었을 때. bbox 검색의 트리거 판단은 화면이 한다(자동 재조회 금지). */
  onIdle?: (viewport: MapViewport) => void
  onMarkerPress?: (restaurantId: number) => void
  onClusterPress?: (cluster: {
    lat: number
    lng: number
    count: number
  }) => void
  /** 빈 지도 탭. 선택 해제용. */
  onMapPress?: () => void
  /** 사용자가 지도를 만지기 시작함. 시트를 접는 신호. */
  onDragStart?: () => void
  /** SDK 로드 실패·키 부재. 화면은 리스트 모드로 내려간다. */
  onMapError?: (message: string) => void
}

export const RestaurantMapView = forwardRef<
  RestaurantMapHandle,
  RestaurantMapViewProps
>(function RestaurantMapView(
  {
    jsKey,
    initialCenter = FALLBACK_CENTER,
    initialLevel = MAP_ZOOM.DEFAULT,
    strings,
    onReady,
    onIdle,
    onMarkerPress,
    onClusterPress,
    onMapPress,
    onDragStart,
    onMapError,
  },
  ref,
) {
  const colorScheme: MapColorScheme = useAppColorScheme()
  const webRef = useRef<WebView>(null)
  const readyRef = useRef(false)
  /** ready 전에 들어온 주입 스크립트. 순서를 지켜 흘려보내야 한다. */
  const queueRef = useRef<string[]>([])

  /**
   * 마운트 시 한 번만. 의존성 배열이 비어 있는 것은 의도다(위 주석 1번).
   * `initialCenter`/`initialLevel` 이 나중에 바뀌어도 HTML 은 그대로 둔다.
   */
  const html = useMemo(
    () =>
      buildMapHtml({
        jsKey: jsKey ?? "",
        center: initialCenter,
        level: initialLevel,
        // 최초 페인트부터 맞는 배경을 보여 플래시를 막는다. 이후 전환은 명령으로만.
        colorScheme,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const send = useCallback((script: string) => {
    if (!readyRef.current) {
      // 큐가 무한히 커지지 않게 상한을 둔다. ready 가 12초 안에 안 오면 어차피
      // error 로 끝나므로, 그 사이 쌓일 수 있는 양보다 넉넉하면 충분하다.
      if (queueRef.current.length < 64) queueRef.current.push(script)
      return
    }
    webRef.current?.injectJavaScript(script)
  }, [])

  const flushQueue = useCallback(() => {
    const pending = queueRef.current
    queueRef.current = []
    for (const script of pending) webRef.current?.injectJavaScript(script)
  }, [])

  useImperativeHandle(
    ref,
    (): RestaurantMapHandle => ({
      setMarkers: (items: MapMarker[]) => send(mapScript.setMarkers(items)),
      setClusters: (items: MapCluster[]) => send(mapScript.setClusters(items)),
      select: (id: number | null) => send(mapScript.select(id)),
      moveTo: (lat, lng, opts) => send(mapScript.moveTo(lat, lng, opts)),
      focusMarker: (lat, lng, opts) =>
        send(mapScript.focusMarker(lat, lng, opts)),
      setLevel: (level: number) => send(mapScript.setLevel(level)),
      fitBounds: (bounds: MapBounds, padding?: MapPadding) =>
        send(mapScript.fitBounds(bounds, padding)),
      setUserLocation: (position: LatLng | null, heading?: number | null) =>
        send(mapScript.setUserLocation(position, heading)),
      panBy: (dx: number, dy: number) => send(mapScript.panBy(dx, dy)),
      relayout: () => send(mapScript.relayout()),
      setStrings: (next: MapStrings) => send(mapScript.setStrings(next)),
      setColorScheme: (next: MapColorScheme) =>
        send(mapScript.setColorScheme(next)),
    }),
    [send],
  )

  /**
   * 접근성 문구를 흘려보낸다. ready 전이면 `send` 가 큐에 쌓아 두므로 첫 마커보다
   * 늦지 않고, 늦더라도 web 쪽 `setStrings` 가 이미 그려진 라벨을 갈아 준다.
   */
  useEffect(() => {
    if (!strings) return
    send(mapScript.setStrings(strings))
  }, [send, strings])

  /**
   * 앱 테마가 바뀌면 **기존 페이지에 명령만** 보낸다. `html` 의존성에 colorScheme 을
   * 넣으면 WebView가 리로드되어 카메라·마커·선택 상태가 전부 초기화된다.
   * ready 전 전환도 `send` 큐가 보존한다.
   */
  useEffect(() => {
    send(mapScript.setColorScheme(colorScheme))
  }, [colorScheme, send])

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseMapEvent(event.nativeEvent.data)
      if (message === null) return

      switch (message.type) {
        case "ready":
          readyRef.current = true
          flushQueue()
          onReady?.()
          return
        case "idle":
          /* WebView 페이로드는 검사하지 않은 값이다(`parseMapEvent` 는 형식만 본다).
             `zoom` 을 여기서 정수 1~14 로 조여 **한 번만** 정규화한다 — 그러지 않으면
             화면의 분석 이벤트·`widenLevel` 계산·질의가 각각 다른 값을 보게 되고,
             그중 하나라도 소수/범위 밖이면 서버가 400 을 낸다(실측: `zoom=4.5` →
             `int_parsing`, `zoom=0` → `greater_than_equal`). */
          onIdle?.({
            ...message.payload,
            zoom: clampZoom(message.payload.zoom),
          })
          return
        case "markerClick":
          onMarkerPress?.(message.payload.id)
          return
        case "clusterClick":
          onClusterPress?.(message.payload)
          return
        case "mapClick":
          onMapPress?.()
          return
        case "dragStart":
          onDragStart?.()
          return
        case "error":
          // ready 를 세우지 않는다 — 이후 명령은 계속 큐에 쌓이지만 화면이 지도를
          // 걷어낼 것이므로 흘려보낼 일이 없다.
          onMapError?.(message.payload.message)
          return
      }
    },
    [
      flushQueue,
      onClusterPress,
      onDragStart,
      onIdle,
      onMapError,
      onMapPress,
      onMarkerPress,
      onReady,
    ],
  )

  /**
   * `source` 를 객체 리터럴로 매 렌더 새로 만들면 일부 RN/RNW 경로에서 리로드가 돈다.
   *
   * `html` 이 `useMemo` 로 고정돼 있어도 **객체는 매 렌더 새로 만들어진다** — 오늘은
   * RN 의 `deepDiffer` 가 값 비교를 해 주어 살아 있을 뿐이고, `source` 를 참조로 비교하는
   * 경로에서는 렌더마다 페이지가 다시 로드되고 카카오 SDK 를 다시 내려받고 카메라가
   * `initialCenter` 로 튄다. 이 컴포넌트는 부모의 쿼리 상태·시트 스냅·선택이 바뀔 때마다
   * 리렌더되므로 그 횟수가 적지 않다. 객체 자체를 고정한다.
   */
  const source = useMemo(
    () => (SOURCE_BASE_URL ? { html, baseUrl: SOURCE_BASE_URL } : { html }),
    [html],
  )

  /**
   * 키가 없으면 WebView 를 띄우지 않는다. 띄우면 카카오가 401 페이지를 렌더해
   * 사용자가 영문 오류 화면을 보게 된다. 대신 즉시 error 로 알려 화면이
   * 리스트 모드로 내려가게 한다.
   */
  if (!jsKey) {
    return (
      <ConfigErrorNotice
        reason="jsKey"
        backgroundColor={MAP_BACKGROUND[colorScheme]}
        onMapError={onMapError}
      />
    )
  }
  /* 문서 주소가 없으면 WebView 를 띄우지 않는다. 띄우면 baseUrl 없이 로드돼 카카오가
     Referer 를 못 보고 401 을 주거나, iOS 가 없는 origin 을 열려다 오류 페이지를 그린다.
     둘 다 사용자에게는 "지도가 회색" 으로 보인다 — 설정 오류라고 말하는 편이 낫다. */
  if (!SOURCE_BASE_URL) {
    return (
      <ConfigErrorNotice
        reason="baseUrl"
        backgroundColor={MAP_BACKGROUND[colorScheme]}
        onMapError={onMapError}
      />
    )
  }

  return (
    <WebView
      ref={webRef}
      source={source}
      style={[styles.web, { backgroundColor: MAP_BACKGROUND[colorScheme] }]}
      /*
        whitelist 는 전부 통과("*")다 — 실수가 아니다. 이 라이브러리의 whitelist 는
        패턴을 URL 의 origin(경로 없음)에 대는 별도 매처이고, **탈락한 URL 을 차단이
        아니라 `Linking.openURL` 로 사파리에 연다.** iOS 는 최초 loadHTMLString 의
        내비게이션도 이 매처에 넣으므로, 여기서 탈락하면 식당 탭이 앱 밖 사파리로
        튕긴다(실측 2026-08-05 — 예전 `https://…/*` 패턴이 정확히 그랬다).
        실제 판정은 아래 `isAllowedMapNavigation` 한 곳만 한다. mapNavigation.ts 참고.
      */
      originWhitelist={MAP_ORIGIN_WHITELIST}
      onShouldStartLoadWithRequest={(request) =>
        isAllowedMapNavigation(request.url, SOURCE_BASE_URL)
      }
      onMessage={handleMessage}
      /*
        **시스템 글자 크기가 지도 부품의 크기를 바꾸지 못하게 한다(안드로이드).**

        안드로이드 WebView 는 기본적으로 `textZoom` 을 시스템 글꼴 배율에 맞춰 올린다.
        그런데 이 지도의 부품은 전부 **고정 픽셀**이다 — 클러스터 배지는 40/48/58px 원이고
        글자만 13/14/15px 이다. 글자만 1.15~1.3배가 되면 숫자가 원 안에서 균형을 잃고
        (원 밖으로 번지거나 한쪽으로 치우쳐 보인다), 상호명 라벨은 겹침 판정(`placed`)이
        계산한 상자보다 커져 서로 겹친다. 접근성 배율을 존중해야 하는 곳은 앱의 텍스트지
        지도 위 아이콘의 내부 치수가 아니다 — 지도 자체는 핀치로 확대할 수 있다.

        iOS 는 이 prop 을 무시한다(WKWebView 는 동적 타입을 자동 적용하지 않는다).
      */
      textZoom={100}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      // 지도가 스크롤을 직접 처리한다. WebView 스크롤을 켜면 팬이 두 번 먹는다.
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      allowsBackForwardNavigationGestures={false}
      // 문서와 SDK가 모두 HTTPS다. 평문 하위 리소스가 브릿지 권한을 공유하지 못하게 한다.
      mixedContentMode="never"
      // WebView 자체가 죽었을 때(프로세스 킬·렌더 실패)도 화면이 멈추지 않게 한다.
      onError={() => onMapError?.("webview load error")}
      onRenderProcessGone={() => onMapError?.("webview render process gone")}
      onContentProcessDidTerminate={() =>
        onMapError?.("webview content process terminated")
      }
    />
  )
})

/**
 * WebView 의 `baseUrl`. **카카오 JS 키의 허용 도메인과 정확히 같아야 한다.**
 *
 * `baseUrl` 은 SDK 요청의 Referer 가 되고, 카카오는 콘솔에 등록되지 않은 도메인을
 * 401 로 거절한다. 거절되면 `sdk.onerror` → `error` 이벤트 → 화면이 리스트 모드로
 * 내려가므로 **지도가 그냥 사라진다.**
 *
 * ## 실측 (2026-07-30, 현재 키)
 *
 *     Referer: http://localhost:8081/   → 200  SDK 로드됨
 *     Referer: https://localhost:8081/  → 200  SDK 로드됨 (스킴은 안 보고 host:port 를 본다)
 *     Referer: https://sinsincare.kr/   → 401  domain mismatched
 *     Referer: http://localhost:8082/   → 401  domain mismatched (포트까지 정확히 맞아야 한다)
 *     Referer: http://localhost/        → 401
 *     Referer: file:///                 → 401
 *
 * ## `https` 여야 한다 — 지도가 뜨지 않던 진짜 원인 (2026-07-30 실측)
 *
 * 이 값이 `http://localhost:8081` 이면 SDK 는 **200 으로 잘 내려오는데도 지도가 뜨지
 * 않았다.** 12초 뒤 `kakao sdk load timed out` 이 올라오고 화면은 리스트 모드로 내려갔다.
 * 이유는 `sdk.js` 안의 이 한 줄이다.
 *
 *     var s = "https:" == location.protocol ? "https:" : "http:"
 *     p = { v3: s + "//t1.daumcdn.net/mapjsapi/js/main/4.5.25/kakao.js", … }
 *
 * `sdk.js` 는 **로더일 뿐**이고 본체(`kakao.js`)를 문서의 프로토콜로 받아 온다. `baseUrl` 이
 * http 면 `location.protocol` 이 `http:` 가 되어 본체를 `http://t1.daumcdn.net/…` 으로
 * 요청하는데, 이 앱의 ATS 설정이
 *
 *     NSAllowsArbitraryLoads = false, NSAllowsLocalNetworking = true
 *
 * 이라서 **localhost 가 아닌 원격 평문 HTTP 는 iOS 가 차단한다.** 그러면 `kakao.js` 가
 * 영원히 안 오고 `kakao.maps.load(boot)` 콜백도 불리지 않는다 — 오류 이벤트조차 없어서
 * (스크립트는 200 이었으니) 12초 마감 시한만 남는다. 그게 "지도가 회색" 의 정체다.
 *
 * `https` 로 두면 본체도 https 로 받고(실측 200), Referer 는 여전히 host:port 로 통과한다.
 * **이 값을 http 로 되돌리지 말 것.** 되돌리면 위 증상이 그대로 돌아오고, 증상이 타임아웃이라
 * 원인을 찾는 데 다시 오래 걸린다.
 *
 * 처음에 이 값을 `https://sinsincare.kr` 로 두고 "기존 `KakaoMapWebView` 가 쓰는 값이니
 * 등록된 도메인이다" 라고 적어 뒀다. **그 추정이 틀렸다** — 그 파일은 애초에 지도가
 * 동작하지 않는 상태였고, 실제로 등록된 것은 프로토타입이 쓰던 `http://localhost:8081` 이다.
 * 코드에 있는 값을 근거로 삼지 말고 위처럼 직접 재 볼 것.
 *
 * ## 릴리스 빌드에 `localhost` 를 **흘려보내지 않는다** (2026-08-05)
 *
 * `localhost:8081` 은 Metro 개발 서버 주소다. 그런데 이 값이 `??` 폴백이라 **환경변수를
 * 안 넣은 릴리스 빌드에도 그대로 실려 나갔다.** 어느 EAS 프로필도 이 변수를 주지
 * 않았으므로 지금까지 나간 TestFlight·Play 빌드는 **전부** 존재하지 않는 origin 을
 * 문서 주소로 삼았고, 지도는 뜨지 않았다(사용자 보고 2026-08-05).
 *
 * 폴백이 문제를 숨겼다. 값이 없으면 개발 기본값으로 조용히 굴러가는 대신, 릴리스에서는
 * **설정 오류로 드러낸다** — 화면이 "지도를 불러오지 못했어요 + 다시 시도" 를 그린다.
 * 회색 사각형이나 사파리 오류 페이지보다 낫고, 무엇보다 빌드를 낸 사람이 바로 안다.
 *
 * 값을 넣을 때 주의: **카카오 콘솔에 등록된 도메인과 정확히 같아야 한다**(위 실측표).
 * 등록은 콘솔 작업이라 코드로 못 한다.
 */
const DEV_MAP_BASE_URL = "https://localhost:8081"

/** 설정에서 온 지도 문서 주소. 릴리스인데 비어 있으면 `null` — 지도를 띄우지 않는다. */
const SOURCE_BASE_URL: string | null =
  process.env["EXPO_PUBLIC_KAKAO_MAP_BASE_URL"] ??
  (__DEV__ ? DEV_MAP_BASE_URL : null)

const CONFIG_ERROR_MESSAGE: Readonly<Record<"jsKey" | "baseUrl", string>> = {
  jsKey: "EXPO_PUBLIC_KAKAO_JS_KEY is not set",
  baseUrl: "EXPO_PUBLIC_KAKAO_MAP_BASE_URL is not set",
}

function ConfigErrorNotice({
  reason,
  backgroundColor,
  onMapError,
}: {
  reason: "jsKey" | "baseUrl"
  backgroundColor: string
  onMapError?: (message: string) => void
}) {
  /*
    부모 상태를 건드리는 일은 **이펙트에서** 한다. 예전에는 렌더 본문에서 ref 를 세우고
    `setTimeout(…, 0)` 을 걸었는데, 그 타이머에는 정리가 없어서 (a) 그 틱 안에 화면을
    떠나면 언마운트된 컴포넌트의 `setState` 를 부르고 (b) StrictMode 의 이중 렌더에서 두 번
    걸릴 수 있었다. 지도 생명주기를 결정적으로 다루는 것이 이 파일의 존재 이유이므로
    여기서 렌더 부수효과를 남겨 두지 않는다. `useEffect` 는 커밋 뒤에 돌므로 지연도 필요 없다.
  */
  useEffect(() => {
    onMapError?.(CONFIG_ERROR_MESSAGE[reason])
  }, [onMapError, reason])
  return <View style={[styles.placeholder, { backgroundColor }]} />
}

const styles = StyleSheet.create({
  web: { flex: 1 },
  placeholder: { flex: 1 },
})
