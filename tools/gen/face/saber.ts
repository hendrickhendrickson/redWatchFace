/**
 * The 4 May lightsaber, drawn for either blob.
 *
 * ONE BUILDER FOR TWO SABERS, and it is here rather than in hero-props.ts for the
 * reason costumes.ts exists: a shape both blobs draw belongs to neither of them.
 * The hero's is blue and leans right, the companion's is green and leans left, and
 * that is the whole difference - everything else, including the order the strokes
 * go down in, has to be identical or the pair stops reading as a pair.
 *
 * SIX STROKES DOWN ONE AXIS, from the pommel outward, each covering the join
 * behind it:
 *
 *   hilt      the body, in a DARK grey - see C.HILT for why the hammer's pale
 *             steel was wrong beside something this bright
 *   rings     two darker bands cut into the hilt, which is what makes 13px of
 *             grey read as machined rather than as a stick
 *   emitter   the shroud, in the one LIGHT tone here: the place a real hilt
 *             catches its own blade
 *   blade     the coloured glow
 *   core      white, thinner, INSIDE the glow - the only thing that makes a
 *             coloured line read as light rather than as paint
 *
 * data/props.ts owns the axis and asserts that the fist lands in the middle of the
 * hilt rather than up by the emitter, which is where it landed before.
 */

import { el, type Node } from '../xml.ts';
import { C } from '../palette.ts';
import type { Saber } from '../data/props.ts';

/** BUTT below the emitter - a pommel is a flat end, and a round cap on 6.5px of
 *  hilt adds three pixels of dome the part box is not sized for. */
const run = (stroked: Saber['hilt'], colour: string, cap: 'ROUND' | 'BUTT'): Node =>
	el('Line', { ...stroked.seg }, [
		el('Stroke', { color: colour, thickness: stroked.thickness, cap })
	]);

export const saberPart = (name: string, saber: Saber, glow: string): Node =>
	el('PartDraw', { name, ...saber.box }, [
		run(saber.hilt, C.HILT, 'BUTT'),
		...saber.rings.map((ring) => run(ring, C.HILT_DARK, 'BUTT')),
		run(saber.emitter, C.EMITTER, 'BUTT'),
		run(saber.blade, glow, 'ROUND'),
		run(saber.core, C.WHITE, 'ROUND')
	]);
