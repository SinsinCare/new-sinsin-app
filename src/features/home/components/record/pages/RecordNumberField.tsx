import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useState, type RefObject } from "react"
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInputProps,
} from "react-native"
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated"
import { V2Text } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import { useSurface } from "@/src/hooks/useSurface"
import { FIELD, FORM, S } from "./recordPageSpec"
import { RECORD_TIMING } from "./recordMotion"
import { recordFieldLabel } from "./recordInk"

/** Persistent labels and tabular measurements share one surface across every metric. */
export function RecordNumberField({
  inputRef,
  label,
  unit,
  prominent = false,
  paired = false,
  invalid = false,
  ...input
}: TextInputProps & {
  inputRef: RefObject<TextInput | null>
  label: string
  unit: string
  prominent?: boolean
  paired?: boolean
  invalid?: boolean
}) {
  const s = useSurface()
  const fieldText = recordFieldLabel(s)
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.input)
  const stackUnit = paired && fontScale > 1.1
  // iOS can retain a clipped native placeholder baseline after a value is cleared.
  // Render the example as non-interactive text in the same font-scaled frame;
  // actual values stay in the native input and remain editable.
  const lineHeight = paired
    ? FIELD.pairedInputHeight
    : prominent
      ? FIELD.heroInputHeight
      : FIELD.inputHeight
  const inputHeight = Math.ceil(lineHeight * fontScale)
  const numberFont = paired
    ? styles.pairedInput
    : prominent
      ? styles.largeInput
      : null
  const showPlaceholder = !input.value && !!input.placeholder
  const [focused, setFocused] = useState(false)
  const focusStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(
      invalid ? s.danger : focused ? s.brand : s.surfaceSunken,
      RECORD_TIMING,
    ),
    backgroundColor: withTiming(
      focused ? s.canvas : s.surfaceSunken,
      RECORD_TIMING,
    ),
  }))
  return (
    <View style={styles.cell}>
      <Pressable
        accessible={false}
        disabled={input.editable === false}
        onPress={() => inputRef.current?.focus()}
      >
        <Animated.View
          style={[
            styles.field,
            prominent && styles.prominent,
            paired && styles.paired,
            focusStyle,
          ]}
        >
          <V2Text style={styles.label} color={fieldText}>
            {label}
          </V2Text>
          <View style={[styles.valueRow, stackUnit && styles.pairedValue]}>
            <View
              style={[
                styles.inputFrame,
                stackUnit && styles.pairedFrame,
                { height: inputHeight },
              ]}
            >
              <TextInput
                {...input}
                maxFontSizeMultiplier={FONT_SCALE.input}
                ref={inputRef}
                accessibilityLabel={`${label}, ${unit}`}
                accessibilityHint={input.accessibilityHint ?? input.placeholder}
                placeholder=""
                selectionColor={s.brand}
                multiline={false}
                onFocus={(event) => {
                  setFocused(true)
                  input.onFocus?.(event)
                }}
                onBlur={(event) => {
                  setFocused(false)
                  input.onBlur?.(event)
                }}
                style={[
                  styles.input,
                  numberFont,
                  { color: s.textStrong, height: inputHeight },
                ]}
              />
              {showPlaceholder ? (
                <V2Text
                  maxFontSizeMultiplier={FONT_SCALE.input}
                  pointerEvents="none"
                  accessible={false}
                  importantForAccessibility="no"
                  numberOfLines={1}
                  style={[
                    styles.placeholder,
                    numberFont,
                    { color: fieldText, lineHeight },
                  ]}
                >
                  {input.placeholder}
                </V2Text>
              ) : null}
            </View>
            <V2Text style={styles.unit} color={fieldText}>
              {unit}
            </V2Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  cell: { flex: 1, minWidth: 0 },
  label: FORM.hint,
  field: {
    minHeight: FIELD.height,
    borderRadius: FIELD.radius,
    borderWidth: 1,
    paddingHorizontal: FIELD.paddingX,
    paddingVertical: S[4],
    gap: S[2],
    justifyContent: "center",
  },
  prominent: { minHeight: FIELD.heroHeight, paddingHorizontal: S[5] },
  paired: { minHeight: FIELD.pairedHeight },
  valueRow: { flexDirection: "row", alignItems: "center", gap: S[2] },
  pairedValue: { flexDirection: "column", alignItems: "flex-start", gap: S[1] },
  inputFrame: { flex: 1, minWidth: 0 },
  pairedFrame: { flex: 0, width: "100%" },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    fontSize: FIELD.fontSize,
    fontFamily: fontFamily.semibold,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
  },
  input: {
    ...StyleSheet.absoluteFillObject,
    fontSize: FIELD.fontSize,
    fontFamily: fontFamily.semibold,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
    padding: 0,
    textAlignVertical: "center",
  },
  largeInput: { fontSize: FIELD.heroFontSize, letterSpacing: -1.2 },
  pairedInput: {
    fontSize: FIELD.pairedFontSize,
    letterSpacing: -0.8,
  },
  unit: { ...FORM.body },
})
