import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, Linking, Pressable, Switch, Text, View } from 'react-native'

import { pressFeedback } from '@/components/design-system/tokens'
import { useApiClient } from '@/lib/api/client'
import { hapticSelect } from '@/lib/haptics'
import { logError } from '@/lib/monitoring/logError'
import {
  PROMPTED_FLAG_KEY,
  registerPushToken,
  revokePushToken,
  USER_DISABLED_KEY,
} from '@/lib/notifications/maybePromptPushPermission'

/**
 * Settings row for morning-horoscope push notifications (PUSH-ORPHAN,
 * 2026-09-09).
 *
 * Before this, mobile fired its permission prompt exactly once ever —
 * after the first successful Oracle reading, gated by
 * `stellaeum.notifications.prompted.v1` — with no way to change your mind
 * afterwards. This is that missing control.
 *
 * OS permission is the source of truth (read via getPermissionsAsync on
 * focus, so returning from the OS settings app refreshes it), NOT the
 * prompted-flag — that flag only records "we asked", not the current
 * answer. `denied` cannot be re-prompted from JS, so that state deep-links
 * to the OS settings app instead. A `granted` + user-turned-off state has
 * nowhere to live in the OS, so it lives in USER_DISABLED_KEY.
 */

type Perm = 'undetermined' | 'granted' | 'denied' | 'loading'

export function PushNotificationToggle() {
  const { apiFetch } = useApiClient()
  const [perm, setPerm] = useState<Perm>('loading')
  const [userDisabled, setUserDisabled] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [{ status }, disabled] = await Promise.all([
        Notifications.getPermissionsAsync(),
        AsyncStorage.getItem(USER_DISABLED_KEY),
      ])
      setPerm(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined')
      setUserDisabled(disabled === 'true')
    } catch (err) {
      logError('ERR-MOB-PUSH-009', err)
      setPerm('undetermined')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const isOn = perm === 'granted' && !userDisabled

  const enable = async () => {
    setBusy(true)
    try {
      let status = perm
      if (perm === 'undetermined') {
        const res = await Notifications.requestPermissionsAsync()
        await AsyncStorage.setItem(PROMPTED_FLAG_KEY, 'true').catch(() => {})
        status = res.status === 'granted' ? 'granted' : res.status === 'denied' ? 'denied' : 'undetermined'
      }
      if (status !== 'granted') {
        await refresh()
        return
      }
      await registerPushToken(apiFetch)
      setUserDisabled(false)
      setPerm('granted')
    } catch (err) {
      logError('ERR-MOB-PUSH-010', err)
      Alert.alert('Нещо се обърка', 'Не успяхме да включим известията. Опитай отново.')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await revokePushToken(apiFetch)
      setUserDisabled(true)
    } catch (err) {
      logError('ERR-MOB-PUSH-011', err)
      Alert.alert('Нещо се обърка', 'Не успяхме да изключим известията. Опитай отново.')
    } finally {
      setBusy(false)
    }
  }

  const onToggle = (next: boolean) => {
    if (busy) return
    hapticSelect()
    void (next ? enable() : disable())
  }

  const openOsSettings = () => {
    hapticSelect()
    Linking.openSettings().catch(() => {})
  }

  const subtitle =
    perm === 'denied'
      ? 'Изключени са от настройките на устройството. Докосни, за да ги отвориш.'
      : isOn
        ? 'Ще получаваш сутрешния си хороскоп.'
        : 'Получавай сутрешния си хороскоп всяка сутрин.'

  const denied = perm === 'denied'

  const row = (
    <View className="flex-row items-center justify-between py-4">
      <View className="mr-4 flex-1">
        <Text className="text-[14px] text-slate-200">Сутрешен хороскоп</Text>
        <Text className="mt-1 text-[12px] leading-[1.5] text-slate-500">{subtitle}</Text>
      </View>
      {denied ? (
        <Text className="text-[14px] text-slate-500">›</Text>
      ) : (
        <Switch
          value={isOn}
          onValueChange={onToggle}
          disabled={busy || perm === 'loading'}
          trackColor={{ false: '#1e293b', true: '#b8763e' }}
          thumbColor="#e2e8f0"
          ios_backgroundColor="#1e293b"
        />
      )}
    </View>
  )

  return (
    <View className="mb-10">
      <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
        Известия
      </Text>
      {denied ? (
        <Pressable onPress={openOsSettings} style={({ pressed }) => pressFeedback(pressed)}>
          {row}
        </Pressable>
      ) : (
        row
      )}
    </View>
  )
}
