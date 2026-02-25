import { useState, useEffect, useRef } from "react"
import {
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { Text, XStack } from "tamagui"

interface RenameModalProps {
  visible: boolean
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
}

export function RenameModal({
  visible,
  currentName,
  onConfirm,
  onCancel,
}: RenameModalProps) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  const [name, setName] = useState(currentName)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setName(currentName)
    }
  }, [visible, currentName])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onConfirm(trimmed)
    }
  }

  const textColor = isDarkMode ? "#E7E7EE" : "#2A2A37"
  const secondaryTextColor = isDarkMode ? "#ABABB4" : "#81818D"
  const cardBg = isDarkMode ? "#2E2E34" : "#FFFFFF"
  const inputBorderColor = isDarkMode ? "#4E4F55" : "#D9D9DE"
  const backdropBg = isDarkMode
    ? "rgba(0, 0, 0, 0.7)"
    : "rgba(0, 0, 0, 0.3)"

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={() => inputRef.current?.focus()}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: backdropBg }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: cardBg }]}>
          <Text
            fontSize={16}
            fontWeight="600"
            color={textColor}
            textAlign="center"
            marginBottom={16}
          >
            제목 바꾸기
          </Text>

          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="대화 요약"
            placeholderTextColor={secondaryTextColor}
            style={[
              styles.input,
              {
                color: textColor,
                borderColor: inputBorderColor,
              },
            ]}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />

          <XStack marginTop={16}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                ...styles.button,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                fontSize={15}
                fontWeight="500"
                color={secondaryTextColor}
                textAlign="center"
              >
                취소
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => ({
                ...styles.button,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                fontSize={15}
                fontWeight="500"
                color={textColor}
                textAlign="center"
              >
                확인
              </Text>
            </Pressable>
          </XStack>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  input: {
    fontSize: 15,
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
})
