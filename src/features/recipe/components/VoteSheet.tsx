import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useTranslation } from "react-i18next"

export interface VoteData {
  /** 투표 질문(선택). */
  title?: string
  options: string[]
  allowMultiple: boolean
}

interface VoteSheetProps {
  open: boolean
  onClose: () => void
  onComplete: (data: VoteData) => void
  initialData?: VoteData | null
}

const MIN_OPTIONS = 2
const MAX_OPTIONS = 10

export function VoteSheet({
  open,
  onClose,
  onComplete,
  initialData,
}: VoteSheetProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const topPadding =
    Platform.OS === "android" ? Math.max(insets.top, 24) + 10 : 10

  const [title, setTitle] = useState(initialData?.title ?? "")
  const [options, setOptions] = useState<string[]>(
    initialData?.options ?? ["", ""],
  )
  const [allowMultiple, setAllowMultiple] = useState(
    initialData?.allowMultiple ?? false,
  )

  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"

  const filledOptions = options
    .map((opt) => opt.trim())
    .filter((opt) => opt.length > 0)
  const hasDuplicateOptions =
    new Set(filledOptions.map((opt) => opt.toLocaleLowerCase())).size !==
    filledOptions.length
  const canComplete =
    filledOptions.length >= MIN_OPTIONS && !hasDuplicateOptions

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) return
    hapticSelection()
    setOptions((prev) => [...prev, ""])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleChangeOption = (index: number, text: string) => {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = text
      return next
    })
  }

  const handleComplete = () => {
    if (!canComplete) return
    hapticSelection()
    onComplete({
      title: title.trim() || undefined,
      options: filledOptions,
      allowMultiple,
    })
  }

  return (
    <AppModal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View
          style={[
            styles.screen,
            { backgroundColor: surface.canvas, paddingTop: topPadding },
          ]}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
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
            >
              {initialData ? t("poll.editTitle") : t("poll.createTitle")}
            </Text>
            <SurfacePressable
              onPress={handleComplete}
              disabled={!canComplete}
              haptic={false}
              accessibilityLabel={
                initialData
                  ? t("poll.saveAccessibility")
                  : t("poll.attachAccessibility")
              }
              accessibilityState={{ disabled: !canComplete }}
              baseColor={canComplete ? inkBg : surface.ctaOffBg}
              pressedColor={
                canComplete
                  ? surface.isDark
                    ? "#DADAE0"
                    : "#34363A"
                  : surface.ctaOffBg
              }
              pressScale={0.94}
              style={styles.completePill}
            >
              <Text
                style={[
                  styles.completeLabel,
                  { color: canComplete ? inkContent : surface.ctaOffText },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {initialData ? t("action.save") : t("poll.attach")}
              </Text>
            </SurfacePressable>
          </View>

          {/* 내용 */}
          <ScrollView
            bounces={false}
            overScrollMode="never"
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* 질문(선택) — 글 제목과 별개로 투표가 스스로 묻게 한다. */}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("poll.questionPlaceholder")}
              placeholderTextColor={surface.placeholder}
              maxLength={100}
              style={[
                styles.titleInput,
                {
                  color: surface.textStrong,
                  borderBottomColor: surface.hairline,
                },
              ]}
            />

            <View style={styles.optionList}>
              {options.map((opt, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    value={opt}
                    onChangeText={(text) => handleChangeOption(index, text)}
                    placeholder={t("poll.optionPlaceholder", {
                      number: index + 1,
                    })}
                    placeholderTextColor={surface.placeholder}
                    maxLength={100}
                    style={[
                      styles.optionInput,
                      {
                        color: surface.textStrong,
                        backgroundColor: surface.surface,
                      },
                    ]}
                  />
                  {options.length > MIN_OPTIONS && (
                    <Pressable
                      onPress={() => handleRemoveOption(index)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t("poll.deleteOption", {
                        number: index + 1,
                      })}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={22}
                        color={surface.textWeak}
                      />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            <SurfacePressable
              onPress={handleAddOption}
              disabled={options.length >= MAX_OPTIONS}
              haptic={false}
              accessibilityLabel={t("poll.addOption")}
              baseColor={surface.surface}
              pressScale={0.98}
              style={[
                styles.addButton,
                options.length >= MAX_OPTIONS && styles.addButtonDisabled,
              ]}
            >
              <Ionicons name="add" size={18} color={surface.textStrong} />
              <Text
                style={[styles.addLabel, { color: surface.textStrong }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("poll.addOption")}
              </Text>
            </SurfacePressable>

            <View style={styles.toggleRow}>
              <Text
                style={[styles.toggleLabel, { color: surface.textStrong }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("poll.allowMultiple")}
              </Text>
              <Switch
                value={allowMultiple}
                onValueChange={(value) => {
                  hapticSelection()
                  setAllowMultiple(value)
                }}
                trackColor={{
                  false: surface.isDark ? "#3A3A40" : "#E1E2E4",
                  true: surface.brand,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.hints}>
              {hasDuplicateOptions && (
                <Text
                  style={[styles.hintText, { color: surface.danger }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("poll.duplicateError")}
                </Text>
              )}
              <Text
                style={[styles.hintText, { color: surface.textMuted }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("poll.lockedHint")}
              </Text>
              <Text
                style={[styles.hintSub, { color: surface.textWeak }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("poll.optionLimit")}
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },

  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  completePill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  completeLabel: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.28,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  titleInput: {
    fontSize: 17,
    letterSpacing: -0.34,
    // 단일행 입력엔 lineHeight 를 주지 않는다 — iOS 가 글자를 문단 기준으로 앉혀
    // 상하 여백이 어긋난다(surface.ts `singleLineInputText` 머리말).
    includeFontPadding: false,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    paddingVertical: 14,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionInput: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15.5,
    letterSpacing: -0.31,
    fontFamily: "Pretendard-Medium",
    fontWeight: "500",
  },
  addButton: {
    height: 52,
    borderRadius: 14,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addLabel: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  toggleRow: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.31,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  hints: {
    marginTop: 28,
    gap: 4,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.26,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  hintSub: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontFamily: "Pretendard-Regular",
  },
})
