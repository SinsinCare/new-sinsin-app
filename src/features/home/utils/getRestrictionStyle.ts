import { tokens } from "@/src/theme/tokens"

export function getRestrictionStyle(level: string): {
  labelKey:
    | "foodResult.restriction.safe"
    | "foodResult.restriction.caution"
    | "foodResult.restriction.restricted"
    | "foodResult.restriction.unknown"
  bg: string
  color: string
} {
  switch (level.toLowerCase()) {
    case "safe":
      return {
        labelKey: "foodResult.restriction.safe",
        bg: "$secondaryLight",
        color: "$secondary",
      }
    case "caution":
      return {
        labelKey: "foodResult.restriction.caution",
        bg: "$primary2",
        color: "$primaryHover",
      }
    case "restricted":
      return {
        labelKey: "foodResult.restriction.restricted",
        bg: tokens.color.restrictionBg.val,
        color: tokens.color.restrictionText.val,
      }
    case "unknown":
      return {
        labelKey: "foodResult.restriction.unknown",
        bg: tokens.color.grey8.val,
        color: tokens.color.grey4.val,
      }
    default:
      return {
        labelKey: "foodResult.restriction.unknown",
        bg: tokens.color.grey8.val,
        color: tokens.color.grey4.val,
      }
  }
}
