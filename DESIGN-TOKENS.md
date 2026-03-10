# 디자인 토큰 & 타이포그래피 사용 가이드

## 개요

이 프로젝트는 Tamagui의 `createTokens`, `createFont`를 사용해 Figma 디자인 시스템과 1:1 매핑된 토큰을 관리합니다.

| 파일 | 역할 |
|------|------|
| `src/theme/tokens.ts` | 색상, 간격, 크기, 반경, zIndex 토큰 |
| `src/theme/fonts.ts` | Pretendard KR 폰트 설정 + 타이포그래피 스케일 |
| `src/theme/themes.ts` | Light/Dark 테마 (색상 매핑) |
| `tamagui.config.ts` | 위 모듈들을 조합하는 진입점 |

---

## 색상 사용법

### 테마 색상 (동적 - light/dark 전환)

컴포넌트에서 `$` 접두사로 테마 색상을 참조합니다:

```tsx
<Text color="$color">기본 텍스트</Text>
<Text color="$colorSubtle">보조 텍스트</Text>
<YStack backgroundColor="$background">배경</YStack>
<YStack backgroundColor="$primary">주요 색상</YStack>
<YStack backgroundColor="$danger">위험 색상</YStack>
```

### 주요 테마 키

| 키                  | Light 값             | 용도                 |
| ------------------- | -------------------- | -------------------- |
| `$background`       | #FFFFFF              | 앱 배경              |
| `$color`            | #0D0D0D              | 기본 텍스트          |
| `$colorSubtle`      | #757575 (Grey 05)    | 보조 텍스트, 힌트    |
| `$primary`          | #EE6145 (Primary 07) | 주요 액션, 강조      |
| `$primaryLight`     | #FFF5ED (Primary 01) | 주요 색상 연한 배경  |
| `$secondary`        | #1D9A7A (Sub 07)     | 보조 액션, 건강 관련 |
| `$secondaryLight`   | #E0FFF7 (Sub 01)     | 보조 색상 연한 배경  |
| `$danger`           | #F82F08 (Primary 09) | 에러, 위험           |
| `$dangerBackground` | #FFF5ED (Primary 01) | 에러 메시지 배경     |
| `$success`          | #1D9A7A (Sub 07)     | 성공 상태            |
| `$warning`          | #E77661 (Primary 06) | 경고 상태            |
| `$cardBackground`   | #FFFFFF              | 카드 배경            |
| `$borderColor`      | #EDEDED (Grey 08)    | 기본 테두리          |

### 고정 색상 (토큰 - 테마 무관)

Tamagui 외부 컴포넌트(Ionicons 등)에서 색상이 필요할 때:

```tsx
import { tokens } from "../theme/tokens"

// .val로 실제 문자열 값 접근
const iconColor = tokens.color.grey5.val // '#757575'
```

### 색상 스케일 참고

**Primary (coral/red) - 숫자가 클수록 진함:**

| 단계     | Hex     | 용도 예시                   |
| -------- | ------- | --------------------------- |
| primary1 | #FFF5ED | 연한 배경, dangerBackground |
| primary3 | #F9CFAD | soft 강조                   |
| primary6 | #E77661 | warning                     |
| primary7 | #EE6145 | primary (메인 액션 색상)    |
| primary9 | #F82F08 | danger (에러)               |

**Sub (teal/green) - 숫자가 클수록 진함:**

| 단계 | Hex     | 용도 예시          |
| ---- | ------- | ------------------ |
| sub1 | #E0FFF7 | 연한 배경          |
| sub3 | #A3F0DE | soft 강조          |
| sub7 | #1D9A7A | secondary, success |
| sub9 | #028A67 | 가장 진한 green    |

**Greyscale (어두운 → 밝은):**

| 단계  | Hex     | 용도 예시                |
| ----- | ------- | ------------------------ |
| grey1 | #171717 | 가장 어두운 (dark 배경)  |
| grey2 | #252525 | dark 카드 배경           |
| grey5 | #757575 | colorSubtle, 보조 텍스트 |
| grey7 | #B3B3B3 | 비활성 상태              |
| grey8 | #EDEDED | 밝은 테두리, light hover |

---

## 타이포그래피 사용법

### 폰트 패밀리

```tsx
<Text fontFamily="$body">본문 텍스트 (Pretendard Regular)</Text>
<Text fontFamily="$heading">헤딩 텍스트 (Pretendard SemiBold)</Text>
```

### 타이포그래피 스케일

| 디자인 타입 | fontSize     | lineHeight | fontWeight | 용도        |
| ----------- | ------------ | ---------- | ---------- | ----------- |
| Heading 1   | `$10` (28px) | 40         | 600        | 페이지 제목 |
| Heading 2   | `$9` (26px)  | 36         | 600        | 섹션 제목   |
| Title 1     | `$8` (22px)  | 34         | 600        | 큰 타이틀   |
| Title 2     | `$7` (20px)  | 32         | 600        | 중간 타이틀 |
| Title 3     | `$6` (18px)  | 30         | 600        | 작은 타이틀 |
| Body 1      | `$5` (16px)  | 26         | 500        | 기본 본문   |
| Body 2      | `$4` (14px)  | 24         | 500        | 보조 본문   |
| Body 3      | `$3` (12px)  | 22         | 600        | 캡션, 라벨  |

### 사용 예시

```tsx
// Heading 1 - 페이지 제목
<Text fontFamily="$heading" fontSize="$10" lineHeight={40}>
  식단 분석
</Text>

// Title 1 - 섹션 제목
<Text fontFamily="$heading" fontSize="$8" lineHeight={34}>
  오늘의 영양 정보
</Text>

// Body 1 - 기본 본문
<Text fontFamily="$body" fontSize="$5" lineHeight={26} fontWeight="500">
  나트륨 섭취량이 권장량의 80%입니다.
</Text>

// Body 3 - 캡션/라벨
<Text fontFamily="$body" fontSize="$3" lineHeight={22} fontWeight="600">
  2024.01.15
</Text>
```

---

## 간격 (Space) 사용법

`padding`, `margin`, `gap` 등에 사용:

```tsx
<YStack padding="$4" gap="$3">
  {" "}
  {/* padding: 16, gap: 12 */}
  <Text>항목 1</Text>
  <Text>항목 2</Text>
</YStack>
```

| 토큰 | 값   | 용도                       |
| ---- | ---- | -------------------------- |
| `$1` | 4px  | 최소 간격                  |
| `$2` | 8px  | 아이콘-텍스트 간격         |
| `$3` | 12px | 요소 내부 간격             |
| `$4` | 16px | 기본 패딩 (가장 많이 사용) |
| `$5` | 20px | 섹션 간격                  |
| `$6` | 24px | 큰 섹션 간격               |
| `$8` | 32px | 페이지 패딩                |

---

## Border Radius 사용법

```tsx
<YStack borderRadius="$4">  {/* 8px - 기본 */}
<YStack borderRadius="$6">  {/* 12px - 카드 */}
<YStack borderRadius="$12"> {/* 999px - pill 모양 */}
```

---

## styled() 컴포넌트에서 사용

```tsx
import { styled, YStack, Text } from "tamagui"

const Card = styled(YStack, {
  backgroundColor: "$cardBackground",
  borderRadius: "$4",
  padding: "$4",
  borderWidth: 1,
  borderColor: "$borderColor",
})

const Title = styled(Text, {
  fontFamily: "$heading",
  fontSize: "$8", // Title 1: 22px
  lineHeight: 34,
  fontWeight: "600",
  color: "$color",
})
```

---

## 주의사항

1. **Android 폰트:** `face` 속성이 `src/theme/fonts.ts`에 정의되어 있어야 Android에서 fontWeight가 작동합니다. 새 weight를 추가하면 `face`에도 반드시 매핑하세요.

2. **Tamagui 외부 컴포넌트:** `Ionicons`, `react-native`의 기본 컴포넌트 등은 `$token` 문법을 인식하지 못합니다. `tokens.color.xxx.val`을 import해서 사용하세요.

3. **새 색상 추가 시:** `src/theme/tokens.ts`의 `color`에 추가 → 테마에서 사용할 경우 `src/theme/themes.ts`의 light/dark 모두에 동일한 키로 추가.

4. **테마 키 규칙:** light와 dark 테마는 반드시 **같은 키**를 가져야 합니다. 한쪽에만 키를 추가하면 TypeScript 에러가 발생합니다.
