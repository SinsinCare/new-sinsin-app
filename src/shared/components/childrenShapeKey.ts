import { Children, isValidElement, type ReactNode } from "react"

/**
 * Reanimated `Animated.View` 는 **안드로이드 릴리즈 빌드에서, 살아 있는 인스턴스의
 * 자식이 통째로 갈아끼워지면 새 자식들을 그리지 않는다** — 레이아웃·접근성 트리에는
 * 전부 존재하는데 화면에는 면 색만 남는다(2026-08-06 확진: 홈 식사 타일이 데이터
 * 도착으로 빈 카드 → 사진 카드로 바뀌는 순간. dev 빌드·분기 전환 없는 카드에서는
 * 재현되지 않아 오래 숨었다. 에뮬레이터 릴리즈 APK 실측).
 *
 * 콜사이트마다 분기 key 를 기억해서 다는 방식은 다음 화면에서 반드시 잊힌다.
 * 그래서 애니메이션 래퍼(SurfacePressable·RecordRowPressable)가 이 키를 스스로
 * 계산한다 — 자식의 "구성"(개수·순서·엘리먼트 타입)이 바뀌면 키가 바뀌어
 * 네이티브 뷰가 리마운트되고, 같은 구성 안에서의 prop/텍스트 변경(값 갱신,
 * 색 변화)은 키가 그대로라 리마운트 비용이 없다.
 *
 * 타입 이름이 아니라 **타입 레퍼런스의 등장 순번**을 쓴다 — 프로덕션 번들은
 * 함수 이름을 minify 해서 서로 다른 컴포넌트가 같은 한 글자 이름이 될 수 있다.
 * 레퍼런스 동일성은 minify 와 무관하다.
 */
export function childrenShapeKey(children: ReactNode): string {
  const seen: unknown[] = []
  return Children.toArray(children)
    .map((child) => {
      if (!isValidElement(child)) return typeof child
      const type = child.type
      let index = seen.indexOf(type)
      if (index === -1) {
        seen.push(type)
        index = seen.length - 1
      }
      return `e${index}`
    })
    .join("|")
}
