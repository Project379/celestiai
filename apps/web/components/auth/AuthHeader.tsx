export function AuthHeader() {
  return (
    <div className="mb-8 text-center">
      {/* Logo with cosmic gradient */}
      <h1
        className="text-4xl font-bold tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #6366F1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))',
        }}
      >
        Celestia AI
      </h1>

      {/* Bulgarian tagline */}
      <p className="mt-2 text-slate-400">
        Вашият астрологичен спътник
      </p>
    </div>
  )
}
