import { useHealthRecordRoute } from "../hooks/useHealthRecordRoute"
import { BloodPressureRecordPage } from "../components/record/pages/BloodPressureRecordPage"

export function BloodPressureRecordScreen() {
  const { params, onBack } = useHealthRecordRoute("bloodPressure")
  return params ? (
    <BloodPressureRecordPage params={params} onBack={onBack} />
  ) : null
}
