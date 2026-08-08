// GENERATED SCAFFOLD. Section order is DRAW ORDER: WFF paints in document
// order and has no z-index, so moving an entry here moves it in front of or
// behind its neighbours.
import { dateInteractive } from './date-interactive.ts'
import { dateAmbient } from './date-ambient.ts'
import { clock } from './clock.ts'
import { chipWeather } from './chip-weather.ts'
import { chipHeartRate } from './chip-heart-rate.ts'
import { chipSteps } from './chip-steps.ts'
import { chipBattery } from './chip-battery.ts'
import { blobHero } from './blob-hero.ts'
import { heroPropsSection } from './hero-props.ts'
import { companionBurst } from './companion-burst.ts'
import { blobCompanion } from './blob-companion.ts'
import { rain } from './rain.ts'
import { heroUmbrella } from './hero-umbrella.ts'
import { lightning } from './lightning.ts'
import { freezeMark } from './freeze-mark.ts'
import { moonMark } from './moon-mark.ts'
import { sleepZzz } from './sleep-zzz.ts'
import type { Node } from '../xml.ts'

export const sections = (): Node[] => [
  dateInteractive(),
  dateAmbient(),
  clock(),
  chipWeather(),
  chipHeartRate(),
  chipSteps(),
  chipBattery(),
  blobHero(),
  // Immediately after the hero, which is where these three Conditions used to
  // sit as its last children - so the draw order is unchanged even though the
  // coordinate space is. See the header of hero-props.ts for why they moved.
  heroPropsSection(),
  companionBurst(),
  blobCompanion(),
  rain(),
  heroUmbrella(),
  lightning(),
  freezeMark(),
  moonMark(),
  sleepZzz(),
]
