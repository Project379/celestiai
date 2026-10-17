import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { DIARY_MOODS, DIARY_TOPICS } from '@stellaeum/core/diary/flow'
import { DIARY_FEELING_COLORS, getDiaryReviewTone, type DiaryReviewCardProps } from '@stellaeum/core/diary/review'
import { color, font } from '@/components/design-system/tokens'

export function DiaryWeeklyReview({ period, summary, error, canGoNext, onPrevious, onNext }: DiaryReviewCardProps) {
  const tone = getDiaryReviewTone(summary?.feelings)
  const feelings = DIARY_MOODS.filter((item) => (summary?.feelings?.[item.feeling] ?? 0) > 0)
  const topics = Object.entries(summary?.topics ?? {}).sort((left, right) => right[1] - left[1]).slice(0, 3)
  const steps = Object.values(summary?.steps ?? {}).reduce((total, count) => total + count, 0)
  return <View style={{ borderWidth: 1, borderColor: tone ? `${tone.color}40` : 'rgba(255,255,255,0.08)', backgroundColor: tone ? `${tone.color}0c` : 'rgba(255,255,255,0.035)', borderRadius: 26, padding: 20, gap: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1 }}><Text style={{ fontFamily: font.displaySemibold, fontSize: 20, color: color.text }}>Седмичен преглед</Text><Text style={{ marginTop: 4, fontSize: 12, color: color.muted }}>{period.label}</Text></View>
      <View style={{ flexDirection: 'row' }}><Pressable accessibilityRole="button" accessibilityLabel="Предишна седмица" onPress={onPrevious} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: color.muted, fontSize: 26 }}>‹</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Следваща седмица" accessibilityState={{ disabled: !canGoNext }} disabled={!canGoNext} onPress={onNext} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canGoNext ? 1 : 0.25 }}><Text style={{ color: color.muted, fontSize: 26 }}>›</Text></Pressable></View>
    </View>
    {!summary ? <Text accessibilityLiveRegion="polite" style={{ color: color.muted, fontSize: 13 }}>{error ? 'Не успяхме да заредим прегледа.' : 'Зареждане…'}</Text> : <>
      <Text style={{ color: color.faint, fontSize: 12 }}>{summary.entryCount} {summary.entryCount === 1 ? 'запис' : 'записа'}</Text>
      {tone && <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: color.muted }}>Общо усещане</Text><Text style={{ fontFamily: font.displaySemibold, fontSize: 21, color: tone.color }}>{tone.label}</Text></View>
        <View accessible accessibilityLabel={`Средно усещане: ${tone.label}, от тъжно към радостно`} style={{ height: 16, justifyContent: 'center' }}>
          <Svg width="100%" height={6}><Defs><LinearGradient id="diary-feelings" x1="0%" y1="0%" x2="100%" y2="0%">{Object.values(DIARY_FEELING_COLORS).map((value, index) => <Stop key={value} offset={`${index * 25}%`} stopColor={value} />)}</LinearGradient></Defs><Rect width="100%" height={6} rx={3} fill="url(#diary-feelings)" /></Svg>
          <View style={{ position: 'absolute', left: `${tone.position * 100}%`, transform: [{ translateX: -7 }], width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#0b1020', backgroundColor: tone.color }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 }}><Text style={{ fontSize: 10, color: color.faint }}>Тъжно</Text><Text style={{ fontSize: 10, color: color.faint }}>Радостно</Text></View>
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{feelings.length ? feelings.map((item) => <View key={item.feeling} style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: `${DIARY_FEELING_COLORS[item.feeling]}12` }}><Text style={{ fontSize: 12, color: DIARY_FEELING_COLORS[item.feeling] }}>{item.label} · {summary.feelings![item.feeling]}</Text></View>) : <Text style={{ fontSize: 13, color: color.faint }}>Няма отбелязани чувства за тази седмица.</Text>}</View>
      {(topics.length > 0 || steps > 0) && <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{topics.map(([topic, count]) => <View key={topic} style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.055)', paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ fontSize: 11, color: color.muted }}>{DIARY_TOPICS.find((item) => item.value === topic)?.label ?? topic} · {count}</Text></View>)}</View>{steps > 0 && <Text style={{ fontSize: 12, color: color.muted }}>Лични стъпки · {steps}</Text>}</View>}
    </>}
  </View>
}
