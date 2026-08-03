# 아이콘 시스템

커스텀 SVG 아이콘 시스템. `react-native-svg-transformer`를 사용하여 `.svg` 파일을 React 컴포넌트로 import하고, `Icon` 래퍼 컴포넌트로 크기와 색상을 통합 관리합니다.

## 사용법

```tsx
import { Icon } from "@/src/shared/components"

// 기본값 (24x24, #A5A5AF)
<Icon name="chevron-right" />

// 크기 변경
<Icon name="chevron-right" size={32} />

// 색상 변경
<Icon name="chevron-right" color="#E77661" />

// 크기 + 색상
<Icon name="chevron-right" size={20} color={tokens.color.primary7.val} />

// 추가 SVG 속성
<Icon name="chevron-right" opacity={0.5} style={{ marginLeft: 8 }} />
```

## Props

| Prop    | 타입       | 기본값      | 설명                        |
| ------- | ---------- | ----------- | --------------------------- |
| `name`  | `IconName` | (필수)      | 등록된 아이콘 이름          |
| `size`  | `number`   | `24`        | 너비/높이 (정사각형)        |
| `color` | `string`   | `"#A5A5AF"` | 아이콘 색상                 |
| `...`   | `SvgProps` | -           | react-native-svg 추가 속성  |

## 새 아이콘 추가

### 1. SVG 파일 추가

`assets/icons/`에 SVG 파일을 추가합니다.

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="..." stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### 2. Icon.tsx에 등록

`src/shared/components/Icon.tsx`에서 import하고 `icons` 맵에 추가합니다.

```tsx
import NewIcon from "@/assets/icons/new-icon.svg"

const icons = {
  // ...기존 아이콘
  "new-icon": NewIcon,
} as const
```

### 3. 사용

```tsx
<Icon name="new-icon" />
```

`IconName` 타입이 자동으로 확장되어 TypeScript 자동완성이 지원됩니다.

## SVG 작성 규칙

| 항목        | 규칙                                  |
| ----------- | ------------------------------------- |
| viewBox     | `0 0 24 24`                           |
| width/height| `24`                                  |
| fill        | `none` (SVG 루트)                     |
| 색상        | `stroke="currentColor"` 또는 `fill="currentColor"` |
| namespace   | `xmlns="http://www.w3.org/2000/svg"`  |

`currentColor`를 사용해야 `Icon` 컴포넌트의 `color` prop으로 런타임 색상 변경이 가능합니다. 하드코딩된 색상(`fill="#A5A5AF"`)은 `color` prop에 반응하지 않습니다.

## 등록된 아이콘

현재 `Icon.tsx`에 등록된 아이콘:

- `chat`
- `chevron-right`
- `history`
- `home`
- `location`
- `menu`
- `notification`
- `plus`
- `recipe`
- `x`

## 입체(3D) 래스터 아이콘 — `pngIcon`

카테고리·홈 기록 아이콘처럼 디자인이 PNG(입체 렌더)로 전달하는 자산은 `Icon`(SVG
시스템)이 아니라 `src/shared/components/pngIcon.tsx` 래퍼로 SVG 자리에 끼운다.

**자산 규칙 — 커밋 전에 투명 여백을 잘라낸다.** SVG viewBox 가 아트를 꽉 감싸는
것과 같은 관행이다. 디자인 툴 export 원본은 캔버스에 25~50% 투명 여백이 있어,
그대로 커밋하면 같은 상자의 SVG 형제보다 그만큼 작게 그려진다(2026-08-03 레시피·
식당 한중일 아이콘이 실제 사례). 아이콘별 광학 보정이 필요하면 투명 픽셀이 아니라
호출부 코드에 명시한다.

현재 적용 자산: `assets/images/cuisine-*.png`(한·중·일 카테고리),
`assets/images/tile-*.png`(홈 오늘 기록 타일 6개 — 3D 전환 범위는 이 타일뿐,
끼니 타임라인은 평면 SVG 세트가 정본).

## 마이그레이션

기존 `@expo/vector-icons` (Ionicons 등) 아이콘은 그대로 유지하면서 점진적으로 전환합니다:

- 새로 추가하는 아이콘 → 이 시스템 사용
- 기존 화면 수정 시 → 해당 화면의 아이콘을 전환
- 모든 전환 완료 시 → `@expo/vector-icons` 의존성 제거
