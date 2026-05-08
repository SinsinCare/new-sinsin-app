import { ReactNode } from "react"
import { TouchableOpacity, Image, ImageSourcePropType } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"

interface RecordCardProps {
  type: string
  title: string
  subtitle?: string
  onReset?: () => void
  icon?: ImageSourcePropType
  children: ReactNode
}

export function RecordCard({
  type,
  title,
  subtitle,
  onReset,
  icon,
  children,
}: RecordCardProps) {
  const isHorizontal = type === "edema"
  const isDarkMode = useAppColorScheme() === "dark"

  const titleSection = (
    <XStack
      flex={isHorizontal ? 1 : undefined}
      alignItems="center"
      gap="$3"
    >
      {icon && (
        <Image source={icon} style={{ width: 36, height: 36 }} />
      )}
      <YStack flex={1} justifyContent="center" gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize={18}
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$color"}
          >
            {title}
          </Text>
          {onReset && (
            <TouchableOpacity onPress={onReset}>
              <XStack alignItems="center" gap={2}>
                <Text fontSize={14} color="$grey5">
                  되돌리기
                </Text>
                <Ionicons name="refresh" size={14} color="#999" />
              </XStack>
            </TouchableOpacity>
          )}
        </XStack>
        {subtitle && (
          <Text fontSize={13} color="$grey5">
            {subtitle}
          </Text>
        )}
      </YStack>
    </XStack>
  )

  if (isHorizontal) {
    return (
      <XStack
        backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
        borderRadius="$6"
        paddingVertical="$4"
        paddingHorizontal="$5"
        alignItems="flex-start"
      >
        {titleSection}
        <YStack gap="$2">{children}</YStack>
      </XStack>
    )
  }

  return (
    <XStack
      backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
      borderRadius="$6"
      paddingVertical="$4"
      paddingHorizontal="$4"
      gap="$3"
    >
      <YStack flex={1} gap="$1">
        {titleSection}
        {children}
      </YStack>
    </XStack>
  )
}
