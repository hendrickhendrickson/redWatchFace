/**
 * The battery chip: a cell outline, a fill that tracks the charge, and a number.
 *
 * THE TWO BRANCHES ARE THE SAME DRAWING IN TWO COLOURS. Low is coral, normal is
 * green, and nothing else about them differs - so both come from one builder here
 * rather than from two copies that could drift apart in shape.
 *
 * IT READS THE PLATFORM'S OWN LOW FLAG rather than picking a percentage. Where
 * "low" sits is a device decision, and duplicating it here would mean the chip and
 * the system disagreeing about it on some watches.
 *
 * THE BAR'S GROWTH RATE IS DERIVED, not typed. `0.145` appeared twice with no
 * explanation; it is (fill width - 1) / 100, so the bar is 1px at empty and exactly
 * fills its housing at 100. data/chips.ts computes it and asserts the housing sits
 * inside the shell's stroke, which is what stops a full charge painting over the
 * outline - WFF centres a stroke on its path, so half the 2px line is inside the
 * shell's own bounds.
 *
 * The shell is drawn OUTSIDE the Condition, since it looks the same either way.
 */

import { el, type Node } from '../xml.ts'
import { C, type Hex } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { whenElse } from '../condition.ts'
import { BATTERY_LOW } from '../states.ts'
import { chipValue } from '../chip.ts'
import {
  BATTERY, BATTERY_FILL, BATTERY_NUB, BATTERY_SHELL, TEXT_X, batteryFillWidth,
} from '../data/chips.ts'

const CHIP = G.ANCHORS.CHIP_BATTERY

const bar = (name: string, colour: Hex): Node =>
  el('PartDraw', { ...G.BATTERY_BOX, name }, [
    el('RoundRectangle', { ...BATTERY_FILL }, [
      el('Transform', { target: 'width', value: batteryFillWidth() }),
      el('Fill', { color: colour }),
    ]),
  ])

const value = (name: string, colour: Hex): Node =>
  chipValue(CHIP, { name, x: TEXT_X.BATTERY, colour, text: '%d%%', source: 'BATTERY_PERCENT' })

export const chipBattery = (): Node =>
  el('Group', { name: 'chip_battery', ...CHIP, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    el('PartDraw', { ...G.BATTERY_BOX, name: 'battery_shell' }, [
      el('RoundRectangle', { ...BATTERY_SHELL }, [
        el('Stroke', { color: C.CREAM, thickness: BATTERY.shell.thickness, cap: 'ROUND' }),
      ]),
      el('Rectangle', { ...BATTERY_NUB }, [
        el('Fill', { color: C.CREAM }),
      ]),
    ]),
    whenElse(
      'battery_low',
      BATTERY_LOW,
      [bar('battery_fill_low', C.CORAL), value('battery_value_low', C.CORAL)],
      [bar('battery_fill', C.GREEN), value('battery_value', C.CREAM)],
    ),
  ])
