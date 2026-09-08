import { useCallback, useRef } from "react"
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import Constants from "expo-constants"
import { setStatusBarStyle } from "expo-status-bar"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/shared/components/AppText"
import {
  isAtScrollTop,
  useAppRouter,
  useRegisterTabReset,
} from "@/src/shared/navigation"
import { typography } from "@/src/design-system-v2/tokens"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { floatingAiButtonScrollInset } from "@/src/shared/components/floatingAiButtonLayout"
import { CONTENT_BREATHING_ROOM } from "@/src/shared/utils/bottomSafeArea"
import { getBackendBadge } from "@/src/config/appConfig"
import { useMyPageProfile } from "../hooks/useMyPageProfile"
import { useKidneyProfile } from "../hooks/useKidneyProfile"
import { AccountRow } from "../components/AccountPrimitives"
import { AccountMembershipCard } from "../components/AccountMembershipCard"
import { AccountHealthSummary } from "../components/AccountHealthSummary"

export function MyPageScreen() {
  const { t } = useTranslation("common")
  const { t: copy } = useTranslation("settings")
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { colors, mode } = useV2Theme()
  const profileQuery = useMyPageProfile()
  const { data: profile, refetch } = profileQuery
  const kidneyQuery = useKidneyProfile()
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(mode === "dark" ? "light" : "dark")
      void refetch()
    }, [refetch, mode]),
  )
  const scrollRef = useRef<ScrollView>(null)
  const scrollOffsetRef = useRef(0)
  useRegisterTabReset("all", {
    content: {
      isAtRoot: () => isAtScrollTop(scrollOffsetRef.current),
      reset: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    },
  })
  const backendBadge = getBackendBadge()

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            mode === "dark"
              ? colors.background.default
              : colors.background.lower,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
            backgroundColor: colors.background.default,
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: colors.label.normal }]}
        >
          {t("myPage.title")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("myPage.openSettings")}
          onPress={() => router.push("/(settings)")}
          style={({ pressed }) => [
            styles.settings,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={colors.label.normal}
          />
          <Text style={[styles.settingsLabel, { color: colors.label.normal }]}>
            {t("settings.title")}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y
        }}
        contentContainerStyle={{
          paddingBottom: floatingAiButtonScrollInset(
            insets.bottom,
            CONTENT_BREATHING_ROOM,
          ),
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("myPage.editProfile")}
          onPress={() => router.push("/(settings)/profile-edit")}
          style={({ pressed }) => [
            styles.identity,
            {
              backgroundColor: colors.background.default,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          {profile?.profileImage ? (
            <Image
              source={{ uri: profile.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[styles.avatar, { backgroundColor: colors.fill.normal }]}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={colors.label.neutral}
              />
            </View>
          )}
          <View style={styles.identityCopy}>
            <Text
              numberOfLines={2}
              style={[styles.name, { color: colors.label.normal }]}
            >
              {profile?.nickName ??
                copy(
                  profileQuery.isPending
                    ? "accountOverview.loading"
                    : "accountOverview.profile",
                )}
            </Text>
            <Text style={[styles.subtitle, { color: colors.label.neutral }]}>
              {t("myPage.editProfile")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.label.alternative}
          />
        </Pressable>
        {profileQuery.isError && !profile && (
          <AccountRow
            title={copy("accountOverview.profileError")}
            value={copy("accountOverview.retry")}
            onPress={() => void refetch()}
          />
        )}
        <AccountHealthSummary
          profile={kidneyQuery.data}
          pending={kidneyQuery.isPending}
          failed={kidneyQuery.isError}
          onEdit={() => router.push("/(settings)/kidney-profile-edit")}
          onRetry={() => void kidneyQuery.refetch()}
        />
        <AccountMembershipCard />
        <View
          style={[
            styles.support,
            {
              backgroundColor:
                mode === "dark"
                  ? colors.background.lower
                  : colors.background.default,
            },
          ]}
        >
          <View>
            <Text
              style={[styles.supportTitle, { color: colors.label.neutral }]}
            >
              {t("myPage.support")}
            </Text>
            <AccountRow
              icon="megaphone-outline"
              title={t("myPage.menu.announcements")}
              onPress={() => router.push("/(settings)/announcements")}
            />
            <AccountRow
              icon="chatbubble-outline"
              title={t("myPage.menu.inquiry")}
              onPress={() => router.push("/(settings)/inquiry")}
            />
            <AccountRow
              icon="book-outline"
              title={t("myPage.menu.references")}
              onPress={() => router.push("/(settings)/medical-reference")}
            />
          </View>
        </View>
        {Constants.expoConfig?.version && (
          <Text style={[styles.version, { color: colors.label.neutral }]}>
            {t("brand.name")} {Constants.expoConfig.version}
            {backendBadge ? ` · ${backendBadge}` : ""}
          </Text>
        )}
      </ScrollView>
    </View>
  )
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: { ...typography.title.small },
  settings: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    minHeight: 44,
    paddingLeft: 12,
  },
  settingsLabel: { ...typography.subtext.mediumStrong },
  supportTitle: {
    ...typography.subtext.mediumStrong,
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 4,
  },
  support: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 6,
  },
  identity: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: { flex: 1, gap: 6 },
  name: { ...typography.title.xSmallWeak },
  subtitle: { ...typography.subtext.small },
  version: {
    ...typography.subtext.small,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
})
