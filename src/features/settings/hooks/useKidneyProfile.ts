import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { kidneyProfileService } from "@/src/services/data/kidneyProfileService"
import { normalizeLanguage } from "@/src/i18n"

export function useKidneyProfile() {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  return useQuery({
    queryKey: ["kidneyProfile", language],
    queryFn: () => kidneyProfileService.getKidneyProfile(),
  })
}
