import React, { useState } from "react"
import { Modal, View, Pressable, ScrollView, StyleSheet } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { MONTHS, YEARS } from "@/src/features/settings/data/constants"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dimArea} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: c.modalBg }]}>
          <View
            style={[styles.header, { borderBottomColor: c.border }]}
          >
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText style={[styles.cancelText, { color: c.textMuted }]}>
                취소
              </ThemedText>
            </Pressable>
            <ThemedText style={[styles.headerTitle, { color: c.text }]}>
              진단 시기
            </ThemedText>
            <Pressable
              onPress={() => onSelect(tempYear, tempMonth)}
              hitSlop={8}
            >
              <ThemedText style={styles.confirmText}>확인</ThemedText>
            </Pressable>
          </View>
          <View style={styles.columns}>
            <ScrollView
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
                    {String(m).padStart(2, "0")}월
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
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
                    {y}년
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
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
    color: "#44AF94",
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
    color: "#0D896A",
    fontWeight: "600",
  },
})
