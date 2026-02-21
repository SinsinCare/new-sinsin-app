import { Redirect } from "expo-router"

export default function ConsultScreen() {
  return <Redirect href="/chat?fromTab=true" />
}
