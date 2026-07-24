import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

import { pressFeedback } from '@/components/design-system/tokens'
import { useApiClient } from '@/lib/api/client'

export interface City {
  id: string
  name: string
  oblast: string
  type: 'city' | 'town' | 'village'
  latitude: number
  longitude: number
}

interface CitySearchProps {
  value: string
  onSelect: (city: City) => void
  error?: string
}

const TYPE_LABELS: Record<City['type'], string> = {
  city: 'град',
  town: 'градче',
  village: 'село',
}

export function CitySearch({ value, onSelect, error }: CitySearchProps) {
  const { apiFetch } = useApiClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }
    const handle = setTimeout(async () => {
      setIsLoading(true)
      setFetchError(null)
      try {
        const data = (await apiFetch(
          `/api/cities/search?q=${encodeURIComponent(query)}`,
        )) as City[]
        setResults(data)
        setIsOpen(true)
      } catch {
        setFetchError('Грешка при търсене')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [query, apiFetch])

  const handleSelect = (city: City) => {
    onSelect(city)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  const handleClearChip = () => {
    // Mirror web's clear semantic — empty values trigger re-validation and
    // re-show the search input. Lat/lng=0 matches web/CitySearch.tsx clear path.
    onSelect({
      id: '',
      name: '',
      oblast: '',
      type: 'city',
      latitude: 0,
      longitude: 0,
    })
  }

  if (value && !query) {
    return (
      <View
        className="flex-row items-center justify-between border-y border-amber-300/25 bg-amber-400/[0.05] px-1 py-3"
        style={{ gap: 16 }}
      >
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View
            className="h-1.5 w-1.5 bg-amber-300/90"
            style={{
              transform: [{ rotate: '45deg' }],
              shadowColor: 'rgb(251, 191, 36)',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 8,
              elevation: 4,
            }}
          />
          <Text className="text-[15px] font-medium text-slate-100">
            {value}
          </Text>
        </View>
        <Pressable onPress={handleClearChip} hitSlop={8} style={({ pressed }) => pressFeedback(pressed)}>
          <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Смени
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View>
      <View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            if (query.length >= 1 && results.length > 0) setIsOpen(true)
          }}
          placeholder="Търсене на град…"
          placeholderTextColor="#475569"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          className={`border-b px-1 py-2.5 pr-9 text-[16px] text-slate-100 ${
            error ? 'border-rose-400/50' : 'border-white/[0.08]'
          }`}
        />
        {isLoading && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 4,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color="rgb(251, 191, 36)" />
          </View>
        )}
      </View>

      {isOpen && (
        <View
          style={{
            position: 'absolute',
            top: 48,
            left: 0,
            right: 0,
            maxHeight: 280,
            zIndex: 50,
          }}
          className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-bg"
        >
          {fetchError ? (
            <Text className="px-5 py-4 text-[13px] text-rose-300/90">
              {fetchError}
            </Text>
          ) : !isLoading && results.length === 0 ? (
            <Text className="px-5 py-4 text-[13px] text-slate-500">
              Няма намерени резултати
            </Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  className="flex-row items-center justify-between border-b border-white/[0.04] px-5 py-3"
                  style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 12 })}
                >
                  <View className="flex-1">
                    <Text className="text-[14.5px] font-medium text-slate-100">
                      {item.name}
                      <Text className="text-[12px] text-slate-500">
                        {' '}
                        ({item.oblast})
                      </Text>
                    </Text>
                  </View>
                  <Text className="font-cinzel text-[8.5px] font-semibold uppercase tracking-[0.26em] text-amber-300/70">
                    {TYPE_LABELS[item.type]}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  )
}
