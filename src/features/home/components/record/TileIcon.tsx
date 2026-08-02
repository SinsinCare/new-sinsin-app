import { Image } from "expo-image"

/**
 * 오늘 기록 타일의 지표 아이콘. 디자인이 넘겨준 원본 그대로 쓴다 —
 * 이모지 **폰트**는 기기·OS 버전마다 그림이 달라져 같은 화면이 사람마다 다르게
 * 보이므로, 래스터로 고정해 앱에 싣는다.
 *
 * 식사만 평면 벡터(SVG)라 나머지 5개(입체 래스터)와 계열이 갈렸다 — QA(2026-08-02
 * 정설아): "모두 2d 혹은 3d 로 통일, 3d 라면 식사는 3d 밥그릇으로". 그래서 식사도
 * 같은 계열의 입체 밥그릇 래스터로 바꿨다. 크기도 같은 피드백("아이콘이 작다")으로
 * 22 → 28.
 */
const SOURCES = {
  meal: require("@/assets/images/tile-meal.png"),
  water: require("@/assets/images/tile-water.png"),
  bloodPressure: require("@/assets/images/tile-pressure.png"),
  bloodGlucose: require("@/assets/images/tile-glucose.png"),
  weight: require("@/assets/images/tile-weight.png"),
  edema: require("@/assets/images/tile-edema.png"),
} as const

export type TileIconName = keyof typeof SOURCES

/**
 * 붓기만 2 크다. 자산의 불투명 영역이 다른 다섯 개보다 작아 같은 상자에서
 * 시각적으로 한 뼘 작아 보인다는 QA(2026-08-02 "붓기 아이콘 살짝 키우기") —
 * 자산을 다시 뽑는 대신 렌더 크기로 광학 보정한다.
 */
const SIZE_BY_NAME: Partial<Record<TileIconName, number>> = { edema: 30 }

export function TileIcon({ name }: { name: TileIconName }) {
  const size = SIZE_BY_NAME[name] ?? 28
  return (
    <Image
      source={SOURCES[name]}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  )
}
