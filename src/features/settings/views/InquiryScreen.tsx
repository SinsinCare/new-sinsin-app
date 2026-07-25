import React, { useState, useRef } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Alert,
} from "react-native"
import { api } from "@/src/services/core/apiClient"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

const MAX_IMAGES = 3
const MAX_CONTENT = 100

const INQUIRY_CATEGORIES = [
  "서비스 이용 문의",
  "건강 데이터 관련",
  "식단 및 콘텐츠 관련",
  "구독/결제 관련",
  "계정/설정 관련",
  "기타 문의",
]

export function InquiryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const [category, setCategory] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipOpacity = useRef(new Animated.Value(0)).current
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDirty =
    !!category || title.length > 0 || content.length > 0 || images.length > 0
  const canSubmit = !!category && title.length > 0 && content.length > 0

  const handleBack = () => {
    if (isDirty) {
      setShowCancelModal(true)
    } else {
      router.back()
    }
  }

  const showTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
    setTooltipVisible(true)
    Animated.timing(tooltipOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start()
    tooltipTimer.current = setTimeout(() => {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setTooltipVisible(false))
    }, 2500)
  }

  const handleAddImage = async () => {
    if (images.length >= MAX_IMAGES) {
      showTooltip()
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri])
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.post("/user/inquiries", {
        subject: `[${category}] ${title}`,
        content,
      })
      Alert.alert("문의 등록 완료", "문의가 성공적으로 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ])
    } catch {
      Alert.alert("오류", "문의 등록에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="1:1 문의"
        paddingTop={insets.top + 8}
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 카테고리 */}
          <View style={styles.categoryRow}>
            <ThemedText style={[styles.fieldLabel, { color: c.textSub }]}>
              문의 카테고리
            </ThemedText>
            <View style={styles.categoryRight}>
              {category && (
                <ThemedText style={[styles.categoryValue, { color: c.text }]}>
                  {category}
                </ThemedText>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  { borderColor: c.border },
                  pressed && { backgroundColor: c.pressedBg },
                ]}
                onPress={() => setShowCategorySheet(true)}
              >
                <ThemedText style={[styles.selectButtonText, { color: c.textSub }]}>
                  선택
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: c.inputBg }]} />

          {/* 제목 */}
          <ThemedText
            style={[styles.fieldLabel, { color: c.textSub, marginBottom: 10 }]}
          >
            제목
          </ThemedText>
          <TextInput
            style={[styles.titleInput, { color: c.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력해주세요"
            placeholderTextColor={c.textTertiary}
          />

          <View style={[styles.divider, { backgroundColor: c.inputBg }]} />

          {/* 문의 내용 */}
          <View style={styles.contentWrapper}>
            <TextInput
              style={[styles.contentInput, { color: c.text }]}
              value={content}
              onChangeText={(text) => setContent(text.slice(0, MAX_CONTENT))}
              placeholder={
                "문의 내용을 입력해주세요.\n\n궁금한 점이 있다면 언제든 자유롭게 문의해 주세요.\n동일을 제외한 항목에는 최후 아래에 답변됩니다."
              }
              placeholderTextColor={c.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <ThemedText style={[styles.contentCount, { color: c.textMuted }]}>
              {content.length}/{MAX_CONTENT}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: c.inputBg }]} />

          {/* 이미지 첨부 */}
          <View style={styles.imageSection}>
            <ThemedText style={[styles.imageHint, { color: c.textMuted }]}>
              문의 사진은 최대 3장까지 첨부 할 수 있어요
            </ThemedText>
            <View style={styles.imageRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.imageAddButton,
                  { borderColor: c.border, backgroundColor: c.secondaryBg },
                  pressed && { backgroundColor: c.inputBg },
                ]}
                onPress={handleAddImage}
              >
                <Ionicons name="image-outline" size={24} color={c.textMuted} />
              </Pressable>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageThumbWrapper}>
                  <Image
                    source={{ uri }}
                    style={styles.imageThumb}
                    contentFit="cover"
                  />
                  <Pressable
                    style={[
                      styles.imageRemoveButton,
                      { backgroundColor: c.bg },
                    ]}
                    onPress={() => handleRemoveImage(index)}
                    hitSlop={4}
                  >
                    <Ionicons name="close-circle" size={18} color={c.icon} />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* 초과 첨부 툴팁 */}
            {tooltipVisible && (
              <Animated.View
                style={[styles.tooltip, { opacity: tooltipOpacity }]}
              >
                <ThemedText style={styles.tooltipText}>
                  {
                    "파일은 최대 3개까지 첨부 할 수 있어요.\n첨부된 파일을 삭제하고 다시 시도해주세요."
                  }
                </ThemedText>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomActionBar
        label={isSubmitting ? "등록 중..." : "등록하기"}
        disabled={!canSubmit || isSubmitting}
        paddingBottom={insets.bottom + 16}
        onPress={handleSubmit}
      />

      {/* 카테고리 선택 바텀시트 */}
      <Modal
        visible={showCategorySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategorySheet(false)}
      >
        <Pressable
          style={styles.sheetDim}
          onPress={() => setShowCategorySheet(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: c.modalBg }]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
            <ThemedText style={[styles.sheetTitle, { color: c.text }]}>
              문의 카테고리를 선택해주세요
            </ThemedText>
            {INQUIRY_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={({ pressed }) => [
                  styles.sheetItem,
                  { borderBottomColor: c.inputBg },
                  pressed && {
                    backgroundColor: c.pressedBg,
                    marginHorizontal: -20,
                    paddingHorizontal: 20,
                  },
                ]}
                onPress={() => {
                  setCategory(cat)
                  setShowCategorySheet(false)
                }}
              >
                <ThemedText
                  style={[
                    styles.sheetItemText,
                    { color: c.text },
                    category === cat && styles.sheetItemTextSelected,
                  ]}
                >
                  {cat}
                </ThemedText>
                {category === cat && (
                  <Ionicons name="checkmark" size={20} color={tokens.color.sub6.val} />
                )}
              </Pressable>
            ))}
            <View style={{ height: insets.bottom + 16 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 취소 확인 모달 */}
      <ConfirmModal
        visible={showCancelModal}
        title="문의 등록을 취소하시겠어요?"
        description="지금 나가시면 작성했던 내용은 저장되지 않습니다."
        onCancel={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false)
          router.back()
        }}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  // 카테고리
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginHorizontal: -20,
  },
  // 제목
  titleInput: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 12,
    padding: 0,
  },
  // 문의 내용
  contentWrapper: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  contentInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    padding: 0,
  },
  contentCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  // 이미지
  imageSection: {
    paddingVertical: 16,
    gap: 12,
  },
  imageHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  imageRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  imageAddButton: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageThumbWrapper: {
    position: "relative",
  },
  imageThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  imageRemoveButton: {
    position: "absolute",
    top: -6,
    right: -6,
    borderRadius: 9,
  },
  // 툴팁
  tooltip: {
    backgroundColor: "#1F2937",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  tooltipText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  // 카테고리 바텀시트
  sheetDim: {
    flex: 1,
    backgroundColor: "#00000040",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetItemText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  sheetItemTextSelected: {
    fontWeight: "600",
    color: tokens.color.sub6.val,
  },
})
