import React, { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Image,
  LayoutAnimation,
  Text,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { authenticatedFetch } from "@/src/services/core/authenticatedFetch"
import { getBackendUrl } from "@/src/config/appConfig"
import i18n from "@/src/i18n"
import { presentError } from "@/src/lib/errorMessage"
import { showOpenSettingsAlert } from "@/src/features/settings/utils/openAppSettings"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { tokens } from "@/src/theme/tokens"
import { prepareImageUpload } from "@/src/shared/utils/preparedImageUpload"

import { showActionSheet } from "@/src/lib/dialog"
type Gender = "MALE" | "FEMALE" | "OTHER"
type ProfileImageSelection = {
  uri: string
  name: string
  type: string
}

type ProfileImageUploadResponse = {
  isSuccess?: boolean
  code?: string
  message?: string
}

const GENDER_OPTIONS = [
  { key: "MALE", labelKey: "profile.gender.male" },
  { key: "FEMALE", labelKey: "profile.gender.female" },
  { key: "OTHER", labelKey: "profile.gender.other" },
] as const satisfies readonly { key: Gender; labelKey: string }[]

function toProfileImageSelection(
  asset: ImagePicker.ImagePickerAsset,
): ProfileImageSelection {
  const type = asset.mimeType === "image/png" ? "image/png" : "image/jpeg"
  const extension = type === "image/png" ? "png" : "jpg"
  return {
    uri: asset.uri,
    name: asset.fileName || `profile_${Date.now()}.${extension}`,
    type,
  }
}

async function uploadProfileImage(image: ProfileImageSelection) {
  const prepared = await prepareImageUpload(image.uri, {
    width: 1024,
    compress: 0.8,
    cachePrefix: "profile_tmp",
  })
  try {
    const response = await authenticatedFetch(
      `${getBackendUrl()}/user/profile/image`,
      () => {
        const formData = new FormData()
        formData.append("image", {
          uri: prepared.uri,
          name: `profile_${Date.now()}.jpg`,
          type: "image/jpeg",
        } as unknown as Blob)
        return {
          method: "PATCH",
          headers: { Accept: "application/json" },
          body: formData as unknown as RequestInit["body"],
        }
      },
      { timeoutMs: 60_000 },
    )

    let json: ProfileImageUploadResponse | null = null
    try {
      json = (await response.json()) as ProfileImageUploadResponse
    } catch {
      // JSON이 아닌 응답은 상태코드 기반 오류로 처리한다.
    }

    if (!response.ok || json?.isSuccess === false) {
      throw new ApiError(
        json?.message || i18n.t("profile.uploadError", { ns: "settings" }),
        json?.code || `HTTP_${response.status}`,
        response.status,
      )
    }
  } finally {
    await prepared.cleanup()
  }
}

export function ProfileEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const s = useSurface()
  const { t } = useTranslation("settings")

  const [gender, setGender] = useState<Gender | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [profileImage, setProfileImage] =
    useState<ProfileImageSelection | null>(null)
  const genderTouchedRef = useRef(false)

  useEffect(() => {
    if (!genderTouchedRef.current && profile?.gender) setGender(profile.gender)
  }, [profile?.gender])

  // 이 화면에서 직접 저장하는 건 사진·성별뿐이다. 바뀐 게 있을 때만
  // 하단 CTA 가 나타난다 — 저장할 게 없는데 저장 버튼이 떠 있지 않게.
  const isDirty =
    profileImage !== null || (gender !== null && gender !== profile?.gender)

  const handleSelectGender = (nextGender: Gender) => {
    genderTouchedRef.current = true
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setGender(nextGender)
  }

  const handlePickProfileImage = async () => {
    const picked = await showActionSheet({
      title: t("profile.photo.change"),
      description: t("profile.photo.sourcePrompt"),
      actions: [
        { label: t("profile.photo.take") },
        { label: t("profile.photo.choose") },
      ],
      cancelLabel: t("shared.cancel"),
    })
    if (picked == null) return

    const fromCamera = picked === 0
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      await showOpenSettingsAlert(
        t(
          fromCamera
            ? "profile.photo.cameraPermissionTitle"
            : "profile.photo.libraryPermissionTitle",
        ),
        t(
          fromCamera
            ? "profile.photo.cameraPermissionBody"
            : "profile.photo.libraryPermissionBody",
        ),
      )
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
    if (!result.canceled && result.assets[0]) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setProfileImage(toProfileImageSelection(result.assets[0]))
    }
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (profileImage) {
        await uploadProfileImage(profileImage)
      }

      if (profile && gender) {
        const { data } = await api.patch("/user/profile", {
          nickName: profile.nickName,
          name: profile.name,
          gender,
        })
        const updatedProfile = data.result
        queryClient.setQueryData(["myPageProfile"], {
          ...profile,
          ...updatedProfile,
          gender,
        })
      }

      await queryClient.refetchQueries({ queryKey: ["myPageProfile"] })
      router.back()
    } catch (error) {
      // 사진 업로드와 성별 저장이 한 흐름이라 실패 원인이 서로 다르다(용량 초과·
      // 형식 거절·세션 만료). 화면이 "프로필을 저장하지 못했어요" 로 덮으면 어느 쪽이
      // 문제였는지 사라진다 — 서버 코드가 말하게 두고 재시도만 붙인다.
      presentError(error, {
        scope: "profile-save",
        retry: () => void handleSave(),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const pageBg = s.isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <ScreenHeader
        title={t("profile.title")}
        paddingTop={insets.top + 8}
        onBack={router.back}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (isDirty ? 120 : 40) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 아바타 — 화면의 유일한 오브젝트로 먼저 선다 */}
        <View style={styles.avatarSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("profile.photo.change")}
            style={({ pressed }) => [
              styles.avatarWrapper,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={handlePickProfileImage}
          >
            {profileImage || profile?.profileImage ? (
              <Image
                source={{ uri: profileImage?.uri ?? profile?.profileImage }}
                style={styles.avatarCircle}
              />
            ) : (
              <View
                style={[styles.avatarCircle, { backgroundColor: s.surface }]}
              >
                <Ionicons name="person" size={38} color={s.textWeak} />
              </View>
            )}
            <View
              style={[
                styles.cameraButton,
                { backgroundColor: s.brand, borderColor: pageBg },
              ]}
            >
              <Ionicons name="camera" size={13} color={s.onBrand} />
            </View>
          </Pressable>
          <Text
            style={[styles.avatarHint, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("profile.photo.hint")}
          </Text>
        </View>

        {/* 내 정보 — 한 줄 행: 라벨은 왼쪽, 값은 오른쪽 */}
        <Text
          style={[styles.groupTitle, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("profile.section.personal")}
        </Text>
        <View style={[styles.card, { backgroundColor: s.card }]}>
          <FieldRow
            label={t("profile.field.nickname")}
            value={profile?.nickName || t("shared.add")}
            empty={!profile?.nickName}
            onPress={() => router.push("/(settings)/nickname-edit")}
            s={s}
          />
          <FieldRow
            label={t("profile.field.name")}
            value={profile?.name || t("shared.add")}
            empty={!profile?.name}
            onPress={() => router.push("/(settings)/name-edit" as never)}
            s={s}
            divider
          />
          <FieldRow
            label={t("profile.field.phone")}
            value={
              profile?.hasPhoneNumber
                ? profile.phoneNumberMasked || t("shared.registered")
                : t("profile.phone.add")
            }
            empty={!profile?.hasPhoneNumber}
            onPress={() =>
              router.push("/(settings)/phone-number-edit" as never)
            }
            s={s}
            divider
          />
          {/* 이메일은 로그인 수단이라 여기서 못 바꾼다 — 눌리는 척하지 않는다 */}
          <View
            style={[
              styles.row,
              styles.rowDivider,
              { borderTopColor: s.hairline },
            ]}
          >
            <Text style={[styles.rowLabel, { color: s.text }]}>
              {t("profile.field.email")}
            </Text>
            <Text
              style={[styles.rowValue, { color: s.textMuted }]}
              numberOfLines={1}
            >
              {profile?.email || t("profile.emailMissing")}
            </Text>
          </View>
          {/* 성별 — 선택지가 3개뿐이라 페이지로 보내지 않고 그 자리에서 고른다 */}
          <View
            style={[
              styles.row,
              styles.rowDivider,
              styles.genderRow,
              { borderTopColor: s.hairline },
            ]}
          >
            <Text style={[styles.rowLabel, { color: s.text }]}>
              {t("profile.field.gender")}
            </Text>
            <View style={styles.genderChips}>
              {GENDER_OPTIONS.map((opt) => {
                const selected = gender === opt.key
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectGender(opt.key)}
                    style={({ pressed }) => [
                      styles.genderChip,
                      {
                        backgroundColor: selected
                          ? s.surfaceBrand
                          : pressed
                            ? s.surfacePressed
                            : s.surface,
                        borderColor: selected ? s.brand : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        { color: selected ? s.brand : s.text },
                        selected && styles.genderChipTextSelected,
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>

        {/* 보안 */}
        <Text
          style={[styles.groupTitle, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("profile.section.security")}
        </Text>
        <View style={[styles.card, { backgroundColor: s.card }]}>
          <FieldRow
            label={t("profile.field.password")}
            value={t("profile.changePassword")}
            empty
            onPress={() => router.push("/(settings)/password-edit")}
            s={s}
          />
        </View>
      </ScrollView>

      {/* 바뀐 게 있을 때만 나타나는 저장 CTA */}
      {isDirty && (
        <View
          style={[
            styles.ctaBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: pageBg,
            },
          ]}
        >
          <SurfacePressable
            onPress={handleSave}
            disabled={isSaving}
            accessibilityLabel={t("profile.saveAccessibility")}
            baseColor={s.brand}
            pressedColor={s.brand}
            style={[styles.cta, isSaving && { opacity: 0.6 }]}
          >
            <Text style={[styles.ctaText, { color: s.onBrand }]}>
              {isSaving ? t("shared.saving") : t("profile.save")}
            </Text>
          </SurfacePressable>
        </View>
      )}
    </ThemedView>
  )
}

function FieldRow({
  label,
  value,
  empty = false,
  divider = false,
  onPress,
  s,
}: {
  label: string
  value: string
  empty?: boolean
  divider?: boolean
  onPress: () => void
  s: ReturnType<typeof useSurface>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && [styles.rowDivider, { borderTopColor: s.hairline }],
        pressed && { backgroundColor: s.surfacePressed },
      ]}
    >
      <Text style={[styles.rowLabel, { color: s.text }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text
          style={[
            styles.rowValue,
            { color: empty ? s.brand : s.textStrong },
            empty && styles.rowValueEmpty,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={s.textWeak} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenX,
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 24,
    gap: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
  },
  avatarHint: {
    ...TYPE.cardSub,
  },
  groupTitle: {
    ...TYPE.caption,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: LAYOUT.card.radius,
    paddingHorizontal: 4,
    marginBottom: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "500",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    flexShrink: 1,
  },
  rowValueEmpty: {
    fontWeight: "600",
  },
  genderRow: {
    paddingVertical: 12,
  },
  genderChips: {
    flexDirection: "row",
    gap: 6,
  },
  genderChip: {
    height: LAYOUT.segment.itemHeight,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.segment.itemRadius,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  genderChipText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "500",
  },
  genderChipTextSelected: {
    fontWeight: "700",
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 10,
  },
  cta: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    ...TYPE.cta,
    fontWeight: "700",
  },
})
