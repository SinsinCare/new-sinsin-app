import React from "react"
import { Modal, View, Pressable, StyleSheet } from "react-native"

import { ThemedText } from "@/components/themed-text"
import { useTranslation } from "react-i18next"

interface ConfirmModalProps {
  visible: boolean
  title: string
  description?: string
  cancelText?: string
  confirmText?: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmModal({
  visible,
  title,
  description,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const { t } = useTranslation()
  const resolvedCancelText = cancelText ?? t("action.cancel")
  const resolvedConfirmText = confirmText ?? t("action.confirm")

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.dim}>
        <View style={styles.popup}>
          <View style={styles.popupContent}>
            <ThemedText style={styles.popupTitle}>{title}</ThemedText>
            {description && (
              <ThemedText style={styles.popupDescription}>
                {description}
              </ThemedText>
            )}
          </View>
          <View style={styles.popupButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.popupButton,
                styles.popupButtonCancel,
                pressed && styles.popupButtonPressed,
              ]}
              onPress={onCancel}
            >
              <ThemedText style={styles.popupButtonCancelText}>
                {resolvedCancelText}
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.popupButton,
                pressed && styles.popupButtonPressed,
              ]}
              onPress={onConfirm}
            >
              <ThemedText style={styles.popupButtonConfirmText}>
                {resolvedConfirmText}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: "#0000006B",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  popup: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  popupContent: {
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
    alignItems: "center",
  },
  popupTitle: {
    fontSize: 18,
    lineHeight: 18 * 1.4,
    fontWeight: "600",
    color: "#17191C",
    textAlign: "center",
  },
  popupDescription: {
    fontSize: 15,
    lineHeight: 15 * 1.4,
    fontWeight: "500",
    color: "#2E323AE0",
    textAlign: "center",
  },
  popupButtons: {
    flexDirection: "row",
    borderTopWidth: 0.6,
    borderTopColor: "#DADFE699",
  },
  popupButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  popupButtonCancel: {
    borderRightWidth: 0.6,
    borderRightColor: "#DADFE699",
  },
  popupButtonPressed: {
    backgroundColor: "#F9F9F9",
  },
  popupButtonCancelText: {
    fontSize: 14,
    lineHeight: 14 * 1.4,
    fontWeight: "400",
    color: "#2E323AE0",
  },
  popupButtonConfirmText: {
    fontSize: 14,
    lineHeight: 14 * 1.4,
    fontWeight: "600",
    color: "#000000",
  },
})
