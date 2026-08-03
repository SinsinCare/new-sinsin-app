import React, { useState } from "react"
import { View, Pressable, ScrollView, StyleSheet } from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { MONTHS, YEARS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"

interface DatePickerModalProps {
  visible: boolean
  selected: { year: number; month: number } | null
  onClose: () => void
  onSelect: (year: number, month: number) => void
}

export function DatePickerModal({
  visible,
  selected,
  onClose,
  onSelect,
}: DatePickerModalProps) {
  const [tempYear, setTempYear] = useState(selected?.year ?? YEARS[0])
  const [tempMonth, setTempMonth] = useState(selected?.month ?? 1)
  const c = useSettingsColors()
  const { t } = useTranslation("settings")

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dimArea} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: c.modalBg }]}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText style={[styles.cancelText, { color: c.textMuted }]}>
                {t("shared.cancel")}
              </ThemedText>
            </Pressable>
            <ThemedText style={[styles.headerTitle, { color: c.text }]}>
              {t("datePicker.title")}
            </ThemedText>
            <Pressable
              onPress={() => onSelect(tempYear, tempMonth)}
              hitSlop={8}
            >
              <ThemedText style={styles.confirmText}>
                {t("datePicker.confirm")}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.columns}>
            <ScrollView
              bounces={false}
              overScrollMode="never"
              style={styles.column}
              showsVerticalScrollIndicator={false}
            >
              {MONTHS.map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.pickerItem,
                    tempMonth === m && {
                      backgroundColor: c.isDark ? "#1A3A2E" : "#F0FDF4",
                    },
                  ]}
                  onPress={() => setTempMonth(m)}
                >
                  <ThemedText
                    style={[
                      styles.pickerItemText,
                      { color: c.textSub },
                      tempMonth === m && styles.pickerItemTextSelected,
                    ]}
                  >
                    {t("datePicker.month", {
                      month: String(m).padStart(2, "0"),
                    })}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              bounces={false}
              overScrollMode="never"
              style={styles.column}
              showsVerticalScrollIndicator={false}
            >
              {YEARS.map((y) => (
                <Pressable
                  key={y}
                  style={[
                    styles.pickerItem,
                    tempYear === y && {
                      backgroundColor: c.isDark ? "#1A3A2E" : "#F0FDF4",
                    },
                  ]}
                  onPress={() => setTempYear(y)}
                >
                  <ThemedText
                    style={[
                      styles.pickerItemText,
                      { color: c.textSub },
                      tempYear === y && styles.pickerItemTextSelected,
                    ]}
                  >
                    {t("datePicker.year", { year: y })}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#0000004D",
  },
  dimArea: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelText: {
    fontSize: 15,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: tokens.color.sub6.val,
  },
  columns: {
    flexDirection: "row",
    height: 280,
  },
  column: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 14,
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerItemTextSelected: {
    color: tokens.color.sub8.val,
    fontWeight: "600",
  },
})
