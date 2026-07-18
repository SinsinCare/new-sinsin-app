import { Mixpanel } from "mixpanel-react-native"
import { appConfig } from "@/src/config/appConfig"
import { logger } from "@/src/lib/logger"
import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "./events"

let client: Mixpanel | null = null
let initialization: Promise<Mixpanel | null> | null = null
let identityState: string | null | undefined
let operationQueue: Promise<void> = Promise.resolve()

function enqueue(operation: () => Promise<void> | void): void {
  operationQueue = operationQueue
    .then(operation)
    .catch((error) => logger.debug("[analytics] operation failed", error))
}

function getClient(): Promise<Mixpanel | null> {
  if (!appConfig.mixpanelToken) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (initialization) return initialization

  initialization = (async () => {
    try {
      const instance = new Mixpanel(appConfig.mixpanelToken, false, false)
      await instance.init(
        false,
        { app_environment: appConfig.appEnvironment },
        appConfig.mixpanelServerUrl || undefined,
      )
      instance.setUseIpAddressForGeolocation(false)
      client = instance
      return instance
    } catch (error) {
      logger.debug("[analytics] Mixpanel initialization failed", error)
      initialization = null
      return null
    }
  })()

  return initialization
}

export function trackAnalyticsEvent<Event extends AnalyticsEventName>(
  event: Event,
  properties: AnalyticsEventProperties[Event],
): void {
  enqueue(async () => {
    const instance = await getClient()
    if (!instance) return
    instance.track(
      event,
      sanitizeAnalyticsProperties(properties as Record<string, unknown>),
    )
  })
}

export function identifyAnalyticsUser(userId: string): void {
  if (!userId || identityState === userId) return
  identityState = userId
  enqueue(async () => {
    const instance = await getClient()
    if (!instance) return
    await instance.identify(userId)
  })
}

export function resetAnalyticsIdentity(): void {
  if (identityState === null) return
  identityState = null
  enqueue(async () => {
    const instance = await getClient()
    instance?.reset()
  })
}

export function flushAnalytics(): void {
  enqueue(async () => {
    const instance = await getClient()
    instance?.flush()
  })
}
