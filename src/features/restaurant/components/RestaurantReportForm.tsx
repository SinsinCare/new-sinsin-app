import { useState } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Text, XStack, YStack } from "tamagui"

import { Button, TextAreaField, TextField } from "@/src/shared/components"
import { radius, spacing, useV2Theme } from "@/src/design-system-v2"
import { restaurantReportService } from "@/src/services/data/restaurantReportService"
import {
  MAX_RESTAURANT_REPORT_PHOTOS,
  validateRestaurantReportDraft,
} from "../utils/restaurantReportValidation"
import { getRestaurantReportPalette } from "../utils/restaurantReportPresentation"
import { RestaurantReportSection } from "./RestaurantReportSection"

interface RestaurantReportFormProps {
  paddingTop: number
}

const emptyDraft = {
  name: "",
  address: "",
  category: "",
  recommendedMenu: "",
  reason: "",
  externalLink: "",
}

export function RestaurantReportForm({
  paddingTop,
}: RestaurantReportFormProps) {
  const theme = useV2Theme()
  const palette = getRestaurantReportPalette(theme)
  const [draft, setDraft] = useState(emptyDraft)
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const contentTopPadding = Math.max(
    paddingTop,
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  )

  const update = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const addPhotos = async () => {
    if (photos.length >= MAX_RESTAURANT_REPORT_PHOTOS) {
      setError(
        `사진은 최대 ${MAX_RESTAURANT_REPORT_PHOTOS}장까지 첨부할 수 있어요.`,
      )
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      setError("사진 접근 권한이 필요해요.")
      return
    }

    const remaining = MAX_RESTAURANT_REPORT_PHOTOS - photos.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.85,
    })

    if (!result.canceled) {
      setError("")
      setPhotos((current) =>
        [...current, ...result.assets].slice(0, MAX_RESTAURANT_REPORT_PHOTOS),
      )
    }
  }

  const removePhoto = (uri: string) => {
    setPhotos((current) => current.filter((photo) => photo.uri !== uri))
  }

  const submit = async () => {
    const validation = validateRestaurantReportDraft({
      ...draft,
      photoCount: photos.length,
    })
    if (validation) {
      setError(validation)
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      await restaurantReportService.submitReport({ draft, photos })
      setDraft(emptyDraft)
      setPhotos([])
      Alert.alert("제보 완료", "소중한 식당 정보를 보내주셔서 감사합니다.")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "제보 등록에 실패했습니다.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: palette.bg }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: contentTopPadding },
        ]}
      >
        <YStack gap={spacing[16]}>
          <YStack
            gap={spacing[8]}
            paddingHorizontal={spacing[24]}
            paddingTop={spacing[20]}
          >
            <Text
              fontSize={26}
              lineHeight={34}
              fontWeight="700"
              color={palette.text}
            >
              식당 탭 준비 중
            </Text>
            <Text fontSize={15} lineHeight={22} color={palette.subText}>
              신장 건강에 맞는 식당 정보를 정리하고 있어요. 추천하고 싶은 식당을
              알려주세요.
            </Text>
          </YStack>

          <YStack
            gap={spacing[16]}
            marginHorizontal={spacing[16]}
            padding={spacing[16]}
            borderRadius={radius["2xl"]}
            borderWidth={1.5}
            borderColor={palette.cardBorder}
            backgroundColor={palette.card}
          >
            <Text
              fontSize={18}
              lineHeight={24}
              fontWeight="700"
              color={palette.text}
            >
              식당 제보
            </Text>

            {error ? (
              <Text
                fontSize={13}
                lineHeight={18}
                color={palette.errorText}
                backgroundColor={palette.errorBackground}
                padding={spacing[12]}
                borderRadius={radius.md}
              >
                {error}
              </Text>
            ) : null}

            <RestaurantReportSection
              title="기본 정보"
              backgroundColor={palette.section}
              borderColor={palette.fieldBorder}
              textColor={palette.text}
            >
              <TextField
                label="식당 이름"
                value={draft.name}
                onChangeText={(value) => update("name", value)}
                placeholder="예: 초록김밥"
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
              <TextField
                label="주소 (선택)"
                value={draft.address}
                onChangeText={(value) => update("address", value)}
                placeholder="도로명 주소 또는 동네명"
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
              <TextField
                label="음식 종류"
                value={draft.category}
                onChangeText={(value) => update("category", value)}
                placeholder="한식, 일식, 분식 등"
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
            </RestaurantReportSection>

            <RestaurantReportSection
              title="추천 정보"
              backgroundColor={palette.section}
              borderColor={palette.fieldBorder}
              textColor={palette.text}
            >
              <TextField
                label="추천 메뉴 (선택)"
                value={draft.recommendedMenu}
                onChangeText={(value) => update("recommendedMenu", value)}
                placeholder="싱겁게 먹기 좋은 메뉴"
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />

              <TextAreaField
                label="추천 이유 (선택)"
                value={draft.reason}
                onChangeText={(value) => update("reason", value)}
                placeholder="왜 추천하는지 알려주세요."
                borderRadius={radius.md}
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />

              <TextField
                label="외부 링크 (선택)"
                value={draft.externalLink}
                onChangeText={(value) => update("externalLink", value)}
                placeholder="지도, 메뉴판, 리뷰 링크"
                autoCapitalize="none"
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
            </RestaurantReportSection>

            <RestaurantReportSection
              title="사진"
              backgroundColor={palette.section}
              borderColor={palette.fieldBorder}
              textColor={palette.text}
            >
              <YStack gap={spacing[8]}>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} color={palette.text}>
                    첨부 {photos.length}/{MAX_RESTAURANT_REPORT_PHOTOS}
                  </Text>
                  <Pressable
                    onPress={addPhotos}
                    style={[
                      styles.addPhotoButton,
                      {
                        borderColor: palette.cardBorder,
                        backgroundColor: palette.card,
                      },
                    ]}
                  >
                    <Text fontSize={13} fontWeight="600" color={palette.action}>
                      사진 추가
                    </Text>
                  </Pressable>
                </XStack>
                {photos.length > 0 && (
                  <XStack gap={spacing[8]} flexWrap="wrap">
                    {photos.map((photo) => (
                      <Pressable
                        key={photo.uri}
                        onPress={() => removePhoto(photo.uri)}
                        style={styles.photoThumb}
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoImage}
                        />
                        <Text style={styles.removePhotoText}>삭제</Text>
                      </Pressable>
                    ))}
                  </XStack>
                )}
              </YStack>
            </RestaurantReportSection>

            <Button fullWidth loading={isSubmitting} onPress={submit}>
              제보 보내기
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  addPhotoButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoThumb: {
    height: 78,
    width: 78,
    borderRadius: 12,
    overflow: "hidden",
  },
  photoImage: {
    height: "100%",
    width: "100%",
  },
  removePhotoText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.58)",
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
})
