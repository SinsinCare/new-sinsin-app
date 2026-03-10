import { Button as TamaguiButton, styled, Spinner, XStack, Text } from "tamagui"

const StyledButton = styled(TamaguiButton, {
  name: "SinsinButton",
  borderRadius: "$3",
  height: 48,
  pressStyle: {
    opacity: 0.8,
    scale: 0.98,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: "#44af94",
        color: "white",
      },
      secondary: {
        backgroundColor: "$secondary",
        color: "white",
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "$primary",
        color: "$primary",
      },
      ghost: {
        backgroundColor: "transparent",
        color: "$primary",
      },
      danger: {
        backgroundColor: "$danger",
        color: "white",
      },
    },
    buttonSize: {
      small: {
        height: 36,
        paddingHorizontal: "$3",
      },
      medium: {
        height: 48,
        paddingHorizontal: "$4",
      },
      large: {
        height: 56,
        paddingHorizontal: "$5",
      },
    },
    fullWidth: {
      true: {
        width: "100%",
      },
    },
  } as const,

  defaultVariants: {
    variant: "primary",
    buttonSize: "medium",
  },
})

interface ButtonProps {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  buttonSize?: "small" | "medium" | "large"
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  flex?: number
}

export function Button({
  children,
  loading,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const handlePress = () => {
    if (isDisabled) return
    onPress?.()
  }

  return (
    <StyledButton
      size="$4"
      opacity={isDisabled ? 0.5 : 1}
      onPress={handlePress}
      {...props}
    >
      <XStack gap="$2" alignItems="center">
        {loading && <Spinner size="small" color="white" />}
        <Text color="white">{children}</Text>
      </XStack>
    </StyledButton>
  )
}
