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
import { buildMapHtml } from "./mapHtml"
import { isAllowedMapNavigation, mapOriginWhitelist } from "./mapNavigation"
import {
  FALLBACK_CENTER,
  MAP_ZOOM,
  mapScript,
  parseMapEvent,
  type LatLng,
  type MapBounds,
  type MapCluster,
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
    return <MissingKeyNotice onMapError={onMapError} />
  }

  return (
    <WebView
      ref={webRef}
      source={source}
      style={styles.web}
      originWhitelist={MAP_ORIGIN_WHITELIST}
      onShouldStartLoadWithRequest={(request) =>
        isAllowedMapNavigation(request.url, SOURCE_BASE_URL)
      }
      onMessage={handleMessage}
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
 * ## 운영 빌드에서는 이 값으로 안 된다
 *
 * `localhost:8081` 은 Metro 개발 서버 주소다. 릴리스 빌드에는 Metro 가 없으므로
 * **앱의 실제 도메인을 카카오 콘솔에 등록하고** `EXPO_PUBLIC_KAKAO_MAP_BASE_URL` 로
 * 넘겨야 한다. 그때까지 릴리스 빌드의 지도는 리스트 모드로 내려간다 —
 * 조용히 죽지는 않지만 지도는 없다.
 */
const SOURCE_BASE_URL =
  process.env["EXPO_PUBLIC_KAKAO_MAP_BASE_URL"] ?? "https://localhost:8081"

const MAP_ORIGIN_WHITELIST = mapOriginWhitelist(SOURCE_BASE_URL)

function MissingKeyNotice({
  onMapError,
}: {
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
    onMapError?.("EXPO_PUBLIC_KAKAO_JS_KEY is not set")
  }, [onMapError])
  return <View style={styles.placeholder} />
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: "#EAE8E4" },
  placeholder: { flex: 1, backgroundColor: "#EAE8E4" },
})
