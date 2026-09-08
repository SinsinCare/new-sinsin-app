import { useCallback, useEffect, useRef, useState } from "react"
import { Linking } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import { showConfirm } from "@/src/lib/dialog"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { MAX_RESTAURANT_REPORT_PHOTOS } from "../utils/restaurantReportValidation"

type Asset = ImagePicker.ImagePickerAsset
export function useRestaurantReportPhotos(onError: (error: unknown) => void) {
  const { t } = useTranslation("common")
  const [photos, setPhotos] = useState<Asset[]>([])
  const [isPicking, setIsPicking] = useState(false)
  const active = useRef<object | null>(null)
  const mounted = useRef(true)
  const selected = useRef(photos)
  selected.current = photos
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      active.current = null
    }
  }, [])
  const clearPhotos = useCallback(() => {
    active.current = null
    setPhotos([])
    setIsPicking(false)
  }, [])
  const removePhoto = useCallback((uri: string) => {
    setPhotos((current) => current.filter((photo) => photo.uri !== uri))
  }, [])
  const addPhotos = useCallback(async () => {
    if (
      !mounted.current ||
      active.current ||
      selected.current.length >= MAX_RESTAURANT_REPORT_PHOTOS
    )
      return
    const request = {}
    active.current = request
    const current = () => mounted.current && active.current === request
    setIsPicking(true)
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!current()) return
      if (status !== "granted") {
        const confirmed = await showConfirm({
          title: t("restaurant.report.permissionTitle"),
          description: t("restaurant.report.permissionBody"),
          confirmLabel: t("restaurant.report.openSettings"),
          cancelLabel: t("restaurant.report.later"),
        })
        if (confirmed && current()) await Linking.openSettings()
        return
      }
      await afterModalTransitions()
      if (!current()) return
      const remaining = MAX_RESTAURANT_REPORT_PHOTOS - selected.current.length
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: remaining > 1,
        selectionLimit: remaining,
        quality: 0.85,
      })
      if (!current() || result.canceled) return
      setPhotos((previous) => {
        const next = [...previous]
        for (const asset of result.assets) {
          if (
            !asset.uri ||
            next.some(
              (p) =>
                p.uri === asset.uri ||
                (p.assetId && asset.assetId && p.assetId === asset.assetId),
            )
          )
            continue
          if (next.length >= MAX_RESTAURANT_REPORT_PHOTOS) break
          next.push(asset)
        }
        return next
      })
    } catch (error) {
      if (current()) onError(error)
    } finally {
      if (current()) {
        active.current = null
        setIsPicking(false)
      }
    }
  }, [onError, t])
  return { photos, isPicking, addPhotos, removePhoto, clearPhotos }
}
