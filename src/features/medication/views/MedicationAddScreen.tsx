import { Pressable, View } from "react-native"
import { router } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { MedicationFlowShell } from "../components/MedicationFlowShell"
import { medStyles, FORM } from "../components/medicationStyles"
import { medicationApi } from "../services/medicationApi"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
export function MedicationAddScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/record/medication")
  const capability = useQuery({
    queryKey: ["medication-capabilities"],
    queryFn: ({ signal }) => medicationApi.capabilities(signal),
    staleTime: 60000,
  })
  const choices = [
    {
      title: t("searchMethod"),
      body: t("searchMethodBody"),
      icon: "search-outline" as const,
      action: () => router.push("/medication/search"),
    },
    {
      title: t("photoMethod"),
      body: t(
        capability.isPending || capability.data?.recognition
          ? "photoMethodBody"
          : "photoUnavailable",
      ),
      icon: "camera-outline" as const,
      action: () => router.push("/medication/photo"),
    },
    {
      title: t("manualMethod"),
      body: t("manualMethodBody"),
      icon: "create-outline" as const,
      action: () => {
        useMedicationFlowStore.getState().select(null)
        router.push("/medication/edit")
      },
    },
  ]
  return (
    <MedicationFlowShell title={t("addTitle")} onBack={back}>
      <View style={medStyles.section}>
        <V2Text style={FORM.label} color={s.textStrong}>
          {t("addHeading")}
        </V2Text>
        <V2Text style={FORM.body} color={s.text}>
          {t("addIntro")}
        </V2Text>
      </View>
      <View>
        {choices.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}`}
            onPress={item.action}
            style={({ pressed }) => [
              medStyles.row,
              {
                paddingVertical: 24,
                borderBottomWidth: 1,
                borderBottomColor: s.border,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <View
              style={[
                medStyles.card,
                { padding: 12, backgroundColor: s.surfaceSunken },
              ]}
            >
              <Ionicons
                accessible={false}
                name={item.icon}
                size={24}
                color={s.textStrong}
              />
            </View>
            <View style={[medStyles.grow, { gap: 6 }]}>
              <V2Text style={FORM.option} color={s.textStrong}>
                {item.title}
              </V2Text>
              <V2Text style={FORM.hint} color={s.text}>
                {item.body}
              </V2Text>
            </View>
            <Ionicons
              accessible={false}
              name="chevron-forward"
              size={18}
              color={s.textMuted}
            />
          </Pressable>
        ))}
      </View>
      {capability.data && !capability.data.catalog ? (
        <V2Text style={FORM.hint} color={s.text}>
          {t("catalogUnavailable")}
        </V2Text>
      ) : null}
    </MedicationFlowShell>
  )
}
