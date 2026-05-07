import { useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker'

import type {
  ApproximateTimeRange,
  BirthData,
} from '@stellaeum/core/charts/schemas'
import { StepIndicator } from '@/components/wizard/StepIndicator'

const TIME_RANGES: {
  value: ApproximateTimeRange
  label: string
  hours: string
}[] = [
  { value: 'morning', label: 'Сутрин', hours: '06 - 12' },
  { value: 'afternoon', label: 'Следобед', hours: '12 - 18' },
  { value: 'evening', label: 'Вечер', hours: '18:00–23:59' },
  { value: 'night', label: 'Нощ', hours: '00 - 06' },
]

function dateToHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function parseHHMM(time: string | null | undefined): Date {
  // Today-anchored Date. fix-5's epoch anchor (new Date(0)) was reverted
  // because it constrained iOS mode='time' picker's internal time range
  // to a 2-hour window in Bulgaria local (-7200000 to 0 ms, observed via
  // debug-3 after fix-6 library rollback to 8.4.4). Today-anchored value
  // gives picker its full 24-hour wheel range. Combined with fix-4's
  // uncontrolled-while-open architecture, the controlled-component
  // snap-back risk is mitigated by echoing back the picker's emitted
  // Date verbatim (no roundtrip drift during interactive scroll).
  const d = new Date()
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  } else {
    d.setHours(12, 0, 0, 0)
  }
  return d
}

export default function WizardTimeScreen() {
  const router = useRouter()
  const {
    control,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useFormContext<BirthData>()

  const birthTimeKnown = useWatch({ control, name: 'birthTimeKnown' })
  const approximateTimeRange = useWatch({
    control,
    name: 'approximateTimeRange',
  })

  const [showIosPicker, setShowIosPicker] = useState(false)
  // Local picker state for iOS uncontrolled-while-open pattern. Echoes
  // back the Date the native picker emits so its internal state and the
  // value prop never drift apart on the millisecond axis. Committed to
  // RHF only on dismiss. Android uses the imperative
  // DateTimePickerAndroid.open() API and does not need this state.
  const [iosPickerLocalValue, setIosPickerLocalValue] =
    useState<Date | null>(null)

  const handleTimeKnownChange = (known: boolean) => {
    setValue('birthTimeKnown', known, { shouldValidate: true })
    if (known) {
      setValue('approximateTimeRange', null, { shouldValidate: true })
    } else {
      setValue('birthTime', null, { shouldValidate: true })
    }
  }

  const handleRangeSelect = (range: ApproximateTimeRange) => {
    setValue('approximateTimeRange', range, { shouldValidate: true })
  }

  const handleTimePress = () => {
    const initial = parseHHMM(getValues('birthTime'))
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'time',
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setValue('birthTime', dateToHHMM(selectedDate), {
              shouldValidate: true,
            })
          }
        },
      })
    } else {
      setIosPickerLocalValue(initial)
      setShowIosPicker(true)
    }
  }

  const handleIosPickerDismiss = () => {
    if (iosPickerLocalValue) {
      setValue('birthTime', dateToHHMM(iosPickerLocalValue), {
        shouldValidate: true,
      })
    }
    setShowIosPicker(false)
  }

  const handleNext = async () => {
    const ok = await trigger([
      'birthTimeKnown',
      'birthTime',
      'approximateTimeRange',
    ])
    if (ok) router.push('/wizard/location')
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 64,
        }}
      >
        <StepIndicator currentStep={2} />

        <View className="mb-8">
          <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
            II · Час
          </Text>
          <Text className="mt-2 text-[22px] font-semibold leading-tight text-slate-100">
            Час на раждане
          </Text>
          <Text className="mt-3 text-[14.5px] font-light leading-relaxed text-slate-400">
            Точният час определя асцендента и домовете.
          </Text>
        </View>

        {/* Known/unknown toggle — rail-with-amber-diamond mirrors web */}
        <Pressable
          onPress={() => handleTimeKnownChange(!birthTimeKnown)}
          className={`mb-7 flex-row items-center justify-between border-y px-1 py-4 ${
            birthTimeKnown
              ? 'border-amber-300/25'
              : 'border-white/[0.06]'
          }`}
        >
          <View className="mr-4 flex-1">
            <Text className="text-[15px] font-medium text-slate-100">
              Знам точния час на раждане
            </Text>
            <Text className="mt-1 text-[12.5px] text-slate-500">
              Подобрява асцендента и домовете
            </Text>
          </View>
          <View
            className={`h-5 w-10 rounded-full border ${
              birthTimeKnown
                ? 'border-amber-300/50 bg-amber-300/[0.08]'
                : 'border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            <View
              className={`absolute h-2 w-2 ${
                birthTimeKnown ? 'bg-amber-300/90' : 'bg-slate-500'
              }`}
              style={{
                top: '50%',
                left: birthTimeKnown ? 26 : 6,
                transform: [{ translateY: -4 }, { rotate: '45deg' }],
                ...(birthTimeKnown && {
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

        {birthTimeKnown ? (
          /* Time input */
          <View className="mb-12">
            <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Точен час
            </Text>
            <Controller
              control={control}
              name="birthTime"
              render={({ field: { value } }) => (
                <Pressable
                  onPress={handleTimePress}
                  className="border-b border-white/[0.08] px-1 py-3"
                >
                  <Text
                    className={`text-[16px] tabular-nums ${
                      value ? 'text-slate-100' : 'text-slate-600'
                    }`}
                  >
                    {value ?? 'Избери час'}
                  </Text>
                </Pressable>
              )}
            />
            {errors.birthTime && (
              <Text className="mt-2 text-[12px] text-rose-300/90">
                {errors.birthTime.message}
              </Text>
            )}
          </View>
        ) : (
          /* Approximate range grid */
          <View className="mb-12">
            <Text className="mb-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Приблизителен период
            </Text>
            <View
              className="flex-row flex-wrap"
              style={{ gap: 10 }}
            >
              {TIME_RANGES.map(({ value, label, hours }) => {
                const isActive = approximateTimeRange === value
                return (
                  <Pressable
                    key={value}
                    onPress={() => handleRangeSelect(value)}
                    className={`items-center rounded-xl border px-4 py-4 ${
                      isActive
                        ? 'border-amber-300/45 bg-amber-400/[0.06]'
                        : 'border-white/[0.06] bg-white/[0.015]'
                    }`}
                    style={{ width: '48%' }}
                  >
                    {isActive && (
                      <View
                        className="absolute h-1 w-1 bg-amber-300/90"
                        style={{
                          top: 10,
                          left: 10,
                          transform: [{ rotate: '45deg' }],
                        }}
                      />
                    )}
                    <Text
                      className={`text-[14px] font-semibold ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {label}
                    </Text>
                    <Text className="mt-1 font-cinzel text-[9px] font-semibold uppercase tracking-[0.24em] tabular-nums text-amber-300/70">
                      {hours}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {errors.approximateTimeRange && (
              <Text className="mt-3 text-[12px] text-rose-300/90">
                {errors.approximateTimeRange.message}
              </Text>
            )}
            <Text className="mt-4 text-[12.5px] leading-relaxed text-slate-500">
              Картата се изчислява по обяд на местно време; избраният
              период е за контекст, а възходящият знак е приблизителен,
              затова тълкуването му е ориентировъчно.
            </Text>
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

      {/* iOS modal time picker — Android uses imperative DateTimePickerAndroid.open() */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={showIosPicker}
          onRequestClose={handleIosPickerDismiss}
        >
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={handleIosPickerDismiss}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="rounded-t-2xl border-t border-white/10 bg-bg px-4 py-6"
            >
              <DateTimePicker
                value={iosPickerLocalValue ?? new Date()}
                mode="time"
                display="spinner"
                is24Hour
                themeVariant="dark"
                locale="bg-BG"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setIosPickerLocalValue(selectedDate)
                  }
                }}
              />
              <Pressable
                onPress={handleIosPickerDismiss}
                className="mt-2 self-center rounded-full border border-amber-300/40 px-6 py-2.5"
              >
                <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                  Готово
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  )
}
