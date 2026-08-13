/**
 * The section list. SECTION ORDER IS DRAW ORDER: WFF paints in document order and
 * has no z-index, so moving an entry here moves it in front of or behind its
 * neighbours - which is load-bearing in at least three places. hero_props sits
 * immediately after blobHero so a held object paints over the hero; both blobs sit
 * before the rain so it falls in front of them; and companion_burst sits before
 * blobCompanion so the flash is behind the blob it lights.
 *
 * This was the last file still carrying the migration's `GENERATED SCAFFOLD`
 * header. It is not a scaffold - it is the one place the stacking order is stated -
 * and the header was the reason nobody had said so.
 */
import { dateInteractive } from './date-interactive.ts';
import { dateAmbient } from './date-ambient.ts';
import { clock } from './clock.ts';
import { chipWeather } from './chip-weather.ts';
import { chipHeartRate } from './chip-heart-rate.ts';
import { chipSteps } from './chip-steps.ts';
import { chipBattery } from './chip-battery.ts';
import { christmasTree } from './christmas-tree.ts';
import { blobHero } from './blob-hero.ts';
import { heroPropsSection } from './hero-props.ts';
import { companionBurst } from './companion-burst.ts';
import { blobCompanion } from './blob-companion.ts';
import { companionProps } from './companion-props.ts';
import { rain } from './rain.ts';
import { heroUmbrella } from './hero-umbrella.ts';
import { lightning } from './lightning.ts';
import { freezeMark } from './freeze-mark.ts';
import { moonMark } from './moon-mark.ts';
import { sleepZzz } from './sleep-zzz.ts';
import { fireworks } from './fireworks.ts';
import { confetti } from './confetti.ts';
import type { Node } from '../xml.ts';

export const sections = (): Node[] => [
	dateInteractive(),
	dateAmbient(),
	clock(),
	chipWeather(),
	chipHeartRate(),
	chipSteps(),
	chipBattery(),
	// SCENERY, so it is painted before the cast. It shares no pixels with anything
	// (asserted in data/celebrations.ts against the one thing whose corner it is
	// near, the companion's sleep z's), but scenery-first is the order that stays
	// right when something later moves.
	christmasTree(),
	blobHero(),
	// Immediately after the hero, which is where these three Conditions used to
	// sit as its last children - so the draw order is unchanged even though the
	// coordinate space is. See the header of hero-props.ts for why they moved.
	heroPropsSection(),
	companionBurst(),
	blobCompanion(),
	// Immediately after the companion, for the reason hero_props sits immediately
	// after the hero: a held object paints over the blob holding it.
	companionProps(),
	rain(),
	heroUmbrella(),
	lightning(),
	freezeMark(),
	moonMark(),
	sleepZzz(),
	// Last, so they draw over everything else - the same reason rain sits in
	// front of both blobs rather than behind them. These two are the only
	// sections meant to cover the clock, and they can never both fire: the
	// calendar proof in states.ts holds every celebration disjoint.
	fireworks(),
	confetti()
];
