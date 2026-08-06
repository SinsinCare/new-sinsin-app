/**
 * 지도 하단 식당 목록 시트. 3-스냅 + sticky 필터칩 행 + 가상화 리스트.
 *
 * ## 왜 `V2BottomSheet` 가 아닌가 (INTEGRATION_BRIEF §F.10)
 *
 * `V2BottomSheet` 는 RN `Modal` 기반이고 **스냅 포인트도, 팬 제스처도, 프로그램 스냅도
 * 없다** — 콘텐츠 높이 하나뿐이다. 지도 시트는 collapsed/mid/expanded 를 손가락과 코드
 * 양쪽에서 오갈 수 있어야 하므로 `@gorhom/bottom-sheet`(이미 의존성이고 `PlaceSheet` 에서
 * 검증됨)를 쓰고 v2 토큰으로 다시 칠했다. 필터·정렬 시트는 그럴 필요가 없어 `V2BottomSheet`
 * 를 쓴다 — 두 시트가 다른 구현인 것은 실수가 아니다.
 *
 * ## 스냅 값을 매직 넘버로 두지 않는다 (§F.11)
 *
 * 기존 화면은 `bottom: 210 → 470`, `maxHeight: 330`, `paddingTop: insets.top + 122` 같은
 * 상수로 되어 있었고 다른 화면 크기에서 전부 깨진다. 여기서는 collapsed 스냅을
 * **측정값에서 유도**한다: 핸들 블록 높이(우리가 정한 값) + 필터칩 행의 `onLayout` 실측 높이.
 * 필터칩 행이 두 줄로 감기거나 Dynamic Type 으로 커져도 collapsed 가 그만큼 자란다.
 *
 * ## `.map()` 대신 `BottomSheetFlatList` (§F.11)
 *
 * 기존 `PlaceSheet` 는 모든 식당을 `.map()` 으로 `ScrollView` 에 쏟아붓고, 각 행이 사진 5장을
 * 가로 `ScrollView` 로 물고 있었다. 100곳이면 이미지 500장이 한 번에 마운트된다.
 *
 * ## `enableContentPanningGesture={false}` — 핸들만 끈다
 *
 * 카드마다 가로 사진 스트립이 있다. 콘텐츠 팬을 켜면 가로 스와이프와 세로 팬이 같은
 * 제스처 영역에서 다투고, 안드로이드에서 사진을 옆으로 넘기려다 시트가 접힌다.
 * `PlaceSheet` 가 같은 이유로 이미 이 설정이었다 — 저장소의 실측 결론을 유지한다.
 *
 * ## `enableDynamicSizing={false}` 는 필수다
 *
 * v5 는 이 값이 기본 `true` 라서, 명시한 스냅 포인트 **위에** 콘텐츠 높이 스냅을 하나 더
 * 끼워 넣는다. 그러면 `snapToIndex(2)` 가 expanded 가 아닌 곳으로 간다.
 *
 * ## 스크롤 중에는 카드 press 를 내보내지 않는다
 *
 * `BottomSheetFlatList` 는 react-native-gesture-handler 의 `Gesture.Native()` 로 감싸인
 * 스크롤뷰다. 그 네이티브 제스처가 터치를 가져가도 **RN 의 JS 리스폰더는 취소를 받지
 * 못하고**, 손을 떼는 순간 그 touchend 가 카드의 `onPress` 가 된다 — 세로로 훑기만 했는데
 * 상세가 열렸다(실측 2026-07-31, `utils/pressIntent` 헤더에 전말이 있다).
 *
 * 카드 쪽에도 이동 거리 판정이 있지만(8px), 그것은 **좌표를 볼 수 있을 때**의 방어다.
 * 여기서는 시트가 스스로 아는 사실 — "지금 손가락이 목록을 끌고 있다" — 로 한 번 더
 * 막는다. 두 규칙 다 `utils/pressIntent` 의 순수 함수이고 기기 없이 테스트된다.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native"
import type { ReactNode } from "react"

import { SHEET_MID_RATIO, SHEET_SNAP } from "../sheetSnap"
import BottomSheet, {
  BottomSheetFlatList,
  type BottomSheetFlatListMethods,
} from "@gorhom/bottom-sheet"
import type { SharedValue } from "react-native-reanimated"
import { useTranslation } from "react-i18next"

import {
  V2Divider,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import type { EmptyReason, RestaurantCardDto } from "../types"
import { isScrollEcho } from "../utils/pressIntent"
import { MapEmptyState } from "./MapEmptyState"
import { RestaurantCard } from "./RestaurantCard"
import {
  RESTAURANT_SKELETON_COUNT,
  RestaurantCardSkeleton,
} from "./RestaurantCardSkeleton"

import { GUTTER } from "../layout"

/** 핸들 블록: 위 여백 + 바 + 아래 여백. collapsed 스냅 계산의 상수 항이다. */
const HANDLE_BAR_HEIGHT = 4
const HANDLE_PADDING_TOP = spacing[10]
const HANDLE_PADDING_BOTTOM = spacing[8]
const HANDLE_BLOCK_HEIGHT =
  HANDLE_PADDING_TOP + HANDLE_BAR_HEIGHT + HANDLE_PADDING_BOTTOM

/** sticky 블록을 아직 못 재기 전의 임시값. 첫 프레임에만 쓰이고 곧 실측으로 대체된다. */
const STICKY_HEADER_FALLBACK_HEIGHT = 62

/** 스냅 인덱스에 이름을 붙인다 — 숫자 0/1/2 가 코드에 흩어지면 뜻을 잃는다. */
/**
 * 스냅 값·산수의 정본은 `../sheetSnap` 이다(순수 모듈이라 node jest 가 검증한다).
 * 기존 import 경로를 지키기 위해 여기서 그대로 다시 내보낸다 — 값을 두 곳에 적지 않는다.
 */
export {
  REFOCUS_TOLERANCE_PT,
  SHEET_MID_RATIO,
  SHEET_SNAP,
  deriveSheetContainerHeight,
  predictSheetTop,
  shouldRefocusAfterSnap,
} from "../sheetSnap"

export interface RestaurantListSheetHandle {
  snapToIndex: (index: number) => void
  collapse: () => void
  /**
   * 목록을 맨 위로 되감는다. 마커 탭이 부른다.
   *
   * 예전에는 `scrollToRestaurant(id)` 였고 `findIndex` 가 -1 이면 **조용히 반환**했다.
   * 지도 마커(최대 200개)는 대개 로드된 목록 한 쪽(20건) 안에 없으므로 그 조용한 반환이
   * 곧 "마커를 눌러도 하단이 안 바뀐다" 였다. 이제 고른 곳은 화면이 **0번으로 올려 주고**
   * (`useSelectedFirstList`), 시트가 할 일은 맨 위로 되감는 것 하나다 — 실패할 수 있는
   * 탐색이 사라졌다.
   */
  scrollToTop: () => void
}

export interface RestaurantListSheetProps {
  items: RestaurantCardDto[]
  /**
   * sticky 필터칩 행. `FilterChipRow` 는 filters 배치가 소유하므로 시트가 직접 만들지 않고
   * 주입받는다 — 시트가 남의 컴포넌트 계약에 묶이지 않게.
   */
  filterRow?: ReactNode
  /** 필터칩 행 아래에 붙는 안내(절단·제외·프로필 없음). 없으면 줄이 생기지 않는다. */
  notice?: ReactNode
  /**
   * 첫 줄에 카드 스켈레톤을 하나 세운다. 고른 마커의 카드를 아직 받는 중일 때다.
   *
   * 헤더에 별도의 미리보기 카드를 고정하지 않는다 — 그러면 "첫 번째로 보이는 것" 이
   * 두 개가 된다(`utils/selectedFirstCard` 헤더). 이 스켈레톤은 **그 자리에 들어올
   * 첫 카드의 자리표시자**이고, 도착하면 같은 자리에서 카드로 바뀐다.
   */
  leadingSkeleton?: boolean
  /**
   * 목록 **끝**에 붙는 블록(보조 진입점 등). 0건일 때도 그려진다 —
   * `FlatList` 는 `ListEmptyComponent` 와 `ListFooterComponent` 를 함께 렌더하고,
   * 아무것도 못 찾은 순간이 `식당 알려주기` 가 가장 필요한 순간이다.
   */
  listFooter?: ReactNode
  /** 지도 마커 선택과 연동. 해당 카드를 하이라이트한다. */
  selectedId?: number | null
  loading?: boolean
  loadingMore?: boolean
  /** 0건의 이유. `null` 이면 빈 상태를 그리지 않는다. */
  emptyReason?: EmptyReason | null
  onPressCard?: (card: RestaurantCardDto, index: number) => void
  onEndReached?: () => void
  /**
   * 스냅이 바뀌었다. 화면은 이 신호로 카카오에 `relayout()` 을 알린다.
   * `position` 은 시트 상단의 컨테이너 기준 Y(px)다 — 선택 마커를 시트 위로 밀어 올리는
   * `panBy` 거리를 여기서 얻는다.
   */
  onSnapChange?: (index: number, position: number) => void
  /**
   * 접힘 스냅의 **픽셀 높이**(핸들 블록 + sticky 헤더). 값이 바뀔 때마다 부른다.
   *
   * 화면이 이걸 아는 이유: 접힘에서 보고된 위치와 더하면 **시트가 쓰는 컨테이너 높이**가
   * 역산된다(`deriveSheetContainerHeight`). 그 기준이 있어야 `mid` 위치를 정확히 예측해
   * 마커 탭 때 카메라가 한 번에 최종 위치로 간다.
   */
  onCollapsedHeightChange?: (height: number) => void
  /**
   * 시트 상단 Y 를 실시간으로 흘려보낼 shared value. 지도 위 FAB·pill 이 시트를 따라
   * 부드럽게 올라가는 데 쓴다. `onSnapChange` 는 스냅이 끝난 뒤에만 오므로 그것만으로는
   * 드래그 중에 컨트롤이 시트에 덮인다.
   */
  animatedPosition?: SharedValue<number>
  onWidenMap?: () => void
  onResetFilters?: () => void
  onRetry?: () => void
  /** 상태바 높이. expanded 에서 시트가 노치를 덮지 않게 한다. */
  topInset?: number
  /** 홈 인디케이터 높이. 리스트 마지막 카드가 가리지 않게 한다. */
  bottomInset?: number
  style?: ViewStyle
}

export const RestaurantListSheet = forwardRef<
  RestaurantListSheetHandle,
  RestaurantListSheetProps
>(function RestaurantListSheet(
  {
    items,
    filterRow,
    notice,
    leadingSkeleton = false,
    listFooter,
    selectedId = null,
    loading = false,
    loadingMore = false,
    emptyReason = null,
    onPressCard,
    onEndReached,
    onSnapChange,
    onCollapsedHeightChange,
    animatedPosition,
    onWidenMap,
    onResetFilters,
    onRetry,
    topInset = 0,
    bottomInset = 0,
    style,
  },
  ref,
) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const sheetRef = useRef<BottomSheet>(null)
  const listRef = useRef<BottomSheetFlatListMethods>(null)
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(
    STICKY_HEADER_FALLBACK_HEIGHT,
  )

  const handleStickyHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height)
    // 0 은 아직 레이아웃되지 않았다는 뜻이다. 그 값을 스냅으로 쓰면 시트가 사라진다.
    if (next > 0) setStickyHeaderHeight(next)
  }, [])

  /**
   * sticky 블록(필터칩 행 + 안내)을 그리는가. 안내만 있을 때도 그려야 한다 —
   * `truncated`("지도를 확대해 보세요")는 시트가 접혀 있을 때 가장 필요한 문구다.
   */
  const hasStickyHeader = filterRow !== undefined || notice !== undefined

  /**
   * collapsed 는 "핸들 + sticky 블록" 만 보이는 높이다. 목업 §2.7 그대로.
   * mid 55% / expanded 100% 는 목업의 비율이고, 100% 는 `topInset` 만큼 내려온다.
   */
  const collapsedHeight =
    HANDLE_BLOCK_HEIGHT + (hasStickyHeader ? stickyHeaderHeight : 0)

  // 접힘 높이가 바뀔 때만 알린다(필터칩 행이 두 줄로 감기거나 Dynamic Type 이 커질 때).
  useEffect(() => {
    onCollapsedHeightChange?.(collapsedHeight)
  }, [collapsedHeight, onCollapsedHeightChange])

  const snapPoints = useMemo(
    () => [collapsedHeight, `${Math.round(SHEET_MID_RATIO * 100)}%`, "100%"],
    [collapsedHeight],
  )

  useImperativeHandle(
    ref,
    (): RestaurantListSheetHandle => ({
      snapToIndex: (index: number) => sheetRef.current?.snapToIndex(index),
      collapse: () => sheetRef.current?.snapToIndex(SHEET_SNAP.COLLAPSED),
      scrollToTop: () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
      },
    }),
    [],
  )

  const keyExtractor = useCallback(
    (item: RestaurantCardDto) => String(item.restaurantId),
    [],
  )

  /**
   * 손가락이 목록을 끌고 있는가 / 마지막으로 끝난 시각. state 가 아니라 ref 인 이유는
   * 이 값이 렌더에 쓰이지 않기 때문이다 — state 로 두면 스크롤 시작·끝마다 목록 전체가
   * 다시 그려진다.
   */
  const draggingRef = useRef(false)
  const scrollEndAtRef = useRef(0)

  const handleScrollBeginDrag = useCallback(() => {
    draggingRef.current = true
  }, [])

  const handleScrollEndDrag = useCallback(() => {
    draggingRef.current = false
    scrollEndAtRef.current = Date.now()
  }, [])

  const handleMomentumScrollEnd = useCallback(() => {
    draggingRef.current = false
    scrollEndAtRef.current = Date.now()
  }, [])

  const handlePressCard = useCallback(
    (item: RestaurantCardDto, index: number) => {
      // 스크롤이 뱉어 낸 press 는 사용자의 탭이 아니다(파일 상단 주석).
      if (isScrollEcho(Date.now(), draggingRef.current, scrollEndAtRef.current))
        return
      onPressCard?.(item, index)
    },
    [onPressCard],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: RestaurantCardDto; index: number }) => (
      <RestaurantCard
        card={item}
        selected={item.restaurantId === selectedId}
        onPress={onPressCard ? () => handlePressCard(item, index) : undefined}
      />
    ),
    [handlePressCard, onPressCard, selectedId],
  )

  /**
   * 첫 카드 자리의 스켈레톤. `ListHeaderComponent` 로 두는 이유는 이것이 **항목이
   * 아니기** 때문이다 — `items` 에 가짜 카드를 섞으면 `keyExtractor`·선택 하이라이트·
   * `onEndReached` 계산이 전부 그 유령을 진짜 식당으로 세게 된다.
   * 구분선을 함께 그려 아래 첫 카드와의 간격이 카드 사이 간격과 같아지게 한다.
   */
  const listHeader = useMemo(() => {
    if (!leadingSkeleton) return null
    return (
      <View>
        <RestaurantCardSkeleton />
        <V2Divider tone="alternative" />
      </View>
    )
  }, [leadingSkeleton])

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View>
          {Array.from({ length: RESTAURANT_SKELETON_COUNT }, (_, index) => (
            <RestaurantCardSkeleton key={index} />
          ))}
        </View>
      )
    }
    if (!emptyReason) return null
    return (
      <MapEmptyState
        reason={emptyReason}
        /* `noop` 으로 메꾸지 않는다. 넓힐 지도가 없는 호출부(지도 SDK 실패 → 리스트 모드)가
           이 prop 을 빼면 `MapEmptyState` 가 버튼 자체를 그리지 않아야 한다 —
           빈 함수를 끼워 넣으면 눌러도 아무 일이 없는 컨트롤이 선다. */
        onWidenMap={onWidenMap}
        onResetFilters={onResetFilters ?? noop}
        onRetry={onRetry ?? noop}
      />
    )
  }, [emptyReason, loading, onResetFilters, onRetry, onWidenMap])

  /**
   * 핸들. 인라인 화살표로 넘기면 매 렌더 새 컴포넌트 타입이 되어 핸들이 언마운트/재마운트되고
   * 드래그 도중에 제스처가 끊긴다.
   */
  const renderHandle = useCallback(
    () => (
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t("restaurant.map.sheetHandleAccessibility")}
        style={styles.handleArea}
      >
        <View
          style={[styles.handleBar, { backgroundColor: colors.label.disable }]}
        />
      </View>
    ),
    [colors.label.disable, t],
  )

  return (
    <BottomSheet
      ref={sheetRef}
      index={SHEET_SNAP.COLLAPSED}
      snapPoints={snapPoints}
      // v5 기본값 true 를 반드시 끈다 — 켜져 있으면 스냅 인덱스가 밀린다(파일 상단 주석).
      enableDynamicSizing={false}
      topInset={topInset}
      // 가로 사진 스트립과 세로 팬이 다투지 않게 핸들만 끈다(파일 상단 주석).
      enableContentPanningGesture={false}
      onChange={onSnapChange}
      animatedPosition={animatedPosition}
      backgroundStyle={[
        styles.background,
        { backgroundColor: colors.background.default },
      ]}
      // 목업의 시트는 지도 위에 뜬 흰 면이다. 지도(컬러 타일)와의 톤 차이가 곧 경계라
      // 선을 얹지 않는다 — 대신 그림자로 살짝 띄운다.
      style={[styles.sheet, style]}
      handleComponent={renderHandle}
    >
      {hasStickyHeader && (
        <View onLayout={handleStickyHeaderLayout}>
          {/*
            시트 머리의 세로 격자. 종전에는 칩 줄에 세로 여백이 **아예 없어서** 핸들과
            칩, 칩과 안내문이 서로 붙어 있었고, 안내문이 없는 상태(필터가 걸린 화면)에서는
            칩이 구분선·탭바에 그대로 닿았다. 접힘 높이는 이 블록을 `onLayout` 으로 재서
            따라오므로(§collapsed 스냅) 여백을 늘려도 매직 넘버가 생기지 않는다.
          */}
          <View style={styles.stickyRow}>{filterRow}</View>
          {notice}
          <V2Divider tone="alternative" />
        </View>
      )}
      <BottomSheetFlatList
        ref={listRef}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          <>
            {loadingMore && <RestaurantCardSkeleton />}
            {listFooter}
          </>
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        /* 손가락 스크롤의 시작·끝만 본다. 프로그램 스크롤(`scrollToTop`)은 여기 걸리지
           않아야 한다 — 걸리면 마커를 누른 직후의 정상적인 카드 탭이 막힌다. */
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + spacing[16] }}
      />
    </BottomSheet>
  )
})

function ListSeparator() {
  return <V2Divider tone="alternative" />
}

/** 콜백이 없을 때의 no-op. `MapEmptyState` 의 CTA 는 필수 prop 이라 자리를 채운다. */
function noop() {}

/**
 * 지도 위에 뜬 시트라 그림자를 준다. `background.dim` 으로 깊이를 만드는 DS 규칙은
 * 스크림이 있는 모달용이고, 이 시트는 지도를 가리지 않아야 하므로 스크림이 없다.
 */
const styles = StyleSheet.create({
  sheet: {
    shadowColor: "rgb(0, 27, 55)",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  background: {
    borderTopLeftRadius: radius["3xl"],
    borderTopRightRadius: radius["3xl"],
  },
  /**
   * 칩 줄의 세로 여백. 핸들 바로 아래이자 안내문 바로 위라, 이 값이 시트 머리 전체의
   * 숨 틈을 정한다. 종전에는 0 이라 핸들·칩·안내문이 한 덩어리로 붙어 보였다.
   */
  stickyRow: {
    paddingTop: spacing[8],
    paddingBottom: spacing[10],
  },
  handleArea: {
    alignItems: "center",
    paddingTop: HANDLE_PADDING_TOP,
    paddingBottom: HANDLE_PADDING_BOTTOM,
  },
  handleBar: {
    // 목업 36×4. v2 시트(48×4)보다 좁은 것은 지도 시트가 더 낮게 앉기 때문이다.
    width: 36,
    height: HANDLE_BAR_HEIGHT,
    borderRadius: radius.full,
  },
})

/** 리스트 상단 안내 문구를 시트와 같은 여백으로 그리는 헬퍼. 화면이 `notice` 로 넘긴다. */
export function SheetNotice({ message }: { message: string }) {
  const { colors } = useV2Theme()
  return (
    <Text
      style={[
        typography.subtext.medium,
        noticeStyles.text,
        { color: colors.label.alternative },
      ]}
      lineBreakStrategyIOS="hangul-word"
    >
      {message}
    </Text>
  )
}

const noticeStyles = StyleSheet.create({
  text: {
    paddingHorizontal: GUTTER,
    // 칩 줄과 붙지 않게 위를 띄운다. 아래는 구분선까지의 숨 틈이다.
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
})
