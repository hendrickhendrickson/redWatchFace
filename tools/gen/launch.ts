/**
 * Tap targets. `<Launch>` is the only way a region of this face opens an app.
 *
 * ONE PER ELEMENT, on a `Group` or on any `Part` (`groupElement.xsd`,
 * `abstractPartType.xsd`). The tappable region is the element's declared box, so the
 * Launch goes on the group whose box is the region you want tapped - not on the glyph
 * inside it, which would leave the rest of the row dead.
 *
 * THE TARGET IS UNCHECKED, and this is the usual trap in a different costume:
 * `launchTargetType` is `<xs:union memberTypes="_systemShortcutType xs:string"/>`, so a
 * misspelt shortcut, an app id and a sentence are all the same thing to the validator.
 * A wrong one validates, ships, and does nothing on the wrist without saying so. The
 * enumeration is restated below so a typo is a typecheck error instead of a dead tap.
 *
 * THERE IS NO WEATHER SHORTCUT. The eight below are the whole list; the weather chip
 * cannot be made to open a weather app this way. A `ComplicationSlot` bound to a
 * weather provider is tappable by construction and is the only route to it.
 */

import { el, type Node } from './xml.ts';

/** The eight system shortcuts, from `common/launchElement.xsd`. */
export type SystemShortcut =
	| 'ALARM'
	| 'BATTERY_STATUS'
	| 'CALENDAR'
	| 'MESSAGE'
	| 'MUSIC_PLAYER'
	| 'PHONE'
	| 'SETTINGS'
	| 'HEALTH_HEART_RATE';

/**
 * Makes the containing element's box open `target` when tapped.
 *
 * Deliberately does NOT accept the schema's arbitrary-app-id string. That form exists,
 * but nothing in the XSD tree says what it should contain - package name, component,
 * intent - and an unprobed guess is indistinguishable from a typo. Widen this when one
 * has been seen to work on the watch, not before.
 */
export const launch = (target: SystemShortcut): Node => el('Launch', { target });
