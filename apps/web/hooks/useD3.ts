'use client'

import { useRef, useEffect, DependencyList } from 'react'
import * as d3 from 'd3'

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
  renderFn: (svg: d3.Selection<T, unknown, null, undefined>) => void,
  deps: DependencyList = []
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    // Clear previous content
    d3.select(ref.current).selectAll('*').remove()

    // Render new content
    renderFn(d3.select(ref.current))
  }, deps)

  return ref
}
