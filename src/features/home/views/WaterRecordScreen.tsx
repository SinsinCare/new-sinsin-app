import { useHealthRecordRoute } from "../hooks/useHealthRecordRoute"
import { WaterRecordPage } from "../components/record/pages/WaterRecordPage"

export function WaterRecordScreen() {
  const { params, onBack } = useHealthRecordRoute("water")
  return params ? <WaterRecordPage params={params} onBack={onBack} /> : null
}
