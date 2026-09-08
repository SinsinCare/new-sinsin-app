import { createContext, forwardRef, useContext, type ComponentRef } from "react"
import {
  StyleSheet,
  useWindowDimensions,
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from "react-native"
import { FONT_SCALE, textScaleLimit } from "../tokens/fontScaling"
import { inputMetrics } from "./inputMetrics"

const TextScaleContext = createContext<number>(FONT_SCALE.body)

/** Native-compatible primitives: preserve fonts and refs, centralize enlargement bounds. */
export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(
  function Text({ style, maxFontSizeMultiplier, children, ...props }, ref) {
    const { fontScale } = useWindowDimensions()
    const inherited = useContext(TextScaleContext)
    const limit =
      maxFontSizeMultiplier ??
      textScaleLimit(StyleSheet.flatten(style)?.fontSize) ??
      inherited
    const text = (
      <RNText
        key={`type-${fontScale}`}
        {...props}
        ref={ref}
        style={style}
        maxFontSizeMultiplier={limit}
      >
        {children}
      </RNText>
    )
    // Inline emphasis inherits its parent's limit so colored words keep the same baseline.
    return limit === inherited ? (
      text
    ) : (
      <TextScaleContext.Provider value={limit}>
        {text}
      </TextScaleContext.Provider>
    )
  },
)
export const TextInput = forwardRef<
  ComponentRef<typeof RNTextInput>,
  TextInputProps
>(function TextInput(
  { maxFontSizeMultiplier, style, multiline, ...props },
  ref,
) {
  return (
    <RNTextInput
      {...props}
      ref={ref}
      multiline={multiline}
      style={inputMetrics(style, multiline)}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? FONT_SCALE.input}
    />
  )
})
// Preserve React Native's value/type imports for input refs.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Text = ComponentRef<typeof RNText>
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TextInput = ComponentRef<typeof RNTextInput>
