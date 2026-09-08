import { useEffect, useRef, useState } from "react"
import { Image, Linking, Pressable, View } from "react-native"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { manipulateAsync, SaveFormat } from "expo-image-manipulator"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { V2Button, V2DotLoader, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { showActionSheet, showConfirm } from "@/src/lib/dialog"
import { MedicationFlowShell } from "../components/MedicationFlowShell"
import { medStyles, FORM } from "../components/medicationStyles"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import { discardMedicationPhotos } from "../services/medicationPhotoCache"
import { medicationApi } from "../services/medicationApi"
import type { RecognitionResult } from "../types"
export function MedicationPhotoScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/medication/add")
  const photos = useMedicationFlowStore((state) => state.photos)
  const [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false),
    [result, setResult] = useState<RecognitionResult["status"] | null>(null),
    [photoError, setPhotoError] = useState(false)
  const request = useRef<AbortController | null>(null),
    alive = useRef(true),
    pickerLock = useRef(false)
  const capability = useQuery({
    queryKey: ["medication-capabilities"],
    queryFn: ({ signal }) => medicationApi.capabilities(signal),
    staleTime: 60000,
  })
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      request.current?.abort()
    }
  }, [])
  const goBack = () => {
    request.current?.abort()
    back()
  }
  const pick = async (index: number) => {
    if (pickerLock.current || request.current) return
    pickerLock.current = true
    setPicking(true)
    try {
      const action = await showActionSheet({
        title: t(index === 0 ? "front" : "back"),
        actions: [{ label: t("takePhoto") }, { label: t("gallery") }],
        cancelLabel: t("cancel"),
      })
      if (action === null || !alive.current) return
      if (action === 0) {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          if (
            await showConfirm({
              title: t("cameraDenied"),
              confirmLabel: t("openSettings"),
              cancelLabel: t("cancel"),
              buttonLayout: "vertical",
            })
          )
            void Linking.openSettings()
          return
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: false,
        exif: false,
      }
      const picked =
        action === 0
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options)
      if (picked.canceled || !picked.assets[0]) return
      const asset = picked.assets[0],
        photo = await manipulateAsync(
          asset.uri,
          Math.max(asset.width, asset.height) > 1600
            ? [
                {
                  resize:
                    asset.width >= asset.height
                      ? { width: 1600 }
                      : { height: 1600 },
                },
              ]
            : [],
          { compress: 0.88, format: SaveFormat.JPEG },
        )
      if (!alive.current) {
        discardMedicationPhotos([{ uri: photo.uri }])
        return
      }
      const next = [...useMedicationFlowStore.getState().photos]
      next[index] = { uri: photo.uri }
      useMedicationFlowStore.getState().setPhotos(next)
      setResult(null)
      setPhotoError(false)
    } catch {
      if (alive.current) setPhotoError(true)
    } finally {
      pickerLock.current = false
      if (alive.current) setPicking(false)
    }
  }
  const recognize = async () => {
    if (request.current || !photos.length || !capability.data?.recognition)
      return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setResult(null)
    const started = Date.now()
    try {
      const response = await medicationApi.recognize(photos, controller.signal)
      // Fast errors and cache hits still get a readable transition, without changing network timing.
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, 600 - (Date.now() - started))),
      )
      if (!alive.current || controller.signal.aborted) return
      if (response.status === "candidates" && response.items.length) {
        useMedicationFlowStore.getState().setCandidates(response.items)
        router.push("/medication/candidates")
      } else
        setResult(
          response.status === "candidates" ? "no_match" : response.status,
        )
    } catch {
      if (alive.current && !controller.signal.aborted) setResult("unavailable")
    } finally {
      if (request.current === controller) request.current = null
      if (alive.current) setBusy(false)
    }
  }
  return (
    <MedicationFlowShell
      title={t("photoTitle")}
      onBack={goBack}
      footer={
        <V2Button
          multilineLabel
          size="l"
          fullWidth
          disabled={!photos[0] || picking || !capability.data?.recognition}
          loading={busy}
          onPress={() => void recognize()}
        >
          {t(
            result
              ? "retryPhotos"
              : photos.length === 1
                ? "onePhoto"
                : "findPhotos",
          )}
        </V2Button>
      }
    >
      {!capability.data?.recognition ? (
        <View style={medStyles.section}>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("photoUnavailable")}
          </V2Text>
          <V2Text style={FORM.body} color={s.text}>
            {t("catalogUnavailable")}
          </V2Text>
          <V2Button
            multilineLabel
            color="neutral"
            variant="weak"
            onPress={() => router.replace("/medication/search")}
          >
            {t("searchMethod")}
          </V2Button>
        </View>
      ) : (
        <>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("photoIntro")}
          </V2Text>
          <View style={[medStyles.row, { alignItems: "stretch" }]}>
            {[0, 1].map((index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={t(index === 0 ? "front" : "back")}
                disabled={busy || picking || (index === 1 && !photos[0])}
                onPress={() => void pick(index)}
                style={[
                  medStyles.card,
                  {
                    flex: 1,
                    aspectRatio: 0.85,
                    backgroundColor: s.surfaceSunken,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: index === 1 && !photos[0] ? 0.4 : 1,
                  },
                ]}
              >
                {photos[index] ? (
                  <Image
                    source={photos[index]}
                    style={{ width: "100%", flex: 1, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <V2Text
                    style={{ fontSize: 28, lineHeight: 36 }}
                    color={s.textMuted}
                  >
                    ＋
                  </V2Text>
                )}
                <V2Text style={FORM.option} color={s.textStrong}>
                  {t(index === 0 ? "front" : "back")}
                </V2Text>
              </Pressable>
            ))}
          </View>
          <V2Text style={FORM.body} color={s.text}>
            {t("photoHint")}
          </V2Text>
          <View style={{ minHeight: 120, justifyContent: "center", gap: 12 }}>
            {busy ? (
              <>
                <V2DotLoader />
                <V2Text style={FORM.option} color={s.textStrong}>
                  {t("recognizing")}
                </V2Text>
                <V2Text style={FORM.hint} color={s.text}>
                  {t("recognizingBody")}
                </V2Text>
              </>
            ) : result ? (
              <>
                <V2Text
                  accessibilityRole="alert"
                  style={FORM.option}
                  color={s.textStrong}
                >
                  {t(result === "unavailable" ? "recognitionError" : "noMatch")}
                </V2Text>
                <V2Text style={FORM.hint} color={s.text}>
                  {t(
                    result === "unavailable"
                      ? "recognitionErrorBody"
                      : "noMatchBody",
                  )}
                </V2Text>
                <V2Button
                  multilineLabel
                  color="neutral"
                  variant="weak"
                  onPress={() => router.push("/medication/search")}
                >
                  {t("searchMethod")}
                </V2Button>
              </>
            ) : (
              <V2Text style={FORM.hint} color={s.text}>
                {t(photoError ? "photoReadError" : "photoConsent")}
              </V2Text>
            )}
          </View>
        </>
      )}
    </MedicationFlowShell>
  )
}
