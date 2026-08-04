import { Alert, Pressable, Text } from 'react-native'
import { useRouter } from 'expo-router'

import { pressFeedback } from '@/components/design-system/tokens'
import { hapticSelect } from '@/lib/haptics'
import { markWizardDismissedThisLaunch } from '@/lib/onboarding/dismissState'

/**
 * Header skip button for the birth-data wizard (B.0g-3). Opens a native
 * confirm dialog with the ratified Bulgarian copy; on confirm, marks the
 * per-launch dismiss flag and routes back to Днес. Dismiss clears on app
 * re-launch — chart-less users see the forced wizard again next launch.
 *
 * Native Alert chosen over a custom modal: ratified copy is short, the
 * decision is a standard "are you sure" prompt, and the platform-native
 * affordance (iOS sheet, Android dialog) matches user expectations for
 * destructive action confirmations.
 */
export function SkipWizardButton() {
  const router = useRouter()

  const handlePress = () => {
    Alert.alert(
      'Сигурен ли си?',
      'Без рождена карта няма да виждаш персонализиран хороскоп, наталната карта или транзитите.',
      [
        { text: 'Назад към данните', style: 'cancel' },
        {
          text: 'Пропусни засега',
          style: 'destructive',
          onPress: () => {
            markWizardDismissedThisLaunch()
            router.replace('/')
          },
        },
      ],
    )
  }

  return (
    <Pressable
      onPress={() => {
        hapticSelect()
        handlePress()
      }}
      hitSlop={12}
      style={({ pressed }) => pressFeedback(pressed)}
    >
      <Text className="font-cinzel text-[10.5px] uppercase tracking-[0.32em] text-slate-400">
        Пропусни
      </Text>
    </Pressable>
  )
}
