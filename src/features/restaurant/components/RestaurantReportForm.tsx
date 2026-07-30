import { useState } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Text, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("common")
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
        t("restaurant.report.maxPhotos", {
          count: MAX_RESTAURANT_REPORT_PHOTOS,
        }),
      )
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        t("restaurant.report.permissionTitle"),
        t("restaurant.report.permissionBody"),
        [
          { text: t("restaurant.report.later"), style: "cancel" },
          {
            text: t("restaurant.report.openSettings"),
            onPress: () => {
              void Linking.openSettings()
            },
          },
        ],
      )
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
      setError(
        t(`restaurant.report.validation.${validation}`, {
          count: MAX_RESTAURANT_REPORT_PHOTOS,
        }),
      )
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      await restaurantReportService.submitReport({ draft, photos })
      setDraft(emptyDraft)
      setPhotos([])
      Alert.alert(
        t("restaurant.report.successTitle"),
        t("restaurant.report.successBody"),
      )
    } catch {
      setError(t("restaurant.report.failure"))
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
        bounces={false}
        overScrollMode="never"
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
              {t("restaurant.report.introTitle")}
            </Text>
            <Text fontSize={15} lineHeight={22} color={palette.subText}>
              {t("restaurant.report.introBody")}
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
              {t("restaurant.report.formTitle")}
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
              title={t("restaurant.report.sections.restaurant")}
              backgroundColor={palette.section}
              borderColor={palette.fieldBorder}
              textColor={palette.text}
            >
              <TextField
                label={t("restaurant.report.fields.name")}
                value={draft.name}
                onChangeText={(value) => update("name", value)}
                placeholder={t("restaurant.report.fields.namePlaceholder")}
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
              <TextField
                label={t("restaurant.report.fields.address")}
                value={draft.address}
                onChangeText={(value) => update("address", value)}
                placeholder={t("restaurant.report.fields.addressPlaceholder")}
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
              <TextField
                label={t("restaurant.report.fields.category")}
                value={draft.category}
                onChangeText={(value) => update("category", value)}
                placeholder={t("restaurant.report.fields.categoryPlaceholder")}
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
            </RestaurantReportSection>

            <RestaurantReportSection
              title={t("restaurant.report.sections.highlights")}
              backgroundColor={palette.section}
              borderColor={palette.fieldBorder}
              textColor={palette.text}
            >
              <TextField
                label={t("restaurant.report.fields.menu")}
                value={draft.recommendedMenu}
                onChangeText={(value) => update("recommendedMenu", value)}
                placeholder={t("restaurant.report.fields.menuPlaceholder")}
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />

              <TextAreaField
                label={t("restaurant.report.fields.reason")}
                value={draft.reason}
                onChangeText={(value) => update("reason", value)}
                placeholder={t("restaurant.report.fields.reasonPlaceholder")}
                borderRadius={radius.md}
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />

              <TextField
                label={t("restaurant.report.fields.link")}
                value={draft.externalLink}
                onChangeText={(value) => update("externalLink", value)}
                placeholder={t("restaurant.report.fields.linkPlaceholder")}
                autoCapitalize="none"
                borderColor={palette.fieldBorder}
                backgroundColor={palette.input}
                color={palette.text}
              />
            </RestaurantReportSection>

            <RestaurantReportSection
              title={t("restaurant.report.sections.photos")}
              backgroundColor={palette.section}
              borderColor={palette.fieldBorder}
              textColor={palette.text}
            >
              <YStack gap={spacing[8]}>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} color={palette.text}>
                    {t("restaurant.report.selectedPhotos", {
                      current: photos.length,
                      max: MAX_RESTAURANT_REPORT_PHOTOS,
                    })}
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
                      {t("restaurant.report.addPhoto")}
                    </Text>
                  </Pressable>
                </XStack>
                {photos.length > 0 && (
                  <XStack gap={spacing[8]} flexWrap="wrap">
                    {photos.map((photo) => (
                      <Pressable
                        key={photo.uri}
                        onPress={() => removePhoto(photo.uri)}
                        accessibilityRole="button"
                        accessibilityLabel={t("restaurant.report.removePhoto")}
                        style={styles.photoThumb}
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoImage}
                        />
                        <Text style={styles.removePhotoText}>
                          {t("restaurant.report.remove")}
                        </Text>
                      </Pressable>
                    ))}
                  </XStack>
                )}
              </YStack>
            </RestaurantReportSection>

            <Button fullWidth loading={isSubmitting} onPress={submit}>
              {t("restaurant.report.submit")}
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
