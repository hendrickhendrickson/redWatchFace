// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
export const chipBattery = (): Node =>
  el('Group', { name: 'chip_battery', x: 280, y: 216, width: 110, height: 36, alpha: 255 }, [
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    el('PartDraw', { ...G.BATTERY_BOX, name: 'battery_shell' }, [
      el('RoundRectangle', { x: 1, y: 1, width: 20, height: 13, cornerRadiusX: 3.5, cornerRadiusY: 3.5 }, [
        el('Stroke', { color: C.CREAM, thickness: 2, cap: 'ROUND' }),
      ]),
      el('Rectangle', { x: 21.5, y: 4.5, width: 3, height: 6 }, [
        el('Fill', { color: C.CREAM }),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'battery_low' }, [
          text('[BATTERY_IS_LOW]'),
        ]),
      ]),
      el('Compare', { expression: 'battery_low' }, [
        el('PartDraw', { ...G.BATTERY_BOX, name: 'battery_fill_low' }, [
          el('RoundRectangle', { x: 3.5, y: 3.5, width: 15.5, height: 8, cornerRadiusX: 1.5, cornerRadiusY: 1.5 }, [
            el('Transform', { target: 'width', value: '1 + [BATTERY_PERCENT] * 0.145' }),
            el('Fill', { color: C.CORAL }),
          ]),
        ]),
        el('PartText', { name: 'battery_value_low', x: 33, y: 0, width: 77, height: 36 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'BOLD', slant: 'NORMAL', color: C.CORAL }, [
              el('Template', {}, [
                cdata('%d%%'),
                el('Parameter', { expression: '[BATTERY_PERCENT]' }),
              ]),
            ]),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('PartDraw', { ...G.BATTERY_BOX, name: 'battery_fill' }, [
          el('RoundRectangle', { x: 3.5, y: 3.5, width: 15.5, height: 8, cornerRadiusX: 1.5, cornerRadiusY: 1.5 }, [
            el('Transform', { target: 'width', value: '1 + [BATTERY_PERCENT] * 0.145' }),
            el('Fill', { color: C.GREEN }),
          ]),
        ]),
        el('PartText', { name: 'battery_value', x: 33, y: 0, width: 77, height: 36 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'BOLD', slant: 'NORMAL', color: C.CREAM }, [
              el('Template', {}, [
                cdata('%d%%'),
                el('Parameter', { expression: '[BATTERY_PERCENT]' }),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
