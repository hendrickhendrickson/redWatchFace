// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
export const freezeMark = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'prop_freezing' }, [
        text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.TEMPERATURE] &lt;= 0'),
      ]),
    ]),
    el('Compare', { expression: 'prop_freezing' }, [
      el('Group', { name: 'freeze_mark', x: 156, y: 278, width: 36, height: 36, alpha: 255 }, [
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('PartDraw', { name: 'snowflake', x: 0, y: 0, width: 36, height: 36 }, [
          el('Line', { startX: 18, startY: 3, endX: 18, endY: 33 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2.6, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 5.01, startY: 10.5, endX: 30.99, endY: 25.5 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2.6, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 5.01, startY: 25.5, endX: 30.99, endY: 10.5 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2.6, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 18, startY: 9, endX: 14.17, endY: 5.79 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 18, startY: 9, endX: 21.83, endY: 5.79 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 18, startY: 27, endX: 14.17, endY: 30.21 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 18, startY: 27, endX: 21.83, endY: 30.21 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 25.79, startY: 13.5, endX: 26.66, endY: 8.58 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 25.79, startY: 13.5, endX: 30.49, endY: 15.21 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 25.79, startY: 22.5, endX: 30.49, endY: 20.79 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 25.79, startY: 22.5, endX: 26.66, endY: 27.42 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 10.21, startY: 13.5, endX: 9.34, endY: 8.58 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 10.21, startY: 13.5, endX: 5.51, endY: 15.21 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 10.21, startY: 22.5, endX: 5.51, endY: 20.79 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 10.21, startY: 22.5, endX: 9.34, endY: 27.42 }, [
            el('Stroke', { color: C.SNOWFLAKE, thickness: 2, cap: 'ROUND' }),
          ]),
        ]),
      ]),
    ]),
  ])
