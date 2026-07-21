import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Alert } from 'react-native'

import { logError } from '@/lib/monitoring/logError'

/**
 * Push permission prompt scaffold (SR 8.3).
 *
 * Closes the §13.5 "push notification permission flow scaffold" line of
 * the Phase A definition-of-done. No notifications are actually sent
 * yet — this just plumbs permission + token retrieval so Phase B's push
 * delivery work can wire the backend.
 *
 * Trigger contract per founder D6 ratification: fires only after the
 * first-ever-successful Oracle reading completes (not Oracle-tap, not
 * cache-hit re-renders). The detection mechanism is the
 * `onFreshGeneration` callback option on useOracleReading — its
 * generateMutation.onSuccess fires only when /api/oracle/generate
 * returns a fresh body (selectTopic short-circuits to a saved-reading
 * cache-hit before the mutation can run). This call site receives
 * exactly the "fresh successful generation" signal we want.
 *
 * Idempotency: AsyncStorage flag `stellaeum.notifications.prompted.v1`
 * ensures the prompt fires at most once across the app's lifetime per
 * device. The flag is set on every terminal outcome (decline, deny,
 * grant) per D6 — "set regardless of grant/deny outcome (never
 * re-prompt within app)." (REVISIT-50: renamed from the @-prefixed
 * `@stellaeum/notif_prompted`; migrateKey() below carries forward any
 * existing device state on first read.)
 *
 * Token registration: on iOS/Android system grant, retrieve Expo push
 * token via getExpoPushTokenAsync, stash in AsyncStorage as
 * `stellaeum.notifications.push_token.v1`, log via Sentry breadcrumb.
 * Backend integration deferred to Phase B push-delivery work —
 * REVISIT-26 tracks the push_tokens table + RLS + registration endpoint
 * design.
 *
 * Expo Go caveat: getExpoPushTokenAsync rejects on Expo Go SDK 49+ —
 * the call needs a Dev Client / standalone build. Permission prompt
 * itself works in Expo Go (system API is standard). Token-registration
 * failure logs through logError (caught, not rethrown) and the flag
 * still gets set, so re-running the trigger after Dev Client lands
 * (REVISIT-1 unblocks this) won't auto-retry the token fetch — the
 * founder will need a manual reset of stellaeum.notifications.prompted.v1
 * to verify token retrieval. Document this in SR 8 close.
 *
 * Feature-flag gate: respects EXPO_PUBLIC_FF_PUSH per useFeatureFlag
 * scope (D4). Off → entire flow no-ops.
 */

const PROMPTED_FLAG_KEY = 'stellaeum.notifications.prompted.v1'
const PUSH_TOKEN_KEY = 'stellaeum.notifications.push_token.v1'
// REVISIT-50 harmonization — old @-prefixed keys, migrated on first read below.
const OLD_PROMPTED_FLAG_KEY = '@stellaeum/notif_prompted'
const OLD_PUSH_TOKEN_KEY = '@stellaeum/push_token'

/** One-shot migration: copy an old-convention key to its new name, then drop the old one. */
async function migrateKey(oldKey: string, newKey: string): Promise<void> {
  try {
    const [oldValue, newValue] = await Promise.all([
      AsyncStorage.getItem(oldKey),
      AsyncStorage.getItem(newKey),
    ])
    if (oldValue === null) return
    if (newValue === null) await AsyncStorage.setItem(newKey, oldValue)
    await AsyncStorage.removeItem(oldKey)
  } catch {
    // best-effort — a missed migration just means one extra re-prompt/refetch
  }
}

// Bulgarian rationale strings — bulgarian-skill calibrated, founder
// native-speaker reviewed. The «Да, разказвай ми» accept label echoes
// the body's «кажат» so tapping accept reads as opting into the same
// "stars speaking" frame the user just experienced in the Oracle
// reading they finished a moment ago.
const RATIONALE_TITLE = 'Известия'
const RATIONALE_BODY =
  'Stellaeum ще ти изпраща тих сигнал, когато звездите имат какво да ти кажат — сутрешния хороскоп и важните лунни моменти.'
const ACCEPT_LABEL = 'Да, разказвай ми'
const DECLINE_LABEL = 'Не сега'

export async function maybePromptPushPermission(): Promise<void> {
  if (process.env.EXPO_PUBLIC_FF_PUSH === 'false') return

  await migrateKey(OLD_PROMPTED_FLAG_KEY, PROMPTED_FLAG_KEY)
  await migrateKey(OLD_PUSH_TOKEN_KEY, PUSH_TOKEN_KEY)

  let alreadyPrompted: string | null = null
  try {
    alreadyPrompted = await AsyncStorage.getItem(PROMPTED_FLAG_KEY)
  } catch (err) {
    logError('ERR-MOB-PUSH-001', err)
    return
  }
  if (alreadyPrompted === 'true') return

  let permStatus: string
  try {
    permStatus = (await Notifications.getPermissionsAsync()).status
  } catch (err) {
    logError('ERR-MOB-PUSH-002', err)
    return
  }

  if (permStatus !== 'undetermined') {
    // OS already has a decision; record our flag so we don't re-check
    // every fresh generation.
    await safeSetFlag()
    return
  }

  // In-app rationale before triggering the system prompt. iOS doesn't
  // expose an Info.plist rationale string for notifications (unlike
  // camera / location); rationale lives in app code.
  const userAccepted = await new Promise<boolean>((resolve) => {
    Alert.alert(
      RATIONALE_TITLE,
      RATIONALE_BODY,
      [
        { text: DECLINE_LABEL, style: 'cancel', onPress: () => resolve(false) },
        { text: ACCEPT_LABEL, onPress: () => resolve(true) },
      ],
      { cancelable: false },
    )
  })

  if (!userAccepted) {
    await safeSetFlag()
    return
  }

  let granted = false
  try {
    granted = (await Notifications.requestPermissionsAsync()).status === 'granted'
  } catch (err) {
    logError('ERR-MOB-PUSH-003', err)
  }

  await safeSetFlag()

  if (granted) {
    await registerPushToken()
  }
}

async function safeSetFlag(): Promise<void> {
  try {
    await AsyncStorage.setItem(PROMPTED_FLAG_KEY, 'true')
  } catch (err) {
    logError('ERR-MOB-PUSH-004', err)
  }
}

async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) {
    Sentry.addBreadcrumb({
      category: 'push',
      message: 'Skipping push token registration on simulator',
      level: 'info',
    })
    return
  }

  const projectId =
    (Constants?.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants as unknown as { easConfig?: { projectId?: string } })?.easConfig
      ?.projectId

  if (!projectId) {
    Sentry.addBreadcrumb({
      category: 'push',
      message:
        'No EAS projectId; push token unfetchable (REVISIT-1 unblocks Dev Client)',
      level: 'warning',
    })
    return
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
    Sentry.addBreadcrumb({
      category: 'push',
      message:
        'Push token registered (AsyncStorage stash; backend integration is REVISIT-26)',
      level: 'info',
    })
  } catch (err) {
    // Expected to fail in Expo Go SDK 49+ — getExpoPushTokenAsync
    // rejects without a Dev Client build.
    logError('ERR-MOB-PUSH-005', err)
  }
}
