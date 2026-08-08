/**
 * Freezes the face at one named state with fixed, readable values, so the
 * snapshots in docs/states/ and preview.png are deterministic.
 *
 *   node tools/mock-state.ts list
 *   node tools/mock-state.ts on <state>
 *   ./gradlew :watchface:installDebug
 *   ... screenshot ...
 *   node tools/mock-state.ts off
 *   ./gradlew :watchface:installDebug        # <- do not skip this
 *
 *   node tools/mock-state.ts status
 *
 * IT PATCHES DATA, NOT TRIGGERS. An older sweep forced each reaction by
 * rewriting its trigger EXPRESSION and then setting one source from the host.
 * That broke the relationships BETWEEN triggers: freezing is a subset of cold,
 * so driving them independently produced a snowflake above two blobs wearing no
 * scarves - a state the watch can never actually be in. Replacing every source
 * token with a literal lets the real Conditions evaluate normally, so nesting
 * takes care of itself: set the temperature to 0 and both the cold and the
 * freezing branches fire, exactly as they would outdoors.
 *
 * The cost is a build per state. Correctness is worth the three minutes.
 *
 * IT OPERATES ON THE GENERATED watchface.xml, by design. Mocking the generator
 * instead would be tidier and would destroy the guarantee: the leftover scan at
 * the bottom of this file works precisely BECAUSE it runs on finished markup and
 * cannot be fooled by what the author meant. Every substitution asserts
 * something, so an edit to the face fails here loudly instead of silently
 * producing a wrong snapshot.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Source } from './gen/expr.ts'
import { DAY_OF_WEEK, WEEKDAYS, type Weekday } from './gen/palette.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const face = resolve(repo, 'watchface/src/main/res/raw/watchface.xml')
// Under build/ because aapt rejects a resource filename containing a dot.
const backup = resolve(repo, 'watchface/build/mock-state-backup.xml')

/**
 * Every source that gets a numeric literal.
 *
 * TYPED AGAINST THE FACE'S OWN SOURCE UNION. `Source` is the closed list in
 * tools/gen/expr.ts that the generator builds expressions from, so adding a
 * source there without adding a mock value here is a COMPILE error, and mocking
 * something the face cannot read is too. That used to be a runtime discovery:
 * the leftover scan would catch it, but only on the next capture run, and only
 * if someone read the abort message.
 *
 * DAY_OF_WEEK_S is excluded because it is a string - see TEMPLATE_SWAPS.
 */
export type NumericSource = Exclude<Source, 'DAY_OF_WEEK_S'>

/** Values shared by every state - the "good day" the preview is shot on. */
const BASE: Record<NumericSource, number> = {
  DAY: 19,
  // Monday, so the base "good day" is the brand red and every non-weekday frame
  // keeps the colour the face has always had. 1 = SUNDAY, measured on the watch.
  DAY_OF_WEEK: DAY_OF_WEEK.mon,
  HOUR_0_23: 19,
  // Only the meeting windows in meetings.ts read minutes, but it has to be here
  // regardless: the leftover scan treats any source it cannot substitute as a
  // live one, which is exactly the failure it exists to catch.
  MINUTE: 12,
  HEART_RATE: 88,
  STEP_COUNT: 1912,
  STEP_PERCENT: 19,
  STEP_GOAL: 10000,
  BATTERY_PERCENT: 88,
  BATTERY_IS_LOW: 0,
  'WEATHER.IS_AVAILABLE': 1,
  'WEATHER.TEMPERATURE': 19,
  'WEATHER.CONDITION': 1,
  'WEATHER.IS_DAY': 1,
  'WEATHER.CHANCE_OF_PRECIPITATION': 0,
  // Moderate (3-5 on the WHO scale), deliberately BELOW the >= 6 the shades fire
  // at, so the base "good day" is not wearing sunglasses.
  'WEATHER.UV_INDEX': 4,
  MOON_PHASE_POSITION: 19.79,
  // Flat wrist, so parallax sits at rest and does not blur the comparison
  // between snapshots.
  ACCELEROMETER_ANGLE_X: 0,
  ACCELEROMETER_ANGLE_Y: 0,
  // Freezes the Zzz drift. NOT arbitrary: the drift phase is
  // p = (([SECOND] % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3, and alpha is a
  // triangle over p that is ZERO at both ends. Second 1.0 puts the hero at
  // p = 1/3 and the companion - a second out of phase - at p = 2/3, the same
  // height on the way down. Both land on alpha 170, so the z's are equally
  // legible in a still. Second 0 would render them invisible.
  SECOND: 1,
  SECOND_MILLISECOND: 1.0,
}

/** What the mocked clock and date read. Not sources - they replace Templates. */
interface Display {
  time: string
  weekday: string
}

const BASE_DISPLAY: Display = { time: '19:12', weekday: 'Mon' }

type StateDelta = Partial<Record<NumericSource, number>> & Partial<Display>

/**
 * Sources left LIVE by `on <state> --live`.
 *
 * A frozen accelerometer means no parallax and a frozen clock means no drift,
 * which is right for a snapshot and wrong when the build is going on a wrist to
 * be looked at. Both features were once reported as broken purely because they
 * were judged on a mock build that had pinned their inputs to constants.
 */
const LIVE_SOURCES: NumericSource[] = [
  'ACCELEROMETER_ANGLE_X',
  'ACCELEROMETER_ANGLE_Y',
  'SECOND',
  'SECOND_MILLISECOND',
]

/** Short weekday label, matching what [DAY_OF_WEEK_S] renders on the watch. */
const LABEL: Record<Weekday, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

/**
 * One state per weekday.
 *
 * DERIVED FROM THE FACE'S OWN DAY_OF_WEEK MAP rather than restating 1..7 here.
 * The mapping is 1 = Sunday (Java/ICU, measured on the watch, not ISO 8601), and
 * getting it wrong shifts every colour by a day - which looks exactly like a
 * correct implementation six days out of seven. It is now impossible for these
 * frames and the face to disagree about which number Tuesday is.
 *
 * Each also sets the weekday string and a matching day-of-month so nothing on
 * screen contradicts anything else: a frame reading "Tue 18" in yellow is
 * internally consistent, where DAY_OF_WEEK=3 with the base "Mon 19" would show a
 * yellow blob next to the word Monday.
 */
const weekdayStates = (): Record<string, StateDelta> => {
  const out: Record<string, StateDelta> = {}
  const dayOfMonth: Record<Weekday, number> = {
    mon: 17, tue: 18, wed: 19, thu: 20, fri: 21, sat: 22, sun: 23,
  }
  const longName: Record<Weekday, string> = {
    mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday',
    fri: 'friday', sat: 'saturday', sun: 'sunday',
  }
  for (const d of WEEKDAYS) {
    out[longName[d]] = { DAY_OF_WEEK: DAY_OF_WEEK[d], weekday: LABEL[d], DAY: dayOfMonth[d] }
  }
  return out
}

/**
 * Per state, ONLY the values that state is about. Everything else stays at BASE,
 * which is the point: the snapshots differ by exactly one idea each.
 *
 * Ordering matches docs/states/ numbering.
 */
const STATES: Record<string, StateDelta> = {
  ambient: {},
  baseline: {},
  night: { time: '23:12', HOUR_0_23: 23, 'WEATHER.IS_DAY': 0, 'WEATHER.UV_INDEX': 0 },
  // The full summer day: warm, clear AND strong sun, so both halves of the old
  // sunny state fire - shades and cocktail together, which is what a real 25
  // degree cloudless afternoon looks like.
  sunny: { 'WEATHER.TEMPERATURE': 25, 'WEATHER.UV_INDEX': 8 },
  // High UV WITHOUT the warm clear day: 14 degrees, partly cloudy (code 14, the
  // one non-clear code confirmed on hardware). Shades, no drink. This frame is
  // what proves the split - a bright cold spring afternoon.
  uv: { 'WEATHER.UV_INDEX': 8, 'WEATHER.TEMPERATURE': 14, 'WEATHER.CONDITION': 14 },
  // Scarf weather. Exactly ON the threshold, and deliberately ABOVE the glove
  // threshold, so this frame shows the scarf alone.
  cold: { 'WEATHER.TEMPERATURE': 10 },
  gloves: { 'WEATHER.TEMPERATURE': 5 },
  freezing: { 'WEATHER.TEMPERATURE': 0 },
  // 50 is exactly ON the umbrella/rain gate, and since density, drop size and
  // speed all scale with CHANCE_OF_PRECIPITATION, this is the LIGHTEST rain the
  // face can show - about 7 of the 24 drops. Deliberate: it is the bottom of the
  // ramp, and thunderstorm at 90% is near the top.
  rainy: { 'WEATHER.CHANCE_OF_PRECIPITATION': 50, 'WEATHER.CONDITION': 12 },
  thunderstorm: { 'WEATHER.CHANCE_OF_PRECIPITATION': 90, 'WEATHER.CONDITION': 12 },
  // The top of the rain ramp: all 24 drops, largest and fastest. No docs frame
  // of its own - rainy and thunderstorm bracket the range - but it is in
  // cycle-states.ps1, because the whole point of the ramp is how it moves.
  downpour: { 'WEATHER.CHANCE_OF_PRECIPITATION': 100, 'WEATHER.CONDITION': 12 },
  // The sweat frames BRACKET the ramp rather than sampling its middle: 100 is
  // exactly on the gate, where the drip is shortest and slowest with one bead
  // per cheek, and 200 is the ceiling. Anything between is a linear blend.
  //
  // THREE frames, not two, because the forehead cluster fills in three discrete
  // steps and the middle one is only reachable between 120 and 149. The drips
  // are continuous and would be documented by the ends alone; the pearls are
  // not. 135 sits mid-band so the frame cannot be read as a boundary case.
  //
  // To look at a point inside the ramp, override rather than adding a state:
  //   node tools/mock-state.ts on sweating --set=HEART_RATE=150 --live
  sweating: { HEART_RATE: 100 },
  puffing: { HEART_RATE: 135 },
  drenched: { HEART_RATE: 200 },
  // STEP_PERCENT is what the trigger reads, against the wearer's own STEP_GOAL,
  // so 100 means "goal met" regardless of what that goal is; STEP_COUNT is only
  // there so the digits on screen agree with it. Ten thousand exactly, not
  // 10240 - and landing ON the threshold tests the >= boundary.
  goal: { STEP_COUNT: 10000, STEP_PERCENT: 100 },

  // ---- the meeting schedule -----------------------------------------------
  //
  //   Mon, Tue, Thu, Fri   09:05-09:20  digital standup       - headset
  //   Mon, Tue, Thu        16:00-16:30  digital standup       - headset
  //   Wednesday            10:30-10:45  IN-PERSON standup     - coffee cup
  //   Friday               15:00-16:00  digital "game time"   - headset,
  //                                     controller from 15:30
  //
  // Replaces the old salute/salutebusy/salutefri/fridrink block. The salute
  // itself is gone - see meetings.ts - so there is no pose left that needs a
  // "which arm" mechanism, and no `busy` state to demonstrate one with.
  //
  // THE HEADSET LOOKS THE SAME in the morning and afternoon windows, so
  // `headset` documents it once, on the base Monday morning, exactly the way
  // `salute` used to. The Friday states are not repeats of that: one shows
  // game time before the controller appears, the other after.
  //
  // Times sit INSIDE each window, so no frame can be read as a boundary case.
  headset: { time: '09:12', HOUR_0_23: 9, MINUTE: 12 },
  headsetfri: {
    DAY_OF_WEEK: DAY_OF_WEEK.fri, weekday: 'Fri', DAY: 21,
    time: '15:15', HOUR_0_23: 15, MINUTE: 15,
  },
  fricontroller: {
    DAY_OF_WEEK: DAY_OF_WEEK.fri, weekday: 'Fri', DAY: 21,
    time: '15:45', HOUR_0_23: 15, MINUTE: 45,
  },
  wedcoffee: {
    DAY_OF_WEEK: DAY_OF_WEEK.wed, weekday: 'Wed', DAY: 19,
    time: '10:35', HOUR_0_23: 10, MINUTE: 35,
  },
  // The one remaining "mechanism" state, in the same spirit `salutebusy` used
  // to be: proves the coffee cup wins the same fist a hot, sunny cocktail
  // trigger would otherwise want, because its Compare is listed first. No
  // docs frame of its own - same call as `downpour` - since the point is the
  // priority order, not a new pose.
  wedcoffeehot: {
    DAY_OF_WEEK: DAY_OF_WEEK.wed, weekday: 'Wed', DAY: 19,
    time: '10:35', HOUR_0_23: 10, MINUTE: 35,
    'WEATHER.TEMPERATURE': 25,
  },

  ...weekdayStates(),
}

/**
 * Sources that are NOT substituted.
 *
 * DAY_OF_WEEK_S is a string, so it cannot become a numeric literal; its whole
 * Template is swapped for static text instead.
 *
 * This used to also list ANIMATION_VALUE, on the belief that <Animation> fed it
 * a 0..1 ramp at render time. No such source exists. Exempting it here is what
 * let an invented source survive the leftover scan - the one check that could
 * have caught it, switched off by hand. Nothing goes in this set unless it is a
 * real source that genuinely cannot be expressed as a numeric literal.
 */
const NOT_A_VALUE = new Set<string>(['DAY_OF_WEEK_S'])

type Values = Record<string, number | string>

/**
 * Templates that cannot become numeric literals.
 *
 * MATCHED AS EXACT STRINGS, which couples this to the generator's formatting.
 * That coupling is deliberate and it fails loudly: when the serialiser briefly
 * indented Template's CDATA onto its own line, `on rainy` aborted here rather
 * than producing 24 wrong screenshots. The generator now renders any element
 * with text content inline, partly for this reason.
 */
const TEMPLATE_SWAPS = (v: Values): Array<[string, string]> => [
  // %s cannot take a number, so the weekday is replaced wholesale. Static text
  // has to be bare Font content: a Template requires at least one Parameter.
  [
    `<Template><![CDATA[%s]]><Parameter expression="[DAY_OF_WEEK_S]" /></Template>`,
    `<![CDATA[${v['weekday']}]]>`,
  ],
  [
    `<Template><![CDATA[%s %d]]><Parameter expression="[DAY_OF_WEEK_S]" /><Parameter expression="[DAY]" /></Template>`,
    `<![CDATA[${v['weekday']} ${v['DAY']}]]>`,
  ],
]

/**
 * TimeText renders the system clock, has no literal mode, and its <Font> is a
 * restricted definition that accepts no children - so it cannot even hold a
 * Transform. The whole DigitalClock block is swapped for PartTexts.
 */
const CLOCK_RE = /<DigitalClock\b[\s\S]*?<\/DigitalClock>/

/**
 * BOTH COPIES, not one.
 *
 * The first version collapsed the clock to a single bold cream PartText, which
 * is what interactive looks like - and made every ambient snapshot a lie,
 * because ambient is a LIGHTER weight in plain white. `0-ambient.png` shipped
 * with the wrong font weight and was reported as a bug in the watch face rather
 * than in this file. So the two-copy crossfade is mirrored here exactly, Variant
 * timings included.
 */
const clockMock = (v: Values): string =>
  `<Group name="mock_time_interactive" x="0" y="0" width="450" height="450" alpha="255">
      <Variant mode="AMBIENT" target="alpha" value="0"
               duration="0.45" startOffset="0" interpolation="EASE_IN" />
      <PartText name="mock_time" x="0" y="68" width="450" height="120">
        <Text align="CENTER">
          <Font family="SYNC_TO_DEVICE" size="100" weight="BOLD" slant="NORMAL" color="#fff6e8"><![CDATA[${v['time']}]]></Font>
        </Text>
      </PartText>
    </Group>
    <Group name="mock_time_ambient" x="0" y="0" width="450" height="450" alpha="0">
      <Variant mode="AMBIENT" target="alpha" value="255"
               duration="0.50" startOffset="0.50" interpolation="EASE_OUT" />
      <PartText name="mock_time_amb" x="0" y="68" width="450" height="120">
        <Text align="CENTER">
          <Font family="SYNC_TO_DEVICE" size="100" weight="LIGHT" slant="NORMAL" color="#ffffff"><![CDATA[${v['time']}]]></Font>
        </Text>
      </PartText>
    </Group>`

// --- CLI --------------------------------------------------------------------

const argv = process.argv.slice(2)
const live = argv.includes('--live')
const positional = argv.filter((a) => !a.startsWith('--'))
const cmd = positional[0] ?? 'status'
const stateName = positional[1]

const die = (msg: string): never => {
  console.error(msg)
  process.exit(1)
}

/**
 * Ad-hoc overrides:  --set=WEATHER.CHANCE_OF_PRECIPITATION=70
 *
 * Repeatable. Exists because the rain's density, drop size and speed are all
 * continuous functions of CHANCE_OF_PRECIPITATION, so judging it means looking
 * at points BETWEEN the named states - and adding a named state per value you
 * want to eyeball once turns STATES into a junk drawer.
 *
 * ONE TOKEN, not "--set KEY=VALUE": a bare KEY=VALUE would land in `positional`
 * and be read as the state name.
 *
 * The key must already exist in BASE. A typo would otherwise be accepted,
 * substitute nothing, and leave the source LIVE - the exact failure the leftover
 * scan exists to prevent.
 */
const overrides: Partial<Record<NumericSource, number>> = {}
for (const a of argv.filter((x) => x.startsWith('--set='))) {
  const [k, v] = a.slice('--set='.length).split('=')
  if (!k || !(k in BASE)) {
    console.error(`ABORT: --set key "${k}" is not a known source. One of:`)
    die(`  ${Object.keys(BASE).join(', ')}`)
  }
  if (v === undefined || v === '' || Number.isNaN(Number(v))) {
    die(`ABORT: --set ${k} needs a numeric value, got "${v}"`)
  }
  overrides[k as NumericSource] = Number(v)
}

if (cmd === 'list') {
  console.log('States:')
  for (const [n, o] of Object.entries(STATES)) {
    const delta = Object.entries(o).map(([k, val]) => `${k}=${val}`).join('  ')
    console.log(`  ${n.padEnd(13)} ${delta || '(base values)'}`)
  }
  process.exit(0)
}

if (cmd === 'status') {
  console.log(existsSync(backup) ? 'MOCK is IN PLACE (backup exists)' : 'real values (clean)')
  if (existsSync(backup)) console.log(`  backup: ${backup}`)
  // THIS COMMAND CANNOT SEE THE WATCH. It reports on the working tree only, and
  // a clean tree says nothing about which APK is installed - `off` restores the
  // file but does not reinstall. Reading "clean" as "the watch is showing real
  // data" is wrong, and was wrong in a way that produced three bug reports
  // against the watch face for what was a leftover mock build.
  console.log('  (working tree only - says NOTHING about which APK is on the watch;')
  console.log('   reinstall to be sure: ./gradlew :watchface:installDebug)')
  process.exit(0)
}

if (cmd === 'off') {
  if (!existsSync(backup)) {
    die('No backup found - nothing to restore. Values are presumably already real.')
  }
  writeFileSync(face, readFileSync(backup))
  rmSync(backup)
  console.log('Real values restored. REINSTALL so the watch stops showing the mock:')
  console.log('  ./gradlew :watchface:installDebug')
  process.exit(0)
}

if (cmd !== 'on') {
  die(`Unknown command "${cmd}". Use: on <state> | off | status | list`)
}
if (!stateName || !(stateName in STATES)) {
  console.error('Usage: node tools/mock-state.ts on <state>')
  die(`States: ${Object.keys(STATES).join(', ')}`)
}
if (existsSync(backup)) {
  console.error('Already mocked - run "off" first, or delete the backup if you are sure:')
  die(`  ${backup}`)
}

const values: Values = {
  ...BASE,
  ...BASE_DISPLAY,
  ...STATES[stateName as string],
  ...overrides,
}

let s = readFileSync(face, 'utf8')
const fail = (msg: string): never => {
  console.error(`ABORT: ${msg}`)
  return die('watchface.xml has changed. Update tools/mock-state.ts.')
}

// 1. Templates that cannot become numeric literals.
for (const [from, to] of TEMPLATE_SWAPS(values)) {
  if (s.includes(from)) s = s.split(from).join(to)
}
if (s.includes('DAY_OF_WEEK_S')) fail('a [DAY_OF_WEEK_S] Template was not in the swap table')

// 2. Every remaining source token -> a literal.
//    Longest name first so no token is a prefix of another.
const kept = new Set<string>(live ? LIVE_SOURCES : [])
const substitutable = Object.keys(values)
  .filter((k) => k !== 'time' && k !== 'weekday' && !kept.has(k))
  .sort((a, b) => b.length - a.length)
for (const key of substitutable) {
  s = s.split(`[${key}]`).join(String(values[key]))
}

// 3. Nothing may be left reading live data. This is the safety net: a source
//    added to the face but not to BASE would still be live, and the snapshot
//    would silently drift with the weather or your pulse.
//
//    COMMENTS ARE STRIPPED FIRST. The generated banner mentions no sources, but
//    this stays because it costs nothing and the rule is "only markup counts".
const markup = s.replace(/<!--[\s\S]*?-->/g, '')
const leftover = [
  ...new Set([...markup.matchAll(/\[([A-Z][A-Z0-9_.]*)\]/g)].map((m) => m[1] as string)),
].filter((n) => !NOT_A_VALUE.has(n) && !kept.has(n))
if (leftover.length) fail(`unmocked source(s) still live: ${leftover.join(', ')}`)

// 4. The clock.
if (!CLOCK_RE.test(s)) fail('no <DigitalClock> block found')
s = s.replace(CLOCK_RE, clockMock(values))

mkdirSync(dirname(backup), { recursive: true })
writeFileSync(backup, readFileSync(face))
writeFileSync(face, s)

const overrideNote = Object.keys(overrides).length
  ? ` + ${Object.entries(overrides).map(([k, v]) => `${k}=${v}`).join(' ')}`
  : ''
console.log(`Mocked as "${stateName}"${overrideNote}:`)
console.log(`   ${values['time']}  ${values['weekday']} ${values['DAY']}`)
console.log(
  `   ${values['WEATHER.TEMPERATURE']}°  cond=${values['WEATHER.CONDITION']}` +
    `  day=${values['WEATHER.IS_DAY']}  precip=${values['WEATHER.CHANCE_OF_PRECIPITATION']}%` +
    `  uv=${values['WEATHER.UV_INDEX']}`,
)
console.log(
  `   ${values['HEART_RATE']} bpm · ${values['STEP_COUNT']} steps` +
    ` (${values['STEP_PERCENT']}%) · ${values['BATTERY_PERCENT']}%`,
)
console.log(
  live
    ? '   motion LIVE - accelerometer and seconds still run'
    : '   motion frozen - deterministic, use --live to watch parallax or the zzz drift',
)
console.log('')
console.log('AFTERWARDS:  node tools/mock-state.ts off   AND REINSTALL.')
