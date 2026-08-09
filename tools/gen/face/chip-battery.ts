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
 * The shell is drawn OUTSIDE the Condition, since it looks the same either way.
 */

import { el, cdata, type Node } from '../xml.ts'
import { C, type Hex } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { whenElse } from '../condition.ts'
import { BATTERY_LOW } from '../states.ts'
import { SIZE, font } from '../type.ts'

/** The fill at 100%, inset inside the shell's 2px stroke. */
const FILL = { x: 3.5, y: 3.5, width: 15.5, height: 8 }
const FILL_RADIUS = { cornerRadiusX: 1.5, cornerRadiusY: 1.5 }

/**
 * The charge bar, and the one number in this file that was unexplained.
 *
 * `1 + [BATTERY_PERCENT] * 0.145` appeared twice with no derivation, and 0.145 is
 * not arbitrary: it is (FILL.width - 1) / 100, so the bar is 1px wide at empty and
 * exactly fills its housing at 100. Derived from the rectangle it lives in, the
 * bar cannot outgrow the shell when the shell is resized - which was previously a
 * silent two-site edit.
 */
const fillWidth = `1 + [BATTERY_PERCENT] * ${(FILL.width - 1) / 100}`

const bar = (name: string, colour: Hex): Node =>
  el('PartDraw', { ...G.BATTERY_BOX, name }, [
    el('RoundRectangle', { ...FILL, ...FILL_RADIUS }, [
      el('Transform', { target: 'width', value: fillWidth }),
      el('Fill', { color: colour }),
    ]),
  ])

const value = (name: string, colour: Hex): Node =>
  el('PartText', { name, x: 33, y: 0, width: 77, height: 36 }, [
    el('Text', { align: 'START' }, [
      el('Font', font(SIZE.CHIP, 'BOLD', colour), [
        el('Template', {}, [
          cdata('%d%%'),
          el('Parameter', { expression: '[BATTERY_PERCENT]' }),
        ]),
      ]),
    ]),
  ])

export const chipBattery = (): Node =>
  el('Group', { name: 'chip_battery', ...G.ANCHORS.CHIP_BATTERY, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    el('PartDraw', { ...G.BATTERY_BOX, name: 'battery_shell' }, [
      el('RoundRectangle', { x: 1, y: 1, width: 20, height: 13, cornerRadiusX: 3.5, cornerRadiusY: 3.5 }, [
        el('Stroke', { color: C.CREAM, thickness: 2, cap: 'ROUND' }),
      ]),
      el('Rectangle', { x: 21.5, y: 4.5, width: 3, height: 6 }, [
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
