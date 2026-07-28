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
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { ToggleItem } from "@/src/features/settings/components"
import {
  WITHDRAWAL_OTHER_CODE,
  WITHDRAWAL_OTHER_MAX_LENGTH,
  WITHDRAWAL_OTHER_MIN_LENGTH,
  WITHDRAWAL_REASON_OPTIONS,
  type WithdrawalReasonCode,
} from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { saveWithdrawalDraft } from "@/src/features/settings/services/withdrawalDraft"

export function WithdrawalScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const [selectedReasonCode, setSelectedReasonCode] =
    useState<WithdrawalReasonCode | null>(null)
  const [customReason, setCustomReason] = useState("")
  const [deleteMyPosts, setDeleteMyPosts] = useState(false)

  const isOtherSelected = selectedReasonCode === WITHDRAWAL_OTHER_CODE
  const trimmedCustomReason = customReason.trim()
  const isActive =
    selectedReasonCode !== null &&
    (!isOtherSelected ||
      (trimmedCustomReason.length >= WITHDRAWAL_OTHER_MIN_LENGTH &&
        trimmedCustomReason.length <= WITHDRAWAL_OTHER_MAX_LENGTH))

  const handleSubmit = () => {
    if (!selectedReasonCode || !isActive) return

    saveWithdrawalDraft({
      reasonCode: selectedReasonCode,
      otherDetail: isOtherSelected ? trimmedCustomReason : null,
      deleteMyPosts,
    })
    router.push("/(settings)/withdrawal-terms")
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>

          <ThemedText style={[styles.title, { color: c.text }]}>
            {"신신당부를 떠나시려는\n이유가 무엇인가요?"}
          </ThemedText>

          <View style={styles.optionList}>
            {WITHDRAWAL_REASON_OPTIONS.map((reason) => (
              <React.Fragment key={reason.code}>
                <Pressable
                  style={[
                    styles.optionItem,
                    selectedReasonCode === reason.code && {
                      backgroundColor: c.secondaryBg,
                    },
                  ]}
                  onPress={() => setSelectedReasonCode(reason.code)}
                >
                  <ThemedText style={[styles.optionText, { color: c.text }]}>
                    {reason.label}
                  </ThemedText>
                </Pressable>

                {reason.code === WITHDRAWAL_OTHER_CODE && isOtherSelected && (
                  <TextInput
                    style={[
                      styles.customInput,
                      { backgroundColor: c.secondaryBg, color: c.text },
                    ]}
                    multiline
                    placeholder="20자 이상, 500자 이하로 입력"
                    placeholderTextColor={c.textTertiary}
                    value={customReason}
                    onChangeText={setCustomReason}
                    maxLength={WITHDRAWAL_OTHER_MAX_LENGTH}
                    textAlignVertical="top"
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.postOptionBox, { borderColor: c.border }]}>
            <ToggleItem
              title="내 게시글도 삭제"
              description="선택하지 않으면 작성자만 익명 처리되고 글은 보존됩니다."
              value={deleteMyPosts}
              onValueChange={setDeleteMyPosts}
            />
          </View>
        </ScrollView>

        <BottomActionBar
          label="제출하기"
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
  postOptionBox: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
