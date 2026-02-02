import { TamaguiProvider } from '@tamagui/core'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import config from '../tamagui.config'

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
  })

  if (!loaded) return null

  return (
    <TamaguiProvider config={config}>
      <Stack />
    </TamaguiProvider>
  )
}
