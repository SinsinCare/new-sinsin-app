import { StyleSheet } from "react-native"

// Health record fills use useSurface().surfaceSunken, matching RecordNumberField
// and RecordChoices in both modes. Keep the deeper surface for pressed feedback.
import {
  FORM,
  PAGE_X,
  S,
  MIN,
} from "@/src/features/home/components/record/pages/recordPageSpec"
export { FORM, PAGE_X, S, MIN }
export const medStyles = StyleSheet.create({
  body: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  section: { gap: S[3] },
  row: { flexDirection: "row", alignItems: "center", gap: S[3] },
  grow: { flex: 1 },
  title: FORM.label,
  label: FORM.option,
  bodyText: FORM.body,
  caption: FORM.hint,
  action: {
    minHeight: MIN.TOUCH,
    justifyContent: "center",
    paddingHorizontal: S[2],
  },
  card: { borderRadius: 20, padding: S[5], gap: S[3] },
  field: {
    minHeight: 56,
    paddingVertical: S[4],
    paddingHorizontal: S[4],
    borderRadius: 16,
    ...FORM.body,
  },
  divider: { height: StyleSheet.hairlineWidth },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: S[2] },
  chip: {
    minHeight: 44,
    borderRadius: FORM.choiceRadius,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { padding: S[4], borderRadius: 16, gap: S[2] },
  empty: { paddingVertical: S[7], gap: S[3], alignItems: "center" },
  center: { textAlign: "center" },
})
