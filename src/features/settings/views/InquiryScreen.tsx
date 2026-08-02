import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from "react-native"
import { api } from "@/src/services/core/apiClient"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { ConfirmModal } from "@/src/shared/components/ConfirmModal"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

const MAX_CONTENT = 100

const INQUIRY_CATEGORIES = [
  { value: "app", labelKey: "inquiry.categories.app" },
  { value: "health", labelKey: "inquiry.categories.health" },
  { value: "content", labelKey: "inquiry.categories.content" },
  { value: "billing", labelKey: "inquiry.categories.billing" },
  { value: "account", labelKey: "inquiry.categories.account" },
  { value: "other", labelKey: "inquiry.categories.other" },
] as const

export function InquiryScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")

  const [category, setCategory] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const isDirty = !!category || title.length > 0 || content.length > 0
  const canSubmit = !!category && title.length > 0 && content.length > 0

  const handleBack = () => {
    if (isDirty) {
      setShowCancelModal(true)
    } else {
      router.back()
    }
  }

  // /user/inquiries는 현재 제목과 본문만 받는다.
  // 첨부 계약이 생기기 전에는 사진이 전송되는 것처럼 보이는 UI를 노출하지 않는다.
  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    try {
      const categoryLabel = t(
        INQUIRY_CATEGORIES.find((item) => item.value === category)?.labelKey ??
          "inquiry.categories.other",
      )
      await api.post("/user/inquiries", {
        subject: `[${categoryLabel}] ${title}`,
        content,
      })
      Alert.alert(t("inquiry.successTitle"), t("inquiry.successBody"), [
        { text: t("inquiry.confirm"), onPress: () => router.back() },
      ])
    } catch {
      Alert.alert(t("inquiry.errorTitle"), t("inquiry.errorBody"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title={t("inquiry.title")}
        paddingTop={insets.top + 8}
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          overScrollMode="never"
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
              {t("inquiry.category")}
            </ThemedText>
            <View style={styles.categoryRight}>
              {category && (
                <ThemedText style={[styles.categoryValue, { color: c.text }]}>
                  {t(
                    INQUIRY_CATEGORIES.find((item) => item.value === category)
                      ?.labelKey ?? "inquiry.categories.other",
                  )}
                </ThemedText>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("inquiry.selectCategory")}
                style={({ pressed }) => [
                  styles.selectButton,
                  { borderColor: c.border },
                  pressed && { backgroundColor: c.pressedBg },
                ]}
                onPress={() => setShowCategorySheet(true)}
              >
                <ThemedText
                  style={[styles.selectButtonText, { color: c.textSub }]}
                >
                  {t("inquiry.select")}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: c.inputBg }]} />

          {/* 제목 */}
          <ThemedText
            style={[styles.fieldLabel, { color: c.textSub, marginBottom: 10 }]}
          >
            {t("inquiry.subject")}
          </ThemedText>
          <TextInput
            style={[styles.titleInput, { color: c.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t("inquiry.subjectPlaceholder")}
            placeholderTextColor={c.textTertiary}
          />

          <View style={[styles.divider, { backgroundColor: c.inputBg }]} />

          {/* 문의 내용 */}
          <View style={styles.contentWrapper}>
            <TextInput
              style={[styles.contentInput, { color: c.text }]}
              value={content}
              onChangeText={(text) => setContent(text.slice(0, MAX_CONTENT))}
              placeholder={t("inquiry.contentPlaceholder")}
              placeholderTextColor={c.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <ThemedText style={[styles.contentCount, { color: c.textMuted }]}>
              {content.length}/{MAX_CONTENT}
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomActionBar
        label={isSubmitting ? t("inquiry.sending") : t("inquiry.send")}
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
              {t("inquiry.categoryPrompt")}
            </ThemedText>
            {INQUIRY_CATEGORIES.map((item) => (
              <Pressable
                key={item.value}
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
                  setCategory(item.value)
                  setShowCategorySheet(false)
                }}
              >
                <ThemedText
                  style={[
                    styles.sheetItemText,
                    { color: c.text },
                    category === item.value && styles.sheetItemTextSelected,
                  ]}
                >
                  {t(item.labelKey)}
                </ThemedText>
                {category === item.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={tokens.color.sub6.val}
                  />
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
        title={t("inquiry.discardTitle")}
        description={t("inquiry.discardBody")}
        confirmText={t("inquiry.discard")}
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
