import { Sheet } from "@tamagui/sheet"
import { Pressable, useColorScheme, useWindowDimensions } from "react-native"
import { XStack, Text, YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Icon } from "@/src/shared/components/Icon"

const ChatHistorySheetLayout = ({
  isOpen,
  children,
}: {
  isOpen: boolean
  children: React.ReactNode
}) => {
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  const snapPoint = Math.round(
    ((screenHeight - insets.top) / screenHeight) * 100,
  )

  return (
    <Sheet modal open={isOpen} snapPoints={[snapPoint]} disableDrag>
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
        backgroundColor={isDarkMode ? "#1F1F21" : "#F3F3F3"}
      >
        <Sheet.Handle
          marginTop={8}
          backgroundColor={isDarkMode ? "#36363E" : "#D9D9DF"}
          alignSelf="center"
          height={4}
          width="40"
        />
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
  const colorScheme = useColorScheme()
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
            backgroundColor={isDarkMode ? "#2E2E34" : "#FDFDFD"}
            paddingVertical={6}
            paddingHorizontal={12}
            borderRadius={12}
            justifyContent="center"
            alignItems="center"
          >
            <Text
              fontSize={14}
              fontWeight="600"
              color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
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
        color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
      >
        상담 기록
      </Text>

      <XStack flex={1} justifyContent="flex-end">
        <Pressable onPress={onClose} hitSlop={8}>
          <Icon name="x" size={20} color={isDarkMode ? "#E7E7EE" : "#2A2A37"} />
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
    <Sheet.ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <YStack gap={16}>{children}</YStack>
    </Sheet.ScrollView>
  )
}

export const ChatHistorySheet = {
  Layout: ChatHistorySheetLayout,
  Header: ChatHistoryHeader,
  ContentLayout: ChatHistoryContentLayout,
}
