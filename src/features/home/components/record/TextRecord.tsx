import { useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { AppModal } from "@/src/shared/components/AppModal"
import { ModalOverlayHost } from "@/src/shared/components"
import { Text, TextInput } from "@/src/shared/components/AppText"
import { V2Button, V2ScreenHeader } from "@/src/design-system-v2"
import { radius, spacing, typography } from "@/src/design-system-v2/tokens"
import { useSurface } from "@/src/hooks/useSurface"
import {
  useTextRecord,
  type TextRecordOptions,
} from "../../hooks/useTextRecord"

export function TextRecord(props: TextRecordOptions) {
  const { t } = useTranslation()
  const s = useSurface()
  const insets = useSafeAreaInsets()
  const entry = useTextRecord(props)
  const [focused, setFocused] = useState(false)

  return (
    <AppModal
      visible={props.open}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => void entry.close()}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: s.canvas }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            paddingTop: insets.top,
          }}
        >
          <V2ScreenHeader
            title={t("home.textRecord.title")}
            titleAlign="center"
            leading="close"
            safeAreaTop={false}
            onBack={() => void entry.close()}
          />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.intro}>
            <Text
              style={[styles.title, { color: s.textStrong }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("home.textRecord.prompt")}
            </Text>
            <Text
              style={[styles.body, { color: s.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("home.textRecord.hint")}
            </Text>
          </View>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: s.surfaceSunken,
                borderColor: focused ? s.brand : "transparent",
              },
            ]}
          >
            <TextInput
              accessibilityLabel={t("home.textRecord.inputLabel")}
              multiline
              scrollEnabled={false}
              editable={!entry.isSubmitting}
              style={[styles.input, { color: s.textStrong }]}
              value={entry.text}
              onChangeText={entry.setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t("home.textRecord.placeholder")}
              placeholderTextColor={s.placeholder}
              selectionColor={s.brand}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.example}>
            <Text style={[styles.exampleTitle, { color: s.text }]}>
              {t("home.textRecord.exampleTitle")}
            </Text>
            <Text
              style={[styles.exampleBody, { color: s.text }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("home.textRecord.example")}
            </Text>
          </View>
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing[16]),
              backgroundColor: s.canvas,
            },
          ]}
        >
          <V2Button
            size="xl"
            fullWidth
            multilineLabel
            disabled={!entry.canSubmit}
            loading={entry.isSubmitting}
            onPress={() => void entry.submit()}
          >
            {t("home.textRecord.checkNutrients")}
          </V2Button>
        </View>
      </KeyboardAvoidingView>
      <ModalOverlayHost />
    </AppModal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[24],
    paddingBottom: spacing[24],
    gap: spacing[24],
  },
  intro: { gap: spacing[8] },
  title: typography.title.large,
  body: typography.subtext.large,
  inputBox: {
    padding: spacing[16],
    borderRadius: radius["2xl"],
    borderWidth: 1,
  },
  input: { ...typography.body.mediumWeak, minHeight: 168, padding: 0 },
  example: { gap: spacing[8], paddingHorizontal: spacing[4] },
  exampleTitle: typography.subtext.largeStrong,
  exampleBody: typography.subtext.large,
  footer: { paddingHorizontal: spacing[20], paddingTop: spacing[12] },
})
