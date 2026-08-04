import React from "react"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"
import { View, Text, Pressable, StyleSheet } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { useTranslation } from "react-i18next"

/** CKD 병기 순서. 트랙 시각화와 하이라이트 위치가 여기서 나온다. */
const STAGE_ORDER = ["1", "2", "3a", "3b", "4", "5"] as const

/** 정본 키를 우선하고, 한·영 표시 라벨에서는 eGFR 보조 정보만 꺼낸다. */
function parseStageLabel(
  label: string | null,
  canonicalStage?: string | null,
): {
  stage: string | null
  detail: string | null
} {
  const canonical = canonicalStage
    ?.match(/^STAGE_(\d[A-B]?)$/i)?.[1]
    ?.toLowerCase()
  const localized = label?.match(
    /^(?:Stage\s+)?([0-9]+(?:[ab])?)(?:기)?\s*(?:\((.+)\))?/i,
  )
  return {
    stage: canonical ?? localized?.[1]?.toLowerCase() ?? null,
    detail: localized?.[2] ?? null,
  }
}

interface KidneyProfileCardProps {
  ckdStage?: string | null
  ckdStageLabel: string | null
  isDialysis: boolean
  heightCm?: number | null
  weightKg: number | null
  /** 표시용으로 이미 포맷된 정확한 진단 시기. 없으면 `diagnosisTiming` 으로 떨어진다. */
  diagnosisDate: string | null
  /** 온보딩에서 고른 대략 시기 키(WITHIN_6M 등). 정확한 날짜가 없을 때만 쓴다. */
  diagnosisTiming?: string | null
  diagnosisCauses?: string[]
  diagnosisCauseOther?: string | null
  comorbidities?: string[]
  onEditPress: () => void
}

function InfoRow({
  label,
  value,
  surface,
}: {
  label: string
  /** null 이면 값 대신 "입력하기" 액션 프롬프트를 보여준다. */
  value: string | null
  surface: ReturnType<typeof useSurface>
}) {
  const { t } = useTranslation("common")
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: surface.textMuted }]}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.infoValue, { color: surface.textStrong }]}>
          {value}
        </Text>
      ) : (
        <View style={styles.infoAction}>
          <Text style={[styles.infoActionText, { color: surface.brand }]}>
            {t("kidneyProfile.add")}
          </Text>
          <Ionicons name="chevron-forward" size={12} color={surface.brand} />
        </View>
      )}
    </View>
  )
}

export function KidneyProfileCard({
  ckdStage,
  ckdStageLabel,
  isDialysis,
  heightCm,
  weightKg,
  diagnosisDate,
  diagnosisTiming,
  diagnosisCauses,
  diagnosisCauseOther,
  comorbidities,
  onEditPress,
}: KidneyProfileCardProps) {
  const { t, i18n } = useTranslation("common")
  const surface = useSurface()
  const english = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")

  const { stage, detail } = parseStageLabel(ckdStageLabel, ckdStage)
  const stageIndex = stage
    ? STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number])
    : -1

  const heightWeightLabel = (() => {
    if (heightCm != null && weightKg != null)
      return `${heightCm}${english ? " " : ""}cm · ${roundForDisplay(
        weightKg,
        1,
      )}${english ? " " : ""}kg`
    if (weightKg != null)
      return `${roundForDisplay(weightKg, 1)}${english ? " " : ""}kg`
    if (heightCm != null) return `${heightCm}${english ? " " : ""}cm`
    return null
  })()
  /**
   * 온보딩은 진단 시기를 다섯 구간 중 하나로만 묻고, 정확한 연·월은 선택 입력이다.
   * 그래서 연·월을 건너뛴 사람도 "미입력"이 아니라 아는 만큼은 보여 준다. 어림값인
   * 것은 "약" 을 붙여 드러낸다 — 구간이 진단일로 읽히면 안 된다.
   */
  const diagnosisDateLabel =
    diagnosisDate ??
    (diagnosisTiming
      ? t("kidneyProfile.diagnosisDateApprox", {
          value: t(
            `medical.diagnosisTiming.${diagnosisTiming}`,
            diagnosisTiming,
          ),
        })
      : null)

  const conditionItems = [
    ...(diagnosisCauses ?? []).map((key) =>
      t(`medical.diagnosisCause.${key.toUpperCase()}`, key),
    ),
    ...(diagnosisCauseOther ? [diagnosisCauseOther] : []),
    ...(comorbidities ?? []).map((key) =>
      t(`medical.comorbidity.${key.toUpperCase()}`, key),
    ),
  ]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("kidneyProfile.edit")}
      onPress={() => {
        hapticSelection()
        onEditPress()
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? surface.surfacePressed : surface.card,
        },
      ]}
    >
      {/* 라벨 + 투석 배지 */}
      <View style={styles.cardHeader}>
        <Text style={[styles.stageLabel, { color: surface.textMuted }]}>
          {t("kidneyProfile.stage")}
        </Text>
        <View
          style={[
            styles.dialysisBadge,
            {
              backgroundColor: isDialysis
                ? surface.surfaceBrand
                : surface.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.dialysisBadgeText,
              { color: isDialysis ? surface.brand : surface.textMuted },
            ]}
          >
            {isDialysis
              ? t("kidneyProfile.onDialysis")
              : t("kidneyProfile.notOnDialysis")}
          </Text>
        </View>
      </View>

      {/* 히어로 — 병기 숫자가 주인공, eGFR 은 보조 캡션. */}
      <View style={styles.heroRow}>
        <Text style={[styles.heroValue, { color: surface.textStrong }]}>
          {stage
            ? english
              ? t("kidneyProfile.stageValue", { stage })
              : `${stage}기`
            : t("kidneyProfile.notAdded")}
        </Text>
        {detail && (
          <Text style={[styles.heroDetail, { color: surface.textMuted }]}>
            {detail}
          </Text>
        )}
        <View style={styles.heroSpacer} />
        <Ionicons name="chevron-forward" size={16} color={surface.textWeak} />
      </View>

      {/* 병기 트랙 — 1→5 중 지금 위치. */}
      {stageIndex >= 0 && (
        <View style={styles.track}>
          {STAGE_ORDER.map((step, index) => {
            const isPassed = index <= stageIndex
            const isCurrent = index === stageIndex
            return (
              <View key={step} style={styles.trackStep}>
                <View
                  style={[
                    styles.trackBar,
                    {
                      backgroundColor: isPassed
                        ? surface.brand
                        : surface.surface,
                      opacity: isPassed && !isCurrent ? 0.35 : 1,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.trackLabel,
                    isCurrent
                      ? [styles.trackLabelCurrent, { color: surface.brand }]
                      : { color: surface.textWeak },
                  ]}
                >
                  {step}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      <View style={[styles.hairline, { backgroundColor: surface.hairline }]} />

      {/* 토스식 라벨-값 행. 비어 있으면 값 대신 "입력하기" 프롬프트. */}
      <View style={styles.infoList}>
        <InfoRow
          label={t("kidneyProfile.heightWeight")}
          value={heightWeightLabel}
          surface={surface}
        />
        <InfoRow
          label={t("kidneyProfile.diagnosisDate")}
          value={diagnosisDateLabel}
          surface={surface}
        />
      </View>

      {/* 동반 질환·진단 원인 — 회색 면 칩. */}
      {conditionItems.length > 0 && (
        <View style={styles.conditionSection}>
          <Text style={[styles.infoLabel, { color: surface.textMuted }]}>
            {t("kidneyProfile.conditions")}
          </Text>
          <View style={styles.conditionChips}>
            {conditionItems.map((item, index) => (
              <View
                key={`${item}-${index}`}
                style={[
                  styles.conditionChip,
                  { backgroundColor: surface.surface },
                ]}
              >
                <Text
                  style={[styles.conditionChipText, { color: surface.text }]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  stageLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  dialysisBadge: {
    height: 24,
    borderRadius: 7,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dialysisBadgeText: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  heroValue: {
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.52,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  heroDetail: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  heroSpacer: {
    flex: 1,
  },

  track: {
    flexDirection: "row",
    gap: 5,
    marginTop: 14,
  },
  trackStep: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  trackBar: {
    alignSelf: "stretch",
    height: 6,
    borderRadius: 3,
  },
  trackLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Pretendard-Regular",
  },
  trackLabelCurrent: {
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },

  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLabel: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  infoValue: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  infoAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  infoActionText: {
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.27,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },

  conditionSection: {
    marginTop: 16,
    gap: 8,
  },
  conditionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  conditionChip: {
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionChipText: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
})
