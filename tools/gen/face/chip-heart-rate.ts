// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
export const chipHeartRate = (): Node =>
  el('Group', { name: 'chip_heart_rate', x: 92, y: 216, width: 70, height: 36, alpha: 255 }, [
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    el('PartDraw', { name: 'hr_icon_lobes', x: 0, y: 8, width: 22, height: 13 }, [
      el('Ellipse', { x: 0, y: 0, width: 13, height: 13 }, [
        el('Fill', { color: C.CORAL }),
      ]),
      el('Ellipse', { x: 9, y: 0, width: 13, height: 13 }, [
        el('Fill', { color: C.CORAL }),
      ]),
    ]),
    el('PartDraw', { name: 'hr_icon_point', x: 2, y: 10, width: 18, height: 18, pivotX: 0.5, pivotY: 0.5, angle: 45 }, [
      el('Rectangle', { x: 2.5, y: 2.5, width: 13, height: 13 }, [
        el('Fill', { color: C.CORAL }),
      ]),
    ]),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'hr_valid' }, [
          text('[HEART_RATE] &gt; 0'),
        ]),
      ]),
      el('Compare', { expression: 'hr_valid' }, [
        el('PartText', { name: 'hr_value', x: 28, y: 0, width: 42, height: 36 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'BOLD', slant: 'NORMAL', color: C.CREAM }, [
              el('Template', {}, [
                cdata('%.0f'),
                el('Parameter', { expression: '[HEART_RATE]' }),
              ]),
            ]),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('PartText', { name: 'hr_placeholder', x: 28, y: 0, width: 42, height: 36 }, [
          el('Text', { align: 'START' }, [
            el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'BOLD', slant: 'NORMAL', color: C.HR_PLACEHOLDER }, [
              cdata('--'),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
