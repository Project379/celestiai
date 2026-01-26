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
  city: 'grad',
  town: 'gradche',
  village: 'selo',
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

  // Search function
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

      if (!response.ok) {
        throw new Error('Greshka pri tarsene')
      }

      const data = await response.json()
      setResults(data)
      setIsOpen(true)
      setHighlightedIndex(-1)
    } catch (err) {
      setFetchError('Greshka pri tarsene')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length >= 1) {
      debounceRef.current = setTimeout(() => {
        searchCities(query)
      }, 300)
    } else {
      setResults([])
      setIsOpen(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, searchCities])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle selection
  const handleSelect = (city: City) => {
    onSelect(city)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  // Keyboard navigation
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
    <div ref={containerRef} className="relative mt-1">
      {/* Selected city display */}
      {value && !query && (
        <div className="flex items-center justify-between rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-3">
          <span className="text-sm font-medium text-purple-300">{value}</span>
          <button
            type="button"
            onClick={() => {
              onSelect({ id: '', name: '', oblast: '', type: 'city', latitude: 0, longitude: 0 })
              inputRef.current?.focus()
            }}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Iztrii izbora"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search input */}
      {(!value || query) && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 1 && results.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Tarsete grad..."
            className={`block w-full rounded-lg border bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-600 focus:border-purple-500 focus:ring-purple-500'
            }`}
            aria-label="Tarsene na grad"
            aria-autocomplete="list"
            aria-expanded={isOpen}
          />

          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-5 w-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-600/50 bg-slate-800/95 shadow-xl backdrop-blur-xl">
          {/* Empty state */}
          {results.length === 0 && !isLoading && !fetchError && query.length >= 1 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              Niama namereni rezultati
            </div>
          )}

          {/* Error state */}
          {fetchError && (
            <div className="px-4 py-3 text-sm text-red-400">
              {fetchError}
            </div>
          )}

          {/* Min chars hint */}
          {query.length < 1 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              Vavedete pone 1 simvol
            </div>
          )}

          {/* Results list */}
          {results.map((city, index) => (
            <button
              key={city.id}
              type="button"
              onClick={() => handleSelect(city)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                index === highlightedIndex
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <div>
                <span className="font-medium">{city.name}</span>
                <span className="ml-2 text-sm text-slate-400">({city.oblast})</span>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${
                city.type === 'city'
                  ? 'bg-purple-500/20 text-purple-300'
                  : city.type === 'town'
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-slate-600/50 text-slate-400'
              }`}>
                {TYPE_LABELS[city.type]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
