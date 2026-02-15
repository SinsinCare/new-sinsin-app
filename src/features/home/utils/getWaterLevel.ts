/**
 * 물방울 SVG의 Y 위치 계산
 * @param percentage - 달성 퍼센티지 (0-100)
 * @returns Y 좌표
 */
export const getWaterLevel = (percentage: number): number => {
  // 물방울 Path y범위: 20(top) ~ 180(bottom)
  return 180 - (percentage / 100) * 160
}
