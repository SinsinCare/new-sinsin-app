/**
 * 내 정보 > "나의 신장 건강" 카드 (피드백 F12 재설계).
 *
 * 카드 한 장이 통째로 눌리고(→ 신장 건강 정보 수정), 안에는
 *  1. 작은 라벨 "신장 병기 (CKD)" + 우측 투석 배지
 *  2. 히어로 병기("3b기") + 그 병기의 eGFR 범위(작고 흐린 캡션)
 *  3. 1 · 2 · 3a · 3b · 4 · 5 여섯 칸 병기 바 — 현재 칸만 브랜드, 지나온 칸은 같은
 *     브랜드의 옅은 알파, 남은 칸은 중립 면. 색상은 브랜드 한 벌뿐이다(hue 추가 금지).
 *  4. 키·체중 / 진단 시기 행
 *  5. 동반 질환·진단 원인 — 문장이 아니라 중립 weak 칩
 * 이 들어간다. 의료진 연결·건강검진·기록 내보내기는 아래 "건강 관리" 카드로 분리했다
 * (동작·경로는 `AccountOverviewActions` 그대로).
 *
 * eGFR 범위는 KDIGO 병기 정의(mL/min/1.73m²)를 코드 상수로 둔다 — 서버가 주는 값이
 * 아니라 병기의 **정의**라서 표시 전용이다. 병기를 모르면 범위도 그리지 않고 바는 전부
 * 중립으로 눕는다("모른다"를 "1기"로 보이게 하지 않는다).
 */
import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { V2Badge, V2Text, useV2Theme } from "@/src/design-system-v2"
import { fontFamily } from "@/src/design-system-v2/tokens/typography"
import type { KidneyProfile } from "@/src/services/data/kidneyProfileService"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"
import { formatDiagnosisDate } from "@/src/shared/utils/diagnosisDate"
import { AccountOverviewActions } from "./AccountOverviewActions"

/** CKD 병기 순서. 바의 칸 수와 하이라이트 위치가 여기서 나온다. */
const STAGE_ORDER = ["1", "2", "3a", "3b", "4", "5"] as const
type StageCode = (typeof STAGE_ORDER)[number]

/** KDIGO 병기별 eGFR 범위(mL/min/1.73m²). 표시 전용. */
const EGFR_RANGE: Record<StageCode, string> = {
  "1": "≥90",
  "2": "60–89",
  "3a": "45–59",
  "3b": "30–44",
  "4": "15–29",
  "5": "<15",
}

function parseStage(profile?: KidneyProfile | null): StageCode | null {
  const code = profile?.ckdStage
    ?.match(/^STAGE_(\d[A-B]?)$/i)?.[1]
    ?.toLowerCase()
  return code && (STAGE_ORDER as readonly string[]).includes(code)
    ? (code as StageCode)
    : null
}

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
  const english = i18n.language.startsWith("en")

  const stage = parseStage(profile)
  const stageIndex = stage ? STAGE_ORDER.indexOf(stage) : -1
  const stageLabel = stage
    ? t("kidneyProfile.stageValue", { stage })
    : (!english && profile?.ckdStageLabel) ||
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
  // "164cm · 49kg" — 한국어는 단위를 붙여 쓰고, 영어는 한 칸 띄운다.
  const unit = (value: string, suffix: string) =>
    `${value}${english ? " " : ""}${suffix}`
  const body = [
    profile?.heightCm != null ? unit(String(profile.heightCm), "cm") : null,
    profile?.weightKg != null
      ? unit(String(roundForDisplay(profile.weightKg, 1)), "kg")
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

  const cardBackground =
    mode === "dark" ? colors.background.lower : colors.background.default
  // 브랜드 한 벌 + 알파 단계. 지나온 칸은 같은 주황을 옅게, 남은 칸은 중립 면.
  const brand = colors.primary.primary
  const segmentStyle = (index: number) => {
    if (stageIndex < 0) return { backgroundColor: colors.fill.normal }
    if (index === stageIndex) return { backgroundColor: brand }
    if (index < stageIndex) return { backgroundColor: brand, opacity: 0.3 }
    return { backgroundColor: colors.fill.normal }
  }

  return (
    <>
      <V2Text
        token="subtext.mediumStrong"
        color={colors.label.neutral}
        style={styles.sectionTitle}
      >
        {copy("accountOverview.kidneyHealth")}
      </V2Text>

      {profile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy("accountOverview.healthDetails")}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: cardBackground, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          {/* 1) 라벨 + 투석 배지 */}
          <View style={styles.headerRow}>
            <V2Text
              token="subtext.small"
              color={colors.label.neutral}
              style={styles.grow}
            >
              {t("kidneyProfile.stage")}
            </V2Text>
            <V2Badge
              size="s"
              variant="weak"
              color={profile.isDialysis ? "brand" : "neutral"}
            >
              {t(
                profile.isDialysis
                  ? "kidneyProfile.onDialysis"
                  : "kidneyProfile.notOnDialysis",
              )}
            </V2Badge>
          </View>

          {/* 2) 히어로 병기 + eGFR 범위 */}
          <View style={styles.heroRow}>
            <V2Text token="title.large" color={colors.label.normal}>
              {stageLabel}
            </V2Text>
            {stage && (
              <V2Text
                token="subtext.small"
                color={colors.label.alternative}
                style={styles.heroCaption}
                numberOfLines={1}
              >
                {t("kidneyProfile.egfrRange", { range: EGFR_RANGE[stage] })}
              </V2Text>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.label.alternative}
            />
          </View>

          {/* 3) 병기 바 — 1→5 중 지금 위치. 모르면 전부 중립. */}
          <View style={styles.track} accessibilityElementsHidden>
            {STAGE_ORDER.map((step, index) => {
              const isCurrent = index === stageIndex
              return (
                <View key={step} style={styles.trackStep}>
                  <View style={[styles.trackBar, segmentStyle(index)]} />
                  <V2Text
                    token="caption.small"
                    color={isCurrent ? brand : colors.label.alternative}
                    style={isCurrent && styles.trackLabelCurrent}
                  >
                    {step}
                  </V2Text>
                </View>
              )
            })}
          </View>

          <View
            style={[styles.hairline, { backgroundColor: colors.line.neutral }]}
          />

          {/* 4) 키·체중 / 진단 시기 */}
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
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <V2Text
                  token="subtext.medium"
                  color={colors.label.neutral}
                  style={styles.label}
                >
                  {label}
                </V2Text>
                <V2Text
                  color={colors.label.normal}
                  token="subtext.largeStrong"
                  style={styles.detailValue}
                >
                  {value}
                </V2Text>
              </View>
            ))}
          </View>

          {/* 5) 동반 질환·진단 원인 — 칩 */}
          {conditions.length > 0 && (
            <View style={styles.conditions}>
              <V2Text token="subtext.medium" color={colors.label.neutral}>
                {t("kidneyProfile.conditions")}
              </V2Text>
              <View style={styles.chips}>
                {conditions.map((item) => (
                  <V2Badge key={item} size="m" variant="weak" color="neutral">
                    {item}
                  </V2Badge>
                ))}
              </View>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable
          disabled={pending}
          onPress={failed ? onRetry : onEdit}
          accessibilityRole="button"
          style={[
            styles.card,
            styles.empty,
            { backgroundColor: cardBackground },
          ]}
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

      {/* 건강 관리 — 기존 세 액션. 경로·동작은 그대로, 자리만 카드로 분리. */}
      <V2Text
        token="subtext.mediumStrong"
        color={colors.label.neutral}
        style={styles.sectionTitle}
      >
        {copy("accountOverview.healthCare")}
      </V2Text>
      <View style={[styles.card, { backgroundColor: cardBackground }]}>
        <AccountOverviewActions />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { marginHorizontal: 20, marginTop: 20, marginBottom: 8 },
  card: { marginHorizontal: 16, borderRadius: 20, padding: 20 },
  grow: { flex: 1 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 4,
  },
  heroCaption: { flex: 1, flexShrink: 1 },

  track: { flexDirection: "row", gap: 4, marginTop: 16 },
  trackStep: { flex: 1, alignItems: "center", gap: 4 },
  trackBar: { alignSelf: "stretch", height: 8, borderRadius: 4 },
  trackLabelCurrent: { fontFamily: fontFamily.bold },

  hairline: { height: StyleSheet.hairlineWidth, marginVertical: 16 },

  details: { gap: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flex: 1 },
  detailValue: { textAlign: "right", fontVariant: ["tabular-nums"] },

  conditions: { marginTop: 16, gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  empty: { minHeight: 120, justifyContent: "center" },
})
