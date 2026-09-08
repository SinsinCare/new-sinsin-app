import { View } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { V2Button, V2DotLoader, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { useAuthStore } from "@/src/stores/authStore"
import { MedicationFlowShell } from "../components/MedicationFlowShell"
import { MedicationDoseRow } from "../components/MedicationDoseRow"
import { medStyles, FORM } from "../components/medicationStyles"
import { medicationApi } from "../services/medicationApi"
import { medicationKeys } from "../data/medicationKeys"
import { useMedicationPlanActions } from "../hooks/useMedicationPlanActions"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import { MedicationReminderStatus } from "../components/MedicationReminderStatus"
import { todayKst } from "../data/medicationModel"
export function MedicationManageScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/record/medication"),
    uid = useAuthStore((s) => s.user?.uid ?? ""),
    actions = useMedicationPlanActions()
  const query = useQuery({
    queryKey: medicationKeys.plans(uid),
    queryFn: ({ signal }) => medicationApi.plans(signal),
    enabled: !!uid,
  })
  return (
    <MedicationFlowShell
      title={t("manage")}
      onBack={back}
      footer={
        <V2Button
          multilineLabel
          size="l"
          fullWidth
          onPress={() => {
            useMedicationFlowStore.getState().start(todayKst())
            router.push("/medication/add")
          }}
        >
          {t("add")}
        </V2Button>
      }
    >
      <V2Text style={FORM.body} color={s.text}>
        {t("manageIntro")}
      </V2Text>
      <MedicationReminderStatus uid={uid} />
      {query.isPending ? (
        <V2DotLoader />
      ) : query.isError ? (
        <View style={medStyles.section}>
          <V2Text style={FORM.body} color={s.text}>
            {t("loadError")}
          </V2Text>
          <V2Button
            multilineLabel
            color="neutral"
            variant="weak"
            onPress={() => void query.refetch()}
          >
            {t("reload")}
          </V2Button>
        </View>
      ) : (
        <>
          {!query.data.some((p) => p.status !== "ARCHIVED") ? (
            <View style={medStyles.empty}>
              <V2Text style={FORM.label} color={s.textStrong}>
                {t("manageEmpty")}
              </V2Text>
            </View>
          ) : null}
          {(["ACTIVE", "PAUSED"] as const).map((status) => {
            const plans = query.data.filter((p) => p.status === status)
            return plans.length ? (
              <View key={status}>
                <V2Text style={FORM.label} color={s.textStrong}>
                  {t(status === "ACTIVE" ? "active" : "paused")}
                </V2Text>
                {plans.map((plan) => (
                  <View key={plan.id}>
                    <MedicationDoseRow
                      item={{
                        key: plan.id,
                        planId: plan.id,
                        slot: plan.slots[0]!,
                        plan,
                        taken: false,
                        recordedAt: null,
                        timeKnown: false,
                        historical: false,
                      }}
                      checked={false}
                      disabled={actions.busy}
                      onToggle={() => void actions.open(plan)}
                      onMore={() => void actions.open(plan)}
                      management
                    />
                  </View>
                ))}
              </View>
            ) : null
          })}
        </>
      )}
    </MedicationFlowShell>
  )
}
