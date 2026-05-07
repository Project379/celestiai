import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

import type { BirthData } from '@stellaeum/core/charts/schemas'
import { StepIndicator } from '@/components/wizard/StepIndicator'
import { CitySearch, type City } from '@/components/wizard/CitySearch'

export default function WizardLocationScreen() {
  const router = useRouter()
  const {
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<BirthData>()

  const manualCoordinates = useWatch({ control, name: 'manualCoordinates' })
  const cityName = useWatch({ control, name: 'cityName' })

  const handleCitySelect = (city: City) => {
    setValue('cityId', city.id || null, { shouldValidate: true })
    setValue('cityName', city.name, { shouldValidate: true })
    setValue('latitude', city.latitude, { shouldValidate: true })
    setValue('longitude', city.longitude, { shouldValidate: true })
    setValue('manualCoordinates', false)
  }

  const handleManualToggle = (checked: boolean) => {
    setValue('manualCoordinates', checked)
    if (checked) {
      setValue('cityId', null)
      setValue('cityName', '')
    }
  }

  const handleNext = async () => {
    const ok = await trigger(['cityName', 'latitude', 'longitude'])
    if (ok) router.push('/wizard/confirm')
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 64,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <StepIndicator currentStep={3} />

          <View className="mb-8">
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
              III · Място
            </Text>
            <Text className="mt-2 text-[22px] font-semibold leading-tight text-slate-100">
              Място на раждане
            </Text>
            <Text className="mt-3 text-[14.5px] font-light leading-relaxed text-slate-400">
              Мястото определя домовете и асцендента.
            </Text>
          </View>

          {/* Manual-coords toggle — same Pressable rail+diamond pattern as time.tsx */}
          <Pressable
            onPress={() => handleManualToggle(!manualCoordinates)}
            className={`mb-7 flex-row items-center justify-between border-y px-1 py-4 ${
              manualCoordinates
                ? 'border-amber-300/25'
                : 'border-white/[0.06]'
            }`}
          >
            <View className="mr-4 flex-1">
              <Text className="text-[15px] font-medium text-slate-100">
                Ръчни координати
              </Text>
              <Text className="mt-1 text-[12.5px] text-slate-500">
                За раждане извън България
              </Text>
            </View>
            <View
              className={`h-5 w-10 rounded-full border ${
                manualCoordinates
                  ? 'border-amber-300/50 bg-amber-300/[0.08]'
                  : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <View
                className={`absolute h-2 w-2 ${
                  manualCoordinates ? 'bg-amber-300/90' : 'bg-slate-500'
                }`}
                style={{
                  top: '50%',
                  left: manualCoordinates ? 21 : 6,
                  transform: [{ translateY: -3 }, { rotate: '45deg' }],
                  ...(manualCoordinates && {
                    shadowColor: 'rgb(251, 191, 36)',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 8,
                    elevation: 4,
                  }),
                }}
              />
            </View>
          </Pressable>

          {!manualCoordinates ? (
            <View className="mb-12">
              <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Търсене на град
              </Text>
              <CitySearch
                value={cityName ?? ''}
                onSelect={handleCitySelect}
                error={errors.cityName?.message}
              />
              {errors.cityName && !cityName && (
                <Text className="mt-2 text-[12px] text-rose-300/90">
                  {errors.cityName.message}
                </Text>
              )}
            </View>
          ) : (
            <View className="mb-12" style={{ gap: 24 }}>
              <View>
                <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Име на мястото
                </Text>
                <Controller
                  control={control}
                  name="cityName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Лондон, Великобритания"
                      placeholderTextColor="#475569"
                      autoCapitalize="words"
                      className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] text-slate-100"
                    />
                  )}
                />
                {errors.cityName && (
                  <Text className="mt-2 text-[12px] text-rose-300/90">
                    {errors.cityName.message}
                  </Text>
                )}
              </View>

              <View className="flex-row" style={{ gap: 20 }}>
                <View className="flex-1">
                  <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Ширина
                  </Text>
                  <Controller
                    control={control}
                    name="latitude"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        defaultValue={
                          value == null || Number.isNaN(value)
                            ? ''
                            : String(value)
                        }
                        onChangeText={(t) => {
                          const parsed = parseFloat(t.replace(',', '.'))
                          onChange(Number.isNaN(parsed) ? undefined : parsed)
                        }}
                        onBlur={onBlur}
                        placeholder="42.6977"
                        placeholderTextColor="#475569"
                        keyboardType="numbers-and-punctuation"
                        className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] tabular-nums text-slate-100"
                      />
                    )}
                  />
                  {errors.latitude && (
                    <Text className="mt-2 text-[12px] text-rose-300/90">
                      {errors.latitude.message}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Дължина
                  </Text>
                  <Controller
                    control={control}
                    name="longitude"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextInput
                        defaultValue={
                          value == null || Number.isNaN(value)
                            ? ''
                            : String(value)
                        }
                        onChangeText={(t) => {
                          const parsed = parseFloat(t.replace(',', '.'))
                          onChange(Number.isNaN(parsed) ? undefined : parsed)
                        }}
                        onBlur={onBlur}
                        placeholder="23.3219"
                        placeholderTextColor="#475569"
                        keyboardType="numbers-and-punctuation"
                        className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] tabular-nums text-slate-100"
                      />
                    )}
                  />
                  {errors.longitude && (
                    <Text className="mt-2 text-[12px] text-rose-300/90">
                      {errors.longitude.message}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="px-2 py-2">
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                ‹ Назад
              </Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              className="rounded-full border border-amber-300/40 px-6 py-2.5"
            >
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                Напред ›
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
