import type { Metadata } from 'next'
import { AstrologyGuideContent } from '@/components/astrology-guide/AstrologyGuideContent'

export const metadata: Metadata = {
  title: 'Какво е астрологията?',
  description:
    'Открий историята, принципите и науката зад астрологията - от древния Вавилон до швейцарската ефемерида, използвана от Stellaeum.',
}

export default function AstrologyGuidePage() {
  return <AstrologyGuideContent />
}
