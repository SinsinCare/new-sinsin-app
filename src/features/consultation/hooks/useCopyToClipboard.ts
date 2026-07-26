import { useCallback, useEffect, useState } from "react"
import * as Clipboard from "expo-clipboard"

export function useCopyToClipboard() {
  const [showToast, setShowToast] = useState(false)

  // 말풍선에 그대로 넘어가는 prop 입니다. 매 렌더 새 함수면 memo 가 무력화돼
  // 대화 전체의 Markdown 이 다시 파싱됩니다.
  const handleCopy = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content)
    setShowToast(true)
  }, [])

  useEffect(() => {
    if (!showToast) return
    const timer = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(timer)
  }, [showToast])

  return { handleCopy, showToast }
}
