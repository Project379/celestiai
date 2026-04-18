import type { Metadata } from 'next'
import { ManifestDiaryContent } from '@/components/manifest/ManifestDiaryContent'

export const metadata: Metadata = {
  title: 'Лунен дневник',
  description: 'Три реда на ден, водени от лунната фаза — манифестация, благодарност, освобождаване.',
}

export default function ManifestPage() {
  return (
    <div className="px-4 pb-16 pt-8 sm:px-6">
      <ManifestDiaryContent />
    </div>
  )
}
