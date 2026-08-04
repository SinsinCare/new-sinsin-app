/**
 * 공유 payload를 **어떻게 조립하는가** — 판정만 있고 네이티브 의존은 없다.
 *
 * `share.ts` 에서 떼어 낸 이유는 이 저장소의 관용구 그대로다: RN 을 들여오는 모듈은
 * jest(node)가 파싱하지 못해서, 규칙을 그 안에 두면 **검증할 방법이 사라진다.**
 * 그리고 이 규칙은 반드시 검증돼야 한다 —
 *
 * RN 의 `Share.share({message, url})` 에서 **안드로이드는 `url` 을 통째로 무시한다.**
 * iOS 만 그것을 따로 받아 공유 시트에 링크 미리보기를 그린다. 이 차이를 화면마다
 * 기억해야 했던 시절에 링크가 빠진 채 이름만 공유됐다(QA 2026-08-05
 * "오직 음식 이름만 텍스트로 공유"). 그래서 안드로이드에서는 본문 끝에 직접 붙인다.
 */

/** `Platform.OS` 중 이 규칙이 가르는 값. 나머지(web 등)는 안드로이드와 같게 다룬다. */
export type SharePlatform = "ios" | "android" | (string & {})

export interface SharePayloadInput {
  /** 안드로이드 공유 시트의 제목. iOS 는 쓰지 않는다. */
  readonly title?: string
  /** 사람이 읽는 본문. 링크는 넣지 말 것 — `link` 로 주면 이 함수가 붙인다. */
  readonly body: string
  /** 받는 사람이 눌러서 **그 화면으로 갈** 링크. 없으면 텍스트만 나간다. */
  readonly link?: string
}

export interface SharePayload {
  message: string
  url?: string
  title?: string
}

export function buildSharePayload(
  input: SharePayloadInput,
  os: SharePlatform,
): SharePayload {
  const body = input.body.trim()
  const link = input.link?.trim() ?? ""
  const withTitle = (payload: SharePayload): SharePayload =>
    input.title === undefined ? payload : { ...payload, title: input.title }

  if (link.length === 0) return withTitle({ message: body })

  // iOS 는 링크를 따로 받아야 미리보기를 그린다.
  if (os === "ios") return withTitle({ message: body, url: link })

  // 안드로이드는 `url` 을 무시한다 — 본문에 붙여야 링크가 실제로 간다.
  // 본문이 비면 개행만 남지 않게 링크만 보낸다.
  return withTitle({ message: body.length > 0 ? `${body}\n${link}` : link })
}
