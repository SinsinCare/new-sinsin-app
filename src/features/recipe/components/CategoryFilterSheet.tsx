// src/features/recipe/components/CategoryFilterSheet.tsx
import { useState, useEffect } from "react"
import { Pressable, useColorScheme } from "react-native"
import { Sheet } from "@tamagui/sheet"
import { YStack, XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { FilterChip } from "./FilterChip"

interface CategoryFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFilters: Record<string, Set<string>>
  onApply: (filters: Record<string, Set<string>>) => void
}

const CATEGORY_SECTIONS = [
  {
    key: "nutrition",
    title: "영양 기준",
    chips: [
      { key: "low-salt", label: "저염" },
      { key: "low-protein", label: "저단백" },
      { key: "low-potassium", label: "저칼륨" },
      { key: "low-phosphorus", label: "저인" },
      { key: "high-calorie", label: "고열량" },
    ],
  },
  {
    key: "stage",
    title: "병기별",
    chips: [
      { key: "ckd3", label: "CKD 3기" },
      { key: "ckd4", label: "CKD 4기" },
      { key: "ckd5", label: "CKD 5기" },
      { key: "diabetes", label: "당뇨동반" },
      { key: "hypertension", label: "고혈압동반" },
    ],
  },
  {
    key: "country",
    title: "나라별",
    chips: [
      { key: "korean", label: "한식" },
      { key: "chinese", label: "중식" },
      { key: "japanese", label: "일식" },
      { key: "western", label: "양식" },
      { key: "salad", label: "샐러드" },
      { key: "dessert", label: "디저트" },
      { key: "beverage", label: "음료" },
    ],
  },
] as const

const CHIP_THEME = {
  nutrition: "primary",
  country: "tertiary",
  stage: "sub",
} as const

const HEADER_COLORS = {
  light: { close: "#3C3C43", title: "#3C3C43", apply: "#EE6145" },
  dark: { close: "#E7E7EE", title: "#E7E7EE", apply: "#E77661" },
} as const

const SECTION_TITLE_COLORS = {
  light: "#2A2A37",
  dark: "#E7E7EE",
} as const

const SHEET_BG = {
  light: "#FFFFFF",
  dark: "#2C2C2E",
} as const

function cloneFilters(
  filters: Record<string, Set<string>>,
): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {}
  for (const key of Object.keys(filters)) {
    result[key] = new Set(filters[key])
  }
  return result
}

export function CategoryFilterSheet({
  open,
  onOpenChange,
  selectedFilters,
  onApply,
}: CategoryFilterSheetProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = isDark ? HEADER_COLORS.dark : HEADER_COLORS.light
  const sectionTitleColor = isDark
    ? SECTION_TITLE_COLORS.dark
    : SECTION_TITLE_COLORS.light
  const sheetBg = isDark ? SHEET_BG.dark : SHEET_BG.light

  const [tempFilters, setTempFilters] = useState<Record<string, Set<string>>>(
    () => cloneFilters(selectedFilters),
  )

  useEffect(() => {
    if (open) {
      setTempFilters(cloneFilters(selectedFilters))
    }
  }, [open, selectedFilters])

  const toggleChip = (sectionKey: string, chipKey: string) => {
    setTempFilters((prev) => {
      const next = cloneFilters(prev)
      if (!next[sectionKey]) {
        next[sectionKey] = new Set()
      }
      if (next[sectionKey].has(chipKey)) {
        next[sectionKey].delete(chipKey)
      } else {
        next[sectionKey].add(chipKey)
      }
      return next
    })
  }

  const handleApply = () => {
    onApply(tempFilters)
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[38]}
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        backgroundColor={sheetBg}
      >
        <Sheet.Handle
          marginHorizontal={"auto"}
          marginVertical={12}
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "#858591" : "#D9D9DF",
          }}
        />

        {/* Header */}
        <XStack
          paddingHorizontal={20}
          paddingTop={4}
          paddingBottom={16}
          justifyContent="space-between"
          alignItems="center"
        >
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Icon name="x" size={24} color={colors.close} />
          </Pressable>
          <Text
            fontSize={16}
            fontWeight="600"
            fontFamily="$body"
            color={colors.title}
          >
            카테고리
          </Text>
          <Pressable
            onPress={handleApply}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              fontSize={16}
              fontWeight="600"
              fontFamily="$body"
              color={colors.apply}
            >
              등록
            </Text>
          </Pressable>
        </XStack>

        {/* Sections */}
        <YStack paddingHorizontal={20} gap={20}>
          {CATEGORY_SECTIONS.map((section) => (
            <YStack key={section.key} gap={10}>
              <Text
                fontSize={15}
                fontWeight="700"
                fontFamily="$body"
                color={sectionTitleColor}
              >
                {section.title}
              </Text>
              <XStack flexWrap="wrap" gap={8}>
                {section.chips.map((chip) => (
                  <FilterChip
                    key={chip.key}
                    label={chip.label}
                    theme={CHIP_THEME[section.key]}
                    selected={tempFilters[section.key]?.has(chip.key) ?? false}
                    onPress={() => toggleChip(section.key, chip.key)}
                  />
                ))}
              </XStack>
            </YStack>
          ))}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}
