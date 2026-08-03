/**
 * Temporarily repoints the blob reaction triggers at battery levels, so every
 * state can be forced from the host for design review.
 *
 *   node tools/debug-triggers.mjs on     # swap real triggers -> BATTERY_PERCENT
 *   node tools/debug-triggers.mjs off    # put the real triggers back
 *   node tools/debug-triggers.mjs status
 *
 * WHY THIS EXISTS
 * None of the real triggers can be set from a host machine. The watch is a
 * production build, so there is no root and the clock cannot be set; weather
 * cannot be faked at all; and heart rate has no synthetic provider on the Wear
 * images (`dumpsys package ...healthservices` registers only FALL_OVER,
 * START_SLEEPING and STOP_SLEEPING - there is no START_WALKING). BATTERY_PERCENT
 * is the single exception: `adb shell dumpsys battery set level N` works without
 * root and has a WFF data source behind it.
 *
 * So for review, each trigger is rewritten to `[BATTERY_PERCENT] == N` and the
 * state is then selected with one adb command. This was done by hand-editing
 * twice before; the point of the script is that the hand-edit is easy to get
 * subtly wrong and leave in a shipped build.
 *
 * USAGE, END TO END
 *   node tools/debug-triggers.mjs on
 *   ./gradlew :watchface:installDebug
 *   pwsh tools/capture-states.ps1
 *   node tools/debug-triggers.mjs off
 *   ./gradlew :watchface:installDebug        # <- do not skip this
 *
 * TWO TRAPS, BOTH HIT IN PRACTICE
 *
 * 1. The backup does NOT live next to watchface.xml. Anything in res/raw is a
 *    resource, and aapt rejects a filename containing a dot:
 *      "'.' is not a valid file-based resource name character"
 *    A `watchface.xml.bak` there fails mergeDebugResources for the whole build.
 *    It goes under watchface/build/ instead, which is gitignored.
 *
 * 2. ORDER OF REPLACEMENT MATTERS. Two triggers are compound expressions that
 *    CONTAIN a shorter trigger as a substring - hero_arm_rest and
 *    hero_glove_rest are "(night) && 50 > precipitation", and prop_wet contains
 *    the bare icon test. Replacing the short form first would corrupt them into
 *    half-substituted nonsense that still validates. The table below is in
 *    longest-match-first order and every entry asserts its own hit count, so a
 *    future edit to watchface.xml that changes a trigger fails here loudly
 *    rather than silently producing a build where one state never fires.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const face = resolve(repo, 'watchface/src/main/res/raw/watchface.xml')
const backup = resolve(repo, 'watchface/build/debug-triggers-backup.xml')

/**
 * level -> the expressions that state owns.
 *
 * Levels are 81-87 deliberately. The first version used 10-15, which put the
 * watch inside its own low-battery range: Wear OS switched on battery saver and
 * painted a system indicator over the face, and BATTERY_IS_LOW flipped the
 * face's own battery text and gauge to coral. None of that is the state under
 * review. 81 is the baseline - no trigger is mapped to it, so nothing fires.
 */
const STATES = [
  { level: 82, name: 'sweating', patterns: [['[HEART_RATE] &gt;= 120', 2]] },
  {
    level: 83,
    name: 'sunny',
    patterns: [
      ['[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &gt;= 25 &amp;&amp; [WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]', 2],
    ],
  },
  {
    level: 84,
    name: 'rain',
    patterns: [
      // prop_wet first: it contains the bare icon test below.
      ['[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50', 1],
      ['[WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50', 1],
    ],
  },
  {
    level: 85,
    name: 'thunderstorm',
    // burst, companion skeleton, bolt, and the hero's startled eyes and mouth.
    patterns: [['[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90', 5]],
  },
  {
    level: 86,
    name: 'night',
    patterns: [
      // Compound first - see trap 2 in the header.
      ['([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; 50 &gt; [WEATHER.CHANCE_OF_PRECIPITATION]', 2],
      ['[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]', 5],
    ],
  },
  { level: 87, name: 'cold', patterns: [['[WEATHER.IS_AVAILABLE] &amp;&amp; 0 &gt; [WEATHER.TEMPERATURE]', 2]] },
]

/** Longest pattern first across the whole set, so no substring is eaten early. */
const ORDERED = STATES.flatMap((s) => s.patterns.map(([from, count]) => ({ ...s, from, count }))).sort(
  (a, b) => b.from.length - a.from.length,
)

const cmd = process.argv[2] ?? 'status'

if (cmd === 'status') {
  const patched = existsSync(backup)
  console.log(patched ? 'DEBUG triggers are IN PLACE (backup exists)' : 'real triggers (clean)')
  if (patched) console.log(`  backup: ${backup}`)
  process.exit(0)
}

if (cmd === 'on') {
  if (existsSync(backup)) {
    console.error('Already patched - run "off" first, or delete the backup if you are sure:')
    console.error(`  ${backup}`)
    process.exit(1)
  }
  let s = readFileSync(face, 'utf8')
  for (const { from, count, level, name } of ORDERED) {
    const found = s.split(from).length - 1
    if (found !== count) {
      console.error(`ABORT: expected ${count} occurrence(s) of the ${name} trigger, found ${found}.`)
      console.error('watchface.xml has changed. Update the STATES table in this script.')
      console.error(`  ${from}`)
      process.exit(1)
    }
    s = s.split(from).join(`[BATTERY_PERCENT] == ${level}`)
  }
  mkdirSync(dirname(backup), { recursive: true })
  writeFileSync(backup, readFileSync(face))
  writeFileSync(face, s)
  console.log('DEBUG triggers in place. Levels:')
  console.log('   81  baseline, nothing firing')
  for (const s2 of STATES) console.log(`   ${s2.level}  ${s2.name}`)
  console.log('\nNow:  ./gradlew :watchface:installDebug   then   pwsh tools/capture-states.ps1')
  console.log('AFTERWARDS:  node tools/debug-triggers.mjs off   AND REINSTALL.')
  process.exit(0)
}

if (cmd === 'off') {
  if (!existsSync(backup)) {
    console.error('No backup found - nothing to restore. Triggers are presumably already real.')
    process.exit(1)
  }
  writeFileSync(face, readFileSync(backup))
  rmSync(backup)
  console.log('Real triggers restored. REINSTALL so the watch stops showing a debug build:')
  console.log('  ./gradlew :watchface:installDebug')
  process.exit(0)
}

console.error(`Unknown command "${cmd}". Use: on | off | status`)
process.exit(1)
