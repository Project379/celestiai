import { Text, View } from 'react-native'

/**
 * Shared numeral/eyebrow/title header + divider ornament used by every
 * /you/guide section. Mobile port of AstrologyGuideContent's SectionMark
 * + Divider (apps/web/components/astrology-guide/AstrologyGuideContent.tsx).
 * motion.section fade-up wrapper dropped per data-display discipline —
 * plain View, no entry animation.
 */
export function GuideSectionHeader({
  numeral,
  eyebrow,
  title,
}: {
  numeral: string
  eyebrow: string
  title: string
}) {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center" style={{ gap: 12 }}>
        <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
          {numeral}
        </Text>
        <View className="h-px w-8 bg-amber-300/40" />
        <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
          {eyebrow}
        </Text>
      </View>
      <Text className="text-[22px] font-semibold leading-[1.15] tracking-tight text-slate-100">
        {title}
      </Text>
    </View>
  )
}

export function GuideDivider() {
  return (
    <View className="my-10 flex-row items-center justify-center" style={{ gap: 12 }}>
      <View className="h-px flex-1 bg-slate-300/15" />
      <View className="h-1 w-1 rotate-45 bg-amber-300/80" />
      <View className="h-px flex-1 bg-slate-300/15" />
    </View>
  )
}
