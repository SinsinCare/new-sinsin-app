import { Pressable, useColorScheme, StyleSheet, Keyboard } from "react-native"
import { XStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"

const TOOLBAR_BG = { light: "#FCFCFC", dark: "#2A2A30" }
const TOOLBAR_BORDER = { light: tokens.color.textLightSub.val, dark: tokens.color.textLightMuted.val }
const ICON_COLOR = { light: "#666677", dark: "#F5F6FA" }
const ICON_DISABLED = { light: "#C5C8CE", dark: tokens.color.textLightMuted.val }

interface EditorToolbarProps {
  onAddImage: () => void
  imageDisabled?: boolean
  isKeyboardVisible?: boolean
}

export function EditorToolbar({
  onAddImage,
  imageDisabled,
  isKeyboardVisible,
}: EditorToolbarProps) {
  const scheme = useColorScheme() ?? "light"
  const insets = useSafeAreaInsets()

  return (
    <XStack
      paddingHorizontal={20}
      paddingVertical={10}
      paddingBottom={isKeyboardVisible ? 10 : 10 + insets.bottom}
      style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: TOOLBAR_BORDER[scheme] }}
      backgroundColor={TOOLBAR_BG[scheme]}
      alignItems="center"
    >
      <XStack gap={20} flex={1}>
        <Pressable
          onPress={onAddImage}
          disabled={imageDisabled}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: imageDisabled ? 0.4 : pressed ? 0.7 : 1,
          })}
        >
          <Icon
            name="gallery"
            size={24}
            color={imageDisabled ? ICON_DISABLED[scheme] : ICON_COLOR[scheme]}
          />
        </Pressable>
      </XStack>
      {isKeyboardVisible && (
        <Pressable
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="keyboard" size={24} color={ICON_COLOR[scheme]} />
        </Pressable>
      )}
    </XStack>
  )
}
