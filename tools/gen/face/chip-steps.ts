// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
export const chipSteps = (): Node =>
  el('Group', { name: 'chip_steps', x: 172, y: 216, width: 98, height: 36, alpha: 255 }, [
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    el('PartDraw', { name: 'steps_icon', x: 0, y: 1, width: 28, height: 34, pivotX: 0.5, pivotY: 0.5, angle: -25 }, [
      el('Ellipse', { x: 7.5, y: 4.5, width: 11, height: 13 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Ellipse', { x: 9.25, y: 11, width: 7.5, height: 9 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Rectangle', { x: 9.25, y: 15.5, width: 7.5, height: 4 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Rectangle', { x: 10.5, y: 21.5, width: 7, height: 3.5 }, [
        el('Fill', { color: C.LIMB }),
      ]),
      el('Ellipse', { x: 10.5, y: 22, width: 7, height: 6.5 }, [
        el('Fill', { color: C.LIMB }),
      ]),
    ]),
    el('PartText', { name: 'steps_value', x: 28, y: 0, width: 70, height: 36 }, [
      el('Text', { align: 'START' }, [
        el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'BOLD', slant: 'NORMAL', color: C.CREAM }, [
          el('Template', {}, [
            cdata('%d'),
            el('Parameter', { expression: '[STEP_COUNT]' }),
          ]),
        ]),
      ]),
    ]),
  ])
