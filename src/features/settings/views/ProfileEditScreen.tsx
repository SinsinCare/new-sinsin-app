import React, { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { useKidneyProfile } from "@/src/features/settings/hooks/useKidneyProfile"
import { api } from "@/src/services/core/apiClient"
import { weightEdemaService } from "@/src/services/data/weightEdemaService"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

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
  const { data: kidneyProfile } = useKidneyProfile()
  const c = useSettingsColors()

  const [gender, setGender] = useState<Gender | null>(null)
  const [weightVal, setWeightVal] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.gender) setGender(profile.gender)
  }, [profile?.gender])

  useEffect(() => {
    if (kidneyProfile?.weightKg != null) {
      setWeightVal(String(kidneyProfile.weightKg))
    }
  }, [kidneyProfile])

  const handlePickProfileImage = () => {
    Alert.alert("프로필 사진", "사진을 선택하세요", [
      {
        text: "카메라",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== "granted") {
            Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다.")
            return
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
          if (!result.canceled && result.assets[0]) {
            setProfileImageUri(result.assets[0].uri)
          }
        },
      },
      {
        text: "갤러리",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (status !== "granted") {
            Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.")
            return
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
          if (!result.canceled && result.assets[0]) {
            setProfileImageUri(result.assets[0].uri)
          }
        },
      },
      { text: "취소", style: "cancel" },
    ])
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (profileImageUri) {
        const formData = new FormData()
        formData.append("image", {
          uri: profileImageUri,
          name: "profile.jpg",
          type: "image/jpeg",
        } as unknown as Blob)
        await api.patch("/user/profile/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }

      if (profile && gender) {
        await api.patch("/user/profile", {
          nickName: profile.nickName,
          name: profile.name,
          gender,
        })
      }

      const weight = parseFloat(weightVal)
      if (!isNaN(weight) && weight > 0) {
        const today = new Date().toISOString().split("T")[0]
        await weightEdemaService.updateWeight(weight, today)
      }

      queryClient.invalidateQueries({ queryKey: ["myPageProfile"] })
      queryClient.invalidateQueries({ queryKey: ["kidneyProfile"] })
      router.back()
    } catch {
      Alert.alert("오류", "저장에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  const greenTintBg = c.isDark ? "#1A3A2E" : "#F0FDF4"

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="프로필 수정"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
        rightElement={
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSaving}>
            <ThemedText
              style={[styles.saveButton, isSaving && { opacity: 0.5 }]}
            >
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
        keyboardShouldPersistTaps="handled"
      >
        {/* 아바타 */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrapper} onPress={handlePickProfileImage}>
            {profileImageUri || profile?.profileImage ? (
              <Image
                source={{ uri: profileImageUri ?? profile?.profileImage }}
                style={styles.avatarCircle}
              />
            ) : (
              <View
                style={[styles.avatarCircle, { backgroundColor: c.avatarBg }]}
              >
                <Ionicons name="person" size={36} color={c.textTertiary} />
              </View>
            )}
            <View style={[styles.cameraButton, { borderColor: c.bg }]}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: c.inputBg }]} />

        {/* 닉네임 */}
        <Pressable
          style={({ pressed }) => [
            styles.fieldRow,
            { borderBottomColor: c.inputBg },
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/nickname-edit")}
        >
          <View style={styles.fieldContent}>
            <ThemedText style={[styles.fieldLabel, { color: c.textMuted }]}>
              닉네임
            </ThemedText>
            <View style={styles.fieldValueRow}>
              <ThemedText
                style={[
                  styles.fieldValue,
                  { color: c.text },
                  !profile?.nickName && { color: c.textTertiary },
                ]}
              >
                {profile?.nickName || "닉네임을 설정해주세요"}
              </ThemedText>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={c.textTertiary}
              />
            </View>
          </View>
        </Pressable>

        {/* 이름 */}
        <View style={[styles.fieldRow, { borderBottomColor: c.inputBg }]}>
          <View style={styles.fieldContent}>
            <ThemedText style={[styles.fieldLabel, { color: c.textMuted }]}>
              이름
            </ThemedText>
            <ThemedText
              style={[
                styles.fieldValue,
                { color: c.text },
                !profile?.name && { color: c.textTertiary },
              ]}
            >
              {profile?.name || "홍길동"}
            </ThemedText>
          </View>
        </View>

        {/* 이메일 */}
        <View style={[styles.fieldRow, { borderBottomColor: c.inputBg }]}>
          <View style={styles.fieldContent}>
            <ThemedText style={[styles.fieldLabel, { color: c.textMuted }]}>
              이메일
            </ThemedText>
            <ThemedText
              style={[
                styles.fieldValue,
                { color: c.text },
                !profile?.email && { color: c.textTertiary },
              ]}
            >
              {profile?.email || "abcd@naver.com"}
            </ThemedText>
          </View>
        </View>

        {/* 성별 */}
        <View style={[styles.fieldRow, styles.fieldRowNoBorder]}>
          <View style={styles.fieldContent}>
            <ThemedText style={[styles.fieldLabel, { color: c.textMuted }]}>
              성별
            </ThemedText>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.genderChip,
                    { borderColor: c.border },
                    gender === opt.key && {
                      backgroundColor: greenTintBg,
                      borderWidth: 1.4,
                      borderColor: tokens.color.sub6.val,
                    },
                  ]}
                  onPress={() => setGender(opt.key)}
                >
                  <ThemedText
                    style={[
                      styles.genderChipText,
                      { color: c.text },
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

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 체중 */}
        <View style={styles.fieldContent}>
          <ThemedText style={[styles.fieldLabel, { color: c.textMuted }]}>
            체중 (kg)
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                marginTop: 8,
                borderColor: c.border,
                color: c.text,
                backgroundColor: c.bg,
              },
            ]}
            value={weightVal}
            onChangeText={setWeightVal}
            keyboardType="decimal-pad"
            placeholder="체중 입력"
            placeholderTextColor={c.textTertiary}
          />
        </View>

        <View
          style={[styles.sectionDivider, { backgroundColor: c.secondaryBg }]}
        />

        {/* 비밀번호 수정 */}
        <Pressable
          style={({ pressed }) => [
            styles.navRow,
            { borderBottomColor: c.inputBg },
            pressed && { backgroundColor: c.pressedBg },
          ]}
          onPress={() => router.push("/(settings)/password-edit")}
        >
          <ThemedText style={[styles.navTitle, { color: c.text }]}>
            비밀번호 수정하기
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
  },
  divider: {
    height: 1,
    marginHorizontal: -20,
  },
  fieldRow: {
    borderBottomWidth: 1,
  },
  fieldRowNoBorder: {
    borderBottomWidth: 0,
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
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
  },
  sectionDivider: {
    height: 12,
    marginHorizontal: -20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  navTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
  },
  saveButton: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: tokens.color.sub6.val,
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
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  genderChipTextSelected: {
    color: tokens.color.sub8.val,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
})
