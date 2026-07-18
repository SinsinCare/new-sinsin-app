import type { ReactNode } from "react"
import { Text, YStack } from "tamagui"

import { radius, spacing } from "@/src/design-system-v2"

interface RestaurantReportSectionProps {
  title: string
  children: ReactNode
  backgroundColor: string
  borderColor: string
  textColor: string
}

export function RestaurantReportSection({
  title,
  children,
  backgroundColor,
  borderColor,
  textColor,
}: RestaurantReportSectionProps) {
  return (
    <YStack
      gap={spacing[16]}
      padding={spacing[16]}
      borderRadius={radius.lg}
      borderWidth={1}
      borderColor={borderColor}
      backgroundColor={backgroundColor}
    >
      <Text fontSize={15} lineHeight={20} fontWeight="700" color={textColor}>
        {title}
      </Text>
      {children}
    </YStack>
  )
}
