import { StyleSheet } from "react-native"
import {
  controlHeight,
  radius,
  spacing,
  touchTarget,
} from "@/src/design-system-v2"

export const announcementPopupStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[24],
  },
  card: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "84%",
    borderRadius: radius["4xl"],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  content: {
    flexShrink: 1,
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    paddingBottom: spacing[20],
    gap: spacing[12],
  },
  headerRow: {
    minHeight: touchTarget.min,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  headerMeta: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  iconContainer: {
    width: controlHeight.md,
    height: controlHeight.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingBottom: spacing[4],
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[12],
    gap: spacing[12],
  },
  dismissRow: {
    minHeight: touchTarget.min,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing[8],
  },
  primaryButton: {
    minHeight: touchTarget.min,
  },
  pressed: {
    opacity: 0.85,
  },
})
