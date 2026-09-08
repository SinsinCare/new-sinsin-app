import { useCallback } from "react"
import { Share } from "react-native"
import { useTranslation } from "react-i18next"
import { useMyPageProfile } from "./useMyPageProfile"
import { useKidneyProfile } from "./useKidneyProfile"
import { useDateAnalysis } from "@/src/features/home/hooks/useDateAnalysis"
import { useNutrientLimits } from "@/src/features/nutrition/hooks/useNutrientLimits"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"
import { showErrorToast, showInfoToast } from "@/src/lib/toast"
import { STORE_REDIRECT_URL as APP_DOWNLOAD_URL } from "@/src/shared/utils/deepLink"

export function useHealthSummaryShare() {
  const { t, i18n } = useTranslation("common")
  const { data: profile } = useMyPageProfile()
  const { data: kidneyProfile } = useKidneyProfile()
  const { data: todayAnalysis } = useDateAnalysis(new Date())
  const nutrientLimits = useNutrientLimits()
  const handleShareData = useCallback(async () => {
    const hasData = kidneyProfile || todayAnalysis?.result?.analysis
    if (!hasData) {
      showInfoToast(t("myPage.share.emptyTitle"), t("myPage.share.emptyBody"))
      return
    }

    const today = new Date()
    const currentLanguage = i18n.resolvedLanguage ?? i18n.language
    const dateLabel = new Intl.DateTimeFormat(
      currentLanguage.startsWith("en") ? "en-US" : "ko-KR",
      { year: "numeric", month: "long", day: "numeric" },
    ).format(today)

    const lines: string[] = [
      t("myPage.share.titleLine", {
        name: profile?.nickName ?? t("myPage.userFallback"),
      }),
      t("myPage.share.asOf", { date: dateLabel }),
      "",
    ]

    if (kidneyProfile) {
      lines.push(t("myPage.share.kidneyProfile"))
      if (kidneyProfile.isDialysis) {
        lines.push(`• ${t("myPage.share.onDialysis")}`)
      } else {
        const stageCode = kidneyProfile.ckdStage
          ?.match(/^STAGE_(\d[A-B]?)$/i)?.[1]
          ?.toLowerCase()
        const stageLabel = currentLanguage.startsWith("en")
          ? stageCode
            ? t("kidneyProfile.stageValue", { stage: stageCode })
            : t("myPage.share.stageNotRecorded")
          : (kidneyProfile.ckdStageLabel ?? t("myPage.share.stageNotRecorded"))
        lines.push(`• ${stageLabel}`)
      }
      if (kidneyProfile.heightCm) {
        lines.push(
          `• ${t("myPage.share.height")}: ${kidneyProfile.heightCm} cm`,
        )
      }
      if (kidneyProfile.weightKg) {
        lines.push(
          `• ${t("myPage.share.weight")}: ${roundForDisplay(kidneyProfile.weightKg, 1)} kg`,
        )
      }
      if (
        kidneyProfile.diagnosisCauses?.length ||
        kidneyProfile.diagnosisCauseOther
      ) {
        const labels = [
          ...(kidneyProfile.diagnosisCauses ?? []).map((key) =>
            t(`medical.diagnosisCause.${key.toUpperCase()}`, key),
          ),
          ...(kidneyProfile.diagnosisCauseOther
            ? [kidneyProfile.diagnosisCauseOther]
            : []),
        ]
        lines.push(`• ${t("myPage.share.primaryCause")}: ${labels.join(", ")}`)
      }
      if (kidneyProfile.comorbidities?.length) {
        const labels = kidneyProfile.comorbidities.map((key) =>
          t(`medical.comorbidity.${key.toUpperCase()}`, key),
        )
        lines.push(
          `• ${t("myPage.share.otherConditions")}: ${labels.join(", ")}`,
        )
      }
      lines.push("")
    }

    const analysis = todayAnalysis?.result
    if (analysis?.diets?.length) {
      const mealNames = analysis.diets.map((d) =>
        t(`meal.${d.mealType}`, d.mealType),
      )
      lines.push(t("myPage.share.todaysMeals"))
      lines.push(`• ${mealNames.join(", ")}`)
      lines.push("")
    }

    if (analysis?.analysis) {
      const a = analysis.analysis
      // 서버가 이미 proteinGPerKg × 체중을 계산해 준다. 여기서 다시 곱하면
      // 화면마다 다른 숫자가 나온다(예전에 실제로 세 가지가 있었다).
      const proteinLimit =
        nutrientLimits.proteinGDay != null
          ? Math.round(nutrientLimits.proteinGDay)
          : null
      const limitText = (value: number | null, unit: string) =>
        value != null
          ? ` / ${value}${unit}`
          : ` · ${t("myPage.share.limitUnknown")}`
      lines.push(t("myPage.share.todaysNutrients"))
      lines.push(
        `• ${t("nutrient.protein")}: ${a.protein.toFixed(1)}g${limitText(proteinLimit, "g")}`,
      )
      lines.push(
        `• ${t("nutrient.sodium")}: ${Math.round(a.sodium)}mg${limitText(nutrientLimits.sodiumMg, "mg")}`,
      )
      lines.push(
        `• ${t("nutrient.potassium")}: ${Math.round(a.potassium)}mg${limitText(nutrientLimits.potassiumMg, "mg")}`,
      )
      lines.push(
        `• ${t("nutrient.phosphorus")}: ${Math.round(a.phosphorus)}mg${limitText(nutrientLimits.phosphorusMg, "mg")}`,
      )
      lines.push(
        `• ${t("nutrient.fluids")}: ${Math.round(
          a.water + a.extraWater,
        ).toLocaleString(
          currentLanguage.startsWith("en") ? "en-US" : "ko-KR",
        )} mL`,
      )
      if (a.cautionFoods?.length) {
        lines.push("")
        lines.push(
          `⚠️ ${t("myPage.share.foodsToWatch")}: ${a.cautionFoods.join(", ")}`,
        )
      }
      if (a.dietaryGuide) {
        lines.push("")
        lines.push(`💬 ${a.dietaryGuide}`)
      }
      lines.push("")
    }

    lines.push(t("myPage.share.footer"))
    lines.push(`📲 ${t("myPage.share.download")}: ${APP_DOWNLOAD_URL}`)

    try {
      await Share.share({
        title: t("myPage.share.sheetTitle"),
        message: lines.join("\n"),
      })
    } catch {
      showErrorToast(t("myPage.share.errorTitle"), t("myPage.share.errorBody"))
    }
  }, [
    profile,
    kidneyProfile,
    todayAnalysis,
    nutrientLimits,
    t,
    i18n.language,
    i18n.resolvedLanguage,
  ])

  return handleShareData
}
