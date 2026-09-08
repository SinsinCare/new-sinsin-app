import { useHealthRecordRoute } from "../hooks/useHealthRecordRoute"
import { EdemaRecordPage } from "../components/record/pages/EdemaRecordPage"

export function EdemaRecordScreen() {
  const { params, onBack } = useHealthRecordRoute("edema")
  return params ? <EdemaRecordPage params={params} onBack={onBack} /> : null
}
