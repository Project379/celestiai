import { useState } from 'react'
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'

import {
  createBirthDataSchema,
  type ApproximateTimeRange,
  type BirthData,
} from '@stellaeum/core/charts/schemas'
import { CitySearch, type City } from '@/components/wizard/CitySearch'
import { TimePicker } from '@/components/wizard/TimePicker'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { hapticSelect } from '@/lib/haptics'
import { ApiError } from '@/lib/api/client'

const TIME_RANGES: { value: ApproximateTimeRange; label: string; hours: string }[] = [
  { value: 'morning', label: 'Сутрин', hours: '06 - 12' },
  { value: 'afternoon', label: 'Следобед', hours: '12 - 18' },
  { value: 'evening', label: 'Вечер', hours: '18 - 24' },
  { value: 'night', label: 'Нощ', hours: '00 - 06' },
]

const DEFAULT_VALUES: BirthData = {
  name: '',
  birthDate: '',
  birthTimeKnown: true,
  birthTime: '',
  approximateTimeRange: null,
  cityId: null,
  cityName: '',
  latitude: 0,
  longitude: 0,
  manualCoordinates: false,
}

function formatBgDate(iso: string | null | undefined): string {
  if (!iso) return 'Избери дата'
  return new Intl.DateTimeFormat('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso + 'T00:00:00'),
  )
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function dateToHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function parseHHMM(time: string | null | undefined): Date {
  const d = new Date()
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  } else {
    d.setHours(12, 0, 0, 0)
  }
  return d
}

// Same controlled-local-string pattern as wizard/location.tsx's
// CoordinateField — second use, still under the rule-of-three threshold
// for extracting a shared component.
function CoordinateField({
  initialValue,
  onChange,
  onBlur,
  placeholder,
}: {
  initialValue: number | undefined | null
  onChange: (n: number | undefined) => void
  onBlur: () => void
  placeholder: string
}) {
  const [text, setText] = useState(
    initialValue == null || Number.isNaN(initialValue) ? '' : String(initialValue),
  )
  return (
    <TextInput
      value={text}
      onChangeText={(raw) => {
        const clean = raw.replace(',', '.').replace(/[^0-9.\-]/g, '')
        setText(clean)
        const parsed = parseFloat(clean)
        onChange(Number.isNaN(parsed) ? undefined : parsed)
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor="#475569"
      keyboardType="numbers-and-punctuation"
      className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] tabular-nums text-slate-100"
    />
  )
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{ fontFamily: font.bodyMedium }}
      className="mb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500"
    >
      {children}
    </Text>
  )
}

function InnerForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean
  onSubmit: (data: BirthData) => void
}) {
  const {
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useFormContext<BirthData>()

  const birthTimeKnown = useWatch({ control, name: 'birthTimeKnown' })
  const approximateTimeRange = useWatch({ control, name: 'approximateTimeRange' })
  const manualCoordinates = useWatch({ control, name: 'manualCoordinates' })
  const cityName = useWatch({ control, name: 'cityName' })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const selectCity = (city: City) => {
    setValue('cityId', city.id || null, { shouldValidate: true })
    setValue('cityName', city.name, { shouldValidate: true })
    setValue('latitude', city.latitude, { shouldValidate: true })
    setValue('longitude', city.longitude, { shouldValidate: true })
    setValue('manualCoordinates', false)
  }

  const toggleTimeKnown = (known: boolean) => {
    setValue('birthTimeKnown', known, { shouldValidate: true })
    if (known) setValue('approximateTimeRange', null, { shouldValidate: true })
    else setValue('birthTime', null, { shouldValidate: true })
  }

  const toggleManual = (checked: boolean) => {
    setValue('manualCoordinates', checked)
    if (checked) {
      setValue('cityId', null)
      setValue('cityName', '')
    }
  }

  const handleDatePress = () => {
    if (Platform.OS === 'android') {
      const currentIso = getValues('birthDate')
      DateTimePickerAndroid.open({
        value: currentIso ? new Date(currentIso + 'T00:00:00') : new Date(),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setValue('birthDate', toIsoDate(selectedDate), { shouldValidate: true })
          }
        },
      })
    } else {
      setShowDatePicker(true)
    }
  }

  const handleTimePress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseHHMM(getValues('birthTime')),
        mode: 'time',
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            setValue('birthTime', dateToHHMM(selectedDate), { shouldValidate: true })
          }
        },
      })
    } else {
      setShowTimePicker(true)
    }
  }

  return (
    <View>
      <View className="mb-7">
        <FieldLabel>Име</FieldLabel>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Име или инициали"
              placeholderTextColor="#475569"
              autoCapitalize="words"
              className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] text-slate-100"
            />
          )}
        />
        {errors.name && <Text className="mt-2 text-[12px] text-rose-300/90">{errors.name.message}</Text>}
      </View>

      <View className="mb-7">
        <FieldLabel>Дата на раждане</FieldLabel>
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
              <Text className={`text-[16px] ${value ? 'text-slate-100' : 'text-slate-600'}`}>
                {formatBgDate(value)}
              </Text>
            </Pressable>
          )}
        />
        {errors.birthDate && <Text className="mt-2 text-[12px] text-rose-300/90">{errors.birthDate.message}</Text>}
      </View>

      <View className="mb-7 rounded-2xl border border-white/[0.06] px-4 py-4">
        <Pressable
          onPress={() => {
            hapticSelect()
            toggleTimeKnown(!birthTimeKnown)
          }}
          className="flex-row items-center justify-between"
          style={({ pressed }) => pressFeedback(pressed)}
        >
          <View className="mr-4 flex-1">
            <Text className="text-[15px] font-medium text-slate-100">Знаеш ли точния час?</Text>
            <Text className="mt-1 text-[12.5px] text-slate-500">Ако не, избери приблизителен период.</Text>
          </View>
          <View
            className={`h-5 w-10 rounded-full border ${
              birthTimeKnown ? 'border-bronze/50 bg-bronze/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            <View
              className={`absolute h-2 w-2 ${birthTimeKnown ? 'bg-bronze/90' : 'bg-slate-500'}`}
              style={{
                top: '50%',
                left: birthTimeKnown ? 21 : 6,
                transform: [{ translateY: -3 }, { rotate: '45deg' }],
                ...(birthTimeKnown && {
                  shadowColor: 'rgb(184, 118, 62)',
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
          <View className="mt-4">
            <Controller
              control={control}
              name="birthTime"
              render={({ field: { value } }) => (
                <Pressable
                  onPress={() => {
                    hapticSelect()
                    handleTimePress()
                  }}
                  className="border-b border-white/[0.08] px-1 py-3"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text className={`text-[16px] tabular-nums ${value ? 'text-slate-100' : 'text-slate-600'}`}>
                    {value ?? 'Избери час'}
                  </Text>
                </Pressable>
              )}
            />
            {errors.birthTime && <Text className="mt-2 text-[12px] text-rose-300/90">{errors.birthTime.message}</Text>}
          </View>
        ) : (
          <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
            {TIME_RANGES.map(({ value, label, hours }) => {
              const active = approximateTimeRange === value
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    hapticSelect()
                    setValue('approximateTimeRange', value, { shouldValidate: true })
                  }}
                  className={`rounded-xl border px-4 py-3 ${
                    active ? 'border-bronze/45 bg-bronze/[0.06]' : 'border-white/[0.06] bg-white/[0.015]'
                  }`}
                  style={({ pressed }) => ({ ...pressFeedback(pressed), width: '47%' })}
                >
                  <Text className="text-[14px] font-semibold text-slate-100">{label}</Text>
                  <Text
                    style={{ fontFamily: font.bodyMedium }}
                    className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] tabular-nums text-bronze/70"
                  >
                    {hours}
                  </Text>
                </Pressable>
              )
            })}
            {errors.approximateTimeRange && (
              <Text className="w-full mt-1 text-[12px] text-rose-300/90">{errors.approximateTimeRange.message}</Text>
            )}
          </View>
        )}
      </View>

      <View className="mb-9 rounded-2xl border border-white/[0.06] px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-[15px] font-medium text-slate-100">Място на раждане</Text>
            <Text className="mt-1 text-[12.5px] text-slate-500">Търсене за България или ръчни координати.</Text>
          </View>
          <Pressable
            onPress={() => {
              hapticSelect()
              toggleManual(!manualCoordinates)
            }}
            className="flex-row items-center"
            style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 8 })}
          >
            <Text
              style={{ fontFamily: font.bodyMedium }}
              className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400"
            >
              Ръчно
            </Text>
            <View
              className={`h-5 w-10 rounded-full border ${
                manualCoordinates ? 'border-bronze/50 bg-bronze/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <View
                className={`absolute h-2 w-2 ${manualCoordinates ? 'bg-bronze/90' : 'bg-slate-500'}`}
                style={{
                  top: '50%',
                  left: manualCoordinates ? 21 : 6,
                  transform: [{ translateY: -3 }, { rotate: '45deg' }],
                }}
              />
            </View>
          </Pressable>
        </View>

        {!manualCoordinates ? (
          <View className="mt-4">
            <CitySearch value={cityName ?? ''} onSelect={selectCity} error={errors.cityName?.message} />
            {errors.cityName && !cityName && (
              <Text className="mt-2 text-[12px] text-rose-300/90">{errors.cityName.message}</Text>
            )}
          </View>
        ) : (
          <View className="mt-4" style={{ gap: 16 }}>
            <Controller
              control={control}
              name="cityName"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Град или място"
                  placeholderTextColor="#475569"
                  autoCapitalize="words"
                  className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] text-slate-100"
                />
              )}
            />
            <View className="flex-row" style={{ gap: 16 }}>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="latitude"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <CoordinateField initialValue={value} onChange={onChange} onBlur={onBlur} placeholder="Ширина" />
                  )}
                />
                {errors.latitude && <Text className="mt-2 text-[12px] text-rose-300/90">{errors.latitude.message}</Text>}
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="longitude"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <CoordinateField initialValue={value} onChange={onChange} onBlur={onBlur} placeholder="Дължина" />
                  )}
                />
                {errors.longitude && <Text className="mt-2 text-[12px] text-rose-300/90">{errors.longitude.message}</Text>}
              </View>
            </View>
          </View>
        )}
      </View>

      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="self-start rounded-full border border-rose-300/35 bg-rose-500/10 px-5 py-2.5"
        style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: isSubmitting ? 0.5 : pressed ? 0.6 : 1 })}
      >
        <Text
          style={{ fontFamily: font.bodyMedium }}
          className="text-[10px] font-semibold uppercase tracking-[0.3em] text-rose-100"
        >
          {isSubmitting ? 'Запазване...' : 'Запази crush профил'}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={getValues('birthDate') ? new Date(getValues('birthDate') + 'T00:00:00') : new Date()}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          themeVariant="dark"
          locale="bg-BG"
          onChange={(_event, selectedDate) => {
            setShowDatePicker(false)
            if (selectedDate) setValue('birthDate', toIsoDate(selectedDate), { shouldValidate: true })
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <TimePicker
          visible={showTimePicker}
          initialHHMM={getValues('birthTime')}
          onDismiss={(hhmm) => {
            setValue('birthTime', hhmm, { shouldValidate: true })
            setShowTimePicker(false)
          }}
        />
      )}
    </View>
  )
}

/**
 * Mobile port of apps/web/components/circle/SavedProfileForm.tsx — same
 * fields, same order, same validation (createBirthDataSchema). Native
 * inputs reuse the exact patterns already established in
 * apps/mobile/app/(authed)/wizard/{date,time,location}.tsx (date/time
 * pickers, CitySearch, the toggle-rail visual) rather than inventing new
 * ones — applying the existing mobile form language, not web's HTML
 * inputs, since RN has no direct equivalent.
 */
export function SavedProfileForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean
  onSubmit: (data: BirthData) => Promise<void>
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const methods = useForm<BirthData>({
    resolver: zodResolver(createBirthDataSchema),
    defaultValues: DEFAULT_VALUES,
  })

  return (
    <FormProvider {...methods}>
      {serverError && (
        <View className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
          <Text className="text-[13px] text-rose-100">{serverError}</Text>
        </View>
      )}
      <InnerForm
        isSubmitting={isSubmitting}
        onSubmit={async (data) => {
          setServerError(null)
          try {
            await onSubmit(data)
            methods.reset(DEFAULT_VALUES)
          } catch (error) {
            const msg =
              error instanceof ApiError
                ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да запазим профила.')
                : 'Не успяхме да запазим профила.'
            setServerError(msg)
          }
        }}
      />
    </FormProvider>
  )
}
