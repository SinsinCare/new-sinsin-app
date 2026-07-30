import React, { useState } from "react"
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { useTranslation } from "react-i18next"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { examOcrService, getOcrErrorMessage } from "@/src/services/data"
import { logger } from "@/src/lib/logger"
import type { OcrUploadFile } from "@/src/features/health/types"
import { useHealthTheme } from "../hooks/useHealthTheme"

const MAX_FILES = 5

// URI 마지막 경로 조각에서 파일명을 추출 (없으면 fallback)
function deriveName(uri: string, fallback: string): string {
  const last = uri.split("/").pop()?.split("?")[0]
  return last && last.length > 0 ? last : fallback
}

export function HealthDataUploadScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t } = useTranslation("health")
  const { healthColors } = useHealthTheme()

  const [files, setFiles] = useState<OcrUploadFile[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  const pickFromCamera = async () => {
    if (files.length >= MAX_FILES) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        t("upload.cameraPermissionTitle"),
        t("upload.cameraPermissionDescription"),
        [
          { text: t("actions.cancel"), style: "cancel" },
          {
            text: t("actions.openSettings"),
            onPress: () => void Linking.openSettings(),
          },
        ],
      )
      return
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setFiles((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name:
            asset.fileName ?? deriveName(asset.uri, `photo_${Date.now()}.jpg`),
          kind: "image",
        },
      ])
    }
  }

  const pickFromGallery = async () => {
    if (files.length >= MAX_FILES) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        t("upload.photoPermissionTitle"),
        t("upload.photoPermissionDescription"),
        [
          { text: t("actions.cancel"), style: "cancel" },
          {
            text: t("actions.openSettings"),
            onPress: () => void Linking.openSettings(),
          },
        ],
      )
      return
    }

    const remaining = MAX_FILES - files.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    })
    if (!result.canceled && result.assets.length > 0) {
      const newFiles: OcrUploadFile[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? deriveName(a.uri, `image_${Date.now()}.jpg`),
        kind: "image",
      }))
      setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES))
    }
  }

  const pickPdf = async () => {
    if (files.length >= MAX_FILES) return
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setFiles((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.name ?? deriveName(asset.uri, `document_${Date.now()}.pdf`),
        kind: "pdf",
      },
    ])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    // 백엔드 OCR은 검사지 1건(파일 1개) 단위로 분석/확정합니다.
    // 첨부된 파일 중 첫 번째 검사지를 분석합니다.
    if (files.length === 0 || analyzing) return

    setAnalyzing(true)
    try {
      const report = await examOcrService.uploadOcr(files[0])
      router.push({
        pathname: "/(settings)/health-ocr-review",
        params: { reportId: String(report.reportId) },
      })
    } catch (error) {
      logger.error("[ocr] upload failed", error)
      Alert.alert(t("upload.readErrorTitle"), getOcrErrorMessage(error))
    } finally {
      setAnalyzing(false)
    }
  }

  const canAdd = files.length < MAX_FILES

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: healthColors.background }]}
    >
      <ScreenHeader
        title={t("upload.header")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.title, { color: healthColors.text }]}>
          {t("upload.title")}
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: healthColors.textSecondary }]}
        >
          {t("upload.subtitle")}
        </ThemedText>

        {/* 첨부 파일 영역 (항상 표시) */}
        <View
          style={[
            styles.attachSection,
            {
              borderColor: healthColors.line,
              backgroundColor: healthColors.surface,
            },
          ]}
        >
          <View style={styles.attachHeader}>
            <ThemedText
              style={[styles.attachTitle, { color: healthColors.text }]}
            >
              {t("upload.attachments")}{" "}
              <ThemedText style={styles.attachCount}>
                {files.length}/{MAX_FILES}
              </ThemedText>
            </ThemedText>
            {files.length > 0 && (
              <Pressable onPress={() => setFiles([])} hitSlop={8}>
                <ThemedText style={styles.clearAllText}>
                  {t("actions.clearAll")}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* 파일 썸네일 그리드 */}
          <View style={styles.thumbGrid}>
            {files.map((file, index) => (
              // 썸네일 wrapper는 overflow:visible 명시 — X버튼은 내부에 위치
              <View key={`${file.uri}-${index}`} style={styles.thumbWrapper}>
                {file.kind === "pdf" ? (
                  <View
                    style={[
                      styles.pdfThumb,
                      {
                        backgroundColor: healthColors.positiveWeak,
                        borderColor: healthColors.line,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text"
                      size={28}
                      color={tokens.color.sub6.val}
                    />
                    <ThemedText
                      style={[
                        styles.pdfThumbText,
                        { color: healthColors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {file.name}
                    </ThemedText>
                  </View>
                ) : (
                  <Image
                    source={{ uri: file.uri }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                )}
                {/* X버튼을 썸네일 내부 우상단에 배치 (bounds 안) */}
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removeFile(index)}
                  hitSlop={6}
                >
                  <View style={styles.removeBtnInner}>
                    <Ionicons name="close" size={11} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
            ))}

            {/* 추가 슬롯 (최대치 미달 시) */}
            {canAdd && (
              <View
                style={[
                  styles.addSlot,
                  {
                    borderColor: healthColors.line,
                    backgroundColor: healthColors.surfaceMuted,
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.addSlotButton,
                    {
                      backgroundColor: healthColors.surfaceMuted,
                      borderColor: healthColors.line,
                    },
                    pressed && { backgroundColor: healthColors.surfacePressed },
                  ]}
                  onPress={pickFromGallery}
                >
                  <Ionicons
                    name="add"
                    size={28}
                    color={healthColors.textAssistive}
                  />
                  <ThemedText
                    style={[
                      styles.addSlotText,
                      { color: healthColors.textAssistive },
                    ]}
                  >
                    {t("upload.chooseFile")}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          {/* 첨부 방법 버튼 */}
          <View
            style={[
              styles.pickRow,
              {
                borderColor: healthColors.line,
                backgroundColor: healthColors.surfaceMuted,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                !canAdd && styles.pickButtonDisabled,
                pressed &&
                  canAdd && { backgroundColor: healthColors.surfacePressed },
              ]}
              onPress={pickFromCamera}
              disabled={!canAdd}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={canAdd ? tokens.color.sub6.val : tokens.color.grey7.val}
              />
              <ThemedText
                style={[
                  styles.pickButtonText,
                  { color: healthColors.textSecondary },
                  !canAdd && styles.pickButtonTextDisabled,
                ]}
              >
                {t("upload.takePhoto")}
              </ThemedText>
            </Pressable>

            <View
              style={[
                styles.pickDivider,
                { backgroundColor: healthColors.line },
              ]}
            />

            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                !canAdd && styles.pickButtonDisabled,
                pressed &&
                  canAdd && { backgroundColor: healthColors.surfacePressed },
              ]}
              onPress={pickFromGallery}
              disabled={!canAdd}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={canAdd ? tokens.color.sub6.val : tokens.color.grey7.val}
              />
              <ThemedText
                style={[
                  styles.pickButtonText,
                  { color: healthColors.textSecondary },
                  !canAdd && styles.pickButtonTextDisabled,
                ]}
              >
                {t("upload.choosePhoto")}
              </ThemedText>
            </Pressable>

            <View
              style={[
                styles.pickDivider,
                { backgroundColor: healthColors.line },
              ]}
            />

            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                !canAdd && styles.pickButtonDisabled,
                pressed &&
                  canAdd && { backgroundColor: healthColors.surfacePressed },
              ]}
              onPress={pickPdf}
              disabled={!canAdd}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={canAdd ? tokens.color.sub6.val : tokens.color.grey7.val}
              />
              <ThemedText
                style={[
                  styles.pickButtonText,
                  { color: healthColors.textSecondary },
                  !canAdd && styles.pickButtonTextDisabled,
                ]}
              >
                PDF
              </ThemedText>
            </Pressable>
          </View>

          {!canAdd && (
            <ThemedText
              style={[
                styles.maxReachedText,
                { color: healthColors.cautionary },
              ]}
            >
              {t("upload.maxFiles", { count: MAX_FILES })}
            </ThemedText>
          )}
        </View>

        {/* 안내사항 */}
        <View
          style={[
            styles.tipsBox,
            { backgroundColor: healthColors.surfaceMuted },
          ]}
        >
          {(
            [
              "upload.tips.report",
              "upload.tips.straight",
              "upload.tips.focus",
              "upload.tips.fullPage",
            ] as const
          ).map((tipKey) => (
            <View key={tipKey} style={styles.tipRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={tokens.color.sub6.val}
                style={styles.tipIcon}
              />
              <ThemedText
                style={[styles.tipText, { color: healthColors.textSecondary }]}
              >
                {t(tipKey)}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomActionBar
        label={analyzing ? t("upload.readingResults") : t("upload.readResults")}
        disabled={files.length === 0 || analyzing}
        paddingBottom={insets.bottom + 16}
        onPress={handleAnalyze}
      />

      <Modal visible={analyzing} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: healthColors.surface },
            ]}
          >
            <ActivityIndicator
              size="large"
              color={tokens.color.sub6.val}
              style={{ marginBottom: 16 }}
            />
            <ThemedText
              style={[styles.loadingTitle, { color: healthColors.text }]}
            >
              {t("upload.readingTitle")}
            </ThemedText>
            <ThemedText
              style={[
                styles.loadingSubtitle,
                { color: healthColors.textSecondary },
              ]}
            >
              {t("upload.readingDescription")}
            </ThemedText>
          </View>
        </View>
      </Modal>
    </ThemedView>
  )
}

const THUMB_SIZE = 80

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#17191C",
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94A3B8",
    marginBottom: 20,
  },
  // 첨부 영역
  attachSection: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  attachHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attachTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  attachCount: {
    color: tokens.color.sub6.val,
  },
  clearAllText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  // 썸네일 그리드
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    minHeight: THUMB_SIZE,
  },
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden", // 이미지 라운드 클리핑
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  pdfThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 4,
  },
  pdfThumbText: {
    fontSize: 9,
    lineHeight: 12,
    color: "#64748B",
    textAlign: "center",
  },
  // X버튼: 썸네일 내부 우상단 (overflow:hidden 내에서 position:absolute)
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  removeBtnInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addSlot: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  addSlotButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#F8FAFC",
  },
  addSlotButtonPressed: {
    backgroundColor: "#F0F2F5",
  },
  addSlotText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  // 첨부 방법 버튼 행
  pickRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },
  pickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  pickButtonPressed: {
    backgroundColor: "#F0FDF4",
  },
  pickButtonDisabled: {
    opacity: 0.5,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: tokens.color.sub6.val,
  },
  pickButtonTextDisabled: {
    color: tokens.color.grey7.val,
  },
  pickDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  maxReachedText: {
    fontSize: 12,
    color: "#F59E0B",
    textAlign: "center",
  },
  // 안내사항
  tipsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  // 로딩
  loadingOverlay: {
    flex: 1,
    backgroundColor: "#00000060",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#17191C",
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
})
