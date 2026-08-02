import { getErrorMessage } from "@/src/lib/errorUtils"
import { useMemo, useState } from "react"
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useDateAnalysis } from "@/src/features/home/hooks/useDateAnalysis"
import { useCommunityStories } from "@/src/features/recipe/hooks/useCommunityStories"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import type { MealType } from "@/src/features/home/types"
import { useTranslation } from "react-i18next"

interface StoryCandidate {
  /** 서버에 이미 있는 사진이면 URL, 갤러리에서 고른 사진이면 로컬 URI. */
  uri: string
  isRemote: boolean
  label: string
}

function startOfDayBefore(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

/**
 * 스토리 작성 — 오늘·어제 기록한 식사 사진을 그대로 올릴 수 있다.
 * 이미 서버에 있는 사진은 다시 업로드하지 않고 URL 만 넘긴다.
 */
export default function NewStoryScreen() {
  const { t, i18n } = useTranslation()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const bottomInset =
    Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom

  const today = useMemo(() => new Date(), [])
  const yesterday = useMemo(() => startOfDayBefore(1), [])
  const { data: todayAnalysis } = useDateAnalysis(today)
  const { data: yesterdayAnalysis } = useDateAnalysis(yesterday)
  const { createStoryAsync, isCreating } = useCommunityStories("recommended")

  const [selected, setSelected] = useState<StoryCandidate | null>(null)
  const [caption, setCaption] = useState("")
  const [pickedFromGallery, setPickedFromGallery] = useState<StoryCandidate[]>(
    [],
  )
  const [isUploading, setIsUploading] = useState(false)

  const mealCandidates = useMemo<StoryCandidate[]>(() => {
    const build = (
      diets: { mealType: MealType; imageUrl: string | null }[] | undefined,
      dayLabel: string,
    ) =>
      (diets ?? [])
        .filter((diet) => !!diet.imageUrl)
        .map((diet) => ({
          uri: diet.imageUrl as string,
          isRemote: true,
          label: `${dayLabel} ${t(`meal.${diet.mealType}`)}`.trim(),
        }))

    return [
      ...build(todayAnalysis?.result?.diets, t("community.newStory.today")),
      ...build(
        yesterdayAnalysis?.result?.diets,
        t("community.newStory.yesterday"),
      ),
    ]
  }, [todayAnalysis, yesterdayAnalysis, i18n.language, t])

  const candidates = [...pickedFromGallery, ...mealCandidates]
  const isSaving = isCreating || isUploading

  const handlePickFromGallery = async () => {
    Keyboard.dismiss()
    const uris = await pickMultipleImages(1)
    if (uris.length === 0) return
    const picked: StoryCandidate = {
      uri: uris[0],
      isRemote: false,
      label: t("community.newStory.galleryPhoto"),
    }
    setPickedFromGallery((prev) => [picked, ...prev])
    setSelected(picked)
  }

  const handleSubmit = async () => {
    if (!selected || isSaving) return
    setIsUploading(true)
    try {
      let imageObjectPath: string | null = null
      if (!selected.isRemote) {
        const uploaded = await imageUploadService.uploadImage(
          selected.uri,
          "community",
        )
        imageObjectPath = uploaded.objectPath
      }
      await createStoryAsync({
        imageUri: selected.isRemote ? selected.uri : null,
        imageObjectPath,
        caption: caption.trim() || null,
      })
      router.back()
    } catch (error) {
      /*
        일괄 "인터넷 연결" 문구를 쓰지 않는다 — 온보딩 미완료 계정의 403(FORBIDDEN)도
        인터넷 탓으로 보였다(2026-08-02 QA "스토리 동작 안 함"의 실체). getErrorMessage 는
        서버 카탈로그 문구를 그대로 보여주고, 진짜 네트워크 실패에만 연결 문구를 준다.
      */
      Alert.alert(
        t("community.newStory.errorTitle"),
        getErrorMessage(error, t("community.newStory.errorBody")),
      )
    } finally {
      setIsUploading(false)
    }
  }

  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: surface.canvas, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="close" size={24} color={surface.textStrong} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: surface.textStrong }]}>
          {t("community.newStory.title")}
        </Text>
        <SurfacePressable
          onPress={handleSubmit}
          disabled={!selected || isSaving}
          accessibilityLabel={t("community.newStory.add")}
          accessibilityState={{ disabled: !selected || isSaving }}
          baseColor={selected ? inkBg : surface.ctaOffBg}
          pressedColor={
            selected
              ? surface.isDark
                ? "#DADAE0"
                : "#34363A"
              : surface.ctaOffBg
          }
          pressScale={0.94}
          style={styles.submitPill}
        >
          <Text
            style={[
              styles.submitLabel,
              { color: selected ? inkContent : surface.ctaOffText },
            ]}
          >
            {isSaving
              ? t("community.newStory.saving")
              : t("community.newStory.submit")}
          </Text>
        </SurfacePressable>
      </View>

      <KeyboardAwareScrollView
        bounces={false}
        overScrollMode="never"
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        bottomOffset={bottomInset + 60}
        keyboardShouldPersistTaps="handled"
      >
        {/* 미리보기 */}
        <View
          style={[
            styles.preview,
            { backgroundColor: surface.isDark ? "#1A1A1D" : surface.surface },
          ]}
        >
          {selected ? (
            <Image
              source={{ uri: selected.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.previewEmpty}>
              <Ionicons
                name="images-outline"
                size={28}
                color={surface.textWeak}
              />
              <Text
                style={[styles.previewEmptyText, { color: surface.textMuted }]}
              >
                {t("community.newStory.choosePhoto")}
              </Text>
            </View>
          )}
          {selected && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{selected.label}</Text>
            </View>
          )}
        </View>

        {/* 사진 고르기 */}
        <Text style={[styles.sectionLabel, { color: surface.textMuted }]}>
          {t("community.newStory.recentMeals")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.picker}
          keyboardShouldPersistTaps="handled"
        >
          <SurfacePressable
            onPress={handlePickFromGallery}
            accessibilityLabel={t("community.newStory.chooseFromGallery")}
            baseColor={surface.surface}
            pressScale={0.95}
            style={styles.galleryTile}
          >
            <Ionicons name="add" size={22} color={surface.textMuted} />
            <Text style={[styles.galleryLabel, { color: surface.textMuted }]}>
              {t("community.newStory.gallery")}
            </Text>
          </SurfacePressable>

          {candidates.map((candidate, index) => {
            const isActive = selected?.uri === candidate.uri
            return (
              <Pressable
                key={`${candidate.uri}-${index}`}
                onPress={() => {
                  hapticSelection()
                  setSelected(candidate)
                }}
                accessibilityRole="button"
                accessibilityLabel={t("community.newStory.selectPhoto", {
                  label: candidate.label,
                })}
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.tile,
                  isActive && { borderColor: surface.brand, borderWidth: 2 },
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Image
                  source={{ uri: candidate.uri }}
                  style={styles.tileImage}
                  resizeMode="cover"
                />
                <View style={styles.tileScrim}>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {candidate.label}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>

        {candidates.length === 0 && (
          <Text style={[styles.hint, { color: surface.textWeak }]}>
            {t("community.newStory.noMealPhotos")}
          </Text>
        )}

        {/* 한마디 */}
        <Text style={[styles.sectionLabel, { color: surface.textMuted }]}>
          {t("community.newStory.captionLabel")}
        </Text>
        <View style={styles.captionWrap}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={t("community.newStory.captionPlaceholder")}
            placeholderTextColor={surface.placeholder}
            multiline
            maxLength={200}
            style={[
              styles.captionInput,
              {
                color: surface.textStrong,
                backgroundColor: surface.surface,
              },
            ]}
          />
          <Text style={[styles.counter, { color: surface.textWeak }]}>
            {caption.length}/200
          </Text>
        </View>

        <Text style={[styles.notice, { color: surface.textWeak }]}>
          {t("community.newStory.notice")}
        </Text>
      </KeyboardAwareScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  /*
    제목은 절대 중앙 — space-between 사이에 두면 우측 버튼 폭("올리기"/"올리는 중")이
    바뀔 때마다 제목이 흘러 다닌다(2026-08-02 QA "스토리 올리기 글자는 고정").
  */
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  submitPill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  preview: {
    marginHorizontal: 20,
    marginTop: 8,
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  previewEmptyText: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  previewBadge: {
    position: "absolute",
    left: 14,
    bottom: 14,
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(23,24,28,0.6)",
  },
  previewBadgeText: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },

  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  picker: {
    paddingHorizontal: 20,
    gap: 8,
  },
  galleryTile: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  galleryLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: -0.23,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  tileScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(23,24,28,0.55)",
  },
  tileLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    color: "#FFFFFF",
  },
  hint: {
    paddingHorizontal: 20,
    paddingTop: 10,
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Regular",
  },

  captionWrap: {
    paddingHorizontal: 20,
    gap: 6,
  },
  captionInput: {
    minHeight: 88,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.3,
    fontFamily: "Pretendard-Regular",
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 11.5,
    lineHeight: 15,
    fontFamily: "Pretendard-Regular",
  },

  notice: {
    paddingHorizontal: 20,
    paddingTop: 18,
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: -0.25,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
    textAlign: "center",
  },
})
