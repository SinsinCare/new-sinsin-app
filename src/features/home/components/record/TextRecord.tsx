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
import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { showConfirm } from "@/src/lib/dialog"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import type { AnalyticsMealSlot } from "@/src/features/analytics/events"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

interface TextRecordProps {
  open: boolean
  /** 어느 끼니 자리에서 열렸는지 — 진입 이벤트에만 쓴다. */
  slot: AnalyticsMealSlot
  onClose: () => void
  onSubmit: (text: string) => void
}

export function TextRecord({ open, slot, onClose, onSubmit }: TextRecordProps) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const [text, setText] = useState("")

  /*
    진입은 **열릴 때 1회**다. 닫히면 다시 셀 수 있게 되돌린다 — 이 컴포넌트는
    언마운트되지 않고 `open` 만 false 가 되므로 ref 를 직접 내려야 한다.
  */
  const openedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      setText("")
      openedRef.current = false
      return
    }
    if (openedRef.current) return
    openedRef.current = true
    trackAnalyticsEvent("food_text_record_viewed", { slot })
  }, [open, slot])

  /**
   * 쓰던 글을 두고 나가기 전에 한 번 묻는다.
   *
   * 자유글·레시피 편집기에는 원래 이 확인이 있었는데 이 화면에만 없었다 — 식사 기록의
   * 세 형제(사진·앨범·글) 중 글만 한 글자도 안 남기고 사라졌다. 비어 있으면 묻지
   * 않는다: 잃을 것이 없는데 확인을 붙이면 그냥 한 번 더 누르게 하는 것이다.
   */
  const handleClose = async () => {
    if (text.trim().length === 0) {
      // 한 글자도 안 쓰고 닫은 것 — 글 경로에서 가장 흔한 이탈이고 지금까지
      // 아무 흔적도 없었다. `filled:false` 가 그 몫이다.
      trackAnalyticsEvent("food_text_record_discarded", { filled: false })
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
    // 확인창에서 되돌아온 사람은 아직 안 나갔다 — 버린 순간에만 센다.
    if (confirmed) {
      trackAnalyticsEvent("food_text_record_discarded", { filled: true })
      onClose()
    }
  }
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const isDarkMode = useAppColorScheme() === "dark"
  const inactiveBg = isDarkMode
    ? tokens.color.grey3.val
    : tokens.color.grey8.val

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
      <V2VStack flex={1} style={{ backgroundColor: colors.background.default }}>
        <V2HStack
          align="center"
          justify="center"
          paddingTop={30}
          paddingBottom={10}
        >
          <V2Text
            color={colors.label.normal}
            style={{ fontSize: 18, fontWeight: "600", textAlign: "center" }}
          >
            {t("home.textRecord.title")}
          </V2Text>
          <V2HStack
            align="center"
            justify="center"
            onPress={() => void handleClose()}
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            style={{
              position: "absolute",
              top: 20,
              right: 12,
              width: 40,
              height: 40,
            }}
          >
            <Ionicons name="close" size={22} color={tokens.color.grey3.val} />
          </V2HStack>
        </V2HStack>

        <V2VStack
          flex={1}
          align="center"
          justify="center"
          paddingBottom={keyboardHeight > 0 ? 10 : 80}
          gap={16}
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
          <V2Text
            color={colors.label.alternative}
            lineBreakStrategyIOS="hangul-word"
            style={{ fontWeight: "600" }}
          >
            {t("home.textRecord.example")}
          </V2Text>
        </V2VStack>

        <TouchableOpacity
          onPress={() => onSubmit(text)}
          style={[
            styles.button,
            { marginBottom: keyboardHeight > 0 ? keyboardHeight + 12 : 40 },
            text ? styles.buttonActive : { backgroundColor: inactiveBg },
          ]}
          disabled={!text}
        >
          <V2Text
            color={text ? colors.static.white : colors.label.alternative}
            style={{ fontSize: 18, fontWeight: "600" }}
          >
            {t("home.textRecord.checkNutrients")}
          </V2Text>
        </TouchableOpacity>
      </V2VStack>
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
