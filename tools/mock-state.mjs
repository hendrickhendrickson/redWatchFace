/**
 * Freezes the face at one named state with fixed, readable values, so the
 * snapshots in docs/states/ and preview.png are deterministic.
 *
 *   node tools/mock-state.mjs list
 *   node tools/mock-state.mjs on <state>
 *   ./gradlew :watchface:installDebug
 *   ... screenshot ...
 *   node tools/mock-state.mjs off
 *   ./gradlew :watchface:installDebug        # <- do not skip this
 *
 *   node tools/mock-state.mjs status
 *
 * WHY IT REPLACES debug-triggers.mjs AND preview-mock.mjs
 *
 * The old sweep forced each reaction by rewriting its trigger EXPRESSION to
 * `[BATTERY_PERCENT] == N` and then setting the battery from the host. That
 * worked, but it had two problems that got worse over time:
 *
 *   - the numbers on screen were whatever the watch happened to be reporting,
 *     so a "sunny" snapshot showed 24 degrees and a step count of 0;
 *   - forcing expressions individually breaks the relationships BETWEEN them.
 *     Freezing is a subset of cold, so mapping the two to different battery
 *     levels produced a snowflake above two blobs wearing no scarves - a state
 *     the watch can never actually be in.
 *
 * This patches the DATA instead: every source token is replaced with a literal
 * for the state being captured. The real Conditions then evaluate normally, so
 * nesting takes care of itself - set the temperature to 0 and both the cold and
 * the freezing branches fire, exactly as they would outdoors.
 *
 * It also means each state needs its own build, where the old sweep needed one
 * build and nine adb calls. Nine builds is about three minutes; correctness is
 * worth more than that.
 *
 * The two hard-won rules from the old scripts still apply. The backup lives
 * under watchface/build/ because aapt rejects a resource filename containing a
 * dot. And every substitution asserts something, so an edit to watchface.xml
 * fails here loudly instead of silently producing a wrong snapshot.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const face = resolve(repo, 'watchface/src/main/res/raw/watchface.xml')
const backup = resolve(repo, 'watchface/build/mock-state-backup.xml')

/**
 * Values shared by every state - the "good day" the preview is shot on.
 * Overridden per state below by whatever that state is actually about.
 */
const BASE = {
  time: '19:12',
  weekday: 'Mon',
  DAY: 19,
  HOUR_0_23: 19,
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
  MOON_PHASE_POSITION: 19.79,
  // Flat wrist, so parallax sits at rest and does not blur the comparison
  // between snapshots.
  ACCELEROMETER_ANGLE_X: 0,
  ACCELEROMETER_ANGLE_Y: 0,
  // Freezes the Zzz drift. NOT arbitrary: the drift phase is
  // p = (([SECOND] % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3, and alpha is a
  // triangle over p that is ZERO at both ends. Second 1.0 puts the hero at
  // p = 1/3 and the companion - which runs a second out of phase - at p = 2/3,
  // which is the same height on the way down. Both land on alpha 170, so the
  // z's are equally legible in a still. Second 0 would render them invisible.
  SECOND: 1,
  SECOND_MILLISECOND: 1.0,
}

/**
 * Sources left LIVE by `on <state> --live`.
 *
 * A frozen accelerometer means no parallax and a frozen clock means no drift,
 * which is exactly right for a snapshot and exactly wrong when the build is
 * going on a wrist to be looked at. Both features were once reported as broken
 * purely because they were being judged on a mock build that had pinned their
 * inputs to constants.
 */
const LIVE_SOURCES = ['ACCELEROMETER_ANGLE_X', 'ACCELEROMETER_ANGLE_Y', 'SECOND', 'SECOND_MILLISECOND']

/**
 * Per state, ONLY the values that state is about. Everything else stays at BASE,
 * which is the point: the snapshots differ by exactly one idea each.
 *
 * Ordering matches docs/states/ numbering.
 */
const STATES = {
  ambient: {},
  baseline: {},
  night: { time: '23:12', HOUR_0_23: 23, 'WEATHER.IS_DAY': 0 },
  sunny: { 'WEATHER.TEMPERATURE': 25 },
  cold: { 'WEATHER.TEMPERATURE': 10 },
  freezing: { 'WEATHER.TEMPERATURE': 0 },
  rainy: { 'WEATHER.CHANCE_OF_PRECIPITATION': 50, 'WEATHER.CONDITION': 12 },
  thunderstorm: { 'WEATHER.CHANCE_OF_PRECIPITATION': 90, 'WEATHER.CONDITION': 12 },
  sweating: { HEART_RATE: 120 },
  // The step-goal flag. STEP_PERCENT is what the trigger reads, against the
  // wearer's own STEP_GOAL, so 100 means "goal met" regardless of what that
  // goal is; STEP_COUNT is only there so the digits on screen agree with it.
  // Daytime by inheritance from BASE (hour 19), which the trigger requires.
  //
  // Ten thousand exactly, not 10240. The old value was 10*1024 - a habit, not a
  // reason - and it read as a suspiciously arbitrary number in the snapshot.
  // Landing exactly ON the threshold also tests the >= boundary rather than
  // sailing past it.
  goal: { STEP_COUNT: 10000, STEP_PERCENT: 100 },
}

/**
 * Sources that are NOT substituted.
 *
 * DAY_OF_WEEK_S is a string, so it cannot become a numeric literal; its whole
 * Template is swapped for static text instead.
 *
 * This used to also list ANIMATION_VALUE, on the belief that <Animation> fed it
 * a 0..1 ramp at render time. No such source exists - see the note in
 * watchface.xml on sleep_zzz_drift. Exempting it here is what let an invented
 * source survive the leftover scan, so the one check that could have caught it
 * was switched off by hand. Nothing goes in this set unless it is a real source
 * that genuinely cannot be expressed as a numeric literal.
 */
const NOT_A_VALUE = new Set(['DAY_OF_WEEK_S'])

const TEMPLATE_SWAPS = (v) => [
  // %s cannot take a number, so the weekday is replaced wholesale. Static text
  // has to be bare Font content: a Template requires at least one Parameter.
  [`<Template><![CDATA[%s]]><Parameter expression="[DAY_OF_WEEK_S]" /></Template>`, `<![CDATA[${v.weekday}]]>`],
  [
    `<Template><![CDATA[%s %d]]><Parameter expression="[DAY_OF_WEEK_S]" /><Parameter expression="[${'DAY'}]" /></Template>`,
    `<![CDATA[${v.weekday} ${v.DAY}]]>`,
  ],
]

/**
 * TimeText renders the system clock, has no literal mode, and its <Font> is a
 * restricted definition that accepts no children - so it cannot even hold a
 * Transform. The whole DigitalClock block is swapped for a PartText.
 * Matched by regex so comments inside it can change freely.
 */
const CLOCK_RE = /<DigitalClock\b[\s\S]*?<\/DigitalClock>/

/**
 * BOTH COPIES, not one.
 *
 * The first version of this collapsed the clock to a single bold cream
 * PartText, which is what interactive looks like - and made every ambient
 * snapshot a lie, because ambient is supposed to be a LIGHTER weight in plain
 * white. `0-ambient.png` shipped with the wrong font weight and it was reported
 * as a bug in the watch face rather than in this file.
 *
 * So the two-copy crossfade from the real <DigitalClock> is mirrored here
 * exactly, Variant timings included. The text is static; everything else about
 * how the clock behaves across the ambient transition is not.
 *
 * The Variants sit on wrapper Groups rather than on the PartTexts, matching how
 * the rest of watchface.xml does it.
 */
const clockMock = (v) => `<Group name="mock_time_interactive" x="0" y="0" width="450" height="450" alpha="255">
      <Variant mode="AMBIENT" target="alpha" value="0"
               duration="0.45" startOffset="0" interpolation="EASE_IN" />
      <PartText name="mock_time" x="0" y="68" width="450" height="120">
        <Text align="CENTER">
          <Font family="SYNC_TO_DEVICE" size="100" weight="BOLD" slant="NORMAL" color="#fff6e8"><![CDATA[${v.time}]]></Font>
        </Text>
      </PartText>
    </Group>
    <Group name="mock_time_ambient" x="0" y="0" width="450" height="450" alpha="0">
      <Variant mode="AMBIENT" target="alpha" value="255"
               duration="0.50" startOffset="0.50" interpolation="EASE_OUT" />
      <PartText name="mock_time_amb" x="0" y="68" width="450" height="120">
        <Text align="CENTER">
          <Font family="SYNC_TO_DEVICE" size="100" weight="LIGHT" slant="NORMAL" color="#ffffff"><![CDATA[${v.time}]]></Font>
        </Text>
      </PartText>
    </Group>`

const args = process.argv.slice(2)
const live = args.includes('--live')
const positional = args.filter((a) => !a.startsWith('--'))
const cmd = positional[0] ?? 'status'
const stateName = positional[1]

if (cmd === 'list') {
  console.log('States:')
  for (const [n, o] of Object.entries(STATES)) {
    const diff = Object.entries(o)
      .map(([k, val]) => `${k}=${val}`)
      .join('  ')
    console.log(`  ${n.padEnd(13)} ${diff || '(base values)'}`)
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
    console.error('No backup found - nothing to restore. Values are presumably already real.')
    process.exit(1)
  }
  writeFileSync(face, readFileSync(backup))
  rmSync(backup)
  console.log('Real values restored. REINSTALL so the watch stops showing the mock:')
  console.log('  ./gradlew :watchface:installDebug')
  process.exit(0)
}

if (cmd !== 'on') {
  console.error(`Unknown command "${cmd}". Use: on <state> | off | status | list`)
  process.exit(1)
}

if (!stateName || !(stateName in STATES)) {
  console.error(`Usage: node tools/mock-state.mjs on <state>`)
  console.error(`States: ${Object.keys(STATES).join(', ')}`)
  process.exit(1)
}
if (existsSync(backup)) {
  console.error('Already mocked - run "off" first, or delete the backup if you are sure:')
  console.error(`  ${backup}`)
  process.exit(1)
}

const values = { ...BASE, ...STATES[stateName] }
let s = readFileSync(face, 'utf8')
const fail = (msg) => {
  console.error(`ABORT: ${msg}`)
  console.error('watchface.xml has changed. Update tools/mock-state.mjs.')
  process.exit(1)
}

// 1. Templates that cannot become numeric literals.
for (const [from, to] of TEMPLATE_SWAPS(values)) {
  if (s.includes(from)) s = s.split(from).join(to)
}
if (s.includes('DAY_OF_WEEK_S')) fail('a [DAY_OF_WEEK_S] Template was not in the swap table')

// 2. Every remaining source token -> a literal.
//    Longest name first so no token is a prefix of another.
const kept = new Set(live ? LIVE_SOURCES : [])
for (const key of Object.keys(values).sort((a, b) => b.length - a.length)) {
  if (key === 'time' || key === 'weekday' || kept.has(key)) continue
  s = s.split(`[${key}]`).join(String(values[key]))
}

// 3. Nothing may be left reading live data. This is the safety net: a source
//    added to watchface.xml but not to BASE would still be live, and the
//    snapshot would silently drift with the weather or your pulse.
//
//    COMMENTS ARE STRIPPED FIRST. watchface.xml discusses sources it does not
//    use - there is a long note on why [IS_AMBIENT] does not exist - and
//    scanning the raw text reports those as unmocked. Only the markup counts.
const markup = s.replace(/<!--[\s\S]*?-->/g, '')
const leftover = [...new Set([...markup.matchAll(/\[([A-Z][A-Z0-9_.]*)\]/g)].map((m) => m[1]))].filter(
  (n) => !NOT_A_VALUE.has(n) && !kept.has(n),
)
if (leftover.length) fail(`unmocked source(s) still live: ${leftover.join(', ')}`)

// 4. The clock.
if (!CLOCK_RE.test(s)) fail('no <DigitalClock> block found')
s = s.replace(CLOCK_RE, clockMock(values))

mkdirSync(dirname(backup), { recursive: true })
writeFileSync(backup, readFileSync(face))
writeFileSync(face, s)

console.log(`Mocked as "${stateName}":`)
console.log(`   ${values.time}  ${values.weekday} ${values.DAY}`)
console.log(`   ${values['WEATHER.TEMPERATURE']}°  cond=${values['WEATHER.CONDITION']}  day=${values['WEATHER.IS_DAY']}  precip=${values['WEATHER.CHANCE_OF_PRECIPITATION']}%`)
console.log(`   ${values.HEART_RATE} bpm · ${values.STEP_COUNT} steps (${values.STEP_PERCENT}%) · ${values.BATTERY_PERCENT}%`)
console.log(
  live
    ? `   motion LIVE (${LIVE_SOURCES.join(', ')}) - for looking at on the wrist, not for snapshots`
    : '   motion frozen - deterministic, use --live to watch parallax or the zzz drift',
)
console.log('\nAFTERWARDS:  node tools/mock-state.mjs off   AND REINSTALL.')
