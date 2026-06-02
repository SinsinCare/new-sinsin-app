import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"

import { api } from "../core"
import { ApiError } from "../core/apiError"
import { tokenService } from "../core/tokenService"
import type {
  OcrConfirmRequest,
  OcrConfirmResult,
  OcrReport,
  OcrUploadFile,
} from "@/src/features/health/types"

/**
 * 검사지 사진을 OCR 업로드에 적합하게 가공합니다.
 * - 글씨 가독성을 위해 폭 2000px까지만 축소(확대 X)
 * - 10MB 제한을 넘지 않도록 JPEG 0.85로 압축
 * 실패 시 원본 URI를 그대로 반환합니다.
 */
async function prepareImage(uri: string): Promise<string> {
  try {
    let sourceUri = uri
    // file:// 카메라 URI는 manipulator 접근 권한 이슈로 캐시 디렉토리에 복사 후 처리
    if (uri.startsWith("file://")) {
      const dest = `${FileSystem.cacheDirectory}ocr_tmp_${Date.now()}.jpg`
      await FileSystem.copyAsync({ from: uri, to: dest })
      sourceUri = dest
    }
    const context = ImageManipulator.manipulate(sourceUri)
    context.resize({ width: 2000 })
    const image = await context.renderAsync()
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.85,
    })
    context.release()
    image.release()
    return result.uri
  } catch {
    return uri
  }
}

export const examOcrService = {
  /**
   * ① 검사지 업로드 & OCR 추출 (status: PENDING, 아직 저장되지 않음)
   *
   * 이미지는 가독성을 유지하며 가공(축소/압축)하고, PDF는 원본 그대로 전송합니다.
   * multipart/form-data 업로드는 RN에서 axios 대신 fetch를 사용해
   * boundary 처리를 네이티브 네트워크 레이어에 맡깁니다(foodCameraService와 동일).
   */
  async uploadOcr(file: OcrUploadFile): Promise<OcrReport> {
    const isPdf = file.kind === "pdf"
    const uploadUri = isPdf ? file.uri : await prepareImage(file.uri)
    const uploadName =
      file.name ||
      (isPdf ? `lab_report_${Date.now()}.pdf` : `lab_report_${Date.now()}.jpg`)
    const uploadType = isPdf ? "application/pdf" : "image/jpeg"

    const formData = new FormData()
    formData.append("file", {
      uri: uploadUri,
      name: uploadName,
      type: uploadType,
    } as unknown as Blob)

    const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL
    const token = await tokenService.getAccessToken()
    const res = await fetch(`${baseURL}/user/exam-results/ocr`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      body: formData,
    })

    let json: {
      isSuccess?: boolean
      code?: string
      message?: string
      result?: OcrReport
    } | null = null
    try {
      json = await res.json()
    } catch {
      // 본문이 비어있거나 JSON이 아닌 경우 무시하고 상태코드로 처리
    }

    if (!res.ok || json?.isSuccess === false) {
      throw new ApiError(
        json?.message || "검사지 분석에 실패했습니다.",
        json?.code || `HTTP_${res.status}`,
        res.status,
      )
    }

    return json!.result as OcrReport
  },

  /**
   * ② 추출 결과 재조회 (검토 화면 진입/새로고침용)
   */
  async getOcrReport(reportId: number): Promise<OcrReport> {
    const res = await api.get(`/user/exam-results/ocr/${reportId}`)
    return res.data.result as OcrReport
  },

  /**
   * ③ 검토·수정 후 확정 저장 (status: CONFIRMED)
   * 확정된 값은 기존 GET /user/exam-results 목록에 합류합니다.
   */
  async confirmOcr(
    reportId: number,
    body: OcrConfirmRequest,
  ): Promise<OcrConfirmResult> {
    const res = await api.post(
      `/user/exam-results/ocr/${reportId}/confirm`,
      body,
    )
    return res.data.result as OcrConfirmResult
  },
}

/**
 * OCR API 에러 코드를 사용자 친화적 한국어 메시지로 변환합니다.
 */
export function getOcrErrorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : undefined
  switch (code) {
    case "INVALID_LAB_REPORT_FILE":
      return "지원하지 않는 형식입니다. JPEG, PNG, WEBP, PDF 파일만 업로드할 수 있어요."
    case "LAB_REPORT_FILE_TOO_LARGE":
      return "파일 용량이 너무 큽니다. 10MB 이하의 파일을 업로드해주세요."
    case "LAB_REPORT_NO_VALUES":
      return "검사지에서 수치를 인식하지 못했어요. 글씨가 선명하게 보이도록 다시 촬영해주세요."
    case "LAB_REPORT_NOT_FOUND":
      return "검사지 정보를 찾을 수 없습니다. 다시 시도해주세요."
    case "LAB_REPORT_ALREADY_CONFIRMED":
      return "이미 저장된 검사지입니다."
    case "LAB_REPORT_NO_CONFIRMED_ITEMS":
      return "저장할 항목을 최소 1개 이상 선택해주세요."
    default:
      return error instanceof ApiError && error.message
        ? error.message
        : "검사지 분석에 실패했습니다. 잠시 후 다시 시도해주세요."
  }
}
