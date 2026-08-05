/**
 * 식당 지도 홈. 목업 `Home_restaurant` / `-1` ~ `-7`.
 *
 * ## 레이어 (아래 → 위, 목업 §2.1)
 *
 * 1. 지도(전체 화면, 상태바 아래까지)
 * 2. 상단 오버레이 — 검색바 + 카테고리 칩 레일 + 위치 권한 배너
 * 3. 우하단 FAB 스택(저장한 곳만 / 내 위치) + 하단 중앙 `현재 지도에서 찾기` pill
 * 4. 식당 목록 시트
 *
 * ## 지켜야 하는 다섯 가지
 *
 * **1. 지도를 언마운트하지 않는다.** 기존 화면은 `loading` 동안 지도를 걷어냈고(`restaurant.tsx`),
 * 그러면 매 검색마다 WebView 가 새로 뜨고 카카오 SDK 를 다시 내려받고 카메라가 초기 위치로
 * 튄다. 로딩은 **시트 안의 스켈레톤**으로만 표현한다.
 *
 * **2. 자동 재조회 금지 (D7).** `onIdle` 은 dirty 플래그만 세운다. 질의는 pill 을 눌렀을 때만.
 * 예외는 **최초 1회** — 진입 직후 첫 `onIdle` 에서 자동으로 한 번 검색한다. 그러지 않으면
 * 첫 화면이 텅 빈 지도 + pill 뿐이고, 사용자는 앱이 아무 것도 못 찾은 줄 안다. 그 한 번은
 * "팬할 때마다 다시 부른다" 와 다른 이야기다.
 *
 * 그 예외는 **확정에 성공했을 때만** 소비된다(`handleIdle`). 실패해도 소비하던 시절에는,
 * 컨테이너가 아직 0×0 이던 첫 `idle` 의 세계 크기 bbox 가 면적 상한에 걸려 거절되면서
 * 예외를 써 버렸고 — 지도가 영원히 비었다. 그리고 사용자가 지도를 만지는 순간
 * (`handleDragStart`) 예외는 끝난다. 그 뒤에 남아 있으면 팬 유발 자동 재조회가 된다.
 *
 * 애초에 `onIdle` 이 오지 않던 문제는 **WebView 쪽**에서 고쳤다 — 카카오 `idle` 은 변화가
 * 있을 때만 오므로 첫 뷰포트는 `mapHtml.ts` 의 `postIdle` 이 크기 확정 시점에 직접 올린다.
 *
 * 그 밖에 **앱이 카메라를 옮긴 직후**에도 한 번 검색한다(검색 화면에서 지역 선택,
 * `지도 넓혀서 다시 찾기`, 늦게 도착한 내 위치). 그 예약은 `armedSearchRef` 토큰이고
 * `handleIdle` 이 소비하며 **`dragStart` 에서 반드시 지운다** — 예약을 boolean 최초검색
 * 플래그로 되돌리는 방식이었을 때, 카메라 명령이 실제로 움직이지 않아(줌 상한에 이미
 * 닿아 있어) `idle` 이 오지 않으면 예약이 영원히 남았고, 그 뒤 사용자가 지도를 손으로
 * 끌면 그 idle 이 예약을 먹어 **팬 유발 자동 재조회**가 됐다. 정확히 D7 이 금지하는 것이다.
 *
 * **3. 시트 스냅이 바뀌면 `relayout()`.** 카카오는 보이는 높이가 바뀐 것을 스스로 모른다.
 * 안 알려 주면 타일이 잘린 채로 남는다.
 *
 * **4. 선택 마커를 시트에 가리지 않게 올린다.** `moveTo` 는 마커를 화면 정중앙에 놓지만
 * 그 지점은 시트 아래다. `panBy(0, +시트높이/2)` 로 보이는 영역의 중앙까지 밀어 올린다.
 * 카카오 `panBy` 는 지도 중심을 화면 픽셀만큼 옮기므로 **dy 가 양수면 마커가 위로** 간다.
 *
 * **5. 지도 실패는 리스트 모드로 내려간다.** `onMapError`(키 만료·도메인 미등록·네트워크)를
 * 받으면 지도를 걷고 목록을 전체 화면으로 그린다. 회색 사각형 앞에 사용자를 세워 두지 않는다.
 *
 * ## 필터 상태의 소유자는 이 화면이다
 *
 * `useRestaurantFilters()` 를 여기서 한 번만 부르고, 칩 행·정렬 시트·필터 시트·AI 검색
 * 시트에 **같은 인스턴스**를 넘긴다. 시트가 각자 훅을 부르면 각자의 상태를 갖게 되어
 * `확인` 을 눌러도 지도는 예전 필터로 남는다.
 *
 * 필터가 바뀌면 react-query 키가 바뀌어 지도·목록이 스스로 다시 받는다. 그래서 시트의
 * `확인` 이 별도로 재조회를 호출하지 않는다 — D7("지도 이동 시 자동 재조회 금지")은
 * **뷰포트** 변경에 대한 규칙이고, 필터 변경은 사용자가 방금 확정한 의사 표시다.
 *
 * ## 결과는 **언제나** 지도에 그린다 (2026-07-31 개정)
 *
 * 앞 판본은 `hasActiveFilter(filters)` 가 참일 때만 마커·클러스터를 주입했다. 근거는
 * 목업(`Home_restaurant.png`/`-1` 에 링이 없고 `-2`(한식 선택)에서 나타난다)과
 * DESIGN_SPEC §2.4("필터 미적용 → 지도 기본 POI만")였다.
 *
 * **그 결과가 실제 화면에서 무엇이었냐면**: 탭을 열면 시트에는 376곳이 있는데 지도는
 * 텅 비어 있었다. 사용자가 처음 보는 화면이 정확히 그 상태다(필터는 기본으로 하나도
 * 걸려 있지 않다). "지도에 식당이 안 찍힌다" 는 지적이 이것이고, 국내 지도·맛집 서비스
 * (네이버 지도 · 카카오맵 · 다이닝코드) 중 결과를 가진 채 지도를 비워 두는 곳은 없다.
 *
 * 원래 근거였던 "조건 없이 200개를 흩뿌리면 뜻이 사라진다" 는 **클러스터가 이미 푸는
 * 문제**다. 서버는 기본 배율(level 4 = `MAP_ZOOM.DEFAULT`)에서 `mode:"CLUSTER"` 로
 * 응답한다 — 실측: 강남 뷰포트에서 376곳이 덩어리 3개(310 + …)로 온다. 흩뿌려진 링 200개가
 * 아니라 "이 블록에 310곳" 이라는 개수 배지이므로 지저분해지지 않는다. 낱개 마커는
 * 사용자가 파고든 배율(1~3)에서만 나오고, 그 배율에서는 낱개로 보는 것이 목적이다.
 *
 * 필터의 뜻도 그대로 남는다 — 필터는 **질의**에 들어가므로 칩을 걸면 지도에 남는 덩어리
 * 자체가 줄어든다. 즉 "내가 고른 조건에 맞는 곳" 은 여전히 지도가 말한다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View, type LayoutChangeEvent } from "react-native"
// 리사이클링 리스트 — 무한 피드는 FlatList 대신 FlashList(v2, 추정치 불필요)
import { FlashList } from "@shopify/flash-list"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"
import { LinearGradient } from "expo-linear-gradient"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  V2Divider,
  V2ErrorState,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { logger } from "@/src/lib/logger"

import type {
  CuisineType,
  MapBounds,
  RestaurantCardDto,
  SortOption,
} from "../types"
import { MAX_BBOX_DIAGONAL_KM, bboxDiagonalKm } from "../utils/bboxKey"
import { FALLBACK_CENTER, MAP_ZOOM, type MapMarker } from "../map/mapBridge"
import {
  RestaurantMapView,
  type MapViewport,
  type RestaurantMapHandle,
} from "../map/RestaurantMapView"
import { centerFor } from "../data/regionCatalog"
import { isMapTouchEcho } from "../utils/pressIntent"
import { nextClusterZoom } from "../utils/viewportAction"
import {
  isSilentlyEmptyMap,
  mapInjectionCount,
  resolveMapInjection,
} from "../utils/mapInjection"
import { useMapSearch } from "../hooks/useMapSearch"
import { useMyLocation } from "../hooks/useMyLocation"
import { useRestaurantFilters } from "../hooks/useRestaurantFilters"
import { useRestaurantList } from "../hooks/useRestaurantList"
import { useSelectedFirstList } from "../hooks/useSelectedFirstList"
import { AiSearchSheet } from "../components/AiSearchSheet"
import { CategoryChipRail } from "../components/CategoryChipRail"
import { FilterChipRow, type FilterAxis } from "../components/FilterChipRow"
import { FilterSheet } from "../components/FilterSheet"
import { LocationPermissionBanner } from "../components/LocationPermissionBanner"
import { MapEmptyState } from "../components/MapEmptyState"
import { MapFabStack } from "../components/MapFabStack"
import { MapRefreshPill } from "../components/MapRefreshPill"
import { MapSearchBar } from "../components/MapSearchBar"
import { scrimColor } from "../components/mapScrim"
import { MapUtilityFooter } from "../components/MapUtilityFooter"
import { RestaurantCard } from "../components/RestaurantCard"
import {
  RESTAURANT_SKELETON_COUNT,
  RestaurantCardSkeleton,
} from "../components/RestaurantCardSkeleton"
import {
  RestaurantListSheet,
  SHEET_MID_RATIO,
  SHEET_SNAP,
  deriveSheetContainerHeight,
  predictSheetTop,
  shouldRefocusAfterSnap,
  SheetNotice,
  type RestaurantListSheetHandle,
} from "../components/RestaurantListSheet"
import { SortSheet } from "../components/SortSheet"

/** 화면 좌우 여백. 검색바·칩 레일·FAB 가 같은 선에 맞는다. */
import { GUTTER } from "../layout"
const SIDE = GUTTER

/*
  클러스터 파고들기의 배율은 이제 여기 없다 — `utils/viewportAction`의 `CLUSTER_ZOOM_STEP`
  (레벨 −2 = 4배)이 정본이다. 종전의 `CLUSTER_ZOOM_FACTOR`(뷰포트를 1/4 로 줄인 상자를
  `fitBounds` 로 맞추는 방식)는 상자를 **전체 뷰포트**에서 뽑고 **보이는 영역**에 맞춰
  두 축소가 상쇄됐다. 그 결과가 "누를수록 조금씩 축소되다가 한계에서 다시 확대" 였다.
*/

export interface RestaurantMapScreenProps {
  /**
   * 검색 화면에서 고른 지역의 좌표. 카메라를 그곳으로 옮긴다.
   *
   * `initialCenter` 로 넘기지 않는 이유: 그 prop 은 **마운트 전용**이고(설계상 그렇다),
   * 탭 화면은 앱이 사는 동안 언마운트되지 않으므로 두 번째 검색부터는 아무 일도 일어나지
   * 않는다. 카메라는 `moveTo` 로만 움직인다.
   */
  focus?: { lat: number; lng: number } | null
}

export function RestaurantMapScreen({
  focus = null,
}: RestaurantMapScreenProps = {}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()

  const mapRef = useRef<RestaurantMapHandle>(null)
  const sheetRef = useRef<RestaurantListSheetHandle>(null)

  const controls = useRestaurantFilters()
  const { filters } = controls
  const myLocation = useMyLocation()

  /** 지도 SDK 가 죽었다. `null` 이면 정상. */
  const [mapError, setMapError] = useState<string | null>(null)
  /** 올릴 때마다 WebView 가 새로 마운트된다(`retryMap`). */
  const [mapMountKey, setMapMountKey] = useState(0)
  /**
   * 고른 식당과 **어디서 골랐는가**. 두 state 로 나누지 않는 이유는 하나가 갱신되고
   * 다른 하나가 남는 조합이 곧 "카드는 하이라이트인데 목록은 다른 순서" 이기 때문이다.
   *
   * 출처가 필요한 이유: `MARKER` 일 때만 그 식당을 목록 맨 위로 올린다. 카드 탭도 같은
   * 선택을 만들지만, 그때 재정렬하면 방금 누른 카드가 손가락 밑에서 위로 튀어 오른 뒤
   * 상세 화면이 밀려 들어온다. 마커 탭은 목록을 맨 위로 되감으므로 재정렬이 예상되는
   * 동작이고, 카드 탭은 그렇지 않다.
   */
  const [selection, setSelection] = useState<{
    id: number
    origin: "MARKER" | "CARD"
  } | null>(null)
  const selectedId = selection?.id ?? null
  const [aiSearchOpen, setAiSearchOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  /**
   * 필터 시트를 열게 만든 축. `null` 이면 시트가 닫혀 있다.
   * 열림 여부와 섹션을 한 값으로 묶는 이유: 두 state 로 나누면 "열려 있는데 섹션이
   * 없는" 조합이 생기고, 그때 시트가 어디로 스크롤해야 할지 알 수 없다.
   */
  const [filterSection, setFilterSection] = useState<FilterAxis | null>(null)
  const [permissionBannerHidden, setPermissionBannerHidden] = useState(false)

  /** 상단 오버레이 실측 높이. `fitBounds` 패딩과 리스트 모드 여백에 쓴다(매직 넘버 금지). */
  const [topOverlayHeight, setTopOverlayHeight] = useState(0)
  /** 화면 컨테이너 높이. 시트 상단 Y → 시트 높이 변환에 필요하다. */
  const [containerHeight, setContainerHeight] = useState(0)

  /** 시트 상단 Y(px). 드래그 중에도 실시간으로 흐른다. */
  const sheetPosition = useSharedValue(0)
  /** 스냅이 끝난 시점의 시트 상단 Y. `panBy` 거리 계산은 JS 스레드에서 이 값을 읽는다. */
  const sheetPositionRef = useRef(0)
  /** 현재 스냅 인덱스. 이미 목표 스냅이면 `onChange` 가 오지 않으므로 직접 판단해야 한다. */
  const sheetIndexRef = useRef<number>(SHEET_SNAP.COLLAPSED)
  /**
   * 스냅이 끝나면 선택 마커를 올려야 한다는 예약.
   *
   * `snapToIndex` 직후에 `panBy` 를 부르면 `sheetPositionRef` 가 아직 **이전** 스냅 값이라
   * 밀어 올리는 거리가 모자라고, 마커가 시트에 반쯤 가린다. 그래서 스냅 완료 콜백까지
   * 미룬다.
   */
  /**
   * 마커 탭이 예약한 재정렬. **그때 쓴 시트 윗변 값**을 함께 들고 있는다 — 스냅이 끝난 뒤
   * 실제 값과 비교해 **차이가 클 때만** 다시 맞추기 위해서다(`shouldRefocusAfterSnap`).
   * 무조건 다시 맞추면 몇 pt 차이에도 카메라가 한 번 더 움직여, 사용자에게는 "멈췄다가
   * 다시 가는" 것으로 보인다.
   */
  const pendingRaiseRef = useRef<{ usedTop: number } | null>(null)
  /**
   * 관측된 스냅 위치(index → position). 예측은 근사지만 이 값은 정확하다 —
   * 한 번이라도 그 스냅을 지나간 뒤에는 예측 대신 이것을 쓴다.
   */
  const observedSnapTopRef = useRef<Map<number, number>>(new Map())
  /**
   * 시트가 실제로 쓰는 컨테이너 높이. **역산 값**이고(접힘 위치 + 접힘 픽셀 높이) 마운트
   * 직후 첫 `onChange` 에서 채워진다 — 즉 사용자가 아무것도 누르기 전에 정확한 기준이
   * 준비되므로 **첫 탭부터 보정이 필요 없다**. 화면이 `onLayout` 으로 재는 지도 높이는
   * 탭바·안전영역만큼 이 값과 다르다.
   */
  const sheetContainerHeightRef = useRef<number | null>(null)
  /** 시트가 알려 준 접힘 스냅의 픽셀 높이(핸들 + sticky 헤더). */
  const collapsedSheetHeightRef = useRef<number | null>(null)
  /**
   * 마커 탭으로 고른 마커. `handleSnapChange` 는 스냅이 끝난 뒤에 도는 콜백이라
   * 그 시점의 `mapSearch.markers` 를 클로저로 잡으면 낡은 배열을 볼 수 있다. 좌표만 들고 있는다.
   */
  const selectedMarkerRef = useRef<{ lat: number; lng: number } | null>(null)

  /**
   * 지도가 마지막으로 처리한 터치의 시각.
   *
   * 지도(WebView)와 시트는 형제이고, 시트의 카드 press 는 RN 의 JS 리스폰더를 타고 온다.
   * 그 리스폰더가 제스처 핸들러에게 터치를 빼앗기고도 풀리지 않으면 **지도 위의 마커 탭이
   * 카드 press 로 배달된다** — 마커를 한 번 눌렀는데 마커가 선택되면서 동시에 목록 첫
   * 카드의 상세가 push 되던 것이 그것이다(실측 2026-07-31, `utils/pressIntent` 헤더).
   *
   * 그래서 지도가 터치를 처리할 때마다 여기에 시각을 적고, 그 직후에 도착한 카드 press 를
   * `handlePressCard` 가 버린다. **마커 탭은 절대 상세를 밀어 올리지 않는다** 는 규칙이
   * 이 ref 한 개로 성립한다.
   */
  const lastMapTouchRef = useRef(0)

  /** 마지막 `onIdle` 뷰포트(확정 전). */
  const pendingViewportRef = useRef<MapViewport | null>(null)
  /** 최초 1회 자동 검색을 했는가(D7 의 유일한 예외). */
  const didInitialSearch = useRef(false)
  /**
   * **앱이** 카메라를 옮겼으니 다음 `idle` 에서 한 번 검색해도 된다는 예약 토큰.
   *
   * boolean 최초검색 플래그를 되돌리는 방식이 아니라 별도 토큰인 이유는 파일 헤더 2번에
   * 있다 — 요약하면 예약이 소비되지 않은 채 남으면 사용자의 손 팬이 그걸 먹어 D7 위반이
   * 된다. 그래서 `handleDragStart` 가 무조건 이 토큰을 지운다.
   */
  const armedSearchRef = useRef(false)
  /** 사용자가 지도를 한 번이라도 만졌는가. 늦게 온 내 위치로 카메라를 빼앗지 않기 위한 것. */
  const userMovedMapRef = useRef(false)
  /** 진입 시 내 위치로 옮기는 일을 이미 했는가(마운트당 한 번). */
  const centeredOnUserRef = useRef(false)
  /**
   * 아직 결과를 보고하지 않은 검색.
   *
   * `restaurant_map_viewport_search` 는 bbox·줌(요청 시점)과 결과수·truncated(응답 시점)를
   * 한 이벤트에 담아야 한다. 트리거에서 쏘면 결과를 모르고, 응답에서 쏘면 어떤 뷰포트였는지
   * 모른다. 그래서 트리거가 여기에 적어 두고 응답이 도착하면 합쳐서 쏜다.
   */
  const pendingReportRef = useRef<{
    diagonalKm: number
    zoom: number
    automatic: boolean
  } | null>(null)
  /**
   * 검색 회차. flush 이펙트의 트리거다.
   *
   * 결과 필드(`total`/`truncated`/…)만 의존성으로 두면, 캐시가 신선하고 결과까지 같은
   * 검색(예: 0건 → 0건)에서는 아무 값도 바뀌지 않아 이펙트가 돌지 않는다. 예약이 남고,
   * **다음** 검색의 결과가 **이전** 검색의 bbox·줌으로 보고된다. 회차를 세면 결과가
   * 같아도 반드시 한 번 흐른다.
   */
  const [searchSeq, setSearchSeq] = useState(0)

  const mapSearch = useMapSearch({
    filters,
    userLocation: myLocation.coords,
    // 지도가 죽어도 목록은 살아야 하므로 지도 질의만 끈다.
    enabled: mapError === null,
  })

  const list = useRestaurantList({
    filters,
    userLocation: myLocation.coords,
    /* 지도가 죽었으면 bbox 를 쓰지 않는다 — 뷰포트를 확정할 방법이 없다.
       살아 있으면 **지도 질의가 확정한 값**을 그대로 쓴다. 화면이 자기 state 로 따로
       들고 있으면 정규화·라운딩·면적 검사를 한 번 더 통과해야 하고, 그 중 하나라도
       빠지면 지도와 목록이 다른 상자를 본다(`useMapSearch` 헤더의 세 가지 실패). */
    bounds: mapError === null ? mapSearch.committedBounds : null,
    /*
      **첫 뷰포트가 확정되기 전에는 묻지 않는다.**

      bbox 도 지역 필터도 없는 요청은 서버에서 `전국` 이 된다. 탭에 들어오면 지도가 멎기
      전에 그 전국 질의가 한 발 먼저 나가서, 사용자는 스켈레톤 → 엉뚱한 카드 → 스켈레톤 →
      진짜 카드 순으로 두 번 깜빡이는 것을 봤다. 지도가 죽었을 때는(bbox 를 영영 못 얻는다)
      막지 않는다 — 그때는 전국 목록이 유일하게 남은 화면이다.
    */
    enabled: mapError !== null || mapSearch.committedBounds !== null,
  })

  /** 위치 권한이 사라지면 `거리순` 을 조용히 기본값으로 되돌린다. */
  useEffect(() => {
    controls.sanitizeSortForLocation(myLocation.coords !== null)
  }, [controls, myLocation.coords])

  /* ── 분석 (BUILD_CONTRACT §4) ────────────────────────── */

  useEffect(() => {
    trackAnalyticsEvent("restaurant_map_open", {})
  }, [])

  /**
   * 검색 결과가 도착했다 → 트리거가 적어 둔 뷰포트와 합쳐 한 번 쏜다.
   *
   * 오류일 때는 쏘지 않는다. `total` 이 0 이 되므로 그대로 보내면 실패가 "0곳 찾음" 으로
   * 집계되고, 데이터가 없는 지역과 네트워크가 끊긴 상태를 구분할 수 없게 된다 — 화면에서
   * 그 둘을 애써 구분해 놓고(D12) 분석에서 뭉개면 의미가 없다. 예약은 지운다(다음 검색이
   * 이전 검색의 결과로 보고되지 않게).
   */
  useEffect(() => {
    const pending = pendingReportRef.current
    if (pending === null || mapSearch.isFetching) return
    pendingReportRef.current = null
    if (mapSearch.isError) return
    trackAnalyticsEvent("restaurant_map_viewport_search", {
      bbox_diagonal_km: Math.round(pending.diagonalKm * 10) / 10,
      zoom: pending.zoom,
      mode: mapSearch.mode,
      result_count: mapSearch.total,
      truncated: mapSearch.truncated,
      automatic: pending.automatic,
    })
  }, [
    // `searchSeq` 가 없으면 결과가 같은 검색에서 이펙트가 아예 돌지 않는다(위 주석).
    searchSeq,
    mapSearch.isError,
    mapSearch.isFetching,
    mapSearch.mode,
    mapSearch.total,
    mapSearch.truncated,
  ])

  useEffect(() => {
    if (mapError === null) return
    trackAnalyticsEvent("restaurant_map_degraded", {
      reason: degradedReason(mapError),
    })
  }, [mapError])

  /**
   * **0건이면 시트를 올려 이유를 보여 준다.**
   *
   * 빈 상태 문구(`MapEmptyState`)는 시트 **안**에 산다. 그런데 시트는 접힘 스냅에서
   * 손잡이와 필터 칩만 보이므로, 결과가 0건이 되면 사용자가 보는 것은 **아무 설명도 없는
   * 빈 지도**다. 실측(2026-08-05, 안드로이드): 지역을 `홍대/합정/마포` + 음식 종류 `한식`
   * 으로 바꾸면 카메라는 홍대로 잘 갔지만 마커가 하나도 없고 화면 어디에도 이유가 없었다.
   * QA 가 보고한 "지역·음식종류를 골라 검색했는데 식당이 지도에 안 나온다" 가 이것이다 —
   * 필터가 고장 난 것이 아니라 **0건이라고 말해 주지 않은 것**이다.
   *
   * 그래서 검색이 끝나 0건이 되면 시트를 mid 로 올린다. 규칙을 여기 한 곳에 두면 지역·
   * 음식 종류·영양 기준·AI 검색·`이 지역 검색` 어디로 0건이 되든 같은 설명을 받는다.
   *
   * - **가져오는 중에는 올리지 않는다.** 새 영역으로 이동하는 사이 잠깐 0건이 되는데,
   *   그때 올리면 시트가 오르내리며 깜빡인다(`keepPreviousData` 가 있어도 필터가 바뀌면
   *   빈 구간이 생긴다).
   * - **0건으로 바뀌는 순간에만** 올린다. 회차(`searchSeq`)로 세지 않는 이유: 필터만
   *   바꾸면 뷰포트 검색이 아니라 회차가 안 오른다(질의는 filterKey 로 다시 나간다).
   *   전이로 판정하면 지역·음식 종류·AI 검색·`이 지역 검색` 이 전부 같은 규칙을 받는다.
   *   0건이 이어지는 동안 사용자가 시트를 다시 내리면 그 뜻을 존중한다 — 다시 밀어
   *   올리지 않는다.
   * - 지도가 죽었을 때는 이미 목록이 전체 화면이라 할 일이 없다.
   */
  const wasEmptyRef = useRef(false)
  useEffect(() => {
    if (mapError !== null) return
    if (mapSearch.isFetching || mapSearch.isLoading) return
    const isEmpty = mapSearch.emptyReason !== null
    const becameEmpty = isEmpty && !wasEmptyRef.current
    wasEmptyRef.current = isEmpty
    if (!becameEmpty) return
    if (sheetIndexRef.current >= SHEET_SNAP.MID) return
    sheetRef.current?.snapToIndex(SHEET_SNAP.MID)
  }, [
    mapError,
    mapSearch.emptyReason,
    mapSearch.isFetching,
    mapSearch.isLoading,
  ])

  /* ── 지도 ↔ 데이터 동기화 ─────────────────────────────── */

  /**
   * 마커/클러스터를 지도에 밀어 넣는다. 둘은 배타적이다 — **모드는 서버가 정한다**
   * (`mode:"CLUSTER"|"MARKER"`). 필터 유무로 주입을 끊지 않는다(파일 헤더 §결과는 언제나).
   */
  /**
   * 무엇을 밀어 넣을지는 순수 함수가 정한다(`resolveMapInjection`). 화면의 `if` 로 두면
   * node jest 가 검증할 수 없고, 이 판단이 조용히 되돌아간 것이 바로 "지도에 식당이 안
   * 찍힌다" 사고였다. 그 함수는 `mode` 라벨과 실제 배열이 어긋나면 **데이터 쪽**을 따른다.
   */
  const injection = useMemo(
    () =>
      resolveMapInjection({
        mode: mapSearch.mode,
        markers: mapSearch.markers,
        clusters: mapSearch.clusters,
      }),
    [mapSearch.clusters, mapSearch.markers, mapSearch.mode],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    /*
      **실패하면 그리던 것을 그대로 둔다.**

      `keepPreviousData` 는 키가 바뀐 뒤 `pending` 인 동안만 이전 데이터를 준다. 새 키의
      요청이 `error` 로 끝나면 훅의 `data?.markers ?? []` 가 빈 배열을 내고, 이 이펙트가
      그 빈 배열로 `setMarkers` 를 불러 **이미 그려 둔 마커·클러스터가 통째로 지워진다.**
      네트워크가 한 번 끊겼다고 지도가 백지가 되는 것은 어떤 지도 앱도 하지 않는다.
      오류 안내는 배너가 이미 따로 띄운다.
    */
    if (mapSearch.isError) return
    if (injection.kind === "clusters") {
      map.setClusters(injection.clusters)
      return
    }
    map.setMarkers(injection.markers.map(toMapMarker))
  }, [injection, mapSearch.isError])

  /**
   * **조용한 빈 지도 감시.** 서버가 결과를 줬는데 지도에 아무것도 안 들어갔다면 그건
   * 어떤 이유로든 결함이다 — 그리고 그 실패는 아무 신호도 내지 않는다(요청 200, 목록 정상,
   * 에러 0건). 실제로 그 상태가 배포까지 갔고 사람이 눈으로 보고 발견했다.
   *
   * 그래서 코드가 스스로 소리를 낸다. 사용자에게 보이는 것은 바꾸지 않는다(빈 지도의 안내는
   * `MapEmptyState` 의 일이다) — 이건 **개발자를 향한 경보**이고, 다음에 누가 어떤 이유로
   * 주입을 끊더라도 그 순간 로그에 남는다.
   */
  useEffect(() => {
    if (!isSilentlyEmptyMap({ total: mapSearch.total, injection })) return
    logger.error(
      "[restaurant] map_injection_empty — 서버는 결과를 줬는데 지도에 아무것도 그리지 않았다",
      {
        total: mapSearch.total,
        mode: mapSearch.mode,
        markers: mapSearch.markers.length,
        clusters: mapSearch.clusters.length,
        injected: mapInjectionCount(injection),
      },
    )
  }, [
    injection,
    mapSearch.clusters.length,
    mapSearch.markers.length,
    mapSearch.mode,
    mapSearch.total,
  ])

  /**
   * 지도가 더 이상 지킬 수 없는 선택은 앱에서도 놓는다.
   *
   * web 쪽 `setClusters`/`setMarkers` 는 사라진 id 의 선택을 **스스로** 버린다. 그런데
   * 이 화면의 `selectedId` 는 그대로 남아서, 시트 카드는 하이라이트된 채이고 지도에는
   * 말풍선이 없는 상태가 된다. `select(null)` 을 다시 보내도 state 가 안 바뀌었으니
   * 이펙트가 돌지 않아 복구되지도 않는다. 한쪽이 놓았으면 양쪽이 놓는다.
   */
  useEffect(() => {
    if (selectedId === null) return
    const stillThere =
      mapSearch.mode !== "CLUSTER" &&
      mapSearch.markers.some((item) => item.restaurantId === selectedId)
    if (!stillThere) setSelection(null)
  }, [mapSearch.markers, mapSearch.mode, selectedId])

  /** 사용자 위치 마커. 폴백 좌표(강남역)를 사용자 위치처럼 그리지 않는다. */
  useEffect(() => {
    mapRef.current?.setUserLocation(myLocation.coords)
  }, [myLocation.coords])

  /** 선택 마커. 목록에서 사라진 식당은 `null` 로 떨어진다. */
  useEffect(() => {
    mapRef.current?.select(selectedId)
  }, [selectedId])

  /* ── 지도 이벤트 ─────────────────────────────────────── */

  const handleMapReady = useCallback(() => {
    /*
      검색으로 고른 지역이 있으면 그쪽이 이긴다 — 사용자가 방금 말한 목적지다.
      그 다음은 **마지막으로 보고 있던 자리**다. 오류 화면의 `다시 시도` 는 WebView 를
      key 로 재마운트하므로 지도가 초기 좌표에서 다시 뜨는데, 목록·마커는 그 사이 옛
      bbox 의 것이라 다른 자리에 재주입돼 빈 지도가 된다. 재시도는 보던 곳으로 돌아오는
      것이지 처음으로 돌아가는 것이 아니다.
      마지막이 내 위치다 — 권한이 이미 허용돼 있으면 조용히 옮긴다(묻지는 않는다).
    */
    const start =
      focus ?? pendingViewportRef.current?.center ?? myLocation.coords
    if (start) {
      mapRef.current?.moveTo(start.lat, start.lng, { animate: false })
      // 여기서 옮겼으면 아래 "늦게 온 위치" 이펙트는 할 일이 없다.
      centeredOnUserRef.current = true
    }
    if (myLocation.coords) {
      mapRef.current?.setUserLocation(myLocation.coords)
    }
    // react-query 캐시가 이미 채워져 있으면 데이터 동기화 effect 가 ref 보다 먼저 돌아
    // 아무 것도 주입하지 못한 채 끝난다. ready 시점에 현재 상태를 한 번 더 밀어 넣는다 —
    // 그러지 않으면 "앱 상태는 마커 200개, 지도는 비어 있음" 이 된다.
    if (mapSearch.mode === "CLUSTER") {
      mapRef.current?.setClusters(mapSearch.clusters)
    } else if (mapSearch.markers.length > 0) {
      mapRef.current?.setMarkers(mapSearch.markers.map(toMapMarker))
    }
    // 선택도 다시 보낸다. WebView 가 죽었다 살아난 경우(프로세스 킬 후 리로드) web 쪽
    // 선택은 초기화돼 있고 앱의 state 는 남아 있어, 보내지 않으면 두 쪽이 어긋난 채 시작한다.
    if (selectedId !== null) mapRef.current?.select(selectedId)
  }, [
    focus,
    mapSearch.clusters,
    mapSearch.markers,
    mapSearch.mode,
    myLocation.coords,
    selectedId,
  ])

  /**
   * 늦게 도착한 내 위치로 카메라를 한 번 옮긴다.
   *
   * `useMyLocation` 은 권한 확인 → 측정을 비동기로 하고, 콜드 GPS 픽스는 1~3초 걸린다.
   * 카카오 SDK 는 HTTP 캐시가 따뜻하면 그보다 먼저 준비된다. 그러면 `handleMapReady` 가
   * 읽는 `myLocation.coords` 가 아직 `null` 이라 카메라를 옮기지 않고, `initialCenter` 는
   * **마운트 전용**이므로 나중에 좌표가 와도 아무 일이 없었다. 결과: 부산 사용자가
   * 위치 권한을 이미 허용해 두고 들어오면 강남역 지도를 보고 최초 자동 검색까지 강남에서
   * 돌고, 2초 뒤 내 위치 점만 300km 밖에 찍혔다.
   *
   * 세 조건을 모두 만족할 때만 옮긴다. (1) 아직 옮긴 적이 없다 (2) 검색 화면이 지정한
   * 목적지가 없다 — 사용자가 방금 말한 곳이 내 위치보다 우선이다 (3) 사용자가 지도를
   * 만지지 않았다 — 만졌다면 카메라는 그의 것이다. 옮긴 뒤에는 새 뷰포트로 한 번
   * 검색하도록 예약을 걸어, 첫 결과가 엉뚱한 도시의 것이 되지 않게 한다.
   */
  useEffect(() => {
    const coords = myLocation.coords
    if (!coords) return
    if (centeredOnUserRef.current) return
    if (focus) return
    if (userMovedMapRef.current) return
    centeredOnUserRef.current = true
    mapRef.current?.moveTo(coords.lat, coords.lng, { animate: false })
    armedSearchRef.current = true
  }, [focus, myLocation.coords])

  /**
   * 검색 화면에서 지역을 고르고 돌아왔다 → 카메라를 옮기고 **그 지역을 한 번 검색한다.**
   *
   * 검색은 예약 토큰으로 태운다: 카메라가 멈추면 `onIdle` 이 새 뷰포트를 들고 오고, 그때
   * 확정 + 질의가 한 번 나간다. 여기서 바로 `searchThisArea()` 를 부르면 아직 옛 뷰포트가
   * 확정되어 엉뚱한 영역을 검색한다.
   *
   * 같은 목적지가 다시 렌더되었다고 또 옮기지는 않는다 — 사용자가 그동안 지도를 움직였는데
   * 되돌려 놓으면 조작을 빼앗는 셈이다. 판정은 **좌표 문자열이 아니라 객체 정체**로 한다.
   * 라우트가 `focus` 를 `useMemo` 로 만들므로 새 객체 = 사용자가 검색 화면에서 방금 새로
   * 고른 것이다. 좌표 키로 판정하면 **같은 지역을 다시 고른 경우가 통째로 막혔다**
   * (강남 → 부산 → 강남 에서 마지막 선택이 아무 일도 하지 않았다).
   */
  const appliedFocusRef = useRef<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (!focus) return
    if (appliedFocusRef.current === focus) return
    appliedFocusRef.current = focus
    // 목적지가 정해졌으므로 내 위치로 옮기는 일은 하지 않는다.
    centeredOnUserRef.current = true
    mapRef.current?.moveTo(focus.lat, focus.lng, { zoom: MAP_ZOOM.DEFAULT })
    armedSearchRef.current = true
  }, [focus])

  /**
   * 뷰포트를 확정하고 질의를 낸다. 확정에 실패하면(면적 상한) 분석 예약을 남기지 않는다 —
   * 남기면 다음 검색의 결과가 이 뷰포트의 것으로 보고된다.
   *
   * **확정했으면 `true`.** 호출부가 이 값을 봐야 하는 이유는 `handleIdle` 주석에 있다.
   */
  const commitSearch = useCallback(
    (viewport: MapViewport, automatic: boolean): boolean => {
      if (!mapSearch.searchThisArea()) {
        pendingReportRef.current = null
        return false
      }
      pendingReportRef.current = {
        diagonalKm: bboxDiagonalKm(viewport.bounds),
        zoom: viewport.zoom,
        automatic,
      }
      setSearchSeq((current) => current + 1)
      return true
    },
    [mapSearch],
  )

  const handleIdle = useCallback(
    (viewport: MapViewport) => {
      pendingViewportRef.current = viewport
      mapSearch.onViewportChange(viewport.bounds, viewport.zoom)
      // D7 의 예외 두 가지: 마운트 후 최초 1회, 그리고 앱이 카메라를 옮긴 직후의 예약.
      // 사용자의 손 팬은 어느 쪽도 아니다 — `handleDragStart` 가 예약을 지운다.
      const armed = !didInitialSearch.current || armedSearchRef.current
      if (!armed) return
      /*
        **성공했을 때만 예약을 소비한다.**

        예전에는 `commitSearch` 를 부르기 전에 두 플래그를 먼저 껐다. 확정이 거절되는
        경로가 있는데도(면적 상한) 그랬다. 실제로 그 경로가 있다 — WebView 는 HTML 을
        먼저 로드하고 레이아웃을 나중에 확정하므로, 컨테이너가 아직 0×0 인 상태의 첫
        `idle` 은 세계 전체에 가까운 bbox 를 들고 온다. 그 한 번이 최초검색 예외를
        **써 버리고**, 이후에는 사용자가 지도를 손으로 끌어 pill 을 눌러야만 마커가
        나왔다. 화면상으로는 "지도만 영원히 비어 있다" 로 보인다.

        실패했을 때 플래그를 그대로 두면 다음 `idle`(크기가 확정된 뒤의 것)이 그 예약을
        쓴다. D7 을 어기지 않는다 — 아직 **한 번도** 검색하지 않은 상태이고, 사용자가
        지도를 만지면 `handleDragStart` 가 예약을 지운다.
      */
      if (!commitSearch(viewport, true)) return
      didInitialSearch.current = true
      armedSearchRef.current = false
    },
    [commitSearch, mapSearch],
  )

  const handleSearchThisArea = useCallback(() => {
    const pending = pendingViewportRef.current
    if (!pending) return
    commitSearch(pending, false)
  }, [commitSearch])

  /**
   * 선택 마커를 **보이는 영역의 중앙**에 놓는다. 상단 오버레이와 시트가 가리는 높이를
   * 넘겨 주면 지도가 목표 중심을 직접 계산해 `panTo` 를 한 번만 부른다.
   *
   * ## 예전 방식(`moveTo` + `panBy`)을 왜 버렸나
   *
   * `moveTo` 는 `panTo` — 애니메이션이다. 거기에 `panBy(0, 시트높이/2)` 라는 **상대 이동**을
   * 곧바로 얹으면, panBy 가 기준으로 삼는 중심이 "이동 중인 중심" 이라 결과가 프레임
   * 타이밍에 좌우된다. 그리고 연타하면 그 상대 이동이 **쌓인다** —
   * 사용자 보고: "누르면 누를수록 마커가 위로 화면 밖으로 더 밀려난다." 애니메이션 위에
   * 상대 이동을 겹치는 구조에서는 필연이다.
   *
   * 지금은 목표 좌표를 먼저 구하므로 **멱등**하다. 같은 마커를 열 번 눌러도 같은 자리다.
   * 시트 스냅이 끝나기를 기다릴 필요도 없어졌다 — 그 시점의 시트 높이를 넘기면 그만이다.
   */
  const focusMarkerInVisibleArea = useCallback(
    (
      lat: number,
      lng: number,
      sheetTopOverride?: number,
      /* 함께 확정할 배율. **줌은 반드시 이 명령에 실어야 한다** — `setLevel` 을 따로
         부르면 카카오가 idle 을 두 번 내고, 화면은 자동 재검색 예약을 첫 idle 에서
         소진하므로 두 번째 idle 이 사용자 팬으로 읽혀 방금 파고든 자리에
         `현재 지도에서 찾기` 가 떴다(결과는 이미 최신인데). */
      zoom?: number,
    ) => {
      const sheetTop = sheetTopOverride ?? sheetPositionRef.current
      const padBottom =
        containerHeight > 0 ? Math.max(0, containerHeight - sheetTop) : 0
      mapRef.current?.focusMarker(lat, lng, {
        padTop: topOverlayHeight,
        padBottom,
        zoom,
      })
    },
    [containerHeight, topOverlayHeight],
  )

  const handleMarkerPress = useCallback(
    (restaurantId: number) => {
      lastMapTouchRef.current = Date.now()
      trackAnalyticsEvent("restaurant_marker_tap", {
        restaurant_id: restaurantId,
      })
      setSelection({ id: restaurantId, origin: "MARKER" })
      const alreadyOpen = sheetIndexRef.current >= SHEET_SNAP.MID
      // 시트를 mid 로 올려 카드가 보이게 한다.
      if (!alreadyOpen) sheetRef.current?.snapToIndex(SHEET_SNAP.MID)
      /* 고른 곳은 `useSelectedFirstList` 가 0번으로 올린다 — 시트는 맨 위로 되감기만
         하면 된다. 예전의 `scrollToRestaurant(id)` 는 목록에 없는 마커에서 `findIndex`
         가 -1 이라 조용히 아무 일도 하지 않았고, 그것이 "마커를 눌러도 하단이 그대로"
         였다. 스크롤을 이미 내려 둔 사용자에게도 첫 카드를 보여 주려면 되감기가 필요하다. */
      sheetRef.current?.scrollToTop()
      const marker = mapSearch.markers.find(
        (item) => item.restaurantId === restaurantId,
      )
      if (!marker) return
      selectedMarkerRef.current = { lat: marker.lat, lng: marker.lng }
      // 시트를 mid 로 올리는 중이면 그 스냅이 끝난 뒤의 높이로 계산해야 마커가 가리지 않는다.
      // 스냅 완료를 기다리지 않고 예상 높이를 바로 넘긴다 — 멱등이라 스냅 후 한 번 더 불러도
      // 같은 자리로 수렴한다(예전처럼 상대 이동이 쌓이지 않는다).
      /*
        **스냅이 끝난 뒤의 시트 높이로 계산한다.** 접힌 상태의 높이를 쓰면 카메라가 "화면
        전체의 중앙" 을 목표로 잡고, 시트가 올라온 뒤 보정이 한 번 더 돌면서 마커가 위로
        다시 이동한다 — 사용자 눈에는 **아래로 내려갔다가 다시 중앙으로** 두 번 움직이는
        것으로 보인다(실제 보고). `focusMarker` 가 멱등인 것과는 다른 문제다: 멱등성은
        같은 입력에 대해서만 성립하는데 두 호출의 `padBottom` 이 서로 달랐다.
      */
      if (alreadyOpen) {
        focusMarkerInVisibleArea(marker.lat, marker.lng)
      } else {
        /*
          한 번이라도 mid 를 지나갔다면 **관측된 실제 위치**를 쓴다. 예측(`"55%"` × 화면
          높이)은 근사라서 탭바·안전영역만큼 몇 pt 어긋나고, 그 차이가 스냅 후 보정에서
          "조금 떨어진 자리에 멈췄다가 다시 중앙으로" 로 보였다(사용자 보고 2차).
        */
        const derivedContainer = sheetContainerHeightRef.current
        const usedTop =
          // 1) 이미 mid 를 지나간 적이 있으면 그때 관측한 값이 가장 정확하다.
          observedSnapTopRef.current.get(SHEET_SNAP.MID) ??
          // 2) 없으면 역산한 컨테이너 높이로 계산한다(마운트 직후부터 가능).
          (derivedContainer !== null
            ? predictSheetTop(derivedContainer, SHEET_MID_RATIO)
            : // 3) 그것도 없을 때만 화면 높이로 근사한다(탭바·안전영역만큼 어긋난다).
              predictSheetTop(containerHeight, SHEET_MID_RATIO))
        focusMarkerInVisibleArea(marker.lat, marker.lng, usedTop)
        pendingRaiseRef.current = { usedTop }
      }
    },
    [containerHeight, focusMarkerInVisibleArea, mapSearch.markers],
  )

  /**
   * 클러스터 탭 → 그 셀로 파고든다.
   *
   * `fitBounds` 를 쓰는 이유: `moveTo(zoom)` 은 시트·상단 오버레이가 가린 영역을 모른다.
   * 서버는 셀의 **중심과 개수만** 주고 실제 범위는 주지 않으므로, 현재 뷰포트를 1/4 로
   * 줄인 상자를 셀 중심에 놓는다 — 정확한 셀 경계는 알 수 없고, 사용자는 한 번 더 눌러
   * 더 들어갈 수 있다. 없는 정보를 있는 척 계산하지 않는다.
   *
   * ## 파고든 뒤에 **한 번 검색한다** (D7 예외, 파일 헤더 2번의 목록에 속한다)
   *
   * 클러스터를 누르는 것은 "이 안을 보여 달라" 는 명시적 의사 표시다. 그런데 예약을 걸지
   * 않던 시절에는 카메라만 파고들고 데이터는 그대로여서, **방금 누른 그 배지가 확대된
   * 화면에 그대로 떠 있었다.** 클러스터 임계값을 4 로 내린 뒤로는 이 경로가 마커를 보는
   * 주된 길이 되었기 때문에 그 어색함이 기능 자체를 막는다.
   *
   * 손 팬이 아니라 **앱이 옮긴 카메라**이므로 D7 위반이 아니다 — `지도 넓혀서 다시 찾기`
   * 나 검색 화면의 지역 선택과 같은 부류이고, 예약이 소비되지 않고 남는 위험은
   * `handleDragStart` 가 지우는 것으로 이미 막혀 있다.
   */
  const handleClusterPress = useCallback(
    (cluster: { lat: number; lng: number; count: number }) => {
      lastMapTouchRef.current = Date.now()
      trackAnalyticsEvent("restaurant_cluster_tap", {
        marker_count: cluster.count,
      })
      armedSearchRef.current = true
      const viewport = pendingViewportRef.current
      if (!viewport) {
        mapRef.current?.moveTo(cluster.lat, cluster.lng, {
          zoom: MAP_ZOOM.FOCUSED,
        })
        return
      }
      /*
        **확대량은 레벨로, 위치는 `focusMarker` 로.**

        예전에는 `fitBounds` 하나로 둘 다 했는데, 상자는 **전체 뷰포트**에서 뽑고 맞추는
        곳은 시트·오버레이를 뺀 **보이는 영역**이라 두 축소가 상쇄됐다(자세한 산수는
        `nextClusterZoom` 머리말). 그래서 누를수록 조금씩 축소되다가 한계에서 다시
        확대되는 것처럼 보였다 — 사용자 보고 그대로다.

        레벨 −2 는 카카오에서 정확히 4배 확대이고, 위치는 이미 보이는 영역을 아는 명령이
        잡는다. 둘을 **한 명령으로** 준다 — 나눠 주면 카카오가 idle 을 두 번 내고, 자동
        재검색 예약이 첫 idle 에서 소진되어 두 번째가 사용자 팬으로 읽힌다(결과는 이미
        최신인데 `현재 지도에서 찾기` 가 뜬다).
      */
      focusMarkerInVisibleArea(
        cluster.lat,
        cluster.lng,
        undefined,
        nextClusterZoom(viewport.zoom, MAP_ZOOM.MIN),
      )
    },
    [focusMarkerInVisibleArea],
  )

  const handleMapPress = useCallback(() => {
    lastMapTouchRef.current = Date.now()
    setSelection(null)
  }, [])

  const handleDragStart = useCallback(() => {
    lastMapTouchRef.current = Date.now()
    // 손가락이 지도에 닿는 순간 시트를 접는다. 지도를 보려는 의사 표시다.
    sheetRef.current?.collapse()
    // 카메라는 이제 사용자의 것이다. 늦게 오는 내 위치가 빼앗지 못하게 표시하고,
    // 소비되지 않고 남아 있던 자동검색 예약도 버린다 — 남기면 이 팬이 그걸 먹어
    // D7 이 금지한 "팬 유발 자동 재조회" 가 된다.
    userMovedMapRef.current = true
    armedSearchRef.current = false
    /* 최초검색 예외도 여기서 끝난다. 그 예외의 목적은 **사용자가 아무것도 하기 전에**
       첫 화면을 채우는 것이다. 손이 지도에 닿은 순간 그 목적은 지났고, 이후로는 pill 이
       유일한 트리거다. 이 한 줄이 없으면 첫 확정이 거절된 경우(0×0 컨테이너의 첫 idle)
       예외가 살아남아 **이 팬이 끝날 때 자동 검색**이 돈다 — 정확히 D7 이 금지하는 것이다. */
    didInitialSearch.current = true
  }, [])

  const handleMapError = useCallback((message: string) => {
    if (__DEV__) {
      // 사용자 화면은 일반 문구지만, 원인 문자열(도메인 미등록 401·타임아웃·설정 누락)은
      // 여기에만 있다. dev 에서 회색 지도를 만났을 때 이 로그가 진단의 시작점이다.
      console.warn(`[restaurant-map] degraded: ${message}`)
    }
    setMapError(message)
  }, [])

  /**
   * 지도를 다시 띄운다. WebView 를 **언마운트하지 않고** `key` 를 올려 새 인스턴스를 만든다 —
   * HTML 은 마운트 시 한 번만 만들어지므로(RestaurantMapView 주석 1번) 재시도는 곧 재마운트다.
   *
   * 왜 필요한가: 예전에는 지도가 실패하면 "지도 없이 목록으로 보여드릴게요" 를 띄우고 리스트
   * 모드로 내려갔다. 그 fallback 자체가 문제였다 — 카카오 키의 허용 도메인이 틀려서 SDK 가
   * **항상** 401 이던 기간에, 화면은 그것을 정상적인 한 가지 모습처럼 보여 줬다. 즉 버그를
   * 기능처럼 포장해 버렸고, 그래서 아무도 지도가 죽은 줄 몰랐다.
   *
   * 지도가 이 화면의 존재 이유다. 못 뜨면 **못 떴다고 말하고 다시 시도할 수 있게** 한다.
   */
  const retryMap = useCallback(() => {
    setMapError(null)
    setMapMountKey((value) => value + 1)
  }, [])

  /**
   * 시트가 알려 주는 접힘 스냅의 픽셀 높이. 이 값과 접힘 위치를 더하면 시트의 컨테이너
   * 높이가 역산된다(`deriveSheetContainerHeight`). 값이 바뀌면(필터칩 행이 두 줄이 되는 등)
   * 역산도 다시 해야 하므로 관측값 캐시를 비운다.
   */
  const handleCollapsedHeight = useCallback((height: number) => {
    if (collapsedSheetHeightRef.current === height) return
    collapsedSheetHeightRef.current = height
    sheetContainerHeightRef.current = null
    observedSnapTopRef.current.clear()
  }, [])

  const handleSnapChange = useCallback(
    (index: number, position: number) => {
      sheetIndexRef.current = index
      sheetPositionRef.current = position
      // 보이는 높이가 바뀌었다고 카카오에 알린다. 안 알리면 타일이 잘린 채 남는다.
      mapRef.current?.relayout()
      // 마커 탭이 예약한 재정렬. 스냅이 끝나 시트 높이가 확정된 지금 한 번 더 맞춘다.
      // `focusMarker` 는 멱등이므로 탭 시점에 이미 한 번 불렀어도 결과가 같은 자리로 수렴한다
      // (예전 `panBy` 방식이었다면 여기서 두 번째 상대 이동이 얹혀 마커가 더 밀려났다).
      observedSnapTopRef.current.set(index, position)
      /*
        접힘 스냅은 **픽셀** 값이라 `position + collapsedHeight` 가 곧 시트의 컨테이너
        높이다(추정이 아니라 역산). 이 값이 있으면 `mid` 위치를 정확히 계산할 수 있다.
      */
      if (
        index === SHEET_SNAP.COLLAPSED &&
        collapsedSheetHeightRef.current !== null
      ) {
        const derived = deriveSheetContainerHeight(
          position,
          collapsedSheetHeightRef.current,
        )
        if (derived !== null) sheetContainerHeightRef.current = derived
      }
      const pending = pendingRaiseRef.current
      if (pending !== null) {
        pendingRaiseRef.current = null
        // **차이가 눈에 보일 때만** 다시 맞춘다. 몇 pt 때문에 카메라가 한 번 더 움직이면
        // 사람은 정렬이 아니라 "멈췄다가 다시 가는 것" 으로 읽는다(`shouldRefocusAfterSnap`).
        if (!shouldRefocusAfterSnap(pending.usedTop, position)) return
        const marker = selectedMarkerRef.current
        if (marker) focusMarkerInVisibleArea(marker.lat, marker.lng, position)
      }
    },
    [focusMarkerInVisibleArea],
  )

  /* ── 컨트롤 ─────────────────────────────────────────── */

  const handleMyLocation = useCallback(() => {
    void (async () => {
      const coords = await myLocation.request()
      // 결과를 좌표 유무로 추론한다. `myLocation.status` 는 이 클로저가 만들어진 렌더의
      // 값이라 요청 직후에는 아직 옛 값이다. 한계: 권한은 받았는데 위치 측정이 실패한
      // 드문 경우가 `denied` 로 집계된다 — 거부율을 조금 높게 보는 쪽의 오차다.
      trackAnalyticsEvent("restaurant_location_permission", {
        result: coords ? "granted" : "denied",
      })
      if (!coords) return
      // 사용자가 직접 누른 이동이다. 진입 시 자동 이동 이펙트가 뒤늦게 또 옮기지 않게 한다.
      centeredOnUserRef.current = true
      /*
        **배율은 건드리지 않는다.** 종전에는 `zoom: DEFAULT(4)` 를 얹었는데, 4 는 클러스터
        임계값과 같은 값이라 낱개 마커를 보던 사용자가 이 버튼을 누르면 보고 있던 마커들이
        개수 배지 하나로 뭉쳤다. 네이버·카카오의 내 위치 버튼은 어떤 경우에도 사용자가
        만든 배율을 되돌리지 않는다. 같은 목적지의 다른 경로(늦게 온 내 위치)도 이미
        줌 없이 부른다.

        배율이 그대로면 `resolveViewportAction` 이 팬으로 읽어 pill 만 뜬다. 그래서 예약을
        건다 — 앱이 옮긴 카메라이므로 다른 앱 주도 경로(클러스터 탭·지역 선택)와 같은 부류다.
        이 한 줄이 없으면 "내 위치를 눌렀는데 목록은 강남 그대로" 가 된다.
      */
      armedSearchRef.current = true
      mapRef.current?.moveTo(coords.lat, coords.lng)
    })()
  }, [myLocation])

  const handleSelectCuisine = useCallback(
    (type: CuisineType | null) => {
      controls.selectRailCuisine(type)
      // 필터가 바뀌면 이전 선택은 목록에 없을 수 있다. 유령 선택을 남기지 않는다.
      setSelection(null)
    },
    [controls],
  )

  /**
   * 고른 마커의 좌표. 상세 응답의 `lat`/`lng` 가 `null` 일 때 카드가 쓸 폴백이다.
   * 마커가 사라졌으면(모드 전환·필터 변경) `null` 이고, 그때는 위의 정리 이펙트가
   * 선택 자체를 놓는다.
   */
  const selectedMarker = useMemo(
    () =>
      selectedId === null
        ? null
        : (mapSearch.markers.find((item) => item.restaurantId === selectedId) ??
          null),
    [mapSearch.markers, selectedId],
  )

  /**
   * 시트에 그릴 최종 목록. **고른 곳이 첫 카드다.**
   *
   * 마커에서 고른 선택만 넘긴다(`selection.origin`). 카드 탭도 같은 선택을 만들지만
   * 그때 재정렬하면 방금 누른 카드가 손가락 밑에서 위로 튄다 — `selection` 선언 주석 참고.
   */
  const sheetList = useSelectedFirstList({
    items: list.items,
    selectedId: selection?.origin === "MARKER" ? selection.id : null,
    userLocation: myLocation.coords,
    selectedCoords: selectedMarker,
  })

  const handlePressCard = useCallback(
    (card: RestaurantCardDto) => {
      /* 지도가 방금 처리한 터치가 카드 press 로 배달된 것이면 버린다.
       **마커 탭이 상세를 밀어 올리는 일은 여기서 끝난다**(`lastMapTouchRef` 주석). */
      if (isMapTouchEcho(Date.now(), lastMapTouchRef.current)) return
      setSelection({ id: card.restaurantId, origin: "CARD" })
      /* 카드 탭도 **모드 경계를 넘는다.** 진입 배율(4)은 클러스터 구간이고 FOCUSED(2)는
         마커 구간이라, 예약을 걸지 않으면 상세를 보고 돌아왔을 때 지도가 확대된 채
         이전 배율의 개수 배지를 그리고 있다. `handleClusterPress` 와 같은 부류 —
         앱이 옮긴 카메라이므로 D7 위반이 아니다. */
      armedSearchRef.current = true
      // 줌과 위치를 **한 명령으로** 준다(클러스터 탭과 같은 이유 — idle 이 두 번 나면
      // 자동 재검색 예약이 첫 번째에 소진되고 두 번째가 사용자 팬으로 읽힌다).
      focusMarkerInVisibleArea(card.lat, card.lng, undefined, MAP_ZOOM.FOCUSED)
      router.push({
        pathname: "/restaurant/[id]",
        params: { id: card.restaurantId, from: "map" },
      })
    },
    [focusMarkerInVisibleArea, router],
  )

  const handlePressBookmarks = useCallback(() => {
    router.push("/restaurant/bookmarks")
  }, [router])

  const handlePressReport = useCallback(() => {
    router.push("/restaurant/report")
  }, [router])

  /**
   * 정렬 시트의 `다음`. 이벤트를 여기서 쏘는 이유: 시트는 값을 고르는 곳이고
   * **확정은 이 화면이 한다**. 시트 안에서 쏘면 열었다 닫기만 해도 집계될 위험이 있다.
   */
  const handleSubmitSort = useCallback(
    (sort: SortOption) => {
      controls.setSort(sort)
      trackAnalyticsEvent("restaurant_sort_change", { sort })
    },
    [controls],
  )

  /**
   * 필터 시트의 `확인`. `controls.draft` 는 이 시점에 **방금 확정된 값**이다 —
   * 칩 탭들이 이전 렌더에서 이미 draft 에 쌓였고, `applyDraft()` 가 그 draft 를 확정본으로
   * 옮긴 직후 이 콜백이 불린다. `filters` 를 읽으면 아직 이전 확정본이다.
   *
   * 축마다 한 번씩 쏜다(비어 있는 축은 건너뛴다). 하나로 뭉치면 "지역 때문인지 영양
   * 기준 때문인지" 를 나중에 되짚을 수 없다.
   */
  const handleApplyFilters = useCallback(() => {
    setSelection(null)
    const draft = controls.draft
    /*
      **지역을 골랐으면 카메라도 그리로 간다.**

      서버는 bbox 와 지역을 같은 `AND` 로 묶는다. 강남을 보고 있는데 필터에서 `부산` 을
      고르면 조건은 "강남 상자 안에 있는 부산 가게" 가 되어 **구조적으로 0건**이다.
      사용자에게는 필터가 고장 난 것으로 보이고, 빈 화면의 탈출구도 `필터 초기화` 뿐이라
      방금 고른 지역을 버리는 것 말고는 길이 없었다.

      배율은 주지 않는다 — 내 위치 버튼과 같은 이유로, 사용자가 만든 배율을 앱이
      되돌리지 않는다. 좌표는 카탈로그가 이미 갖고 있다(`centerFor`).
      세부(구/군)를 골랐으면 그쪽이 시도보다 정확하므로 먼저 본다.
    */
    const region = centerFor(
      draft.regionGroups[0] ?? draft.regionSidos[0] ?? "",
    )
    if (region) {
      mapRef.current?.moveTo(region.lat, region.lng)
      armedSearchRef.current = true
    }
    const axes = [
      {
        axis: "region" as const,
        options: [...draft.regionSidos, ...draft.regionGroups],
      },
      { axis: "nutrition" as const, options: [...draft.nutritionTags] },
      { axis: "cuisine" as const, options: [...draft.cuisineTypes] },
    ]
    for (const entry of axes) {
      if (entry.options.length === 0) continue
      trackAnalyticsEvent("restaurant_filter_apply", {
        axis: entry.axis,
        selected_count: entry.options.length,
        options: entry.options.join(","),
      })
    }
  }, [controls])

  /**
   * `지도 넓혀서 다시 찾기`.
   *
   * 두 가지를 지킨다.
   *
   * 1. **넓힌 결과가 서버의 bbox 면적 상한(대각 200km)을 넘지 않게 한다.** 넘으면
   *    `searchThisArea()` 가 거절하고, 사용자는 "넓혀서 찾기" 를 눌렀는데 아무 일도
   *    일어나지 않는 것을 본다. 레벨 한 단계마다 뷰포트 변이 대략 두 배이므로 대각도
   *    두 배로 본다. 두 단계가 넘치면 한 단계로 줄이고, 그것도 넘치면 넓히지 않는다.
   * 2. **카메라가 실제로 움직일 때만 예약을 건다.** 이미 줌 상한(또는 면적 상한)에 닿아
   *    있으면 `setLevel` 이 아무 것도 바꾸지 않아 카카오가 `idle` 을 내지 않는다. 예약만
   *    걸어 두면 소비되지 않고 남아, 그 뒤 사용자가 지도를 끌었을 때 그 idle 이 예약을
   *    먹는다 — D7 위반이다. 그럴 때는 예약 대신 지금 뷰포트로 바로 한 번 검색한다.
   */
  const handleWidenMap = useCallback(() => {
    const viewport = pendingViewportRef.current
    const current = viewport?.zoom ?? MAP_ZOOM.DEFAULT
    const nextLevel = widenLevel(current, viewport?.bounds ?? null)
    if (nextLevel === current) {
      handleSearchThisArea()
      return
    }
    armedSearchRef.current = true
    mapRef.current?.setLevel(nextLevel)
  }, [handleSearchThisArea])

  const handleResetFilters = useCallback(() => {
    controls.resetAll()
    setSelection(null)
  }, [controls])

  const handleRetry = useCallback(() => {
    mapSearch.refetch()
    list.refetch()
  }, [list, mapSearch])

  /* ── 파생값 ─────────────────────────────────────────── */

  /**
   * 시트 위쪽에 뜨는 컨트롤. 시트를 따라 올라간다.
   * `bottom` 을 애니메이션하는 이유: FAB 스택 높이가 상태(스피너/아이콘)에 따라 달라져
   * `translateY` 로는 기준점을 고정할 수 없다.
   */
  const floatingStyle = useAnimatedStyle(() => ({
    bottom:
      containerHeight > 0
        ? containerHeight - sheetPosition.value + spacing[12]
        : spacing[12],
  }))

  /**
   * 시트 머리의 안내 문구. **해당하는 것을 모두 쌓는다.**
   *
   * 예전에는 if/else 로 하나만 골랐는데, 그러면 절단 안내가 제외 안내를 가린다. 밀집
   * 지역에서 `저단백` 을 걸면 서버가 절단(`truncated`)도 하고 태그가 NULL 인 곳
   * 120곳도 뺀다 — 그때 "지도를 확대해 보세요" 만 보이고, 데이터가 없어 절반이 빠졌다는
   * 사실은 사라진다. 사용자는 필터가 조용히 반을 지운 목록을 완전한 결과로 읽는다.
   * 셋 다 한 줄짜리 문구이므로 겹쳐 놓아도 시트를 잡아먹지 않는다.
   *
   * 절단 두 종류는 서로 배타적이다(`limitReached` 는 확대해도 줄지 않는 상황이라 문구가
   * 다르다). 제외·프로필 안내는 **목록 질의**에서 오므로 지도가 죽은 리스트 모드에서도 살아 있다.
   */
  const notice = useMemo(() => {
    const messages: string[] = []
    // 조용한 절단 금지 — limit 에 걸린 사실을 반드시 말한다.
    if (mapSearch.limitReached) {
      messages.push(t("restaurant.map.limitReached"))
    } else if (mapSearch.truncated) {
      messages.push(t("restaurant.map.truncated"))
    }
    // 태그 필터가 `nutrition_tags IS NULL` 인 곳을 조용히 뺀 개수(376곳 중 189곳이 NULL이다).
    if (list.excludedForMissingData > 0) {
      messages.push(
        t("restaurant.map.excludedForMissingData", {
          count: list.excludedForMissingData,
        }),
      )
    }
    if (list.profileMissing) {
      messages.push(t("restaurant.safety.profileMissingBody"))
    }
    if (messages.length === 0) return undefined
    return (
      <>
        {messages.map((message) => (
          <SheetNotice key={message} message={message} />
        ))}
      </>
    )
  }, [
    list.excludedForMissingData,
    list.profileMissing,
    mapSearch.limitReached,
    mapSearch.truncated,
    t,
  ])

  /**
   * WebView 안에서 쓸 접근성 문구. HTML 에 한글을 박지 않기 위해 명령으로 보낸다
   * (`map/mapHtml.ts` 규칙 5번). 언어가 바뀌면 이 객체가 새로 만들어져 다시 주입된다.
   */
  const mapStrings = useMemo(
    () => ({
      /* 보간값을 **일부러 넘기지 않는다.** i18next 는 값이 없는 자리를 지우지 않고
         `{{name}}` 그대로 남기므로, 그 문자열이 곧 WebView 가 쓸 템플릿이 된다.
         치환은 web 쪽 `fill()` 이 마커마다 한다 — 마커 200개의 문구를 RN 에서 미리
         만들어 넘기면 주입 페이로드가 그만큼 커진다. */
      markerAccessibility: t("restaurant.map.markerAccessibility"),
      clusterAccessibility: t("restaurant.map.clusterAccessibility"),
      safetyLabels: {
        SAFE: t("restaurant.safety.SAFE"),
        CAUTION: t("restaurant.safety.CAUTION"),
        RESTRICTED: t("restaurant.safety.RESTRICTED"),
        UNKNOWN: t("restaurant.safety.UNKNOWN"),
      },
    }),
    [t],
  )

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerHeight(Math.round(event.nativeEvent.layout.height))
  }, [])

  const handleTopOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    setTopOverlayHeight(Math.round(event.nativeEvent.layout.height))
  }, [])

  /**
   * sticky 필터칩 행. 지도 시트와 리스트 모드가 같은 노드를 쓴다 — 두 곳에서 각자
   * 조립하면 칩 순서·개수 표기가 갈린다.
   */
  const filterRow = (
    <FilterChipRow
      sort={filters.sort}
      axes={controls.axes}
      onPressSort={() => setSortSheetOpen(true)}
      onPressAxis={setFilterSection}
    />
  )

  /**
   * 목록 끝의 보조 진입점. `저장한 곳` 과 `식당 알려주기` 가 여기 산다 — 제보 폼은
   * 이 블록이 생기기 전까지 `restaurantTab` 플래그가 꺼진 탭 본체가 **유일한** 문이었고,
   * 지도를 켜면 그 문이 사라진다(§F.1). 지도면에 버튼을 더하지 않고 목록 끝에 둔 이유는
   * `MapUtilityFooter` 헤더에 적었다.
   */
  const utilityFooter = (
    <MapUtilityFooter
      onPressBookmarks={handlePressBookmarks}
      onPressReport={handlePressReport}
    />
  )

  const topOverlay = (
    <View
      // `box-none`: 오버레이의 빈 공간은 지도에 터치를 흘려보낸다. 안 주면 상단 1/4 이
      // 눌리지 않는 죽은 영역이 된다.
      pointerEvents="box-none"
      onLayout={handleTopOverlayLayout}
      style={[styles.topOverlay, { paddingTop: insets.top + spacing[8] }]}
    >
      {/*
        상태바 가독성. 지도 타일은 흰 건물 · 노란 도로 · 초록 공원이 섞여 있어서 그 위에
        검은 시계·배터리가 얹히면 배경에 따라 읽히거나 안 읽힌다(실측: 강남 일대에서
        시계가 도로 위로 오면 사실상 안 보인다). 지도 앱들이 공통으로 쓰는 방법대로
        **위로 갈수록 흰 스크림**을 깐다 — 단색 띠를 쓰면 경계선이 생겨 지도가 잘린 것처럼
        보이므로 그라디언트다. `pointerEvents="none"` 이라 지도 조작을 가로채지 않는다.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          scrimColor(colors.background.default, 0.92),
          scrimColor(colors.background.default, 0),
        ]}
        style={[styles.statusScrim, { height: insets.top + spacing[8] }]}
      />
      <MapSearchBar
        query={filters.query}
        onPress={() => router.push("/restaurant/search")}
        onClear={() => controls.setQuery("")}
        style={styles.searchBar}
      />
      <CategoryChipRail
        selected={
          filters.cuisineTypes.length === 1 ? filters.cuisineTypes[0] : null
        }
        onSelect={handleSelectCuisine}
        onPressAiSearch={() => setAiSearchOpen(true)}
        insetHorizontal={SIDE}
        style={styles.chipRail}
      />
      {!permissionBannerHidden && (
        <LocationPermissionBanner
          status={myLocation.status}
          blockedForever={myLocation.blockedForever}
          onRequest={handleMyLocation}
          onDismiss={() => setPermissionBannerHidden(true)}
          style={styles.banner}
        />
      )}
    </View>
  )

  /**
   * 정렬·필터·AI 검색 시트. 셋 다 `V2BottomSheet`(RN `Modal`) 기반이라 트리의 어디에
   * 있어도 화면 전체를 덮는다 — 그래서 지도 시트 **안**이 아니라 화면 끝에 함께 둔다.
   * 지도 시트 안에 두면 시트가 접힐 때 언마운트되어 열려 있던 필터가 사라진다.
   */
  const sheets = (
    <>
      <SortSheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        value={filters.sort}
        onSubmit={handleSubmitSort}
        distanceDisabled={myLocation.isDistanceSortDisabled}
      />
      <FilterSheet
        visible={filterSection !== null}
        onClose={() => setFilterSection(null)}
        filters={controls}
        onApply={handleApplyFilters}
        initialSection={filterSection ?? undefined}
      />
      <AiSearchSheet
        visible={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        viewport={mapSearch.committedBounds}
        userLocation={myLocation.coords}
        onApply={(applied) => {
          controls.applyAiFilters(applied)
          setSelection(null)
        }}
      />
    </>
  )

  /* ── 지도 실패 ──────────────────────────────────────────
     "지도 없이 목록으로" 라는 fallback 은 **없앴다.** 카카오 키의 허용 도메인이 틀려서
     SDK 가 항상 401 이던 기간에, 그 화면이 버그를 정상 모습처럼 보여 주는 바람에 지도가
     죽은 것을 아무도 몰랐다. 지도가 이 화면의 존재 이유이므로, 못 뜨면 못 떴다고 말하고
     다시 시도하게 한다(`retryMap`). ── */

  if (mapError !== null) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.background.default }]}
      >
        {topOverlay}
        {/* 오버레이는 absolute 라 흐름에서 빠진다 — 실측 높이만큼 아래로 내려야 겹치지 않는다.
            상수(예: insets.top + 122)를 쓰면 다른 화면 크기에서 어긋난다(§F.11). */}
        <View style={[styles.degraded, { paddingTop: topOverlayHeight }]}>
          <V2ErrorState
            title={t("restaurant.error.mapTitle")}
            description={t("restaurant.error.mapRetryBody")}
            retryLabel={t("restaurant.error.mapRetry")}
            onRetry={retryMap}
          />
          <V2Divider tone="alternative" />
          {filterRow}
          {notice}
          <V2Divider tone="alternative" />
          <FlashList
            data={list.items}
            keyExtractor={(item) => String(item.restaurantId)}
            renderItem={({ item }) => (
              <RestaurantCard
                card={item}
                selected={item.restaurantId === selectedId}
                onPress={() => handlePressCard(item)}
              />
            )}
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={
              list.isLoading ? (
                <SkeletonList />
              ) : list.emptyReason ? (
                /* `onWidenMap` 을 넘기지 않는다 — 이 분기에는 지도가 없다.
                   넘기면 `NO_DATA_HERE` 에 `지도 넓혀서 다시 찾기` 가 서고, 눌러도
                   `mapRef.current` 가 null 이라 영원히 아무 일이 없다. */
                <MapEmptyState
                  reason={list.emptyReason}
                  onResetFilters={handleResetFilters}
                  onRetry={handleRetry}
                />
              ) : null
            }
            ListFooterComponent={utilityFooter}
            onEndReached={list.loadMore}
            onEndReachedThreshold={0.4}
            bounces={false}
            overScrollMode="never"
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing[16],
            }}
          />
        </View>
        {sheets}
      </View>
    )
  }

  return (
    <View
      onLayout={handleContainerLayout}
      style={[styles.root, { backgroundColor: colors.background.lower }]}
    >
      {/* 로딩 중에도 절대 언마운트하지 않는다(파일 상단 1번). */}
      <View style={StyleSheet.absoluteFill}>
        <RestaurantMapView
          /* `retryMap` 이 이 값을 올려 WebView 를 새로 마운트한다. HTML 은 마운트 시
             한 번만 만들어지므로 재시도 = 재마운트다. */
          key={mapMountKey}
          ref={mapRef}
          jsKey={process.env.EXPO_PUBLIC_KAKAO_JS_KEY}
          initialCenter={myLocation.coords ?? FALLBACK_CENTER}
          initialLevel={MAP_ZOOM.DEFAULT}
          strings={mapStrings}
          onReady={handleMapReady}
          onIdle={handleIdle}
          onMarkerPress={handleMarkerPress}
          onClusterPress={handleClusterPress}
          onMapPress={handleMapPress}
          onDragStart={handleDragStart}
          onMapError={handleMapError}
        />
      </View>

      {topOverlay}

      <Animated.View
        pointerEvents="box-none"
        style={[styles.floatingArea, floatingStyle]}
      >
        <MapFabStack
          bookmarkedOnly={filters.bookmarkedOnly}
          onToggleBookmarkedOnly={controls.toggleBookmarkedOnly}
          onPressMyLocation={handleMyLocation}
          locating={myLocation.isRequesting}
          style={styles.fabs}
        />
        <MapRefreshPill
          visible={mapSearch.isDirty}
          tooLarge={mapSearch.isViewportTooLarge}
          loading={mapSearch.isFetching}
          onPress={handleSearchThisArea}
        />
      </Animated.View>

      <RestaurantListSheet
        ref={sheetRef}
        items={sheetList.items}
        filterRow={filterRow}
        notice={notice}
        leadingSkeleton={sheetList.leadingSkeleton}
        selectedId={selectedId}
        // 아직 아무것도 묻지 않은 상태(`enabled: false`)에서 RQ v5 는 `isLoading` 을
        // false 로 준다. 그대로 쓰면 시트가 스켈레톤이 아니라 **백지**가 된다.
        // 지도가 죽었으면 bbox 를 영영 못 얻으므로 그 조건을 빼야 한다(영구 스켈레톤).
        loading={
          list.isLoading ||
          (mapError === null && mapSearch.committedBounds === null)
        }
        loadingMore={list.isFetchingNextPage}
        emptyReason={list.emptyReason}
        listFooter={utilityFooter}
        onPressCard={handlePressCard}
        onEndReached={list.loadMore}
        onSnapChange={handleSnapChange}
        onCollapsedHeightChange={handleCollapsedHeight}
        animatedPosition={sheetPosition}
        onWidenMap={handleWidenMap}
        onResetFilters={handleResetFilters}
        onRetry={handleRetry}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />

      {sheets}
    </View>
  )
}

/**
 * `MapMarkerDto` → 브릿지의 `MapMarker`. 카드용 필드는 지도에 싣지 않는다.
 *
 * `bookmarked`·`hasSafeMenu` 는 넘기지 않는다 — 지도가 쓰지 않는다. `저장한 곳만 보기` 는
 * 필터라서 켜면 화면의 마커 전부가 북마크이고, 안전 메뉴 유무를 그리는 마커 변형은 목업에
 * 없다. `safety` 는 접근성 라벨에만 쓰인다(`map/mapBridge.ts` 의 `MapMarker.safety`).
 */
function toMapMarker(dto: {
  restaurantId: number
  name: string
  lat: number
  lng: number
  avgSafety: MapMarker["safety"]
}): MapMarker {
  return {
    id: dto.restaurantId,
    name: dto.name,
    lat: dto.lat,
    lng: dto.lng,
    safety: dto.avgSafety,
  }
}

/**
 * `지도 넓혀서 다시 찾기` 의 다음 레벨. 더 넓힐 수 없으면 현재 레벨을 그대로 돌려준다.
 *
 * 카카오 `level` 은 클수록 멀다. 한 단계마다 화면에 담기는 폭이 대략 두 배이므로 bbox
 * 대각도 두 배로 커진다고 본다 — 서버의 상한(`MAX_BBOX_DIAGONAL_KM`)을 넘길 값을 애초에
 * 고르지 않기 위한 근사다. 정확한 값은 카카오가 계산해 `idle` 로 알려 주므로 여기서는
 * 넘칠 것이 확실한 선택만 걸러 낸다.
 */
/**
 * 지도 실패 문자열 → 분석 이벤트의 범주. 원인 문자열은 세 곳에서 온다 —
 * RestaurantMapView 의 설정 오류("… is not set"), mapHtml 의 SDK 실패
 * ("failed to load"·"namespace missing"·"timed out"), WebView 핸들러("webview …").
 * 자유 텍스트는 분석으로 못 보내므로(새니타이저·집계 불가) 여기서 접는다.
 */
function degradedReason(
  message: string,
): "config" | "sdk_load" | "sdk_timeout" | "webview_crash" | "other" {
  if (message.includes("is not set")) return "config"
  if (message.includes("timed out")) return "sdk_timeout"
  if (message.includes("failed to load")) return "sdk_load"
  if (message.includes("namespace missing")) return "sdk_load"
  if (message.includes("webview")) return "webview_crash"
  return "other"
}

function widenLevel(current: number, bounds: MapBounds | null): number {
  const diagonal = bounds ? bboxDiagonalKm(bounds) : 0
  // 두 단계가 목표(목업의 "넓혀서" 는 눈에 보이게 넓어져야 한다). 넘치면 한 단계.
  for (const step of [2, 1]) {
    const next = current + step
    if (next > MAP_ZOOM.MAX) continue
    if (diagonal > 0 && diagonal * 2 ** step > MAX_BBOX_DIAGONAL_KM) continue
    return next
  }
  return current
}

function Separator() {
  return <V2Divider tone="alternative" />
}

function SkeletonList() {
  return (
    <View>
      {Array.from({ length: RESTAURANT_SKELETON_COUNT }, (_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    gap: spacing[8],
  },
  /** 상태바 뒤에만 깔린다. 검색바보다 아래 층이라 먼저 그린다(형제 순서). */
  statusScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  searchBar: { marginHorizontal: SIDE },
  // 칩 레일은 자체 인셋을 갖는다(스크롤 끝까지 칩이 이어져야 한다).
  chipRail: { flexGrow: 0 },
  banner: { marginHorizontal: SIDE },
  floatingArea: {
    position: "absolute",
    left: SIDE,
    right: SIDE,
    gap: spacing[8],
  },
  fabs: { alignSelf: "flex-end" },
  degraded: { flex: 1 },
  degradedNotice: {
    paddingHorizontal: SIDE,
    paddingVertical: spacing[8],
  },
})
