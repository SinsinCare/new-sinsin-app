import { useMemo, useState } from "react"
import {
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
import { showConfirm } from "@/src/lib/dialog"
import { hapticSelection } from "@/src/lib/haptics"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useDateAnalysis } from "@/src/features/home/hooks/useDateAnalysis"
import { useCommunityStories } from "@/src/features/recipe/hooks/useCommunityStories"
import { pickMultipleImages } from "@/src/features/recipe/services/imagePickerService"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import type { MealType } from "@/src/features/home/types"
import { presentCommunityError } from "@/src/features/recipe/utils/communityError"
import { useTranslation } from "react-i18next"

interface StoryCandidate {
  /**
   * 이 후보의 **변하지 않는 이름**. `uri` 를 정체로 쓰면 안 되기 때문에 따로 둔다.
   *
   * 서버 사진의 `uri` 는 **서명 URL** 이라 조회할 때마다 문자열이 달라진다
   * (`displayImageUrl` 이 매번 새로 서명한다). 그래서 목록이 한 번 다시 불려 오면
   * 같은 끼니 사진인데도 `uri` 가 달라지고, 그 값을 정체로 쓰던 화면은
   *  - 고른 표시(테두리)를 잃고,
   *  - 미리보기가 **낡은 서명 URL** 을 계속 들고 있다가 만료되면 빈 칸이 된다.
   * QA 가 본 "사진을 바꾸면 골랐던 음식 사진이 안 보인다" 가 그 모양이다.
   *
   * 끼니 사진은 `날짜-끼니`, 갤러리 사진은 로컬 URI 를 정체로 쓴다.
   */
  id: string
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
      dayKey: string,
      dayLabel: string,
    ) =>
      (diets ?? [])
        .filter((diet) => !!diet.imageUrl)
        .map((diet) => ({
          id: `${dayKey}:${diet.mealType}`,
          uri: diet.imageUrl as string,
          isRemote: true,
          label: `${dayLabel} ${t(`meal.${diet.mealType}`)}`.trim(),
        }))

    return [
      ...build(
        todayAnalysis?.result?.diets,
        "today",
        t("community.newStory.today"),
      ),
      ...build(
        yesterdayAnalysis?.result?.diets,
        "yesterday",
        t("community.newStory.yesterday"),
      ),
    ]
  }, [todayAnalysis, yesterdayAnalysis, i18n.language, t])

  const candidates = [...pickedFromGallery, ...mealCandidates]
  const isSaving = isCreating || isUploading

  /**
   * 고른 후보를 **목록의 최신 값으로** 따라가게 한다.
   *
   * 서버 사진의 URL 은 조회할 때마다 새로 서명되므로, 고른 시점의 문자열을 그대로
   * 들고 있으면 미리보기가 낡은 URL 을 가리킨다(만료되면 빈 칸). 정체(`id`)가 같은
   * 후보를 찾아 URL 만 갈아 끼운다 — 사용자의 선택은 그대로 두고 주소만 새것으로.
   * 목록에서 아예 사라진 후보(어제 사진이 만 이틀이 되어 빠진 경우)는 그대로 둔다:
   * 고른 것을 말없이 놓아 버리는 것보다 낫다.
   */
  const selectedCandidate = useMemo(() => {
    if (selected === null) return null
    const fresh = candidates.find((item) => item.id === selected.id)
    return fresh ?? selected
    // `candidates` 는 매 렌더 새 배열이라 의존성에 넣으면 매번 새로 계산된다.
    // 실제로 값이 바뀌는 것은 아래 둘이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mealCandidates, pickedFromGallery])

  const handlePickFromGallery = async () => {
    Keyboard.dismiss()
    const uris = await pickMultipleImages(1)
    if (uris.length === 0) return
    const picked: StoryCandidate = {
      // 갤러리 사진은 로컬 URI 가 곧 정체다 — 서명이 붙지 않으므로 변하지 않는다.
      id: uris[0],
      uri: uris[0],
      isRemote: false,
      label: t("community.newStory.galleryPhoto"),
    }
    setPickedFromGallery((prev) => [picked, ...prev])
    setSelected(picked)
  }

  /**
   * 고른 사진과 쓰던 캡션을 두고 나가기 전에 한 번 묻는다. 아무것도 안 골랐으면
   * 묻지 않는다 — 잃을 것이 없는데 확인을 붙이면 그냥 한 번 더 누르게 하는 것이다.
   */
  const handleClose = async () => {
    if (!selected && caption.trim().length === 0) {
      router.back()
      return
    }
    const confirmed = await showConfirm({
      title: t("community.newStory.discardTitle"),
      description: t("community.newStory.discardBody"),
      confirmLabel: t("community.newStory.discard"),
      cancelLabel: t("community.newStory.keepWriting"),
      destructive: true,
    })
    if (confirmed) router.back()
  }

  const handleSubmit = async () => {
    if (!selectedCandidate || isSaving) return
    setIsUploading(true)
    try {
      let imageObjectPath: string | null = null
      if (!selectedCandidate.isRemote) {
        const uploaded = await imageUploadService.uploadImage(
          selectedCandidate.uri,
          "community",
        )
        imageObjectPath = uploaded.objectPath
      }
      await createStoryAsync({
        imageUri: selectedCandidate.isRemote ? selectedCandidate.uri : null,
        imageObjectPath,
        caption: caption.trim() || null,
      })
      router.back()
    } catch (error) {
      /*
        일괄 "인터넷 연결" 문구를 쓰지 않는다 — 온보딩 미완료 계정의 403(FORBIDDEN)도
        인터넷 탓으로 보였다(2026-08-02 QA "스토리 동작 안 함"의 실체).

        화면 폴백도 주지 않는다. `스토리를 올리지 못했어요` 는 서버가 아는 것
        (`COMMUNITY_ERROR_014` 사진 없음, `FOOD_CAMERA_002` 5MB 초과)보다 언제나
        덜 구체적인데, 예전 규칙에서는 그 폴백이 코드를 **이겼다**.
      */
      presentCommunityError(error, {
        scope: "community-story-create",
        retry: () => void handleSubmit(),
      })
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
          onPress={() => void handleClose()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="close" size={24} color={surface.textStrong} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
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
            lineBreakStrategyIOS="hangul-word"
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
          {selectedCandidate ? (
            <Image
              source={{ uri: selectedCandidate.uri }}
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
                lineBreakStrategyIOS="hangul-word"
              >
                {t("community.newStory.choosePhoto")}
              </Text>
            </View>
          )}
          {selectedCandidate && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>
                {selectedCandidate.label}
              </Text>
            </View>
          )}
        </View>

        {/* 사진 고르기 */}
        <Text
          style={[styles.sectionLabel, { color: surface.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
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
            <Text
              style={[styles.galleryLabel, { color: surface.textMuted }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("community.newStory.gallery")}
            </Text>
          </SurfacePressable>

          {candidates.map((candidate) => {
            const isActive = selected?.id === candidate.id
            return (
              <Pressable
                /* 키는 **정체**로 준다. 예전에는 `uri-index` 라, 갤러리에서 한 장
                   고르면 앞에 끼어들어 뒤의 모든 끼니 타일의 키가 밀렸고 전부
                   다시 마운트됐다(안드로이드에서 사진이 잠깐 사라져 보인다). */
                key={candidate.id}
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
          <Text
            style={[styles.hint, { color: surface.textWeak }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("community.newStory.noMealPhotos")}
          </Text>
        )}

        {/* 한마디 */}
        <Text
          style={[styles.sectionLabel, { color: surface.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
        >
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

        <Text
          style={[styles.notice, { color: surface.textWeak }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
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
