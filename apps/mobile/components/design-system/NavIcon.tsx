import type { ReactNode } from 'react'
import { Platform, View } from 'react-native'

import { color } from './tokens'

// Phase 0 foundation — the navbar's active-state indicator. Deliberately
// violet, not bronze and not the cool token: this chrome is temperature-
// neutral connective tissue present on both warm and cool screens, and
// violet is the one color already established as cross-temperature
// ground rather than either accent (see WARM_COOL_AMENDMENT.md's R4
// re-amendment). A small lit point beneath the glyph, not a filled pill
// or a colored background chip.
export function NavIcon({ children, focused }: { children: ReactNode; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {children}
      <View
        style={{
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: focused ? color.violet : 'transparent',
          // Glow only reads on iOS (RN shadow props); Android would need
          // elevation, which draws its own box shadow/border and reads
          // wrong on a 3px dot — accepted platform degradation rather
          // than fake it with an elevation halo.
          ...(Platform.OS === 'ios' && focused
            ? {
                shadowColor: color.violet,
                shadowOpacity: 0.8,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
              }
            : null),
        }}
      />
    </View>
  )
}
