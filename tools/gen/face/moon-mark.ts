// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
export const moonMark = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'prop_moon' }, [
        text('([HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]) &amp;&amp; ([WEATHER.TEMPERATURE] &gt; 0 || [WEATHER.IS_AVAILABLE] == 0)'),
      ]),
    ]),
    el('Compare', { expression: 'prop_moon' }, [
      el('Group', { name: 'moon_mark', x: 156, y: 278, width: 36, height: 36, alpha: 255 }, [
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('PartDraw', { name: 'moon_disc', x: 0, y: 0, width: 36, height: 36 }, [
          el('Ellipse', { x: 6, y: 6, width: 24, height: 24 }, [
            el('Fill', { color: C.MOON_DISC }),
          ]),
          el('Ellipse', { x: 18, y: 6, width: 24, height: 24 }, [
            el('Transform', { target: 'x', value: '6 + clamp(1.6255 * [MOON_PHASE_POSITION], 0, 24) + clamp(24 - 1.6255 * [MOON_PHASE_POSITION], -24, 0)' }),
            el('Fill', { color: C.BLACK }),
          ]),
        ]),
      ]),
    ]),
  ])
