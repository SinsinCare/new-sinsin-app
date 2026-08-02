/**
 * 화면 사이로 의사 카드를 옮기는 라우트 파라미터 인코딩.
 *
 * 왜 JSON 인가: 검색 → 연결 확인 → 공유 설정 세 화면이 같은 `DoctorCard` 를 본다.
 * id 만 넘기고 각 화면에서 다시 부르면 왕복이 두 번 더 늘고, 그 사이에 이름이 빈 채로
 * 그려지는 프레임이 생긴다. 반대로 이름·병원만 골라 넘기면 나머지 칸을 지어내야 해서
 * (`speciality: null` 같은) 타입이 거짓말을 하게 된다. 통째로 실어 보내는 쪽이 정직하다.
 *
 * URL 길이는 문제가 아니다 — 이 객체는 최대 몇백 바이트고 앱 내부 내비게이션이라
 * 브라우저 주소창 상한과 무관하다.
 *
 * **파싱은 반드시 실패할 수 있다고 보고 다룬다.** 딥링크로 손으로 만든 값이 들어올 수 있고,
 * 그때 화면이 터지는 대신 `null` 을 받아 빈 상태를 그려야 한다.
 */

import type { DoctorCard } from "@/src/types/doctorLink"

export function encodeDoctorParam(doctor: DoctorCard): string {
  return JSON.stringify(doctor)
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/** 모양이 어긋나면 null. 화면은 null 을 "의사 없음" 으로 그린다. */
export function decodeDoctorParam(
  value: string | string[] | undefined,
): DoctorCard | null {
  const raw = firstParam(value)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<DoctorCard>
    if (typeof parsed?.id !== "string" || typeof parsed?.name !== "string") {
      return null
    }
    return {
      id: parsed.id,
      name: parsed.name,
      speciality: parsed.speciality ?? null,
      department: parsed.department ?? null,
      organizationId: parsed.organizationId ?? null,
      organizationName: parsed.organizationName ?? null,
      needsProfileCompletion: parsed.needsProfileCompletion ?? false,
    }
  } catch {
    return null
  }
}

/**
 * 분석 대상 검진 회차 id 목록. 쉼표로 잇는다.
 *
 * 숫자가 아닌 조각은 버린다 — 하나가 깨졌다고 화면 전체가 빈 상태가 되면
 * 사용자는 왜 그런지 알 수 없다.
 */
export function encodeResultIds(ids: number[]): string {
  return ids.join(",")
}

export function decodeResultIds(
  value: string | string[] | undefined,
): number[] {
  const raw = firstParam(value)
  if (!raw) return []
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}
