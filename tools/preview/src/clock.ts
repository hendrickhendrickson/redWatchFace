/**
 * The clock, for the preview.
 *
 * WHY THIS EXISTS AT ALL. Two things on the face cannot be derived from numeric
 * sources: `TimeText` renders the system clock and has no literal mode, and
 * `[DAY_OF_WEEK_S]` is the face's only STRING source. So a renderer needs the time
 * and the weekday handed to it as text - `RenderOpts.display` - which is the same
 * accommodation mock-state.ts makes in TEMPLATE_SWAPS, for the same reason.
 *
 * THE POINT OF DERIVING BOTH FROM ONE CLOCK is that they cannot then disagree.
 * fixtures.ts carries `time: '23:12'` and `HOUR_0_23: 23` as two separate fields
 * per state, which is correct there - a snapshot state is a set of independent
 * source values - but in a live preview with a scrubbable clock, two fields would
 * mean a face reading 23:12 while its night predicate looked at hour 19.
 */

import { DAY_OF_WEEK, WEEKDAYS, type Weekday } from '../../gen/palette.ts'
import type { Display, NumericSource } from '../../gen/fixtures.ts'

/** Seconds in a day, the range the scrubber runs over. */
export const DAY_SECONDS = 24 * 60 * 60

const pad = (v: number): string => String(Math.floor(v)).padStart(2, '0')

/** Short weekday label, matching what [DAY_OF_WEEK_S] renders on the watch. */
const LABEL: Record<Weekday, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

/**
 * Invert the face's own day map rather than restating 1..7.
 *
 * The mapping is 1 = Sunday - Java/ICU, measured on the watch, NOT ISO 8601 - and
 * getting it wrong shifts every colour by a day, which looks exactly like a correct
 * implementation six days out of seven. Deriving it means the preview and the face
 * cannot disagree about which number Tuesday is.
 */
const BY_NUMBER = new Map<number, Weekday>(WEEKDAYS.map((d) => [DAY_OF_WEEK[d], d]))

export const weekdayLabel = (dayOfWeek: number): string => {
  const d = BY_NUMBER.get(dayOfWeek)
  return d === undefined ? '???' : LABEL[d]
}

/**
 * Every clock-derived source, plus what the clock reads.
 *
 * `SECOND_MILLISECOND` IS THE ANIMATION CLOCK and it is not the same thing as
 * `SECOND`. expr.ts keeps `phase()` (which reads it directly, giving 24
 * independently-phased rain drops) separate from `secondPhase()` (the whole-second
 * sawtooth the drips and the z's are still on), and both read it. So the preview has
 * to supply a real fractional value or the drips move in visible ranks - which is
 * exactly the artefact fract() was introduced to remove.
 */
export const clockValues = (
  secondsOfDay: number,
): { values: Partial<Record<NumericSource, number>>; time: string } => {
  const t = ((secondsOfDay % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS
  const hour = Math.floor(t / 3600)
  const minute = Math.floor((t % 3600) / 60)
  return {
    values: {
      HOUR_0_23: hour,
      MINUTE: minute,
      SECOND: Math.floor(t % 60),
      SECOND_MILLISECOND: t % 60,
    },
    time: `${pad(hour)}:${pad(minute)}`,
  }
}

export const displayFor = (secondsOfDay: number, dayOfWeek: number): Display =>
  ({ time: clockValues(secondsOfDay).time, weekday: weekdayLabel(dayOfWeek) })
