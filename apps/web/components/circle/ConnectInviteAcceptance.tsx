'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RelationshipType } from '@stellaeum/core/relationships/types'

const TYPE_LABELS: Record<RelationshipType, string> = {
  romantic: 'романтична връзка',
  friendship: 'приятелски кръг',
  work: 'работен кръг',
  family: 'семейно пространство',
}

export function ConnectInviteAcceptance({
  token,
  inviterName,
  label,
  relationshipType,
  memberCount,
}: {
  token: string
  inviterName: string
  label: string | null
  relationshipType: RelationshipType
  memberCount: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleAccept = () => {
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch('/api/circle/invites/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.error ?? 'Не успяхме да приемем поканата.')
        }
        router.push('/circle')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да приемем поканата.')
      }
    })
  }

  const title =
    label ||
    (relationshipType === 'romantic'
      ? `${inviterName} иска да свържете картите си.`
      : `${inviterName} те кани в ${TYPE_LABELS[relationshipType]}.`)

  return (
    <div className="rounded-[30px] border border-slate-200/10 bg-slate-950/35 p-8">
      <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-violet-200">
        Покана за Кръг
      </p>
      <h1 className="mt-4 font-display text-[2rem] font-light text-white sm:text-[2.5rem]">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-300">
        Ще се присъединиш към {TYPE_LABELS[relationshipType]} в Stellaeum. След приемане ще виждаш
        общото пространство, груповия compatibility прочит и актуалния astral weather слой.
        {memberCount > 0 ? ` В момента в това пространство има ${memberCount} ${memberCount === 1 ? 'човек' : 'души'}.` : ''}
      </p>
      {error && (
        <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleAccept}
          className="rounded-full border border-amber-300/35 bg-amber-500/10 px-5 py-2.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-amber-100 disabled:opacity-50"
        >
          {isPending ? 'Присъединяване...' : 'Приеми поканата'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/circle')}
          className="rounded-full border border-slate-200/15 px-5 py-2.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-slate-300"
        >
          По-късно
        </button>
      </div>
    </div>
  )
}
