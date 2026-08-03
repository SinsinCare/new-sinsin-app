import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { ToggleItem } from "@/src/features/settings/components"
import {
  WITHDRAWAL_REASONS,
  WITHDRAWAL_OTHER_INDEX,
  WITHDRAWAL_DETAIL_MIN,
  WITHDRAWAL_DETAIL_MAX,
} from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

const WITHDRAWAL_REASON_LABEL_KEYS = [
  "withdrawal.reasons.inactive",
  "withdrawal.reasons.notHelpful",
  "withdrawal.reasons.experience",
  "withdrawal.reasons.marketing",
  "withdrawal.reasons.other",
] as const

export function WithdrawalScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [customReason, setCustomReason] = useState("")
  const [deleteMyPosts, setDeleteMyPosts] = useState(false)

  const isOtherSelected = selectedIndex === WITHDRAWAL_OTHER_INDEX
  const trimmedCustomReason = customReason.trim()
  const isDetailTooShort = trimmedCustomReason.length < WITHDRAWAL_DETAIL_MIN
  const isActive =
    selectedIndex !== null && (!isOtherSelected || !isDetailTooShort)

  const handleSubmit = () => {
    if (selectedIndex === null) return

    router.push({
      pathname: "/(settings)/withdrawal-terms",
      params: {
        reason: WITHDRAWAL_REASONS[selectedIndex],
        detail: isOtherSelected ? trimmedCustomReason : "",
        deleteMyPosts: deleteMyPosts ? "true" : "false",
      },
    })
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shared.back")}
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>

          <ThemedText style={[styles.title, { color: c.text }]}>
            {t("withdrawal.reasonTitle")}
          </ThemedText>

          <View style={styles.optionList}>
            {WITHDRAWAL_REASONS.map((_, index) => (
              <React.Fragment key={index}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedIndex === index }}
                  style={[
                    styles.optionItem,
                    selectedIndex === index && {
                      backgroundColor: c.secondaryBg,
                    },
                  ]}
                  onPress={() => setSelectedIndex(index)}
                >
                  <ThemedText style={[styles.optionText, { color: c.text }]}>
                    {t(WITHDRAWAL_REASON_LABEL_KEYS[index])}
                  </ThemedText>
                </Pressable>

                {index === WITHDRAWAL_OTHER_INDEX && (
                  <>
                    <TextInput
                      style={[
                        styles.customInput,
                        { backgroundColor: c.secondaryBg, color: c.text },
                      ]}
                      multiline
                      placeholder={t("withdrawal.customReason")}
                      placeholderTextColor={c.textTertiary}
                      value={customReason}
                      onChangeText={setCustomReason}
                      // 직접 쓰기 시작한 사람은 "기타" 를 고른 것이다. 선택을 안 해서
                      // 다음 버튼이 잠긴 채 이유를 알 수 없던 길을 막는다.
                      onFocus={() => setSelectedIndex(WITHDRAWAL_OTHER_INDEX)}
                      maxLength={WITHDRAWAL_DETAIL_MAX}
                      textAlignVertical="top"
                    />
                    <View style={styles.counterRow}>
                      <ThemedText
                        style={[styles.counterHint, { color: c.textMuted }]}
                      >
                        {isDetailTooShort
                          ? t("withdrawal.detailMinHint", {
                              min: WITHDRAWAL_DETAIL_MIN,
                            })
                          : ""}
                      </ThemedText>
                      <ThemedText
                        style={[styles.counterText, { color: c.textMuted }]}
                      >
                        {customReason.length}/{WITHDRAWAL_DETAIL_MAX}
                      </ThemedText>
                    </View>
                  </>
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.postOptionBox, { borderColor: c.border }]}>
            <ToggleItem
              title={t("withdrawal.deletePostsTitle")}
              description={t("withdrawal.deletePostsBody")}
              value={deleteMyPosts}
              onValueChange={setDeleteMyPosts}
            />
          </View>
        </ScrollView>

        <BottomActionBar
          label={t("withdrawal.next")}
          disabled={!isActive}
          paddingBottom={insets.bottom + 16}
          onPress={handleSubmit}
        />
      </KeyboardAvoidingView>
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
  },
  backButton: {
    marginBottom: 32,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 22,
    lineHeight: 22 * 1.2,
    fontWeight: "600",
    marginBottom: 24,
  },
  optionList: {
    gap: 4,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "400",
  },
  customInput: {
    height: 183,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    marginTop: 4,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  counterHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
  },
  postOptionBox: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
