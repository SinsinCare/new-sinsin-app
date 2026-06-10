export const APP_BOTTOM_SHEET_BOTTOM_PADDING = 16

export function getBottomSheetContentPadding(bottomInset: number): number {
  return bottomInset + APP_BOTTOM_SHEET_BOTTOM_PADDING
}

export function getBottomSheetPalette(isDark: boolean) {
  return isDark
    ? {
        background: "#2A2A32",
        handle: "#858591",
        overlay: "rgba(0,0,0,0.48)",
      }
    : {
        background: "#FFFFFF",
        handle: "#D9D9DF",
        overlay: "rgba(0,0,0,0.28)",
      }
}

export function getTamaguiSheetSnapPoints(snapPoints: number[]): number[] {
  return [...snapPoints].sort((a, b) => b - a)
}

export function getTamaguiSheetPosition(
  snapPoints: number[],
  snapIndex: number,
): number {
  const sortedSnapPoints = getTamaguiSheetSnapPoints(snapPoints)
  const snapPoint = snapPoints[snapIndex] ?? snapPoints[0]
  const position = sortedSnapPoints.indexOf(snapPoint)

  return position >= 0 ? position : 0
}
