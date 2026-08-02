import { Sheet } from "@tamagui/sheet"
import { ScrollView, Pressable, View } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import { tokens } from "@/src/theme/tokens"
import { Button } from "@/src/shared/components"
import { getCategoryMeta } from "../data/mockData"
import type { FaqItem } from "../types"
import { useTranslation } from "react-i18next"

interface FaqDetailSheetProps {
  item: FaqItem | null
  open: boolean
  onClose: () => void
}

export function FaqDetailSheet({ item, open, onClose }: FaqDetailSheetProps) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()

  if (!item) return null

  const meta = getCategoryMeta(item.category, i18n.language)

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onClose()
      }}
      snapPoints={[70]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay
        style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame borderTopLeftRadius="$8" borderTopRightRadius="$8">
        <Sheet.Handle />

        {/* Header: category badge + close button */}
        <XStack
          paddingHorizontal="$5"
          paddingTop="$2"
          paddingBottom="$3"
          justifyContent="space-between"
          alignItems="center"
        >
          {meta && (
            <XStack
              alignItems="center"
              gap="$2"
              backgroundColor={meta.color + "1A"}
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius="$6"
            >
              <Ionicons
                name={meta.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={meta.color}
              />
              <Text fontSize="$3" fontWeight="600" color={meta.color}>
                {meta.label}
              </Text>
            </XStack>
          )}
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color={tokens.color.grey3.val} />
          </Pressable>
        </XStack>

        {/* Question title */}
        <YStack paddingHorizontal="$5" paddingBottom="$3">
          <Text fontSize="$7" fontWeight="700" color="$color" lineHeight={28}>
            {item.question}
          </Text>
        </YStack>

        {/* Scrollable content */}
        <ScrollView
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            gap: 16,
          }}
        >
          {/* Answer card */}
          <YStack
            backgroundColor={"#f3fffc"}
            borderRadius="$4"
            padding="$4"
            gap="$3"
          >
            <XStack alignItems="center" gap="$2">
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: tokens.color.sub7.val,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text fontSize={12} fontWeight="700" color="white">
                  A
                </Text>
              </View>
              <Text
                fontSize="$3"
                fontWeight="600"
                color={tokens.color.sub7.val}
              >
                {t("consult.answer")}
              </Text>
            </XStack>
            <Text fontSize="$4" color="$grey2" lineHeight={24}>
              {item.answer}
            </Text>
          </YStack>

          {/* Bottom actions */}
          <YStack gap="$3">
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                onClose()
                router.push("/consult")
              }}
            >
              <XStack alignItems="center" gap="$2">
                <Ionicons name="chatbubble" size={18} color="white" />
                <Text fontSize="$4" fontWeight="600" color="white">
                  {t("consult.askMore")}
                </Text>
              </XStack>
            </Button>

            {/* <XStack gap="$3">
              <Button
                variant="outline"
                flex={1}
                onPress={() => console.log("Save tip:", item.id)}
              >
                <XStack alignItems="center" gap="$2">
                  <Ionicons
                    name="bookmark-outline"
                    size={16}
                    color={tokens.color.grey3.val}
                  />
                  <Text fontSize="$4" fontWeight="500" color="$color">
                    이 팁 저장하기
                  </Text>
                </XStack>
              </Button>
              <Button
                variant="outline"
                flex={1}
                onPress={() => console.log("Share:", item.id)}
              >
                <XStack alignItems="center" gap="$2">
                  <Ionicons
                    name="share-outline"
                    size={16}
                    color={tokens.color.grey3.val}
                  />
                  <Text fontSize="$4" fontWeight="500" color="$color">
                    공유하기
                  </Text>
                </XStack>
              </Button>
            </XStack> */}
          </YStack>
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
