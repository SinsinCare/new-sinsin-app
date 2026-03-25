import React, { useState, useEffect } from "react"
import { StyleSheet, View, ScrollView, Pressable, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { api } from "@/src/services/core/apiClient"

type Gender = "MALE" | "FEMALE" | "OTHER"

const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: "MALE", label: "남성" },
  { key: "FEMALE", label: "여성" },
  { key: "OTHER", label: "기타" },
]

export function ProfileEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const [gender, setGender] = useState<Gender | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile?.gender) setGender(profile.gender)
  }, [profile?.gender])

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await api.patch("/user/profile", {
        nickName: profile?.nickName,
        name: profile?.name,
        ...(gender ? { gender } : {}),
      })
      queryClient.invalidateQueries({ queryKey: ["myPageProfile"] })
      router.back()
    } catch {
      Alert.alert("오류", "저장에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="프로필 수정"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
        rightElement={
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSaving}>
            <ThemedText style={[styles.saveButton, isSaving && { opacity: 0.5 }]}>
              {isSaving ? "저장 중..." : "저장"}
            </ThemedText>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 아바타 */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={36} color="#C5C8CE" />
            </View>
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* 닉네임 - 탭 가능 */}
        <Pressable
          style={({ pressed }) => [
            styles.fieldRow,
            pressed && styles.fieldRowPressed,
          ]}
          onPress={() => router.push("/(settings)/nickname-edit")}
        >
          <View style={styles.fieldContent}>
            <ThemedText style={styles.fieldLabel}>닉네임</ThemedText>
            <View style={styles.fieldValueRow}>
              <ThemedText
                style={[
                  styles.fieldValue,
                  !profile?.nickName && styles.fieldPlaceholder,
                ]}
              >
                {profile?.nickName || "닉네임을 설정해주세요"}
              </ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#C5C8CE" />
            </View>
          </View>
        </Pressable>

        {/* 이름 - 읽기 전용 */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldContent}>
            <ThemedText style={styles.fieldLabel}>이름</ThemedText>
            <ThemedText
              style={[
                styles.fieldValue,
                !profile?.name && styles.fieldPlaceholder,
              ]}
            >
              {profile?.name || "홍길동"}
            </ThemedText>
          </View>
        </View>

        {/* 이메일 - 읽기 전용 */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldContent}>
            <ThemedText style={styles.fieldLabel}>이메일</ThemedText>
            <ThemedText
              style={[
                styles.fieldValue,
                !profile?.email && styles.fieldPlaceholder,
              ]}
            >
              {profile?.email || "abcd@naver.com"}
            </ThemedText>
          </View>
        </View>

        {/* 성별 */}
        <View style={[styles.fieldRow, styles.fieldRowNoBorder]}>
          <View style={styles.fieldContent}>
            <ThemedText style={styles.fieldLabel}>성별</ThemedText>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.genderChip,
                    gender === opt.key && styles.genderChipSelected,
                  ]}
                  onPress={() => setGender(opt.key)}
                >
                  <ThemedText
                    style={[
                      styles.genderChipText,
                      gender === opt.key && styles.genderChipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* 비밀번호 수정 */}
        <Pressable
          style={({ pressed }) => [
            styles.navRow,
            pressed && styles.navRowPressed,
          ]}
          onPress={() => router.push("/(settings)/password-edit")}
        >
          <ThemedText style={styles.navTitle}>비밀번호 수정하기</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#C5C8CE" />
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginHorizontal: -20,
  },
  fieldRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  fieldRowNoBorder: {
    borderBottomWidth: 0,
  },
  fieldRowPressed: {
    backgroundColor: "#FAFAFA",
  },
  fieldContent: {
    paddingVertical: 16,
    gap: 6,
  },
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "#94A3B8",
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: "#17191C",
  },
  fieldPlaceholder: {
    color: "#C5C8CE",
  },
  sectionDivider: {
    height: 12,
    backgroundColor: "#F5F6FA",
    marginHorizontal: -20,
    marginVertical: 0,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  navRowPressed: {
    backgroundColor: "#F9F9F9",
  },
  navTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: "#17191C",
  },
  saveButton: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#44AF94",
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  genderChip: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  genderChipSelected: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.4,
    borderColor: "#44AF94",
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },
  genderChipTextSelected: {
    color: "#0D896A",
  },
})
