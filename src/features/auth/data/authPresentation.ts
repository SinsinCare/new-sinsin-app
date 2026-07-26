import type { TextInputProps } from "react-native"

export type AuthTextInputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "phone"

type AuthTextInputPresentation = Pick<
  TextInputProps,
  "autoCapitalize" | "keyboardType" | "secureTextEntry"
>

const AUTH_TEXT_INPUT_PRESENTATION: Record<
  AuthTextInputType,
  AuthTextInputPresentation
> = {
  text: {
    keyboardType: "default",
    autoCapitalize: "sentences",
    secureTextEntry: false,
  },
  email: {
    keyboardType: "email-address",
    autoCapitalize: "none",
    secureTextEntry: false,
  },
  password: {
    keyboardType: "default",
    autoCapitalize: "none",
    secureTextEntry: true,
  },
  number: {
    keyboardType: "numeric",
    autoCapitalize: "none",
    secureTextEntry: false,
  },
  phone: {
    keyboardType: "phone-pad",
    autoCapitalize: "none",
    secureTextEntry: false,
  },
}

/**
 * Auth field defaults kept separate from V2TextField so the design-system
 * primitive remains a controlled native input without react-hook-form policy.
 */
export function getAuthTextInputPresentation(
  inputType: AuthTextInputType,
): AuthTextInputPresentation {
  return AUTH_TEXT_INPUT_PRESENTATION[inputType]
}
