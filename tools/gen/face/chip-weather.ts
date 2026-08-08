// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
export const chipWeather = (): Node =>
  el('Group', { name: 'chip_weather', x: 190, y: 184, width: 90, height: 32, alpha: 255 }, [
    el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
    el('Condition', {}, [
      el('Expressions', {}, [
        el('Expression', { name: 'wx_have' }, [
          text('[WEATHER.IS_AVAILABLE]'),
        ]),
      ]),
      el('Compare', { expression: 'wx_have' }, [
        el('Group', { name: 'wx_live', x: 0, y: 0, width: 90, height: 32, alpha: 255 }, [
          el('Condition', {}, [
            el('Expressions', {}, [
              el('Expression', { name: 'wx_wet' }, [
                text('[WEATHER.CHANCE_OF_PRECIPITATION] &gt;= 50'),
              ]),
              el('Expression', { name: 'wx_sun' }, [
                text('[WEATHER.CONDITION] == 1 &amp;&amp; [WEATHER.IS_DAY]'),
              ]),
              el('Expression', { name: 'wx_moon' }, [
                text('[WEATHER.CONDITION] == 1'),
              ]),
              el('Expression', { name: 'wx_partly' }, [
                text('[WEATHER.CONDITION] == 14'),
              ]),
            ]),
            el('Compare', { expression: 'wx_wet' }, [
              el('PartDraw', { ...G.WX_ICON_BOX, name: 'wx_icon_rain' }, [
                el('RoundRectangle', { x: 3, y: 9, width: 20, height: 8, cornerRadiusX: 4, cornerRadiusY: 4 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Ellipse', { x: 5, y: 4, width: 10, height: 10 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Ellipse', { x: 12, y: 2, width: 11, height: 11 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Line', { startX: 8, startY: 19, endX: 6.5, endY: 24 }, [
                  el('Stroke', { color: C.RAINDROP, thickness: 2.4, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 14, startY: 19, endX: 12.5, endY: 24 }, [
                  el('Stroke', { color: C.RAINDROP, thickness: 2.4, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 20, startY: 19, endX: 18.5, endY: 24 }, [
                  el('Stroke', { color: C.RAINDROP, thickness: 2.4, cap: 'ROUND' }),
                ]),
              ]),
            ]),
            el('Compare', { expression: 'wx_partly' }, [
              el('PartDraw', { ...G.WX_ICON_BOX, name: 'wx_icon_partly' }, [
                el('Ellipse', { x: 3, y: 2, width: 11, height: 11 }, [
                  el('Fill', { color: C.SUN }),
                ]),
                el('RoundRectangle', { x: 4, y: 15, width: 19, height: 8, cornerRadiusX: 4, cornerRadiusY: 4 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Ellipse', { x: 6, y: 10, width: 10, height: 10 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Ellipse', { x: 13, y: 8, width: 11, height: 11 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
              ]),
            ]),
            el('Compare', { expression: 'wx_sun' }, [
              el('PartDraw', { ...G.WX_ICON_BOX, name: 'wx_icon_sun' }, [
                el('Ellipse', { x: 7, y: 7, width: 12, height: 12 }, [
                  el('Fill', { color: C.SUN }),
                ]),
                el('Line', { startX: 13, startY: 1, endX: 13, endY: 4.5 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 13, startY: 21.5, endX: 13, endY: 25 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 1, startY: 13, endX: 4.5, endY: 13 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 21.5, startY: 13, endX: 25, endY: 13 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 4.6, startY: 4.6, endX: 7.1, endY: 7.1 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 18.9, startY: 18.9, endX: 21.4, endY: 21.4 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 21.4, startY: 4.6, endX: 18.9, endY: 7.1 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
                el('Line', { startX: 7.1, startY: 18.9, endX: 4.6, endY: 21.4 }, [
                  el('Stroke', { color: C.SUN, thickness: 2.2, cap: 'ROUND' }),
                ]),
              ]),
            ]),
            el('Compare', { expression: 'wx_moon' }, [
              el('PartDraw', { ...G.WX_ICON_BOX, name: 'wx_icon_moon' }, [
                el('Ellipse', { x: 2, y: 4, width: 20, height: 20 }, [
                  el('Fill', { color: C.MOON }),
                ]),
                el('Ellipse', { x: 13, y: 2, width: 20, height: 20 }, [
                  el('Fill', { color: C.BLACK }),
                ]),
              ]),
            ]),
            el('Default', {}, [
              el('PartDraw', { ...G.WX_ICON_BOX, name: 'wx_icon_cloud' }, [
                el('RoundRectangle', { x: 2, y: 13, width: 22, height: 9, cornerRadiusX: 4.5, cornerRadiusY: 4.5 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Ellipse', { x: 4, y: 7, width: 12, height: 12 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
                el('Ellipse', { x: 12, y: 5, width: 13, height: 13 }, [
                  el('Fill', { color: C.CLOUD }),
                ]),
              ]),
            ]),
          ]),
          el('PartText', { name: 'wx_temp', x: 32, y: 0, width: 58, height: 32 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'NORMAL', slant: 'NORMAL', color: C.CREAM }, [
                el('Template', {}, [
                  cdata('%d°'),
                  el('Parameter', { expression: '[WEATHER.TEMPERATURE]' }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
      el('Default', {}, [
        el('PartText', { name: 'wx_none', x: 0, y: 0, width: 90, height: 32 }, [
          el('Text', { align: 'CENTER' }, [
            el('Font', { family: 'SYNC_TO_DEVICE', size: 25, weight: 'NORMAL', slant: 'NORMAL', color: C.WX_NONE }, [
              cdata('--°'),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
