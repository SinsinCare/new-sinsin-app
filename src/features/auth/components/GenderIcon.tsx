import { StyleSheet, View } from "react-native"
import FemaleIconAsset from "../assets/gender-female.svg"
import MaleIconAsset from "../assets/gender-male.svg"

type GenderIconKind = "MALE" | "FEMALE"

interface GenderIconProps {
  gender: GenderIconKind
  size?: number
}

const GLYPH_RATIO = 33.333 / 40

export function GenderIcon({ gender, size = 40 }: GenderIconProps) {
  const Icon = gender === "MALE" ? MaleIconAsset : FemaleIconAsset
  const glyphSize = size * GLYPH_RATIO

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.slot, { width: size, height: size }]}
    >
      <Icon width={glyphSize} height={glyphSize} />
    </View>
  )
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    justifyContent: "center",
  },
})
