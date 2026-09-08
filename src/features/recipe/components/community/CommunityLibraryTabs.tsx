import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  V2Text,
  spacing,
  touchTarget,
  useV2Theme,
} from "@/src/design-system-v2"
import { COMMUNITY_GUTTER } from "./communityLayout"

export const LIBRARY_TABS = ["mine", "liked", "bookmarked"] as const
export type LibraryTab = (typeof LIBRARY_TABS)[number]

export function CommunityLibraryTabs({
  value,
  onChange,
}: {
  value: LibraryTab
  onChange: (tab: LibraryTab) => void
}) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.line.normal }]}>
      {LIBRARY_TABS.map((tab) => {
        const selected = tab === value
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onChange(tab)
            }}
            style={({ pressed }) => [
              styles.tab,
              pressed && { backgroundColor: colors.fill.control },
            ]}
          >
            <V2Text
              token={selected ? "label.xSmall" : "subtext.medium"}
              color={selected ? colors.label.normal : colors.label.neutral}
            >
              {t(`community.library.tabs.${tab}`)}
            </V2Text>
            {selected && (
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: colors.label.normal },
                ]}
              />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  tabs: {
    paddingHorizontal: COMMUNITY_GUTTER,
    flexDirection: "row",
    borderBottomWidth: borderWidth.thin,
  },
  tab: {
    flex: 1,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: spacing[16],
    right: spacing[16],
    height: spacing[2],
  },
})
