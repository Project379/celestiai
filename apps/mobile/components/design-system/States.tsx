import { ActivityIndicator, Text, View } from 'react-native'

import { NavRow } from './NavRow'
import { color, type } from './tokens'

// Deliberately plain — no tracked-caps eyebrow (v1/v2 both over-used that
// treatment; the v3 brief cuts ornament hard in favor of conventional,
// unadorned states a first-time user has seen a hundred times before).
export function LoadingState({ status }: { status: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
      <ActivityIndicator color={color.bronze} size="small" />
      <Text style={{ ...type.caption, color: color.faint, marginTop: 12 }}>{status}</Text>
    </View>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: 'rgba(251,113,133,0.15)',
        backgroundColor: 'rgba(251,113,133,0.04)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 8,
      }}
    >
      <Text style={{ ...type.body, fontSize: 14, lineHeight: 20, color: '#fda4af' }}>{message}</Text>
    </View>
  )
}

export function EmptyState({
  body,
  ctaLabel,
  onPressCta,
}: {
  body: string
  ctaLabel: string
  onPressCta: () => void
}) {
  return (
    <View>
      <Text style={{ ...type.body, color: '#e2e8f0e6', marginBottom: 8 }}>{body}</Text>
      <NavRow label={ctaLabel} onPress={onPressCta} tone="accent" />
    </View>
  )
}
