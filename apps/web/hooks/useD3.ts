'use client'

import { useRef, useEffect, DependencyList } from 'react'
import { select, type Selection } from 'd3-selection'

/**
 * Hook for integrating D3.js with React
 *
 * Provides a ref to attach to an SVG element and handles D3 lifecycle:
 * - Clears previous content before re-render
 * - Calls renderFn with D3 selection when deps change
 *
 * @param renderFn Function that receives D3 selection and draws content
 * @param deps Dependency array to trigger re-render
 * @returns Ref to attach to SVG element
 */
export function useD3<T extends SVGSVGElement = SVGSVGElement>(
  renderFn: (svg: Selection<T, unknown, null, undefined>) => void,
  deps: DependencyList = []
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    // Clear previous content
    select(ref.current).selectAll('*').remove()

    // Render new content
    renderFn(select(ref.current))
  }, deps)

  return ref
}
