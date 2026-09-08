import { useLocalSearchParams } from "expo-router"
import { ConsultScreen } from "@/src/features/consultation/views/ConsultScreen"
import type { ConsultRouteParams } from "@/src/features/consultation/hooks/useConsultScreen"
export default function ConsultRoute() {
  return <ConsultScreen params={useLocalSearchParams<ConsultRouteParams>()} />
}
