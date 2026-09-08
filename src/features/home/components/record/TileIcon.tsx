import { View } from "react-native"
import { Image } from "expo-image"

import EdemaGlyph from "@/assets/images/tile-edema.svg"
import GlucoseGlyph from "@/assets/images/tile-glucose.svg"
import WaterGlyph from "@/assets/images/tile-water.svg"

/**
 * 건강기록 타일의 지표 아이콘 — 홈 시안(2026-09-04, home.svg)에서 그대로 꺼냈다.
 *
 * 시안은 두 계열을 섞어 쓴다. 약·혈압·체중은 **래스터**(1254px 원본을 72px, 3x 로
 * 줄여 실었다), 수분·혈당·붓기는 **벡터**(16×16 글리프)다. 둘 다 시안의 24 상자
 * 안에 앉힌다 — 래스터는 상자 안쪽에 투명 여백을 이미 갖고 있고, 벡터는 16 을
 * 가운데 두면 같은 시각 크기가 된다.
 *
 * 이모지 **폰트**를 쓰지 않는 이유는 그대로다: 기기·OS 마다 그림이 달라진다.
 */
const RASTER = {
  medication: require("@/assets/images/tile-medication.png"),
  bloodPressure: require("@/assets/images/tile-pressure.png"),
  weight: require("@/assets/images/tile-weight.png"),
} as const

const VECTOR = {
  water: WaterGlyph,
  bloodGlucose: GlucoseGlyph,
  edema: EdemaGlyph,
} as const

export type TileIconName = keyof typeof RASTER | keyof typeof VECTOR

export const TILE_ICON_SIZE = 24
const GLYPH_SIZE = 16

export function TileIcon({ name }: { name: TileIconName }) {
  if (name in RASTER) {
    return (
      <Image
        source={RASTER[name as keyof typeof RASTER]}
        style={{ width: TILE_ICON_SIZE, height: TILE_ICON_SIZE }}
        contentFit="contain"
      />
    )
  }
  const Glyph = VECTOR[name as keyof typeof VECTOR]
  return (
    <View
      style={{
        width: TILE_ICON_SIZE,
        height: TILE_ICON_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Glyph width={GLYPH_SIZE} height={GLYPH_SIZE} />
    </View>
  )
}
