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
import { useRouter } from "expo-router"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { ToggleItem } from "@/src/features/settings/components"
import {
  WITHDRAWAL_REASONS,
  WITHDRAWAL_OTHER_INDEX,
} from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

export function WithdrawalScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [customReason, setCustomReason] = useState("")
  const [deleteMyPosts, setDeleteMyPosts] = useState(false)

  const isOtherSelected = selectedIndex === WITHDRAWAL_OTHER_INDEX
  const trimmedCustomReason = customReason.trim()
  const isActive =
    selectedIndex !== null &&
    (!isOtherSelected || trimmedCustomReason.length >= 20)

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
            {WITHDRAWAL_REASONS.map((reason, index) => (
              <React.Fragment key={index}>
                <Pressable
                  style={[
                    styles.optionItem,
                    selectedIndex === index && {
                      backgroundColor: c.secondaryBg,
                    },
                  ]}
                  onPress={() => setSelectedIndex(index)}
                >
                  <ThemedText style={[styles.optionText, { color: c.text }]}>
                    {reason}
                  </ThemedText>
                </Pressable>

                {index === WITHDRAWAL_OTHER_INDEX && (
                  <TextInput
                    style={[
                      styles.customInput,
                      { backgroundColor: c.secondaryBg, color: c.text },
                    ]}
                    multiline
                    placeholder="20자 이상 입력"
                    placeholderTextColor={c.textTertiary}
                    value={customReason}
                    onChangeText={setCustomReason}
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
