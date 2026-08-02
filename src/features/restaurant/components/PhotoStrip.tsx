/**
 * 카드 하단 가로 사진 스트립. 목업 §2.8 의 `[사진1][사진2][사진3]`.
 *
 * ## 사진이 비어 보이던 것은 클라이언트 버그였다
 *
 * 백엔드는 `/nearby` 부터 이미 `imageUrls` 를 내려주고 있었고 376곳 전부 채워져 있다.
 * 그런데 기존 화면이 `images: []` 를 하드코딩해 덮어썼다. 그래서 이 컴포넌트는
 * **URL 이 없으면 자리표시자도 그리지 않고 `null` 을 반환**한다 — 빈 회색 사각형 3개는
 * "사진이 없는 가게" 와 "우리가 사진을 버린 화면" 을 구분해 주지 않는다.
 *
 * ## 타일 크기를 화면 폭에서 유도한다
 *
 * 목업(375pt)에서 타일이 약 120pt 이고 3번째가 살짝 잘려 "더 있다" 를 암시한다.
 * 그 비율을 `(폭 - 16) / 3` 로 유도했다. 상수 120 을 박으면 SE 에서는 4장이 다 보이고
 * Max 에서는 3장이 헐렁해진다 — 잘림이 곧 스크롤 가능하다는 신호라서 유지해야 한다.
 *
 * ## 타일은 누를 수 없다
 *
 * 한때 `onPressPhoto` 를 받아 타일마다 `Pressable` 을 얹는 분기가 있었는데, **어느
 * 호출부도 그 prop 을 넘기지 않아** 늘 죽은 분기였다. 목업에도 카드 사진에서 라이트박스로
 * 가는 동선이 없다 — 카드를 누르면 상세로 가고, 사진 전체보기는 상세의 사진 탭이 한다.
 * 없는 동선을 위해 지금 갈 수 없는 버튼을 남겨 두면 다음 사람이 "동작한다" 고 읽는다.
 * 그래서 사진은 스크롤되는 표시물이고, 접근성 라벨만 갖는다.
 *
 * ## 첫 타일만 인셋을 갖는다
 *
 * `contentContainerStyle` 의 `paddingLeft` 로 준다. 각 타일에 marginLeft 를 주면
 * 스크롤 끝에서 오른쪽 여백이 사라져 사진이 화면 모서리에 딱 붙는다.
 */

import { memo, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import { radius, spacing, useV2Theme } from "@/src/design-system-v2"

import { RAIL_INSET } from "../layout"
import type { CuisineType } from "../types"
import { realPhotoUrls } from "../utils/stockPhoto"
import { CUISINE_ART } from "./cuisineArt"
export interface PhotoStripProps {
  urls: readonly string[]
  /** 스크린리더 문구용 상호명. */
  name: string
  /** 첫 타일 왼쪽 여백. 기본 16(화면 좌우 여백과 같은 값). */
  insetLeft?: number
  /** 최대 몇 장까지 그릴지. 기본 6 — 목록에서 이미지 디코딩 비용을 묶는다. */
  maxCount?: number
  /**
   * 실사진이 하나도 없을 때 그 자리에 놓을 그림을 고른다. 없으면 자리를 비운다.
   * (사진 없음과 스톡뿐인 것을 화면에서 구별하지 않는다 — 둘 다 "이 집 사진은 없다" 다.)
   */
  cuisineType?: CuisineType
  style?: ViewStyle
}

const GAP = spacing[8]

export const PhotoStrip = memo(function PhotoStrip({
  urls,
  name,
  insetLeft = RAIL_INSET,
  maxCount = 6,
  cuisineType,
  style,
}: PhotoStripProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const { width } = useWindowDimensions()

  /*
    **스톡 사진은 그리지 않는다.** 실측(dev DB): 사진 2,072행의 고유 URL 이 10개뿐이라
    서로 다른 가게 셋이 같은 순대국 사진을 단다. 사진은 카드에서 `제한`·`나트륨 기준`
    배지 바로 위에 있고, 사용자는 그것을 "이 집 음식이 이렇게 나온다" 로 읽는다 —
    레시피 쪽이 같은 이유로 이미 금지한 것이고, 그 근거가 하필 이 데이터를 인용한다
    (`utils/stockPhoto` 머리말).
  */
  const real = realPhotoUrls(urls)

  /*
    로딩에 실패한 URL. 실패한 타일을 회색 상자로 남겨 두면 위 머리말이 금지한
    "우리가 사진을 버린 화면" 과 똑같이 읽히므로, 그 타일은 **접어서 없앤다**.
    전부 실패하면 아래의 "사진 없음" 분기(음식 종류 그림)로 자연히 내려간다.

    2026-08-02 실측: 사진이 "뜨다 말다" 한 주원인은 http:// CDN URL 을 iOS ATS 가
    차단하던 것이라 데이터에서 https 로 고쳤다. 이 onError 는 그 잔여물 —
    만료된 블로그 이미지, 삭제된 원본 — 이 다시 회색 구멍으로 보이지 않게 하는
    마지막 방어다.
  */
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const alive = real.filter((url) => !failedUrls.has(url))

  // 목업 375pt 에서 120pt. 3번째가 조금 잘려 스크롤 가능함을 알린다.
  const tile = Math.round((width - RAIL_INSET) / 3)

  if (alive.length === 0) {
    const Art = cuisineType ? CUISINE_ART[cuisineType] : undefined
    if (!Art) return null
    // 한 장짜리 자리. 사진이 아니라 **음식 종류**를 말하는 그림이므로 양·모양을 주장하지 않는다.
    return (
      <View style={[styles.content, { paddingLeft: insetLeft }, style]}>
        <View
          style={[
            styles.tile,
            styles.artTile,
            { width: tile, height: tile, backgroundColor: colors.fill.normal },
          ]}
        >
          <Art
            width={Math.round(tile * 0.42)}
            height={Math.round(tile * 0.42)}
          />
        </View>
      </View>
    )
  }

  const items = alive.slice(0, maxCount)

  return (
    <ScrollView
      horizontal
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      // 시트 안에서 세로 팬 제스처와 싸우지 않도록 중첩 스크롤을 명시한다(안드로이드).
      nestedScrollEnabled
      contentContainerStyle={[
        styles.content,
        { paddingLeft: insetLeft, paddingRight: insetLeft },
      ]}
      style={style}
    >
      {items.map((url, index) => (
        <View
          key={`${url}-${index}`}
          style={[
            styles.tile,
            { width: tile, height: tile, backgroundColor: colors.fill.normal },
          ]}
        >
          <Image
            source={{ uri: url }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={t("restaurant.photoAccessibility", {
              name,
              number: index + 1,
            })}
            transition={120}
            onError={() => {
              setFailedUrls((prev) => {
                if (prev.has(url)) return prev
                const next = new Set(prev)
                next.add(url)
                return next
              })
            }}
          />
        </View>
      ))}
    </ScrollView>
  )
})

const styles = StyleSheet.create({
  artTile: { alignItems: "center", justifyContent: "center" },
  content: { gap: GAP },
  tile: { borderRadius: radius.sm, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
})
