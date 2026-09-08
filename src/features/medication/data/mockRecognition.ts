import type { Drug, RecognitionResult } from "../types"

/** 목 모드(EXPO_PUBLIC_USE_MOCK_MODE)에서 사진 인식이 돌려주는 후보. 실제 식약처 항목 모양이다. */
export const MOCK_RECOGNITION_CANDIDATES: Drug[] = [
  {
    id: "200808877",
    name: "페라트라정2.5밀리그램(레트로졸)",
    manufacturer: "(주)유한양행",
    ingredients: "레트로졸",
    category: "항악성종양제",
    imageUrl: null,
    shape: "원형",
    color: "노랑",
    imprintFront: "YH",
    imprintBack: "LT",
    source: "식품의약품안전처",
    sourceUrl: "https://www.data.go.kr/data/15057639/openapi.do",
    updatedAt: "2026-09-08T00:00:00.000Z",
    etcOtc: "전문의약품",
    form: "필름코팅정",
    pill: true,
  },
]
export function mockRecognize(photoCount: number): RecognitionResult {
  if (photoCount < 1)
    return { status: "poor_image", confidence: "none", items: [], matches: [] }
  return {
    status: "candidates",
    confidence: photoCount >= 2 ? "high" : "medium",
    items: MOCK_RECOGNITION_CANDIDATES,
    matches: MOCK_RECOGNITION_CANDIDATES.map((d) => ({
      id: d.id,
      score: photoCount >= 2 ? 92 : 76,
      parts: { imprint: 55, appearance: 21, context: photoCount >= 2 ? 16 : 0 },
    })),
  }
}
