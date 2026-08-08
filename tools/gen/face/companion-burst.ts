// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { companionGyro } from '../blob.ts'
export const companionBurst = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'zap_burst' }, [
        text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90'),
      ]),
    ]),
    el('Compare', { expression: 'zap_burst' }, [
      el('Group', { name: 'companion_burst', x: 123, y: 306, width: 104, height: 104, alpha: 255 }, [
        companionGyro(),
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('PartDraw', { name: 'burst', x: 0, y: 0, width: 104, height: 104 }, [
          el('Ellipse', { x: 37, y: 37, width: 30, height: 30 }, [
            el('Fill', { color: C.BURST }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 52, endY: 2 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 70, endY: 21 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 88, endY: 31 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 88, endY: 52 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 95, endY: 77 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 70, endY: 83 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 52, endY: 102 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 34, endY: 83 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 9, endY: 77 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 16, endY: 52 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 9, endY: 27 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 52, startY: 52, endX: 34, endY: 21 }, [
            el('Stroke', { color: C.BURST, thickness: 9, cap: 'SQUARE' }),
          ]),
        ]),
      ]),
    ]),
  ])
