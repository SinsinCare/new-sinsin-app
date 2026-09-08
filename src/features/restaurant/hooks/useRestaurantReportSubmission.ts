import { useCallback, useEffect, useRef, useState } from "react"
import {
  restaurantReportService,
  type RestaurantReportSubmitInput,
} from "@/src/services/data/restaurantReportService"

/** Protect the complete upload + report request, rather than only the final POST. */
export function useRestaurantReportSubmission({
  onSuccess,
  onError,
  onSubmittingChange,
}: {
  onSuccess: () => void
  onError: (error: unknown) => void
  onSubmittingChange?: (busy: boolean) => void
}) {
  const mounted = useRef(true)
  const locked = useRef(false)
  const completed = useRef<RestaurantReportSubmitInput | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const submit = useCallback(
    async (input: RestaurantReportSubmitInput) => {
      if (
        locked.current ||
        !mounted.current ||
        (completed.current?.draft === input.draft &&
          completed.current?.photos === input.photos)
      )
        return
      locked.current = true
      setIsSubmitting(true)
      onSubmittingChange?.(true)
      try {
        await restaurantReportService.submitReport(input)
        completed.current = input
      } catch (error) {
        if (mounted.current) onError(error)
        return
      } finally {
        if (mounted.current) {
          locked.current = false
          setIsSubmitting(false)
          onSubmittingChange?.(false)
        }
      }
      if (mounted.current) onSuccess()
    },
    [onError, onSubmittingChange, onSuccess],
  )
  return { submit, isSubmitting }
}
