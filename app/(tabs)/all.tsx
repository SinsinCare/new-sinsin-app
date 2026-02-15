import React from "react"
import { StyleSheet, View, ScrollView, Pressable, Platform } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  value?: string
  onPress?: () => void
  showChevron?: boolean
}

const MenuItem = ({
  icon,
  title,
  value,
  onPress,
  showChevron = true,
}: MenuItemProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.menuItem,
      pressed && styles.menuItemPressed,
    ]}
    onPress={onPress}
  >
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon} size={22} color="#555" style={styles.menuIcon} />
      <ThemedText style={styles.menuTitle}>{title}</ThemedText>
    </View>
    <View style={styles.menuItemRight}>
      {value && <ThemedText style={styles.menuValue}>{value}</ThemedText>}
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color="#CCC" />
      )}
    </View>
  </Pressable>
)

export default function AllScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={require("@/assets/images/kidney-character.png")}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.profileInfo}>
            <ThemedText style={styles.userName}>신신이</ThemedText>
            <ThemedText style={styles.userEmail}>user@mediology.com</ThemedText>
          </View>
          {/* <Pressable style={styles.editButton}>
            <ThemedText style={styles.editButtonText}>편집</ThemedText>
          </Pressable> */}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>설정</ThemedText>
          <View style={styles.sectionContent}>
            {/* @TODO: Add notifications settings */}
            {/* <MenuItem icon="notifications-outline" title="알림 설정" /> */}
            <MenuItem
              icon="lock-closed-outline"
              title="개인정보 관리"
              onPress={() => router.push("/privacy-settings")}
            />
            <MenuItem
              icon="information-circle-outline"
              title="앱 정보 및 고객센터"
              onPress={() => router.push("/app-info")}
            />
            <MenuItem
              icon="star-outline"
              title="앱 버전"
              value="v1.0.0"
              showChevron={false}
            />
          </View>
        </View>

        {/* Support Section - @TODO: Add support */}
        {/* <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>지원</ThemedText>
          <View style={styles.sectionContent}>
            <MenuItem icon="globe-outline" title="웹사이트" />
            <MenuItem icon="chatbubble-ellipses-outline" title="고객 지원" />
          </View>
        </View> */}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F0F0",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  userEmail: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
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
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuValue: {
    fontSize: 14,
    color: "#AAA",
    marginRight: 8,
  },
})
