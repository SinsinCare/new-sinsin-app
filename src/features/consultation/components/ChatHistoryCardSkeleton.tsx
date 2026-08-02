/**
 * 상담 기록 카드의 로딩 자리표시.
 *
 * 예전에는 이 파일이 자체 reanimated 펄스를 돌리고 회색 값(`#E8E8ED`/`#3E3E44`)을
 * 박아 썼다. 지금은 `V2Skeleton` 이 앱 전체의 시머를 하나의 드라이버로 몰기 때문에
 * 리듬도 색도 여기서 정하지 않는다 — 정하면 같은 앱 안에서 로딩이 두 가지로 숨 쉰다.
 */

import { View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { V2Skeleton, V2SkeletonGroup } from "@/src/design-system-v2"

export function ChatHistoryCardSkeleton() {
  const colorScheme = useAppColorScheme()
  const isDarkMode = colorScheme === "dark"

  return (
    <View
      style={{
        backgroundColor: isDarkMode
          ? tokens.color.inputBgDark.val
          : tokens.color.offWhite.val,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 14,
      }}
    >
      <V2SkeletonGroup style={{ gap: 8 }}>
        {/* 제목 */}
        <V2Skeleton width="60%" height={20} />

        {/* 내용 두 줄 */}
        <View style={{ gap: 6 }}>
          <V2Skeleton height={14} />
          <V2Skeleton width="75%" height={14} />
        </View>

        {/* 시각 */}
        <V2Skeleton width="30%" height={13} />
      </V2SkeletonGroup>
    </View>
  )
}
