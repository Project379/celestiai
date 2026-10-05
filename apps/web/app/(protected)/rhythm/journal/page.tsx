import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DiaryApp } from '@/components/diary/DiaryApp'

export const metadata: Metadata = {
  title: 'Дневник',
  description: 'Проверки със себе си, свободно писане и лунни практики.',
}

export default function ManifestPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-sm text-slate-500">Зареждане…</div>}>
      <DiaryApp />
    </Suspense>
  )
}
