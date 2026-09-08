import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useV2Theme, spacing } from "@/src/design-system-v2"

import { RecipeCategoryArt } from "../list/RecipeCategoryArt"
import { stablePhotoCacheKey } from "../list/recipeCardFormat"

/** 사진이 없을 때의 띠 높이와 그림 크기. 위 머리말 §높이 참고. */
const ART_BAND_HEIGHT = 84
const ART_SIZE = 52

export interface RecipeHeroImageProps {
  imageUrl: string | null
  /** 사진이 없을 때 무엇을 그릴지 정한다. 없으면 중립 도형이 나온다. */
  category?: string | null
}

export function RecipeHeroImage({
  imageUrl,
  category = null,
}: RecipeHeroImageProps) {
  const { colors } = useV2Theme()
  const hasPhoto = imageUrl != null && imageUrl.length > 0

  if (!hasPhoto) {
    return (
      <View style={styles.artBand}>
        <View style={styles.artTile}>
          <RecipeCategoryArt category={category} artSize={ART_SIZE} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.photo, { backgroundColor: colors.fill.normal }]}>
      <Image
        /* 목록과 같은 객체는 같은 캐시 키 — 서명 URL 이 매 응답 달라도 목록에서
           받아 둔 사진을 그대로 재사용해 상세 진입 시 재다운로드가 없다. */
        source={{ uri: imageUrl, cacheKey: stablePhotoCacheKey(imageUrl) }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  /** 일러스트는 자기 면(`surface`)을 스스로 칠한다 — 여기서는 높이만 준다. */
  artBand: {
    height: ART_BAND_HEIGHT,
    paddingHorizontal: spacing[20],
    justifyContent: "center",
  },
  artTile: { width: 64, height: 64, borderRadius: 16, overflow: "hidden" },
  photo: { width: "100%", aspectRatio: 4 / 3, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
})
