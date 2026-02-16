import { XStack, Text } from "tamagui"
import RNToast, {
  type ToastConfig,
  type ToastConfigParams,
} from "react-native-toast-message"
import { tokens } from "../../theme/tokens"

function ToastBase({
  text1,
  bg,
  textColor,
}: ToastConfigParams<unknown> & { bg: string; textColor: string }) {
  return (
    <XStack
      backgroundColor={bg}
      paddingHorizontal="$4"
      paddingVertical="$3"
      borderRadius="$3"
      marginHorizontal="$4"
      alignItems="center"
      gap="$2"
    >
      <Text color={textColor} fontSize="$4" fontFamily="$body" flex={1}>
        {text1}
      </Text>
    </XStack>
  )
}

const toastConfig: ToastConfig = {
  error: (props) => (
    <ToastBase
      {...props}
      bg={tokens.color.primary1.val}
      textColor={tokens.color.primary8.val}
    />
  ),
  success: (props) => (
    <ToastBase
      {...props}
      bg={tokens.color.sub1.val}
      textColor={tokens.color.sub8.val}
    />
  ),
  info: (props) => (
    <ToastBase
      {...props}
      bg={tokens.color.grey8.val}
      textColor={tokens.color.grey2.val}
    />
  ),
}

export function Toast() {
  return <RNToast config={toastConfig} topOffset={60} visibilityTime={3000} />
}
