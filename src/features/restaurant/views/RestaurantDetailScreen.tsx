/**
 * 식당 상세 (목업 -9 ~ -20). 5탭 한 화면.
 *
 * ```
 * ‹  (스크롤하면 상호명이 헤더에 등장)
 * ── 히어로 ─────────────────────────
 * 신신국밥
 * 한식 · ★ 4.0 · 리뷰 1,413 ›
 * 진하게 우려낸 국밥에 매콤한 다대기의 든든한 한 상
 * [✨ 진단하기] [☎ 전화] [↗ 공유] [🔖 저장]
 * [대표사진 가로 캐러셀]
 * ── sticky ────────────────────────
 * 홈 | 메뉴 | 사진 | 후기 | 정보
 * ── 탭 본문 ───────────────────────
 * [✨ 진단하기] [☎ 전화] [↗ 공유] [🔖 저장]   ← 액션 행을 지나친 뒤에만 하단 고정
 * ```
 *
 * ## 액션은 **한 벌**이다 (아이콘 바 + pill 행을 둘 다 두지 않는다)
 *
 * 예전에는 하단에 라벨 없는 아이콘 세 개(`🔖 ↗ 📞`)와 `진단하기` 버튼이 상주했다.
 * 위에 pill 행을 새로 두면서 그 바를 **없애고**, 같은 pill 행이 히어로를 지나가는
 * 순간 하단에 고정되게 했다. 같은 네 가지 일을 서로 다른 두 모양으로 동시에 그리면
 * 사용자는 둘이 다른 것이라고 읽는다 — 여기서 고른 것은 "하나를 두 자리에" 다.
 *
 * ## 이 화면이 옛 화면을 대체한다
 *
 * 이전 버전은 `PlaceRestaurant`(목 데이터) 하나를 prop 으로 받아 그렸고, 목록 카드가
 * 넘겨 주는 id 는 API 의 숫자 문자열(`"42"`)인데 목 데이터의 id 는 `"p1".."p6"` 이라
 * **카드를 누르면 항상 `식당 정보를 찾지 못했어요`** 가 떴다. 그래서 prop 을
 * `restaurantId` 로 바꿨다 — 카드 탭이 처음으로 동작하게 만드는 변경이다.
 * 색도 하드코딩(`#FFFFFF`/`#17191C`/`#64748B`)이라 다크모드에서 흰 카드가 남았다.
 *
 * ## 스크롤이 하나여야 탭이 sticky 로 붙는다
 *
 * 목업 -14 처럼 탭 바는 헤더 바로 아래에 **고정**된다. 그러려면 히어로와 탭 본문이
 * 같은 스크롤에 있어야 하므로 `ScrollView` + `stickyHeaderIndices` 를 쓴다.
 * 대가로 탭 본문 안에서 `FlatList` 를 못 쓴다(중첩 스크롤).
 *
 * **그래도 무한 스크롤은 된다.** 이 화면의 `onScroll` 이 바닥 근접을 재서 활성 탭에
 * 신호를 올린다(`utils/autoPaginate`). 검토한 대안과 기각 사유:
 *   - 바깥을 `FlatList`/`SectionList` 로 → 세로 스크롤러가 둘이 되어 탭 고정이 깨진다.
 *     (`SectionList` 는 안드로이드에서 sticky 기본값이 꺼져 있어 조용히 다르게 동작한다.)
 *   - collapsible 헤더 라이브러리 → `package.json` 에 없다. 자작하면 히어로 높이에
 *     기대는 세 측정값(탭 전환 목표 y, 하단바 pin, 본문 최소 높이)의 의미가 전부 바뀐다.
 *
 * 사진·후기는 페이지가
 * 늘어날 수 있으므로 무한 스크롤 대신 **명시적 더보기 버튼**으로 끊었다.
 *
 * ## 매직 넘버를 쓰지 않는다
 *
 * 프로토타입의 시트는 `bottom: 210` / `paddingTop: insets.top + 122` 같은 상수로
 * 조립돼 다른 화면 크기에서 깨졌다. 여기서는 히어로 높이와 하단 액션바 높이를
 * `onLayout` 으로 **재고**, 그 값으로 헤더 타이틀 임계값과 본문 하단 여백을 만든다.
 * 폰트 크기를 키운 사용자에게서도 어긋나지 않는다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import { Image } from "expo-image"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  barHeight,
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
  V2ErrorState,
  V2Icon,
  V2Tab,
} from "@/src/design-system-v2"
import {
  trackAnalyticsEvent,
  type AnalyticsRestaurantEntrySource,
} from "@/src/features/analytics"
import { restaurantDeepLink } from "@/src/shared/utils/deepLink"

import { GUTTER, RAIL_INSET, SECTION_GAP } from "../layout"
import { isNearBottom, loadMoreLead } from "../utils/autoPaginate"
import {
  DetailActionBar,
  DetailActionPills,
  type DetailAction,
} from "../components/detail/DetailActionPills"
import { DetailMetaLine } from "../components/detail/DetailMetaLine"
import { HomeTab } from "../components/detail/HomeTab"
import { InfoTab } from "../components/detail/InfoTab"
import { RestaurantDetailSkeleton } from "../components/detail/DetailSkeletons"
import { MenuTab } from "../components/detail/MenuTab"
import { PhotoTab } from "../components/detail/PhotoTab"
import { ReviewTab } from "../components/detail/ReviewTab"
import { ReviewReportSheet } from "../components/ReviewReportSheet"
import { RouteAppSheet } from "../components/RouteAppSheet"
import { canRouteTo } from "../utils/mapAppLinks"
import { restaurantDetailInstanceKey } from "../utils/detailInstanceKey"
import { useBookmark } from "../hooks/useBookmark"
import { useRestaurantDetail } from "../hooks/useRestaurantDetail"
import { useRestaurantMenus } from "../hooks/useRestaurantMenus"
import type { MenuItemDto, PhotoDto } from "../types"

/** 탭 값. i18n 키와 1:1 이라 라벨은 렌더 시점에 붙인다. */
const TABS = ["home", "menu", "photo", "review", "info"] as const
type DetailTab = (typeof TABS)[number]

const TAB_LABEL_KEY = {
  home: "restaurant.detail.tabHome",
  menu: "restaurant.detail.tabMenu",
  photo: "restaurant.detail.tabPhoto",
  review: "restaurant.detail.tabReview",
  info: "restaurant.detail.tabInfo",
} as const satisfies Record<DetailTab, string>

/** 캐러셀 좌측 인셋. 오른쪽은 다음 장이 살짝 보이도록 비운다. 화면 여백과 같은 선이다. */
const CAROUSEL_INSET = RAIL_INSET
/** 다음 장이 보이는 폭. 이만큼이 "옆으로 넘길 수 있다" 는 유일한 단서다. */
const CAROUSEL_PEEK = spacing[32]
/** 사진 사이 간격. 스냅 간격 계산에 들어가므로 스타일과 **같은 상수**를 써야 한다. */
const CAROUSEL_GAP = spacing[8]
/** 목업 사진의 가로:세로. 4:3 보다 약간 납작하다. */
const CAROUSEL_ASPECT = 1.26

/**
 * 히어로가 이만큼 남았을 때 헤더 타이틀을 켠다. 0 으로 두면 상호명이 화면에서
 * 완전히 사라진 뒤에야 헤더에 나타나 한 박자 비어 보인다.
 */
const TITLE_LEAD = 24

/**
 * 탭 바 위의 숨 쉴 틈.
 *
 * 없으면 탭 라벨이 히어로 사진의 아래 모서리에 **딱 붙어** 사진의 일부처럼 보인다
 * (사용자 지적, 스크린샷으로 확인). 여백을 히어로 쪽(`hero`/캐러셀 아래)에 주면
 * 스크롤해서 탭이 헤더에 붙는 순간 그 여백이 함께 위로 사라져 다시 붙어 버린다.
 * 그래서 **sticky 블록 안쪽**에 둔다 — 붙어 있을 때나 아닐 때나 같은 틈이 남는다.
 *
 * 값은 섹션 간격과 같은 `SECTION_GAP` 이다. 한때 12(`SECTION_TITLE_GAP`)였는데,
 * 그 정도로는 사진의 둥근 모서리와 탭 라벨의 윗선이 겹쳐 보여 "여전히 붙어 있다" 는
 * 지적이 유지됐다. 사진 ↔ 탭은 제목 ↔ 본문보다 더 큰 경계이므로 더 큰 값을 쓴다.
 *
 * 이 여백에는 배경색이 반드시 함께 간다. sticky 헤더 아래로 본문이 지나가므로
 * 투명하면 스크롤되는 글자가 탭 바 위 띠에 비친다.
 */
const TAB_BAR_LEAD = SECTION_GAP

/**
 * 셰브론 글리프가 자기 아이콘 상자 안에서 왼쪽에 비워 두는 폭.
 *
 * `icons/svg/icon-chevron-left.svg` 는 24 뷰박스에 `M14.5 6.5L9 12l5.5 5.5` 를 두께 2 ·
 * 둥근 끝으로 그린다 — 실제로 칠해지는 가장 왼쪽 픽셀은 `9 - 2/2 = 8` 이다.
 *
 * 그래서 아이콘 **상자**를 `GUTTER` 에 맞추면 눈에 보이는 획은 24 에서 시작해 상호명(16)
 * 보다 8 안쪽으로 들어간다. 사람은 상자가 아니라 획을 보므로, 상자를 이만큼 앞으로 당겨
 * **잉크가 `GUTTER` 에 오게** 한다. 목업 -9 를 재도 셰브론 획과 상호명 획이 같은 x 다.
 */
const CHEVRON_INK_INSET = spacing[8]

/**
 * `진단하기` 가 상담에 실어 보내는 메뉴 수 상한. `buildFoodConsultMessage` 가
 * 어차피 8개에서 자르므로 같은 수로 맞춘다 — 더 보내면 조용히 버려진다.
 */
const DIAGNOSE_MENU_LIMIT = 8

export interface RestaurantDetailScreenProps {
  /** 라우트 파라미터를 숫자로 옮긴 값. 파싱 실패면 `null` 을 넘겨 준다. */
  restaurantId: number | null
  /**
   * 어느 문으로 들어왔는가. 분석 전용이며 화면 모양에는 영향이 없다.
   *
   * 기본값이 `deep_link` 인 이유: 앱 안에서 밀어 넣는 모든 곳은 `from` 파라미터를 붙이므로,
   * 비어 있다는 것은 곧 URL 로 직접 들어왔다는 뜻이다. 기본을 `map` 으로 두면 딥링크
   * 유입이 전부 지도 실적으로 잡혀 어느 문을 다듬어야 할지 잘못 읽게 된다.
   */
  entrySource?: AnalyticsRestaurantEntrySource
  /**
   * 후기 작성 화면으로. **라우트가 아직 없으면 주지 않는다** — 그러면 작성 유도 카드가
   * 렌더되지 않는다. 누를 수 있어 보이는데 아무 일도 없는 버튼을 만들지 않기 위한 계약이다.
   */
  onWriteReview?: () => void
  /** 사진 뷰어(라이트박스)로. 배열과 시작 인덱스를 넘긴다. */
  onOpenPhotos?: (photos: PhotoDto[], index: number) => void
  /** 작성자 프로필 화면으로. */
  onPressReviewAuthor?: (reviewerId: number) => void
}

/**
 * 공개 진입점. **상태를 갖지 않는 껍데기**이고, 하는 일은 본체에 인스턴스 키를 주는 것뿐이다.
 *
 * expo-router 는 `/restaurant/24` 에서 `/restaurant/51` 로 갈 때 같은 route 의 파라미터만
 * 갈아 준다 — 새 화면을 쌓지 않으므로 본체 인스턴스가 살아남는다. 그러면 데이터만 51번으로
 * 바뀌고 `useState` 는 24번 것이 남아 **산원 반주헌이 장호덕손만두의 상태를 입고** 열렸다
 * (탭이 `후기` 에 머물고, `photoIndex`·`showTitle`·후기 필터가 전부 남았다).
 *
 * 상태를 하나씩 초기화하지 않는 이유는 `utils/detailInstanceKey.ts` 머리말에 적었다.
 * 여기에 `useState`/`useRef` 를 두면 그 상태가 다시 id 를 넘어 살아남으므로 두지 않는다.
 */
export function RestaurantDetailScreen(props: RestaurantDetailScreenProps) {
  return (
    <RestaurantDetailBody
      key={restaurantDetailInstanceKey(props.restaurantId)}
      {...props}
    />
  )
}

function RestaurantDetailBody({
  restaurantId,
  entrySource = "deep_link",
  onWriteReview,
  onOpenPhotos,
  onPressReviewAuthor,
}: RestaurantDetailScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { width } = useWindowDimensions()

  const scrollRef = useRef<ScrollView>(null)
  const [tab, setTab] = useState<DetailTab>("home")

  /*
    ── 자동 다음 쪽 ──────────────────────────────────────────────
    바닥에 닿을 때마다 1씩 오르는 신호. 활성 탭만 받아서 자기 `loadMore` 를 부른다.
    "무엇을 더 받는가" 는 탭이 안다(사진은 격자 측정 게이트, 후기는 필터 3종) —
    공용 리스트 추상화를 만들면 그 조건들이 갈 곳이 없어진다.
  */
  const [endTick, setEndTick] = useState(0)
  /** 진입 직후를 에지로 세지 않는다. 짧은 콘텐츠는 y=0 이 곧 바닥이다. */
  const wasNear = useRef(true)
  /** 탭별 마지막 스크롤 위치. 돌아왔을 때 읽던 자리로 되돌린다. */
  const offsets = useRef<Partial<Record<DetailTab, number>>>({})
  /** 복원 대기값. non-null 인 동안 `offsets` 를 쓰지 않는다(자기 자신을 덮는 순환 차단). */
  const pendingRestore = useRef<number | null>(null)
  /** 한 번이라도 연 탭. 언마운트하지 않으려고 기억한다. */
  const [visited, setVisited] = useState<DetailTab[]>(["home"])
  const [heroHeight, setHeroHeight] = useState(0)
  const [actionBarHeight, setActionBarHeight] = useState(0)
  const [showTitle, setShowTitle] = useState(false)
  /**
   * 히어로 안 액션 pill 행의 **아래 끝**(콘텐츠 좌표). 이 지점을 지나면 같은 행을
   * 하단에 고정한다 — 상수로 박지 않고 `onLayout` 으로 잰다(글꼴 크기를 키운
   * 사용자에게서도 어긋나지 않는다).
   */
  const [actionRowBottom, setActionRowBottom] = useState(0)
  const [actionsPinned, setActionsPinned] = useState(false)
  /** 히어로 캐러셀에서 지금 보이는 장. 페이지 표시(`2/5`)의 근거다. */
  const [photoIndex, setPhotoIndex] = useState(0)
  /**
   * 스크롤 뷰포트와 탭 바의 높이. 탭 본문의 **최소 높이**를 만드는 데 쓴다 — 아래
   * `bodyMinHeight` 주석 참고. 둘 다 `onLayout` 으로 재고 상수로 박지 않는다.
   */
  const [viewportHeight, setViewportHeight] = useState(0)
  const [tabBarHeight, setTabBarHeight] = useState(0)
  /**
   * 신고 시트를 띄운 후기.
   *
   * 신고는 **route 가 아니라 시트**다(목업에도 화면 전환이 없다). 그래서 라우트에
   * 콜백으로 올리지 않고 이 화면이 직접 갖는다 — `ReviewerProfileScreen` 이 이미 같은
   * 모양이고(자기 시트를 자기가 렌더한다), route 파일에 모달 흐름을 두지 말라는
   * 아키텍처 규칙과도 맞는다. `null` 이면 닫혀 있다.
   */
  const [reportReviewId, setReportReviewId] = useState<number | null>(null)
  const [routeSheetOpen, setRouteSheetOpen] = useState(false)

  const { detail, cardHint, isError, refetch } =
    useRestaurantDetail(restaurantId)
  const menus = useRestaurantMenus(restaurantId)
  const { toggleBookmark } = useBookmark()

  // 목록에서 들어왔으면 상호명·평점이 이미 캐시에 있다. 상세가 오기 전에도 헤더를 채운다.
  const name = detail?.name ?? cardHint?.name ?? ""
  const rating = detail?.rating ?? cardHint?.rating ?? null
  const reviewCount = detail?.reviewCount ?? cardHint?.reviewCount ?? null

  const carouselWidth = width - CAROUSEL_INSET - CAROUSEL_PEEK
  const carouselHeight = Math.round(carouselWidth / CAROUSEL_ASPECT)
  /** 한 장에서 다음 장까지의 거리. 스냅 간격이자 페이지 계산의 나눗수다. */
  const carouselStride = carouselWidth + CAROUSEL_GAP

  /**
   * 탭 본문의 최소 높이.
   *
   * 없으면 **짧은 탭에서 탭 바가 화면 중간으로 떨어진다**: 스크롤 가능 높이가 본문
   * 길이에 따라 달라지므로, 긴 탭(후기)에서 탭 바를 헤더에 붙여 둔 채 짧은 탭(정보)으로
   * 옮기면 스크롤이 되감기고 헤더의 상호명도 함께 사라진다. 본문이 최소한
   * "뷰포트 - 탭 바" 만큼 있으면 어느 탭에서도 탭 바를 맨 위로 올릴 수 있다.
   */
  const bodyMinHeight = Math.max(0, viewportHeight - tabBarHeight)

  const handleCarouselScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (carouselStride <= 0) return
      const next = Math.round(
        event.nativeEvent.contentOffset.x / carouselStride,
      )
      // 같은 장에서는 상태를 건드리지 않는다 — 매 프레임 setState 하면 상세 전체가 리렌더된다.
      setPhotoIndex((prev) => (prev === next ? prev : next))
    },
    [carouselStride],
  )

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent
      const y = contentOffset.y
      const next = heroHeight > 0 && y >= heroHeight - TITLE_LEAD
      // 임계값을 넘는 순간에만 상태를 뒤집는다. 매 프레임 setState 하면 화면 전체가 리렌더된다.
      setShowTitle((prev) => (prev === next ? prev : next))
      // 액션 행이 화면 위로 사라진 뒤에만 하단 고정을 켠다. 두 자리에 동시에 보이면
      // 같은 버튼이 두 개인 것처럼 읽힌다.
      const pinned = actionRowBottom > 0 && y >= actionRowBottom
      setActionsPinned((prev) => (prev === pinned ? prev : pinned))

      // 탭을 떠났다 돌아왔을 때 읽던 자리로 되돌리기 위해 기억한다. 복원 스크롤이
      // 스스로 발화시킨 이벤트로 저장값을 덮지 않게, 복원 대기 중에는 쓰지 않는다.
      if (pendingRestore.current === null) offsets.current[tab] = y

      /*
        바닥 근접 → 활성 탭에 신호. **레벨이 아니라 상승 에지**다.

        사진 격자는 새 쪽이 와도 타일 치수를 다 재기 전에는 높이가 자라지 않는다.
        레벨(불리언)로 내리면 그 창 동안 조건이 계속 참이라 남은 쪽을 전부 빨아들인다.
      */
      const near = isNearBottom(
        { y, viewport: layoutMeasurement.height, content: contentSize.height },
        loadMoreLead(layoutMeasurement.height),
      )
      if (near && !wasNear.current) setEndTick((n) => n + 1)
      wasNear.current = near
    },
    [actionRowBottom, heroHeight, tab],
  )

  const handleTabChange = useCallback(
    (value: string) => {
      const next = value as DetailTab
      setTab(next)
      setVisited((prev) => (prev.includes(next) ? prev : [...prev, next]))
      // 새 본문은 아직 재지 않았다. 에지 판정을 초기화하지 않으면 전환 직후 한 번이
      // 잘못 발화한다.
      wasNear.current = true
      /*
        여기서 `scrollTo` 를 부르지 않는다 — 방금 켠 탭은 아직 레이아웃 전이라 높이가
        0 이고, 그 상태의 `scrollTo` 는 클램프돼 엉뚱한 자리에 선다. 본문이 실제로
        측정된 뒤(`onLayout`) 복원한다.

        하한이 `heroHeight` 인 이유는 목업 -14 다 — 탭 바는 반드시 헤더에 붙은 상태로
        시작한다. 처음 여는 탭은 저장된 값이 없으므로 그 자리가 그대로 답이다.
      */
      pendingRestore.current = Math.max(
        heroHeight,
        offsets.current[next] ?? heroHeight,
      )
    },
    [heroHeight],
  )

  const handleShare = useCallback(() => {
    if (restaurantId === null) return
    void Share.share({
      message: `${t("restaurant.detail.shareMessage", { name })}\n${restaurantDeepLink(restaurantId)}`,
    })
  }, [name, restaurantId, t])

  const handleDiagnose = useCallback(() => {
    if (restaurantId === null) return
    // `menu_count` 를 함께 싣는 이유: 메뉴가 0건인 식당에서 진단을 누르면 상담에 빈
    // 컨텍스트가 간다. 그 비율을 모르면 "진단이 도움이 안 된다" 는 신호를 메뉴 데이터
    // 결손과 구분할 수 없다.
    trackAnalyticsEvent("restaurant_diagnose_tap", {
      restaurant_id: restaurantId,
      menu_count: menus.menus.length,
    })
    router.push({
      pathname: "/consult",
      params: buildDiagnoseParams(restaurantId, name, menus.menus),
    })
  }, [menus.menus, name, restaurantId, router])

  const handleToggleBookmark = useCallback(
    (bookmarked: boolean) => {
      if (restaurantId === null) return
      // `bookmarked` 는 **요청한 다음 상태**가 아니라 지금 상태다 — 저장 해제도 같은
      // 이벤트로 세고, 순저장수를 나중에 뺄셈으로 구할 수 있게 한다.
      trackAnalyticsEvent("restaurant_bookmark_toggle", {
        restaurant_id: restaurantId,
        bookmarked: !bookmarked,
        source: entrySource,
      })
      toggleBookmark({ restaurantId, bookmarked })
    },
    [entrySource, restaurantId, toggleBookmark],
  )

  /**
   * 상세 진입. `restaurantId` 가 바뀔 때만 다시 쏜다 — 탭을 옮기거나 상세가 늦게
   * 도착해서 리렌더되는 것은 새 진입이 아니다. id 가 `null`(파싱 실패)이면 화면이
   * `식당 정보를 찾지 못했어요` 이므로 진입으로 세지 않는다.
   */
  useEffect(() => {
    if (restaurantId === null) return
    trackAnalyticsEvent("restaurant_detail_open", {
      restaurant_id: restaurantId,
      source: entrySource,
    })
    // entrySource 는 한 화면에서 바뀌지 않는다. 의존성에 넣으면 의미 없는 재발화 통로만 생긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  const header = (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        accessibilityLabel={t("restaurant.backAccessibility")}
        hitSlop={(touchTarget.min - iconSize.md) / 2}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.pressed,
        ]}
      >
        <V2Icon
          name="chevronLeft"
          size={iconSize.md}
          color={colors.label.normal}
        />
      </Pressable>
      {showTitle && name.length > 0 && (
        <Text
          style={[
            typography.label.medium,
            styles.headerTitle,
            { color: colors.label.normal },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  )

  if (restaurantId === null) {
    return (
      <View
        style={[styles.screen, { backgroundColor: colors.background.default }]}
      >
        {header}
        <V2ErrorState title={t("restaurant.notFound")} />
      </View>
    )
  }

  if (isError && !detail) {
    return (
      <View
        style={[styles.screen, { backgroundColor: colors.background.default }]}
      >
        {header}
        <V2ErrorState
          title={t("restaurant.error.detailTitle")}
          description={t("restaurant.error.detailBody")}
          onRetry={refetch}
          retryLabel={t("restaurant.error.detailRetry")}
        />
      </View>
    )
  }

  if (!detail) {
    return (
      <View
        style={[styles.screen, { backgroundColor: colors.background.default }]}
      >
        {header}
        <RestaurantDetailSkeleton />
      </View>
    )
  }

  /*
    액션 한 벌. 히어로 안과 하단 고정 바가 **같은 배열**을 받는다 — 두 곳에서 각자
    조립하면 한쪽에만 전화 pill 이 빠지는 식으로 갈라진다.

    전화번호가 없으면 `전화` pill 자체를 만들지 않는다. 눌러도 아무 일 없는 버튼을
    남기지 않는 것이 이 기능 전체의 규칙이다(프로토타입의 죽은 버튼 12개).
  */
  const actions: DetailAction[] = [
    {
      key: "diagnose",
      label: t("restaurant.detail.actionDiagnose"),
      icon: "sparkle",
      emphasis: "primary",
      onPress: handleDiagnose,
    },
    /*
      길찾기. **좌표가 있을 때만** 만든다 — 이름만으로 지도 앱을 열면 동명 가게로
      안내하게 되고, 그건 없는 것보다 나쁘다(`utils/mapAppLinks` 머리말).

      전화보다 앞에 두는 이유: 이 화면에서 판단이 끝난 사용자의 다음 행동은 "간다" 다.
      국내 지도·맛집 서비스가 예외 없이 길찾기를 첫 보조 액션으로 두는 순서를 따른다.
    */
    ...(canRouteTo({ lat: detail.lat, lng: detail.lng, name: detail.name })
      ? [
          {
            key: "route",
            label: t("restaurant.detail.actionRoute"),
            icon: "mapPin" as const,
            emphasis: "secondary" as const,
            onPress: () => setRouteSheetOpen(true),
          },
        ]
      : []),
    ...(detail.phone
      ? [
          {
            key: "call",
            label: t("restaurant.detail.actionCall"),
            icon: "phone" as const,
            emphasis: "secondary" as const,
            onPress: () => {
              void Linking.openURL(`tel:${detail.phone}`)
            },
          },
        ]
      : []),
    {
      key: "share",
      label: t("restaurant.detail.actionShare"),
      icon: "share",
      emphasis: "secondary",
      onPress: handleShare,
    },
    {
      key: "bookmark",
      label: detail.bookmarked
        ? t("restaurant.detail.actionSaved")
        : t("restaurant.detail.actionSave"),
      icon: detail.bookmarked ? "bookmarkFilled" : "bookmark",
      emphasis: "secondary",
      selected: detail.bookmarked,
      onPress: () => handleToggleBookmark(detail.bookmarked),
    },
  ]

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background.default }]}
    >
      {header}

      <ScrollView
        ref={scrollRef}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
        onLayout={(event: LayoutChangeEvent) =>
          setViewportHeight(event.nativeEvent.layout.height)
        }
        contentContainerStyle={{ paddingBottom: actionBarHeight }}
      >
        {/* index 0 — 히어로. 높이를 재서 탭 전환·타이틀 임계값에 쓴다. */}
        <View
          onLayout={(event: LayoutChangeEvent) =>
            setHeroHeight(event.nativeEvent.layout.height)
          }
        >
          <View style={styles.hero}>
            <Text
              style={[typography.title.small, { color: colors.label.normal }]}
              numberOfLines={2}
            >
              {name}
            </Text>

            {/*
              음식 종류·평점·리뷰 수를 **한 줄**로 잇는다(`DetailMetaLine`).

              여기에는 `detail.nutritionBadges` 를 펼치는 줄이 하나 더 있었고, 그 필드가
              **응답에 없어서** `Cannot read property 'map' of undefined` 로 상세 화면이
              통째로 죽었다. 되살리지 말 것 — 계약 §2.4 에 그 필드가 없고, 서버는 원본
              태그를 `legacyNutritionTags` 로만 내린다(미검수 임상 주장, §-1.1).
              개인화 등급(`avgSafety`)을 대신 넣는 것도 아니다: 한 식당에 제한 메뉴와
              안전 메뉴가 함께 있어서 식당 단위 등급을 배지로 단언하면 사용자가
              "이 집은 가도 되는 곳" 을 색 하나로 판단하게 된다. 등급은 메뉴 탭이 말한다.
            */}
            <DetailMetaLine
              cuisineLabel={t(`restaurant.cuisine.${detail.cuisineType}`)}
              rating={rating}
              reviewCount={reviewCount}
              onPressRating={() => handleTabChange("review")}
            />

            {/* 한 줄 소개. `tagline` 이라는 필드는 서버에 없다 — `description` 이 정본이다. */}
            {detail.description && (
              <Text
                style={[
                  typography.subtext.large,
                  { color: colors.label.neutral },
                ]}
              >
                {detail.description}
              </Text>
            )}
          </View>

          {/*
            액션 pill 행. `styles.hero` **밖**에 두는 것이 중요하다 — 안에 두면 히어로의
            좌우 여백이 가로 스크롤의 컨테이너 폭을 줄여 마지막 pill 이 오른쪽에서
            잘린다. 좌우 인셋은 스크롤 안쪽(`RAIL_INSET`)이 만든다.
          */}
          <View
            onLayout={(event: LayoutChangeEvent) => {
              const { y, height } = event.nativeEvent.layout
              setActionRowBottom(y + height)
            }}
            style={styles.heroActions}
          >
            <DetailActionPills actions={actions} />
          </View>

          {detail.imageUrls.length > 0 && (
            <View>
              <ScrollView
                bounces={false}
                overScrollMode="never"
                horizontal
                showsHorizontalScrollIndicator={false}
                // 한 장씩 멈춘다. 자유 스크롤이면 "지금 몇 번째" 가 정수로 정해지지 않아
                // 페이지 표시가 두 장 사이에서 깜빡인다. 멈춤 간격 = 사진 폭 + 사이 간격.
                snapToInterval={carouselStride}
                snapToAlignment="start"
                decelerationRate="fast"
                onScroll={handleCarouselScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.carousel}
              >
                {detail.imageUrls.map((url, index) => (
                  <Pressable
                    key={`${url}-${index}`}
                    disabled={!onOpenPhotos}
                    onPress={() =>
                      onOpenPhotos?.(heroPhotos(detail.imageUrls), index)
                    }
                    accessibilityRole="imagebutton"
                    accessibilityState={{ disabled: !onOpenPhotos }}
                    accessibilityLabel={t("restaurant.photoAccessibility", {
                      name,
                      number: index + 1,
                    })}
                    style={({ pressed }) => [pressed && styles.pressedCard]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={[
                        styles.carouselImage,
                        { width: carouselWidth, height: carouselHeight },
                      ]}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>

              {/*
                페이지 표시. 한 장뿐이면 그리지 않는다 — `1/1` 은 아무 것도 알려 주지
                않으면서 사진 위에 상자만 하나 얹는다. 위치는 **지금 보이는 장**의
                오른쪽 아래다(다음 장이 엿보이는 폭 `CAROUSEL_PEEK` 만큼 안쪽).
              */}
              {detail.imageUrls.length > 1 && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.photoIndex,
                    { backgroundColor: colors.background.dim },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption.small,
                      { color: colors.static.white },
                    ]}
                  >
                    {t("restaurant.detail.photoIndex", {
                      index: photoIndex + 1,
                      total: detail.imageUrls.length,
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* index 1 — sticky 탭 바. 높이를 재서 탭 본문의 최소 높이를 만든다. */}
        <View
          onLayout={(event: LayoutChangeEvent) =>
            setTabBarHeight(event.nativeEvent.layout.height)
          }
          style={[
            styles.tabBarBlock,
            { backgroundColor: colors.background.default },
          ]}
        >
          <V2Tab
            items={TABS.map((value) => ({
              value,
              label: t(TAB_LABEL_KEY[value]),
            }))}
            value={tab}
            onChange={handleTabChange}
            alignment="fixed"
            size="s"
          />
        </View>

        {/*
          index 2 — 탭 본문.

          **한 번 연 탭은 언마운트하지 않는다.** 예전에는 `{tab === "photo" && …}` 라
          탭을 떠나면 사라졌는데, 그러면 사진 탭이 재던 타일 치수가 초기화된다. 서빙되는
          사진은 `width`/`height` 가 전부 null 이라(원본 표에는 34%가 있지만 서빙 술어를
          지나면 0%다) 돌아왔을 때 격자가 결정적으로 빈 상태에서 다시 시작하고, 이미 받아
          둔 사진 위에 스켈레톤이 도로 깔린다. 무한 스크롤로 여러 쪽을 쌓은 뒤에는
          "쌓아 둔 것이 사라졌다" 로 읽힌다.

          `display:"none"` 은 Yoga 에서 높이 0 이라 `minHeight`·`stickyHeaderIndices` 가
          그대로다. **안 본 탭은 여전히 마운트하지 않는다** — 그 탭의 조회가 미리 나가지
          않는다는 기존 계약은 `visited` 가 지킨다.
        */}
        <View style={{ minHeight: bodyMinHeight }}>
          {visited.map((value) => (
            <View
              key={value}
              style={{ display: tab === value ? "flex" : "none" }}
              onLayout={(event: LayoutChangeEvent) => {
                // 실제로 측정된 뒤에만 복원한다. 높이 0 일 때 부르면 클램프된다.
                if (value !== tab || pendingRestore.current === null) return
                if (event.nativeEvent.layout.height <= 0) return
                scrollRef.current?.scrollTo({
                  y: pendingRestore.current,
                  animated: false,
                })
                pendingRestore.current = null
              }}
            >
              {value === "home" && (
                <HomeTab
                  restaurantId={restaurantId}
                  detail={detail}
                  menus={menus.menus}
                  menusProfileMissing={menus.profileMissing}
                  onSeeAllMenus={() => handleTabChange("menu")}
                  onSeeAllPhotos={() => handleTabChange("photo")}
                  onSeeAllReviews={() => handleTabChange("review")}
                  onWriteReview={onWriteReview}
                  onOpenPhotos={onOpenPhotos}
                  onPressReviewAuthor={onPressReviewAuthor}
                />
              )}
              {value === "menu" && (
                <MenuTab
                  menus={menus.menus}
                  profileMissing={menus.profileMissing}
                  truncated={menus.truncated}
                  isLoading={menus.isLoading}
                  isError={menus.isError}
                  onRetry={menus.refetch}
                />
              )}
              {value === "photo" && (
                <PhotoTab
                  restaurantId={restaurantId}
                  restaurantName={name}
                  categoryCounts={detail.photoCategoryCounts}
                  // `전체` 칩의 개수. `photoCategoryCounts` 에는 `all` 키가 없다.
                  totalCount={detail.photoCount}
                  onOpenPhotos={onOpenPhotos}
                  /* 활성 탭에만 준다. 홈 탭은 사진 탭과 **같은 질의 키**를 쓰므로
                     신호를 주면 6칸만 그리면서 캐시에 수십 장을 쌓는다. */
                  endReachedTick={tab === "photo" ? endTick : 0}
                />
              )}
              {value === "review" && (
                <ReviewTab
                  restaurantId={restaurantId}
                  restaurantName={name}
                  onWriteReview={onWriteReview}
                  onPressAuthor={onPressReviewAuthor}
                  onOpenPhotos={onOpenPhotos}
                  onReportReview={setReportReviewId}
                  endReachedTick={tab === "review" ? endTick : 0}
                />
              )}
              {value === "info" && <InfoTab detail={detail} />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/*
        하단 고정 액션. **항상 마운트해 두고 보이기만 켠다.**

        스크롤 위치에 따라 마운트/언마운트하면 (a) 높이를 그때그때 재게 되어 본문 하단
        여백이 스크롤 도중에 바뀌고 내용이 튀며, (b) 고정이 켜지는 첫 프레임에 바가
        아래에서 튀어 올라온다. 자리는 늘 잡아 두고 `opacity` 로만 나타낸다.

        안 보일 때 `pointerEvents="none"` 이 반드시 함께 가야 한다 — 투명한 바가
        화면 아래를 덮은 채 남으면 본문의 마지막 줄을 누를 수 없다.
      */}
      <DetailActionBar
        actions={actions}
        paddingBottom={Math.max(insets.bottom, spacing[12])}
        onLayout={(event: LayoutChangeEvent) =>
          setActionBarHeight(event.nativeEvent.layout.height)
        }
        pointerEvents={actionsPinned ? "auto" : "none"}
        style={!actionsPinned && styles.actionBarHidden}
      />

      {/* 신고 시트는 스크롤 밖 형제로 둔다 — 후기 탭 안에 두면 탭을 옮기는 순간
          언마운트되어 열려 있던 시트가 사라진다. */}
      <ReviewReportSheet
        visible={reportReviewId !== null}
        reviewId={reportReviewId}
        onClose={() => setReportReviewId(null)}
      />

      {/* 길찾기 앱 선택. 같은 이유로 스크롤 밖 형제다. */}
      <RouteAppSheet
        visible={routeSheetOpen}
        onClose={() => setRouteSheetOpen(false)}
        target={{ lat: detail.lat, lng: detail.lng, name: detail.name }}
      />
    </View>
  )
}

/**
 * 대표사진 URL → 뷰어가 읽는 `PhotoDto`. 대표사진은 `restaurant.image_urls`(문자열 배열)
 * 에서 오고 `restaurant_photo` 행이 없어 id 가 없다. 뷰어에서 key 로만 쓰이므로
 * 음수 순번으로 만들어 후기·메뉴 사진의 id 와 절대 겹치지 않게 한다.
 */
function heroPhotos(urls: string[]): PhotoDto[] {
  return urls.map((url, index) => ({
    photoId: -(index + 1),
    url,
    category: "OWNER",
    isVideo: false,
    sortOrder: index,
    sourceReviewId: null,
    sourceMenuId: null,
    // `restaurant.image_urls` 는 URL 문자열 배열이라 치수가 없다. 1:1 로 가정하지 않는다.
    width: null,
    height: null,
  }))
}

/**
 * `진단하기` → `/consult` 파라미터.
 *
 * 전용 "식당 진단" 화면은 없다. 앱에서 실제로 존재하는 개인 기준 대조 흐름은
 * 상담 화면의 식이 컨텍스트(`foodConsultContext`)뿐이고, 그것이 사용자의
 * `effectiveLimits` 와 메뉴 영양소를 함께 놓고 답하는 유일한 경로다.
 *
 * `total` 을 **일부러 비운다** — 채우면 빌더가 "이 식사의 총 영양소" 줄을 만들어
 * 사용자가 메뉴 전부를 먹는다고 주장하게 된다. 우리가 아는 것은 메뉴별 값뿐이다.
 */
function buildDiagnoseParams(
  restaurantId: number,
  name: string,
  menus: MenuItemDto[],
): { foodConsultContext: string; foodConsultRequestId: string } {
  return {
    foodConsultContext: JSON.stringify({
      title: name,
      // 서버 키에는 단위 접미사가 없다(`protein`/`sodium`/…). 예전에는 `proteinG`·`sodiumMg`
      // 처럼 계약서 이름으로 읽어서 **영양소 네 개가 전부 `undefined`** 로 상담에 갔다 —
      // 상담이 "영양 정보가 없는 식사" 로 답하던 이유가 이 여섯 줄이다.
      foods: menus.slice(0, DIAGNOSE_MENU_LIMIT).map((menu) => ({
        name: menu.name,
        calories: menu.calories,
        protein: menu.protein,
        sodium: menu.sodium,
        potassium: menu.potassium,
        phosphorus: menu.phosphorus,
      })),
    }),
    // 같은 화면에서 두 번 눌러도 새 요청으로 인식되게 시각을 섞는다.
    foodConsultRequestId: `restaurant-${restaurantId}-${Date.now()}`,
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: barHeight.appBarIOS,
    flexDirection: "row",
    alignItems: "center",
    /*
      셰브론의 **획**이 화면 왼쪽 선에 오게 하는 값이다.

      예전에는 여백이 `8` 이고 이 상자가 44 폭이라, 24 짜리 아이콘이 상자 안에서 가운데로
      놓이면서 획이 x=26 에서 시작했다 — 상호명·소개·섹션 제목이 전부 16 인데 헤더의
      셰브론만 10 안쪽이라 맨 윗줄이 따로 놀았다. 상자를 16 에 맞추는 것으로는 부족하다
      (그러면 획이 24). `CHEVRON_INK_INSET` 만큼 당겨야 획이 16 에 온다.
    */
    paddingHorizontal: GUTTER - CHEVRON_INK_INSET,
  },
  /*
    아이콘 폭 그대로의 상자. 44 짜리 상자를 쓰면 아이콘이 그 안에서 가운데로 밀려
    위 계산이 무너진다. 눌리는 넓이 44×44 는 상자가 아니라 호출부의
    `hitSlop={(touchTarget.min - iconSize.md) / 2}` 가 만든다 — 보이는 선과 만지는
    넓이를 분리해야 둘 다 지킬 수 있다.
  */
  headerButton: {
    width: iconSize.md,
    height: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  // 타이틀은 뒤로가기 아이콘 폭만큼 오른쪽에도 여백을 둬야 진짜 가운데에 온다.
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginRight: iconSize.md,
  },
  // 탭 바가 히어로에 붙지 않게 하는 띠. 위 `TAB_BAR_LEAD` 주석 참고.
  tabBarBlock: { paddingTop: TAB_BAR_LEAD },
  hero: {
    gap: spacing[6],
    paddingHorizontal: GUTTER,
    paddingTop: spacing[12],
    // 액션 pill 행이 바로 아래에 오므로 히어로 자체의 아래 여백은 줄인다.
    paddingBottom: spacing[12],
  },
  // 가로 스크롤이라 좌우 여백을 갖지 않는다(스크롤 안쪽 `RAIL_INSET` 이 맡는다).
  heroActions: { paddingBottom: spacing[16] },
  carousel: { gap: CAROUSEL_GAP, paddingHorizontal: CAROUSEL_INSET },
  carouselImage: { borderRadius: radius.lg },
  // 지금 보이는 장의 오른쪽 아래. `CAROUSEL_PEEK` 만큼 안쪽이라 다음 장 위로 넘어가지 않는다.
  photoIndex: {
    position: "absolute",
    bottom: spacing[12],
    right: CAROUSEL_PEEK + spacing[12],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  /*
    숨김은 `display: "none"` 이 아니라 투명이다. `display` 를 끄면 높이가 0이 되어
    본문 하단 여백(`actionBarHeight`)이 함께 무너지고, 다시 켜질 때 내용이 튄다.
  */
  actionBarHidden: { opacity: 0 },
  pressed: { opacity: 0.85 },
  pressedCard: { opacity: 0.9 },
})
