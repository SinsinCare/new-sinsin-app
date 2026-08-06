import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { LAYOUT, TYPE } from "@/src/theme/surface"

/**
 * 레시피 수정 — **계약 v2 에 수정 엔드포인트가 없다.**
 *
 * 계약 §2 의 표에 `PUT /recipes/{id}` 가 없고 작성은 `POST /recipes` 하나뿐이다.
 * 그래서 이 화면은 폼을 띄우지 않고 **왜 없는지**를 말한다. 예전에는 "레시피 수정"
 * 이라는 제목만 있는 빈 화면이었는데, 그건 로딩이 멈춘 것처럼 보인다.
 *
 * 서버에 수정이 생기면 `RecipeWriteForm` 에 초기값을 넣는 경로만 더하면 된다
 * (폼 상태가 `createEmptyRecipeWriteForm()` 한 곳에서 나오게 만들어 두었다).
 *
 * ## 왜 `edit/` 아래로 옮겼는가
 *
 * 이 파일은 `app/(write)/recipe/[id].tsx` 였다. `(write)` 는 그룹이라 URL 에 나타나지
 * 않으므로 그 경로의 URL 은 `/recipe/{id}` — **v2 상세 화면
 * (`app/recipe/[id]/index.tsx`) 과 완전히 같았다.** 한 URL 에 두 화면이 등록되면 어느
 * 쪽이 열리는지는 라우터의 해석 순서에 달리고, 실제로 목록 카드를 눌렀을 때 상세가
 * 아니라 이 스텁이 열린 적이 있다. 지금은 `/recipe/edit/{id}` 라 겹치지 않는다.
 *
 * 이 충돌은 어떤 테스트도 잡지 못했다 — 두 파일 다 문법적으로 옳고, URL 이 같다는 것은
 * **파일 경로의 성질**이라 렌더 테스트로는 보이지 않는다. 그래서
 * `tests/recipeRouteCollision.test.ts` 가 라우트 트리를 훑어 같은 URL 두 개를 막는다.
 */
export default function RecipeEditScreen() {
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const goBack = useGoBack()

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: s.canvas, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
        >
          <Ionicons name="chevron-back" size={24} color={s.textStrong} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.title, { color: s.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("recipeWrite.editUnavailableTitle")}
        </Text>
        <Text
          style={[styles.description, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {t("recipeWrite.editUnavailableBody")}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: LAYOUT.headerHeight,
    justifyContent: "center",
    paddingHorizontal: LAYOUT.screenX,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  title: { ...TYPE.sectionTitle, fontWeight: "600", textAlign: "center" },
  description: { ...TYPE.caption, lineHeight: 20, textAlign: "center" },
})
