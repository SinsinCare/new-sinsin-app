import { tokens } from "@/src/theme/tokens"

export function getRestrictionStyle(level: string): {
  label: string
  bg: string
  color: string
} {
  switch (level.toLowerCase()) {
    case "safe":
      return {
        label: "안전해요",
        bg: "$secondaryLight",
        color: "$secondary",
      }
    case "caution":
      return {
        label: "주의 필요",
        bg: "$primary2",
        color: "$primaryHover",
      }
    case "restricted":
      return {
        label: "제한 필요",
        bg: tokens.color.restrictionBg.val,
        color: tokens.color.restrictionText.val,
      }
    default:
      return {
        label: level,
        bg: "$colorSubtle" + "1A",
        color: "$colorPress",
      }
  }
}
