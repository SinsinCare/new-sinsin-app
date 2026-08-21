import { useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { RecipeWriteScreen } from "@/src/features/recipe/views/RecipeWriteScreen"
import {
  canEditFrom,
  recipeDetailToWriteForm,
} from "@/src/features/recipe/components/write/writeFormState"
import {
  recipeV2Keys,
  useRecipeLocale,
} from "@/src/features/recipe/hooks/useRecipeDetailV2"
import { recipeDetailV2Service } from "@/src/features/recipe/services/recipeDetailV2Service"

/**
 * 레시피 수정 — 계약 §3.8.
 *
 * 예전에는 "수정 엔드포인트가 없다" 고 말하는 스텁이었다. 서버에 `PUT /recipes/{id}`
 * 가 생기면서 **작성 화면을 그대로 재사용한다** — 폼·검증·제출 바가 전부 같고
 * 보내는 곳만 다르다. 두 화면을 따로 만들면 상한과 문구가 서서히 갈라진다.
 *
 * ## 못 고치는 경우를 조용히 넘기지 않는다
 * 세 가지가 있고 셋 다 **다른 문장**을 보여 준다(`predictable-ux-over-fallbacks`):
 *  - 못 불러왔다 → 다시 시도해 달라고 한다.
 *  - 남의 것 · 추천 레시피 → 왜 못 고치는지 말한다. 서버도 403 으로 막는다.
 *  - 내 것이라는데 원본 태그가 없다 → 계약이 어긋난 것이다. 폼을 열면 태그가
 *    통째로 지워지므로 **열지 않는다**(`canEditFrom`).
 *
 * ## 왜 `edit/` 아래인가
 * 이 파일은 `app/(write)/recipe/[id].tsx` 였다. `(write)` 는 그룹이라 URL 에 안 나타나서
 * 그 경로의 URL 이 v2 상세(`app/recipe/[id]/index.tsx`)와 **완전히 같았고**, 목록 카드를
 * 눌렀을 때 상세 대신 이 화면이 열린 적이 있다. `tests/recipeRouteCollision.test.ts` 가
 * 지금은 같은 URL 두 개를 막는다.
 */
export default function RecipeEditScreen() {
  const { t } = useTranslation("recipe")
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const goBack = useGoBack()
  const locale = useRecipeLocale()

  const params = useLocalSearchParams<{ id?: string }>()
  const recipeId = Number(params.id)
  const validId = Number.isInteger(recipeId) && recipeId > 0

  /*
    상세 화면과 **같은 캐시 키**를 쓴다 — 상세에서 들어오면 즉시 채워진 채로 열린다.
    `useRecipeDetailV2` 를 쓰지 않는 이유는 그 훅이 조회 기록(`POST …/views`)을
    보내기 때문이다. 고치러 들어온 것은 본 것이 아니다.
  */
  const query = useQuery({
    queryKey: recipeV2Keys.detail(locale, validId ? recipeId : -1),
    queryFn: () => recipeDetailV2Service.getRecipeDetail(recipeId, locale),
    enabled: validId,
  })

  const detail = query.data ?? null
  const initialForm = useMemo(
    () => (detail !== null && canEditFrom(detail) ? recipeDetailToWriteForm(detail) : null),
    [detail],
  )

  if (initialForm !== null && detail !== null) {
    return (
      <RecipeWriteScreen
        onClose={goBack}
        recipeId={detail.id}
        initialForm={initialForm}
      />
    )
  }

  const message = !validId || query.isError
    ? { title: t("recipeWrite.editLoadFailedTitle"), body: t("recipeWrite.editLoadFailedBody") }
    : query.isLoading
      ? null
      : { title: t("recipeWrite.editNotMineTitle"), body: t("recipeWrite.editNotMineBody") }

  return (
    <View
      style={[styles.screen, { backgroundColor: s.canvas, paddingTop: insets.top }]}
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
      {message === null ? (
        /*
          링 스피너를 쓰지 않는다(`sinsin-loading-system`). 폼이 들어올 자리를
          같은 리듬의 스켈레톤으로 미리 그려 두면 화면이 튀지 않는다.
        */
        <View style={styles.skeleton}>
          {[64, 64, 96, 48].map((height, index) => (
            <View
              key={index}
              style={[styles.block, { height, backgroundColor: s.surfaceSunken }]}
            />
          ))}
        </View>
      ) : (
        <View style={styles.body}>
          <Text
            style={[styles.title, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {message.title}
          </Text>
          <Text
            style={[styles.description, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {message.body}
          </Text>
        </View>
      )}
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
  skeleton: { paddingHorizontal: LAYOUT.screenX, gap: 20 },
  block: { borderRadius: 12 },
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
