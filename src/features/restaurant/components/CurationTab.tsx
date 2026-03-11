import { ScrollView } from "react-native"
import { YStack } from "tamagui"
import { LocationBar } from "./LocationBar"
import { AiSummaryCard } from "./AiSummaryCard"
import { CurationSection } from "./CurationSection"
import { MOCK_CURATION_SECTIONS } from "../data/curationData"

export function CurationTab() {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <YStack>
        <LocationBar />
        <YStack marginTop={8}>
          <AiSummaryCard />
        </YStack>
        {MOCK_CURATION_SECTIONS.map((section) => (
          <YStack key={section.id} marginTop={24}>
            <CurationSection section={section} />
          </YStack>
        ))}
        <YStack height={40} />
      </YStack>
    </ScrollView>
  )
}
