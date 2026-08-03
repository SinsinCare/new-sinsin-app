import { tokens } from "@/src/theme/tokens"
import {
  Keyboard,
  KeyboardEvent,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { ModalOverlayHost } from "@/src/shared/components"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { showConfirm } from "@/src/lib/dialog"
import { Text, XStack, YStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface TextRecordProps {
  open: boolean
  onClose: () => void
  onSubmit: (text: string) => void
}

export function TextRecord({ open, onClose, onSubmit }: TextRecordProps) {
  const { t } = useTranslation()
  const [text, setText] = useState("")

  /**
   * 쓰던 글을 두고 나가기 전에 한 번 묻는다.
   *
   * 자유글·레시피 편집기에는 원래 이 확인이 있었는데 이 화면에만 없었다 — 식사 기록의
   * 세 형제(사진·앨범·글) 중 글만 한 글자도 안 남기고 사라졌다. 비어 있으면 묻지
   * 않는다: 잃을 것이 없는데 확인을 붙이면 그냥 한 번 더 누르게 하는 것이다.
   */
  const handleClose = async () => {
    if (text.trim().length === 0) {
      onClose()
      return
    }
    const confirmed = await showConfirm({
      title: t("home.textRecord.discardTitle"),
      description: t("home.textRecord.discardBody"),
      confirmLabel: t("home.textRecord.discard"),
      cancelLabel: t("home.textRecord.keepWriting"),
      destructive: true,
    })
    if (confirmed) onClose()
  }
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const isDarkMode = useAppColorScheme() === "dark"
  const inactiveBg = isDarkMode
    ? tokens.color.grey3.val
    : tokens.color.grey8.val

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
    <AppModal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => void handleClose()}
    >
      <YStack flex={1} backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}>
        <XStack
          alignItems="center"
          justifyContent="center"
          paddingTop={30}
          paddingBottom={10}
        >
          <Text
            fontSize={18}
            fontWeight="600"
            textAlign="center"
            color={isDarkMode ? "$textDark" : "$black"}
          >
            {t("home.textRecord.title")}
          </Text>
          <XStack
            position="absolute"
            top={20}
            right={12}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            onPress={() => void handleClose()}
            pressStyle={{ opacity: 0.7 }}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
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
            style={[
              styles.input,
              {
                color: isDarkMode
                  ? tokens.color.textDark.val
                  : tokens.color.black.val,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder={t("home.textRecord.placeholder")}
            textAlign="center"
          />
          <Text color="$colorSubtle" fontWeight="600">
            {t("home.textRecord.example")}
          </Text>
        </YStack>

        <TouchableOpacity
          onPress={() => onSubmit(text)}
          style={[
            styles.button,
            { marginBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 40 },
            text ? styles.buttonActive : { backgroundColor: inactiveBg },
          ]}
          disabled={!text}
        >
          <Text
            fontSize={18}
            fontWeight="600"
            color={text ? "$color.pureWhite" : "$colorSubtle"}
          >
            {t("home.textRecord.checkNutrients")}
          </Text>
        </TouchableOpacity>
      </YStack>
      {/* RN Modal 안에서 다이얼로그·토스트가 뜨려면 이 안에도 호스트가 있어야 한다. */}
      <ModalOverlayHost />
    </AppModal>
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
    borderRadius: 30,
  },
  buttonActive: {
    backgroundColor: tokens.color.primary7.val,
  },
  buttonInactive: {
    backgroundColor: tokens.color.grey8.val,
  },
})
