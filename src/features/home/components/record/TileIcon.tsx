import { Image } from "expo-image"

/**
 * 오늘 기록 타일의 지표 아이콘. 디자인이 넘겨준 원본 그대로 쓴다 —
 * 이모지 **폰트**는 기기·OS 버전마다 그림이 달라져 같은 화면이 사람마다 다르게
 * 보이므로, 래스터로 고정해 앱에 싣는다.
 *
 * 자산은 디자인 전달 3D 팩(2026-08-03, "3d 컴포넌트" 252px)이다 — 식사가 이모지
 * 래스터(사실풍 밥그릇)라 나머지와 계열이 갈렸던 것("모두 2d 혹은 3d 로 통일",
 * QA 2026-08-02 정설아)을 이 팩의 3D 밥그릇이 해소했다. **수분만 팩에 없어 구
 * 자산을 유지한다** — 물방울 3D가 오면 같은 규칙(투명 여백 트림, `pngIcon.tsx`
 * 참조)으로 잘라 갈아끼울 것.
 *
 * 3D 전환 범위는 **이 여섯 타일(시트 진입 버튼)뿐**이다 — 끼니 타임라인까지
 * 넓혔다가 "여기만 바꾸는 거였다"로 되돌렸다(2026-08-03). 타임라인은 평면
 * SVG 세트가 정본.
 */
const SOURCES = {
  meal: require("@/assets/images/tile-meal.png"),
  water: require("@/assets/images/tile-water.png"),
  bloodPressure: require("@/assets/images/tile-pressure.png"),
  bloodGlucose: require("@/assets/images/tile-glucose.png"),
  weight: require("@/assets/images/tile-weight.png"),
  edema: require("@/assets/images/tile-edema.png"),
} as const

export type TileIconName = keyof typeof SOURCES

// 붓기 +2 광학 보정(2026-08-02)은 제거했다 — 당시 자산의 불투명 영역이 유난히
// 작았던 게 원인인데, 지금은 모든 자산을 콘텐츠 기준으로 트림해 커밋하므로
// 전제 자체가 사라졌다. 다시 필요해지면 투명 픽셀이 아니라 여기에 명시할 것.

// 크기 20 은 구 28 과 같은 **보이는** 크기다. 구 자산은 상자의 ~70%만 그림이라
// 28 상자에서 실제로는 ~20pt 로 보였고(QA 통과 상태), 트림 자산은 상자를 꽉
// 채우므로 숫자를 그대로 두면 그만큼 커져 보인다("아이콘이 너무 크다",
// 2026-08-03). 상자 숫자가 곧 보이는 크기 — 이제 눈대중 보정이 필요 없다.

/**
 * 아래 1.5 는 라벨 줄높이 보정이다. 타일 라벨(16pt, lineHeight 22)의 자연
 * 줄높이는 Pretendard hhea 기준 19.1pt 인데, RN iOS 는 lineHeight 의 여분
 * (22−19.1≈2.9pt)을 **전부 글리프 위에** 얹어 텍스트가 줄상자 중심보다
 * ≈1.5pt 낮게 앉는다. 아이콘은 상자 정중앙이라 그만큼 높아 보였다
 * ("식사 아이콘이 텍스트랑 상하 정렬이 안 맞는다", 2026-08-03).
 * 라벨 lineHeight 를 빼는 대신 아이콘을 내리는 이유: 텍스트 쪽을 만지면
 * 행 높이가 22→19 로 줄어 타일 안 세로 리듬이 전부 다시 흔들린다.
 */
const LABEL_BASELINE_COMPENSATION = 1.5

export function TileIcon({ name }: { name: TileIconName }) {
  return (
    <Image
      source={SOURCES[name]}
      style={{
        width: 20,
        height: 20,
        transform: [{ translateY: LABEL_BASELINE_COMPENSATION }],
      }}
      contentFit="contain"
    />
  )
}
