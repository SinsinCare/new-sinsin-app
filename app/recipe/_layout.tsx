/**
 * 레시피 상세 스택. `app/restaurant/_layout.tsx` 와 같은 모양이다 —
 * 이 그룹을 등록해 두지 않으면 기본값에 맡겨져 모달처럼 얹혀 보이고, 뒤로 제스처가
 * 탭 화면이 아니라 스택 루트로 돌아간다.
 *
 * 작성·수정은 `app/(write)/recipe/**` 다. 이 스택에는 읽기 화면만 둔다.
 */
import { Stack } from "expo-router"

export default function RecipeDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerShadowVisible: false }} />
  )
}
