import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Controller, useFormContext } from 'react-hook-form'
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker'

import type { BirthData } from '@stellaeum/core/charts/schemas'
import { pressFeedback } from '@/components/design-system/tokens'
import { hapticInvite, hapticSelect } from '@/lib/haptics'
import { StepIndicator } from '@/components/wizard/StepIndicator'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * Bulgarian month-name display: «11 ноември 2002 г.»
 * Shared format used here on the date row and (sub-round 4.6) on the
 * Confirm screen review.
 */
function formatBgDate(iso: string | null | undefined): string {
  if (!iso) return 'Избери дата'
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'))
}

/**
 * Schema persists YYYY-MM-DD per regex; helper formats Date → ISO date.
 */
function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function WizardDateScreen() {
  const { push } = useGuardedNavigation()
  const {
    control,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useFormContext<BirthData>()

  const [showIosPicker, setShowIosPicker] = useState(false)

  const handleDatePress = () => {
    const currentIso = getValues('birthDate')
    const initial = currentIso
      ? new Date(currentIso + 'T00:00:00')
      : new Date()
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setValue('birthDate', toIsoDate(selectedDate), {
              shouldValidate: true,
            })
          }
        },
      })
    } else {
      setShowIosPicker(true)
    }
  }

  const handleNext = async () => {
    const ok = await trigger(['name', 'birthDate'])
    if (ok) push('/wizard/time')
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
          <StepIndicator currentStep={1} />

          <View className="mb-8">
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-bronze/75">
              I · Кога
            </Text>
            <Text className="mt-2 text-[22px] font-semibold leading-tight text-slate-100">
              Дата на раждане
            </Text>
            <Text className="mt-3 text-[14.5px] font-light leading-relaxed text-slate-400">
              Въведи името на картата и точната дата.
            </Text>
          </View>

          {/* Name field */}
          <View className="mb-8">
            <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Име на картата
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Моята карта"
                  placeholderTextColor="#475569"
                  autoCapitalize="words"
                  returnKeyType="next"
                  className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] text-slate-100"
                />
              )}
            />
            {errors.name && (
              <Text className="mt-2 text-[12px] text-rose-300/90">
                {errors.name.message}
              </Text>
            )}
          </View>

          {/* Date field */}
          <View className="mb-12">
            <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Дата на раждане
            </Text>
            <Controller
              control={control}
              name="birthDate"
              render={({ field: { value } }) => (
                <Pressable
                  onPress={() => {
                    hapticSelect()
                    handleDatePress()
                  }}
                  className="border-b border-white/[0.08] px-1 py-3"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text
                    className={`text-[16px] ${
                      value ? 'text-slate-100' : 'text-slate-600'
                    }`}
                  >
                    {formatBgDate(value)}
                  </Text>
                </Pressable>
              )}
            />
            {errors.birthDate && (
              <Text className="mt-2 text-[12px] text-rose-300/90">
                {errors.birthDate.message}
              </Text>
            )}
          </View>

          {/* Forward button */}
          <View className="flex-row justify-end">
            <Pressable
              onPress={() => {
                hapticInvite()
                handleNext()
              }}
              className="rounded-full border border-bronze/40 px-6 py-2.5"
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-bronze-text">
                Напред ›
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS modal-bottom picker — Android uses imperative DateTimePickerAndroid.open() */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={showIosPicker}
          onRequestClose={() => setShowIosPicker(false)}
        >
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => {
              hapticSelect()
              setShowIosPicker(false)
            }}
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="rounded-t-2xl border-t border-white/10 bg-bg px-4 py-6"
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <DateTimePicker
                value={
                  getValues('birthDate')
                    ? new Date(getValues('birthDate')! + 'T00:00:00')
                    : new Date()
                }
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                themeVariant="dark"
                locale="bg-BG"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setValue('birthDate', toIsoDate(selectedDate), {
                      shouldValidate: true,
                    })
                  }
                }}
              />
              <Pressable
                onPress={() => {
                  hapticSelect()
                  setShowIosPicker(false)
                }}
                className="mt-2 self-center rounded-full border border-bronze/40 px-6 py-2.5"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-bronze-text">
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
