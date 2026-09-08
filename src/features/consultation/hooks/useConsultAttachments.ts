import { useCallback, useEffect, useRef, useState } from "react"
import { Dimensions, Keyboard, Linking, type View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import { showConfirm } from "@/src/lib/dialog"

type PhotoSource = "library" | "camera"
type AttachmentError = { source: PhotoSource; settings: boolean }

/** Native selection stays local until Send. A late picker cannot refill a cleared draft. */
export function useConsultAttachments(options: {
  topInset: number
  restoreFocus: () => void
}) {
  const { t } = useTranslation("common")
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [attachMenuPosition, setAttachMenuPosition] = useState({
    bottom: 0,
    maxHeight: 0,
  })
  const [isPickingPhoto, setIsPickingPhoto] = useState(false)
  const [attachmentError, setAttachmentError] =
    useState<AttachmentError | null>(null)
  const attachmentRootRef = useRef<View>(null)
  const attachmentAnchorRef = useRef<View>(null)
  const mounted = useRef(true)
  const selecting = useRef(false)
  const version = useRef(0)
  const menuVersion = useRef(0)
  const latest = useRef(options)
  latest.current = options

  const closeAttachMenu = useCallback(() => {
    menuVersion.current += 1
    setAttachMenuOpen(false)
  }, [])
  useEffect(() => {
    mounted.current = true
    const dimensions = Dimensions.addEventListener("change", closeAttachMenu)
    return () => {
      mounted.current = false
      version.current += 1
      menuVersion.current += 1
      dimensions.remove()
    }
  }, [closeAttachMenu])

  const handlePlusPress = () => {
    if (selecting.current) return
    if (attachMenuOpen) return closeAttachMenu()
    const request = ++menuVersion.current
    attachmentRootRef.current?.measureInWindow((_x, rootY, _width, height) => {
      attachmentAnchorRef.current?.measureInWindow((_bx, anchorY, bw, bh) => {
        if (
          !mounted.current ||
          menuVersion.current !== request ||
          !bw ||
          !bh ||
          !height
        )
          return
        const top = anchorY - rootY - 8
        setAttachMenuPosition({
          bottom: Math.max(12, height - top),
          maxHeight: Math.max(0, top - latest.current.topInset - 12),
        })
        setAttachMenuOpen(true)
      })
    })
  }

  const clearAttachedImage = useCallback(() => {
    version.current += 1
    setAttachedImageUri(null)
    setAttachmentError(null)
    closeAttachMenu()
  }, [closeAttachMenu])

  const selectPhoto = async (source: PhotoSource, settings = false) => {
    if (selecting.current || !mounted.current) return
    selecting.current = true
    setIsPickingPhoto(true)
    setAttachmentError(null)
    closeAttachMenu()
    const request = ++version.current
    const current = () => mounted.current && request === version.current
    const restoreKeyboard = Keyboard.isVisible()
    let openingSettings = settings
    try {
      if (settings) {
        await Linking.openSettings()
        return
      }
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!current()) return
        if (permission.status !== "granted") {
          const openSettings = await showConfirm({
            title: t("consult.cameraPermissionTitle"),
            description: t("consult.cameraPermissionBody"),
            confirmLabel: t("consult.openSettings"),
            cancelLabel: t("action.cancel"),
          })
          if (current() && openSettings) {
            openingSettings = true
            await Linking.openSettings()
          }
          return
        }
      }
      // Expo's system library picker requires no full-library access on supported OS versions.
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.8,
            })
      if (!current() || result.canceled) return
      const uri = result.assets[0]?.uri
      if (!uri) throw new Error("Missing selected photo")
      setAttachedImageUri(uri)
    } catch {
      if (current()) setAttachmentError({ source, settings: openingSettings })
    } finally {
      selecting.current = false
      if (mounted.current) setIsPickingPhoto(false)
      if (current() && restoreKeyboard && !openingSettings)
        latest.current.restoreFocus()
    }
  }

  return {
    attachedImageUri,
    clearAttachedImage,
    attachMenuOpen,
    attachMenuPosition,
    attachmentRootRef,
    attachmentAnchorRef,
    handlePlusPress,
    closeAttachMenu,
    isPickingPhoto,
    attachmentError,
    retryAttachment: () =>
      attachmentError &&
      selectPhoto(attachmentError.source, attachmentError.settings),
    handlePhotoUpload: () => selectPhoto("library"),
    handleCameraUpload: () => selectPhoto("camera"),
  }
}
