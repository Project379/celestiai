import { Pressable, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAccountDeletion } from '@/hooks/useAccountDeletion'

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

/**
 * Persistent grace-period banner (P.10-b), mirrors web's
 * DeletionPendingBanner.tsx. Mounted once in (authed)/_layout.tsx so it
 * covers every authed screen, not just the settings screen — per
 * ratification the grace period is a full-access undo window, so
 * visibility + a one-tap cancel is the only job here.
 */
export function DeletionPendingBanner() {
  const { status, cancelDeletion } = useAccountDeletion()
  const deletionScheduledAt = status.data?.deletionScheduledAt ?? null

  if (!deletionScheduledAt) return null

  return (
    <SafeAreaView
      edges={['top']}
      className="border-b border-rose-400/30 bg-rose-500/[0.08] px-4 py-2.5"
    >
      <Text className="text-center text-[13px] text-rose-200/95">
        Акаунтът ти ще бъде изтрит на{' '}
        <Text className="font-medium text-rose-100">
          {BG_DATE_FORMAT.format(new Date(deletionScheduledAt))}
        </Text>
        .{' '}
        <Text
          onPress={() => cancelDeletion.mutate()}
          className="font-medium text-bronze underline"
        >
          {cancelDeletion.isPending ? 'Отменяме...' : 'Отмени изтриването'}
        </Text>
      </Text>
    </SafeAreaView>
  )
}
