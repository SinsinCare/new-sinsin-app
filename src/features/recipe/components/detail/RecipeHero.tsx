/**
 * 상세 맨 위의 **이미지 섹션**.
 *
 * ─── 패럴랙스와 떠 있던 상단 바를 걷어낸 이유 (되돌리기 전에 읽을 것) ─────────
 * 종전 구현은 300pt 짜리 전면 사진 + 스크롤에 따라 움직이는 패럴랙스 + 그 위에 떠 있는
 * 반투명 검은 원(뒤로/저장/공유)이었다. 사진이 있다는 전제로 만든 UI 인데,
 * **실측하면 사진이 없다**: dev DB 175건 중 `image_url`/`thumbnail_url`/`detail_image_url`
 * 이 채워진 레시피가 0건이고, 그래서 API 의 `heroImageUrl` 도 전부 null 이다.
 * 그 결과 실제 화면은 (a) 96pt 빈 회색 띠, (b) 그 위에 뜬 검은 동그라미 세 개가
 * 제목과 재료 목록을 가리는 모습이었다. **컨트롤을 사진 위에 얹지 않는다**(헤더는
 * `V2ScreenHeader` 로 항상 그린다)는 그때의 결론은 그대로다.
 *
 * ─── 이번 변경: 자리를 **맨 위로 되돌리되, 빈 띠를 만들지 않는다** ──────────────
 * 직전 판본은 사진이 **있을 때만** 본문 중간(제목·액션 아래)에 카드로 넣었다. 그래서
 * 사진이 생긴 레시피에서도 "요리 사진 → 이름" 이라는 자연스러운 순서가 아니라 이름과
 * 액션을 지나야 사진이 나왔다. 지면의 첫 블록은 그 페이지가 무엇인지 말해야 한다.
 *
 * 그런데 자리를 위로 올리는 것만 하면 사진 0건인 지금 **상세를 열 때마다 빈 회색 띠**가
 * 먼저 보인다 — 걷어냈던 결함이 그대로 돌아온다. 그래서 목록·보관함 카드가 쓰는 규칙을
 * 그대로 가져왔다: 사진이 없으면 **카테고리 일러스트**를 그린다(`RecipeCategoryArt`,
 * 같은 컴포넌트·같은 표). 자리표시자가 아니라 "이 요리가 어느 갈래인가" 를 말하는 면이라
 * 빈칸으로 읽히지 않고, 목록에서 본 그 그림이 상세에서 커진 것이라 두 화면이 이어진다.
 *
 * 높이가 두 경우에 다른 것은 의도다:
 *   - 사진: 4:3 전면. 요리 사진은 접시가 주인공이라 세로가 낮으면 잘린다.
 *   - 일러스트: 152 짧은 띠. 같은 4:3(약 293pt)으로 그리면 작은 픅토그램 하나가 넓은
 *     회색 판 가운데 뜬 모습이 되어 **"사진을 못 불러왔다"** 로 읽힌다(카드에서 96 → 72 로
 *     줄인 것과 같은 판단). 짧은 띠 위의 그림은 표지 장식으로 읽힌다.
 *
 * 전면(full-bleed)인 이유: 이 블록만 좌우 여백이 없다. 표지는 지면의 경계까지 닿아야
 * "머리" 로 읽히고, 여백을 주면 본문 카드 중 하나처럼 보인다. 대신 아래 제목 블록부터는
 * 전부 `GUTTER` 에 맞으므로 화면의 시작선은 여전히 하나다.
 */
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useV2Theme } from "@/src/design-system-v2"

import { RecipeCategoryArt } from "../list/RecipeCategoryArt"
import { stablePhotoCacheKey } from "../list/recipeCardFormat"

/** 사진이 없을 때의 띠 높이와 그림 크기. 위 머리말 §높이 참고. */
const ART_BAND_HEIGHT = 152
const ART_SIZE = 84

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
        <RecipeCategoryArt category={category} artSize={ART_SIZE} />
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
  artBand: { width: "100%", height: ART_BAND_HEIGHT },
  photo: { width: "100%", aspectRatio: 4 / 3, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
})
