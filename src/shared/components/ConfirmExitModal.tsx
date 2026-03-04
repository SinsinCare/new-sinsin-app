import {
  Modal,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native"
import { Text, XStack } from "tamagui"

interface ConfirmExitModalProps {
  visible: boolean
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmExitModal({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmExitModalProps) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const textColor = isDarkMode ? "#E7E7EE" : "#2A2A37"
  const secondaryTextColor = isDarkMode ? "#ABABB4" : "#81818D"
  const cardBg = isDarkMode ? "#1F1F21" : "#FFFFFF"
  const borderColor = isDarkMode ? "#313138" : "#EAEAF0"
  const backdropBg = isDarkMode ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.3)"

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: backdropBg }]}
        onPress={onCancel}
      >
        <Pressable style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardContent}>
            <Text
              fontFamily="$body"
              fontSize={18}
              lineHeight={24}
              fontWeight="700"
              color={textColor}
              textAlign="center"
              marginBottom={8}
            >
              {title}
            </Text>

            <Text
              fontFamily="$body"
              fontSize={15}
              lineHeight={20}
              fontWeight="500"
              color={secondaryTextColor}
              textAlign="center"
            >
              {description}
            </Text>
          </View>

          <XStack borderTopWidth={1} borderColor={borderColor}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                ...styles.button,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                fontFamily="$body"
                fontSize={14}
                lineHeight={18}
                fontWeight="400"
                color={textColor}
                textAlign="center"
              >
                {cancelLabel}
              </Text>
            </Pressable>

            <View style={{ width: 1, backgroundColor: borderColor }} />

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                ...styles.button,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                fontFamily="$body"
                fontSize={14}
                lineHeight={18}
                fontWeight="600"
                color={textColor}
                textAlign="center"
              >
                {confirmLabel}
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
    overflow: "hidden",
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
})
