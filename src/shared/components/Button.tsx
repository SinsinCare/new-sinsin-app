import { Button as TamaguiButton, styled, Spinner, XStack, Text } from 'tamagui'

const StyledButton = styled(TamaguiButton, {
  name: 'SinsinButton',
  borderRadius: '$3',
  height: 48,
  pressStyle: {
    opacity: 0.8,
    scale: 0.98,
  },

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: 'white',
      },
      secondary: {
        backgroundColor: '$secondary',
        color: 'white',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$primary',
        color: '$primary',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$primary',
      },
      danger: {
        backgroundColor: '$danger',
        color: 'white',
      },
    },
    size: {
      small: {
        height: 36,
        paddingHorizontal: '$3',
      },
      medium: {
        height: 48,
        paddingHorizontal: '$4',
      },
      large: {
        height: 56,
        paddingHorizontal: '$5',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'medium',
  },
})

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  flex?: number
}

export function Button({ children, loading, disabled, ...props }: ButtonProps) {
  return (
    <StyledButton disabled={disabled || loading} opacity={disabled ? 0.5 : 1} {...props}>
      {loading ? (
        <XStack gap="$2" alignItems="center">
          <Spinner size="small" color="white" />
          <Text color="white">{children}</Text>
        </XStack>
      ) : (
        children
      )}
    </StyledButton>
  )
}
