import React from "react"
import { StyleSheet, View, ScrollView, Pressable, Platform, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  onPress?: () => void
  showChevron?: boolean
  danger?: boolean
}

const MenuItem = ({
  icon,
  title,
  onPress,
  showChevron = true,
  danger = false,
}: MenuItemProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.menuItem,
      pressed && styles.menuItemPressed,
    ]}
    onPress={onPress}
  >
    <View style={styles.menuItemLeft}>
      <Ionicons
        name={icon}
        size={22}
        color={danger ? "#E53E3E" : "#555"}
        style={styles.menuIcon}
      />
      <ThemedText style={[styles.menuTitle, danger && styles.menuTitleDanger]}>
        {title}
      </ThemedText>
    </View>
    <View style={styles.menuItemRight}>
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color="#CCC" />
      )}
    </View>
  </Pressable>
)

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>개인정보 관리</ThemedText>
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
          <ThemedText style={styles.sectionTitle}>약관 및 정책</ThemedText>
          <View style={styles.sectionContent}>
            <MenuItem
              icon="document-text-outline"
              title="개인정보 처리방침"
              onPress={() => router.push("/legal-document?type=privacy-policy")}
            />
            <MenuItem
              icon="reader-outline"
              title="서비스 이용약관"
              onPress={() => router.push("/legal-document?type=terms-of-use")}
            />
          </View>
        </View>

        {/* Account Management Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>계정 관리</ThemedText>
          <View style={styles.sectionContent}>
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
    backgroundColor: "#F8F9FA",
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
    color: "#111",
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
    color: "#999",
    marginLeft: 4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionContent: {
    backgroundColor: "#FFF",
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
    borderBottomColor: "#F0F0F0",
  },
  menuItemPressed: {
    backgroundColor: "#F9F9F9",
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
    color: "#333",
  },
  menuTitleDanger: {
    color: "#E53E3E",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
})
