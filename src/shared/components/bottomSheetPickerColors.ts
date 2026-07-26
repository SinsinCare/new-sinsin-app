import { tokens } from "@/src/theme/tokens"

/**
 * BottomSheetPicker 의 색 팔레트. 컴포넌트 파일(.tsx)에 있던 순수 함수를 떼어냈습니다.
 * .tsx 에 있으면 색 하나 검증하려는 테스트가 react-native 모듈 그래프를 통째로 끌고 와서
 * jest(node 환경)에서 파싱 자체가 실패합니다.
 */
export function getBottomSheetPickerColors(isDark: boolean) {
  return {
    label: isDark ? tokens.color.textDark.val : "#17191C",
    placeholder: isDark ? "#6B7280" : "#A0A4A8",
    inputBg: isDark ? "#2A2A32" : "white",
    inputBorder: isDark ? tokens.color.borderDark.val : "rgba(218,223,230,0.6)",
    chevron: isDark ? tokens.color.textDarkSub.val : "#787C83",
    sheetBg: isDark ? "#2A2A32" : "white",
    handle: isDark ? tokens.color.borderDark.val : "#E0E0E0",
    selectedBg: isDark ? `${tokens.color.sub8.val}20` : "#F0FDF4",
    selectedText: tokens.color.sub8.val,
    itemText: isDark ? tokens.color.textDark.val : "#17191C",
  }
}
