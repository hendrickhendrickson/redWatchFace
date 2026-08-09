/**
 * The weather chip: an icon and a temperature, above the stat row.
 *
 * FIVE ICONS, AND THE ORDER THEY ARE TESTED IN IS THE DESIGN. Rain wins over
 * everything, because a wet forecast matters more than what the sky is doing;
 * "partly cloudy" is tested BEFORE plain "clear", since condition 14 would
 * otherwise never be reached; clear-and-daytime gives the sun and clear-at-night
 * the moon; anything else falls through to a cloud. There is no negation anywhere -
 * the ordering does that work, the same idiom hero-props.ts uses for the fist.
 *
 * ONLY TWO CONDITION CODES ARE CONFIRMED ON HARDWARE: 1 is clear and 14 is partly
 * cloudy. That is why the fallback is a cloud rather than an exhaustive list -
 * every unverified code lands somewhere sensible instead of nowhere.
 *
 * NO FORECAST IS A STATE, not an error: "--°" in a dimmed colour, so the row keeps
 * its shape rather than collapsing when the weather service has nothing.
 */

import { el, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { AMBIENT_HIDE } from '../crossfade.ts'
import { switchOn, whenElse } from '../condition.ts'
import { CLEAR_DAY, CLEAR_NIGHT, HAVE_FORECAST, PARTLY_CLOUDY, RAIN_ICON } from '../states.ts'
import { chipValue } from '../chip.ts'
import { TEXT_X } from '../data/chips.ts'
import { SUN, SUN_DISC, SUN_RAYS } from '../data/weather.ts'

const CHIP = G.ANCHORS.CHIP_WEATHER

/**
 * All five icons share one box, and only that.
 *
 * The three that contain a cloud draw it at three DIFFERENT sizes - 20x8 behind
 * rain, 19x8 beside the sun, 22x9 alone - because each is composed against
 * different neighbours. There is no shared cloud to extract, and pretending
 * otherwise would mean a helper with three sets of numbers passed into it.
 */
const icon = (name: string, shapes: Node[]): Node =>
  el('PartDraw', { ...G.WX_ICON_BOX, name }, shapes)

export const chipWeather = (): Node =>
  el('Group', { name: 'chip_weather', ...CHIP, alpha: 255 }, [
    el('Variant', AMBIENT_HIDE),
    whenElse(
      'wx_have',
      HAVE_FORECAST,
      [
        el('Group', { name: 'wx_live', ...G.at(CHIP.width, CHIP.height), alpha: 255 }, [
          switchOn(
            [
              {
                name: 'wx_wet',
                when: RAIN_ICON,
                then: [
                  icon('wx_icon_rain', [
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
                ],
              },
              {
                name: 'wx_partly',
                when: PARTLY_CLOUDY,
                then: [
                  icon('wx_icon_partly', [
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
                ],
              },
              {
                name: 'wx_sun',
                when: CLEAR_DAY,
                then: [
                  icon('wx_icon_sun', [
                    el('Ellipse', { ...SUN_DISC }, [
                      el('Fill', { color: C.SUN }),
                    ]),
                    ...SUN_RAYS.map((s) =>
                      el('Line', { ...s }, [
                        el('Stroke', { color: C.SUN, thickness: SUN.ray.thickness, cap: 'ROUND' }),
                      ]),
                    ),
                  ]),
                ],
              },
              {
                name: 'wx_moon',
                when: CLEAR_NIGHT,
                then: [
                  icon('wx_icon_moon', [
                    el('Ellipse', { x: 2, y: 4, width: 20, height: 20 }, [
                      el('Fill', { color: C.MOON }),
                    ]),
                    el('Ellipse', { x: 13, y: 2, width: 20, height: 20 }, [
                      el('Fill', { color: C.BLACK }),
                    ]),
                  ]),
                ],
              },
            ],
            [
              icon('wx_icon_cloud', [
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
            ],
            // WFF declares predicates and dispatches on them separately, and this
            // section is the one that uses both orders. See switchOn in condition.ts.
            ['wx_wet', 'wx_sun', 'wx_moon', 'wx_partly'],
          ),
          chipValue(CHIP, {
            name: 'wx_temp', x: TEXT_X.WEATHER, colour: C.CREAM, weight: 'NORMAL',
            text: '%d°', source: 'WEATHER.TEMPERATURE',
          }),
        ]),
      ],
      [
        // Full width and CENTRED, unlike every other chip value: with no forecast
        // there is no icon to sit beside, so the dashes centre in the chip instead
        // of hanging off a left edge that has nothing on it.
        chipValue(CHIP, {
          name: 'wx_none', x: 0, colour: C.WX_NONE, weight: 'NORMAL',
          align: 'CENTER', text: '--°',
        }),
      ],
    ),
  ])
