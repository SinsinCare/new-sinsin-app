import { StyleSheet, type StyleProp, type TextStyle } from "react-native"

/**
 * UIKit centers a single-line input using its font metrics. A paragraph lineHeight
 * overrides that baseline and shifts both the placeholder and edited value down.
 * Normalize after all caller overrides, including sheet inputs; leave text areas
 * and their intentional top alignment untouched. Never compensate with offsets.
 */
export function inputMetrics(
  style: StyleProp<TextStyle>,
  multiline?: boolean,
): StyleProp<TextStyle> {
  if (multiline) return style
  const { lineHeight: _paragraphHeight, ...rest } =
    StyleSheet.flatten(style) ?? {}
  return { ...rest, includeFontPadding: false, textAlignVertical: "center" }
}
