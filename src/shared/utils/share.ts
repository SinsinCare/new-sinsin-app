/**
 * 앱 바깥으로 **내보내는** 한 곳. 화면마다 `Share.share` 를 직접 부르지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 모으나 — 다섯 곳이 서로 다른 것을 보냈다
 *
 * 실측(2026-08-05):
 *
 * | 화면        | 보내던 것       | 링크        |
 * |-------------|-----------------|-------------|
 * | 레시피 상세 | 이름 + 요약     | **없음**    |
 * | 게시글 상세 | 제목 + 본문     | 스토어 URL  |
 * | 식당 상세   | 이름            | 딥링크      |
 * | 건강 기록   | 긴 텍스트       | 없음        |
 * | 식사 결과   | 이미지 파일     | 없음        |
 *
 * 그래서 "레시피를 공유하면 음식 이름만 간다"(QA)가 나왔다. 링크가 없으니 받은 사람이
 * 그 레시피로 갈 방법이 없다. 화면마다 고치면 여섯 번째 공유가 생길 때 또 갈린다.
 *
 * ■ 플랫폼 차이와 취소 처리를 여기서 흡수한다
 *
 * payload 조립 규칙은 `sharePayload.ts` 에 있다(RN 을 안 들여와야 jest 가 검증한다).
 * 이 파일이 더 하는 일은 둘이다 — 햅틱, 그리고 **취소를 실패로 알리지 않는 것**.
 * 공유 시트를 닫으면 플랫폼에 따라 예외가 나는데 사용자가 마음을 바꾼 것뿐이다.
 * 반대로 진짜 실패를 삼키지도 않는다: 종전에 한 곳이 `void Share.share(...)` 라
 * 실패가 unhandled rejection 으로 빠져 **아무 일도 일어나지 않는 버튼**이 됐다.
 */

import { Platform, Share } from "react-native"

import { hapticSelection } from "@/src/lib/haptics"
import { logger } from "@/src/lib/logger"
import { buildSharePayload, type SharePayloadInput } from "./sharePayload"

export { buildSharePayload } from "./sharePayload"

export interface ShareContentInput extends SharePayloadInput {
  /** 로그에서 어느 버튼이었는지 되짚는 이름. */
  readonly scope: string
}

/**
 * 공유 시트를 연다. 취소는 조용히, 실패는 로그로 남긴다.
 * 호출부는 `await` 하지 않아도 된다 — 이 함수는 던지지 않는다.
 */
export async function shareContent(input: ShareContentInput): Promise<void> {
  hapticSelection()
  try {
    await Share.share(buildSharePayload(input, Platform.OS))
  } catch (error) {
    logger.debug(`[share] ${input.scope}`, error)
  }
}
