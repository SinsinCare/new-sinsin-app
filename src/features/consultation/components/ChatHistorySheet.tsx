import { useRef, useMemo } from "react"
import { Sheet } from "@tamagui/sheet"
import {
  PanResponder,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text, YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"

const DRAG_DISMISS_THRESHOLD = 60

const ChatHistorySheetLayout = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) => {
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  const snapPoint = Math.round(
    ((screenHeight - insets.top) / screenHeight) * 100,
  )

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > DRAG_DISMISS_THRESHOLD) {
            onCloseRef.current()
          }
        },
      }),
    [],
  )

  return (
    <Sheet
      modal
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose()
      }}
      snapPoints={[snapPoint]}
      disableDrag
    >
      <Sheet.Overlay
        style={{
          backgroundColor: isDarkMode ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.20)",
        }}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        backgroundColor={isDarkMode ? tokens.color.appBgDark.val : "#F3F3F3"}
      >
        <View
          {...panResponder.panHandlers}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDarkMode ? "#36363E" : "#D9D9DF",
            }}
          />
        </View>
        {children}
      </Sheet.Frame>
    </Sheet>
  )
}

const ChatHistoryHeader = ({
  onNewChat,
  onClose,
}: {
  onNewChat: () => void
  onClose: () => void
}) => {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  return (
    <XStack
      paddingHorizontal={20}
      paddingVertical={4}
      paddingBottom={16}
      justifyContent="space-between"
      alignItems="center"
    >
      <XStack flex={1}>
        <Pressable onPress={onNewChat} hitSlop={8}>
          <XStack
            backgroundColor={isDarkMode ? tokens.color.inputBgDark.val : tokens.color.offWhite.val}
            paddingVertical={6}
            paddingHorizontal={12}
            borderRadius={12}
            justifyContent="center"
            alignItems="center"
          >
            <Text
              fontSize={14}
              fontWeight="600"
              color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val}
            >
              + 새 대화
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      <Text
        fontSize={15}
        lineHeight={20}
        fontWeight="500"
        color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val}
      >
        상담 기록
      </Text>

      <XStack flex={1} justifyContent="flex-end">
        <Pressable onPress={onClose} hitSlop={8}>
          <Icon name="x" size={20} color={isDarkMode ? tokens.color.textDark.val : tokens.color.textLight.val} />
        </Pressable>
      </XStack>
    </XStack>
  )
}

const ChatHistoryContentLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <YStack gap={16}>{children}</YStack>
    </ScrollView>
  )
}

export const ChatHistorySheet = {
  Layout: ChatHistorySheetLayout,
  Header: ChatHistoryHeader,
  ContentLayout: ChatHistoryContentLayout,
}
