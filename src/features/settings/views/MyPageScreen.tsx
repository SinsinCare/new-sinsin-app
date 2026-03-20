import React from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { KidneyProfileCard } from "@/src/features/settings/components"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"

export function MyPageScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: profile } = useMyPageProfile()
  const { data: kidneyProfile } = useKidneyProfile()
  const age = profile?.birthYear
    ? new Date().getFullYear() - profile.birthYear
    : null
  const ageGenderLabel = age ? `${age}세` : null

  return (
    <ThemedView style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <ThemedText style={styles.headerTitle}>마이페이지</ThemedText>
        <Pressable onPress={() => router.push("/(settings)")} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color="#555" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 행 */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#C5C8CE" />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.userName}>
              {profile?.nickName ?? "사용자"}
            </ThemedText>
            {ageGenderLabel && (
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>
                  {ageGenderLabel}
                </ThemedText>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(settings)/profile-edit")}
            style={styles.editButton}
          >
            <ThemedText style={styles.editButtonText}>프로필 수정</ThemedText>
          </Pressable>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 신장 프로필 영역 */}
        {!kidneyProfile ? (
          <Pressable
            style={styles.kidneyEmptyButton}
            onPress={() => router.push("/(settings)/kidney-profile-edit")}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#FFFFFF" />
            <ThemedText style={styles.kidneyEmptyButtonText}>
              신장 건강 정보를 입력해주세요
            </ThemedText>
          </Pressable>
        ) : (
          <KidneyProfileCard
            ckdStageLabel={kidneyProfile.ckdStageLabel}
            isDialysis={kidneyProfile.isDialysis}
            weightKg={kidneyProfile.weightKg}
            diagnosisDate={kidneyProfile.weightRecordedAt}
            onEditPress={() => router.push("/(settings)/kidney-profile-edit")}
          />
        )}

        {/* 전체 너비 구분선 */}
        <View style={styles.fullWidthDivider} />

        {/* 메뉴 버튼 */}
        {[
          {
            icon: "clipboard-outline" as const,
            title: "건강검진 데이터 불러오고 분석하기",
            onPress: () => router.push("/(settings)/health-data"),
          },
          {
            icon: "share-outline" as const,
            title: "나의 데이터 공유하기",
            onPress: () => {},
          },
          {
            icon: "megaphone-outline" as const,
            title: "공지사항",
            onPress: () => router.push("/(settings)/announcements"),
          },
          {
            icon: "chatbubble-outline" as const,
            title: "1:1 문의",
            onPress: () => router.push("/(settings)/inquiry"),
          },
          {
            icon: "book-outline" as const,
            title: "의료 참고 문헌",
            onPress: () => router.push("/(settings)/medical-reference"),
          },
        ].map(({ icon, title, onPress }) => (
          <Pressable
            key={title}
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.navButtonPressed,
            ]}
            onPress={onPress}
          >
            <Ionicons name={icon} size={24} color="#474758" />
            <ThemedText style={styles.navButtonText}>{title}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#C4C4C4" />
          </Pressable>
        ))}

        {/* 구분선 */}
        <View style={styles.fullWidthDivider} />

        {/* 의사에게 질문하기 */}
        <Pressable
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.navButtonPressed,
          ]}
          onPress={() => router.push("/(settings)/ask-doctor")}
        >
          <Ionicons name="medkit-outline" size={24} color="#474758" />
          <ThemedText style={styles.navButtonText}>의사 연결하기</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#C4C4C4" />
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  userName: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: "#111",
  },
  infoLabel: {
    backgroundColor: "#44AF9429",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  infoLabelText: {
    fontSize: 13,
    color: "#2E7D6B",
    fontWeight: "500",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
  },
  divider: {
    height: 1,
    backgroundColor: "#DADFE699",
    marginBottom: 20,
  },
  kidneyEmptyButton: {
    height: 56,
    backgroundColor: "#34D399",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  kidneyEmptyButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  fullWidthDivider: {
    height: 12,
    backgroundColor: "#F5F6FA",
    marginHorizontal: -20,
    marginBottom: 4,
  },
  navButton: {
    height: 64,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButtonPressed: {
    backgroundColor: "#F9F9F9",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  navButtonText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: "#1F2937",
  },
  section: {
    marginBottom: 24,
  },
  sectionContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  logoutText: {
    color: "#F82F08",
  },
})
