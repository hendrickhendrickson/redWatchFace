// GENERATED SCAFFOLD from the pre-migration watchface.xml.
// Safe to hand-edit: build.ts --diff is the guard.
import { el, text, cdata, type Node } from '../xml.ts'
import { C } from '../palette.ts'
import * as G from '../geometry.ts'
import { heroGyro, companionGyro } from '../blob.ts'
export const sleepZzz = (): Node =>
  el('Condition', {}, [
    el('Expressions', {}, [
      el('Expression', { name: 'prop_night' }, [
        text('[HOUR_0_23] &gt;= 23 || 7 &gt; [HOUR_0_23]'),
      ]),
    ]),
    el('Compare', { expression: 'prop_night' }, [
      el('Group', { name: 'sleep_zzz', x: 294, y: 304, width: 64, height: 55, alpha: 255 }, [
        heroGyro(),
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('Group', { name: 'sleep_zzz_drift', x: 0, y: 0, width: 64, height: 55, alpha: 255 }, [
          el('Transform', { target: 'y', value: '0 - 14 * ((([SECOND] % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3)' }),
          el('Transform', { target: 'alpha', value: '255 * (2 * ((([SECOND] % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3) - clamp(4 * ((([SECOND] % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3) - 2, 0, 2))' }),
          el('PartText', { name: 'zzz_small', x: 0, y: 32, width: 16, height: 18 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 13, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_SMALL }, [
                cdata('z'),
              ]),
            ]),
          ]),
          el('PartText', { name: 'zzz_mid', x: 17, y: 18, width: 20, height: 22 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 18, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_MID }, [
                cdata('z'),
              ]),
            ]),
          ]),
          el('PartText', { name: 'zzz_big', x: 35, y: 2, width: 26, height: 28 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 24, weight: 'BOLD', slant: 'ITALIC', color: C.ICE }, [
                cdata('z'),
              ]),
            ]),
          ]),
        ]),
      ]),
      el('Group', { name: 'mini_sleep_zzz', x: 105, y: 338, width: 46, height: 44, alpha: 255 }, [
        companionGyro(),
        el('Variant', { mode: 'AMBIENT', target: 'alpha', value: 0 }),
        el('Group', { name: 'mini_sleep_zzz_drift', x: 0, y: 0, width: 46, height: 44, alpha: 255 }, [
          el('Transform', { target: 'y', value: '0 - 9 * (((([SECOND] + 1) % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3)' }),
          el('Transform', { target: 'alpha', value: '255 * (2 * (((([SECOND] + 1) % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3) - clamp(4 * (((([SECOND] + 1) % 3) + [SECOND_MILLISECOND] - [SECOND]) / 3) - 2, 0, 2))' }),
          el('PartText', { name: 'mini_zzz_small', x: 32, y: 28, width: 12, height: 14 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 9, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_SMALL }, [
                cdata('z'),
              ]),
            ]),
          ]),
          el('PartText', { name: 'mini_zzz_mid', x: 17, y: 14, width: 15, height: 17 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 12, weight: 'BOLD', slant: 'ITALIC', color: C.ZZZ_MID }, [
                cdata('z'),
              ]),
            ]),
          ]),
          el('PartText', { name: 'mini_zzz_big', x: 0, y: 0, width: 18, height: 20 }, [
            el('Text', { align: 'START' }, [
              el('Font', { family: 'SYNC_TO_DEVICE', size: 15, weight: 'BOLD', slant: 'ITALIC', color: C.ICE }, [
                cdata('z'),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
