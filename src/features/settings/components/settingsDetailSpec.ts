import { spacing, typography } from "@/src/design-system-v2"

/** Compact detail rhythm shared by account forms. */
export const settingsDetailSpec = {
  title: { ...typography.title.small, marginBottom: spacing[8] },
  description: { ...typography.subtext.large, marginBottom: spacing[24] },
  sectionTitle: {
    ...typography.subtext.mediumStrong,
    marginBottom: spacing[12],
  },
  rowLabel: { ...typography.subtext.large },
  rowValue: { ...typography.subtext.largeStrong },
  help: { ...typography.subtext.medium },
} as const
