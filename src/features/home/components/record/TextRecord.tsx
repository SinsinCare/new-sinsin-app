import { tokens } from "@/src/theme/tokens"
import {
  Keyboard,
  KeyboardEvent,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"

interface TextRecordProps {
  open: boolean
  onClose: () => void
  onSubmit: (text: string) => void
}

export function TextRecord({ open, onClose, onSubmit }: TextRecordProps) {
  const [text, setText] = useState("")
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!open) setText("")
  }, [open])

  useEffect(() => {
    const show = Keyboard.addListener(
      "keyboardWillShow",
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height)
      },
    )
    const hide = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <YStack flex={1} backgroundColor={tokens.color.appBg.val}>
        <XStack
          alignItems="center"
          justifyContent="center"
          paddingTop={30}
          paddingBottom={10}
        >
          <Text fontSize={18} fontWeight="600" textAlign="center">
            직접 기록하기
          </Text>
          <XStack
            position="absolute"
            top={20}
            right={12}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            onPress={onClose}
            pressStyle={{ opacity: 0.7 }}
          >
            <Ionicons name="close" size={22} color={tokens.color.grey3.val} />
          </XStack>
        </XStack>

        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingBottom={keyboardHeight > 0 ? 10 : 80}
          gap="$4"
        >
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="음식 종류와 양을 알려주세요."
            textAlign="center"
          />
          <Text color="$colorSubtle" fontWeight="600">
            예: 샐러드 1인분, 고기 150g, 계란 1개, 우유 1컵
          </Text>
        </YStack>

        <TouchableOpacity
          onPress={() => onSubmit(text)}
          style={[
            styles.button,
            { marginBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 40 },
            text ? styles.buttonActive : styles.buttonInactive,
          ]}
          disabled={!text}
        >
          <Text
            fontSize={18}
            fontWeight="600"
            color={text ? "$color.pureWhite" : "$colorSubtle"}
          >
            영양성분 분석하기
          </Text>
        </TouchableOpacity>
      </YStack>
    </Modal>
  )
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    width: "80%",
    fontSize: 26,
    fontWeight: "700",
  },
  button: {
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 100,
  },
  buttonActive: {
    backgroundColor: tokens.color.primary7.val,
  },
  buttonInactive: {
    backgroundColor: tokens.color.grey8.val,
  },
})
