type PlusIconProps = {
  className?: string
  strokeWidth?: number
}

export function PlusIcon({ className = 'h-4 w-4', strokeWidth = 2 }: PlusIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  )
}
