import { useClerk, useUser } from '@clerk/expo'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const SECTIONS = [
  { label: 'Кристали', hint: 'monthly + daily' },
  { label: 'Дневник', hint: 'manifest entries' },
  { label: 'Препоръки', hint: 'monthly arcs' },
  { label: 'Ръководство', hint: 'reference guide' },
  { label: 'Премиум', hint: 'subscription · manage' },
  { label: 'Настройки', hint: 'account · privacy · notifications' },
] as const

function getDisplayName(user: ReturnType<typeof useUser>['user']): string {
  if (!user) return 'Ти'
  const first = user.firstName?.trim() ?? ''
  const last = user.lastName?.trim() ?? ''
  const full = [first, last].filter(Boolean).join(' ')
  if (full) return full
  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const username = email.split('@')[0]
  return username || 'Ти'
}

export default function YouScreen() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      if (__DEV__) console.warn('[YouScreen] signOut failed:', err)
    } finally {
      setSigningOut(false)
    }
  }

  const displayName = getDisplayName(user)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        <Text className="mb-10 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Ти
        </Text>

        <View className="mb-10">
          <Text className="text-[26px] font-light text-slate-100">{displayName}</Text>
          <Text className="mt-1 text-[13px] text-slate-500">Sun · Moon · Rising placeholder</Text>
        </View>

        <View className="gap-0">
          {SECTIONS.map((section, i) => (
            <View
              key={section.label}
              className={`flex-row items-baseline justify-between py-5 ${
                i > 0 ? 'border-t border-slate-800/60' : ''
              }`}
            >
              <Text className="font-cinzel text-[11px] uppercase tracking-[0.32em] text-slate-200">
                {section.label}
              </Text>
              <Text className="text-[12px] text-slate-500">{section.hint}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          className="mt-16 self-center"
        >
          <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-500">
            {signingOut ? 'Излизане' : 'Излез'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
