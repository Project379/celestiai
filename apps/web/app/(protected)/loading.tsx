import { LoadingAnimation } from '@/components/LoadingAnimation'

export default function ProtectedLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgb(var(--color-background))]">
      <div
        className="absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)',
        }}
      />
      <LoadingAnimation />
    </div>
  )
}
