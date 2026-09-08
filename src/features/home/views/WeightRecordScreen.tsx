import { useHealthRecordRoute } from "../hooks/useHealthRecordRoute"
import { WeightRecordPage } from "../components/record/pages/WeightRecordPage"

export function WeightRecordScreen() {
  const { params, onBack } = useHealthRecordRoute("weight")
  return params ? <WeightRecordPage params={params} onBack={onBack} /> : null
}
