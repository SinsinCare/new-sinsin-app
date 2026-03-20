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
import {
  WITHDRAWAL_REASONS,
  WITHDRAWAL_OTHER_INDEX,
} from "@/src/features/settings/data/constants"

export function WithdrawalScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [customReason, setCustomReason] = useState("")

  const isActive = selectedIndex !== null

  return (
    <ThemedView style={styles.container}>
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
            <Ionicons name="chevron-back" size={24} color="#17191C" />
          </Pressable>

          <ThemedText style={styles.title}>
            {"신신당부를 떠나시려는\n이유가 무엇인가요?"}
          </ThemedText>

          <View style={styles.optionList}>
            {WITHDRAWAL_REASONS.map((reason, index) => (
              <React.Fragment key={index}>
                <Pressable
                  style={[
                    styles.optionItem,
                    selectedIndex === index && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedIndex(index)}
                >
                  <ThemedText style={styles.optionText}>{reason}</ThemedText>
                </Pressable>

                {index === WITHDRAWAL_OTHER_INDEX && (
                  <TextInput
                    style={styles.customInput}
                    multiline
                    placeholder="20자 이상 입력"
                    placeholderTextColor="#C5C8CE"
                    value={customReason}
                    onChangeText={setCustomReason}
                    textAlignVertical="top"
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>

        <BottomActionBar
          label="제출하기"
          disabled={!isActive}
          paddingBottom={insets.bottom + 16}
          onPress={() => router.push("/(settings)/withdrawal-terms")}
        />
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#17191C",
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
  optionItemSelected: {
    backgroundColor: "#F6F7FA",
  },
  optionText: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: "400",
    color: "#2A2A37",
  },
  customInput: {
    height: 183,
    backgroundColor: "#F6F7FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#2A2A37",
    marginTop: 4,
  },
})
