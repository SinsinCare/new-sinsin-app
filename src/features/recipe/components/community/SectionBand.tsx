import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { SECTION_BAND } from "./communityLayout"

export type SectionBandProps = { style?: StyleProp<ViewStyle> }

/**
 * The flat community feed needs a visible section boundary in both themes.
 *
 * 여백(위 16·아래 8)은 투명하다 — 밴드가 배경을 가지면 라이트에서 경계가 둘로 읽힌다(대비 감사 §4).
 * 바로 위 글 행의 헤어라인은 행이 `hideDivider` 로 스스로 지운다(2026-09-11 피드백 F4).
 */
export function SectionBand({ style }: SectionBandProps) {
  return (
    <View style={[styles.wrap, style]}>
      <V2Divider variant="thick" size={SECTION_BAND} />
    </View>
  )
}

const styles = StyleSheet.create({
  // 여백은 자기 배경을 갖지 않는다(라이트 대비 감사 §4). 위 행의 헤어라인은
  // `PostListItem.hideDivider` 가 지운다 — 피드백 F4.
  wrap: {
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
})
