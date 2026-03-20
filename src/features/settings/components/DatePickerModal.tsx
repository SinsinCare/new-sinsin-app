import React, { useState } from "react"
import { Modal, View, Pressable, ScrollView, StyleSheet } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { MONTHS, YEARS } from "@/src/features/settings/data/constants"

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dimArea} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText style={styles.cancelText}>취소</ThemedText>
            </Pressable>
            <ThemedText style={styles.headerTitle}>진단 시기</ThemedText>
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
                    tempMonth === m && styles.pickerItemSelected,
                  ]}
                  onPress={() => setTempMonth(m)}
                >
                  <ThemedText
                    style={[
                      styles.pickerItemText,
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
                    tempYear === y && styles.pickerItemSelected,
                  ]}
                  onPress={() => setTempYear(y)}
                >
                  <ThemedText
                    style={[
                      styles.pickerItemText,
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
    backgroundColor: "#FFFFFF",
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
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#17191C",
  },
  cancelText: {
    fontSize: 15,
    color: "#94A3B8",
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
  pickerItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  pickerItemText: {
    fontSize: 16,
    color: "#555",
  },
  pickerItemTextSelected: {
    color: "#0D896A",
    fontWeight: "600",
  },
})
