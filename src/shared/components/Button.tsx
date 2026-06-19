import { Button as TamaguiButton, styled, Spinner, XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

const StyledButton = styled(TamaguiButton, {
  name: "SinsinButton",
  borderRadius: "$3",
  minHeight: 48,
  paddingVertical: "$3",
  pressStyle: {
    opacity: 0.8,
    scale: 0.98,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: tokens.color.sub6.val,
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
        minHeight: 36,
        paddingHorizontal: "$3",
        paddingVertical: "$2",
      },
      medium: {
        minHeight: 48,
        paddingHorizontal: "$4",
        paddingVertical: "$3",
      },
      large: {
        minHeight: 56,
        paddingHorizontal: "$5",
        paddingVertical: "$3",
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
      opacity={isDisabled ? 0.5 : 1}
      onPress={handlePress}
      {...props}
    >
      <XStack
        gap="$2"
        alignItems="center"
        justifyContent="center"
        flexShrink={1}
        maxWidth="100%"
      >
        {loading && <Spinner size="small" color="white" />}
        <Text color="white" textAlign="center" flexShrink={1} lineHeight={20}>
          {children}
        </Text>
      </XStack>
    </StyledButton>
  )
}
