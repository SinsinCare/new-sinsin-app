import { useHealthRecordRoute } from "../hooks/useHealthRecordRoute"
import { BloodGlucoseRecordPage } from "../components/record/pages/BloodGlucoseRecordPage"

export function BloodGlucoseRecordScreen() {
  const { params, onBack } = useHealthRecordRoute("bloodGlucose")
  return params ? (
    <BloodGlucoseRecordPage params={params} onBack={onBack} />
  ) : null
}
