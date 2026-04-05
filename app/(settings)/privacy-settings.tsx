import React from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  useColorScheme,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"

function usePrivacyColors() {
  const isDark = useColorScheme() === "dark"
  return {
    bg: isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val,
    cardBg: isDark ? tokens.color.cardBgDark.val : "#FFF",
    text: isDark ? tokens.color.textDark.val : "#333",
    textSub: isDark ? tokens.color.textDarkSub.val : "#999",
    headerText: isDark ? tokens.color.textDark.val : "#111",
    icon: isDark ? tokens.color.textDarkSub.val : "#555",
    iconChevron: isDark ? "#6B7280" : "#CCC",
    iconBack: isDark ? tokens.color.textDarkSub.val : "#333",
    border: isDark ? tokens.color.borderDark.val : "#F0F0F0",
    pressedBg: isDark ? "#2A2A32" : "#F9F9F9",
  }
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  onPress?: () => void
  showChevron?: boolean
  danger?: boolean
  colors: ReturnType<typeof usePrivacyColors>
}

const MenuItem = ({
  icon,
  title,
  onPress,
  showChevron = true,
  danger = false,
  colors,
}: MenuItemProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.menuItem,
      { borderBottomColor: colors.border },
      pressed && { backgroundColor: colors.pressedBg },
    ]}
    onPress={onPress}
  >
    <View style={styles.menuItemLeft}>
      <Ionicons
        name={icon}
        size={22}
        color={danger ? tokens.color.restrictionText.val : colors.icon}
        style={styles.menuIcon}
      />
      <ThemedText
        style={[styles.menuTitle, { color: danger ? tokens.color.restrictionText.val : colors.text }]}
      >
        {title}
      </ThemedText>
    </View>
    <View style={styles.menuItemRight}>
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color={colors.iconChevron} />
      )}
    </View>
  </Pressable>
)

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = usePrivacyColors()

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={c.iconBack} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: c.headerText }]}>
          개인정보 관리
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Terms & Policies Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            약관 및 정책
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: c.cardBg }]}>
            <MenuItem
              icon="document-text-outline"
              title="개인정보 처리방침"
              onPress={() => router.push("/legal-document?type=privacy-policy")}
              colors={c}
            />
            <MenuItem
              icon="reader-outline"
              title="서비스 이용약관"
              onPress={() => router.push("/legal-document?type=terms-of-use")}
              colors={c}
            />
          </View>
        </View>

        {/* Account Management Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            계정 관리
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: c.cardBg }]}>
            <MenuItem
              icon="trash-outline"
              title="계정 삭제"
              danger
              onPress={() =>
                Alert.alert(
                  "계정 삭제",
                  "계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다. 정말 삭제하시겠습니까?",
                  [
                    { text: "취소", style: "cancel" },
                    { text: "삭제", style: "destructive" },
                  ],
                )
              }
              colors={c}
            />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionContent: {
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    width: 24,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
})
