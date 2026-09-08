import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { SECTION_BAND } from "./communityLayout"

export type SectionBandProps = { style?: StyleProp<ViewStyle> }

/** The flat community feed needs a visible section boundary in both themes. */
export function SectionBand({ style }: SectionBandProps) {
  return (
    <View style={[styles.wrap, style]}>
      <V2Divider variant="thick" size={SECTION_BAND} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing[16], paddingBottom: spacing[8] },
})
