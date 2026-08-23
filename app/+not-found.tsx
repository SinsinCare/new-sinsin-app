/**
 * 어떤 라우트에도 맞지 않는 URL 이 도달한 화면.
 *
 * ## 왜 직접 만드는가
 *
 * 이 파일이 없으면 expo-router 가 기본 `Unmatched` 화면을 끼워 넣는다. 그 화면은
 *  - 영어다("Unmatched Route / Page could not be found."),
 *  - 유일한 링크가 `<Link href={pathname} replace>` — **자기 자신을 가리킨다.**
 *
 * 즉 눌러도 그 자리고, 그 URL 이 시작 URL 로 남아 있으면 앱을 리로드해도 같은 화면이
 * 다시 뜬다. 사용자가 보고한 "리로드해도 이상한 화면에 고정된다" 가 이것이다.
 *
 * `app/+native-intent.tsx` 가 앞단에서 대부분을 걸러 내므로 여기까지 오는 것은
 *  - 앱 안에서 만들어진 잘못된 `href`(문자열 조합 실수, 없어진 화면으로 가는 링크),
 *  - `+native-intent` 가 통과시킨 뒤 라우터가 못 맞춘 경우
 * 뿐이다. 둘 다 **버그**이므로 조용히 홈으로 보내지 않는다 — 화면을 보여 주고,
 * 나가는 길을 준다. dev 에서는 어떤 경로였는지도 같이 보여 준다.
 */
import { useEffect } from "react"
import { Stack, usePathname } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2EmptyState,
  V2Screen,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useAuth } from "@/src/hooks"
import { logger } from "@/src/lib/logger"
import { resolveEntryRoute, useAppRouter } from "@/src/shared/navigation"

export default function NotFoundScreen() {
  const { t } = useTranslation("common")
  const router = useAppRouter()
  const pathname = usePathname()
  const { colors } = useV2Theme()
  const { isAuthenticated, accountState, requiresAdditionalInfo, entryGate } =
    useAuth()

  /* 경로 하나당 한 번. 이 화면에 도달했다는 것은 위 머리말대로 **둘 다 버그**이므로
     경로마다 세는 것이 맞다 — 경로는 남기지 않는다(dev 화면에만 그린다). */
  useEffect(() => {
    logger.debug("[router] unmatched route", pathname)
    trackAnalyticsEvent("app_dead_route_viewed", {})
  }, [pathname])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <V2Screen>
        <View style={styles.body}>
          <V2EmptyState
            surface="not_found"
            icon="caution"
            title={t("notFound.title")}
            description={t("notFound.description")}
            actionLabel={t("notFound.action")}
            /* `push` 가 아니라 `replace` 다 — 이 화면을 스택에 남겨 두면 홈에서
               뒤로가기를 눌렀을 때 다시 여기로 돌아온다.

               목적지를 `"/"` 로 쓰지 않는 이유: `app/index.tsx`(진입 리다이렉트)와
               `app/(settings)/index.tsx`(설정)의 URL 이 둘 다 `/` 라 어느 화면이
               열릴지 라우터의 해석 순서에 달린다(`tests/recipeRouteCollision.test.ts`).
               진입 판정을 여기서 한 번 더 하는 편이 확실하다 — 인증 게이트가
               `app/index.tsx` 와 어긋나지 않도록 같은 함수를 쓴다. */
            onAction={() =>
              router.replace(
                resolveEntryRoute({
                  isAuthenticated,
                  accountState,
                  requiresAdditionalInfo,
                  entryGate,
                }),
              )
            }
          />
          {__DEV__ ? (
            <Text style={[styles.path, { color: colors.label.assistive }]}>
              {pathname}
            </Text>
          ) : null}
        </View>
      </V2Screen>
    </>
  )
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
  },
  path: {
    ...typography.body.xSmall,
    marginTop: spacing[16],
    textAlign: "center",
  },
})
