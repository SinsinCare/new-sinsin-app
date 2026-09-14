import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useLocalSearchParams, type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { V2Text } from "@/src/design-system-v2"
import { typography, spacing } from "@/src/design-system-v2/tokens"
import { useSurface } from "@/src/hooks/useSurface"
import { useAppRouter } from "@/src/shared/navigation"
import {
  HeaderIconButton,
  headerActionRowRoom,
} from "@/src/shared/components"
import { FreePostTab } from "../components/FreePostTab"
import { CommunityWriteButton } from "../components/community/CommunityWriteButton"
import { COMMUNITY_GUTTER } from "../components/community/communityLayout"

export function CommunityScreen() {
  const { t } = useTranslation("common")
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const params = useLocalSearchParams<{ tag?: string }>()
  const [tagFilter, setTagFilter] = useState<string | null>(params.tag || null)
  useEffect(() => {
    if (typeof params.tag === "string") setTagFilter(params.tag || null)
  }, [params.tag])
  return (
    <View style={[styles.screen, { backgroundColor: s.canvas }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[8] }]}>
        <V2Text style={typography.title.medium} color={s.textStrong}>
          {t("community.title")}
        </V2Text>
        <View style={styles.actions}>
          <HeaderIconButton
            onPress={() => router.push("/community/search" as Href)}
            accessibilityLabel={t("community.refresh.search")}
          >
            <Ionicons name="search-outline" size={24} color={s.textStrong} />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={() =>
              router.push({
                pathname: "/community-library",
                params: { tab: "bookmarked" },
              } as Href)
            }
            accessibilityLabel={t("community.bookmarks")}
          >
            <Ionicons name="bookmark-outline" size={22} color={s.textStrong} />
          </HeaderIconButton>
          <HeaderIconButton
            onPress={() => router.push("/community-library" as Href)}
            accessibilityLabel={t("community.myActivity")}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={s.textStrong}
            />
          </HeaderIconButton>
        </View>
      </View>
      <FreePostTab
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        contentBottomPadding={160}
      />
      <CommunityWriteButton />
    </View>
  )
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: COMMUNITY_GUTTER,
    paddingBottom: spacing[8],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[20],
    // 규격 터치 상자(44/48)가 이 행 안쪽에 들어오게 자리를 만든다 — 안드로이드는 부모
    // 경계 밖 터치를 자식에게 안 준다(`headerActionRowRoom` 머리말).
    ...headerActionRowRoom(24),
  },
})
