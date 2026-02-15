import { styled, YStack, YStackProps } from "tamagui"

export const GlassmorphicCard = styled(YStack, {
  name: "GlassmorphicCard",
  backgroundColor: "$cardBackground",
  borderRadius: "$4",
  padding: "$4",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,

  variants: {
    variant: {
      default: {},
      elevated: {
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
      flat: {
        shadowOpacity: 0,
        elevation: 0,
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
  },
})

export type GlassmorphicCardProps = YStackProps & {
  variant?: "default" | "elevated" | "flat"
}
