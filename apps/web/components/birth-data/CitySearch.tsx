'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface City {
  id: string
  name: string
  oblast: string
  type: 'city' | 'town' | 'village'
  latitude: number
  longitude: number
}

interface CitySearchProps {
  onSelect: (city: City) => void
  value: string
  error?: string
}

const TYPE_LABELS: Record<City['type'], string> = {
  city: 'град',
  town: 'градче',
  village: 'село',
}

export function CitySearch({ onSelect, value, error }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchCities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setFetchError(null)

    try {
      const response = await fetch(`/api/cities/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error('Грешка при търсене')

      const data = await response.json()
      setResults(data)
      setIsOpen(true)
      setHighlightedIndex(-1)
    } catch {
      setFetchError('Грешка при търсене')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length >= 1) {
      debounceRef.current = setTimeout(() => searchCities(query), 300)
    } else {
      setResults([])
      setIsOpen(false)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchCities])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (city: City) => {
    onSelect(city)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected city display */}
      {value && !query && (
        <div className="flex items-center justify-between gap-4 border-y border-amber-300/25 bg-gradient-to-r from-violet-500/[0.06] via-transparent to-amber-400/[0.05] px-1 py-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            <span className="font-display text-[15px] font-medium text-slate-100">{value}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect({ id: '', name: '', oblast: '', type: 'city', latitude: 0, longitude: 0 })
              inputRef.current?.focus()
            }}
            className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition-colors hover:text-amber-300"
            aria-label="Изтрий избора"
          >
            Смени
          </button>
        </div>
      )}

      {/* Search input - hairline editorial */}
      {(!value || query) && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 1 && results.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Търсене на град…"
            className={`block w-full border-0 border-b bg-transparent px-1 py-2.5 pr-9 font-display text-[16px] text-slate-100 placeholder-slate-600 transition-colors focus:outline-none ${
              error
                ? 'border-rose-400/50 focus:border-rose-300/70'
                : 'border-white/[0.08] focus:border-amber-300/60'
            }`}
            aria-label="Търсене на град"
            aria-autocomplete="list"
            aria-expanded={isOpen}
          />

          {isLoading && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2" aria-hidden>
              <span
                className="block h-2 w-2 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                style={{ animation: 'spin 2.6s linear infinite' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Dropdown - mystic panel */}
      {isOpen && (
        <div className="mystic-panel absolute z-50 mt-2 max-h-72 w-full overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 && !isLoading && !fetchError && query.length >= 1 && (
              <div className="px-5 py-4 font-display text-[13px] text-slate-500">
                Няма намерени резултати
              </div>
            )}

            {fetchError && (
              <div className="px-5 py-4 font-display text-[13px] text-rose-300/90">
                {fetchError}
              </div>
            )}

            {query.length < 1 && results.length === 0 && (
              <div className="px-5 py-4 font-display text-[13px] text-slate-500">
                Въведи поне 1 символ
              </div>
            )}

            {results.map((city, index) => {
              const isHighlighted = index === highlightedIndex
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleSelect(city)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`group relative flex w-full items-center justify-between border-b border-white/[0.04] px-5 py-3 text-left transition-colors last:border-b-0 ${
                    isHighlighted
                      ? 'bg-gradient-to-r from-violet-500/[0.08] via-transparent to-amber-400/[0.05]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {isHighlighted && (
                    <span aria-hidden className="absolute left-1.5 top-1/2 h-1 w-1 -translate-y-1/2 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  )}
                  <div className="pl-2">
                    <span className="font-display text-[14.5px] font-medium text-slate-100">{city.name}</span>
                    <span className="ml-2 font-display text-[12px] text-slate-500">({city.oblast})</span>
                  </div>
                  <span className="font-cinzel text-[8.5px] font-semibold uppercase tracking-[0.26em] text-amber-300/70">
                    {TYPE_LABELS[city.type]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
