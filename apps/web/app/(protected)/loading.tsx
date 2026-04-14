import { LoadingAnimation } from '@/components/LoadingAnimation'

export default function ProtectedLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04030a]/85 backdrop-blur-sm">
      {/* Ambient violet halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 520,
          height: 520,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.05) 38%, transparent 72%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Amber hair halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <LoadingAnimation />
    </div>
  )
}
