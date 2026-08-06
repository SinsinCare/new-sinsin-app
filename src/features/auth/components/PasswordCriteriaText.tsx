import { StyleSheet, Text } from "react-native"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_TYPE } from "../data/authSurface"
import {
  getPasswordCriteriaText,
  getPasswordCriteriaState,
} from "../data/passwordValidation"

interface PasswordCriteriaTextProps {
  password: string
}

/**
 * 비밀번호 형식 안내 한 줄. 틀렸을 때만 목소리를 낸다(브랜드색) —
 * 조건을 채우면 다시 조용한 회색으로 돌아간다.
 */
export function PasswordCriteriaText({ password }: PasswordCriteriaTextProps) {
  const surface = useAuthSurface()
  const state = getPasswordCriteriaState(password)
  const color = state === "invalid" ? surface.brand : surface.textWeak

  return (
    <Text style={[styles.text, { color }]} lineBreakStrategyIOS="hangul-word">
      {getPasswordCriteriaText()}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: AUTH_TYPE.helper,
})
