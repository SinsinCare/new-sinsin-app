import { useCallback, useEffect, useRef, useState } from "react"
import { Keyboard } from "react-native"
import { useNavigation, usePreventRemove } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { showConfirm } from "@/src/lib/dialog"
import { presentError } from "@/src/lib/errorMessage"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import { imageUploadService } from "@/src/features/recipe/services/imageUploadService"
import type { ReviewDto, ReviewSubmitPayload } from "../types"
import {
  isReviewDraftReady,
  showReviewPhotoNotice,
  type ReviewDraftInput,
} from "../utils/reviewDraft"

interface Options {
  draft: ReviewDraftInput
  submitReview: (payload: ReviewSubmitPayload) => Promise<{
    review: ReviewDto
    photosIndexed: number
  }>
  onClose: () => void
  onSubmitted?: (review: ReviewDto) => void
}

/** Uploads and publication are one transaction from the editor's perspective. */
export function useReviewEditorLifecycle({
  draft,
  submitReview,
  onClose,
  onSubmitted,
}: Options) {
  const { t } = useTranslation("common")
  const navigation = useNavigation()
  const mounted = useRef(true)
  const locked = useRef(false)
  const prompting = useRef(false)
  const allowExit = useRef(false)
  const uploadedPaths = useRef(new Map<string, string>())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const hasDraft =
    draft.rating > 0 ||
    draft.keywords.length > 0 ||
    draft.content.trim().length > 0 ||
    draft.photoUris.length > 0

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const requestExit = useCallback(
    async (action: () => void) => {
      if (!mounted.current) return
      if (allowExit.current) {
        action()
        return
      }
      if (locked.current || prompting.current) return
      if (!hasDraft) {
        allowExit.current = true
        action()
        return
      }
      prompting.current = true
      Keyboard.dismiss()
      try {
        const discard = await showConfirm({
          title: t("restaurant.review.form.discardTitle"),
          description: t("restaurant.review.form.discardBody"),
          confirmLabel: t("restaurant.review.form.discard"),
          cancelLabel: t("restaurant.review.form.keepWriting"),
          destructive: true,
          buttonLayout: "vertical",
        })
        if (!discard || !mounted.current || locked.current) return
        allowExit.current = true
        action()
      } finally {
        prompting.current = false
      }
    },
    [hasDraft, t],
  )

  usePreventRemove(hasDraft || isSubmitting, ({ data }) => {
    void requestExit(() => navigation.dispatch(data.action))
  })
  const requestClose = useCallback(
    () => requestExit(onClose),
    [onClose, requestExit],
  )

  const submit = useCallback(async () => {
    if (
      !mounted.current ||
      locked.current ||
      prompting.current ||
      allowExit.current ||
      !isReviewDraftReady(draft)
    )
      return
    // The ref locks synchronously, before React commits the disabled button.
    locked.current = true
    setIsSubmitting(true)
    Keyboard.dismiss()
    let saved: Awaited<ReturnType<Options["submitReview"]>>
    const objectPaths: string[] = []
    try {
      for (const [index, uri] of draft.photoUris.entries()) {
        if (!mounted.current) return
        setUploadProgress(
          t("restaurant.review.form.photoProgress", {
            current: index + 1,
            total: draft.photoUris.length,
          }),
        )
        let path = uploadedPaths.current.get(uri)
        if (!path) {
          const uploaded = await imageUploadService.uploadImage(uri, "general")
          path = uploaded.objectPath
          uploadedPaths.current.set(uri, path)
        }
        objectPaths.push(path)
      }
      if (!mounted.current) return
      setUploadProgress(null)
      saved = await submitReview({
        rating: draft.rating,
        content: draft.content.trim(),
        keywords: [...draft.keywords],
        imageObjectPaths: objectPaths,
      })
    } catch (error) {
      if (mounted.current) {
        locked.current = false
        setIsSubmitting(false)
        setUploadProgress(null)
        presentError(error, { scope: "restaurant-review-write" })
      }
      return
    }
    if (!mounted.current) return
    // Publication succeeded: never unlock for another POST, even if navigation is slow.
    const { review, photosIndexed } = saved
    allowExit.current = true
    showReviewPhotoNotice(
      { sent: objectPaths.length, indexed: photosIndexed },
      (key, params) => t(dynamicKey(key), params),
    )
    if (onSubmitted) onSubmitted(review)
    else onClose()
  }, [draft, onClose, onSubmitted, submitReview, t])

  return { submit, requestClose, isSubmitting, uploadProgress }
}
