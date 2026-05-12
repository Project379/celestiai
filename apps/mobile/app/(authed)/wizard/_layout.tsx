import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { birthDataSchema, type BirthData } from '@stellaeum/core/charts/schemas'
import { useApiClient } from '@/lib/api/client'
import { SkipWizardButton } from '@/components/onboarding/SkipWizardButton'

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
 *
 * Mount-time existing-chart redirect (sub-round 4.7): if the user
 * already has a saved birth chart, bounce to Днес. Soft-prevention only
 * — failures are swallowed so the user proceeds with the wizard
 * regardless of network/auth hiccups (server-side dedup catches any
 * duplicate-create at POST time).
 */
export default function WizardLayout() {
  const router = useRouter()
  const { apiFetch } = useApiClient()

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

  useEffect(() => {
    apiFetch('/api/birth-data')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          router.replace('/')
        }
      })
      .catch(() => {
        // Soft prevention — let user proceed with wizard on fetch failure.
      })
  }, [apiFetch, router])

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
          // B.0g-3 forced-wizard Path 2: persistent skip affordance on every
          // step. Tap opens native Alert with ratified copy; on confirm,
          // sets per-launch dismiss flag and bounces to Днес.
          headerRight: () => <SkipWizardButton />,
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
