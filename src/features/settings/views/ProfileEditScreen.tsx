import { settingsDetailSpec } from "../components/settingsDetailSpec"
import React, { useState, useEffect, useRef } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Image,
  LayoutAnimation,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { SettingsDetailHeader as ScreenHeader } from "../components/SettingsDetailHeader"
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

  const pageBg = s.canvas

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <ScreenHeader title={t("profile.title")} onBack={router.back} />

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
            {/* A neutral avatar well remains visible on the plain detail page. */}
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
            style={[styles.avatarHint, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("profile.photo.hint")}
          </Text>
        </View>

        {/* 내 정보 — 한 줄 행: 라벨은 왼쪽, 값은 오른쪽 */}
        <Text
          style={[styles.groupTitle, { color: s.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("profile.section.personal")}
        </Text>
        <View style={[styles.card, { backgroundColor: pageBg }]}>
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
              style={[styles.rowValue, { color: s.text }]}
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
                            : s.surfaceSunken,
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
          style={[styles.groupTitle, { color: s.text }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("profile.section.security")}
        </Text>
        <View style={[styles.card, { backgroundColor: pageBg }]}>
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
    paddingBottom: 28,
    gap: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  /*
    ■ **색은 `surface.text`(= `label.neutral`)다 — `textMuted` 가 아니다** (2026-08-22)

    (B) 섹션 라벨(`SectionHeader` 머리말: 바닥 위 이름표 + 그 아래 흰 카드)이 오래
    `textMuted`(= `label.alternative`)였는데, 화면 바닥 위에서 **2.68:1** 이다 —
    본문 기준 4.5 는커녕 큰 글자 기준 3 에도 못 미친다(13.5 SemiBold 는 큰 글자가
    아니다: 기준은 18.66 이상 또는 14 이상 Bold).

    **값은 안 고쳤다.** `label.alternative` 는 146곳이 보고 식당 상세 시안 실측에
    묶여 있다. 고친 것은 **부르는 쪽의 토큰 선택**이고, 그건 이 감사가 커뮤니티에서
    이미 낸 결론이다(`design-system-v2/tokens/colors.ts` §label 사다리 — "읽혀야 하는
    글자의 바닥은 `neutral`"). 바닥 위 **4.72:1**, 다크도 3.00 → **5.79** 로 같이
    올라간다(거기서도 4.5 밖이었다). 계산은 `tests/lightContrastAudit.test.ts` §11.
  */
  groupTitle: {
    ...settingsDetailSpec.sectionTitle,
    marginLeft: 0,
  },
  card: {
    borderRadius: 0,
    paddingHorizontal: 0,
    marginBottom: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { ...settingsDetailSpec.rowLabel, flexShrink: 0 },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  rowValue: { ...settingsDetailSpec.rowValue, flexShrink: 1 },
  rowValueEmpty: {
    fontWeight: "600",
  },
  genderRow: {
    paddingVertical: 12,
    flexWrap: "wrap",
  },
  genderChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  genderChip: {
    minHeight: 40,
    paddingVertical: 8,
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
