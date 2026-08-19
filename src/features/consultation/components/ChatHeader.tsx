import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useV2Theme, V2HStack, V2Text } from "@/src/design-system-v2"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useAppRouter } from "@/src/shared/navigation"
import { tokens } from "@/src/theme/tokens"

interface ChatHeaderProps {
  title: string
}

export function ChatHeader({ title }: ChatHeaderProps) {
  const router = useAppRouter()
  const { colors } = useV2Theme()
  const colorScheme = useAppColorScheme()
  const iconColor = colorScheme === "dark" ? "#e7e7ee" : tokens.color.grey1.val

  return (
    <>
      <V2HStack paddingHorizontal={16} paddingVertical={12} align="center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={iconColor} />
        </Pressable>
        {/*
          `$color` 는 themes.ts 에서 `s.textStrong` → v2 `label.strong`.
          `flex={1}` 은 V2Text 가 받지 않으므로(글자만 그린다) style 로 준다 —
          가운데 정렬을 위해 남는 폭을 이 글자가 먹어야 한다.
        */}
        <V2Text
          token="title.small"
          color={colors.label.strong}
          style={styles.title}
          numberOfLines={1}
        >
          {title}
        </V2Text>
        {/* Spacer to balance back button */}
        <View style={styles.spacer} />
      </V2HStack>
      <View style={styles.divider} />
    </>
  )
}

const styles = StyleSheet.create({
  title: { flex: 1, textAlign: "center" },
  spacer: { width: 24 },
  divider: { height: 1, backgroundColor: tokens.color.grey8.val },
})
