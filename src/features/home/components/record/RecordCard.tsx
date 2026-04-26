import { ReactNode } from "react"
import { TouchableOpacity, Image, ImageSourcePropType } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { Ionicons } from "@expo/vector-icons"

interface RecordCardProps {
  title: string
  subtitle?: string
  onReset?: () => void
  icon?: ImageSourcePropType
  isDarkMode: boolean
  children: ReactNode
}

export function RecordCard({
  title,
  subtitle,
  onReset,
  icon,
  isDarkMode,
  children,
}: RecordCardProps) {
  return (
    <XStack
      backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
      borderRadius="$6"
      paddingVertical="$4"
      paddingHorizontal="$4"
      gap="$3"
    >
      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$3">
          {icon && <Image source={icon} style={{ width: 36, height: 36 }} />}
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
        {children}
      </YStack>
    </XStack>
  )
}
