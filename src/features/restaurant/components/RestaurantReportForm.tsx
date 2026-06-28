import { useState } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Text, TextArea, XStack, YStack } from "tamagui"

import { Button, TextField } from "@/src/shared/components"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { restaurantReportService } from "@/src/services/data/restaurantReportService"
import {
  MAX_RESTAURANT_REPORT_PHOTOS,
  validateRestaurantReportDraft,
} from "../utils/restaurantReportValidation"

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
  const isDarkMode = useAppColorScheme() === "dark"
  const [draft, setDraft] = useState(emptyDraft)
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const palette = isDarkMode
    ? {
        bg: tokens.color.appBgDark.val,
        card: tokens.color.cardBgDark.val,
        text: tokens.color.textDark.val,
        subText: tokens.color.textDarkSub.val,
        border: tokens.color.borderDark.val,
        input: tokens.color.inputBgDark.val,
      }
    : {
        bg: tokens.color.offWhite.val,
        card: tokens.color.pureWhite.val,
        text: tokens.color.textLight.val,
        subText: tokens.color.textLightMuted.val,
        border: tokens.color.borderLight.val,
        input: tokens.color.pureWhite.val,
      }

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
        contentContainerStyle={[styles.content, { paddingTop }]}
      >
        <YStack gap="$4">
          <YStack gap="$2" paddingHorizontal={24} paddingTop={18}>
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
            gap="$4"
            marginHorizontal={16}
            padding={18}
            borderRadius={16}
            borderWidth={1}
            borderColor={palette.border}
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
                color={tokens.color.error.val}
                backgroundColor={isDarkMode ? "#3B2727" : "#FFF0EE"}
                padding={12}
                borderRadius={10}
              >
                {error}
              </Text>
            ) : null}

            <TextField
              label="식당 이름"
              value={draft.name}
              onChangeText={(value) => update("name", value)}
              placeholder="예: 초록김밥"
            />
            <TextField
              label="주소"
              value={draft.address}
              onChangeText={(value) => update("address", value)}
              placeholder="도로명 주소 또는 동네명"
            />
            <TextField
              label="음식 종류"
              value={draft.category}
              onChangeText={(value) => update("category", value)}
              placeholder="한식, 일식, 분식 등"
            />
            <TextField
              label="추천 메뉴"
              value={draft.recommendedMenu}
              onChangeText={(value) => update("recommendedMenu", value)}
              placeholder="싱겁게 먹기 좋은 메뉴"
            />

            <YStack gap="$1.5">
              <Text fontSize={14} color={palette.text}>
                추천 이유
              </Text>
              <TextArea
                minHeight={112}
                borderRadius={10}
                borderColor={palette.border}
                backgroundColor={palette.input}
                color={palette.text}
                value={draft.reason}
                onChangeText={(value) => update("reason", value)}
                placeholder="왜 추천하는지 알려주세요."
              />
            </YStack>

            <TextField
              label="외부 링크"
              value={draft.externalLink}
              onChangeText={(value) => update("externalLink", value)}
              placeholder="지도, 메뉴판, 리뷰 링크"
              autoCapitalize="none"
            />

            <YStack gap="$2">
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={14} color={palette.text}>
                  사진 {photos.length}/{MAX_RESTAURANT_REPORT_PHOTOS}
                </Text>
                <Pressable
                  onPress={addPhotos}
                  style={[
                    styles.addPhotoButton,
                    { borderColor: palette.border },
                  ]}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={tokens.color.sub7.val}
                  >
                    사진 추가
                  </Text>
                </Pressable>
              </XStack>
              {photos.length > 0 && (
                <XStack gap="$2" flexWrap="wrap">
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
