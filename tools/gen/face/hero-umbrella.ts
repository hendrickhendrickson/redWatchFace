// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { heroGyro } from '../blob.ts'
export const heroUmbrella = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'prop_wet' }, [
        text('[WEATHER.IS_AVAILABLE] &amp;&amp; [WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50'),
      ]),
    ]),
    el('Compare', { expression: 'prop_wet' }, [
      el('Group', { name: 'hero_umbrella', x: 137, y: 250, width: 164, height: 70, alpha: 255 }, [
        heroGyro(),
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('PartDraw', { name: 'umbrella_shaft', x: 0, y: 0, width: 164, height: 70 }, [
          el('Line', { startX: 80, startY: 18, endX: 80, endY: 38 }, [
            el('Stroke', { color: C.BONE, thickness: 3, cap: 'ROUND' }),
          ]),
          el('Line', { startX: 80, startY: 56, endX: 80, endY: 60 }, [
            el('Stroke', { color: C.BONE, thickness: 3, cap: 'ROUND' }),
          ]),
          el('Arc', { centerX: 74, centerY: 60, width: 12, height: 12, startAngle: 90, endAngle: 270 }, [
            el('Stroke', { color: C.BONE, thickness: 3, cap: 'ROUND' }),
          ]),
        ]),
        el('PartDraw', { name: 'umbrella_canopy', x: 0, y: 0, width: 164, height: 30 }, [
          el('RoundRectangle', { x: 0, y: 12, width: 160, height: 10, cornerRadiusX: 4, cornerRadiusY: 4 }, [
            el('Fill', { color: C.TEAL }),
          ]),
          el('Ellipse', { x: 0, y: 9, width: 45, height: 13 }, [
            el('Fill', { color: C.TEAL }),
          ]),
          el('Ellipse', { x: 38, y: 1, width: 45, height: 21 }, [
            el('Fill', { color: C.TEAL }),
          ]),
          el('Ellipse', { x: 77, y: 1, width: 45, height: 21 }, [
            el('Fill', { color: C.TEAL }),
          ]),
          el('Ellipse', { x: 115, y: 9, width: 45, height: 13 }, [
            el('Fill', { color: C.TEAL }),
          ]),
          el('Line', { startX: 39, startY: 13, endX: 39, endY: 21 }, [
            el('Stroke', { color: C.TEAL_DARK, thickness: 1.8, cap: 'BUTT' }),
          ]),
          el('Line', { startX: 80, startY: 13, endX: 80, endY: 21 }, [
            el('Stroke', { color: C.TEAL_DARK, thickness: 1.8, cap: 'BUTT' }),
          ]),
          el('Line', { startX: 120, startY: 13, endX: 120, endY: 21 }, [
            el('Stroke', { color: C.TEAL_DARK, thickness: 1.8, cap: 'BUTT' }),
          ]),
        ]),
      ]),
    ]),
  ])
