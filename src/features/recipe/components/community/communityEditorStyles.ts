import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { StyleSheet } from "react-native"
import { typography, spacing } from "@/src/design-system-v2/tokens"
import { COMMUNITY_GUTTER } from "./communityLayout"

/** Karrot composer structure: header action, plain fields, one keyboard toolbar. */
export const communityEditorStyles = StyleSheet.create({
  header: {
    minHeight: 56,
    paddingHorizontal: COMMUNITY_GUTTER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: borderWidth.thin,
  },
  headerTitle: {
    ...typography.title.xSmall,
    position: "absolute",
    left: 64,
    right: 64,
    textAlign: "center",
  },
  submit: {
    minWidth: 48,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  submitLabel: typography.label.small,
  category: {
    minHeight: 56,
    borderBottomWidth: borderWidth.thin,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryLabel: typography.subtext.large,
  titleInput: {
    ...typography.title.smallWeak,
    minHeight: 48,
    paddingVertical: spacing[8],
    includeFontPadding: false,
  },
  bodyInput: {
    ...typography.body.mediumWeak,
    minHeight: 208,
    paddingVertical: spacing[8],
  },
  counter: { ...typography.subtext.small, textAlign: "right" },
  tool: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
  toolLabel: typography.subtext.medium,
})
