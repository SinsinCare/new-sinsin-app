/**
 * 사진 탭 (목업 -15). 카테고리 칩 + **2열 masonry**.
 *
 * ## 균일 그리드가 아니다
 *
 * 목업을 확대해 보면 왼쪽 열과 오른쪽 열의 타일 높이가 서로 다르고, 두 열의 경계가
 * 가로로 정렬되지 않는다. 즉 정사각 그리드가 아니라 원본 비율을 지키는 masonry 다.
 * 세로 사진을 1:1 로 잘라 붙이면 음식 접시가 잘려 무엇인지 알 수 없게 되고,
 * `메뉴판`·`영양정보` 사진은 글자가 잘려 **읽을 수 없게 된다**.
 *
 * 배치는 "지금 더 짧은 열에 다음 장을 넣는다" 는 그리디 한 줄이다. 이 배치는 **모든
 * 타일의 높이가 같으면 균일 격자와 정확히 같은 결과를 낸다** — 오래 그랬다. 서버가
 * 치수를 주지 않아 전부 1:1 로 그렸기 때문이고, 아무 것도 실패하지 않아서 코드는
 * masonry 인데 화면은 격자인 상태가 조용히 남아 있었다. 마이그레이션 075 가
 * `restaurant_photo.width/height` 를 만들고 `/:id/photos` 가 그 값을 싣는다.
 *
 * ## 치수가 `null` 인 사진은 **그리기 전에** 잰다
 *
 * 사용자가 올린 후기 사진과 카카오 CDN URL 은 서버도 치수를 모른다(그때 0 이나 1:1 을
 * 지어내지 않는 것이 서버 쪽 결정이다).
 *
 * 예전에는 그런 타일을 일단 1:1 로 깔아 두고 `onLoad` 에서 실제 크기를 받아 고쳤다.
 * "치수를 아는 사진은 첫 페인트에 최종 배치" 라는 전제였는데 **실측이 그 전제를 깼다** —
 * 사진이 10장 이상인 식당 181곳에서 서버 치수가 있는 사진은 평균 **34%** 다(나머지는
 * 카카오 CDN 원본과 후기 사진). 즉 화면의 3분의 2가 로드된 뒤에 높이가 바뀌었고,
 * 그리디 배치는 **매번 처음부터 다시** 돌기 때문에 이미 그려진 타일이 열을 옮겨 다녔다.
 * 실제 비율 분포로 30장짜리 화면을 500번 돌려 보면 **93%** 의 화면에서 열이 바뀌고,
 * 타일 기준으로는 40% 가 다른 열로 간다. 사진들이 후두두둑 떨어지듯 쏟아지고, 누르려던
 * 사진이 손가락 밑에서 바뀐다.
 *
 * 그래서 순서를 뒤집었다. 치수를 모르는 사진은 `Image.loadAsync` 로 **크기를 먼저 받고**,
 * 그 값을 확정한 뒤에야 배치에 넣는다. `loadAsync` 는 expo-image 의 같은 로더를 타므로
 * 캐시가 데워지고, 실제 `<Image>` 는 그 캐시에서 즉시 그려진다. 내려받는 바이트는
 * 예전과 같고, 달라지는 것은 "언제 배치를 정하는가" 하나다.
 *
 * ## 한 번 정한 타일은 절대 움직이지 않는다
 *
 * 비율은 **먼저 쓴 값이 이긴다**(`rememberAspects` 참조). 배치도 앞에서부터 비율을 아는
 * 만큼만 깔고 모르는 사진이 나오면 거기서 멈춘다(`placedTiles`). 중간을 건너뛰고 뒤를
 * 먼저 깔면 빠진 사진이 도착할 때 뒤의 타일이 전부 밀리기 때문이다. 이 두 규칙 덕에
 * 그리디 배치는 **접두사에 대해 결정적**이다 — 다음 페이지가 붙어도 이미 그려진 타일의
 * 열과 높이는 그대로다. 화면에서 일어나는 변화는 아래로 늘어나는 것뿐이다.
 *
 * ## 카테고리 개수는 상세 응답에서 받는다
 *
 * `전체 999+ / 메뉴판 240` 의 숫자는 받아온 사진을 세서 만들 수 없다 — 첫 페이지
 * 30장만 온 상태에서 세면 `메뉴판 12` 가 된다. 상세의 `photoCategoryCounts` 는
 * 카테고리를 바꿔도 변하지 않으므로 칩 라벨이 흔들리지 않는다.
 *
 * **그 객체에 `all` 키는 없다.** 서버는 0건 카테고리를 생략하고 전체 수를 별도
 * 필드(`photoCount`)로 준다. 예전 코드가 `categoryCounts.all` 을 읽어 `전체` 칩의
 * 개수가 `undefined` 였고, 그래서 `totalCount` 를 따로 받는다.
 *
 * ## 다음 페이지를 버튼으로 받는 이유
 *
 * 스크롤은 상세 화면이 하나만 갖는다(sticky 탭 때문). 그래서 이 안에 `FlatList` 를 둘 수
 * 없는데, **그것이 더보기 버튼의 근거는 아니었다** — `onEndReached` 는 FlatList 의
 * 어포던스일 뿐 바닥 감지의 유일한 수단이 아니다. 지금은 부모의 `onScroll` 이 바닥을
 * 재서 `endReachedTick` 을 올리고(판정은 `utils/autoPaginate`), 이 탭이 그 신호로 다음
 * 쪽을 당긴다. 버튼은 자동이 실패했을 때의 손잡이로 남는다. 조용히 30장에서 끊기는 것보다
 * 더 있다는 사실을 말해 주는 편이 맞다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AUTO_PAGE_LIMIT } from "../../utils/autoPaginate"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  radius,
  spacing,
  useV2Theme,
  V2EmptyState,
  V2ErrorState,
  V2Icon,
} from "@/src/design-system-v2"

import { PhotoTabSkeleton } from "./DetailSkeletons"
import { CHIP_GAP, GUTTER, RAIL_INSET } from "../../layout"
import {
  formatPhotoCount,
  PHOTO_CATEGORY_CHIPS,
  useRestaurantPhotos,
} from "../../hooks/useRestaurantPhotos"
import type { PhotoCategory, PhotoCategoryCounts, PhotoDto } from "../../types"
// 배치 규칙(비율 결정 · 접두사 · 그리디 2열)은 화면 밖의 순수 함수다. 테스트가 "이미
// 그려진 타일은 움직이지 않는다" 를 그쪽에서 짚는다.
import {
  FALLBACK_ASPECT,
  packMasonry,
  placeablePrefix,
  serverAspect,
  type MeasuredAspects,
} from "../../utils/photoMasonry"
import { DetailFilterChip } from "./DetailFilterChip"
import { OutlinePill } from "./OutlinePill"

/** masonry 열 수. 목업 -15. */
const COLUMNS = 2

/** 타일 사이 간격. 목업은 4px 로 거의 붙어 있다 — 사진 자체가 격자를 만든다. */
const GAP = spacing[4]

/**
 * 크기 측정의 마감시한. 이 시간을 넘긴 사진은 `FALLBACK_ASPECT` 로 확정하고 배치에 넣는다.
 *
 * 없으면 응답이 영영 안 오는 URL 한 장이 **그 뒤의 사진을 전부 막는다**(배치는 접두사
 * 규칙이라 중간에서 멈춘다). 시드 데이터에 죽은 카카오 CDN 링크가 섞여 있고, 그 한 장
 * 때문에 사진 탭이 비어 보이는 것이 지금 고치는 결함보다 나쁘다.
 */
const MEASURE_DEADLINE_MS = 1500

/**
 * 측정용 디코딩 상한(픽셀). 비율만 필요한데 원본을 그대로 디코딩하면 30장이 동시에
 * 메모리에 뜬다. 열 폭이 200pt 안쪽이라 3배 밀도에서도 이 값이면 충분하고, 비율은
 * 리사이즈해도 보존된다.
 */
const MEASURE_MAX_PX = 800

export interface PhotoTabProps {
  restaurantId: number
  restaurantName: string
  /** 전체 카테고리 개수. 상세 응답의 값이라 카테고리를 바꿔도 흔들리지 않는다. */
  categoryCounts: PhotoCategoryCounts
  /** `전체` 칩의 개수. `categoryCounts` 에 `all` 키가 없어서 따로 받는다(`photoCount`). */
  totalCount: number
  onOpenPhotos?: (photos: PhotoDto[], index: number) => void
  /**
   * 바닥에 닿을 때마다 **1씩 오르는 신호.** 값 자체에는 뜻이 없고 변했다는 사실만 쓴다.
   *
   * 상세는 스크롤러가 하나뿐이라 이 안에 `FlatList` 를 둘 수 없어서, 바닥 감지는 부모의
   * `onScroll` 이 한다. 그 판정은 `utils/autoPaginate` 에 순수 함수로 있다.
   * 활성 탭이 아닐 때 부모가 `0` 을 주므로 숨은 탭은 저절로 조용하다.
   */
  endReachedTick?: number
}

export function PhotoTab({
  restaurantId,
  restaurantName,
  categoryCounts,
  totalCount,
  onOpenPhotos,
  endReachedTick = 0,
}: PhotoTabProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { width } = useWindowDimensions()
  const [category, setCategory] = useState<PhotoCategory | "ALL">("ALL")

  const {
    photos,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    nextPageFailed,
    isError,
    loadMore,
    refetch,
  } = useRestaurantPhotos(restaurantId, category)

  /**
   * 서버가 치수를 주지 않은 사진의 비율. **그리기 전에** 채워지고, 한 번 들어온 값은
   * 바뀌지 않는다(헤더 §한 번 정한 타일).
   */
  const [measured, setMeasured] = useState<MeasuredAspects>({})
  /** 이미 측정을 건 사진. 페이지가 붙을 때마다 같은 URL 을 다시 재지 않게 한다. */
  const requested = useRef<Set<number>>(new Set())

  const columnWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS

  /**
   * 먼저 쓴 값이 이긴다. 마감시한이 폴백을 심은 뒤 늦게 도착한 실측이 덮어쓰면,
   * 이미 그려진 타일의 높이가 바뀌어 우리가 없애려는 그 흔들림이 되돌아온다.
   */
  const rememberAspects = useCallback(
    (entries: readonly [number, number][]) => {
      if (entries.length === 0) return
      setMeasured((prev) => {
        let next: Record<number, number> | null = null
        for (const [photoId, aspect] of entries) {
          if (prev[photoId] !== undefined) continue
          next ??= { ...prev }
          next[photoId] = aspect
        }
        return next ?? prev
      })
    },
    [],
  )

  /**
   * 치수를 모르는 사진의 크기를 미리 받아 온다. `loadAsync` 는 `<Image>` 와 같은 로더를
   * 타므로 여기서 캐시가 데워지고, 타일은 그 캐시에서 즉시 그려진다.
   *
   * **정리 함수를 두지 않는다.** 다음 페이지가 붙어 이 이펙트가 다시 돌 때 이전 배치의
   * 마감시한까지 꺼 버리면, 응답이 안 오는 사진 한 장이 영영 배치에 못 들어가 그 뒤가
   * 전부 막힌다. 화면을 떠난 뒤 남는 것은 타이머 하나와 무시되는 setState 하나뿐이다.
   */
  useEffect(() => {
    const todo = photos.filter(
      (photo) =>
        serverAspect(photo) === null && !requested.current.has(photo.photoId),
    )
    if (todo.length === 0) return
    for (const photo of todo) requested.current.add(photo.photoId)

    /*
      **장 단위로 기억한다.** 예전에는 `Promise.all` 한 덩어리를 마감시한 하나와 겨루게
      해서, 한 장이 늦으면 `settled` 이 되고 그 배치의 결과를 통째로 버렸다 — 제 시각에
      측정된 사진까지 전부 1:1 로 떨어졌다. 늦은 한 장은 그 한 장만 폴백이면 된다.

      순서 규칙은 `rememberAspects` 가 지킨다: **먼저 쓴 값이 이긴다.** 그래서 마감시한이
      먼저 닿은 사진은 폴백으로 굳고, 실측이 먼저 온 사진은 실제 비율을 유지한다.
    */
    const deadline = setTimeout(() => {
      rememberAspects(todo.map((photo) => [photo.photoId, FALLBACK_ASPECT]))
    }, MEASURE_DEADLINE_MS)

    let pending = todo.length
    const settleOne = (entry: [number, number]) => {
      rememberAspects([entry])
      pending -= 1
      // 전부 왔으면 타이머를 거둔다. 남겨 둬도 먼저 쓴 값이 이기므로 무해하지만,
      // 화면을 떠난 뒤 도는 타이머를 줄이는 편이 낫다.
      if (pending === 0) clearTimeout(deadline)
    }

    for (const photo of todo) {
      void Image.loadAsync(photo.url, {
        maxWidth: MEASURE_MAX_PX,
        maxHeight: MEASURE_MAX_PX,
      })
        .then((image) => {
          const ratio = image.width / image.height
          settleOne([photo.photoId, ratio > 0 ? ratio : FALLBACK_ASPECT])
        })
        .catch(() => {
          // 죽은 링크·동영상·web 미지원. 배치를 막지 않는 것이 여기서 할 일의 전부다.
          settleOne([photo.photoId, FALLBACK_ASPECT])
        })
    }
  }, [photos, rememberAspects])

  /** 크기가 확정된 접두사만 배치한다 — 규칙과 그 이유는 `placeablePrefix` 에 있다. */
  const placedTiles = useMemo(
    () => placeablePrefix(photos, measured),
    [photos, measured],
  )

  const columns = useMemo(
    () => packMasonry(placedTiles, { columnWidth, columns: COLUMNS, gap: GAP }),
    [placedTiles, columnWidth],
  )

  /*
    ── 자동 다음 쪽 ──────────────────────────────────────────────
    부모가 바닥 근접을 알리면 한 쪽 더 받는다. 가드가 셋이다:

      1. `seenTick` 마운트 시드 — 이미 올라 있던 값을 "본 것" 으로 친다. 없으면
         홈 탭에서 사진 탭으로 넘어오는 순간(캐시가 따뜻하고 tick 이 이미 0보다 큼)
         요청하지 않은 쪽이 나간다.
      2. `placedTiles.length < photos.length` — 아직 재는 중이면 격자 높이가 자라지
         않는다. 이 창에서 더 받으면 쪽이 겹쳐 쌓인다.
      3. `AUTO_PAGE_LIMIT` — 가상화가 없으므로 무한정 쌓지 않는다.
  */
  const autoPages = useRef(0)
  const seenTick = useRef(endReachedTick)

  useEffect(() => {
    if (endReachedTick === seenTick.current) return
    seenTick.current = endReachedTick
    if (autoPages.current >= AUTO_PAGE_LIMIT) return
    if (placedTiles.length < photos.length) return
    autoPages.current += 1
    loadMore()
    // `loadMore` 를 deps 에 넣지 않는다 — 훅이 매 렌더 새 함수를 준다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endReachedTick])

  // 칩을 바꾸면 다른 질의다. 상한도 다시 센다.
  useEffect(() => {
    autoPages.current = 0
  }, [category])

  /** `ALL` 은 항상, 나머지는 실제로 사진이 있는 카테고리만. 0건 칩을 만들지 않는다. */
  const chips = PHOTO_CATEGORY_CHIPS.filter(
    (value) => value === "ALL" || (categoryCounts[value] ?? 0) > 0,
  )

  return (
    <View>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {chips.map((value) => (
          <DetailFilterChip
            key={value}
            label={t(`restaurant.photo.categories.${value}`)}
            count={formatPhotoCount(
              value === "ALL" ? totalCount : (categoryCounts[value] ?? 0),
            )}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </ScrollView>

      {/* 첫 장의 크기를 받는 동안도 로딩이다 — 여기서 빈 컨테이너를 그리면 사진이
          한 박자 늦게 튀어나오는 것으로 보인다. */}
      {isLoading || (photos.length > 0 && placedTiles.length === 0) ? (
        <PhotoTabSkeleton />
      ) : isError ? (
        <V2ErrorState
          surface="restaurant_detail_photo"
          title={t("restaurant.error.detailTitle")}
          description={t("restaurant.error.detailBody")}
          onRetry={refetch}
          retryLabel={t("restaurant.error.detailRetry")}
        />
      ) : photos.length === 0 ? (
        <V2EmptyState
          surface="restaurant_detail_photo"
          title={t("restaurant.empty.photoTitle")}
        />
      ) : (
        <View style={styles.masonry}>
          {columns.map((bucket, columnIndex) => (
            <View key={columnIndex} style={styles.column}>
              {bucket.map(({ photo, index, height }) => (
                <Pressable
                  key={photo.photoId}
                  disabled={!onOpenPhotos}
                  onPress={() => onOpenPhotos?.(photos, index)}
                  accessibilityRole="imagebutton"
                  accessibilityState={{ disabled: !onOpenPhotos }}
                  accessibilityLabel={t("restaurant.photoAccessibility", {
                    name: restaurantName,
                    number: index + 1,
                  })}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={[
                      styles.tile,
                      {
                        width: columnWidth,
                        height,
                        // 상자는 이미 확정돼 있다. 사진이 아직 안 왔거나 링크가 죽었을 때
                        // 흰 구멍 대신 이 면이 보인다.
                        backgroundColor: colors.fill.alternative,
                      },
                    ]}
                    contentFit="cover"
                    // 대부분 위 측정에서 캐시가 데워진 상태라 즉시 그려진다. 짧은 페이드는
                    // 캐시가 비었을 때 타일이 툭 나타나는 것만 부드럽게 덮는다.
                    transition={120}
                  />
                  {photo.isVideo && (
                    <View
                      style={[
                        styles.playBadge,
                        { backgroundColor: colors.background.dim },
                      ]}
                    >
                      <V2Icon
                        name="playCircle"
                        size={iconSize.sm}
                        color={colors.static.white}
                      />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}

      {/*
        **버튼을 지우지 않는다.** 요구의 본질은 "눌러야만 다음이 나오는 상태" 를 없애는
        것이지 손잡이를 없애는 것이 아니다. 자동이 정상 동작하면 사용자는 이 자리를
        스치듯 지나가고, 자동이 실패했거나 상한(`AUTO_PAGE_LIMIT`)에 닿았을 때만 눈에 띈다.

        재시도가 `refetch` 가 아니라 `loadMore` 인 것이 중요하다 — `refetch` 는 첫 쪽부터
        다시 받아서, 쌓아 둔 것을 버리고 처음으로 돌아간다.
      */}
      {(hasNextPage || nextPageFailed) && (
        <View style={styles.moreRow}>
          <OutlinePill
            label={
              nextPageFailed
                ? t("restaurant.photo.loadMoreRetry")
                : t("restaurant.photo.loadMore")
            }
            // 받아온 사진이 아직 배치에 다 못 들어갔으면 그것도 로딩이다 — 버튼이 멀쩡히
            // 눌리는데 아무 것도 안 늘어나는 것처럼 보이지 않게 한다.
            loading={isFetchingNextPage || placedTiles.length < photos.length}
            onPress={loadMore}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // 가로 스크롤이므로 인셋은 `contentContainerStyle` 쪽이다 — 컨테이너에 주면
  // 스크롤 끝에서 오른쪽 여백이 사라져 마지막 칩이 화면 모서리에 붙는다.
  chipRow: {
    gap: CHIP_GAP,
    paddingHorizontal: RAIL_INSET,
    paddingVertical: spacing[12],
  },
  masonry: { flexDirection: "row", gap: GAP, paddingHorizontal: GUTTER },
  column: { gap: GAP },
  tile: { borderRadius: radius.xs },
  // 배지는 사진 위에 얹힌다. 밝은 사진에서도 보이도록 반투명 어두운 원을 깐다.
  playBadge: {
    position: "absolute",
    top: spacing[6],
    right: spacing[6],
    padding: spacing[4],
    borderRadius: radius.full,
  },
  moreRow: { alignItems: "center", paddingVertical: spacing[20] },
  pressed: { opacity: 0.9 },
})
