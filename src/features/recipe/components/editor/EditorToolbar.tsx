/**
 * 에디터 하단 도구 줄.
 *
 * 색은 **모드별 표를 손으로 들고 있지 않는다.** 예전에는 `{ light, dark }` 네 벌이
 * 있었고 그중 둘(`TOOLBAR_BORDER.dark` · `ICON_DISABLED.dark`)에 **라이트 토큰**
 * (`textLight*`)이 들어 있었다 — 이름이 모드를 말하지 않는 토큰이라 표에 옮겨 적는
 * 순간 아무도 못 알아본다. `useSurface()` 는 모드에 맞는 값을 이미 갖고 있고, 그러면
 * 옮겨 적을 표 자체가 없어진다.
 */
import { Pressable, StyleSheet } from "react-native"
import { V2HStack } from "@/src/design-system-v2"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"
import {
  KeyboardController,
  useKeyboardState,
} from "react-native-keyboard-controller"

interface EditorToolbarProps {
  onAddImage: () => void
  imageDisabled?: boolean
}

export function EditorToolbar({
  onAddImage,
  imageDisabled,
}: EditorToolbarProps) {
  const surface = useSurface()
  const insets = useSafeAreaInsets()
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)

  return (
    <V2HStack
      paddingHorizontal={20}
      align="center"
      style={[
        {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: surface.hairline,
        },
        {
          paddingTop: 10,
          paddingBottom: 10 + insets.bottom,
          backgroundColor: surface.card,
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
            color={imageDisabled ? surface.textWeak : surface.text}
          />
        </Pressable>
      </V2HStack>
      {isKeyboardVisible && (
        <Pressable
          onPress={() => KeyboardController.dismiss()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="keyboard" size={24} color={surface.text} />
        </Pressable>
      )}
    </V2HStack>
  )
}
