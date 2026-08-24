import { AppKeyboardToolbar } from "./AppKeyboardToolbar"
import { useGlobalKeyboardToolbarVisible } from "@/src/stores/keyboardToolbarStore"

/**
 * 키보드 위 표면.
 *
 * 한때 여기서 기록 시트의 CTA 를 키보드 위 도크로 세우려 했다(KeyboardDock).
 * **루트에 세우는 방식은 시트 위로 올라오지 못한다** — `KeyboardToolbar` 도
 * 내부가 `KeyboardStickyView` 라 네이티브 키보드가 아니라 앱 뷰 계층에 살고,
 * 기록 시트는 그보다 위에 그려진다(2026-08-03 실측). 그래서 시트의 CTA·탈출구는
 * 시트 안에서 스스로 떠오르고(RecordSheetShell 머리말), 여기 남은 툴바는
 * 시트 바깥의 평범한 화면 입력만 덮는다.
 *
 * 자기 도크를 직접 세우는 화면에서는 이 툴바가 **두 겹째 바**가 된다. 그런 화면은
 * `useSuppressGlobalKeyboardToolbar()` 로 여기를 끈다(그 파일 머리말에 조건이 있다).
 */
export function AppKeyboardSurface() {
  const visible = useGlobalKeyboardToolbarVisible()

  if (!visible) return null

  return <AppKeyboardToolbar />
}
