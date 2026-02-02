import { Input, Label, YStack, Text, styled, InputProps } from 'tamagui'
import { useState } from 'react'

const StyledInput = styled(Input, {
  name: 'SinsinInput',
  backgroundColor: '$cardBackground',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$3',
  height: 48,
  paddingHorizontal: '$3',
  fontSize: 16,

  focusStyle: {
    borderColor: '$primary',
    borderWidth: 2,
  },

  variants: {
    error: {
      true: {
        borderColor: '$danger',
      },
    },
  } as const,
})

interface TextFieldProps extends Omit<InputProps, 'size'> {
  label?: string
  error?: string
  helper?: string
}

export function TextField({ label, error, helper, ...props }: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <YStack gap="$1.5">
      {label && (
        <Label
          fontSize={14}
          color={error ? '$danger' : isFocused ? '$primary' : '$color'}
        >
          {label}
        </Label>
      )}
      <StyledInput
        error={!!error}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {(error || helper) && (
        <Text fontSize={12} color={error ? '$danger' : '$colorSubtle'}>
          {error || helper}
        </Text>
      )}
    </YStack>
  )
}
