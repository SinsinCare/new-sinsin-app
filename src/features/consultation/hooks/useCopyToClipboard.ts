import { useEffect, useState } from "react"
import * as Clipboard from "expo-clipboard"

export function useCopyToClipboard() {
  const [showToast, setShowToast] = useState(false)

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content)
    setShowToast(true)
  }

  useEffect(() => {
    if (showToast) {
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    }
  }, [showToast])

  return { handleCopy, showToast }
}
