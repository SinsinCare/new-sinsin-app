import { TamaguiProvider } from '@tamagui/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import config from '../tamagui.config'
import { queryClient } from '../src/services/queryClient'

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
  })

  if (!loaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config}>
        <Stack />
      </TamaguiProvider>
    </QueryClientProvider>
  )
}
