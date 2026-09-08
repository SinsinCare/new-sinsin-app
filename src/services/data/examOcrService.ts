import { api, authenticatedFetch } from "../core"
import { ApiError } from "../core/apiError"
import { getAppLanguage } from "@/src/i18n"
import { getBackendUrl } from "@/src/config/appConfig"
import { prepareImageUpload } from "@/src/shared/utils/preparedImageUpload"
import type {
  OcrConfirmRequest,
  OcrConfirmResult,
  OcrReport,
  OcrUploadFile,
} from "@/src/features/health/types"

type OcrUploadResponse = {
  isSuccess?: boolean
  code?: string
  message?: string
  result?: OcrReport
}

/**
 * 검사지 사진을 OCR 업로드에 적합하게 가공합니다.
 * - 글씨 가독성을 위해 폭 2000px로 리사이즈
 * - 10MB 제한을 넘지 않도록 JPEG 0.85로 압축
 * 실패 시 원본 URI를 그대로 반환합니다.
 */
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
    const prepared = isPdf
      ? { uri: file.uri, cleanup: async () => undefined }
      : await prepareImageUpload(file.uri, {
          width: 2000,
          compress: 0.85,
          cachePrefix: "ocr_tmp",
        })
    const uploadName =
      file.name ||
      (isPdf ? `lab_report_${Date.now()}.pdf` : `lab_report_${Date.now()}.jpg`)
    const uploadType = isPdf ? "application/pdf" : "image/jpeg"

    try {
      const res = await authenticatedFetch(
        `${getBackendUrl()}/user/exam-results/ocr`,
        () => {
          const formData = new FormData()
          formData.append("file", {
            uri: prepared.uri,
            name: uploadName,
            type: uploadType,
          } as unknown as Blob)
          return {
            method: "POST",
            headers: { Accept: "application/json" },
            body: formData as unknown as RequestInit["body"],
          }
        },
        { timeoutMs: 120_000 },
      )

      let json: OcrUploadResponse | null = null
      try {
        json = (await res.json()) as OcrUploadResponse
      } catch {
        // 본문이 비어있거나 JSON이 아닌 경우 무시하고 상태코드로 처리
      }

      if (!res.ok || json?.isSuccess === false || !json?.result) {
        throw new ApiError(
          getAppLanguage() === "en"
            ? "We couldn’t read this lab report. Check the file and upload it again."
            : "검사지를 읽지 못했어요. 파일을 확인하고 다시 올려 주세요.",
          json?.code || `HTTP_${res.status}`,
          res.status,
        )
      }

      return json.result
    } finally {
      await prepared.cleanup()
    }
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
  const isEnglish = getAppLanguage() === "en"
  switch (code) {
    case "INVALID_LAB_REPORT_FILE":
      return isEnglish
        ? "Choose a JPEG, PNG, WEBP, or PDF file."
        : "이 파일은 올릴 수 없어요. JPEG, PNG, WEBP, PDF 파일을 선택해 주세요."
    case "LAB_REPORT_FILE_TOO_LARGE":
      return isEnglish
        ? "This file is larger than 10 MB. Choose a smaller file."
        : "파일이 10MB를 넘어요. 더 작은 파일을 선택해 주세요."
    case "LAB_REPORT_NO_VALUES":
      return isEnglish
        ? "We couldn’t read the results. Retake the photo with the text clearly visible."
        : "검사 수치를 읽기 어려워요. 글씨가 선명하게 보이도록 다시 촬영해 주세요."
    case "LAB_REPORT_NOT_FOUND":
      return isEnglish
        ? "We couldn’t find this lab report. Choose it again from your reports."
        : "이 검사지를 찾지 못했어요. 검사지 목록에서 다시 선택해 주세요."
    case "LAB_REPORT_ALREADY_CONFIRMED":
      return isEnglish
        ? "You already saved this lab report. You can find it in your reports."
        : "이미 저장한 검사지예요. 검사지 목록에서 확인할 수 있어요."
    case "LAB_REPORT_NO_CONFIRMED_ITEMS":
      return isEnglish
        ? "Select at least one result to save."
        : "저장할 검사 수치를 하나 이상 선택해 주세요."
    default:
      return isEnglish
        ? "We couldn’t read this lab report. Try uploading it again in a moment."
        : "검사지를 읽지 못했어요. 잠시 후 파일을 다시 올려 주세요."
  }
}
