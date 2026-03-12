# 장소 시트 (PlaceSheet) 디자인 스펙

## 개요

식당 탭의 "장소" 탭에서 카카오맵 위에 올라오는 드래그 가능한 바텀 시트. 식당 목록을 필터링하고 탐색할 수 있다.

## 라이브러리

- `@gorhom/bottom-sheet` (신규 설치)
- 기존 `react-native-reanimated` (~4.1.1), `react-native-gesture-handler` (~2.28.0) 위에서 동작

## 시트 동작

| 항목 | 값 |
|------|-----|
| Snap Points | `['40%', '100%']` |
| 초기 상태 | 40% (index 0) |
| 드래그 핸들 | 시트 높이 조절 |
| 필터 칩 영역 | 시트 높이 조절 (칩 탭은 가능, 드래그는 시트에 전달) |
| 식당 목록 (BottomSheetScrollView) | 독립 스크롤 — 시트 높이에 영향 없음 |

**구현 방식**: `@gorhom/bottom-sheet`의 `BottomSheetScrollView`를 사용하면 스크롤과 시트 드래그가 자동으로 분리된다. 필터 칩 영역은 `BottomSheetScrollView` 바깥(header 영역)에 배치하여 드래그 시 시트 높이를 조절하도록 한다.

## 컴포넌트 구조

```
app/(tabs)/restaurant.tsx
└─ activeTab === "place"
    ├─ RestaurantSearchInput (기존)
    ├─ KakaoMapWebView (기존, flex:1)
    └─ PlaceSheet (NEW — 지도 위에 절대 위치 오버레이)
        ├─ BottomSheet (@gorhom)
        │   ├─ Handle (드래그 핸들 바)
        │   ├─ PlaceFilterChips (NEW — header 영역, 드래그 전달)
        │   │   ├─ 지역 ▾
        │   │   ├─ 음식 종류 ▾
        │   │   └─ 영양소 제한 ▾
        │   └─ BottomSheetScrollView
        │       └─ PlaceCard (NEW) × N
        │           ├─ 식당 이름 + 태그
        │           ├─ 설명
        │           ├─ ★ 별점 · 리뷰 수
        │           ├─ 거리 · 주소
        │           └─ 가로 이미지 갤러리 (ScrollView horizontal)
```

## 신규 파일

### 1. `src/features/restaurant/components/PlaceSheet.tsx`

바텀시트 컨테이너. `@gorhom/bottom-sheet`의 `BottomSheet` 사용.

- snap points: `['40%', '100%']`
- `handleComponent`: 커스텀 핸들 (회색 바)
- 필터 칩을 header로 배치 (BottomSheetScrollView 밖)
- 내부에 `BottomSheetScrollView` + `PlaceCard` 목록
- 라이트/다크 모드 대응: 배경 라이트 `#FCFCFC` / 다크 `#1F1F21`
- `borderTopLeftRadius: 16`, `borderTopRightRadius: 16`

### 2. `src/features/restaurant/components/PlaceFilterChips.tsx`

필터 칩 행 (UI만, 동작 없음).

**스타일:**
- 보더 색상: 라이트 `#D9D9DF` / 다크 `#36363E`
- 텍스트: fontWeight 500, fontSize 14, lineHeight 20
- 텍스트 색상: 라이트 `#474758` / 다크 `#ABABB4`
- 칩 간격: `gap: 8`
- 영역 패딩: `paddingHorizontal: 16`, `paddingVertical: 12`
- 칩 패딩: `paddingHorizontal: 12`, `paddingVertical: 6`
- 칩 borderRadius: 16
- 배경: 투명

### 3. `src/features/restaurant/components/PlaceCard.tsx`

식당 카드 컴포넌트.

**표시 정보 (이미지 디자인 기반):**
- 식당 이름 (bold) + 태그 (한식, 저당, 저염 — 이름 옆에 나열)
- 설명 텍스트 (영업중 · 저염식 한식으로 든든한 한 끼를)
- 별점 + 리뷰 수 (★ 4.4 · 리뷰 123)
- 거리 + 주소 (2.6km · 서울 종로구 명륜4가 ▾)
- 가로 이미지 갤러리: `ScrollView horizontal`로 여러 이미지 스크롤 가능
  - 이미지 크기: 약 120×90, borderRadius: 8
  - 이미지 간격: gap 8

**카드 간 구분**: 하단 border (라이트 `#F0F0F0` / 다크 `#2A2A2E`)

## 수정 파일

### `src/features/restaurant/types/index.ts`

```typescript
// 기존 Restaurant, CurationSectionData 유지

export interface PlaceRestaurant {
  id: string
  name: string
  tags: string[]
  description: string
  rating: number
  reviewCount: number
  distance: string
  address: string
  images: (string | number)[]
}
```

### `src/features/restaurant/data/curationData.ts`

Mock 장소 목록 데이터 추가:

```typescript
export const MOCK_PLACE_RESTAURANTS: PlaceRestaurant[] = [
  {
    id: "p1",
    name: "신신식당",
    tags: ["한식", "저당", "저염"],
    description: "영업중 · 저염식 한식으로 든든한 한 끼를",
    rating: 4.4,
    reviewCount: 123,
    distance: "2.6km",
    address: "서울 종로구 명륜4가",
    images: [PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE],
  },
  // ... 5~6개 추가
]
```

### `app/(tabs)/restaurant.tsx`

장소 탭 내부를 `View`로 감싸고, `KakaoMapWebView` 위에 `PlaceSheet`를 절대 위치로 오버레이:

```tsx
{activeTab === "place" && (
  <View flex={1}>
    <YStack paddingHorizontal={16}>
      <RestaurantSearchInput value={search} onChangeText={setSearch} />
    </YStack>
    <View flex={1} marginTop={12}>
      <KakaoMapWebView />
      <PlaceSheet />
    </View>
  </View>
)}
```

## 다크 모드 대응

모든 컴포넌트에서 `useColorScheme()`으로 라이트/다크 분기:

| 요소 | 라이트 | 다크 |
|------|--------|------|
| 시트 배경 | `#FCFCFC` | `#1F1F21` |
| 필터 칩 보더 | `#D9D9DF` | `#36363E` |
| 필터 칩 텍스트 | `#474758` | `#ABABB4` |
| 카드 구분선 | `#F0F0F0` | `#2A2A2E` |
| 드래그 핸들 | `#C4C4C4` | `#555555` |

## 의존성 설치

```bash
npx expo install @gorhom/bottom-sheet
```
