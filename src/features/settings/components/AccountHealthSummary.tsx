import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import type { KidneyProfile } from "@/src/services/data/kidneyProfileService"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"
import { formatDiagnosisDate } from "@/src/shared/utils/diagnosisDate"
import { AccountOverviewActions } from "./AccountOverviewActions"

export function AccountHealthSummary({
  profile,
  pending,
  failed,
  onEdit,
  onRetry,
}: {
  profile?: KidneyProfile | null
  pending: boolean
  failed: boolean
  onEdit: () => void
  onRetry: () => void
}) {
  const { t, i18n } = useTranslation("common")
  const { t: copy } = useTranslation("settings")
  const { colors, mode } = useV2Theme()
  const stageCode = profile?.ckdStage
    ?.match(/^STAGE_(\d[A-B]?)$/i)?.[1]
    ?.toLowerCase()
  const stage = stageCode
    ? t("kidneyProfile.stageValue", { stage: stageCode })
    : (!i18n.language.startsWith("en") && profile?.ckdStageLabel) ||
      copy("accountOverview.notRecorded")
  const diagnosis =
    formatDiagnosisDate(profile?.diagnosisDate, i18n.language) ||
    (profile?.diagnosisTiming
      ? t("kidneyProfile.diagnosisDateApprox", {
          value: t(
            `medical.diagnosisTiming.${profile.diagnosisTiming}`,
            profile.diagnosisTiming,
          ),
        })
      : null)
  const body = [
    profile?.heightCm != null ? `${profile.heightCm} cm` : null,
    profile?.weightKg != null
      ? `${roundForDisplay(profile.weightKg, 1)} kg`
      : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const conditions = [
    ...new Set([
      ...(profile?.diagnosisCauses ?? []).map((key) =>
        t(`medical.diagnosisCause.${key.toUpperCase()}`, key),
      ),
      ...(profile?.diagnosisCauseOther ? [profile.diagnosisCauseOther] : []),
      ...(profile?.comorbidities ?? []).map((key) =>
        t(`medical.comorbidity.${key.toUpperCase()}`, key),
      ),
    ]),
  ]
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            mode === "dark"
              ? colors.background.lower
              : colors.background.default,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy("accountOverview.healthDetails")}
        onPress={onEdit}
        style={styles.heading}
      >
        <V2Text
          color={colors.label.normal}
          token="subtext.largeStrong"
          style={styles.grow}
        >
          {copy("accountOverview.healthProfile")}
        </V2Text>
        <V2Text token="subtext.medium" color={colors.label.neutral}>
          {copy("accountOverview.details")}
        </V2Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.label.neutral}
        />
      </Pressable>
      {profile ? (
        <>
          <View style={styles.summary}>
            <View style={styles.grow}>
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {copy("accountOverview.stage")}
              </V2Text>
              <V2Text
                color={colors.label.normal}
                token="title.small"
                style={styles.stage}
              >
                {stage}
              </V2Text>
            </View>
            <View
              style={[
                styles.dialysis,
                { backgroundColor: colors.fill.alternative },
              ]}
            >
              <V2Text token="subtext.mediumStrong" color={colors.label.neutral}>
                {t(
                  profile.isDialysis
                    ? "kidneyProfile.onDialysis"
                    : "kidneyProfile.notOnDialysis",
                )}
              </V2Text>
            </View>
          </View>
          <View style={styles.details}>
            {[
              [
                t("kidneyProfile.heightWeight"),
                body || copy("accountOverview.notRecorded"),
              ],
              [
                t("kidneyProfile.diagnosisDate"),
                diagnosis || copy("accountOverview.notRecorded"),
              ],
              ...(conditions.length
                ? [[t("kidneyProfile.conditions"), conditions.join(" · ")]]
                : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <V2Text
                  token="subtext.small"
                  color={colors.label.neutral}
                  style={styles.label}
                >
                  {label}
                </V2Text>
                <V2Text
                  color={colors.label.normal}
                  token="subtext.mediumStrong"
                  style={styles.detailValue}
                >
                  {value}
                </V2Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Pressable
          disabled={pending}
          onPress={failed ? onRetry : onEdit}
          accessibilityRole="button"
          style={styles.empty}
        >
          <V2Text token="subtext.medium" color={colors.label.neutral}>
            {copy(
              pending
                ? "accountOverview.loading"
                : failed
                  ? "accountOverview.healthError"
                  : "accountOverview.addHealth",
            )}
          </V2Text>
        </Pressable>
      )}
      <AccountOverviewActions />
    </View>
  )
}
const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
    marginTop: -8,
  },
  grow: { flex: 1 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  stage: { marginTop: 4 },
  dialysis: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  details: { gap: 10 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  label: { width: 100 },
  detailValue: { flex: 1, textAlign: "right", fontVariant: ["tabular-nums"] },
  empty: { minHeight: 150, justifyContent: "center" },
})
