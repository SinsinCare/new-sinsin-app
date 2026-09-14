import { useCallback } from "react"
import { Share } from "react-native"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { useMyPageProfile } from "./useMyPageProfile"
import { useKidneyProfile } from "./useKidneyProfile"
import { dateAnalysisKey } from "@/src/i18n/localeQueryKeys"
import { foodCameraService } from "@/src/services/data"
import { toDateStr } from "@/src/features/home/utils/dateUtils"
import { normalizeLanguage } from "@/src/i18n"
import { useNutrientLimits } from "@/src/features/nutrition/hooks/useNutrientLimits"
import { roundForDisplay } from "@/src/shared/utils/displayNumber"
import { showErrorToast, showInfoToast } from "@/src/lib/toast"
import { STORE_REDIRECT_URL as APP_DOWNLOAD_URL } from "@/src/shared/utils/deepLink"

export function useHealthSummaryShare() {
  const { t, i18n } = useTranslation("common")
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const { data: kidneyProfile } = useKidneyProfile()
  // ["kidneyProfile"] 캐시에서 파생될 뿐이라 요청이 늘지 않는다 — 훅으로 둬도 공짜다.
  const nutrientLimits = useNutrientLimits()
  const handleShareData = useCallback(async () => {
    /*
      오늘 식단 분석은 **공유를 누를 때** 가져온다. 예전에는 마이페이지가 뜨는 순간
      `useDateAnalysis(new Date())` 가 돌아 — 내보내기 버튼을 한 번도 안 누르는 사람에게도
      매 진입마다 분석 요청이 나갔다. 홈과 같은 키를 쓰므로 홈이 방금 받아 둔 값이 있으면
      그걸 그대로 쓴다. 실패는 "분석 없음" 으로 접는다 — 예전 화면도 분석이 없으면
      프로필만으로 요약을 만들었다.
    */
    const today = new Date()
    const todayStr = toDateStr(today)
    const locale = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
    const todayAnalysis = await queryClient
      .fetchQuery({
        queryKey: dateAnalysisKey(todayStr, locale),
        queryFn: () => foodCameraService.fetchDateAnalysis(todayStr),
        staleTime: 30_000,
      })
      .catch(() => undefined)
    const hasData = kidneyProfile || todayAnalysis?.result?.analysis
    if (!hasData) {
      showInfoToast(t("myPage.share.emptyTitle"), t("myPage.share.emptyBody"))
      return
    }

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
    nutrientLimits,
    queryClient,
    t,
    i18n.language,
    i18n.resolvedLanguage,
  ])

  return handleShareData
}
