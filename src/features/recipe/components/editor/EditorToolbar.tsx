import { Pressable, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2HStack } from "@/src/design-system-v2"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import {
  KeyboardController,
  useKeyboardState,
} from "react-native-keyboard-controller"

const TOOLBAR_BG = { light: "#FCFCFC", dark: "#2A2A30" }
const TOOLBAR_BORDER = {
  light: tokens.color.textLightSub.val,
  dark: tokens.color.textLightMuted.val,
}
const ICON_COLOR = { light: "#666677", dark: "#F5F6FA" }
const ICON_DISABLED = {
  light: "#C5C8CE",
  dark: tokens.color.textLightMuted.val,
}

interface EditorToolbarProps {
  onAddImage: () => void
  imageDisabled?: boolean
}

export function EditorToolbar({
  onAddImage,
  imageDisabled,
}: EditorToolbarProps) {
  const scheme = useAppColorScheme()
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)

  return (
    <V2HStack
      paddingHorizontal={20}
      align="center"
      style={[
        {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: TOOLBAR_BORDER[scheme],
        },
        {
          paddingTop: 10,
          paddingBottom: 10 + insets.bottom,
          backgroundColor: TOOLBAR_BG[scheme],
        },
      ]}
    >
      <V2HStack gap={20} flex={1}>
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
      </V2HStack>
      {isKeyboardVisible && (
        <Pressable
          onPress={() => KeyboardController.dismiss()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="keyboard" size={24} color={ICON_COLOR[scheme]} />
        </Pressable>
      )}
    </V2HStack>
  )
}
