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

## 마이그레이션

기존 `@expo/vector-icons` (Ionicons 등) 아이콘은 그대로 유지하면서 점진적으로 전환합니다:

- 새로 추가하는 아이콘 → 이 시스템 사용
- 기존 화면 수정 시 → 해당 화면의 아이콘을 전환
- 모든 전환 완료 시 → `@expo/vector-icons` 의존성 제거
