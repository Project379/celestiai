import { DIARY_MOODS, DIARY_TOPICS } from '@stellaeum/core/diary/flow'
import { DIARY_FEELING_COLORS, getDiaryReviewTone, type DiaryReviewCardProps } from '@stellaeum/core/diary/review'

export function DiaryWeeklyReview({ period, summary, error, canGoNext, onPrevious, onNext }: DiaryReviewCardProps) {
  const tone = getDiaryReviewTone(summary?.feelings)
  const feelings = DIARY_MOODS.filter((item) => (summary?.feelings?.[item.feeling] ?? 0) > 0)
  const topics = Object.entries(summary?.topics ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 3)
  const steps = Object.values(summary?.steps ?? {}).reduce((total, count) => total + count, 0)

  return <section aria-label="Седмичен преглед" className="mb-9 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-colors sm:p-7" style={tone ? { borderColor: `${tone.color}40`, background: `radial-gradient(ellipse at top left, ${tone.color}18, transparent 75%), rgba(255,255,255,0.025)` } : undefined}>
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-xl text-slate-100">Седмичен преглед</h2><p className="mt-1 text-xs text-slate-400">{period.label}</p></div>
      <nav aria-label="Седмици" className="flex gap-1"><button type="button" aria-label="Предишна седмица" onClick={onPrevious} className="h-10 w-10 rounded-full text-xl text-slate-300 hover:bg-white/5">‹</button><button type="button" aria-label="Следваща седмица" disabled={!canGoNext} onClick={onNext} className="h-10 w-10 rounded-full text-xl text-slate-300 hover:bg-white/5 disabled:opacity-25">›</button></nav>
    </div>
    {!summary ? <p role="status" className="mt-6 text-sm text-slate-400">{error ? 'Не успяхме да заредим прегледа.' : 'Зареждане…'}</p> : <>
      <p className="mt-4 text-xs text-slate-500">{summary.entryCount} {summary.entryCount === 1 ? 'запис' : 'записа'}</p>
      {tone && <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3"><p className="text-xs text-slate-400">Общо усещане</p><p className="font-display text-xl" style={{ color: tone.color }}>{tone.label}</p></div>
        <div role="img" aria-label={`Средно усещане: ${tone.label}, от тъжно към радостно`} className="relative mt-4 h-1.5 rounded-full" style={{ background: `linear-gradient(to right, ${Object.values(DIARY_FEELING_COLORS).join(', ')})` }}><span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950" style={{ left: `${tone.position * 100}%`, backgroundColor: tone.color, boxShadow: `0 0 12px ${tone.color}80` }} /></div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>Тъжно</span><span>Радостно</span></div>
      </div>}
      <div className="mt-6 flex flex-wrap gap-2">{feelings.length ? feelings.map((item) => <span key={item.feeling} className="rounded-full px-3 py-1.5 text-xs" style={{ color: DIARY_FEELING_COLORS[item.feeling], backgroundColor: `${DIARY_FEELING_COLORS[item.feeling]}12` }}>{item.label} · {summary.feelings![item.feeling]}</span>) : <p className="text-sm text-slate-500">Няма отбелязани чувства за тази седмица.</p>}</div>
      {(topics.length > 0 || steps > 0) && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-5"><div className="flex flex-wrap gap-2">{topics.map(([topic, count]) => <span key={topic} className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs text-slate-400">{DIARY_TOPICS.find((item) => item.value === topic)?.label ?? topic} · {count}</span>)}</div>{steps > 0 && <p className="text-xs text-slate-400">Лични стъпки · {steps}</p>}</div>}
    </>}
  </section>
}
