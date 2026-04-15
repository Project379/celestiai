export function AboutSection() {
  return (
    <section id="about" className="relative py-24">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-20 -z-10 h-[320px] w-[320px] rounded-full bg-violet-500/[0.07] blur-[100px]"
      />

      <div className="container mx-auto max-w-3xl px-4">
        {/* Editorial header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3" aria-hidden>
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-300/50" />
            <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-300/50" />
          </div>
          <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
            За нас
          </p>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-[2.5rem]">
            <span className="font-light italic text-slate-400">Астрология, </span>
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.15)]">
              написана за теб.
            </span>
          </h2>
        </div>

        {/* Editorial prose */}
        <div className="mx-auto max-w-2xl space-y-5 text-center font-display text-[16px] leading-[1.85] text-slate-300/90">
          <p>
            Celestia AI е твоят личен астрологичен придружител - създаден специално за българи. Комбинираме вековната мъдрост на астрологията с най-новите технологии, за да ти дадем нещо наистина полезно.
          </p>
          <p>
            Вярваме, че астрологията трябва да е <span className="text-slate-100">достъпна, точна и лична</span>. Затова използваме Swiss Ephemeris за прецизни изчисления и AI модели, които пишат тълкувания специално за теб.
          </p>
          <p className="italic text-slate-400">
            Звездите имат какво да ти кажат за живота, връзките и потенциала ти. С Celestia тези прозрения са само на един клик разстояние.
          </p>
        </div>

        {/* Editorial stats - hairline row */}
        <div className="mt-14 border-y border-white/[0.06]">
          <dl className="grid grid-cols-3 divide-x divide-white/[0.05]">
            {[
              { value: '10k+',  label: 'Потребители' },
              { value: '50k+',  label: 'Карти'       },
              { value: '99.9%', label: 'Точност'     },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-7">
                <dt className="font-display text-[1.75rem] font-light tabular-nums tracking-tight text-slate-100 sm:text-[2rem]">
                  <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent">
                    {stat.value}
                  </span>
                </dt>
                <dd className="mt-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
