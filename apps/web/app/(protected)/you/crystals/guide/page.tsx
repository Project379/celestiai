import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { CrystalsGuideContent } from '@/components/astrology-guide/CrystalsGuideContent'

export const metadata: Metadata = {
  title: 'Ръководство за кристали',
  description:
    'Тридесет кристала, подредени по планета и лунна фаза — как Stellaeum ги избира и защо.',
}

export default async function CrystalsGuidePage() {
  let catalog: Array<{
    slug: string
    name_en: string
    color_primary: string
    color_secondary: string
    color_accent: string | null
    svg_variant: string
    rarity: string
  }> = []

  try {
    const supabase = createServiceSupabaseClient()
    const { data } = await supabase
      .from('crystals')
      .select(
        'slug, name_en, color_primary, color_secondary, color_accent, svg_variant, rarity'
      )
    catalog = data ?? []
  } catch (error) {
    console.error('Error loading crystal catalog for guide:', error)
  }

  return <CrystalsGuideContent catalog={catalog} />
}
