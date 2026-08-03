import { useEffect, useRef } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import * as Haptics from 'expo-haptics'

const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS // 220
const PADDING_OFFSET = ITEM_HEIGHT * 2 // 88 — top/bottom padding so first/last items can scroll to center band
const COLUMN_WIDTH = 80

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0'),
)

export interface TimePickerProps {
  visible: boolean
  initialHHMM: string | null | undefined
  onDismiss: (hhmm: string) => void
}

function parseInitial(hhmm: string | null | undefined): {
  h: number
  m: number
} {
  if (hhmm && /^\d{2}:\d{2}$/.test(hhmm)) {
    const [h, m] = hhmm.split(':').map(Number)
    return { h, m }
  }
  return { h: 12, m: 0 }
}

interface WheelProps {
  data: string[]
  initialIndex: number
  onIndexChange: (i: number) => void
}

function Wheel({ data, initialIndex, onIndexChange }: WheelProps) {
  const listRef = useRef<FlatList<string>>(null)
  const lastIndexRef = useRef(initialIndex)

  useEffect(() => {
    lastIndexRef.current = initialIndex
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: initialIndex * ITEM_HEIGHT,
        animated: false,
      })
    })
  }, [initialIndex])

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y
    const index = Math.round(offset / ITEM_HEIGHT)
    if (
      index !== lastIndexRef.current &&
      index >= 0 &&
      index < data.length
    ) {
      lastIndexRef.current = index
      Haptics.selectionAsync()
      onIndexChange(index)
    }
  }

  return (
    <View style={{ height: PICKER_HEIGHT, width: COLUMN_WIDTH }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View
            style={{
              height: ITEM_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text className="text-[22px] tabular-nums text-slate-100">
              {item}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({
          length: ITEM_HEIGHT,
          offset: i * ITEM_HEIGHT,
          index: i,
        })}
        contentContainerStyle={{ paddingVertical: PADDING_OFFSET }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </View>
  )
}

export function TimePicker({
  visible,
  initialHHMM,
  onDismiss,
}: TimePickerProps) {
  const initial = parseInitial(initialHHMM)
  const hourIndexRef = useRef(initial.h)
  const minuteIndexRef = useRef(initial.m)

  useEffect(() => {
    hourIndexRef.current = initial.h
    minuteIndexRef.current = initial.m
  }, [initial.h, initial.m])

  const handleDismiss = () => {
    const hh = String(hourIndexRef.current).padStart(2, '0')
    const mm = String(minuteIndexRef.current).padStart(2, '0')
    onDismiss(`${hh}:${mm}`)
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop sibling — absolute-positioned dim layer below the sheet
            in the responder tree, so taps in the sheet area reach FlatList
            before this Pressable can claim the responder. Tapping the
            dimmed area above the sheet still dismisses. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          className="bg-black/50"
        />
        {visible && (
          <View className="rounded-t-2xl border-t border-white/10 bg-bg px-4 py-6">
            <Text className="mb-4 text-center font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/75">
              Час на раждане
            </Text>
            <View
              style={{
                position: 'relative',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: PICKER_HEIGHT,
              }}
            >
              <Wheel
                data={HOURS}
                initialIndex={initial.h}
                onIndexChange={(i) => {
                  hourIndexRef.current = i
                }}
              />
              <Text className="mx-2 font-cinzel text-[24px] text-amber-300/70">
                :
              </Text>
              <Wheel
                data={MINUTES}
                initialIndex={initial.m}
                onIndexChange={(i) => {
                  minuteIndexRef.current = i
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: PADDING_OFFSET,
                  height: ITEM_HEIGHT,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: 'rgba(251, 191, 36, 0.3)',
                }}
              />
            </View>
            <Pressable
              onPress={handleDismiss}
              className="mt-6 self-center rounded-full border border-amber-300/40 px-6 py-2.5"
            >
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                Готово
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  )
}
