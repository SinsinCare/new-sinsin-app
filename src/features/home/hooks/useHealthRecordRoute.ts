import { useEffect, useRef } from "react"
import { useGoBack } from "@/src/shared/navigation"
import {
  useRecordPageStore,
  type RecordPageParams,
} from "../stores/recordPageStore"

/** Keep params alive until navigation actually removes the page (the exit guard may block it). */
export function useHealthRecordRoute<K extends RecordPageParams["kind"]>(
  kind: K,
) {
  const params = useRecordPageStore((state) => state.params)
  const goBack = useGoBack("/(tabs)/home")
  const owned = useRef(params)
  if (params?.kind === kind) owned.current = params
  useEffect(() => {
    if (!params || params.kind !== kind) goBack()
  }, [goBack, kind, params])
  useEffect(
    () => () => {
      const opened = owned.current
      if (opened?.kind !== kind) return
      opened.onClose?.()
      if (useRecordPageStore.getState().params === opened)
        useRecordPageStore.getState().clear()
    },
    [kind],
  )
  return {
    params:
      params?.kind === kind
        ? (params as Extract<RecordPageParams, { kind: K }>)
        : null,
    onBack: goBack,
  }
}
