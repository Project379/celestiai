import { Stack } from 'expo-router'

/**
 * Birth-data wizard Stack layout.
 *
 * Sub-round 4.2 lays the empty 4-step skeleton; each screen ships as a
 * placeholder until 4.3 onwards adds real form fields, RHF context, and
 * Zod-resolver validation against the shared birthDataSchema in
 * @stellaeum/core/charts/schemas (lifted in 4.1).
 *
 * Bulgarian step titles mirror the web wizard's STEP_LABELS exactly
 * (apps/web/components/birth-data/BirthDataWizard.tsx). Shared surface,
 * direct mirror per the workflow rule.
 */
export default function WizardLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#08060f' },
        headerTitleStyle: {
          color: '#e2e8f0',
          fontSize: 14,
        },
        headerTintColor: '#fcd34d',
        headerBackTitle: '',
        contentStyle: { backgroundColor: '#08060f' },
      }}
    >
      <Stack.Screen name="date" options={{ title: 'Дата' }} />
      <Stack.Screen name="time" options={{ title: 'Час' }} />
      <Stack.Screen name="location" options={{ title: 'Място' }} />
      <Stack.Screen name="confirm" options={{ title: 'Преглед' }} />
    </Stack>
  )
}
