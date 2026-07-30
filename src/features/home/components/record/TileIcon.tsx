import { StyleSheet } from "react-native"
import { Image } from "expo-image"
import MealIcon from "@/assets/images/tile-meal.svg"

/**
 * 오늘 기록 타일의 지표 아이콘. 디자인이 넘겨준 원본 그대로 쓴다 —
 * 이모지는 기기·OS 버전마다 그림이 달라져 같은 화면이 사람마다 다르게 보인다.
 *
 * 식사만 순수 벡터(801B)라 SVG 로 두고, 나머지는 원본이 래스터라 PNG 로 넣는다
 * (base64 를 품은 SVG 를 그대로 import 하면 번들에 문자열로 실려 콜드스타트가 느려진다).
 */
const SOURCES = {
  water: require("@/assets/images/tile-water.png"),
  bloodPressure: require("@/assets/images/tile-pressure.png"),
  bloodGlucose: require("@/assets/images/tile-glucose.png"),
  weight: require("@/assets/images/tile-weight.png"),
  edema: require("@/assets/images/tile-edema.png"),
} as const

export type TileIconName = "meal" | keyof typeof SOURCES

export function TileIcon({ name }: { name: TileIconName }) {
  if (name === "meal") {
    return <MealIcon width={22} height={22} />
  }
  return (
    <Image source={SOURCES[name]} style={styles.icon} contentFit="contain" />
  )
}

const styles = StyleSheet.create({
  icon: { width: 22, height: 22 },
})
