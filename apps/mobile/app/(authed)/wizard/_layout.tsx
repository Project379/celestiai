import { Stack } from 'expo-router'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { birthDataSchema, type BirthData } from '@stellaeum/core/charts/schemas'

/**
 * Birth-data wizard Stack layout.
 *
 * Wraps all four step screens in a single FormProvider so step-level
 * components share one react-hook-form instance with the lifted Zod
 * resolver from @stellaeum/core/charts/schemas (sub-round 4.1).
 * defaultValues mirror apps/web/components/birth-data/BirthDataWizard.tsx
 * exactly.
 *
 * Bulgarian step titles in the Stack header mirror web's STEP_LABELS.
 */
export default function WizardLayout() {
  const methods = useForm<BirthData>({
    resolver: zodResolver(birthDataSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      birthDate: '',
      birthTimeKnown: true,
      birthTime: null,
      approximateTimeRange: null,
      cityId: null,
      cityName: '',
      latitude: 0,
      longitude: 0,
      manualCoordinates: false,
    },
  })

  return (
    <FormProvider {...methods}>
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
    </FormProvider>
  )
}
