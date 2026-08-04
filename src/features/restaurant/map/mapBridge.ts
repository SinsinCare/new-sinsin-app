/**
 * RN ↔ 카카오맵 WebView 브릿지 프로토콜.
 *
 * ## 왜 두 방향이 서로 다른 방식인가
 *
 * web → RN 은 `postMessage`, RN → web 은 `injectJavaScript` 다. 대칭으로 만들고 싶어지지만
 * 그렇게 두지 않았다. `injectJavaScript` 는 **동기적으로 즉시** 실행돼 지도 명령(카메라 이동,
 * 마커 교체)이 프레임 안에 반영된다. 반대로 RN 쪽에서 web 의 `message` 이벤트를 태우면
 * 한 틱이 밀려 마커 탭 → 카메라 이동이 눈에 보이게 늦는다. 이벤트는 반대로 브라우저가
 * 자연스럽게 큐잉해 주는 `postMessage` 가 맞다.
 *
 * ## 이 파일이 존재하는 이유
 *
 * 프로토타입(`sinsin-rn-front-temp`)은 문자열 템플릿으로 `window.__setMarkers(...)` 를 직접
 * 만들어 넣었다. 그래서 (1) 타입이 없고 (2) 이름이 바뀌면 **런타임에 조용히 아무 일도 안 하고**
 * (3) 값에 `'` 가 섞이면 스크립트가 깨졌다. 명령을 여기 한 곳에 모아 이름과 인자 모양을
 * 타입으로 묶는다.
 *
 * 값 직렬화는 전부 `JSON.stringify` 를 **두 번** 통과시킨다(§encodeArg). 한 번은 값 자체를
 * JSON 으로, 한 번은 그 JSON 을 자바스크립트 문자열 리터럴로. 이 이중 인코딩이 없으면
 * 상호명에 든 `'` 하나가 주입 스크립트를 깨뜨린다 — 한국 상호에 `'` 는 드물지만
 * `\` 와 개행은 크롤링 데이터에 실제로 들어온다.
 */

/** 지도 한 점. 카카오 SDK 의 `LatLng` 와 필드명을 맞춘다(`lat`/`lng`). */
export interface LatLng {
  lat: number
  lng: number
}

/** 뷰포트. 카카오 `LatLngBounds` 의 남서/북동 그대로. */
export interface MapBounds {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}

/**
 * 안전도. 서버 `foodVerdict` 의 4값과 1:1 이다.
 * `UNKNOWN` 을 `SAFE` 로 승격하지 않는다 — 신장 환자에게 그 방향의 오류가 더 위험하다.
 */
export type SafetyLevel = "SAFE" | "CAUTION" | "RESTRICTED" | "UNKNOWN"

/**
 * 마커 한 개. **카드에 필요한 정보를 싣지 않는다** — 사진 URL·평점·주소는 리스트 응답이 준다.
 * 마커 200개에 사진 3장씩 실으면 지도 응답이 그것만으로 수백 KB 가 된다.
 */
export interface MapMarker {
  id: number
  name: string
  lat: number
  lng: number
  /**
   * 개인화 판정 등급.
   *
   * **링 색을 가르지 않는다.** 목업(-2/-5/-7)의 마커는 등급과 무관하게 전부 같은
   * 브랜드 주황 링이다 — 지도 위에 빨강/노랑/초록 점을 흩뿌리면 어느 색이 "가도 되는
   * 곳" 인지 색만으로 판단하게 되고, 그 판단은 메뉴 단위로만 성립한다(식당 하나에
   * 제한 메뉴와 안전 메뉴가 함께 있다). 등급은 **스크린리더 라벨**로만 쓴다
   * (`setStrings.markerAccessibility`) — 색만으로 뜻을 전하지 않기 위한 §5 요건이고,
   * 시각적으로는 카드·메뉴 행의 배지가 그 일을 한다.
   *
   * 한때 `bookmarked` 도 여기 있었다. 지웠다 — `저장한 곳만 보기` 는 **필터**라서
   * 켜면 화면의 마커 전부가 북마크이고, 끄면 구분해 그릴 목업 상태가 없다.
   */
  safety: SafetyLevel
}

/**
 * WebView 안에서 접근성 라벨을 만들 때 쓰는 문구. `{{name}}`·`{{safety}}`·`{{count}}` 를
 * 치환한다.
 *
 * ## HTML 에 박지 않고 명령으로 보내는 이유
 *
 * HTML 은 마운트 시 한 번만 만들어진다(`RestaurantMapView` 주석 1번). 빌드 시점에 문구를
 * 박으면 앱이 사는 동안 그때의 언어에 굳고, 사용자가 언어를 바꿔도 지도만 한국어로 남는다.
 * 명령으로 보내면 `strings` prop 이 바뀔 때마다 다시 흘러 들어간다.
 */
export interface MapStrings {
  /** `{{name}}, 안전도 {{safety}}` */
  markerAccessibility: string
  /** `이 지역 식당 {{count}}곳, 눌러서 확대` */
  clusterAccessibility: string
  /** `SafetyLevel` → 사람이 읽는 등급 라벨. 색만으로 뜻을 전하지 않기 위해 필요하다. */
  safetyLabels: Record<SafetyLevel, string>
}

/** 클러스터 한 개. 서버가 SQL 그리드로 집계해 내려준다(클라이언트 클러스터링 아님). */
export interface MapCluster {
  /** 그리드 셀 키. 같은 셀이면 같은 키 — React 리스트 키처럼 재사용 판정에 쓴다. */
  key: string
  lat: number
  lng: number
  count: number
}

/** 카메라 이동 시 시트·헤더에 가리지 않게 줄 여백(px). */
export interface MapPadding {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

/* ────────────────────────── web → RN ────────────────────────── */

export type MapEvent =
  /**
   * SDK 로드 + 지도 생성 완료. 이 전에 보낸 명령은 버퍼링된다(§RestaurantMapView).
   *
   * `width`/`height` 는 지도 컨테이너의 실측 크기다. **0 이면 지도가 비어 있다는 뜻**이고
   * (`getBounds()` 도 세계 전체에 가까운 값을 돌려줘 서버가 400 을 낸다) 실제로 그 증상을
   * 겪었기 때문에 진단용으로 싣는다. HTML 쪽이 `ResizeObserver` 로 스스로 복구하지만,
   * 복구되지 않는 기기가 있으면 이 값으로 바로 알 수 있다.
   */
  | { type: "ready"; payload?: { width: number; height: number } }
  /**
   * 지도 정지. **`bounds` 가 핵심이다** — 프로토타입은 center+level 만 보내서
   * 반경을 5000m 로 하드코딩했고, 줌아웃하면 50km 뷰포트에 5km 결과만 찍혔다.
   */
  | {
      type: "idle"
      payload: { center: LatLng; bounds: MapBounds; zoom: number }
    }
  /** 사용자가 지도를 만지기 시작함. 시트를 접는 신호로 쓴다. */
  | { type: "dragStart" }
  | { type: "markerClick"; payload: { id: number } }
  /** 클러스터 탭 → 그 셀로 확대. 어느 식당인지는 아직 모른다. */
  | {
      type: "clusterClick"
      payload: { lat: number; lng: number; count: number }
    }
  /** 빈 지도 탭. 선택 해제 신호. */
  | { type: "mapClick" }
  /**
   * SDK 를 못 불러왔다(키 만료·네트워크·도메인 미등록). 앱은 이 신호를 받으면
   * 지도를 포기하고 **리스트 모드로 내려간다.** 흰 화면을 보여 주지 않는다.
   */
  | { type: "error"; payload: { message: string } }

/** 알 수 없는 문자열이 왔을 때 조용히 무시하기 위한 파서. */
export function parseMapEvent(raw: string): MapEvent | null {
  if (raw.length > 20_000) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value)) return null
  const type = value.type
  const payload = value.payload

  if (type === "ready") {
    return payload === undefined || isReadyPayload(payload)
      ? (value as MapEvent)
      : null
  }
  if (type === "dragStart" || type === "mapClick") return { type }
  if (type === "markerClick") {
    return isRecord(payload) && isPositiveInteger(payload.id)
      ? { type, payload: { id: payload.id } }
      : null
  }
  if (type === "clusterClick") {
    const count = isRecord(payload) ? payload.count : undefined
    return isRecord(payload) && isPositiveInteger(count) && isLatLng(payload)
      ? {
          type,
          payload: {
            lat: payload.lat,
            lng: payload.lng,
            count,
          },
        }
      : null
  }
  if (type === "idle") {
    return isRecord(payload) &&
      isRecord(payload.center) &&
      isLatLng(payload.center) &&
      isRecord(payload.bounds) &&
      isBounds(payload.bounds) &&
      isFiniteNumber(payload.zoom)
      ? (value as MapEvent)
      : null
  }
  if (type === "error") {
    return isRecord(payload) &&
      typeof payload.message === "string" &&
      payload.message.length <= 500
      ? { type, payload: { message: payload.message } }
      : null
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0
}

function isLatLng(
  value: Record<string, unknown>,
): value is Record<"lat" | "lng", number> {
  return (
    isFiniteNumber(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    isFiniteNumber(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180
  )
}

function isBounds(value: Record<string, unknown>): boolean {
  return (
    isFiniteNumber(value.swLat) &&
    value.swLat >= -90 &&
    value.swLat <= 90 &&
    isFiniteNumber(value.neLat) &&
    value.neLat >= -90 &&
    value.neLat <= 90 &&
    value.swLat <= value.neLat &&
    isFiniteNumber(value.swLng) &&
    value.swLng >= -180 &&
    value.swLng <= 180 &&
    isFiniteNumber(value.neLng) &&
    value.neLng >= -180 &&
    value.neLng <= 180 &&
    value.swLng <= value.neLng
  )
}

function isReadyPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.width) &&
    value.width >= 0 &&
    isFiniteNumber(value.height) &&
    value.height >= 0
  )
}

/* ────────────────────────── RN → web ────────────────────────── */

/**
 * WebView 안에 노출되는 전역 객체 이름. `window.__setMarkers` 같은 이름 대신 한 덩어리로
 * 묶는다 — 전역 이름 3개가 각자 흩어져 있으면 하나가 사라져도 아무도 모른다.
 */
export const MAP_NAMESPACE = "__sinsinMap"

/**
 * WebView 로 보낼 값 하나를 자바스크립트 리터럴로 만든다.
 *
 * `JSON.stringify(JSON.stringify(x))` 인 이유: 안쪽이 값을 JSON 문자열로 만들고,
 * 바깥쪽이 그 문자열을 **따옴표와 이스케이프가 완결된 JS 문자열 리터럴**로 만든다.
 * 그래서 web 쪽은 `JSON.parse(인자)` 한 번만 하면 된다. 한 번만 stringify 하면
 * 값 안의 `"` 가 주입 스크립트의 문법을 깬다.
 */
function encodeArg(value: unknown): string {
  return JSON.stringify(JSON.stringify(value ?? null))
}

/**
 * 주입할 한 줄을 만든다. 끝의 `; true;` 는 생략하면 안 된다 — iOS 의
 * `evaluateJavaScript` 는 마지막 표현식 값을 직렬화하려 하고, 그 값이 DOM 노드나
 * `undefined` 면 콘솔에 경고가 쌓인다. `true` 로 끝내 값을 단순하게 만든다.
 */
function call(method: string, ...args: unknown[]): string {
  const encoded = args.map(encodeArg).join(", ")
  // 지도가 아직 준비되지 않았을 때 전역이 없어서 터지는 것을 막는다. 준비 전 명령은
  // RestaurantMapView 가 버퍼링하지만, 경합으로 새는 한 발을 여기서 한 번 더 막는다.
  return `(window.${MAP_NAMESPACE} && window.${MAP_NAMESPACE}.${method}(${encoded})); true;`
}

/**
 * 지도에 보낼 수 있는 명령 전부. `RestaurantMapView` 의 ref 가 이 모양을 그대로 노출한다.
 *
 * 프로토타입에 **없어서 문제가 됐던** 것들에 ★ 를 달았다.
 */
export interface MapCommands {
  /** 마커 교체. 전체 교체다 — diff 는 web 쪽이 한다. */
  setMarkers(items: MapMarker[]): void
  /** ★ 클러스터 교체. 프로토타입은 클러스터가 아예 없어 서울 전역이 점 수천 개였다. */
  setClusters(items: MapCluster[]): void
  /** 선택 마커 변경. `null` 이면 해제. */
  select(id: number | null): void
  /** 카메라 이동. */
  moveTo(
    lat: number,
    lng: number,
    opts?: { zoom?: number; animate?: boolean },
  ): void
  /**
   * ★ 선택 마커를 **보이는 영역의 중앙**에 놓는다. 카메라 명령 한 번으로 끝나며 멱등하다.
   *
   * `moveTo` + `panBy` 조합을 대체한다. 그 조합은 애니메이션(`panTo`) 위에 상대 이동을
   * 얹는 구조라 연타하면 offset 이 쌓였다 — "누르면 누를수록 마커가 화면 밖으로 밀려남"
   * 이 그 증상이었다. 여기서는 목표 중심을 먼저 계산하므로 몇 번을 눌러도 같은 자리다.
   *
   * `padTop`/`padBottom` 은 상단 오버레이와 바텀시트가 가리는 높이(px)다.
   */
  focusMarker(
    lat: number,
    lng: number,
    opts?: {
      padTop?: number
      padBottom?: number
      animate?: boolean
      /**
       * 같이 확정할 배율. **줌과 이동은 한 명령이어야 한다.**
       *
       * `setLevel` 을 따로 부르고 `focusMarker` 를 뒤에 붙이면 카카오가 **idle 을 두 번**
       * 낸다(줌 하나, 팬 하나). 화면은 자동 재검색 예약을 첫 idle 에서 소진하므로,
       * 두 번째 idle 이 "사용자가 지도를 움직였다" 로 읽혀 방금 파고든 자리에
       * `현재 지도에서 찾기` 버튼이 뜬다 — 결과는 이미 최신인데.
       */
      zoom?: number
    },
  ): void
  /** ★ 줌 직접 지정. 없어서 선택한 마커가 라벨 없이 점으로 남았다. */
  setLevel(level: number): void
  /** ★ 영역 맞춤. 클러스터 탭 → 그 셀로 들어갈 때 쓴다. */
  fitBounds(bounds: MapBounds, padding?: MapPadding): void
  /** ★ 내 위치 마커. 디자인 자산이 있었는데 프로토타입은 한 번도 안 그렸다. */
  setUserLocation(position: LatLng | null, heading?: number | null): void
  /**
   * ★ 화면 픽셀만큼 밀기. 선택한 마커가 바텀시트에 가릴 때, 카메라를 시트 높이의
   * 절반만큼 위로 밀어 마커를 보이는 영역 가운데로 올린다.
   */
  panBy(dx: number, dy: number): void
  /** ★ 지도 리사이즈 알림. 시트 스냅으로 보이는 높이가 바뀌면 카카오에 알려야 타일이 안 깨진다. */
  relayout(): void
  /**
   * ★ 접근성 문구 주입. HTML 안에 한글을 박지 않기 위한 명령이다 —
   * 프로토타입은 `'식당 N곳, 확대해서 보기'` 를 스크립트 문자열에 직접 넣어, i18n
   * 리소스에 같은 뜻의 키가 있는데도 영어 로케일 사용자가 한국어를 들었다.
   */
  setStrings(strings: MapStrings): void
}

/**
 * 명령 → 주입 스크립트 문자열. `RestaurantMapView` 가 이걸 `injectJavaScript` 에 넘긴다.
 * 명령 이름을 여기 한 곳에서만 쓰므로 web 쪽과 어긋나면 타입 에러로 잡힌다.
 */
export const mapScript = {
  setMarkers: (items: MapMarker[]) => call("setMarkers", items),
  setClusters: (items: MapCluster[]) => call("setClusters", items),
  select: (id: number | null) => call("select", id),
  moveTo: (
    lat: number,
    lng: number,
    opts?: { zoom?: number; animate?: boolean },
  ) =>
    call("moveTo", {
      lat,
      lng,
      zoom: opts?.zoom ?? null,
      animate: opts?.animate ?? true,
    }),
  focusMarker: (
    lat: number,
    lng: number,
    opts?: {
      padTop?: number
      padBottom?: number
      animate?: boolean
      zoom?: number
    },
  ) =>
    call("focusMarker", {
      lat,
      lng,
      padTop: opts?.padTop ?? 0,
      padBottom: opts?.padBottom ?? 0,
      animate: opts?.animate ?? true,
      zoom: opts?.zoom ?? null,
    }),
  setLevel: (level: number) => call("setLevel", level),
  fitBounds: (bounds: MapBounds, padding?: MapPadding) =>
    call("fitBounds", bounds, padding ?? {}),
  setUserLocation: (position: LatLng | null, heading?: number | null) =>
    call("setUserLocation", position, heading ?? null),
  panBy: (dx: number, dy: number) => call("panBy", dx, dy),
  relayout: () => call("relayout"),
  setStrings: (strings: MapStrings) => call("setStrings", strings),
} satisfies {
  [K in keyof MapCommands]: (...args: Parameters<MapCommands[K]>) => string
}

/* ────────────────────────── 줌 규약 ────────────────────────── */

/**
 * 카카오의 `level` 은 **작을수록 확대**다(1 이 가장 가깝다). 이 방향이 계속 헷갈리므로
 * 상수에 이름을 붙여 둔다. 서버의 클러스터 임계값과 같은 값을 써야 하므로
 * 여기 숫자를 바꾸면 백엔드 `CLUSTER_ZOOM_THRESHOLD` 도 같이 바꿔야 한다.
 */
export const MAP_ZOOM = {
  /**
   * 최초 진입. 도보권(780×1690m)이 한 화면에 들어온다.
   *
   * **이 배율은 이제 클러스터 구간이다**(`CLUSTER_THRESHOLD` 와 같다). 의도한 것이다 —
   * 이 배율에서 강남 시드 데이터는 `한식` 하나만 걸어도 마커 161개이고 링이 겹치는 쌍이
   * 259개다(실측표는 백엔드 `CLUSTER_ZOOM_THRESHOLD` 주석). 뭉친 링 161개보다
   * "이 블록에 33곳" 이라는 개수 배지가 더 많은 정보를 준다. 마커는 사용자가 파고든
   * 배율(1~3)에서 나온다.
   */
  DEFAULT: 4,
  /**
   * 마커/카드 탭으로 들어갈 때. **반드시 `CLUSTER_THRESHOLD` 보다 작아야 한다** —
   * 크거나 같으면 지도가 클러스터 모드라서 고를 마커 자체가 없다. 3 에서 2 로 내린 것이
   * 임계값을 6→4 로 내린 변경의 짝이다.
   */
  FOCUSED: 2,
  /**
   * 이 값 **이상**이면(=더 멀면) 서버가 클러스터를 준다.
   *
   * 백엔드 `src/domains/restaurant/mapRepository.ts` 의 `CLUSTER_ZOOM_THRESHOLD` 와
   * **같은 값이어야 한다.** 갈라지면 서버는 클러스터를 주는데 화면은 마커를 기다려
   * 지도가 조용히 빈다. 6 에서 4 로 내린 근거(실측표)는 그쪽 주석에 있다.
   */
  CLUSTER_THRESHOLD: 4,
  /**
   * 상호명 라벨을 그리기 시작하는 경계. 마커 모드 전 구간(1~3)에서 라벨을 그린다 —
   * 겹치는 라벨은 배율이 아니라 **화면 좌표 충돌 판정**으로 숨긴다(`mapHtml.ts` 의
   * `applyLabelCollision`). 배율로만 막으면 "라벨이 다 보이거나 다 없거나" 뿐이고,
   * 데이터가 뭉친 곳에서는 어느 쪽도 맞지 않는다.
   */
  LABEL_THRESHOLD: 3,
  MIN: 1,
  MAX: 14,
} as const

/**
 * 위치 권한이 없을 때의 지도 중심.
 *
 * 강남역이다. "서울시청" 이 더 중립적으로 보이지만 **시드 데이터가 강남 한 블록(376곳)
 * 밖에 없다** — 시청을 중심으로 열면 첫 화면이 항상 0건이고, 사용자는 앱이 고장 난 줄 안다.
 * 데이터가 전국으로 넓어지면 이 상수를 시청으로 옮기고 이 주석을 지운다.
 */
export const FALLBACK_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 }
