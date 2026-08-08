// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { companionGyro } from '../blob.ts'
export const lightning = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'prop_storm' }, [
        text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 90'),
      ]),
    ]),
    el('Compare', { expression: 'prop_storm' }, [
      el('Group', { name: 'companion_lightning', x: 133, y: 264, width: 56, height: 68, alpha: 255 }, [
        companionGyro(),
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('PartDraw', { name: 'bolt', x: 0, y: 0, width: 56, height: 68 }, [
          el('Line', { startX: 22, startY: 0, endX: 38, endY: 28 }, [
            el('Stroke', { color: C.BOLT, thickness: 6, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 38, startY: 28, endX: 24, endY: 32 }, [
            el('Stroke', { color: C.BOLT, thickness: 6, cap: 'SQUARE' }),
          ]),
          el('Line', { startX: 24, startY: 32, endX: 42, endY: 64 }, [
            el('Stroke', { color: C.BOLT, thickness: 6, cap: 'SQUARE' }),
          ]),
        ]),
      ]),
    ]),
  ])
