import { useClerk } from '@clerk/expo'
import Constants from 'expo-constants'
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PRIVACY_URL = 'https://stellaeum.com/privacy'

/**
 * /you/settings — P.10 close. Replaces the P.5 stub. D5 amended
 * (2026-07-21): Clerk RN <UserProfile> is a native TurboModule, unloadable
 * in the current Expo Go runtime and unstyleable even under Dev Client —
 * ruled out. This ships the custom app-specific section only; profile-
 * field editing (name/email/password) is deferred to REVISIT-53.
 *
 * P.10-a (this commit): sign-out (relocated from you.tsx, now confirmed
 * via Alert.alert — it previously had none) + legal link + app version.
 * P.10-b adds the destructive-actions section (export/delete) on top.
 */
export default function SettingsScreen() {
  const { signOut } = useClerk()

  const handleSignOut = () => {
    Alert.alert(
      'Излизане от профила',
      'Наистина ли искаш да излезеш от профила си?',
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Излез',
          style: 'destructive',
          onPress: () => {
            void signOut().catch((err) => {
              if (__DEV__) console.warn('[SettingsScreen] signOut failed:', err)
            })
          },
        },
      ],
    )
  }

  const appVersion = Constants.expoConfig?.version ?? '—'

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
      >
        <View>
          <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Правно
          </Text>
          <Pressable
            onPress={() => Linking.openURL(PRIVACY_URL)}
            className="flex-row items-center justify-between border-b border-slate-800/60 py-4"
          >
            <Text className="text-[14px] text-slate-200">Политика за поверителност</Text>
            <Text className="text-[14px] text-slate-500">›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Излез"
          className="mt-16 self-center rounded-2xl border border-slate-700/60 px-8 py-3"
        >
          <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-200">
            Излез
          </Text>
        </Pressable>

        <Text className="mt-8 text-center font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-600">
          Stellaeum · v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
