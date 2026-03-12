# 장소 필터 모달 (PlaceFilterModal) 디자인 스펙

## 개요

PlaceSheet의 필터 칩을 탭하면 전체 화면 모달이 열린다. 모달 내에서 지역, 음식 종류, 영양소 제한 3개 섹션을 탭으로 전환하며 필터를 선택할 수 있다. "필터 적용하기" 버튼을 누르면 선택된 필터 상태가 콜백으로 전달된다.

## 필터 상태 타입

```typescript
interface FilterState {
  region: string | null       // 광역시/도 (null = 전체)
  subRegions: string[]        // 선택된 하위 지역
  foodTypes: string[]         // 선택된 음식 종류
  nutrients: string[]         // 선택된 영양소 제한
}
```

## 컴포넌트 구조

```
PlaceSheet (기존 — FilterState 상태 관리)
├─ PlaceFilterChips (기존 수정 — onPress로 모달 열기, activeFilterKey 전달)
└─ PlaceFilterModal (NEW — React Native Modal)
    ├─ FilterTabBar (NEW — 탭 바 + X 닫기)
    ├─ ScrollView (ref로 섹션 스크롤)
    │   ├─ RegionFilterSection (NEW)
    │   │   ├─ 섹션 헤더 (지역 + 초기화)
    │   │   ├─ 광역시/도 그리드
    │   │   └─ 하위 지역 칩 (광역시 선택 시)
    │   ├─ 섹션 구분선
    │   ├─ FoodTypeFilterSection (NEW)
    │   │   └─ SVG 아이콘 카드 그리드 (3열)
    │   ├─ 섹션 구분선
    │   └─ NutrientFilterSection (NEW)
    │       ├─ 섹션 헤더 (영양소 제한 + 초기화)
    │       └─ 토글 칩 행
    └─ ApplyButton (sticky 하단 — "필터 적용하기")
```

## 신규 파일

### 1. `src/features/restaurant/data/filterData.ts`

필터 옵션 데이터.

```typescript
export const REGIONS = [
  { key: "all", label: "전체" },
  { key: "seoul", label: "서울" },
  { key: "gyeonggi", label: "경기" },
  { key: "incheon", label: "인천" },
  { key: "busan", label: "부산" },
  { key: "jeju", label: "제주" },
  { key: "ulsan", label: "울산" },
  { key: "gyeongnam", label: "경남" },
  { key: "daegu", label: "대구" },
  { key: "gyeongbuk", label: "경북" },
  { key: "gangwon", label: "강원" },
  { key: "daejeon", label: "대전" },
  { key: "chungnam", label: "충남" },
  { key: "chungbuk", label: "충북" },
  { key: "sejong", label: "세종" },
  { key: "jeonnam", label: "전남" },
  { key: "gwangju", label: "광주" },
  { key: "jeonbuk", label: "전북" },
]

// 서울만 하위 지역 제공 (향후 다른 지역 확장 가능)
export const SUB_REGIONS: Record<string, { key: string; label: string }[]> = {
  seoul: [
    { key: "seoul-all", label: "서울 전체" },
    { key: "gangnam", label: "강남" },
    { key: "seocho", label: "서초" },
    { key: "jamsil", label: "잠실/송파/강동" },
    { key: "yeongdeungpo", label: "영등포/여의도/강서" },
    { key: "kondae", label: "건대/성수/왕십리" },
    { key: "jongno", label: "종로/중구" },
    { key: "hongdae", label: "홍대/합정/마포" },
    { key: "yongsan", label: "용산/이태원/한남" },
    { key: "seongbuk", label: "성북/노원/중랑" },
    { key: "guro", label: "구로/관악/동작" },
  ],
}

export const FOOD_TYPES = [
  { key: "korean", label: "한식", icon: "korean" },
  { key: "chinese", label: "중식", icon: "chinese" },
  { key: "japanese", label: "일식", icon: "japanese" },
  { key: "american", label: "양식", icon: "american" },
  { key: "world", label: "세계음식", icon: "globe" },
]

export const NUTRIENTS = [
  { key: "low-sugar", label: "저당" },
  { key: "low-protein", label: "저단백" },
  { key: "low-salt", label: "저염" },
  { key: "low-potassium", label: "저칼륨" },
  { key: "low-phosphorus", label: "저인" },
]
```

### 2. `src/features/restaurant/components/PlaceFilterModal.tsx`

전체 화면 Modal 컨테이너. React Native `Modal` 사용.

- `visible`, `onClose`, `initialFilters`, `onApply` props
- 내부에서 로컬 FilterState 관리 (적용 전까지 임시)
- `activeTab` 상태 관리 (region / foodType / nutrient)
- 칩 클릭 시 `activeTab`에 해당 탭 설정 + 해당 섹션으로 스크롤 (`ScrollView ref` + `scrollTo`)
- "필터 적용하기" 클릭 시 `onApply(localFilters)` 호출 후 `onClose()`
- 각 섹션의 `onLayout`으로 Y 좌표 측정, 탭 클릭 시 해당 Y로 `scrollTo`

### 3. `src/features/restaurant/components/FilterTabBar.tsx`

탭 바. 3개 탭 + X 닫기 버튼.

- `activeTab`, `onTabChange`, `onClose` props
- 활성 탭: bold 텍스트 + 하단 언더라인 (2px)
- X 버튼: 우측 정렬

### 4. `src/features/restaurant/components/RegionFilterSection.tsx`

지역 필터 섹션.

- `selectedRegion`, `selectedSubRegions`, `onRegionChange`, `onSubRegionToggle`, `onReset` props
- 광역시/도 그리드: 6열, 선택 시 보더 + 텍스트 `#FF7246`
- "전체" 선택 시: 하위 지역 미표시, `selectedRegion = null`
- 광역시 선택 시: 해당 `SUB_REGIONS` 표시
- 하위 지역 칩: `flexWrap`, 선택 시 배경 변경 + × 표시

### 5. `src/features/restaurant/components/FoodTypeFilterSection.tsx`

음식 종류 필터 섹션.

- `selectedFoodTypes`, `onToggle` props
- 3열 그리드, SVG 아이콘 + 라벨 카드
- 선택 시 보더 `#FF7246` + 텍스트 `#FF7246`
- SVG 아이콘: `@/assets/images/{korean,chinese,japanese,american,globe}.svg`

### 6. `src/features/restaurant/components/NutrientFilterSection.tsx`

영양소 제한 필터 섹션.

- `selectedNutrients`, `onToggle`, `onReset` props
- 가로 칩 행 (`flexWrap`)
- 선택 시: 배경 변경 + × 표시 (세부 지역 칩과 동일 스타일)

## 수정 파일

### `PlaceFilterChips.tsx`

- `onFilterPress(filterKey)` prop 추가
- 칩 `onPress`에서 `onFilterPress(filter.key)` 호출

### `PlaceSheet.tsx`

- `FilterState` 상태 (`useState`) 추가
- `filterModalVisible`, `activeFilterKey` 상태 추가
- `PlaceFilterChips`에 `onFilterPress` 전달 → 모달 열기 + 해당 탭 활성화
- `PlaceFilterModal`에 `visible`, `onClose`, `initialFilters`, `onApply` 전달
- `onApply` 콜백에서 `FilterState` 업데이트 (나중에 필터링 로직 연결용)

## 다크 모드 색상

| 요소 | 라이트 | 다크 |
|------|--------|------|
| 모달 배경 | `#FDFDFD` | `#1F1F21` |
| 탭 활성 텍스트 | `#2A2A37` | `#E7E7EE` |
| 탭 비활성 텍스트 | `#2A2A37` | `#595960` |
| 헤더 borderBottom | `#EAEAF0` | `#313138` |
| 지역 버튼 선택 보더 | `#FF7246` | `#FF7246` |
| 세부 지역 버튼 보더 | `#EAEAF0` | `#313138` |
| 세부 지역 선택 배경 | `#FCEBE1` | `#D56E321A` |
| 세부 지역 텍스트 | `#474758` | `#ABABB4` |
| 음식 카드 기본 보더 | `#EAEAF0` | `#313138` |
| 음식 카드 선택 보더 | `#FF7246` | `#FF7246` |
| 영양소 칩 보더 | `#EAEAF0` | `#313138` |
| 영양소 칩 선택 배경 | `#FCEBE1` | `#D56E321A` |
| 영양소 칩 텍스트 | `#474758` | `#ABABB4` |
| 초기화 버튼 | `#474758` | `#ABABB4` |
| 섹션 구분선 | `#FAFAFA` | `#2A2A30` |
| 적용 버튼 배경 | `#FF7246` | `#FF7246` |
| 적용 버튼 텍스트 | `#FDFDFD` | `#FDFDFD` |

## 탭 → 섹션 스크롤 동작

- 필터 칩 탭 또는 모달 내 탭 클릭 시, 해당 섹션으로 `ScrollView.scrollTo()` 애니메이션
- 각 섹션은 `onLayout`으로 Y 좌표 측정
- 스크롤은 부드럽게 (`animated: true`)
