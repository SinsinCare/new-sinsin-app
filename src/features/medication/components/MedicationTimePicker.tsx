import { useEffect, useRef, useState } from "react"
import { findNodeHandle, Platform, View } from "react-native"
import { useBottomSheetInternal } from "@gorhom/bottom-sheet"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useTranslation } from "react-i18next"
import { V2BottomSheet } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import {
  clockToPickerDate,
  pickerDateToClock,
} from "../data/medicationReminderTime"
import type { Slot } from "../types"

/** Mounted for each edit. Neither dismissing nor turning a wheel mutates the form. */
export function MedicationTimePicker({
  slot,
  clock,
  onClose,
  onConfirm,
}: {
  slot: Slot
  clock: string
  onClose: () => void
  onConfirm: (clock: string) => void
}) {
  const { t, i18n } = useTranslation("medication"),
    s = useSurface()
  const [draft, setDraft] = useState(() => clockToPickerDate(clock))
  if (Platform.OS === "android")
    return (
      <DateTimePicker
        value={draft}
        mode="time"
        display="spinner"
        is24Hour={false}
        onChange={(event, date) => {
          if (event.type === "set" && date) onConfirm(pickerDateToClock(date))
          else onClose()
        }}
      />
    )
  return (
    <V2BottomSheet
      surface="home_medication"
      visible
      onClose={onClose}
      showClose
      title={t("reminderTimeTitle", { slot: t(`slots.${slot}`) })}
      subTitle={t("reminderTimeSubtitle")}
      primaryLabel={t("reminderTimeConfirm")}
      onPrimary={() => onConfirm(pickerDateToClock(draft))}
    >
      <NativePickerContainer>
        <DateTimePicker
          value={draft}
          mode="time"
          display="spinner"
          locale={i18n.language.startsWith("ko") ? "ko-KR" : "en-US"}
          themeVariant={s.isDark ? "dark" : "light"}
          textColor={s.textStrong}
          style={{ width: "100%", height: 216 }}
          onChange={(_, date) => {
            if (date) setDraft(date)
          }}
        />
      </NativePickerContainer>
    </V2BottomSheet>
  )
}

/** UIDatePicker has its own native text editor, outside RN TextInput focus tracking. */
function NativePickerContainer({ children }: { children: React.ReactNode }) {
  const { animatedKeyboardState } = useBottomSheetInternal()
  const target = useRef<number | undefined>(undefined)
  const view = useRef<View>(null)
  useEffect(
    () => () => {
      if (animatedKeyboardState.get().target === target.current)
        animatedKeyboardState.set((state) => ({ ...state, target: undefined }))
    },
    [animatedKeyboardState],
  )
  return (
    <View
      ref={view}
      collapsable={false}
      style={{ alignItems: "center", paddingVertical: 8 }}
      onLayout={() => {
        const node = findNodeHandle(view.current)
        if (!node) return
        target.current = node
        animatedKeyboardState.set((state) => ({
          ...state,
          target: target.current,
        }))
      }}
    >
      {children}
    </View>
  )
}
