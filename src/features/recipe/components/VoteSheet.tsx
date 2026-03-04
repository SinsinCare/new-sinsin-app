import { useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  useColorScheme,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

export interface VoteData {
  options: string[]
  allowMultiple: boolean
}

interface VoteSheetProps {
  open: boolean
  onClose: () => void
  onComplete: (data: VoteData) => void
  initialData?: VoteData | null
}

const BG_COLOR = { light: "#FCFCFC", dark: "#2A2A30" } as const
const HEADER_TEXT = { light: "#3C3C43", dark: "#E7E7EE" } as const
const COMPLETE_ACTIVE = { light: "#028A67", dark: "#43C6A7" } as const
const COMPLETE_DISABLED = { light: "#C7C7CC", dark: "#636366" } as const
const INPUT_BG = { light: "#FFFFFF", dark: "#1F1F21" } as const
const INPUT_BORDER = { light: "#E5E5EA", dark: "#38383A" } as const
const INPUT_TEXT = { light: "#2A2A37", dark: "#E7E7EE" } as const
const INPUT_PLACEHOLDER = { light: "#A5A5AF", dark: "#595960" } as const
const ADD_BTN_BG = { light: "#C6E5DE", dark: "#36363E" } as const
const ADD_BTN_TEXT = { light: "#474758", dark: "#F3F3F3" } as const
const REMOVE_BTN_ICON = { light: "#A5A5AF", dark: "#A5A5AF" } as const
const LABEL_TEXT = { light: "#2A2A37", dark: "#E7E7EE" } as const
const HINT_TEXT = { light: "#8E8E93", dark: "#858591" } as const
const SWITCH_TRACK_ON = "#43C6A7"
const SWITCH_TRACK_OFF_IOS = { light: "#E5E5EA", dark: "#38383A" } as const

const MIN_OPTIONS = 2

export function VoteSheet({
  open,
  onClose,
  onComplete,
  initialData,
}: VoteSheetProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const [options, setOptions] = useState<string[]>(
    initialData?.options ?? ["", ""],
  )
  const [allowMultiple, setAllowMultiple] = useState(
    initialData?.allowMultiple ?? false,
  )

  const canComplete = options.some((opt) => opt.trim().length > 0)

  const handleAddOption = () => {
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
    const filledOptions = options.filter((opt) => opt.trim().length > 0)
    onComplete({ options: filledOptions, allowMultiple })
  }

  const completeColor = canComplete
    ? isDark
      ? COMPLETE_ACTIVE.dark
      : COMPLETE_ACTIVE.light
    : isDark
      ? COMPLETE_DISABLED.dark
      : COMPLETE_DISABLED.light

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <YStack
          flex={1}
          backgroundColor={isDark ? BG_COLOR.dark : BG_COLOR.light}
          paddingTop={10}
        >
          {/* Header */}
          <XStack
            paddingHorizontal={30}
            paddingVertical={12}
            alignItems="center"
            justifyContent="space-between"
          >
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Icon
                name="x"
                size={24}
                color={isDark ? HEADER_TEXT.dark : HEADER_TEXT.light}
              />
            </Pressable>
            <Text
              fontSize={16}
              fontWeight="600"
              fontFamily="$body"
              color={isDark ? HEADER_TEXT.dark : HEADER_TEXT.light}
            >
              투표
            </Text>
            <Pressable
              onPress={handleComplete}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: pressed && canComplete ? 0.7 : 1,
              })}
            >
              <Text
                fontSize={16}
                fontWeight="600"
                fontFamily="$body"
                color={completeColor}
              >
                완료
              </Text>
            </Pressable>
          </XStack>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Option inputs */}
            <YStack gap={10}>
              {options.map((opt, index) => (
                <XStack key={index} alignItems="center" gap={8}>
                  <TextInput
                    value={opt}
                    onChangeText={(text) => handleChangeOption(index, text)}
                    placeholder="항목입력"
                    placeholderTextColor={
                      isDark ? INPUT_PLACEHOLDER.dark : INPUT_PLACEHOLDER.light
                    }
                    style={[
                      voteStyles.optionInput,
                      {
                        flex: 1,
                        color: isDark ? INPUT_TEXT.dark : INPUT_TEXT.light,
                        backgroundColor: isDark
                          ? INPUT_BG.dark
                          : INPUT_BG.light,
                        borderColor: isDark
                          ? INPUT_BORDER.dark
                          : INPUT_BORDER.light,
                      },
                    ]}
                  />
                  {options.length > MIN_OPTIONS && (
                    <Pressable
                      onPress={() => handleRemoveOption(index)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Icon
                        name="minus-circle"
                        size={20}
                        color={
                          isDark ? REMOVE_BTN_ICON.dark : REMOVE_BTN_ICON.light
                        }
                      />
                    </Pressable>
                  )}
                </XStack>
              ))}
            </YStack>

            {/* Add option button */}
            <Pressable
              onPress={handleAddOption}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                backgroundColor: isDark ? ADD_BTN_BG.dark : ADD_BTN_BG.light,
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                marginTop: 16,
              })}
            >
              <Text
                fontSize={14}
                fontWeight="600"
                fontFamily="$body"
                color={isDark ? ADD_BTN_TEXT.dark : ADD_BTN_TEXT.light}
              >
                ＋ 항목 추가
              </Text>
            </Pressable>

            {/* Allow multiple toggle */}
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginTop={28}
            >
              <Text
                fontSize={16}
                lineHeight={20}
                fontWeight="500"
                fontFamily="$body"
                color={isDark ? LABEL_TEXT.dark : LABEL_TEXT.light}
              >
                복수 선택 가능
              </Text>
              <Switch
                value={allowMultiple}
                onValueChange={setAllowMultiple}
                trackColor={{
                  false: isDark
                    ? SWITCH_TRACK_OFF_IOS.dark
                    : SWITCH_TRACK_OFF_IOS.light,
                  true: SWITCH_TRACK_ON,
                }}
                thumbColor="#FFFFFF"
              />
            </XStack>

            {/* Hints */}
            <YStack marginTop={24} gap={8}>
              <XStack
                alignItems="center"
                justifyContent="center"
                gap={6}
                padding={16}
              >
                <Icon
                  name="info"
                  size={20}
                  color={isDark ? HINT_TEXT.dark : HINT_TEXT.light}
                />
                <Text
                  fontSize={14}
                  fontWeight="500"
                  lineHeight={20}
                  color={isDark ? HINT_TEXT.dark : HINT_TEXT.light}
                  fontFamily="$body"
                >
                  글 등록 이후에는 투표 수정 및 삭제가 불가능합니다.
                </Text>
              </XStack>
              <Text
                fontSize={13}
                color={isDark ? HINT_TEXT.dark : HINT_TEXT.light}
                fontFamily="$body"
              >
                * 투표는 7일간 집계됩니다
              </Text>
            </YStack>
          </ScrollView>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const voteStyles = StyleSheet.create({
  optionInput: {
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
})
