'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BirthData } from '@stellaeum/core/charts/schemas'
import type { CompatibilityDomainKey, RelationshipType } from '@stellaeum/core/relationships/types'
import { SavedProfileForm } from '@/components/circle/SavedProfileForm'
import { PremiumLock, LockBadge } from '@/components/tier/PremiumLock'
import {
  KRUG_SECOND_PROFILE_LOCKED,
  KRUG_INVITE_LOCKED,
  KRUG_REPORT_LOCKED,
} from '@/lib/tier/locked-copy'
import type {
  CircleDashboardData,
  CircleSpaceView,
  ConnectionReportContent,
  ConnectionReportSection,
  SavedProfileReportContent,
} from '@/lib/circle/types'

/**
 * Compact locked affordance for a button row — a padlock + short label
 * where a premium user would see an action button. (tier item 5, Кръг)
 */
function LockedAction({ label }: { label: string }) {
  return (
    <span
      role="note"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200/15 bg-black/20 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-slate-400"
    >
      <LockBadge />
      {label}
    </span>
  )
}

const DOMAIN_LABELS: Record<CompatibilityDomainKey, string> = {
  emotional_resonance: 'Емоционален резонанс',
  communication: 'Комуникация',
  romance_attraction: 'Романтика и привличане',
  long_term_stability: 'Дългосрочна стабилност',
  conflict_friction: 'Конфликт и триене',
  growth_expansion: 'Растеж и разгръщане',
  power_dynamics: 'Сила и контрол',
  shared_values: 'Споделени ценности',
}

const TYPE_LABELS: Record<RelationshipType, string> = {
  romantic: 'Романтична',
  friendship: 'Приятелска',
  work: 'Работна',
  family: 'Семейна',
}

const TYPE_BLURB: Record<RelationshipType, string> = {
  romantic: 'Точно двама души, само една активна романтична връзка на потребител.',
  friendship: 'Приятелски кръг, към който може да се добавят още хора.',
  work: 'Работен кръг за екипна динамика и общ ритъм.',
  family: 'Семейно пространство с общо табло и групов прочит.',
}

const WEATHER_TONE_LABELS = {
  supportive: 'мек прозорец',
  challenging: 'повече триене',
  mixed: 'смесен заряд',
  quiet: 'спокоен ритъм',
} as const

type Surface = 'connections' | 'crush'

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error ?? 'Грешка при заявката')
  }
  return json
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('bg-BG')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('bg-BG')
}

function DomainSectionPreview({
  title,
  section,
}: {
  title: string
  section: ConnectionReportSection
}) {
  return (
    <div className="rounded-2xl border border-slate-200/10 bg-slate-950/20 p-5">
      <p className="font-cinzel text-[9px] uppercase tracking-[0.24em] text-amber-200/80">
        {title}
      </p>
      <p className="mt-3 font-display text-base text-white">{section.headline}</p>
      <p className="mt-3 text-sm leading-7 text-slate-300">{section.core}</p>
    </div>
  )
}

export function CircleHub({ data }: { data: CircleDashboardData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null)
  const [surface, setSurface] = useState<Surface>('connections')
  const [label, setLabel] = useState('')
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('romantic')
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(data.spaces[0]?.space.id ?? null)
  const [savedProfileRelationshipType, setSavedProfileRelationshipType] = useState<RelationshipType>('romantic')
  const [selectedSavedProfileId, setSelectedSavedProfileId] = useState<string | null>(data.savedProfiles[0]?.id ?? null)
  const [inviteLinks, setInviteLinks] = useState<Record<string, { shareUrl: string; expiresAt: string }>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('circle.connectionInvites')
    if (!raw) return
    try {
      setInviteLinks(JSON.parse(raw) as Record<string, { shareUrl: string; expiresAt: string }>)
    } catch {
      window.localStorage.removeItem('circle.connectionInvites')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('circle.connectionInvites', JSON.stringify(inviteLinks))
  }, [inviteLinks])

  const selectedSpace = data.spaces.find((item) => item.space.id === selectedSpaceId) ?? null
  const selectedReportContent = selectedSpace?.latestReport?.report_content as ConnectionReportContent | undefined
  const selectedSavedProfile = data.savedProfiles.find((profile) => profile.id === selectedSavedProfileId) ?? null
  const selectedSavedProfileReport = selectedSavedProfile
    ? data.latestSavedProfileReports[selectedSavedProfile.id]
    : null
  const selectedSavedProfileContent = selectedSavedProfileReport?.report_content as SavedProfileReportContent | undefined

  useEffect(() => {
    if (!selectedSavedProfileReport) {
      setSavedProfileRelationshipType('romantic')
      return
    }
    setSavedProfileRelationshipType(selectedSavedProfileReport.relationship_type)
  }, [selectedSavedProfileReport])

  const domainEntries = useMemo(() => {
    if (!selectedSpace) return []
    return (Object.entries(selectedSpace.space.compatibility_summary.domains) as Array<
      [CompatibilityDomainKey, (typeof selectedSpace.space.compatibility_summary.domains)[CompatibilityDomainKey]]
    >).sort((left, right) => right[1].score - left[1].score)
  }, [selectedSpace])

  const savedProfileEntries = useMemo(() => {
    if (!selectedSavedProfileReport) return []
    return (Object.entries(selectedSavedProfileReport.domain_scores.domains) as Array<
      [CompatibilityDomainKey, (typeof selectedSavedProfileReport.domain_scores.domains)[CompatibilityDomainKey]]
    >).sort((left, right) => right[1].score - left[1].score)
  }, [selectedSavedProfileReport])

  const romanticSpace = data.spaces.find((item) => item.space.relationship_type === 'romantic' && item.space.status === 'active')

  const pendingInvites = data.pendingInvites.map((invite) => ({
    ...invite,
    shareUrl: inviteLinks[invite.id]?.shareUrl ?? null,
  }))

  const handleCreateInvite = (existingSpaceId?: string, forcedType?: RelationshipType, forcedLabel?: string | null) => {
    startTransition(async () => {
      setError(null)
      setInviteFeedback(null)
      try {
        const res = await fetch('/api/circle/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chartId: data.chartId,
            label: forcedLabel ?? (label.trim() || undefined),
            relationshipType: forcedType ?? relationshipType,
            existingSpaceId,
          }),
        })
        const json = await readJson(res)
        setInviteLinks((current) => ({
          ...current,
          [json.inviteId as string]: {
            shareUrl: json.shareUrl as string,
            expiresAt: json.expiresAt as string,
          },
        }))
        setInviteFeedback('Поканата е готова за споделяне.')
        setLabel('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да създадем поканата.')
      }
    })
  }

  const handleCancelInvite = (inviteId: string) => {
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/circle/invites/${inviteId}`, { method: 'DELETE' })
        await readJson(res)
        setInviteLinks((current) => {
          const next = { ...current }
          delete next[inviteId]
          return next
        })
        setInviteFeedback('Поканата е отменена.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да отменим поканата.')
      }
    })
  }

  const handleGenerateReport = () => {
    if (!selectedSpace) return
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/circle/relationships/${selectedSpace.space.id}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipType: selectedSpace.space.relationship_type }),
        })
        await readJson(res)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да генерираме доклада.')
      }
    })
  }

  const handleArchive = () => {
    if (!selectedSpace) return
    const confirmed = window.confirm('Архивиране на това пространство?')
    if (!confirmed) return

    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/circle/relationships/${selectedSpace.space.id}/archive`, {
          method: 'POST',
        })
        await readJson(res)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да архивираме пространството.')
      }
    })
  }

  const copyInviteLink = async (inviteId: string, shareUrl: string | null) => {
    if (!shareUrl || typeof window === 'undefined' || !window.navigator.clipboard) return
    await window.navigator.clipboard.writeText(shareUrl)
    setInviteFeedback(`Линкът за покана ${inviteId.slice(0, 6)} е копиран.`)
  }

  const shareInviteLink = async (shareUrl: string | null) => {
    if (!shareUrl || typeof navigator === 'undefined' || !('share' in navigator)) return
    await navigator.share({
      title: 'Stellaeum Circle',
      text: `Присъедини се към моето пространство в Stellaeum: ${shareUrl}`,
      url: shareUrl,
    })
  }

  const handleCreateSavedProfile = async (payload: BirthData) => {
    const res = await fetch('/api/circle/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await readJson(res)
    if (json?.id) {
      setSelectedSavedProfileId(json.id as string)
      setSurface('crush')
    }
    router.refresh()
  }

  const handleAnalyzeSavedProfile = (profileId: string) => {
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/circle/profiles/${profileId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipType: savedProfileRelationshipType }),
        })
        await readJson(res)
        setSelectedSavedProfileId(profileId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да анализираме профила.')
      }
    })
  }

  const handleDeleteSavedProfile = (profileId: string) => {
    const confirmed = window.confirm('Изтриване на този crush профил?')
    if (!confirmed) return
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/circle/profiles/${profileId}`, { method: 'DELETE' })
        await readJson(res)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не успяхме да изтрием профила.')
      }
    })
  }

  if (!data.chartId) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Кръг
          </p>
          <h1 className="font-display text-[2.125rem] font-light leading-[1.2] tracking-tight text-slate-100 sm:text-[2.75rem]">
            Връзките започват от твоята карта.
          </h1>
          <p className="mt-5 max-w-2xl font-display text-[15.5px] font-light leading-[1.85] text-slate-300">
            Преди connection spaces или crush compatibility, Stellaeum трябва да има твоята натална карта като база.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/10 bg-slate-950/35 p-8">
          <p className="font-display text-lg text-slate-100">Преди връзка ти трябва натална карта.</p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
            Кръг използва твоята карта като база за съвместимостта. Въведи рождените си данни и се върни тук.
          </p>
          <Link
            href="/birth-data"
            className="mt-6 inline-flex items-center rounded-full border border-amber-300/30 px-5 py-2 font-cinzel text-[10px] uppercase tracking-[0.3em] text-amber-200 transition-colors hover:border-amber-200/60 hover:text-white"
          >
            Въведи данните
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10">
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Кръг
        </p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-[2.125rem] font-light leading-[1.2] tracking-tight text-slate-100 sm:text-[2.75rem]">
              Лични връзки и групови ритми.
            </h1>
            <p className="mt-5 max-w-3xl font-display text-[15.5px] font-light leading-[1.85] text-slate-300">
              Романтичната връзка остава отделен слой, но приятелските и работните пространства могат да растат в групи и да имат собствен astral weather.
            </p>
          </div>

          <div className="inline-flex rounded-full border border-slate-200/10 bg-slate-950/45 p-1">
            {(['connections', 'crush'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSurface(value)}
                className={`rounded-full px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] transition-colors ${
                  surface === value
                    ? 'bg-amber-400/12 text-amber-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {value === 'connections' ? 'Connections' : 'Crush'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {surface === 'connections' ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/35 p-8">
              <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-violet-200">
                Ново пространство
              </p>
              <div className="mt-5 grid gap-4">
                <select
                  value={relationshipType}
                  onChange={(event) => setRelationshipType(event.target.value as RelationshipType)}
                  className="rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                >
                  {Object.entries(TYPE_LABELS).map(([value, labelText]) => (
                    <option key={value} value={value}>
                      {labelText}
                    </option>
                  ))}
                </select>
                <p className="text-sm leading-7 text-slate-400">{TYPE_BLURB[relationshipType]}</p>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={
                    relationshipType === 'romantic'
                      ? `${data.chartName ?? 'Ние'} & ...`
                      : relationshipType === 'friendship'
                        ? 'Име на приятелския кръг'
                        : relationshipType === 'work'
                          ? 'Име на екипа'
                          : 'Име на пространството'
                  }
                  className="w-full rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
                {data.tier === 'premium' ? (
                  <button
                    type="button"
                    disabled={isPending || (relationshipType === 'romantic' && Boolean(romanticSpace))}
                    onClick={() => handleCreateInvite()}
                    className="rounded-full border border-violet-300/35 bg-violet-500/10 px-5 py-2.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-violet-100 disabled:opacity-50"
                  >
                    {isPending ? 'Създаване...' : 'Създай покана'}
                  </button>
                ) : (
                  <LockedAction label={KRUG_INVITE_LOCKED} />
                )}
                {relationshipType === 'romantic' && romanticSpace && (
                  <p className="text-sm leading-7 text-slate-400">
                    Вече имаш активна романтична връзка. Можеш да създаваш само приятелски, работни или семейни пространства допълнително.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/25 p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-slate-300">
                    Твоите пространства
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    Романтичното пространство е ограничено до двама души. Приятелските и работните кръгове могат да растат.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.spaces.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/10 bg-black/20 p-5 text-sm leading-7 text-slate-400">
                    Още нямаш connection space.
                  </div>
                ) : (
                  data.spaces.map((item) => (
                    <button
                      key={item.space.id}
                      type="button"
                      onClick={() => setSelectedSpaceId(item.space.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left ${
                        selectedSpaceId === item.space.id
                          ? 'border-amber-300/35 bg-amber-500/8'
                          : 'border-slate-200/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-[17px] text-slate-100">
                            {item.space.label || TYPE_LABELS[item.space.relationship_type]}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {TYPE_LABELS[item.space.relationship_type]} · {item.members.length} член{item.members.length === 1 ? '' : 'а'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl text-white">
                            {item.space.member_count >= 2 ? item.space.compatibility_summary.headline_score : '—'}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {item.space.status}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/25 p-8">
              <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-slate-300">
                Активни покани
              </p>
              <div className="mt-5 space-y-4">
                {pendingInvites.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/10 bg-black/20 p-5 text-sm leading-7 text-slate-400">
                    Няма чакащи покани.
                  </div>
                ) : (
                  pendingInvites.map((invite) => (
                    <div key={invite.id} className="rounded-2xl border border-slate-200/10 bg-black/20 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-[16px] text-slate-100">
                            {invite.invite_label || TYPE_LABELS[invite.relationship_type]}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {TYPE_LABELS[invite.relationship_type]} · изтича {formatDateTime(invite.expires_at)}
                          </p>
                        </div>
                      </div>
                      {invite.shareUrl && (
                        <div className="mt-4 rounded-2xl border border-slate-200/10 bg-slate-950/30 p-4 text-sm text-slate-300">
                          {invite.shareUrl}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {invite.shareUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => copyInviteLink(invite.id, invite.shareUrl)}
                              className="rounded-full border border-amber-300/30 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-amber-100"
                            >
                              Копирай линка
                            </button>
                            {typeof navigator !== 'undefined' && 'share' in navigator && (
                              <button
                                type="button"
                                onClick={() => shareInviteLink(invite.shareUrl)}
                                className="rounded-full border border-violet-300/30 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-violet-100"
                              >
                                Сподели
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleCancelInvite(invite.id)}
                          className="rounded-full border border-slate-200/15 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-slate-300 disabled:opacity-50"
                        >
                          Отмени
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {inviteFeedback && <p className="mt-4 text-sm text-emerald-200/90">{inviteFeedback}</p>}
            </article>
          </section>

          <section>
            {selectedSpace ? (
              <div className="space-y-6">
                <article className="rounded-[30px] border border-slate-200/10 bg-gradient-to-br from-violet-500/10 via-slate-950/35 to-amber-500/5 p-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-slate-300">
                        Споделено пространство
                      </p>
                      <h2 className="mt-4 font-display text-[1.9rem] font-light text-white sm:text-[2.35rem]">
                        {selectedSpace.space.label || TYPE_LABELS[selectedSpace.space.relationship_type]}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                        {TYPE_LABELS[selectedSpace.space.relationship_type]} · създадено на {formatDate(selectedSpace.space.connection_date)} · {selectedSpace.members.length} член{selectedSpace.members.length === 1 ? '' : 'а'}.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-amber-300/20 bg-black/20 px-6 py-5 text-center">
                      <p className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-amber-200/90">
                        Headline score
                      </p>
                      <p className="mt-2 font-display text-5xl font-light text-white">
                        {selectedSpace.space.member_count >= 2 ? selectedSpace.space.compatibility_summary.headline_score : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {selectedSpace.members.map((member) => (
                      <span
                        key={member.id}
                        className="rounded-full border border-slate-200/10 bg-black/20 px-3 py-1 text-sm text-slate-300"
                      >
                        {member.chart_name || 'Член'}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {selectedSpace.space.member_count >= 2 &&
                      (data.tier === 'premium' ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={handleGenerateReport}
                          className="rounded-full border border-amber-300/30 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-amber-100 disabled:opacity-50"
                        >
                          {isPending ? 'Генериране...' : selectedSpace.latestReport ? 'Регенерирай доклада' : 'Генерирай доклад'}
                        </button>
                      ) : (
                        <LockedAction label={KRUG_REPORT_LOCKED} />
                      ))}
                    {selectedSpace.space.relationship_type !== 'romantic' &&
                      (data.tier === 'premium' ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleCreateInvite(
                              selectedSpace.space.id,
                              selectedSpace.space.relationship_type,
                              selectedSpace.space.label,
                            )
                          }
                          className="rounded-full border border-violet-300/30 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-violet-100 disabled:opacity-50"
                        >
                          Покани още човек
                        </button>
                      ) : (
                        <LockedAction label={KRUG_INVITE_LOCKED} />
                      ))}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleArchive}
                      className="rounded-full border border-slate-200/15 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-slate-300 disabled:opacity-50"
                    >
                      Архивирай
                    </button>
                  </div>
                </article>

                {selectedSpace.weather && (
                  <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/35 p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-slate-300">
                          Group weather
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{selectedSpace.weather.summary}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-3 text-right">
                        <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-500">
                          тон
                        </p>
                        <p className="mt-2 font-display text-lg text-white">
                          {WEATHER_TONE_LABELS[selectedSpace.weather.tone]}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      {selectedSpace.weather.days.slice(0, 4).map((day) => (
                        <div key={day.date} className="rounded-2xl border border-slate-200/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-display text-[16px] text-white">{day.label}</p>
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {WEATHER_TONE_LABELS[day.tone]}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-300">{day.headline}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                )}

                {selectedSpace.space.member_count >= 2 && (
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {domainEntries.map(([key, domain]) => (
                      <article key={key} className="rounded-[24px] border border-slate-200/10 bg-slate-950/35 p-5">
                        <p className="font-cinzel text-[9px] uppercase tracking-[0.26em] text-slate-400">
                          {DOMAIN_LABELS[key]}
                        </p>
                        <div className="mt-3 flex items-end justify-between">
                          <span className="font-display text-4xl font-light text-white">{domain.score}</span>
                          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">/100</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{domain.headline}</p>
                      </article>
                    ))}
                  </section>
                )}

                <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/30 p-8">
                    <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-slate-300">
                      Водещи аспекти
                    </p>
                    <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
                      {selectedSpace.space.compatibility_summary.notable_aspects.slice(0, 6).map((item, index) => (
                        <li key={`${item.domain}:${item.description}:${index}`} className="rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span>{item.description}</span>
                            <span className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-amber-200/90">
                              {DOMAIN_LABELS[item.domain]}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/35 p-8">
                    <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-slate-300">
                      Последен доклад
                    </p>
                    {selectedReportContent ? (
                      <div className="mt-5 space-y-6">
                        <div className="rounded-2xl border border-slate-200/10 bg-black/20 p-5">
                          <p className="font-display text-lg text-white">{selectedReportContent.overview.title}</p>
                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            {selectedReportContent.overview.summary}
                          </p>
                        </div>
                        {Object.entries(selectedReportContent.domains).slice(0, 3).map(([key, section]) => (
                          <DomainSectionPreview
                            key={key}
                            title={DOMAIN_LABELS[key as CompatibilityDomainKey]}
                            section={section}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-slate-200/10 bg-black/20 p-5 text-sm leading-7 text-slate-400">
                        Още няма запазен доклад за това пространство.
                      </div>
                    )}
                  </article>
                </section>
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200/10 bg-slate-950/30 p-8 text-sm leading-7 text-slate-400">
                Избери пространство отляво, за да видиш общия му ритъм.
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/35 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-rose-200">
                  Crush compatibility
                </p>
                <p className="mt-4 max-w-xl font-display text-[16px] leading-8 text-slate-300">
                  Запази профил на човек, който те интересува, и виж еднопосочен прочит от твоя гледна точка.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-3 text-right">
                <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-500">
                  Tier
                </p>
                <p className="mt-2 font-display text-lg text-white">{data.tier === 'premium' ? 'Premium' : 'Free'}</p>
              </div>
            </div>

            <div className="mt-7">
              {data.tier !== 'premium' && data.savedProfiles.length >= 1 ? (
                <PremiumLock
                  title={KRUG_SECOND_PROFILE_LOCKED.title}
                  sub={KRUG_SECOND_PROFILE_LOCKED.sub}
                />
              ) : (
                <SavedProfileForm isSubmitting={isPending} onSubmit={handleCreateSavedProfile} />
              )}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200/10 bg-slate-950/25 p-8">
            <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-slate-300">
              Запазени профили
            </p>
            {data.savedProfiles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-200/10 bg-black/20 p-5 text-sm leading-7 text-slate-400">
                Все още няма запазен crush профил.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid gap-3">
                  {data.savedProfiles.map((profile) => {
                    const report = data.latestSavedProfileReports[profile.id]
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedSavedProfileId(profile.id)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                          selectedSavedProfileId === profile.id
                            ? 'border-rose-300/35 bg-rose-500/8'
                            : 'border-slate-200/10 bg-black/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-display text-[16px] text-slate-100">{profile.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                              {profile.city_name}
                            </p>
                          </div>
                          {report && (
                            <div className="text-right">
                              <p className="font-display text-2xl text-white">{report.headline_score}</p>
                              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                {report.is_full ? 'Full' : 'Teaser'}
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedSavedProfile && (
                  <div className="rounded-2xl border border-slate-200/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={savedProfileRelationshipType}
                        onChange={(event) => setSavedProfileRelationshipType(event.target.value as RelationshipType)}
                        className="rounded-full border border-slate-200/10 bg-slate-950/35 px-4 py-2 text-sm text-slate-100 outline-none"
                      >
                        {Object.entries(TYPE_LABELS).map(([value, labelText]) => (
                          <option key={value} value={value}>
                            {labelText}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAnalyzeSavedProfile(selectedSavedProfile.id)}
                        className="rounded-full border border-rose-300/35 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-rose-100 disabled:opacity-50"
                      >
                        {isPending ? 'Анализ...' : selectedSavedProfileReport ? 'Обнови анализа' : 'Анализирай'}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeleteSavedProfile(selectedSavedProfile.id)}
                        className="rounded-full border border-slate-200/15 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-slate-300 disabled:opacity-50"
                      >
                        Изтрий профила
                      </button>
                    </div>

                    {selectedSavedProfileReport && selectedSavedProfileContent ? (
                      <div className="mt-6 space-y-5">
                        <div className="rounded-2xl border border-slate-200/10 bg-slate-950/35 p-5">
                          <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                              <p className="font-cinzel text-[9px] uppercase tracking-[0.24em] text-rose-200/80">
                                Headline score
                              </p>
                              <div className="mt-2 flex items-end gap-3">
                                <span className="font-display text-5xl font-light text-white">
                                  {selectedSavedProfileReport.headline_score}
                                </span>
                                <span className="pb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                                  /100
                                </span>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-3 text-right">
                              <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-500">
                                lens
                              </p>
                              <p className="mt-2 font-display text-base text-white">
                                {TYPE_LABELS[selectedSavedProfileReport.relationship_type]}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-7 text-slate-300">
                            {selectedSavedProfileContent.overview.summary}
                          </p>
                        </div>

                        {selectedSavedProfileContent.snapshot && (
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200/10 bg-slate-950/20 p-4">
                              <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-rose-200/80">
                                Какво те дърпа
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-300">
                                {selectedSavedProfileContent.snapshot.pull}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/10 bg-slate-950/20 p-4">
                              <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-amber-200/80">
                                Какво ще искаш
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-300">
                                {selectedSavedProfileContent.snapshot.need}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/10 bg-slate-950/20 p-4">
                              <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-300">
                                Къде можеш да сгрешиш
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-300">
                                {selectedSavedProfileContent.snapshot.misread}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedSavedProfileContent.mode === 'full' && savedProfileEntries.length > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {savedProfileEntries.slice(0, 4).map(([key, domain]) => (
                              <div key={key} className="rounded-2xl border border-slate-200/10 bg-slate-950/20 p-4">
                                <p className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-400">
                                  {DOMAIN_LABELS[key]}
                                </p>
                                <p className="mt-2 font-display text-3xl text-white">{domain.score}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-300">{domain.headline}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedSavedProfileContent.mode === 'teaser' ? (
                          <div className="rounded-2xl border border-amber-300/20 bg-amber-500/5 p-5">
                            <p className="font-display text-[16px] text-slate-100">
                              {selectedSavedProfileContent.teaser}
                            </p>
                            <Link
                              href="/pricing"
                              className="mt-4 inline-flex rounded-full border border-amber-300/35 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.28em] text-amber-100"
                            >
                              Отключи пълния прочит
                            </Link>
                          </div>
                        ) : selectedSavedProfileContent.domains ? (
                          <div className="space-y-4">
                            {Object.entries(selectedSavedProfileContent.domains).slice(0, 3).map(([key, section]) => (
                              <DomainSectionPreview
                                key={key}
                                title={DOMAIN_LABELS[key as CompatibilityDomainKey]}
                                section={section}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-6 rounded-2xl border border-slate-200/10 bg-slate-950/20 p-5 text-sm leading-7 text-slate-400">
                        Натисни „Анализирай“, за да изчислиш първия прочит за {selectedSavedProfile.name}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>
        </section>
      )}
    </div>
  )
}
